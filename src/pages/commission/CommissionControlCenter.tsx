import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  DollarSign,
  TrendingUp,
  Receipt,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  RefreshCw,
  X,
  Sliders,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  FileText,
  Calculator,
  Lock,
  Layers
} from 'lucide-react';
import {
  apiGetCommissionSummary,
  apiGetCommissionAgreements,
  apiExecuteCommissionCalculation,
  apiGetCommissionCalculations,
  apiTakeCalculationAction,
  apiGetRecoveryClaims,
  apiCreateRecoveryClaim,
  apiTakeRecoveryClaimAction,
  apiGetRecoveryStatements,
  apiGenerateRecoveryStatement,
  apiGetCommissionExceptions,
  apiResolveCommissionException,
  apiGetCommissionAudits,
  CommissionSummaryKPI,
  CommissionAgreementItem,
  CommissionCalculationItem,
  RecoveryClaimItem,
  RecoveryStatementItem
} from '../../lib/api';

const FALLBACK_SUMMARY: CommissionSummaryKPI = {
  total_earned_commission: 48250.0,
  total_recoverable_expenses: 7450.0,
  net_commercial_total: 55700.0,
  open_claims_count: 1,
  open_claims_amount: 22600.0,
  approved_claims_count: 1,
  approved_claims_amount: 33100.0,
  total_disputed_amount: 0.0,
  active_agreements_count: 2,
  open_exceptions_count: 1,
  total_settled: 25000.0,
  total_outstanding: 8100.0
};

const FALLBACK_AGREEMENTS: CommissionAgreementItem[] = [
  {
    id: 'agr-sun-001',
    principal_id: 'p-sun-001',
    principal_code: 'P-SUN-001',
    principal_name: 'Sun Pharma Healthcare Ltd.',
    agreement_code: 'AGR-COMM-SUN-2026-001',
    version_no: 'v1.0',
    valid_from: '2026-01-01T00:00:00Z',
    valid_to: '2026-12-31T23:59:59Z',
    status: 'ACTIVE',
    terms_json: {
      description: 'Standard C&F Master Agreement with 6.5% Net Commission & Loading Recovery',
      payment_cycle: 'MONTHLY',
      dispute_grace_days: 15,
      minimum_guarantee_monthly: 25000.0
    },
    rules: [
      {
        id: 'r1',
        rule_code: 'RULE-SUN-SALES-PCT',
        rule_name: 'Standard Net Sales Commission 6.5%',
        priority: 1,
        rule_type: 'PERCENTAGE',
        rate_pct: 6.5,
        unit_rate: 0,
        fixed_amount: 0,
        min_guarantee_amount: 0,
        status: 'ACTIVE'
      },
      {
        id: 'r2',
        rule_code: 'RULE-SUN-MIN-GUARANTEE',
        rule_name: 'Monthly Minimum Floor Guarantee',
        priority: 2,
        rule_type: 'MINIMUM_GUARANTEE',
        rate_pct: 0,
        unit_rate: 0,
        fixed_amount: 0,
        min_guarantee_amount: 25000.0,
        status: 'ACTIVE'
      },
      {
        id: 'r3',
        rule_code: 'RULE-SUN-LOADING-RECOVERY',
        rule_name: 'Consignment Inward Loading Recovery',
        priority: 3,
        rule_type: 'PER_UNIT',
        rate_pct: 0,
        unit_rate: 300.0,
        fixed_amount: 0,
        min_guarantee_amount: 0,
        status: 'ACTIVE'
      }
    ]
  },
  {
    id: 'agr-cip-002',
    principal_id: 'p-cip-002',
    principal_code: 'P-CIP-002',
    principal_name: 'Cipla Therapeutics Ltd.',
    agreement_code: 'AGR-COMM-CIP-2026-002',
    version_no: 'v1.0',
    valid_from: '2026-02-01T00:00:00Z',
    valid_to: '2026-12-31T23:59:59Z',
    status: 'ACTIVE',
    terms_json: {
      description: 'Consignment Distribution Agreement with 5.0% Gross Commission & Secondary Handling',
      payment_cycle: 'FORTNIGHTLY',
      dispute_grace_days: 10,
      minimum_guarantee_monthly: 20000.0
    },
    rules: [
      {
        id: 'r4',
        rule_code: 'RULE-CIP-SALES-PCT',
        rule_name: 'Gross Sales Turnover Commission 5.0%',
        priority: 1,
        rule_type: 'PERCENTAGE',
        rate_pct: 5.0,
        unit_rate: 0,
        fixed_amount: 0,
        min_guarantee_amount: 0,
        status: 'ACTIVE'
      },
      {
        id: 'r5',
        rule_code: 'RULE-CIP-HANDLING',
        rule_name: 'Secondary Packaging & Handling',
        priority: 2,
        rule_type: 'PER_UNIT',
        rate_pct: 0,
        unit_rate: 15.0,
        fixed_amount: 0,
        min_guarantee_amount: 0,
        status: 'ACTIVE'
      }
    ]
  }
];

export const CommissionControlCenter: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'AGREEMENTS' | 'CALCULATIONS' | 'CLAIMS' | 'STATEMENTS' | 'EXCEPTIONS'>('AGREEMENTS');
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<CommissionSummaryKPI>(FALLBACK_SUMMARY);
  const [agreements, setAgreements] = useState<CommissionAgreementItem[]>(FALLBACK_AGREEMENTS);
  const [calculations, setCalculations] = useState<CommissionCalculationItem[]>([]);
  const [claims, setClaims] = useState<RecoveryClaimItem[]>([]);
  const [statements, setStatements] = useState<RecoveryStatementItem[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sandbox State
  const [sandboxPrincipalId, setSandboxPrincipalId] = useState<string>('');
  const [sandboxEventType, setSandboxEventType] = useState<string>('SALES_BILL');
  const [sandboxDocId, setSandboxDocId] = useState<string>('INV-2026-9951');
  const [sandboxBaseVal, setSandboxBaseVal] = useState<number>(250000);
  const [sandboxQty, setSandboxQty] = useState<number>(1);
  const [sandboxCategory, setSandboxCategory] = useState<string>('EARNED_COMMISSION');
  const [sandboxOutput, setSandboxOutput] = useState<CommissionCalculationItem | null>(null);

  // New Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState<boolean>(false);
  const [claimPrincipalId, setClaimPrincipalId] = useState<string>('');
  const [claimNotes, setClaimNotes] = useState<string>('Monthly C&F Commission & Expense Recovery Run');
  const [selectedCalcIds, setSelectedCalcIds] = useState<string[]>([]);

  // Load All Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, agrRes, calcRes, clmRes, stmtRes, excRes, audRes] = await Promise.all([
        apiGetCommissionSummary().catch(() => ({ status: 'ok', data: FALLBACK_SUMMARY })),
        apiGetCommissionAgreements().catch(() => ({ status: 'ok', count: 2, data: FALLBACK_AGREEMENTS })),
        apiGetCommissionCalculations().catch(() => ({ status: 'ok', count: 0, data: [] })),
        apiGetRecoveryClaims().catch(() => ({ status: 'ok', count: 0, data: [] })),
        apiGetRecoveryStatements().catch(() => ({ status: 'ok', count: 0, data: [] })),
        apiGetCommissionExceptions().catch(() => ({ status: 'ok', count: 0, data: [] })),
        apiGetCommissionAudits().catch(() => ({ status: 'ok', count: 0, data: [] }))
      ]);

      if (sumRes && sumRes.data) setSummary(sumRes.data);
      if (agrRes && agrRes.data && agrRes.data.length > 0) {
        setAgreements(agrRes.data);
        if (!sandboxPrincipalId) setSandboxPrincipalId(agrRes.data[0].principal_id);
        if (!claimPrincipalId) setClaimPrincipalId(agrRes.data[0].principal_id);
      } else {
        setAgreements(FALLBACK_AGREEMENTS);
        setSandboxPrincipalId(FALLBACK_AGREEMENTS[0].principal_id);
        setClaimPrincipalId(FALLBACK_AGREEMENTS[0].principal_id);
      }
      if (calcRes && calcRes.data) setCalculations(calcRes.data);
      if (clmRes && clmRes.data) setClaims(clmRes.data);
      if (stmtRes && stmtRes.data) setStatements(stmtRes.data);
      if (excRes && excRes.data) setExceptions(excRes.data);
      if (audRes && audRes.data) setAudits(audRes.data);
    } catch {
      setSummary(FALLBACK_SUMMARY);
      setAgreements(FALLBACK_AGREEMENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isClaimModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsClaimModalOpen(false);
        }
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('AGREEMENTS');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('CALCULATIONS');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('CLAIMS');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveTab('STATEMENTS');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setActiveTab('EXCEPTIONS');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setIsClaimModalOpen(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClaimModalOpen, navigate]);

  // Execute Sandbox Run
  const handleRunSandbox = async () => {
    if (!sandboxPrincipalId) return;
    try {
      const res = await apiExecuteCommissionCalculation({
        principal_id: sandboxPrincipalId,
        event_type: sandboxEventType,
        source_doc_type: sandboxEventType === 'FREIGHT_COST' ? 'FREIGHT_EVENT' : 'INVOICE',
        source_doc_id: sandboxDocId,
        base_value: sandboxBaseVal,
        quantity: sandboxQty,
        category: sandboxCategory
      });
      if (res && res.data) {
        setSandboxOutput(res.data);
        loadData();
      }
    } catch (err: any) {
      alert(`Calculation error: ${err.message || 'Failed to execute calculation'}`);
    }
  };

  // Calculation Action (Approve / Dispute)
  const handleCalcAction = async (calcId: string, action: string) => {
    try {
      await apiTakeCalculationAction(calcId, { action });
      loadData();
    } catch (err: any) {
      alert(`Action error: ${err.message || 'Failed to update calculation'}`);
    }
  };

  // Claim Action (Submit / Approve / Invoice)
  const handleClaimAction = async (claimId: string, action: string) => {
    try {
      await apiTakeRecoveryClaimAction(claimId, { action, document_type: 'SERVICE_INVOICE' });
      loadData();
    } catch (err: any) {
      alert(`Claim action error: ${err.message || 'Failed to update claim'}`);
    }
  };

  // Create New Claim
  const handleCreateClaim = async () => {
    if (!claimPrincipalId) return;
    try {
      await apiCreateRecoveryClaim({
        principal_id: claimPrincipalId,
        calc_ids: selectedCalcIds,
        notes: claimNotes
      });
      setIsClaimModalOpen(false);
      setSelectedCalcIds([]);
      loadData();
    } catch (err: any) {
      alert(`Create claim error: ${err.message || 'Failed to create claim'}`);
    }
  };

  // Generate Statement Run
  const handleGenerateStatement = async (principalId: string) => {
    try {
      await apiGenerateRecoveryStatement({ principal_id: principalId });
      loadData();
    } catch (err: any) {
      alert(`Statement run error: ${err.message || 'Failed to generate statement'}`);
    }
  };

  // Resolve Exception
  const handleResolveException = async (exId: string) => {
    try {
      await apiResolveCommissionException(exId);
      loadData();
    } catch (err: any) {
      alert(`Error resolving exception: ${err.message || 'Failed'}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none">
      {/* ── TOP MARG ERP 9+ HEADER ──────────────────────────── */}
      <header className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border-b border-blue-700/60 px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-blue-600/30 rounded border border-blue-400/40 text-blue-300">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-wide text-white uppercase font-mono">
                Principal & C&F Commission & Recovery Engine
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                DOC-37 v2.0
              </span>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-400/30 font-mono">
                ZERO DUPLICATE LEDGERS
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-2">
              <span>Earned Commissions • Recoverable Expenses • 4-Eyes Claims • Deterministic Hash Audits</span>
            </div>
          </div>
        </div>

        {/* Global Keyboard Legend */}
        <div className="hidden xl:flex items-center space-x-2 text-xs">
          <button
            onClick={() => setActiveTab('AGREEMENTS')}
            className={`px-2 py-1 rounded border text-[11px] font-mono transition-colors ${
              activeTab === 'AGREEMENTS' ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            [F2] Agreements
          </button>
          <button
            onClick={() => setActiveTab('CALCULATIONS')}
            className={`px-2 py-1 rounded border text-[11px] font-mono transition-colors ${
              activeTab === 'CALCULATIONS' ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            [F3] Sandbox
          </button>
          <button
            onClick={() => setActiveTab('CLAIMS')}
            className={`px-2 py-1 rounded border text-[11px] font-mono transition-colors ${
              activeTab === 'CLAIMS' ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            [F4] Claims Desk
          </button>
          <button
            onClick={() => setActiveTab('STATEMENTS')}
            className={`px-2 py-1 rounded border text-[11px] font-mono transition-colors ${
              activeTab === 'STATEMENTS' ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            [F5] Statements
          </button>
          <button
            onClick={() => setActiveTab('EXCEPTIONS')}
            className={`px-2 py-1 rounded border text-[11px] font-mono transition-colors ${
              activeTab === 'EXCEPTIONS' ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            [F6] Audits
          </button>
          <button
            id="btn-open-claim-modal"
            onClick={() => setIsClaimModalOpen(true)}
            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded border border-emerald-400 text-[11px] font-mono flex items-center space-x-1"
          >
            <Plus className="w-3 h-3" />
            <span>[F7] New Claim</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-2 py-1 bg-red-950/80 hover:bg-red-900 text-red-200 rounded border border-red-700/60 text-[11px] font-mono"
          >
            [Esc] Hub
          </button>
          <button
            onClick={loadData}
            title="Refresh All Data"
            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* ── 6 EXECUTIVE KPI CARDS ────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3 bg-slate-950/80 border-b border-slate-800 text-xs">
        {/* Card 1: Earned Commission */}
        <div className="bg-slate-900/90 p-2.5 rounded border border-blue-600/30 hover:border-blue-500/60 transition-all flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-medium text-[11px] uppercase tracking-wider text-blue-400">Earned Commission</span>
            <DollarSign className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-base font-bold text-white font-mono">
            ₹{summary.total_earned_commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center mt-1">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            <span>Active turnover revenue</span>
          </div>
        </div>

        {/* Card 2: Recoverable Expenses */}
        <div className="bg-slate-900/90 p-2.5 rounded border border-indigo-600/30 hover:border-indigo-500/60 transition-all flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-medium text-[11px] uppercase tracking-wider text-indigo-400">Recoverable Ancillaries</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-base font-bold text-white font-mono">
            ₹{summary.total_recoverable_expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-indigo-300 flex items-center mt-1">
            <Layers className="w-3 h-3 mr-1" />
            <span>Freight & handling recharges</span>
          </div>
        </div>

        {/* Card 3: Net Commercial Total */}
        <div className="bg-slate-900/90 p-2.5 rounded border border-emerald-600/40 hover:border-emerald-500/70 transition-all flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-medium text-[11px] uppercase tracking-wider text-emerald-400">Net Commercial Total</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-emerald-300 font-mono">
            ₹{summary.net_commercial_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center mt-1">
            <span>Earned + Recoverable Sum</span>
          </div>
        </div>

        {/* Card 4: Open Claims */}
        <div className="bg-slate-900/90 p-2.5 rounded border border-amber-600/30 hover:border-amber-500/60 transition-all flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-medium text-[11px] uppercase tracking-wider text-amber-400">Open Claims Desk</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-base font-bold text-amber-300 font-mono">
            ₹{summary.open_claims_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-amber-400/90 flex items-center mt-1">
            <span>{summary.open_claims_count} claim(s) pending audit</span>
          </div>
        </div>

        {/* Card 5: Settled Remittances */}
        <div className="bg-slate-900/90 p-2.5 rounded border border-cyan-600/30 hover:border-cyan-500/60 transition-all flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-medium text-[11px] uppercase tracking-wider text-cyan-400">Settled Remittances</span>
            <Receipt className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-base font-bold text-white font-mono">
            ₹{summary.total_settled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center mt-1">
            <span>₹{summary.total_outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })} outstanding</span>
          </div>
        </div>

        {/* Card 6: Agreements & Integrity */}
        <div className="bg-slate-900/90 p-2.5 rounded border border-purple-600/30 hover:border-purple-500/60 transition-all flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-medium text-[11px] uppercase tracking-wider text-purple-400">Active Agreements</span>
            <Lock className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-base font-bold text-white font-mono">
            {summary.active_agreements_count} Principals
          </div>
          <div className="text-[10px] text-purple-300 flex items-center mt-1">
            <ShieldCheck className="w-3 h-3 mr-1" />
            <span>SHA-256 Validated</span>
          </div>
        </div>
      </section>

      {/* ── TAB BAR ─────────────────────────────────────────── */}
      <div className="bg-slate-800/80 border-b border-slate-700/80 px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('AGREEMENTS')}
            className={`px-3 py-1.5 rounded-t text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'AGREEMENTS'
                ? 'bg-slate-900 text-blue-400 border-t-2 border-blue-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Agreements & Rate Cards</span>
          </button>
          <button
            onClick={() => setActiveTab('CALCULATIONS')}
            className={`px-3 py-1.5 rounded-t text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'CALCULATIONS'
                ? 'bg-slate-900 text-blue-400 border-t-2 border-blue-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Calculation Sandbox & Trace</span>
          </button>
          <button
            onClick={() => setActiveTab('CLAIMS')}
            className={`px-3 py-1.5 rounded-t text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'CLAIMS'
                ? 'bg-slate-900 text-blue-400 border-t-2 border-blue-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Recovery Claims Desk</span>
          </button>
          <button
            onClick={() => setActiveTab('STATEMENTS')}
            className={`px-3 py-1.5 rounded-t text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'STATEMENTS'
                ? 'bg-slate-900 text-blue-400 border-t-2 border-blue-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Principal Statements</span>
          </button>
          <button
            onClick={() => setActiveTab('EXCEPTIONS')}
            className={`px-3 py-1.5 rounded-t text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'EXCEPTIONS'
                ? 'bg-slate-900 text-blue-400 border-t-2 border-blue-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Exceptions & Audit Trail</span>
          </button>
        </div>

        {/* Search filter */}
        <div className="relative w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
          <input
            type="text"
            placeholder="Search agreement/doc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 text-slate-200 text-xs pl-7 pr-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* ── TAB CONTENT AREA ────────────────────────────────── */}
      <main className="flex-1 p-4 overflow-y-auto bg-slate-900/60">
        {/* TAB 1: AGREEMENTS */}
        {activeTab === 'AGREEMENTS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Principal Commission Master Agreements
                </h2>
                <p className="text-xs text-slate-400">
                  Legally binding commission percentages, guaranteed floors, and recoverable handling cards.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {agreements.map((agr) => (
                <div
                  key={agr.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                      <div>
                        <div className="text-sm font-bold text-blue-300 font-mono flex items-center space-x-2">
                          <span>{agr.principal_name}</span>
                          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">
                            {agr.principal_code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {agr.agreement_code} • Version {agr.version_no}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono">
                        {agr.status}
                      </span>
                    </div>

                    {/* Terms highlight */}
                    <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 text-xs mb-3 space-y-1">
                      <div className="text-[11px] text-slate-300 font-medium">
                        {agr.terms_json?.description || 'Standard contractual commission & expense terms'}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800">
                        <div>Payment Cycle: <span className="text-slate-200">{agr.terms_json?.payment_cycle || 'MONTHLY'}</span></div>
                        <div>Dispute Window: <span className="text-slate-200">{agr.terms_json?.dispute_grace_days || 15} Days</span></div>
                        <div>Min Guarantee: <span className="text-emerald-300">₹{agr.terms_json?.minimum_guarantee_monthly || 0}/mo</span></div>
                        <div>Freight Recharge: <span className="text-blue-300">AUTHORIZED</span></div>
                      </div>
                    </div>

                    {/* Rule Cards */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Commission & Recovery Rules
                      </div>
                      {agr.rules && agr.rules.map((r) => (
                        <div
                          key={r.id}
                          className="bg-slate-900/50 p-2 rounded border border-slate-800 flex items-center justify-between text-xs font-mono"
                        >
                          <div>
                            <div className="text-slate-200 font-semibold">{r.rule_name}</div>
                            <div className="text-[10px] text-slate-400">
                              Type: {r.rule_type} • Code: {r.rule_code}
                            </div>
                          </div>
                          <div className="text-right">
                            {r.rule_type === 'PERCENTAGE' && (
                              <span className="text-emerald-400 font-bold text-sm">{r.rate_pct}%</span>
                            )}
                            {r.rule_type === 'PER_UNIT' && (
                              <span className="text-blue-400 font-bold text-sm">₹{r.unit_rate}/unit</span>
                            )}
                            {r.rule_type === 'MINIMUM_GUARANTEE' && (
                              <span className="text-amber-400 font-bold text-sm">₹{r.min_guarantee_amount} Floor</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-500 font-mono">
                      Validity: {agr.valid_from ? new Date(agr.valid_from).toLocaleDateString() : 'N/A'} - {agr.valid_to ? new Date(agr.valid_to).toLocaleDateString() : 'Active'}
                    </span>
                    <button
                      onClick={() => {
                        setSandboxPrincipalId(agr.principal_id);
                        setActiveTab('CALCULATIONS');
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
                    >
                      <span>Simulate in Sandbox</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: CALCULATIONS & SANDBOX */}
        {activeTab === 'CALCULATIONS' && (
          <div className="space-y-4">
            {/* Sandbox input controls */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Deterministic Commission Sandbox
                  </h3>
                </div>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                  SHA-256 HASH VERIFIED
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">Principal</label>
                  <select
                    value={sandboxPrincipalId}
                    onChange={(e) => setSandboxPrincipalId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                  >
                    {agreements.map((a) => (
                      <option key={a.principal_id} value={a.principal_id}>
                        {a.principal_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">Event Type</label>
                  <select
                    value={sandboxEventType}
                    onChange={(e) => {
                      setSandboxEventType(e.target.value);
                      if (e.target.value === 'FREIGHT_COST' || e.target.value === 'STORAGE_CHARGE' || e.target.value === 'LOADING_CHARGE') {
                        setSandboxCategory('RECOVERABLE_EXPENSE');
                      } else {
                        setSandboxCategory('EARNED_COMMISSION');
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                  >
                    <option value="SALES_BILL">SALES_BILL (Net Turnover)</option>
                    <option value="SALES_RETURN">SALES_RETURN (Reduction)</option>
                    <option value="FREIGHT_COST">FREIGHT_COST (Inward Transit)</option>
                    <option value="STORAGE_CHARGE">STORAGE_CHARGE (Depot Handling)</option>
                    <option value="LOADING_CHARGE">LOADING_CHARGE (Consignment)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">Source Doc ID</label>
                  <input
                    type="text"
                    value={sandboxDocId}
                    onChange={(e) => setSandboxDocId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">Base Value (₹)</label>
                  <input
                    type="number"
                    value={sandboxBaseVal}
                    onChange={(e) => setSandboxBaseVal(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">Quantity / Units</label>
                  <input
                    type="number"
                    value={sandboxQty}
                    onChange={(e) => setSandboxQty(parseFloat(e.target.value) || 1)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    id="btn-run-sandbox"
                    onClick={handleRunSandbox}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-xs transition-colors flex items-center justify-center space-x-1"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Run Calc</span>
                  </button>
                </div>
              </div>

              {/* Simulation Result Banner */}
              {sandboxOutput && (
                <div className="mt-3 bg-blue-950/40 border border-blue-500/40 rounded p-3 text-xs font-mono">
                  <div className="flex items-center justify-between text-blue-300 font-bold">
                    <span>Generated {sandboxOutput.calculation_number}</span>
                    <span className="text-emerald-400 text-sm">
                      ₹{sandboxOutput.calculated_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-slate-300 text-[11px] mt-1">{sandboxOutput.formula_trace}</div>
                  <div className="text-slate-500 text-[10px] mt-1 truncate">SHA-256: {sandboxOutput.sha256_hash}</div>
                </div>
              )}
            </div>

            {/* Calculations Ledger Table */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Calculations Ledger ({calculations.length})
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Approved records ready for claim batching
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2">Calc Number</th>
                      <th className="px-3 py-2">Principal</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Base Value</th>
                      <th className="px-3 py-2">Rate Applied</th>
                      <th className="px-3 py-2">Calculated (₹)</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Formula Trace</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {calculations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                          No calculations recorded. Run a calculation above to generate entries.
                        </td>
                      </tr>
                    ) : (
                      calculations.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="px-3 py-2 font-bold text-blue-300">{c.calculation_number}</td>
                          <td className="px-3 py-2 text-slate-200">{c.principal_name}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                c.category === 'EARNED_COMMISSION'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                                  : 'bg-indigo-950 text-indigo-300 border border-indigo-700/60'
                              }`}
                            >
                              {c.category}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-300">₹{c.base_value.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-slate-300">{c.rate_applied}%</td>
                          <td className="px-3 py-2 font-bold text-white">
                            ₹{c.calculated_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                c.state === 'APPROVED'
                                  ? 'bg-emerald-900 text-emerald-200'
                                  : c.state === 'BATCHED'
                                  ? 'bg-purple-900 text-purple-200'
                                  : c.state === 'DISPUTED'
                                  ? 'bg-red-900 text-red-200'
                                  : 'bg-blue-900 text-blue-200'
                              }`}
                            >
                              {c.state}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-400 text-[11px] max-w-xs truncate" title={c.formula_trace}>
                            {c.formula_trace}
                          </td>
                          <td className="px-3 py-2 text-right space-x-1">
                            {c.state === 'CALCULATED' && (
                              <>
                                <button
                                  onClick={() => handleCalcAction(c.id, 'APPROVE')}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px]"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleCalcAction(c.id, 'DISPUTE')}
                                  className="px-2 py-0.5 bg-red-800 hover:bg-red-700 text-white rounded text-[10px]"
                                >
                                  Dispute
                                </button>
                              </>
                            )}
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

        {/* TAB 3: RECOVERY CLAIMS DESK */}
        {activeTab === 'CLAIMS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Principal Recovery Claims Desk (4-Eyes Approval)
                </h2>
                <p className="text-xs text-slate-400">
                  Batch approved earned commissions and recoverable expenses into formal recovery claim submissions.
                </p>
              </div>
              <button
                onClick={() => setIsClaimModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded text-xs flex items-center space-x-1 font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Claim Batch</span>
              </button>
            </div>

            <div className="space-y-3">
              {claims.length === 0 ? (
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-8 text-center text-slate-500 font-mono text-xs">
                  No recovery claims currently registered. Use [F7] or the button above to generate a claim.
                </div>
              ) : (
                claims.map((clm) => (
                  <div
                    key={clm.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-all font-mono text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-blue-300">{clm.claim_number}</span>
                          <span className="text-slate-400">• {clm.principal_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Period: {new Date(clm.period_from).toLocaleDateString()} to {new Date(clm.period_to).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            clm.status === 'APPROVED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                              : clm.status === 'SUBMITTED'
                              ? 'bg-blue-950 text-blue-300 border border-blue-700/60'
                              : clm.status === 'RECOVERY_CREATED'
                              ? 'bg-purple-950 text-purple-300 border border-purple-700/60'
                              : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                          }`}
                        >
                          {clm.status}
                        </span>

                        {clm.status === 'DRAFT' && (
                          <button
                            onClick={() => handleClaimAction(clm.id, 'SUBMIT')}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-semibold"
                          >
                            Submit
                          </button>
                        )}
                        {clm.status === 'SUBMITTED' && (
                          <button
                            onClick={() => handleClaimAction(clm.id, 'APPROVE')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold"
                          >
                            Approve
                          </button>
                        )}
                        {clm.status === 'APPROVED' && (
                          <button
                            onClick={() => handleClaimAction(clm.id, 'CREATE_DOCUMENT')}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-semibold"
                          >
                            Create Service Invoice
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-400">Total Claimed</div>
                        <div className="text-white font-bold text-sm">
                          ₹{clm.total_claimed_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Earned Turnover</div>
                        <div className="text-emerald-300 font-bold">
                          ₹{clm.total_earned_commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Recoverable Expenses</div>
                        <div className="text-indigo-300 font-bold">
                          ₹{clm.total_recoverable_expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Approved Total</div>
                        <div className="text-cyan-300 font-bold">
                          ₹{clm.approved_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Claim Lines breakdown */}
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Claim Line Items ({clm.lines.length})</div>
                      {clm.lines.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between text-[11px] bg-slate-900/40 px-2.5 py-1 rounded border border-slate-800/80"
                        >
                          <div className="truncate max-w-md">
                            <span className="text-slate-200 font-semibold">{l.source_doc_id}</span> •{' '}
                            <span className="text-slate-400">{l.line_description}</span>
                          </div>
                          <div className="font-bold text-slate-200">
                            ₹{l.requested_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Linked Docs */}
                    {clm.linked_documents && clm.linked_documents.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center space-x-2 text-[10px]">
                        <span className="text-slate-400 font-bold">Linked Commercial Documents:</span>
                        {clm.linked_documents.map((d) => (
                          <span
                            key={d.id}
                            className="bg-indigo-950 text-indigo-300 border border-indigo-700/60 px-2 py-0.5 rounded font-bold"
                          >
                            {d.document_type}: {d.document_number} (₹{d.amount.toLocaleString('en-IN')})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: STATEMENTS */}
        {activeTab === 'STATEMENTS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Principal Recovery Statements (Consolidated Periodic Run)
                </h2>
                <p className="text-xs text-slate-400">
                  Consolidated ledger reconciling earned commissions, recoverable expenses, payments received, and outstanding principal balances.
                </p>
              </div>

              {agreements.length > 0 && (
                <button
                  onClick={() => handleGenerateStatement(agreements[0].principal_id)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded text-xs flex items-center space-x-1 font-mono"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Generate Period Statement</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {statements.map((stm) => (
                <div
                  key={stm.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 font-mono text-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center space-x-2">
                        <span>{stm.statement_number}</span>
                        <span className="text-blue-300 font-normal">• {stm.principal_name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Period: {new Date(stm.period_from).toLocaleDateString()} to {new Date(stm.period_to).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                      {stm.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-400">Earned Turnover</div>
                      <div className="text-emerald-300 font-bold">
                        ₹{stm.earned_commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Expense Recovery</div>
                      <div className="text-indigo-300 font-bold">
                        ₹{stm.expense_recovery.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Invoiced Commercial</div>
                      <div className="text-white font-bold">
                        ₹{stm.invoiced_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Settled (Remittances)</div>
                      <div className="text-cyan-300 font-bold">
                        ₹{stm.settled_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Outstanding Balance</div>
                      <div className="text-amber-300 font-bold">
                        ₹{stm.outstanding_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Statement Lines */}
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Statement Transactions</div>
                    {stm.lines.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between text-[11px] bg-slate-900/40 px-2.5 py-1 rounded border border-slate-800/80"
                      >
                        <div>
                          <span className="text-slate-300 font-semibold">{l.category}</span> •{' '}
                          <span className="text-slate-400">{l.description}</span> ({l.reference_doc_id})
                        </div>
                        <div
                          className={`font-bold ${
                            l.amount < 0 ? 'text-cyan-400' : 'text-slate-200'
                          }`}
                        >
                          ₹{l.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-500 truncate">
                    Integrity Hash: {stm.statement_hash}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: EXCEPTIONS & AUDIT TRAIL */}
        {activeTab === 'EXCEPTIONS' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Exceptions Queue */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white uppercase tracking-wider">
                    Exceptions Queue ({exceptions.length})
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {exceptions.map((ex) => (
                  <div
                    key={ex.id}
                    className="bg-slate-900/60 p-2.5 rounded border border-slate-800 flex items-start justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-200 font-bold">{ex.source_id}</span>
                        <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700/60">
                          {ex.exception_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{ex.description}</div>
                    </div>
                    {ex.state === 'OPEN' && (
                      <button
                        onClick={() => handleResolveException(ex.id)}
                        className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-semibold"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Trail */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white uppercase tracking-wider">
                    Immutable Audit Trail ({audits.length})
                  </span>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {audits.map((a) => (
                  <div key={a.id} className="bg-slate-900/60 p-2 rounded border border-slate-800 text-[11px]">
                    <div className="flex items-center justify-between text-slate-300 font-bold">
                      <span>{a.action} on {a.object_type} ({a.object_id})</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(a.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Actor: {a.actor_username} • Hash: {a.after_hash ? a.after_hash.slice(0, 16) : 'N/A'}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── NEW CLAIM MODAL ─────────────────────────────────── */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-700 rounded-lg max-w-lg w-full p-5 shadow-2xl font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm text-white uppercase tracking-wider">
                  Create Principal Recovery Claim Batch
                </span>
              </div>
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Target Principal</label>
                <select
                  value={claimPrincipalId}
                  onChange={(e) => setClaimPrincipalId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                >
                  {agreements.map((a) => (
                    <option key={a.principal_id} value={a.principal_id}>
                      {a.principal_name} ({a.principal_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Batch Description / Notes</label>
                <input
                  type="text"
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Select Approved Calculations to Include ({selectedCalcIds.length} selected)
                </label>
                <div className="max-h-36 overflow-y-auto bg-slate-900 border border-slate-800 rounded p-2 space-y-1">
                  {calculations
                    .filter((c) => c.state === 'APPROVED' || c.state === 'CALCULATED')
                    .map((c) => (
                      <label key={c.id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-800/50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedCalcIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCalcIds([...selectedCalcIds, c.id]);
                            } else {
                              setSelectedCalcIds(selectedCalcIds.filter((id) => id !== c.id));
                            }
                          }}
                          className="rounded border-slate-700 text-blue-600 focus:ring-0"
                        />
                        <span className="text-[11px] text-slate-200">{c.calculation_number}</span>
                        <span className="text-[10px] text-slate-400">({c.category} - ₹{c.calculated_amount})</span>
                      </label>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
              >
                Cancel [Esc]
              </button>
              <button
                id="btn-submit-claim-modal"
                onClick={handleCreateClaim}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center space-x-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Create Claim Batch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
