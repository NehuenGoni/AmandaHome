import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("GET /api/health", () => {
  it("responde ok", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("404", () => {
  it("responde 404 para rutas desconocidas", async () => {
    const app = createApp();
    const res = await request(app).get("/api/no-existe");
    expect(res.status).toBe(404);
  });
});
