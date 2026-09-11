import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { Cart } from "./Cart.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe("Cart", () => {
  it("crea un carrito vacío para un usuario", async () => {
    const cart = await Cart.create({ user: new Types.ObjectId() });
    expect(cart.items).toHaveLength(0);
  });

  it("normaliza el variantSku a mayúsculas", async () => {
    const cart = await Cart.create({
      user: new Types.ObjectId(),
      items: [{ product: new Types.ObjectId(), variantSku: "abc-123", quantity: 2 }],
    });
    expect(cart.items[0]?.variantSku).toBe("ABC-123");
  });

  it("rechaza un segundo carrito para el mismo usuario", async () => {
    const user = new Types.ObjectId();
    await Cart.create({ user });
    await expect(Cart.create({ user })).rejects.toThrow();
  });

  it("rechaza cantidades menores a 1", async () => {
    await expect(
      Cart.create({
        user: new Types.ObjectId(),
        items: [{ product: new Types.ObjectId(), variantSku: "SKU", quantity: 0 }],
      }),
    ).rejects.toThrow();
  });
});
