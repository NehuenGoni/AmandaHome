import type { PublicShippingSettings, ShippingAgency, ShippingOption, ShippingSettings } from "@amanda/shared";
import { apiGet, apiPost, apiPut } from "./apiClient.js";

export const getShippingSettings = () =>
  apiGet<{ settings: PublicShippingSettings }>("/shipping/settings");

export interface QuoteShippingParams {
  addressId?: string;
  agencyCode?: string;
  provinceCode?: string;
}

export const quoteShipping = (params: QuoteShippingParams) =>
  apiPost<{ options: ShippingOption[] }>("/shipping/quote", params);

export const getAgencies = (provinceCode: string) =>
  apiGet<{ agencies: ShippingAgency[] }>(`/shipping/agencies?provinceCode=${encodeURIComponent(provinceCode)}`);

export const getAdminShippingSettings = () =>
  apiGet<{ settings: ShippingSettings }>("/admin/shipping/settings");

export const updateAdminShippingSettings = (input: Partial<ShippingSettings>) =>
  apiPut<{ settings: ShippingSettings }>("/admin/shipping/settings", input);
