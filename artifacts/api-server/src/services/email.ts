import nodemailer from "nodemailer";

const SMTP_HOST = process.env["SMTP_HOST"] ?? "smtp.gmail.com";
const SMTP_PORT = Number(process.env["SMTP_PORT"] ?? 587);
const SMTP_USER = process.env["SMTP_USER"] ?? "";
const SMTP_PASS = process.env["SMTP_PASS"] ?? "";

function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.error("[Email] SMTP_USER or SMTP_PASS not set. Cannot send email.");
    throw new Error(
      "Email service is not configured. Please set SMTP_USER and SMTP_PASS."
    );
  }

  console.log(`[Email] Sending "${subject}" to ${to} via ${SMTP_HOST}:${SMTP_PORT}`);

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"TreasureFun" <${SMTP_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
    console.log(`[Email] ✓ Sent successfully. MessageId: ${info.messageId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Email] ✗ Failed to send: ${msg}`);
    throw new Error(`Email delivery failed: ${msg}`);
  }
}

export function buildOtpEmail(code: string, action: "verify" | "reset"): string {
  const title = action === "verify" ? "Email Verification" : "Password Reset";
  const desc =
    action === "verify"
      ? "verify your TreasureFun account"
      : "reset your TreasureFun password";
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0A0E1A;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#5CBFFE,#2BD9A8,#FFB08A);padding:4px;">
        <div style="background:#0A0E1A;padding:32px 28px;">
          <h1 style="color:#fff;margin:0 0 8px;font-size:22px;">${title}</h1>
          <p style="color:#aaa;margin:0 0 24px;">Use the code below to ${desc}.</p>
          <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:24px;text-align:center;letter-spacing:8px;font-size:36px;font-weight:700;color:#5CBFFE;">${code}</div>
          <p style="color:#aaa;margin:24px 0 0;font-size:13px;">This code expires in <strong style="color:#fff;">2 minutes</strong>. Do not share it with anyone.</p>
        </div>
      </div>
    </div>
  `;
}
