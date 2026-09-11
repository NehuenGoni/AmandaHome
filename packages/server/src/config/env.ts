import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * Fail-fast: si faltan o son inválidas las variables críticas del server,
 * el proceso no debe arrancar. Las integraciones de terceros (Cloudinary,
 * Mercado Pago, Resend) son opcionales para poder desarrollar sin todas las
 * cuentas configuradas; cada servicio decide en runtime si hace fallback.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url(),
  SERVER_URL: z.string().url().default("http://localhost:4000"),

  MONGODB_URI: z.string().min(1, "MONGODB_URI es requerida"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET debe tener al menos 32 caracteres"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET debe tener al menos 32 caracteres"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Amanda Home & Deco <no-reply@amandahomedeco.com.ar>"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("[env] configuración inválida, el server no puede arrancar:");
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  if (result.data.JWT_ACCESS_SECRET === result.data.JWT_REFRESH_SECRET) {
    console.error("[env] JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser distintos");
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

export const isCloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);
export const isMercadoPagoConfigured = Boolean(env.MERCADOPAGO_ACCESS_TOKEN);
export const isResendConfigured = Boolean(env.RESEND_API_KEY);
