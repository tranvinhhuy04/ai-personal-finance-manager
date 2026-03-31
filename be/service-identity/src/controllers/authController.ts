import { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catchAsync';
import * as authService from '../../services/authService';

/**
 * Controllers are intentionally thin: validate nothing, do no business logic.
 * Each handler is wrapped in catchAsync so any AppError thrown by the service
 * is automatically forwarded to the global errorHandler via next(err).
 *
 * Result: every branch (success, validation, auth, DB) is guaranteed to send
 * exactly one response — no more hanging requests.
 */

export const registerHandler = catchAsync(async (req: Request, res: Response) => {
  const { email, password, fullName, phone } = req.body ?? {};
  const result = await authService.register({ email, password, fullName, phone });
  res.status(201).json(result);
});

export const loginHandler = catchAsync(async (req: Request, res: Response) => {
  const { email, password, twoFactorCode } = req.body ?? {};
  const result = await authService.login({ email, password, twoFactorCode });
  res.status(200).json(result);
});

export const loginWith2FAHandler = catchAsync(async (req: Request, res: Response) => {
  const { twoFactorToken, code } = req.body ?? {};
  const result = await authService.loginWith2FA({ twoFactorToken, code });
  res.status(200).json(result);
});

export const refreshTokensHandler = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body ?? {};
  const result = await authService.refreshTokens({ refreshToken });
  res.status(200).json(result);
});

export const logoutHandler = catchAsync(async (_req: Request, res: Response) => {
  const result = await authService.logout();
  res.status(200).json(result);
});

export const getMeHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const result = await authService.getMe(userId);
  res.status(200).json(result);
});

export const setup2FAHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const result = await authService.setup2FA(userId);
  res.status(200).json(result);
});

export const verify2FAHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { code } = req.body ?? {};
  const result = await authService.verify2FA(userId, code);
  res.status(200).json(result);
});

export const get2FAStatusHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const result = await authService.get2FAStatus(userId);
  res.status(200).json(result);
});
