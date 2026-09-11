import { v2 as cloudinary } from "cloudinary";
import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../config/env.js";
import { signProductImageUpload } from "./uploadService.js";

describe("signProductImageUpload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve una firma válida y verificable para la carpeta de productos", () => {
    const result = signProductImageUpload();

    expect(result.cloudName).toBe(env.CLOUDINARY_CLOUD_NAME);
    expect(result.apiKey).toBe(env.CLOUDINARY_API_KEY);
    expect(result.folder).toBe("amanda/products");

    const expectedSignature = cloudinary.utils.api_sign_request(
      { timestamp: result.timestamp, folder: result.folder },
      env.CLOUDINARY_API_SECRET!,
    );
    expect(result.signature).toBe(expectedSignature);
  });

  it("genera un timestamp en segundos cercano al actual", () => {
    const before = Math.round(Date.now() / 1000);
    const result = signProductImageUpload();
    const after = Math.round(Date.now() / 1000);
    expect(result.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.timestamp).toBeLessThanOrEqual(after);
  });
});

describe("signProductImageUpload sin Cloudinary configurado", () => {
  it("lanza un error de servicio no disponible", async () => {
    vi.resetModules();
    vi.doMock("../config/env.js", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../config/env.js")>();
      return { ...actual, isCloudinaryConfigured: false };
    });

    const { signProductImageUpload: signWithoutConfig } = await import("./uploadService.js");
    expect(() => signWithoutConfig()).toThrow();

    vi.doUnmock("../config/env.js");
    vi.resetModules();
  });
});
