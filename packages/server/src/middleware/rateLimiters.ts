import rateLimit from "express-rate-limit";
import { isTest } from "../config/env.js";

/** Desactivado en test para no interferir con suites que golpean el mismo endpoint muchas veces. */
const skip = () => isTest;

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { message: "Demasiados intentos de inicio de sesión, intentá de nuevo más tarde", code: "TOO_MANY_REQUESTS" },
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { message: "Demasiados registros desde esta IP, intentá de nuevo más tarde", code: "TOO_MANY_REQUESTS" },
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { message: "Demasiadas solicitudes, intentá de nuevo más tarde", code: "TOO_MANY_REQUESTS" },
});
