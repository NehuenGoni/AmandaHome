import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { StockMovement } from "../models/StockMovement.js";
import { User } from "../models/User.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { signAccessToken } from "../utils/jwt.js";

const app = createApp();

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

const PRICE = 100000; // $1.000,00
const BARCODE = "7790001112223";

async function tokenFor(role: "admin" | "customer") {
  const user = await User.create({
    email: `${role}-${Date.now()}-${Math.random()}@example.com`,
    password: "supersecreto123",
    firstName: "Test",
    lastName: role,
    role,
  });
  return { id: user._id.toString(), token: signAccessToken({ sub: user._id.toString(), role }) };
}

async function createProduct(stock = 10) {
  const category = await Category.create({ name: `Deco-${Math.random()}` });
  const product = await Product.create({
    name: `Vela-${Math.random()}`,
    category,
    variants: [
      {
        sku: `SKU-${Math.random().toString(36).slice(2)}`,
        attributeName: "Aroma",
        attributeValue: "Vainilla",
        price: PRICE,
        costPrice: 40000,
        stock,
        lowStockThreshold: 1,
        barcode: BARCODE,
      },
    ],
  });
  return { productId: product._id.toString(), sku: product.variants[0]!.sku };
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

function openCash(token: string, openingAmount = 0) {
  return request(app).post("/api/admin/cash-sessions").set(auth(token)).send({ openingAmount });
}

async function stockOf(productId: string) {
  return (await Product.findById(productId))!.variants[0]!.stock;
}

describe("seguridad", () => {
  it("rechaza sin token (401) y a clientes no admin (403)", async () => {
    await request(app).get("/api/admin/store-sales").expect(401);
    await request(app).get("/api/admin/cash-sessions/current").expect(401);

    const { token } = await tokenFor("customer");
    await request(app).get("/api/admin/store-sales").set(auth(token)).expect(403);
    await request(app).post("/api/admin/cash-sessions").set(auth(token)).send({ openingAmount: 0 }).expect(403);
  });
});

describe("caja", () => {
  it("abre una caja, no permite abrir otra y la devuelve como actual", async () => {
    const { token } = await tokenFor("admin");
    await request(app).get("/api/admin/cash-sessions/current").set(auth(token)).expect(200, { session: null });

    const opened = await openCash(token, 50000).expect(201);
    expect(opened.body.session.status).toBe("open");
    expect(opened.body.session.totals.expectedCash).toBe(50000);

    await openCash(token).expect(409);

    const current = await request(app).get("/api/admin/cash-sessions/current").set(auth(token)).expect(200);
    expect(current.body.session._id).toBe(opened.body.session._id);
  });

  it("rechaza un egreso mayor al efectivo disponible", async () => {
    const { token } = await tokenFor("admin");
    await openCash(token, 10000).expect(201);
    await request(app)
      .post("/api/admin/cash-sessions/current/movements")
      .set(auth(token))
      .send({ type: "out", amount: 10001, reason: "Gasto" })
      .expect(400);
  });

  it("no permite cerrar si no hay caja abierta", async () => {
    const { token } = await tokenFor("admin");
    await request(app)
      .post("/api/admin/cash-sessions/current/close")
      .set(auth(token))
      .send({ countedCash: 0 })
      .expect(409);
  });
});

describe("venta en local", () => {
  it("no permite vender sin caja abierta", async () => {
    const { token } = await tokenFor("admin");
    const { productId, sku } = await createProduct();
    await request(app)
      .post("/api/admin/store-sales")
      .set(auth(token))
      .send({ items: [{ productId, variantSku: sku, quantity: 1 }], paymentMethod: "debit" })
      .expect(409);
    expect(await stockOf(productId)).toBe(10);
  });

  it("vende en efectivo con descuentos, calcula vuelto, descuenta stock y registra el movimiento", async () => {
    const { token, id: adminId } = await tokenFor("admin");
    const { productId, sku } = await createProduct();
    await openCash(token).expect(201);

    // 2 x $1.000 = 2.000 - 10% de línea (200) = 1.800 - $100 global = 1.700
    const res = await request(app)
      .post("/api/admin/store-sales")
      .set(auth(token))
      .send({
        items: [{ productId, variantSku: sku, quantity: 2, discount: { type: "percent", value: 10 } }],
        discount: { type: "amount", value: 10000 },
        paymentMethod: "cash",
        cashReceived: 200000,
      })
      .expect(201);

    const sale = res.body.sale;
    expect(sale.items[0].unitPrice).toBe(PRICE);
    expect(sale.items[0].discount).toBe(20000);
    expect(sale.subtotal).toBe(180000);
    expect(sale.discount.amount).toBe(10000);
    expect(sale.total).toBe(170000);
    expect(sale.change).toBe(30000);
    expect(sale.seller).toBe(adminId);
    expect(sale.saleNumber).toBe(1);

    expect(await stockOf(productId)).toBe(8);
    const movements = await StockMovement.find({ type: "sale_out" });
    expect(movements).toHaveLength(1);
    expect(movements[0]!.reference).toBe(sale._id);
    expect(movements[0]!.quantity).toBe(-2);
  });

  it("rechaza efectivo insuficiente, stock insuficiente y descuentos inválidos sin tocar el stock", async () => {
    const { token } = await tokenFor("admin");
    const { productId, sku } = await createProduct();
    await openCash(token).expect(201);
    const send = (body: object) =>
      request(app).post("/api/admin/store-sales").set(auth(token)).send(body);
    const items = [{ productId, variantSku: sku, quantity: 1 }];

    await send({ items, paymentMethod: "cash", cashReceived: PRICE - 1 }).expect(400);
    await send({ items, paymentMethod: "cash" }).expect(400);
    await send({ items: [{ ...items[0], quantity: 11 }], paymentMethod: "debit" }).expect(400);
    await send({
      items: [{ ...items[0], discount: { type: "amount", value: PRICE + 1 } }],
      paymentMethod: "debit",
    }).expect(400);
    await send({ items, discount: { type: "percent", value: 100 }, paymentMethod: "debit" }).expect(400);
    await send({ items: [...items, ...items], paymentMethod: "debit" }).expect(400);

    expect(await stockOf(productId)).toBe(10);
    expect(await StockMovement.countDocuments()).toBe(0);
  });

  it("anula una venta de la caja abierta y repone el stock una sola vez", async () => {
    const { token } = await tokenFor("admin");
    const { productId, sku } = await createProduct();
    await openCash(token).expect(201);
    const created = await request(app)
      .post("/api/admin/store-sales")
      .set(auth(token))
      .send({ items: [{ productId, variantSku: sku, quantity: 3 }], paymentMethod: "debit" })
      .expect(201);
    expect(await stockOf(productId)).toBe(7);

    const id = created.body.sale._id;
    const voided = await request(app)
      .post(`/api/admin/store-sales/${id}/void`)
      .set(auth(token))
      .send({ reason: "Error de carga" })
      .expect(200);
    expect(voided.body.sale.status).toBe("voided");
    expect(await stockOf(productId)).toBe(10);

    await request(app).post(`/api/admin/store-sales/${id}/void`).set(auth(token)).send({ reason: "Otra vez" }).expect(409);
    expect(await stockOf(productId)).toBe(10);
  });

  it("devoluciones parciales: prorratea el descuento global y reintegra exactamente lo cobrado", async () => {
    const { token } = await tokenFor("admin");
    const { productId, sku } = await createProduct();
    await openCash(token, 1000000).expect(201);
    // 3 x $1.000 = 3.000, 10% global (300) => total 2.700
    const created = await request(app)
      .post("/api/admin/store-sales")
      .set(auth(token))
      .send({
        items: [{ productId, variantSku: sku, quantity: 3 }],
        discount: { type: "percent", value: 10 },
        paymentMethod: "debit",
      })
      .expect(201);
    const id = created.body.sale._id;
    expect(created.body.sale.total).toBe(270000);

    const first = await request(app)
      .post(`/api/admin/store-sales/${id}/returns`)
      .set(auth(token))
      .send({ items: [{ variantSku: sku, quantity: 1 }], refundMethod: "cash", reason: "No le gustó" })
      .expect(201);
    expect(first.body.sale.status).toBe("partially_returned");
    expect(first.body.sale.returns[0].amount).toBe(90000);
    expect(await stockOf(productId)).toBe(8);

    // Más de lo que queda por devolver
    await request(app)
      .post(`/api/admin/store-sales/${id}/returns`)
      .set(auth(token))
      .send({ items: [{ variantSku: sku, quantity: 3 }], refundMethod: "cash" })
      .expect(400);

    const second = await request(app)
      .post(`/api/admin/store-sales/${id}/returns`)
      .set(auth(token))
      .send({ items: [{ variantSku: sku, quantity: 2 }], refundMethod: "cash" })
      .expect(201);
    expect(second.body.sale.status).toBe("returned");
    const refunded = second.body.sale.returns.reduce((n: number, r: { amount: number }) => n + r.amount, 0);
    expect(refunded).toBe(270000);
    expect(await stockOf(productId)).toBe(10);

    // Ya devuelta por completo: no admite más devoluciones ni anulación
    await request(app)
      .post(`/api/admin/store-sales/${id}/returns`)
      .set(auth(token))
      .send({ items: [{ variantSku: sku, quantity: 1 }], refundMethod: "cash" })
      .expect(409);
    await request(app).post(`/api/admin/store-sales/${id}/void`).set(auth(token)).send({ reason: "x" }).expect(409);
  });

  it("no permite reintegrar en efectivo más de lo que hay en caja", async () => {
    const { token } = await tokenFor("admin");
    const { productId, sku } = await createProduct();
    await openCash(token, 0).expect(201);
    const created = await request(app)
      .post("/api/admin/store-sales")
      .set(auth(token))
      .send({ items: [{ productId, variantSku: sku, quantity: 1 }], paymentMethod: "debit" })
      .expect(201);

    // La venta fue con débito: en la caja no hay efectivo para reintegrar.
    await request(app)
      .post(`/api/admin/store-sales/${created.body.sale._id}/returns`)
      .set(auth(token))
      .send({ items: [{ variantSku: sku, quantity: 1 }], refundMethod: "cash" })
      .expect(400);
    // Pero sí se puede reintegrar al mismo medio.
    await request(app)
      .post(`/api/admin/store-sales/${created.body.sale._id}/returns`)
      .set(auth(token))
      .send({ items: [{ variantSku: sku, quantity: 1 }], refundMethod: "debit" })
      .expect(201);
  });

  it("una venta de una caja anterior no se anula, pero sí se devuelve en la caja actual", async () => {
    const { token } = await tokenFor("admin");
    const { productId, sku } = await createProduct();
    await openCash(token).expect(201);
    const created = await request(app)
      .post("/api/admin/store-sales")
      .set(auth(token))
      .send({ items: [{ productId, variantSku: sku, quantity: 1 }], paymentMethod: "transfer" })
      .expect(201);
    await request(app)
      .post("/api/admin/cash-sessions/current/close")
      .set(auth(token))
      .send({ countedCash: 0 })
      .expect(200);

    // Sin caja abierta no se puede operar
    await request(app)
      .post(`/api/admin/store-sales/${created.body.sale._id}/void`)
      .set(auth(token))
      .send({ reason: "x" })
      .expect(409);

    const second = await openCash(token).expect(201);
    await request(app)
      .post(`/api/admin/store-sales/${created.body.sale._id}/void`)
      .set(auth(token))
      .send({ reason: "x" })
      .expect(409);
    const ret = await request(app)
      .post(`/api/admin/store-sales/${created.body.sale._id}/returns`)
      .set(auth(token))
      .send({ items: [{ variantSku: sku, quantity: 1 }], refundMethod: "transfer" })
      .expect(201);
    expect(ret.body.sale.returns[0].cashSession).toBe(second.body.session._id);
  });
});

describe("arqueo", () => {
  it("calcula el efectivo esperado con ventas, devoluciones, ingresos y egresos, y guarda la diferencia", async () => {
    const { token } = await tokenFor("admin");
    const { productId, sku } = await createProduct();
    await openCash(token, 100000).expect(201);
    const sell = (paymentMethod: string, quantity: number, extra: object = {}) =>
      request(app)
        .post("/api/admin/store-sales")
        .set(auth(token))
        .send({ items: [{ productId, variantSku: sku, quantity }], paymentMethod, ...extra });

    const cashSale = await sell("cash", 2, { cashReceived: 200000 }).expect(201); // +2.000 efectivo
    await sell("debit", 1).expect(201); // no suma efectivo
    const voidable = await sell("cash", 1, { cashReceived: 100000 }).expect(201);
    await request(app)
      .post(`/api/admin/store-sales/${voidable.body.sale._id}/void`)
      .set(auth(token))
      .send({ reason: "Se arrepintió" })
      .expect(200); // anulada: no cuenta
    await request(app)
      .post(`/api/admin/store-sales/${cashSale.body.sale._id}/returns`)
      .set(auth(token))
      .send({ items: [{ variantSku: sku, quantity: 1 }], refundMethod: "cash" })
      .expect(201); // -1.000 efectivo
    await request(app)
      .post("/api/admin/cash-sessions/current/movements")
      .set(auth(token))
      .send({ type: "in", amount: 20000, reason: "Cambio" })
      .expect(201);
    await request(app)
      .post("/api/admin/cash-sessions/current/movements")
      .set(auth(token))
      .send({ type: "out", amount: 5000, reason: "Librería" })
      .expect(201);

    const live = await request(app).get("/api/admin/cash-sessions/current").set(auth(token)).expect(200);
    // 1.000 apertura + 2.000 ventas - 1.000 devolución + 200 ingreso - 50 egreso
    expect(live.body.session.totals.expectedCash).toBe(100000 + 200000 - 100000 + 20000 - 5000);
    expect(live.body.session.totals.salesByMethod).toMatchObject({ cash: 200000, debit: 100000 });
    expect(live.body.session.totals.salesCount).toBe(2);

    const closed = await request(app)
      .post("/api/admin/cash-sessions/current/close")
      .set(auth(token))
      .send({ countedCash: 210000, notes: "Faltan $50" })
      .expect(200);
    expect(closed.body.session.status).toBe("closed");
    expect(closed.body.session.totals.expectedCash).toBe(215000);
    expect(closed.body.session.difference).toBe(-5000);

    // Cerrada: queda en el historial con el mismo snapshot y ya no hay caja actual
    const detail = await request(app)
      .get(`/api/admin/cash-sessions/${closed.body.session._id}`)
      .set(auth(token))
      .expect(200);
    expect(detail.body.session.totals.expectedCash).toBe(215000);
    await request(app).get("/api/admin/cash-sessions/current").set(auth(token)).expect(200, { session: null });
  });
});

describe("búsqueda por código", () => {
  it("encuentra por código de barras y por SKU, y responde 404 si no existe", async () => {
    const { token } = await tokenFor("admin");
    const { productId, sku } = await createProduct();

    const byBarcode = await request(app)
      .get("/api/admin/store-sales/lookup")
      .query({ code: BARCODE })
      .set(auth(token))
      .expect(200);
    expect(byBarcode.body.result).toMatchObject({ productId, variantSku: sku, price: PRICE, stock: 10 });

    const bySku = await request(app)
      .get("/api/admin/store-sales/lookup")
      .query({ code: sku.toLowerCase() })
      .set(auth(token))
      .expect(200);
    expect(bySku.body.result.productId).toBe(productId);

    await request(app).get("/api/admin/store-sales/lookup").query({ code: "no-existe" }).set(auth(token)).expect(404);
  });
});

describe("resumen y ticket por mail", () => {
  it("resume las ventas de hoy por medio de pago excluyendo las anuladas", async () => {
    const { token } = await tokenFor("admin");
    const { productId, sku } = await createProduct();
    await openCash(token).expect(201);
    const sell = (paymentMethod: string, extra: object = {}) =>
      request(app)
        .post("/api/admin/store-sales")
        .set(auth(token))
        .send({ items: [{ productId, variantSku: sku, quantity: 1 }], paymentMethod, ...extra });
    await sell("debit").expect(201);
    await sell("credit").expect(201);
    const toVoid = await sell("debit").expect(201);
    await request(app)
      .post(`/api/admin/store-sales/${toVoid.body.sale._id}/void`)
      .set(auth(token))
      .send({ reason: "x" })
      .expect(200);

    const res = await request(app).get("/api/admin/store-sales/summary").set(auth(token)).expect(200);
    expect(res.body.summary.count).toBe(2);
    expect(res.body.summary.total).toBe(2 * PRICE);
    expect(res.body.summary.byMethod.debit).toEqual({ count: 1, total: PRICE });
    expect(res.body.summary.byMethod.cash).toEqual({ count: 0, total: 0 });
  });

  it("envía el ticket por mail y registra el destinatario", async () => {
    const { token } = await tokenFor("admin");
    const { productId, sku } = await createProduct();
    await openCash(token).expect(201);
    const created = await request(app)
      .post("/api/admin/store-sales")
      .set(auth(token))
      .send({
        items: [{ productId, variantSku: sku, quantity: 1 }],
        paymentMethod: "debit",
        customer: { name: "Ana <b>", email: "ana@example.com" },
      })
      .expect(201);

    const res = await request(app)
      .post(`/api/admin/store-sales/${created.body.sale._id}/email`)
      .set(auth(token))
      .send({ email: "otra@example.com" })
      .expect(200);
    expect(res.body.sale.emailSentTo).toContain("otra@example.com");

    await request(app)
      .post(`/api/admin/store-sales/${created.body.sale._id}/email`)
      .set(auth(token))
      .send({ email: "no-es-un-mail" })
      .expect(400);
  });
});
