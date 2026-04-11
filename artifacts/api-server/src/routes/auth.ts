import { Router, Request, Response, NextFunction } from "express";
import {
  sendOtp,
  verifyOtp,
  registerUser,
  loginUser,
  resetPassword,
  completeTwoFALogin,
  verifyToken,
} from "../services/auth.service.js";
import {
  setup2FA,
  enable2FA,
  verify2FA,
  disable2FA,
  get2FAStatus,
} from "../services/totp.service.js";

const router = Router();

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  try {
    const payload = verifyToken(auth.slice(7));
    (req as any).userId  = payload.id;
    (req as any).userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

// ── OTP / Registration ─────────────────────────────────────────────────────────
router.post("/auth/send-code", async (req, res) => {
  try {
    const { email, action } = req.body as { email?: string; action?: string };
    if (!email) return res.status(400).json({ error: "Email is required." });
    const act = action === "reset" ? "reset" : "verify";
    const { emailDelivered, devOtp } = await sendOtp(email, act);
    return res.json({ success: true, emailDelivered, ...(devOtp ? { devOtp } : {}) });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Failed to send code." });
  }
});

router.post("/auth/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body as { email?: string; code?: string };
    if (!email || !code) return res.status(400).json({ error: "Email and code are required." });
    const valid = await verifyOtp(email, code);
    if (!valid) return res.status(400).json({ error: "Incorrect code. Please try again." });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Verification failed." });
  }
});

router.post("/auth/register", async (req, res) => {
  try {
    const { username, email, phone, password, confirmPassword, referralCode } =
      req.body as {
        username?: string; email?: string; phone?: string;
        password?: string; confirmPassword?: string; referralCode?: string;
      };
    if (!username || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match." });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
    const result = await registerUser({ username, email, phone, password, referralCode });
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Registration failed." });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { identifier, password } = req.body as { identifier?: string; password?: string };
    if (!identifier || !password) return res.status(400).json({ error: "Credentials are required." });
    const result = await loginUser({ identifier, password });
    return res.json(result);
  } catch (err) {
    return res.status(401).json({ error: err instanceof Error ? err.message : "Login failed." });
  }
});

router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) return res.status(400).json({ error: "Email is required." });
    await sendOtp(email, "reset");
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Failed to send reset code." });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body as {
      email?: string; code?: string; newPassword?: string; confirmPassword?: string;
    };
    if (!email || !code || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (newPassword !== confirmPassword) return res.status(400).json({ error: "Passwords do not match." });
    if (newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
    const valid = await verifyOtp(email, code);
    if (!valid) return res.status(400).json({ error: "Incorrect or expired code." });
    await resetPassword({ email, newPassword });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Reset failed." });
  }
});

// ── 2FA routes ────────────────────────────────────────────────────────────────

/** GET /api/auth/2fa/status — get 2FA status (requires auth token) */
router.get("/auth/2fa/status", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const status = await get2FAStatus(userId);
    return res.json(status);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Failed." });
  }
});

/** POST /api/auth/2fa/setup — generate secret + QR code (requires auth) */
router.post("/auth/2fa/setup", requireAuth, async (req, res) => {
  try {
    const userId   = (req as any).userId;
    const email    = (req as any).userEmail;
    const result   = await setup2FA(userId, email);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Setup failed." });
  }
});

/** POST /api/auth/2fa/enable — verify token and activate 2FA (requires auth) */
router.post("/auth/2fa/enable", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { token } = req.body as { token?: string };
    if (!token || token.length !== 6) return res.status(400).json({ error: "6-digit code required." });
    await enable2FA(userId, token);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Failed." });
  }
});

/** POST /api/auth/2fa/verify — verify code during login (uses tempToken) */
router.post("/auth/2fa/verify", async (req, res) => {
  try {
    const { tempToken, token } = req.body as { tempToken?: string; token?: string };
    if (!tempToken || !token) return res.status(400).json({ error: "Temp token and code are required." });
    if (token.length !== 6) return res.status(400).json({ error: "Enter a 6-digit code." });

    let payload: { id: string; email: string; purpose: string };
    const jwt = await import("jsonwebtoken");
    const JWT_SECRET = process.env["JWT_SECRET"] ?? "treasurefun_jwt_secret_2024";
    try {
      payload = jwt.default.verify(tempToken, JWT_SECRET) as typeof payload;
    } catch {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    if (payload.purpose !== "2fa") return res.status(400).json({ error: "Invalid token." });

    await verify2FA(payload.id, token);

    const result = await completeTwoFALogin(tempToken);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Verification failed." });
  }
});

/** POST /api/auth/2fa/disable — disable 2FA (requires auth + password + code) */
router.post("/auth/2fa/disable", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { password, token } = req.body as { password?: string; token?: string };
    if (!password || !token) return res.status(400).json({ error: "Password and code are required." });
    await disable2FA(userId, password, token);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Failed to disable 2FA." });
  }
});

export default router;
