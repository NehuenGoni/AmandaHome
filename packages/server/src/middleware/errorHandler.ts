import type { ErrorRequestHandler } from "express";
import { Error as MongooseError } from "mongoose";
import { ZodError } from "zod";
import { isProduction } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

interface MongoServerErrorLike extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

interface ErrorBody {
  message: string;
  code: string;
  details?: unknown;
}

function isJwtError(err: Error): boolean {
  return err.name === "JsonWebTokenError" || err.name === "TokenExpiredError";
}

function isMongoDuplicateKeyError(err: Error): err is MongoServerErrorLike {
  return err.name === "MongoServerError" && (err as MongoServerErrorLike).code === 11000;
}

/**
 * Handler central: traduce errores de Zod y de Mongoose/Mongo a respuestas
 * consistentes, y nunca filtra detalles internos de errores no operacionales
 * en producción.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    const body: ErrorBody = { message: err.message, code: err.code, details: err.details };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ErrorBody = {
      message: "Datos inválidos",
      code: "VALIDATION_ERROR",
      details: err.flatten(),
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof MongooseError.ValidationError) {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message]),
    );
    const body: ErrorBody = { message: "Datos inválidos", code: "VALIDATION_ERROR", details };
    res.status(400).json(body);
    return;
  }

  if (err instanceof MongooseError.CastError) {
    const body: ErrorBody = { message: `Identificador inválido: ${err.value}`, code: "BAD_REQUEST" };
    res.status(400).json(body);
    return;
  }

  if (isMongoDuplicateKeyError(err)) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? "campo";
    const body: ErrorBody = {
      message: `Ya existe un registro con ese ${field}`,
      code: "CONFLICT",
      details: err.keyValue,
    };
    res.status(409).json(body);
    return;
  }

  if (isJwtError(err)) {
    const body: ErrorBody = { message: "Token inválido o expirado", code: "UNAUTHORIZED" };
    res.status(401).json(body);
    return;
  }

  console.error("[error]", err);
  const body: ErrorBody = {
    message: isProduction ? "Error interno del servidor" : err.message,
    code: "INTERNAL_ERROR",
  };
  res.status(500).json(body);
};
