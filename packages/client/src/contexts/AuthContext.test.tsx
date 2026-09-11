import type { User } from "@amanda/shared";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "@/lib/authApi";
import { AuthProvider, useAuth } from "./AuthContext.js";

vi.mock("@/lib/authApi");

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    _id: "1",
    email: "cliente@example.com",
    firstName: "Cliente",
    lastName: "Test",
    role: "customer",
    addresses: [],
    isActive: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("empieza cargando y termina deslogueado si no hay sesión previa", async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error("sin sesión"));
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("recupera la sesión cuando el refresh inicial tiene éxito", async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: "token-1" });
    vi.mocked(authApi.getMe).mockResolvedValue({ user: buildUser() });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe("cliente@example.com");
  });

  it("login autentica al usuario", async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error("sin sesión"));
    vi.mocked(authApi.login).mockResolvedValue({ user: buildUser(), accessToken: "token-2" });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login("cliente@example.com", "password123");
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it("logout limpia el usuario incluso si la llamada al backend falla", async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: "token-1" });
    vi.mocked(authApi.getMe).mockResolvedValue({ user: buildUser() });
    vi.mocked(authApi.logout).mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await expect(result.current.logout()).rejects.toThrow();
    });
    expect(result.current.isAuthenticated).toBe(false);
  });
});
