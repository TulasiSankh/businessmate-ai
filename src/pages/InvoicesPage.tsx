import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Invoice, Customer, Product, InvoiceItem } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/types';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TextField, SelectField, TextAreaField } from '@/components/FormField';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { Plus, Trash2, FileText, Loader2, ArrowLeft, X, Search, Eye, AlertCircle } from 'lucide-react';

interface LineItemDraft {
  product_id: string;
  name: string;
  quantity: string;
  price: string;
  gst_rate: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItemDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const openCreate = async () => {
    const [{ data: cust }, { data: prod }] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase.from('products').select('*').order('name'),
    ]);
    setCustomers((cust as Customer[]) ?? []);
    setProducts((prod as Product[]) ?? []);
    setCustomerId('');
    setIssueDate(new Date().toISOString().slice(0, 10));
    setDueDate('');
    setNotes('');
    setItems([]);
    setSaveError(null);
    setCreateOpen(true);
  };

  const addLineItem = (p?: Product) => {
    if (p) {
      setItems([...items, {
        product_id: p.id,
        name: p.name,
        quantity: '1',
        price: String(p.price),
        gst_rate: String(p.gst_rate),
      }]);
    } else {
      setItems([...items, { product_id: '', name: '', quantity: '1', price: '0', gst_rate: '0' }]);
    }
  };

  const updateItem = (idx: number, field: keyof LineItemDraft, value: string) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const calcTotals = () => {
    let subtotal = 0;
    let gstTotal = 0;
    items.forEach((it) => {
      const qty = parseFloat(it.quantity) || 0;
      const price = parseFloat(it.price) || 0;
      const gst = parseFloat(it.gst_rate) || 0;
      const lineTotal = qty * price;
      subtotal += lineTotal;
      gstTotal += lineTotal * (gst / 100);
    });
    return { subtotal, gstTotal, total: subtotal + gstTotal };
  };

  const totals = calcTotals();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.length === 0) return;
    setSaving(true);
    setSaveError(null);

    // Generate invoice number
    const count = invoices.length + 1;
    const invoiceNumber = `INV-${String(count).padStart(4, '0')}`;

    const { data: invData, error: invError } = await supabase
      .from('invoices')
      .insert({
        customer_id: customerId,
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        due_date: dueDate || null,
        notes,
        subtotal: totals.subtotal,
        gst_total: totals.gstTotal,
        total: totals.total,
        amount_paid: 0,
        balance_due: totals.total,
        status: 'pending',
      })
      .select()
      .single();

    if (invError) {
      setSaveError(invError.message);
      setSaving(false);
      return;
    }

    if (invData) {
      const itemRows = items.map((it) => {
        const qty = parseFloat(it.quantity) || 0;
        const price = parseFloat(it.price) || 0;
        const gst = parseFloat(it.gst_rate) || 0;
        return {
          invoice_id: invData.id,
          product_id: it.product_id || null,
          name: it.name,
          quantity: qty,
          price,
          gst_rate: gst,
          line_total: qty * price,
        };
      });
      const { error: itemsError } = await supabase.from('invoice_items').insert(itemRows);
      if (itemsError) {
        setSaveError(itemsError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setCreateOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('invoices').delete().eq('id', deleteId);
    setDeleteId(null);
    load();
  };

  const filtered = invoices.filter(
    (i) =>
      i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (i.customer?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-emerald-50 text-emerald-600',
      partial: 'bg-amber-50 text-amber-600',
      pending: 'bg-slate-100 text-slate-500',
    };
    return styles[status] ?? styles.pending;
  };

  if (viewing) {
    return <InvoiceDetail invoice={viewing} onBack={() => setViewing(null)} onUpdated={load} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
          <p className="text-sm text-slate-400 mt-1">{invoices.length} total invoices</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md active:scale-[0.98] transition-all min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by invoice number or customer..."
          className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all min-h-[44px]"
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Failed to load invoices" onRetry={load} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
            <FileText className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">
            {search ? 'No matching invoices' : 'No invoices yet'}
          </p>
          <p className="text-xs text-slate-400">
            {search ? 'Try a different search' : 'Create your first invoice to get started'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid gap-3 sm:hidden">
            {filtered.map((inv) => (
              <div key={inv.id} className="bg-white rounded-xl border border-slate-200/60 p-4 active:scale-[0.99] transition-transform">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{inv.invoice_number}</p>
                    <p className="text-xs text-slate-400">{inv.customer?.name ?? 'No customer'}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge(inv.status)}`}>
                    {inv.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(Number(inv.total))}</p>
                  <div className="flex gap-1">
                    <button onClick={() => setViewing(inv)} className="p-2 rounded-lg text-slate-400 hover:bg-teal-50 hover:text-teal-600 active:bg-teal-100 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteId(inv.id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 active:bg-red-100 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-xl border border-slate-200/60 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-slate-700">{inv.invoice_number}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{inv.customer?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-slate-400">{formatDate(inv.issue_date)}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-700">{formatCurrency(Number(inv.total))}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewing(inv)} className="p-2 rounded-lg text-slate-400 hover:bg-teal-50 hover:text-teal-600 active:bg-teal-100 transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteId(inv.id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 active:bg-red-100 transition-colors">
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

      {/* Create invoice modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Invoice" maxWidth="max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-4">
          {saveError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {saveError}
            </div>
          )}
          {customers.length === 0 ? (
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
              You need to add at least one customer before creating an invoice.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </SelectField>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Issue Date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
                  <TextField label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-600">Line Items</label>
                  <button type="button" onClick={() => addLineItem()} className="text-xs font-medium text-teal-600 hover:text-teal-700 active:text-teal-800 min-h-[36px] px-2">
                    + Add item
                  </button>
                </div>

                {products.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addLineItem(p)}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-600 active:bg-teal-100 transition-colors min-h-[36px]"
                      >
                        + {p.name} ({formatCurrency(Number(p.price))})
                      </button>
                    ))}
                  </div>
                )}

                {items.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                    No items added yet. Click a product above or "Add item".
                  </p>
                )}

                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
                    <div className="col-span-12 sm:col-span-5">
                      <input
                        placeholder="Item name"
                        value={it.name}
                        onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none min-h-[44px]"
                        required
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none min-h-[44px]"
                        required
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        value={it.price}
                        onChange={(e) => updateItem(idx, 'price', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none min-h-[44px]"
                        required
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <select
                        value={it.gst_rate}
                        onChange={(e) => updateItem(idx, 'gst_rate', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none min-h-[44px]"
                      >
                        {['0', '5', '12', '18', '28'].map((r) => (
                          <option key={r} value={r}>{r}%</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-2.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 active:bg-red-100 transition-colors min-h-[44px]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Subtotal</span>
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>GST</span>
                      <span>{formatCurrency(totals.gstTotal)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-slate-800 pt-1">
                      <span>Total</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                )}
              </div>

              <TextAreaField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Invoice notes (optional)" />

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px]">
                  Cancel
                </button>
                <button type="submit" disabled={saving || items.length === 0} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors disabled:opacity-60 min-h-[44px]">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Invoice
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function InvoiceDetail({ invoice, onBack, onUpdated }: { invoice: Invoice; onBack: () => void; onUpdated: () => void }) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id);
      if (err) {
        setError(true);
      } else {
        setItems((data as InvoiceItem[]) ?? []);
      }
      setLoading(false);
    })();
  }, [invoice.id]);

  const balance = Number(invoice.balance_due);
  const paid = Number(invoice.amount_paid);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) return;
    setSaving(true);
    setSaveError(null);
    const newPaid = paid + amount;
    const newBalance = Number(invoice.total) - newPaid;
    const newStatus = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
    const { error: err } = await supabase
      .from('invoices')
      .update({ amount_paid: newPaid, balance_due: Math.max(0, newBalance), status: newStatus })
      .eq('id', invoice.id);
    setSaving(false);
    if (err) {
      setSaveError(err.message);
      return;
    }
    setPayOpen(false);
    setPayAmount('');
    onUpdated();
    onBack();
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 active:text-slate-800 transition-colors min-h-[44px]">
        <ArrowLeft className="h-4 w-4" />
        Back to Invoices
      </button>

      <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
        <div className="px-5 md:px-8 py-5 md:py-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">{invoice.invoice_number}</h1>
              <p className="text-sm text-slate-400 mt-1">
                {invoice.customer?.name ?? 'No customer'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Issued {formatDate(invoice.issue_date)}
                {invoice.due_date && ` · Due ${formatDate(invoice.due_date)}`}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${
                invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600'
                  : invoice.status === 'partial' ? 'bg-amber-50 text-amber-600'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {invoice.status}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-teal-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="px-5 py-12">
            <ErrorState message="Failed to load invoice items" />
          </div>
        ) : (
          <>
            {/* Items - table on desktop, cards on mobile */}
            <div className="px-5 md:px-8 py-5">
              {/* Desktop table */}
              <table className="w-full hidden sm:table">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2">Item</th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2">Qty</th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2">Price</th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2">GST</th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-3 text-sm text-slate-700">{it.name}</td>
                      <td className="py-3 text-sm text-slate-500 text-right">{it.quantity}</td>
                      <td className="py-3 text-sm text-slate-500 text-right">{formatCurrency(Number(it.price))}</td>
                      <td className="py-3 text-sm text-slate-500 text-right">{it.gst_rate}%</td>
                      <td className="py-3 text-sm font-medium text-slate-700 text-right">{formatCurrency(Number(it.line_total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {items.map((it) => (
                  <div key={it.id} className="border border-slate-100 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-700 mb-1">{it.name}</p>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{it.quantity} × {formatCurrency(Number(it.price))}</span>
                      <span>GST {it.gst_rate}%</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 mt-1 text-right">{formatCurrency(Number(it.line_total))}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="px-5 md:px-8 py-5 border-t border-slate-100 bg-slate-50/30">
              <div className="ml-auto max-w-xs space-y-2">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(Number(invoice.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>GST</span>
                  <span>{formatCurrency(Number(invoice.gst_total))}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-800 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span>{formatCurrency(Number(invoice.total))}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Paid</span>
                  <span>{formatCurrency(paid)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-amber-600">
                  <span>Balance Due</span>
                  <span>{formatCurrency(balance)}</span>
                </div>
              </div>
            </div>

            {balance > 0 && (
              <div className="px-5 md:px-8 py-4 border-t border-slate-100">
                <button
                  onClick={() => setPayOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 active:bg-teal-800 transition-colors min-h-[44px]"
                >
                  <Plus className="h-4 w-4" />
                  Record Payment
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record Payment" maxWidth="max-w-sm">
        <form onSubmit={handlePayment} className="space-y-4">
          {saveError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {saveError}
            </div>
          )}
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <div className="flex justify-between text-slate-500 mb-1">
              <span>Invoice Total</span>
              <span>{formatCurrency(Number(invoice.total))}</span>
            </div>
            <div className="flex justify-between text-slate-500 mb-1">
              <span>Already Paid</span>
              <span>{formatCurrency(paid)}</span>
            </div>
            <div className="flex justify-between font-semibold text-amber-600">
              <span>Balance Due</span>
              <span>{formatCurrency(balance)}</span>
            </div>
          </div>
          <TextField
            label="Payment Amount"
            type="number"
            step="0.01"
            min="0.01"
            max={balance}
            required
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            placeholder={String(balance)}
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
