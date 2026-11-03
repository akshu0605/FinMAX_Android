import type { Insight, InsightSeverity } from '../../../ai-insights/types';
import { motion } from 'motion/react';

// ─── Design tokens (matching Dashboard.tsx conventions) ──────────────────────
const TEAL = '#00F2EA';
const headingFont: React.CSSProperties = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };
const monoFont: React.CSSProperties = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };

// ─── Severity config ─────────────────────────────────────────────────────────
interface SeverityConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  icon: string;
}

const SEVERITY_CONFIG: Record<InsightSeverity, SeverityConfig> = {
  critical: {
    color: '#F87171',
    bgColor: 'rgba(248,113,113,0.08)',
    borderColor: 'rgba(248,113,113,0.25)',
    label: 'Attention Required',
    icon: '⚠',
  },
  warning: {
    color: '#FBBF24',
    bgColor: 'rgba(251,191,36,0.08)',
    borderColor: 'rgba(251,191,36,0.22)',
    label: 'Worth Noting',
    icon: '◈',
  },
  info: {
    color: TEAL,
    bgColor: 'rgba(0,242,234,0.06)',
    borderColor: 'rgba(0,242,234,0.18)',
    label: 'Insight',
    icon: '◉',
  },
  success: {
    color: '#34D399',
    bgColor: 'rgba(52,211,153,0.07)',
    borderColor: 'rgba(52,211,153,0.22)',
    label: 'Positive Trend',
    icon: '✦',
  },
};

// ─── Type-to-label mapping ────────────────────────────────────────────────────
const TYPE_LABEL: Record<string, string> = {
  overspending: 'Spending Alert',
  underspending: 'Improved Spending',
  unusual_transaction: 'Unusual Transaction',
  trend_increase: 'Spending Trend',
  trend_decrease: 'Positive Trend',
  savings_opportunity: 'Savings Opportunity',
  recurring_expense: 'Recurring Expense',
  high_concentration: 'Budget Concentration',
  positive_behaviour: 'Financial Highlight',
  volatility: 'Spending Pattern',
};

interface InsightCardProps {
  insight: Insight;
  index: number;
  currencySymbol: string;
}

export function InsightCard({ insight, index, currencySymbol }: InsightCardProps) {
  const config = SEVERITY_CONFIG[insight.severity];

  const formatValue = (v: number | null) =>
    v !== null ? `${currencySymbol}${Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—';

  const formatPct = (v: number | null) =>
    v !== null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : null;

  const changeLabel = formatPct(insight.changePercent);
  const isPositive = insight.severity === 'success';
  const changeColor = isPositive ? '#34D399' : insight.changePercent && insight.changePercent < 0 ? '#34D399' : '#FBBF24';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        background: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        borderRadius: '16px',
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      whileHover={{ y: -2, boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${config.color}10` }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          background: config.color,
          borderRadius: '16px 0 0 16px',
          boxShadow: `0 0 12px ${config.color}60`,
        }}
      />

      {/* Top sheen */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%)',
          borderRadius: 'inherit',
          pointerEvents: 'none',
        }}
      />

      <div className="relative" style={{ paddingLeft: '8px' }}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Icon */}
            <span
              style={{
                fontSize: '16px',
                color: config.color,
                lineHeight: 1,
                marginTop: '3px',
                flexShrink: 0,
                textShadow: `0 0 10px ${config.color}80`,
              }}
            >
              {config.icon}
            </span>

            <div>
              {/* Type tag */}
              <div className="flex items-center gap-2 mb-1">
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: config.color,
                    ...monoFont,
                  }}
                >
                  {TYPE_LABEL[insight.type] ?? config.label}
                </span>
                {insight.category !== 'All' && (
                  <>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>·</span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', ...monoFont }}>
                      {insight.category}
                    </span>
                  </>
                )}
              </div>

              {/* Title */}
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0, ...headingFont }}>
                {insight.title}
              </h3>
            </div>
          </div>

          {/* Change badge */}
          {changeLabel && (
            <div
              style={{
                flexShrink: 0,
                fontSize: '12px',
                fontWeight: 700,
                color: changeColor,
                background: `${changeColor}14`,
                border: `1px solid ${changeColor}30`,
                borderRadius: '8px',
                padding: '3px 8px',
                ...monoFont,
                whiteSpace: 'nowrap',
              }}
            >
              {changeLabel}
            </div>
          )}
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.65)',
            margin: '0 0 14px 0',
            lineHeight: 1.55,
            ...monoFont,
          }}
        >
          {insight.description}
        </p>

        {/* Evidence metrics row */}
        {(insight.metricValue !== null || insight.comparisonValue !== null) && (
          <div
            className="flex items-center gap-6 flex-wrap"
            style={{ marginBottom: '14px' }}
          >
            {insight.metricValue !== null && (
              <div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', ...monoFont, marginBottom: '2px' }}>
                  Current
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', ...monoFont }}>
                  {formatValue(insight.metricValue)}
                </div>
              </div>
            )}
            {insight.comparisonValue !== null && insight.comparisonValue > 0 && (
              <>
                <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: '18px' }}>→</div>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', ...monoFont, marginBottom: '2px' }}>
                    Baseline
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', ...monoFont }}>
                    {formatValue(insight.comparisonValue)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Explanation */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px',
            padding: '10px 12px',
          }}
        >
          <div style={{ fontSize: '10px', color: config.color, fontWeight: 600, marginBottom: '4px', ...monoFont, letterSpacing: '0.06em' }}>
            ANALYSIS
          </div>
          <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5, ...monoFont }}>
            {insight.explanation}
          </p>
        </div>

        {/* Confidence bar */}
        <div className="flex items-center gap-3 mt-3">
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', ...monoFont }}>Confidence</span>
          <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${insight.confidence * 100}%` }}
              transition={{ delay: index * 0.07 + 0.3, duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', background: config.color, borderRadius: '2px' }}
            />
          </div>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', ...monoFont }}>
            {(insight.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
