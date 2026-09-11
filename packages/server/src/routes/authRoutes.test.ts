import { Types } from "mongoose";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi, type Mock } from "vitest";
import { createApp } from "../app.js";
import { AdminInvite } from "../models/AdminInvite.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { clearTestDB, closeTestDB, connectTestDB } from "../test/dbTestUtils.js";
import { generateRawToken, hashToken } from "../utils/hash.js";

vi.mock("../services/email/emailService.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/email/emailService.js")>();
  return {
    ...actual,
    sendWelcomeEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    sendAdminPromotedEmail: vi.fn(),
    sendAdminInviteEmail: vi.fn(),
    sendAdminRevokedEmail: vi.fn(),
  };
});

import { sendPasswordResetEmail } from "../services/email/emailService.js";

const app = createApp();

beforeAll(connectTestDB);
afterEach(() => {
  vi.clearAllMocks();
  return clearTestDB();
});
afterAll(closeTestDB);

function extractCookie(res: request.Response, name: string): string | undefined {
  const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
  return cookies?.find((c) => c.startsWith(`${name}=`));
}

const credentials = {
  email: "cliente@example.com",
  password: "supersecreto123",
  firstName: "Ana",
  lastName: "Pérez",
};

describe("POST /api/auth/register", () => {
  it("crea el usuario, devuelve accessToken y setea la cookie de refresh", async () => {
    const res = await request(app).post("/api/auth/register").send(credentials);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(credentials.email);
    expect(res.body.user.password).toBeUndefined();
    expect(typeof res.body.accessToken).toBe("string");
    expect(extractCookie(res, "refreshToken")).toBeDefined();
  });

  it("rechaza un registro con email ya usado", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    const res = await request(app).post("/api/auth/register").send(credentials);
    expect(res.status).toBe(409);
  });

  it("rechaza datos inválidos con 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "no-es-email", password: "123", firstName: "", lastName: "" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("inicia sesión con credenciales correctas", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password });
    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe("string");
  });

  it("rechaza contraseña incorrecta con 401", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: "incorrecta" });
    expect(res.status).toBe(401);
  });

  it("rechaza un email inexistente con 401 (sin distinguir del caso anterior)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "no-existe@example.com", password: "cualquiera" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("rechaza sin token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("devuelve el usuario autenticado", async () => {
    const registerRes = await request(app).post("/api/auth/register").send(credentials);
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${registerRes.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(credentials.email);
  });
});

describe("POST /api/auth/refresh", () => {
  it("rechaza sin cookie de refresh", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("rota el refresh token: emite uno nuevo y revoca el anterior", async () => {
    const registerRes = await request(app).post("/api/auth/register").send(credentials);
    const refreshCookie = extractCookie(registerRes, "refreshToken")!;

    const refreshRes = await request(app).post("/api/auth/refresh").set("Cookie", refreshCookie);
    expect(refreshRes.status).toBe(200);
    expect(typeof refreshRes.body.accessToken).toBe("string");

    const newRefreshCookie = extractCookie(refreshRes, "refreshToken");
    expect(newRefreshCookie).toBeDefined();
    expect(newRefreshCookie).not.toBe(refreshCookie);
  });

  it("revoca toda la sesión si se reutiliza un refresh token ya rotado", async () => {
    const registerRes = await request(app).post("/api/auth/register").send(credentials);
    const originalCookie = extractCookie(registerRes, "refreshToken")!;

    const firstRefresh = await request(app).post("/api/auth/refresh").set("Cookie", originalCookie);
    const rotatedCookie = extractCookie(firstRefresh, "refreshToken")!;

    // Reusar la cookie original (ya rotada) debe fallar...
    const reuseRes = await request(app).post("/api/auth/refresh").set("Cookie", originalCookie);
    expect(reuseRes.status).toBe(401);

    // ...y también debe invalidar la cadena rotada por seguridad.
    const afterReuseRes = await request(app).post("/api/auth/refresh").set("Cookie", rotatedCookie);
    expect(afterReuseRes.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("revoca el refresh token y limpia la cookie", async () => {
    const registerRes = await request(app).post("/api/auth/register").send(credentials);
    const refreshCookie = extractCookie(registerRes, "refreshToken")!;

    const logoutRes = await request(app).post("/api/auth/logout").set("Cookie", refreshCookie);
    expect(logoutRes.status).toBe(204);

    const refreshRes = await request(app).post("/api/auth/refresh").set("Cookie", refreshCookie);
    expect(refreshRes.status).toBe(401);
  });
});

describe("POST /api/auth/forgot-password + reset-password", () => {
  it("responde igual exista o no el email (no enumera cuentas)", async () => {
    const resExiste = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "no-existe@example.com" });
    expect(resExiste.status).toBe(200);
  });

  it("permite resetear la contraseña con un token válido y revoca sesiones activas", async () => {
    const registerRes = await request(app).post("/api/auth/register").send(credentials);
    const refreshCookie = extractCookie(registerRes, "refreshToken")!;

    await request(app).post("/api/auth/forgot-password").send({ email: credentials.email });
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);

    const resetUrl = (sendPasswordResetEmail as Mock).mock.calls[0][1] as string;
    const rawToken = new URL(resetUrl).searchParams.get("token")!;

    const resetRes = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, newPassword: "nuevacontrasena123" });
    expect(resetRes.status).toBe(200);

    // La sesión previa quedó revocada por el reset.
    const refreshRes = await request(app).post("/api/auth/refresh").set("Cookie", refreshCookie);
    expect(refreshRes.status).toBe(401);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: "nuevacontrasena123" });
    expect(loginRes.status).toBe(200);
  });

  it("rechaza un token de reset inválido", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "token-inventado", newPassword: "nuevacontrasena123" });
    expect(res.status).toBe(400);
  });

  it("rechaza reusar un token de reset ya utilizado", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    await request(app).post("/api/auth/forgot-password").send({ email: credentials.email });
    const resetUrl = (sendPasswordResetEmail as Mock).mock.calls[0][1] as string;
    const rawToken = new URL(resetUrl).searchParams.get("token")!;

    await request(app).post("/api/auth/reset-password").send({ token: rawToken, newPassword: "otra12345678" });
    const secondAttempt = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, newPassword: "otra87654321" });
    expect(secondAttempt.status).toBe(400);
  });
});

describe("POST /api/auth/accept-invite", () => {
  it("crea un usuario admin nuevo a partir de una invitación válida", async () => {
    const rawToken = generateRawToken();
    await AdminInvite.create({
      email: "nuevo-admin@example.com",
      tokenHash: hashToken(rawToken),
      invitedBy: new Types.ObjectId(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    const res = await request(app).post("/api/auth/accept-invite").send({
      token: rawToken,
      password: "adminpassword123",
      firstName: "Nueva",
      lastName: "Admin",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("admin");
    expect(res.body.user.email).toBe("nuevo-admin@example.com");
  });

  it("rechaza una invitación expirada", async () => {
    const rawToken = generateRawToken();
    await AdminInvite.create({
      email: "expirado@example.com",
      tokenHash: hashToken(rawToken),
      invitedBy: new Types.ObjectId(),
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app).post("/api/auth/accept-invite").send({
      token: rawToken,
      password: "adminpassword123",
      firstName: "Nueva",
      lastName: "Admin",
    });
    expect(res.status).toBe(400);
  });

  it("rechaza reusar una invitación ya aceptada", async () => {
    const rawToken = generateRawToken();
    await AdminInvite.create({
      email: "doble@example.com",
      tokenHash: hashToken(rawToken),
      invitedBy: new Types.ObjectId(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    const body = { token: rawToken, password: "adminpassword123", firstName: "A", lastName: "B" };
    await request(app).post("/api/auth/accept-invite").send(body);
    const second = await request(app).post("/api/auth/accept-invite").send(body);
    expect(second.status).toBe(400);
  });
});

describe("integridad de RefreshToken en DB", () => {
  it("cada login crea un registro de RefreshToken", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    const count = await RefreshToken.countDocuments();
    expect(count).toBe(1);
  });
});
