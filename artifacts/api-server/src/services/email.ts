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
      from: `"TreasureFun" <${user}>`,
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
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#f9f9f9;border-radius:12px;">
      <h2 style="margin:0 0 8px;color:#111;font-size:20px;">
        ${isReset ? "Reset your password" : "Email Verification"}
      </h2>
      <p style="color:#555;margin:0 0 28px;font-size:14px;">
        ${isReset ? "Use the code below to reset your TreasureFun password." : "Use the code below to verify your TreasureFun account."}
      </p>
      <div style="background:#fff;border:2px solid #e0e0e0;border-radius:10px;padding:24px;text-align:center;">
        <p style="margin:0 0 8px;color:#888;font-size:13px;">Your verification code is:</p>
        <div style="font-size:40px;font-weight:700;letter-spacing:10px;color:#2BD9A8;">${code}</div>
      </div>
      <p style="color:#888;margin:20px 0 0;font-size:13px;">
        This code will expire in <strong>2 minutes</strong>. Do not share it with anyone.
      </p>
    </div>
  `;
}
