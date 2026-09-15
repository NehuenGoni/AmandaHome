import type { Response } from "express";
import { isProduction } from "../config/env.js";
import { getRefreshTokenMaxAgeMs } from "./jwt.js";

export const REFRESH_TOKEN_COOKIE = "refreshToken";
const REFRESH_TOKEN_PATH = "/api/auth";

/**
 * En producción, client (Vercel) y server (Fly.io) viven en dominios distintos,
 * así que la cookie es cross-site: necesita sameSite "none" + secure (requiere HTTPS,
 * que ambas plataformas dan por defecto). En dev, client y server comparten site vía
 * el proxy de Vite, así que "lax" alcanza y evita depender de HTTPS local.
 */
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  path: REFRESH_TOKEN_PATH,
};

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...cookieOptions,
    maxAge: getRefreshTokenMaxAgeMs(),
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions);
}
