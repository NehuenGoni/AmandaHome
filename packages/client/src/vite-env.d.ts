/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL pública del backend (con /api al final), ej: https://api.homedecoamanda.com/api. Vacío en dev: usa el proxy de Vite. */
  readonly VITE_API_URL?: string;
  /** Dominio canónico del sitio, sin barra final, ej: https://homedecoamanda.com. Se usa en canonical, Open Graph y JSON-LD. */
  readonly VITE_SITE_URL?: string;
  /** ID de medición de Google Analytics 4 (G-XXXXXXX). Sin valor, no se carga analítica. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
