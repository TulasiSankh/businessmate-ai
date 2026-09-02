import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import Layout, { type PageKey } from '@/components/Layout';
import AuthPage from '@/pages/AuthPage';
import DashboardPage from '@/pages/DashboardPage';
import CustomersPage from '@/pages/CustomersPage';
import ProductsPage from '@/pages/ProductsPage';
import InvoicesPage from '@/pages/InvoicesPage';
import PaymentsPage from '@/pages/PaymentsPage';
import ExpensesPage from '@/pages/ExpensesPage';
import ReportsPage from '@/pages/ReportsPage';

function AppContent() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<PageKey>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <Layout current={page} onNavigate={setPage}>
      {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
      {page === 'customers' && <CustomersPage />}
      {page === 'products' && <ProductsPage />}
      {page === 'invoices' && <InvoicesPage />}
      {page === 'payments' && <PaymentsPage />}
      {page === 'expenses' && <ExpensesPage />}
      {page === 'reports' && <ReportsPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
