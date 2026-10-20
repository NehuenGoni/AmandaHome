import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import * as withdrawalApi from "@/lib/withdrawalApi";
import Arrepentimiento from "./Arrepentimiento";

vi.mock("@/lib/withdrawalApi");

function renderPage() {
  return render(
    <BrowserRouter>
      <Arrepentimiento />
    </BrowserRouter>,
  );
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/número de pedido/i), "12");
  await user.type(screen.getByLabelText(/email/i), "cliente@example.com");
  await user.type(screen.getByLabelText(/nombre y apellido/i), "Cliente Test");
  await user.click(screen.getByRole("button", { name: /solicitar arrepentimiento/i }));
}

describe("Arrepentimiento", () => {
  beforeEach(() => vi.resetAllMocks());

  it("muestra la constancia al enviar la solicitud", async () => {
    vi.mocked(withdrawalApi.createWithdrawal).mockResolvedValue({
      requestNumber: 5,
      createdAt: new Date().toISOString(),
    });
    renderPage();
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByText(/nº de trámite/i)).toBeInTheDocument());
    expect(withdrawalApi.createWithdrawal).toHaveBeenCalledWith(
      expect.objectContaining({ orderNumber: 12, email: "cliente@example.com" }),
    );
  });

  it("muestra el error de la API", async () => {
    vi.mocked(withdrawalApi.createWithdrawal).mockRejectedValue(
      new ApiError("Demasiadas solicitudes, intentá de nuevo más tarde", 429),
    );
    renderPage();
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByText(/demasiadas solicitudes/i)).toBeInTheDocument());
  });
});
