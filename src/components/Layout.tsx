import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Wallet,
  Receipt,
  BarChart3,
  LogOut,
  Menu,
  MoreHorizontal,
  X,
} from 'lucide-react';

export type PageKey =
  | 'dashboard'
  | 'customers'
  | 'products'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'reports';

interface NavItem {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'invoices', label: 'Invoices', icon: FileText },
  { key: 'payments', label: 'Payments', icon: Wallet },
  { key: 'expenses', label: 'Expenses', icon: Receipt },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
];

// Items shown in the bottom tab bar on mobile (max 5 for usability)
const TAB_ITEMS: PageKey[] = ['dashboard', 'invoices', 'customers', 'expenses', 'reports'];

interface Props {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  children: React.ReactNode;
}

export default function Layout({ current, onNavigate, children }: Props) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [current]);

  const handleNav = (page: PageKey) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const SidebarContent = (
    <>
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-200/60">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm">
          <span className="text-lg font-bold text-white">B</span>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 leading-none">BusinessMate</p>
          <p className="text-[11px] text-slate-400 mt-0.5">AI Business Manager</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                active
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-teal-600' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-200/60 p-3">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-xs font-semibold uppercase">
            {user?.email?.[0] ?? 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{user?.email}</p>
            <p className="text-[10px] text-slate-400">Signed in</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors min-h-[44px]"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign Out
        </button>
      </div>
    </>
  );

  const currentLabel = NAV_ITEMS.find((n) => n.key === current)?.label ?? 'BusinessMate';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200/60 fixed inset-y-0 left-0 z-30">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white z-50 md:hidden flex flex-col shadow-xl animate-in slide-in-from-left">
            {SidebarContent}
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-full">
        {/* Mobile header */}
        <header
          className="md:hidden flex items-center justify-between bg-white border-b border-slate-200/60 px-4 sticky top-0 z-20"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600">
              <span className="text-sm font-bold text-white">B</span>
            </div>
            <span className="text-sm font-bold text-slate-800">{currentLabel}</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex items-center px-8 py-4 bg-white border-b border-slate-200/60 sticky top-0 z-20">
          <h1 className="text-lg font-bold text-slate-800">{currentLabel}</h1>
        </header>

        <main
          className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto pb-24 md:pb-8"
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/60 z-30 flex items-center justify-around"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -1px 12px rgba(0,0,0,0.06)',
        }}
      >
        {TAB_ITEMS.map((key) => {
          const item = NAV_ITEMS.find((n) => n.key === key)!;
          const Icon = item.icon;
          const active = current === key;
          return (
            <button
              key={key}
              onClick={() => handleNav(key)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[56px] transition-colors ${
                active ? 'text-teal-600' : 'text-slate-400'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-teal-600' : 'text-slate-400'}`} />
              <span className={`text-[10px] font-medium ${active ? 'text-teal-600' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
