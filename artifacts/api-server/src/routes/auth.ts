import { Router } from "express";
import {
  sendOtp,
  verifyOtp,
  registerUser,
  loginUser,
  resetPassword,
} from "../services/auth.service.js";

const router = Router();

router.post("/auth/send-code", async (req, res) => {
  try {
    const { email, action } = req.body as { email?: string; action?: string };
    if (!email) return res.status(400).json({ error: "Email is required." });
    const act = action === "reset" ? "reset" : "verify";
    await sendOtp(email, act);
    return res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send code.";
    return res.status(400).json({ error: msg });
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
    const msg = err instanceof Error ? err.message : "Verification failed.";
    return res.status(400).json({ error: msg });
  }
});

router.post("/auth/register", async (req, res) => {
  try {
    const { username, email, phone, password, confirmPassword, referralCode } =
      req.body as {
        username?: string;
        email?: string;
        phone?: string;
        password?: string;
        confirmPassword?: string;
        referralCode?: string;
      };

    if (!username || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const result = await registerUser({ username, email, phone, password, referralCode });
    return res.status(201).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registration failed.";
    return res.status(400).json({ error: msg });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { identifier, password } = req.body as {
      identifier?: string;
      password?: string;
    };
    if (!identifier || !password) {
      return res.status(400).json({ error: "Credentials are required." });
    }
    const result = await loginUser({ identifier, password });
    return res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Login failed.";
    return res.status(401).json({ error: msg });
  }
});

router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) return res.status(400).json({ error: "Email is required." });
    await sendOtp(email, "reset");
    return res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send reset code.";
    return res.status(400).json({ error: msg });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
      confirmPassword?: string;
    };
    if (!email || !code || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const valid = await verifyOtp(email, code);
    if (!valid) return res.status(400).json({ error: "Incorrect or expired code." });

    await resetPassword({ email, newPassword });
    return res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Reset failed.";
    return res.status(400).json({ error: msg });
  }
});

export default router;
