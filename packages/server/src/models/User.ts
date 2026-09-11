import bcrypt from "bcryptjs";
import mongoose, { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import type { Role } from "@amanda/shared";

const SALT_ROUNDS = 10;

export interface IAddress {
  _id: Types.ObjectId;
  label?: string;
  street: string;
  number?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export interface IUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  addresses: IAddress[];
  isActive: boolean;
}

export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<IUser, object, IUserMethods>;
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

const addressSchema = new Schema<IAddress>({
  label: { type: String, trim: true },
  street: { type: String, required: true, trim: true },
  number: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  province: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true, default: "Argentina" },
  phone: { type: String, trim: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email inválido"],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    addresses: { type: [addressSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        const { password: _password, __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = (mongoose.models.User as UserModel) ?? model<IUser, UserModel>("User", userSchema);
