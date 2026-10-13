import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { 
  Ledger,
  BankReconciliationSummary,
  BankAutoMatchResponse,
  CashVerification,
  apiGetBankReconciliationSummary,
  apiRunBankAutoMatch,
  apiMatchBankReconciliation,
  apiGetUnreconciledStatementRows,
  apiGetUnreconciledVouchers,
  apiGetCashVerifications,
  apiCreateCashVerification
} from '../../lib/api';
import { 
  ArrowLeft, Upload, Check, RefreshCw, AlertCircle, 
  Building2, Coins, CheckCircle, ShieldCheck, Zap, 
  HelpCircle, ExternalLink, Calendar, Hash, FileText
} from 'lucide-react';

const DENOMINATION_KEYS = ['2000', '500', '200', '100', '50', '20', '10', 'coins'] as const;

export default function BankReconciliation() {
  useReturnNavigation();
  const navigate = useNavigate();

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<'brs' | 'cash'>('brs');

  // Ledger state
  const [bankLedgers, setBankLedgers] = useState<Ledger[]>([]);
  const [cashLedgers, setCashLedgers] = useState<Ledger[]>([]);
  const [selectedBankLedgerId, setSelectedBankLedgerId] = useState<string>('');
  const [selectedCashLedgerId, setSelectedCashLedgerId] = useState<string>('');

  // BRS Data state
  const [brsSummary, setBrsSummary] = useState<BankReconciliationSummary | null>(null);
  const [bankRows, setBankRows] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selection for manual matching
  const [selectedBankRowId, setSelectedBankRowId] = useState<string | null>(null);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);

  // Statement Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [colDate, setColDate] = useState('Transaction Date');
  const [colDesc, setColDesc] = useState('Narration');
  const [colRef, setColRef] = useState('Cheque No.');
  const [colWithdrawal, setColWithdrawal] = useState('Withdrawal');
  const [colDeposit, setColDeposit] = useState('Deposit');
  const [colBal, setColBal] = useState('Balance');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Auto-Match Modal & state
  const [showAutoMatchModal, setShowAutoMatchModal] = useState(false);
  const [autoMatchResult, setAutoMatchResult] = useState<BankAutoMatchResponse | null>(null);
  const [runningAutoMatch, setRunningAutoMatch] = useState(false);

  // Cash Tally State
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '2000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, 'coins': 0
  });
  const [cashRemarks, setCashRemarks] = useState('');
  const [cashVerifications, setCashVerifications] = useState<CashVerification[]>([]);
  const [savingCashVerification, setSavingCashVerification] = useState(false);

  // Initial load: ledgers & cash history
  useEffect(() => {
    const loadLedgers = async () => {
      try {
        const ledgersData = await apiClient.get('/api/master/ledgers');
        const all: Ledger[] = ledgersData.data || [];
        const banks = all.filter((l: any) => l.group_name?.toLowerCase().includes('bank'));
        const cash = all.filter((l: any) => l.group_name?.toLowerCase().includes('cash'));

        setBankLedgers(banks);
        setCashLedgers(cash.length > 0 ? cash : all.slice(0, 3));

        if (banks.length > 0 && banks[0].id) setSelectedBankLedgerId(banks[0].id);
        if (cash.length > 0 && cash[0].id) setSelectedCashLedgerId(cash[0].id);

        const profileData = await apiClient.get('/api/finance/bank-profiles');
        setProfiles(profileData.data || []);

        const cvList = await apiGetCashVerifications();
        setCashVerifications(cvList);
      } catch (e) {
        console.error('Failed to load ledgers or profiles', e);
      }
    };
    loadLedgers();
  }, []);

  // When selected bank ledger changes, reload BRS data
  useEffect(() => {
    if (selectedBankLedgerId) {
      loadBrsData(selectedBankLedgerId);
    }
  }, [selectedBankLedgerId]);

  const loadBrsData = async (ledgerId: string) => {
    setLoading(true);
    setSelectedBankRowId(null);
    setSelectedVoucherId(null);
    try {
      const [sum, bRows, vRows] = await Promise.all([
        apiGetBankReconciliationSummary(ledgerId),
        apiGetUnreconciledStatementRows(ledgerId),
        apiGetUnreconciledVouchers(ledgerId)
      ]);
      setBrsSummary(sum);
      setBankRows(bRows);
      setVouchers(vRows);
    } catch (e) {
      console.error('Failed to load BRS data', e);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Manual 1-to-1 Match Handler
  const handleManualMatch = async () => {
    if (!selectedBankRowId || !selectedVoucherId) return;
    try {
      await apiMatchBankReconciliation(selectedBankRowId, selectedVoucherId);
      showNotification('✓ Transactions matched and reconciled successfully!');
      loadBrsData(selectedBankLedgerId);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Reconciliation match failed');
    }
  };

  // Run Auto-Match Engine
  const handleRunAutoMatch = async () => {
    if (!selectedBankLedgerId) return;
    setRunningAutoMatch(true);
    try {
      const res = await apiRunBankAutoMatch(selectedBankLedgerId);
      setAutoMatchResult(res);
      showNotification(`✓ ${res.message}`);
      loadBrsData(selectedBankLedgerId);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Auto-match run failed');
    } finally {
      setRunningAutoMatch(false);
    }
  };

  // Handle Statement CSV Upload
  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      alert('Please select a CSV bank statement file.');
      return;
    }
    setUploading(true);
    let activeProfileId = selectedProfile;

    if (isCreatingProfile) {
      try {
        const newProf = await apiClient.post('/api/finance/bank-profiles', {
          name: newProfileName,
          column_mapping: {
            date: colDate,
            description: colDesc,
            reference: colRef,
            withdrawal: colWithdrawal,
            deposit: colDeposit,
            balance: colBal
          }
        });
        activeProfileId = newProf.data.id;
      } catch {
        alert('Failed to create bank profile.');
        setUploading(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append('ledger_id', selectedBankLedgerId);
    if (activeProfileId) formData.append('profile_id', activeProfileId);
    formData.append('file', fileInputRef.current.files[0]);

    try {
      await apiClient.post('/api/finance/bank-statements/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowUploadModal(false);
      showNotification('✓ Bank statement uploaded and parsed successfully!');
      loadBrsData(selectedBankLedgerId);
    } catch {
      alert('Upload failed. Please check the file format and column names.');
    } finally {
      setUploading(false);
    }
  };

  // Cash Tally Calculations
  const calculateCashCount = () => {
    const sum = 
      (denominations['2000'] || 0) * 2000 +
      (denominations['500'] || 0) * 500 +
      (denominations['200'] || 0) * 200 +
      (denominations['100'] || 0) * 100 +
      (denominations['50'] || 0) * 50 +
      (denominations['20'] || 0) * 20 +
      (denominations['10'] || 0) * 10 +
      (denominations['coins'] || 0);
    return sum;
  };

  const selectedCashLedger = cashLedgers.find(c => c.id === selectedCashLedgerId);
  const systemCashBalance = Number(selectedCashLedger?.closing_balance || 0);
  const countedCashBalance = calculateCashCount();
  const cashVariance = countedCashBalance - systemCashBalance;

  const handleCommitCashVerification = async () => {
    if (!selectedCashLedgerId) return;
    setSavingCashVerification(true);
    try {
      const rec = await apiCreateCashVerification({
        ledger_id: selectedCashLedgerId,
        denominations,
        counted_balance: countedCashBalance,
        remarks: cashRemarks
      });
      showNotification(`✓ Physical Cash Verification logged! Status: ${rec.status} (Variance: ₹${rec.variance.toFixed(2)})`);
      const cvList = await apiGetCashVerifications();
      setCashVerifications(cvList);
      setCashRemarks('');
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to log cash verification');
    } finally {
      setSavingCashVerification(false);
    }
  };

  // Selected items details for Match preview
  const selectedBankRow = bankRows.find(r => r.id === selectedBankRowId);
  const selectedVoucher = vouchers.find(v => v.id === selectedVoucherId);

  return (
    <div style={{ backgroundColor: '#eef2ef', minHeight: '100vh', padding: '24px', color: '#111827', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => navigate('/finance')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#2d6a4f', display: 'flex', alignItems: 'center' }}
              title="Return to Finance Hub [ESC]"
            >
              <ArrowLeft size={20} />
            </button>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2d6a4f' }}>
              FINANCE HUB / RECONCILIATION & CASH CONTROL
            </span>
            <span style={{ backgroundColor: '#d8e2dc', color: '#1b4332', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
              DOC-28
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1b4332', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={26} color="#1b4332" />
            Bank Reconciliation & Cash Control Engine
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#52796f' }}>
            Multi-Account BRS Dual Workbench, Smart Auto-Matching Rules & Physical Cash Denomination Control
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/finance/profit-loss')}
            style={{ backgroundColor: '#ffffff', color: '#2d6a4f', border: '1px solid #d8e2dc', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            P&L Statement <ExternalLink size={14} />
          </button>
          <button
            onClick={() => navigate('/finance/daybook')}
            style={{ backgroundColor: '#ffffff', color: '#2d6a4f', border: '1px solid #d8e2dc', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Day Book <ExternalLink size={14} />
          </button>
          <button
            data-testid="btn-open-upload-modal"
            onClick={() => setShowUploadModal(true)}
            style={{ backgroundColor: '#ffffff', color: '#1b4332', border: '1px solid #2d6a4f', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Upload size={16} /> Import Statement
          </button>
          <button
            data-testid="btn-open-auto-match"
            onClick={() => setShowAutoMatchModal(true)}
            style={{ backgroundColor: '#1b4332', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(27,67,50,0.2)' }}
          >
            <Zap size={16} /> Auto-Match Rules
          </button>
        </div>
      </div>

      {/* Toast Banner */}
      {toastMessage && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#e8f5e9', border: '1px solid #81c784', borderRadius: '8px', color: '#1b5e20', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          {toastMessage}
        </div>
      )}

      {/* 2. 3-Step BRS Explainer Banner */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1b4332', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HelpCircle size={16} color="#2d6a4f" />
            HOW BANK RECONCILIATION & CASH CONTROL WORKS (DOC-28 AUDIT RULES)
          </span>
          <span style={{ fontSize: '11px', color: '#52796f', fontWeight: 600 }}>
            AS-3 / Ind AS 7 / ICAI BRS Compliant
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: '#eef2ef', color: '#1b4332', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
              1
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1b4332' }}>Statement Ingestion & Normalization</div>
              <div style={{ fontSize: '12px', color: '#52796f', marginTop: '2px', lineHeight: 1.4 }}>
                Parse passbook transactions with profile mapping. Extract Cheque/UTR references and Debit/Credit amounts.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: '#eef2ef', color: '#1b4332', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
              2
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1b4332' }}>Rule-Based Auto-Matching Engine</div>
              <div style={{ fontSize: '12px', color: '#52796f', marginTop: '2px', lineHeight: 1.4 }}>
                Matches transactions by Exact Cheque/UTR Reference or by Exact Amount within ±3 calendar days window.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: '#eef2ef', color: '#1b4332', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
              3
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1b4332' }}>Reconciled Truth & Physical Cash Tally</div>
              <div style={{ fontSize: '12px', color: '#52796f', marginTop: '2px', lineHeight: 1.4 }}>
                Reconciles Passbook vs General Ledger and tallies daily physical drawer cash counts with zero hidden variance.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Real-Time BRS KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {/* KPI 1: Book Balance */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #d8e2dc', borderLeft: '4px solid #1b4332', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f' }}>
            BOOK BALANCE (GL LEDGER)
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1b4332', marginTop: '6px' }}>
            ₹{brsSummary ? Number(brsSummary.book_balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div style={{ fontSize: '12px', color: '#52796f', marginTop: '4px' }}>
            {brsSummary?.ledger_name || 'Selected Bank Account'}
          </div>
        </div>

        {/* KPI 2: Unreconciled Statement Items */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #d8e2dc', borderLeft: '4px solid #d97706', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f' }}>
            UNRECONCILED BANK ROWS
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706', marginTop: '6px' }}>
            {brsSummary?.unreconciled_statement_count ?? bankRows.length} entries
          </div>
          <div style={{ fontSize: '12px', color: '#52796f', marginTop: '4px' }}>
            Awaiting matching to ERP vouchers
          </div>
        </div>

        {/* KPI 3: Unreconciled Book Vouchers */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #d8e2dc', borderLeft: '4px solid #0284c7', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f' }}>
            UNRECONCILED BOOK VOUCHERS
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284c7', marginTop: '6px' }}>
            {brsSummary?.unreconciled_voucher_count ?? vouchers.length} vouchers
          </div>
          <div style={{ fontSize: '12px', color: '#52796f', marginTop: '4px' }}>
            Cheques/Payments pending bank credit
          </div>
        </div>

        {/* KPI 4: Reconciled Bank Position */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #d8e2dc', borderLeft: '4px solid #10b981', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f' }}>
            RECONCILED BANK POSITION
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
            ₹{brsSummary ? Number(brsSummary.reconciled_bank_balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div style={{ fontSize: '12px', color: '#52796f', marginTop: '4px' }}>
            Net Variance: ₹{brsSummary ? Math.abs(Number(brsSummary.difference)).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation Strip */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #d8e2dc', paddingBottom: '8px' }}>
        <button
          data-testid="tab-brs-workbench"
          onClick={() => setActiveTab('brs')}
          style={{
            backgroundColor: activeTab === 'brs' ? '#1b4332' : '#ffffff',
            color: activeTab === 'brs' ? '#ffffff' : '#2d6a4f',
            border: '1px solid #d8e2dc',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Building2 size={16} /> Bank Reconciliation Dual Workbench ({bankRows.length} vs {vouchers.length})
        </button>

        <button
          data-testid="tab-cash-control"
          onClick={() => setActiveTab('cash')}
          style={{
            backgroundColor: activeTab === 'cash' ? '#1b4332' : '#ffffff',
            color: activeTab === 'cash' ? '#ffffff' : '#2d6a4f',
            border: '1px solid #d8e2dc',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Coins size={16} /> Physical Cash Drawer & Denomination Control (Section 06)
        </button>
      </div>

      {/* TAB 1: BANK RECONCILIATION WORKBENCH */}
      {activeTab === 'brs' && (
        <div>
          {/* Bank Ledger Selector & Action Bar */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', borderRadius: '12px', padding: '12px 18px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#1b4332' }}>Active Bank Account:</label>
              <select
                data-testid="select-bank-ledger"
                value={selectedBankLedgerId}
                onChange={e => setSelectedBankLedgerId(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d8e2dc', fontSize: '13px', fontWeight: 600, color: '#1b4332', backgroundColor: '#eef2ef', outline: 'none' }}
              >
                {bankLedgers.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.group_name})</option>
                ))}
              </select>
              <button
                onClick={() => loadBrsData(selectedBankLedgerId)}
                style={{ background: 'none', border: '1px solid #d8e2dc', borderRadius: '6px', padding: '6px 10px', color: '#2d6a4f', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {/* Match Selection Action Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '12px', color: '#52796f' }}>
                {selectedBankRow && selectedVoucher ? (
                  <span style={{ fontWeight: 700, color: '#1b4332' }}>
                    Match Pair Ready: Statement (₹{(Number(selectedBankRow.withdrawal || selectedBankRow.deposit)).toFixed(2)}) ↔ Voucher #{selectedVoucher.voucher_number} (₹{Number(selectedVoucher.amount).toFixed(2)})
                  </span>
                ) : (
                  <span>Select 1 row from Bank Passbook and 1 voucher from ERP Books to match manually</span>
                )}
              </div>
              <button
                data-testid="btn-match-selected"
                disabled={!selectedBankRowId || !selectedVoucherId}
                onClick={handleManualMatch}
                style={{
                  backgroundColor: (selectedBankRowId && selectedVoucherId) ? '#1b4332' : '#d8e2dc',
                  color: (selectedBankRowId && selectedVoucherId) ? '#ffffff' : '#9ca3af',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: (selectedBankRowId && selectedVoucherId) ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Check size={16} /> Reconcile Selected Pair
              </button>
            </div>
          </div>

          {/* Dual Split Workbench */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            
            {/* Left Column: Bank Statement */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ backgroundColor: '#f8faf9', padding: '12px 16px', borderBottom: '1px solid #d8e2dc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#1b4332', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} color="#2d6a4f" />
                  1. Bank Statement (Passbook Feed)
                </span>
                <span style={{ fontSize: '12px', color: '#52796f', fontWeight: 600 }}>
                  {bankRows.length} Unreconciled
                </span>
              </div>
              
              <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', color: '#4b5563', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '8px 12px' }}>Select</th>
                      <th style={{ padding: '8px 12px' }}>Date</th>
                      <th style={{ padding: '8px 12px' }}>Particulars / Ref</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Withdrawal</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Deposit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
                          <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                          All bank statement rows are reconciled for this account!
                        </td>
                      </tr>
                    ) : (
                      bankRows.map(r => (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedBankRowId(r.id)}
                          style={{
                            borderBottom: '1px solid #f3f4f6',
                            cursor: 'pointer',
                            backgroundColor: selectedBankRowId === r.id ? '#e8f5e9' : 'transparent',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '8px 12px', width: '30px', textAlign: 'center' }}>
                            <input
                              type="radio"
                              name="bank-row-select"
                              checked={selectedBankRowId === r.id}
                              onChange={() => setSelectedBankRowId(r.id)}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', color: '#1f2937', fontWeight: 600 }}>{r.transaction_date}</td>
                          <td style={{ padding: '8px 12px', color: '#374151', maxWidth: '220px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>
                            {r.reference_no && <div style={{ fontSize: '10px', color: '#2d6a4f', fontWeight: 700 }}>Ref: {r.reference_no}</div>}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>
                            {Number(r.withdrawal) > 0 ? `₹${Number(r.withdrawal).toFixed(2)}` : '-'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>
                            {Number(r.deposit) > 0 ? `₹${Number(r.deposit).toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: ERP GL Vouchers */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ backgroundColor: '#f8faf9', padding: '12px 16px', borderBottom: '1px solid #d8e2dc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#1b4332', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={16} color="#2d6a4f" />
                  2. ERP General Ledger Vouchers (Books)
                </span>
                <span style={{ fontSize: '12px', color: '#52796f', fontWeight: 600 }}>
                  {vouchers.length} Unreconciled
                </span>
              </div>
              
              <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', color: '#4b5563', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '8px 12px' }}>Select</th>
                      <th style={{ padding: '8px 12px' }}>Date</th>
                      <th style={{ padding: '8px 12px' }}>Voucher No / Narration</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Leg</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
                          <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                          All General Ledger vouchers are reconciled for this account!
                        </td>
                      </tr>
                    ) : (
                      vouchers.map(v => (
                        <tr
                          key={v.id}
                          onClick={() => setSelectedVoucherId(v.id)}
                          style={{
                            borderBottom: '1px solid #f3f4f6',
                            cursor: 'pointer',
                            backgroundColor: selectedVoucherId === v.id ? '#e8f5e9' : 'transparent',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '8px 12px', width: '30px', textAlign: 'center' }}>
                            <input
                              type="radio"
                              name="voucher-select"
                              checked={selectedVoucherId === v.id}
                              onChange={() => setSelectedVoucherId(v.id)}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', color: '#1f2937', fontWeight: 600 }}>{v.date}</td>
                          <td style={{ padding: '8px 12px', color: '#374151', maxWidth: '220px' }}>
                            <div style={{ fontWeight: 700, color: '#1b4332' }}>{v.voucher_number}</div>
                            <div style={{ fontSize: '11px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.narration || 'No narration'}</div>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontSize: '10px', 
                              fontWeight: 800,
                              backgroundColor: v.type === 'Cr' ? '#fee2e2' : '#dcfce7',
                              color: v.type === 'Cr' ? '#991b1b' : '#166534'
                            }}>
                              {v.type === 'Cr' ? 'PAYMENT (Cr)' : 'RECEIPT (Dr)'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#111827' }}>
                            ₹{Number(v.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: PHYSICAL CASH DRAWER & DENOMINATION CONTROL */}
      {activeTab === 'cash' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Left Column: Denomination Counter Form */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #d8e2dc', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1b4332', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Coins size={18} color="#2d6a4f" />
                  Daily Cash Drawer Physical Verification
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#52796f' }}>
                  Mandatory cash drawer closing count & denomination audit
                </p>
              </div>

              {/* Cash Ledger Select */}
              <div>
                <select
                  data-testid="select-cash-ledger"
                  value={selectedCashLedgerId}
                  onChange={e => setSelectedCashLedgerId(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', fontWeight: 600, color: '#1b4332', backgroundColor: '#eef2ef' }}
                >
                  {cashLedgers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Denomination Grid */}
            <div style={{ marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8faf9', color: '#52796f', borderBottom: '1px solid #d8e2dc', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Denomination</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: '100px' }}>Count (Notes)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Subtotal (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: '2000', label: '₹2,000 Note', multiplier: 2000 },
                    { key: '500', label: '₹500 Note', multiplier: 500 },
                    { key: '200', label: '₹200 Note', multiplier: 200 },
                    { key: '100', label: '₹100 Note', multiplier: 100 },
                    { key: '50', label: '₹50 Note', multiplier: 50 },
                    { key: '20', label: '₹20 Note', multiplier: 20 },
                    { key: '10', label: '₹10 Note', multiplier: 10 },
                    { key: 'coins', label: 'Coins (₹5, ₹2, ₹1)', multiplier: 1 },
                  ].map(row => {
                    const count = denominations[row.key] || 0;
                    const subtotal = count * row.multiplier;
                    return (
                      <tr key={row.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1f2937' }}>{row.label}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <input
                            data-testid={`input-denom-${row.key}`}
                            type="number"
                            min="0"
                            value={count || ''}
                            placeholder="0"
                            onChange={e => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setDenominations(prev => ({ ...prev, [row.key]: val }));
                            }}
                            style={{
                              width: '80px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #d8e2dc',
                              textAlign: 'center',
                              fontWeight: 700,
                              color: '#1b4332',
                              outline: 'none'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                          ₹{subtotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Reconciliation Math Box */}
            <div style={{ backgroundColor: '#f8faf9', border: '1px solid #d8e2dc', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#52796f', fontWeight: 600 }}>Total Physical Count:</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#1b4332' }}>₹{countedCashBalance.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#52796f', fontWeight: 600 }}>GL Book Balance:</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#1f2937' }}>₹{systemCashBalance.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #d8e2dc' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1b4332' }}>Variance:</span>
                <span style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: cashVariance === 0 ? '#10b981' : (cashVariance > 0 ? '#0284c7' : '#dc2626')
                }}>
                  {cashVariance === 0 ? '✓ Exact Match (₹0.00)' : (cashVariance > 0 ? `+₹${cashVariance.toFixed(2)} (Surplus)` : `-₹${Math.abs(cashVariance).toFixed(2)} (Shortage)`)}
                </span>
              </div>
            </div>

            {/* Remarks & Submit */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '4px' }}>
                Audit Remarks / Closing Notes:
              </label>
              <input
                data-testid="input-cash-remarks"
                type="text"
                value={cashRemarks}
                onChange={e => setCashRemarks(e.target.value)}
                placeholder="e.g. End of day drawer count verified"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button
              data-testid="btn-submit-cash-verification"
              onClick={handleCommitCashVerification}
              disabled={savingCashVerification}
              style={{
                width: '100%',
                backgroundColor: '#1b4332',
                color: '#ffffff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <ShieldCheck size={18} /> Commit Physical Cash Verification
            </button>
          </div>

          {/* Right Column: Historical Verification Audit Trail */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 800, color: '#1b4332', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={18} color="#2d6a4f" />
              Physical Cash Verification Log (Audit Register)
            </h3>
            
            <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8faf9', color: '#52796f', borderBottom: '1px solid #d8e2dc', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '8px 12px' }}>Date</th>
                    <th style={{ padding: '8px 12px' }}>Ledger</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Counted</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Variance</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cashVerifications.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
                        No cash verifications recorded yet.
                      </td>
                    </tr>
                  ) : (
                    cashVerifications.map(cv => (
                      <tr key={cv.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{cv.verification_date}</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{cv.ledger_name || 'Cash Account'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>₹{Number(cv.counted_balance).toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: Number(cv.variance) === 0 ? '#10b981' : (Number(cv.variance) > 0 ? '#0284c7' : '#dc2626') }}>
                          {Number(cv.variance) >= 0 ? `+₹${Number(cv.variance).toFixed(2)}` : `-₹${Math.abs(Number(cv.variance)).toFixed(2)}`}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 800,
                            backgroundColor: cv.status === 'BALANCED' ? '#dcfce7' : (cv.status === 'SURPLUS' ? '#e0f2fe' : '#fee2e2'),
                            color: cv.status === 'BALANCED' ? '#166534' : (cv.status === 'SURPLUS' ? '#0369a1' : '#991b1b')
                          }}>
                            {cv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 5. Statement Upload Modal */}
      {showUploadModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div data-testid="modal-upload-statement" style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '500px', maxWidth: '90vw', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#1b4332' }}>
              Import Bank Statement (CSV)
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#52796f' }}>
              Select passbook export file to populate the unreconciled transactions feed.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>
                CSV File:
              </label>
              <input
                data-testid="file-statement-upload"
                type="file"
                ref={fileInputRef}
                accept=".csv"
                style={{ width: '100%', padding: '8px', border: '1px solid #d8e2dc', borderRadius: '6px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#52796f' }}
              >
                Cancel
              </button>
              <button
                data-testid="btn-submit-upload"
                onClick={handleUpload}
                disabled={uploading}
                style={{ backgroundColor: '#1b4332', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                {uploading ? 'Parsing...' : 'Upload & Process'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Auto-Match Rules Modal */}
      {showAutoMatchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div data-testid="modal-auto-match" style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '520px', maxWidth: '90vw', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#1b4332', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="#1b4332" />
              Automated Rule-Based Reconciliation Engine
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#52796f' }}>
              Executes multi-phase reconciliation algorithms against active bank statement rows and GL vouchers.
            </p>

            <div style={{ backgroundColor: '#f8faf9', border: '1px solid #d8e2dc', borderRadius: '8px', padding: '14px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Configured Rule Hierarchy:</div>
              <div style={{ color: '#374151', marginBottom: '4px' }}>
                • <strong>Phase 1:</strong> Exact Reference & Amount Match (Cheque/UTR in narration + exact amount).
              </div>
              <div style={{ color: '#374151' }}>
                • <strong>Phase 2:</strong> Exact Amount & Transaction Date Window (matching within ±3 calendar days).
              </div>
            </div>

            {autoMatchResult && (
              <div style={{ backgroundColor: '#e8f5e9', border: '1px solid #81c784', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#1b5e20', fontSize: '13px', fontWeight: 600 }}>
                {autoMatchResult.message}
                <div style={{ fontSize: '12px', marginTop: '4px', color: '#2e7d32' }}>
                  Matched Amount: ₹{Number(autoMatchResult.matched_amount).toFixed(2)} | Unmatched Rows: {autoMatchResult.unmatched_statements_count}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => { setShowAutoMatchModal(false); setAutoMatchResult(null); }}
                style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#52796f' }}
              >
                Close
              </button>
              <button
                data-testid="btn-confirm-auto-match"
                onClick={handleRunAutoMatch}
                disabled={runningAutoMatch}
                style={{ backgroundColor: '#1b4332', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Zap size={16} /> {runningAutoMatch ? 'Executing Rules...' : 'Run Auto-Match Engine'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
