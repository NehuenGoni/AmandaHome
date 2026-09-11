import type { PaginatedResult } from "@amanda/shared";
import { sumCents } from "@amanda/shared";
import { Product, type IProductVariant } from "../models/Product.js";
import { SupplierPurchase, type SupplierPurchaseDocument } from "../models/SupplierPurchase.js";
import { NotFoundError } from "../utils/AppError.js";
import type {
  CreateSupplierPurchaseInput,
  ListSupplierPurchasesQuery,
} from "../validators/supplierPurchaseValidators.js";
import { recordMovements, type StockChange } from "./inventoryService.js";

function findVariant(
  product: { variants: IProductVariant[] } | undefined,
  sku: string,
): IProductVariant | undefined {
  return product?.variants.find((v) => v.sku === sku);
}

/**
 * Crea la compra y luego incrementa stock ítem por ítem, registrando el
 * StockMovement purchase_in correspondiente: a diferencia de una venta, una
 * entrada de mercadería no tiene condición de "stock insuficiente" que
 * pueda fallar a mitad de camino.
 */
export async function createSupplierPurchase(
  input: CreateSupplierPurchaseInput,
  adminId: string,
): Promise<SupplierPurchaseDocument> {
  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const items = input.items.map((item) => {
    const sku = item.variantSku.toUpperCase();
    const product = productById.get(item.productId);
    const variant = findVariant(product, sku);
    if (!product || !variant) {
      throw new NotFoundError(`Producto o variante no encontrados (${item.variantSku})`);
    }
    return {
      product: product._id,
      variantSku: sku,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.unitCost * item.quantity,
    };
  });

  const totalCost = sumCents(...items.map((i) => i.totalCost));

  const purchase = await SupplierPurchase.create({
    supplierName: input.supplierName,
    items,
    totalCost,
    purchaseDate: input.purchaseDate ?? new Date(),
    notes: input.notes,
    createdBy: adminId,
  });

  const changes: StockChange[] = [];
  for (const item of items) {
    const before = await Product.findOneAndUpdate(
      { _id: item.product, "variants.sku": item.variantSku },
      { $inc: { "variants.$.stock": item.quantity } },
    );
    const variant = before?.variants.find((v) => v.sku === item.variantSku);
    if (before && variant) {
      changes.push({
        product: item.product.toString(),
        variantSku: item.variantSku,
        quantity: item.quantity,
        previousStock: variant.stock,
        newStock: variant.stock + item.quantity,
      });
    }
  }

  await recordMovements(changes, {
    type: "purchase_in",
    reference: purchase._id.toString(),
    createdBy: adminId,
  });

  return purchase;
}

export async function listSupplierPurchases(
  query: ListSupplierPurchasesQuery,
): Promise<PaginatedResult<SupplierPurchaseDocument>> {
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    SupplierPurchase.find().sort({ purchaseDate: -1 }).skip(skip).limit(query.limit),
    SupplierPurchase.countDocuments(),
  ]);

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function getSupplierPurchaseById(id: string): Promise<SupplierPurchaseDocument> {
  const purchase = await SupplierPurchase.findById(id);
  if (!purchase) throw new NotFoundError("Compra no encontrada");
  return purchase;
}
