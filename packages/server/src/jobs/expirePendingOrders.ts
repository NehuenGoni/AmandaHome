import { expireStalePendingOrders } from "../services/orderService.js";

const INTERVAL_MS = 15 * 60 * 1000;

/**
 * Nunca lanza: un error acá no debe tirar abajo el server. Corre al
 * arrancar (Fly apaga la máquina sin tráfico, así que "al arrancar" es
 * en la práctica la única garantía de ejecución) y después cada 15 min
 * mientras el proceso siga vivo.
 */
async function runExpirationSweep(): Promise<void> {
  try {
    const expired = await expireStalePendingOrders();
    if (expired > 0) {
      console.log(`[orders] ${expired} pedido(s) pending vencido(s) y cancelado(s)`);
    }
  } catch (err) {
    console.error("[orders] error venciendo pedidos pending:", err);
  }
}

export function startOrderExpirationJob(): void {
  void runExpirationSweep();
  const interval = setInterval(runExpirationSweep, INTERVAL_MS);
  interval.unref();
}
