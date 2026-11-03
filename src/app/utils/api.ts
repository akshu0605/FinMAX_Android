import { supabase } from './supabase';

/**
 * FinMax Supabase Database API
 * Direct client-side calls to Supabase tables.
 */

// Ensure scoped to user
async function getUserId() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Not authenticated');
    return session.user.id;
}

export const api = {
    // Income
    getIncomes: async (month?: number, year?: number) => {
        try {
            const uid = await getUserId();
            let query = supabase.from('incomes').select('*').eq('user_id', uid);

            if (month && year) {
                query = query.eq('month', month).eq('year', year);
            }

            const { data: incomes, error } = await query;
            if (error) throw error;
            return { data: { incomes }, error: null };
        } catch (e: any) { return { data: null, error: e.message }; }
    },
    addIncome: async (data: { amount: number; month: number; year: number; source: string }) => {
        try {
            const uid = await getUserId();
            const { data: newIncome, error } = await supabase.from('incomes').insert([{ user_id: uid, ...data }]).select().single();
            if (error) throw error;
            return { data: newIncome, error: null };
        } catch (e: any) { return { data: null, error: e.message }; }
    },

    // Expenses
    getExpenses: async (params?: { category?: string; from?: string; to?: string }) => {
        try {
            const uid = await getUserId();
            let query = supabase.from('expenses').select('*').eq('user_id', uid).order('date', { ascending: false });

            if (params?.category) {
                query = query.eq('category', params.category);
            }

            const { data: expenses, error } = await query;
            if (error) throw error;

            const total = expenses.reduce((acc: number, e: any) => acc + Number(e.amount), 0);
            return { data: { expenses, total }, error: null };
        } catch (e: any) { return { data: null, error: e.message }; }
    },
    addExpense: async (data: { title: string; amount: number; category: string; date: string; note?: string }) => {
        try {
            const uid = await getUserId();
            const { data: newExpense, error } = await supabase.from('expenses').insert([{ user_id: uid, ...data }]).select().single();
            if (error) throw error;
            return { data: newExpense, error: null };
        } catch (e: any) { return { data: null, error: e.message }; }
    },
    deleteExpense: async (id: string) => {
        try {
            const uid = await getUserId();
            const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', uid);
            if (error) throw error;
            return { data: { success: true }, error: null };
        } catch (e: any) { return { data: null, error: e.message }; }
    },

    // Budgets
    getBudgets: async (month?: number, year?: number) => {
        try {
            const uid = await getUserId();
            let query = supabase.from('budgets').select('*').eq('user_id', uid);
            if (month && year) {
                query = query.eq('month', month).eq('year', year);
            }
            const { data: budgets, error } = await query;
            if (error) throw error;
            // Map allocated_amount back to camelCase for the frontend
            const formattedBudgets = budgets.map(b => ({ ...b, allocatedAmount: Number(b.allocated_amount) }));
            return { data: { budgets: formattedBudgets }, error: null };
        } catch (e: any) { return { data: null, error: e.message }; }
    },
    addBudget: async (data: { category: string; allocatedAmount: number; month: number; year: number }) => {
        try {
            const uid = await getUserId();
            const insertData = {
                user_id: uid,
                category: data.category,
                allocated_amount: data.allocatedAmount,
                month: data.month,
                year: data.year
            };
            const { data: newBudget, error } = await supabase.from('budgets').insert([insertData]).select().single();
            if (error) throw error;
            return { data: { ...newBudget, allocatedAmount: Number(newBudget.allocated_amount) }, error: null };
        } catch (e: any) { return { data: null, error: e.message }; }
    },
    deleteBudget: async (id: string) => {
        try {
            const uid = await getUserId();
            const { error } = await supabase.from('budgets').delete().eq('id', id).eq('user_id', uid);
            if (error) throw error;
            return { data: { success: true }, error: null };
        } catch (e: any) { return { data: null, error: e.message }; }
    },

    // Reminders
    getReminders: async (status?: string) => {
        try {
            const uid = await getUserId();
            let query = supabase.from('reminders').select('*').eq('user_id', uid);
            if (status) {
                query = query.eq('is_completed', status === 'completed');
            }
            const { data: reminders, error } = await query;
            if (error) throw error;
            // Map back to camelCase
            const formattedReminders = reminders.map(r => ({ ...r, dueDate: r.due_date, isCompleted: r.is_completed }));
            return { data: { reminders: formattedReminders }, error: null };
        } catch (e: any) { return { data: null, error: e.message }; }
    },
    addReminder: async (data: { title: string; dueDate: string; amount?: number }) => {
        try {
            const uid = await getUserId();
            const insertData = {
                user_id: uid,
                title: data.title,
                due_date: data.dueDate,
                amount: data.amount,
                is_completed: false
            };
            const { data: newReminder, error } = await supabase.from('reminders').insert([insertData]).select().single();
            if (error) throw error;
            return { data: { ...newReminder, dueDate: newReminder.due_date, isCompleted: newReminder.is_completed }, error: null };
        } catch (e: any) { return { data: null, error: e.message }; }
    },
    deleteReminder: async (id: string) => {
        try {
            const uid = await getUserId();
            const { error } = await supabase.from('reminders').delete().eq('id', id).eq('user_id', uid);
            if (error) throw error;
            return { data: { success: true }, error: null };
        } catch (e: any) { return { data: null, error: e.message }; }
    },
    toggleReminder: async (id: string) => {
        try {
            const uid = await getUserId();
            // First get the current status
            const { data: current, error: getError } = await supabase.from('reminders').select('is_completed').eq('id', id).eq('user_id', uid).single();
            if (getError) throw getError;

            // Then flip it
            const { data: updated, error: updateError } = await supabase.from('reminders').update({ is_completed: !current.is_completed }).eq('id', id).eq('user_id', uid).select().single();
            if (updateError) throw updateError;

            return { data: { ...updated, dueDate: updated.due_date, isCompleted: updated.is_completed }, error: null };
        } catch (e: any) { return { data: null, error: e.message }; }
    },
};
