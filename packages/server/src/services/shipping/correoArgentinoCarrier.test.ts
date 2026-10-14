import { Types } from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const envMockState = vi.hoisted(() => ({
  isCorreoArgentinoConfigured: true,
  MICORREO_USER: "user",
  MICORREO_PASSWORD: "pass",
  MICORREO_CUSTOMER_ID: "cust-1",
  MICORREO_ENV: "test" as const,
}));

vi.mock("../../config/env.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/env.js")>();
  return {
    ...actual,
    get isCorreoArgentinoConfigured() {
      return envMockState.isCorreoArgentinoConfigured;
    },
    env: { ...actual.env, ...envMockState },
  };
});

const { Order } = await import("../../models/Order.js");

/** El módulo cachea el JWT en una variable de módulo: se resetea entre tests para que no se filtre entre ellos. */
async function importFreshCarrier() {
  vi.resetModules();
  const { correoArgentinoCarrier } = await import("./correoArgentinoCarrier.js");
  return correoArgentinoCarrier;
}

describe("correoArgentinoCarrier", () => {
  beforeEach(() => {
    envMockState.isCorreoArgentinoConfigured = true;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("obtiene un token y cotiza el envío", async () => {
    const carrier = await importFreshCarrier();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "jwt-1", expires: new Date(Date.now() + 60_000).toISOString() }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: [
            { deliveredType: "D", productType: "CP", productName: "Clásico", price: 2500, deliveryTimeMin: 3, deliveryTimeMax: 6 },
          ],
        }),
      } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const rate = await carrier.quote({
      postalCodeOrigin: "1000",
      postalCodeDestination: "5000",
      package: { weight: 500, height: 15, width: 15, length: 15 },
    });

    expect(rate.carrier).toBe("correo_argentino");
    expect(rate.price).toBe(250000); // 2500 pesos -> centavos
    expect(rate.etaMinDays).toBe(3);
    expect(rate.etaMaxDays).toBe(6);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/token");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/rates");
  });

  it("reutiliza el token mientras no venza", async () => {
    const carrier = await importFreshCarrier();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "jwt-1", expires: new Date(Date.now() + 60_000).toISOString() }),
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => ({ rates: [{ deliveredType: "D", productType: "CP", productName: "Clásico", price: 1000 }] }),
      } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const input = {
      postalCodeOrigin: "1000",
      postalCodeDestination: "5000",
      package: { weight: 500, height: 15, width: 15, length: 15 },
    };
    await carrier.quote(input);
    await carrier.quote(input);

    // 1 llamado a /token + 2 llamados a /rates: el segundo quote no debería pedir token de nuevo.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("lanza un error de servicio no disponible si el correo responde con error", async () => {
    const carrier = await importFreshCarrier();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "jwt-1", expires: new Date(Date.now() + 60_000).toISOString() }),
      } as Response)
      .mockResolvedValueOnce({ ok: false } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      carrier.quote({
        postalCodeOrigin: "1000",
        postalCodeDestination: "5000",
        package: { weight: 500, height: 15, width: 15, length: 15 },
      }),
    ).rejects.toThrow();
  });

  it("rechaza cotizar si no está configurado", async () => {
    envMockState.isCorreoArgentinoConfigured = false;
    const carrier = await importFreshCarrier();
    await expect(
      carrier.quote({
        postalCodeOrigin: "1000",
        postalCodeDestination: "5000",
        package: { weight: 500, height: 15, width: 15, length: 15 },
      }),
    ).rejects.toThrow();
  });

  it("carga el envío en MiCorreo para un pedido con dirección", async () => {
    const carrier = await importFreshCarrier();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "jwt-1", expires: new Date(Date.now() + 60_000).toISOString() }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const order = new Order({
      orderNumber: 1,
      customer: new Types.ObjectId(),
      items: [
        {
          product: new Types.ObjectId(),
          productName: "Vela",
          variantSku: "VELA-1",
          attributeName: "Color",
          attributeValue: "Verde",
          unitPrice: 250000,
          quantity: 1,
          subtotal: 250000,
        },
      ],
      subtotal: 250000,
      shippingCost: 150000,
      total: 400000,
      paymentMethod: "mercado_pago",
      shippingMethod: "home",
      shippingAddress: {
        street: "Calle Falsa",
        number: "123",
        city: "CABA",
        province: "Buenos Aires",
        postalCode: "C1000",
        country: "Argentina",
      },
    });

    await expect(
      carrier.importShipment({
        order,
        recipientName: "Ana Pérez",
        recipientEmail: "ana@example.com",
        declaredValue: 2500,
        package: { weight: 500, height: 15, width: 15, length: 15 },
      }),
    ).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/shipping/import");
    const importBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
    expect(importBody.recipient.email).toBe("ana@example.com");
    expect(importBody.shipping.address.provinceCode).toBe("B");
    expect(importBody.shipping.declaredValue).toBe(2500);
  });

  it("rechaza cargar el envío si la provincia no se reconoce", async () => {
    const carrier = await importFreshCarrier();
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "jwt-1", expires: new Date(Date.now() + 60_000).toISOString() }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const order = new Order({
      orderNumber: 1,
      customer: new Types.ObjectId(),
      items: [
        {
          product: new Types.ObjectId(),
          productName: "Vela",
          variantSku: "VELA-1",
          attributeName: "Color",
          attributeValue: "Verde",
          unitPrice: 250000,
          quantity: 1,
          subtotal: 250000,
        },
      ],
      subtotal: 250000,
      shippingCost: 150000,
      total: 400000,
      paymentMethod: "mercado_pago",
      shippingMethod: "home",
      shippingAddress: {
        street: "Calle Falsa",
        number: "123",
        city: "CABA",
        province: "Provincia Inexistente",
        postalCode: "C1000",
        country: "Argentina",
      },
    });

    await expect(
      carrier.importShipment({
        order,
        recipientName: "Ana Pérez",
        recipientEmail: "ana@example.com",
        declaredValue: 2500,
        package: { weight: 500, height: 15, width: 15, length: 15 },
      }),
    ).rejects.toThrow();
  });
});
