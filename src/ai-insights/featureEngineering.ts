/**
 * AI Insights — Feature Engineering
 *
 * This module transforms raw expense records into a structured feature
 * representation used by the insight engine. It applies standard financial
 * data preparation techniques:
 *
 *  1. Normalisation: Parse dates, coerce types, sort chronologically.
 *  2. Category aggregation: Totals, counts, averages, percentage shares.
 *  3. Temporal analysis: 30-day windows, rolling averages, MoM comparison.
 *  4. Behaviour metrics: Mean, median, standard deviation, concentration.
 *
 * Methodology is intentionally statistical rather than black-box so that
 * every output can be traced back to raw transactions.
 */

import type {
  NormalizedExpense,
  CategoryStats,
  TemporalStats,
  BehaviourStats,
  FinancialFeatures,
} from './types';

// ─── Expense categories classified as "essential" ───────────────────────────
// Used to split essential vs. discretionary spending.
const ESSENTIAL_CATEGORIES = new Set([
  'Bills',
  'Healthcare',
  'Transportation',
]);

// ─── 1. Normalisation ────────────────────────────────────────────────────────

/**
 * Converts raw Expense objects from the Dashboard into the canonical
 * NormalizedExpense format expected by the AI engine.
 *
 * The adapter pattern here means we never need to modify the upstream
 * Expense interface; any field mapping happens only in this function.
 */
export function normalizeExpenses(
  rawExpenses: Array<{ id: string; category: string; amount: number; date: string; title: string; note?: string }>
): NormalizedExpense[] {
  return rawExpenses
    .filter(e => e.amount > 0) // Discard zero or negative entries
    .map(e => {
      const dateObj = new Date(e.date);
      return {
        id: e.id,
        category: e.category,
        amount: Number(e.amount),
        date: e.date,
        title: e.title,
        dateObj,
        timestamp: dateObj.getTime(),
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp); // Ascending chronological order
}

// ─── 2. Category Aggregation ─────────────────────────────────────────────────

/**
 * Computes per-category statistics:
 *   - total: Sum of all amounts in this category.
 *   - count: Number of transactions.
 *   - average: Mean transaction amount.
 *   - percentage: Category's share of total spending.
 *   - amounts: Raw amount array (for downstream anomaly detection).
 */
export function computeCategoryStats(normalized: NormalizedExpense[]): CategoryStats[] {
  const totalSpending = normalized.reduce((s, e) => s + e.amount, 0);

  const map = new Map<string, { total: number; count: number; amounts: number[] }>();

  for (const e of normalized) {
    const existing = map.get(e.category);
    if (existing) {
      existing.total += e.amount;
      existing.count += 1;
      existing.amounts.push(e.amount);
    } else {
      map.set(e.category, { total: e.amount, count: 1, amounts: [e.amount] });
    }
  }

  const stats: CategoryStats[] = [];
  for (const [category, { total, count, amounts }] of map) {
    stats.push({
      category,
      total,
      count,
      average: total / count,
      percentage: totalSpending > 0 ? (total / totalSpending) * 100 : 0,
      amounts,
    });
  }

  // Sort by total spending, highest first.
  return stats.sort((a, b) => b.total - a.total);
}

// ─── 3. Temporal Analysis ────────────────────────────────────────────────────

/**
 * Partitions expenses into "current" and "previous" 30-day windows
 * and computes month-over-month (MoM) change.
 *
 * Uses a sliding 30-day window anchored at the most recent transaction
 * rather than calendar months. This produces meaningful comparisons even
 * when the user adds their first transaction mid-month.
 */
export function computeTemporalStats(normalized: NormalizedExpense[]): TemporalStats {
  if (normalized.length === 0) {
    return {
      currentMonthTotal: 0,
      previousMonthTotal: 0,
      momChangeRatio: 0,
      hasMoMData: false,
      dailySpending: {},
      rollingAvg7d: 0,
    };
  }

  const now = Date.now();
  const MS_30 = 30 * 24 * 60 * 60 * 1000;
  const MS_60 = 60 * 24 * 60 * 60 * 1000;

  let currentMonthTotal = 0;
  let previousMonthTotal = 0;

  // Daily spending map — keys are 'YYYY-MM-DD' strings.
  const dailySpending: Record<string, number> = {};

  for (const e of normalized) {
    const age = now - e.timestamp;

    if (age <= MS_30) {
      currentMonthTotal += e.amount;
    } else if (age <= MS_60) {
      previousMonthTotal += e.amount;
    }

    const dayKey = e.dateObj.toISOString().split('T')[0];
    dailySpending[dayKey] = (dailySpending[dayKey] ?? 0) + e.amount;
  }

  // MoM change ratio: (current - previous) / previous
  // Requires previous period to have at least some spending.
  const hasMoMData = previousMonthTotal > 0;
  const momChangeRatio = hasMoMData
    ? (currentMonthTotal - previousMonthTotal) / previousMonthTotal
    : 0;

  // Rolling 7-day average using the last 7 calendar days.
  const MS_7 = 7 * 24 * 60 * 60 * 1000;
  const last7 = normalized.filter(e => (now - e.timestamp) <= MS_7);
  const rollingAvg7d = last7.length > 0
    ? last7.reduce((s, e) => s + e.amount, 0) / 7
    : 0;

  return {
    currentMonthTotal,
    previousMonthTotal,
    momChangeRatio,
    hasMoMData,
    dailySpending,
    rollingAvg7d,
  };
}

// ─── 4. Behaviour Metrics ────────────────────────────────────────────────────

/**
 * Computes aggregate behaviour statistics across all transactions.
 *
 * - Mean: simple arithmetic average.
 * - Median: middle value after sorting — more robust to outliers than mean.
 * - Std Dev: population standard deviation — used for Z-score anomaly detection.
 * - Concentration: Herfindahl-inspired metric — fraction of total in the
 *   top category. Values above 0.50 indicate concentrated spending.
 * - Essential vs Discretionary split based on category classification.
 */
export function computeBehaviourStats(
  normalized: NormalizedExpense[],
  categoryStats: CategoryStats[]
): BehaviourStats {
  if (normalized.length === 0) {
    return {
      totalSpending: 0,
      transactionCount: 0,
      meanAmount: 0,
      medianAmount: 0,
      stdDev: 0,
      topCategoryConcentration: 0,
      essentialSpending: 0,
      discretionarySpending: 0,
    };
  }

  const amounts = normalized.map(e => e.amount);
  const totalSpending = amounts.reduce((s, a) => s + a, 0);
  const meanAmount = totalSpending / amounts.length;

  // Median: sort a copy (don't mutate) and pick the middle element.
  const sorted = [...amounts].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianAmount = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;

  // Population standard deviation
  const variance = amounts.reduce((s, a) => s + Math.pow(a - meanAmount, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // Spending concentration: top-category share
  const topCategoryConcentration = categoryStats.length > 0 && totalSpending > 0
    ? categoryStats[0].total / totalSpending
    : 0;

  // Essential vs. discretionary split
  let essentialSpending = 0;
  let discretionarySpending = 0;
  for (const c of categoryStats) {
    if (ESSENTIAL_CATEGORIES.has(c.category)) {
      essentialSpending += c.total;
    } else {
      discretionarySpending += c.total;
    }
  }

  return {
    totalSpending,
    transactionCount: normalized.length,
    meanAmount,
    medianAmount,
    stdDev,
    topCategoryConcentration,
    essentialSpending,
    discretionarySpending,
  };
}

// ─── 5. Month History Count ──────────────────────────────────────────────────

/**
 * Returns how many distinct calendar months appear in the expense history.
 * This is used to gate features that require at least 2 months of data.
 */
export function countMonthsOfHistory(normalized: NormalizedExpense[]): number {
  const keys = new Set(
    normalized.map(e => `${e.dateObj.getFullYear()}-${e.dateObj.getMonth()}`)
  );
  return keys.size;
}

// ─── 6. Main Extraction Entry Point ─────────────────────────────────────────

/**
 * Runs the full feature-extraction pipeline on raw expense records.
 * This is the single function called by the insight engine.
 *
 * @param rawExpenses - Expense[] from Dashboard state
 * @returns FinancialFeatures — the complete feature matrix
 */
export function extractFeatures(
  rawExpenses: Array<{ id: string; category: string; amount: number; date: string; title: string; note?: string }>
): FinancialFeatures {
  const normalized = normalizeExpenses(rawExpenses);
  const categoryStats = computeCategoryStats(normalized);
  const temporal = computeTemporalStats(normalized);
  const behaviour = computeBehaviourStats(normalized, categoryStats);
  const monthsOfHistory = countMonthsOfHistory(normalized);

  return {
    normalized,
    categoryStats,
    temporal,
    behaviour,
    topCategories: categoryStats.slice(0, 5),
    monthsOfHistory,
  };
}
