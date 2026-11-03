import { supabase } from './supabase';

// Types
export interface SKGroup {
    id: string;
    name: string;
    type: string;
    created_by: string;
    created_at: string;
    members?: SKMember[];
}

export interface SKMember {
    id: string;
    group_id: string;
    user_id: string;
    display_name: string;
    email: string;
    joined_at: string;
}

export interface SKExpense {
    id: string;
    group_id: string;
    paid_by: string;
    total_amount: number;
    description: string;
    split_type: 'equal' | 'exact' | 'percentage';
    created_at: string;
    paid_by_name?: string;
    shares?: SKShare[];
}

export interface SKShare {
    id: string;
    expense_id: string;
    user_id: string;
    owed_amount: number;
    display_name?: string;
}

export interface SKSettlement {
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
    netBalance: number; // positive = others owe you; negative = you owe others
}

async function getUserId(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Not authenticated');
    return session.user.id;
}

async function getUserProfile(): Promise<{ id: string; email: string; displayName: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    return {
        id: session.user.id,
        email: session.user.email || '',
        displayName: session.user.user_metadata?.name || session.user.email || 'You',
    };
}

// Groups API
export const splitKroApi = {
    // Create a group and add creator as first member
    createGroup: async (name: string, type: string) => {
        try {
            const profile = await getUserProfile();

            // Insert group
            const { data: group, error: gErr } = await supabase
                .from('sk_groups')
                .insert([{ name, type, created_by: profile.id }])
                .select()
                .single();
            if (gErr) throw gErr;

            // Add creator as member
            const { error: mErr } = await supabase
                .from('sk_group_members')
                .insert([{
                    group_id: group.id,
                    user_id: profile.id,
                    display_name: profile.displayName,
                    email: profile.email,
                }]);
            if (mErr) throw mErr;

            return { data: group as SKGroup, error: null };
        } catch (e: any) {
            return { data: null, error: e.message as string };
        }
    },

    // Get all groups where the current user is a member (by user_id or email)
    getGroups: async () => {
        try {
            const profile = await getUserProfile();

            const { data: memberRows, error: mErr } = await supabase
                .from('sk_group_members')
                .select('group_id')
                .or(`user_id.eq.${profile.id},email.eq.${profile.email.toLowerCase()}`);
            if (mErr) throw mErr;

            if (!memberRows || memberRows.length === 0) return { data: [] as SKGroup[], error: null };

            const groupIds = Array.from(new Set(memberRows.map((r: any) => r.group_id)));
            const { data: groups, error: gErr } = await supabase
                .from('sk_groups')
                .select('*')
                .in('id', groupIds)
                .order('created_at', { ascending: false });
            if (gErr) throw gErr;

            return { data: groups as SKGroup[], error: null };
        } catch (e: any) {
            return { data: null, error: e.message as string };
        }
    },

    // Get all members of a group
    getGroupMembers: async (groupId: string) => {
        try {
            const { data, error } = await supabase
                .from('sk_group_members')
                .select('*')
                .eq('group_id', groupId)
                .order('joined_at', { ascending: true });
            if (error) throw error;
            return { data: data as SKMember[], error: null };
        } catch (e: any) {
            return { data: null, error: e.message as string };
        }
    },

    // Add a member by their email (they must already be a FinMax user)
    addMemberByEmail: async (groupId: string, email: string, displayName: string) => {
        try {
            const uid = await getUserId();

            // Validate that currentuser is in the group
            const { data: myMembership } = await supabase
                .from('sk_group_members')
                .select('id')
                .eq('group_id', groupId)
                .eq('user_id', uid)
                .single();
            if (!myMembership) throw new Error('You are not a member of this group');

            // Check if email already exists as member (by email field)
            const { data: existing } = await supabase
                .from('sk_group_members')
                .select('id')
                .eq('group_id', groupId)
                .eq('email', email.toLowerCase())
                .single();
            if (existing) throw new Error('This person is already in the group');

            // Add them — we store name + email. If they log in, they'll see the group via user_id.
            // For now, we add a placeholder user_id using a deterministic lookup via auth admin
            // (Since we can't query auth.users directly from client, we add by email + match on login)
            const { data, error } = await supabase
                .from('sk_group_members')
                .insert([{
                    group_id: groupId,
                    user_id: uid, // temporary — will be overridden when actual user joins
                    display_name: displayName || email,
                    email: email.toLowerCase(),
                }])
                .select()
                .single();
            if (error) throw error;

            return { data: data as SKMember, error: null };
        } catch (e: any) {
            return { data: null, error: e.message as string };
        }
    },

    // Add a member directly with a display name and optional email
    addMember: async (groupId: string, displayName: string, email: string = '') => {
        try {
            const { data, error } = await supabase
                .from('sk_group_members')
                .insert([{
                    group_id: groupId,
                    user_id: null, // Always null for added members; they get access via email-matching RLS
                    display_name: displayName,
                    email: email ? email.toLowerCase() : null,
                }])
                .select()
                .single();
            if (error) throw error;

            return { data: data as SKMember, error: null };
        } catch (e: any) {
            return { data: null, error: e.message as string };
        }
    },

    // Expenses API
    addExpense: async (
        groupId: string,
        paidByUserId: string,
        totalAmount: number,
        description: string,
        splitType: 'equal' | 'exact' | 'percentage',
        shares: { userId: string; owedAmount: number }[],
    ) => {
        try {
            // Insert expense
            const { data: expense, error: eErr } = await supabase
                .from('sk_expenses')
                .insert([{
                    group_id: groupId,
                    paid_by: paidByUserId,
                    total_amount: totalAmount,
                    description,
                    split_type: splitType,
                }])
                .select()
                .single();
            if (eErr) throw eErr;

            // Insert shares
            const shareRows = shares.map(s => ({
                expense_id: expense.id,
                user_id: s.userId,
                owed_amount: s.owedAmount,
            }));
            const { error: sErr } = await supabase.from('sk_expense_shares').insert(shareRows);
            if (sErr) throw sErr;

            return { data: expense as SKExpense, error: null };
        } catch (e: any) {
            return { data: null, error: e.message as string };
        }
    },

    // Get all expenses for a group, including shares
    getGroupExpenses: async (groupId: string) => {
        try {
            const { data: expenses, error: eErr } = await supabase
                .from('sk_expenses')
                .select('*')
                .eq('group_id', groupId)
                .order('created_at', { ascending: false });
            if (eErr) throw eErr;

            if (!expenses || expenses.length === 0) return { data: [] as SKExpense[], error: null };

            const expenseIds = expenses.map((e: any) => e.id);
            const { data: shares, error: sErr } = await supabase
                .from('sk_expense_shares')
                .select('*')
                .in('expense_id', expenseIds);
            if (sErr) throw sErr;

            const enriched: SKExpense[] = (expenses as any[]).map(exp => ({
                ...exp,
                total_amount: Number(exp.total_amount),
                shares: (shares || [])
                    .filter((s: any) => s.expense_id === exp.id)
                    .map((s: any) => ({ ...s, owed_amount: Number(s.owed_amount) })),
            }));

            return { data: enriched, error: null };
        } catch (e: any) {
            return { data: null, error: e.message as string };
        }
    },

    deleteExpense: async (expenseId: string) => {
        try {
            const { error } = await supabase.from('sk_expenses').delete().eq('id', expenseId);
            if (error) throw error;
            return { data: { success: true }, error: null };
        } catch (e: any) {
            return { data: null, error: e.message as string };
        }
    },

    // Balances calculation
    // Calculate net balance per member
    getBalances: async (groupId: string, members: SKMember[]): Promise<{ data: BalanceEntry[] | null; error: string | null }> => {
        try {
            const { data: expenses, error } = await splitKroApi.getGroupExpenses(groupId);
            if (error) throw new Error(error);

            // Initialise balance map for each member
            const balanceMap: Record<string, BalanceEntry> = {};
            members.forEach(m => {
                balanceMap[m.user_id] = {
                    userId: m.user_id,
                    displayName: m.display_name,
                    email: m.email,
                    totalPaid: 0,
                    totalOwed: 0,
                    netBalance: 0,
                };
            });

            (expenses || []).forEach(exp => {
                // Add total paid
                if (balanceMap[exp.paid_by]) {
                    balanceMap[exp.paid_by].totalPaid += exp.total_amount;
                }
                // Add owed amounts
                (exp.shares || []).forEach(share => {
                    if (balanceMap[share.user_id]) {
                        balanceMap[share.user_id].totalOwed += share.owed_amount;
                    }
                });
            });

            const result = Object.values(balanceMap).map(b => ({
                ...b,
                netBalance: b.totalPaid - b.totalOwed,
            }));

            return { data: result, error: null };
        } catch (e: any) {
            return { data: null, error: e.message };
        }
    },

    // Settlements API
    recordSettlement: async (groupId: string, fromUserId: string, toUserId: string, amount: number) => {
        try {
            const { data, error } = await supabase
                .from('sk_settlements')
                .insert([{ group_id: groupId, from_user: fromUserId, to_user: toUserId, amount }])
                .select()
                .single();
            if (error) throw error;

            // Also add a balancing expense: toUser paid fromUser
            const { error: eErr } = await supabase
                .from('sk_expenses')
                .insert([{
                    group_id: groupId,
                    paid_by: fromUserId,
                    total_amount: amount,
                    description: '✅ Settlement',
                    split_type: 'exact',
                }])
                .select()
                .single()
                .then(async ({ data: exp, error: expErr }) => {
                    if (expErr) return { error: expErr };
                    await supabase.from('sk_expense_shares').insert([{
                        expense_id: exp!.id,
                        user_id: toUserId,
                        owed_amount: amount,
                    }]);
                    return { error: null };
                });
            if (eErr) throw eErr;

            return { data: data as SKSettlement, error: null };
        } catch (e: any) {
            return { data: null, error: e.message as string };
        }
    },

    deleteGroup: async (groupId: string) => {
        try {
            const { error } = await supabase.from('sk_groups').delete().eq('id', groupId);
            if (error) throw error;
            return { data: { success: true }, error: null };
        } catch (e: any) {
            return { data: null, error: e.message as string };
        }
    },
};
