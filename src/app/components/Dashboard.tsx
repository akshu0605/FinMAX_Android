import { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import {
  Wallet, TrendingDown, TrendingUp, PiggyBank, Plus, Bell, Settings, Upload,
  LogOut, DollarSign, Calendar, Target, CheckCircle2, Circle, Trash2,
  Globe, Calculator, HeadphonesIcon, Heart, X, Menu, MoreHorizontal, Search, Loader2, Sparkles, Trophy, ChevronDown, ChevronUp,
  Utensils, Car, Clapperboard, ShoppingBag, ReceiptText, HeartPulse, Tags,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Logo } from './Logo';
import { LoanCalculator } from './LoanCalculator';
import { ContactDeveloper } from './ContactDeveloper';
import { api } from '../utils/api';
import { supabase } from '../utils/supabase';
import { toast } from 'sonner';
import { SplitKro } from './SplitKro';
import { GlassCard } from './ui/GlassCard';
import { NeonButton } from './ui/NeonButton';
import { AIInsights } from './AIInsights/AIInsights';
import './Dashboard.css';

const DeferredImportWizard = lazy(() => import('./ImportWizard/ImportWizard').then(({ ImportWizard }) => ({ default: ImportWizard })));
const DeferredSettingsPage = lazy(() => import('./Settings').then(({ Settings }) => ({ default: Settings })));

// Design tokens
const TEAL = '#DDB96B';
const headingFont: React.CSSProperties = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };
const monoFont: React.CSSProperties = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };

// Liquid Glass helpers
const glass = (tealTint = false, blurPx = 24): React.CSSProperties => ({
  background: tealTint ? 'rgba(0,242,234,0.055)' : 'rgba(255,255,255,0.045)',
  backdropFilter: `blur(${blurPx}px) saturate(200%) brightness(1.08)`,
  WebkitBackdropFilter: `blur(${blurPx}px) saturate(200%) brightness(1.08)`,
  border: tealTint ? '1px solid rgba(0,242,234,0.18)' : '1px solid rgba(255,255,255,0.09)',
  boxShadow:
    '0 12px 40px rgba(0,0,0,0.65), inset 0 1.5px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(0,0,0,0.18)',
});

const PIE_COLORS = [TEAL, '#F4D995', '#B9944D', '#8B713B', '#53D69A', '#F17878'];
const CATEGORY_ICONS: Record<string, typeof DollarSign> = {
  'Food & Dining': Utensils,
  Transportation: Car,
  Entertainment: Clapperboard,
  Shopping: ShoppingBag,
  Bills: ReceiptText,
  Healthcare: HeartPulse,
  Other: Tags,
};

function CategoryGlyph({ category, className = 'size-4' }: { category: string; className?: string }) {
  const Icon = CATEGORY_ICONS[category] ?? DollarSign;
  return <Icon className={className} aria-hidden="true" />;
}

// Interfaces
interface DashboardProps { userName: string; userEmail: string; userId: string; accessToken: string; onLogout: () => void; }
interface Expense { id: string; category: string; amount: number; date: string; title: string; note?: string; }
interface Reminder { id: string; title: string; dueDate: string; status: 'pending' | 'completed'; amount?: number; }
interface Budget { id: string; category: string; allocatedAmount: number; month: number; year: number; }
type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD';
const CURRENCY_SYMBOLS: Record<Currency, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$' };

// Input styling
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(0,242,234,0.18)',
  borderRadius: '10px', color: '#fff', outline: 'none', ...monoFont,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
  transition: 'all 0.2s ease',
};

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-xl" style={{ ...glass(false, 20), border: '1px solid rgba(0,242,234,0.3)' }}>
        <p className="text-xs font-bold mb-1 text-white" style={headingFont}>{label || payload[0].name}</p>
        <p className="text-sm font-bold" style={{ color: TEAL, ...monoFont }}>
          {payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};



// Liquid glass modal
function ModalCard({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}>
      <GlassCard
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-b-none p-5 sm:rounded-b-2xl sm:p-7"
        spacing="none"
        style={{
          boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 40px rgba(0,242,255,0.07)',
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h3 className="text-lg sm:text-xl font-bold text-white" style={headingFont}>{title}</h3>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}
              className="hover:text-[var(--ns-cyan)] transition-colors"
            ><X className="size-5" /></button>
          </div>
          {children}
        </div>
      </GlassCard>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, iconColor, label, value, onEdit }:
  { icon: any; iconColor: string; label: string; value: string; onEdit?: () => void }) {
  const actualColor = iconColor === TEAL ? TEAL : iconColor;

  return (
    <GlassCard
      interactive
      rounded="lg"
      spacing="none"
      active={iconColor === TEAL}
      className="dashboard-stat-card flex flex-col justify-between relative overflow-hidden"
      data-stat={label}
      style={{
        boxShadow: '0 8px 24px -6px rgba(0,0,0,0.3)',
      }}
      whileHover={{ y: -2, scale: 1.01, boxShadow: `0 12px 28px -10px ${actualColor}28` }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${actualColor} 0%, ${actualColor}22 100%)`,
        }}
      />

      <div className="flex items-center justify-between mb-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: `${actualColor}18`,
            border: `1px solid ${actualColor}33`,
          }}
        >
          <Icon className="size-4" style={{ color: actualColor }} />
        </div>
        {onEdit && (
          <button
            className="text-[11px] font-medium px-2 py-0.5 rounded text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            style={monoFont}
            onClick={onEdit}
          >
            Edit
          </button>
        )}
      </div>

      <div>
        <motion.div
          className="text-xl sm:text-2xl font-bold text-white mb-0.5 tracking-tight tabular-nums"
          style={{ ...headingFont, fontVariantNumeric: 'tabular-nums' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {value}
        </motion.div>
        <div className="text-xs font-medium text-neutral-400" style={headingFont}>
          {label}
        </div>
      </div>
    </GlassCard>
  );
}

// Dashboard Component
export function Dashboard({ userName, userEmail, userId, onLogout }: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Track whether we are on a desktop viewport (≥1024px) to show sidebar by default
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  );
  const [showMobileDashboardDetails, setShowMobileDashboardDetails] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  );

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      setShowMobileDashboardDetails(window.innerWidth >= 768);
      // Auto-close mobile sidebar when resizing to desktop
      if (desktop) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  type DashboardView = 'dashboard' | 'budgets' | 'expenses' | 'top-spending' | 'reminders' | 'splitkro' | 'ai-insights';
  const [activeView, setActiveViewState] = useState<DashboardView>('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const setActiveView = useCallback((view: DashboardView) => {
    setShowMoreMenu(false);
    if (view === activeView) return;
    const currentState = window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
    window.history.pushState({ ...currentState, finmaxView: view }, '');
    setActiveViewState(view);
  }, [activeView]);

  useEffect(() => {
    const currentState = window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
    window.history.replaceState({ ...currentState, finmaxView: 'dashboard' }, '');

    const onPopState = () => {
      const view = window.history.state?.finmaxView as DashboardView | undefined;
      const validViews: DashboardView[] = ['dashboard', 'budgets', 'expenses', 'top-spending', 'reminders', 'splitkro', 'ai-insights'];
      setActiveViewState(view && validViews.includes(view) ? view : 'dashboard');
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem(`finmax-currency-${userId}`) as Currency | null;
      return saved && Object.prototype.hasOwnProperty.call(CURRENCY_SYMBOLS, saved) ? saved : 'INR';
    } catch {
      return 'INR';
    }
  });
  const [currencyPreferenceReady, setCurrencyPreferenceReady] = useState(false);
  const [canSyncCurrencyPreference, setCanSyncCurrencyPreference] = useState(false);
  const [salary, setSalary] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [showEditSalary, setShowEditSalary] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [showLoanCalculator, setShowLoanCalculator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showContactDeveloper, setShowContactDeveloper] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  useEffect(() => {
    const handleAndroidBack = (event: Event) => {
      if (selectedExpense) {
        setSelectedExpense(null);
        event.preventDefault();
        return;
      }

      const openOverlay = [
        [showSettings, setShowSettings],
        [showContactDeveloper, setShowContactDeveloper],
        [showImportWizard, setShowImportWizard],
        [showLoanCalculator, setShowLoanCalculator],
        [showAddExpense, setShowAddExpense],
        [showAddReminder, setShowAddReminder],
        [showAddBudget, setShowAddBudget],
        [showEditSalary, setShowEditSalary],
        [showCurrencySelector, setShowCurrencySelector],
        [showMoreMenu, setShowMoreMenu],
        [sidebarOpen, setSidebarOpen],
      ] as const;
      const activeOverlay = openOverlay.find(([isOpen]) => isOpen);
      if (activeOverlay) {
        activeOverlay[1](false);
        event.preventDefault();
        return;
      }

      if (activeView !== 'dashboard') {
        if (window.history.state?.finmaxView) window.history.back();
        else setActiveViewState('dashboard');
        event.preventDefault();
      }
    };

    window.addEventListener('finmaxBackButton', handleAndroidBack);
    return () => window.removeEventListener('finmaxBackButton', handleAndroidBack);
  }, [
    activeView,
    selectedExpense,
    showSettings,
    showContactDeveloper,
    showImportWizard,
    showLoanCalculator,
    showAddExpense,
    showAddReminder,
    showAddBudget,
    showEditSalary,
    showCurrencySelector,
    showMoreMenu,
    sidebarOpen,
  ]);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const [newExpense, setNewExpense] = useState({ category: 'Food & Dining', amount: '', title: '', date: new Date().toISOString().split('T')[0], note: '' });
  const [newReminder, setNewReminder] = useState({ title: '', dueDate: '', amount: '' });
  const [newBudget, setNewBudget] = useState({ category: 'Food & Dining', limit: '' });

  const fetchData = async () => {
    setLoading(true);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    try {
      const [incRes, expRes, budRes, remRes] = await Promise.all([
        api.getIncomes(month, year),
        api.getExpenses(),
        api.getBudgets(month, year),
        api.getReminders()
      ]);

      if (incRes.data?.incomes?.length) {
        // Aggregate income for the month
        const totalInc = incRes.data.incomes.reduce((s, i) => s + i.amount, 0);
        setSalary(totalInc);
      } else {
        setSalary(0);
      }

      if (expRes.data) setExpenses(expRes.data.expenses.map(e => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        date: e.date,
        title: e.title,
        note: e.note
      })));

      if (budRes.data) setBudgets(budRes.data.budgets.map(b => ({
        id: b.id,
        category: b.category,
        allocatedAmount: b.allocatedAmount,
        month: b.month,
        year: b.year
      })));

      if (remRes.data) setReminders(remRes.data.reminders.map(r => ({
        id: r.id,
        title: r.title,
        dueDate: r.dueDate,
        status: r.status,
        amount: r.amount
      })));
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      const user = !error && data.user?.id === userId ? data.user : null;
      if (user) {
        const preferences = user.user_metadata?.finmax_preferences;
        const savedCurrency = preferences && typeof preferences === 'object'
          ? (preferences as Record<string, unknown>).currency
          : null;
        if (typeof savedCurrency === 'string' && Object.prototype.hasOwnProperty.call(CURRENCY_SYMBOLS, savedCurrency)) {
          setCurrency(savedCurrency as Currency);
        }
        setCanSyncCurrencyPreference(true);
      }
      setCurrencyPreferenceReady(true);
    }).catch(() => {
      if (active) setCurrencyPreferenceReady(true);
    });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!currencyPreferenceReady) return;
    try {
      localStorage.setItem(`finmax-currency-${userId}`, currency);
    } catch {
      // Account metadata remains the cross-device preference source.
    }
    if (!canSyncCurrencyPreference || !userId) return;
    const timeout = window.setTimeout(async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user || data.user.id !== userId) return;
      const metadata = data.user.user_metadata || {};
      const current = metadata.finmax_preferences && typeof metadata.finmax_preferences === 'object'
        ? metadata.finmax_preferences as Record<string, unknown>
        : {};
      const { error: updateError } = await supabase.auth.updateUser({ data: { finmax_preferences: { ...current, currency } } });
      if (updateError) toast.error('Could not save your currency preference');
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [currency, currencyPreferenceReady, canSyncCurrencyPreference, userId]);

  useEffect(() => {
    // budgets[].spent is calculated dynamically in the render logic or a useMemo
  }, [expenses]); // eslint-disable-line

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const savings = salary - totalExpenses;
  const savingsRate = salary > 0 ? ((savings / salary) * 100).toFixed(1) : '0.0';
  const sym = CURRENCY_SYMBOLS[currency];

  const categoryData = expenses.reduce((acc, e) => {
    const ex = acc.find(i => i.name === e.category);
    if (ex) ex.value += e.amount; else acc.push({ name: e.category, value: e.amount });
    return acc;
  }, [] as { name: string; value: number }[]);
  const topSpending = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 10);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await api.addExpense({
      title: newExpense.title,
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
      date: new Date(newExpense.date).toISOString()
    });
    if (error) return toast.error(error);
    toast.success('Expense added');
    setNewExpense({ category: 'Food & Dining', amount: '', title: '', date: new Date().toISOString().split('T')[0], note: '' });
    setShowAddExpense(false);
    fetchData();
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await api.addReminder({
      title: newReminder.title,
      dueDate: new Date(newReminder.dueDate).toISOString()
    });
    if (error) return toast.error(error);
    toast.success('Reminder added');
    setNewReminder({ title: '', dueDate: '', amount: '' });
    setShowAddReminder(false);
    fetchData();
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const { data, error } = await api.addBudget({
      category: newBudget.category,
      allocatedAmount: parseFloat(newBudget.limit),
      month: now.getMonth() + 1,
      year: now.getFullYear()
    });
    if (error) return toast.error(error);
    toast.success('Budget added');
    setNewBudget({ category: 'Food & Dining', limit: '' });
    setShowAddBudget(false);
    fetchData();
  };

  const toggleReminder = async (id: string) => {
    const { error } = await api.toggleReminder(id);
    if (error) return toast.error(error);
    fetchData();
  };

  const deleteReminder = async (id: string) => {
    const { error } = await api.deleteReminder(id);
    if (error) return toast.error(error);
    fetchData();
  };

  const deleteExpense = async (id: string) => {
    const { error } = await api.deleteExpense(id);
    if (error) return toast.error(error);
    fetchData();
  };

  const deleteBudget = async (id: string) => {
    const { error } = await api.deleteBudget(id);
    if (error) return toast.error(error);
    fetchData();
  };

  if (showSettings) {
    return (
      <Suspense fallback={<div className="dashboard-import-loading" role="status"><Loader2 className="size-6" />Opening settings…</div>}>
      <DeferredSettingsPage
        userId={userId}
        userName={userName}
        userEmail={userEmail}
        onBack={() => setShowSettings(false)}
        onLogout={onLogout}
        currency={currency}
        onCurrencyChange={(c) => setCurrency(c as Currency)}
        onDataChanged={fetchData}
      />
      </Suspense>
    );
  }
  if (showContactDeveloper) return <ContactDeveloper onBack={() => setShowContactDeveloper(false)} />;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Wallet },
    { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
    { id: 'budgets', label: 'Budgets', icon: Target },
    { id: 'expenses', label: 'Total Expenses', icon: TrendingDown },
    { id: 'top-spending', label: 'Top Spending', icon: Trophy },
    { id: 'reminders', label: 'Reminders', icon: Bell },
  ] as const;
  const viewTitle = activeView === 'dashboard'
    ? 'Financial Dashboard'
    : activeView === 'splitkro'
      ? 'Split Kro'
      : navItems.find(item => item.id === activeView)?.label ?? 'Financial Dashboard';

  const CATEGORIES = ['Food & Dining', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Other'];

  return (
    <div id="finmax-dashboard" className="min-h-screen text-white" style={{ background: '#0c100f', ...headingFont }}>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Liquid Glass Sidebar */}
      {/* Desktop: always visible (lg:translate-x-0). Mobile: slides in from left. */}
      <aside
        className="fixed left-0 top-0 bottom-0 w-60 flex flex-col z-30 transition-transform duration-300 ease-in-out"
        style={{
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(32px) saturate(200%) brightness(1.06)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%) brightness(1.06)',
          borderRight: '1px solid rgba(0,242,234,0.12)',
          boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.04)',
          padding: '20px 14px',
          // Desktop: always visible. Mobile: visible only when open.
          transform: (isDesktop || sidebarOpen) ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* inner sheen */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 40%)' }} />

        {/* Mobile close button */}
        <button
          className="absolute top-4 right-4 lg:hidden z-10"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          onClick={() => setSidebarOpen(false)}
          onMouseEnter={(e) => (e.currentTarget.style.color = TEAL)}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          <X className="size-5" />
        </button>

        <div className="mb-6 px-2 relative z-10"><Logo /></div>

        <nav className="flex-1 space-y-1 relative z-10">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeView === id;
            return (
              <motion.button key={id} onClick={() => { setActiveView(id); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative overflow-hidden"
                style={active ? {
                  background: 'rgba(0,242,234,0.1)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(0,242,234,0.3)',
                  color: TEAL,
                  boxShadow: '0 0 20px rgba(0,242,234,0.1), inset 0 1px 0 rgba(0,242,234,0.2)',
                  ...monoFont,
                } : { border: '1px solid transparent', color: '#A1A1A1', ...monoFont }}
                whileHover={active ? {} : { x: 4, color: '#fff', background: 'rgba(255,255,255,0.04)' }}
              >
                {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full" style={{ background: TEAL, boxShadow: `0 0 10px ${TEAL}` }} />}
                <Icon className="size-5" style={active ? { color: TEAL, filter: `drop-shadow(0 0 5px ${TEAL})` } : {}} />
                <span>{label}</span>
              </motion.button>
            );
          })}

          <motion.button
            type="button"
            onClick={() => { setShowImportWizard(true); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative overflow-hidden"
            style={{ border: '1px solid transparent', color: '#A1A1A1', ...monoFont }}
            whileHover={{ x: 4, color: '#fff', background: 'rgba(255,255,255,0.04)' }}
          >
            <Upload className="size-5" />
            <span>Import Expenses</span>
          </motion.button>

          {/* Split Kro Specialist Button */}
          <motion.button
            onClick={() => { setActiveView('splitkro'); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative overflow-hidden mt-3"
            style={activeView === 'splitkro' ? {
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
              ...headingFont,
            } : {
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              color: '#C7D2FE',
              ...headingFont,
            }}
            whileHover={{ scale: 1.02, x: 4, background: activeView === 'splitkro' ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'rgba(99,102,241,0.15)' }}
          >
            <TrendingUp className="size-5" />
            <span className="font-bold whitespace-nowrap">Split Kro 💸</span>
          </motion.button>

          <motion.button onClick={() => { setShowLoanCalculator(true); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mt-2 relative overflow-hidden"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.22)', color: '#FBBF24', backdropFilter: 'blur(12px)', ...monoFont, boxShadow: 'inset 0 1px 0 rgba(234,179,8,0.12)' }}
            whileHover={{ scale: 1.02, background: 'rgba(234,179,8,0.13)' }} whileTap={{ scale: 0.98 }}
          >
            <Calculator className="size-5" />
            <span className="font-semibold">Financial Tools</span>
          </motion.button>
        </nav>

        <div className="space-y-1 pt-4 relative z-10" style={{ borderTop: '1px solid rgba(0,242,234,0.1)' }}>
          {[
            { label: 'Contact Developer', icon: HeadphonesIcon, onClick: () => { setShowContactDeveloper(true); setSidebarOpen(false); } },
            { label: 'Settings', icon: Settings, onClick: () => { setShowSettings(true); setSidebarOpen(false); } },
            { label: 'Logout', icon: LogOut, onClick: onLogout },
          ].map(({ label, icon: Icon, onClick }) => (
            <motion.button key={label} onClick={onClick}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ color: '#A1A1A1', ...monoFont }}
              whileHover={{ x: 4, color: TEAL, background: 'rgba(0,242,234,0.06)' }}
            >
              <Icon className="size-5" /><span>{label}</span>
            </motion.button>
          ))}
        </div>
      </aside>

      {/* Main Content Section */}
      {/* On mobile: no left margin (sidebar is hidden). On lg: ml-60. Extra bottom padding for mobile bottom nav. */}
      <div className="dashboard-main lg:ml-60 p-4 sm:p-5 lg:p-6 pb-24 lg:pb-8 relative z-10">
        {/* Header */}
        <motion.div className="dashboard-header mb-5 flex items-start justify-between gap-3"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="dashboard-brand-row flex w-full items-center justify-between gap-3">
            <div className="flex items-center gap-3">
            <button
              className="lg:hidden flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#151515', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
              <div className="dashboard-brand-copy">
                <Logo />
                <span className="dashboard-current-view">{viewTitle === 'Financial Dashboard' ? 'Personal Finance' : viewTitle}</span>
              </div>
            </div>
            <div className="dashboard-header-actions flex items-center gap-2">
              <button type="button" className="dashboard-header-icon" aria-label="Open reminders" onClick={() => setActiveView('reminders')}>
                <Bell className="size-5" />
              </button>
              <button type="button" className="dashboard-avatar" aria-label="Open profile and settings" onClick={() => setShowSettings(true)}>
                {(userName || userEmail).trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}
              </button>
              <div className="dashboard-currency-picker relative">
                <motion.button onClick={() => setShowCurrencySelector(!showCurrencySelector)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ ...glass(false, 18), color: '#fff', ...monoFont }} whileHover={{ scale: 1.04 }} aria-label={`Currency ${currency}`}>
                  <Globe className="size-5 relative" style={{ color: TEAL }} /><span className="font-semibold relative">{currency}</span><span className="text-xl relative">{sym}</span>
                </motion.button>
                {showCurrencySelector && <motion.div className="absolute top-full mt-2 right-0 w-48 p-2 rounded-xl z-50 overflow-hidden" style={{ background: '#111', border: '1px solid rgba(221,185,107,.22)', boxShadow: '0 20px 60px rgba(0,0,0,.85)' }} initial={{ opacity: 0, y: -10, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
                  {(Object.keys(CURRENCY_SYMBOLS) as Currency[]).map(curr => <motion.button key={curr} onClick={() => { setCurrency(curr); setShowCurrencySelector(false); }} className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg" style={currency === curr ? { background: 'rgba(221,185,107,.1)', color: '#F4D995', ...monoFont } : { color: '#A1A1A1', ...monoFont }}><span>{curr}</span><span className="text-xl">{CURRENCY_SYMBOLS[curr]}</span></motion.button>)}
                </motion.div>}
              </div>
            </div>
          </div>
          <div className="dashboard-greeting">
            <span className="dashboard-eyebrow">FINMAX <span>•</span> PERSONAL FINANCE</span>
            <h1>{activeView === 'dashboard' ? <>Welcome back,<br className="dashboard-mobile-break" /> {userName || userEmail} <span aria-hidden="true">✦</span></> : <>{viewTitle}</>}</h1>
            <p>{activeView === 'dashboard' ? 'Track  ·  Spend  ·  Save  ·  Grow' : `Welcome back, ${userName || userEmail}`}</p>
          </div>
        </motion.div>

        {activeView === 'dashboard' && <section className="dashboard-hero" aria-label="Financial overview">
          <div className="dashboard-hero-copy">
            <span>YOUR FINANCIAL OVERVIEW</span>
            <h2>Stay in control<br />of your money</h2>
            <button type="button" onClick={() => setActiveView('ai-insights')}>View analytics <span aria-hidden="true">→</span></button>
          </div>
          <img src="/finmax-card-hero.svg" alt="FinMax black payment card with a gold chip" />
        </section>}

        {/* Stat Cards Section */}
        <div className="dashboard-stat-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5 items-stretch">
          <StatCard icon={DollarSign} iconColor={TEAL} label="Monthly Income" value={`${sym}${salary.toLocaleString()}`} onEdit={() => setShowEditSalary(true)} />
          <StatCard icon={TrendingDown} iconColor="#F87171" label="Total Expenses" value={`${sym}${totalExpenses.toLocaleString()}`} />
          <StatCard icon={PiggyBank} iconColor="#34D399" label="Total Savings" value={`${sym}${savings.toLocaleString()}`} />
          <StatCard icon={TrendingUp} iconColor="#60A5FA" label="Savings Rate" value={`${savingsRate}%`} />
        </div>

        {/* Dashboard View Section */}
        {activeView === 'dashboard' && (
          <>
            <div className="dashboard-mobile-toggle">
              <div>
                <span className="block text-sm font-semibold text-white">Dashboard overview</span>
                <span className="block text-xs" style={{ color: '#97A29E' }}>Your key numbers at a glance</span>
              </div>
              <button
                type="button"
                aria-expanded={showMobileDashboardDetails}
                onClick={() => setShowMobileDashboardDetails(open => !open)}
                className="dashboard-mobile-toggle-button"
              >
                {showMobileDashboardDetails ? 'Hide details' : 'Full dashboard'}
                {showMobileDashboardDetails ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            </div>
            {(isDesktop || showMobileDashboardDetails) && <div className="dashboard-detail-panels">
            {/* Charts Row: Side by Side on Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <GlassCard rounded="lg" className="dashboard-spending-category flex flex-col p-4 sm:p-5" style={{ minHeight: '340px' }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-white tracking-tight" style={headingFont}>Where your money goes</h2>
                  <span className="text-xs text-neutral-400" style={monoFont}>Breakdown</span>
                </div>
                {expenses.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    <PieChart className="size-10 mb-3 opacity-20 text-[var(--ns-cyan)]" />
                    <p className="text-xs opacity-50" style={monoFont}>Add expenses to see your spending breakdown.</p>
                  </div>
                ) : (
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} outerRadius={85} innerRadius={45} dataKey="value" animationBegin={0} animationDuration={800}>
                          {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ color: '#A1A1A1', fontSize: '11px', ...monoFont }} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlassCard>

              <GlassCard rounded="lg" className="p-4 sm:p-5 flex flex-col" style={{ minHeight: '340px' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight mb-0.5" style={headingFont}>Spending Trend</h2>
                    <p className="text-xs text-neutral-400" style={monoFont}>Daily activity</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]" style={monoFont}>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Income
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]" style={monoFont}>
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Expenses
                    </div>
                  </div>
                </div>
                <div className="dashboard-trend-chart flex-1 h-[260px] w-full">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={expenses.slice(-15).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}>
                      <defs>
                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F87171" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#F87171" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                      <Area type="monotone" dataKey="amount" stroke="#F87171" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExp)" activeDot={{ r: 5, stroke: '#F87171', strokeWidth: 2, fill: '#080A09' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>

            {/* Bottom Row: Recent Expenses & Upcoming Bills Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <GlassCard rounded="lg" className="p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight" style={headingFont}>Recent Expenses</h2>
                    <p className="text-xs text-neutral-400" style={monoFont}>Latest transactions</p>
                  </div>
                  <NeonButton size="sm" onClick={() => setShowAddExpense(true)}><Plus className="size-3.5" /> Add</NeonButton>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto overscroll-contain pr-1 flex-1">
                  {expenses.length === 0 ? (
                    <div className="py-10 text-center opacity-30" style={monoFont}>
                      <TrendingDown className="size-8 mx-auto mb-2" />
                      <p className="text-xs">No expenses yet</p>
                    </div>
                  ) : expenses.slice(0, 5).map((expense, i) => (
                    <motion.div
                      key={expense.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedExpense(expense)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedExpense(expense);
                        }
                      }}
                      className="expense-detail-trigger flex items-center justify-between gap-3 p-2.5 rounded-xl group border border-white/[0.06] bg-white/[0.02] transition-colors hover:bg-white/[0.04] hover:border-white/[0.1]"
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.04] border border-white/[0.08]">
                          <CategoryGlyph category={expense.category} className="size-3.5 text-neutral-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-white text-xs sm:text-sm truncate" style={headingFont} title={expense.title}>{expense.title}</div>
                          <div className="text-[11px] text-neutral-400 truncate" style={monoFont}>{expense.category}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right tabular-nums">
                          <div className="font-semibold text-rose-300 text-xs sm:text-sm whitespace-nowrap" style={monoFont}>-{sym}{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <div className="text-[10px] text-neutral-500 whitespace-nowrap" style={monoFont}>{new Date(expense.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
                        </div>
                        <button onClick={(event) => { event.stopPropagation(); deleteExpense(expense.id); }} aria-label={`Delete ${expense.title}`} className="p-1 rounded text-neutral-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:text-rose-300"><Trash2 className="size-3.5" /></button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>

              {/* Upcoming Bills side-by-side card */}
              <GlassCard rounded="lg" className="p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight" style={headingFont}>Upcoming Bills</h2>
                    <p className="text-xs text-neutral-400" style={monoFont}>Payment reminders</p>
                  </div>
                  <NeonButton size="sm" onClick={() => setShowAddReminder(true)}><Plus className="size-3.5" /> Reminder</NeonButton>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto overscroll-contain pr-1 flex-1">
                  {reminders.length === 0 ? (
                    <div className="py-10 text-center opacity-30" style={monoFont}>
                      <Bell className="size-8 mx-auto mb-2" />
                      <p className="text-xs">No upcoming bills set</p>
                    </div>
                  ) : reminders.slice(0, 5).map((r, i) => {
                    const completed = r.status === 'completed';
                    return (
                      <motion.div key={r.id} className="p-2.5 rounded-xl group relative overflow-hidden border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors"
                        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                      >
                        <div className="flex items-center gap-2.5 relative">
                          <button onClick={() => toggleReminder(r.id)} style={{ color: completed ? TEAL : '#A1A1A1' }}
                            className="shrink-0 transition-colors"
                            onMouseEnter={(e) => (e.currentTarget.style.color = TEAL)}
                            onMouseLeave={(e) => (e.currentTarget.style.color = completed ? TEAL : '#A1A1A1')}
                          >{completed ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}</button>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs sm:text-sm truncate" style={{ color: completed ? '#737373' : '#fff', textDecoration: completed ? 'line-through' : 'none', ...headingFont }}>{r.title}</div>
                            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400" style={monoFont}><Calendar className="size-3" />{new Date(r.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
                          </div>
                          {r.amount ? (
                            <span className="text-xs font-semibold tabular-nums text-neutral-200" style={monoFont}>{sym}{Number(r.amount).toLocaleString()}</span>
                          ) : null}
                          <button onClick={() => deleteReminder(r.id)} className="opacity-0 group-hover:opacity-100 transition-all text-red-400 hover:text-red-300 p-1"><Trash2 className="size-3.5" /></button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </GlassCard>
            </div>

            </div>}
          </>
        )}

        {/* Budgets View Section */}
        {activeView === 'budgets' && (
          <GlassCard spacing="lg" rounded="apple" className="dashboard-budget-panel" style={{ boxShadow: '0 40px 100px -20px rgba(0,0,0,0.8)' }}>
            <div className="dashboard-budget-heading flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="dashboard-budget-icon"><Target className="size-5" /></div>
                <div><h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight" style={headingFont}>Budgets</h2><p className="mt-1 text-sm" style={{ color: '#A1A1A1' }}>Set monthly spending limits and stay on track</p></div>
              </div>
              <NeonButton onClick={() => setShowAddBudget(true)}><Plus className="size-5" /> Add Budget</NeonButton>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {budgets.length === 0 ? (
                <div className="dashboard-budget-empty col-span-full">
                  <img src="/finmax-budget-empty.svg" alt="Gold budgeting chart illustration" />
                  <h3>No Budgets Yet</h3>
                  <p>Create a budget to manage your spending<br className="hidden sm:block" /> better and hit your financial goals.</p>
                  <button type="button" onClick={() => setShowAddBudget(true)}><Plus className="size-5" /> Create Your First Budget</button>
                </div>
              ) : budgets.map((b, i) => {
                const spent = expenses.filter(e => e.category === b.category).reduce((s, e) => s + e.amount, 0);
                const pct = b.allocatedAmount > 0 ? (spent / b.allocatedAmount) * 100 : 0;
                const over = pct > 100;
                const barColor = over ? '#F87171' : pct > 80 ? '#FBBF24' : TEAL;
                return (
                  <motion.div key={b.id} className="p-6 rounded-xl group relative overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,242,234,0.09)', backdropFilter: 'blur(12px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.03, borderColor: 'rgba(0,242,234,0.25)' }}
                  >
                    <div className="absolute inset-0 rounded-[inherit] pointer-events-none"
                      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 60%)' }} />
                    <div className="flex items-start justify-between mb-4 relative">
                      <div>
                        <h3 className="font-semibold text-lg text-white" style={headingFont}>{b.category}</h3>
                        <p className="text-sm" style={{ color: '#A1A1A1', ...monoFont }}>{sym}{spent} / {sym}{b.allocatedAmount}</p>
                      </div>
                      <button onClick={() => deleteBudget(b.id)} className="opacity-0 group-hover:opacity-100 transition-all text-red-400 hover:text-red-300"><Trash2 className="size-4" /></button>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden mb-2 relative"
                      style={{ background: 'rgba(255,255,255,0.07)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}>
                      <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                        style={{ background: barColor, boxShadow: `0 0 10px ${barColor}80` }} />
                    </div>
                    <p className="text-sm font-semibold relative" style={{ color: over ? '#F87171' : '#A1A1A1', ...monoFont }}>{pct.toFixed(1)}% used</p>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Expenses View Section */}
        {activeView === 'expenses' && (
          <GlassCard spacing="lg" className="min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white tracking-tight" style={headingFont}>Total Expenses</h2>
              <NeonButton onClick={() => setShowAddExpense(true)}><Plus className="size-5" /> Add Expense</NeonButton>
            </div>
            <div className="space-y-4">
              {expenses.length === 0 ? (
                <div className="dashboard-expenses-empty">
                  <img src="/finmax-expenses-empty.svg" alt="" aria-hidden="true" />
                  <p>No expenses recorded yet</p>
                  <span>Add a transaction to start seeing your spending history.</span>
                </div>
              ) : expenses.map((expense, i) => (
                <motion.div
                  key={expense.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedExpense(expense)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedExpense(expense);
                    }
                  }}
                  className="expense-detail-trigger flex items-center justify-between gap-3 p-3 sm:p-5 rounded-2xl group relative overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.01, borderColor: 'rgba(0,242,234,0.2)' }}
                >
                  <div className="absolute inset-0 rounded-[inherit] pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)' }} />
                  <div className="flex items-center gap-3 sm:gap-4 relative flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(0,242,234,0.1)', border: '1px solid rgba(0,242,234,0.2)', boxShadow: '0 4px 15px rgba(0,242,234,0.1)' }}>
                      <CategoryGlyph category={expense.category} className="size-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-base sm:text-lg break-words" style={headingFont} title={expense.title}>{expense.title}</div>
                      <div className="text-xs sm:text-sm break-words" style={{ color: '#A1A1A1', ...monoFont }}>{expense.category} • {new Date(expense.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-4 relative shrink-0">
                    <div className="text-right">
                      <div className="text-sm sm:text-xl font-bold text-red-400 whitespace-nowrap" style={monoFont}>-{sym}{expense.amount.toLocaleString()}</div>
                    </div>
                    <button onClick={(event) => { event.stopPropagation(); deleteExpense(expense.id); }} className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-red-400 hover:bg-red-400/10"><Trash2 className="size-5" /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Top Spending View Section */}
        {activeView === 'top-spending' && (
          <GlassCard spacing="lg" className="dashboard-top-spending min-h-[500px]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight" style={headingFont}>Top Spending</h2>
                <p className="mt-1 text-sm text-neutral-400" style={monoFont}>Your 10 highest-value transactions</p>
              </div>
              {topSpending.length > 0 && (
                <span className="text-xs text-neutral-500 tabular-nums" style={monoFont}>{topSpending.length} transaction{topSpending.length === 1 ? '' : 's'}</span>
              )}
            </div>

            {topSpending.length === 0 ? (
              <div className="dashboard-expenses-empty dashboard-top-empty">
                <img src="/finmax-expenses-empty.svg" alt="" aria-hidden="true" />
                <p className="text-sm">Add expenses to see your top spending.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {topSpending.map((expense, index) => (
                  <motion.button
                    type="button"
                    key={expense.id}
                    onClick={() => setSelectedExpense(expense)}
                    className="dashboard-top-spending-row group relative flex items-center gap-3 rounded-xl p-3 sm:p-4"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.025 }}
                    aria-label={`View transaction details for ${expense.title}`}
                  >
                    <span className="dashboard-top-spending-rank shrink-0 text-[10px] font-semibold tabular-nums" style={monoFont}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-teal-300/[0.06] border border-teal-300/[0.12]">
                      <CategoryGlyph category={expense.category} className="size-4 text-teal-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white text-sm truncate" style={headingFont} title={expense.title}>{expense.title}</div>
                      <div className="text-[11px] text-neutral-400 truncate" style={monoFont}>
                        {expense.category} <span className="text-neutral-600 px-1">•</span>{new Date(expense.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <div className="font-semibold text-rose-300 text-sm whitespace-nowrap" style={monoFont}>-{sym}{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="text-[10px] text-neutral-500" style={monoFont}>Expense</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {/* Reminders View Section */}
        {activeView === 'reminders' && (
          <GlassCard spacing="md" className="min-h-[320px]">
            <div className="dashboard-reminders-header flex flex-wrap items-center justify-between gap-4 mb-7">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight" style={headingFont}>Reminders & Bills</h2>
                <p className="mt-1 text-sm" style={{ color: '#97A29E' }}>Keep upcoming payments in one place.</p>
              </div>
              <NeonButton className="w-full sm:w-auto" onClick={() => setShowAddReminder(true)}><Plus className="size-5" /> New Reminder</NeonButton>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reminders.length === 0 ? (
                <div className="col-span-full flex min-h-[160px] flex-col items-center justify-center rounded-2xl border text-center px-5 py-8"
                  style={{ background: 'rgba(255,255,255,0.018)', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <img className="dashboard-reminders-empty-art" src="/finmax-calendar.svg" alt="" aria-hidden="true" />
                  <p className="font-semibold text-white" style={headingFont}>Nothing due right now</p>
                  <p className="mt-1 text-sm" style={{ color: '#97A29E' }}>Add a reminder for a bill or payment date.</p>
                </div>
              ) : reminders.map((r, i) => {
                const completed = r.status === 'completed';
                return (
                  <motion.div key={r.id}
                    className="dashboard-reminder-card p-5 sm:p-6 rounded-2xl group relative overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -2, borderColor: 'rgba(69,200,161,0.25)' }}
                  >
                    <div className="flex items-center gap-3 relative">
                      <div className="dashboard-reminder-mark"><Calendar className="size-5" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-lg font-bold mb-1" style={{ color: completed ? '#A1A1A1' : '#fff', textDecoration: completed ? 'line-through' : 'none', ...headingFont }}>{r.title}</div>
                        <div className="flex items-center gap-2 text-sm" style={{ color: '#A1A1A1', ...monoFont }}><Calendar className="size-4" />Due: {new Date(r.dueDate).toLocaleDateString()}</div>
                      </div>
                      <button type="button" onClick={() => toggleReminder(r.id)} aria-label={completed ? `Mark ${r.title} pending` : `Mark ${r.title} complete`} style={{ color: completed ? TEAL : '#A1A1A1' }} className="shrink-0 p-1">
                        {completed ? <CheckCircle2 className="size-6" /> : <Circle className="size-6" />}
                      </button>
                      <button type="button" onClick={() => deleteReminder(r.id)} aria-label={`Delete ${r.title}`} className="dashboard-reminder-delete transition-all text-red-400 hover:text-red-300 p-2"><Trash2 className="size-5" /></button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Split Kro View Section */}
        {activeView === 'splitkro' && (
          <SplitKro userId={userId} userName={userName || userEmail} />
        )}

        {/* AI Insights View Section */}
        {activeView === 'ai-insights' && (
          <section className="dashboard-ai-insights">
            <AIInsights expenses={expenses} currencySymbol={sym} />
          </section>
        )}

        {/* Footer */}
        <motion.div className="mt-12 py-6 text-center" style={{ borderTop: '1px solid rgba(0,242,234,0.08)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1 }}
        >
          <p className="flex items-center justify-center gap-2 text-sm" style={{ color: '#A1A1A1', ...monoFont }}>
            <span>Made with</span>
            <Heart className="size-4 text-red-500 fill-red-500 animate-pulse" />
            <span>by</span>
            <span className="font-semibold" style={{ color: TEAL, ...headingFont }}>Akshit Jaswal</span>
            <span>🚀</span>
          </p>
        </motion.div>
      </div>

      {/* Income Setup Overlay */}
      {!loading && salary === 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)' }}>
          <GlassCard spacing="lg" rounded="apple" className="welcome-income-card w-full max-w-md text-center" role="dialog" aria-modal="true" aria-labelledby="welcome-heading">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
              style={{ background: 'rgba(0,242,255,0.1)', border: '1px solid rgba(0,242,255,0.2)' }}>
              <Wallet className="size-10 text-[var(--ns-cyan)]" />
            </div>
            <h2 id="welcome-heading" className="text-3xl font-bold mb-3 text-white" style={headingFont}>Welcome to FinMax!</h2>
            <p className="max-w-sm mx-auto mb-7 text-sm leading-relaxed text-neutral-300" style={headingFont}>Enter your monthly income to calculate your savings and keep your budgets on track.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const val = (e.currentTarget.elements.namedItem('income') as HTMLInputElement).value;
              const now = new Date();
              const { error } = await api.addIncome({
                amount: parseFloat(val),
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                source: 'Initial Setup'
              });
              if (error) return toast.error(error);
              toast.success('Income set successfully');
              fetchData();
            }}>
              <div className="mb-6">
                <input name="income" type="number" min="0.01" step="0.01" inputMode="decimal" required placeholder="Monthly income (e.g. 50,000)"
                  className="welcome-income-input w-full text-center text-xl font-semibold py-4 px-4 focus:outline-none"
                  style={{ color: TEAL, ...headingFont }}
                />
              </div>
              <NeonButton type="submit" size="lg" className="w-full">Start tracking</NeonButton>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
            <Loader2 className="size-12" style={{ color: TEAL }} />
          </motion.div>
        </div>
      )}

      {/* Mobile More sheet keeps secondary tools easy to reach without crowding the tab bar. */}
      {showMoreMenu && <div className="dashboard-more-backdrop" onClick={() => setShowMoreMenu(false)}>
        <motion.section id="dashboard-more-dialog" className="dashboard-more-sheet" role="dialog" aria-modal="true" aria-labelledby="dashboard-more-title" onClick={event => event.stopPropagation()} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
          <div className="dashboard-more-handle" />
          <div className="dashboard-more-heading"><div><span>FINMAX MENU</span><h2 id="dashboard-more-title">More</h2></div><button type="button" onClick={() => setShowMoreMenu(false)} aria-label="Close More menu"><X className="size-5" /></button></div>
          <div className="dashboard-more-grid">
            {[
              { label: 'Top Spending', icon: Trophy, run: () => setActiveView('top-spending') },
              { label: 'Import Expenses', icon: Upload, run: () => { setShowMoreMenu(false); setShowImportWizard(true); } },
              { label: 'Reminders', icon: Bell, run: () => setActiveView('reminders') },
              { label: 'Split Kro', icon: TrendingUp, run: () => setActiveView('splitkro') },
              { label: 'Financial Tools', icon: Calculator, run: () => { setShowMoreMenu(false); setShowLoanCalculator(true); } },
              { label: 'Settings', icon: Settings, run: () => { setShowMoreMenu(false); setShowSettings(true); } },
              { label: 'Contact Developer', icon: HeadphonesIcon, run: () => { setShowMoreMenu(false); setShowContactDeveloper(true); } },
              { label: 'Log out', icon: LogOut, run: () => { setShowMoreMenu(false); onLogout(); } },
            ].map(({ label, icon: Icon, run }) => <button type="button" key={label} onClick={run} className="dashboard-more-item"><span><Icon className="size-5" /></span><b>{label}</b></button>)}
          </div>
        </motion.section>
      </div>}

      {/* Mobile Bottom Navigation */}
      <nav className="dashboard-bottom-nav fixed bottom-0 left-0 right-0 z-20 lg:hidden" aria-label="Primary navigation">
        <div className="dashboard-bottom-nav-inner">
          {[
            { id: 'dashboard' as const, label: 'Home', icon: Wallet },
            { id: 'ai-insights' as const, label: 'Insights', icon: Sparkles },
            { id: 'budgets' as const, label: 'Budgets', icon: Target },
            { id: 'expenses' as const, label: 'Expenses', icon: TrendingDown },
          ].map(({ id, label, icon: Icon }) => {
            const active = activeView === id;
            return <button type="button" key={id} onClick={() => setActiveView(id)} aria-current={active ? 'page' : undefined} className={`dashboard-bottom-nav-item${active ? ' is-active' : ''}`}>
              <Icon className="size-5" /><span>{label}</span>
            </button>;
          })}
          <button type="button" onClick={() => setShowMoreMenu(true)} aria-expanded={showMoreMenu} aria-controls="dashboard-more-dialog" className={`dashboard-bottom-nav-item${showMoreMenu ? ' is-active' : ''}`}>
            <MoreHorizontal className="size-5" /><span>More</span>
          </button>
        </div>
      </nav>

      {/* Modals Section */}
      {selectedExpense && (
        <ModalCard title="Transaction details" onClose={() => setSelectedExpense(null)}>
          <div className="space-y-5">
            <div className="rounded-xl border border-teal-300/[0.14] bg-teal-300/[0.05] p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-teal-200" style={monoFont}>Paid to</p>
              <p className="mt-1 break-words text-lg font-semibold text-white" style={headingFont}>{selectedExpense.title}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-rose-300" style={monoFont}>
                -{sym}{Number(selectedExpense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500" style={monoFont}>Category</p>
                <p className="mt-1 text-sm font-medium text-white" style={headingFont}>{selectedExpense.category}</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500" style={monoFont}>Transaction date</p>
                <p className="mt-1 text-sm font-medium text-white" style={headingFont}>{new Date(selectedExpense.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500" style={monoFont}>Statement description</p>
              <p className="mt-1 break-words text-sm leading-6 text-neutral-200" style={monoFont}>{selectedExpense.title}</p>
            </div>

            {selectedExpense.note && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500" style={monoFont}>Imported reference</p>
                <p className="mt-1 break-words text-sm leading-6 text-neutral-200" style={monoFont}>{selectedExpense.note}</p>
              </div>
            )}

            <p className="text-[11px] leading-5 text-neutral-500" style={monoFont}>
              UPI or bank reference details appear here when they were included in the imported transaction record.
            </p>
          </div>
        </ModalCard>
      )}

      {showAddExpense && (
        <ModalCard title="Add Expense" onClose={() => setShowAddExpense(false)}>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div><label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Category</label>
              <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} style={{ ...inputStyle }}>
                {CATEGORIES.map(c => <option key={c} style={{ background: '#0A0A0A' }}>{c}</option>)}
              </select></div>
            <div><label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Amount</label>
              <input type="number" step="0.01" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} required style={{ ...inputStyle }}
                onFocus={(e) => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.boxShadow = `0 0 14px rgba(0,242,234,0.15), inset 0 1px 0 rgba(255,255,255,0.08)`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,242,234,0.18)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.08)'; }}
              /></div>
            <div><label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Title</label>
              <input type="text" value={newExpense.title} onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })} required style={{ ...inputStyle }}
                onFocus={(e) => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.boxShadow = `0 0 14px rgba(0,242,234,0.15), inset 0 1px 0 rgba(255,255,255,0.08)`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,242,234,0.18)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.08)'; }}
              /></div>
            <div><label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Date</label>
              <input type="date" value={newExpense.date} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })} required style={{ ...inputStyle }}
                onFocus={(e) => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.boxShadow = `0 0 14px rgba(0,242,234,0.15), inset 0 1px 0 rgba(255,255,255,0.08)`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,242,234,0.18)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.08)'; }}
              /></div>
            <div className="flex gap-3 pt-2">
              <NeonButton type="submit" className="flex-1 py-2.5">Add Expense</NeonButton>
              <NeonButton variant="ghost" type="button" onClick={() => setShowAddExpense(false)}>Cancel</NeonButton>
            </div>
          </form>
        </ModalCard>
      )}

      {showAddReminder && (
        <ModalCard title="Add Reminder" onClose={() => setShowAddReminder(false)}>
          <form onSubmit={handleAddReminder} className="space-y-4">
            <div><label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Title</label>
              <input type="text" value={newReminder.title} onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })} required placeholder="e.g., Pay rent" style={{ ...inputStyle }}
                onFocus={(e) => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.boxShadow = `0 0 14px rgba(0,242,234,0.15), inset 0 1px 0 rgba(255,255,255,0.08)`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,242,234,0.18)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.08)'; }}
              /></div>
            <div><label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Due Date</label>
              <input type="date" value={newReminder.dueDate} onChange={(e) => setNewReminder({ ...newReminder, dueDate: e.target.value })} required style={{ ...inputStyle }}
                onFocus={(e) => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.boxShadow = `0 0 14px rgba(0,242,234,0.15), inset 0 1px 0 rgba(255,255,255,0.08)`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,242,234,0.18)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.08)'; }}
              /></div>
            <div className="flex gap-3 pt-2">
              <NeonButton type="submit" className="flex-1 py-2.5">Add Reminder</NeonButton>
              <NeonButton variant="ghost" type="button" onClick={() => setShowAddReminder(false)}>Cancel</NeonButton>
            </div>
          </form>
        </ModalCard>
      )}

      {showEditSalary && (
        <ModalCard title="Edit Monthly Income" onClose={() => setShowEditSalary(false)}>
          <form onSubmit={(e) => { e.preventDefault(); setShowEditSalary(false); }} className="space-y-4">
            <div><label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Monthly Income ({sym})</label>
              <input type="number" step="100" value={salary} onChange={(e) => setSalary(parseFloat(e.target.value))} required style={{ ...inputStyle }}
                onFocus={(e) => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.boxShadow = `0 0 14px rgba(0,242,234,0.15), inset 0 1px 0 rgba(255,255,255,0.08)`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,242,234,0.18)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.08)'; }}
              /></div>
            <div className="flex gap-3 pt-2">
              <NeonButton type="submit" className="flex-1 py-2.5">Save</NeonButton>
              <NeonButton variant="ghost" type="button" onClick={() => setShowEditSalary(false)}>Cancel</NeonButton>
            </div>
          </form>
        </ModalCard>
      )}

      {showAddBudget && (
        <ModalCard title="Add Budget" onClose={() => setShowAddBudget(false)}>
          <form onSubmit={handleAddBudget} className="space-y-4">
            <div><label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Category</label>
              <select value={newBudget.category} onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })} style={{ ...inputStyle }}>
                {CATEGORIES.map(c => <option key={c} style={{ background: '#0A0A0A' }}>{c}</option>)}
              </select></div>
            <div><label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Limit ({sym})</label>
              <input type="number" step="0.01" value={newBudget.limit} onChange={(e) => setNewBudget({ ...newBudget, limit: e.target.value })} required style={{ ...inputStyle }}
                onFocus={(e) => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.boxShadow = `0 0 14px rgba(0,242,234,0.15), inset 0 1px 0 rgba(255,255,255,0.08)`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,242,234,0.18)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.08)'; }}
              /></div>
            <div className="flex gap-3 pt-2">
              <NeonButton type="submit" className="flex-1 py-2.5">Add Budget</NeonButton>
              <NeonButton variant="ghost" type="button" onClick={() => setShowAddBudget(false)}>Cancel</NeonButton>
            </div>
          </form>
        </ModalCard>
      )}

      {showImportWizard && <Suspense fallback={<div className="dashboard-import-loading" role="status"><Loader2 className="size-6" />Loading import tools…</div>}>
        <DeferredImportWizard isOpen={showImportWizard} onClose={() => setShowImportWizard(false)} onDataChanged={fetchData} currency={sym} />
      </Suspense>}
      <LoanCalculator isOpen={showLoanCalculator} onClose={() => setShowLoanCalculator(false)} currencySymbol={sym} />
    </div>
  );
}
