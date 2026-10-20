import crypto from "node:crypto";
import type { Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

const SECRET = "test-webhook-secret";
const envMockState = vi.hoisted(() => ({ isMercadoPagoWebhookSecretConfigured: true }));

vi.mock("../config/env.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/env.js")>();
  return {
    ...actual,
    env: { ...actual.env, MERCADOPAGO_WEBHOOK_SECRET: SECRET },
    get isMercadoPagoWebhookSecretConfigured() {
      return envMockState.isMercadoPagoWebhookSecretConfigured;
    },
  };
});

const { verifyMercadoPagoWebhook } = await import("./verifyMercadoPagoWebhook.js");

afterEach(() => {
  envMockState.isMercadoPagoWebhookSecretConfigured = true;
});

function buildSignature(dataId: string, requestId: string, ts: string): string {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac("sha256", SECRET).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

function buildReq(opts: {
  dataId?: string;
  signature?: string;
  requestId?: string;
  query?: Record<string, string>;
}): Request {
  const headers: Record<string, string> = {};
  if (opts.signature) headers["x-signature"] = opts.signature;
  if (opts.requestId) headers["x-request-id"] = opts.requestId;

  return {
    header: (name: string) => headers[name.toLowerCase()],
    body: opts.dataId ? { data: { id: opts.dataId } } : {},
    query: opts.query ?? {},
  } as unknown as Request;
}

function buildRes() {
  const res: Partial<Response> = {
    sendStatus: vi.fn().mockReturnThis(),
  };
  return res as Response & { sendStatus: ReturnType<typeof vi.fn> };
}

describe("verifyMercadoPagoWebhook", () => {
  it("deja pasar si no hay clave secreta configurada", () => {
    envMockState.isMercadoPagoWebhookSecretConfigured = false;
    const req = buildReq({});
    const res = buildRes();
    const next = vi.fn();

    verifyMercadoPagoWebhook(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.sendStatus).not.toHaveBeenCalled();
  });

  it("deja pasar una notificación con firma válida", () => {
    const dataId = "123456789";
    const requestId = "req-1";
    const ts = "1700000000";
    const req = buildReq({ dataId, requestId, signature: buildSignature(dataId, requestId, ts) });
    const res = buildRes();
    const next = vi.fn();

    verifyMercadoPagoWebhook(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.sendStatus).not.toHaveBeenCalled();
  });

  it("rechaza con 401 si la firma no coincide", () => {
    const dataId = "123456789";
    const requestId = "req-1";
    const ts = "1700000000";
    // Firma calculada con otro dataId: no va a coincidir.
    const req = buildReq({ dataId, requestId, signature: buildSignature("otro-id", requestId, ts) });
    const res = buildRes();
    const next = vi.fn();

    verifyMercadoPagoWebhook(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(401);
  });

  it("rechaza con 401 si falta el header x-signature", () => {
    const req = buildReq({ dataId: "123", requestId: "req-1" });
    const res = buildRes();
    const next = vi.fn();

    verifyMercadoPagoWebhook(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(401);
  });

  it("rechaza con 401 si falta el header x-request-id", () => {
    const req = buildReq({ dataId: "123", signature: "ts=1700000000,v1=abc" });
    const res = buildRes();
    const next = vi.fn();

    verifyMercadoPagoWebhook(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(401);
  });

  it("rechaza con 401 si no hay data.id en el body ni en la query", () => {
    const req = buildReq({ requestId: "req-1", signature: "ts=1700000000,v1=abc" });
    const res = buildRes();
    const next = vi.fn();

    verifyMercadoPagoWebhook(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(401);
  });

  it("acepta el data.id recibido por query string", () => {
    const dataId = "999";
    const requestId = "req-2";
    const ts = "1700000001";
    const req = buildReq({
      requestId,
      signature: buildSignature(dataId, requestId, ts),
      query: { "data.id": dataId },
    });
    const res = buildRes();
    const next = vi.fn();

    verifyMercadoPagoWebhook(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.sendStatus).not.toHaveBeenCalled();
  });
});
