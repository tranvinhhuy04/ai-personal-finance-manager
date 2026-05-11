import { Request, Response } from 'express';
import {
  addApiKey,
  appendUsageLog,
  get2FAStatus,
  getRuntimeAiConfig,
  getSettings,
  getMe,
  login,
  loginWith2FA,
  logout,
  markApiKeysExhausted,
  refreshTokens,
  register,
  removeApiKey,
  setup2FA,
  updateSettings,
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

export const getSettingsHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const result = await getSettings(userId);
  return res.status(200).json(result);
});

export const updateSettingsHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { gemini_api_key, selected_ai_model, ai_usage_logs } = req.body ?? {};
  const result = await updateSettings(userId, { gemini_api_key, selected_ai_model, ai_usage_logs });
  return res.status(200).json(result);
});

export const getRuntimeAiConfigHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const result = await getRuntimeAiConfig(userId);
  return res.status(200).json(result);
});

export const appendUsageLogHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { model, tokens_used, estimated_cost, date } = req.body ?? {};
  const result = await appendUsageLog(userId, { model, tokens_used, estimated_cost, date });
  return res.status(200).json(result);
});

// handlers cho API key pool
export const addApiKeyHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { gemini_api_key } = req.body ?? {};
  const result = await addApiKey(userId, gemini_api_key);
  return res.status(200).json(result);
});

export const removeApiKeyHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const index = Number(req.params.index);
  const result = await removeApiKey(userId, index);
  return res.status(200).json(result);
});

export const markApiKeysExhaustedHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { indices } = req.body ?? {};
  const result = await markApiKeysExhausted(userId, Array.isArray(indices) ? indices.map(Number) : []);
  return res.status(200).json(result);
});
