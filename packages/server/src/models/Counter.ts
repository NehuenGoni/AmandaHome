import mongoose, { Schema, model, type Model } from "mongoose";

interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = (mongoose.models.Counter as Model<ICounter>) ?? model<ICounter>("Counter", counterSchema);

/**
 * Atómico vía findOneAndUpdate + upsert: dos requests concurrentes nunca
 * obtienen el mismo número, incluso sin transacciones.
 */
export async function getNextSequence(name: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean();
  return counter.seq;
}
