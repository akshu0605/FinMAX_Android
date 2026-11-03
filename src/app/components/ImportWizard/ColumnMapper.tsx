import { useState } from 'react';
import { motion } from 'motion/react';
import { Table, ArrowRight, X, Check, AlertCircle } from 'lucide-react';
import { NeonButton } from '../ui/NeonButton';
import type { ColumnMapping } from '../../utils/statementParser/types';

const TEAL = '#00f2ff';
const monoFont: React.CSSProperties = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };
const headingFont: React.CSSProperties = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(0,242,234,0.22)',
  borderRadius: '10px',
  color: '#fff',
  outline: 'none',
  ...monoFont,
  fontSize: '0.875rem',
};

interface ColumnMapperProps {
  headers: string[];
  initialMapping?: ColumnMapping;
  sampleRows?: string[][];
  onApply: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

export function ColumnMapper({
  headers,
  initialMapping = {},
  sampleRows = [],
  onApply,
  onCancel,
}: ColumnMapperProps) {
  const [useSeparateDebitCredit, setUseSeparateDebitCredit] = useState(
    Boolean(initialMapping.debit || initialMapping.credit)
  );

  const [dateCol, setDateCol] = useState(initialMapping.date || '');
  const [descCol, setDescCol] = useState(initialMapping.description || '');
  const [amountCol, setAmountCol] = useState(initialMapping.amount || '');
  const [debitCol, setDebitCol] = useState(initialMapping.debit || '');
  const [creditCol, setCreditCol] = useState(initialMapping.credit || '');
  const [balanceCol, setBalanceCol] = useState(initialMapping.balance || '');

  const [error, setError] = useState<string | null>(null);

  const getSampleValues = (colName: string): string[] => {
    if (!colName) return [];
    const idx = headers.indexOf(colName);
    if (idx === -1) return [];
    return sampleRows
      .slice(0, 3)
      .map(row => row[idx])
      .filter(val => val !== undefined && val.trim() !== '');
  };

  const handleApply = () => {
    setError(null);
    if (!dateCol) {
      setError('Please select a Date column.');
      return;
    }
    if (!descCol) {
      setError('Please select a Description column.');
      return;
    }
    if (useSeparateDebitCredit) {
      if (!debitCol && !creditCol) {
        setError('Please select at least a Debit or Credit column.');
        return;
      }
    } else {
      if (!amountCol) {
        setError('Please select an Amount column.');
        return;
      }
    }

    const mapping: ColumnMapping = {
      date: dateCol,
      description: descCol,
      ...(useSeparateDebitCredit
        ? { debit: debitCol || undefined, credit: creditCol || undefined }
        : { amount: amountCol }),
      balance: balanceCol || undefined,
    };

    onApply(mapping);
  };

  return (
    <div
      id="csv-column-mapper"
      className="p-6 md:p-8 rounded-[24px] relative overflow-hidden"
      style={{
        background: 'rgba(10, 10, 12, 0.95)',
        border: '1px solid rgba(0,242,234,0.25)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(0,242,234,0.06)',
      }}
    >
      <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(0,242,234,0.12)',
              border: '1px solid rgba(0,242,234,0.3)',
            }}
          >
            <Table className="size-5" style={{ color: TEAL }} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white" style={headingFont}>
              Map CSV Columns
            </h3>
            <p className="text-xs text-neutral-400" style={monoFont}>
              Assign which CSV column corresponds to each FinMax field
            </p>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="text-neutral-400 hover:text-white transition-colors p-2"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Date column */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-neutral-300" style={monoFont}>
            Date Column <span className="text-red-400">*</span>
          </label>
          <select
            value={dateCol}
            onChange={e => setDateCol(e.target.value)}
            style={selectStyle}
          >
            <option value="" disabled style={{ background: '#111' }}>
              Select column...
            </option>
            {headers.map(h => (
              <option key={h} value={h} style={{ background: '#111' }}>
                {h}
              </option>
            ))}
          </select>
          {dateCol && (
            <div className="text-[11px] text-neutral-400 truncate" style={monoFont}>
              Sample: {getSampleValues(dateCol).join(', ') || 'None'}
            </div>
          )}
        </div>

        {/* Description column */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-neutral-300" style={monoFont}>
            Description / Particulars <span className="text-red-400">*</span>
          </label>
          <select
            value={descCol}
            onChange={e => setDescCol(e.target.value)}
            style={selectStyle}
          >
            <option value="" disabled style={{ background: '#111' }}>
              Select column...
            </option>
            {headers.map(h => (
              <option key={h} value={h} style={{ background: '#111' }}>
                {h}
              </option>
            ))}
          </select>
          {descCol && (
            <div className="text-[11px] text-neutral-400 truncate" style={monoFont}>
              Sample: {getSampleValues(descCol).join(', ') || 'None'}
            </div>
          )}
        </div>

        {/* Amount Mode Switcher */}
        <div className="col-span-full py-2">
          <div className="flex items-center gap-4 text-xs" style={monoFont}>
            <span className="text-neutral-400">Amount Format:</span>
            <button
              type="button"
              onClick={() => setUseSeparateDebitCredit(false)}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                !useSeparateDebitCredit
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 font-semibold'
                  : 'bg-white/5 border-white/10 text-neutral-400'
              }`}
            >
              Single Amount Column
            </button>
            <button
              type="button"
              onClick={() => setUseSeparateDebitCredit(true)}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                useSeparateDebitCredit
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 font-semibold'
                  : 'bg-white/5 border-white/10 text-neutral-400'
              }`}
            >
              Separate Debit & Credit Columns
            </button>
          </div>
        </div>

        {!useSeparateDebitCredit ? (
          /* Single Amount */
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-300" style={monoFont}>
              Amount Column <span className="text-red-400">*</span>
            </label>
            <select
              value={amountCol}
              onChange={e => setAmountCol(e.target.value)}
              style={selectStyle}
            >
              <option value="" disabled style={{ background: '#111' }}>
                Select column...
              </option>
              {headers.map(h => (
                <option key={h} value={h} style={{ background: '#111' }}>
                  {h}
                </option>
              ))}
            </select>
            {amountCol && (
              <div className="text-[11px] text-neutral-400 truncate" style={monoFont}>
                Sample: {getSampleValues(amountCol).join(', ') || 'None'}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Debit Column */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-300" style={monoFont}>
                Debit (Withdrawal / Expense) Column
              </label>
              <select
                value={debitCol}
                onChange={e => setDebitCol(e.target.value)}
                style={selectStyle}
              >
                <option value="" style={{ background: '#111' }}>
                  (None)
                </option>
                {headers.map(h => (
                  <option key={h} value={h} style={{ background: '#111' }}>
                    {h}
                  </option>
                ))}
              </select>
              {debitCol && (
                <div className="text-[11px] text-neutral-400 truncate" style={monoFont}>
                  Sample: {getSampleValues(debitCol).join(', ') || 'None'}
                </div>
              )}
            </div>

            {/* Credit Column */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-300" style={monoFont}>
                Credit (Deposit / Income) Column
              </label>
              <select
                value={creditCol}
                onChange={e => setCreditCol(e.target.value)}
                style={selectStyle}
              >
                <option value="" style={{ background: '#111' }}>
                  (None)
                </option>
                {headers.map(h => (
                  <option key={h} value={h} style={{ background: '#111' }}>
                    {h}
                  </option>
                ))}
              </select>
              {creditCol && (
                <div className="text-[11px] text-neutral-400 truncate" style={monoFont}>
                  Sample: {getSampleValues(creditCol).join(', ') || 'None'}
                </div>
              )}
            </div>
          </>
        )}

        {/* Balance Column (Optional) */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-neutral-300" style={monoFont}>
            Balance Column <span className="text-neutral-500 font-normal">(Ignored from expenses)</span>
          </label>
          <select
            value={balanceCol}
            onChange={e => setBalanceCol(e.target.value)}
            style={selectStyle}
          >
            <option value="" style={{ background: '#111' }}>
              (None)
            </option>
            {headers.map(h => (
              <option key={h} value={h} style={{ background: '#111' }}>
                {h}
              </option>
            ))}
          </select>
          {balanceCol && (
            <div className="text-[11px] text-neutral-400 truncate" style={monoFont}>
              Sample: {getSampleValues(balanceCol).join(', ') || 'None'}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
        <NeonButton variant="ghost" onClick={onCancel}>
          Cancel
        </NeonButton>
        <NeonButton onClick={handleApply}>
          <Check className="size-4" /> Apply Mapping & Parse
        </NeonButton>
      </div>
    </div>
  );
}
