import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/types';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TextField, SelectField } from '@/components/FormField';
import ErrorState from '@/components/ErrorState';
import LoadingState from '@/components/LoadingState';
import { Plus, Pencil, Trash2, Search, Package, Loader2, AlertCircle } from 'lucide-react';

interface FormState {
  name: string;
  price: string;
  gst_rate: string;
}

const emptyForm: FormState = { name: '', price: '', gst_rate: '0' };

const GST_RATES = ['0', '5', '12', '18', '28'];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (err) {
      setError(true);
    } else {
      setProducts((data as Product[]) ?? []);
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

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, price: String(p.price), gst_rate: String(p.gst_rate) });
    setSaveError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      name: form.name.trim(),
      price: parseFloat(form.price) || 0,
      gst_rate: parseFloat(form.gst_rate) || 0,
    };
    const { error: err } = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert(payload);
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
    await supabase.from('products').delete().eq('id', deleteId);
    setDeleteId(null);
    load();
  };

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Products</h1>
          <p className="text-sm text-slate-400 mt-1">{products.length} total products</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md active:scale-[0.98] transition-all min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all min-h-[44px]"
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Failed to load products" onRetry={load} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
            <Package className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">
            {search ? 'No matching products' : 'No products yet'}
          </p>
          <p className="text-xs text-slate-400">
            {search ? 'Try a different search' : 'Add your first product to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200/60 p-4 hover:shadow-md active:scale-[0.99] transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Package className="h-5 w-5" />
                </div>
                <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-slate-400 hover:bg-teal-50 hover:text-teal-600 active:bg-teal-100 transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteId(p.id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 active:bg-red-100 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1 truncate">{p.name}</p>
              <div className="flex items-end justify-between mt-2">
                <p className="text-lg font-bold text-slate-800">{formatCurrency(Number(p.price))}</p>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                  GST {p.gst_rate}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSave} className="space-y-4">
          {saveError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {saveError}
            </div>
          )}
          <TextField label="Product Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Price (₹)" type="number" step="0.01" min="0" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
            <SelectField label="GST Rate" value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: e.target.value })}>
              {GST_RATES.map((r) => (
                <option key={r} value={r}>{r}%</option>
              ))}
            </SelectField>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px]">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors disabled:opacity-60 min-h-[44px]">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
