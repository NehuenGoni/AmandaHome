import { User, type UserDocument } from "../models/User.js";
import { NotFoundError } from "../utils/AppError.js";
import type {
  AddressInput,
  UpdateAddressInput,
  UpdateProfileInput,
} from "../validators/userValidators.js";

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDocument> {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("Usuario no encontrado");

  Object.assign(user, input);
  await user.save();
  return user;
}

async function getUserOrThrow(userId: string): Promise<UserDocument> {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("Usuario no encontrado");
  return user;
}

function unsetOtherDefaults(user: UserDocument, keepAddressId?: string): void {
  for (const address of user.addresses) {
    if (address._id.toString() !== keepAddressId) address.isDefault = false;
  }
}

export async function addAddress(userId: string, input: AddressInput): Promise<UserDocument> {
  const user = await getUserOrThrow(userId);

  user.addresses.push(input);
  const created = user.addresses[user.addresses.length - 1]!;

  if (input.isDefault || user.addresses.length === 1) {
    created.isDefault = true;
    unsetOtherDefaults(user, created._id.toString());
  }

  await user.save();
  return user;
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: UpdateAddressInput,
): Promise<UserDocument> {
  const user = await getUserOrThrow(userId);
  const address = user.addresses.id(addressId);
  if (!address) throw new NotFoundError("Dirección no encontrada");

  Object.assign(address, input);

  if (input.isDefault) {
    unsetOtherDefaults(user, addressId);
  }

  await user.save();
  return user;
}

export async function removeAddress(userId: string, addressId: string): Promise<UserDocument> {
  const user = await getUserOrThrow(userId);
  const address = user.addresses.id(addressId);
  if (!address) throw new NotFoundError("Dirección no encontrada");

  const wasDefault = address.isDefault;
  address.deleteOne();

  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0]!.isDefault = true;
  }

  await user.save();
  return user;
}
