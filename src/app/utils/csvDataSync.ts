import { supabase } from './supabase';

export type CsvEntityType = 'expense' | 'budget' | 'category' | 'transaction';

export interface CsvSyncResult {
  imported: number;
  skipped: number;
  errors: string[];
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
];

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

function escapeCsvValue(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(current);
      current = '';
      if (row.some(cell => cell.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some(cell => cell.trim() !== '')) rows.push(row);
  if (rows.length === 0) return [];

  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(cols => {
    const entry: Record<string, string> = {};
    headers.forEach((header, idx) => {
      entry[header] = (cols[idx] || '').trim();
    });
    return entry;
  });
}

export async function exportAllUserDataToCsv() {
  const uid = await getUserId();

  const [expensesRes, budgetsRes, categoriesRes, skExpenseRes] = await Promise.all([
    supabase.from('expenses').select('id,user_id,date,category,amount,title,note').eq('user_id', uid),
    supabase.from('budgets').select('id,user_id,category,allocated_amount,month,year').eq('user_id', uid),
    supabase.from('categories').select('id,user_id,name,type').eq('user_id', uid),
    supabase.from('sk_expenses').select('id,group_id,paid_by,total_amount,split_type,description'),
  ]);

  if (expensesRes.error) throw expensesRes.error;
  if (budgetsRes.error) throw budgetsRes.error;
  if (categoriesRes.error && categoriesRes.error.code !== 'PGRST116') throw categoriesRes.error;
  if (skExpenseRes.error) throw skExpenseRes.error;

  const skExpenses = skExpenseRes.data || [];
  const skExpenseIds = skExpenses.map((e: any) => e.id);
  let shares: any[] = [];
  if (skExpenseIds.length > 0) {
    const sharesRes = await supabase.from('sk_expense_shares').select('expense_id,user_id,owed_amount').in('expense_id', skExpenseIds);
    if (sharesRes.error) throw sharesRes.error;
    shares = sharesRes.data || [];
  }

  const lines = [CSV_COLUMNS.join(',')];

  (expensesRes.data || []).forEach((exp: any) => {
    lines.push([
      'expense',
      exp.id,
      exp.user_id,
      exp.date,
      exp.category,
      exp.amount,
      exp.title || exp.note || '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ].map(escapeCsvValue).join(','));
  });

  (budgetsRes.data || []).forEach((bud: any) => {
    lines.push([
      'budget',
      bud.id,
      bud.user_id,
      '',
      bud.category,
      '',
      '',
      bud.allocated_amount,
      `${bud.year}-${String(bud.month).padStart(2, '0')}`,
      '',
      '',
      '',
      '',
      '',
      '',
    ].map(escapeCsvValue).join(','));
  });

  (categoriesRes.data || []).forEach((cat: any) => {
    lines.push([
      'category',
      cat.id,
      cat.user_id,
      '',
      '',
      '',
      '',
      '',
      '',
      cat.name,
      cat.type,
      '',
      '',
      '',
      '',
    ].map(escapeCsvValue).join(','));
  });

  skExpenses.forEach((txn: any) => {
    const participants = shares
      .filter((s: any) => s.expense_id === txn.id)
      .map((s: any) => ({ user_id: s.user_id, owed_amount: Number(s.owed_amount) }));

    lines.push([
      'transaction',
      txn.id,
      '',
      '',
      '',
      txn.total_amount,
      txn.description || '',
      '',
      '',
      '',
      '',
      txn.group_id,
      txn.paid_by,
      txn.split_type,
      JSON.stringify(participants),
    ].map(escapeCsvValue).join(','));
  });

  return lines.join('\n');
}

export async function importUserDataFromCsv(content: string): Promise<CsvSyncResult> {
  const uid = await getUserId();
  const rows = parseCsv(content);

  const result: CsvSyncResult = { imported: 0, skipped: 0, errors: [] };
  const seenKeys = new Set<string>();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const line = index + 2;
    const type = (row.type || '').toLowerCase() as CsvEntityType;
    const key = `${type}:${row.id || ''}:${row.group_id || ''}:${row.month || ''}:${row.category || ''}`;

    if (!type) {
      result.errors.push(`Line ${line}: missing type`);
      result.skipped += 1;
      continue;
    }
    if (seenKeys.has(key)) {
      result.skipped += 1;
      continue;
    }
    seenKeys.add(key);

    try {
      if (type === 'expense') {
        if (!row.date || !row.category || !row.amount) throw new Error('missing date/category/amount');
        const amount = Number(row.amount);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('invalid amount');

        const payload = {
          user_id: uid,
          date: new Date(row.date).toISOString(),
          category: row.category,
          amount,
          title: row.description || 'Imported Expense',
          note: row.description || null,
        };
        const query = supabase.from('expenses').upsert([{ id: row.id || undefined, ...payload }], { onConflict: 'id' });
        const { error } = await query;
        if (error) throw error;
        result.imported += 1;
        continue;
      }

      if (type === 'budget') {
        if (!row.category || !row.limit || !row.month) throw new Error('missing category/limit/month');
        const [yearStr, monthStr] = row.month.split('-');
        const year = Number(yearStr);
        const month = Number(monthStr);
        const allocatedAmount = Number(row.limit);
        if (!year || !month || month < 1 || month > 12) throw new Error('invalid month format (expected YYYY-MM)');
        if (!Number.isFinite(allocatedAmount) || allocatedAmount <= 0) throw new Error('invalid limit');

        const payload = { user_id: uid, category: row.category, allocated_amount: allocatedAmount, year, month };
        const { error } = await supabase.from('budgets').upsert([{ id: row.id || undefined, ...payload }], { onConflict: 'id' });
        if (error) throw error;
        result.imported += 1;
        continue;
      }

      if (type === 'category') {
        if (!row.name || !row.category_type) throw new Error('missing name/category_type');
        const payload = { user_id: uid, name: row.name, type: row.category_type };
        const { error } = await supabase.from('categories').upsert([{ id: row.id || undefined, ...payload }], { onConflict: 'id' });
        if (error) throw error;
        result.imported += 1;
        continue;
      }

      if (type === 'transaction') {
        if (!row.group_id || !row.payer || !row.amount || !row.split_type) throw new Error('missing group_id/payer/amount/split_type');
        const totalAmount = Number(row.amount);
        if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new Error('invalid amount');
        const participants = JSON.parse(row.participants || '[]');
        if (!Array.isArray(participants) || participants.length === 0) throw new Error('participants must be a non-empty JSON array');

        const expensePayload = {
          id: row.id || undefined,
          group_id: row.group_id,
          paid_by: row.payer,
          total_amount: totalAmount,
          split_type: row.split_type,
          description: row.description || 'Imported Transaction',
        };
        const { data: expense, error: expErr } = await supabase.from('sk_expenses').upsert([expensePayload], { onConflict: 'id' }).select('id').single();
        if (expErr) throw expErr;

        const shareRows = participants.map((p: any) => ({
          expense_id: expense.id,
          user_id: p.user_id,
          owed_amount: Number(p.owed_amount),
        }));

        const { error: delErr } = await supabase.from('sk_expense_shares').delete().eq('expense_id', expense.id);
        if (delErr) throw delErr;
        const { error: shareErr } = await supabase.from('sk_expense_shares').insert(shareRows);
        if (shareErr) throw shareErr;

        result.imported += 1;
        continue;
      }

      throw new Error(`unsupported type '${type}'`);
    } catch (error: any) {
      result.errors.push(`Line ${line}: ${error.message || 'invalid row'}`);
      result.skipped += 1;
    }
  }

  return result;
}
