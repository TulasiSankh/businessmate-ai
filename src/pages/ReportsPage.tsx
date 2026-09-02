import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Invoice, Expense } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/types';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Loader2, Receipt, FileText } from 'lucide-react';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';

type Period = 'month' | 'quarter' | 'year' | 'all';

export default function ReportsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<Period>('month');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [{ data: inv, error: invErr }, { data: exp, error: expErr }] = await Promise.all([
      supabase.from('invoices').select('*').order('issue_date', { ascending: false }),
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
    ]);
    if (invErr || expErr) {
      setError(true);
      setLoading(false);
      return;
    }
    setInvoices((inv as Invoice[]) ?? []);
    setExpenses((exp as Expense[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const periodStart = (() => {
    const now = new Date();
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === 'quarter') return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    if (period === 'year') return new Date(now.getFullYear(), 0, 1);
    return new Date(2000, 0, 1);
  })();

  const filteredInvoices = invoices.filter((i) => new Date(i.issue_date) >= periodStart);
  const filteredExpenses = expenses.filter((e) => new Date(e.expense_date) >= periodStart);

  const totalSales = filteredInvoices.reduce((s, i) => s + Number(i.total), 0);
  const totalGst = filteredInvoices.reduce((s, i) => s + Number(i.gst_total), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalReceived = filteredInvoices.reduce((s, i) => s + Number(i.amount_paid), 0);
  const totalPending = filteredInvoices.reduce((s, i) => s + Number(i.balance_due), 0);
  const profit = totalSales - totalExpenses;

  // Monthly breakdown for chart
  const monthlyData = (() => {
    const months: Record<string, { sales: number; expenses: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-IN', { month: 'short' });
      months[key] = { sales: 0, expenses: 0 };
    }
    invoices.forEach((inv) => {
      const d = new Date(inv.issue_date);
      const key = d.toLocaleDateString('en-IN', { month: 'short' });
      if (months[key]) months[key].sales += Number(inv.total);
    });
    expenses.forEach((exp) => {
      const d = new Date(exp.expense_date);
      const key = d.toLocaleDateString('en-IN', { month: 'short' });
      if (months[key]) months[key].expenses += Number(exp.amount);
    });
    return Object.entries(months);
  })();

  const maxVal = Math.max(...monthlyData.flatMap(([, v]) => [v.sales, v.expenses]), 1);

  // Top customers by revenue
  const topCustomers = (() => {
    const map: Record<string, number> = {};
    invoices.forEach((inv) => {
      const name = inv.customer?.name ?? 'Unknown';
      map[name] = (map[name] ?? 0) + Number(inv.total);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();

  // Expense breakdown
  const expenseBreakdown = (() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + Number(e.amount);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  })();

  if (loading) return <LoadingState label="Loading reports..." />;
  if (error) return <ErrorState message="Failed to load report data" onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-sm text-slate-400 mt-1">Sales and expense insights</p>
        </div>
        <div className="flex gap-1 bg-white rounded-lg border border-slate-200/60 p-1 overflow-x-auto">
          {(['month', 'quarter', 'year', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap min-h-[36px] ${
                period === p ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p === 'all' ? 'All Time' : p === 'quarter' ? 'Quarter' : p === 'year' ? 'Year' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Sales', value: totalSales, icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Expenses', value: totalExpenses, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Profit', value: profit, icon: TrendingUp, color: profit >= 0 ? 'text-emerald-600' : 'text-red-600', bg: profit >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
          { label: 'Received', value: totalReceived, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200/60 p-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg} ${card.color} mb-2`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <p className="text-xs text-slate-400 font-medium">{card.label}</p>
              <p className="text-base md:text-lg font-bold text-slate-800 mt-0.5 truncate">{formatCurrency(card.value)}</p>
            </div>
          );
        })}
      </div>

      {/* 6-month chart */}
      <div className="bg-white rounded-xl border border-slate-200/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Last 6 Months</h2>
        </div>
        <div className="flex items-end justify-between gap-2 h-40 md:h-48">
          {monthlyData.map(([month, val]) => (
            <div key={month} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="flex items-end gap-1 flex-1 w-full justify-center">
                <div
                  className="w-3 md:w-4 rounded-t bg-gradient-to-t from-teal-500 to-emerald-400 transition-all hover:opacity-80"
                  style={{ height: `${(val.sales / maxVal) * 100}%`, minHeight: val.sales > 0 ? '4px' : '0' }}
                  title={`Sales: ${formatCurrency(val.sales)}`}
                />
                <div
                  className="w-3 md:w-4 rounded-t bg-gradient-to-t from-rose-500 to-red-400 transition-all hover:opacity-80"
                  style={{ height: `${(val.expenses / maxVal) * 100}%`, minHeight: val.expenses > 0 ? '4px' : '0' }}
                  title={`Expenses: ${formatCurrency(val.expenses)}`}
                />
              </div>
              <span className="text-[10px] text-slate-400 font-medium">{month}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gradient-to-t from-teal-500 to-emerald-400" />
            <span className="text-xs text-slate-500">Sales</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gradient-to-t from-rose-500 to-red-400" />
            <span className="text-xs text-slate-500">Expenses</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* Top customers */}
        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Customers by Revenue</h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map(([name, amt], idx) => {
                const maxAmt = topCustomers[0][1];
                const pct = (amt / maxAmt) * 100;
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{idx + 1}</span>
                        {name}
                      </span>
                      <span className="font-medium text-slate-700">{formatCurrency(amt)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden ml-7">
                      <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expense breakdown */}
        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Expense Breakdown</h2>
          {expenseBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No expenses recorded</p>
          ) : (
            <div className="space-y-3">
              {expenseBreakdown.map(([cat, amt]) => {
                const maxAmt = expenseBreakdown[0][1];
                const pct = (amt / maxAmt) * 100;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 text-slate-600">
                        <Receipt className="h-3.5 w-3.5 text-slate-400" />
                        {cat}
                      </span>
                      <span className="font-medium text-rose-600">{formatCurrency(amt)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden ml-5">
                      <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-red-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent invoices list */}
      <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Recent Invoices</h2>
        </div>
        {filteredInvoices.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">No invoices in this period</p>
        ) : (
          <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
            {filteredInvoices.slice(0, 10).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{inv.invoice_number}</p>
                  <p className="text-xs text-slate-400">{formatDate(inv.issue_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700">{formatCurrency(Number(inv.total))}</p>
                  <span className={`text-[10px] font-medium ${
                    inv.status === 'paid' ? 'text-emerald-600' : inv.status === 'partial' ? 'text-amber-600' : 'text-slate-400'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
