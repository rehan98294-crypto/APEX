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

export const authApi = {
  sendCode: (email: string, action: "verify" | "reset" = "verify") =>
    request<{ success: boolean; emailDelivered: boolean; devOtp?: string }>("/auth/send-code", { email, action }),

  verifyCode: (email: string, code: string) =>
    request<{ success: boolean }>("/auth/verify-code", { email, code }),

  register: (params: {
    username: string; email: string; phone: string;
    password: string; confirmPassword: string; referralCode?: string;
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
};
