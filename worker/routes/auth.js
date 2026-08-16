// /api/auth/* — registration with e-mail OTP, login, profile, password reset.

import { getUser, hashPassword, publicUser, requireUser, signToken, verifyPassword } from "../lib/auth.js";
import { sendOtpMail, sendPasswordResetMail } from "../lib/mail.js";
import { HttpError, badRequest, json, newId, nowIso, readJson, sha256Hex, unauthorized } from "../lib/util.js";

const OTP_TTL_MS = 15 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 6;
const RESET_TTL_MS = 60 * 60 * 1000;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

function assertPassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    throw badRequest("Password must be at least 8 characters");
  }
}

async function issueOtp(env, email) {
  const existing = await env.DB.prepare("SELECT sent_at FROM otp_codes WHERE email = ?").bind(email).first();
  if (existing && Date.now() - existing.sent_at < OTP_RESEND_COOLDOWN_MS) {
    throw new HttpError(429, "Please wait a moment before requesting a new code");
  }
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
  await env.DB.prepare(
    `INSERT INTO otp_codes (email, code_hash, expires_at, attempts, sent_at)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at,
       attempts = 0, sent_at = excluded.sent_at`
  )
    .bind(email, await sha256Hex(code), Date.now() + OTP_TTL_MS, Date.now())
    .run();
  await sendOtpMail(env, email, code);
}

/** Fields a user may change on their own profile. */
const EDITABLE = {
  full_name: (v) => String(v).slice(0, 120),
  university: (v) => String(v).slice(0, 160),
  role: (v) => (["student", "researcher", "lecturer"].includes(v) ? v : "student"),
  orcid_id: (v) => String(v).slice(0, 40),
  username: (v) => String(v).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30),
  points: (v) => Number(v) || 0,
  profile_visible: (v) => (v ? 1 : 0),
};

export async function handleAuth(request, env, path) {
  const method = request.method;

  // POST /api/auth/register — create the account and mail a 6-digit code.
  if (path === "register" && method === "POST") {
    const { email: rawEmail, password } = await readJson(request);
    const email = normalizeEmail(rawEmail);
    if (!email.includes("@")) throw badRequest("A valid email is required");
    assertPassword(password);

    const existing = await env.DB.prepare("SELECT id, email_verified FROM users WHERE email = ?").bind(email).first();
    if (existing?.email_verified) throw badRequest("An account with this email already exists");

    const hash = await hashPassword(password);
    if (existing) {
      await env.DB.prepare("UPDATE users SET password_hash = ?, updated_date = ? WHERE id = ?")
        .bind(hash, nowIso(), existing.id)
        .run();
    } else {
      await env.DB.prepare(
        `INSERT INTO users (id, email, password_hash, email_verified, created_date, updated_date)
         VALUES (?, ?, ?, 0, ?, ?)`
      )
        .bind(newId(), email, hash, nowIso(), nowIso())
        .run();
    }
    await issueOtp(env, email);
    return json({ success: true });
  }

  // POST /api/auth/resend-otp
  if (path === "resend-otp" && method === "POST") {
    const { email: rawEmail } = await readJson(request);
    const email = normalizeEmail(rawEmail);
    // Only ever mail an address that actually signed up — otherwise this
    // endpoint is a way to send PaperHub mail to strangers. The response is the
    // same either way so it can't be used to probe for accounts.
    const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (user) await issueOtp(env, email);
    return json({ success: true });
  }

  // POST /api/auth/verify-otp — confirms the address and signs the user in.
  if (path === "verify-otp" && method === "POST") {
    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    const code = String(body.otpCode || body.otp_code || "").trim();

    const record = await env.DB.prepare("SELECT * FROM otp_codes WHERE email = ?").bind(email).first();
    if (!record) throw badRequest("No verification code was requested for this email");
    if (record.expires_at < Date.now()) throw badRequest("The code has expired — request a new one");
    if (record.attempts >= OTP_MAX_ATTEMPTS) throw badRequest("Too many attempts — request a new code");

    if ((await sha256Hex(code)) !== record.code_hash) {
      await env.DB.prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE email = ?").bind(email).run();
      throw badRequest("Invalid verification code");
    }

    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    if (!user) throw badRequest("No account exists for this email — please sign up again");

    await env.DB.batch([
      env.DB.prepare("UPDATE users SET email_verified = 1, updated_date = ? WHERE id = ?").bind(nowIso(), user.id),
      env.DB.prepare("DELETE FROM otp_codes WHERE email = ?").bind(email),
    ]);

    return json({
      access_token: await signToken({ sub: user.id }, env.JWT_SECRET),
      user: publicUser({ ...user, email_verified: 1 }),
    });
  }

  // POST /api/auth/login
  if (path === "login" && method === "POST") {
    const { email: rawEmail, password } = await readJson(request);
    const email = normalizeEmail(rawEmail);
    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    if (!user || !(await verifyPassword(String(password || ""), user.password_hash))) {
      throw unauthorized("Invalid email or password");
    }
    if (!user.email_verified) {
      await issueOtp(env, email).catch(() => {});
      throw new HttpError(403, "Please confirm your email address first — we sent you a new code", {
        reason: "email_not_verified",
      });
    }
    return json({ access_token: await signToken({ sub: user.id }, env.JWT_SECRET), user: publicUser(user) });
  }

  // GET /api/auth/me
  if (path === "me" && method === "GET") {
    return json(publicUser(await requireUser(request, env)));
  }

  // PATCH /api/auth/me
  if (path === "me" && (method === "PATCH" || method === "PUT")) {
    const user = await requireUser(request, env);
    const body = await readJson(request);
    const updates = { updated_date: nowIso() };
    for (const [field, clean] of Object.entries(EDITABLE)) {
      if (body[field] !== undefined && body[field] !== null) updates[field] = clean(body[field]);
    }
    const cols = Object.keys(updates);
    await env.DB.prepare(`UPDATE users SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`)
      .bind(...cols.map((c) => updates[c]), user.id)
      .run();
    return json(publicUser({ ...user, ...updates }));
  }

  // POST /api/auth/password-reset-request — always answers 200 (no user enumeration).
  if (path === "password-reset-request" && method === "POST") {
    const { email } = await readJson(request);
    const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(normalizeEmail(email)).first();
    if (user) {
      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      await env.DB.prepare(
        "INSERT INTO password_resets (token_hash, user_id, expires_at, used) VALUES (?, ?, ?, 0)"
      )
        .bind(await sha256Hex(token), user.id, Date.now() + RESET_TTL_MS)
        .run();
      const base = (env.APP_URL || new URL(request.url).origin).replace(/\/$/, "");
      await sendPasswordResetMail(env, normalizeEmail(email), `${base}/reset-password?token=${token}`);
    }
    return json({ success: true });
  }

  // POST /api/auth/password-reset
  if (path === "password-reset" && method === "POST") {
    const body = await readJson(request);
    const token = String(body.resetToken || body.reset_token || "");
    assertPassword(body.newPassword ?? body.new_password);

    const hash = await sha256Hex(token);
    const record = await env.DB.prepare("SELECT * FROM password_resets WHERE token_hash = ?").bind(hash).first();
    if (!record || record.used || record.expires_at < Date.now()) {
      throw badRequest("This reset link is invalid or has expired");
    }
    await env.DB.batch([
      env.DB
        .prepare("UPDATE users SET password_hash = ?, email_verified = 1, updated_date = ? WHERE id = ?")
        .bind(await hashPassword(body.newPassword ?? body.new_password), nowIso(), record.user_id),
      env.DB.prepare("UPDATE password_resets SET used = 1 WHERE token_hash = ?").bind(hash),
    ]);
    return json({ success: true });
  }

  // GET /api/auth/session — used on boot; never 401s so the SPA can render anonymously.
  if (path === "session" && method === "GET") {
    const user = await getUser(request, env);
    return json({ authenticated: !!user, user: publicUser(user) });
  }

  throw new HttpError(404, `Unknown auth route: ${path}`);
}
