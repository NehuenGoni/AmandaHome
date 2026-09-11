import { describe, expect, it } from "vitest";
import { slugify } from "./slugify.js";

describe("slugify", () => {
  it("convierte a minúsculas y reemplaza espacios por guiones", () => {
    expect(slugify("Juego de Sábanas King")).toBe("juego-de-sabanas-king");
  });

  it("elimina acentos y ñ se conserva como n tras NFD", () => {
    expect(slugify("Baño Pequeño")).toBe("bano-pequeno");
  });

  it("elimina caracteres especiales", () => {
    expect(slugify("Set de Toallas 100% Algodón!")).toBe("set-de-toallas-100-algodon");
  });

  it("colapsa guiones múltiples y recorta bordes", () => {
    expect(slugify("  --Vela Aromática--  ")).toBe("vela-aromatica");
  });
});
