import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { User } from "./User.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

function buildUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    email: "cliente@example.com",
    password: "supersecreto123",
    firstName: "Ana",
    lastName: "Pérez",
    ...overrides,
  };
}

describe("User", () => {
  it("hashea la contraseña al guardar", async () => {
    const user = await User.create(buildUser());
    const stored = await User.findById(user._id).select("+password");
    expect(stored?.password).not.toBe("supersecreto123");
    expect(await stored?.comparePassword("supersecreto123")).toBe(true);
    expect(await stored?.comparePassword("otra")).toBe(false);
  });

  it("no re-hashea la contraseña si no fue modificada", async () => {
    const user = await User.create(buildUser());
    const original = (await User.findById(user._id).select("+password"))!.password;
    user.firstName = "Otro nombre";
    await user.save();
    const after = (await User.findById(user._id).select("+password"))!.password;
    expect(after).toBe(original);
  });

  it("excluye password por defecto en las queries", async () => {
    await User.create(buildUser());
    const found = await User.findOne({ email: "cliente@example.com" });
    expect(found?.password).toBeUndefined();
  });

  it("aplica role customer por defecto", async () => {
    const user = await User.create(buildUser());
    expect(user.role).toBe("customer");
  });

  it("rechaza emails duplicados", async () => {
    await User.create(buildUser());
    await expect(User.create(buildUser())).rejects.toThrow();
  });

  it("rechaza emails con formato inválido", async () => {
    await expect(User.create(buildUser({ email: "no-es-un-email" }))).rejects.toThrow();
  });

  it("permite agregar direcciones con su propio _id", async () => {
    const user = await User.create(
      buildUser({
        addresses: [
          {
            street: "Av. Siempre Viva",
            number: "742",
            city: "CABA",
            province: "Buenos Aires",
            postalCode: "C1000",
            country: "Argentina",
            isDefault: true,
          },
        ],
      }),
    );
    expect(user.addresses).toHaveLength(1);
    expect(user.addresses[0]?._id).toBeDefined();
  });

  it("no incluye password ni __v al serializar a JSON", async () => {
    const user = await User.create(buildUser());
    const json = user.toJSON();
    expect(json).not.toHaveProperty("password");
    expect(json).not.toHaveProperty("__v");
  });
});
