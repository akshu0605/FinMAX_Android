export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

export interface AuthResponse {
  session: AuthSession | null;
  error: string | null;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface SuccessResponse {
  success: boolean;
}

export interface Expense {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  note?: string | null;
  created_at?: string;
}

export interface AddExpenseInput {
  title: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface ExpenseFilters {
  category?: string;
  from?: string;
  to?: string;
}

export interface ExpensesResponse {
  expenses: Expense[];
  total: number;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  allocated_amount: number;
  month: number;
  year: number;
  created_at?: string;
}

export interface AddBudgetInput {
  category: string;
  allocatedAmount: number;
  month: number;
  year: number;
}

export interface BudgetsResponse {
  budgets: Budget[];
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  due_date: string;
  is_completed: boolean;
  amount?: number | null;
  created_at?: string;
}

export interface AddReminderInput {
  title: string;
  dueDate: string;
  amount?: number;
}

export interface RemindersResponse {
  reminders: Reminder[];
}

export interface Income {
  id: string;
  user_id: string;
  amount: number;
  month: number;
  year: number;
  source: string;
  created_at?: string;
}

export interface AddIncomeInput {
  amount: number;
  month: number;
  year: number;
  source: string;
}

export interface IncomesResponse {
  incomes: Income[];
}

export interface SplitKroGroup {
  id: string;
  name: string;
  type: string;
  created_by: string;
  created_at: string;
}

export interface SplitKroMember {
  id: string;
  group_id: string;
  user_id: string | null;
  display_name: string;
  email: string | null;
  joined_at: string;
}

export type SplitType = 'equal' | 'exact' | 'percentage';

export interface SplitKroExpenseShare {
  id: string;
  expense_id: string;
  user_id: string | null;
  owed_amount: number;
}

export interface SplitKroExpense {
  id: string;
  group_id: string;
  paid_by: string | null;
  total_amount: number;
  description: string;
  split_type: SplitType;
  created_at: string;
  shares: SplitKroExpenseShare[];
}

export interface SplitKroSettlement {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  settled_at: string;
}

export interface BalanceEntry {
  userId: string;
  displayName: string;
  email: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export interface SimplifiedTransaction {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  savings: number;
  savingsRate: number;
  monthlyBudget: number;
  budgetUsed: number;
  budgetRemaining: number;
  categoryBreakdown: Array<{ category: string; amount: number }>;
}

export interface MonthYear {
  month: number;
  year: number;
}

export function getCurrentMonthYear(): MonthYear {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}