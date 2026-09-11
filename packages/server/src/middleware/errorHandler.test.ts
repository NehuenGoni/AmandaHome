import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { NotFoundError, ValidationError } from "../utils/AppError.js";
import { errorHandler } from "./errorHandler.js";

function buildAppThatThrows(err: unknown) {
  const app = express();
  app.get("/boom", (_req, _res, next) => {
    next(err);
  });
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  it("traduce un AppError con su statusCode y code propios", async () => {
    const res = await request(buildAppThatThrows(new NotFoundError("Producto no encontrado"))).get(
      "/boom",
    );
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Producto no encontrado", code: "NOT_FOUND" });
  });

  it("incluye los details de un ValidationError propio", async () => {
    const res = await request(
      buildAppThatThrows(new ValidationError("Datos inválidos", { sku: "requerido" })),
    ).get("/boom");
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual({ sku: "requerido" });
  });

  it("traduce un ZodError a 400 VALIDATION_ERROR", async () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({});
    const res = await request(buildAppThatThrows(result.success ? undefined : result.error)).get(
      "/boom",
    );
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("traduce un ValidationError de Mongoose a 400", async () => {
    const err = new mongoose.Error.ValidationError();
    err.errors.name = new mongoose.Error.ValidatorError({ path: "name", message: "El nombre es requerido" });
    const res = await request(buildAppThatThrows(err)).get("/boom");
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual({ name: "El nombre es requerido" });
  });

  it("traduce un CastError de Mongoose a 400", async () => {
    const err = new mongoose.Error.CastError("ObjectId", "no-es-un-id", "productId");
    const res = await request(buildAppThatThrows(err)).get("/boom");
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("no-es-un-id");
  });

  it("traduce un error de clave duplicada de Mongo a 409", async () => {
    const err = Object.assign(new Error("duplicate"), {
      name: "MongoServerError",
      code: 11000,
      keyValue: { email: "cliente@example.com" },
    });
    const res = await request(buildAppThatThrows(err)).get("/boom");
    expect(res.status).toBe(409);
    expect(res.body.message).toContain("email");
  });

  it("traduce errores de JWT a 401", async () => {
    const err = Object.assign(new Error("jwt malformed"), { name: "JsonWebTokenError" });
    const res = await request(buildAppThatThrows(err)).get("/boom");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("devuelve 500 genérico para errores no reconocidos", async () => {
    const res = await request(buildAppThatThrows(new Error("boom inesperado"))).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body.code).toBe("INTERNAL_ERROR");
  });
});
