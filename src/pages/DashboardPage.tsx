import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/types';
import type { Invoice, Expense } from '@/lib/types';
import { TrendingUp, TrendingDown, Wallet, DollarSign, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import type { PageKey } from '@/components/Layout';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';

interface Stats {
  totalSales: number;
  totalExpenses: number;
  pendingPayments: number;
  profit: number;
  invoiceCount: number;
  recentInvoices: Invoice[];
  recentExpenses: Expense[];
}

export default function DashboardPage({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data: invoices, error: invErr } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    const { data: expenses, error: expErr } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });

    if (invErr || expErr) {
      setError(true);
      setLoading(false);
      return;
    }

    const inv: Invoice[] = invoices ?? [];
    const exp: Expense[] = expenses ?? [];

    const totalSales = inv.reduce((s, i) => s + Number(i.total), 0);
    const totalExpenses = exp.reduce((s, e) => s + Number(e.amount), 0);
    const pendingPayments = inv
      .filter((i) => i.status !== 'paid')
      .reduce((s, i) => s + Number(i.balance_due), 0);
    const profit = totalSales - totalExpenses;

    setStats({
      totalSales,
      totalExpenses,
      pendingPayments,
      profit,
      invoiceCount: inv.length,
      recentInvoices: inv.slice(0, 5),
      recentExpenses: exp.slice(0, 5),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error) return <ErrorState message="Failed to load dashboard data" onRetry={load} />;

  const cards = [
    {
      label: 'Total Sales',
      value: formatCurrency(stats?.totalSales ?? 0),
      icon: DollarSign,
      gradient: 'from-teal-500 to-emerald-600',
      trend: 'up',
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(stats?.totalExpenses ?? 0),
      icon: TrendingDown,
      gradient: 'from-rose-500 to-red-600',
      trend: 'down',
    },
    {
      label: 'Pending Payments',
      value: formatCurrency(stats?.pendingPayments ?? 0),
      icon: Clock,
      gradient: 'from-amber-500 to-orange-600',
      trend: 'neutral',
    },
    {
      label: 'Net Profit',
      value: formatCurrency(stats?.profit ?? 0),
      icon: TrendingUp,
      gradient: 'from-sky-500 to-blue-600',
      trend: stats && stats.profit >= 0 ? 'up' : 'down',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Your business at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-slate-200/60 p-4 md:p-5 hover:shadow-md transition-shadow active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.gradient} shadow-sm`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                {card.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
                {card.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-rose-500" />}
              </div>
              <p className="text-xs text-slate-400 font-medium">{card.label}</p>
              <p className="text-lg md:text-xl font-bold text-slate-800 mt-1 truncate">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent invoices */}
        <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Recent Invoices</h2>
            <button onClick={() => onNavigate('invoices')} className="text-xs font-medium text-teal-600 hover:text-teal-700 active:text-teal-800">
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {stats?.recentInvoices.length === 0 && (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">No invoices yet</p>
            )}
            {stats?.recentInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 active:bg-slate-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{inv.invoice_number}</p>
                  <p className="text-xs text-slate-400">{formatDate(inv.issue_date)}</p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-sm font-semibold text-slate-700">{formatCurrency(Number(inv.total))}</p>
                  <span
                    className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                      inv.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-600'
                        : inv.status === 'partial'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent expenses */}
        <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Recent Expenses</h2>
            <button onClick={() => onNavigate('expenses')} className="text-xs font-medium text-teal-600 hover:text-teal-700 active:text-teal-800">
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {stats?.recentExpenses.length === 0 && (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">No expenses yet</p>
            )}
            {stats?.recentExpenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 active:bg-slate-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{exp.category}</p>
                  <p className="text-xs text-slate-400 truncate">{exp.description || formatDate(exp.expense_date)}</p>
                </div>
                <p className="text-sm font-semibold text-rose-600 ml-3">-{formatCurrency(Number(exp.amount))}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'New Invoice', page: 'invoices' as PageKey, icon: Wallet },
          { label: 'Add Customer', page: 'customers' as PageKey, icon: DollarSign },
          { label: 'Add Product', page: 'products' as PageKey, icon: TrendingUp },
          { label: 'Add Expense', page: 'expenses' as PageKey, icon: TrendingDown },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => onNavigate(action.page)}
              className="flex flex-col items-center gap-2 bg-white rounded-xl border border-slate-200/60 p-4 hover:border-teal-300 hover:shadow-sm active:scale-[0.97] transition-all group min-h-[44px]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-slate-600">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
