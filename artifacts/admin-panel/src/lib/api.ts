import { QueryClient, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE_URL = "/api/admin";

export const getAuthToken = () => localStorage.getItem("apex_admin_secret");
export const setAuthToken = (token: string) => localStorage.setItem("apex_admin_secret", token);
export const clearAuthToken = () => localStorage.removeItem("apex_admin_secret");

export async function adminFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    throw new Error(await response.text() || "API Error");
  }

  return response.json();
}

// Stats
export const useStats = () => {
  return useQuery({
    queryKey: ["adminStats"],
    queryFn: () => adminFetch("/stats"),
  });
};

export const useWithdrawals = (status: string) => {
  return useQuery({
    queryKey: ["withdrawals", status],
    queryFn: () => adminFetch(`/withdrawals?status=${status}`),
  });
};

export const useApproveWithdrawal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminFetch(`/withdrawals/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
    },
  });
};

export const useRejectWithdrawal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminFetch(`/withdrawals/${id}/reject`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
    },
  });
};

export const useUsers = (page = 1, limit = 50, search = "") => {
  return useQuery({
    queryKey: ["users", page, limit, search],
    queryFn: () => adminFetch(`/users?page=${page}&limit=${limit}&search=${search}`),
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => adminFetch(`/users/${id}`),
    enabled: !!id,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminFetch(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useAdjustBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, delta, note }: { id: string; delta: number; note?: string }) =>
      adminFetch(`/users/${id}/adjust-balance`, {
        method: "POST",
        body: JSON.stringify({ delta, note }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useActionLog = () => {
  return useQuery({
    queryKey: ["actionLog"],
    queryFn: () => adminFetch("/action-log"),
  });
};
