import type { User } from "@amanda/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import * as authApi from "@/lib/authApi";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./Login.js";

vi.mock("@/lib/authApi");

function buildUser(): User {
  return {
    _id: "1",
    email: "cliente@example.com",
    firstName: "Cliente",
    lastName: "Test",
    role: "customer",
    addresses: [],
    isActive: true,
    createdAt: "",
    updatedAt: "",
  };
}

function renderLogin() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.refresh).mockRejectedValue(new Error("sin sesión"));
});

describe("Login", () => {
  it("muestra un error cuando las credenciales son incorrectas", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError("Email o contraseña incorrectos", 401, "UNAUTHORIZED"),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email"), "cliente@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "incorrecta");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByText("Email o contraseña incorrectos")).toBeInTheDocument();
  });

  it("llama a login con los datos del formulario", async () => {
    vi.mocked(authApi.login).mockResolvedValue({ user: buildUser(), accessToken: "token-1" });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Email"), "cliente@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "supersecreto123");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith({ email: "cliente@example.com", password: "supersecreto123" }),
    );
  });
});
