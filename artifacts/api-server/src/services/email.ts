import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env["SMTP_HOST"] ?? "smtp.gmail.com",
  port: Number(process.env["SMTP_PORT"] ?? 587),
  secure: Number(process.env["SMTP_PORT"] ?? 587) === 465,
  auth: {
    user: process.env["SMTP_USER"] ?? "",
    pass: process.env["SMTP_PASS"] ?? "",
  },
});

export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> {
  const from = process.env["SMTP_USER"] ?? "noreply@treasurefun.app";
  await transporter.sendMail({ from, to, subject, html: htmlContent });
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
