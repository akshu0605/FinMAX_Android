import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { dataTransferApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { COLORS, CURRENCY_SYMBOLS, formatCurrency, getCurrentMonthYear } from '../utils/constants';

function calculateLoan(principal: number, annualRate: number, months: number) {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) {
    const emi = principal / Math.max(months, 1);
    return { emi, totalAmount: principal, totalInterest: 0 };
  }
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  const totalAmount = emi * months;
  const totalInterest = totalAmount - principal;
  return { emi, totalAmount, totalInterest };
}

export function SettingsScreen() {
  const { signOut, user } = useAuth();
  const { addIncome, refreshAll, incomes } = useData();
  const [currency, setCurrency] = useState<keyof typeof CURRENCY_SYMBOLS>('INR');
  const [loanAmount, setLoanAmount] = useState('500000');
  const [loanRate, setLoanRate] = useState('10');
  const [loanMonths, setLoanMonths] = useState('60');
  const [busy, setBusy] = useState(false);
  const [incomeValue, setIncomeValue] = useState('');

  const loanResult = useMemo(() => {
    const principal = Number(loanAmount);
    const rate = Number(loanRate);
    const months = Number(loanMonths);
    if (!Number.isFinite(principal) || !Number.isFinite(rate) || !Number.isFinite(months) || principal <= 0 || months <= 0) {
      return null;
    }
    return calculateLoan(principal, rate, months);
  }, [loanAmount, loanRate, loanMonths]);

  const onExportCsv = async () => {
    setBusy(true);
    try {
      const response = await dataTransferApi.shareCsvExport();
      if (response.error) throw new Error(response.error);
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unable to export CSV');
    } finally {
      setBusy(false);
    }
  };

  const onImportCsv = async () => {
    setBusy(true);
    try {
      const response = await dataTransferApi.importUserDataFromCsvFile();
      if (response.error || !response.data) throw new Error(response.error || 'Unable to import CSV');
      await refreshAll();
      Alert.alert('Import complete', `Imported ${response.data.imported} rows, skipped ${response.data.skipped} rows.`);
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Unable to import CSV');
    } finally {
      setBusy(false);
    }
  };

  const onBackup = async () => {
    setBusy(true);
    try {
      const response = await dataTransferApi.shareJsonBackup();
      if (response.error) throw new Error(response.error);
    } catch (error) {
      Alert.alert('Backup failed', error instanceof Error ? error.message : 'Unable to create backup');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      const response = await dataTransferApi.restoreJsonBackupFile();
      if (response.error) throw new Error(response.error);
      await refreshAll();
      Alert.alert('Restore complete', 'Backup data has been restored.');
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : 'Unable to restore backup');
    } finally {
      setBusy(false);
    }
  };

  const onAddMonthlyIncome = async () => {
    const parsed = Number(incomeValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return Alert.alert('Validation', 'Please enter a valid income amount');

    const current = getCurrentMonthYear();
    try {
      await addIncome({
        amount: parsed,
        month: current.month,
        year: current.year,
        source: 'Manual update',
      });
      setIncomeValue('');
      await refreshAll();
    } catch (error) {
      Alert.alert('Income failed', error instanceof Error ? error.message : 'Unable to add income');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.meta}>User: {user?.email || 'Unknown'}</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={signOut}>
          <Text style={styles.dangerButtonText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Currency</Text>
        <View style={styles.chipRow}>
          {(Object.keys(CURRENCY_SYMBOLS) as Array<keyof typeof CURRENCY_SYMBOLS>).map((item) => (
            <TouchableOpacity key={item} style={[styles.chip, currency === item ? styles.chipActive : null]} onPress={() => setCurrency(item)}>
              <Text style={[styles.chipText, currency === item ? styles.chipTextActive : null]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Monthly income</Text>
        <Text style={styles.meta}>Current entries: {incomes.length}</Text>
        <TextInput
          style={styles.input}
          value={incomeValue}
          onChangeText={setIncomeValue}
          placeholder="Enter monthly income"
          keyboardType="decimal-pad"
          placeholderTextColor="#7A7A7A"
        />
        <TouchableOpacity style={styles.primaryButton} onPress={onAddMonthlyIncome}>
          <Text style={styles.primaryButtonText}>Save income</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>CSV Import/Export</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} disabled={busy} onPress={onExportCsv}>
            <Text style={styles.secondaryButtonText}>Export CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} disabled={busy} onPress={onImportCsv}>
            <Text style={styles.secondaryButtonText}>Import CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Backup & Restore</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} disabled={busy} onPress={onBackup}>
            <Text style={styles.secondaryButtonText}>Create Backup</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} disabled={busy} onPress={onRestore}>
            <Text style={styles.secondaryButtonText}>Restore Backup</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Loan / EMI Calculator</Text>
        <TextInput style={styles.input} value={loanAmount} onChangeText={setLoanAmount} placeholder="Principal" keyboardType="decimal-pad" placeholderTextColor="#7A7A7A" />
        <TextInput style={styles.input} value={loanRate} onChangeText={setLoanRate} placeholder="Annual interest rate %" keyboardType="decimal-pad" placeholderTextColor="#7A7A7A" />
        <TextInput style={styles.input} value={loanMonths} onChangeText={setLoanMonths} placeholder="Duration (months)" keyboardType="number-pad" placeholderTextColor="#7A7A7A" />
        {loanResult ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>EMI: {formatCurrency(loanResult.emi, currency)}</Text>
            <Text style={styles.resultText}>Total Interest: {formatCurrency(loanResult.totalInterest, currency)}</Text>
            <Text style={styles.resultText}>Total Payable: {formatCurrency(loanResult.totalAmount, currency)}</Text>
          </View>
        ) : (
          <Text style={styles.meta}>Enter valid values to calculate EMI.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 14, paddingBottom: 120 },
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
  meta: { color: COLORS.textSecondary, marginTop: 6, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryButtonText: { color: COLORS.background, fontWeight: '700' },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  dangerButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: 'rgba(255,107,107,0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dangerButtonText: { color: COLORS.error, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(0,242,234,0.16)' },
  chipText: { color: COLORS.textSecondary, fontSize: 12 },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },
  resultBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  resultText: { color: COLORS.text, marginBottom: 4, fontWeight: '600' },
});
