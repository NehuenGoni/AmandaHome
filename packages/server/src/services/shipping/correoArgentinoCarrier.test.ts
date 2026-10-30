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

/** El módulo cachea el JWT y las cotizaciones en variables de módulo: se resetea entre tests para que no se filtren. */
async function importFreshCarrier() {
  vi.resetModules();
  const { correoArgentinoCarrier } = await import("./correoArgentinoCarrier.js");
  return correoArgentinoCarrier;
}

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const tokenResponse = () =>
  jsonResponse({ token: "jwt-1", expires: new Date(Date.now() + 60_000).toISOString() });

const ratesResponse = (overrides: Record<string, unknown> = {}) =>
  jsonResponse({
    customerId: "cust-1",
    validTo: new Date(Date.now() + 60 * 60_000).toISOString(),
    dimensions: { weight: 600, height: 20, width: 30, length: 40 },
    rates: [
      { deliveredType: "S", productType: "CP", productName: "Clásico", price: 2000, deliveryTimeMin: "2", deliveryTimeMax: "5" },
      { deliveredType: "S", productType: "EP", productName: "Expreso", price: 5000, deliveryTimeMin: "1", deliveryTimeMax: "3" },
      { deliveredType: "D", productType: "CP", productName: "Clásico", price: 2500, deliveryTimeMin: "3", deliveryTimeMax: "6" },
      { deliveredType: "D", productType: "EP", productName: "Expreso", price: 6000, deliveryTimeMin: "1", deliveryTimeMax: "2" },
    ],
    erroMessage: null,
    ...overrides,
  });

const quoteInput = (
  overrides: Partial<{ postalCodeDestination: string; weight: number; height: number; width: number }> = {},
) => ({
  postalCodeOrigin: "1000",
  postalCodeDestination: overrides.postalCodeDestination ?? "5000",
  packages: [
    { quantity: 2, weight: overrides.weight ?? 500, height: overrides.height ?? 15, width: overrides.width ?? 15, length: 15 },
    { quantity: 1, weight: 300, height: 10, width: 10, length: 10 },
  ],
});

function buildOrder(overrides: Record<string, unknown> = {}) {
  return new Order({
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
      phone: "1155554444",
    },
    ...overrides,
  });
}

const shipmentInput = (order: InstanceType<typeof Order>) => ({
  order,
  recipientName: "Ana Pérez",
  recipientEmail: "ana@example.com",
  declaredValue: 2500,
  package: { weight: 500, height: 15, width: 15, length: 15 },
});

describe("correoArgentinoCarrier", () => {
  beforeEach(() => {
    envMockState.isCorreoArgentinoConfigured = true;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("quote", () => {
    it("cotiza todos los productos juntos con /rates/packages y devuelve las 4 tarifas", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi.fn().mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(ratesResponse());
      vi.stubGlobal("fetch", fetchMock);

      const quote = await carrier.quote(quoteInput());

      expect(fetchMock.mock.calls[0]?.[0]).toContain("/token");
      expect(fetchMock.mock.calls[1]?.[0]).toContain("/rates/packages");
      const body = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
      expect(body).toMatchObject({ customerId: "cust-1", postalCodeOrigin: "1000", postalCodeDestination: "5000", deliveredType: null });
      expect(body.dimensions).toEqual([
        { quantity: 2, weight: 500, height: 15, width: 15, length: 15 },
        { quantity: 1, weight: 300, height: 10, width: 10, length: 10 },
      ]);

      expect(quote.carrier).toBe("correo_argentino");
      expect(quote.rates).toHaveLength(4);
      expect(quote.rates).toContainEqual({ deliveryType: "home", service: "CP", price: 250000, etaMinDays: 3, etaMaxDays: 6 });
      expect(quote.rates).toContainEqual({ deliveryType: "branch", service: "EP", price: 500000, etaMinDays: 1, etaMaxDays: 3 });
      // Medidas de la caja apilada que devuelve el correo; el peso es la suma de los productos (2×500 + 300).
      expect(quote.package).toEqual({ weight: 1300, height: 20, width: 30, length: 40 });
    });

    it("reutiliza el token mientras no venza", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValue(ratesResponse());
      vi.stubGlobal("fetch", fetchMock);

      await carrier.quote(quoteInput({ postalCodeDestination: "5000" }));
      await carrier.quote(quoteInput({ postalCodeDestination: "6000" }));

      // 1 llamado a /token + 2 a /rates/packages.
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("pide un solo token aunque lleguen varias cotizaciones a la vez", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi.fn((url: string) => Promise.resolve(url.endsWith("/token") ? tokenResponse() : ratesResponse()));
      vi.stubGlobal("fetch", fetchMock);

      await Promise.all([
        carrier.quote(quoteInput({ postalCodeDestination: "5000" })),
        carrier.quote(quoteInput({ postalCodeDestination: "6000" })),
      ]);

      expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/token"))).toHaveLength(1);
    });

    it("cachea la cotización hasta su vencimiento para el mismo destino y paquetes", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi.fn().mockResolvedValueOnce(tokenResponse()).mockResolvedValue(ratesResponse());
      vi.stubGlobal("fetch", fetchMock);

      const first = await carrier.quote(quoteInput());
      const second = await carrier.quote(quoteInput());

      expect(second).toEqual(first);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("no cachea una cotización ya vencida", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValue(ratesResponse({ validTo: new Date(Date.now() - 1000).toISOString() }));
      vi.stubGlobal("fetch", fetchMock);

      await carrier.quote(quoteInput());
      await carrier.quote(quoteInput());

      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("pide un token nuevo y reintenta una vez si el correo responde 401", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ code: 401, message: "Invalid token" }, 401))
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(ratesResponse());
      vi.stubGlobal("fetch", fetchMock);

      const quote = await carrier.quote(quoteInput());

      expect(quote.rates).toHaveLength(4);
      expect(fetchMock.mock.calls.map(([url]) => (url as string).split("/v1")[1])).toEqual([
        "/token",
        "/rates/packages",
        "/token",
        "/rates/packages",
      ]);
    });

    it("reintenta con espera creciente ante un 429", async () => {
      vi.useFakeTimers();
      const carrier = await importFreshCarrier();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({}, 429))
        .mockResolvedValueOnce(jsonResponse({}, 429))
        .mockResolvedValueOnce(ratesResponse());
      vi.stubGlobal("fetch", fetchMock);

      const promise = carrier.quote(quoteInput());
      await vi.advanceTimersByTimeAsync(400);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      await vi.advanceTimersByTimeAsync(1200);

      await expect(promise).resolves.toMatchObject({ carrier: "correo_argentino" });
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it("se rinde después de los reintentos si el correo sigue saturado", async () => {
      vi.useFakeTimers();
      const carrier = await importFreshCarrier();
      const fetchMock = vi.fn().mockResolvedValueOnce(tokenResponse()).mockResolvedValue(jsonResponse({}, 503));
      vi.stubGlobal("fetch", fetchMock);

      const promise = carrier.quote(quoteInput());
      const assertion = expect(promise).rejects.toThrow("No se pudo cotizar");
      await vi.advanceTimersByTimeAsync(2000);
      await assertion;
      // 1 token + 1 intento + 2 reintentos.
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it("lanza un error de servicio no disponible si el correo responde con error", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ code: 422, message: "Datos Invalidos" }, 422));
      vi.stubGlobal("fetch", fetchMock);

      await expect(carrier.quote(quoteInput())).rejects.toThrow("No se pudo cotizar");
    });

    it("lanza un error si la respuesta trae erroMessage", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(ratesResponse({ rates: [], erroMessage: "Destino sin cobertura" }));
      vi.stubGlobal("fetch", fetchMock);

      await expect(carrier.quote(quoteInput())).rejects.toThrow("Destino sin cobertura");
    });

    it.each([
      ["un producto de más de 50 kg", { weight: 50_001 }],
      ["un lado de más de 200 cm", { height: 201 }],
      ["una suma de lados de más de 300 cm", { height: 190, width: 100 }],
    ])("rechaza sin llamar al correo %s", async (_label, overrides) => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      await expect(carrier.quote(quoteInput(overrides))).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rechaza un pedido que en total pasa los 50 kg", async () => {
      const carrier = await importFreshCarrier();
      vi.stubGlobal("fetch", vi.fn());

      // 2 × 25 kg + 300 g.
      await expect(carrier.quote(quoteInput({ weight: 25_000 }))).rejects.toThrow("50 kg");
    });

    it("rechaza cotizar si no está configurado", async () => {
      envMockState.isCorreoArgentinoConfigured = false;
      const carrier = await importFreshCarrier();
      await expect(carrier.quote(quoteInput())).rejects.toThrow();
    });
  });

  describe("listAgencies", () => {
    it("devuelve las sucursales activas con retiro, normalizadas y cacheadas por provincia", async () => {
      const carrier = await importFreshCarrier();
      const agency = (code: string, overrides: Record<string, unknown> = {}) => ({
        code,
        name: `Sucursal ${code}`,
        services: { packageReception: true, pickupAvailability: true },
        location: {
          address: {
            streetName: "Vicente Lopez",
            streetNumber: "448",
            locality: code === "B0002" ? "Adrogué" : "Monte Grande",
            city: "Esteban Echeverria",
            provinceCode: "B",
            postalCode: "B1842ZAB",
          },
        },
        hours: { monday: { start: "0930", end: "1800" }, sunday: null, holidays: null },
        status: "ACTIVE",
        ...overrides,
      });
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(
          jsonResponse([
            agency("B0001"),
            agency("B0002"),
            agency("B0003", { status: "INACTIVE" }),
            agency("B0004", { services: { packageReception: true, pickupAvailability: false } }),
          ]),
        );
      vi.stubGlobal("fetch", fetchMock);

      const agencies = await carrier.listAgencies("B");
      await carrier.listAgencies("B");

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const url = fetchMock.mock.calls[1]?.[0] as string;
      expect(url).toContain("/agencies?");
      expect(url).toContain("customerId=cust-1");
      expect(url).toContain("provinceCode=B");
      expect(agencies.map((a) => a.code)).toEqual(["B0002", "B0001"]); // ordenadas por localidad
      expect(agencies[1]).toEqual({
        code: "B0001",
        name: "Sucursal B0001",
        address: "Vicente Lopez 448",
        locality: "Monte Grande",
        city: "Esteban Echeverria",
        provinceCode: "B",
        postalCode: "B1842ZAB",
        hours: { monday: { start: "0930", end: "1800" } },
      });
    });
  });

  describe("importShipment", () => {
    it("carga un envío a domicilio con el servicio guardado en la orden", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi.fn().mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse({ createdAt: "2026-01-01" }));
      vi.stubGlobal("fetch", fetchMock);

      const order = buildOrder({ shippingDetails: { carrier: "correo_argentino", service: "EP", quotedAt: new Date() } });
      await expect(carrier.importShipment(shipmentInput(order))).resolves.toBeUndefined();

      expect(fetchMock.mock.calls[1]?.[0]).toContain("/shipping/import");
      const body = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
      expect(body.extOrderId).toBe(order._id.toString());
      expect(body.recipient).toEqual({ name: "Ana Pérez", email: "ana@example.com", phone: "1155554444" });
      expect(body.shipping).toMatchObject({
        deliveryType: "D",
        productType: "EP",
        declaredValue: 2500,
        address: { streetName: "Calle Falsa", streetNumber: "123", provinceCode: "B", postalCode: "C1000" },
      });
    });

    it("usa Clásico en pedidos viejos sin servicio guardado", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi.fn().mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse({}));
      vi.stubGlobal("fetch", fetchMock);

      await carrier.importShipment(shipmentInput(buildOrder()));
      expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string).shipping.productType).toBe("CP");
    });

    it("carga un envío a sucursal con el código de la sucursal", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi.fn().mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse({}));
      vi.stubGlobal("fetch", fetchMock);

      const order = buildOrder({
        shippingMethod: "branch",
        shippingAddress: undefined,
        shippingDetails: {
          carrier: "correo_argentino",
          service: "CP",
          quotedAt: new Date(),
          agency: { code: "B0107", name: "Monte Grande", address: "Vicente Lopez 448", postalCode: "1842", provinceCode: "B" },
        },
      });
      await carrier.importShipment({ ...shipmentInput(order), recipientPhone: "1166667777" });

      const body = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
      expect(body.shipping).toMatchObject({ deliveryType: "S", agency: "B0107", productType: "CP" });
      expect(body.shipping.address).toBeUndefined();
      expect(body.recipient.phone).toBe("1166667777");
    });

    it("toma como éxito una orden que ya había sido importada", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ code: "402", message: "La orden ya fue importada con anterioridad." }, 402));
      vi.stubGlobal("fetch", fetchMock);

      await expect(carrier.importShipment(shipmentInput(buildOrder()))).resolves.toBeUndefined();
    });

    it("incluye el motivo del rechazo de MiCorreo en el error", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ code: "402", message: "Verifique la sucursal de destino" }, 402));
      vi.stubGlobal("fetch", fetchMock);

      await expect(carrier.importShipment(shipmentInput(buildOrder()))).rejects.toThrow(
        "Correo Argentino rechazó el envío: Verifique la sucursal de destino",
      );
    });

    it("rechaza cargar el envío si la provincia no se reconoce", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi.fn().mockResolvedValueOnce(tokenResponse());
      vi.stubGlobal("fetch", fetchMock);

      const order = buildOrder({
        shippingAddress: {
          street: "Calle Falsa",
          number: "123",
          city: "CABA",
          province: "Provincia Inexistente",
          postalCode: "C1000",
          country: "Argentina",
        },
      });
      await expect(carrier.importShipment(shipmentInput(order))).rejects.toThrow();
    });
  });

  describe("track", () => {
    it("consulta por query string y normaliza los eventos", async () => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(
          jsonResponse([
            {
              id: "000017496",
              productId: "HC",
              trackingNumber: "TN123",
              events: [
                { event: "CADUCA", date: "09-12-2024 05:00", branch: "CORREO ARGENTINO", status: "", sign: "" },
                { event: "PREIMPOSICION", date: "28-08-2024 10:33", branch: "CORREO ARGENTINO", status: "", sign: "" },
              ],
            },
          ]),
        );
      vi.stubGlobal("fetch", fetchMock);

      const events = await carrier.track("TN123");

      expect(fetchMock.mock.calls[1]?.[0]).toContain("/shipping/tracking?shippingId=TN123");
      expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("GET");
      expect(events).toEqual([
        { event: "CADUCA", date: "09-12-2024 05:00", branch: "CORREO ARGENTINO", status: undefined },
        { event: "PREIMPOSICION", date: "28-08-2024 10:33", branch: "CORREO ARGENTINO", status: undefined },
      ]);
    });

    it.each([
      ["un objeto sin eventos", { id: null, productId: null, trackingNumber: "TN123", events: [] }],
      ["un pedido inexistente", { date: "2025-01-13T14:56:09.832-03:00", error: "No existe el cliente o pedido", code: "0" }],
    ])("devuelve una lista vacía ante %s", async (_label, body) => {
      const carrier = await importFreshCarrier();
      const fetchMock = vi.fn().mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(jsonResponse(body));
      vi.stubGlobal("fetch", fetchMock);

      await expect(carrier.track("TN123")).resolves.toEqual([]);
    });
  });
});
