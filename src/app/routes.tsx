import { createBrowserRouter, redirect } from 'react-router';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { BaristaDashboard } from './pages/barista/BaristaDashboard';
import { POSPage } from './pages/barista/POSPage';
import { AttendancePage } from './pages/barista/AttendancePage';
import { ReceiptPage } from './pages/barista/ReceiptPage';
import { PaycheckPage } from './pages/barista/PaycheckPage';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import { StockPage } from './pages/manager/StockPage';
import { PurchasePage } from './pages/manager/PurchasePage';
import { PayrollPage } from './pages/manager/PayrollPage';
import { OwnerDashboard } from './pages/owner/OwnerDashboard';
import { FinancialReportPage } from './pages/owner/FinancialReportPage';
import { useAuth } from './context/AuthContext';

function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'manager') return <ManagerDashboard />;
  if (user.role === 'owner') return <OwnerDashboard />;
  return <BaristaDashboard />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    loader: () => redirect('/login'),
  },
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/app',
    Component: Layout,
    children: [
      {
        index: true,
        loader: () => redirect('/app/dashboard'),
      },
      { path: 'dashboard', Component: DashboardPage },
      { path: 'pos', Component: POSPage },
      { path: 'attendance', Component: AttendancePage },
      { path: 'receipt', Component: ReceiptPage },
      { path: 'paycheck', Component: PaycheckPage },
      { path: 'stock', Component: StockPage },
      { path: 'purchase', Component: PurchasePage },
      { path: 'payroll', Component: PayrollPage },
      { path: 'reports', Component: FinancialReportPage },
    ],
  },
  {
    path: '*',
    loader: () => redirect('/login'),
  },
]);