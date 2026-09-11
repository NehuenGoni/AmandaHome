import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { StockMovement } from "../models/StockMovement.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import * as inventoryService from "./inventoryService.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

async function createProduct(stock = 10, lowStockThreshold = 2) {
  const unique = Math.random().toString(36).slice(2);
  const category = await Category.create({ name: `Cat-${unique}` });
  return Product.create({
    name: `Producto ${unique}`,
    category,
    variants: [
      {
        sku: `SKU-${unique}`,
        attributeName: "Color",
        attributeValue: "Verde",
        price: 250000,
        costPrice: 100000,
        stock,
        lowStockThreshold,
      },
    ],
  });
}

describe("recordMovements / returnStock", () => {
  it("registra movimientos en batch", async () => {
    const product = await createProduct();
    await inventoryService.recordMovements(
      [
        {
          product: product._id.toString(),
          variantSku: product.variants[0]!.sku,
          quantity: -2,
          previousStock: 10,
          newStock: 8,
        },
      ],
      { type: "sale_out", reference: "order-1", createdBy: undefined },
    );
    expect(await StockMovement.countDocuments()).toBe(1);
  });

  it("no hace nada si la lista de cambios está vacía", async () => {
    await inventoryService.recordMovements([], { type: "sale_out" });
    expect(await StockMovement.countDocuments()).toBe(0);
  });

  it("returnStock incrementa el stock y registra un movimiento type=return", async () => {
    const product = await createProduct(3);
    const sku = product.variants[0]!.sku;

    await inventoryService.returnStock(
      [{ product: product._id.toString(), variantSku: sku, quantity: 2 }],
      { reference: "order-1", note: "cancelado" },
    );

    const updated = await Product.findById(product._id);
    expect(updated?.variants[0]?.stock).toBe(5);

    const movement = await StockMovement.findOne({ product: product._id });
    expect(movement?.type).toBe("return");
    expect(movement?.previousStock).toBe(3);
    expect(movement?.newStock).toBe(5);
  });

  it("returnStock ignora silenciosamente ítems de productos inexistentes", async () => {
    await expect(
      inventoryService.returnStock(
        [{ product: "64b000000000000000000000", variantSku: "X", quantity: 1 }],
        {},
      ),
    ).resolves.toBeUndefined();
    expect(await StockMovement.countDocuments()).toBe(0);
  });
});

describe("adjustStock", () => {
  it("aumenta el stock y registra el movimiento con su responsable", async () => {
    const product = await createProduct(5);
    const sku = product.variants[0]!.sku;
    const adminId = "64b000000000000000000001";

    const movement = await inventoryService.adjustStock(
      { productId: product._id.toString(), variantSku: sku, quantityChange: 10, note: "recuento físico" },
      adminId,
    );

    expect(movement.newStock).toBe(15);
    expect(movement.createdBy?.toString()).toBe(adminId);

    const updated = await Product.findById(product._id);
    expect(updated?.variants[0]?.stock).toBe(15);
  });

  it("disminuye el stock cuando hay suficiente", async () => {
    const product = await createProduct(5);
    const sku = product.variants[0]!.sku;

    const movement = await inventoryService.adjustStock(
      { productId: product._id.toString(), variantSku: sku, quantityChange: -3 },
      "64b000000000000000000001",
    );
    expect(movement.newStock).toBe(2);
  });

  it("rechaza un ajuste que dejaría el stock negativo", async () => {
    const product = await createProduct(2);
    const sku = product.variants[0]!.sku;

    await expect(
      inventoryService.adjustStock(
        { productId: product._id.toString(), variantSku: sku, quantityChange: -5 },
        "64b000000000000000000001",
      ),
    ).rejects.toThrow();

    const updated = await Product.findById(product._id);
    expect(updated?.variants[0]?.stock).toBe(2);
  });

  it("rechaza un producto o variante inexistente", async () => {
    await expect(
      inventoryService.adjustStock(
        { productId: "64b000000000000000000000", variantSku: "X", quantityChange: 1 },
        "64b000000000000000000001",
      ),
    ).rejects.toThrow();
  });
});

describe("listMovements", () => {
  it("filtra por tipo y producto", async () => {
    const product = await createProduct();
    const sku = product.variants[0]!.sku;

    await inventoryService.adjustStock(
      { productId: product._id.toString(), variantSku: sku, quantityChange: 5 },
      "64b000000000000000000001",
    );
    await inventoryService.returnStock([{ product: product._id.toString(), variantSku: sku, quantity: 1 }], {});

    const onlyAdjustments = await inventoryService.listMovements({
      page: 1,
      limit: 20,
      type: "adjustment",
    });
    expect(onlyAdjustments.total).toBe(1);

    const byProduct = await inventoryService.listMovements({
      page: 1,
      limit: 20,
      product: product._id.toString(),
    });
    expect(byProduct.total).toBe(2);
  });
});

describe("listLowStock", () => {
  it("devuelve solo variantes con stock por debajo o igual al umbral", async () => {
    await createProduct(10, 2); // stock alto, no aparece
    const low = await createProduct(1, 2); // stock bajo, aparece

    const result = await inventoryService.listLowStock();
    expect(result).toHaveLength(1);
    expect(result[0]?.productId).toBe(low._id.toString());
  });
});
