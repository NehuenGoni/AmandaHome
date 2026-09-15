/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL pública del backend (con /api al final), ej: https://amanda-server.fly.dev/api. Vacío en dev: usa el proxy de Vite. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
