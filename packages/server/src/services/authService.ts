import { env } from "../config/env.js";
import { AdminInvite } from "../models/AdminInvite.js";
import { PasswordResetToken } from "../models/PasswordResetToken.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { User, type UserDocument } from "../models/User.js";
import { sendAdminPromotedEmail, sendPasswordResetEmail, sendWelcomeEmail } from "./email/emailService.js";
import { BadRequestError, ConflictError, UnauthorizedError } from "../utils/AppError.js";
import { generateRawToken, hashToken } from "../utils/hash.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import type {
  AcceptInviteInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "../validators/authValidators.js";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

async function issueTokenPair(user: Pick<UserDocument, "_id" | "role">): Promise<TokenPair> {
  const userId = user._id.toString();
  const accessToken = signAccessToken({ sub: userId, role: user.role });
  const { token: refreshToken, jti, expiresAt } = signRefreshToken(userId);
  await RefreshToken.create({ user: userId, jti, expiresAt });
  return { accessToken, refreshToken };
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

export async function register(input: RegisterInput): Promise<{ user: UserDocument } & TokenPair> {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new ConflictError("Ya existe una cuenta con ese email");
  }

  const user = await User.create({
    email: input.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
  });

  sendWelcomeEmail(user);

  const tokens = await issueTokenPair(user);
  return { user, ...tokens };
}

export async function login(input: LoginInput): Promise<{ user: UserDocument } & TokenPair> {
  const user = await User.findOne({ email: input.email }).select("+password");
  if (!user || !(await user.comparePassword(input.password))) {
    throw new UnauthorizedError("Email o contraseña incorrectos");
  }
  if (!user.isActive) {
    throw new UnauthorizedError("La cuenta está desactivada");
  }

  const tokens = await issueTokenPair(user);
  return { user, ...tokens };
}

export async function refresh(rawRefreshToken: string): Promise<TokenPair> {
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new UnauthorizedError("Refresh token inválido o expirado");
  }

  const stored = await RefreshToken.findOne({ jti: payload.jti });
  if (!stored) {
    throw new UnauthorizedError("Refresh token desconocido");
  }

  if (stored.revokedAt) {
    // Reuse de un token ya rotado: posible robo, se corta toda la sesión del usuario.
    await revokeAllUserRefreshTokens(stored.user.toString());
    throw new UnauthorizedError("Refresh token ya utilizado, sesión revocada");
  }

  if (stored.expiresAt.getTime() < Date.now()) {
    throw new UnauthorizedError("Refresh token expirado");
  }

  const user = await User.findById(stored.user);
  if (!user || !user.isActive) {
    throw new UnauthorizedError("Usuario inválido");
  }

  const tokens = await issueTokenPair(user);
  const newPayload = verifyRefreshToken(tokens.refreshToken);
  stored.revokedAt = new Date();
  stored.replacedByJti = newPayload.jti;
  await stored.save();

  return tokens;
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;

  try {
    const payload = verifyRefreshToken(rawRefreshToken);
    await RefreshToken.updateOne(
      { jti: payload.jti, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
  } catch {
    // Token ya inválido/expirado: no hay nada que revocar.
  }
}

export async function getMe(userId: string): Promise<UserDocument> {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new UnauthorizedError("Usuario inválido");
  }
  return user;
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await User.findOne({ email: input.email });
  if (!user || !user.isActive) {
    // Nunca revelamos si el email existe.
    return;
  }

  const rawToken = generateRawToken();
  await PasswordResetToken.create({
    user: user._id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  });

  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
  sendPasswordResetEmail(user, resetUrl);
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = hashToken(input.token);
  const resetToken = await PasswordResetToken.findOne({ tokenHash });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
    throw new BadRequestError("Token inválido o expirado");
  }

  const user = await User.findById(resetToken.user);
  if (!user) {
    throw new BadRequestError("Token inválido o expirado");
  }

  user.password = input.newPassword;
  await user.save();

  resetToken.usedAt = new Date();
  await resetToken.save();

  await revokeAllUserRefreshTokens(user._id.toString());
}

export async function acceptInvite(
  input: AcceptInviteInput,
): Promise<{ user: UserDocument } & TokenPair> {
  const tokenHash = hashToken(input.token);
  const invite = await AdminInvite.findOne({ tokenHash });

  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt.getTime() < Date.now()) {
    throw new BadRequestError("Invitación inválida o expirada");
  }

  let user = await User.findOne({ email: invite.email });
  if (user) {
    user.password = input.password;
    user.firstName = input.firstName;
    user.lastName = input.lastName;
    user.role = "admin";
    await user.save();
  } else {
    user = await User.create({
      email: invite.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      role: "admin",
    });
  }

  invite.acceptedAt = new Date();
  await invite.save();

  sendAdminPromotedEmail(user);

  const tokens = await issueTokenPair(user);
  return { user, ...tokens };
}
