import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

// Derive auth base from the same VITE_API_URL used by apiClient, stripping trailing path
const _apiRoot = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const AUTH_API_BASE = _apiRoot.replace(/\/api\/v\d+$/, '') + '/api/v1/auth';

type ApiUser = {
  id?: string;
  _id?: string;
  userId?: string;
  email?: string;
  fullName?: string;
};

type AuthApiResponse = {
  accessToken?: string;
  token?: string;
  user?: ApiUser;
  message?: string;
};

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  function normalizeUser(user?: ApiUser) {
    if (!user) return null;
    return {
      id: user.id ?? user._id ?? user.userId ?? '',
      // Backend may return fullName; map to the 'name' field expected by the auth store
      name: user.fullName ?? user.email ?? 'Người dùng',
      email: user.email ?? '',
      avatar: undefined as string | undefined,
    };
  }

  function persistAuth(token: string, user: ApiUser | null) {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('token', token);
    if (user) {
      localStorage.setItem('authUser', JSON.stringify(user));
    }
  }

  const setLogin = useAuthStore((state) => state.setLogin);

  async function handleRealLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${AUTH_API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as AuthApiResponse;
      if (!response.ok) {
        throw new Error(data?.message || 'Sai email hoặc mật khẩu');
      }
      const token = data.accessToken ?? data.token;
      if (!token) {
        throw new Error('Đăng nhập thành công nhưng không nhận được token');
      }
      const mappedUser = normalizeUser(data.user);
      persistAuth(token, data.user ?? null);
      setLogin(mappedUser, token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Sai email hoặc mật khẩu');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRealRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // REAL API REGISTER: call identity-service via API Gateway
      const response = await fetch(`${AUTH_API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });

      const data = (await response.json()) as AuthApiResponse;
      if (!response.ok) {
        throw new Error(data?.message || 'Đăng ký thất bại');
      }

      // Sau khi đăng ký thành công, đưa user về form đăng nhập
      setIsLogin(true);
      setPassword('');
      setError('Đăng ký thành công. Vui lòng đăng nhập.');
    } catch (err: any) {
      setError(err?.message || 'Đăng ký thất bại');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f16] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-600/20 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-900/50 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Fintech</h1>
          <p className="text-gray-400 mt-2">Quản lý tài chính thông minh</p>
        </div>

        <div className="relative min-h-[560px] sm:min-h-[540px] perspective-1000">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, rotateY: isLogin ? -90 : 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: isLogin ? 90 : -90 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="absolute inset-0 bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
              </h2>

              <form onSubmit={isLogin ? handleRealLogin : handleRealRegister} className="space-y-4 flex-1">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Họ và tên</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        required={!isLogin}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Mật khẩu</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {error && (
                  <p className={`text-sm ${error.includes('thành công') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {error}
                  </p>
                )}

                {isLogin && (
                  <div className="flex justify-end">
                    <a href="#" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                      Quên mật khẩu?
                    </a>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 mt-4 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/50 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}
                  {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </button>


              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-400">
                  {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                  <button
                    type="button"
                    onClick={() => {
                      if (isLoading) return;
                      setIsLogin(!isLogin);
                      setError('');
                    }}
                    className="ml-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    disabled={isLoading}
                  >
                    {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                  </button>
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
