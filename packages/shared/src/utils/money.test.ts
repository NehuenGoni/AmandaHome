import { describe, expect, it } from "vitest";
import { centsToPesos, formatMoney, percentageOfCents, pesosToCents, sumCents } from "./money.js";

const NBSP = " ";

describe("formatMoney", () => {
  it("formatea centavos como pesos argentinos con símbolo", () => {
    expect(formatMoney(123456)).toBe(`$${NBSP}1.234,56`);
  });

  it("formatea sin símbolo cuando se pide", () => {
    expect(formatMoney(123456, { withSymbol: false })).toBe("1.234,56");
  });

  it("maneja cero", () => {
    expect(formatMoney(0)).toBe(`$${NBSP}0,00`);
  });

  it("maneja montos negativos", () => {
    expect(formatMoney(-500)).toBe(`-$${NBSP}5,00`);
  });
});

describe("pesosToCents", () => {
  it("convierte pesos con decimales a centavos enteros", () => {
    expect(pesosToCents(10.5)).toBe(1050);
  });

  it("redondea flotantes imprecisos", () => {
    expect(pesosToCents(19.99)).toBe(1999);
  });
});

describe("centsToPesos", () => {
  it("convierte centavos a pesos", () => {
    expect(centsToPesos(1050)).toBe(10.5);
  });
});

describe("sumCents", () => {
  it("suma múltiples montos en centavos", () => {
    expect(sumCents(100, 200, 300)).toBe(600);
  });

  it("redondea cada término antes de sumar", () => {
    expect(sumCents(100.4, 200.4)).toBe(300);
  });
});

describe("percentageOfCents", () => {
  it("calcula un porcentaje y redondea al centavo", () => {
    expect(percentageOfCents(10000, 21)).toBe(2100);
  });

  it("redondea correctamente casos no exactos", () => {
    expect(percentageOfCents(999, 10)).toBe(100);
  });
});
