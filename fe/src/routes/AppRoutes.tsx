import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ProtectedRoute } from './ProtectedRoute';
import { Auth } from '@/pages/Auth';
import { Dashboard } from '@/pages/Dashboard';
import { Profile } from '@/pages/Profile';
import { Wallets } from '@/pages/Wallets';
import { SavingInvestment } from '@/pages/SavingInvestment';
import { Analytics } from '@/pages/Analytics';
import { Transactions } from '@/pages/Transactions';
import { Invoices } from '@/pages/Invoices';
import { Recurring } from '@/pages/Recurring';
import { Settings } from '@/pages/Settings';
import { SmartAIPage } from '@/pages/SmartAIPage';
import { Feedback } from '@/pages/Feedback';
import { Help } from '@/pages/Help';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/wallets" element={<Wallets />} />
                  <Route path="/savings" element={<SavingInvestment />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/recurring" element={<Recurring />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/ai-assistant" element={<SmartAIPage />} />
                  <Route path="/feedback" element={<Feedback />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ErrorBoundary>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
