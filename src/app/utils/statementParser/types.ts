/**
 * FinMax Statement Parser — Shared Types
 */

export const FINMAX_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Healthcare',
  'Other',
] as const;

export type FinMaxCategory = typeof FINMAX_CATEGORIES[number];

export type RowStatus =
  | 'valid'
  | 'duplicate'
  | 'credit'
  | 'invalid_date'
  | 'invalid_amount'
  | 'missing_fields'
  | 'balance_row'
  | 'ambiguous'
  | 'excluded';

export interface RawStatementRow {
  rawDate: string;
  rawAmount: string;
  rawDebit?: string;
  rawCredit?: string;
  description: string;
  rawBalance?: string;
  sourceRow: number;
}

export interface NormalizedExpense {
  date: string;
  amount: number;
  title: string;
  category: FinMaxCategory;
  note?: string;
}

export interface PreviewRow {
  key: string;
  fingerprint: string;
  date: string;
  isoDate: string;
  description: string;
  amount: number;
  isCredit: boolean;
  suggestedCategory: FinMaxCategory;
  category: FinMaxCategory;
  categorySource: 'auto' | 'manual';
  status: RowStatus;
  statusReason?: string;
  included: boolean;
  sourceRow: number;
}

export interface ParseResult {
  rows: PreviewRow[];
  skippedCount: number;
  warnings: string[];
  autoMapped: boolean;
  columnMap?: ColumnMapping;
}

export interface ColumnMapping {
  date?: string;
  description?: string;
  amount?: string;
  debit?: string;
  credit?: string;
  category?: string;
  balance?: string;
}

export type ImportStep =
  | 'idle'
  | 'parsing'
  | 'password_required'
  | 'preview'
  | 'saving'
  | 'done'
  | 'error';

export interface ImportSessionState {
  step: ImportStep;
  fileName: string;
  fileType: 'csv' | 'pdf' | 'unknown';
  rows: PreviewRow[];
  warnings: string[];
  errorMessage?: string;
  pendingFile?: File;
  columnMap?: ColumnMapping;
  savedCount?: number;
  skippedCount?: number;
  failedCount?: number;
}

export interface ImportSaveResult {
  saved: number;
  skipped: number;
  failed: number;
  errors: string[];
}
