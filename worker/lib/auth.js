// Password hashing, JWT issuing/verification and request authentication.
// Everything runs on Web Crypto — no Node APIs, no external auth provider.

import { HttpError, b64url, b64urlDecode, timingSafeEqual, unauthorized } from "./util.js";

// Workers reject PBKDF2 above 100k iterations per call ("iteration counts above
// 100000 are not supported"), which is well under what SHA-256 needs to be worth
// much. Chaining rounds gets the work factor back: each round derives from the
// previous round's output, so an attacker has to walk all of them.
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_ROUNDS = 3;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// --- password hashing --------------------------------------------------------

async function derive(input, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", input, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  return new Uint8Array(bits);
}

async function pbkdf2(password, salt, iterations, rounds) {
  let out = new TextEncoder().encode(password);
  for (let i = 0; i < rounds; i++) out = await derive(out, salt, iterations);
  return out;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS, PBKDF2_ROUNDS);
  return `pbkdf2$${PBKDF2_ITERATIONS}x${PBKDF2_ROUNDS}$${b64url(salt)}$${b64url(hash)}`;
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, spec, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  // "100000x3" — older hashes carry a bare iteration count, i.e. a single round.
  const [iterations, rounds = 1] = String(spec).split("x").map(Number);
  if (!iterations || !rounds) return false;
  const hash = await pbkdf2(password, b64urlDecode(saltB64), iterations, rounds);
  return timingSafeEqual(b64url(hash), hashB64);
}

// --- JWT (HS256) -------------------------------------------------------------

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signToken(payload, secret, ttlSeconds = TOKEN_TTL_SECONDS) {
  const header = { alg: "HS256", typ: "JWT" };
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const enc = new TextEncoder();
  const head = b64url(enc.encode(JSON.stringify(header)));
  const data = b64url(enc.encode(JSON.stringify(body)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(`${head}.${data}`));
  return `${head}.${data}.${b64url(new Uint8Array(sig))}`;
}

export async function verifyToken(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, data, sig] = parts;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    b64urlDecode(sig),
    new TextEncoder().encode(`${head}.${data}`)
  );
  if (!ok) return null;
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(data)));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// --- request authentication --------------------------------------------------

/** Returns the signed-in user row, or null for anonymous requests. */
export async function getUser(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  if (!env.JWT_SECRET) throw new HttpError(500, "JWT_SECRET is not configured");
  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload?.sub) return null;
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(payload.sub).first();
  return user || null;
}

export async function requireUser(request, env) {
  const user = await getUser(request, env);
  if (!user) throw unauthorized();
  return user;
}

/** Strips secrets and normalises booleans before a user row leaves the worker. */
export function publicUser(row) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return {
    ...rest,
    email_verified: !!row.email_verified,
    is_admin: !!row.is_admin,
    profile_visible: row.profile_visible !== 0,
  };
}
