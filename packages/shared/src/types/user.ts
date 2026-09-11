import type { Role, WithTimestamps } from "./common.js";

export interface Address {
  _id: string;
  label?: string;
  street: string;
  number?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

export interface User extends WithTimestamps {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  addresses: Address[];
  isActive: boolean;
}
