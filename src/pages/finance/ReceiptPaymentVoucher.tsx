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
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Save,
  Search,
  X,
  FileText,
  DollarSign,
  Clock,
  ShieldCheck
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
      if (filtered.length > 0 && !selectedParty) {
        setSelectedParty(filtered[0]);
      }
    }).catch(err => {
      console.warn('Failed to load parties:', err);
    });

    apiGetLedgers().then(res => {
      const cashBank = (res || []).filter(l => {
        const group = (l.group_name || '').toLowerCase();
        const name = (l.name || '').toLowerCase();
        return (
          group.includes('cash') ||
          group.includes('bank') ||
          name.includes('cash') ||
          name.includes('bank') ||
          (l as any).type === 'Asset'
        );
      });
      setLedgers(cashBank);
      if (cashBank.length > 0 && cashBank[0].id) {
        setSelectedLedgerId(cashBank[0].id);
      }
    }).catch(err => {
      console.warn('Failed to load ledgers:', err);
    });
  }, [isPayment]);

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
      console.warn('Failed to load pending allocations:', err);
    }).finally(() => {
      setLoadingAllocations(false);
    });
  }, [selectedParty, isPayment]);

  // FIFO Auto Allocate Handler
  const handleFifoAutoAllocate = () => {
    const totalToAllocate = parseFloat(amount) || 0;
    if (totalToAllocate <= 0) {
      setErrorMsg('Please enter a valid transaction amount before auto-allocating.');
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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showConfirmModal) {
          setShowConfirmModal(false);
        } else if (isPartyModalOpen) {
          setIsPartyModalOpen(false);
        } else {
          navigate('/');
        }
      } else if (e.key === 'F5') {
        e.preventDefault();
        navigate('/payment');
      } else if (e.key === 'F6') {
        e.preventDefault();
        navigate('/receipt');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setIsPartyModalOpen(true);
      } else if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleFifoAutoAllocate();
      } else if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (numericAmount > 0 && selectedParty) {
          setShowConfirmModal(true);
        }
      } else if (e.key === 'Enter' && showConfirmModal) {
        e.preventDefault();
        handleConfirmSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmModal, isPartyModalOpen, numericAmount, selectedParty, allocations, navigate]);

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

      // Marg Series Continuation
      const nextNo = incrementSeries(voucherNumber);
      setVoucherNumber(nextNo);
      localStorage.setItem(storageKey, nextNo);

      setSuccessBanner(
        `${voucherType} ${res.voucher_number} saved successfully! Amount ₹${res.total_amount.toLocaleString(
          'en-IN', { minimumFractionDigits: 2 }
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

  const primaryColor = isPayment ? '#b45309' : '#1b4332';
  const badgeBg = isPayment ? '#fef3c7' : '#ecfdf5';
  const badgeColor = isPayment ? '#92400e' : '#065f46';

  return (
    <div
      id="receipt-payment-voucher-root"
      style={{
        backgroundColor: '#eef2ef',
        minHeight: '100%',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#111827'
      }}
    >
      {/* ── TOP APEX OPERATIONAL HEADER ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '18px 24px',
          border: '1px solid #d8e2dc',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              backgroundColor: primaryColor,
              color: '#ffffff',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isPayment ? <CreditCard size={16} /> : <Receipt size={16} />}
            DOC-24 {voucherType.toUpperCase()}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>{isPayment ? 'Supplier Payment Voucher' : 'Customer Receipt Voucher'}</span>
              <span style={{ fontSize: '12px', backgroundColor: badgeBg, color: badgeColor, padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                {isPayment ? 'Payable Settlement' : 'Receivable Cash / Bank'}
              </span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px', color: '#52796f', fontWeight: 500 }}>
              <span>Bill-by-Bill Auto Settlement (FIFO)</span>
              <span style={{ color: '#d8e2dc' }}>•</span>
              <span>Double-Entry GL Ledger Posting</span>
              <span style={{ color: '#d8e2dc' }}>•</span>
              <span>Floating Advance Balance Engine</span>
            </div>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            id="btn-switch-voucher-mode"
            onClick={() => navigate(isPayment ? '/receipt' : '/payment')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 15px',
              backgroundColor: '#ffffff',
              color: isPayment ? '#1b4332' : '#b45309',
              border: `1px solid ${isPayment ? '#1b4332' : '#d97706'}`,
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Switch to {isPayment ? 'Receipt' : 'Payment'}</span>
            <span style={{ backgroundColor: isPayment ? '#ecfdf5' : '#fef3c7', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
              {isPayment ? '[F6]' : '[F5]'}
            </span>
          </button>

          <button
            id="btn-view-outstanding"
            onClick={() => navigate('/finance/outstanding')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 15px',
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px'
            }}
          >
            <FileText size={15} />
            <span>Outstanding Ageing</span>
          </button>

          <button
            id="btn-back-to-counter"
            onClick={() => navigate('/')}
            title="Return to Operational Counter Workbench [Esc]"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              backgroundColor: '#f8faf9',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px'
            }}
          >
            <ArrowLeft size={15} />
            <span>Counter</span>
            <span style={{ backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>[Esc]</span>
          </button>
        </div>
      </div>

      {/* ── SUCCESS BANNER ── */}
      {successBanner && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #6ee7b7',
            borderRadius: '12px',
            padding: '14px 18px',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner('')}
            style={{ background: 'none', border: 'none', color: '#047857', cursor: 'pointer', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── ERROR BANNER ── */}
      {errorMsg && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '14px 18px',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#dc2626" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg('')}
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── 2-COLUMN LUXURY WORKBENCH GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '460px 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* ── LEFT PANEL: VOUCHER DETAILS & POSTING ── */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #edf2f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>
              <Hash size={16} color={primaryColor} />
              <span>Voucher Entry Parameters</span>
            </div>
            <span style={{ fontSize: '11px', color: '#52796f', fontWeight: 700, backgroundColor: '#f0fdf4', padding: '2px 8px', borderRadius: '4px' }}>
              Double-Entry GL
            </span>
          </div>

          {/* Series Number & Voucher Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', marginBottom: '6px' }}>
                Voucher Number
              </label>
              <input
                id="voucher-number-input"
                ref={vchNoRef}
                type="text"
                value={voucherNumber}
                onChange={e => setVoucherNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: '#f8faf9',
                  border: '1px solid #d8e2dc',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontFamily: "'Consolas', 'Courier New', monospace",
                  fontWeight: 800,
                  color: primaryColor,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', marginBottom: '6px' }}>
                Posting Date
              </label>
              <input
                id="voucher-date-input"
                ref={dateRef}
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: '#f8faf9',
                  border: '1px solid #d8e2dc',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Party Selector */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f' }}>
                {isPayment ? 'Payee Supplier / Creditor' : 'Customer / Chemist Debtor'}
              </label>
              <span style={{ fontSize: '11px', color: '#52796f', fontWeight: 600 }}>Hotkey: [F7]</span>
            </div>
            <button
              id="party-select-btn"
              type="button"
              onClick={() => setIsPartyModalOpen(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid #1b4332',
                borderRadius: '10px',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {selectedParty ? selectedParty.legal_name : `Click or press [F7] to select ${isPayment ? 'Supplier' : 'Customer'}...`}
                </div>
                {selectedParty && (
                  <div style={{ fontSize: '11px', color: '#52796f', marginTop: '2px' }}>
                    GSTIN: <strong>{selectedParty.gst || 'Unregistered Consumer'}</strong>
                  </div>
                )}
              </div>
              <Search size={16} color="#52796f" style={{ flexShrink: 0, marginLeft: '8px' }} />
            </button>
          </div>

          {/* Cash / Bank Ledger Account Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', marginBottom: '6px' }}>
              Deposit / Payment Ledger Account
            </label>
            <select
              id="cash-bank-select"
              value={selectedLedgerId}
              onChange={e => setSelectedLedgerId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#f8faf9',
                border: '1px solid #d8e2dc',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#111827',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              {ledgers.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.group_name || 'Cash/Bank Asset'})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', marginBottom: '8px' }}>
              Instrument Payment Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {(['Cash', 'Cheque', 'NEFT/RTGS', 'UPI'] as const).map(mode => {
                const isActive = paymentMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isActive ? `1px solid ${primaryColor}` : '1px solid #d8e2dc',
                      backgroundColor: isActive ? primaryColor : '#f8faf9',
                      color: isActive ? '#ffffff' : '#374151',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instrument Details (When Non-Cash) */}
          {paymentMode !== 'Cash' && (
            <div
              style={{
                backgroundColor: '#f8faf9',
                border: '1px solid #d8e2dc',
                borderRadius: '12px',
                padding: '14px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', marginBottom: '4px' }}>
                  {paymentMode === 'Cheque' ? 'Cheque Number' : 'UTR / Reference Number'}
                </label>
                <input
                  id="instrument-ref-input"
                  ref={refNoRef}
                  type="text"
                  placeholder="Ref No..."
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d8e2dc',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', marginBottom: '4px' }}>
                  Issuing Bank
                </label>
                <input
                  id="instrument-bank-input"
                  type="text"
                  placeholder="e.g. HDFC Bank"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d8e2dc',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          {/* Transaction Amount Box */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#111827', marginBottom: '6px' }}>
              Transaction Amount (₹) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '10px', fontSize: '20px', fontWeight: 800, color: '#52796f' }}>₹</span>
              <input
                id="transaction-amount-input"
                ref={amountRef}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 36px',
                  backgroundColor: '#f8faf9',
                  border: '2px solid #1b4332',
                  borderRadius: '12px',
                  fontSize: '22px',
                  fontWeight: 900,
                  fontFamily: "'Consolas', monospace",
                  color: '#1b4332',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Narration */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', marginBottom: '6px' }}>
              Narration / Particulars
            </label>
            <input
              id="narration-input"
              ref={narrRef}
              type="text"
              placeholder="e.g. Invoice settlement on counter..."
              value={narration}
              onChange={e => setNarration(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                backgroundColor: '#f8faf9',
                border: '1px solid #d8e2dc',
                borderRadius: '10px',
                fontSize: '13px',
                color: '#111827',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Save / Post Trigger */}
          <button
            id="save-voucher-btn"
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={saving || numericAmount <= 0 || !selectedParty}
            style={{
              width: '100%',
              padding: '14px 20px',
              backgroundColor: saving || numericAmount <= 0 || !selectedParty ? '#9ca3af' : primaryColor,
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 800,
              cursor: saving || numericAmount <= 0 || !selectedParty ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(27, 67, 50, 0.2)',
              marginTop: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Save size={18} />
            <span>Post & Save {voucherType} [Ctrl+S]</span>
          </button>
        </div>

        {/* ── RIGHT PANEL: BILL-BY-BILL ALLOCATION ENGINE ── */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #edf2f0', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                <Sparkles size={16} color="#059669" />
                <span>Bill-by-Bill Allocation Engine (DOC-07)</span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#52796f' }}>
                Clear open dues via FIFO or manual document allocation; remaining unallocated sum flows to Floating Advance.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                id="fifo-allocate-btn"
                type="button"
                onClick={handleFifoAutoAllocate}
                disabled={allocations.length === 0 || numericAmount <= 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '8px',
                  color: '#065f46',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: allocations.length === 0 || numericAmount <= 0 ? 'not-allowed' : 'pointer',
                  opacity: allocations.length === 0 || numericAmount <= 0 ? 0.6 : 1
                }}
              >
                <RotateCcw size={13} />
                <span>Auto-Allocate FIFO [Alt+A]</span>
              </button>

              <button
                type="button"
                onClick={handleClearAllocations}
                disabled={allocations.length === 0}
                style={{
                  padding: '7px 12px',
                  backgroundColor: '#f8faf9',
                  border: '1px solid #d8e2dc',
                  borderRadius: '8px',
                  color: '#4b5563',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: allocations.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: allocations.length === 0 ? 0.6 : 1
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* TELEMETRY CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <div
              style={{
                backgroundColor: '#f8faf9',
                borderRadius: '12px',
                border: '1px solid #d8e2dc',
                padding: '14px 16px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', letterSpacing: '0.04em' }}>
                Total {voucherType} Amount
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#111827', marginTop: '4px', fontFamily: "'Consolas', monospace" }}>
                ₹{numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ecfdf5',
                borderRadius: '12px',
                border: '1px solid #a7f3d0',
                padding: '14px 16px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#065f46', letterSpacing: '0.04em' }}>
                Allocated to Invoices
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#065f46', marginTop: '4px', fontFamily: "'Consolas', monospace" }}>
                ₹{totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#fef3c7',
                borderRadius: '12px',
                border: '1px solid #fde68a',
                padding: '14px 16px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#92400e', letterSpacing: '0.04em' }}>
                Floating Advance / Credit
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#92400e', marginTop: '4px', fontFamily: "'Consolas', monospace" }}>
                ₹{floatingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* OPEN INVOICES TABLE */}
          <div style={{ borderRadius: '12px', border: '1px solid #d8e2dc', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>Doc / Bill No.</th>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Bill Amt</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Net Due</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Overdue</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', width: '130px' }}>Allocate (₹)</th>
                  <th style={{ padding: '10px 10px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingAllocations ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#52796f' }}>
                      Loading pending open bills for {selectedParty?.legal_name}...
                    </td>
                  </tr>
                ) : allocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#6b7280' }}>
                      {selectedParty
                        ? `No unpaid open bills found for ${selectedParty.legal_name}. Full amount will be recorded as floating advance.`
                        : 'Select a customer or supplier to view unpaid bills.'}
                    </td>
                  </tr>
                ) : (
                  allocations.map((row, idx) => {
                    const isAllocated = (parseFloat(row.allocate_amount) || 0) > 0;
                    return (
                      <tr
                        key={row.id}
                        style={{
                          backgroundColor: isAllocated ? '#ecfdf5' : idx % 2 === 0 ? '#ffffff' : '#f8faf9',
                          borderBottom: '1px solid #e5e7eb'
                        }}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827' }}>
                          <div>{row.invoice_number || row.voucher_number || row.id.slice(0, 8)}</div>
                          <span style={{ fontSize: '10px', color: '#52796f', fontWeight: 500 }}>{row.document_type}</span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#4b5563' }}>
                          {row.date ? new Date(row.date).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#4b5563' }}>
                          ₹{row.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#111827' }}>
                          ₹{row.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 800,
                              backgroundColor: (row.days_overdue || 0) > 60 ? '#fef2f2' : (row.days_overdue || 0) > 30 ? '#fef3c7' : '#ecfdf5',
                              color: (row.days_overdue || 0) > 60 ? '#991b1b' : (row.days_overdue || 0) > 30 ? '#92400e' : '#065f46'
                            }}
                          >
                            {row.days_overdue || 0}d
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          <input
                            id={`allocate-input-${row.id}`}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={row.allocate_amount}
                            onChange={e => handleRowAllocateChange(row.id, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              textAlign: 'right',
                              backgroundColor: '#ffffff',
                              border: isAllocated ? '1px solid #059669' : '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 800,
                              fontFamily: "'Consolas', monospace",
                              color: '#1b4332',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleFullPayRow(row.id)}
                            style={{
                              padding: '3px 8px',
                              backgroundColor: '#eef2ef',
                              border: '1px solid #d8e2dc',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#1b4332',
                              cursor: 'pointer'
                            }}
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

          {/* Settlement Rules Footer Notice */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#f8faf9',
              borderRadius: '10px',
              border: '1px solid #d8e2dc',
              fontSize: '11px',
              color: '#52796f',
              lineHeight: 1.5
            }}
          >
            <strong style={{ color: '#111827' }}>DOC-07 Settlement Rules:</strong> Direct invoice allocation clears outstanding in FIFO order. Any unallocated balance of ₹{floatingBalance.toFixed(2)} is posted as an on-account credit advance for future billing.
          </div>
        </div>
      </div>

      {/* ── PARTY SEARCH MODAL [F7] ── */}
      {isPartyModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPartyModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              border: '1px solid #d8e2dc',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                backgroundColor: primaryColor,
                color: '#ffffff',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={20} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  Select {isPayment ? 'Supplier / Creditor' : 'Customer / Chemist'}
                </h3>
              </div>
              <button
                onClick={() => setIsPartyModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  id="party-search-input"
                  type="text"
                  autoFocus
                  placeholder="Search by party name, trade name, or GSTIN..."
                  value={partySearch}
                  onChange={e => setPartySearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    backgroundColor: '#f8faf9',
                    border: '1px solid #d8e2dc',
                    borderRadius: '10px',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                      className="party-option-item"
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>
                          {party.legal_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#52796f', marginTop: '2px' }}>
                          {party.trade_name ? `${party.trade_name} • ` : ''}GSTIN: {party.gst || 'Unregistered'}
                        </div>
                      </div>
                      <ArrowRight size={16} color="#9ca3af" />
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SAVE CONFIRMATION MODAL [ENTER] ── */}
      {showConfirmModal && (
        <div
          id="modal-confirm-voucher-post"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfirmModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              border: '1px solid #d8e2dc',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                backgroundColor: primaryColor,
                color: '#ffffff',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Confirm {voucherType} Posting</h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div
                style={{
                  backgroundColor: '#f8faf9',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid #d8e2dc',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#52796f', fontWeight: 600 }}>Voucher Number:</span>
                  <span style={{ fontWeight: 800, color: primaryColor, fontFamily: "'Consolas', monospace" }}>{voucherNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#52796f', fontWeight: 600 }}>Party Name:</span>
                  <span style={{ fontWeight: 800, color: '#111827' }}>{selectedParty?.legal_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#52796f', fontWeight: 600 }}>Payment Mode:</span>
                  <span style={{ fontWeight: 700, color: '#111827' }}>{paymentMode}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb', fontSize: '15px' }}>
                  <span style={{ fontWeight: 800, color: '#111827' }}>Total Amount:</span>
                  <span style={{ fontWeight: 900, color: primaryColor, fontFamily: "'Consolas', monospace" }}>
                    ₹{numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#065f46' }}>
                  <span>Allocated to Invoices:</span>
                  <span style={{ fontWeight: 700 }}>₹{totalAllocated.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#92400e' }}>
                  <span>Floating Advance:</span>
                  <span style={{ fontWeight: 700 }}>₹{floatingBalance.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel [Esc]
                </button>
                <button
                  id="confirm-post-btn"
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: primaryColor,
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(27, 67, 50, 0.25)'
                  }}
                >
                  {saving ? 'Posting...' : 'Confirm Post [Enter]'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
