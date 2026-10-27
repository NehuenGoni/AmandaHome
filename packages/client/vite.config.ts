import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Genera robots.txt en el build con el dominio de VITE_SITE_URL, así el dominio
 * se configura en un solo lugar (la variable de Vercel) y no queda hardcodeado.
 */
function robotsTxt(siteUrl: string | undefined): Plugin {
  return {
    name: "amanda-robots-txt",
    apply: "build",
    generateBundle() {
      if (!siteUrl) {
        this.warn("VITE_SITE_URL no está definida: robots.txt sale sin Sitemap y los og:image quedan sin dominio.");
      }
      const lines = [
        "User-agent: *",
        "Allow: /",
        "# Zonas privadas o sin valor para buscadores. Login/registro no se bloquean acá:",
        "# llevan noindex y Google necesita poder leerlo.",
        "Disallow: /admin",
        "Disallow: /cuenta",
        "Disallow: /checkout",
        "Disallow: /carrito",
        "Disallow: /order-confirmation",
        ...(siteUrl ? ["", `Sitemap: ${siteUrl.replace(/\/+$/, "")}/sitemap.xml`] : []),
        "",
      ];
      this.emitFile({ type: "asset", fileName: "robots.txt", source: lines.join("\n") });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "VITE_");

  return {
    plugins: [react(), tailwindcss(), robotsTxt(env.VITE_SITE_URL?.trim() || undefined)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
    },
  };
});
