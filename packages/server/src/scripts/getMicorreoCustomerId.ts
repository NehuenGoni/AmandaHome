import { env } from "../config/env.js";

/**
 * El `customerId` de MiCorreo se obtiene una sola vez (no cambia) y se
 * carga como MICORREO_CUSTOMER_ID en el .env.
 *
 * Usa DOS pares de credenciales distintos:
 *  - MICORREO_USER / MICORREO_PASSWORD (ya en el .env): credenciales de
 *    integración (Basic Auth) que Correo Argentino entrega por separado
 *    para cada ambiente, a través de un ejecutivo comercial.
 *  - MICORREO_ACCOUNT_EMAIL / MICORREO_ACCOUNT_PASSWORD (se pasan solo al
 *    correr este script, no se guardan en el .env): el email/contraseña
 *    de tu cuenta normal de MiCorreo, la que usás para entrar a la web.
 *
 * Se corre así:
 *   MICORREO_ACCOUNT_EMAIL=... MICORREO_ACCOUNT_PASSWORD=... npm run shipping:customer-id -w packages/server
 */
async function main() {
  if (!env.MICORREO_USER || !env.MICORREO_PASSWORD) {
    console.error(
      "[shipping:customer-id] Faltan MICORREO_USER y/o MICORREO_PASSWORD en el .env " +
        "(las credenciales de integración/API que te dio Correo Argentino, no tu login de la web).",
    );
    process.exit(1);
  }

  const accountEmail = process.env.MICORREO_ACCOUNT_EMAIL;
  const accountPassword = process.env.MICORREO_ACCOUNT_PASSWORD;
  if (!accountEmail || !accountPassword) {
    console.error(
      "[shipping:customer-id] Faltan MICORREO_ACCOUNT_EMAIL y/o MICORREO_ACCOUNT_PASSWORD. " +
        "Son el email/contraseña de tu cuenta normal de MiCorreo (la de la web), pasados como variables " +
        "de entorno SOLO para esta corrida, por ejemplo:\n" +
        '  MICORREO_ACCOUNT_EMAIL="vos@mail.com" MICORREO_ACCOUNT_PASSWORD="tu-contraseña" npm run shipping:customer-id',
    );
    process.exit(1);
  }

  const baseUrl =
    env.MICORREO_ENV === "prod"
      ? "https://api.correoargentino.com.ar/micorreo/v1"
      : "https://apitest.correoargentino.com.ar/micorreo/v1";

  console.log(`[shipping:customer-id] Usando entorno "${env.MICORREO_ENV}" (${baseUrl})`);

  const basicAuth = Buffer.from(`${env.MICORREO_USER}:${env.MICORREO_PASSWORD}`).toString("base64");
  const tokenRes = await fetch(`${baseUrl}/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basicAuth}` },
  });

  if (!tokenRes.ok) {
    console.error(
      `[shipping:customer-id] No se pudo autenticar (HTTP ${tokenRes.status}). ` +
        "Revisá MICORREO_USER, MICORREO_PASSWORD y MICORREO_ENV (test/prod): son las credenciales de " +
        "integración que te dio Correo Argentino, no tu login de la web.",
    );
    console.error(await tokenRes.text().catch(() => ""));
    process.exit(1);
  }

  const { token } = (await tokenRes.json()) as { token: string; expires: string };

  const validateRes = await fetch(`${baseUrl}/users/validate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: accountEmail, password: accountPassword }),
  });

  if (!validateRes.ok) {
    console.error(
      `[shipping:customer-id] No se pudo validar la cuenta (HTTP ${validateRes.status}). ` +
        "Revisá MICORREO_ACCOUNT_EMAIL y MICORREO_ACCOUNT_PASSWORD.",
    );
    console.error(await validateRes.text().catch(() => ""));
    process.exit(1);
  }

  const { customerId } = (await validateRes.json()) as { customerId: string; createdAt: string };

  console.log("");
  console.log("[shipping:customer-id] Listo. Agregá esto a tu .env:");
  console.log(`MICORREO_CUSTOMER_ID=${customerId}`);
  console.log("");
  process.exit(0);
}

main().catch((err) => {
  console.error("[shipping:customer-id] Error:", err);
  process.exit(1);
});
