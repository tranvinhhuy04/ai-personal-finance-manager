import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
  LayoutDashboard, LineChart, ArrowRightLeft, FileText,
  Layers, ShieldCheck, MessageSquare, Settings, HelpCircle, LogOut, Search, Sparkles, PiggyBank
} from 'lucide-react';
import { Wallet as WalletIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UpgradeProModal } from './UpgradeProModal';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
  badge?: number;
  isActive?: boolean;
  onClick?: () => void;
}

const NavItem = ({ icon: Icon, label, to, badge, isActive, onClick }: NavItemProps) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'group flex w-full items-center justify-between rounded-xl px-4 py-3 transition-all duration-200',
        isActive
          ? 'border border-gray-700 bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] dark:border-emerald-800/60 dark:from-emerald-700 dark:via-emerald-800 dark:to-slate-950'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('w-5 h-5', isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600 dark:text-slate-400 dark:group-hover:text-slate-200')} />
        <span className="font-medium text-sm">{label}</span>
      </div>
      {badge !== undefined && (
        <span
          className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full',
            isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
};

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const logout = useAuthStore((state) => state.logout);
  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <>
      <aside 
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col overflow-y-auto border-r border-gray-100 bg-white transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 shadow-lg shadow-emerald-900/40 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="white" />
              <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="white" fillOpacity="0.5" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Fintech</span>
        </div>

        {/* Search */}
        <div className="px-6 mb-6">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-10 text-sm transition-all focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
            <div className="absolute right-3 flex items-center gap-1">
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-sans font-medium text-gray-400 bg-white border border-gray-200 rounded-md">⌘</kbd>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-sans font-medium text-gray-400 bg-white border border-gray-200 rounded-md">K</kbd>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 space-y-8">
          <div>
            <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Menu Chính</h3>
            <div className="space-y-1">
              <NavItem icon={LayoutDashboard} label="Bảng điều khiển" to="/" isActive={location.pathname === '/'} onClick={onClose} />
              <NavItem icon={WalletIcon} label="Ví của tôi" to="/wallets" isActive={location.pathname === '/wallets'} onClick={onClose} />
              <NavItem icon={PiggyBank} label="Tiền gửi/Đầu tư" to="/savings" isActive={location.pathname === '/savings'} onClick={onClose} />
              <NavItem icon={LineChart} label="Phân tích" to="/analytics" badge={20} isActive={location.pathname === '/analytics'} onClick={onClose} />
              <NavItem icon={ArrowRightLeft} label="Giao dịch" to="/transactions" isActive={location.pathname === '/transactions'} onClick={onClose} />
              <NavItem icon={FileText} label="Hóa đơn" to="/invoices" isActive={location.pathname === '/invoices'} onClick={onClose} />
              <NavItem icon={Sparkles} label="Trợ lý AI thông minh" to="/ai-assistant" badge={1} isActive={location.pathname === '/ai-assistant'} onClick={onClose} />
            </div>
          </div>

          <div>
            <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tính năng</h3>
            <div className="space-y-1">
              <NavItem icon={Layers} label="Định kỳ" to="/recurring" badge={16} isActive={location.pathname === '/recurring'} onClick={onClose} />
              <NavItem icon={ShieldCheck} label="Đăng ký" to="/subscriptions" isActive={location.pathname === '/subscriptions'} onClick={onClose} />
              <NavItem icon={MessageSquare} label="Phản hồi" to="/feedback" isActive={location.pathname === '/feedback'} onClick={onClose} />
            </div>
          </div>

          <div>
            <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Chung</h3>
            <div className="space-y-1">
              <NavItem icon={Settings} label="Cài đặt" to="/settings" isActive={location.pathname === '/settings'} onClick={onClose} />
              <NavItem icon={HelpCircle} label="Trợ giúp" to="/help" isActive={location.pathname === '/help'} onClick={onClose} />
            </div>
          </div>
        </div>

        {/* Upgrade & Logout */}
        <div className="p-4 mt-auto space-y-2">
          <button 
            onClick={() => setIsUpgradeModalOpen(true)}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 shadow-lg shadow-emerald-900/40 text-white rounded-xl hover:brightness-110 transition-all duration-200 font-medium text-sm"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>Nâng cấp Pro</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-sm">Đăng xuất</span>
          </button>
        </div>
      </aside>

      <UpgradeProModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
      />
    </>
  );
};
