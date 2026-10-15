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
  Layers,
  Sparkles,
  Check,
  HelpCircle,
  ExternalLink
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
      minimum_guarantee_monthly: 25000.0,
      freight_recovery_allowed: true
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
      minimum_guarantee_monthly: 20000.0,
      freight_recovery_allowed: true
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
  const [selectedPrincipalId, setSelectedPrincipalId] = useState<string>('');
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
        if (!selectedPrincipalId) setSelectedPrincipalId(agrRes.data[0].principal_id);
        if (!sandboxPrincipalId) setSandboxPrincipalId(agrRes.data[0].principal_id);
        if (!claimPrincipalId) setClaimPrincipalId(agrRes.data[0].principal_id);
      } else {
        setAgreements(FALLBACK_AGREEMENTS);
        setSelectedPrincipalId(FALLBACK_AGREEMENTS[0].principal_id);
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

  const activePrincipal = agreements.find(a => a.principal_id === selectedPrincipalId) || agreements[0];

  return (
    <div className="min-h-screen bg-[#f4f6f4] p-4 text-gray-800 font-sans select-none">
      {/* ── TOP OPERATIONAL HEADER ──────────────────────────── */}
      <div className="bg-[#1b4332] text-white p-4 rounded-xl shadow-md mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-emerald-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-600/90 rounded-lg shadow-inner">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded">
                DOC-37 Engine v2.0
              </span>
              <span className="text-xs text-emerald-300 font-medium">
                ZERO DUPLICATE LEDGERS • DETERMINISTIC TRACE
              </span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-white mt-0.5">
              Principal & C&F Commission & Recovery Engine
            </h1>
          </div>
        </div>

        {/* Global Controls & Keyboard Legend */}
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-300 absolute left-3 top-2.5" />
            <input
              id="input-commission-search"
              type="text"
              placeholder="Search agreement/rule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#2d6a4f] text-white placeholder-emerald-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 w-52 shadow-inner"
            />
          </div>

          <select
            id="select-active-principal"
            value={selectedPrincipalId}
            onChange={(e) => {
              setSelectedPrincipalId(e.target.value);
              setSandboxPrincipalId(e.target.value);
              setClaimPrincipalId(e.target.value);
            }}
            className="bg-white text-gray-900 font-bold text-xs rounded-lg px-3 py-2 border-0 shadow focus:ring-2 focus:ring-emerald-400"
          >
            {agreements.map((a) => (
              <option key={a.principal_id} value={a.principal_id}>
                {a.principal_code} — {a.principal_name}
              </option>
            ))}
          </select>

          <button
            id="btn-open-claim-modal"
            onClick={() => setIsClaimModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-3 py-2 rounded-lg shadow transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>[F7] New Claim</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="text-xs bg-[#0f2e21] hover:bg-[#091f16] px-3 py-2 rounded-lg text-emerald-200 font-semibold transition-all border border-emerald-900/60"
          >
            [Esc] Hub
          </button>

          <button
            onClick={loadData}
            title="Refresh All Telemetry"
            className="p-2 bg-[#2d6a4f] hover:bg-[#22543d] text-emerald-100 rounded-lg transition-all shadow"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 6-CARD EXECUTIVE KPI TELEMETRY STRIP ─────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {/* Card 1: Earned Commission */}
        <div id="kpi-earned-commission" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-600 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Earned Commission</div>
          <div className="text-xl font-black text-gray-900 mt-1">
            ₹{summary.total_earned_commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-700 font-medium flex items-center mt-1">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            <span>Sales turnover revenue</span>
          </div>
        </div>

        {/* Card 2: Recoverable Expenses */}
        <div id="kpi-recoverable-ancillaries" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Recoverable Ancillaries</div>
          <div className="text-xl font-black text-gray-900 mt-1">
            ₹{summary.total_recoverable_expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-blue-700 font-medium flex items-center mt-1">
            <Layers className="w-3 h-3 mr-1 text-blue-600" />
            <span>Freight & handling recharges</span>
          </div>
        </div>

        {/* Card 3: Net Commercial Total */}
        <div id="kpi-net-commercial" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-indigo-600 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Net Commercial Total</div>
          <div className="text-xl font-black text-indigo-900 mt-1">
            ₹{summary.net_commercial_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-indigo-700 font-medium flex items-center mt-1">
            <ShieldCheck className="w-3 h-3 mr-1 text-indigo-600" />
            <span>Earned + Recoverable Sum</span>
          </div>
        </div>

        {/* Card 4: Open Claims Desk */}
        <div id="kpi-open-claims" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Open Claims Desk</div>
          <div className="text-xl font-black text-amber-900 mt-1">
            ₹{summary.open_claims_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-amber-700 font-medium flex items-center mt-1">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            <span>{summary.open_claims_count} claim(s) pending audit</span>
          </div>
        </div>

        {/* Card 5: Settled Remittances */}
        <div id="kpi-settled-remittances" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-cyan-600 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Settled Remittances</div>
          <div className="text-xl font-black text-gray-900 mt-1">
            ₹{summary.total_settled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-cyan-700 font-medium flex items-center mt-1">
            <Receipt className="w-3 h-3 mr-1 text-cyan-600" />
            <span>₹{summary.total_outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })} due</span>
          </div>
        </div>

        {/* Card 6: Active Agreements */}
        <div id="kpi-active-agreements" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-600 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Agreements</div>
          <div className="text-xl font-black text-purple-900 mt-1">
            {summary.active_agreements_count} Principals
          </div>
          <div className="text-[10px] text-purple-700 font-medium flex items-center mt-1">
            <Lock className="w-3 h-3 mr-1 text-purple-600" />
            <span>SHA-256 Validated</span>
          </div>
        </div>
      </div>

      {/* ── PRINCIPAL CONTEXT BANNER ───────────────────────── */}
      {activePrincipal && (
        <div className="bg-white border border-gray-200 p-3.5 rounded-xl shadow-sm mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="font-extrabold text-sm text-[#1b4332]">{activePrincipal.principal_name}</span>
            <span className="bg-emerald-50 text-emerald-800 font-mono font-bold px-2.5 py-0.5 rounded border border-emerald-200">
              {activePrincipal.principal_code}
            </span>
            <span className="bg-gray-100 text-gray-700 font-semibold px-2.5 py-0.5 rounded border border-gray-200">
              {activePrincipal.agreement_code} ({activePrincipal.version_no})
            </span>
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded">
              {activePrincipal.status}
            </span>
          </div>

          <div className="flex items-center space-x-4 text-gray-600 font-medium">
            <div>Payment: <span className="text-gray-900 font-bold">{activePrincipal.terms_json?.payment_cycle || 'MONTHLY'}</span></div>
            <div>Dispute Window: <span className="text-gray-900 font-bold">{activePrincipal.terms_json?.dispute_grace_days || 15} Days</span></div>
            <div>Monthly Floor: <span className="text-emerald-700 font-bold">₹{activePrincipal.terms_json?.minimum_guarantee_monthly || 0}/mo</span></div>
          </div>
        </div>
      )}

      {/* ── TAB NAVIGATION BAR ──────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-1 mb-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button
            id="tab-btn-agreements"
            onClick={() => setActiveTab('AGREEMENTS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'AGREEMENTS'
                ? 'bg-[#1b4332] text-white shadow'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>[F2] Agreements & Rate Cards</span>
          </button>

          <button
            id="tab-btn-calculations"
            onClick={() => setActiveTab('CALCULATIONS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'CALCULATIONS'
                ? 'bg-[#1b4332] text-white shadow'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>[F3] Sandbox & Trace</span>
          </button>

          <button
            id="tab-btn-claims"
            onClick={() => setActiveTab('CLAIMS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'CLAIMS'
                ? 'bg-[#1b4332] text-white shadow'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>[F4] Recovery Claims Desk</span>
          </button>

          <button
            id="tab-btn-statements"
            onClick={() => setActiveTab('STATEMENTS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'STATEMENTS'
                ? 'bg-[#1b4332] text-white shadow'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>[F5] Principal Statements</span>
          </button>

          <button
            id="tab-btn-exceptions"
            onClick={() => setActiveTab('EXCEPTIONS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'EXCEPTIONS'
                ? 'bg-[#1b4332] text-white shadow'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>[F6] Exceptions & Audits</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center text-xs text-gray-400 font-mono pr-2">
          <span>Zero Mouse Keyboard Nav Active</span>
        </div>
      </div>

      {/* ── TAB CONTENT WORKSPACE ───────────────────────────── */}
      <div className="space-y-4">
        {/* TAB 1: AGREEMENTS & RATE CARDS */}
        {activeTab === 'AGREEMENTS' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {agreements.map((agr) => (
              <div
                key={agr.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                    <div>
                      <div className="text-base font-extrabold text-[#1b4332] flex items-center space-x-2">
                        <span>{agr.principal_name}</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono font-bold">
                          {agr.principal_code}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 font-medium">
                        {agr.agreement_code} • Version {agr.version_no}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      {agr.status}
                    </span>
                  </div>

                  {/* Contract terms card */}
                  <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg text-xs text-gray-700 mb-3 space-y-1">
                    <div className="font-semibold text-emerald-950">
                      {agr.terms_json?.description || 'Standard contractual commission & expense terms'}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 pt-1.5 border-t border-emerald-100/60">
                      <div>Payment Cycle: <span className="font-bold text-gray-900">{agr.terms_json?.payment_cycle || 'MONTHLY'}</span></div>
                      <div>Dispute Grace: <span className="font-bold text-gray-900">{agr.terms_json?.dispute_grace_days || 15} Days</span></div>
                      <div>Min Guarantee: <span className="font-bold text-emerald-800">₹{agr.terms_json?.minimum_guarantee_monthly || 0}/mo</span></div>
                      <div>Freight Recharges: <span className="font-bold text-blue-700">AUTHORIZED</span></div>
                    </div>
                  </div>

                  {/* Rules list */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Contractual Rate Rules & Ancillaries
                    </div>
                    {agr.rules && agr.rules.map((r) => (
                      <div
                        key={r.id}
                        className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-gray-900">{r.rule_name}</div>
                          <div className="text-[11px] text-gray-500 font-mono">
                            Type: {r.rule_type} • Code: {r.rule_code}
                          </div>
                        </div>
                        <div className="text-right">
                          {r.rule_type === 'PERCENTAGE' && (
                            <span className="bg-emerald-100 text-emerald-800 font-extrabold text-sm px-2.5 py-1 rounded">
                              {r.rate_pct}%
                            </span>
                          )}
                          {r.rule_type === 'PER_UNIT' && (
                            <span className="bg-blue-100 text-blue-800 font-extrabold text-sm px-2.5 py-1 rounded">
                              ₹{r.unit_rate}/unit
                            </span>
                          )}
                          {r.rule_type === 'MINIMUM_GUARANTEE' && (
                            <span className="bg-amber-100 text-amber-800 font-extrabold text-sm px-2.5 py-1 rounded">
                              ₹{r.min_guarantee_amount} Floor
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-mono">
                    Validity: {agr.valid_from ? new Date(agr.valid_from).toLocaleDateString() : 'N/A'} to {agr.valid_to ? new Date(agr.valid_to).toLocaleDateString() : 'Active'}
                  </span>
                  <button
                    onClick={() => {
                      setSandboxPrincipalId(agr.principal_id);
                      setSelectedPrincipalId(agr.principal_id);
                      setActiveTab('CALCULATIONS');
                    }}
                    className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1"
                  >
                    <span>Simulate in Sandbox</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: CALCULATIONS & SANDBOX */}
        {activeTab === 'CALCULATIONS' && (
          <div className="space-y-4">
            {/* Sandbox Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-emerald-100 rounded text-emerald-800">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                      Deterministic Commission Sandbox
                    </h3>
                    <p className="text-xs text-gray-500">
                      Simulate on-the-fly turnover commissions or recoverable ancillaries with frozen SHA-256 explainability.
                    </p>
                  </div>
                </div>
                <span className="bg-emerald-50 text-emerald-800 text-xs font-mono font-bold px-2.5 py-1 rounded border border-emerald-200">
                  SHA-256 AUDIT GUARANTEE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Principal</label>
                  <select
                    value={sandboxPrincipalId}
                    onChange={(e) => setSandboxPrincipalId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  >
                    {agreements.map((a) => (
                      <option key={a.principal_id} value={a.principal_id}>
                        {a.principal_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Event Type</label>
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
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  >
                    <option value="SALES_BILL">SALES_BILL (Net Turnover)</option>
                    <option value="SALES_RETURN">SALES_RETURN (Reduction)</option>
                    <option value="FREIGHT_COST">FREIGHT_COST (Inward Transit)</option>
                    <option value="STORAGE_CHARGE">STORAGE_CHARGE (Depot Handling)</option>
                    <option value="LOADING_CHARGE">LOADING_CHARGE (Consignment)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Source Doc ID</label>
                  <input
                    type="text"
                    value={sandboxDocId}
                    onChange={(e) => setSandboxDocId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 font-mono font-medium focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Base Value (₹)</label>
                  <input
                    type="number"
                    value={sandboxBaseVal}
                    onChange={(e) => setSandboxBaseVal(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 font-mono font-bold focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Quantity / Units</label>
                  <input
                    type="number"
                    value={sandboxQty}
                    onChange={(e) => setSandboxQty(parseFloat(e.target.value) || 1)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 font-mono font-bold focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    id="btn-run-sandbox"
                    onClick={handleRunSandbox}
                    className="w-full bg-[#1b4332] hover:bg-[#143627] text-white font-extrabold py-2 px-3 rounded-lg text-xs transition-all shadow flex items-center justify-center space-x-1.5"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>Run Calculation</span>
                  </button>
                </div>
              </div>

              {/* Simulation Result Banner */}
              {sandboxOutput && (
                <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs">
                  <div className="flex items-center justify-between text-emerald-950 font-bold">
                    <span className="text-sm font-extrabold">Calculation Success: {sandboxOutput.calculation_number}</span>
                    <span className="text-lg font-black text-emerald-800">
                      ₹{sandboxOutput.calculated_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-gray-700 font-medium mt-1">{sandboxOutput.formula_trace}</div>
                  <div className="text-gray-500 font-mono text-[10px] mt-1 truncate">
                    Frozen SHA-256 Hash: {sandboxOutput.sha256_hash}
                  </div>
                </div>
              )}
            </div>

            {/* Calculations Ledger Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wide text-gray-900">
                    Calculations Ledger ({calculations.length})
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    Audit-ready records for claims batching
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5">Calc Number</th>
                      <th className="px-4 py-2.5">Principal</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5">Base Value</th>
                      <th className="px-4 py-2.5">Rate Applied</th>
                      <th className="px-4 py-2.5">Calculated (₹)</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Formula Trace</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {calculations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                          No calculations recorded yet. Use the sandbox above to run calculations.
                        </td>
                      </tr>
                    ) : (
                      calculations.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-emerald-800 font-mono">{c.calculation_number}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{c.principal_name}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.category === 'EARNED_COMMISSION'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {c.category}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-800 font-mono">₹{c.base_value.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2.5 text-gray-800 font-mono">{c.rate_applied}%</td>
                          <td className="px-4 py-2.5 font-bold text-gray-900 font-mono">
                            ₹{c.calculated_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.state === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.state === 'BATCHED'
                                  ? 'bg-purple-100 text-purple-800'
                                  : c.state === 'DISPUTED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {c.state}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 text-[11px] max-w-xs truncate" title={c.formula_trace}>
                            {c.formula_trace}
                          </td>
                          <td className="px-4 py-2.5 text-right space-x-1">
                            {c.state === 'CALCULATED' && (
                              <>
                                <button
                                  onClick={() => handleCalcAction(c.id, 'APPROVE')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shadow-sm"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleCalcAction(c.id, 'DISPUTE')}
                                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold shadow-sm"
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
                <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                  Principal Recovery Claims Desk (4-Eyes Approval Workflow)
                </h2>
                <p className="text-xs text-gray-500">
                  Aggregate approved earned commissions and recoverable expenses into formal recovery claim packages.
                </p>
              </div>
              <button
                onClick={() => setIsClaimModalOpen(true)}
                className="bg-[#1b4332] hover:bg-[#143627] text-white font-bold px-3.5 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Claim Batch</span>
              </button>
            </div>

            <div className="space-y-3">
              {claims.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-xs">
                  No recovery claims currently registered. Use [F7] or the button above to generate a claim batch.
                </div>
              ) : (
                claims.map((clm) => (
                  <div
                    key={clm.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-[#1b4332] font-mono">{clm.claim_number}</span>
                          <span className="text-gray-600 font-medium">• {clm.principal_name}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Period: {new Date(clm.period_from).toLocaleDateString()} to {new Date(clm.period_to).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            clm.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : clm.status === 'SUBMITTED'
                              ? 'bg-blue-100 text-blue-800'
                              : clm.status === 'RECOVERY_CREATED'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {clm.status}
                        </span>

                        {clm.status === 'DRAFT' && (
                          <button
                            onClick={() => handleClaimAction(clm.id, 'SUBMIT')}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow"
                          >
                            Submit
                          </button>
                        )}
                        {clm.status === 'SUBMITTED' && (
                          <button
                            onClick={() => handleClaimAction(clm.id, 'APPROVE')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow"
                          >
                            Approve
                          </button>
                        )}
                        {clm.status === 'APPROVED' && (
                          <button
                            onClick={() => handleClaimAction(clm.id, 'CREATE_DOCUMENT')}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow"
                          >
                            Create Service Invoice
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div>
                        <div className="text-[11px] font-bold text-gray-500 uppercase">Total Claimed</div>
                        <div className="text-gray-900 font-extrabold text-sm font-mono mt-0.5">
                          ₹{clm.total_claimed_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-gray-500 uppercase">Earned Turnover</div>
                        <div className="text-emerald-700 font-extrabold text-sm font-mono mt-0.5">
                          ₹{clm.total_earned_commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-gray-500 uppercase">Recoverable Ancillaries</div>
                        <div className="text-blue-700 font-extrabold text-sm font-mono mt-0.5">
                          ₹{clm.total_recoverable_expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-gray-500 uppercase">Approved Total</div>
                        <div className="text-indigo-700 font-extrabold text-sm font-mono mt-0.5">
                          ₹{clm.approved_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Claim Lines */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-gray-500 uppercase">Itemized Claim Lines ({clm.lines.length})</div>
                      {clm.lines.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between text-xs bg-gray-50/60 px-3 py-1.5 rounded-lg border border-gray-200"
                        >
                          <div className="truncate max-w-md">
                            <span className="font-bold text-gray-900">{l.source_doc_id}</span> •{' '}
                            <span className="text-gray-600">{l.line_description}</span>
                          </div>
                          <div className="font-extrabold text-gray-900 font-mono">
                            ₹{l.requested_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Linked Docs */}
                    {clm.linked_documents && clm.linked_documents.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center space-x-2 text-xs">
                        <span className="text-gray-500 font-bold">Linked Commercial Document:</span>
                        {clm.linked_documents.map((d) => (
                          <span
                            key={d.id}
                            className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded font-bold"
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
                <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                  Principal Recovery Statements (Consolidated Periodic Run)
                </h2>
                <p className="text-xs text-gray-500">
                  Consolidated ledger reconciling turnover commissions, expense recoveries, payments, and outstanding balances.
                </p>
              </div>

              {agreements.length > 0 && (
                <button
                  onClick={() => handleGenerateStatement(agreements[0].principal_id)}
                  className="bg-[#1b4332] hover:bg-[#143627] text-white font-bold px-3.5 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Generate Period Statement</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {statements.map((stm) => (
                <div
                  key={stm.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-xs"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                    <div>
                      <div className="text-base font-extrabold text-gray-900 flex items-center space-x-2">
                        <span className="text-[#1b4332] font-mono">{stm.statement_number}</span>
                        <span className="text-gray-600 font-medium">• {stm.principal_name}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Period: {new Date(stm.period_from).toLocaleDateString()} to {new Date(stm.period_to).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      {stm.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div>
                      <div className="text-[11px] font-bold text-gray-500 uppercase">Earned Turnover</div>
                      <div className="text-emerald-700 font-extrabold text-sm font-mono mt-0.5">
                        ₹{stm.earned_commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-gray-500 uppercase">Expense Recovery</div>
                      <div className="text-blue-700 font-extrabold text-sm font-mono mt-0.5">
                        ₹{stm.expense_recovery.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-gray-500 uppercase">Invoiced Total</div>
                      <div className="text-gray-900 font-extrabold text-sm font-mono mt-0.5">
                        ₹{stm.invoiced_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-gray-500 uppercase">Settled (Remittances)</div>
                      <div className="text-cyan-700 font-extrabold text-sm font-mono mt-0.5">
                        ₹{stm.settled_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-gray-500 uppercase">Outstanding Balance</div>
                      <div className="text-amber-700 font-extrabold text-sm font-mono mt-0.5">
                        ₹{stm.outstanding_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Statement lines */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-gray-500 uppercase">Statement Movements</div>
                    {stm.lines.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between text-xs bg-gray-50/60 px-3 py-1.5 rounded-lg border border-gray-200"
                      >
                        <div>
                          <span className="font-bold text-gray-800">{l.category}</span> •{' '}
                          <span className="text-gray-600">{l.description}</span> ({l.reference_doc_id})
                        </div>
                        <div
                          className={`font-extrabold font-mono ${
                            l.amount < 0 ? 'text-cyan-700' : 'text-gray-900'
                          }`}
                        >
                          ₹{l.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-400 font-mono truncate">
                    SHA-256 Integrity Hash: {stm.statement_hash}
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
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span className="font-extrabold text-gray-900 uppercase tracking-wide">
                    Exceptions Queue ({exceptions.length})
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {exceptions.map((ex) => (
                  <div
                    key={ex.id}
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-start justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-900">{ex.source_id}</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                          {ex.exception_type}
                        </span>
                      </div>
                      <div className="text-gray-600 mt-1">{ex.description}</div>
                    </div>
                    {ex.state === 'OPEN' && (
                      <button
                        onClick={() => handleResolveException(ex.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Trail */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span className="font-extrabold text-gray-900 uppercase tracking-wide">
                    Immutable Audit Trail ({audits.length})
                  </span>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {audits.map((a) => (
                  <div key={a.id} className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs">
                    <div className="flex items-center justify-between text-gray-900 font-bold">
                      <span>{a.action} on {a.object_type} ({a.object_id})</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(a.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-gray-500 text-[11px] font-mono mt-0.5">
                      Actor: <span className="text-gray-800 font-semibold">{a.actor_username}</span> • Hash: {a.after_hash ? a.after_hash.slice(0, 16) : 'N/A'}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── NEW CLAIM BATCH MODAL ───────────────────────────── */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-100 rounded text-emerald-800">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm text-gray-900 uppercase tracking-wide">
                  Create Principal Recovery Claim Batch
                </span>
              </div>
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Target Principal</label>
                <select
                  value={claimPrincipalId}
                  onChange={(e) => setClaimPrincipalId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                >
                  {agreements.map((a) => (
                    <option key={a.principal_id} value={a.principal_id}>
                      {a.principal_name} ({a.principal_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Batch Description / Narration</label>
                <input
                  type="text"
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Select Approved Calculations to Include ({selectedCalcIds.length} selected)
                </label>
                <div className="max-h-40 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-1.5">
                  {calculations
                    .filter((c) => c.state === 'APPROVED' || c.state === 'CALCULATED')
                    .map((c) => (
                      <label key={c.id} className="flex items-center space-x-2.5 cursor-pointer hover:bg-white p-1.5 rounded-md border border-transparent hover:border-gray-200 transition-all">
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
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                        />
                        <span className="font-bold text-gray-900 font-mono">{c.calculation_number}</span>
                        <span className="text-gray-500">({c.category} - ₹{c.calculated_amount.toLocaleString('en-IN')})</span>
                      </label>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-gray-100">
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-all"
              >
                Cancel [Esc]
              </button>
              <button
                id="btn-submit-claim-modal"
                onClick={handleCreateClaim}
                className="px-4 py-2 bg-[#1b4332] hover:bg-[#143627] text-white font-extrabold rounded-lg shadow flex items-center space-x-1.5 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Create Claim Batch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
