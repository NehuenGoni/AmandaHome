import { env } from "../config/env.js";
import { AdminInvite, type IAdminInvite } from "../models/AdminInvite.js";
import { User, type UserDocument } from "../models/User.js";
import { revokeAllUserRefreshTokens } from "./authService.js";
import { sendAdminInviteEmail, sendAdminRevokedEmail } from "./email/emailService.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/AppError.js";
import { generateRawToken, hashToken } from "../utils/hash.js";
import type { InviteAdminInput } from "../validators/adminValidators.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function isInvitePending(invite: Pick<IAdminInvite, "acceptedAt" | "revokedAt" | "expiresAt">): boolean {
  return !invite.acceptedAt && !invite.revokedAt && invite.expiresAt.getTime() > Date.now();
}

export async function inviteAdmin(input: InviteAdminInput, invitedBy: string) {
  const email = input.email.toLowerCase().trim();

  const existingAdmin = await User.findOne({ email, role: "admin", isActive: true });
  if (existingAdmin) {
    throw new ConflictError("Ese usuario ya es administrador");
  }

  const pendingInvites = await AdminInvite.find({ email });
  if (pendingInvites.some(isInvitePending)) {
    throw new ConflictError("Ya existe una invitación pendiente para ese email");
  }

  const rawToken = generateRawToken();
  const invite = await AdminInvite.create({
    email,
    tokenHash: hashToken(rawToken),
    invitedBy,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  const inviteUrl = `${env.CLIENT_URL}/accept-invite?token=${rawToken}`;
  sendAdminInviteEmail(email, inviteUrl);

  return invite;
}

export async function listPendingInvites() {
  const invites = await AdminInvite.find({
    acceptedAt: { $exists: false },
    revokedAt: { $exists: false },
  }).sort({ createdAt: -1 });
  return invites;
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const invite = await AdminInvite.findById(inviteId);
  if (!invite) {
    throw new NotFoundError("Invitación no encontrada");
  }
  if (invite.acceptedAt) {
    throw new ConflictError("La invitación ya fue aceptada");
  }
  if (invite.revokedAt) {
    throw new ConflictError("La invitación ya fue revocada");
  }

  invite.revokedAt = new Date();
  await invite.save();
}

export async function listAdmins(): Promise<UserDocument[]> {
  return User.find({ role: "admin" }).sort({ createdAt: 1 });
}

async function countActiveAdmins(): Promise<number> {
  return User.countDocuments({ role: "admin", isActive: true });
}

export async function revokeAdmin(targetUserId: string, actingAdminId: string): Promise<UserDocument> {
  if (targetUserId === actingAdminId) {
    throw new ForbiddenError("No podés revocar tus propios permisos de administrador");
  }

  const target = await User.findById(targetUserId);
  if (!target || target.role !== "admin") {
    throw new NotFoundError("Administrador no encontrado");
  }

  const activeAdmins = await countActiveAdmins();
  if (activeAdmins <= 1) {
    throw new ConflictError("Debe quedar al menos un administrador activo");
  }

  target.role = "customer";
  await target.save();

  await revokeAllUserRefreshTokens(target._id.toString());
  sendAdminRevokedEmail(target);

  return target;
}
