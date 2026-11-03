import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useData } from '../context/DataContext';
import { COLORS } from '../utils/constants';
import { AddReminderInput } from '../types';

async function scheduleReminderNotification(title: string, dueDateIso: string): Promise<void> {
  try {
    const dueDate = new Date(dueDateIso);
    const triggerDate = new Date(dueDate.getTime() - (60 * 60 * 1000));
    if (triggerDate.getTime() <= Date.now()) return;

    const status = await Notifications.getPermissionsAsync();
    if (status.status !== 'granted') {
      const request = await Notifications.requestPermissionsAsync();
      if (request.status !== 'granted') return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'FinMax Reminder',
        body: title,
      },
      trigger: triggerDate as unknown as Notifications.NotificationTriggerInput,
    });
  } catch {
    // Notifications are optional and environment-dependent.
  }
}

export function RemindersScreen() {
  const { reminders, addReminder, markReminderComplete, deleteReminder, isSyncing } = useData();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');

  const onSave = async () => {
    if (!title.trim()) return Alert.alert('Validation', 'Reminder title is required');

    const payload: AddReminderInput = {
      title: title.trim(),
      dueDate: new Date(dueDate).toISOString(),
      amount: amount.trim() ? Number(amount) : undefined,
    };

    if (payload.amount !== undefined && (!Number.isFinite(payload.amount) || payload.amount <= 0)) {
      return Alert.alert('Validation', 'Amount must be positive');
    }

    try {
      const reminder = await addReminder(payload);
      await scheduleReminderNotification(reminder.title, reminder.due_date);
      setTitle('');
      setDueDate(new Date().toISOString().slice(0, 10));
      setAmount('');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to add reminder');
    }
  };

  const onToggle = async (id: string, complete: boolean) => {
    try {
      await markReminderComplete(id, !complete);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to update reminder');
    }
  };

  const onDelete = (id: string) => {
    Alert.alert('Delete reminder', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReminder(id);
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Unable to delete reminder');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Add reminder</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Reminder title" placeholderTextColor="#7A7A7A" />
        <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" placeholderTextColor="#7A7A7A" />
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount (optional)"
          keyboardType="decimal-pad"
          placeholderTextColor="#7A7A7A"
        />
        <TouchableOpacity style={styles.primaryButton} onPress={onSave} disabled={isSyncing}>
          <Text style={styles.primaryButtonText}>Save reminder</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={styles.listText}>
              <Text style={[styles.itemTitle, item.is_completed ? styles.completedText : null]}>{item.title}</Text>
              <Text style={styles.itemMeta}>Due {new Date(item.due_date).toLocaleDateString()}</Text>
              {item.amount ? <Text style={styles.itemMeta}>Amount: ₹{item.amount.toFixed(0)}</Text> : null}
            </View>
            <View style={styles.rowButtons}>
              <TouchableOpacity onPress={() => onToggle(item.id, item.is_completed)}>
                <Text style={[styles.toggleText, item.is_completed ? styles.reopen : styles.complete]}>
                  {item.is_completed ? 'Reopen' : 'Complete'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(item.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No reminders yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 14 },
  formCard: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12 },
  formTitle: { color: COLORS.text, fontWeight: '700', marginBottom: 8 },
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
  primaryButton: {
    marginTop: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryButtonText: { color: COLORS.background, fontWeight: '700' },
  listContent: { paddingTop: 12, paddingBottom: 120 },
  listItem: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listText: { flex: 1 },
  itemTitle: { color: COLORS.text, fontWeight: '700' },
  completedText: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  itemMeta: { color: COLORS.textSecondary, marginTop: 3, fontSize: 12 },
  rowButtons: { marginLeft: 12, justifyContent: 'space-between', alignItems: 'flex-end' },
  toggleText: { fontWeight: '600', fontSize: 12 },
  complete: { color: COLORS.success },
  reopen: { color: COLORS.warning },
  deleteText: { color: COLORS.error, fontWeight: '600', fontSize: 12 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 18 },
});
