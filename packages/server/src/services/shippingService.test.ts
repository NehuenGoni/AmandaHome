import type { ShippingAgency } from "@amanda/shared";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const shippingService = await import("./shippingService.js");
const { updateShippingSettings } = await import("./shippingSettingsService.js");
const { ShippingSettings } = await import("../models/ShippingSettings.js");
const { shippingCarrier } = await import("./shipping/index.js");
const { clearTestDB, closeTestDB, connectTestDB } = await import("../test/dbTestUtils.js");

beforeAll(connectTestDB);
afterEach(async () => {
  vi.restoreAllMocks();
  await clearTestDB();
});
afterAll(closeTestDB);

async function quoteOptions(input: Parameters<typeof shippingService.quoteShipping>[0]) {
  return (await shippingService.quoteShipping(input)).options;
}

const agency: ShippingAgency = {
  code: "B0001",
  name: "Sucursal Centro",
  address: "Av. Siempreviva 742",
  provinceCode: "B",
  postalCode: "1842",
};

describe("quoteShipping", () => {
  it("incluye retiro en el local gratis cuando está habilitado", async () => {
    const options = await quoteOptions({ items: [{ quantity: 1 }], subtotal: 100000 });
    const pickup = options.find((o) => o.id === "pickup");
    expect(pickup).toBeDefined();
    expect(pickup?.cost).toBe(0);
    expect(pickup?.isFree).toBe(true);
  });

  it("no ofrece retiro si está deshabilitado", async () => {
    await updateShippingSettings({ pickup: { enabled: false } });
    const options = await quoteOptions({ items: [{ quantity: 1 }], subtotal: 100000 });
    expect(options.some((o) => o.method === "pickup")).toBe(false);
  });

  it("no ofrece envío a domicilio si está deshabilitado", async () => {
    await updateShippingSettings({ home: { enabled: false } });
    const options = await quoteOptions({
      items: [{ quantity: 1 }],
      subtotal: 100000,
      destinationPostalCode: "5000",
    });
    expect(options.some((o) => o.method === "home")).toBe(false);
  });

  it("ofrece Clásico y Expreso a domicilio, con el Expreso más caro", async () => {
    const options = await quoteOptions({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 0,
      destinationPostalCode: "5000",
    });
    const classic = options.find((o) => o.id === "home:CP");
    const express = options.find((o) => o.id === "home:EP");
    expect(classic?.service).toBe("CP");
    expect(express?.cost).toBeGreaterThan(classic?.cost ?? Infinity);
  });

  it("no ofrece Expreso si está deshabilitado en el admin", async () => {
    await updateShippingSettings({ home: { expressEnabled: false } });
    const options = await quoteOptions({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 0,
      destinationPostalCode: "5000",
      agency,
    });
    expect(options.some((o) => o.service === "EP")).toBe(false);
    expect(options.some((o) => o.id === "branch:CP")).toBe(true);
  });

  it("cotiza el envío a domicilio según el peso y el destino (correo simulado)", async () => {
    const near = await quoteOptions({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 0,
      destinationPostalCode: "1000",
    });
    const far = await quoteOptions({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 0,
      destinationPostalCode: "9000",
    });
    const nearCost = near.find((o) => o.id === "home:CP")?.cost ?? 0;
    const farCost = far.find((o) => o.id === "home:CP")?.cost ?? 0;
    expect(farCost).toBeGreaterThan(nearCost);
  });

  it("usa el paquete por defecto si el ítem no tiene peso cargado", async () => {
    const withDefaults = await quoteOptions({
      items: [{ quantity: 1 }],
      subtotal: 0,
      destinationPostalCode: "1000",
    });
    const withExplicitWeight = await quoteOptions({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 0,
      destinationPostalCode: "1000",
    });
    // El paquete por defecto pesa 500g: sin peso cargado, el costo debe coincidir.
    expect(withDefaults.find((o) => o.id === "home:CP")?.cost).toBe(
      withExplicitWeight.find((o) => o.id === "home:CP")?.cost,
    );
  });

  it("manda cada producto con su cantidad al correo y devuelve la caja cotizada", async () => {
    const quoteSpy = vi.spyOn(shippingCarrier, "quote");
    const result = await shippingService.quoteShipping({
      items: [
        { quantity: 2, weight: 300, height: 10, width: 10, length: 10 },
        { quantity: 1 },
      ],
      subtotal: 0,
      destinationPostalCode: "5000",
    });

    expect(quoteSpy.mock.calls[0]?.[0].packages).toEqual([
      { quantity: 2, weight: 300, height: 10, width: 10, length: 10 },
      { quantity: 1, weight: 500, height: 15, width: 15, length: 15 },
    ]);
    expect(result.packages.home?.weight).toBe(1100);
  });

  it("sin dirección de destino usa el precio de respaldo para envío a domicilio", async () => {
    await updateShippingSettings({ home: { fallbackCost: 250000 } });
    const options = await quoteOptions({ items: [{ quantity: 1 }], subtotal: 0 });
    const home = options.filter((o) => o.method === "home");
    expect(home).toHaveLength(1);
    expect(home[0]?.id).toBe("home:CP");
    expect(home[0]?.cost).toBe(250000);
    expect(home[0]?.isFallback).toBe(true);
  });

  it("aplica envío gratis al Clásico cuando el subtotal supera el umbral, pero no al Expreso", async () => {
    await updateShippingSettings({ freeShippingThreshold: 100000 });
    const options = await quoteOptions({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 150000,
      destinationPostalCode: "1000",
      agency,
    });
    for (const id of ["home:CP", "branch:CP"]) {
      const option = options.find((o) => o.id === id);
      expect(option?.isFree).toBe(true);
      expect(option?.cost).toBe(0);
      expect(option?.originalCost).toBeGreaterThan(0);
    }
    for (const id of ["home:EP", "branch:EP"]) {
      const option = options.find((o) => o.id === id);
      expect(option?.isFree).toBe(false);
      expect(option?.cost).toBeGreaterThan(0);
    }
  });

  it("no aplica envío gratis si el subtotal no llega al umbral", async () => {
    await updateShippingSettings({ freeShippingThreshold: 500000 });
    const options = await quoteOptions({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 100000,
      destinationPostalCode: "1000",
    });
    const home = options.find((o) => o.id === "home:CP");
    expect(home?.isFree).toBe(false);
    expect(home?.cost).toBeGreaterThan(0);
  });

  it("cae al precio de respaldo si el correo tira un error al cotizar", async () => {
    vi.spyOn(shippingCarrier, "quote").mockRejectedValueOnce(new Error("caído"));
    await updateShippingSettings({ home: { fallbackCost: 300000 } });

    const options = await quoteOptions({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 0,
      destinationPostalCode: "1000",
    });
    const home = options.filter((o) => o.method === "home");
    expect(home).toHaveLength(1);
    expect(home[0]?.cost).toBe(300000);
    expect(home[0]?.isFallback).toBe(true);
  });

  it("ofrece retiro en sucursal (más barato que a domicilio) solo si se eligió una sucursal", async () => {
    const withoutAgency = await quoteOptions({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 0,
      destinationPostalCode: "1842",
    });
    expect(withoutAgency.some((o) => o.method === "branch")).toBe(false);

    const withAgency = await quoteOptions({
      items: [{ quantity: 1, weight: 500 }],
      subtotal: 0,
      destinationPostalCode: "1842",
      agency,
    });
    const branch = withAgency.find((o) => o.id === "branch:CP");
    expect(branch?.agency?.code).toBe("B0001");
    expect(branch?.cost).toBeLessThan(withAgency.find((o) => o.id === "home:CP")?.cost ?? 0);
  });

  it("cotiza la sucursal con el CP de la sucursal, no el de la dirección", async () => {
    const quoteSpy = vi.spyOn(shippingCarrier, "quote");
    await quoteOptions({ items: [{ quantity: 1 }], subtotal: 0, destinationPostalCode: "5000", agency });
    expect(quoteSpy.mock.calls.map((call) => call[0].postalCodeDestination)).toEqual(["5000", "1842"]);
  });

  it("no ofrece sucursal si el correo no pudo cotizarla (no hay precio de respaldo)", async () => {
    vi.spyOn(shippingCarrier, "quote").mockRejectedValue(new Error("caído"));
    const options = await quoteOptions({ items: [{ quantity: 1 }], subtotal: 0, agency });
    expect(options.some((o) => o.method === "branch")).toBe(false);
  });

  it("no ofrece sucursal si está deshabilitada", async () => {
    await updateShippingSettings({ branch: { enabled: false } });
    const options = await quoteOptions({ items: [{ quantity: 1 }], subtotal: 0, agency });
    expect(options.some((o) => o.method === "branch")).toBe(false);
  });
});

describe("findAgency / listAgencies", () => {
  it("encuentra la sucursal en la lista del correo", async () => {
    const found = await shippingService.findAgency("B", "B0002");
    expect(found.name).toBe("Sucursal Norte");
  });

  it("rechaza una sucursal que no está en la lista", async () => {
    await expect(shippingService.findAgency("B", "X9999")).rejects.toThrow("Sucursal no encontrada");
  });

  it("no lista sucursales si el retiro en sucursal está deshabilitado", async () => {
    await updateShippingSettings({ branch: { enabled: false } });
    expect(await shippingService.listAgencies("B")).toEqual([]);
  });
});

describe("getShippingSettings (singleton)", () => {
  it("crea el documento con valores por defecto la primera vez y lo reutiliza después", async () => {
    const { getShippingSettings } = await import("./shippingSettingsService.js");
    const first = await getShippingSettings();
    const second = await getShippingSettings();
    expect(first._id.toString()).toBe(second._id.toString());
    expect(first.branch.enabled).toBe(true);
    expect(first.home.expressEnabled).toBe(true);
    expect(await ShippingSettings.countDocuments()).toBe(1);
  });
});
