export type ThemePreference = "light" | "dark" | "system";

/**
 * El mismo literal está escrito en el script anti-parpadeo de index.html:
 * si cambia acá, hay que cambiarlo allá.
 */
export const THEME_STORAGE_KEY = "amanda:theme";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/** localStorage puede no estar disponible (modo privado, cuota agotada): se cae a la preferencia del sistema. */
export function readThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

/** Se guarda como string plano (sin JSON) para que el script inline de index.html pueda leerlo sin parsear. */
export function writeThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // ignorado a propósito
  }
}
