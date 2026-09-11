import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./emailService.js";

describe("sendEmail", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cae a console.log cuando no hay RESEND_API_KEY configurada (modo dev/test)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendEmail({ to: "cliente@example.com", subject: "Asunto", html: "<p>hola</p>" });
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("cliente@example.com"),
    );
  });

  it("nunca lanza, incluso si algo interno falla", async () => {
    await expect(
      sendEmail({ to: "cliente@example.com", subject: "Asunto", html: "<p>hola</p>" }),
    ).resolves.toBeUndefined();
  });
});
