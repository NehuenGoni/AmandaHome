import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { StockMovement } from "../models/StockMovement.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import * as supplierPurchaseService from "./supplierPurchaseService.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

async function createProduct(stock = 5) {
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
        lowStockThreshold: 1,
      },
    ],
  });
}

describe("createSupplierPurchase", () => {
  it("incrementa el stock, calcula totales y registra el movimiento purchase_in", async () => {
    const product = await createProduct(5);
    const sku = product.variants[0]!.sku;
    const adminId = new Types.ObjectId().toString();

    const purchase = await supplierPurchaseService.createSupplierPurchase(
      {
        supplierName: "Textiles del Sur",
        items: [{ productId: product._id.toString(), variantSku: sku, quantity: 10, unitCost: 50000 }],
      },
      adminId,
    );

    expect(purchase.totalCost).toBe(500000);
    expect(purchase.items[0]?.totalCost).toBe(500000);

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.variants[0]?.stock).toBe(15);

    const movement = await StockMovement.findOne({ product: product._id });
    expect(movement?.type).toBe("purchase_in");
    expect(movement?.quantity).toBe(10);
    expect(movement?.previousStock).toBe(5);
    expect(movement?.newStock).toBe(15);
    expect(movement?.createdBy?.toString()).toBe(adminId);
    expect(movement?.reference).toBe(purchase._id.toString());
  });

  it("suma el total de múltiples ítems", async () => {
    const productA = await createProduct(5);
    const productB = await createProduct(5);

    const purchase = await supplierPurchaseService.createSupplierPurchase(
      {
        supplierName: "Proveedor Múltiple",
        items: [
          {
            productId: productA._id.toString(),
            variantSku: productA.variants[0]!.sku,
            quantity: 2,
            unitCost: 10000,
          },
          {
            productId: productB._id.toString(),
            variantSku: productB.variants[0]!.sku,
            quantity: 3,
            unitCost: 20000,
          },
        ],
      },
      new Types.ObjectId().toString(),
    );

    expect(purchase.totalCost).toBe(20000 + 60000);
  });

  it("rechaza si algún producto o variante no existe", async () => {
    await expect(
      supplierPurchaseService.createSupplierPurchase(
        {
          supplierName: "X",
          items: [
            { productId: new Types.ObjectId().toString(), variantSku: "NO-EXISTE", quantity: 1, unitCost: 1000 },
          ],
        },
        new Types.ObjectId().toString(),
      ),
    ).rejects.toThrow();
  });
});

describe("listSupplierPurchases / getSupplierPurchaseById", () => {
  it("lista paginado y permite ver el detalle", async () => {
    const product = await createProduct(5);
    const adminId = new Types.ObjectId().toString();

    const purchase = await supplierPurchaseService.createSupplierPurchase(
      {
        supplierName: "Textiles del Sur",
        items: [
          { productId: product._id.toString(), variantSku: product.variants[0]!.sku, quantity: 1, unitCost: 1000 },
        ],
      },
      adminId,
    );

    const list = await supplierPurchaseService.listSupplierPurchases({ page: 1, limit: 20 });
    expect(list.total).toBe(1);

    const found = await supplierPurchaseService.getSupplierPurchaseById(purchase._id.toString());
    expect(found.supplierName).toBe("Textiles del Sur");
  });

  it("lanza NotFoundError si la compra no existe", async () => {
    await expect(
      supplierPurchaseService.getSupplierPurchaseById("64b000000000000000000000"),
    ).rejects.toThrow();
  });
});
