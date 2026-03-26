import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AIChatbotPopover } from './AIChatbotPopover';
import { AnimatePresence, motion } from 'motion/react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-gray-900 flex">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
      
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-full">
        <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
      <AIChatbotPopover />
    </div>
  );
};
