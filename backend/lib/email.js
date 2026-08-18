import process from "node:process";

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not configured");
    console.info(`[email preview] ${subject} -> ${to}\n${html}`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "Savor <noreply@example.com>", to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

export function sendVerificationEmail(email, token) {
  const url = `${process.env.PUBLIC_APP_URL || "http://localhost:5173"}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail({ to: email, subject: "Verify your Savor email", html: `<p>Welcome to Savor.</p><p><a href="${url}">Verify your email address</a></p><p>This link expires in 24 hours.</p>` });
}

export function sendPasswordResetEmail(email, token) {
  const url = `${process.env.PUBLIC_APP_URL || "http://localhost:5173"}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({ to: email, subject: "Reset your Savor password", html: `<p><a href="${url}">Reset your password</a></p><p>This link expires in one hour. Ignore this message if you did not request it.</p>` });
}
