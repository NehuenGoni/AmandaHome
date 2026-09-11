import type { Response } from "express";
import { isProduction } from "../config/env.js";
import { getRefreshTokenMaxAgeMs } from "./jwt.js";

export const REFRESH_TOKEN_COOKIE = "refreshToken";
const REFRESH_TOKEN_PATH = "/api/auth";

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: REFRESH_TOKEN_PATH,
    maxAge: getRefreshTokenMaxAgeMs(),
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: REFRESH_TOKEN_PATH,
  });
}
