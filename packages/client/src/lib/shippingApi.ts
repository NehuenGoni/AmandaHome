import type { PublicShippingSettings, ShippingOption, ShippingSettings } from "@amanda/shared";
import { apiGet, apiPost, apiPut } from "./apiClient.js";

export const getShippingSettings = () =>
  apiGet<{ settings: PublicShippingSettings }>("/shipping/settings");

export const quoteShipping = (addressId?: string) =>
  apiPost<{ options: ShippingOption[] }>("/shipping/quote", { addressId });

export const getAdminShippingSettings = () =>
  apiGet<{ settings: ShippingSettings }>("/admin/shipping/settings");

export const updateAdminShippingSettings = (input: Partial<ShippingSettings>) =>
  apiPut<{ settings: ShippingSettings }>("/admin/shipping/settings", input);
