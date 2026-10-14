import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const { quoteShipping } = await import("./shippingService.js");
const { updateShippingSettings } = await import("./shippingSettingsService.js");
const { ShippingSettings } = await import("../models/ShippingSettings.js");
const { clearTestDB, closeTestDB, connectTestDB } = await import("../test/dbTestUtils.js");

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe("quoteShipping", () => {
  it("incluye retiro en el local gratis cuando está habilitado", async () => {
    const options = await quoteShipping({ items: [{ quantity: 1 }], subtotal: 100000 });
    const pickup = options.find((o) => o.method === "pickup");
    expect(pickup).toBeDefined();
    expect(pickup?.cost).toBe(0);
    expect(pickup?.isFree).toBe(true);
  });

  it("no ofrece retiro si está deshabilitado", async () => {
    await updateShippingSettings({ pickup: { enabled: false } });
    const options = await quoteShipping({ items: [{ quantity: 1 }], subtotal: 100000 });
    expect(options.some((o) => o.method === "pickup")).toBe(false);
  });

  it("no ofrece envío a domicilio si está deshabilitado", async () => {
    await updateShippingSettings({ home: { enabled: false } });
    const options = await quoteShipping({
      items: [{ quantity: 1 }],
      subtotal: 100000,
      destinationPostalCode: "5000",
    });
    expect(options.some((o) => o.method === "home")).toBe(false);
  });

  it("cotiza el envío a domicilio según el peso y el destino (correo simulado)", async () => {
    const near = await quoteShipping({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 0,
      destinationPostalCode: "1000",
    });
    const far = await quoteShipping({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 0,
      destinationPostalCode: "9000",
    });
    const nearCost = near.find((o) => o.method === "home")?.cost ?? 0;
    const farCost = far.find((o) => o.method === "home")?.cost ?? 0;
    expect(farCost).toBeGreaterThan(nearCost);
  });

  it("usa el paquete por defecto si el ítem no tiene peso cargado", async () => {
    const withDefaults = await quoteShipping({
      items: [{ quantity: 1 }],
      subtotal: 0,
      destinationPostalCode: "1000",
    });
    const withExplicitWeight = await quoteShipping({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 0,
      destinationPostalCode: "1000",
    });
    // El paquete por defecto pesa 500g: sin peso cargado, el costo debe coincidir.
    expect(withDefaults.find((o) => o.method === "home")?.cost).toBe(
      withExplicitWeight.find((o) => o.method === "home")?.cost,
    );
  });

  it("sin dirección de destino usa el precio de respaldo para envío a domicilio", async () => {
    await updateShippingSettings({ home: { fallbackCost: 250000 } });
    const options = await quoteShipping({ items: [{ quantity: 1 }], subtotal: 0 });
    const home = options.find((o) => o.method === "home");
    expect(home?.cost).toBe(250000);
    expect(home?.isFallback).toBe(true);
  });

  it("aplica envío gratis cuando el subtotal supera el umbral configurado", async () => {
    await updateShippingSettings({ freeShippingThreshold: 100000 });
    const options = await quoteShipping({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 150000,
      destinationPostalCode: "1000",
    });
    const home = options.find((o) => o.method === "home");
    expect(home?.isFree).toBe(true);
    expect(home?.cost).toBe(0);
    expect(home?.originalCost).toBeGreaterThan(0);
  });

  it("no aplica envío gratis si el subtotal no llega al umbral", async () => {
    await updateShippingSettings({ freeShippingThreshold: 500000 });
    const options = await quoteShipping({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 100000,
      destinationPostalCode: "1000",
    });
    const home = options.find((o) => o.method === "home");
    expect(home?.isFree).toBe(false);
    expect(home?.cost).toBeGreaterThan(0);
  });

  it("cae al precio de respaldo si el correo tira un error al cotizar", async () => {
    const { shippingCarrier } = await import("./shipping/index.js");
    const quoteSpy = vi.spyOn(shippingCarrier, "quote").mockRejectedValueOnce(new Error("caído"));
    await updateShippingSettings({ home: { fallbackCost: 300000 } });

    const options = await quoteShipping({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 0,
      destinationPostalCode: "1000",
    });
    const home = options.find((o) => o.method === "home");
    expect(home?.cost).toBe(300000);
    expect(home?.isFallback).toBe(true);

    quoteSpy.mockRestore();
  });
});

describe("getShippingSettings (singleton)", () => {
  it("crea el documento con valores por defecto la primera vez y lo reutiliza después", async () => {
    const { getShippingSettings } = await import("./shippingSettingsService.js");
    const first = await getShippingSettings();
    const second = await getShippingSettings();
    expect(first._id.toString()).toBe(second._id.toString());
    expect(await ShippingSettings.countDocuments()).toBe(1);
  });
});
