import React, { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useData } from '../context/DataContext';
import { CATEGORIES, COLORS, formatCurrency, getCurrentMonthYear } from '../utils/constants';
import { AddBudgetInput } from '../types';

export function BudgetsScreen() {
  const { budgets, expenses, addBudget, updateBudget, deleteBudget, isSyncing } = useData();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [limit, setLimit] = useState('');
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((expense) => map.set(expense.category, (map.get(expense.category) || 0) + Number(expense.amount)));
    return map;
  }, [expenses]);

  const onSave = async () => {
    const amount = Number(limit);
    if (!Number.isFinite(amount) || amount <= 0) return Alert.alert('Validation', 'Budget amount must be positive');

    const current = getCurrentMonthYear();
    const payload: AddBudgetInput = {
      category,
      allocatedAmount: amount,
      month: current.month,
      year: current.year,
    };

    try {
      if (editingBudgetId) {
        await updateBudget(editingBudgetId, payload);
      } else {
        await addBudget(payload);
      }
      setCategory(CATEGORIES[0]);
      setLimit('');
      setEditingBudgetId(null);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to save budget');
    }
  };

  const onEdit = (id: string, nextCategory: string, allocatedAmount: number) => {
    setEditingBudgetId(id);
    setCategory(nextCategory);
    setLimit(String(allocatedAmount));
  };

  const onDelete = (id: string) => {
    Alert.alert('Delete budget', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBudget(id);
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Unable to delete budget');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingBudgetId ? 'Edit budget' : 'Set monthly budget'}</Text>

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

        <TextInput
          style={styles.input}
          value={limit}
          onChangeText={setLimit}
          placeholder="Budget amount"
          keyboardType="decimal-pad"
          placeholderTextColor="#7A7A7A"
        />

        <View style={styles.actionsRow}>
          {editingBudgetId ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditingBudgetId(null)}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.primaryButton} onPress={onSave} disabled={isSyncing}>
            <Text style={styles.primaryButtonText}>{editingBudgetId ? 'Update' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const spent = spentByCategory.get(item.category) || 0;
          const ratio = Math.min((spent / Math.max(item.allocated_amount, 1)) * 100, 100);
          const overBudget = spent > item.allocated_amount;

          return (
            <View style={styles.listItem}>
              <View style={styles.rowTop}>
                <Text style={styles.itemTitle}>{item.category}</Text>
                <View style={styles.rowButtons}>
                  <TouchableOpacity onPress={() => onEdit(item.id, item.category, item.allocated_amount)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDelete(item.id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.itemAmount}>
                {formatCurrency(spent, 'INR')} / {formatCurrency(item.allocated_amount, 'INR')}
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${ratio}%`, backgroundColor: overBudget ? COLORS.error : COLORS.success },
                  ]}
                />
              </View>
              <Text style={[styles.statusText, overBudget ? styles.overText : styles.okText]}>
                {overBudget ? 'Over budget' : `${ratio.toFixed(1)}% used`}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No budgets set for this month.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 14 },
  formCard: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12 },
  formTitle: { color: COLORS.text, fontWeight: '700', marginBottom: 8 },
  categoryList: { maxHeight: 40, marginBottom: 10 },
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
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  primaryButtonText: { color: COLORS.background, fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryButtonText: { color: COLORS.textSecondary, fontWeight: '600' },
  listContent: { paddingTop: 12, paddingBottom: 120 },
  listItem: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    padding: 12,
    marginBottom: 10,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { color: COLORS.text, fontWeight: '700' },
  itemAmount: { color: COLORS.textSecondary, marginTop: 4, fontSize: 12 },
  progressTrack: { marginTop: 10, height: 8, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  statusText: { marginTop: 6, fontSize: 12, fontWeight: '600' },
  overText: { color: COLORS.error },
  okText: { color: COLORS.success },
  rowButtons: { flexDirection: 'row', gap: 12 },
  editText: { color: COLORS.primary, fontWeight: '600', fontSize: 12 },
  deleteText: { color: COLORS.error, fontWeight: '600', fontSize: 12 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 18 },
});
