/**
 * AI Insights Module — Type Definitions
 *
 * These types define the normalized data structures consumed by the AI engine
 * and the output structures rendered in the UI. They are intentionally separate
 * from the Expense interface in Dashboard.tsx so the AI module remains
 * independently portable and testable.
 */

// ─── Input: Normalized expense record consumed by the AI engine ─────────────

export interface NormalizedExpense {
  id: string;
  /** Expense category: Food & Dining, Shopping, etc. */
  category: string;
  /** Amount in the user's currency (numeric, always positive) */
  amount: number;
  /** ISO date string, e.g. "2025-09-15T00:00:00.000Z" */
  date: string;
  /** Human-readable title / description */
  title: string;
  /** Parsed Date object — computed once during normalization */
  dateObj: Date;
  /** Unix timestamp (ms) — used for time-window math */
  timestamp: number;
}

// ─── Feature Engineering Output ─────────────────────────────────────────────

export interface CategoryStats {
  category: string;
  total: number;
  count: number;
  average: number;
  /** Percentage of total spending this category represents */
  percentage: number;
  /** Per-transaction amounts — used for anomaly detection */
  amounts: number[];
}

export interface TemporalStats {
  /** Total spending in the current 30-day window */
  currentMonthTotal: number;
  /** Total spending in the previous 30-day window */
  previousMonthTotal: number;
  /** Month-over-month change as a ratio: (current - previous) / previous */
  momChangeRatio: number;
  /** Whether we have enough history for reliable MoM comparison */
  hasMoMData: boolean;
  /** Spending by day-of-month (1–31) */
  dailySpending: Record<string, number>;
  /** Rolling 7-day average of daily spending */
  rollingAvg7d: number;
}

export interface BehaviourStats {
  /** Total spending across all time */
  totalSpending: number;
  /** Total number of transactions */
  transactionCount: number;
  /** Mean transaction amount */
  meanAmount: number;
  /** Median transaction amount */
  medianAmount: number;
  /** Standard deviation of all transaction amounts */
  stdDev: number;
  /**
   * Spending concentration: fraction of total spending accounted for
   * by the top category. High values indicate concentrated spending.
   */
  topCategoryConcentration: number;
  /** Estimated essential spending (Bills, Healthcare, Transportation) */
  essentialSpending: number;
  /** Estimated discretionary spending (everything else) */
  discretionarySpending: number;
}

export interface FinancialFeatures {
  normalized: NormalizedExpense[];
  categoryStats: CategoryStats[];
  temporal: TemporalStats;
  behaviour: BehaviourStats;
  /** Sorted category list by total spending, descending */
  topCategories: CategoryStats[];
  /** Number of distinct calendar months present in the data */
  monthsOfHistory: number;
}

// ─── Anomaly Detection ───────────────────────────────────────────────────────

export interface AnomalyResult {
  expense: NormalizedExpense;
  /** IQR-based or Z-score flag */
  method: 'IQR' | 'ZSCORE';
  /**
   * Z-score of the transaction amount relative to the category distribution.
   * A Z-score > 2.5 is considered unusual.
   */
  zScore: number;
  /** Category-level historical median used as baseline */
  categoryMedian: number;
  /** Deviation from median as a percentage */
  deviationPct: number;
}

// ─── Insight Output ─────────────────────────────────────────────────────────

export type InsightType =
  | 'overspending'         // Spending significantly above personal historical average
  | 'underspending'        // Spending below average — positive behaviour
  | 'unusual_transaction'  // A single transaction is anomalously large
  | 'trend_increase'       // Month-over-month spending increased
  | 'trend_decrease'       // Month-over-month spending decreased  (positive)
  | 'savings_opportunity'  // Category represents a reduction opportunity
  | 'recurring_expense'    // Pattern of repeated spending detected
  | 'high_concentration'   // Too much spending in a single category
  | 'positive_behaviour'   // Catch-all for encouraging observations
  | 'volatility';          // Spending is highly irregular

export type InsightSeverity = 'info' | 'warning' | 'success' | 'critical';

export interface Insight {
  /** Unique identifier for deduplication */
  id: string;
  type: InsightType;
  title: string;
  /** One-sentence summary displayed in the card */
  description: string;
  /**
   * The primary category this insight relates to.
   * May be 'All' for cross-category observations.
   */
  category: string;
  /** Key numeric metric value (e.g. current spending amount) */
  metricValue: number;
  /** Comparison baseline (e.g. historical average) */
  comparisonValue: number | null;
  /** Percentage change or deviation, if applicable */
  changePercent: number | null;
  severity: InsightSeverity;
  /**
   * Confidence score [0, 1]. Low confidence insights are suppressed
   * if higher-confidence alternatives exist.
   * Confidence decreases with less historical data.
   */
  confidence: number;
  /**
   * Priority score [0, 100] used for ranking.
   * Derived from: magnitude × severity weight × confidence × recency.
   */
  priority: number;
  /** Human-readable explanation of how this insight was derived */
  explanation: string;
  /** Supporting evidence shown in the expanded insight card */
  evidence: InsightEvidence;
}

export interface InsightEvidence {
  currentValue?: number;
  historicalAverage?: number;
  changePercent?: number;
  transactionTitle?: string;
  transactionAmount?: number;
  categoryMedian?: number;
  monthsAnalyzed?: number;
  transactionCount?: number;
}

// ─── Engine Output ───────────────────────────────────────────────────────────

export type DataSufficiencyStatus =
  | 'no_data'           // 0 transactions
  | 'insufficient'      // 1–4 transactions — not enough for patterns
  | 'limited'           // 5–14 transactions — some analysis possible
  | 'sufficient';       // 15+ transactions — full analysis

export interface AIInsightsResult {
  status: DataSufficiencyStatus;
  /** Top insights after scoring and de-duplication (3–5 max) */
  insights: Insight[];
  /** Summary statistics for the overview panel */
  summary: {
    totalSpending: number;
    totalTransactions: number;
    topCategory: string;
    momTrend: 'increasing' | 'decreasing' | 'stable' | 'unknown';
    momChangePercent: number | null;
    savingsOpportunityCount: number;
  };
}
