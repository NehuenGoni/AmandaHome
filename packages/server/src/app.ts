import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { adminCategoryRouter } from "./routes/adminCategoryRoutes.js";
import { adminProductRouter } from "./routes/adminProductRoutes.js";
import { adminRouter } from "./routes/adminRoutes.js";
import { authRouter } from "./routes/authRoutes.js";
import { cartRouter } from "./routes/cartRoutes.js";
import { categoryRouter } from "./routes/categoryRoutes.js";
import { checkoutRouter } from "./routes/checkoutRoutes.js";
import { checkoutWebhookRouter } from "./routes/checkoutWebhookRoutes.js";
import { productRouter } from "./routes/productRoutes.js";
import { uploadRouter } from "./routes/uploadRoutes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(cookieParser());

  // El webhook de pagos se monta antes del sanitizador y con su propio
  // parser: el handler nunca confía en este payload de todas formas (siempre
  // re-consulta el pago real contra la API del gateway), pero mongoSanitize
  // no debe tocar una notificación externa antes de leerla.
  app.use("/api/checkout/webhook", express.json(), checkoutWebhookRouter);

  app.use(express.json());
  app.use(mongoSanitize());

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/admin/categories", adminCategoryRouter);
  app.use("/api/categories", categoryRouter);
  app.use("/api/admin/products", adminProductRouter);
  app.use("/api/products", productRouter);
  app.use("/api/uploads", uploadRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/checkout", checkoutRouter);

  // El resto de las rutas de negocio (orders, inventory, supplier-purchases,
  // ...) se montan acá a medida que avanzan las siguientes fases.

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
