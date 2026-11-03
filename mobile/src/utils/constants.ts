export const COLORS = {
  primary: '#00F2EA',
  secondary: '#00b8b3',
  error: '#FF6B6B',
  success: '#10B981',
  warning: '#FBBF24',
  background: '#050607',
  surface: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF',
  textSecondary: '#A1A1A1',
  border: 'rgba(0, 242, 234, 0.20)',
};

export const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Healthcare',
  'Other',
];

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
} as const;

export type Currency = keyof typeof CURRENCY_SYMBOLS;

export const formatCurrency = (amount: number, currency: Currency = 'INR'): string => {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (value: string | Date): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const getCategoryColor = (category: string): string => {
  const map: Record<string, string> = {
    'Food & Dining': '#F97373',
    Transportation: '#38BDF8',
    Entertainment: '#F59E0B',
    Shopping: '#A78BFA',
    Bills: '#FB7185',
    Healthcare: '#34D399',
    Other: '#9CA3AF',
  };
  return map[category] || '#9CA3AF';
};

export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const getCurrentMonthYear = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};
