import { afterEach, describe, expect, it, vi } from "vitest";
import { htmlToText, sendEmail } from "./emailService.js";

describe("htmlToText", () => {
  it("usa el alt del logo como nombre de marca", () => {
    const text = htmlToText('<img src="https://x.com/logo.png" alt="Amanda Home & Deco" width="180" /><p>Hola</p>');
    expect(text).toContain("Amanda Home & Deco");
    expect(text).not.toContain("logo.png");
  });

  it("conserva los links y quita las etiquetas", () => {
    const text = htmlToText(
      '<h2>Hola Ana</h2><p>Entrá &amp; mirá</p><a href="https://x.com/r?t=1" style="a:b">Restablecer</a>',
    );
    expect(text).toContain("Hola Ana");
    expect(text).toContain("Entrá & mirá");
    expect(text).toContain("Restablecer (https://x.com/r?t=1)");
    expect(text).not.toContain("<");
  });
});

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
