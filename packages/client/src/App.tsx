import { formatMoney } from "@amanda/shared";

/**
 * Placeholder de la Fase 0: valida que el monorepo, Tailwind y la paleta de
 * marca funcionan de punta a punta. Las rutas reales llegan en las fases de
 * frontend público / cuenta / admin.
 */
export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <h1 className="text-3xl font-semibold text-text">Amanda Home & Deco</h1>
      <p className="text-text-muted">Plataforma e-commerce — scaffolding en construcción</p>
      <button
        type="button"
        className="rounded-md bg-primary px-5 py-2.5 font-medium text-on-primary transition-colors hover:bg-primary-strong"
      >
        Precio de ejemplo: {formatMoney(199900)}
      </button>
    </main>
  );
}
