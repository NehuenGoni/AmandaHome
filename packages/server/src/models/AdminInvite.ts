import mongoose, { Schema, model, type Model, type Types } from "mongoose";

export interface IAdminInvite {
  email: string;
  tokenHash: string;
  invitedBy: Types.ObjectId;
  expiresAt: Date;
  acceptedAt?: Date;
  revokedAt?: Date;
}

const adminInviteSchema = new Schema<IAdminInvite>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    tokenHash: { type: String, required: true, unique: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: true },
);

adminInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminInvite =
  (mongoose.models.AdminInvite as Model<IAdminInvite>) ??
  model<IAdminInvite>("AdminInvite", adminInviteSchema);
