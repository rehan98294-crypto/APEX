import { Router } from "express";
import crypto from "crypto";
import supabase from "../lib/supabase.js";
import { verifyToken } from "../services/auth.service.js";

const router = Router();

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";
const API_KEY = () => process.env["NOWPAYMENTS_API_KEY"] ?? "";
const IPN_SECRET = () => process.env["NOWPAYMENTS_IPN_SECRET"] ?? "";

const NETWORK_MAP: Record<string, string> = {
  TRC20: "usdttrc20",
  BEP20: "usdtbsc",
  ERC20: "usdteth",
  SOL:   "usdtsol",
};

function getAuthUserId(req: any): string | null {
  const auth = req.headers.authorization as string | undefined;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = verifyToken(auth.slice(7));
    return (payload as any).id as string;
  } catch {
    return null;
  }
}

function sortObjectDeep(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectDeep);
  return Object.keys(obj as Record<string, unknown>)
    .sort()
    .reduce((acc: Record<string, unknown>, key) => {
      acc[key] = sortObjectDeep((obj as Record<string, unknown>)[key]);
      return acc;
    }, {});
}

// ── POST /api/deposit/create ───────────────────────────────────────────────────
router.post("/deposit/create", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { amount, network } = req.body as { amount?: number; network?: string };

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  if (!network || !NETWORK_MAP[network]) {
    return res.status(400).json({ error: "Invalid network. Use TRC20, BEP20, ERC20, or SOL" });
  }
  if (!API_KEY()) {
    return res.status(500).json({ error: "Payment gateway not configured. Set NOWPAYMENTS_API_KEY." });
  }

  try {
    const payResponse = await fetch(`${NOWPAYMENTS_API}/payment`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: Number(amount),
        price_currency: "usd",
        pay_currency: NETWORK_MAP[network],
      }),
    });

    const payData = (await payResponse.json()) as Record<string, unknown>;
    console.log("[Deposit] NOWPayments response:", JSON.stringify(payData));

    if (!payResponse.ok || !payData["payment_id"]) {
      const msg =
        typeof payData["message"] === "string"
          ? payData["message"]
          : "Failed to create payment";
      console.error("[Deposit] NOWPayments error:", payData);
      return res.status(502).json({ error: msg });
    }

    const payment_id = String(payData["payment_id"]);
    const pay_address = String(payData["pay_address"] ?? "");
    const pay_amount = Number(payData["pay_amount"] ?? 0);

    const { error: dbErr } = await supabase.from("deposits").insert({
      user_id: userId,
      payment_id,
      pay_address,
      network,
      amount: Number(amount),
      pay_amount,
      currency: "USDT",
      status: "waiting",
    });

    if (dbErr) {
      console.error("[Deposit] DB insert error:", dbErr.message);
    }

    return res.json({
      payment_id,
      pay_address,
      pay_amount,
      network,
      amount: Number(amount),
      status: "waiting",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[Deposit] Error:", msg);
    return res.status(500).json({ error: msg });
  }
});

// ── GET /api/deposit/status/:payment_id ───────────────────────────────────────
router.get("/deposit/status/:payment_id", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { payment_id } = req.params;

  const { data, error } = await supabase
    .from("deposits")
    .select("status, amount, network, pay_address, pay_amount, created_at")
    .eq("payment_id", payment_id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Deposit not found" });
  }

  return res.json(data);
});

// ── POST /api/deposit/webhook  (NOWPayments IPN) ──────────────────────────────
router.post("/deposit/webhook", async (req, res) => {
  const sig = req.headers["x-nowpayments-sig"] as string | undefined;
  const body = req.body as Record<string, unknown>;

  console.log("[Webhook] Deposit IPN received:", JSON.stringify(body));

  const secret = IPN_SECRET();
  if (secret) {
    if (!sig) {
      console.warn("[Webhook] Missing x-nowpayments-sig header");
      return res.status(401).json({ error: "Missing signature" });
    }
    const sortedBody = JSON.stringify(sortObjectDeep(body));
    const expected = crypto
      .createHmac("sha512", secret)
      .update(sortedBody)
      .digest("hex");
    if (expected !== sig) {
      console.warn("[Webhook] Signature mismatch");
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  const payment_id = body["payment_id"] != null ? String(body["payment_id"]) : null;
  const payment_status = typeof body["payment_status"] === "string" ? body["payment_status"] : null;
  const price_amount = Number(body["price_amount"] ?? 0);

  if (!payment_id) {
    return res.status(400).json({ error: "Missing payment_id" });
  }

  console.log(`[Webhook] payment_id=${payment_id} status=${payment_status}`);

  if (payment_status === "finished" || payment_status === "confirmed") {
    const { data: existing, error: fetchErr } = await supabase
      .from("deposits")
      .select("id, user_id, status, amount")
      .eq("payment_id", payment_id)
      .single();

    if (fetchErr || !existing) {
      console.warn(`[Webhook] No deposit record for payment_id=${payment_id}`);
      return res.status(404).json({ error: "Deposit not found" });
    }

    if ((existing as Record<string, unknown>)["status"] === "confirmed") {
      console.log(`[Webhook] Already confirmed, skipping idempotently: ${payment_id}`);
      return res.json({ ok: true });
    }

    await supabase
      .from("deposits")
      .update({ status: "confirmed" })
      .eq("payment_id", payment_id);

    const creditAmount = price_amount > 0 ? price_amount : Number((existing as Record<string, unknown>)["amount"]);
    const user_id = (existing as Record<string, unknown>)["user_id"] as string;

    const { data: userData } = await supabase
      .from("users")
      .select("balance")
      .eq("id", user_id)
      .single();

    const currentBalance = Number((userData as Record<string, unknown> | null)?.["balance"] ?? 0);
    await supabase
      .from("users")
      .update({ balance: currentBalance + creditAmount, has_deposited: true })
      .eq("id", user_id);

    console.log(`[Webhook] ✓ Credited $${creditAmount} to user ${user_id}`);
  } else if (payment_status === "failed" || payment_status === "expired") {
    await supabase
      .from("deposits")
      .update({ status: payment_status })
      .eq("payment_id", payment_id);
    console.log(`[Webhook] Marked deposit ${payment_id} as ${payment_status}`);
  } else {
    await supabase
      .from("deposits")
      .update({ status: payment_status ?? "unknown" })
      .eq("payment_id", payment_id);
    console.log(`[Webhook] Updated deposit ${payment_id} status to ${payment_status}`);
  }

  return res.json({ ok: true });
});

export default router;
