import { useState } from 'react';
import { ArrowLeft, ArrowRight, HelpCircle, Mail, Moon, Share2, ChevronRight, Menu, SunMedium, UserCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { UserMenuDropdown } from './UserMenuDropdown';
import { ShareModal } from './ShareModal';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/contexts/theme-context';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-100/80 bg-white/80 px-4 backdrop-blur-md md:px-8 dark:border-slate-800 dark:bg-slate-950/90"
    >
      {/* Breadcrumbs & Mobile Menu */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 md:hidden dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-1">
          <button className="rounded-full p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button className="rounded-full p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100">
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-500 dark:text-slate-400">Fintech</span>
          <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <span className="font-semibold text-gray-900 dark:text-white">Bảng điều khiển</span>
        </div>
      </div>

      {/* Actions & Profile */}
      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1 md:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="hidden rounded-full border border-gray-200 bg-white p-2.5 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 sm:block dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}
          >
            {isDark ? <SunMedium className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => navigate('/help')}
            className="hidden rounded-full border border-gray-200 bg-white p-2.5 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 sm:block dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            title="Trợ giúp"
            aria-label="Trợ giúp"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/contact')}
            className="hidden rounded-full border border-gray-200 bg-white p-2.5 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 sm:block dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            title="Liên hệ / Tin nhắn"
            aria-label="Liên hệ"
          >
            <Mail className="w-4 h-4" />
          </button>
          <NotificationBell />
        </div>

        <div className="mx-1 hidden h-8 w-px bg-gray-200 sm:block dark:bg-slate-700"></div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative">
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="User avatar"
                  className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm dark:border-slate-900"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-9 w-9 select-none items-center justify-center rounded-full border-2 border-white bg-emerald-100 text-sm font-semibold text-emerald-700 shadow-sm dark:border-slate-900 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <UserCircle className="w-5 h-5" />}
                </div>
              )}
              <div className="flex flex-col items-start hidden sm:flex">
                <ChevronRight className="w-3 h-3 rotate-90 text-gray-400 dark:text-slate-400" />
                <ChevronRight className="-mt-1 w-3 h-3 -rotate-90 text-gray-400 dark:text-slate-400" />
              </div>
            </button>
            <UserMenuDropdown isOpen={isUserMenuOpen} onClose={() => setIsUserMenuOpen(false)} />
          </div>
          
          <button 
            onClick={() => setIsShareOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 hover:brightness-110 text-white px-4 py-2.5 rounded-full text-sm font-medium transition-all shadow-lg shadow-emerald-900/40"
          >
            <span>Chia sẻ</span>
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
    </motion.header>
  );
};
