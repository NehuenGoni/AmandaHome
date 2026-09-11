import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, apiGet, apiPost, getAccessToken, setAccessToken, setAuthFailureHandler } from "./apiClient.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiClient", () => {
  beforeEach(() => {
    setAccessToken(null);
    setAuthFailureHandler(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hace la request y devuelve el JSON parseado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiGet<{ ok: boolean }>("/health");
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
  });

  it("incluye el Authorization header cuando hay access token", async () => {
    setAccessToken("token-123");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiGet("/me");
    const headers = fetchMock.mock.calls[0]![1].headers;
    expect(headers.Authorization).toBe("Bearer token-123");
  });

  it("devuelve undefined en respuestas 204", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiPost("/cart");
    expect(result).toBeUndefined();
  });

  it("lanza ApiError con message/code/details en respuestas no exitosas", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: "Datos inválidos", code: "VALIDATION_ERROR" }, 400));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiGet("/broken")).rejects.toMatchObject({
      message: "Datos inválidos",
      status: 400,
      code: "VALIDATION_ERROR",
    });
  });

  it("ante un 401 refresca el token y reintenta la request una vez", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "unauthorized" }, 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: "new-token" }))
      .mockResolvedValueOnce(jsonResponse({ user: { id: "1" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiGet<{ user: { id: string } }>("/auth/me");

    expect(result).toEqual({ user: { id: "1" } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]![0]).toBe("/api/auth/refresh");
    expect(getAccessToken()).toBe("new-token");
  });

  it("si el refresh también falla, invoca el auth failure handler", async () => {
    const onAuthFailure = vi.fn();
    setAuthFailureHandler(onAuthFailure);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({}, 401)); // el refresh también falla
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiGet("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it("no reintenta cuando skipAuthRetry está activo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 401));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/auth/login", { skipAuthRetry: true })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("dos 401 concurrentes comparten un único refresh", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: "shared-token" }))
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }))
      .mockResolvedValueOnce(jsonResponse({ ok: 2 }));
    vi.stubGlobal("fetch", fetchMock);

    const [a, b] = await Promise.all([apiGet("/a"), apiGet("/b")]);
    expect(a).toEqual({ ok: 1 });
    expect(b).toEqual({ ok: 2 });

    const refreshCalls = fetchMock.mock.calls.filter((call) => call[0] === "/api/auth/refresh");
    expect(refreshCalls).toHaveLength(1);
  });
});
