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
  ExternalLink,
  Warehouse,
  Users,
  Truck,
  Briefcase,
  Edit3
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
  apiUpdateAgreementDealTerms,
  apiGetClientsByCompany,
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
      description: 'Standard C&F Master Agreement with 6.5% Net Commission, Godown Storage & Staff Reimbursement',
      agreement_type: 'CF_CONSIGNMENT_AGENT',
      payment_cycle: 'MONTHLY',
      dispute_grace_days: 15,
      minimum_guarantee_monthly: 25000.0,
      reimbursement_terms: {
        godown_storage: { borne_by: 'PRINCIPAL', reimbursable: true, monthly_rent: 18000.0, billing_mode: 'FIXED_MONTHLY' },
        staff_salaries: { borne_by: 'PRINCIPAL', reimbursable: true, monthly_budget: 28000.0, billing_mode: 'MONTHLY_OR_ACTUAL' },
        transportation: { borne_by: 'PRINCIPAL', reimbursable: true, billing_mode: 'ACTUAL_BILLS' },
        sales_commission: { rate_pct: 6.5, basis: 'CLIENT_SALES_TURNOVER' }
      }
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
      description: 'Consignment Distribution Agreement with 5.0% Gross Commission & Dedicated Depot Staff Reimbursement',
      agreement_type: 'CF_CONSIGNMENT_AGENT',
      payment_cycle: 'FORTNIGHTLY',
      dispute_grace_days: 10,
      minimum_guarantee_monthly: 20000.0,
      reimbursement_terms: {
        godown_storage: { borne_by: 'PRINCIPAL', reimbursable: true, monthly_rent: 15000.0, billing_mode: 'FIXED_MONTHLY' },
        staff_salaries: { borne_by: 'PRINCIPAL', reimbursable: true, monthly_budget: 22500.0, billing_mode: 'MONTHLY_OR_ACTUAL' },
        transportation: { borne_by: 'PRINCIPAL', reimbursable: true, billing_mode: 'ACTUAL_BILLS' },
        sales_commission: { rate_pct: 5.0, basis: 'CLIENT_SALES_TURNOVER' }
      }
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

export function CommissionControlCenter() {
  const navigate = useNavigate();

  // Navigation & View State
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

  // Mapped Clients for Selected Principal
  const [clients, setClients] = useState<any[]>([
    { party_id: 'c-apollo-001', legal_name: 'Apollo Pharmacy Ltd.', trade_name: 'Apollo Chemist' },
    { party_id: 'c-medplus-002', legal_name: 'MedPlus Health Services', trade_name: 'MedPlus Retail' },
    { party_id: 'c-fortis-003', legal_name: 'Fortis Hospital & Pharmacy', trade_name: 'Fortis Care' }
  ]);

  // Sandbox State
  const [sandboxPrincipalId, setSandboxPrincipalId] = useState<string>('');
  const [sandboxClientId, setSandboxClientId] = useState<string>('');
  const [sandboxClientName, setSandboxClientName] = useState<string>('');
  const [sandboxEventType, setSandboxEventType] = useState<string>('SALES_BILL');
  const [sandboxDocId, setSandboxDocId] = useState<string>('INV-2026-9951');
  const [sandboxBaseVal, setSandboxBaseVal] = useState<number>(250000);
  const [sandboxQty, setSandboxQty] = useState<number>(1);
  const [sandboxStaffSalary, setSandboxStaffSalary] = useState<number>(28000);
  const [sandboxGodownRent, setSandboxGodownRent] = useState<number>(18000);
  const [sandboxCategory, setSandboxCategory] = useState<string>('EARNED_COMMISSION');
  const [sandboxOutput, setSandboxOutput] = useState<CommissionCalculationItem | null>(null);

  // New Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState<boolean>(false);
  const [claimPrincipalId, setClaimPrincipalId] = useState<string>('');
  const [claimNotes, setClaimNotes] = useState<string>('Monthly C&F Commission & Expense Recovery Run');
  const [selectedCalcIds, setSelectedCalcIds] = useState<string[]>([]);

  // Deal Terms Editor Modal State
  const [isDealModalOpen, setIsDealModalOpen] = useState<boolean>(false);
  const [editingAgr, setEditingAgr] = useState<CommissionAgreementItem | null>(null);
  const [dealCargoBorne, setDealCargoBorne] = useState<string>('PRINCIPAL');
  const [dealStaffBorne, setDealStaffBorne] = useState<string>('PRINCIPAL');
  const [dealGodownBorne, setDealGodownBorne] = useState<string>('PRINCIPAL');
  const [dealStaffBudget, setDealStaffBudget] = useState<number>(28000);
  const [dealGodownRent, setDealGodownRent] = useState<number>(18000);
  const [dealCommissionRate, setDealCommissionRate] = useState<number>(6.5);

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
        const firstPId = agrRes.data[0].principal_id;
        if (!selectedPrincipalId) {
          setSelectedPrincipalId(firstPId);
          fetchClients(firstPId);
        }
        if (!sandboxPrincipalId) setSandboxPrincipalId(firstPId);
        if (!claimPrincipalId) setClaimPrincipalId(firstPId);
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

  const fetchClients = async (principalId: string) => {
    try {
      const res = await apiGetClientsByCompany(principalId);
      if (res && res.data && res.data.length > 0) {
        setClients(res.data);
      }
    } catch {
      // Keep demonstration fallbacks
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isClaimModalOpen || isDealModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsClaimModalOpen(false);
          setIsDealModalOpen(false);
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
  }, [isClaimModalOpen, isDealModalOpen, navigate]);

  // Execute Sandbox Run
  const handleRunSandbox = async () => {
    if (!sandboxPrincipalId) return;
    try {
      const res = await apiExecuteCommissionCalculation({
        principal_id: sandboxPrincipalId,
        event_type: sandboxEventType,
        source_doc_type: sandboxEventType === 'FREIGHT_COST' ? 'FREIGHT_EVENT' : (sandboxEventType === 'STAFF_SALARY' || sandboxEventType === 'GODOWN_RENT') ? 'VOUCHER' : 'INVOICE',
        source_doc_id: sandboxDocId,
        base_value: sandboxBaseVal,
        quantity: sandboxQty,
        category: (sandboxEventType === 'SALES_BILL' || sandboxEventType === 'SALES_RETURN') ? 'EARNED_COMMISSION' : 'RECOVERABLE_EXPENSE',
        client_id: sandboxClientId || undefined,
        client_name: sandboxClientName || undefined,
        custom_salary_amount: sandboxEventType === 'STAFF_SALARY' ? sandboxStaffSalary : undefined,
        custom_rent_amount: sandboxEventType === 'GODOWN_RENT' ? sandboxGodownRent : undefined
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

  // Claim Action (Submit / Approve / Invoice & Post to Purchase)
  const handleClaimAction = async (claimId: string, action: string) => {
    try {
      await apiTakeRecoveryClaimAction(claimId, { action, document_type: 'SERVICE_INVOICE' });
      loadData();
    } catch (err: any) {
      alert(`Claim action error: ${err.message || 'Failed to update claim'}`);
    }
  };

  // Create New Claim Batch
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

  // Open Deal Terms Editor Modal
  const handleOpenDealModal = (agr: CommissionAgreementItem) => {
    setEditingAgr(agr);
    const reimb = agr.terms_json?.reimbursement_terms || {};
    setDealCargoBorne(reimb.cargo_expenses?.borne_by || 'PRINCIPAL');
    setDealStaffBorne(reimb.staff_salaries?.borne_by || 'PRINCIPAL');
    setDealGodownBorne(reimb.godown_storage?.borne_by || 'PRINCIPAL');
    setDealStaffBudget(reimb.staff_salaries?.monthly_budget || 28000);
    setDealGodownRent(reimb.godown_storage?.monthly_rent || 18000);
    setDealCommissionRate(reimb.sales_commission?.rate_pct || (agr.rules[0]?.rate_pct || 6.5));
    setIsDealModalOpen(true);
  };

  // Save Deal Terms
  const handleSaveDealTerms = async () => {
    if (!editingAgr) return;
    try {
      await apiUpdateAgreementDealTerms(editingAgr.id, {
        agreement_type: 'CF_CONSIGNMENT_AGENT',
        cargo_expense_borne_by: dealCargoBorne,
        staff_salary_borne_by: dealStaffBorne,
        godown_storage_borne_by: dealGodownBorne,
        default_monthly_staff_salary: dealStaffBudget,
        default_monthly_godown_rent: dealGodownRent,
        sales_commission_rate: dealCommissionRate
      });
      setIsDealModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Error updating deal terms: ${err.message || 'Failed to update deal terms'}`);
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
                C&F & CONSIGNMENT RECOVERY ENGINE • DUAL-POSTING TO PURCHASE
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
              placeholder="Search agreement/client..."
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
              fetchClients(e.target.value);
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

        {/* Card 2: Recoverable Ancillaries */}
        <div id="kpi-recoverable-ancillaries" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">C&F Recharges</div>
          <div className="text-xl font-black text-gray-900 mt-1">
            ₹{summary.total_recoverable_expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-blue-700 font-medium flex items-center mt-1">
            <Truck className="w-3 h-3 mr-1 text-blue-600" />
            <span>Godown, Staff & Freight</span>
          </div>
        </div>

        {/* Card 3: Net Commercial Total */}
        <div id="kpi-net-commercial-total" className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-indigo-600 flex flex-col justify-between">
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
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Deals</div>
          <div className="text-xl font-black text-purple-900 mt-1">
            {summary.active_agreements_count} Principals
          </div>
          <div className="text-[10px] text-purple-700 font-medium flex items-center mt-1">
            <Lock className="w-3 h-3 mr-1 text-purple-600" />
            <span>C&F Service Master</span>
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
              {activePrincipal.terms_json?.agreement_type || 'C&F CONSIGNMENT AGENT'}
            </span>
          </div>

          <div className="flex items-center space-x-4 text-gray-600 font-medium">
            <div>Commission Rate: <span className="text-emerald-800 font-extrabold">{activePrincipal.terms_json?.reimbursement_terms?.sales_commission?.rate_pct || 6.5}%</span></div>
            <div>Godown Rent: <span className="text-gray-900 font-bold">₹{activePrincipal.terms_json?.reimbursement_terms?.godown_storage?.monthly_rent || 18000}/mo</span></div>
            <div>Staff Salaries: <span className="text-gray-900 font-bold">₹{activePrincipal.terms_json?.reimbursement_terms?.staff_salaries?.monthly_budget || 28000}/mo</span></div>
            <div>Freight: <span className="text-blue-700 font-bold">{activePrincipal.terms_json?.reimbursement_terms?.transportation?.borne_by || 'PRINCIPAL REIMBURSES'}</span></div>
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
            <span>[F2] Agreements & C&F Deal Terms</span>
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
            <FileCheck className="w-4 h-4" />
            <span>[F4] Claims & Purchase Inward</span>
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
            <span>[F5] Statements Desk</span>
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

        <div className="hidden lg:flex items-center text-xs text-emerald-800 font-mono pr-2 font-bold">
          <span>DUAL-POSTING: SERVICE INVOICE + INWARD PURCHASE BILL</span>
        </div>
      </div>

      {/* ── TAB CONTENT WORKSPACE ───────────────────────────── */}
      <div className="space-y-4">
        {/* TAB 1: AGREEMENTS & C&F DEAL TERMS */}
        {activeTab === 'AGREEMENTS' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {agreements.map((agr) => {
              const reimb = agr.terms_json?.reimbursement_terms || {};
              const godown = reimb.godown_storage || { borne_by: 'PRINCIPAL', monthly_rent: 18000 };
              const staff = reimb.staff_salaries || { borne_by: 'PRINCIPAL', monthly_budget: 28000 };
              const trans = reimb.transportation || { borne_by: 'PRINCIPAL' };
              const comm = reimb.sales_commission || { rate_pct: 6.5 };

              return (
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
                          {agr.agreement_code} • C&F Consignment Model ({agr.version_no})
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenDealModal(agr)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center space-x-1 shadow-sm transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Deal Terms</span>
                      </button>
                    </div>

                    {/* C&F Consigning Agent 4-Pillar Service Matrix */}
                    <div className="mb-4">
                      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>C&F Infrastructure & Reimbursement Deal</span>
                        <span className="text-emerald-700 font-mono font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          CONSIGNING AGENT CONTRACT
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* 1. Godown Storage */}
                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-1.5 text-gray-700 font-bold mb-1">
                            <Warehouse className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Godown & Storage</span>
                          </div>
                          <div className="text-[11px] text-gray-600">
                            Deal: <span className="font-extrabold text-emerald-800">{godown.borne_by === 'PRINCIPAL' ? 'Principal Reimburses' : 'We Absorb'}</span>
                          </div>
                          <div className="text-[11px] font-mono font-bold text-gray-900 mt-0.5">
                            Rent: ₹{godown.monthly_rent?.toLocaleString('en-IN')}/mo
                          </div>
                        </div>

                        {/* 2. Dedicated Staff Salaries */}
                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-1.5 text-gray-700 font-bold mb-1">
                            <Users className="w-3.5 h-3.5 text-blue-700" />
                            <span>Staff Salaries</span>
                          </div>
                          <div className="text-[11px] text-gray-600">
                            Deal: <span className="font-extrabold text-blue-800">{staff.borne_by === 'PRINCIPAL' ? 'Principal Reimburses' : 'We Pay'}</span>
                          </div>
                          <div className="text-[11px] font-mono font-bold text-gray-900 mt-0.5">
                            Budget: ₹{staff.monthly_budget?.toLocaleString('en-IN')}/mo
                          </div>
                        </div>

                        {/* 3. Transportation & Cargo */}
                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-1.5 text-gray-700 font-bold mb-1">
                            <Truck className="w-3.5 h-3.5 text-amber-700" />
                            <span>Transportation</span>
                          </div>
                          <div className="text-[11px] text-gray-600">
                            Deal: <span className="font-extrabold text-amber-800">{trans.borne_by === 'PRINCIPAL' ? 'Principal Reimburses' : 'We Absorb'}</span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                            100% Inward/Outward LR
                          </div>
                        </div>

                        {/* 4. Sales Commission % */}
                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-1.5 text-gray-700 font-bold mb-1">
                            <TrendingUp className="w-3.5 h-3.5 text-purple-700" />
                            <span>Sales Commission</span>
                          </div>
                          <div className="text-[11px] text-gray-600">
                            Rate: <span className="font-extrabold text-purple-800">{comm.rate_pct || 6.5}% Net Sales</span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                            Client Turnover Basis
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mapped Clients Section */}
                    <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg text-xs mb-3">
                      <div className="font-bold text-emerald-950 flex items-center justify-between mb-1.5">
                        <span>Mapped Client Companies (Product Buyers)</span>
                        <span className="text-[10px] text-emerald-700 font-normal">Sales of these clients compute commission</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {clients.map((c: any) => (
                          <span key={c.party_id} className="bg-white border border-emerald-200 text-emerald-900 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {c.legal_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
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
              );
            })}
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
                      Simulate on-the-fly client sales turnover commissions or C&F service reimbursements (Godown, Staff Salaries, Freight).
                    </p>
                  </div>
                </div>
                <span className="bg-emerald-50 text-emerald-800 text-xs font-mono font-bold px-2.5 py-1 rounded border border-emerald-200">
                  C&F CONSIGNMENT REIMBURSEMENT
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-xs">
                {/* 1. Principal */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Company / Principal</label>
                  <select
                    value={sandboxPrincipalId}
                    onChange={(e) => {
                      setSandboxPrincipalId(e.target.value);
                      fetchClients(e.target.value);
                    }}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  >
                    {agreements.map((a) => (
                      <option key={a.principal_id} value={a.principal_id}>
                        {a.principal_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Client Selection */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Client (Buyer)</label>
                  <select
                    value={sandboxClientId}
                    onChange={(e) => {
                      setSandboxClientId(e.target.value);
                      const cl = clients.find(c => c.party_id === e.target.value);
                      setSandboxClientName(cl ? cl.legal_name : '');
                    }}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  >
                    <option value="">All Clients (Aggregate)</option>
                    {clients.map((c) => (
                      <option key={c.party_id} value={c.party_id}>
                        {c.legal_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Event Type */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">C&F Service / Event Type</label>
                  <select
                    value={sandboxEventType}
                    onChange={(e) => {
                      setSandboxEventType(e.target.value);
                      if (e.target.value === 'SALES_BILL' || e.target.value === 'SALES_RETURN') {
                        setSandboxCategory('EARNED_COMMISSION');
                      } else {
                        setSandboxCategory('RECOVERABLE_EXPENSE');
                      }
                    }}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-400 focus:bg-white font-bold"
                  >
                    <option value="SALES_BILL">SALES_BILL (% Commission on Client Sales)</option>
                    <option value="GODOWN_RENT">GODOWN_RENT (Godown & Storage Services)</option>
                    <option value="STAFF_SALARY">STAFF_SALARY (Dedicated Staff Salaries)</option>
                    <option value="FREIGHT_COST">FREIGHT_COST (Transportation & Cargo)</option>
                    <option value="STORAGE_CHARGE">STORAGE_CHARGE (Depot Handling Charges)</option>
                    <option value="LOADING_CHARGE">LOADING_CHARGE (Consignment Loading)</option>
                  </select>
                </div>

                {/* 4. Dynamic Amount / Base Value */}
                {sandboxEventType === 'STAFF_SALARY' ? (
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Staff Salary (₹) [Monthly / Manual]</label>
                    <input
                      type="number"
                      value={sandboxStaffSalary}
                      onChange={(e) => setSandboxStaffSalary(parseFloat(e.target.value) || 0)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-blue-900 font-mono font-extrabold focus:ring-2 focus:ring-blue-400 focus:bg-white"
                    />
                  </div>
                ) : sandboxEventType === 'GODOWN_RENT' ? (
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Godown Rent (₹) [Agreement / Manual]</label>
                    <input
                      type="number"
                      value={sandboxGodownRent}
                      onChange={(e) => setSandboxGodownRent(parseFloat(e.target.value) || 0)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-emerald-900 font-mono font-extrabold focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Sales Turnover / Base (₹)</label>
                    <input
                      type="number"
                      value={sandboxBaseVal}
                      onChange={(e) => setSandboxBaseVal(parseFloat(e.target.value) || 0)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 font-mono font-bold focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                    />
                  </div>
                )}

                {/* 5. Source Doc ID */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Voucher / Bill ID</label>
                  <input
                    type="text"
                    value={sandboxDocId}
                    onChange={(e) => setSandboxDocId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 font-mono font-medium focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  />
                </div>

                {/* 6. Run Calculation Button */}
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
                    C&F Service reimbursements & client sales commissions ready for claims batching
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5">Calc Number</th>
                      <th className="px-4 py-2.5">Company / Principal</th>
                      <th className="px-4 py-2.5">C&F Service Type</th>
                      <th className="px-4 py-2.5">Client Buyer</th>
                      <th className="px-4 py-2.5">Base (₹)</th>
                      <th className="px-4 py-2.5">Calculated (₹)</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Trace / Details</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {calculations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                          No calculations recorded. Run a simulation using the sandbox above.
                        </td>
                      </tr>
                    ) : (
                      calculations.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-2.5 font-mono font-bold text-gray-900">{c.calculation_number}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{c.principal_name}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.event_type === 'SALES_BILL'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.event_type === 'GODOWN_RENT'
                                  ? 'bg-blue-100 text-blue-800'
                                  : c.event_type === 'STAFF_SALARY'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {c.event_type || c.category}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-700 font-medium">
                            {c.client_name || 'All Clients'}
                          </td>
                          <td className="px-4 py-2.5 font-mono">₹{c.base_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2.5 font-mono font-black text-gray-900">
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
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {c.state}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[11px] text-gray-600 max-w-xs truncate" title={c.formula_trace}>
                            {c.formula_trace}
                          </td>
                          <td className="px-4 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                            {c.state === 'CALCULATED' && (
                              <>
                                <button
                                  onClick={() => handleCalcAction(c.id, 'APPROVE')}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold shadow-sm"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleCalcAction(c.id, 'DISPUTE')}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold shadow-sm"
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

        {/* TAB 3: CLAIMS & PURCHASE INWARD DESK */}
        {activeTab === 'CLAIMS' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                  C&F Commission & Expense Recovery Claims Desk
                </h2>
                <p className="text-xs text-gray-500">
                  Batch approved client sales commission, godown storage, dedicated staff salaries, and freight into a formal bill.
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
                            Submit Claim
                          </button>
                        )}
                        {clm.status === 'SUBMITTED' && (
                          <button
                            onClick={() => handleClaimAction(clm.id, 'APPROVE')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow"
                          >
                            Approve Claim
                          </button>
                        )}
                        {clm.status === 'APPROVED' && (
                          <button
                            onClick={() => handleClaimAction(clm.id, 'CREATE_DOCUMENT')}
                            className="px-3 py-1 bg-[#1b4332] hover:bg-[#143627] text-white rounded-lg text-xs font-bold shadow flex items-center space-x-1"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Generate Bill & Post to Purchase</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Financial KPI bar */}
                    <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3 text-xs">
                      <div>
                        <div className="text-[11px] font-bold text-gray-500 uppercase">Sales Commission</div>
                        <div className="text-emerald-700 font-extrabold text-sm font-mono mt-0.5">
                          ₹{clm.total_earned_commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-gray-500 uppercase">C&F Recharges (Godown+Staff+Freight)</div>
                        <div className="text-blue-700 font-extrabold text-sm font-mono mt-0.5">
                          ₹{clm.total_recoverable_expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-gray-500 uppercase">Total Bill Amount</div>
                        <div className="text-indigo-700 font-extrabold text-sm font-mono mt-0.5">
                          ₹{clm.total_claimed_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

                    {/* Linked Docs - DUAL POSTING DISPLAY */}
                    {clm.linked_documents && clm.linked_documents.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-gray-700 font-extrabold">Commercial Documents:</span>
                        {clm.linked_documents.map((d) => {
                          if (d.document_type === 'PURCHASE_BILL') {
                            return (
                              <button
                                key={d.id}
                                onClick={() => navigate('/purchase/list')}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-all shadow-sm"
                                title="Click to view in Purchase Section (/purchase/list)"
                              >
                                <span>Inward Purchase Bill: {d.document_number}</span>
                                <span className="bg-emerald-700 text-white text-[10px] px-1.5 py-0.2 rounded font-mono">POSTED TO PURCHASE</span>
                                <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                              </button>
                            );
                          }
                          return (
                            <span
                              key={d.id}
                              className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-lg font-bold"
                            >
                              Service Invoice: {d.document_number} (₹{d.amount.toLocaleString('en-IN')})
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: STATEMENTS DESK */}
        {activeTab === 'STATEMENTS' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                  Principal Recovery Statements (Periodic Consolidated Ledger)
                </h2>
                <p className="text-xs text-gray-500">
                  Reconstruct entire commercial position: Earned commissions, expense recoveries, claims invoiced, and balance due.
                </p>
              </div>
              <button
                onClick={() => handleGenerateStatement(selectedPrincipalId)}
                className="bg-[#1b4332] hover:bg-[#143627] text-white font-bold px-3.5 py-2 rounded-lg text-xs shadow flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Run Periodic Statement</span>
              </button>
            </div>

            <div className="space-y-3">
              {statements.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-xs">
                  No statements generated yet. Click 'Run Periodic Statement' above to generate.
                </div>
              ) : (
                statements.map((s) => (
                  <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                      <div>
                        <div className="text-sm font-extrabold text-[#1b4332] font-mono">{s.statement_number}</div>
                        <div className="text-[11px] text-gray-500">
                          {s.principal_name} • Period: {new Date(s.period_from).toLocaleDateString()} to {new Date(s.period_to).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded text-xs font-mono">
                        {s.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
                      <div>
                        <div className="text-gray-500 text-[10px] uppercase font-bold">Earned Commission</div>
                        <div className="text-emerald-700 font-extrabold font-mono text-sm">
                          ₹{s.earned_commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-[10px] uppercase font-bold">Expense Recovery</div>
                        <div className="text-blue-700 font-extrabold font-mono text-sm">
                          ₹{s.expense_recovery.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-[10px] uppercase font-bold">Settled Remittances</div>
                        <div className="text-gray-900 font-extrabold font-mono text-sm">
                          ₹{s.settled_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-[10px] uppercase font-bold">Outstanding Balance Due</div>
                        <div className="text-purple-700 font-extrabold font-mono text-sm">
                          ₹{s.outstanding_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-400 font-mono truncate">
                      Cryptographic Statement Hash: {s.statement_hash || 'SHA256-PENDING-VALIDATION'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: EXCEPTIONS & AUDIT TRAIL */}
        {activeTab === 'EXCEPTIONS' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Exceptions */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="font-extrabold text-gray-900 uppercase tracking-wide">
                    Exceptions Quarantine Queue ({exceptions.length})
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {exceptions.map((ex) => (
                  <div key={ex.id} className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
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
                <label className="block text-gray-700 font-bold mb-1">Target Principal / Company</label>
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
                  Select Approved Calculations to Batch ({selectedCalcIds.length} selected)
                </label>
                <div className="border border-gray-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-gray-50">
                  {calculations.filter(c => c.state !== 'CANCELLED').length === 0 ? (
                    <div className="text-gray-400 text-center py-4">No active calculations available.</div>
                  ) : (
                    calculations.filter(c => c.state !== 'CANCELLED').map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center space-x-2.5 p-2 bg-white rounded-lg border border-gray-200 hover:bg-emerald-50/50 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCalcIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCalcIds([...selectedCalcIds, c.id]);
                            else setSelectedCalcIds(selectedCalcIds.filter(id => id !== c.id));
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1 truncate">
                          <div className="font-bold text-gray-900 flex items-center space-x-2">
                            <span>{c.calculation_number}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-700 font-mono px-1.5 py-0.2 rounded">
                              {c.event_type || c.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">{c.formula_trace}</div>
                        </div>
                        <div className="font-mono font-bold text-gray-900">
                          ₹{c.calculated_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-all"
              >
                Cancel [Esc]
              </button>
              <button
                id="btn-submit-claim-modal"
                onClick={handleCreateClaim}
                className="px-4 py-2 bg-[#1b4332] hover:bg-[#143627] text-white rounded-lg font-bold shadow transition-all"
              >
                Create Claim Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── C&F DEAL TERMS EDITOR MODAL ───────────────────────── */}
      {isDealModalOpen && editingAgr && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-100 rounded text-emerald-800">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wide">
                    Configure C&F Deal & Reimbursement Terms
                  </h3>
                  <p className="text-[11px] text-gray-500">{editingAgr.principal_name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDealModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 1. Godown Storage Terms */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-800 flex items-center space-x-1.5">
                    <Warehouse className="w-4 h-4 text-emerald-700" />
                    <span>Godown & Storage Expense Deal</span>
                  </label>
                  <select
                    value={dealGodownBorne}
                    onChange={(e) => setDealGodownBorne(e.target.value)}
                    className="bg-white border border-gray-300 rounded px-2 py-1 font-bold text-xs"
                  >
                    <option value="PRINCIPAL">Principal Reimburses (Recoverable)</option>
                    <option value="DISTRIBUTOR">Distributor Absorbs (We Pay)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Monthly Godown Rent / Maintenance (₹)</label>
                  <input
                    type="number"
                    value={dealGodownRent}
                    onChange={(e) => setDealGodownRent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 font-mono font-bold"
                  />
                </div>
              </div>

              {/* 2. Staff Salaries Terms */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-800 flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-blue-700" />
                    <span>Dedicated Staff Salaries Deal</span>
                  </label>
                  <select
                    value={dealStaffBorne}
                    onChange={(e) => setDealStaffBorne(e.target.value)}
                    className="bg-white border border-gray-300 rounded px-2 py-1 font-bold text-xs"
                  >
                    <option value="PRINCIPAL">Principal Reimburses (Recoverable)</option>
                    <option value="DISTRIBUTOR">Distributor Pays (We Pay)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Standard Monthly Staff Salaries Budget (₹)</label>
                  <input
                    type="number"
                    value={dealStaffBudget}
                    onChange={(e) => setDealStaffBudget(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 font-mono font-bold"
                  />
                </div>
              </div>

              {/* 3. Transportation Terms */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                <label className="font-bold text-gray-800 flex items-center space-x-1.5">
                  <Truck className="w-4 h-4 text-amber-700" />
                  <span>Transportation & Freight Expenses</span>
                </label>
                <select
                  value={dealCargoBorne}
                  onChange={(e) => setDealCargoBorne(e.target.value)}
                  className="bg-white border border-gray-300 rounded px-2 py-1 font-bold text-xs"
                >
                  <option value="PRINCIPAL">Principal Reimburses (100% Recharge)</option>
                  <option value="DISTRIBUTOR">Distributor Absorbs (We Pay)</option>
                </select>
              </div>

              {/* 4. Sales Commission % */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                <label className="font-bold text-gray-800 flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-purple-700" />
                  <span>Sales Turnover Commission Rate (%)</span>
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="0.1"
                    value={dealCommissionRate}
                    onChange={(e) => setDealCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-white border border-gray-300 rounded px-2 py-1 font-mono font-bold text-right"
                  />
                  <span className="font-bold text-gray-600">%</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsDealModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-all"
              >
                Cancel [Esc]
              </button>
              <button
                onClick={handleSaveDealTerms}
                className="px-4 py-2 bg-[#1b4332] hover:bg-[#143627] text-white rounded-lg font-bold shadow transition-all"
              >
                Save Deal Terms
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommissionControlCenter;
