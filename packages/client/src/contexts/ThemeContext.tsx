import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readThemePreference, writeThemePreference, type ThemePreference } from "@/lib/themeStorage";

export type { ThemePreference } from "@/lib/themeStorage";

type ResolvedTheme = "light" | "dark";

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? resolveSystemTheme() : preference;
}

function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

const CYCLE_ORDER: ThemePreference[] = ["light", "dark", "system"];

interface ThemeContextValue {
  /** La preferencia elegida por el usuario. */
  theme: ThemePreference;
  /** El tema que efectivamente se está mostrando (resuelve "system"). */
  resolvedTheme: ResolvedTheme;
  setTheme: (preference: ThemePreference) => void;
  /** Recorre claro → oscuro → sistema → claro. */
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => readThemePreference());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme));

  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);

    if (theme !== "system" || typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const next = resolveSystemTheme();
      setResolvedTheme(next);
      applyTheme(next);
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = useCallback((preference: ThemePreference) => {
    writeThemePreference(preference);
    setThemeState(preference);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = CYCLE_ORDER[(CYCLE_ORDER.indexOf(prev) + 1) % CYCLE_ORDER.length]!;
      writeThemePreference(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, cycleTheme }),
    [theme, resolvedTheme, setTheme, cycleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}
