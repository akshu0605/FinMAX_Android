/**
 * AI Insights — Insight Engine
 *
 * This module generates, scores, and prioritizes financial insights from
 * the feature matrix produced by featureEngineering.ts and the anomaly
 * flags from anomalyDetection.ts.
 *
 * ── Generation ───────────────────────────────────────────────────────────────
 * Eight categories of insight are evaluated:
 *  1. Overspending / Underspending vs. personal baseline
 *  2. Month-over-month trend changes
 *  3. Unusual single transactions (via anomaly detection)
 *  4. Savings opportunity (high-discretionary-share categories)
 *  5. High spending concentration in a single category
 *  6. Spending volatility
 *  7. Positive behaviour (spending reduction, low volatility)
 *  8. Recurring expense patterns
 *
 * ── Scoring ──────────────────────────────────────────────────────────────────
 * Each candidate insight receives a priority score in [0, 100]:
 *
 *   priority = magnitude_score × severity_weight × confidence
 *
 * where:
 *   - magnitude_score: derived from percentage change or deviation size.
 *   - severity_weight: { critical: 1.0, warning: 0.8, info: 0.5, success: 0.6 }
 *   - confidence: [0, 1] — reduced when data is sparse or history is short.
 *
 * ── Deduplication & Selection ────────────────────────────────────────────────
 * After scoring, insights are ranked and the top MAX_INSIGHTS are returned.
 * Insights with confidence < 0.3 are discarded to avoid low-quality outputs.
 *
 * ── Explainability ───────────────────────────────────────────────────────────
 * Every insight carries an `explanation` field that describes in plain language
 * exactly which metric triggered the finding and what the evidence is.
 * This makes the model fully auditable and transparent.
 */

import type {
  Insight,
  InsightSeverity,
  InsightType,
  FinancialFeatures,
  AIInsightsResult,
  DataSufficiencyStatus,
} from './types';
import { extractFeatures } from './featureEngineering';
import { detectAnomalies } from './anomalyDetection';

// ─── Configuration ───────────────────────────────────────────────────────────

/** Maximum number of insights surfaced to the user. */
const MAX_INSIGHTS = 5;

/** Minimum confidence below which an insight is discarded. */
const MIN_CONFIDENCE = 0.3;

/**
 * Thresholds for overspending detection.
 * Triggered when current 30-day spending in a category exceeds
 * the historical per-period average by this ratio.
 */
const OVERSPEND_THRESHOLD = 0.30;  // 30% above average
const OVERSPEND_SIGNIFICANT = 0.60; // 60% above average → higher severity

/** MoM increase threshold for "trend_increase" insight. */
const TREND_INCREASE_THRESHOLD = 0.20;

/** MoM decrease threshold for "trend_decrease" insight (positive). */
const TREND_DECREASE_THRESHOLD = -0.15;

/**
 * High-concentration threshold.
 * If the top category exceeds this share of total spending, flag it.
 */
const CONCENTRATION_THRESHOLD = 0.55;

/**
 * Coefficient of Variation (stdDev / mean) threshold for volatility insight.
 * CV > 1.0 indicates spending amounts vary widely.
 */
const VOLATILITY_CV_THRESHOLD = 1.0;

/**
 * Discretionary share threshold for savings opportunity.
 * If discretionary > this fraction of total, flag the top discretionary category.
 */
const DISCRETIONARY_THRESHOLD = 0.60;

// ─── Severity Weight Map ─────────────────────────────────────────────────────

const SEVERITY_WEIGHTS: Record<InsightSeverity, number> = {
  critical: 1.0,
  warning: 0.8,
  success: 0.6,
  info: 0.5,
};

// ─── Utility ─────────────────────────────────────────────────────────────────

let idCounter = 0;
function nextId(): string {
  return `insight_${++idCounter}_${Date.now()}`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Computes a magnitude score from a percentage change value.
 * Maps [0%, 100%+] to [0, 1] using a smooth logarithmic curve
 * so that large percentages don't dominate completely.
 */
function magnitudeScore(pct: number): number {
  const abs = Math.abs(pct);
  // log scale: 100% → ~0.67, 50% → ~0.50, 200% → ~0.82
  return clamp(Math.log(1 + abs / 50) / Math.log(5), 0, 1);
}

/**
 * Scores and returns a priority in [0, 100].
 */
function computePriority(
  pctChange: number,
  severity: InsightSeverity,
  confidence: number
): number {
  const mag = magnitudeScore(pctChange);
  const weight = SEVERITY_WEIGHTS[severity];
  return clamp(mag * weight * confidence * 100, 0, 100);
}

// ─── Data Sufficiency Check ──────────────────────────────────────────────────

function determineStatus(transactionCount: number, monthsOfHistory: number): DataSufficiencyStatus {
  if (transactionCount === 0) return 'no_data';
  if (transactionCount < 5) return 'insufficient';
  if (transactionCount < 15 || monthsOfHistory < 2) return 'limited';
  return 'sufficient';
}

// ─── Insight Generators ──────────────────────────────────────────────────────

/**
 * Generator 1: Category Overspending / Underspending
 *
 * Compares current 30-day spending per category against the historical
 * average derived from all available months.
 *
 * "Historical average per period" is computed as:
 *   total category spending / months of history
 *
 * This ensures the comparison is always on a per-period (≈monthly) basis,
 * regardless of whether the user has 2 or 12 months of data.
 */
function generateSpendingInsights(features: FinancialFeatures): Insight[] {
  const { categoryStats, temporal, monthsOfHistory } = features;
  const insights: Insight[] = [];

  if (monthsOfHistory < 2) return insights; // Need at least 2 periods for comparison

  for (const cat of categoryStats) {
    // Historical average spend per period for this category
    const historicalAvg = cat.total / monthsOfHistory;

    // Current 30-day spending in this category
    const now = Date.now();
    const MS_30 = 30 * 24 * 60 * 60 * 1000;
    const currentSpend = features.normalized
      .filter(e => e.category === cat.category && (now - e.timestamp) <= MS_30)
      .reduce((s, e) => s + e.amount, 0);

    if (historicalAvg === 0 || currentSpend === 0) continue;

    const ratio = (currentSpend - historicalAvg) / historicalAvg;

    if (ratio >= OVERSPEND_THRESHOLD) {
      // Overspending detected
      const pct = ratio * 100;
      const isSignificant = ratio >= OVERSPEND_SIGNIFICANT;
      const severity: InsightSeverity = isSignificant ? 'warning' : 'info';
      const confidence = clamp(0.5 + (cat.count / 20) * 0.5, 0.5, 0.95);

      insights.push({
        id: nextId(),
        type: 'overspending',
        title: `${cat.category} Spending Elevated`,
        description: `Your ${cat.category} spending this month is ${pct.toFixed(0)}% above your historical average.`,
        category: cat.category,
        metricValue: currentSpend,
        comparisonValue: historicalAvg,
        changePercent: pct,
        severity,
        confidence,
        priority: computePriority(pct, severity, confidence),
        explanation: `You spent ₹${currentSpend.toLocaleString()} on ${cat.category} in the last 30 days. Your historical monthly average for this category is ₹${historicalAvg.toLocaleString()}, derived from ${monthsOfHistory} months of data. The current figure exceeds this by ${pct.toFixed(1)}%.`,
        evidence: {
          currentValue: currentSpend,
          historicalAverage: historicalAvg,
          changePercent: pct,
          monthsAnalyzed: monthsOfHistory,
        },
      });
    } else if (ratio <= -TREND_DECREASE_THRESHOLD && currentSpend > 0) {
      // Spending reduced — positive behaviour
      const pct = Math.abs(ratio * 100);
      const confidence = clamp(0.5 + (cat.count / 20) * 0.4, 0.4, 0.85);

      insights.push({
        id: nextId(),
        type: 'underspending',
        title: `${cat.category} Spending Reduced`,
        description: `${cat.category} spending is ${pct.toFixed(0)}% below your historical average — keep it up!`,
        category: cat.category,
        metricValue: currentSpend,
        comparisonValue: historicalAvg,
        changePercent: -pct,
        severity: 'success',
        confidence,
        priority: computePriority(pct, 'success', confidence),
        explanation: `You spent ₹${currentSpend.toLocaleString()} on ${cat.category} in the last 30 days vs. your historical average of ₹${historicalAvg.toLocaleString()}. This ${pct.toFixed(1)}% reduction indicates improved spending discipline in this category.`,
        evidence: {
          currentValue: currentSpend,
          historicalAverage: historicalAvg,
          changePercent: -pct,
          monthsAnalyzed: monthsOfHistory,
        },
      });
    }
  }

  return insights;
}

/**
 * Generator 2: Month-over-Month Trend
 *
 * Compares total spending in the last 30 days vs. the prior 30-day window.
 * This is a high-level signal useful even with just 2 months of data.
 */
function generateTrendInsights(features: FinancialFeatures): Insight[] {
  const { temporal } = features;
  const insights: Insight[] = [];

  if (!temporal.hasMoMData) return insights;

  const ratio = temporal.momChangeRatio;
  const pct = ratio * 100;

  if (ratio >= TREND_INCREASE_THRESHOLD) {
    const severity: InsightSeverity = ratio >= 0.40 ? 'warning' : 'info';
    const confidence = 0.75;
    insights.push({
      id: nextId(),
      type: 'trend_increase',
      title: 'Overall Spending Increased',
      description: `Your spending is up ${pct.toFixed(0)}% compared with the previous 30-day period.`,
      category: 'All',
      metricValue: temporal.currentMonthTotal,
      comparisonValue: temporal.previousMonthTotal,
      changePercent: pct,
      severity,
      confidence,
      priority: computePriority(pct, severity, confidence),
      explanation: `Total spending in the current 30-day window: ₹${temporal.currentMonthTotal.toLocaleString()}. Previous 30-day window: ₹${temporal.previousMonthTotal.toLocaleString()}. Change: +${pct.toFixed(1)}%. This may warrant a review of recent expense patterns.`,
      evidence: {
        currentValue: temporal.currentMonthTotal,
        historicalAverage: temporal.previousMonthTotal,
        changePercent: pct,
      },
    });
  } else if (ratio <= TREND_DECREASE_THRESHOLD) {
    const absPct = Math.abs(pct);
    const confidence = 0.75;
    insights.push({
      id: nextId(),
      type: 'trend_decrease',
      title: 'Spending Trend Improving',
      description: `Overall spending decreased by ${absPct.toFixed(0)}% compared with the previous period.`,
      category: 'All',
      metricValue: temporal.currentMonthTotal,
      comparisonValue: temporal.previousMonthTotal,
      changePercent: -absPct,
      severity: 'success',
      confidence,
      priority: computePriority(absPct, 'success', confidence),
      explanation: `Total spending in the current 30-day window: ₹${temporal.currentMonthTotal.toLocaleString()}. Previous 30-day window: ₹${temporal.previousMonthTotal.toLocaleString()}. Spending fell by ${absPct.toFixed(1)}% — a positive trend.`,
      evidence: {
        currentValue: temporal.currentMonthTotal,
        historicalAverage: temporal.previousMonthTotal,
        changePercent: -absPct,
      },
    });
  }

  return insights;
}

/**
 * Generator 3: Anomalous Transactions
 *
 * Uses the anomaly detection module to flag individual transactions that are
 * statistically unusual relative to their category distribution.
 */
function generateAnomalyInsights(features: FinancialFeatures): Insight[] {
  const { normalized, categoryStats } = features;
  const anomalies = detectAnomalies(normalized, categoryStats);
  const insights: Insight[] = [];

  for (const anomaly of anomalies.slice(0, 2)) { // Cap at 2 anomaly insights
    const { expense, zScore, categoryMedian, deviationPct } = anomaly;

    // Confidence scales with Z-score: higher deviation = more certain it's unusual.
    const confidence = clamp(0.4 + (zScore / 5) * 0.5, 0.4, 0.9);

    insights.push({
      id: nextId(),
      type: 'unusual_transaction',
      title: `Unusual ${expense.category} Transaction`,
      description: `A transaction of ₹${expense.amount.toLocaleString()} is significantly higher than your typical ${expense.category} expense.`,
      category: expense.category,
      metricValue: expense.amount,
      comparisonValue: categoryMedian,
      changePercent: deviationPct,
      severity: 'warning',
      confidence,
      priority: computePriority(deviationPct, 'warning', confidence),
      explanation: `"${expense.title}" (₹${expense.amount.toLocaleString()}) is ${deviationPct.toFixed(0)}% above the median ${expense.category} transaction of ₹${categoryMedian.toLocaleString()}. Statistical Z-score: ${zScore.toFixed(2)}. This is an unusual amount — not necessarily a problem, but worth reviewing.`,
      evidence: {
        transactionTitle: expense.title,
        transactionAmount: expense.amount,
        categoryMedian,
        changePercent: deviationPct,
      },
    });
  }

  return insights;
}

/**
 * Generator 4: Savings Opportunity
 *
 * Flags the top discretionary category when discretionary spending
 * represents a high fraction of total spending.
 *
 * This insight is advisory — it never guarantees a specific saving amount.
 */
function generateSavingsOpportunityInsight(features: FinancialFeatures): Insight[] {
  const { behaviour, categoryStats } = features;
  const insights: Insight[] = [];

  if (behaviour.totalSpending === 0) return insights;

  const discretionaryRatio = behaviour.discretionarySpending / behaviour.totalSpending;
  if (discretionaryRatio < DISCRETIONARY_THRESHOLD) return insights;

  // Find the top non-essential category
  const ESSENTIAL = new Set(['Bills', 'Healthcare', 'Transportation']);
  const topDiscretionary = categoryStats.find(c => !ESSENTIAL.has(c.category));
  if (!topDiscretionary) return insights;

  const pct = topDiscretionary.percentage;
  const confidence = 0.7;

  insights.push({
    id: nextId(),
    type: 'savings_opportunity',
    title: `Potential Savings in ${topDiscretionary.category}`,
    description: `${topDiscretionary.category} accounts for ${pct.toFixed(0)}% of your total spending — a potential area to reduce.`,
    category: topDiscretionary.category,
    metricValue: topDiscretionary.total,
    comparisonValue: behaviour.totalSpending,
    changePercent: pct,
    severity: 'info',
    confidence,
    priority: computePriority(pct, 'info', confidence),
    explanation: `Your ${topDiscretionary.category} total is ₹${topDiscretionary.total.toLocaleString()}, representing ${pct.toFixed(1)}% of all spending. Discretionary spending overall is ${(discretionaryRatio * 100).toFixed(0)}% of your total. Reducing ${topDiscretionary.category} by even 10–15% could meaningfully improve your savings rate.`,
    evidence: {
      currentValue: topDiscretionary.total,
      changePercent: pct,
      transactionCount: topDiscretionary.count,
    },
  });

  return insights;
}

/**
 * Generator 5: High Concentration
 *
 * Flags when a single category dominates total spending beyond the threshold.
 */
function generateConcentrationInsight(features: FinancialFeatures): Insight[] {
  const { behaviour, topCategories } = features;
  if (topCategories.length === 0) return [];

  const top = topCategories[0];
  if (behaviour.topCategoryConcentration < CONCENTRATION_THRESHOLD) return [];

  const pct = behaviour.topCategoryConcentration * 100;
  const confidence = 0.65;

  return [{
    id: nextId(),
    type: 'high_concentration',
    title: `Spending Concentrated in ${top.category}`,
    description: `${top.category} accounts for ${pct.toFixed(0)}% of your total spending — consider diversifying your budget.`,
    category: top.category,
    metricValue: top.total,
    comparisonValue: behaviour.totalSpending,
    changePercent: pct,
    severity: 'info',
    confidence,
    priority: computePriority(pct - 50, 'info', confidence), // 50% baseline
    explanation: `Your top spending category (${top.category}) accounts for ${pct.toFixed(1)}% of total spending. Concentration above ${(CONCENTRATION_THRESHOLD * 100).toFixed(0)}% may indicate an opportunity to review whether this level of spending aligns with your financial priorities.`,
    evidence: {
      currentValue: top.total,
      changePercent: pct,
      transactionCount: top.count,
    },
  }];
}

/**
 * Generator 6: Spending Volatility
 *
 * Uses the Coefficient of Variation (CV = stdDev / mean) to detect
 * highly irregular spending patterns.
 * CV > 1.0 indicates variance exceeds the mean — a sign of unpredictable spending.
 */
function generateVolatilityInsight(features: FinancialFeatures): Insight[] {
  const { behaviour } = features;
  if (behaviour.transactionCount < 8) return []; // Need enough samples
  if (behaviour.meanAmount === 0) return [];

  const cv = behaviour.stdDev / behaviour.meanAmount;
  if (cv < VOLATILITY_CV_THRESHOLD) return [];

  const confidence = 0.6;

  return [{
    id: nextId(),
    type: 'volatility',
    title: 'Irregular Spending Pattern',
    description: `Your transaction amounts vary significantly, suggesting inconsistent spending habits.`,
    category: 'All',
    metricValue: behaviour.stdDev,
    comparisonValue: behaviour.meanAmount,
    changePercent: cv * 100,
    severity: 'info',
    confidence,
    priority: computePriority(cv * 50, 'info', confidence),
    explanation: `The standard deviation of your transaction amounts (₹${behaviour.stdDev.toFixed(0)}) is ${cv.toFixed(2)}× your mean (₹${behaviour.meanAmount.toFixed(0)}). A Coefficient of Variation above 1.0 indicates high variability, which may make budgeting more difficult. Setting category-level budgets can help stabilise spending.`,
    evidence: {
      currentValue: behaviour.stdDev,
      historicalAverage: behaviour.meanAmount,
      transactionCount: behaviour.transactionCount,
    },
  }];
}

// ─── Insight Ranking & Selection ─────────────────────────────────────────────

/**
 * Ranks candidate insights by priority score and returns the top MAX_INSIGHTS.
 * Discards insights below the minimum confidence threshold.
 */
function rankAndSelect(candidates: Insight[]): Insight[] {
  return candidates
    .filter(i => i.confidence >= MIN_CONFIDENCE)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_INSIGHTS);
}

// ─── Summary Computation ─────────────────────────────────────────────────────

function buildSummary(features: FinancialFeatures, insights: Insight[]) {
  const { behaviour, temporal, topCategories } = features;
  const savingsOpportunityCount = insights.filter(
    i => i.type === 'savings_opportunity' || i.type === 'overspending'
  ).length;

  let momTrend: 'increasing' | 'decreasing' | 'stable' | 'unknown' = 'unknown';
  if (temporal.hasMoMData) {
    if (temporal.momChangeRatio >= TREND_INCREASE_THRESHOLD) momTrend = 'increasing';
    else if (temporal.momChangeRatio <= TREND_DECREASE_THRESHOLD) momTrend = 'decreasing';
    else momTrend = 'stable';
  }

  return {
    totalSpending: behaviour.totalSpending,
    totalTransactions: behaviour.transactionCount,
    topCategory: topCategories[0]?.category ?? 'N/A',
    momTrend,
    momChangePercent: temporal.hasMoMData ? temporal.momChangeRatio * 100 : null,
    savingsOpportunityCount,
  };
}

// ─── Main Engine Entry Point ─────────────────────────────────────────────────

/**
 * Runs the full AI Insights pipeline on raw expense records.
 *
 * Pipeline:
 *   1. Feature extraction  (featureEngineering.ts)
 *   2. Data sufficiency check
 *   3. Candidate insight generation (6 generators)
 *   4. Scoring and ranking
 *   5. Summary construction
 *
 * @param rawExpenses - Expense[] from Dashboard state
 * @returns AIInsightsResult — complete result for the UI
 */
export function runInsightEngine(
  rawExpenses: Array<{ id: string; category: string; amount: number; date: string; title: string; note?: string }>
): AIInsightsResult {
  // Reset ID counter per run to keep IDs consistent during tests
  idCounter = 0;

  // Step 1: Feature extraction
  const features = extractFeatures(rawExpenses);
  const { behaviour, monthsOfHistory } = features;

  // Step 2: Data sufficiency
  const status = determineStatus(behaviour.transactionCount, monthsOfHistory);
  if (status === 'no_data' || status === 'insufficient') {
    return {
      status,
      insights: [],
      summary: {
        totalSpending: behaviour.totalSpending,
        totalTransactions: behaviour.transactionCount,
        topCategory: 'N/A',
        momTrend: 'unknown',
        momChangePercent: null,
        savingsOpportunityCount: 0,
      },
    };
  }

  // Step 3: Generate candidates from all generators
  const candidates: Insight[] = [
    ...generateSpendingInsights(features),
    ...generateTrendInsights(features),
    ...generateAnomalyInsights(features),
    ...generateSavingsOpportunityInsight(features),
    ...generateConcentrationInsight(features),
    ...generateVolatilityInsight(features),
  ];

  // Step 4: Rank and select
  const insights = rankAndSelect(candidates);

  // Step 5: Summary
  const summary = buildSummary(features, insights);

  return { status, insights, summary };
}
