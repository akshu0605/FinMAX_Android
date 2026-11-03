/**
 * FinMax Statement Parser — PDF Parser
 *
 * Uses pdfjs-dist (Mozilla PDF.js) for client-side PDF text extraction.
 * Supports:
 *   - Text-based PDFs
 *   - Password-protected PDFs (via PasswordException detection)
 *   - Scanned PDF detection (reports clearly, no OCR)
 *
 * The PDF password is NEVER:
 *   - Stored in localStorage or sessionStorage
 *   - Sent to Supabase or any external service
 *   - Logged or included in error reports
 *
 * It is held only in caller React component state for the duration of the
 * unlock attempt, then released.
 */

import * as pdfjsLib from 'pdfjs-dist';
import type { ParseResult, RawStatementRow } from './types';
import { normalizeRow } from './normalizer';
import { parsePdfTextLines } from './pdfTextExtractor';

// Point to the pdfjs worker bundled with pdfjs-dist
// Vite copies this to /assets/ during build
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();
pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
  new URL('./pdf.worker.ts', import.meta.url),
  { type: 'module' },
);

export type PdfParseStatus =
  | 'ok'
  | 'password_required'
  | 'wrong_password'
  | 'scanned'
  | 'corrupted'
  | 'unsupported_encryption'
  | 'no_transactions';

export interface PdfParseOutcome {
  status: PdfParseStatus;
  result?: ParseResult;
  message?: string;
}

/**
 * Attempt to load and parse a PDF file.
 *
 * @param file - The File object selected by the user
 * @param userId - Authenticated user ID for fingerprinting
 * @param existingFingerprints - Set of fingerprints from existing expenses
 * @param password - Optional: Only provided after user enters it in the password modal
 */
export async function parsePdfStatement(
  file: File,
  userId: string,
  existingFingerprints: Set<string>,
  password?: string,
): Promise<PdfParseOutcome> {
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  const loadingParams: Record<string, unknown> = { data: arrayBuffer };
  if (password !== undefined) {
    loadingParams.password = password;
  }

  let loadingTask: pdfjsLib.PDFDocumentLoadingTask | undefined;
  let statementColumns: StatementColumns | undefined;
  let transactionTableColumns: TransactionTableColumns | undefined;
  let statementRows: RawStatementRow[] = [];
  const allLines: string[] = [];
  let totalCharCount = 0;

  try {
    loadingTask = pdfjsLib.getDocument(loadingParams);

    // Handle password events
    loadingTask.onPassword = (_updateCallback: (password: string) => void, reason: number) => {
      // reason 1 = needs password, reason 2 = password was incorrect
      if (reason === 1) {
        // PDF.js calls this when a password is needed before we've provided one
        // We abort and signal password_required
        loadingTask.destroy();
      } else if (reason === 2) {
        loadingTask.destroy();
      }
    };

    const pdf = await loadingTask.promise;

    // Extract text from all pages, restoring line boundaries from PDF.js item
    // positions. getTextContent() returns positioned text items, not newlines.
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const lines = textItemsToLines(textContent.items);
      totalCharCount += lines.join(' ').length;

      statementColumns ??= findStatementColumns(textContent.items);
      if (statementColumns) {
        statementRows.push(...extractPositionedStatementRows(
          textContent.items,
          statementColumns,
          statementRows.length + 1,
        ));
      } else {
        transactionTableColumns ??= findTransactionTableColumns(textContent.items);
        if (transactionTableColumns) {
          statementRows.push(...extractPositionedTransactionRows(
            textContent.items,
            transactionTableColumns,
            statementRows.length + 1,
          ));
        } else {
          allLines.push(...lines);
        }
      }
    }

    // Detect scanned PDF (very little extractable text)
    const avgCharsPerPage = pdf.numPages > 0 ? totalCharCount / pdf.numPages : 0;
    if (avgCharsPerPage < 50 && pdf.numPages > 0) {
      return {
        status: 'scanned',
        message:
          'This PDF appears to be a scanned image. Text extraction is not possible. ' +
          'OCR (optical character recognition) is not currently supported. ' +
          'Please export a text-based PDF from your bank or convert it manually.',
      };
    }

    if (!statementColumns && !transactionTableColumns && allLines.length === 0) {
      return {
        status: 'no_transactions',
        message: 'No text could be extracted from this PDF.',
      };
    }

    const result = statementColumns || transactionTableColumns
      ? await normalizePositionedRows(statementRows, userId, existingFingerprints)
      : await parsePdfTextLines(allLines, userId, existingFingerprints);
    if (result.rows.length === 0) {
      return {
        status: 'no_transactions',
        message:
          'No transactions could be extracted from this PDF. ' +
          'The statement format may not be supported by the current parser.',
      };
    }
    return { status: 'ok', result };
  } catch (err: unknown) {
    const error = err as { name?: string; message?: string; code?: number };

    // Detect PasswordException from pdfjs
    if (error.name === 'PasswordException') {
      if (error.code === 1) {
        // NEED_PASSWORD
        return { status: 'password_required', message: 'This PDF is password-protected.' };
      } else if (error.code === 2) {
        // INCORRECT_PASSWORD
        return {
          status: 'wrong_password',
          message: 'Incorrect PDF password. Please try again.',
        };
      }
      // Unknown password error
      return {
        status: 'unsupported_encryption',
        message:
          'Unable to unlock this PDF. Check the password or verify the file uses a supported encryption format.',
      };
    }

    if (error.name === 'InvalidPDFException') {
      return { status: 'corrupted', message: 'This PDF could not be read. It may be corrupted or invalid.' };
    }

    if (error.name === 'MissingPDFException') {
      return { status: 'corrupted', message: 'The PDF file is missing or unreadable.' };
    }

    return {
      status: 'corrupted',
      message: `PDF loading or transaction extraction failed: ${error.message || 'Unknown error'}`,
    };
  } finally {
    // PDF.js 6.x exposes destroy() on the loading task, not the document proxy.
    // Keep cleanup failures from hiding the original parse outcome/error.
    if (loadingTask) {
      try {
        await loadingTask.destroy();
      } catch (cleanupError) {
        console.warn('PDF.js resource cleanup failed:', cleanupError);
      }
    }
  }
}

type PdfTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
};

interface StatementColumns {
  purchaseX: number;
  paymentX: number;
}

interface TransactionTableColumns {
  dateX: number;
  descriptionX: number;
  amountX: number;
}

/** Detect debit and credit columns from a statement table header. */
function findStatementColumns(items: unknown[]): StatementColumns | undefined {
  const textItems = items.map(item => item as PdfTextItem);
  const purchaseHeaders = textItems.filter(item => /^purchase\s*\/\s*debit$/i.test((item.str || '').trim()));
  const paymentHeaders = textItems.filter(item => /^payment\s*\/\s*credit$/i.test((item.str || '').trim()));
  for (const purchase of purchaseHeaders) {
    const payment = paymentHeaders.find(candidate =>
      candidate.transform && purchase.transform &&
      Math.abs(candidate.transform[5] - purchase.transform[5]) < 2,
    );
    const purchaseX = purchase.transform?.[4];
    const paymentX = payment?.transform?.[4];
    if (purchaseX !== undefined && paymentX !== undefined && purchaseX < paymentX) {
      return { purchaseX, paymentX };
    }
  }
  return undefined;
}

/** Detect dated transaction tables such as HDFC's DATE & TIME / DESCRIPTION / AMOUNT. */
function findTransactionTableColumns(items: unknown[]): TransactionTableColumns | undefined {
  const textItems = items.map(item => item as PdfTextItem);
  const dateHeaders = textItems.filter(item => /^date(?:\s*&\s*time)?$/i.test((item.str || '').trim()));
  for (const dateHeader of dateHeaders) {
    if (!dateHeader.transform) continue;
    const headerY = dateHeader.transform[5];
    const nearby = textItems.filter(item => item.transform && Math.abs(item.transform[5] - headerY) < 2);
    const description = nearby.find(item => /transaction\s+description/i.test((item.str || '').trim()));
    const amount = nearby.find(item => /^amount$/i.test((item.str || '').trim()));
    const dateX = dateHeader.transform[4];
    const descriptionX = description?.transform?.[4];
    const amountX = amount?.transform?.[4];
    if (dateX !== undefined && descriptionX !== undefined && amountX !== undefined && dateX < descriptionX && descriptionX < amountX) {
      return { dateX, descriptionX, amountX };
    }
  }
  return undefined;
}

/** Extract single-amount rows by their visual table columns. */
function extractPositionedTransactionRows(
  items: unknown[],
  columns: TransactionTableColumns,
  firstSourceRow: number,
): RawStatementRow[] {
  const positioned = items
    .map(item => item as PdfTextItem)
    .flatMap((item, index) => {
      const text = item.str?.trim();
      const transform = item.transform;
      if (!text || !transform) return [];
      return [{ text, x: transform[4] ?? index, y: transform[5] ?? -index }];
    });
  const tableDates = positioned
    .filter(item => item.x < columns.descriptionX - 20 && /^\d{1,2}[/-]\d{1,2}[/-]20\d{2}(?:\||\s|$)/.test(item.text))
    .sort((a, b) => b.y - a.y);
  const rows: RawStatementRow[] = [];

  for (const dateItem of tableDates) {
    const rowItems = positioned.filter(item => Math.abs(item.y - dateItem.y) < 2.5);
    const date = dateItem.text.match(/^\d{1,2}[/-]\d{1,2}[/-]20\d{2}/)?.[0] || '';
    const description = rowItems
      .filter(item => item.x >= columns.descriptionX - 4 && item.x < columns.amountX - 4)
      .sort((a, b) => a.x - b.x)
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^EMI\s+UPI\s*[-*]\s*/i, '')
      .replace(/^UPI\s*[-*]\s*/i, '')
      .slice(0, 200);
    const amountItems = rowItems
      .filter(item => item.x >= columns.amountX - 6)
      .sort((a, b) => a.x - b.x);
    const amountText = amountItems.map(item => item.text).join(' ').trim();
    const amount = amountText.match(/[\d,]+\.\d{1,2}/)?.[0] || '';
    if (!description || !amount) continue;

    const isCredit = /\+/.test(amountText);
    rows.push({
      rawDate: date,
      rawAmount: amount,
      rawDebit: isCredit ? '' : amount,
      rawCredit: isCredit ? amount : '',
      description,
      sourceRow: firstSourceRow + rows.length,
    });
  }
  return rows;
}

/** Read rows from a positioned debit/credit table, including dates split over lines. */
function extractPositionedStatementRows(
  items: unknown[],
  columns: StatementColumns,
  firstSourceRow: number,
): RawStatementRow[] {
  const positioned = items
    .map(item => item as PdfTextItem)
    .flatMap((item, index) => {
      const text = item.str?.trim();
      const transform = item.transform;
      if (!text || !transform) return [];
      return [{ text, x: transform[4] ?? index, y: transform[5] ?? -index, width: item.width ?? 0 }];
    });

  const stopHeader = positioned.find(item => /important information/i.test(item.text));
  const dateParts = positioned.filter(item => /^\d{1,2}-\d{1,2}-$/.test(item.text) && item.x < 60);
  const years = positioned.filter(item => /^20\d{2}$/.test(item.text) && item.x < 60);
  const usedYears = new Set<typeof years[number]>();
  const rows: RawStatementRow[] = [];

  for (const datePart of dateParts.sort((a, b) => b.y - a.y)) {
    const year = years
      .filter(candidate => !usedYears.has(candidate) && Math.abs(candidate.x - datePart.x) < 3)
      .sort((a, b) => Math.abs(a.y - datePart.y) - Math.abs(b.y - datePart.y))[0];
    if (!year || Math.abs(year.y - datePart.y) < 3 || Math.abs(year.y - datePart.y) > 24) continue;
    usedYears.add(year);

    const rowY = (datePart.y + year.y) / 2;
    if (stopHeader && rowY < stopHeader.y - 2) continue;
    // Some narrations wrap over the debit/credit row (refunds in particular).
    // The adjacent date and year marks bound the row, while the wider tolerance
    // retains those wrapped narration and amount items without joining neighbors.
    const rowTolerance = Math.min(12, Math.abs(datePart.y - year.y) / 2 + 2);
    const rowItems = positioned.filter(item => Math.abs(item.y - rowY) <= rowTolerance);
    const narration = rowItems
      .filter(item => item.x >= 55 && item.x < columns.purchaseX - 5)
      .sort((a, b) => a.x - b.x)
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const description = cleanStatementNarration(narration);
    const debit = rowItems
      .filter(item => item.x >= columns.purchaseX - 5 && item.x < columns.paymentX - 5)
      .sort((a, b) => a.x - b.x)
      .map(item => item.text)
      .join(' ')
      .trim();
    const credit = rowItems
      .filter(item => item.x >= columns.paymentX - 5)
      .sort((a, b) => a.x - b.x)
      .map(item => item.text)
      .join(' ')
      .trim();

    if (!description || (!debit && !credit)) continue;
    const date = `${datePart.text}${year.text}`;
    rows.push({
      rawDate: date,
      rawAmount: debit || credit,
      rawDebit: debit,
      rawCredit: credit,
      description,
      sourceRow: firstSourceRow + rows.length,
    });
  }
  return rows;
}

/** Replace bank routing/reference text with the merchant shown in the narration. */
function cleanStatementNarration(narration: string): string {
  const parts = narration.split('/').map(part => part.trim()).filter(Boolean);
  const directionIndex = parts.findIndex(part => /^(DR|CR)$/i.test(part));
  if (directionIndex >= 0) {
    const merchant = parts[directionIndex + 2];
    if (merchant) {
      const surcharge = /surcharge/i.test(narration);
      return `${surcharge ? 'Surcharge - ' : ''}${merchant}`.slice(0, 200);
    }
  }

  if (/^ECOM\//i.test(narration)) {
    const merchant = parts.slice(3).join(' ');
    if (merchant) return merchant.slice(0, 200);
  }

  return narration.slice(0, 200);
}

async function normalizePositionedRows(
  rawRows: RawStatementRow[],
  userId: string,
  existingFingerprints: Set<string>,
): Promise<ParseResult> {
  const rows: ParseResult['rows'] = [];
  let skippedCount = 0;
  for (let index = 0; index < rawRows.length; index++) {
    try {
      const normalized = await normalizeRow(rawRows[index], userId, existingFingerprints, index);
      if (normalized) rows.push(normalized);
      else skippedCount++;
    } catch {
      skippedCount++;
    }
  }

  return {
    rows,
    skippedCount,
    warnings: rows.length === 0
      ? ['No transaction rows were detected in this PDF. The document may use an unsupported layout.']
      : [],
    autoMapped: true,
  };
}

/** Rebuild visual text lines from PDF.js positioned text items for generic layouts. */
function textItemsToLines(items: unknown[]): string[] {
  const positioned = items.flatMap((item, index) => {
    const textItem = item as PdfTextItem;
    const text = textItem.str?.trim();
    if (!text) return [];
    return [{
      text,
      x: textItem.transform?.[4] ?? index,
      y: textItem.transform?.[5] ?? -index,
    }];
  });

  const lines: Array<{ y: number; items: typeof positioned }> = [];
  for (const item of positioned) {
    let line = lines.find(candidate => Math.abs(candidate.y - item.y) < 2);
    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }

  return lines
    .sort((a, b) => b.y - a.y)
    .map(line => line.items.sort((a, b) => a.x - b.x).map(item => item.text).join(' ').trim())
    .filter(Boolean);
}
