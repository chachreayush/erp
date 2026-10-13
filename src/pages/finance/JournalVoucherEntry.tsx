import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  apiGetLedgers,
  apiCreateJournal,
  Ledger,
  JournalLinePayload
} from '../../lib/api';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  Scale,
  Save,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ListFilter,
  FileText,
  Clock,
  ShieldCheck,
  Search
} from 'lucide-react';

interface JournalLineRow {
  id: string;
  ledger_id: string;
  ledger_name: string;
  cr_dr: 'Dr' | 'Cr';
  debit_amount: string;
  credit_amount: string;
  narration: string;
}

const JOURNAL_CLASSIFICATIONS = [
  'Standard Manual Journal',
  'Accrual Journal',
  'Provision',
  'Prepaid / Deferred Adjustment',
  'Reclassification / Transfer',
  'Opening Balance Adjustment'
];

export default function JournalVoucherEntry() {
  const navigate = useNavigate();
  const location = useLocation();

  // Storage key for sequence continuation
  const storageKey = 'lastJournalVoucherNo';
  const defaultInitialNo = 'JV-0001';

  // Master State
  const [voucherNumber, setVoucherNumber] = useState<string>(() => {
    return localStorage.getItem(storageKey) || defaultInitialNo;
  });
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [journalType, setJournalType] = useState<string>('Standard Manual Journal');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [overallNarration, setOverallNarration] = useState<string>('');

  // Accrual Reversal Scheduler
  const [scheduleReversal, setScheduleReversal] = useState<boolean>(false);
  const [reversalDate, setReversalDate] = useState<string>(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    return nextMonth.toISOString().split('T')[0];
  });

  // Ledgers Cache
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loadingLedgers, setLoadingLedgers] = useState<boolean>(true);

  // Multi-Leg Lines (minimum 2 lines)
  const [lines, setLines] = useState<JournalLineRow[]>([
    {
      id: 'row-1',
      ledger_id: '',
      ledger_name: '',
      cr_dr: 'Dr',
      debit_amount: '',
      credit_amount: '',
      narration: ''
    },
    {
      id: 'row-2',
      ledger_id: '',
      ledger_name: '',
      cr_dr: 'Cr',
      debit_amount: '',
      credit_amount: '',
      narration: ''
    }
  ]);

  const [activeRowIndex, setActiveRowIndex] = useState<number>(0);

  // Status & Feedback
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Load ledgers on mount
  useEffect(() => {
    setLoadingLedgers(true);
    apiGetLedgers()
      .then(res => {
        setLedgers(res || []);
      })
      .catch(err => {
        console.error('Failed to load ledgers:', err);
        setErrorMsg('Failed to load chart of accounts ledgers.');
      })
      .finally(() => setLoadingLedgers(false));
  }, []);

  // When classification changes to Accrual, automatically activate reversal schedule
  const handleClassificationChange = (newType: string) => {
    setJournalType(newType);
    if (newType === 'Accrual Journal') {
      setScheduleReversal(true);
    }
  };

  // Series continuation helper
  const incrementSeries = (series: string): string => {
    if (!series) return defaultInitialNo;
    const match = series.match(/^(.*?)(\d+)$/);
    if (!match) return `${series}-0001`;
    const prefix = match[1];
    const numStr = match[2];
    const nextNum = parseInt(numStr, 10) + 1;
    return `${prefix}${nextNum.toString().padStart(numStr.length, '0')}`;
  };

  // Calculate totals
  const totalDr = lines
    .filter(l => l.cr_dr === 'Dr')
    .reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0);

  const totalCr = lines
    .filter(l => l.cr_dr === 'Cr')
    .reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0);

  const difference = Math.abs(totalDr - totalCr);
  const isBalanced = Math.abs(totalDr - totalCr) < 0.001 && totalDr > 0;

  // Add Row
  const handleAddRow = (crDrDefault: 'Dr' | 'Cr' = totalDr > totalCr ? 'Cr' : 'Dr') => {
    const newId = `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setLines(prev => [
      ...prev,
      {
        id: newId,
        ledger_id: '',
        ledger_name: '',
        cr_dr: crDrDefault,
        debit_amount: '',
        credit_amount: '',
        narration: ''
      }
    ]);
    setActiveRowIndex(lines.length);
  };

  // Remove Row
  const handleRemoveRow = (index: number) => {
    if (lines.length <= 2) {
      setErrorMsg('A journal voucher requires at least two lines.');
      return;
    }
    setLines(prev => prev.filter((_, idx) => idx !== index));
    if (activeRowIndex >= index && activeRowIndex > 0) {
      setActiveRowIndex(activeRowIndex - 1);
    }
  };

  // Duplicate Row [Ctrl+D]
  const handleDuplicateRow = (index: number) => {
    const target = lines[index];
    if (!target) return;
    const newId = `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const cloned: JournalLineRow = {
      ...target,
      id: newId
    };
    const updated = [...lines];
    updated.splice(index + 1, 0, cloned);
    setLines(updated);
    setActiveRowIndex(index + 1);
  };

  // Update line field
  const handleLineChange = (index: number, field: keyof JournalLineRow, val: any) => {
    setErrorMsg('');
    setLines(prev => {
      const next = [...prev];
      const cur = { ...next[index] };

      if (field === 'ledger_id') {
        cur.ledger_id = val;
        const selected = ledgers.find(l => l.id === val);
        cur.ledger_name = selected ? selected.name : '';
      } else if (field === 'cr_dr') {
        cur.cr_dr = val;
        if (val === 'Dr') {
          cur.debit_amount = cur.credit_amount || cur.debit_amount;
          cur.credit_amount = '';
        } else {
          cur.credit_amount = cur.debit_amount || cur.credit_amount;
          cur.debit_amount = '';
        }
      } else if (field === 'debit_amount') {
        cur.debit_amount = val;
        cur.credit_amount = '';
        cur.cr_dr = 'Dr';
      } else if (field === 'credit_amount') {
        cur.credit_amount = val;
        cur.debit_amount = '';
        cur.cr_dr = 'Cr';
      } else if (field === 'narration') {
        cur.narration = val;
      }

      next[index] = cur;
      return next;
    });
  };

  // Auto-Balance Feature [Ctrl+B]
  const handleAutoBalance = () => {
    if (totalDr === 0 && totalCr === 0) {
      setErrorMsg('Please enter an initial Debit or Credit amount before auto-balancing.');
      return;
    }
    setErrorMsg('');

    const delta = totalDr - totalCr;
    if (Math.abs(delta) < 0.001) {
      // Already balanced
      return;
    }

    const neededCrDr = delta > 0 ? 'Cr' : 'Dr';
    const neededAmount = Math.abs(delta).toFixed(2);

    // Look for a row that has no amount or empty amount
    const emptyRowIdx = lines.findIndex(l => !l.debit_amount && !l.credit_amount);

    if (emptyRowIdx !== -1) {
      setLines(prev => {
        const next = [...prev];
        next[emptyRowIdx] = {
          ...next[emptyRowIdx],
          cr_dr: neededCrDr,
          debit_amount: neededCrDr === 'Dr' ? neededAmount : '',
          credit_amount: neededCrDr === 'Cr' ? neededAmount : ''
        };
        return next;
      });
      setActiveRowIndex(emptyRowIdx);
    } else {
      // Create new line with balancing amount
      const newId = `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      setLines(prev => [
        ...prev,
        {
          id: newId,
          ledger_id: '',
          ledger_name: '',
          cr_dr: neededCrDr,
          debit_amount: neededCrDr === 'Dr' ? neededAmount : '',
          credit_amount: neededCrDr === 'Cr' ? neededAmount : '',
          narration: ''
        }
      ]);
      setActiveRowIndex(lines.length);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B: Auto Balance
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        handleAutoBalance();
      }
      // Ctrl+D: Duplicate active row
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleDuplicateRow(activeRowIndex);
      }
      // Alt+A: Add Row
      else if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleAddRow();
      }
      // Ctrl+S / Alt+S: Post
      else if ((e.ctrlKey || e.altKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handlePreSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lines, totalDr, totalCr, activeRowIndex]);

  // Validation before opening confirmation
  const handlePreSubmit = () => {
    setErrorMsg('');

    if (!voucherNumber.trim()) {
      setErrorMsg('Voucher number is required.');
      return;
    }
    if (!date) {
      setErrorMsg('Posting date is required.');
      return;
    }
    if (lines.length < 2) {
      setErrorMsg('A journal voucher must have at least two entry legs.');
      return;
    }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.ledger_id) {
        setErrorMsg(`Line #${i + 1} has no Ledger account selected.`);
        return;
      }
      const amt = l.cr_dr === 'Dr' ? parseFloat(l.debit_amount) : parseFloat(l.credit_amount);
      if (!amt || amt <= 0) {
        setErrorMsg(`Line #${i + 1} amount must be greater than zero.`);
        return;
      }
    }
    if (!isBalanced) {
      setErrorMsg(`Journal Voucher is not balanced! Total Dr (₹${totalDr.toFixed(2)}) must equal Total Cr (₹${totalCr.toFixed(2)}). Delta: ₹${difference.toFixed(2)}.`);
      return;
    }

    setShowConfirmModal(true);
  };

  // Submit to Backend
  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      const entriesPayload: JournalLinePayload[] = lines.map(l => ({
        ledger_id: l.ledger_id,
        cr_dr: l.cr_dr,
        amount: l.cr_dr === 'Dr' ? parseFloat(l.debit_amount) : parseFloat(l.credit_amount),
        narration: l.narration || undefined
      }));

      const res = await apiCreateJournal({
        voucher_number: voucherNumber.trim(),
        date: new Date(date).toISOString(),
        journal_type: journalType,
        narration: overallNarration.trim() || undefined,
        reference_number: referenceNumber.trim() || undefined,
        scheduled_reversal_date: scheduleReversal ? reversalDate : null,
        entries: entriesPayload
      });

      // Advance sequence number
      const nextNo = incrementSeries(res.voucher_number || voucherNumber);
      localStorage.setItem(storageKey, nextNo);
      setVoucherNumber(nextNo);

      setSuccessBanner(`Journal Voucher ${res.voucher_number} successfully posted! Status: ${res.status}. Total: ₹${res.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`);
      setShowConfirmModal(false);

      // Reset lines to initial 2-row clean state
      setLines([
        {
          id: 'row-1',
          ledger_id: '',
          ledger_name: '',
          cr_dr: 'Dr',
          debit_amount: '',
          credit_amount: '',
          narration: ''
        },
        {
          id: 'row-2',
          ledger_id: '',
          ledger_name: '',
          cr_dr: 'Cr',
          debit_amount: '',
          credit_amount: '',
          narration: ''
        }
      ]);
      setOverallNarration('');
      setReferenceNumber('');
      if (journalType !== 'Accrual Journal') {
        setScheduleReversal(false);
      }
    } catch (err: any) {
      console.error('Error posting journal voucher:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to post journal voucher.';
      setErrorMsg(detail);
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6 pb-32">
      {/* Top Banner & Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-emerald-400/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">Journal Voucher Cockpit</h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-900/60 text-emerald-300 border border-emerald-500/30">
                  DOC-25
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Keyboard-First
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Multi-leg double-entry adjustments, accruals, provisions, and auto-balancing GL postings
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate('/finance/journal-register')}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-750 text-sm font-medium transition shadow-sm"
              data-testid="btn-view-register"
            >
              <ListFilter className="w-4 h-4 text-emerald-400" />
              <span>Journal Register</span>
            </button>
            <button
              type="button"
              onClick={handleAutoBalance}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/50 text-sm font-medium transition shadow-sm hover:border-emerald-500"
              title="Shortcut: Ctrl+B"
              data-testid="btn-auto-balance-top"
            >
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>Auto-Balance [Ctrl+B]</span>
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm flex items-start space-x-3 animate-fade-in" data-testid="journal-error-alert">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Validation Error: </span>
              {errorMsg}
            </div>
          </div>
        )}

        {successBanner && (
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-sm flex items-center justify-between space-x-3 shadow-lg shadow-emerald-950/30 animate-fade-in" data-testid="journal-success-alert">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessBanner('')}
              className="text-xs text-emerald-400 hover:text-white underline font-mono"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Cockpit Header Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl backdrop-blur-sm">
          {/* Voucher Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Voucher Number *</span>
            </label>
            <input
              type="text"
              value={voucherNumber}
              onChange={e => setVoucherNumber(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-sm font-mono text-emerald-300 font-bold outline-none transition"
              data-testid="input-voucher-number"
            />
          </div>

          {/* Posting Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Posting Date *</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none transition font-mono"
              data-testid="input-posting-date"
            />
          </div>

          {/* Journal Classification */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
              <ListFilter className="w-3.5 h-3.5 text-emerald-400" />
              <span>Classification *</span>
            </label>
            <select
              value={journalType}
              onChange={e => handleClassificationChange(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none transition cursor-pointer"
              data-testid="select-journal-classification"
            >
              {JOURNAL_CLASSIFICATIONS.map(cls => (
                <option key={cls} value={cls} className="bg-zinc-900 text-zinc-100">
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Reference / Source Doc */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ref / Source Doc #</span>
            </label>
            <input
              type="text"
              placeholder="e.g. INV-2026-881 / AGREEMENT"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none transition placeholder-zinc-600 font-mono"
              data-testid="input-reference-number"
            />
          </div>

          {/* Overall Narration */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Overall Narration / Audit Note
            </label>
            <input
              type="text"
              placeholder="Provide a detailed audit explanation for this adjustment or journal voucher..."
              value={overallNarration}
              onChange={e => setOverallNarration(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none transition placeholder-zinc-600"
              data-testid="input-overall-narration"
            />
          </div>

          {/* Accrual Reversal Scheduler Panel */}
          <div className="space-y-1.5 border border-zinc-800 rounded-xl p-2.5 bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-emerald-400 flex items-center space-x-1.5 cursor-pointer">
                <Clock className="w-3.5 h-3.5" />
                <span>Auto-Reversal</span>
              </label>
              <input
                type="checkbox"
                checked={scheduleReversal}
                onChange={e => setScheduleReversal(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-zinc-900 border-zinc-700 cursor-pointer"
                data-testid="checkbox-schedule-reversal"
              />
            </div>
            {scheduleReversal ? (
              <div className="pt-1">
                <input
                  type="date"
                  value={reversalDate}
                  onChange={e => setReversalDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-emerald-600/50 rounded px-2 py-1 text-xs font-mono text-emerald-300 outline-none"
                  data-testid="input-reversal-date"
                />
                <span className="text-[10px] text-zinc-400 block mt-1">
                  Scheduled inverted reversal in GL
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-zinc-500 block pt-1">
                Permanent journal (no auto-reversal)
              </span>
            )}
          </div>
        </div>

        {/* Multi-Leg Journal Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Double-Entry Allocation Lines</span>
                <span className="text-xs font-normal text-zinc-400">({lines.length} legs)</span>
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleAddRow('Dr')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-medium transition"
                data-testid="btn-add-dr-line"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Dr Line</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddRow('Cr')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-medium transition"
                data-testid="btn-add-cr-line"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Add Cr Line</span>
              </button>
              <button
                type="button"
                onClick={handleAutoBalance}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 text-xs font-medium transition"
                data-testid="btn-auto-balance-grid"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Balance [Ctrl+B]</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" data-testid="journal-entry-table">
                <thead className="bg-zinc-950 text-zinc-400 font-mono text-xs uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">#</th>
                    <th className="py-3 px-4 w-32">Dr / Cr</th>
                    <th className="py-3 px-4 min-w-[260px]">Ledger Account *</th>
                    <th className="py-3 px-4 w-44 text-right">Debit (₹)</th>
                    <th className="py-3 px-4 w-44 text-right">Credit (₹)</th>
                    <th className="py-3 px-4 min-w-[220px]">Line Narration / Remarks</th>
                    <th className="py-3 px-3 w-20 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {lines.map((row, idx) => {
                    const isSelected = activeRowIndex === idx;
                    const selectedLedger = ledgers.find(l => l.id === row.ledger_id);
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setActiveRowIndex(idx)}
                        className={`transition-colors ${
                          isSelected ? 'bg-zinc-800/40 ring-1 ring-inset ring-emerald-500/20' : 'hover:bg-zinc-850'
                        }`}
                        data-testid={`journal-row-${idx}`}
                      >
                        {/* Row Index */}
                        <td className="py-3 px-3 text-center font-mono text-zinc-500 text-xs">
                          {idx + 1}
                        </td>

                        {/* Dr / Cr Selector */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleLineChange(idx, 'cr_dr', 'Dr')}
                              className={`px-2.5 py-1 rounded text-xs font-bold font-mono transition ${
                                row.cr_dr === 'Dr'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                                  : 'bg-zinc-950 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
                              }`}
                              data-testid={`btn-dr-${idx}`}
                            >
                              Dr
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLineChange(idx, 'cr_dr', 'Cr')}
                              className={`px-2.5 py-1 rounded text-xs font-bold font-mono transition ${
                                row.cr_dr === 'Cr'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                                  : 'bg-zinc-950 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
                              }`}
                              data-testid={`btn-cr-${idx}`}
                            >
                              Cr
                            </button>
                          </div>
                        </td>

                        {/* Ledger Account Dropdown */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <select
                              value={row.ledger_id}
                              onChange={e => handleLineChange(idx, 'ledger_id', e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 outline-none transition cursor-pointer"
                              data-testid={`select-ledger-${idx}`}
                            >
                              <option value="">-- Select Ledger Account --</option>
                              {ledgers.map(l => (
                                <option key={l.id} value={l.id} className="bg-zinc-900 text-zinc-100">
                                  {l.name} - {l.group_name || 'General'}
                                </option>
                              ))}
                            </select>
                            {selectedLedger && (
                              <div className="text-[10px] text-zinc-400 flex items-center justify-between px-1 font-mono">
                                <span>Group: {selectedLedger.group_name || 'General'}</span>
                                <span className="text-zinc-300">
                                  Bal: ₹{Number(selectedLedger.closing_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {selectedLedger.cl_type || 'Dr'}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Debit Amount */}
                        <td className="py-3 px-4 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            disabled={row.cr_dr !== 'Dr'}
                            value={row.debit_amount}
                            onChange={e => handleLineChange(idx, 'debit_amount', e.target.value)}
                            className={`w-full text-right font-mono text-sm px-2.5 py-1.5 rounded-lg border outline-none transition ${
                              row.cr_dr === 'Dr'
                                ? 'bg-zinc-950 border-zinc-700 focus:border-emerald-500 text-emerald-400 font-bold'
                                : 'bg-zinc-900/40 border-transparent text-zinc-600 cursor-not-allowed'
                            }`}
                            data-testid={`input-debit-${idx}`}
                          />
                        </td>

                        {/* Credit Amount */}
                        <td className="py-3 px-4 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            disabled={row.cr_dr !== 'Cr'}
                            value={row.credit_amount}
                            onChange={e => handleLineChange(idx, 'credit_amount', e.target.value)}
                            className={`w-full text-right font-mono text-sm px-2.5 py-1.5 rounded-lg border outline-none transition ${
                              row.cr_dr === 'Cr'
                                ? 'bg-zinc-950 border-zinc-700 focus:border-amber-500 text-amber-400 font-bold'
                                : 'bg-zinc-900/40 border-transparent text-zinc-600 cursor-not-allowed'
                            }`}
                            data-testid={`input-credit-${idx}`}
                          />
                        </td>

                        {/* Line Narration */}
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Optional line remarks..."
                            value={row.narration}
                            onChange={e => handleLineChange(idx, 'narration', e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-750 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 outline-none transition placeholder-zinc-700"
                            data-testid={`input-line-narration-${idx}`}
                          />
                        </td>

                        {/* Row Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateRow(idx);
                              }}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                              title="Duplicate row (Ctrl+D)"
                              data-testid={`btn-duplicate-${idx}`}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveRow(idx);
                              }}
                              disabled={lines.length <= 2}
                              className={`p-1 rounded transition ${
                                lines.length <= 2
                                  ? 'text-zinc-700 cursor-not-allowed'
                                  : 'hover:bg-rose-950 text-zinc-400 hover:text-rose-400'
                              }`}
                              title="Remove row"
                              data-testid={`btn-remove-${idx}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Add Line & Keyboard hints */}
            <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-2">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleAddRow(totalDr > totalCr ? 'Cr' : 'Dr')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-750 text-xs font-semibold transition"
                  data-testid="btn-add-line-bottom"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Add Line [Alt+A]</span>
                </button>
              </div>

              <div className="flex items-center space-x-4 font-mono text-[11px] text-zinc-400">
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">Ctrl+B</kbd> Auto-Balance
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">Ctrl+D</kbd> Duplicate Row
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">Alt+S</kbd> Post
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Sticky Bottom Totals & Submission Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 p-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Running Balance Totals */}
          <div className="flex items-center space-x-6 text-sm font-mono">
            <div>
              <span className="text-zinc-500 text-xs uppercase block">Total Debits</span>
              <span className="text-lg font-bold text-emerald-400" data-testid="total-debits-display">
                ₹{totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="border-l border-zinc-800 pl-6">
              <span className="text-zinc-500 text-xs uppercase block">Total Credits</span>
              <span className="text-lg font-bold text-amber-400" data-testid="total-credits-display">
                ₹{totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="border-l border-zinc-800 pl-6">
              <span className="text-zinc-500 text-xs uppercase block">Difference</span>
              <span
                className={`text-lg font-bold ${
                  difference < 0.001 ? 'text-zinc-400' : 'text-rose-400 animate-pulse'
                }`}
                data-testid="difference-display"
              >
                ₹{difference.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Status indicator pill */}
            <div className="border-l border-zinc-800 pl-6">
              {isBalanced ? (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-xs font-semibold" data-testid="balance-status-balanced">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>BALANCED</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/40 text-xs font-semibold" data-testid="balance-status-unbalanced">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>OUT OF BALANCE</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              type="button"
              onClick={handleAutoBalance}
              disabled={isBalanced}
              className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition flex items-center space-x-2 ${
                isBalanced
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-emerald-600/50 text-emerald-300 hover:border-emerald-500 shadow-sm'
              }`}
              data-testid="btn-auto-balance-bottom"
            >
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>Auto-Balance</span>
            </button>

            <button
              type="button"
              onClick={handlePreSubmit}
              disabled={!isBalanced || submitting}
              className={`flex-1 md:flex-initial px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition flex items-center justify-center space-x-2 ${
                isBalanced && !submitting
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-950/50 cursor-pointer'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-750'
              }`}
              data-testid="btn-post-journal"
            >
              <Save className="w-4 h-4" />
              <span>Post Journal Voucher</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" data-testid="confirm-modal">
          <div className="w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-750 p-6 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Journal Voucher Posting</h3>
                <p className="text-xs text-zinc-400">Please review double-entry allocations before ledger commitment</p>
              </div>
            </div>

            {/* Summary Details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              <div>
                <span className="text-zinc-500 block">Voucher Number:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{voucherNumber}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Date:</span>
                <span className="font-mono text-zinc-200">{date}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Classification:</span>
                <span className="text-zinc-200 font-medium">{journalType}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Total Balanced Amount:</span>
                <span className="font-mono font-bold text-white text-sm">
                  ₹{totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {scheduleReversal && (
                <div className="col-span-2 pt-2 border-t border-zinc-800/80">
                  <span className="text-emerald-400 font-semibold block flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 inline" />
                    <span>Scheduled Auto-Reversal on {reversalDate}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Entry Lines Breakdown */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Entries Breakdown</div>
              {lines.map((l, i) => (
                <div key={l.id} className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-800/50">
                  <div className="flex items-center space-x-2">
                    <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                      l.cr_dr === 'Dr' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {l.cr_dr}
                    </span>
                    <span className="text-zinc-200 font-medium">{l.ledger_name}</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-100">
                    ₹{Number(l.cr_dr === 'Dr' ? l.debit_amount : l.credit_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
                data-testid="btn-modal-cancel"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition flex items-center space-x-2"
                data-testid="btn-modal-confirm"
              >
                {submitting ? (
                  <span>Posting to GL...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Post Voucher</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
