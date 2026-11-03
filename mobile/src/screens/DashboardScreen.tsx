import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VictoryPie } from 'victory-native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { COLORS, CURRENCY_SYMBOLS, formatCurrency, getCategoryColor } from '../utils/constants';

const currency = 'INR';

export function DashboardScreen() {
  const { user } = useAuth();
  const { expenses, budgets, reminders, incomes, refreshAll, isLoading, isOfflineData } = useData();
  const [refreshing, setRefreshing] = useState(false);

  const totals = useMemo(() => {
    const totalIncome = incomes.reduce((sum, income) => sum + Number(income.amount), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const monthlyBudget = budgets.reduce((sum, budget) => sum + Number(budget.allocated_amount), 0);
    const savings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100) : 0;
    return { totalIncome, totalExpenses, monthlyBudget, savings, savingsRate };
  }, [expenses, budgets, incomes]);

  const categoryData = useMemo(() => {
    const grouped = new Map<string, number>();
    expenses.forEach((expense) => grouped.set(expense.category, (grouped.get(expense.category) || 0) + Number(expense.amount)));
    return Array.from(grouped.entries()).map(([category, amount]) => ({ x: category, y: amount }));
  }, [expenses]);

  const activeReminders = useMemo(() => reminders.filter((reminder) => !reminder.is_completed).length, [reminders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hello{user?.name ? `, ${user.name}` : ''}</Text>
          <Text style={styles.subheader}>Your financial overview</Text>
        </View>
        {isOfflineData ? <Text style={styles.offlineBadge}>Offline cache</Text> : null}
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Income" value={formatCurrency(totals.totalIncome, currency)} color={COLORS.success} />
        <StatCard label="Expenses" value={formatCurrency(totals.totalExpenses, currency)} color={COLORS.error} />
      </View>
      <View style={styles.statsGrid}>
        <StatCard label="Savings" value={formatCurrency(totals.savings, currency)} color={totals.savings >= 0 ? COLORS.primary : COLORS.error} />
        <StatCard label="Savings Rate" value={`${totals.savingsRate.toFixed(1)}%`} color={COLORS.warning} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Budget usage</Text>
        <Text style={styles.cardSub}>
          {formatCurrency(totals.totalExpenses, currency)} / {formatCurrency(totals.monthlyBudget, currency)}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min((totals.totalExpenses / Math.max(totals.monthlyBudget, 1)) * 100, 100)}%`,
                backgroundColor: totals.totalExpenses > totals.monthlyBudget ? COLORS.error : COLORS.primary,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Category breakdown</Text>
        {categoryData.length > 0 ? (
          <View>
            <VictoryPie
              width={320}
              height={220}
              data={categoryData}
              colorScale={categoryData.map((item) => getCategoryColor(item.x))}
              style={{ labels: { fill: '#D0D0D0', fontSize: 10 } }}
              innerRadius={42}
              padAngle={2}
            />
            <View style={styles.legend}>
              {categoryData.map((item) => (
                <View key={item.x} style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: getCategoryColor(item.x) }]} />
                  <Text style={styles.legendText}>
                    {item.x}: {CURRENCY_SYMBOLS.INR}{item.y.toFixed(0)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>Add expenses to see analytics.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upcoming reminders</Text>
        <Text style={styles.cardSub}>{activeReminders} pending</Text>
        {reminders.slice(0, 5).map((reminder) => (
          <View key={reminder.id} style={styles.reminderRow}>
            <View>
              <Text style={styles.reminderTitle}>{reminder.title}</Text>
              <Text style={styles.reminderDate}>{new Date(reminder.due_date).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.reminderStatus, reminder.is_completed ? styles.done : styles.pending]}>
              {reminder.is_completed ? 'Done' : 'Pending'}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Text style={styles.refreshButtonText}>Refresh dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 28 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  hello: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  subheader: { color: COLORS.textSecondary, marginTop: 4 },
  offlineBadge: {
    color: COLORS.warning,
    borderColor: COLORS.warning,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
  },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  statLabel: { color: COLORS.textSecondary, fontSize: 12 },
  statValue: { marginTop: 6, fontSize: 16, fontWeight: '700' },
  card: {
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  cardSub: { color: COLORS.textSecondary, marginTop: 4 },
  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 6 },
  legend: { marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendSwatch: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendText: { color: COLORS.textSecondary, fontSize: 12 },
  emptyText: { marginTop: 10, color: COLORS.textSecondary },
  reminderRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reminderTitle: { color: COLORS.text, fontWeight: '600' },
  reminderDate: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  reminderStatus: { fontSize: 12, fontWeight: '700' },
  done: { color: COLORS.success },
  pending: { color: COLORS.warning },
  refreshButton: {
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(0,242,234,0.12)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  refreshButtonText: { color: COLORS.primary, fontWeight: '700' },
});
