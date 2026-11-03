import type { AIInsightsResult } from '../../../ai-insights/types';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TEAL = '#00F2EA';
const headingFont: React.CSSProperties = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };
const monoFont: React.CSSProperties = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };

interface InsightSummaryProps {
  result: AIInsightsResult;
  currencySymbol: string;
}

export function InsightSummary({ result, currencySymbol }: InsightSummaryProps) {
  const { summary } = result;

  const trendIcon =
    summary.momTrend === 'increasing' ? TrendingUp :
    summary.momTrend === 'decreasing' ? TrendingDown :
    Minus;

  const trendColor =
    summary.momTrend === 'increasing' ? '#FBBF24' :
    summary.momTrend === 'decreasing' ? '#34D399' :
    '#A1A1A1';

  const trendLabel =
    summary.momTrend === 'increasing' ? 'vs. prior period' :
    summary.momTrend === 'decreasing' ? 'vs. prior period' :
    summary.momTrend === 'stable' ? 'Stable trend' :
    'Insufficient history';

  const TrendIcon = trendIcon;

  const metrics = [
    {
      label: 'Total Spending',
      value: `${currencySymbol}${summary.totalSpending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      sub: 'All time',
      color: '#F87171',
    },
    {
      label: 'Transactions',
      value: summary.totalTransactions.toString(),
      sub: 'Analyzed',
      color: TEAL,
    },
    {
      label: 'Top Category',
      value: summary.topCategory,
      sub: 'Highest spend',
      color: '#FBBF24',
    },
    {
      label: 'Spending Trend',
      value: summary.momChangePercent !== null
        ? `${summary.momChangePercent >= 0 ? '+' : ''}${summary.momChangePercent.toFixed(1)}%`
        : '—',
      sub: trendLabel,
      color: trendColor,
      isPositive: summary.momTrend === 'decreasing',
      isTrend: true,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '22px 24px',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        marginBottom: '28px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top sheen */}
      <div
        style={{
          position: 'absolute',
          inset: '0',
          background: 'linear-gradient(135deg, rgba(0,242,234,0.025) 0%, transparent 50%)',
          pointerEvents: 'none',
          borderRadius: 'inherit',
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-5">
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: TEAL,
              boxShadow: `0 0 8px ${TEAL}`,
            }}
          />
          <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0, ...monoFont }}>
            Financial Overview
          </h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 + 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', ...monoFont, marginBottom: '6px', letterSpacing: '0.05em' }}>
                {m.label}
              </div>
              <div className="flex items-baseline gap-1.5">
                {m.isTrend && summary.momTrend !== 'unknown' && (
                  <TrendIcon style={{ width: '14px', height: '14px', color: m.color, flexShrink: 0, marginBottom: '1px' }} />
                )}
                <div
                  style={{
                    fontSize: m.value.length > 8 ? '14px' : '18px',
                    fontWeight: 700,
                    color: m.color,
                    ...monoFont,
                    lineHeight: 1.1,
                    wordBreak: 'break-all',
                  }}
                >
                  {m.value}
                </div>
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', ...monoFont, marginTop: '3px' }}>
                {m.sub}
              </div>
            </motion.div>
          ))}
        </div>

        {summary.savingsOpportunityCount > 0 && (
          <div
            style={{
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#FBBF24',
                boxShadow: '0 0 6px rgba(251,191,36,0.5)',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', ...monoFont }}>
              {summary.savingsOpportunityCount} area{summary.savingsOpportunityCount !== 1 ? 's' : ''} identified as potential savings opportunities
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
