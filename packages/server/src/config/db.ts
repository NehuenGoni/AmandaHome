import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI);
  console.log("[db] conectado a MongoDB");
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
