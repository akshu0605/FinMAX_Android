import { useMemo } from 'react';
import { motion } from 'motion/react';
import { runInsightEngine } from '../../../ai-insights/aiInsightsModel';
import { InsightCard } from './InsightCard';
import { InsightSummary } from './InsightSummary';

// ─── Design tokens (matching Dashboard.tsx conventions exactly) ───────────────
const TEAL = '#00F2EA';
const headingFont: React.CSSProperties = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };
const monoFont: React.CSSProperties = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };

// ─── Props ────────────────────────────────────────────────────────────────────
interface AIInsightsProps {
  /** Raw expenses passed directly from Dashboard state — no new API calls */
  expenses: Array<{ id: string; category: string; amount: number; date: string; title: string; note?: string }>;
  currencySymbol: string;
}

// ─── Empty / Insufficient State ───────────────────────────────────────────────
function EmptyState({ type }: { type: 'no_data' | 'insufficient' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center text-center"
      style={{ padding: '80px 32px' }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'rgba(0,242,234,0.07)',
          border: '1px solid rgba(0,242,234,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          fontSize: '28px',
        }}
      >
        {type === 'no_data' ? '📊' : '🔍'}
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '10px', ...headingFont }}>
        {type === 'no_data'
          ? 'No Transaction Data Yet'
          : 'More Data Needed'}
      </h3>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', maxWidth: '340px', lineHeight: 1.6, ...monoFont }}>
        {type === 'no_data'
          ? 'Add a few transactions to generate personalized financial insights based on your actual spending behaviour.'
          : 'Add at least 5 transactions to unlock spending pattern analysis. More history means more reliable insights.'}
      </p>
      {type === 'insufficient' && (
        <div
          style={{
            marginTop: '24px',
            padding: '10px 18px',
            background: 'rgba(0,242,234,0.06)',
            border: '1px solid rgba(0,242,234,0.15)',
            borderRadius: '10px',
          }}
        >
          <span style={{ fontSize: '11px', color: 'rgba(0,242,234,0.7)', ...monoFont }}>
            Minimum 5 transactions required
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Limited Data Notice ──────────────────────────────────────────────────────
function LimitedDataBanner({ transactionCount }: { transactionCount: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        marginBottom: '20px',
        padding: '10px 16px',
        background: 'rgba(251,191,36,0.06)',
        border: '1px solid rgba(251,191,36,0.18)',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <span style={{ fontSize: '12px', color: '#FBBF24', ...monoFont }}>
        ◈ Limited history ({transactionCount} transactions) — insights will improve with more data.
      </span>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AIInsights({ expenses, currencySymbol }: AIInsightsProps) {
  /**
   * The insight engine is called inside useMemo so it only re-runs when the
   * expenses array reference changes (i.e., after add/edit/delete).
   * This avoids redundant computation on unrelated re-renders.
   */
  const result = useMemo(() => runInsightEngine(expenses), [expenses]);

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ marginBottom: '28px' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: TEAL,
                  boxShadow: `0 0 10px ${TEAL}`,
                  animation: 'pulse 2s infinite',
                }}
              />
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: TEAL,
                  ...monoFont,
                }}
              >
                AI Financial Insights
              </span>
            </div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#fff',
                margin: 0,
                letterSpacing: '-0.02em',
                ...headingFont,
              }}
            >
              Spending Intelligence
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '6px 0 0 0', ...monoFont }}>
              Personalized analysis of your financial behaviour
            </p>
          </div>

          {/* Method badge */}
          <div
            style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '8px',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', ...monoFont, letterSpacing: '0.06em', marginBottom: '2px' }}>
              ENGINE
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', ...monoFont }}>
              Statistical Analysis
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Empty / Insufficient States ─────────────────────────────────────── */}
      {(result.status === 'no_data' || result.status === 'insufficient') && (
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '20px',
            backdropFilter: 'blur(16px)',
          }}
        >
          <EmptyState type={result.status} />
        </div>
      )}

      {/* ── Data Available ────────────────────────────────────────────────── */}
      {(result.status === 'limited' || result.status === 'sufficient') && (
        <>
          {/* Summary Overview */}
          <InsightSummary result={result} currencySymbol={currencySymbol} />

          {/* Limited data warning */}
          {result.status === 'limited' && (
            <LimitedDataBanner transactionCount={result.summary.totalTransactions} />
          )}

          {/* Insights Header */}
          <div className="flex items-center gap-3 mb-5">
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: 0, ...monoFont }}>
              Key Insights
            </h2>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', ...monoFont }}>
              {result.insights.length} finding{result.insights.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Insights Grid */}
          {result.insights.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: '48px 32px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '16px' }}>✦</div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', ...monoFont, margin: 0 }}>
                Your spending looks well-balanced. No significant patterns detected yet.
              </p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4">
              {result.insights.map((insight, i) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  index={i}
                  currencySymbol={currencySymbol}
                />
              ))}
            </div>
          )}

          {/* Footer note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              marginTop: '28px',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '10px',
            }}
          >
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0, lineHeight: 1.5, ...monoFont }}>
              Insights are generated from your actual transaction history using statistical analysis (IQR anomaly detection, Z-score, MoM comparison). 
              This analysis is advisory only — all thresholds are personalised to your own spending baseline.
            </p>
          </motion.div>
        </>
      )}
    </div>
  );
}
