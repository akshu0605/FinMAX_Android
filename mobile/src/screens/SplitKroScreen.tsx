import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { simplifyDebts, splitKroApi } from '../api/client';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { BalanceEntry, SplitKroExpense, SplitKroGroup, SplitKroMember, SplitType } from '../types';
import { COLORS } from '../utils/constants';

type GroupTab = 'expenses' | 'balances' | 'settle';

export function SplitKroScreen() {
  const { user } = useAuth();
  const { splitGroups, refreshSplitGroups } = useData();
  const [selectedGroup, setSelectedGroup] = useState<SplitKroGroup | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState('Trip');
  const [creating, setCreating] = useState(false);

  const createGroup = async () => {
    if (!newGroupName.trim()) return Alert.alert('Validation', 'Group name is required');
    setCreating(true);
    try {
      const response = await splitKroApi.createGroup(newGroupName.trim(), newGroupType);
      if (response.error || !response.data) throw new Error(response.error || 'Failed to create group');
      setShowCreate(false);
      setNewGroupName('');
      setNewGroupType('Trip');
      await refreshSplitGroups();
      setSelectedGroup(response.data);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to create group');
    } finally {
      setCreating(false);
    }
  };

  if (selectedGroup) {
    return (
      <GroupDetail
        group={selectedGroup}
        onBack={async () => {
          setSelectedGroup(null);
          await refreshSplitGroups();
        }}
        currentUserId={user?.id || ''}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Split Kro</Text>
          <Text style={styles.subtitle}>Group expense splitting</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setShowCreate(true)}>
          <Text style={styles.primaryButtonText}>New Group</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={splitGroups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.groupCard} onPress={() => setSelectedGroup(item)}>
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.groupMeta}>{item.type} • {new Date(item.created_at).toLocaleDateString()}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No groups yet. Create your first split group.</Text>}
      />

      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TextInput
              style={styles.input}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Group name"
              placeholderTextColor="#7A7A7A"
            />
            <TextInput
              style={styles.input}
              value={newGroupType}
              onChangeText={setNewGroupType}
              placeholder="Type (Trip, Flatmates...)"
              placeholderTextColor="#7A7A7A"
            />

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowCreate(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={createGroup} disabled={creating}>
                <Text style={styles.primaryButtonText}>{creating ? 'Creating...' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function GroupDetail({ group, onBack, currentUserId }: { group: SplitKroGroup; onBack: () => void; currentUserId: string }) {
  const [tab, setTab] = useState<GroupTab>('expenses');
  const [members, setMembers] = useState<SplitKroMember[]>([]);
  const [expenses, setExpenses] = useState<SplitKroExpense[]>([]);
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splitInputs, setSplitInputs] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [memberRes, expenseRes] = await Promise.all([
        splitKroApi.getGroupMembers(group.id),
        splitKroApi.getGroupExpenses(group.id),
      ]);
      if (memberRes.error) throw new Error(memberRes.error);
      if (expenseRes.error) throw new Error(expenseRes.error);

      const nextMembers = memberRes.data || [];
      const nextExpenses = expenseRes.data || [];
      setMembers(nextMembers);
      setExpenses(nextExpenses);

      const balanceRes = await splitKroApi.getBalances(group.id, nextMembers);
      if (balanceRes.error) throw new Error(balanceRes.error);
      setBalances(balanceRes.data || []);

      if (nextMembers.length > 0 && !paidBy) {
        setPaidBy(nextMembers[0].user_id || nextMembers[0].id);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to load group');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, [group.id]);

  const memberKey = (member: SplitKroMember) => member.user_id || member.id;

  const settlementSuggestions = useMemo(() => simplifyDebts(
    balances.map((balance) => ({
      userId: balance.userId,
      displayName: balance.displayName,
      netBalance: balance.netBalance,
    })),
  ), [balances]);

  const addMember = async () => {
    if (!memberName.trim()) return Alert.alert('Validation', 'Member name is required');
    try {
      const response = await splitKroApi.addMember(group.id, memberName.trim(), memberEmail.trim() || undefined);
      if (response.error) throw new Error(response.error);
      setMemberName('');
      setMemberEmail('');
      setShowAddMember(false);
      await load();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to add member');
    }
  };

  const addExpense = async () => {
    const totalAmount = Number(amount);
    if (!description.trim()) return Alert.alert('Validation', 'Description is required');
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) return Alert.alert('Validation', 'Amount must be positive');
    if (!paidBy) return Alert.alert('Validation', 'Select payer');

    const splitMembers = members.map((member) => {
      const key = memberKey(member);
      if (splitType === 'equal') {
        return { userId: key, owedAmount: totalAmount / Math.max(members.length, 1) };
      }
      if (splitType === 'exact') {
        const exactValue = Number(splitInputs[key] || 0);
        return { userId: key, owedAmount: exactValue };
      }
      const percentage = Number(splitInputs[key] || 0);
      return { userId: key, owedAmount: (percentage / 100) * totalAmount };
    });

    if (splitType === 'exact') {
      const exactTotal = splitMembers.reduce((sum, row) => sum + row.owedAmount, 0);
      if (Math.abs(exactTotal - totalAmount) > 0.01) {
        return Alert.alert('Validation', 'Exact split values must sum to total amount');
      }
    }

    if (splitType === 'percentage') {
      const percentTotal = members.reduce((sum, member) => sum + Number(splitInputs[memberKey(member)] || 0), 0);
      if (Math.abs(percentTotal - 100) > 0.01) {
        return Alert.alert('Validation', 'Percent split values must sum to 100');
      }
    }

    try {
      const response = await splitKroApi.addExpense(group.id, paidBy, totalAmount, description.trim(), splitType, splitMembers);
      if (response.error) throw new Error(response.error);
      setDescription('');
      setAmount('');
      setSplitType('equal');
      setSplitInputs({});
      setShowAddExpense(false);
      await load();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to add expense');
    }
  };

  const recordSettlement = async (from: string, to: string, amountValue: number) => {
    try {
      const response = await splitKroApi.recordSettlement(group.id, from, to, amountValue);
      if (response.error) throw new Error(response.error);
      await load();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to record settlement');
    }
  };

  const deleteExpense = (expenseId: string) => {
    Alert.alert('Delete expense', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await splitKroApi.deleteExpense(expenseId);
            if (response.error) throw new Error(response.error);
            await load();
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Unable to delete expense');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{group.name}</Text>
          <Text style={styles.subtitle}>{group.type} • {members.length} members</Text>
        </View>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {(['expenses', 'balances', 'settle'] as const).map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.tabButton, tab === item ? styles.tabButtonActive : null]}
            onPress={() => setTab(item)}
          >
            <Text style={[styles.tabText, tab === item ? styles.tabTextActive : null]}>{item.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <Text style={styles.emptyText}>Loading group...</Text> : null}

      {!loading && tab === 'expenses' ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowAddMember(true)}>
              <Text style={styles.secondaryButtonText}>Add Member</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowAddExpense(true)}>
              <Text style={styles.primaryButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
          {expenses.length === 0 ? <Text style={styles.emptyText}>No group expenses yet.</Text> : null}
          {expenses.map((expense) => (
            <View key={expense.id} style={styles.groupCard}>
              <Text style={styles.groupName}>{expense.description}</Text>
              <Text style={styles.groupMeta}>
                ₹{expense.total_amount.toFixed(0)} • {expense.split_type} • {new Date(expense.created_at).toLocaleDateString()}
              </Text>
              <View style={styles.rowButtons}>
                <TouchableOpacity onPress={() => deleteExpense(expense.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {!loading && tab === 'balances' ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {balances.length === 0 ? <Text style={styles.emptyText}>No balances yet.</Text> : null}
          {balances.map((balance) => (
            <View key={balance.userId} style={styles.groupCard}>
              <Text style={styles.groupName}>
                {balance.displayName}
                {balance.userId === currentUserId ? ' (You)' : ''}
              </Text>
              <Text style={styles.groupMeta}>
                Paid ₹{balance.totalPaid.toFixed(0)} • Owes ₹{balance.totalOwed.toFixed(0)} • Net {balance.netBalance >= 0 ? '+' : '-'}₹{Math.abs(balance.netBalance).toFixed(0)}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {!loading && tab === 'settle' ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {settlementSuggestions.length === 0 ? <Text style={styles.emptyText}>Everyone is settled.</Text> : null}
          {settlementSuggestions.map((suggestion, index) => (
            <View key={`${suggestion.from}-${suggestion.to}-${index}`} style={styles.groupCard}>
              <Text style={styles.groupName}>{suggestion.fromName} pays {suggestion.toName}</Text>
              <Text style={styles.groupMeta}>₹{suggestion.amount.toFixed(2)}</Text>
              <View style={styles.rowButtons}>
                {suggestion.from === currentUserId ? (
                  <TouchableOpacity onPress={() => recordSettlement(suggestion.from, suggestion.to, suggestion.amount)}>
                    <Text style={styles.editText}>Mark Paid</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <Modal visible={showAddMember} transparent animationType="slide" onRequestClose={() => setShowAddMember(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Member</Text>
            <TextInput style={styles.input} value={memberName} onChangeText={setMemberName} placeholder="Name" placeholderTextColor="#7A7A7A" />
            <TextInput style={styles.input} value={memberEmail} onChangeText={setMemberEmail} placeholder="Email (optional)" placeholderTextColor="#7A7A7A" />
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowAddMember(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={addMember}>
                <Text style={styles.primaryButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddExpense} transparent animationType="slide" onRequestClose={() => setShowAddExpense(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Split Expense</Text>
            <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor="#7A7A7A" />
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="Amount" keyboardType="decimal-pad" placeholderTextColor="#7A7A7A" />
            <TextInput style={styles.input} value={paidBy} onChangeText={setPaidBy} placeholder="Payer id" placeholderTextColor="#7A7A7A" />
            <TextInput style={styles.input} value={splitType} onChangeText={(text) => setSplitType((text as SplitType) || 'equal')} placeholder="equal/exact/percentage" placeholderTextColor="#7A7A7A" />

            {splitType !== 'equal' ? (
              <View>
                <Text style={styles.subtitle}>Per-member values ({splitType === 'exact' ? 'amount' : 'percent'})</Text>
                {members.map((member) => {
                  const key = memberKey(member);
                  return (
                    <TextInput
                      key={key}
                      style={styles.input}
                      value={splitInputs[key] || ''}
                      onChangeText={(text) => setSplitInputs((prev) => ({ ...prev, [key]: text }))}
                      placeholder={`${member.display_name}`}
                      placeholderTextColor="#7A7A7A"
                      keyboardType="decimal-pad"
                    />
                  );
                })}
              </View>
            ) : null}

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowAddExpense(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={addExpense}>
                <Text style={styles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: COLORS.textSecondary, marginTop: 4, fontSize: 12 },
  listContent: { paddingTop: 12, paddingBottom: 120 },
  groupCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    padding: 12,
    marginBottom: 10,
  },
  groupName: { color: COLORS.text, fontWeight: '700' },
  groupMeta: { color: COLORS.textSecondary, marginTop: 3, fontSize: 12 },
  emptyText: { color: COLORS.textSecondary, marginTop: 20, textAlign: 'center' },
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
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  rowButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 12 },
  editText: { color: COLORS.primary, fontWeight: '600', fontSize: 12 },
  deleteText: { color: COLORS.error, fontWeight: '600', fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#0D1012', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 10 },
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
  tabRow: {
    marginTop: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.03)' },
  tabButtonActive: { backgroundColor: 'rgba(0,242,234,0.16)' },
  tabText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: COLORS.primary },
});
