import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, {
  apiGetExpenseSummary,
  apiGetExpenseClaims,
  apiGetEmployeeAdvances,
  apiGetExpenseCategories,
  apiGetLedgers,
  apiApproveExpenseClaim,
  apiCreateEmployeeAdvance,
  apiSettleEmployeeAdvance,
  apiCreateDirectExpense,
  ExpenseClaim,
  EmployeeAdvance,
  ExpenseCategory,
  ExpenseSummaryResponse,
  Ledger
} from '../../lib/api';
import {
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  Search,
  DollarSign,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  FolderTree,
  ChevronDown,
  ChevronUp,
  FileText,
  UserCheck,
  Tag,
  ArrowRight,
  ArrowLeft,
  TrendingDown,
  Wallet,
  Sparkles,
  ExternalLink,
  BookOpen,
  TrendingUp,
  HelpCircle,
  Layers,
  Banknote,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import ExpenseClaimEntryModal from './ExpenseClaimEntryModal';

export default function ExpenseManagement() {
  const navigate = useNavigate();

  // Navigation Tabs: 'direct' | 'claims' | 'advances' | 'categories'
  const [activeTab, setActiveTab] = useState<'direct' | 'claims' | 'advances' | 'categories'>('direct');

  // Summary KPIs
  const [summary, setSummary] = useState<ExpenseSummaryResponse>({
    total_expenses: 0,
    pending_claims_count: 0,
    active_advances_amount: 0,
    settled_advances_count: 0,
    categories_count: 0,
    today_cash_expenses: 0,
    cash_in_hand_balance: 0
  });

  // Data States
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [ledgers, setLedgers] = useState<{ [id: string]: string }>({});
  const [allLedgers, setAllLedgers] = useState<Ledger[]>([]);

  // Filtered Ledger Subsets for Easy Selection
  const [cashBankLedgers, setCashBankLedgers] = useState<Ledger[]>([]);
  const [pnlExpenseLedgers, setPnlExpenseLedgers] = useState<Ledger[]>([]);

  // Direct Quick Expense Form State
  const [dirDate, setDirDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dirPaidFromId, setDirPaidFromId] = useState<string>('');
  const [dirExpenseLedgerId, setDirExpenseLedgerId] = useState<string>('');
  const [dirAmount, setDirAmount] = useState<string>('');
  const [dirPaidTo, setDirPaidTo] = useState<string>('');
  const [dirPaymentMode, setDirPaymentMode] = useState<string>('Cash');
  const [dirRefNo, setDirRefNo] = useState<string>('');
  const [dirNarration, setDirNarration] = useState<string>('');
  const [submittingDirect, setSubmittingDirect] = useState<boolean>(false);

  // Filters & Search
  const [claimStatusFilter, setClaimStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);

  // Feedback Alerts
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<string>('');

  // Modals
  const [isClaimModalOpen, setIsClaimModalOpen] = useState<boolean>(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState<boolean>(false);

  // Advance Modal State
  const [advEmployeeId, setAdvEmployeeId] = useState<string>('');
  const [advAmount, setAdvAmount] = useState<string>('');
  const [advDate, setAdvDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [advReason, setAdvReason] = useState<string>('Operational Tour Advance');
  const [submittingAdvance, setSubmittingAdvance] = useState<boolean>(false);

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [sumRes, claimsRes, advRes, catRes, ledgRes] = await Promise.all([
        apiGetExpenseSummary().catch(() => null),
        apiGetExpenseClaims(),
        apiGetEmployeeAdvances(),
        apiGetExpenseCategories(),
        apiGetLedgers()
      ]);

      if (sumRes) setSummary(sumRes);
      setClaims(claimsRes || []);
      setAdvances(advRes || []);
      setCategories(catRes || []);
      setAllLedgers(ledgRes || []);

      const lMap: { [id: string]: string } = {};
      const cbList: Ledger[] = [];
      const expList: Ledger[] = [];

      (ledgRes || []).forEach(l => {
        if (l.id) lMap[l.id] = l.name;
        const gName = (l.group_name || '').toLowerCase();
        const lName = (l.name || '').toLowerCase();

        // Cash & Bank Ledgers (Settlement Source)
        if (gName.includes('cash') || gName.includes('bank') || lName.includes('cash') || lName.includes('bank')) {
          cbList.push(l);
        }

        // P&L Expense Ledgers (Expense Heads)
        if (gName.includes('indirect expense') || gName.includes('direct expense') || gName.includes('expense') || lName.includes('exp')) {
          expList.push(l);
        }
      });

      setLedgers(lMap);
      setCashBankLedgers(cbList);
      setPnlExpenseLedgers(expList);

      // Default Paid From to first Cash in Hand if available
      if (!dirPaidFromId && cbList.length > 0) {
        const primaryCash = cbList.find(c => c.name.toLowerCase().includes('cash in hand')) || cbList[0];
        if (primaryCash?.id) {
          setDirPaidFromId(primaryCash.id);
        }
      }

      // Default Expense Ledger to first category ledger if available
      if (!dirExpenseLedgerId && expList.length > 0) {
        if (expList[0]?.id) {
          setDirExpenseLedgerId(expList[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load expense data:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to load expense records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Submit Quick Daily Expense (Direct Cash/Bank to P&L)
  const handleDirectExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirExpenseLedgerId) {
      setErrorMsg('Please select which Expense Head (P&L Account) to debit.');
      return;
    }
    if (!dirPaidFromId) {
      setErrorMsg('Please select where this expense was paid from (Cash in Hand or Bank A/c).');
      return;
    }
    const amt = parseFloat(dirAmount);
    if (!amt || amt <= 0) {
      setErrorMsg('Please enter a valid expense amount greater than ₹0.');
      return;
    }

    setSubmittingDirect(true);
    setErrorMsg('');
    try {
      const res = await apiCreateDirectExpense({
        date: new Date(dirDate).toISOString(),
        expense_ledger_id: dirExpenseLedgerId,
        paid_from_ledger_id: dirPaidFromId,
        amount: amt,
        paid_to: dirPaidTo.trim() || undefined,
        payment_mode: dirPaymentMode,
        reference_no: dirRefNo.trim() || undefined,
        narration: dirNarration.trim() || undefined
      });

      setSuccessBanner(
        `✓ Expense of ₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} recorded successfully! ` +
        `Payment Voucher #${res.voucher_number} posted to General Ledger and debited to ${res.expense_ledger_name} in Profit & Loss.`
      );

      // Reset form fields
      setDirAmount('');
      setDirPaidTo('');
      setDirRefNo('');
      setDirNarration('');

      await fetchData();
    } catch (err: any) {
      console.error('Failed to record direct expense:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to record direct expense.');
    } finally {
      setSubmittingDirect(false);
    }
  };

  // One-Click Claim Approval & GL Posting
  const handleApproveClaim = async (claimId: string, claimNumber: string) => {
    setErrorMsg('');
    try {
      const res = await apiApproveExpenseClaim(claimId);
      setSuccessBanner(`Claim ${claimNumber} successfully approved! Journal Voucher posted to General Ledger (Voucher ID: ${res.voucher_id}).`);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to approve claim:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to approve expense claim.');
    }
  };

  // Issue New Advance
  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advEmployeeId || !advAmount || parseFloat(advAmount) <= 0) {
      setErrorMsg('Please select an employee and enter a valid advance amount.');
      return;
    }

    setSubmittingAdvance(true);
    setErrorMsg('');
    try {
      await apiCreateEmployeeAdvance({
        employee_ledger_id: advEmployeeId,
        date: new Date(advDate).toISOString(),
        amount: parseFloat(advAmount),
        reason: advReason.trim() || undefined
      });
      setSuccessBanner(`Employee advance of ₹${parseFloat(advAmount).toLocaleString('en-IN')} issued successfully.`);
      setIsAdvanceModalOpen(false);
      setAdvAmount('');
      setAdvEmployeeId('');
      await fetchData();
    } catch (err: any) {
      console.error('Failed to issue advance:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to issue employee advance.');
    } finally {
      setSubmittingAdvance(false);
    }
  };

  // Settle Advance manually
  const handleSettleAdvance = async (advId: string) => {
    try {
      await apiSettleEmployeeAdvance(advId);
      setSuccessBanner('Advance reconciled and marked as Settled.');
      await fetchData();
    } catch (err: any) {
      setErrorMsg('Failed to settle advance.');
    }
  };

  // Filter Claims
  const filteredClaims = claims.filter(c => {
    const matchesStatus = claimStatusFilter === 'All' || c.status === claimStatusFilter;
    const empName = ledgers[c.employee_ledger_id] || '';
    const matchesSearch =
      c.claim_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.remarks || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Selected ledger names for live preview
  const selectedExpLedger = allLedgers.find(l => l.id === dirExpenseLedgerId);
  const selectedPaidFromLedger = allLedgers.find(l => l.id === dirPaidFromId);

  // Flagship Neumorphic Minimalist Style System (White & Forest Green)
  const S = {
    page: {
      padding: '20px 24px',
      backgroundColor: '#eef2ef',
      minHeight: '100vh',
      color: '#111827',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      maxWidth: '1440px',
      margin: '0 auto'
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '10px',
      border: '1px solid #d8e2dc',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
      overflow: 'hidden'
    },
    input: {
      backgroundColor: '#ffffff',
      border: '1.5px solid #cbd5e1',
      borderRadius: '8px',
      padding: '9px 12px',
      color: '#111827',
      fontSize: '13px',
      outline: 'none',
      width: '100%',
      boxSizing: 'border-box' as const,
      transition: 'border-color 0.15s, box-shadow 0.15s'
    },
    label: {
      display: 'block',
      fontSize: '12px',
      fontWeight: 700,
      color: '#1b4332',
      marginBottom: '5px'
    },
    primaryBtn: {
      background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '13px',
      fontWeight: 700,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 2px 8px rgba(45, 106, 79, 0.3)',
      transition: 'all 0.2s'
    },
    secondaryBtn: {
      backgroundColor: '#f1f5f9',
      border: '1px solid #cbd5e1',
      color: '#334155',
      borderRadius: '8px',
      padding: '7px 14px',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px'
    },
    th: {
      background: 'linear-gradient(90deg, #1b4332 0%, #2d6a4f 50%, #40916c 100%)',
      color: '#ffffff',
      padding: '11px 14px',
      fontSize: '12px',
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
      borderRight: '1px solid rgba(255, 255, 255, 0.15)'
    },
    td: {
      padding: '11px 14px',
      fontSize: '13px',
      borderBottom: '1px solid #e5e7eb',
      color: '#111827'
    }
  };

  return (
    <div style={S.page}>
      {/* ── TOP HEADER CARD ──────────────────────────────────── */}
      <div style={{ ...S.card, padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', marginBottom: '6px', fontFamily: 'monospace' }}>
              <button
                onClick={() => navigate('/finance')}
                style={{ background: 'none', border: 'none', color: '#2d6a4f', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
              >
                <ArrowLeft size={14} /> Finance Hub
              </button>
              <span>/</span>
              <span style={{ color: '#1b4332', fontWeight: 700 }}>Operational Expenses & Petty Cash</span>
            </div>

            {/* Title & Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 2px 8px rgba(45, 106, 79, 0.3)' }}>
                <Receipt size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
                    Operational Expense & Petty Cash Manager
                  </h1>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontFamily: 'monospace', backgroundColor: '#d8f3dc', color: '#1b4332', border: '1px solid #b7e4c7' }}>
                    DOC-26
                  </span>
                </div>
                <p style={{ margin: '3px 0 0 0', color: '#4b5563', fontSize: '12px' }}>
                  Direct Daily Cash/Bank Outflows, Staff Advance Reconciliations, and Live Profit & Loss Accounting
                </p>
              </div>
            </div>
          </div>

          {/* Action Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/finance/profit-loss')}
              style={{ ...S.secondaryBtn, color: '#b91c1c', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}
              title="Open Profit & Loss Statement to verify Indirect Expenses"
            >
              <TrendingUp size={15} color="#b91c1c" />
              <span>P&L Statement ↗</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/finance/daybook')}
              style={{ ...S.secondaryBtn, color: '#0369a1', borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }}
              title="Open Day Book to view daily payment vouchers"
            >
              <BookOpen size={15} color="#0369a1" />
              <span>Day Book ↗</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAdvanceModalOpen(true)}
              style={S.primaryBtn}
              data-testid="btn-issue-advance"
            >
              <CreditCard size={15} />
              <span>+ Issue Advance</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── HOW EXPENSE ACCOUNTING WORKS (VISUAL WORKFLOW) ─────── */}
      <div style={{ ...S.card, padding: '16px 20px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(216, 243, 220, 0.4) 0%, #ffffff 100%)', border: '1.5px solid #2d6a4f' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, color: '#1b4332', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <Sparkles size={16} color="#2d6a4f" />
            <span>How Expense Accounting Works (Real-Time Double-Entry Rule)</span>
          </div>
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>
            GAAP / Ind AS / Income Tax Sec 40A(3) Compliant
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {/* Step 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #d8e2dc', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', border: '1px solid #bae6fd' }}>
              Cr
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>1. Paid From Account</div>
              <div style={{ fontSize: '11px', color: '#4b5563' }}>Cash in Hand / HDFC Bank (Credits asset, reduces balance)</div>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #d8e2dc', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#d8f3dc', color: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', border: '1px solid #b7e4c7' }}>
              Dr
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>2. Expense Head (P&L)</div>
              <div style={{ fontSize: '11px', color: '#4b5563' }}>Tea, Courier, Travelling, Freight (Debits Indirect Expenses)</div>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #d8e2dc', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', border: '1px solid #fecaca' }}>
              📉
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>3. Profit & Loss Adjustment</div>
              <div style={{ fontSize: '11px', color: '#4b5563' }}>Reflects in P&L immediately, reducing Net Profit</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FEEDBACK ALERTS ──────────────────────────────────── */}
      {errorMsg && (
        <div style={{ ...S.card, padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1.5px solid #ef4444', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} data-testid="expense-error-alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#ef4444" />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
            ✕
          </button>
        </div>
      )}

      {successBanner && (
        <div style={{ ...S.card, padding: '12px 16px', marginBottom: '16px', backgroundColor: '#ecfdf5', border: '1.5px solid #10b981', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} data-testid="expense-success-alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} color="#10b981" />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>{successBanner}</span>
          </div>
          <button type="button" onClick={() => setSuccessBanner('')} style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
            ✕
          </button>
        </div>
      )}

      {/* ── 4 EXECUTIVE METRIC KPI CARDS ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Approved Expenses */}
        <div style={{ ...S.card, padding: '16px 18px', borderLeft: '4px solid #2d6a4f' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Approved Expenses</span>
            <TrendingDown size={18} color="#2d6a4f" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1b4332', fontFamily: 'monospace' }} data-testid="metric-total-expenses">
            ₹{Number(summary.total_expenses).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Debited to P&L accounts</div>
        </div>

        {/* Pending Claims */}
        <div style={{ ...S.card, padding: '16px 18px', borderLeft: '4px solid #d97706' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Claims</span>
            <Clock size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706', fontFamily: 'monospace' }} data-testid="metric-pending-claims">
            {summary.pending_claims_count}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Awaiting management approval</div>
        </div>

        {/* Active Advances */}
        <div style={{ ...S.card, padding: '16px 18px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Advances</span>
            <Wallet size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace' }} data-testid="metric-active-advances">
            ₹{Number(summary.active_advances_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Field tour imprest in circulation</div>
        </div>

        {/* Settled Advances */}
        <div style={{ ...S.card, padding: '16px 18px', borderLeft: '4px solid #7c3aed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Settled Advances</span>
            <CheckCircle2 size={18} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#7c3aed', fontFamily: 'monospace' }} data-testid="metric-settled-advances">
            {summary.settled_advances_count}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Reconciled tour records</div>
        </div>
      </div>

      {/* ── PILL TAB NAVIGATION ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('direct')}
          style={{
            padding: '9px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'direct' ? 'none' : '1px solid #d8e2dc',
            background: activeTab === 'direct' ? 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)' : '#ffffff',
            color: activeTab === 'direct' ? '#ffffff' : '#4b5563',
            boxShadow: activeTab === 'direct' ? '0 2px 8px rgba(45, 106, 79, 0.3)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s'
          }}
          data-testid="tab-direct"
        >
          <Sparkles size={15} />
          <span>⚡ Quick Daily Expense Entry (Cash/Bank)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('claims')}
          style={{
            padding: '9px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'claims' ? 'none' : '1px solid #d8e2dc',
            background: activeTab === 'claims' ? 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)' : '#ffffff',
            color: activeTab === 'claims' ? '#ffffff' : '#4b5563',
            boxShadow: activeTab === 'claims' ? '0 2px 8px rgba(45, 106, 79, 0.3)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s'
          }}
          data-testid="tab-claims"
        >
          <Receipt size={15} />
          <span>Expense Register & Claims ({claims.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('advances')}
          style={{
            padding: '9px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'advances' ? 'none' : '1px solid #d8e2dc',
            background: activeTab === 'advances' ? 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)' : '#ffffff',
            color: activeTab === 'advances' ? '#ffffff' : '#4b5563',
            boxShadow: activeTab === 'advances' ? '0 2px 8px rgba(45, 106, 79, 0.3)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s'
          }}
          data-testid="tab-advances"
        >
          <CreditCard size={15} />
          <span>Staff Tour Advances & Imprest ({advances.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          style={{
            padding: '9px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'categories' ? 'none' : '1px solid #d8e2dc',
            background: activeTab === 'categories' ? 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)' : '#ffffff',
            color: activeTab === 'categories' ? '#ffffff' : '#4b5563',
            boxShadow: activeTab === 'categories' ? '0 2px 8px rgba(45, 106, 79, 0.3)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s'
          }}
          data-testid="tab-categories"
        >
          <FolderTree size={15} />
          <span>P&L Expense Heads ({categories.length})</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: QUICK DAILY EXPENSE ENTRY
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'direct' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Direct Entry Form */}
          <div style={{ ...S.card, padding: '20px 24px', border: '2px solid #2d6a4f', boxShadow: '0 4px 16px rgba(45, 106, 79, 0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '14px', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1b4332' }}>
                    Record Direct Operational Outflow
                  </h2>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, backgroundColor: '#d8f3dc', color: '#1b4332', border: '1px solid #b7e4c7' }}>
                    Auto-Posts Payment Voucher & Updates P&L
                  </span>
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                  Instantly debit the P&L expense account and credit your Cash in Hand or Bank Account with zero multi-step approval delay.
                </p>
              </div>

              <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#111827', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                Mode: <span style={{ color: '#1b4332', fontWeight: 800 }}>{dirPaymentMode} Outflow</span>
              </div>
            </div>

            <form onSubmit={handleDirectExpenseSubmit} data-testid="form-direct-expense">
              {/* Row 1: Date, Paid From, Expense Head */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                {/* 1. Date */}
                <div>
                  <label style={S.label}>Expense Date *</label>
                  <input
                    type="date"
                    value={dirDate}
                    onChange={e => setDirDate(e.target.value)}
                    style={{ ...S.input, fontFamily: 'monospace' }}
                    data-testid="input-direct-date"
                    required
                  />
                </div>

                {/* 2. Paid From */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ ...S.label, marginBottom: 0 }}>Paid From (Settlement A/c) *</label>
                    <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700 }}>Credits Account</span>
                  </div>
                  <select
                    value={dirPaidFromId}
                    onChange={e => {
                      setDirPaidFromId(e.target.value);
                      const l = allLedgers.find(item => item.id === e.target.value);
                      if (l && l.name.toLowerCase().includes('cash')) setDirPaymentMode('Cash');
                      else if (l && l.name.toLowerCase().includes('bank')) setDirPaymentMode('UPI');
                    }}
                    style={{ ...S.input, fontWeight: 700, color: '#0369a1', cursor: 'pointer' }}
                    data-testid="select-direct-paid-from"
                    required
                  >
                    <option value="">-- Select Cash/Bank Account --</option>
                    {cashBankLedgers.length > 0 ? (
                      cashBankLedgers.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.group_name || 'Asset'})
                        </option>
                      ))
                    ) : (
                      allLedgers.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* 3. Expense Head */}
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ ...S.label, marginBottom: 0 }}>Expense Head (P&L Ledger Account) *</label>
                    <span style={{ fontSize: '11px', color: '#1b4332', fontWeight: 700 }}>Debits P&L Indirect Expenses</span>
                  </div>
                  <select
                    value={dirExpenseLedgerId}
                    onChange={e => setDirExpenseLedgerId(e.target.value)}
                    style={{ ...S.input, fontWeight: 700, color: '#1b4332', cursor: 'pointer' }}
                    data-testid="select-direct-expense-head"
                    required
                  >
                    <option value="">-- Select P&L Expense Account --</option>
                    {pnlExpenseLedgers.length > 0 ? (
                      pnlExpenseLedgers.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.group_name || 'Indirect Expenses'})
                        </option>
                      ))
                    ) : (
                      categories.map(c => (
                        <option key={c.id} value={c.ledger_id}>
                          {c.name} (Operational Expense)
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Row 2: Amount, Paid To, Payment Mode, Ref # */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                {/* 4. Amount */}
                <div>
                  <label style={S.label}>Amount (₹) *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#1b4332', fontWeight: 800, fontSize: '15px' }}>₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="0.00"
                      value={dirAmount}
                      onChange={e => setDirAmount(e.target.value)}
                      style={{ ...S.input, paddingLeft: '28px', fontSize: '15px', fontWeight: 800, color: '#1b4332', fontFamily: 'monospace' }}
                      data-testid="input-direct-amount"
                      required
                    />
                  </div>
                </div>

                {/* 5. Paid To */}
                <div>
                  <label style={S.label}>Paid To / Person / Shop</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Canteen, DTDC Courier"
                    value={dirPaidTo}
                    onChange={e => setDirPaidTo(e.target.value)}
                    style={S.input}
                    data-testid="input-direct-paid-to"
                  />
                </div>

                {/* 6. Payment Mode */}
                <div>
                  <label style={S.label}>Payment Mode</label>
                  <select
                    value={dirPaymentMode}
                    onChange={e => setDirPaymentMode(e.target.value)}
                    style={{ ...S.input, cursor: 'pointer' }}
                    data-testid="select-direct-mode"
                  >
                    <option value="Cash">Cash (Petty Cash)</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Debit / Credit Card</option>
                  </select>
                </div>

                {/* 7. Ref # */}
                <div>
                  <label style={S.label}>Receipt / Bill / UPI Ref #</label>
                  <input
                    type="text"
                    placeholder="e.g. REC-102, UPI-89421"
                    value={dirRefNo}
                    onChange={e => setDirRefNo(e.target.value)}
                    style={{ ...S.input, fontFamily: 'monospace' }}
                    data-testid="input-direct-ref-no"
                  />
                </div>
              </div>

              {/* Row 3: Narration */}
              <div style={{ marginBottom: '16px' }}>
                <label style={S.label}>Audit Narration / Business Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Evening tea and biscuits for office staff"
                  value={dirNarration}
                  onChange={e => setDirNarration(e.target.value)}
                  style={S.input}
                  data-testid="input-direct-narration"
                />
              </div>

              {/* ── LIVE ACCOUNTING PREVIEW BOX ───────────────────────── */}
              {parseFloat(dirAmount) > 0 && selectedExpLedger && selectedPaidFromLedger && (
                <div style={{ padding: '14px 18px', borderRadius: '8px', backgroundColor: '#d8f3dc', border: '1.5px solid #2d6a4f', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', fontFamily: 'monospace' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#1b4332', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                      Accounting Voucher Impact Preview:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '13px' }}>
                      <span style={{ color: '#1b4332', fontWeight: 800 }}>
                        Dr: {selectedExpLedger.name} (P&L Exp) ₹{parseFloat(dirAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span style={{ color: '#94a3b8' }}>|</span>
                      <span style={{ color: '#0369a1', fontWeight: 800 }}>
                        Cr: {selectedPaidFromLedger.name} (Asset) ₹{parseFloat(dirAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '6px 14px', borderRadius: '6px', border: '1px solid #fca5a5', fontWeight: 800, fontSize: '12px' }}>
                    📉 Decreases Net Profit by ₹{parseFloat(dirAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button
                  type="submit"
                  disabled={submittingDirect || !dirAmount || parseFloat(dirAmount) <= 0}
                  style={{
                    ...S.primaryBtn,
                    padding: '12px 28px',
                    fontSize: '14px',
                    fontWeight: 800,
                    opacity: (submittingDirect || !dirAmount || parseFloat(dirAmount) <= 0) ? 0.6 : 1,
                    cursor: (submittingDirect || !dirAmount || parseFloat(dirAmount) <= 0) ? 'not-allowed' : 'pointer'
                  }}
                  data-testid="btn-submit-direct-expense"
                >
                  <Sparkles size={16} />
                  <span>{submittingDirect ? 'Posting to GL...' : '⚡ Record Expense & Post to GL & P&L'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick Register Table Below Form */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>
                  Recent Operational Expenditures Register
                </h3>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>({claims.length} entries)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(true)}
                style={S.secondaryBtn}
                data-testid="btn-new-claim"
              >
                + Multi-Line Claim Modal
              </button>
            </div>

            <div style={S.card}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} data-testid="claims-table">
                <thead>
                  <tr>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Voucher / Claim #</th>
                    <th style={S.th}>Paid From / Account</th>
                    <th style={S.th}>Narration & Beneficiary</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Amount (₹)</th>
                    <th style={{ ...S.th, textAlign: 'center' }}>Status</th>
                    <th style={{ ...S.th, textAlign: 'center' }}>Audit Links</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ ...S.td, textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                        Loading expense entries...
                      </td>
                    </tr>
                  ) : claims.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ ...S.td, textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                        No operational expenses recorded yet. Fill the quick form above to post your first entry!
                      </td>
                    </tr>
                  ) : (
                    claims.slice(0, 15).map((c, idx) => {
                      const paidFromName = ledgers[c.employee_ledger_id] || 'Cash in Hand';
                      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8faf9';
                      return (
                        <tr key={c.id} style={{ backgroundColor: rowBg, transition: 'background-color 0.15s' }} data-testid={`claim-row-${c.claim_number}`}>
                          <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '12px', color: '#4b5563' }}>
                            {new Date(c.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 800, color: '#1b4332', fontSize: '13px' }}>
                            {c.claim_number}
                          </td>
                          <td style={{ ...S.td, fontWeight: 700, color: '#111827' }}>
                            {paidFromName}
                          </td>
                          <td style={{ ...S.td, color: '#4b5563' }}>
                            {c.remarks || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No notes</span>}
                          </td>
                          <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#111827', fontSize: '14px' }}>
                            ₹{Number(c.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ ...S.td, textAlign: 'center' }}>
                            {c.status === 'Approved' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#d8f3dc', color: '#1b4332', border: '1px solid #b7e4c7' }}>
                                <CheckCircle2 size={12} />
                                <span>Approved</span>
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                                <Clock size={12} />
                                <span>{c.status}</span>
                              </span>
                            )}
                          </td>
                          <td style={{ ...S.td, textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => navigate('/finance/profit-loss')}
                                style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace' }}
                                title="View under Indirect Expenses in P&L Statement"
                              >
                                P&L ↗
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate('/finance/daybook')}
                                style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace' }}
                                title="View voucher in Day Book"
                              >
                                DayBook ↗
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: CLAIMS REGISTRY & APPROVAL WORKBENCH
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'claims' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ ...S.card, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search claim #, employee, note..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ ...S.input, paddingLeft: '36px' }}
                data-testid="input-claim-search"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600 }}>Status:</span>
              <select
                value={claimStatusFilter}
                onChange={e => setClaimStatusFilter(e.target.value)}
                style={{ ...S.input, width: 'auto', cursor: 'pointer', fontWeight: 600 }}
                data-testid="select-claim-status-filter"
              >
                <option value="All">All Claims</option>
                <option value="Draft">Draft (Pending Approval)</option>
                <option value="Approved">Approved</option>
                <option value="Paid">Paid</option>
              </select>

              <button
                type="button"
                onClick={() => setIsClaimModalOpen(true)}
                style={S.primaryBtn}
              >
                <Plus size={15} />
                <span>+ Multi-Line Claim</span>
              </button>
            </div>
          </div>

          <div style={S.card}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Claim #</th>
                  <th style={S.th}>Employee / Claimant</th>
                  <th style={S.th}>Remarks & References</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Status</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ ...S.td, textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                      Loading expense claims...
                    </td>
                  </tr>
                ) : filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...S.td, textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                      No expense claims found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((c, idx) => {
                    const isExpanded = expandedClaimId === c.id;
                    const empName = ledgers[c.employee_ledger_id] || 'Employee';
                    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8faf9';
                    return (
                      <React.Fragment key={c.id}>
                        <tr
                          onClick={() => setExpandedClaimId(isExpanded ? null : c.id)}
                          style={{ backgroundColor: rowBg, cursor: 'pointer', transition: 'background-color 0.15s' }}
                          data-testid={`claim-row-${c.claim_number}`}
                        >
                          <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '12px', color: '#4b5563' }}>
                            {new Date(c.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 800, color: '#1b4332', fontSize: '13px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{c.claim_number}</span>
                              {isExpanded ? <ChevronUp size={14} color="#6b7280" /> : <ChevronDown size={14} color="#6b7280" />}
                            </div>
                          </td>
                          <td style={{ ...S.td, fontWeight: 700, color: '#111827' }}>
                            {empName}
                          </td>
                          <td style={{ ...S.td, color: '#4b5563' }}>
                            {c.remarks || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No notes</span>}
                          </td>
                          <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#111827', fontSize: '14px' }}>
                            ₹{Number(c.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ ...S.td, textAlign: 'center' }}>
                            {c.status === 'Approved' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#d8f3dc', color: '#1b4332', border: '1px solid #b7e4c7' }}>
                                <CheckCircle2 size={12} />
                                <span>Approved</span>
                              </span>
                            ) : c.status === 'Draft' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                                <Clock size={12} />
                                <span>Draft</span>
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569' }}>
                                {c.status}
                              </span>
                            )}
                          </td>
                          <td style={{ ...S.td, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            {c.status === 'Draft' ? (
                              <button
                                type="button"
                                onClick={() => handleApproveClaim(c.id, c.claim_number)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', borderRadius: '6px', backgroundColor: '#d8f3dc', border: '1px solid #2d6a4f', color: '#1b4332', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                                title="Approve Claim & Post Journal Voucher to GL"
                                data-testid={`btn-approve-${c.claim_number}`}
                              >
                                <CheckCircle2 size={13} />
                                <span>Approve</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#2d6a4f', fontWeight: 700, fontFamily: 'monospace' }}>GL Committed</span>
                            )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr style={{ backgroundColor: '#f8faf9', borderBottom: '1px solid #e5e7eb' }}>
                            <td colSpan={7} style={{ padding: '16px 24px' }}>
                              <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#1b4332', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                                  Itemized Expense Receipts ({c.lines?.length || 0} items)
                                </div>
                                <div style={{ ...S.card, boxShadow: 'none' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                                    <thead>
                                      <tr>
                                        <th style={{ ...S.th, padding: '8px 12px', background: '#334155' }}>Category</th>
                                        <th style={{ ...S.th, padding: '8px 12px', background: '#334155' }}>Bill #</th>
                                        <th style={{ ...S.th, padding: '8px 12px', background: '#334155' }}>Description</th>
                                        <th style={{ ...S.th, padding: '8px 12px', background: '#334155', textAlign: 'right' }}>Amount (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(c.lines || []).map((line, lIdx) => {
                                        const cat = categories.find(ct => ct.id === line.category_id);
                                        return (
                                          <tr key={line.id} style={{ backgroundColor: lIdx % 2 === 0 ? '#ffffff' : '#f1f5f9' }}>
                                            <td style={{ ...S.td, padding: '8px 12px', fontWeight: 700 }}>
                                              {cat?.name || 'Expense Category'}
                                            </td>
                                            <td style={{ ...S.td, padding: '8px 12px', fontFamily: 'monospace', color: '#6b7280' }}>
                                              {line.bill_number || '-'}
                                            </td>
                                            <td style={{ ...S.td, padding: '8px 12px', color: '#4b5563' }}>
                                              {line.note || '-'}
                                            </td>
                                            <td style={{ ...S.td, padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#111827' }}>
                                              ₹{Number(line.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                          </tr>
                                        );
                                      })}
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
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: EMPLOYEE ADVANCES & IMPREST WORKBENCH
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'advances' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>
              Staff Travel Imprest & Advances Register
            </h2>
            <button
              type="button"
              onClick={() => setIsAdvanceModalOpen(true)}
              style={S.primaryBtn}
              data-testid="btn-issue-advance-tab"
            >
              <Plus size={15} />
              <span>Issue Advance</span>
            </button>
          </div>

          <div style={S.card}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} data-testid="advances-table">
              <thead>
                <tr>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Employee / Staff Member</th>
                  <th style={S.th}>Reason / Purpose</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Status</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {advances.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                      No employee advances recorded.
                    </td>
                  </tr>
                ) : (
                  advances.map((a, idx) => {
                    const empName = ledgers[a.employee_ledger_id] || 'Employee';
                    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8faf9';
                    return (
                      <tr key={a.id} style={{ backgroundColor: rowBg, transition: 'background-color 0.15s' }} data-testid={`advance-row-${a.id}`}>
                        <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '12px', color: '#4b5563' }}>
                          {new Date(a.date).toLocaleDateString('en-IN')}
                        </td>
                        <td style={{ ...S.td, fontWeight: 700, color: '#111827' }}>
                          {empName}
                        </td>
                        <td style={{ ...S.td, color: '#4b5563' }}>
                          {a.reason || 'Operational Advance'}
                        </td>
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0284c7', fontSize: '14px' }}>
                          ₹{Number(a.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          {a.status === 'Active' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                              <Clock size={12} />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#d8f3dc', color: '#1b4332', border: '1px solid #b7e4c7' }}>
                              <CheckCircle2 size={12} />
                              <span>Settled</span>
                            </span>
                          )}
                        </td>
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          {a.status === 'Active' ? (
                            <button
                              type="button"
                              onClick={() => handleSettleAdvance(a.id)}
                              style={{ ...S.secondaryBtn, padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
                              data-testid={`btn-settle-${a.id}`}
                            >
                              Settle
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#1b4332', fontWeight: 700, fontFamily: 'monospace' }}>Settled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4: STATUTORY EXPENSE HEADS & P&L MAPPING
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>
              Configured Expense Heads & Mapped General Ledger Accounts
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              Every operational expense category is directly mapped to an Indirect Expense ledger to accurately impact Profit & Loss.
            </p>
          </div>

          <div style={S.card}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} data-testid="categories-table">
              <thead>
                <tr>
                  <th style={S.th}>Category Name</th>
                  <th style={S.th}>Description</th>
                  <th style={S.th}>Mapped P&L Ledger</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>P&L Group</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, idx) => {
                  const targetLedger = allLedgers.find(l => l.id === cat.ledger_id);
                  const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8faf9';
                  return (
                    <tr key={cat.id} style={{ backgroundColor: rowBg, transition: 'background-color 0.15s' }}>
                      <td style={{ ...S.td, fontWeight: 700, color: '#111827' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Tag size={14} color="#2d6a4f" />
                          <span>{cat.name}</span>
                        </div>
                      </td>
                      <td style={{ ...S.td, color: '#4b5563' }}>
                        {cat.description || '-'}
                      </td>
                      <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 700, color: '#1b4332' }}>
                        {targetLedger ? targetLedger.name : ledgers[cat.ledger_id] || 'Expense Account'}
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#d8f3dc', color: '#1b4332', border: '1px solid #b7e4c7' }}>
                          {targetLedger?.group_name || 'Indirect Expenses'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ENTRY MODAL FOR COMPLEX MULTI-LINE CLAIMS ────────── */}
      <ExpenseClaimEntryModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        onSuccess={() => {
          setIsClaimModalOpen(false);
          setSuccessBanner('Expense Claim created successfully in Draft status.');
          fetchData();
        }}
      />

      {/* ── ISSUE ADVANCE MODAL ──────────────────────────────── */}
      {isAdvanceModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)', padding: '16px' }} data-testid="advance-modal">
          <div style={{ ...S.card, width: '100%', maxWidth: '460px', overflow: 'hidden', border: '2px solid #2d6a4f', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                  Issue Staff Advance / Tour Imprest
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdvanceModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '18px', cursor: 'pointer', padding: '2px 6px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdvance} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={S.label}>Staff / Employee Account *</label>
                <select
                  value={advEmployeeId}
                  onChange={e => setAdvEmployeeId(e.target.value)}
                  style={{ ...S.input, cursor: 'pointer' }}
                  data-testid="select-advance-employee"
                  required
                >
                  <option value="">-- Select Staff Account --</option>
                  {allLedgers.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={S.label}>Advance Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  value={advAmount}
                  onChange={e => setAdvAmount(e.target.value)}
                  style={{ ...S.input, color: '#1b4332', fontWeight: 800, fontFamily: 'monospace', fontSize: '15px' }}
                  data-testid="input-advance-amount"
                  required
                />
              </div>

              <div>
                <label style={S.label}>Issue Date *</label>
                <input
                  type="date"
                  value={advDate}
                  onChange={e => setAdvDate(e.target.value)}
                  style={{ ...S.input, fontFamily: 'monospace' }}
                  data-testid="input-advance-date"
                  required
                />
              </div>

              <div>
                <label style={S.label}>Reason / Tour Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Field chemist visits tour travel advance"
                  value={advReason}
                  onChange={e => setAdvReason(e.target.value)}
                  style={S.input}
                  data-testid="input-advance-reason"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  style={{ ...S.secondaryBtn }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdvance}
                  style={S.primaryBtn}
                  data-testid="btn-submit-advance"
                >
                  {submittingAdvance ? 'Issuing...' : 'Issue Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
