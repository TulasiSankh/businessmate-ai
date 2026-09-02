import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Expense } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/types';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TextField, SelectField, TextAreaField } from '@/components/FormField';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { Plus, Pencil, Trash2, Receipt, Loader2, AlertCircle } from 'lucide-react';

interface FormState {
  category: string;
  description: string;
  amount: string;
  expense_date: string;
}

const emptyForm: FormState = {
  category: 'General',
  description: '',
  amount: '',
  expense_date: new Date().toISOString().slice(0, 10),
};

const CATEGORIES = ['General', 'Rent', 'Utilities', 'Salaries', 'Marketing', 'Supplies', 'Travel', 'Equipment', 'Software', 'Other'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
    if (err) {
      setError(true);
    } else {
      setExpenses((data as Expense[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      category: e.category,
      description: e.description ?? '',
      amount: String(e.amount),
      expense_date: e.expense_date,
    });
    setSaveError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      category: form.category,
      description: form.description,
      amount: parseFloat(form.amount) || 0,
      expense_date: form.expense_date,
    };
    const { error: err } = editing
      ? await supabase.from('expenses').update(payload).eq('id', editing.id)
      : await supabase.from('expenses').insert(payload);
    setSaving(false);
    if (err) {
      setSaveError(err.message);
      return;
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('expenses').delete().eq('id', deleteId);
    setDeleteId(null);
    load();
  };

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  // Group by category
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});
  const categoryList = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>
          <p className="text-sm text-slate-400 mt-1">{expenses.length} expenses · {formatCurrency(total)} total</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md active:scale-[0.98] transition-all min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      {/* Category breakdown */}
      {categoryList.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">By Category</h2>
          <div className="space-y-2.5">
            {categoryList.map(([cat, amt]) => {
              const pct = total > 0 ? (amt / total) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">{cat}</span>
                    <span className="text-slate-700 font-medium">{formatCurrency(amt)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-400 to-red-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Failed to load expenses" onRetry={load} />
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
            <Receipt className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">No expenses yet</p>
          <p className="text-xs text-slate-400">Add your first expense to start tracking</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid gap-3 sm:hidden">
            {expenses.map((e) => (
              <div key={e.id} className="bg-white rounded-xl border border-slate-200/60 p-4 active:scale-[0.99] transition-transform">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{e.category}</p>
                    <p className="text-xs text-slate-400">{formatDate(e.expense_date)}</p>
                  </div>
                  <p className="text-sm font-bold text-rose-600">-{formatCurrency(Number(e.amount))}</p>
                </div>
                {e.description && <p className="text-xs text-slate-500 mt-1">{e.description}</p>}
                <div className="flex gap-1 mt-2">
                  <button onClick={() => openEdit(e)} className="p-2 rounded-lg text-slate-400 hover:bg-teal-50 hover:text-teal-600 active:bg-teal-100 transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteId(e.id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 active:bg-red-100 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-xl border border-slate-200/60 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-slate-700">{e.category}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{e.description || '—'}</td>
                    <td className="px-5 py-3 text-sm text-slate-400">{formatDate(e.expense_date)}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-rose-600">-{formatCurrency(Number(e.amount))}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(e)} className="p-2 rounded-lg text-slate-400 hover:bg-teal-50 hover:text-teal-600 active:bg-teal-100 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteId(e.id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 active:bg-red-100 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Expense' : 'Add Expense'}>
        <form onSubmit={handleSave} className="space-y-4">
          {saveError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {saveError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </SelectField>
            <TextField label="Amount (₹)" type="number" step="0.01" min="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
          </div>
          <TextField label="Date" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required />
          <TextAreaField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was this expense for?" />
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px]">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors disabled:opacity-60 min-h-[44px]">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
