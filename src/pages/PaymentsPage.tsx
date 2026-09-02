import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Invoice } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/types';
import Modal from '@/components/Modal';
import { TextField } from '@/components/FormField';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { Wallet, Loader2, CheckCircle2, Clock, TrendingUp, AlertCircle } from 'lucide-react';

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from('invoices')
      .select('*, customer:customers(*)')
      .order('created_at', { ascending: false });
    if (err) {
      setError(true);
    } else {
      setInvoices((data as Invoice[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openPay = (inv: Invoice) => {
    setPayInvoice(inv);
    setPayAmount(String(Number(inv.balance_due)));
    setSaveError(null);
    setPayOpen(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoice) return;
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) return;
    setSaving(true);
    setSaveError(null);
    const newPaid = Number(payInvoice.amount_paid) + amount;
    const newBalance = Number(payInvoice.total) - newPaid;
    const newStatus = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
    const { error: err } = await supabase
      .from('invoices')
      .update({ amount_paid: newPaid, balance_due: Math.max(0, newBalance), status: newStatus })
      .eq('id', payInvoice.id);
    setSaving(false);
    if (err) {
      setSaveError(err.message);
      return;
    }
    setPayOpen(false);
    setPayInvoice(null);
    load();
  };

  const totalReceived = invoices.reduce((s, i) => s + Number(i.amount_paid), 0);
  const totalPending = invoices.reduce((s, i) => s + Number(i.balance_due), 0);
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total), 0);

  const filtered = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter);

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-emerald-50 text-emerald-600',
      partial: 'bg-amber-50 text-amber-600',
      pending: 'bg-slate-100 text-slate-500',
    };
    return styles[status] ?? styles.pending;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Payments</h1>
        <p className="text-sm text-slate-400 mt-1">Track received and pending payments</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-xl border border-slate-200/60 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 mb-2">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
          <p className="text-xs text-slate-400 font-medium">Total Invoiced</p>
          <p className="text-base md:text-lg font-bold text-slate-800 mt-0.5 truncate">{formatCurrency(totalInvoiced)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/60 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 mb-2">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
          <p className="text-xs text-slate-400 font-medium">Received</p>
          <p className="text-base md:text-lg font-bold text-emerald-600 mt-0.5 truncate">{formatCurrency(totalReceived)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/60 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 mb-2">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <p className="text-xs text-slate-400 font-medium">Pending</p>
          <p className="text-base md:text-lg font-bold text-amber-600 mt-0.5 truncate">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white rounded-lg border border-slate-200/60 p-1 w-fit overflow-x-auto">
        {(['all', 'pending', 'partial', 'paid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap min-h-[36px] ${
              filter === f ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Failed to load payments" onRetry={load} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
            <Wallet className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">No {filter !== 'all' ? filter + ' ' : ''}payments</p>
          <p className="text-xs text-slate-400">Create invoices to start tracking payments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl border border-slate-200/60 p-4 hover:shadow-sm active:scale-[0.99] transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-800">{inv.invoice_number}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge(inv.status)}`}>
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {inv.customer?.name ?? 'No customer'} · {formatDate(inv.issue_date)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(Number(inv.total))}</p>
                  {Number(inv.balance_due) > 0 ? (
                    <p className="text-xs text-amber-600 mt-0.5">Due {formatCurrency(Number(inv.balance_due))}</p>
                  ) : (
                    <p className="text-xs text-emerald-600 mt-0.5">Fully paid</p>
                  )}
                </div>
              </div>
              {Number(inv.balance_due) > 0 && (
                <button
                  onClick={() => openPay(inv)}
                  className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-teal-50 text-teal-700 py-2.5 text-sm font-medium hover:bg-teal-100 active:bg-teal-200 transition-colors min-h-[44px]"
                >
                  <Wallet className="h-4 w-4" />
                  Record Payment
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record Payment" maxWidth="max-w-sm">
        <form onSubmit={handlePayment} className="space-y-4">
          {saveError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {saveError}
            </div>
          )}
          {payInvoice && (
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Invoice</span>
                <span className="font-medium text-slate-700">{payInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Customer</span>
                <span className="font-medium text-slate-700">{payInvoice.customer?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Balance Due</span>
                <span className="font-semibold text-amber-600">{formatCurrency(Number(payInvoice.balance_due))}</span>
              </div>
            </div>
          )}
          <TextField
            label="Payment Amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setPayOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px]">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors disabled:opacity-60 min-h-[44px]">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
