import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { startOrderExpirationJob } from "./jobs/expirePendingOrders.js";

async function bootstrap() {
  await connectDB();
  startOrderExpirationJob();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`[server] escuchando en el puerto ${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("[bootstrap] no se pudo iniciar el server:", err);
  process.exit(1);
});
