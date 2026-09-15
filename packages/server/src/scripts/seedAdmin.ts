import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/User.js";

/**
 * Crea (o promueve) el primer admin. No hay otra forma de bootstrear un admin:
 * el flujo normal de invitación (adminService.inviteAdmin) requiere ya ser admin.
 * Se corre a mano, apuntando MONGODB_URI a la base que corresponda:
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run seed:admin -w packages/server
 */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const firstName = process.env.SEED_ADMIN_FIRST_NAME ?? "Admin";
  const lastName = process.env.SEED_ADMIN_LAST_NAME ?? "Amanda";

  if (!email || !password) {
    console.error("[seed:admin] Faltan SEED_ADMIN_EMAIL y/o SEED_ADMIN_PASSWORD en el entorno.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("[seed:admin] SEED_ADMIN_PASSWORD debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = "admin";
    existing.isActive = true;
    existing.password = password;
    await existing.save();
    console.log(`[seed:admin] Usuario existente "${email}" promovido a admin.`);
  } else {
    await User.create({ email, password, firstName, lastName, role: "admin" });
    console.log(`[seed:admin] Admin "${email}" creado.`);
  }

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed:admin] Error:", err);
  process.exit(1);
});
