const API_BASE = "/api";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let accessToken: string | null = null;
let onAuthFailure: (() => void) | null = null;

/** El access token vive en memoria (nunca en localStorage), lo administra AuthContext. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** AuthContext se suscribe acá para reaccionar cuando ni siquiera el refresh pudo recuperar la sesión. */
export function setAuthFailureHandler(handler: (() => void) | null): void {
  onAuthFailure = handler;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken: string };
      accessToken = data.accessToken;
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Evita el reintento con refresh: usado por login/register/refresh para no entrar en loop. */
  skipAuthRetry?: boolean;
}

async function performFetch(path: string, options: ApiFetchOptions): Promise<Response> {
  const { body, headers, ...rest } = options;
  const isFormData = body instanceof FormData;

  return fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Cliente centralizado: refresca el access token de forma transparente ante un 401 y reintenta una vez. */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  let res = await performFetch(path, options);

  if (res.status === 401 && !options.skipAuthRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await performFetch(path, options);
    } else {
      onAuthFailure?.();
    }
  }

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
      details?: unknown;
    };
    throw new ApiError(errorBody.message ?? "Ocurrió un error inesperado", res.status, errorBody.code, errorBody.details);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiGet = <T>(path: string, options?: ApiFetchOptions) =>
  apiFetch<T>(path, { ...options, method: "GET" });

export const apiPost = <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
  apiFetch<T>(path, { ...options, method: "POST", body });

export const apiPatch = <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
  apiFetch<T>(path, { ...options, method: "PATCH", body });

export const apiDelete = <T>(path: string, options?: ApiFetchOptions) =>
  apiFetch<T>(path, { ...options, method: "DELETE" });
