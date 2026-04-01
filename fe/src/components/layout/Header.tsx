import { useState } from 'react';
import { ArrowLeft, ArrowRight, HelpCircle, Mail, Share2, ChevronRight, Menu, UserCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { NotificationBell } from './NotificationBell';
import { UserMenuDropdown } from './UserMenuDropdown';
import { ShareModal } from './ShareModal';
import { useAuthStore } from '@/store/useAuthStore';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="h-20 px-4 md:px-8 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10"
    >
      {/* Breadcrumbs & Mobile Menu */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-1">
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm">
          <span className="text-gray-500 font-medium">OripioFin</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-semibold">Bảng điều khiển</span>
        </div>
      </div>

      {/* Actions & Profile */}
      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1 md:gap-2">
          <button className="hidden sm:block p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all border border-gray-200 bg-white">
            <HelpCircle className="w-4 h-4" />
          </button>
          <button className="hidden sm:block p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all border border-gray-200 bg-white">
            <Mail className="w-4 h-4" />
          </button>
          <NotificationBell />
        </div>

        <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>

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
                  className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-100 border-2 border-white shadow-sm flex items-center justify-center text-emerald-700 font-semibold text-sm select-none">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <UserCircle className="w-5 h-5" />}
                </div>
              )}
              <div className="flex flex-col items-start hidden sm:flex">
                <ChevronRight className="w-3 h-3 text-gray-400 rotate-90" />
                <ChevronRight className="w-3 h-3 text-gray-400 -rotate-90 -mt-1" />
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
