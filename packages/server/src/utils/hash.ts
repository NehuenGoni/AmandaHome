import { createHash, randomBytes } from "node:crypto";

/** Token opaco enviado al usuario (email, link); nunca se persiste en claro. */
export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

/** Hash determinístico usado para buscar el token recibido contra el guardado en DB. */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
