import { Request, Response } from 'express';
import { login, register } from '../../services/authService';

export async function registerHandler(req: Request, res: Response) {
  const { email, password, fullName, phone } = req.body ?? {};
  try {
    const result = await register({ email, password, fullName, phone });
    return res.status(201).json(result);
  } catch (err: any) {
    const code = err?.code;
    if (code === 'EMAIL_EXISTS') return res.status(409).json({ message: 'Email already exists' });
    if (code === 'VALIDATION_ERROR') return res.status(400).json({ message: err?.message ?? 'Invalid input' });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function loginHandler(req: Request, res: Response) {
  const { email, password, twoFactorCode } = req.body ?? {};
  try {
    const result = await login({ email, password, twoFactorCode });
    return res.status(200).json(result);
  } catch (err: any) {
    const code = err?.code;
    if (code === 'VALIDATION_ERROR') return res.status(400).json({ message: err?.message ?? 'Invalid input' });
    if (code === 'UNAUTHORIZED') return res.status(401).json({ message: err?.message ?? 'Invalid credentials' });
    return res.status(500).json({ message: 'Internal server error' });
  }
}
