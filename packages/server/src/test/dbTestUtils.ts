import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongoServer: MongoMemoryServer | undefined;

/** Levanta un Mongo en memoria y conecta Mongoose. Sin soporte de transacciones multi-doc. */
export async function connectTestDB(): Promise<void> {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  // Los índices (incluidos los `unique`) se construyen en background; sin
  // esto, dos inserts seguidos en el mismo test pueden no chocar todavía.
  await mongoose.connection.syncIndexes();
}

export async function closeTestDB(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer?.stop();
}

/** Limpia todas las colecciones entre tests, sin recrear la conexión. */
export async function clearTestDB(): Promise<void> {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}
