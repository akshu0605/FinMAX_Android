import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  AddBudgetInput,
  AddExpenseInput,
  AddIncomeInput,
  AddReminderInput,
  Budget,
  Expense,
  Income,
  Reminder,
  SplitKroGroup,
  getCurrentMonthYear,
} from '../types';
import { budgetsApi, expensesApi, incomeApi, remindersApi, splitKroApi } from '../api/client';

interface DataContextType {
  expenses: Expense[];
  budgets: Budget[];
  reminders: Reminder[];
  incomes: Income[];
  splitGroups: SplitKroGroup[];
  isLoading: boolean;
  isSyncing: boolean;
  isOfflineData: boolean;
  error: string | null;
  addExpense: (input: AddExpenseInput) => Promise<Expense>;
  updateExpense: (id: string, input: Partial<AddExpenseInput>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<boolean>;
  addBudget: (input: AddBudgetInput) => Promise<Budget>;
  updateBudget: (id: string, input: Partial<AddBudgetInput>) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<boolean>;
  addReminder: (input: AddReminderInput) => Promise<Reminder>;
  markReminderComplete: (id: string, complete?: boolean) => Promise<Reminder>;
  deleteReminder: (id: string) => Promise<boolean>;
  addIncome: (input: AddIncomeInput) => Promise<Income>;
  refreshAll: () => Promise<void>;
  refreshSplitGroups: () => Promise<void>;
  clearError: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const CACHE_KEY = 'finmax_offline_cache_v1';

interface CachedState {
  expenses: Expense[];
  budgets: Budget[];
  reminders: Reminder[];
  incomes: Income[];
  splitGroups: SplitKroGroup[];
  cachedAt: string;
}

const EMPTY_CACHE: CachedState = {
  expenses: [],
  budgets: [],
  reminders: [],
  incomes: [],
  splitGroups: [],
  cachedAt: '',
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [splitGroups, setSplitGroups] = useState<SplitKroGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<null | (() => void)>(null);

  const persistCache = useCallback(async (next: CachedState) => {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next));
  }, []);

  const readCache = useCallback(async (): Promise<CachedState> => {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return EMPTY_CACHE;
    try {
      const parsed = JSON.parse(raw) as CachedState;
      return parsed;
    } catch {
      return EMPTY_CACHE;
    }
  }, []);

  const refreshSplitGroups = useCallback(async () => {
    const groupsRes = await splitKroApi.getGroups();
    if (groupsRes.error) throw new Error(groupsRes.error);
    setSplitGroups(groupsRes.data || []);
  }, []);

  const refreshAll = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const current = getCurrentMonthYear();
      const [expRes, budRes, remRes, incRes, groupRes] = await Promise.all([
        expensesApi.getAll(),
        budgetsApi.getByMonth(current.month, current.year),
        remindersApi.getAll(),
        incomeApi.getByMonth(current.month, current.year),
        splitKroApi.getGroups(),
      ]);

      if (expRes.error) throw new Error(expRes.error);
      if (budRes.error) throw new Error(budRes.error);
      if (remRes.error) throw new Error(remRes.error);
      if (incRes.error) throw new Error(incRes.error);
      if (groupRes.error) throw new Error(groupRes.error);

      const nextCache: CachedState = {
        expenses: expRes.data?.expenses || [],
        budgets: budRes.data?.budgets || [],
        reminders: remRes.data?.reminders || [],
        incomes: incRes.data?.incomes || [],
        splitGroups: groupRes.data || [],
        cachedAt: new Date().toISOString(),
      };

      setExpenses(nextCache.expenses);
      setBudgets(nextCache.budgets);
      setReminders(nextCache.reminders);
      setIncomes(nextCache.incomes);
      setSplitGroups(nextCache.splitGroups);
      setIsOfflineData(false);
      await persistCache(nextCache);
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : 'Failed to refresh data';
      setError(message);

      const cached = await readCache();
      setExpenses(cached.expenses);
      setBudgets(cached.budgets);
      setReminders(cached.reminders);
      setIncomes(cached.incomes);
      setSplitGroups(cached.splitGroups);
      setIsOfflineData(cached.cachedAt.length > 0);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, persistCache, readCache]);

  useEffect(() => {
    if (!isAuthenticated) {
      setExpenses([]);
      setBudgets([]);
      setReminders([]);
      setIncomes([]);
      setSplitGroups([]);
      setIsOfflineData(false);
      setError(null);
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
      return;
    }

    void refreshAll();

    let mounted = true;
    void expensesApi.subscribe((nextExpenses) => {
      if (!mounted) return;
      setExpenses(nextExpenses);
    }).then((unsubscribe) => {
      if (!mounted) {
        unsubscribe();
      } else {
        unsubRef.current = unsubscribe;
      }
    }).catch(() => {});

    return () => {
      mounted = false;
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [isAuthenticated, refreshAll]);

  const addExpense = useCallback(async (input: AddExpenseInput) => {
    setIsSyncing(true);
    try {
      const response = await expensesApi.add(input);
      if (response.error || !response.data) throw new Error(response.error || 'Failed to add expense');
      setExpenses((prev) => [response.data!, ...prev]);
      return response.data;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const updateExpense = useCallback(async (id: string, input: Partial<AddExpenseInput>) => {
    setIsSyncing(true);
    try {
      const response = await expensesApi.update(id, input);
      if (response.error || !response.data) throw new Error(response.error || 'Failed to update expense');
      setExpenses((prev) => prev.map((item) => (item.id === id ? response.data! : item)));
      return response.data;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    setIsSyncing(true);
    try {
      const response = await expensesApi.delete(id);
      if (response.error) throw new Error(response.error);
      setExpenses((prev) => prev.filter((item) => item.id !== id));
      return true;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const addBudget = useCallback(async (input: AddBudgetInput) => {
    setIsSyncing(true);
    try {
      const response = await budgetsApi.add(input);
      if (response.error || !response.data) throw new Error(response.error || 'Failed to add budget');
      setBudgets((prev) => [response.data!, ...prev]);
      return response.data;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const updateBudget = useCallback(async (id: string, input: Partial<AddBudgetInput>) => {
    setIsSyncing(true);
    try {
      const response = await budgetsApi.update(id, input);
      if (response.error || !response.data) throw new Error(response.error || 'Failed to update budget');
      setBudgets((prev) => prev.map((item) => (item.id === id ? response.data! : item)));
      return response.data;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const deleteBudget = useCallback(async (id: string) => {
    setIsSyncing(true);
    try {
      const response = await budgetsApi.delete(id);
      if (response.error) throw new Error(response.error);
      setBudgets((prev) => prev.filter((item) => item.id !== id));
      return true;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const addReminder = useCallback(async (input: AddReminderInput) => {
    setIsSyncing(true);
    try {
      const response = await remindersApi.add(input);
      if (response.error || !response.data) throw new Error(response.error || 'Failed to add reminder');
      setReminders((prev) => [...prev, response.data!]);
      return response.data;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const markReminderComplete = useCallback(async (id: string, complete = true) => {
    setIsSyncing(true);
    try {
      const response = await remindersApi.markComplete(id, complete);
      if (response.error || !response.data) throw new Error(response.error || 'Failed to update reminder');
      setReminders((prev) => prev.map((item) => (item.id === id ? response.data! : item)));
      return response.data;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    setIsSyncing(true);
    try {
      const response = await remindersApi.delete(id);
      if (response.error) throw new Error(response.error);
      setReminders((prev) => prev.filter((item) => item.id !== id));
      return true;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const addIncome = useCallback(async (input: AddIncomeInput) => {
    setIsSyncing(true);
    try {
      const response = await incomeApi.add(input);
      if (response.error || !response.data) throw new Error(response.error || 'Failed to add income');
      setIncomes((prev) => [response.data!, ...prev]);
      return response.data;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<DataContextType>(() => ({
    expenses,
    budgets,
    reminders,
    incomes,
    splitGroups,
    isLoading,
    isSyncing,
    isOfflineData,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    addBudget,
    updateBudget,
    deleteBudget,
    addReminder,
    markReminderComplete,
    deleteReminder,
    addIncome,
    refreshAll,
    refreshSplitGroups,
    clearError,
  }), [
    expenses,
    budgets,
    reminders,
    incomes,
    splitGroups,
    isLoading,
    isSyncing,
    isOfflineData,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    addBudget,
    updateBudget,
    deleteBudget,
    addReminder,
    markReminderComplete,
    deleteReminder,
    addIncome,
    refreshAll,
    refreshSplitGroups,
    clearError,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used inside DataProvider');
  return context;
}
