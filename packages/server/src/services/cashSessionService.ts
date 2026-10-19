import {
  STORE_PAYMENT_METHODS,
  type CashSession as CashSessionView,
  type CashSessionTotals,
  type PaginatedResult,
  type StorePaymentMethod,
} from "@amanda/shared";
import { Types } from "mongoose";
import { CashSession, type CashSessionDocument } from "../models/CashSession.js";
import { StoreSale } from "../models/StoreSale.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/AppError.js";
import type {
  CashMovementInput,
  CloseCashSessionInput,
  ListCashSessionsQuery,
  OpenCashSessionInput,
} from "../validators/cashSessionValidators.js";

function emptyByMethod(): Record<StorePaymentMethod, number> {
  return Object.fromEntries(STORE_PAYMENT_METHODS.map((m) => [m, 0])) as Record<
    StorePaymentMethod,
    number
  >;
}

/**
 * Los totales nunca se guardan mientras la caja está abierta: se recalculan
 * siempre desde las ventas y devoluciones, así no pueden desincronizarse.
 */
export async function computeTotals(session: CashSessionDocument): Promise<CashSessionTotals> {
  const sessionId = new Types.ObjectId(session._id);

  const [sales, refunds] = await Promise.all([
    StoreSale.aggregate<{ _id: StorePaymentMethod; total: number; count: number }>([
      { $match: { cashSession: sessionId, status: { $ne: "voided" } } },
      { $group: { _id: "$paymentMethod", total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]),
    // Las devoluciones se imputan a la caja en la que se pagan, no a la de la venta original.
    StoreSale.aggregate<{ _id: StorePaymentMethod; total: number }>([
      { $match: { "returns.cashSession": sessionId } },
      { $unwind: "$returns" },
      { $match: { "returns.cashSession": sessionId } },
      { $group: { _id: "$returns.refundMethod", total: { $sum: "$returns.amount" } } },
    ]),
  ]);

  const salesByMethod = emptyByMethod();
  let salesCount = 0;
  for (const row of sales) {
    salesByMethod[row._id] = row.total;
    salesCount += row.count;
  }
  const refundsByMethod = emptyByMethod();
  for (const row of refunds) refundsByMethod[row._id] = row.total;

  let cashIn = 0;
  let cashOut = 0;
  for (const movement of session.movements) {
    if (movement.type === "in") cashIn += movement.amount;
    else cashOut += movement.amount;
  }

  return {
    salesByMethod,
    refundsByMethod,
    salesCount,
    cashIn,
    cashOut,
    expectedCash:
      session.openingAmount + salesByMethod.cash - refundsByMethod.cash + cashIn - cashOut,
  };
}

async function toView(session: CashSessionDocument): Promise<CashSessionView> {
  const { closingTotals, ...rest } = session.toObject();
  const totals =
    session.status === "closed" && closingTotals ? closingTotals : await computeTotals(session);
  return { ...rest, totals } as unknown as CashSessionView;
}

export async function getOpenSessionDocument(): Promise<CashSessionDocument | null> {
  return CashSession.findOne({ status: "open" });
}

/** Para vender, devolver o anular: sin caja abierta no se opera. */
export async function requireOpenSession(): Promise<CashSessionDocument> {
  const session = await getOpenSessionDocument();
  if (!session) throw new ConflictError("No hay una caja abierta. Abrí la caja para operar.");
  return session;
}

export async function getCurrentSession(): Promise<CashSessionView | null> {
  const session = await getOpenSessionDocument();
  return session ? toView(session) : null;
}

export async function openSession(
  input: OpenCashSessionInput,
  adminId: string,
): Promise<CashSessionView> {
  try {
    const session = await CashSession.create({
      openedBy: adminId,
      openingAmount: input.openingAmount,
    });
    return toView(session);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new ConflictError("Ya hay una caja abierta");
    }
    throw err;
  }
}

export async function addMovement(
  input: CashMovementInput,
  adminId: string,
): Promise<CashSessionView> {
  const current = await requireOpenSession();

  if (input.type === "out") {
    const { expectedCash } = await computeTotals(current);
    if (input.amount > expectedCash) {
      throw new BadRequestError("El egreso supera el efectivo disponible en la caja");
    }
  }

  const updated = await CashSession.findOneAndUpdate(
    { _id: current._id, status: "open" },
    {
      $push: {
        movements: {
          type: input.type,
          amount: input.amount,
          reason: input.reason,
          createdBy: adminId,
        },
      },
    },
    { new: true },
  );
  if (!updated) throw new ConflictError("La caja ya fue cerrada");
  return toView(updated);
}

/**
 * Primero se marca cerrada de forma atómica (solo un cierre puede ganar y
 * dejan de aceptarse ventas); recién después se calcula el arqueo sobre los
 * datos finales y se guarda el snapshot.
 */
export async function closeSession(
  input: CloseCashSessionInput,
  adminId: string,
): Promise<CashSessionView> {
  const closed = await CashSession.findOneAndUpdate(
    { status: "open" },
    {
      $set: {
        status: "closed",
        closedBy: adminId,
        closedAt: new Date(),
        countedCash: input.countedCash,
        notes: input.notes,
      },
    },
    { new: true },
  );
  if (!closed) throw new ConflictError("No hay una caja abierta");

  const totals = await computeTotals(closed);
  closed.closingTotals = totals;
  closed.difference = input.countedCash - totals.expectedCash;
  await closed.save();
  return toView(closed);
}

export async function listSessions(
  query: ListCashSessionsQuery,
): Promise<PaginatedResult<CashSessionView>> {
  const skip = (query.page - 1) * query.limit;
  const [docs, total] = await Promise.all([
    CashSession.find().sort({ openedAt: -1 }).skip(skip).limit(query.limit),
    CashSession.countDocuments(),
  ]);
  const items = await Promise.all(docs.map(toView));
  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function getSessionById(id: string): Promise<CashSessionView> {
  const session = await CashSession.findById(id);
  if (!session) throw new NotFoundError("Caja no encontrada");
  return toView(session);
}
