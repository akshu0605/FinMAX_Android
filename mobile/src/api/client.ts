import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import Papa from 'papaparse';
import {
  AddBudgetInput,
  AddExpenseInput,
  AddIncomeInput,
  AddReminderInput,
  ApiError,
  ApiResponse,
  AuthResponse,
  AuthSession,
  BalanceEntry,
  Budget,
  BudgetsResponse,
  Expense,
  ExpenseFilters,
  ExpensesResponse,
  Income,
  IncomesResponse,
  Reminder,
  RemindersResponse,
  SimplifiedTransaction,
  SplitKroExpense,
  SplitKroGroup,
  SplitKroMember,
  SplitKroSettlement,
  SplitType,
  SuccessResponse,
  User,
  getCurrentMonthYear,
} from '../types';
import { supabase } from './supabase';

export { supabase };

WebBrowser.maybeCompleteAuthSession();

function sessionToAuthSession(session: {
  user: { id: string; email?: string | null; phone?: string | null; user_metadata?: Record<string, unknown> };
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}): AuthSession {
  const metadataName = typeof session.user.user_metadata?.name === 'string'
    ? session.user.user_metadata.name
    : '';

  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? '',
      phone: session.user.phone,
      name: metadataName || session.user.email || session.user.phone || 'FinMax User',
    },
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
  };
}

async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user.id) {
    throw new ApiError(401, 'Not authenticated', error);
  }
  return data.session.user.id;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unexpected error';
}

export const authApi = {
  async signUp(email: string, password: string, name: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });

      if (error) return { session: null, error: error.message };
      if (!data.session) return { session: null, error: 'Account created. Verify your email to continue.' };
      return { session: sessionToAuthSession(data.session), error: null };
    } catch (error) {
      return { session: null, error: toErrorMessage(error) };
    }
  },

  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) return { session: null, error: error?.message || 'Unable to sign in' };
      return { session: sessionToAuthSession(data.session), error: null };
    } catch (error) {
      return { session: null, error: toErrorMessage(error) };
    }
  },

  async requestSmsOtp(phone: string): Promise<ApiResponse<SuccessResponse>> {
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) return { data: null, error: error.message };
      return { data: { success: true }, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async verifySmsOtp(phone: string, token: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      if (error || !data.session) return { session: null, error: error?.message || 'Invalid OTP' };
      return { session: sessionToAuthSession(data.session), error: null };
    } catch (error) {
      return { session: null, error: toErrorMessage(error) };
    }
  },

  async signInWithGoogle(): Promise<AuthResponse> {
    try {
      const redirectTo = makeRedirectUri({ scheme: 'com.finmax.mobile' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        return { session: null, error: error?.message || 'Google auth URL not available' };
      }

      const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
        return { session: null, error: 'Google sign-in cancelled' };
      }

      if (authResult.type === 'success' && authResult.url) {
        const parsed = Linking.parse(authResult.url);
        const queryCode = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
        if (queryCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(queryCode);
          if (exchangeError) return { session: null, error: exchangeError.message };
        }
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        return { session: null, error: sessionError?.message || 'Failed to establish Google session' };
      }
      return { session: sessionToAuthSession(sessionData.session), error: null };
    } catch (error) {
      return { session: null, error: toErrorMessage(error) };
    }
  },

  async getSession(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) return { session: null, error: error?.message || null };
      return { session: sessionToAuthSession(data.session), error: null };
    } catch (error) {
      return { session: null, error: toErrorMessage(error) };
    }
  },

  async refreshSession(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) return { session: null, error: error?.message || 'Failed to refresh session' };
      return { session: sessionToAuthSession(data.session), error: null };
    } catch (error) {
      return { session: null, error: toErrorMessage(error) };
    }
  },

  async signOut(): Promise<ApiResponse<SuccessResponse>> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { data: null, error: error.message };
      return { data: { success: true }, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },
};

export const expensesApi = {
  async getAll(filters?: ExpenseFilters): Promise<ApiResponse<ExpensesResponse>> {
    try {
      const uid = await getUserId();
      let query = supabase.from('expenses').select('*').eq('user_id', uid).order('date', { ascending: false });

      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.from) query = query.gte('date', filters.from);
      if (filters?.to) query = query.lte('date', filters.to);

      const { data, error } = await query;
      if (error) return { data: null, error: error.message };

      const expenses = (data || []) as Expense[];
      const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
      return { data: { expenses, total }, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async add(input: AddExpenseInput): Promise<ApiResponse<Expense>> {
    try {
      const uid = await getUserId();
      const { data, error } = await supabase.from('expenses').insert([{ user_id: uid, ...input }]).select().single();
      if (error) return { data: null, error: error.message };
      return { data: data as Expense, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async update(id: string, input: Partial<AddExpenseInput>): Promise<ApiResponse<Expense>> {
    try {
      const uid = await getUserId();
      const { data, error } = await supabase
        .from('expenses')
        .update(input)
        .eq('id', id)
        .eq('user_id', uid)
        .select()
        .single();
      if (error) return { data: null, error: error.message };
      return { data: data as Expense, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async delete(id: string): Promise<ApiResponse<SuccessResponse>> {
    try {
      const uid = await getUserId();
      const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', uid);
      if (error) return { data: null, error: error.message };
      return { data: { success: true }, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async subscribe(onUpdate: (expenses: Expense[]) => void): Promise<() => void> {
    const uid = await getUserId();
    const channel = supabase
      .channel(`expenses-changes-${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${uid}` },
        async () => {
          const response = await this.getAll();
          if (response.data) onUpdate(response.data.expenses);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};

export const budgetsApi = {
  async getByMonth(month?: number, year?: number): Promise<ApiResponse<BudgetsResponse>> {
    try {
      const uid = await getUserId();
      const current = getCurrentMonthYear();
      const qMonth = month ?? current.month;
      const qYear = year ?? current.year;

      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', uid)
        .eq('month', qMonth)
        .eq('year', qYear)
        .order('created_at', { ascending: false });

      if (error) return { data: null, error: error.message };
      return { data: { budgets: (data || []) as Budget[] }, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async add(input: AddBudgetInput): Promise<ApiResponse<Budget>> {
    try {
      const uid = await getUserId();
      const payload = {
        user_id: uid,
        category: input.category,
        allocated_amount: input.allocatedAmount,
        month: input.month,
        year: input.year,
      };
      const { data, error } = await supabase.from('budgets').insert([payload]).select().single();
      if (error) return { data: null, error: error.message };
      return { data: data as Budget, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async update(id: string, input: Partial<AddBudgetInput>): Promise<ApiResponse<Budget>> {
    try {
      const uid = await getUserId();
      const patch: Record<string, number | string> = {};
      if (typeof input.category === 'string') patch.category = input.category;
      if (typeof input.allocatedAmount === 'number') patch.allocated_amount = input.allocatedAmount;
      if (typeof input.month === 'number') patch.month = input.month;
      if (typeof input.year === 'number') patch.year = input.year;

      const { data, error } = await supabase
        .from('budgets')
        .update(patch)
        .eq('id', id)
        .eq('user_id', uid)
        .select()
        .single();
      if (error) return { data: null, error: error.message };
      return { data: data as Budget, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async delete(id: string): Promise<ApiResponse<SuccessResponse>> {
    try {
      const uid = await getUserId();
      const { error } = await supabase.from('budgets').delete().eq('id', id).eq('user_id', uid);
      if (error) return { data: null, error: error.message };
      return { data: { success: true }, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },
};

export const remindersApi = {
  async getAll(): Promise<ApiResponse<RemindersResponse>> {
    try {
      const uid = await getUserId();
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', uid)
        .order('due_date', { ascending: true });
      if (error) return { data: null, error: error.message };
      return { data: { reminders: (data || []) as Reminder[] }, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async add(input: AddReminderInput): Promise<ApiResponse<Reminder>> {
    try {
      const uid = await getUserId();
      const payload = {
        user_id: uid,
        title: input.title,
        due_date: input.dueDate,
        amount: input.amount,
        is_completed: false,
      };
      const { data, error } = await supabase.from('reminders').insert([payload]).select().single();
      if (error) return { data: null, error: error.message };
      return { data: data as Reminder, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async markComplete(id: string, complete = true): Promise<ApiResponse<Reminder>> {
    try {
      const uid = await getUserId();
      const { data, error } = await supabase
        .from('reminders')
        .update({ is_completed: complete })
        .eq('id', id)
        .eq('user_id', uid)
        .select()
        .single();
      if (error) return { data: null, error: error.message };
      return { data: data as Reminder, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async delete(id: string): Promise<ApiResponse<SuccessResponse>> {
    try {
      const uid = await getUserId();
      const { error } = await supabase.from('reminders').delete().eq('id', id).eq('user_id', uid);
      if (error) return { data: null, error: error.message };
      return { data: { success: true }, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },
};

export const incomeApi = {
  async getByMonth(month?: number, year?: number): Promise<ApiResponse<IncomesResponse>> {
    try {
      const uid = await getUserId();
      const current = getCurrentMonthYear();
      const qMonth = month ?? current.month;
      const qYear = year ?? current.year;

      const { data, error } = await supabase
        .from('incomes')
        .select('*')
        .eq('user_id', uid)
        .eq('month', qMonth)
        .eq('year', qYear)
        .order('created_at', { ascending: false });
      if (error) return { data: null, error: error.message };
      return { data: { incomes: (data || []) as Income[] }, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async add(input: AddIncomeInput): Promise<ApiResponse<Income>> {
    try {
      const uid = await getUserId();
      const { data, error } = await supabase.from('incomes').insert([{ user_id: uid, ...input }]).select().single();
      if (error) return { data: null, error: error.message };
      return { data: data as Income, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },
};

export const splitKroApi = {
  async createGroup(name: string, type: string): Promise<ApiResponse<SplitKroGroup>> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return { data: null, error: 'Not authenticated' };

      const { data: group, error: groupError } = await supabase
        .from('sk_groups')
        .insert([{ name, type, created_by: user.id }])
        .select()
        .single();
      if (groupError) return { data: null, error: groupError.message };

      const { error: memberError } = await supabase.from('sk_group_members').insert([
        {
          group_id: group.id,
          user_id: user.id,
          display_name: (user.user_metadata?.name as string) || user.email || 'You',
          email: user.email?.toLowerCase() || null,
        },
      ]);
      if (memberError) return { data: null, error: memberError.message };

      return { data: group as SplitKroGroup, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async getGroups(): Promise<ApiResponse<SplitKroGroup[]>> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return { data: [], error: null };

      const { data: memberRows, error: memberError } = await supabase
        .from('sk_group_members')
        .select('group_id')
        .or(`user_id.eq.${user.id},email.eq.${(user.email || '').toLowerCase()}`);
      if (memberError) return { data: null, error: memberError.message };
      if (!memberRows || memberRows.length === 0) return { data: [], error: null };

      const groupIds = Array.from(new Set(memberRows.map((row) => row.group_id as string)));
      const { data: groups, error: groupsError } = await supabase
        .from('sk_groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });
      if (groupsError) return { data: null, error: groupsError.message };
      return { data: (groups || []) as SplitKroGroup[], error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async deleteGroup(groupId: string): Promise<ApiResponse<SuccessResponse>> {
    try {
      const { error } = await supabase.from('sk_groups').delete().eq('id', groupId);
      if (error) return { data: null, error: error.message };
      return { data: { success: true }, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async getGroupMembers(groupId: string): Promise<ApiResponse<SplitKroMember[]>> {
    try {
      const { data, error } = await supabase
        .from('sk_group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });
      if (error) return { data: null, error: error.message };
      return { data: (data || []) as SplitKroMember[], error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async addMember(groupId: string, displayName: string, email?: string): Promise<ApiResponse<SplitKroMember>> {
    try {
      const { data, error } = await supabase
        .from('sk_group_members')
        .insert([
          {
            group_id: groupId,
            user_id: null,
            display_name: displayName,
            email: email ? email.toLowerCase() : null,
          },
        ])
        .select()
        .single();
      if (error) return { data: null, error: error.message };
      return { data: data as SplitKroMember, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async addExpense(
    groupId: string,
    paidByUserId: string,
    totalAmount: number,
    description: string,
    splitType: SplitType,
    shares: Array<{ userId: string | null; owedAmount: number }>,
  ): Promise<ApiResponse<SplitKroExpense>> {
    try {
      const { data: expense, error: expenseError } = await supabase
        .from('sk_expenses')
        .insert([
          {
            group_id: groupId,
            paid_by: paidByUserId,
            total_amount: totalAmount,
            description,
            split_type: splitType,
          },
        ])
        .select()
        .single();
      if (expenseError) return { data: null, error: expenseError.message };

      const shareRows = shares.map((share) => ({
        expense_id: expense.id,
        user_id: share.userId,
        owed_amount: share.owedAmount,
      }));
      const { error: shareError } = await supabase.from('sk_expense_shares').insert(shareRows);
      if (shareError) return { data: null, error: shareError.message };

      return {
        data: {
          ...(expense as Omit<SplitKroExpense, 'shares'>),
          total_amount: Number((expense as { total_amount: number }).total_amount),
          shares: shareRows.map((share, index) => ({
            id: `temp-${index}`,
            expense_id: share.expense_id,
            user_id: share.user_id,
            owed_amount: Number(share.owed_amount),
          })),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async deleteExpense(expenseId: string): Promise<ApiResponse<SuccessResponse>> {
    try {
      const { error } = await supabase.from('sk_expenses').delete().eq('id', expenseId);
      if (error) return { data: null, error: error.message };
      return { data: { success: true }, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async getGroupExpenses(groupId: string): Promise<ApiResponse<SplitKroExpense[]>> {
    try {
      const { data: expenses, error: expenseError } = await supabase
        .from('sk_expenses')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      if (expenseError) return { data: null, error: expenseError.message };
      if (!expenses || expenses.length === 0) return { data: [], error: null };

      const expenseIds = expenses.map((expense) => expense.id as string);
      const { data: shares, error: shareError } = await supabase
        .from('sk_expense_shares')
        .select('*')
        .in('expense_id', expenseIds);
      if (shareError) return { data: null, error: shareError.message };

      const mapped = expenses.map((expense) => {
        const expenseShares = (shares || []).filter((share) => share.expense_id === expense.id);
        return {
          ...(expense as Omit<SplitKroExpense, 'shares' | 'total_amount'>),
          total_amount: Number(expense.total_amount),
          shares: expenseShares.map((share) => ({
            ...(share as Omit<SplitKroExpense['shares'][number], 'owed_amount'>),
            owed_amount: Number(share.owed_amount),
          })),
        } as SplitKroExpense;
      });
      return { data: mapped, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async getBalances(groupId: string, members: SplitKroMember[]): Promise<ApiResponse<BalanceEntry[]>> {
    try {
      const expensesResponse = await this.getGroupExpenses(groupId);
      if (expensesResponse.error || !expensesResponse.data) {
        return { data: null, error: expensesResponse.error || 'Unable to fetch expenses' };
      }

      const balances = new Map<string, BalanceEntry>();
      members.forEach((member) => {
        const memberKey = member.user_id || member.id;
        balances.set(memberKey, {
          userId: memberKey,
          displayName: member.display_name,
          email: member.email || '',
          totalPaid: 0,
          totalOwed: 0,
          netBalance: 0,
        });
      });

      expensesResponse.data.forEach((expense) => {
        const payerKey = expense.paid_by || '';
        const payer = balances.get(payerKey);
        if (payer) payer.totalPaid += Number(expense.total_amount);

        expense.shares.forEach((share) => {
          const shareKey = share.user_id || '';
          const entry = balances.get(shareKey);
          if (entry) entry.totalOwed += Number(share.owed_amount);
        });
      });

      const results = Array.from(balances.values()).map((entry) => ({
        ...entry,
        netBalance: Number((entry.totalPaid - entry.totalOwed).toFixed(2)),
      }));
      return { data: results, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async recordSettlement(groupId: string, fromUserId: string, toUserId: string, amount: number): Promise<ApiResponse<SplitKroSettlement>> {
    try {
      const { data: settlement, error: settlementError } = await supabase
        .from('sk_settlements')
        .insert([
          {
            group_id: groupId,
            from_user: fromUserId,
            to_user: toUserId,
            amount,
          },
        ])
        .select()
        .single();
      if (settlementError) return { data: null, error: settlementError.message };

      const expenseResult = await this.addExpense(groupId, fromUserId, amount, 'Settlement', 'exact', [
        { userId: toUserId, owedAmount: amount },
      ]);
      if (expenseResult.error) return { data: null, error: expenseResult.error };

      return { data: settlement as SplitKroSettlement, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },
};

export function simplifyDebts(
  balances: Array<{ userId: string; displayName: string; netBalance: number }>,
): SimplifiedTransaction[] {
  const EPSILON = 0.01;
  const participants = balances
    .map((item) => ({ ...item, balance: item.netBalance }))
    .filter((item) => Math.abs(item.balance) > EPSILON);

  const transactions: SimplifiedTransaction[] = [];

  while (participants.length >= 2) {
    participants.sort((a, b) => b.balance - a.balance);
    const creditor = participants[0];
    const debtor = participants[participants.length - 1];

    if (creditor.balance <= EPSILON || debtor.balance >= -EPSILON) break;

    const amount = Math.min(creditor.balance, -debtor.balance);
    const rounded = Number(amount.toFixed(2));

    transactions.push({
      from: debtor.userId,
      fromName: debtor.displayName,
      to: creditor.userId,
      toName: creditor.displayName,
      amount: rounded,
    });

    creditor.balance -= amount;
    debtor.balance += amount;

    for (let index = participants.length - 1; index >= 0; index -= 1) {
      if (Math.abs(participants[index].balance) <= EPSILON) participants.splice(index, 1);
    }
  }

  return transactions;
}

const CSV_COLUMNS = [
  'type',
  'id',
  'user_id',
  'date',
  'category',
  'amount',
  'description',
  'limit',
  'month',
  'name',
  'category_type',
  'group_id',
  'payer',
  'split_type',
  'participants',
] as const;

type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

export const dataTransferApi = {
  async exportAllUserDataToCsv(): Promise<ApiResponse<string>> {
    try {
      const uid = await getUserId();
      const [expensesRes, budgetsRes, skExpensesRes] = await Promise.all([
        supabase.from('expenses').select('id,user_id,date,category,amount,title,note').eq('user_id', uid),
        supabase.from('budgets').select('id,user_id,category,allocated_amount,month,year').eq('user_id', uid),
        supabase.from('sk_expenses').select('id,group_id,paid_by,total_amount,split_type,description'),
      ]);

      if (expensesRes.error) return { data: null, error: expensesRes.error.message };
      if (budgetsRes.error) return { data: null, error: budgetsRes.error.message };
      if (skExpensesRes.error) return { data: null, error: skExpensesRes.error.message };

      const skExpenses = skExpensesRes.data || [];
      const skIds = skExpenses.map((item) => item.id as string);
      const sharesRes = skIds.length > 0
        ? await supabase.from('sk_expense_shares').select('expense_id,user_id,owed_amount').in('expense_id', skIds)
        : { data: [], error: null as string | null };

      if (sharesRes.error) {
        const errorMessage = typeof sharesRes.error === 'string' ? sharesRes.error : sharesRes.error.message;
        return { data: null, error: errorMessage };
      }

      const rows: CsvRow[] = [];

      (expensesRes.data || []).forEach((expense) => {
        rows.push({
          type: 'expense',
          id: String(expense.id),
          user_id: String(expense.user_id),
          date: String(expense.date),
          category: String(expense.category),
          amount: String(expense.amount),
          description: String(expense.title || expense.note || ''),
          limit: '',
          month: '',
          name: '',
          category_type: '',
          group_id: '',
          payer: '',
          split_type: '',
          participants: '',
        });
      });

      (budgetsRes.data || []).forEach((budget) => {
        rows.push({
          type: 'budget',
          id: String(budget.id),
          user_id: String(budget.user_id),
          date: '',
          category: String(budget.category),
          amount: '',
          description: '',
          limit: String(budget.allocated_amount),
          month: `${budget.year}-${String(budget.month).padStart(2, '0')}`,
          name: '',
          category_type: '',
          group_id: '',
          payer: '',
          split_type: '',
          participants: '',
        });
      });

      skExpenses.forEach((expense) => {
        const participants = (sharesRes.data || [])
          .filter((share) => share.expense_id === expense.id)
          .map((share) => ({ user_id: share.user_id, owed_amount: Number(share.owed_amount) }));

        rows.push({
          type: 'transaction',
          id: String(expense.id),
          user_id: '',
          date: '',
          category: '',
          amount: String(expense.total_amount),
          description: String(expense.description || ''),
          limit: '',
          month: '',
          name: '',
          category_type: '',
          group_id: String(expense.group_id || ''),
          payer: String(expense.paid_by || ''),
          split_type: String(expense.split_type || ''),
          participants: JSON.stringify(participants),
        });
      });

      const csv = Papa.unparse(rows, { columns: [...CSV_COLUMNS] });
      return { data: csv, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async shareCsvExport(): Promise<ApiResponse<SuccessResponse>> {
    const csvResult = await this.exportAllUserDataToCsv();
    if (csvResult.error || !csvResult.data) return { data: null, error: csvResult.error || 'Export failed' };

    const outputPath = `${FileSystem.cacheDirectory}finmax-export-${new Date().toISOString().slice(0, 10)}.csv`;
    await FileSystem.writeAsStringAsync(outputPath, csvResult.data, { encoding: FileSystem.EncodingType.UTF8 });

    if (!(await Sharing.isAvailableAsync())) return { data: null, error: 'Sharing is not available on this device' };
    await Sharing.shareAsync(outputPath, { mimeType: 'text/csv', dialogTitle: 'Export FinMax CSV' });
    return { data: { success: true }, error: null };
  },

  async importUserDataFromCsvText(content: string): Promise<ApiResponse<{ imported: number; skipped: number; errors: string[] }>> {
    try {
      const uid = await getUserId();
      const parsed = Papa.parse<CsvRow>(content, { header: true, skipEmptyLines: true });
      if (parsed.errors.length > 0) return { data: null, error: parsed.errors[0].message };

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let index = 0; index < parsed.data.length; index += 1) {
        const row = parsed.data[index];
        const line = index + 2;

        try {
          const type = row.type?.toLowerCase();
          if (type === 'expense') {
            const amount = Number(row.amount);
            if (!row.date || !row.category || !Number.isFinite(amount) || amount <= 0) throw new Error('Invalid expense row');
            const payload = {
              id: row.id || undefined,
              user_id: uid,
              date: new Date(row.date).toISOString(),
              category: row.category,
              amount,
              title: row.description || 'Imported Expense',
              note: row.description || null,
            };
            const { error } = await supabase.from('expenses').upsert([payload], { onConflict: 'id' });
            if (error) throw new Error(error.message);
            imported += 1;
            continue;
          }

          if (type === 'budget') {
            const [yearText, monthText] = row.month.split('-');
            const year = Number(yearText);
            const month = Number(monthText);
            const limit = Number(row.limit);
            if (!row.category || !Number.isFinite(limit) || limit <= 0 || month < 1 || month > 12 || !year) {
              throw new Error('Invalid budget row');
            }
            const payload = {
              id: row.id || undefined,
              user_id: uid,
              category: row.category,
              allocated_amount: limit,
              month,
              year,
            };
            const { error } = await supabase.from('budgets').upsert([payload], { onConflict: 'id' });
            if (error) throw new Error(error.message);
            imported += 1;
            continue;
          }

          if (type === 'transaction') {
            const amount = Number(row.amount);
            if (!row.group_id || !row.payer || !Number.isFinite(amount) || amount <= 0) throw new Error('Invalid split transaction row');

            const { data: expense, error: expenseError } = await supabase
              .from('sk_expenses')
              .upsert([
                {
                  id: row.id || undefined,
                  group_id: row.group_id,
                  paid_by: row.payer,
                  total_amount: amount,
                  split_type: row.split_type || 'equal',
                  description: row.description || 'Imported transaction',
                },
              ], { onConflict: 'id' })
              .select('id')
              .single();
            if (expenseError || !expense) throw new Error(expenseError?.message || 'Failed to import split expense');

            const participants = row.participants
              ? (JSON.parse(row.participants) as Array<{ user_id: string | null; owed_amount: number }>)
              : [];

            if (participants.length > 0) {
              const { error: deleteError } = await supabase.from('sk_expense_shares').delete().eq('expense_id', expense.id);
              if (deleteError) throw new Error(deleteError.message);

              const shareRows = participants.map((participant) => ({
                expense_id: expense.id,
                user_id: participant.user_id,
                owed_amount: Number(participant.owed_amount),
              }));
              const { error: shareError } = await supabase.from('sk_expense_shares').insert(shareRows);
              if (shareError) throw new Error(shareError.message);
            }

            imported += 1;
            continue;
          }

          skipped += 1;
          errors.push(`Line ${line}: unsupported type`);
        } catch (error) {
          skipped += 1;
          errors.push(`Line ${line}: ${toErrorMessage(error)}`);
        }
      }

      return { data: { imported, skipped, errors }, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async importUserDataFromCsvFile(): Promise<ApiResponse<{ imported: number; skipped: number; errors: string[] }>> {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
      if (picked.canceled || picked.assets.length === 0) return { data: { imported: 0, skipped: 0, errors: [] }, error: null };

      const content = await FileSystem.readAsStringAsync(picked.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      return await this.importUserDataFromCsvText(content);
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async createJsonBackup(): Promise<ApiResponse<{ path: string }>> {
    try {
      const current = getCurrentMonthYear();
      const [expenses, budgets, reminders, incomes, groups] = await Promise.all([
        expensesApi.getAll(),
        budgetsApi.getByMonth(current.month, current.year),
        remindersApi.getAll(),
        incomeApi.getByMonth(current.month, current.year),
        splitKroApi.getGroups(),
      ]);

      if (expenses.error) return { data: null, error: expenses.error };
      if (budgets.error) return { data: null, error: budgets.error };
      if (reminders.error) return { data: null, error: reminders.error };
      if (incomes.error) return { data: null, error: incomes.error };
      if (groups.error) return { data: null, error: groups.error };

      const payload = {
        createdAt: new Date().toISOString(),
        schemaVersion: 1,
        expenses: expenses.data?.expenses || [],
        budgets: budgets.data?.budgets || [],
        reminders: reminders.data?.reminders || [],
        incomes: incomes.data?.incomes || [],
        splitGroups: groups.data || [],
      };

      const backupPath = `${FileSystem.cacheDirectory}finmax-backup-${new Date().toISOString().slice(0, 10)}.json`;
      await FileSystem.writeAsStringAsync(backupPath, JSON.stringify(payload), { encoding: FileSystem.EncodingType.UTF8 });
      return { data: { path: backupPath }, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },

  async shareJsonBackup(): Promise<ApiResponse<SuccessResponse>> {
    const result = await this.createJsonBackup();
    if (result.error || !result.data) return { data: null, error: result.error || 'Backup failed' };
    if (!(await Sharing.isAvailableAsync())) return { data: null, error: 'Sharing is not available on this device' };
    await Sharing.shareAsync(result.data.path, { mimeType: 'application/json', dialogTitle: 'Export FinMax Backup' });
    return { data: { success: true }, error: null };
  },

  async restoreJsonBackupFile(): Promise<ApiResponse<SuccessResponse>> {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (picked.canceled || picked.assets.length === 0) return { data: { success: false }, error: 'Restore canceled' };

      const content = await FileSystem.readAsStringAsync(picked.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const payload = JSON.parse(content) as { expenses?: Expense[]; budgets?: Budget[]; reminders?: Reminder[]; incomes?: Income[] };
      const uid = await getUserId();

      if (Array.isArray(payload.expenses) && payload.expenses.length > 0) {
        const rows = payload.expenses.map((item) => ({ ...item, user_id: uid }));
        const { error } = await supabase.from('expenses').upsert(rows, { onConflict: 'id' });
        if (error) return { data: null, error: error.message };
      }
      if (Array.isArray(payload.budgets) && payload.budgets.length > 0) {
        const rows = payload.budgets.map((item) => ({ ...item, user_id: uid }));
        const { error } = await supabase.from('budgets').upsert(rows, { onConflict: 'id' });
        if (error) return { data: null, error: error.message };
      }
      if (Array.isArray(payload.reminders) && payload.reminders.length > 0) {
        const rows = payload.reminders.map((item) => ({ ...item, user_id: uid }));
        const { error } = await supabase.from('reminders').upsert(rows, { onConflict: 'id' });
        if (error) return { data: null, error: error.message };
      }
      if (Array.isArray(payload.incomes) && payload.incomes.length > 0) {
        const rows = payload.incomes.map((item) => ({ ...item, user_id: uid }));
        const { error } = await supabase.from('incomes').upsert(rows, { onConflict: 'id' });
        if (error) return { data: null, error: error.message };
      }

      return { data: { success: true }, error: null };
    } catch (error) {
      return { data: null, error: toErrorMessage(error) };
    }
  },
};

export async function getAllData() {
  const current = getCurrentMonthYear();
  const [expenses, budgets, reminders, incomes] = await Promise.all([
    expensesApi.getAll(),
    budgetsApi.getByMonth(current.month, current.year),
    remindersApi.getAll(),
    incomeApi.getByMonth(current.month, current.year),
  ]);

  return {
    expenses: expenses.data?.expenses || [],
    budgets: budgets.data?.budgets || [],
    reminders: reminders.data?.reminders || [],
    incomes: incomes.data?.incomes || [],
    error: expenses.error || budgets.error || reminders.error || incomes.error || null,
  };
}
