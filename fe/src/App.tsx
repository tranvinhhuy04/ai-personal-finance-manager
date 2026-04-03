/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Overview } from './components/dashboard/Overview';
import { MyWallet } from './components/dashboard/MyWallet';
import { CashFlow } from './components/dashboard/CashFlow';
import { useDashboardData } from './hooks/useDashboardData';
import { SmartAIPage } from './pages/SmartAIPage';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Invoices } from './pages/Invoices';
import { Recurring } from './pages/Recurring';
import { Subscriptions } from './pages/Subscriptions';
import { Settings } from './pages/Settings';
import { Feedback } from './pages/Feedback';
import { Help } from './pages/Help';
import { Auth } from './pages/Auth';
import { Profile } from './pages/Profile';
import { Wallets } from './pages/Wallets';
import { SavingInvestment } from './pages/SavingInvestment';

function DashboardHome() {
  const { data, isLoading } = useDashboardData();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] font-medium text-emerald-800 dark:bg-slate-950 dark:text-emerald-300">Đang tải dữ liệu...</div>;
  }

  return (
    <>
      <Overview data={data.overview} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <MyWallet data={data.wallet} />
        <CashFlow data={data.cashFlow} />
      </div>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/*" element={
            <DashboardLayout>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<DashboardHome />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/wallets" element={<Wallets />} />
                  <Route path="/savings" element={<SavingInvestment />} />
                  <Route path="/analytics" element={<Dashboard />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/recurring" element={<Recurring />} />
                  <Route path="/subscriptions" element={<Subscriptions />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/ai-assistant" element={<SmartAIPage />} />
                  <Route path="/feedback" element={<Feedback />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ErrorBoundary>
            </DashboardLayout>
          } />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
