import {
  STORE_PAYMENT_METHODS,
  percentageOfCents,
  sumCents,
  type PaginatedResult,
  type StorePaymentMethod,
  type StoreProductLookup,
  type StoreSalesSummary,
} from "@amanda/shared";
import type { FilterQuery } from "mongoose";
import { runInTransaction } from "../config/db.js";
import { getNextSequence } from "../models/Counter.js";
import { Product } from "../models/Product.js";
import { StoreSale, type IStoreSale, type IStoreSaleItem, type StoreSaleDocument } from "../models/StoreSale.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/AppError.js";
import type {
  CreateStoreSaleInput,
  EmailStoreSaleInput,
  ListStoreSalesQuery,
  ReturnStoreSaleInput,
  StoreSalesSummaryQuery,
} from "../validators/storeSaleValidators.js";
import { computeTotals, requireOpenSession } from "./cashSessionService.js";
import { decrementStock } from "./checkoutService.js";
import { sendStoreSaleReceiptEmail } from "./email/emailService.js";
import { recordMovements, returnStock } from "./inventoryService.js";
import { getShippingSettings } from "./shippingSettingsService.js";

const PAYMENT_LABELS: Record<StorePaymentMethod, string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia / QR",
};

interface DiscountInput {
  type: "percent" | "amount";
  value: number;
}

/** Descuento en centavos sobre `base`; nunca puede superar el importe sobre el que se aplica. */
function discountAmount(base: number, discount?: DiscountInput): number {
  if (!discount) return 0;
  const amount =
    discount.type === "percent" ? percentageOfCents(base, discount.value) : Math.round(discount.value);
  if (amount > base) throw new BadRequestError("El descuento supera el importe sobre el que se aplica");
  return amount;
}

export async function createStoreSale(
  input: CreateStoreSaleInput,
  adminId: string,
): Promise<StoreSaleDocument> {
  const session = await requireOpenSession();

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  // Los precios siempre salen del catálogo: nunca se confía en lo que manda el cliente.
  const items: IStoreSaleItem[] = input.items.map((line) => {
    const sku = line.variantSku.toUpperCase();
    const product = productById.get(line.productId);
    const variant = product?.variants.find((v) => v.sku === sku);
    if (!product || !variant) throw new NotFoundError(`Producto no disponible: ${sku}`);
    if (variant.stock < line.quantity) {
      throw new BadRequestError(`Stock insuficiente para ${product.name} (${variant.attributeValue})`);
    }

    const gross = variant.price * line.quantity;
    const discount = discountAmount(gross, line.discount);
    return {
      product: product._id,
      productName: product.name,
      variantSku: sku,
      attributeName: variant.attributeName,
      attributeValue: variant.attributeValue,
      image: [...product.images].sort((a, b) => a.order - b.order)[0]?.url,
      unitPrice: variant.price,
      quantity: line.quantity,
      discount,
      subtotal: gross - discount,
    };
  });

  const subtotal = sumCents(...items.map((i) => i.subtotal));
  const globalDiscount = discountAmount(subtotal, input.discount);
  const total = subtotal - globalDiscount;
  if (total <= 0) throw new BadRequestError("El total de la venta debe ser mayor a 0");

  let cashReceived: number | undefined;
  let change: number | undefined;
  if (input.paymentMethod === "cash") {
    if (input.cashReceived === undefined || input.cashReceived < total) {
      throw new BadRequestError("El efectivo recibido no alcanza para cubrir el total");
    }
    cashReceived = input.cashReceived;
    change = input.cashReceived - total;
  }

  const decrements = items.map((i) => ({
    product: i.product,
    variantSku: i.variantSku,
    quantity: i.quantity,
  }));
  const saleNumber = await getNextSequence("storeSaleNumber");

  // Stock, venta y movimientos son todo o nada: si algo falla, el abort deja
  // el stock intacto y sin movimientos en el log.
  const sale = await runInTransaction(async (txn) => {
    const stockChanges = await decrementStock(decrements, txn);
    const [created] = await StoreSale.create(
      [
        {
          saleNumber,
          cashSession: session._id,
          seller: adminId,
          items,
          subtotal,
          discount: input.discount
            ? { type: input.discount.type, value: input.discount.value, amount: globalDiscount }
            : undefined,
          total,
          paymentMethod: input.paymentMethod,
          cashReceived,
          change,
          paymentReference: input.paymentReference,
          customer: { name: input.customer?.name, email: input.customer?.email },
          notes: input.notes,
        },
      ],
      { session: txn },
    );
    await recordMovements(
      stockChanges,
      { type: "sale_out", reference: created!._id.toString(), createdBy: adminId },
      txn,
    );
    return created!;
  });

  if (input.customer?.email) {
    void sendReceipt(sale, input.customer.email);
  }
  return sale;
}

async function sendReceipt(sale: StoreSaleDocument, email: string): Promise<void> {
  const { pickup } = await getShippingSettings();
  await sendStoreSaleReceiptEmail(
    email,
    {
      saleNumber: sale.saleNumber,
      createdAt: sale.createdAt,
      items: sale.items,
      subtotal: sale.subtotal,
      discountAmount: sale.discount?.amount ?? 0,
      total: sale.total,
      paymentMethodLabel: PAYMENT_LABELS[sale.paymentMethod],
      customerName: sale.customer.name,
    },
    { address: pickup.address, hours: pickup.hours },
  );
  await StoreSale.updateOne({ _id: sale._id }, { $addToSet: { emailSentTo: email } });
}

export async function emailStoreSale(
  id: string,
  input: EmailStoreSaleInput,
): Promise<StoreSaleDocument> {
  const sale = await getStoreSaleById(id);
  if (sale.status === "voided") throw new ConflictError("La venta está anulada");
  await sendReceipt(sale, input.email);
  return getStoreSaleById(id);
}

export async function voidStoreSale(
  id: string,
  reason: string,
  adminId: string,
): Promise<StoreSaleDocument> {
  const session = await requireOpenSession();
  const existing = await getStoreSaleById(id);
  if (existing.cashSession.toString() !== session._id.toString()) {
    throw new ConflictError(
      "Solo se pueden anular ventas de la caja abierta. Para una venta anterior registrá una devolución.",
    );
  }

  // Condición en el filtro: dos anulaciones simultáneas no pueden reponer el stock dos veces.
  // La anulación y la reposición van en la misma transacción.
  return runInTransaction(async (txn) => {
    const sale = await StoreSale.findOneAndUpdate(
      { _id: id, status: "completed", "returns.0": { $exists: false } },
      { $set: { status: "voided", voidedAt: new Date(), voidedBy: adminId, voidReason: reason } },
      { new: true, session: txn },
    );
    if (!sale) throw new ConflictError("La venta ya fue anulada o tiene devoluciones registradas");

    await returnStock(
      sale.items.map((i) => ({
        product: i.product.toString(),
        variantSku: i.variantSku,
        quantity: i.quantity,
      })),
      {
        reference: sale._id.toString(),
        note: `Anulación de venta en local #${sale.saleNumber}`,
        createdBy: adminId,
      },
      txn,
    );
    return sale;
  });
}

export async function returnStoreSaleItems(
  id: string,
  input: ReturnStoreSaleInput,
  adminId: string,
): Promise<StoreSaleDocument> {
  const session = await requireOpenSession();
  const sale = await getStoreSaleById(id);
  if (sale.status === "voided" || sale.status === "returned") {
    throw new ConflictError("La venta no admite más devoluciones");
  }

  const returnedQty = new Map<string, number>();
  const returnedAmount = new Map<string, number>();
  let refundedTotal = 0;
  for (const ret of sale.returns) {
    refundedTotal += ret.amount;
    for (const item of ret.items) {
      returnedQty.set(item.variantSku, (returnedQty.get(item.variantSku) ?? 0) + item.quantity);
      returnedAmount.set(item.variantSku, (returnedAmount.get(item.variantSku) ?? 0) + item.amount);
    }
  }

  // El descuento global se prorratea entre las líneas para saber cuánto se pagó realmente por cada una.
  const ratio = sale.total / sale.subtotal;
  const returnItems = input.items.map((req) => {
    const sku = req.variantSku.toUpperCase();
    const line = sale.items.find((i) => i.variantSku === sku);
    if (!line) throw new BadRequestError(`El producto ${sku} no pertenece a esta venta`);

    const remaining = line.quantity - (returnedQty.get(sku) ?? 0);
    if (req.quantity > remaining) {
      throw new BadRequestError(`Solo quedan ${remaining} unidades de ${line.productName} para devolver`);
    }

    const linePaid = Math.round(line.subtotal * ratio);
    const amount =
      req.quantity === remaining
        ? linePaid - (returnedAmount.get(sku) ?? 0)
        : Math.round((linePaid * req.quantity) / line.quantity);
    return { variantSku: sku, quantity: req.quantity, amount, product: line.product };
  });

  const totalUnits = sale.items.reduce((n, i) => n + i.quantity, 0);
  const alreadyReturnedUnits = [...returnedQty.values()].reduce((n, q) => n + q, 0);
  const returningUnits = returnItems.reduce((n, i) => n + i.quantity, 0);
  const isFinal = alreadyReturnedUnits + returningUnits === totalUnits;

  let amount = sumCents(...returnItems.map((i) => i.amount));
  if (isFinal) {
    // Absorbe los centavos de redondeo del prorrateo: en total se reintegra exactamente lo cobrado.
    const diff = sale.total - refundedTotal - amount;
    returnItems[returnItems.length - 1]!.amount += diff;
    amount += diff;
  }

  if (input.refundMethod === "cash") {
    const { expectedCash } = await computeTotals(session);
    if (amount > expectedCash) {
      throw new BadRequestError("No hay suficiente efectivo en la caja para este reintegro");
    }
  }

  // El filtro por cantidad de devoluciones actúa de lock optimista: evita reintegrar dos veces en paralelo.
  return runInTransaction(async (txn) => {
    const updated = await StoreSale.findOneAndUpdate(
      {
        _id: id,
        status: { $in: ["completed", "partially_returned"] },
        returns: { $size: sale.returns.length },
      },
      {
        $set: { status: isFinal ? "returned" : "partially_returned" },
        $push: {
          returns: {
            items: returnItems.map(({ variantSku, quantity, amount: itemAmount }) => ({
              variantSku,
              quantity,
              amount: itemAmount,
            })),
            amount,
            refundMethod: input.refundMethod,
            cashSession: session._id,
            reason: input.reason,
            createdBy: adminId,
          },
        },
      },
      { new: true, session: txn },
    );
    if (!updated) throw new ConflictError("La venta cambió mientras se procesaba. Reintentá.");

    await returnStock(
      returnItems.map((i) => ({
        product: i.product.toString(),
        variantSku: i.variantSku,
        quantity: i.quantity,
      })),
      {
        reference: sale._id.toString(),
        note: `Devolución de venta en local #${sale.saleNumber}`,
        createdBy: adminId,
      },
      txn,
    );
    return updated;
  });
}

export async function lookupByCode(code: string): Promise<StoreProductLookup> {
  const normalized = code.trim();
  const sku = normalized.toUpperCase();
  const product = await Product.findOne({
    isActive: true,
    $or: [{ "variants.barcode": normalized }, { "variants.sku": sku }],
  });
  const variant = product?.variants.find((v) => v.barcode === normalized || v.sku === sku);
  if (!product || !variant) throw new NotFoundError("No encontramos un producto con ese código");

  return {
    productId: product._id.toString(),
    productName: product.name,
    image: [...product.images].sort((a, b) => a.order - b.order)[0]?.url,
    variantSku: variant.sku,
    attributeName: variant.attributeName,
    attributeValue: variant.attributeValue,
    price: variant.price,
    stock: variant.stock,
    barcode: variant.barcode,
  };
}

export async function getStoreSaleById(id: string): Promise<StoreSaleDocument> {
  const sale = await StoreSale.findById(id);
  if (!sale) throw new NotFoundError("Venta no encontrada");
  return sale;
}

export async function listStoreSales(
  query: ListStoreSalesQuery,
): Promise<PaginatedResult<StoreSaleDocument>> {
  const filter: FilterQuery<IStoreSale> = {};
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
  if (query.status) filter.status = query.status;
  if (query.cashSession) filter.cashSession = query.cashSession;
  if (query.seller) filter.seller = query.seller;
  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from && { $gte: query.from }),
      ...(query.to && { $lte: query.to }),
    };
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    StoreSale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    StoreSale.countDocuments(filter),
  ]);
  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

/** Argentina no tiene horario de verano: el día local siempre arranca a las 03:00 UTC. */
function startOfTodayArgentina(): Date {
  const AR_OFFSET_MS = 3 * 60 * 60 * 1000;
  const shifted = new Date(Date.now() - AR_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() + AR_OFFSET_MS);
}

/** Ventas brutas no anuladas (las devoluciones parciales no se descuentan acá). Por defecto, el día de hoy. */
export async function getStoreSalesSummary(query: StoreSalesSummaryQuery): Promise<StoreSalesSummary> {
  const from = query.from ?? startOfTodayArgentina();
  const to = query.to ?? new Date();

  const rows = await StoreSale.aggregate<{ _id: StorePaymentMethod; total: number; count: number }>([
    { $match: { createdAt: { $gte: from, $lte: to }, status: { $ne: "voided" } } },
    { $group: { _id: "$paymentMethod", total: { $sum: "$total" }, count: { $sum: 1 } } },
  ]);

  const byMethod = Object.fromEntries(
    STORE_PAYMENT_METHODS.map((m) => [m, { count: 0, total: 0 }]),
  ) as StoreSalesSummary["byMethod"];
  for (const row of rows) byMethod[row._id] = { count: row.count, total: row.total };

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    count: rows.reduce((n, r) => n + r.count, 0),
    total: rows.reduce((n, r) => n + r.total, 0),
    byMethod,
  };
}

