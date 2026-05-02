const DOMAIN = process.env["EXPO_PUBLIC_DOMAIN"] ?? "";
export const API_BASE = DOMAIN
  ? `https://${DOMAIN}/api`
  : "http://localhost:8080/api";

console.log("[AuthAPI] Base URL:", API_BASE);

async function request<T>(
  path: string,
  body: Record<string, unknown>,
  token?: string
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const json = (await res.json()) as { error?: string } & T;
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? "Request failed");
  }
  return json;
}

async function requestGet<T>(path: string, token?: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  const json = (await res.json()) as { error?: string } & T;
  if (!res.ok) throw new Error((json as { error?: string }).error ?? "Request failed");
  return json;
}

// ── NFT API ───────────────────────────────────────────────────────────────────
export const nftApi = {
  getRandom: (level: number): Promise<{ id: string; title: string; image_url: string; level: number; price: number }> => {
    const url = `${API_BASE}/nfts/random?level=${level}`;
    return fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        return json;
      });
  },
};

export const authApi = {
  sendCode: (email: string, action: "verify" | "reset" = "verify") =>
    request<{ success: boolean; emailDelivered: boolean; devOtp?: string }>("/auth/send-code", { email, action }),

  verifyCode: (email: string, code: string) =>
    request<{ success: boolean }>("/auth/verify-code", { email, code }),

  register: (params: {
    username: string; email: string; phone: string;
    password: string; confirmPassword: string;
    inviteCode?: string;  // parent's referral code the new user entered
  }) => request<{ token: string; user: { id: string; username: string; email: string; phone: string } }>("/auth/register", params),

  login: (identifier: string, password: string) =>
    request<
      | { token: string; user: { id: string; username: string; email: string; phone: string } }
      | { requires2FA: true; tempToken: string }
    >("/auth/login", { identifier, password }),

  forgotPassword: (email: string) =>
    request<{ success: boolean }>("/auth/forgot-password", { email }),

  resetPassword: (params: {
    email: string; code: string; newPassword: string; confirmPassword: string;
  }) => request<{ success: boolean }>("/auth/reset-password", params),

  // 2FA endpoints
  twofa: {
    getStatus: (token: string) =>
      requestGet<{ enabled: boolean }>("/auth/2fa/status", token),

    setup: (token: string) =>
      request<{ qrDataUri: string; manualKey: string }>("/auth/2fa/setup", {}, token),

    enable: (token: string, code: string) =>
      request<{ success: boolean }>("/auth/2fa/enable", { token: code }, token),

    verify: (tempToken: string, code: string) =>
      request<{ token: string; user: { id: string; username: string; email: string; phone: string } }>(
        "/auth/2fa/verify", { tempToken, token: code }
      ),

    disable: (token: string, password: string, code: string) =>
      request<{ success: boolean }>("/auth/2fa/disable", { password, token: code }, token),
  },

  // ── Account management ────────────────────────────────────────────────────
  changePassword: (
    token: string,
    params: { oldPassword: string; newPassword: string; confirmPassword: string; emailCode: string; twoFaCode?: string }
  ) => request<{ success: boolean }>("/auth/change-password", params, token),

  deleteAccount: (token: string) => {
    const url = `${API_BASE}/auth/delete-account`;
    return fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (r) => {
      const j = await r.json() as { error?: string; success?: boolean };
      if (!r.ok) throw new Error(j.error ?? "Deletion failed");
      return j as { success: boolean };
    });
  },

  // ── Deposit ───────────────────────────────────────────────────────────────
  deposit: {
    create: (
      token: string,
      amount: number,
      network: "TRC20" | "BEP20" | "ERC20" | "SOL"
    ) =>
      request<{
        payment_id: string;
        pay_address: string;
        pay_amount: number;
        network: string;
        amount: number;
        status: string;
      }>("/deposit/create", { amount, network }, token),

    getStatus: (token: string, payment_id: string) =>
      requestGet<{
        status: string;
        amount: number;
        network: string;
        pay_address: string;
        pay_amount: number;
        created_at: string;
      }>(`/deposit/status/${payment_id}`, token),
  },

  // ── Referral & Team tree ──────────────────────────────────────────────────
  tree: {
    getReferralInfo: (token: string) =>
      requestGet<{
        referralCode: string;
        referralLink: string;
        position: string | null;
        referredByUserId: string | null;
      }>("/tree/referral-info", token),

    getStats: (token: string, filter: "all" | "today" | "week" = "all") =>
      requestGet<{
        totalMembers: number;
        validMembers: number;
        A: { total: number; valid: number };
        B: { total: number; valid: number };
        C: { total: number; valid: number };
      }>(`/tree/stats?filter=${filter}`, token),

    recordDeposit: (token: string, amount: number, status: "pending" | "success" = "pending") =>
      request<{ success: boolean }>("/deposits", { amount, status }, token),
  },
};
