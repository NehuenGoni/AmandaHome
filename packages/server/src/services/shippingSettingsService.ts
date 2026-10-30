import type { PublicShippingSettings } from "@amanda/shared";
import { ShippingSettings, type ShippingSettingsDocument } from "../models/ShippingSettings.js";
import type { UpdateShippingSettingsInput } from "../validators/shippingValidators.js";

/**
 * Documento único (patrón singleton): siempre se opera sobre el mismo
 * registro, creándolo con sus valores por defecto la primera vez que se pide.
 */
export async function getShippingSettings(): Promise<ShippingSettingsDocument> {
  const settings = await ShippingSettings.findOneAndUpdate(
    {},
    { $setOnInsert: {} },
    { new: true, upsert: true },
  );
  return settings;
}

export async function updateShippingSettings(
  input: UpdateShippingSettingsInput,
): Promise<ShippingSettingsDocument> {
  const settings = await getShippingSettings();

  if (input.pickup) Object.assign(settings.pickup, input.pickup);
  if (input.home) Object.assign(settings.home, input.home);
  if (input.branch) Object.assign(settings.branch, input.branch);
  if (input.originPostalCode !== undefined) settings.originPostalCode = input.originPostalCode;
  if (input.defaultPackage) Object.assign(settings.defaultPackage, input.defaultPackage);
  if ("freeShippingThreshold" in input) {
    settings.freeShippingThreshold = input.freeShippingThreshold ?? undefined;
  }

  await settings.save();
  return settings;
}

export function toPublicShippingSettings(settings: ShippingSettingsDocument): PublicShippingSettings {
  return {
    pickup: {
      enabled: settings.pickup.enabled,
      address: settings.pickup.address,
      hours: settings.pickup.hours,
      instructions: settings.pickup.instructions,
    },
    homeEnabled: settings.home.enabled,
    branchEnabled: settings.branch.enabled,
    freeShippingThreshold: settings.freeShippingThreshold,
  };
}
