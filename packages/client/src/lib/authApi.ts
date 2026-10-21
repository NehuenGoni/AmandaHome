import type { User } from "@amanda/shared";
import { apiFetch, getAccessToken, refreshAccessToken } from "./apiClient.js";

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AcceptInviteInput {
  token: string;
  password: string;
  firstName: string;
  lastName: string;
}

const skipAuthRetry = { skipAuthRetry: true } as const;

export const register = (input: RegisterInput) =>
  apiFetch<AuthResponse>("/auth/register", { method: "POST", body: input, ...skipAuthRetry });

export const login = (input: LoginInput) =>
  apiFetch<AuthResponse>("/auth/login", { method: "POST", body: input, ...skipAuthRetry });

/**
 * Pasa por el mismo refreshAccessToken que usa el reintento automático ante
 * un 401 (ver apiClient.ts), para que nunca haya dos refrescos en vuelo al
 * mismo tiempo pisándose el refresh token rotativo.
 */
export const refresh = async (): Promise<{ accessToken: string }> => {
  const refreshed = await refreshAccessToken();
  if (!refreshed) throw new Error("No se pudo refrescar la sesión");
  return { accessToken: getAccessToken()! };
};

export const logout = () => apiFetch<void>("/auth/logout", { method: "POST", ...skipAuthRetry });

export const getMe = () => apiFetch<{ user: User }>("/auth/me");

export const forgotPassword = (email: string) =>
  apiFetch<{ message: string }>("/auth/forgot-password", { method: "POST", body: { email }, ...skipAuthRetry });

export const resetPassword = (token: string, newPassword: string) =>
  apiFetch<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: { token, newPassword },
    ...skipAuthRetry,
  });

export const acceptInvite = (input: AcceptInviteInput) =>
  apiFetch<AuthResponse>("/auth/accept-invite", { method: "POST", body: input, ...skipAuthRetry });
