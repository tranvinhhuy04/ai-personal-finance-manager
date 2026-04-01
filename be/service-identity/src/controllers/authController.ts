import { Request, Response } from 'express';
import {
  get2FAStatus,
  getMe,
  login,
  loginWith2FA,
  logout,
  refreshTokens,
  register,
  setup2FA,
  verify2FA,
} from '../../services/authService';
import { catchAsync } from '../middlewares/catchAsync';

export const registerHandler = catchAsync(async (req: Request, res: Response) => {
  const { email, password, fullName, phone } = req.body ?? {};
  const result = await register({ email, password, fullName, phone });
  return res.status(201).json(result);
});

export const loginHandler = catchAsync(async (req: Request, res: Response) => {
  try {
    const { email, password, twoFactorCode } = req.body ?? {};
    const result = await login({ email, password, twoFactorCode });
    return res.status(200).json(result);
  } catch (err: any) {
    if (err?.statusCode === 401) {
      return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });
    }
    throw err;
  }
});

export const login2FAHandler = catchAsync(async (req: Request, res: Response) => {
  const { twoFactorToken, code } = req.body ?? {};
  const result = await loginWith2FA({ twoFactorToken, code });
  return res.status(200).json(result);
});

export const refreshTokenHandler = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body ?? {};
  const result = await refreshTokens({ refreshToken });
  return res.status(200).json(result);
});

export const logoutHandler = catchAsync(async (_req: Request, res: Response) => {
  const result = await logout();
  return res.status(200).json(result);
});

export const getMeHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const result = await getMe(userId);
  return res.status(200).json(result);
});

export const setup2FAHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const result = await setup2FA(userId);
  return res.status(200).json(result);
});

export const verify2FAHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { code } = req.body ?? {};
  const result = await verify2FA(userId, code);
  return res.status(200).json(result);
});

export const get2FAStatusHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const result = await get2FAStatus(userId);
  return res.status(200).json(result);
});
