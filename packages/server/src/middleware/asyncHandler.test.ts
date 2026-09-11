import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { asyncHandler } from "./asyncHandler.js";
import { errorHandler } from "./errorHandler.js";

describe("asyncHandler", () => {
  it("deja pasar la respuesta normal de un handler async exitoso", async () => {
    const app = express();
    app.get(
      "/ok",
      asyncHandler(async (_req, res) => {
        res.json({ ok: true });
      }),
    );
    app.use(errorHandler);

    const res = await request(app).get("/ok");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("propaga el rechazo de una promesa al error handler", async () => {
    const app = express();
    app.get(
      "/fail",
      asyncHandler(async () => {
        throw new Error("falló adentro del handler async");
      }),
    );
    app.use(errorHandler);

    const res = await request(app).get("/fail");
    expect(res.status).toBe(500);
    expect(res.body.code).toBe("INTERNAL_ERROR");
  });
});
