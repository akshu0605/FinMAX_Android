/**
 * FinMax Statement Parser — PDF Text Extractor
 *
 * Identifies transaction rows from raw PDF text lines.
 * Uses a heuristic approach: a line is likely a transaction if it contains
 * a date pattern AND a numeric amount.
 *
 * This is not a bank-specific parser. It uses general patterns that
 * work for many Indian bank statement formats. Users whose PDF produces
 * no results are shown a clear message.
 */

import { normalizeRow } from './normalizer';
import type { ParseResult, RawStatementRow } from './types';

// Date patterns commonly found at the start of transaction lines
const DATE_PATTERNS = [
  /^(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,                  // 15/01/2026
  /^(\d{1,2}-[A-Za-z]{3}-\d{2,4})/,                          // 15-Jan-26
  /^(\d{4}-\d{2}-\d{2})/,                                    // 2026-01-15
  /^(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/,                      // 15 Jan 2026
];

// Amount pattern: numbers with optional commas, decimals, currency symbols
const AMOUNT_PATTERN = /[\u20B9$€£¥]?[\d,]+\.?\d{0,2}/g;

/**
 * Check if a text line looks like a transaction row.
 */
function isTransactionLine(line: string): boolean {
  const hasDate = DATE_PATTERNS.some(p => p.test(line.trim()));
  const amounts = line.match(AMOUNT_PATTERN);
  const hasAmount = amounts !== null && amounts.length >= 1;
  return hasDate && hasAmount;
}

/**
 * Extract a date string from the start of a line.
 */
function extractDate(line: string): string {
  for (const pattern of DATE_PATTERNS) {
    const m = line.trim().match(pattern);
    if (m) return m[1];
  }
  return '';
}

/**
 * Extract amounts from a line (returns all numeric matches).
 */
function extractAmounts(line: string): string[] {
  // The date itself contains numeric tokens (e.g. 15/01/2026). Never treat
  // those components as transaction amounts.
  const date = extractDate(line);
  const transactionFields = date ? line.trim().slice(date.length) : line;
  return Array.from(transactionFields.matchAll(AMOUNT_PATTERN), m => m[0]);
}

/**
 * Extract description from a line (everything between the date and the first amount).
 */
function extractDescription(line: string, date: string): string {
  const afterDate = line.slice(date.length).trim();
  // Remove amounts from the end to get description
  const amounts = extractAmounts(afterDate);
  let desc = afterDate;
  for (const amt of amounts.reverse()) {
    const lastIdx = desc.lastIndexOf(amt);
    if (lastIdx >= 0) desc = desc.slice(0, lastIdx).trim();
  }
  return desc.replace(/\s+/g, ' ').trim() || 'Bank Transaction';
}

/**
 * Parse PDF text lines into PreviewRows.
 * Handles the most common Indian bank statement formats heuristically.
 */
export async function parsePdfTextLines(
  lines: string[],
  userId: string,
  existingFingerprints: Set<string>,
): Promise<ParseResult> {
  const warnings: string[] = [];
  const previewRows: ParseResult['rows'] = [];
  let skippedCount = 0;
  let sessionIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!isTransactionLine(line)) {
      skippedCount++;
      continue;
    }

    const date = extractDate(line);
    const amounts = extractAmounts(line);
    const description = extractDescription(line, date);

    // Heuristic: last 1-3 amounts are debit, credit, balance
    let debit: string | undefined;
    let credit: string | undefined;

    if (amounts.length >= 3) {
      // Common: Date Desc Debit Credit Balance
      debit = amounts[amounts.length - 3];
      credit = amounts[amounts.length - 2];
      // amounts[amounts.length - 1] = balance (ignored)
    } else if (amounts.length === 2) {
      // Could be Debit+Balance or Credit+Balance — mark as ambiguous
      debit = amounts[0];
      // will be marked ambiguous in normalizer
    } else if (amounts.length === 1) {
      debit = amounts[0];
    }

    const rawRow: RawStatementRow = {
      rawDate: date,
      rawAmount: debit || amounts[0] || '',
      rawDebit: debit,
      rawCredit: credit,
      description,
      sourceRow: i + 1,
    };

    try {
      const normalized = await normalizeRow(rawRow, userId, existingFingerprints, sessionIndex++);
      if (normalized) {
        previewRows.push(normalized);
      } else {
        skippedCount++;
      }
    } catch {
      skippedCount++;
    }
  }

  if (previewRows.length === 0) {
    warnings.push(
      'No transaction rows were detected in this PDF. ' +
      'The document may use an unsupported layout.',
    );
  }

  return { rows: previewRows, skippedCount, warnings, autoMapped: true };
}
