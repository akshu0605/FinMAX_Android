import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  X,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  UserCheck,
  Filter,
  CheckSquare,
  Square,
  Search,
} from 'lucide-react';
import { NeonButton } from '../ui/NeonButton';
import {
  FINMAX_CATEGORIES,
  type PreviewRow,
  type FinMaxCategory,
} from '../../utils/statementParser/types';

const TEAL = '#00f2ff';
const monoFont: React.CSSProperties = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };
const headingFont: React.CSSProperties = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };

interface PreviewTableProps {
  rows: PreviewRow[];
  currency?: string;
  onUpdateRow: (key: string, updates: Partial<PreviewRow>) => void;
  onBulkInclude: (keys: string[], included: boolean) => void;
  onBulkSetCategory: (keys: string[], category: FinMaxCategory) => void;
}

type FilterTab = 'all' | 'valid' | 'duplicate' | 'credit' | 'invalid';

export function PreviewTable({
  rows,
  currency = '₹',
  onUpdateRow,
  onBulkInclude,
  onBulkSetCategory,
}: PreviewTableProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Stats calculation
  const stats = useMemo(() => {
    let totalValid = 0;
    let totalDuplicates = 0;
    let totalCredits = 0;
    let totalInvalid = 0;
    let selectedCount = 0;
    let selectedAmount = 0;

    for (const r of rows) {
      if (r.status === 'valid') totalValid++;
      if (r.status === 'duplicate') totalDuplicates++;
      if (r.isCredit || r.status === 'credit') totalCredits++;
      if (r.status === 'invalid_date' || r.status === 'invalid_amount') totalInvalid++;
      if (r.included) {
        selectedCount++;
        selectedAmount += r.amount;
      }
    }

    return {
      total: rows.length,
      totalValid,
      totalDuplicates,
      totalCredits,
      totalInvalid,
      selectedCount,
      selectedAmount,
    };
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      // Tab filter
      if (activeTab === 'valid' && row.status !== 'valid') return false;
      if (activeTab === 'duplicate' && row.status !== 'duplicate') return false;
      if (activeTab === 'credit' && !row.isCredit && row.status !== 'credit') return false;
      if (
        activeTab === 'invalid' &&
        row.status !== 'invalid_date' &&
        row.status !== 'invalid_amount'
      )
        return false;

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesDesc = row.description.toLowerCase().includes(query);
        const matchesCat = row.category.toLowerCase().includes(query);
        const matchesDate = row.date.toLowerCase().includes(query);
        const matchesAmt = row.amount.toString().includes(query);
        if (!matchesDesc && !matchesCat && !matchesDate && !matchesAmt) return false;
      }

      return true;
    });
  }, [rows, activeTab, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Bulk actions
  const handleSelectAllInView = () => {
    const keys = filteredRows.map(r => r.key);
    onBulkInclude(keys, true);
  };

  const handleDeselectAllInView = () => {
    const keys = filteredRows.map(r => r.key);
    onBulkInclude(keys, false);
  };

  const handleExcludeDuplicates = () => {
    const duplicateKeys = rows.filter(r => r.status === 'duplicate').map(r => r.key);
    onBulkInclude(duplicateKeys, false);
  };

  const handleIncludeValidOnly = () => {
    const validKeys = rows.filter(r => r.status === 'valid').map(r => r.key);
    const nonValidKeys = rows.filter(r => r.status !== 'valid').map(r => r.key);
    onBulkInclude(validKeys, true);
    onBulkInclude(nonValidKeys, false);
  };

  return (
    <div className="space-y-4">
      {/* Top Stats Banner */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(0,242,234,0.15)',
        }}
      >
        <div>
          <div className="text-[11px] text-neutral-400" style={monoFont}>
            Selected / Total
          </div>
          <div className="text-lg font-bold text-white flex items-center gap-1.5" style={monoFont}>
            <span style={{ color: TEAL }}>{stats.selectedCount}</span>
            <span className="text-neutral-500 text-sm">/ {stats.total}</span>
          </div>
        </div>

        <div>
          <div className="text-[11px] text-neutral-400" style={monoFont}>
            Total Amount (Selected)
          </div>
          <div className="text-lg font-bold text-white truncate" style={monoFont}>
            {currency}
            {stats.selectedAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-neutral-400" style={monoFont}>
            Duplicates Detected
          </div>
          <div
            className={`text-lg font-bold ${
              stats.totalDuplicates > 0 ? 'text-amber-400' : 'text-neutral-400'
            }`}
            style={monoFont}
          >
            {stats.totalDuplicates}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-neutral-400" style={monoFont}>
            Income / Credits
          </div>
          <div
            className={`text-lg font-bold ${
              stats.totalCredits > 0 ? 'text-emerald-400' : 'text-neutral-400'
            }`}
            style={monoFont}
          >
            {stats.totalCredits}
          </div>
        </div>
      </div>

      {/* Control Bar: Tabs, Search, Quick Selection Actions */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {(
            [
              { id: 'all', label: `All (${rows.length})` },
              { id: 'valid', label: `Valid (${stats.totalValid})` },
              { id: 'duplicate', label: `Duplicates (${stats.totalDuplicates})` },
              { id: 'credit', label: `Income/Credit (${stats.totalCredits})` },
              ...(stats.totalInvalid > 0
                ? [{ id: 'invalid', label: `Issues (${stats.totalInvalid})` }]
                : []),
            ] as const
          ).map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as FilterTab);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-semibold shadow-[0_0_12px_rgba(0,242,234,0.15)]'
                    : 'bg-white/5 text-neutral-400 border border-transparent hover:text-white'
                }`}
                style={monoFont}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Quick action shortcuts */}
        <div className="flex items-center gap-2 text-xs" style={monoFont}>
          {stats.totalDuplicates > 0 && (
            <button
              type="button"
              onClick={handleExcludeDuplicates}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all"
            >
              Exclude Duplicates
            </button>
          )}

          <button
            type="button"
            onClick={handleIncludeValidOnly}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-all"
          >
            Select Valid Only
          </button>

          <button
            type="button"
            onClick={handleSelectAllInView}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-300 hover:text-white"
          >
            Select All
          </button>

          <button
            type="button"
            onClick={handleDeselectAllInView}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-300 hover:text-white"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Filter transactions by description, date, category or amount..."
          className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/50"
          style={monoFont}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table Container */}
      <div
        className="rounded-2xl overflow-hidden border border-white/10"
        style={{
          background: 'rgba(5, 5, 8, 0.7)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" style={monoFont}>
            <thead>
              <tr
                className="border-b border-white/10 text-neutral-400 uppercase tracking-wider"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <th className="py-3 px-3 w-10 text-center">
                  <span className="sr-only">Include</span>
                </th>
                <th className="py-3 px-3 w-28">Date</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3 w-32 text-right">Amount</th>
                <th className="py-3 px-3 w-48">Category</th>
                <th className="py-3 px-3 w-36">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    No transactions match the selected filter.
                  </td>
                </tr>
              ) : (
                paginatedRows.map(row => {
                  const isDup = row.status === 'duplicate';
                  const isCredit = row.isCredit || row.status === 'credit';
                  const isInvalid =
                    row.status === 'invalid_date' || row.status === 'invalid_amount';

                  return (
                    <tr
                      key={row.key}
                      className={`transition-colors group ${
                        !row.included
                          ? 'opacity-40 hover:opacity-75 bg-transparent'
                          : isDup
                          ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]'
                          : isCredit
                          ? 'bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]'
                          : isInvalid
                          ? 'bg-red-500/[0.04] hover:bg-red-500/[0.08]'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onUpdateRow(row.key, { included: !row.included })}
                          className="text-neutral-400 hover:text-cyan-300 transition-colors p-1"
                          aria-label={row.included ? 'Exclude transaction' : 'Include transaction'}
                        >
                          {row.included ? (
                            <CheckSquare className="size-4 text-cyan-400" />
                          ) : (
                            <Square className="size-4" />
                          )}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-neutral-300 whitespace-nowrap">
                        <span className="font-medium text-white">{row.date}</span>
                      </td>

                      {/* Description (Editable inline) */}
                      <td className="py-3 px-3 text-neutral-200">
                        <input
                          type="text"
                          value={row.description}
                          onChange={e =>
                            onUpdateRow(row.key, { description: e.target.value })
                          }
                          className="w-full bg-transparent border-b border-transparent hover:border-white/20 focus:border-cyan-400/60 focus:bg-white/5 px-1 py-0.5 rounded text-xs text-white outline-none transition-colors"
                        />
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-semibold">
                        <span
                          className={
                            isCredit
                              ? 'text-emerald-400 flex items-center justify-end gap-1'
                              : 'text-neutral-200 flex items-center justify-end gap-1'
                          }
                        >
                          {isCredit ? (
                            <>
                              <ArrowDownLeft className="size-3 shrink-0" />
                              +{currency}
                              {row.amount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="size-3 shrink-0 text-red-400/70" />
                              -{currency}
                              {row.amount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </>
                          )}
                        </span>
                      </td>

                      {/* Category Selector */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={row.category}
                            onChange={e =>
                              onUpdateRow(row.key, {
                                category: e.target.value as FinMaxCategory,
                                categorySource: 'manual',
                              })
                            }
                            className="bg-neutral-900 border border-white/10 hover:border-cyan-400/40 focus:border-cyan-400 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer transition-colors max-w-[150px] truncate"
                          >
                            {FINMAX_CATEGORIES.map(cat => (
                              <option key={cat} value={cat} style={{ background: '#111' }}>
                                {cat}
                              </option>
                            ))}
                          </select>

                          {/* Auto/Manual indicator badge */}
                          {row.categorySource === 'auto' ? (
                            <span
                              className="px-1.5 py-0.5 text-[10px] rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-0.5 shrink-0"
                              title="Auto-categorized by rule engine"
                            >
                              <Sparkles className="size-2.5" />
                              Auto
                            </span>
                          ) : (
                            <span
                              className="px-1.5 py-0.5 text-[10px] rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-0.5 shrink-0"
                              title="User-assigned category"
                            >
                              <UserCheck className="size-2.5" />
                              Manual
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isDup ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            title={row.statusReason || 'Transaction already exists in your account'}
                          >
                            <AlertTriangle className="size-3" /> Duplicate
                          </span>
                        ) : isCredit ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            title={row.statusReason || 'Credit / Deposit row'}
                          >
                            <ArrowDownLeft className="size-3" /> Income
                          </span>
                        ) : isInvalid ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-red-500/15 text-red-300 border border-red-500/30"
                            title={row.statusReason || 'Data issue in row'}
                          >
                            <AlertTriangle className="size-3" /> Check Data
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            <Check className="size-3" /> Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between p-3 border-t border-white/10 text-xs text-neutral-400"
            style={monoFont}
          >
            <div>
              Showing {Math.min(filteredRows.length, (currentPage - 1) * pageSize + 1)}–
              {Math.min(filteredRows.length, currentPage * pageSize)} of {filteredRows.length} rows
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white"
              >
                <ChevronLeft className="size-4" />
              </button>

              <span className="text-white px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
