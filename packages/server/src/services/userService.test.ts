import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { User } from "../models/User.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import * as userService from "./userService.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

async function createUser() {
  return User.create({
    email: `cliente-${Date.now()}-${Math.random()}@example.com`,
    password: "supersecreto123",
    firstName: "Cliente",
    lastName: "Test",
  });
}

const address = {
  street: "Av. Siempre Viva",
  number: "742",
  city: "CABA",
  province: "Buenos Aires",
  postalCode: "C1000",
  country: "Argentina",
};

describe("updateProfile", () => {
  it("actualiza los datos propios", async () => {
    const user = await createUser();
    const updated = await userService.updateProfile(user._id.toString(), { firstName: "Nuevo" });
    expect(updated.firstName).toBe("Nuevo");
  });
});

describe("addAddress", () => {
  it("agrega una dirección y la marca como default si es la primera", async () => {
    const user = await createUser();
    const updated = await userService.addAddress(user._id.toString(), address);
    expect(updated.addresses).toHaveLength(1);
    expect(updated.addresses[0]?.isDefault).toBe(true);
  });

  it("al marcar una nueva dirección como default, desmarca las demás", async () => {
    const user = await createUser();
    await userService.addAddress(user._id.toString(), address);
    const updated = await userService.addAddress(user._id.toString(), { ...address, isDefault: true });

    const defaults = updated.addresses.filter((a) => a.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.street).toBe(address.street);
  });
});

describe("updateAddress", () => {
  it("actualiza campos de una dirección existente", async () => {
    const user = await createUser();
    const withAddress = await userService.addAddress(user._id.toString(), address);
    const addressId = withAddress.addresses[0]!._id.toString();

    const updated = await userService.updateAddress(user._id.toString(), addressId, { city: "Rosario" });
    expect(updated.addresses[0]?.city).toBe("Rosario");
  });

  it("lanza NotFoundError si la dirección no existe", async () => {
    const user = await createUser();
    await expect(
      userService.updateAddress(user._id.toString(), "64b000000000000000000000", { city: "X" }),
    ).rejects.toThrow();
  });
});

describe("removeAddress", () => {
  it("elimina una dirección y promueve otra a default si era la default", async () => {
    const user = await createUser();
    let withAddresses = await userService.addAddress(user._id.toString(), address);
    withAddresses = await userService.addAddress(user._id.toString(), { ...address, city: "Rosario" });

    const defaultAddressId = withAddresses.addresses.find((a) => a.isDefault)!._id.toString();
    const updated = await userService.removeAddress(user._id.toString(), defaultAddressId);

    expect(updated.addresses).toHaveLength(1);
    expect(updated.addresses[0]?.isDefault).toBe(true);
  });

  it("lanza NotFoundError si la dirección no existe", async () => {
    const user = await createUser();
    await expect(
      userService.removeAddress(user._id.toString(), "64b000000000000000000000"),
    ).rejects.toThrow();
  });
});
