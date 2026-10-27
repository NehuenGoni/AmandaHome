import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, trackPageView } from "@/lib/analytics";

/** Manda un page_view por cada cambio de ruta; el sitio es una SPA y no recarga al navegar. */
export function RouteTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    // Helmet actualiza el <title> en el mismo ciclo; esperamos un tick para que el page_view lo lleve.
    const timer = setTimeout(() => trackPageView(pathname + search), 0);
    return () => clearTimeout(timer);
  }, [pathname, search]);

  return null;
}
