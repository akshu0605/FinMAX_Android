import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  Table,
  Check,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { NeonButton } from '../ui/NeonButton';
import { PdfPasswordModal } from './PdfPasswordModal';
import { PreviewTable } from './PreviewTable';
import { ColumnMapper } from './ColumnMapper';
import { supabase } from '../../utils/supabase';
import { api } from '../../utils/api';
import { parseCsvStatement } from '../../utils/statementParser/csvParser';
import { parsePdfStatement } from '../../utils/statementParser/pdfParser';
import { buildExistingFingerprintSet } from '../../utils/statementParser/duplicateDetector';
import type {
  PreviewRow,
  ParseResult,
  ColumnMapping,
  ImportStep,
  FinMaxCategory,
} from '../../utils/statementParser/types';

const TEAL = '#DDB96B';
const monoFont: React.CSSProperties = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };
const headingFont: React.CSSProperties = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => Promise<void>;
  currency?: string;
}

export function ImportWizard({
  isOpen,
  onClose,
  onDataChanged,
  currency = '₹',
}: ImportWizardProps) {
  // Wizard state
  const [step, setStep] = useState<ImportStep>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'csv' | 'pdf' | 'unknown'>('unknown');
  const [fileRawText, setFileRawText] = useState<string>('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvSampleRows, setCsvSampleRows] = useState<string[][]>([]);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [currentColumnMap, setCurrentColumnMap] = useState<ColumnMapping | undefined>();

  // Parsed preview rows
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PDF Password modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Saving state
  const [savedCount, setSavedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Reset wizard
  const resetWizard = useCallback(() => {
    setStep('idle');
    setSelectedFile(null);
    setFileType('unknown');
    setFileRawText('');
    setCsvHeaders([]);
    setCsvSampleRows([]);
    setShowColumnMapper(false);
    setCurrentColumnMap(undefined);
    setPreviewRows([]);
    setWarnings([]);
    setErrorMessage(null);
    setIsPasswordModalOpen(false);
    setPasswordError(undefined);
    setIsUnlocking(false);
    setSavedCount(0);
    setSkippedCount(0);
    setIsSaving(false);
  }, []);

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  // Helper to fetch existing fingerprints for deduplication
  const fetchExistingFingerprints = async (userId: string): Promise<Set<string>> => {
    try {
      const res = await api.getExpenses();
      if (res.data?.expenses && Array.isArray(res.data.expenses)) {
        return await buildExistingFingerprintSet(userId, res.data.expenses);
      }
    } catch (err) {
      console.warn('Could not load existing expenses for duplicate check:', err);
    }
    return new Set<string>();
  };

  // Process File selection
  const processFile = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setWarnings([]);

    const name = file.name.toLowerCase();
    const isCsv = name.endsWith('.csv') || file.type.includes('csv');
    const isPdf = name.endsWith('.pdf') || file.type.includes('pdf');

    if (!isCsv && !isPdf) {
      setStep('error');
      setErrorMessage(
        'Unsupported file format. Please select a CSV (.csv) or PDF (.pdf) bank statement.'
      );
      return;
    }

    setFileType(isCsv ? 'csv' : 'pdf');
    setStep('parsing');

    // Get current user session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setStep('error');
      setErrorMessage('You must be signed in to import financial statements.');
      return;
    }
    const userId = session.user.id;

    // Load existing expenses to compute fingerprints
    const existingFp = await fetchExistingFingerprints(userId);

    if (isCsv) {
      try {
        const text = await file.text();
        setFileRawText(text);

        // Extract headers and sample rows for column mapper if needed
        const firstLines = text.split(/\r?\n/).filter(l => l.trim() !== '');
        if (firstLines.length > 0) {
          const hdrs = firstLines[0]
            .split(',')
            .map(h => h.trim().replace(/^"|"$/g, ''));
          setCsvHeaders(hdrs);

          const samples = firstLines.slice(1, 4).map(line =>
            line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
          );
          setCsvSampleRows(samples);
        }

        const parseResult = await parseCsvStatement(text, userId, existingFp);
        setPreviewRows(parseResult.rows);
        setWarnings(parseResult.warnings);
        setCurrentColumnMap(parseResult.columnMap);
        setStep('preview');
      } catch (err: any) {
        // If auto detection failed, offer manual column mapping
        if (
          err.message?.includes('standard columns') ||
          err.message?.includes('column mapping')
        ) {
          setShowColumnMapper(true);
          setStep('preview');
          setWarnings([
            'Could not automatically detect standard column headers. Please map columns manually.',
          ]);
        } else {
          setStep('error');
          setErrorMessage(err.message || 'Failed to parse CSV file.');
        }
      }
    } else if (isPdf) {
      try {
        const outcome = await parsePdfStatement(file, userId, existingFp);

        if (outcome.status === 'password_required') {
          setIsPasswordModalOpen(true);
          setPasswordError(undefined);
          setStep('password_required');
        } else if (outcome.status === 'ok' && outcome.result) {
          setPreviewRows(outcome.result.rows);
          setWarnings(outcome.result.warnings);
          setStep('preview');
        } else {
          setStep('error');
          setErrorMessage(outcome.message || 'Failed to extract transactions from PDF.');
        }
      } catch (err: any) {
        setStep('error');
        setErrorMessage(err.message || 'Unexpected error while loading PDF statement.');
      }
    }
  };

  // Handle password submission from PdfPasswordModal
  const handlePdfUnlock = async (password: string) => {
    if (!selectedFile) return;
    setIsUnlocking(true);
    setPasswordError(undefined);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'temp';
    const existingFp = await fetchExistingFingerprints(userId);

    try {
      const outcome = await parsePdfStatement(selectedFile, userId, existingFp, password);

      if (outcome.status === 'wrong_password') {
        setPasswordError('Incorrect PDF password. Please try again.');
        setIsUnlocking(false);
      } else if (outcome.status === 'unsupported_encryption') {
        setPasswordError(
          outcome.message || 'This PDF uses an unsupported encryption format.'
        );
        setIsUnlocking(false);
      } else if (outcome.status === 'ok' && outcome.result) {
        setIsPasswordModalOpen(false);
        setIsUnlocking(false);
        setPreviewRows(outcome.result.rows);
        setWarnings(outcome.result.warnings);
        setStep('preview');
        toast.success('PDF unlocked successfully!');
      } else {
        setIsPasswordModalOpen(false);
        setIsUnlocking(false);
        setStep('error');
        setErrorMessage(
          outcome.message || 'Could not extract transactions from decrypted PDF.'
        );
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to decrypt PDF.');
      setIsUnlocking(false);
    }
  };

  const handlePdfPasswordCancel = () => {
    setIsPasswordModalOpen(false);
    setPasswordError(undefined);
    setIsUnlocking(false);
    resetWizard();
  };

  // Apply custom CSV column mapping
  const handleApplyColumnMapping = async (newMap: ColumnMapping) => {
    if (!fileRawText) return;

    setStep('parsing');
    setShowColumnMapper(false);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'temp';
    const existingFp = await fetchExistingFingerprints(userId);

    try {
      const parseResult = await parseCsvStatement(
        fileRawText,
        userId,
        existingFp,
        newMap
      );
      setCurrentColumnMap(newMap);
      setPreviewRows(parseResult.rows);
      setWarnings(parseResult.warnings);
      setStep('preview');
      toast.success('Custom column mapping applied');
    } catch (err: any) {
      setStep('error');
      setErrorMessage(err.message || 'Failed to parse CSV with custom mapping.');
    }
  };

  // Row update in PreviewTable
  const handleUpdateRow = (key: string, updates: Partial<PreviewRow>) => {
    setPreviewRows(prev =>
      prev.map(r => (r.key === key ? { ...r, ...updates } : r))
    );
  };

  const handleBulkInclude = (keys: string[], included: boolean) => {
    const keySet = new Set(keys);
    setPreviewRows(prev =>
      prev.map(r => (keySet.has(r.key) ? { ...r, included } : r))
    );
  };

  const handleBulkSetCategory = (keys: string[], category: FinMaxCategory) => {
    const keySet = new Set(keys);
    setPreviewRows(prev =>
      prev.map(r =>
        keySet.has(r.key)
          ? { ...r, category, categorySource: 'manual' }
          : r
      )
    );
  };

  // Confirm Import & Save to Supabase
  const handleConfirmImport = async () => {
    const includedRows = previewRows.filter(r => r.included);
    if (includedRows.length === 0) {
      toast.warning('No transactions are selected for import.');
      return;
    }

    setIsSaving(true);
    setStep('saving');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('Not authenticated. Please sign in to save data.');
      }
      const uid = session.user.id;

      let saved = 0;
      let skipped = 0;
      const errors: string[] = [];

      // Separate expenses from credit (income) transactions
      const expenseRows = includedRows.filter(r => !r.isCredit && r.status !== 'credit');
      const creditRows = includedRows.filter(r => r.isCredit || r.status === 'credit');

      // Batch insert expenses in chunks of 50
      const CHUNK_SIZE = 50;
      for (let i = 0; i < expenseRows.length; i += CHUNK_SIZE) {
        const chunk = expenseRows.slice(i, i + CHUNK_SIZE);
        const payloads = chunk.map(r => ({
          user_id: uid,
          title: r.description,
          amount: r.amount,
          category: r.category,
          date: r.isoDate,
          note: `Imported from ${selectedFile?.name || 'statement'}`,
        }));

        const { error } = await supabase.from('expenses').insert(payloads);
        if (error) {
          errors.push(error.message);
          skipped += chunk.length;
        } else {
          saved += chunk.length;
        }
      }

      // Batch insert credit (income) rows into incomes table
      for (let i = 0; i < creditRows.length; i += CHUNK_SIZE) {
        const chunk = creditRows.slice(i, i + CHUNK_SIZE);
        const payloads = chunk.map(r => {
          const d = new Date(r.isoDate);
          return {
            user_id: uid,
            amount: r.amount,
            source: r.description,
            month: isNaN(d.getMonth()) ? new Date().getMonth() + 1 : d.getMonth() + 1,
            year: isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear(),
          };
        });

        const { error } = await supabase.from('incomes').insert(payloads);
        if (error) {
          errors.push(error.message);
          skipped += chunk.length;
        } else {
          saved += chunk.length;
        }
      }

      setSavedCount(saved);
      setSkippedCount(skipped);
      setStep('done');

      // Refresh Dashboard & AI Insights
      await onDataChanged();

      if (errors.length > 0) {
        toast.warning(
          `Import finished with warnings: ${saved} saved, ${skipped} skipped.`
        );
      } else {
        toast.success(`Successfully imported ${saved} transactions to FinMax!`);
      }
    } catch (err: any) {
      setStep('error');
      setErrorMessage(err.message || 'Failed to save imported transactions.');
    } finally {
      setIsSaving(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="import-wizard-portal"
        className="fixed inset-0 z-[150] flex items-center justify-center p-3 md:p-6 overflow-y-auto"
        style={{
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <motion.div
          id="import-wizard-container"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-5xl rounded-[28px] relative overflow-hidden flex min-h-0 flex-col max-h-[92dvh]"
          style={{
            background: 'rgba(9, 10, 14, 0.96)',
            border: '1px solid rgba(221,185,107,0.22)',
            boxShadow:
              '0 30px 100px rgba(0,0,0,0.9), 0 0 60px rgba(221,185,107,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {/* Top Sheen */}
          <div
            className="absolute inset-x-0 top-0 h-px pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(221,185,107,0.6), transparent)',
            }}
          />

          {/* Modal Header */}
          <div className="flex items-center justify-between gap-3 p-6 border-b border-white/10 shrink-0">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(221,185,107,0.12)',
                  border: '1px solid rgba(221,185,107,0.3)',
                }}
              >
                <Upload className="size-5" style={{ color: TEAL }} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-white flex flex-wrap items-center gap-x-2 gap-y-1" style={headingFont}>
                  Import Financial Statement
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{
                      background: 'rgba(221,185,107,0.15)',
                      color: TEAL,
                      border: '1px solid rgba(221,185,107,0.3)',
                      ...monoFont,
                    }}
                  >
                    CSV & PDF
                  </span>
                </h2>
                <p className="text-xs text-neutral-400" style={monoFont}>
                  Auto-extracts transactions, categorizes expenses & detects duplicates
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
            {/* Step: File Selection (idle) */}
            {step === 'idle' && (
              <div className="space-y-6">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInputRef.current?.click(); } }}
                  role="button"
                  tabIndex={0}
                  aria-label="Choose a CSV or PDF financial statement to import"
                  className={`border-2 border-dashed rounded-3xl p-10 md:p-14 text-center cursor-pointer transition-all relative overflow-hidden group ${
                    isDragging
                    ? 'border-[#DDB96B] bg-[#DDB96B]/10 scale-[0.99]'
                      : 'border-white/15 bg-white/[0.02] hover:border-[#DDB96B]/40 hover:bg-white/[0.04]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv,.pdf,application/pdf"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) processFile(file);
                    }}
                  />

                  <img className="import-drop-illustration" src="/finmax-receipt-scan.svg" alt="Receipt ready to import" />

                  <h3 className="text-lg font-bold text-white mb-2" style={headingFont}>
                    Drop your statement here, or <span style={{ color: TEAL }}>browse</span>
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto mb-6" style={monoFont}>
                    Supports CSV bank statements and text-based PDFs (including password-protected PDFs).
                    All decryption and processing happens 100% locally in your browser.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-400" style={monoFont}>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                      <FileSpreadsheet className="size-4 text-emerald-400" />
                      <span>CSV Statements</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                      <FileText className="size-4 text-cyan-400" />
                      <span>PDF Statements</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                      <Lock className="size-4 text-amber-400" />
                      <span>Password-Protected PDFs</span>
                    </div>
                  </div>
                </div>

                {/* Privacy & Security Callout */}
                <div
                  className="p-4 rounded-2xl flex items-start gap-3"
                  style={{
                    background: 'rgba(221,185,107,0.04)',
                    border: '1px solid rgba(221,185,107,0.15)',
                  }}
                >
                  <ShieldCheck className="size-5 shrink-0 mt-0.5" style={{ color: TEAL }} />
                  <div className="text-xs space-y-1" style={monoFont}>
                    <div className="font-semibold text-white">Client-Side Privacy Guarantee</div>
                    <div className="text-neutral-400">
                      Your files and passwords are never transmitted to any third party. PDF decryption
                      is performed entirely within your browser memory and discarded immediately.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Parsing Animation */}
            {step === 'parsing' && (
              <div className="import-processing-state py-12 sm:py-16 text-center space-y-4">
                <img src="/finmax-receipt-scan.svg" alt="" aria-hidden="true" />
                <Loader2 className="size-7 animate-spin mx-auto" style={{ color: TEAL }} />
                <h3 className="text-lg font-bold text-white" style={headingFont}>
                  Parsing Statement...
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto" style={monoFont}>
                  Extracting transactions, analyzing merchant descriptions, and checking for duplicates...
                </p>
              </div>
            )}

            {/* Step: Preview Table & Column Mapper */}
            {step === 'preview' && (
              <div className="space-y-6">
                {/* File info bar */}
                <div
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-white/10 text-xs"
                  style={{ background: 'rgba(255,255,255,0.03)', ...monoFont }}
                >
                  <div className="flex items-center gap-2">
                    {fileType === 'csv' ? (
                      <FileSpreadsheet className="size-4 text-emerald-400" />
                    ) : (
                      <FileText className="size-4 text-cyan-400" />
                    )}
                    <span className="font-semibold text-white">{selectedFile?.name}</span>
                    <span className="text-neutral-500">
                      ({((selectedFile?.size || 0) / 1024).toFixed(1)} KB)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {fileType === 'csv' && (
                      <button
                        type="button"
                        onClick={() => setShowColumnMapper(true)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 flex items-center gap-1.5 transition-colors"
                      >
                        <Table className="size-3.5" />
                        Edit Column Mapping
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={resetWizard}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors"
                    >
                      Choose Another File
                    </button>
                  </div>
                </div>

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                    {warnings.map((w, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <AlertCircle className="size-4 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Conditional ColumnMapper */}
                {showColumnMapper && (
                  <ColumnMapper
                    headers={csvHeaders}
                    initialMapping={currentColumnMap}
                    sampleRows={csvSampleRows}
                    onApply={handleApplyColumnMapping}
                    onCancel={() => setShowColumnMapper(false)}
                  />
                )}

                {/* Preview Table */}
                {!showColumnMapper && (
                  <PreviewTable
                    rows={previewRows}
                    currency={currency}
                    onUpdateRow={handleUpdateRow}
                    onBulkInclude={handleBulkInclude}
                    onBulkSetCategory={handleBulkSetCategory}
                  />
                )}
              </div>
            )}

            {/* Step: Saving Progress */}
            {step === 'saving' && (
              <div className="py-20 text-center space-y-4">
                <Loader2 className="size-10 animate-spin mx-auto" style={{ color: TEAL }} />
                <h3 className="text-lg font-bold text-white" style={headingFont}>
                  Saving to Supabase...
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto" style={monoFont}>
                  Writing selected transactions securely to your FinMax database and updating your account balance.
                </p>
              </div>
            )}

            {/* Step: Done */}
            {step === 'done' && (
              <div className="py-12 text-center space-y-6">
                <div
                  className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'rgba(52,211,153,0.15)',
                    border: '1px solid rgba(52,211,153,0.3)',
                  }}
                >
                  <CheckCircle2 className="size-8 text-emerald-400" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white" style={headingFont}>
                    Import Complete!
                  </h3>
                  <p className="text-sm text-neutral-300 max-w-md mx-auto" style={monoFont}>
                    Successfully imported <span className="font-bold text-emerald-400">{savedCount}</span>{' '}
                    transactions into FinMax. Your dashboard, expenses, and AI Insights have been automatically refreshed.
                  </p>
                </div>

                {skippedCount > 0 && (
                  <div className="text-xs text-neutral-400" style={monoFont}>
                    ({skippedCount} duplicate or invalid rows were skipped)
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 pt-4">
                  <NeonButton variant="ghost" onClick={resetWizard}>
                    Import Another Statement
                  </NeonButton>
                  <NeonButton onClick={handleClose}>
                    Done & View Dashboard
                  </NeonButton>
                </div>
              </div>
            )}

            {/* Step: Error */}
            {step === 'error' && (
              <div className="py-12 text-center space-y-6">
                <div
                  className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'rgba(248,113,113,0.15)',
                    border: '1px solid rgba(248,113,113,0.3)',
                  }}
                >
                  <AlertCircle className="size-8 text-red-400" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white" style={headingFont}>
                    Import Could Not Proceed
                  </h3>
                  <p className="text-xs text-red-300 max-w-md mx-auto" style={monoFont}>
                    {errorMessage || 'An error occurred during statement processing.'}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-4">
                  <NeonButton variant="ghost" onClick={resetWizard}>
                    Try Another File
                  </NeonButton>
                  <NeonButton onClick={handleClose}>Close</NeonButton>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer (Action buttons on Preview step) */}
          {step === 'preview' && !showColumnMapper && (
            <div className="p-6 border-t border-white/10 flex items-center justify-between shrink-0 bg-black/40">
              <button
                type="button"
                onClick={resetWizard}
                className="text-xs text-neutral-400 hover:text-white transition-colors"
                style={monoFont}
              >
                Cancel & Start Over
              </button>

              <div className="flex items-center gap-3">
                <NeonButton variant="ghost" onClick={handleClose}>
                  Close
                </NeonButton>

                <NeonButton
                  onClick={handleConfirmImport}
                  disabled={previewRows.filter(r => r.included).length === 0 || isSaving}
                >
                  <Check className="size-4" />
                  Confirm & Import ({previewRows.filter(r => r.included).length})
                </NeonButton>
              </div>
            </div>
          )}
        </motion.div>

        {/* PdfPasswordModal */}
        <PdfPasswordModal
          isOpen={isPasswordModalOpen}
          fileName={selectedFile?.name || 'statement.pdf'}
          onUnlock={handlePdfUnlock}
          onCancel={handlePdfPasswordCancel}
          showError={Boolean(passwordError)}
          isUnlocking={isUnlocking}
          errorMessage={passwordError}
        />
      </div>
    </AnimatePresence>
  );
}
