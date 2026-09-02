export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  price: number;
  gst_rate: number;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  price: number;
  gst_rate: number;
  line_total: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  customer_id: string | null;
  invoice_number: string;
  status: 'pending' | 'paid' | 'partial';
  subtotal: number;
  gst_total: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  customer?: Customer | null;
  invoice_items?: InvoiceItem[];
}

export interface Expense {
  id: string;
  user_id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  created_at: string;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
