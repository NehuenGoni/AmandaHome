import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { adminRouter } from "./routes/adminRoutes.js";
import { authRouter } from "./routes/authRoutes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(cookieParser());

  // El webhook de pagos (Fase 8) se monta acá, antes del sanitizador y con su
  // propio parser de body: necesita el payload crudo para no romper la
  // verificación de la notificación contra la API del gateway.

  app.use(express.json());
  app.use(mongoSanitize());

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);

  // El resto de las rutas de negocio (products, orders, ...) se montan acá
  // a medida que avanzan las siguientes fases.

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
