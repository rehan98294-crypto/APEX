const DOMAIN = process.env["EXPO_PUBLIC_DOMAIN"] ?? "";
export const API_BASE = DOMAIN
  ? `https://${DOMAIN}/api`
  : "http://localhost:8080/api";

console.log("[AuthAPI] Base URL:", API_BASE);

async function request<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const url = `${API_BASE}${path}`;
  console.log("[AuthAPI] POST", url);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { error?: string } & T;
  if (!res.ok) {
    const errMsg = (json as { error?: string }).error ?? "Request failed";
    console.error("[AuthAPI] Error", res.status, errMsg);
    throw new Error(errMsg);
  }
  console.log("[AuthAPI] OK", path);
  return json;
}

export const authApi = {
  sendCode: (email: string, action: "verify" | "reset" = "verify") =>
    request<{ success: boolean; emailDelivered: boolean; devOtp?: string }>("/auth/send-code", { email, action }),

  verifyCode: (email: string, code: string) =>
    request<{ success: boolean }>("/auth/verify-code", { email, code }),

  register: (params: {
    username: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    referralCode?: string;
  }) => request<{ token: string; user: { id: string; username: string; email: string; phone: string } }>("/auth/register", params),

  login: (identifier: string, password: string) =>
    request<{ token: string; user: { id: string; username: string; email: string; phone: string } }>("/auth/login", { identifier, password }),

  forgotPassword: (email: string) =>
    request<{ success: boolean }>("/auth/forgot-password", { email }),

  resetPassword: (params: {
    email: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
  }) => request<{ success: boolean }>("/auth/reset-password", params),
};
