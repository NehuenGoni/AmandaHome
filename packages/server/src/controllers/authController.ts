import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as authService from "../services/authService.js";
import { UnauthorizedError } from "../utils/AppError.js";
import { REFRESH_TOKEN_COOKIE, clearRefreshTokenCookie, setRefreshTokenCookie } from "../utils/cookies.js";
import type {
  AcceptInviteInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "../validators/authValidators.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as RegisterInput;
  const { user, accessToken, refreshToken } = await authService.register(input);
  setRefreshTokenCookie(res, refreshToken);
  res.status(201).json({ user, accessToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as LoginInput;
  const { user, accessToken, refreshToken } = await authService.login(input);
  setRefreshTokenCookie(res, refreshToken);
  res.json({ user, accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
  if (!rawRefreshToken) {
    throw new UnauthorizedError("Falta el refresh token");
  }
  const { accessToken, refreshToken } = await authService.refresh(rawRefreshToken);
  setRefreshTokenCookie(res, refreshToken);
  res.json({ accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
  await authService.logout(rawRefreshToken);
  clearRefreshTokenCookie(res);
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  res.json({ user });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as ForgotPasswordInput;
  await authService.forgotPassword(input);
  res.json({ message: "Si el email existe, vas a recibir instrucciones para restablecer tu contraseña" });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as ResetPasswordInput;
  await authService.resetPassword(input);
  res.json({ message: "Contraseña actualizada correctamente" });
});

export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as AcceptInviteInput;
  const { user, accessToken, refreshToken } = await authService.acceptInvite(input);
  setRefreshTokenCookie(res, refreshToken);
  res.status(201).json({ user, accessToken });
});
