import React, { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useData } from '../context/DataContext';
import { AddExpenseInput, Expense } from '../types';
import { CATEGORIES, COLORS, formatCurrency } from '../utils/constants';

export function ExpensesScreen() {
  const { expenses, addExpense, updateExpense, deleteExpense, isSyncing } = useData();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const total = useMemo(() => expenses.reduce((sum, expense) => sum + Number(expense.amount), 0), [expenses]);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setCategory(CATEGORIES[0]);
    setDate(new Date().toISOString().slice(0, 10));
    setNote('');
    setEditingExpenseId(null);
  };

  const onSubmit = async () => {
    const parsedAmount = Number(amount);
    if (!title.trim()) return Alert.alert('Validation', 'Title is required');
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return Alert.alert('Validation', 'Amount must be positive');

    const payload: AddExpenseInput = {
      title: title.trim(),
      amount: parsedAmount,
      category,
      date: new Date(date).toISOString(),
      note: note.trim() || undefined,
    };

    try {
      if (editingExpenseId) {
        await updateExpense(editingExpenseId, payload);
      } else {
        await addExpense(payload);
      }
      resetForm();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to save expense');
    }
  };

  const onEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setDate(new Date(expense.date).toISOString().slice(0, 10));
    setNote(expense.note || '');
  };

  const onDelete = (expenseId: string) => {
    Alert.alert('Delete expense', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExpense(expenseId);
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Unable to delete expense');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.summary}>Total expenses: {formatCurrency(total, 'INR')}</Text>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingExpenseId ? 'Edit expense' : 'Add expense'}</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor="#7A7A7A" />
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount"
          keyboardType="decimal-pad"
          placeholderTextColor="#7A7A7A"
        />
        <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#7A7A7A" />
        <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Note (optional)" placeholderTextColor="#7A7A7A" />

        <FlatList
          data={CATEGORIES}
          horizontal
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          style={styles.categoryList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.categoryChip, item === category ? styles.categoryChipActive : null]}
              onPress={() => setCategory(item)}
            >
              <Text style={[styles.categoryText, item === category ? styles.categoryTextActive : null]}>{item}</Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.actionsRow}>
          {editingExpenseId ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={resetForm}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={isSyncing}>
            <Text style={styles.primaryButtonText}>{editingExpenseId ? 'Update' : 'Add'} Expense</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={styles.listText}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemMeta}>{item.category} • {new Date(item.date).toLocaleDateString()}</Text>
              {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
            </View>
            <View style={styles.listRight}>
              <Text style={styles.itemAmount}>-{formatCurrency(item.amount, 'INR')}</Text>
              <View style={styles.rowButtons}>
                <TouchableOpacity onPress={() => onEdit(item)}><Text style={styles.editText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(item.id)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No expenses yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 14 },
  summary: { color: COLORS.text, fontWeight: '700', marginBottom: 10, fontSize: 16 },
  formCard: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12 },
  formTitle: { color: COLORS.text, fontWeight: '700', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  categoryList: { marginVertical: 8, maxHeight: 40 },
  categoryChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: 'rgba(0,242,234,0.16)', borderColor: COLORS.primary },
  categoryText: { color: COLORS.textSecondary, fontSize: 12 },
  categoryTextActive: { color: COLORS.primary },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: { color: COLORS.background, fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: { color: COLORS.textSecondary, fontWeight: '600' },
  listContent: { paddingTop: 12, paddingBottom: 120 },
  listItem: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
  },
  listText: { flex: 1 },
  listRight: { marginLeft: 10, alignItems: 'flex-end' },
  itemTitle: { color: COLORS.text, fontWeight: '700' },
  itemMeta: { color: COLORS.textSecondary, marginTop: 2, fontSize: 12 },
  itemNote: { color: '#C6C6C6', marginTop: 4, fontSize: 12 },
  itemAmount: { color: COLORS.error, fontWeight: '700' },
  rowButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  editText: { color: COLORS.primary, fontWeight: '600', fontSize: 12 },
  deleteText: { color: COLORS.error, fontWeight: '600', fontSize: 12 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 18 },
});
