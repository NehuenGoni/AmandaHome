import mongoose, { Schema, model, type Model, type Types } from "mongoose";

export interface IPasswordResetToken {
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken =
  (mongoose.models.PasswordResetToken as Model<IPasswordResetToken>) ??
  model<IPasswordResetToken>("PasswordResetToken", passwordResetTokenSchema);
