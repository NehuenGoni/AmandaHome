import type { User } from "@amanda/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";
import * as authApi from "@/lib/authApi";
import Register from "./Register.js";

vi.mock("@/lib/authApi");

function buildUser(): User {
  return {
    _id: "1",
    email: "nueva@example.com",
    firstName: "Nueva",
    lastName: "Cuenta",
    role: "customer",
    addresses: [],
    isActive: true,
    createdAt: "",
    updatedAt: "",
  };
}

function renderRegister() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Register />
      </AuthProvider>
    </BrowserRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.refresh).mockRejectedValue(new Error("sin sesión"));
});

describe("Register", () => {
  it("envía los datos del formulario a register", async () => {
    vi.mocked(authApi.register).mockResolvedValue({ user: buildUser(), accessToken: "token-1" });
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText("Nombre"), "Nueva");
    await user.type(screen.getByLabelText("Apellido"), "Cuenta");
    await user.type(screen.getByLabelText("Email"), "nueva@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "supersecreto123");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() =>
      expect(authApi.register).toHaveBeenCalledWith({
        firstName: "Nueva",
        lastName: "Cuenta",
        email: "nueva@example.com",
        password: "supersecreto123",
      }),
    );
  });

  it("muestra un error si el email ya está en uso", async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      new ApiError("Ya existe una cuenta con ese email", 409, "CONFLICT"),
    );
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText("Nombre"), "Nueva");
    await user.type(screen.getByLabelText("Apellido"), "Cuenta");
    await user.type(screen.getByLabelText("Email"), "nueva@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "supersecreto123");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText("Ya existe una cuenta con ese email")).toBeInTheDocument();
  });
});
