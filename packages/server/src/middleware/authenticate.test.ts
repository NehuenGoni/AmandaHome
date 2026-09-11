import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { signAccessToken } from "../utils/jwt.js";
import { authenticate, optionalAuthenticate, requireRole } from "./authenticate.js";
import { errorHandler } from "./errorHandler.js";

function buildProtectedApp() {
  const app = express();
  app.get("/private", authenticate, (req, res) => {
    res.json({ user: req.user });
  });
  app.get("/admin-only", authenticate, requireRole("admin"), (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/optional", optionalAuthenticate, (req, res) => {
    res.json({ user: req.user ?? null });
  });
  app.use(errorHandler);
  return app;
}

describe("authenticate", () => {
  it("rechaza requests sin token", async () => {
    const res = await request(buildProtectedApp()).get("/private");
    expect(res.status).toBe(401);
  });

  it("rechaza tokens inválidos", async () => {
    const res = await request(buildProtectedApp())
      .get("/private")
      .set("Authorization", "Bearer token-invalido");
    expect(res.status).toBe(401);
  });

  it("acepta un access token válido y adjunta req.user", async () => {
    const token = signAccessToken({ sub: "user-1", role: "customer" });
    const res = await request(buildProtectedApp())
      .get("/private")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: "user-1", role: "customer" });
  });
});

describe("requireRole", () => {
  it("rechaza con 403 a un role no autorizado", async () => {
    const token = signAccessToken({ sub: "user-1", role: "customer" });
    const res = await request(buildProtectedApp())
      .get("/admin-only")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("permite el acceso al role autorizado", async () => {
    const token = signAccessToken({ sub: "admin-1", role: "admin" });
    const res = await request(buildProtectedApp())
      .get("/admin-only")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe("optionalAuthenticate", () => {
  it("continúa sin user cuando no hay token", async () => {
    const res = await request(buildProtectedApp()).get("/optional");
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it("continúa sin user cuando el token es inválido", async () => {
    const res = await request(buildProtectedApp())
      .get("/optional")
      .set("Authorization", "Bearer invalido");
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it("adjunta user cuando el token es válido", async () => {
    const token = signAccessToken({ sub: "user-1", role: "admin" });
    const res = await request(buildProtectedApp())
      .get("/optional")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.user).toEqual({ id: "user-1", role: "admin" });
  });
});
