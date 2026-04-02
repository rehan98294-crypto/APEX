import app from "./app";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ── SMTP diagnostics on startup ──────────────────────────────────────────────
const smtpUser = process.env["SMTP_USER"] ?? "";
const smtpPass = process.env["SMTP_PASS"] ?? "";
const smtpHost = process.env["SMTP_HOST"] ?? "smtp.gmail.com";
const smtpPort = process.env["SMTP_PORT"] ?? "587";

console.log("─── SMTP Config ────────────────────────────────");
console.log(`  Host : ${smtpHost}`);
console.log(`  Port : ${smtpPort}`);
console.log(`  User : ${smtpUser ? `${smtpUser.slice(0, 4)}****` : "NOT SET ⚠️  → set SMTP_USER secret"}`);
console.log(`  Pass : ${smtpPass ? "SET (hidden)" : "NOT SET ⚠️  → set SMTP_PASS secret"}`);
console.log("────────────────────────────────────────────────");

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
