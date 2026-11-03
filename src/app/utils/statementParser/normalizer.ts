/**
 * FinMax Statement Parser — Normalizer
 *
 * Converts raw statement rows into standardized PreviewRow objects.
 * Handles:
 *   - Date parsing (multiple formats)
 *   - Amount parsing (currency symbols, commas, debit/credit columns)
 *   - Description cleaning
 *   - Debit vs credit detection
 *   - Balance row detection
 */

import { classifyDescription } from './categorizer';
import { buildFingerprint } from './duplicateDetector';
import type { RawStatementRow, PreviewRow, RowStatus, FinMaxCategory } from './types';

// Common date formats (order matters — more specific first)
const DATE_FORMATS = [
  // DD/MM/YYYY or DD-MM-YYYY
  /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/,
  // YYYY/MM/DD or YYYY-MM-DD
  /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/,
  // DD Mon YYYY (e.g. 15 Jan 2026)
  /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/,
  // Mon DD, YYYY
  /^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/,
  // DD-Mon-YYYY (common in Indian bank statements)
  /^(\d{1,2})-([A-Za-z]{3})-?(\d{2,4})$/,
];

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function parseAmount(raw: string): number | null {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null;
  // Remove currency symbols, whitespace, thousands separators
  const cleaned = raw.replace(/\b(?:INR|USD|EUR|GBP|DR|CR)\b/gi, '')
    .replace(/[\u20B9$€£¥,\s]/g, '').replace(/[()]/g, '').replace(/[^\d.+-]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return Math.abs(num); // Always return positive; sign is determined by debit/credit context
}

function parseDate(raw: string): { isoDate: string; displayDate: string } | null {
  if (!raw || raw.trim() === '') return null;
  const trimmed = raw.trim();

  const makeDate = (year: number, month: number, day: number) => {
    if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const localDate = new Date(year, month - 1, day);
    if (localDate.getFullYear() !== year || localDate.getMonth() !== month - 1 || localDate.getDate() !== day) return null;
    return {
      // Use midday UTC so local time zones cannot shift a transaction to the prior day.
      isoDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00.000Z`,
      displayDate: localDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
  };

  // Parse numeric bank dates before native Date(), which interprets them as US MM/DD.
  let m = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:[T\s].*)?$/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    return makeDate(year, Number(m[2]), Number(m[1]));
  }

  // ISO dates are unambiguous.
  m = trimmed.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (m) return makeDate(Number(m[1]), Number(m[2]), Number(m[3]));

  // Try DD-Mon-YY or DD-Mon-YYYY
  m = trimmed.match(/^(\d{1,2})[\- ]([A-Za-z]{3})[\- ](\d{2,4})$/);
  if (m) {
    const monthNum = MONTH_MAP[m[2].toLowerCase()];
    if (monthNum) {
      let year = parseInt(m[3]);
      if (year < 100) year += year < 50 ? 2000 : 1900;
      return makeDate(year, monthNum, Number(m[1]));
    }
  }

  // Fall back for RFC-style dates with month names and timezone suffixes.
  const nativeParsed = new Date(trimmed);
  if (!isNaN(nativeParsed.getTime()) && nativeParsed.getFullYear() >= 2000 && nativeParsed.getFullYear() <= 2100) {
    return makeDate(nativeParsed.getFullYear(), nativeParsed.getMonth() + 1, nativeParsed.getDate());
  }

  return null;
}

function cleanDescription(desc: string): string {
  return desc.replace(/\s+/g, ' ').trim().slice(0, 200);
}

function isBalanceRow(raw: RawStatementRow): boolean {
  const desc = raw.description.toLowerCase();
  return desc.includes('opening balance') ||
    desc.includes('closing balance') ||
    desc.includes('brought forward') ||
    desc.includes('carried forward');
}

const seenKeys = new Set<string>();

export async function normalizeRow(
  raw: RawStatementRow,
  userId: string,
  existingFingerprints: Set<string>,
  sessionIndex: number,
): Promise<PreviewRow | null> {
  // Detect balance rows
  if (isBalanceRow(raw)) {
    return null; // silently skip
  }

  const description = cleanDescription(raw.description);
  if (!description) return null;

  // Parse date
  const parsedDate = parseDate(raw.rawDate);

  // Determine amount and debit/credit polarity
  let amount: number | null = null;
  let isCredit = false;

  if (raw.rawDebit !== undefined || raw.rawCredit !== undefined) {
    // Separate debit/credit columns
    const debitAmt = parseAmount(raw.rawDebit || '');
    const creditAmt = parseAmount(raw.rawCredit || '');

    if (debitAmt !== null && debitAmt > 0) {
      amount = debitAmt;
      isCredit = false;
    } else if (creditAmt !== null && creditAmt > 0) {
      amount = creditAmt;
      isCredit = true;
    } else {
      // Both empty or zero — skip
      return null;
    }
  } else {
    // Single amount column
    const rawAmt = parseAmount(raw.rawAmount);
    if (rawAmt === null || rawAmt === 0) return null;
    amount = rawAmt;
    // Negative amounts in single-column often indicate debit;
    // we keep it ambiguous and let the UI show polarity
    const amountText = raw.rawAmount.trim();
    // Exports often use unsigned values for both directions; treat those as expenses
    // unless the cell explicitly marks a credit/income transaction.
    isCredit = /(?:\bCR\b|\bCREDIT\b|\bDEPOSIT\b|\bINCOME\b)/i.test(amountText);
  }

  // Determine status
  let status: RowStatus = 'valid';
  let statusReason: string | undefined;

  if (!parsedDate) {
    status = 'invalid_date';
    statusReason = `Cannot parse date: "${raw.rawDate}"`;
  } else if (amount === null || amount <= 0) {
    status = 'invalid_amount';
    statusReason = `Cannot parse amount: "${raw.rawAmount || raw.rawDebit || raw.rawCredit}"`;
  } else if (isCredit) {
    status = 'credit';
    statusReason = 'Credit/income row — review before importing';
  }

  const isoDate = parsedDate?.isoDate ?? new Date().toISOString();
  const safeAmount = amount ?? 0;

  // Category classification
  const { category: suggestedCategory } = classifyDescription(description);

  // Fingerprint + duplicate check
  const fingerprint = parsedDate
    ? await buildFingerprint(userId, isoDate, safeAmount, description)
    : `nodate-${sessionIndex}`;

  const isDuplicate = existingFingerprints.has(fingerprint);
  if (isDuplicate && status === 'valid') {
    status = 'duplicate';
    statusReason = 'This transaction already exists in your account';
  }

  const key = `import-${sessionIndex}-${fingerprint.slice(0, 8)}`;

  return {
    key,
    fingerprint,
    date: parsedDate?.displayDate ?? raw.rawDate,
    isoDate,
    description,
    amount: safeAmount,
    isCredit,
    suggestedCategory,
    category: suggestedCategory,
    categorySource: 'auto',
    status,
    statusReason,
    included: status === 'valid', // only auto-include clean valid rows
    sourceRow: raw.sourceRow,
  };
}
