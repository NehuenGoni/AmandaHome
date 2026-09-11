import { Schema, model, type Types } from "mongoose";

export interface IRefreshToken {
  user: Types.ObjectId;
  jti: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByJti?: string;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    jti: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedByJti: { type: String },
  },
  { timestamps: true },
);

// TTL: Mongo borra el documento solo una vez vencido, la revocación explícita es inmediata.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<IRefreshToken>("RefreshToken", refreshTokenSchema);
