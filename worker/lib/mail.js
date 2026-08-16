// Transactional email via Resend.
// Without RESEND_API_KEY the mail is logged instead of sent, so `wrangler dev`
// works offline — the OTP shows up in the worker log.

const LAYOUT = (title, body) => `<!doctype html>
<html><body style="margin:0;background:#FDFDFD;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:40px auto;padding:32px;background:#fff;border:1px solid #E2E8F0;border-radius:12px">
    <h1 style="margin:0 0 16px;font-size:20px;color:#0F172A">${title}</h1>
    ${body}
    <p style="margin:32px 0 0;font-size:12px;color:#94A3B8">PaperHub — scientific presentation archive</p>
  </div>
</body></html>`;

async function send(env, { to, subject, html, text }) {
  if (!env.RESEND_API_KEY) {
    // `text` carries the code or link — the HTML strip below would swallow an href.
    console.log(`[mail:dev] to=${to} subject=${subject}\n[mail:dev] ${text}`);
    return { delivered: false, reason: "RESEND_API_KEY not configured" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.MAIL_FROM || "PaperHub <noreply@paperhub.io>", to, subject, html }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error("Resend error", res.status, detail);
    throw new Error("Could not send email");
  }
  return { delivered: true };
}

export function sendOtpMail(env, to, code) {
  return send(env, {
    to,
    subject: `${code} is your PaperHub verification code`,
    text: `Verification code: ${code} (valid for 15 minutes)`,
    html: LAYOUT(
      "Confirm your email",
      `<p style="color:#475569;font-size:14px">Enter this code to finish creating your PaperHub account:</p>
       <p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#2563EB;margin:24px 0">${code}</p>
       <p style="color:#94A3B8;font-size:13px">The code expires in 15 minutes. If you didn't request it, ignore this email.</p>`
    ),
  });
}

export function sendPasswordResetMail(env, to, resetUrl) {
  return send(env, {
    to,
    subject: "Reset your PaperHub password",
    text: `Reset link (valid for 1 hour): ${resetUrl}`,
    html: LAYOUT(
      "Reset your password",
      `<p style="color:#475569;font-size:14px">Click the button below to choose a new password.</p>
       <p style="margin:24px 0"><a href="${resetUrl}" style="background:#2563EB;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;display:inline-block">Set a new password</a></p>
       <p style="color:#94A3B8;font-size:13px">The link expires in 1 hour. If you didn't request a reset, ignore this email.</p>`
    ),
  });
}
