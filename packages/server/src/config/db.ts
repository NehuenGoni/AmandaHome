import mongoose, { type ClientSession } from "mongoose";
import { env } from "./env.js";

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI);
  console.log("[db] conectado a MongoDB");
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

/**
 * Ejecuta `fn` dentro de una transacción de Mongo (requiere replica set).
 * Mongoose reintenta automáticamente los TransientTransactionError.
 */
export function runInTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  return mongoose.connection.transaction(fn);
}
