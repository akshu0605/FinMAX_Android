/**
 * AI Insights — Anomaly Detection
 *
 * Detects unusually large transactions within each expense category using two
 * complementary statistical methods:
 *
 * ── Method 1: IQR (Interquartile Range) ─────────────────────────────────────
 * Standard robust outlier detection. Requires at least 4 data points per
 * category. A transaction is flagged as anomalous if:
 *
 *   amount > Q3 + 1.5 × IQR
 *
 * where IQR = Q3 - Q1.
 *
 * IQR is preferred when the category has repeated spending because it is
 * resistant to skewed distributions and does not require normality.
 *
 * ── Method 2: Z-Score ────────────────────────────────────────────────────────
 * Used as a fallback when IQR is not applicable (fewer than 4 transactions
 * in a category). A transaction is flagged if:
 *
 *   |z| > ZSCORE_THRESHOLD (default 2.0)
 *
 * where z = (amount − mean) / stdDev.
 *
 * ── Reporting ────────────────────────────────────────────────────────────────
 * Only the single most anomalous transaction per category is reported to
 * avoid flooding the UI with similar alerts.
 *
 * ── Limitation ───────────────────────────────────────────────────────────────
 * With very few transactions, anomaly detection produces unreliable results.
 * A minimum of 3 transactions per category is enforced before any flag is raised.
 */

import type { AnomalyResult, NormalizedExpense, CategoryStats } from './types';

// ─── Configuration ───────────────────────────────────────────────────────────

/** Minimum transactions in a category before IQR is applied. */
const IQR_MIN_SAMPLES = 4;

/** Minimum transactions in a category before Z-score is applied. */
const ZSCORE_MIN_SAMPLES = 3;

/** Z-score threshold for flagging an anomaly. */
const ZSCORE_THRESHOLD = 2.0;

/** IQR multiplier — standard Tukey fence value. */
const IQR_FENCE = 1.5;

// ─── Statistical Helpers ─────────────────────────────────────────────────────

/**
 * Returns the value at a given percentile of a sorted numeric array.
 * Uses linear interpolation for non-integer indices.
 *
 * @param sorted - Array already sorted in ascending order
 * @param p - Percentile in [0, 1]
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const fraction = index - lower;
  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

/** Arithmetic mean of a numeric array. Returns 0 for empty arrays. */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Population standard deviation. Returns 0 for empty arrays or uniform values. */
function stdDev(arr: number[]): number {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

/** Median of an unsorted numeric array. */
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── IQR Detection ───────────────────────────────────────────────────────────

/**
 * Applies the Tukey IQR fence to detect outlier amounts in a sorted array.
 * Returns the upper fence value; amounts above this are anomalous.
 */
function iqrUpperFence(sorted: number[]): number {
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  return q3 + IQR_FENCE * iqr;
}

// ─── Main Detection Function ─────────────────────────────────────────────────

/**
 * Scans all expense transactions for anomalous amounts relative to their
 * own category's distribution.
 *
 * Returns at most one anomaly per category (the most extreme one), to keep
 * the insight count manageable.
 *
 * @param normalized - All normalized expenses
 * @param categoryStats - Pre-computed category statistics (amounts array)
 * @returns Array of AnomalyResult, one per affected category at most
 */
export function detectAnomalies(
  normalized: NormalizedExpense[],
  categoryStats: CategoryStats[]
): AnomalyResult[] {
  const results: AnomalyResult[] = [];

  for (const catStat of categoryStats) {
    const { category, amounts } = catStat;
    const sorted = [...amounts].sort((a, b) => a - b);

    // Retrieve all transactions in this category, ordered by amount descending.
    const catExpenses = normalized
      .filter(e => e.category === category)
      .sort((a, b) => b.amount - a.amount);

    if (catExpenses.length < ZSCORE_MIN_SAMPLES) {
      // Insufficient data — skip this category entirely.
      continue;
    }

    // Choose detection method based on sample size.
    if (amounts.length >= IQR_MIN_SAMPLES) {
      // ── IQR method ───────────────────────────────────────────────────────
      const fence = iqrUpperFence(sorted);
      const categoryMedian = median(sorted);

      // Find the most extreme transaction above the fence.
      const anomalous = catExpenses.find(e => e.amount > fence);
      if (!anomalous) continue;

      const deviationPct = categoryMedian > 0
        ? ((anomalous.amount - categoryMedian) / categoryMedian) * 100
        : 0;

      // Compute Z-score for reporting even though IQR was the detection method.
      const m = mean(amounts);
      const sd = stdDev(amounts);
      const zScore = sd > 0 ? (anomalous.amount - m) / sd : 0;

      results.push({
        expense: anomalous,
        method: 'IQR',
        zScore,
        categoryMedian,
        deviationPct,
      });
    } else {
      // ── Z-Score method ───────────────────────────────────────────────────
      const m = mean(amounts);
      const sd = stdDev(amounts);
      if (sd === 0) continue; // All amounts identical — no variance to detect.

      const categoryMedian = median(sorted);

      // Find the most extreme Z-score transaction.
      let worstExpense: NormalizedExpense | null = null;
      let worstZ = 0;

      for (const e of catExpenses) {
        const z = (e.amount - m) / sd;
        if (z > ZSCORE_THRESHOLD && z > worstZ) {
          worstZ = z;
          worstExpense = e;
        }
      }

      if (!worstExpense) continue;

      const deviationPct = categoryMedian > 0
        ? ((worstExpense.amount - categoryMedian) / categoryMedian) * 100
        : 0;

      results.push({
        expense: worstExpense,
        method: 'ZSCORE',
        zScore: worstZ,
        categoryMedian,
        deviationPct,
      });
    }
  }

  // Sort by Z-score descending so the most extreme anomaly appears first.
  return results.sort((a, b) => b.zScore - a.zScore);
}
