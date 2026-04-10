import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

function getSmtpConfig() {
  return {
    host: process.env["SMTP_HOST"] ?? "smtp.gmail.com",
    port: Number(process.env["SMTP_PORT"] ?? 587),
    user: process.env["SMTP_USER"] ?? "",
    pass: process.env["SMTP_PASS"] ?? "",
  };
}

// ── Embed apex logo as base64 once at startup ─────────────────────────────────
function loadLogoBase64(): string {
  try {
    const logoPath = path.join(__dirname, "../assets/apex-logo.jpeg");
    const buf = fs.readFileSync(logoPath);
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return "";
  }
}

const LOGO_DATA_URI = loadLogoBase64();

// ── Blue verified badge — inline SVG (no external image needed) ───────────────
const BLUE_TICK_SVG = `
<svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
     style="display:inline-block;vertical-align:middle;margin-left:3px;">
  <path d="M50 4
    L56 15 L68 10 L71 23 L84 23 L82 36 L94 42
    L88 54 L96 64 L85 71 L88 84
    L75 85 L70 97 L58 91 L50 100
    L42 91 L30 97 L25 85 L12 84
    L15 71 L4 64 L12 54 L6 42
    L18 36 L16 23 L29 23 L32 10 L44 15 Z"
    fill="#1D9BF0"/>
  <path d="M33 50 L44 62 L67 37"
    stroke="white" stroke-width="9"
    stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

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
      from: `"Apex ✓" <${user}>`,
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

  const logoHtml = LOGO_DATA_URI
    ? `<img src="${LOGO_DATA_URI}" width="44" height="44"
           style="border-radius:12px;object-fit:cover;display:block;border:2px solid #E5E8EE;" alt="Apex" />`
    : `<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#5CBFFE,#2BD9A8);display:flex;align-items:center;justify-content:center;">
         <span style="color:#fff;font-size:18px;font-weight:800;">A</span>
       </div>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ECEEF3;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#ECEEF3;padding:32px 16px;">
  <tr><td align="center">
  <table width="100%" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E5E8EE;">

    <!-- ── Top gradient bar ── -->
    <tr>
      <td style="height:5px;background:linear-gradient(90deg,#7B61FF,#5CBFFE,#2BD9A8);"></td>
    </tr>

    <!-- ── Header ── -->
    <tr>
      <td style="padding:28px 32px 20px;">

        <!-- Logo + Brand row -->
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:12px;vertical-align:middle;">
              ${logoHtml}
            </td>
            <td style="vertical-align:middle;">
              <div style="font-size:20px;font-weight:800;color:#1A1A2E;letter-spacing:-0.3px;line-height:1;">
                Apex
                ${BLUE_TICK_SVG}
              </div>
              <div style="font-size:11px;color:#9CA3AF;margin-top:2px;">Official Notification</div>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- ── Divider ── -->
    <tr><td style="padding:0 32px;"><div style="height:1px;background:#F0F2F7;"></div></td></tr>

    <!-- ── Body ── -->
    <tr>
      <td style="padding:28px 32px;">

        <h2 style="margin:0 0 10px;color:#1A1A2E;font-size:24px;font-weight:800;letter-spacing:-0.4px;">
          ${isReset ? "Reset Your Password" : "Email Verification"}
        </h2>

        <p style="color:#6B7280;margin:0 0 28px;font-size:14px;line-height:1.7;">
          ${isReset
            ? "We received a request to reset your <strong style=\"color:#1A1A2E;\">Apex</strong> account password. Use the code below to continue."
            : "Use the code below to verify your <strong style=\"color:#1A1A2E;\">Apex</strong> account. This is your one-time passcode."}
        </p>

        <!-- Code box -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#F8F9FB;border:1.5px solid #E5E8EE;border-radius:14px;padding:28px 24px;text-align:center;">
              <p style="margin:0 0 10px;color:#9CA3AF;font-size:12px;letter-spacing:1px;text-transform:uppercase;">
                Your verification code is
              </p>
              <div style="font-size:48px;font-weight:900;letter-spacing:14px;color:#2BD9A8;font-variant-numeric:tabular-nums;line-height:1.1;">
                ${code}
              </div>
            </td>
          </tr>
        </table>

        <p style="color:#9CA3AF;margin:20px 0 0;font-size:12px;line-height:1.7;text-align:center;">
          Expires in <strong style="color:#6B7280;">2 minutes</strong> &nbsp;·&nbsp; Never share this code with anyone.
        </p>

      </td>
    </tr>

    <!-- ── Footer ── -->
    <tr>
      <td style="padding:0 32px 28px;">
        <div style="height:1px;background:#F0F2F7;margin-bottom:20px;"></div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <!-- Small logo + name in footer -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:8px;vertical-align:middle;">
                    ${LOGO_DATA_URI
                      ? `<img src="${LOGO_DATA_URI}" width="24" height="24" style="border-radius:6px;object-fit:cover;display:block;" alt="Apex"/>`
                      : ""}
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:13px;font-weight:700;color:#9CA3AF;">Apex</span>
                    ${BLUE_TICK_SVG.replace('width="18" height="18"', 'width="13" height="13"')}
                  </td>
                </tr>
              </table>
            </td>
            <td align="right" style="vertical-align:middle;">
              <span style="font-size:11px;color:#C4C9D4;">© 2025 Apex. All rights reserved.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>
  </td></tr>
</table>

</body>
</html>
  `;
}
