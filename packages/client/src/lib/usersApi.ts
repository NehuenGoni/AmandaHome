import type { User } from "@amanda/shared";
import { apiDelete, apiPatch, apiPost } from "./apiClient.js";

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface AddressInput {
  label?: string;
  street: string;
  number?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
  phone?: string;
  isDefault?: boolean;
}

export const updateProfile = (input: UpdateProfileInput) =>
  apiPatch<{ user: User }>("/users/me", input);

export const addAddress = (input: AddressInput) =>
  apiPost<{ user: User }>("/users/me/addresses", input);

export const updateAddress = (addressId: string, input: Partial<AddressInput>) =>
  apiPatch<{ user: User }>(`/users/me/addresses/${addressId}`, input);

export const removeAddress = (addressId: string) =>
  apiDelete<{ user: User }>(`/users/me/addresses/${addressId}`);
