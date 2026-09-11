import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import msImport from "ms";
import type { Role } from "@amanda/shared";
import { env } from "../config/env.js";

// `ms` exporta con `export =`; bajo module:NodeNext (ESM) no se puede tipar
// el namespace `ms.StringValue`, así que se castea una sola vez acá.
const parseDuration = msImport as unknown as (value: string) => number;

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload & jwt.JwtPayload;
}

/** Genera un refresh token nuevo con su propio jti y la fecha de expiración calculada. */
export function signRefreshToken(userId: string): { token: string; jti: string; expiresAt: Date } {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, jti } satisfies RefreshTokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
  const expiresAt = new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN));
  return { token, jti, expiresAt };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload & jwt.JwtPayload;
}

export function getRefreshTokenMaxAgeMs(): number {
  return parseDuration(env.JWT_REFRESH_EXPIRES_IN);
}
