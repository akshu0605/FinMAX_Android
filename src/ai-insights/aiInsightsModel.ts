/**
 * FinMax AI Insights — Main Model Entry Point
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  This is the primary file to open when demonstrating the AI    │
 * │  methodology to a mentor or examiner.                          │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * ────────────────────────────────────────────────────────────────────────────
 * METHODOLOGY OVERVIEW
 * ────────────────────────────────────────────────────────────────────────────
 *
 * The AI Insights system is a frontend-only, statistical financial intelligence
 * engine. It does NOT use an external AI API, LLM, or pre-trained neural
 * network. Instead it implements an explainable statistical analysis pipeline
 * that is:
 *
 *   ✦ Data-driven: All insights are computed from the user's actual transactions.
 *   ✦ Personalised: Thresholds are derived from the individual user's own history.
 *   ✦ Explainable: Every insight includes a full audit trail back to raw data.
 *   ✦ Transparent: The methodology is fully documented and open to inspection.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PIPELINE ARCHITECTURE
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   Raw Expense Records (from Supabase via Dashboard state)
 *             │
 *             ▼
 *   ┌─────────────────────┐
 *   │  Normalisation      │  featureEngineering.ts
 *   │  • Type coercion    │  Converts raw expenses to NormalizedExpense[].
 *   │  • Date parsing     │  No schema changes required.
 *   │  • Amount filtering │
 *   └──────────┬──────────┘
 *              │
 *              ▼
 *   ┌─────────────────────┐
 *   │  Feature Extraction │  featureEngineering.ts
 *   │  • Category stats   │  Category totals, means, medians, frequencies.
 *   │  • Temporal windows │  30-day / 60-day sliding windows.
 *   │  • Behaviour stats  │  Mean, median, std dev, concentration, volatility.
 *   └──────────┬──────────┘
 *              │
 *              ▼
 *   ┌─────────────────────┐
 *   │  Anomaly Detection  │  anomalyDetection.ts
 *   │  • IQR (primary)    │  Tukey fence: upper = Q3 + 1.5 × IQR.
 *   │  • Z-score (fallback│  |z| > 2.0 when sample size < 4.
 *   └──────────┬──────────┘
 *              │
 *              ▼
 *   ┌─────────────────────┐
 *   │  Insight Generation │  insightEngine.ts
 *   │  6 generators       │  Spending, Trend, Anomaly, Savings,
 *   │                     │  Concentration, Volatility.
 *   └──────────┬──────────┘
 *              │
 *              ▼
 *   ┌─────────────────────┐
 *   │  Scoring & Ranking  │  insightEngine.ts
 *   │  priority = mag ×   │  Magnitude score (log-scaled) ×
 *   │    severity ×       │  Severity weight ×
 *   │    confidence       │  Confidence (data-volume adjusted).
 *   └──────────┬──────────┘
 *              │
 *              ▼
 *   ┌─────────────────────┐
 *   │  UI Output          │  AIInsights.tsx, InsightCard.tsx
 *   │  • Top 3–5 insights │  Ranked by priority.
 *   │  • Explanations     │  Full human-readable audit trail.
 *   │  • Summary panel    │  Overview metrics.
 *   └─────────────────────┘
 *
 * ────────────────────────────────────────────────────────────────────────────
 * FEATURE ENGINEERING DETAILS
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   Basic Features:
 *     - totalSpending, transactionCount, meanAmount, medianAmount, stdDev
 *
 *   Category Features:
 *     - Per-category total, count, average, percentage share
 *     - Raw per-transaction amounts (for anomaly detection distributions)
 *
 *   Temporal Features:
 *     - Current 30-day window spending
 *     - Previous 30-day window spending (for MoM comparison)
 *     - Rolling 7-day average daily spend
 *     - Month-over-month change ratio
 *
 *   Behaviour Features:
 *     - Spending concentration (top-category share of total)
 *     - Essential vs. discretionary split (Bills/Healthcare/Transport vs. rest)
 *     - Coefficient of Variation (stdDev / mean) for volatility detection
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ANOMALY DETECTION METHODOLOGY
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   Primary method — IQR (n ≥ 4 per category):
 *     IQR = Q3 − Q1
 *     upper_fence = Q3 + 1.5 × IQR
 *     A transaction is anomalous if amount > upper_fence.
 *
 *   Fallback method — Z-Score (3 ≤ n < 4):
 *     z = (amount − mean) / stdDev
 *     A transaction is anomalous if |z| > 2.0.
 *
 *   Both methods are applied per-category so that a ₹10,000 grocery spend
 *   is not compared against a ₹500 transport baseline.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PERSONALISATION APPROACH
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   All thresholds are computed from the individual user's own transaction
 *   history — not from population averages or hardcoded values.
 *
 *   Example (overspending detection):
 *     historical_avg = category_total / months_of_history
 *     current_30d    = sum of transactions in last 30 days
 *     ratio          = (current_30d − historical_avg) / historical_avg
 *     → flagged if ratio ≥ 0.30 (30% above personal average)
 *
 *   This means a user who consistently spends ₹15,000 on food per month
 *   will NOT be flagged for ₹16,000 food spend, but a user who averages
 *   ₹4,000 would be flagged for the same ₹16,000 spend.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * INSIGHT SCORING
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   priority = magnitude_score × severity_weight × confidence × 100
 *
 *   magnitude_score = log(1 + |pctChange| / 50) / log(5)   [0, 1]
 *
 *   severity_weight:
 *     critical → 1.0
 *     warning  → 0.8
 *     success  → 0.6
 *     info     → 0.5
 *
 *   confidence: [0, 1]
 *     Reduced proportionally with fewer transactions or less history.
 *     Insights with confidence < 0.30 are discarded.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * HONEST LIMITATIONS
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   1. This is NOT a neural network or deep learning model.
 *      It is an explainable statistical pipeline. This is intentional —
 *      a lightweight, auditable model is more appropriate for this context
 *      than a black-box model.
 *
 *   2. MoM comparisons require at least 2 calendar months of data.
 *      With insufficient history, those generators are silently skipped.
 *
 *   3. Anomaly detection may produce false positives with very few transactions
 *      (< 3 per category). The minimum sample requirement guards against this.
 *
 *   4. The engine does not have access to income data (only expenses),
 *      so savings rate analysis is limited to expense-side signals.
 *
 *   5. Category labels ('Food & Dining', 'Shopping', etc.) are taken verbatim
 *      from the existing Expense schema. Mis-categorised transactions will
 *      affect insight quality.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * FUTURE IMPROVEMENTS
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   → Integration with a pre-trained spending classification model
 *     (e.g. a scikit-learn model converted to ONNX and run via onnxruntime-web)
 *     to automatically re-categorise free-text transaction descriptions.
 *
 *   → TensorFlow.js LSTM model for sequential spending forecasting,
 *     given sufficient transaction history (6+ months recommended).
 *
 *   → Peer-comparison benchmarks (requires opt-in anonymised population data).
 *
 *   → Integration with income data to produce net savings rate insights.
 */

// ── Re-export public API ─────────────────────────────────────────────────────

export { runInsightEngine } from './insightEngine';
export { extractFeatures } from './featureEngineering';
export { detectAnomalies } from './anomalyDetection';
export type {
  AIInsightsResult,
  Insight,
  InsightType,
  InsightSeverity,
  DataSufficiencyStatus,
  FinancialFeatures,
  NormalizedExpense,
  CategoryStats,
  TemporalStats,
  BehaviourStats,
  AnomalyResult,
} from './types';
