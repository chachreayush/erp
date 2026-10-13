import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiGetJournals,
  apiReverseJournal,
  JournalVoucherResponse
} from '../../lib/api';
import {
  BookOpen,
  Calendar,
  Search,
  Filter,
  RotateCcw,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Tag,
  DollarSign
} from 'lucide-react';

const CLASSIFICATIONS = [
  'All',
  'Standard Manual Journal',
  'Accrual Journal',
  'Provision',
  'Prepaid / Deferred Adjustment',
  'Reclassification / Transfer',
  'Opening Balance Adjustment'
];

export default function JournalRegister() {
  const navigate = useNavigate();

  // Filter States
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Data States
  const [vouchers, setVouchers] = useState<JournalVoucherResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Expanded Row IDs
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Reversal Modal States
  const [selectedVoucherForReversal, setSelectedVoucherForReversal] = useState<JournalVoucherResponse | null>(null);
  const [reversalDate, setReversalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reversalReason, setReversalReason] = useState<string>('Period-end adjustment reversal');
  const [reversing, setReversing] = useState<boolean>(false);

  // Load vouchers from API
  const fetchVouchers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiGetJournals({
        journal_type: selectedType === 'All' ? undefined : selectedType,
        status: selectedStatus === 'All' ? undefined : selectedStatus,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
        search: searchQuery.trim() || undefined
      });
      setVouchers(data || []);
    } catch (err: any) {
      console.error('Failed to load journal vouchers:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to load journal vouchers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [selectedType, selectedStatus, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVouchers();
  };

  // Open Reversal Modal
  const handleOpenReversalModal = (v: JournalVoucherResponse) => {
    setSelectedVoucherForReversal(v);
    setReversalDate(new Date().toISOString().split('T')[0]);
    setReversalReason(`Reversal of ${v.voucher_number}: Period-end adjustment`);
  };

  // Execute Reversal
  const handleConfirmReversal = async () => {
    if (!selectedVoucherForReversal) return;
    setReversing(true);
    setErrorMsg('');

    try {
      const res = await apiReverseJournal(selectedVoucherForReversal.id, {
        reversal_date: new Date(reversalDate).toISOString(),
        reason: reversalReason.trim()
      });

      setVouchers(prev =>
        prev.map(v =>
          v.id === selectedVoucherForReversal.id
            ? { ...v, status: 'Reversed', reversal_voucher_number: res.voucher_number }
            : v
        )
      );
      setSuccessMsg(
        `Voucher ${selectedVoucherForReversal.voucher_number} successfully reversed! Inverted Voucher ${res.voucher_number} posted to GL.`
      );
      setSelectedVoucherForReversal(null);
      await fetchVouchers();
    } catch (err: any) {
      console.error('Failed to reverse voucher:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to reverse journal voucher.');
    } finally {
      setReversing(false);
    }
  };

  // Metrics
  const totalCount = vouchers.length;
  const totalAmount = vouchers.reduce((acc, v) => acc + (Number(v.total_amount) || 0), 0);
  const activeAccruals = vouchers.filter(v => v.journal_type === 'Accrual Journal' && v.status === 'Active').length;
  const reversedCount = vouchers.filter(v => v.status === 'Reversed').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-emerald-400/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">Journal Register & Audit Workbench</h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-900/60 text-emerald-300 border border-emerald-500/30">
                  DOC-25
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Audited register of manual journals, accruals, provisions, and atomic double-entry reversals
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate('/journal')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition"
              data-testid="btn-new-journal"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Journal Entry</span>
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm flex items-start space-x-3 animate-fade-in" data-testid="register-error-alert">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Error: </span>
              {errorMsg}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-sm flex items-center justify-between space-x-3 shadow-lg animate-fade-in" data-testid="register-success-alert">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg('')}
              className="text-xs text-emerald-400 hover:text-white underline font-mono"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm space-y-1">
            <span className="text-xs text-zinc-400 uppercase font-mono">Total Journals</span>
            <div className="text-2xl font-bold text-white font-mono" data-testid="metric-total-journals">
              {totalCount}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm space-y-1">
            <span className="text-xs text-zinc-400 uppercase font-mono">Total Volume</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono" data-testid="metric-total-volume">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm space-y-1">
            <span className="text-xs text-zinc-400 uppercase font-mono">Active Accruals</span>
            <div className="text-2xl font-bold text-amber-400 font-mono" data-testid="metric-active-accruals">
              {activeAccruals}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm space-y-1">
            <span className="text-xs text-zinc-400 uppercase font-mono">Reversals Posted</span>
            <div className="text-2xl font-bold text-purple-400 font-mono" data-testid="metric-reversals-posted">
              {reversedCount}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search voucher #, narration, ref..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-500 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-100 outline-none transition"
                data-testid="input-register-search"
              />
            </div>

            {/* Classification */}
            <div>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-500 rounded-lg px-2.5 py-2 text-xs text-zinc-100 outline-none transition"
                data-testid="select-filter-classification"
              >
                {CLASSIFICATIONS.map(c => (
                  <option key={c} value={c} className="bg-zinc-900">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-500 rounded-lg px-2.5 py-2 text-xs text-zinc-100 outline-none transition"
                data-testid="select-filter-status"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Reversed">Reversed</option>
              </select>
            </div>

            {/* Submit / Refresh Button */}
            <div>
              <button
                type="submit"
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg py-2 text-xs font-semibold transition"
                data-testid="btn-apply-filter"
              >
                Apply Filters
              </button>
            </div>
          </form>

          {/* Date range pickers */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
            <span className="font-mono">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 font-mono outline-none"
              data-testid="input-filter-start-date"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 font-mono outline-none"
              data-testid="input-filter-end-date"
            />
            {(startDate || endDate || searchQuery || selectedType !== 'All' || selectedStatus !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSearchQuery('');
                  setSelectedType('All');
                  setSelectedStatus('All');
                }}
                className="text-xs text-emerald-400 hover:underline font-mono ml-auto"
                data-testid="btn-clear-filters"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Register Table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="journal-register-table">
              <thead className="bg-zinc-950 text-zinc-400 font-mono text-xs uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 w-32">Date</th>
                  <th className="py-3 px-4 w-40">Voucher #</th>
                  <th className="py-3 px-4 w-44">Classification</th>
                  <th className="py-3 px-4 min-w-[200px]">Narration & References</th>
                  <th className="py-3 px-4 w-36 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 w-32 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-zinc-500 font-mono text-sm">
                      Loading journal vouchers...
                    </td>
                  </tr>
                ) : vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-zinc-500 font-mono text-sm">
                      No journal vouchers found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  vouchers.map(v => {
                    const isExpanded = expandedRowId === v.id;
                    const dateFormatted = new Date(v.date).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });

                    return (
                      <React.Fragment key={v.id}>
                        <tr
                          className="hover:bg-zinc-850/60 transition-colors cursor-pointer"
                          onClick={() => setExpandedRowId(isExpanded ? null : v.id)}
                          data-testid={`voucher-row-${v.voucher_number}`}
                        >
                          {/* Date */}
                          <td className="py-3.5 px-4 font-mono text-xs text-zinc-300">
                            {dateFormatted}
                          </td>

                          {/* Voucher Number */}
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-xs">
                            <div className="flex items-center space-x-1">
                              <span>{v.voucher_number}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                              )}
                            </div>
                          </td>

                          {/* Classification */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-200 border border-zinc-700">
                              {v.journal_type || 'Standard Manual'}
                            </span>
                          </td>

                          {/* Narration & Ref */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs text-zinc-200 font-medium line-clamp-1">
                              {v.narration || <span className="text-zinc-600 italic">No narration</span>}
                            </div>
                            {v.scheduled_reversal_date && (
                              <div className="text-[10px] text-amber-400/90 font-mono mt-0.5 flex items-center space-x-1">
                                <Clock className="w-3 h-3 inline" />
                                <span>Reversal Sched: {v.scheduled_reversal_date}</span>
                              </div>
                            )}
                            {v.reversal_voucher_number && (
                              <div className="text-[10px] text-purple-400 font-mono mt-0.5 flex items-center space-x-1">
                                <RotateCcw className="w-3 h-3 inline" />
                                <span>Linked to: {v.reversal_voucher_number}</span>
                              </div>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-100 text-sm">
                            ₹{Number(v.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            {v.status === 'Active' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Active</span>
                              </span>
                            ) : v.status === 'Reversed' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                                <RotateCcw className="w-3 h-3" />
                                <span>Reversed</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400">
                                {v.status}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                            {v.status === 'Active' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenReversalModal(v)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-rose-950 text-zinc-300 hover:text-rose-300 border border-zinc-750 hover:border-rose-700/60 text-xs font-semibold transition"
                                title="Traceable Reversal (Posts Inverted Journal to GL)"
                                data-testid={`btn-reverse-${v.voucher_number}`}
                              >
                                <RotateCcw className="w-3 h-3 text-rose-400" />
                                <span>Reverse ↩</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-zinc-500 font-mono">Immutable</span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Drawer: Double Entry Legs Breakdown */}
                        {isExpanded && (
                          <tr className="bg-zinc-950/70 border-b border-zinc-800">
                            <td colSpan={7} className="p-4 pl-12">
                              <div className="space-y-2 max-w-3xl">
                                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
                                  Entry Legs Breakdown ({v.entries.length} legs)
                                </div>
                                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead className="bg-zinc-950 text-zinc-500 uppercase font-mono">
                                      <tr>
                                        <th className="py-2 px-3 w-16">Leg</th>
                                        <th className="py-2 px-3">Ledger Name</th>
                                        <th className="py-2 px-3 text-right w-36">Debit (₹)</th>
                                        <th className="py-2 px-3 text-right w-36">Credit (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60">
                                      {v.entries.map((entry, eIdx) => (
                                        <tr key={entry.id || eIdx} className="hover:bg-zinc-800/40">
                                          <td className="py-2 px-3 font-mono font-bold">
                                            <span
                                              className={`px-1.5 py-0.5 rounded ${
                                                entry.cr_dr === 'Dr'
                                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                                              }`}
                                            >
                                              {entry.cr_dr}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-zinc-200 font-medium">
                                            {entry.ledger_name || 'Account'}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-emerald-400 font-bold">
                                            {entry.cr_dr === 'Dr'
                                              ? `₹${Number(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                              : '-'}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-amber-400 font-bold">
                                            {entry.cr_dr === 'Cr'
                                              ? `₹${Number(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                              : '-'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Traceable Reversal Confirmation Modal */}
      {selectedVoucherForReversal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" data-testid="reversal-modal">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-750 p-6 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reverse Journal Voucher</h3>
                <p className="text-xs text-zinc-400">Post atomic double-entry reversal to General Ledger</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Target Voucher:</span>
                <span className="font-mono font-bold text-emerald-400">{selectedVoucherForReversal.voucher_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Original Date:</span>
                <span className="font-mono text-zinc-300">
                  {new Date(selectedVoucherForReversal.date).toLocaleDateString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Volume:</span>
                <span className="font-mono font-bold text-white">
                  ₹{Number(selectedVoucherForReversal.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-800/80 text-amber-400/90 text-[11px] leading-relaxed">
                Notice: All Debits will be posted as Credits, and all Credits as Debits. The original voucher will be marked as 'Reversed' and linked to the new reversal voucher.
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Reversal Posting Date *</label>
                <input
                  type="date"
                  value={reversalDate}
                  onChange={e => setReversalDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                  data-testid="input-modal-reversal-date"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Reason for Reversal *</label>
                <input
                  type="text"
                  value={reversalReason}
                  onChange={e => setReversalReason(e.target.value)}
                  placeholder="e.g. Period-end adjustment reversal / Auditor instruction"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 outline-none"
                  data-testid="input-modal-reversal-reason"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedVoucherForReversal(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
                data-testid="btn-modal-reversal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReversal}
                disabled={reversing}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition flex items-center space-x-2"
                data-testid="btn-modal-reversal-confirm"
              >
                {reversing ? (
                  <span>Reversing in GL...</span>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm Reversal & Post</span>
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
