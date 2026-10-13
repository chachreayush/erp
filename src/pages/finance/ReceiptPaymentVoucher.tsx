import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  apiGetParties,
  apiGetLedgers,
  apiGetPendingAllocations,
  apiCreateReceiptPayment,
  Party,
  Ledger,
  PendingAllocationItem
} from '../../lib/api';
import {
  Receipt,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Hash,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Save,
  Search,
  X,
  FileText
} from 'lucide-react';

interface AllocationRow extends PendingAllocationItem {
  allocate_amount: string;
}

export default function ReceiptPaymentVoucher({ type: propType }: { type?: 'receipt' | 'payment' }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine mode: 'receipt' or 'payment'
  const isPayment = propType === 'payment' || location.pathname.includes('/payment');
  const voucherType: 'Receipt' | 'Payment' = isPayment ? 'Payment' : 'Receipt';

  // Series continuation key
  const storageKey = isPayment ? 'lastPaymentVoucherNo' : 'lastReceiptVoucherNo';
  const defaultInitialNo = isPayment ? 'PMT-0001' : 'RCP-0001';

  // State
  const [voucherNumber, setVoucherNumber] = useState<string>(() => {
    return localStorage.getItem(storageKey) || defaultInitialNo;
  });
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [partySearch, setPartySearch] = useState('');
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);

  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>('');

  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Cheque' | 'NEFT/RTGS' | 'UPI'>('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [instrumentDate, setInstrumentDate] = useState('');
  const [narration, setNarration] = useState('');

  // Bill-by-Bill allocations
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [loadingAllocations, setLoadingAllocations] = useState(false);
  const [autoAllocateFifo, setAutoAllocateFifo] = useState(false);

  // Status & Feedback
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Keyboard navigation refs
  const vchNoRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const refNoRef = useRef<HTMLInputElement>(null);
  const narrRef = useRef<HTMLInputElement>(null);

  // Universal Marg/Tally sequence continuation
  const incrementSeries = (series: string): string => {
    if (!series) return defaultInitialNo;
    const match = series.match(/^(.*?)(\d+)$/);
    if (!match) return `${series}-0001`;
    const prefix = match[1];
    const numStr = match[2];
    const nextNum = parseInt(numStr, 10) + 1;
    return `${prefix}${nextNum.toString().padStart(numStr.length, '0')}`;
  };

  // Load parties & cash/bank ledgers on mount
  useEffect(() => {
    const partyType = isPayment ? 'vendor' : 'customer';
    apiGetParties().then(res => {
      const filtered = (res || []).filter(p => {
        if (partyType === 'customer') {
          return Boolean(p.customer_profile) || !p.supplier_profile;
        } else {
          return Boolean(p.supplier_profile) || !p.customer_profile;
        }
      });
      setParties(filtered);

      // Check query param pre-select
      const params = new URLSearchParams(location.search);
      const prePartyId = params.get('party_id');
      if (prePartyId) {
        const found = filtered.find(p => p.id === prePartyId);
        if (found) setSelectedParty(found);
      }
    }).catch(console.error);

    apiGetLedgers().then(res => {
      // Find cash and bank accounts
      const cashBankLedgers = (res || []).filter(l =>
        ['Cash-in-hand', 'Bank Accounts', 'Cash', 'Bank'].includes(l.group_name || '') ||
        l.name.toLowerCase().includes('cash') ||
        l.name.toLowerCase().includes('bank')
      );
      setLedgers(cashBankLedgers);
      if (cashBankLedgers.length > 0) {
        setSelectedLedgerId(cashBankLedgers[0].id || '');
      }
    }).catch(console.error);
  }, [isPayment, location.search]);

  // Load open bills when selected party changes
  useEffect(() => {
    if (!selectedParty) {
      setAllocations([]);
      return;
    }
    setLoadingAllocations(true);
    apiGetPendingAllocations({
      party_id: selectedParty.id,
      party_type: isPayment ? 'vendor' : 'customer',
      direction: isPayment ? 'payable' : 'receivable'
    }).then(res => {
      const rows: AllocationRow[] = (res || []).map(item => ({
        ...item,
        allocate_amount: ''
      }));
      setAllocations(rows);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setLoadingAllocations(false);
    });
  }, [selectedParty, isPayment]);

  // FIFO Auto Allocate Handler
  const handleFifoAutoAllocate = () => {
    const totalToAllocate = parseFloat(amount) || 0;
    if (totalToAllocate <= 0) {
      setErrorMsg('Please enter a valid amount first before auto-allocating.');
      return;
    }
    setErrorMsg('');
    let remaining = totalToAllocate;
    const updated = allocations.map(row => {
      if (remaining <= 0) {
        return { ...row, allocate_amount: '' };
      }
      const due = row.outstanding || 0;
      const chunk = Math.min(remaining, due);
      remaining -= chunk;
      return { ...row, allocate_amount: chunk.toFixed(2) };
    });
    setAllocations(updated);
    setAutoAllocateFifo(true);
  };

  const handleClearAllocations = () => {
    setAllocations(prev => prev.map(r => ({ ...r, allocate_amount: '' })));
    setAutoAllocateFifo(false);
  };

  const handleRowAllocateChange = (id: string, val: string) => {
    setAllocations(prev => prev.map(r => {
      if (r.id !== id) return r;
      return { ...r, allocate_amount: val };
    }));
    setAutoAllocateFifo(false);
  };

  const handleFullPayRow = (id: string) => {
    setAllocations(prev => prev.map(r => {
      if (r.id !== id) return r;
      return { ...r, allocate_amount: r.outstanding.toFixed(2) };
    }));
  };

  // Calculations
  const numericAmount = parseFloat(amount) || 0;
  const totalAllocated = allocations.reduce((sum, r) => sum + (parseFloat(r.allocate_amount) || 0), 0);
  const floatingBalance = Math.max(0, numericAmount - totalAllocated);

  // Save Transaction
  const handleConfirmSave = async () => {
    if (!selectedParty) {
      setErrorMsg(`Please select a ${isPayment ? 'Supplier' : 'Customer'}.`);
      return;
    }
    if (!selectedLedgerId) {
      setErrorMsg('Please select a Cash or Bank account.');
      return;
    }
    if (numericAmount <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const allocationPayload = allocations
        .filter(r => (parseFloat(r.allocate_amount) || 0) > 0)
        .map(r => ({
          target_invoice_id: r.document_type !== 'Credit Note' && r.document_type !== 'Debit Note' ? r.id : undefined,
          target_cn_dn_id: r.document_type === 'Credit Note' || r.document_type === 'Debit Note' ? r.id : undefined,
          allocated_amount: parseFloat(r.allocate_amount) || 0,
          narration: `Settled on ${voucherNumber}`
        }));

      const payload = {
        voucher_type: voucherType,
        voucher_number: voucherNumber,
        date,
        party_id: selectedParty.id,
        cash_bank_ledger_id: selectedLedgerId,
        amount: numericAmount,
        payment_mode: paymentMode,
        reference_number: referenceNumber,
        bank_name: bankName,
        instrument_date: instrumentDate || undefined,
        narration,
        allocations: allocationPayload,
        auto_allocate_fifo: autoAllocateFifo
      };

      const res = await apiCreateReceiptPayment(payload);

      // Marg/Tally Series Continuation
      const nextNo = incrementSeries(voucherNumber);
      setVoucherNumber(nextNo);
      localStorage.setItem(storageKey, nextNo);

      setSuccessBanner(
        `${voucherType} ${res.voucher_number} saved successfully! Amount: ₹${res.total_amount.toLocaleString(
          'en-IN'
        )} posted to General Ledger.`
      );
      setShowConfirmModal(false);

      // Reset form
      setAmount('');
      setReferenceNumber('');
      setNarration('');
      setAutoAllocateFifo(false);

      // Refresh pending bills for this party
      apiGetPendingAllocations({
        party_id: selectedParty.id,
        party_type: isPayment ? 'vendor' : 'customer',
        direction: isPayment ? 'payable' : 'receivable'
      }).then(updated => {
        setAllocations((updated || []).map(r => ({ ...r, allocate_amount: '' })));
      });
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || err?.message || 'Failed to post voucher.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-6 font-sans">
      {/* ── APEX HEADER RIBBON ── */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-950 text-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              {isPayment ? <CreditCard className="w-8 h-8 text-amber-300" /> : <Receipt className="w-8 h-8 text-emerald-300" />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {isPayment ? 'Supplier Payment Voucher (DOC-24)' : 'Customer Receipt Voucher (DOC-24)'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30">
                  Bill-by-Bill FIFO
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                  Series Continuation
                </span>
              </div>
              <p className="text-sm text-emerald-200/90 mt-1">
                {isPayment
                  ? 'Record outward vendor payments and settle open purchase bills with double-entry GL ledger posting.'
                  : 'Fast counter collections from chemists/debtors with automatic invoice settlement and floating advance support.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/finance/outstanding')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Outstanding Ageing
            </button>
            <button
              onClick={() => navigate(isPayment ? '/receipt' : '/payment')}
              className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            >
              Switch to {isPayment ? 'Receipt [F6]' : 'Payment [F5]'}
            </button>
          </div>
        </div>
      </div>

      {/* ── SUCCESS BANNER ── */}
      {successBanner && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-4 mb-6 shadow-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold text-sm">{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── ERROR BANNER ── */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-300 text-red-900 rounded-xl p-4 mb-6 shadow-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <span className="font-semibold text-sm">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-700 hover:text-red-900">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── MAIN WORKBENCH GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: VOUCHER FORM (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <h2 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Hash className="w-4 h-4 text-emerald-700" />
              Voucher Header Details
            </h2>

            {/* Voucher Series Number & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Voucher Number <span className="text-emerald-600">(Editable Series)</span>
                </label>
                <input
                  id="voucher-number-input"
                  ref={vchNoRef}
                  type="text"
                  value={voucherNumber}
                  onChange={e => setVoucherNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Voucher Date</label>
                <input
                  id="voucher-date-input"
                  ref={dateRef}
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            {/* Party Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600">
                  {isPayment ? 'Payee Supplier / Creditor [F7]' : 'Customer / Chemist Debtor [F7]'}
                </label>
                {selectedParty && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    GSTIN: {selectedParty.gst || 'UNREGISTERED'}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  id="party-select-btn"
                  type="button"
                  onClick={() => setIsPartyModalOpen(true)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 text-left transition-all"
                >
                  <span className="truncate">
                    {selectedParty ? selectedParty.legal_name : `Select ${isPayment ? 'Supplier' : 'Customer'}...`}
                  </span>
                  <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
                </button>
              </div>
            </div>

            {/* Cash/Bank Account Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Deposit / Payment Ledger Account
              </label>
              <select
                id="cash-bank-select"
                value={selectedLedgerId}
                onChange={e => setSelectedLedgerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                {ledgers.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.group_name || 'Asset'})
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Payment Instrument Mode</label>
              <div className="grid grid-cols-4 gap-2">
                {(['Cash', 'Cheque', 'NEFT/RTGS', 'UPI'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      paymentMode === mode
                        ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Instrument Details (If non-cash) */}
            {paymentMode !== 'Cash' && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl animate-fadeIn">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {paymentMode === 'Cheque' ? 'Cheque No.' : 'UTR / Ref No.'}
                  </label>
                  <input
                    id="instrument-ref-input"
                    ref={refNoRef}
                    type="text"
                    placeholder="Ref #..."
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bank Name</label>
                  <input
                    id="instrument-bank-input"
                    type="text"
                    placeholder="Issuing bank..."
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>
            )}

            {/* Transaction Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Transaction Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-lg font-bold text-slate-400">₹</span>
                <input
                  id="transaction-amount-input"
                  ref={amountRef}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-lg font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            {/* Narration */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Narration / Particulars</label>
              <input
                id="narration-input"
                ref={narrRef}
                type="text"
                placeholder="Optional voucher note..."
                value={narration}
                onChange={e => setNarration(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            {/* Save / Post Trigger */}
            <div className="pt-2">
              <button
                id="save-voucher-btn"
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={saving || numericAmount <= 0 || !selectedParty}
                className="w-full py-3 bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 disabled:opacity-50 text-white rounded-xl text-base font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Post & Save {voucherType} (Ctrl+S)
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: BILL-BY-BILL ALLOCATION PANEL (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  Bill-by-Bill Allocation Engine (DOC-07)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allocate received payment against open invoices or leave unallocated as an advance.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="fifo-allocate-btn"
                  type="button"
                  onClick={handleFifoAutoAllocate}
                  disabled={allocations.length === 0 || numericAmount <= 0}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Auto-Allocate FIFO [Alt+A]
                </button>
                <button
                  type="button"
                  onClick={handleClearAllocations}
                  disabled={allocations.length === 0}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* TELEMETRY TELEGRAPH */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Received</div>
                <div className="text-base font-extrabold text-slate-800 mt-0.5">
                  ₹{numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Allocated to Bills</div>
                <div className="text-base font-extrabold text-emerald-800 mt-0.5">
                  ₹{totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Floating / On-Account</div>
                <div className="text-base font-extrabold text-amber-700 mt-0.5">
                  ₹{floatingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* OPEN INVOICES TABLE */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-900 text-white font-bold">
                    <th className="py-2.5 px-3">Doc / Bill No.</th>
                    <th className="py-2.5 px-2">Date</th>
                    <th className="py-2.5 px-3 text-right">Bill Amt</th>
                    <th className="py-2.5 px-3 text-right">Net Due</th>
                    <th className="py-2.5 px-3 text-center">Overdue</th>
                    <th className="py-2.5 px-3 text-right w-32">Allocate (₹)</th>
                    <th className="py-2.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingAllocations ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Loading pending open bills...
                      </td>
                    </tr>
                  ) : allocations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        {selectedParty
                          ? `No open unpaid bills found for ${selectedParty.legal_name}. Full amount will be stored as Floating Advance.`
                          : 'Select a customer or supplier to view unpaid bills.'}
                      </td>
                    </tr>
                  ) : (
                    allocations.map(row => {
                      const isAllocated = (parseFloat(row.allocate_amount) || 0) > 0;
                      return (
                        <tr
                          key={row.id}
                          className={`transition-colors ${
                            isAllocated ? 'bg-emerald-50/60 font-medium' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {row.invoice_number || row.voucher_number || row.id.slice(0, 8)}
                            <span className="block text-[10px] font-normal text-slate-400">
                              {row.document_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-600">
                            {row.date ? new Date(row.date).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            ₹{row.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ₹{row.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                (row.days_overdue || 0) > 60
                                  ? 'bg-red-100 text-red-800'
                                  : (row.days_overdue || 0) > 30
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {row.days_overdue || 0}d
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              id={`allocate-input-${row.id}`}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={row.allocate_amount}
                              onChange={e => handleRowAllocateChange(row.id, e.target.value)}
                              className="w-full px-2 py-1 text-right bg-white border border-slate-300 rounded text-xs font-bold text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleFullPayRow(row.id)}
                              className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 rounded font-bold transition-all"
                            >
                              Full
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* SETTLEMENT AUDIT NOTE */}
            <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700">DOC-07 Settlement Rules:</span> Every allocation line maps directly to a target invoice in <code className="font-mono text-emerald-800">invoice_allocations</code>. Any unallocated balance of ₹{floatingBalance.toFixed(2)} is stored as a floating on-account credit, available for future invoices.
            </div>
          </div>
        </div>
      </div>

      {/* ── PARTY SEARCH MODAL [F7] ── */}
      {isPartyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700" />
                Select {isPayment ? 'Supplier / Creditor' : 'Customer / Chemist'}
              </h3>
              <button onClick={() => setIsPartyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="party-search-input"
                type="text"
                autoFocus
                placeholder="Search party by name, trade name or GSTIN..."
                value={partySearch}
                onChange={e => setPartySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {parties
                .filter(p =>
                  p.legal_name.toLowerCase().includes(partySearch.toLowerCase()) ||
                  (p.trade_name && p.trade_name.toLowerCase().includes(partySearch.toLowerCase())) ||
                  (p.gst && p.gst.toLowerCase().includes(partySearch.toLowerCase()))
                )
                .map(party => (
                  <button
                    key={party.id}
                    type="button"
                    onClick={() => {
                      setSelectedParty(party);
                      setIsPartyModalOpen(false);
                    }}
                    data-party-name={party.legal_name}
                    className="party-option-item w-full text-left p-3 hover:bg-emerald-50/60 rounded-xl transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-800 group-hover:text-emerald-950">
                        {party.legal_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {party.trade_name ? `${party.trade_name} • ` : ''}GSTIN: {party.gst || 'Unregistered'}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 transition-colors" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SAVE CONFIRMATION MODAL ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-700" />
              Confirm {voucherType} Posting
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Voucher Number:</span>
                <span className="font-bold text-emerald-900">{voucherNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Party Name:</span>
                <span className="font-bold text-slate-900">{selectedParty?.legal_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Payment Mode:</span>
                <span className="font-bold text-slate-900">{paymentMode}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                <span className="text-slate-700 font-bold">Total Amount:</span>
                <span className="font-extrabold text-emerald-900">
                  ₹{numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-xs text-emerald-700">
                <span>Allocated to Bills:</span>
                <span>₹{totalAllocated.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-amber-700">
                <span>Floating / On-Account Advance:</span>
                <span>₹{floatingBalance.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                id="confirm-post-btn"
                type="button"
                onClick={handleConfirmSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl text-sm font-bold shadow transition-all flex items-center justify-center gap-2"
              >
                {saving ? 'Posting...' : 'Yes, Confirm Post (Enter)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
