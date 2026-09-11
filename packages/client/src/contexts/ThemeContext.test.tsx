import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeContext.js";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("light", "dark");
});

describe("ThemeProvider", () => {
  it("usa 'system' por defecto y aplica una clase en <html> cuando no hay nada guardado", () => {
    renderHook(() => useTheme(), { wrapper });

    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("lee una preferencia previamente guardada al montar", () => {
    localStorage.setItem("amanda:theme", "dark");

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("setTheme('dark') agrega la clase dark, quita light y persiste la elección", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.resolvedTheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(localStorage.getItem("amanda:theme")).toBe("dark");
  });

  it("cycleTheme recorre claro → oscuro → sistema → claro", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("system");

    act(() => result.current.cycleTheme());
    expect(result.current.theme).toBe("light");

    act(() => result.current.cycleTheme());
    expect(result.current.theme).toBe("dark");

    act(() => result.current.cycleTheme());
    expect(result.current.theme).toBe("system");
  });

  it("useTheme fuera del provider lanza un error en español", () => {
    expect(() => renderHook(() => useTheme())).toThrow("useTheme debe usarse dentro de ThemeProvider");
  });
});
