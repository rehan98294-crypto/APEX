import nodemailer from "nodemailer";

function getSmtpConfig() {
  return {
    host: process.env["SMTP_HOST"] ?? "smtp.gmail.com",
    port: Number(process.env["SMTP_PORT"] ?? 587),
    user: process.env["SMTP_USER"] ?? "",
    pass: process.env["SMTP_PASS"] ?? "",
  };
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> {
  const { host, port, user, pass } = getSmtpConfig();

  console.log(`[Email] SMTP_USER="${user || "NOT SET"}" SMTP_PASS="${pass ? "SET" : "NOT SET"}"`);

  if (!user || !pass) {
    const msg = `Email service not configured. SMTP_USER=${user || "missing"} SMTP_PASS=${pass ? "set" : "missing"}`;
    console.error(`[Email] ✗ ${msg}`);
    throw new Error("Email service is not configured. Please set SMTP_USER and SMTP_PASS secrets.");
  }

  console.log(`[Email] Sending "${subject}" to ${to} via ${host}:${port}`);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Apex" <${user}>`,
      to,
      subject,
      html: htmlContent,
    });
    console.log(`[Email] ✓ Sent. MessageId: ${info.messageId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Email] ✗ Failed: ${msg}`);
    throw new Error(`Email delivery failed: ${msg}`);
  }
}

export function buildOtpEmail(code: string, action: "verify" | "reset"): string {
  const isReset = action === "reset";
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#f4f6fb;border-radius:16px;">

      <!-- Header: Apex logo + name -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="18" fill="#5CBFFE" fill-opacity="0.12"/>
          <path d="M10 18.5L15.5 24L26 13" stroke="#5CBFFE" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="font-size:20px;font-weight:700;color:#1A1A2E;letter-spacing:-0.3px;">Apex</span>
      </div>

      <h2 style="margin:0 0 8px;color:#1A1A2E;font-size:22px;font-weight:700;">
        ${isReset ? "Reset your password" : "Email Verification"}
      </h2>
      <p style="color:#6B7280;margin:0 0 28px;font-size:14px;line-height:1.6;">
        ${isReset ? "Use the code below to reset your Apex password." : "Use the code below to verify your Apex account."}
      </p>

      <div style="background:#fff;border:1.5px solid #E5E8EE;border-radius:12px;padding:28px 24px;text-align:center;">
        <p style="margin:0 0 12px;color:#9CA3AF;font-size:13px;">Your verification code is:</p>
        <div style="font-size:44px;font-weight:800;letter-spacing:12px;color:#2BD9A8;font-variant-numeric:tabular-nums;">${code}</div>
      </div>

      <p style="color:#9CA3AF;margin:20px 0 0;font-size:12px;line-height:1.6;">
        This code expires in <strong style="color:#6B7280;">2 minutes</strong>. Never share it with anyone.
      </p>

      <hr style="border:none;border-top:1px solid #E5E8EE;margin:24px 0 16px;"/>
      <p style="color:#C4C9D4;font-size:11px;margin:0;">© Apex. All rights reserved.</p>
    </div>
  `;
}
