import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Giả lập đăng nhập thành công và chuyển hướng
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0a0f16] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-600/20 rounded-full blur-[120px]"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-900/50 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">OripioFin</h1>
          <p className="text-gray-400 mt-2">Quản lý tài chính thông minh</p>
        </div>

        <div className="relative h-[480px] perspective-1000">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, rotateY: isLogin ? -90 : 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: isLogin ? 90 : -90 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="absolute inset-0 bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4 flex-1">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Họ và tên</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type="text" placeholder="Nguyễn Văn A" className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all" required={!isLogin} />
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="email" placeholder="email@example.com" className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Mật khẩu</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="password" placeholder="••••••••" className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all" required />
                  </div>
                </div>

                {isLogin && (
                  <div className="flex justify-end">
                    <a href="#" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">Quên mật khẩu?</a>
                  </div>
                )}

                <button type="submit" className="w-full py-3 px-4 mt-6 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/50 transition-all flex items-center justify-center gap-2 group">
                  {isLogin ? 'Đăng nhập' : 'Đăng ký'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-400">
                  {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                  <button 
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="ml-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
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
