const CURRENCY_LOCALE = "es-AR";
const CURRENCY_CODE = "ARS";

/**
 * Formatea un monto en centavos (entero) como pesos argentinos, ej:
 * formatMoney(123456) -> "$ 1.234,56"
 */
export function formatMoney(cents: number, options: { withSymbol?: boolean } = {}): string {
  const { withSymbol = true } = options;
  const pesos = cents / 100;
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: withSymbol ? "currency" : "decimal",
    currency: CURRENCY_CODE,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pesos);
  return formatted;
}

/** Convierte un monto en pesos (puede tener decimales) a centavos enteros. */
export function pesosToCents(pesos: number): number {
  return Math.round(pesos * 100);
}

/** Convierte centavos a pesos como número (solo para cálculos, no para mostrar). */
export function centsToPesos(cents: number): number {
  return cents / 100;
}

/** Suma segura de montos en centavos, siempre devuelve un entero. */
export function sumCents(...amounts: number[]): number {
  return amounts.reduce((total, amount) => total + Math.round(amount), 0);
}

/** Calcula un porcentaje sobre un monto en centavos, redondeando al centavo. */
export function percentageOfCents(cents: number, percentage: number): number {
  return Math.round((cents * percentage) / 100);
}
