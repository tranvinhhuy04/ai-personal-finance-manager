import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// Đăng ký
export const register = async (req: Request, res: Response) => {
  const { email, password, full_name, phone } = req.body;
  // 1. Tạo user qua Supabase Auth
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (error || !data.user) return res.status(400).json({ error: error?.message });

  // 2. Thêm record vào bảng Users
  const { error: userErr } = await supabase
    .from('Users')
    .insert([{ user_id: data.user.id, email, full_name, phone }]);
  if (userErr) return res.status(500).json({ error: userErr.message });

  // 3. Thêm record vào UserSettings
  const { error: settingErr } = await supabase
    .from('UserSettings')
    .insert([{ user_id: data.user.id }]);
  if (settingErr) return res.status(500).json({ error: settingErr.message });

  return res.status(201).json({ message: 'User registered successfully' });
};

// Đăng nhập
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) return res.status(401).json({ error: error?.message });

  return res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: data.user
  });
};

// Lấy profile user hiện tại
export const profile = async (req: Request, res: Response) => {
  // Lấy user id từ middleware đã xác thực JWT
  const userId = (req as any).user?.sub;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase
    .from('Users')
    .select('user_id, email, full_name, phone, status, created_at, updated_at')
    .eq('user_id', userId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'User not found' });
  return res.json(data);
};
