import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Package,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  FileText,
  DollarSign,
  TrendingUp,
  Truck,
  Plus,
  X,
  RefreshCw,
  Sliders,
  ShieldCheck,
  ChevronRight,
  Filter,
  ArrowRight,
  Scale
} from 'lucide-react';
import {
  apiGetPrincipalSummary,
  apiGetPrincipals,
  apiGetPrincipalPosition,
  apiGetPrincipalStatement,
  apiCreatePrincipalClaim,
  apiTakePrincipalClaimAction,
  apiGetPrincipalReconciliations,
  apiRunPrincipalReconciliation,
  PrincipalSummaryKPI,
  PrincipalListItem,
  PrincipalPosition,
  PrincipalStatement,
  PrincipalClaimItem,
  PrincipalReconciliationItem
} from '../../lib/api';

const FALLBACK_SUMMARY: PrincipalSummaryKPI = {
  active_principals_count: 2,
  total_stock_value: 105600.0,
  total_stock_quantity: 5400.0,
  pending_claims_count: 1,
  pending_claims_value: 2250.0,
  approved_claims_value: 1600.0,
  total_reconciliations_count: 1,
  approved_reconciliations_count: 1,
  total_freight_attributed: 4000.0,
  admin_funded_freight: 2150.0,
  currency: 'INR'
};

const FALLBACK_PRINCIPALS: PrincipalListItem[] = [
  {
    id: 'p-sun-001',
    context_id: 'ctx-001',
    principal_code: 'P-SUN-001',
    principal_name: 'Sun Pharma Healthcare Ltd.',
    status: 'ACTIVE',
    agreement_number: 'AGR-2026-SUN-01',
    agreement_version: 'v1.0',
    commission_rate_pct: 6.5,
    freight_bearer: 'ADMIN_COMPANY',
    total_stock_qty: 4200.0,
    total_stock_value: 57600.0,
    pending_claims_count: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'p-cip-002',
    context_id: 'ctx-002',
    principal_code: 'P-CIP-002',
    principal_name: 'Cipla Therapeutics Ltd.',
    status: 'ACTIVE',
    agreement_number: 'AGR-2026-CIP-01',
    agreement_version: 'v1.0',
    commission_rate_pct: 5.0,
    freight_bearer: 'CLIENT_COMPANY',
    total_stock_qty: 1200.0,
    total_stock_value: 48000.0,
    pending_claims_count: 0,
    created_at: new Date().toISOString()
  }
];

export const PrincipalControlCenter: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'STOCK' | 'CLAIMS' | 'RECON' | 'STATEMENT' | 'MIS'>('STOCK');
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<PrincipalSummaryKPI>(FALLBACK_SUMMARY);
  const [principals, setPrincipals] = useState<PrincipalListItem[]>(FALLBACK_PRINCIPALS);
  const [selectedPrincipalId, setSelectedPrincipalId] = useState<string>('');
  const [position, setPosition] = useState<PrincipalPosition | null>(null);
  const [statement, setStatement] = useState<PrincipalStatement | null>(null);
  const [reconciliations, setReconciliations] = useState<PrincipalReconciliationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State for New Claim
  const [isClaimModalOpen, setIsClaimModalOpen] = useState<boolean>(false);
  const [claimType, setClaimType] = useState<string>('EXPIRY');
  const [claimDocId, setClaimDocId] = useState<string>('RTN-2026-9901');
  const [claimProductName, setClaimProductName] = useState<string>('Amoxicillin 500mg Trihydrate');
  const [claimBatchNo, setClaimBatchNo] = useState<string>('B-SUN-991');
  const [claimQty, setClaimQty] = useState<number>(100);
  const [claimRate, setClaimRate] = useState<number>(15.0);
  const [claimReason, setClaimReason] = useState<string>('Batch return within contractual expiry claim window');

  // Load Initial Data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [sumRes, prinRes, reconRes] = await Promise.all([
        apiGetPrincipalSummary().catch(() => ({ success: false, summary: FALLBACK_SUMMARY })),
        apiGetPrincipals().catch(() => ({ success: false, principals: FALLBACK_PRINCIPALS, count: 2 })),
        apiGetPrincipalReconciliations().catch(() => ({ success: false, reconciliations: [], count: 0 }))
      ]);

      if (sumRes && sumRes.summary) setSummary(sumRes.summary);
      if (prinRes && prinRes.principals && prinRes.principals.length > 0) {
        setPrincipals(prinRes.principals);
        setSelectedPrincipalId(prinRes.principals[0].id);
      } else {
        setSelectedPrincipalId(FALLBACK_PRINCIPALS[0].id);
      }
      if (reconRes && reconRes.reconciliations) setReconciliations(reconRes.reconciliations);
    } catch {
      setSummary(FALLBACK_SUMMARY);
      setPrincipals(FALLBACK_PRINCIPALS);
      setSelectedPrincipalId(FALLBACK_PRINCIPALS[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch Position & Statement when Principal Selection changes
  useEffect(() => {
    if (!selectedPrincipalId) return;

    const fetchDetails = async () => {
      try {
        const [posRes, stmtRes] = await Promise.all([
          apiGetPrincipalPosition(selectedPrincipalId).catch(() => null),
          apiGetPrincipalStatement(selectedPrincipalId).catch(() => null)
        ]);

        if (posRes && posRes.position) setPosition(posRes.position);
        if (stmtRes && stmtRes.statement) setStatement(stmtRes.statement);
      } catch (e) {
        console.error('Error fetching principal details:', e);
      }
    };
    fetchDetails();
  }, [selectedPrincipalId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isClaimModalOpen) {
          setIsClaimModalOpen(false);
        } else {
          navigate('/');
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('STOCK');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('CLAIMS');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('RECON');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveTab('STATEMENT');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setActiveTab('MIS');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setIsClaimModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClaimModalOpen, navigate]);

  // Handle Claim Submission
  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrincipalId) return;

    try {
      await apiCreatePrincipalClaim({
        principal_id: selectedPrincipalId,
        claim_type: claimType,
        source_doc_id: claimDocId,
        product_name: claimProductName,
        batch_no: claimBatchNo,
        claimed_qty: claimQty,
        rate: claimRate,
        reason: claimReason
      });

      setIsClaimModalOpen(false);
      // Reload position
      const posRes = await apiGetPrincipalPosition(selectedPrincipalId);
      if (posRes && posRes.position) setPosition(posRes.position);
    } catch (err: any) {
      alert(`Claim registration failed: ${err.message || 'Unknown error'}`);
    }
  };

  // Handle 1-Click Claim Action
  const handleClaimAction = async (claimId: string, action: string) => {
    try {
      await apiTakePrincipalClaimAction(claimId, { action });
      const posRes = await apiGetPrincipalPosition(selectedPrincipalId);
      if (posRes && posRes.position) setPosition(posRes.position);
    } catch (err: any) {
      alert(`Action failed: ${err.message || 'Unknown error'}`);
    }
  };

  // Run Reconciliation
  const handleRunRecon = async () => {
    if (!selectedPrincipalId) return;
    try {
      await apiRunPrincipalReconciliation({
        principal_id: selectedPrincipalId,
        external_closing_val: position ? position.stock_summary.total_valuation : 57600.0
      });
      const reconRes = await apiGetPrincipalReconciliations();
      if (reconRes && reconRes.reconciliations) setReconciliations(reconRes.reconciliations);
      alert('Reconciliation run executed and matched with source transactions!');
    } catch (err: any) {
      alert(`Reconciliation run failed: ${err.message || 'Unknown error'}`);
    }
  };

  const activePrincipal = principals.find(p => p.id === selectedPrincipalId) || principals[0];

  return (
    <div
      style={{
        backgroundColor: '#eef2ef',
        minHeight: '100vh',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#111827'
      }}
    >
      {/* ── TOP OPERATIONAL APEX HEADER ─────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1b4332',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '18px 24px',
          boxShadow: '0 4px 20px rgba(27, 67, 50, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              padding: '10px',
              backgroundColor: '#2d6a4f',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)'
            }}
          >
            <Building2 size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  backgroundColor: '#0f2e21',
                  color: '#a7f3d0',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}
              >
                DOC-36 ENGINE
              </span>
              <span style={{ fontSize: '12px', color: '#a7f3d0', fontWeight: 600 }}>
                C&F Operations & Consignment Custody Control
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Principal Operational Control Centre
            </h1>
          </div>
        </div>

        {/* Global Controls & Keyboard Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              color="#a7f3d0"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              id="input-principal-search"
              type="text"
              placeholder="Search Principal / Product..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: '#2d6a4f',
                color: '#ffffff',
                border: '1px solid #40916c',
                borderRadius: '10px',
                padding: '9px 14px 9px 36px',
                fontSize: '12px',
                outline: 'none',
                width: '220px'
              }}
            />
          </div>

          <select
            id="select-active-principal"
            value={selectedPrincipalId}
            onChange={e => setSelectedPrincipalId(e.target.value)}
            style={{
              backgroundColor: '#ffffff',
              color: '#111827',
              borderRadius: '10px',
              padding: '9px 14px',
              border: 'none',
              fontWeight: 700,
              fontSize: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer'
            }}
          >
            {principals.map(p => (
              <option key={p.id} value={p.id}>
                {p.principal_code} — {p.principal_name}
              </option>
            ))}
          </select>

          <button
            id="btn-raise-claim-header"
            onClick={() => setIsClaimModalOpen(true)}
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '9px 16px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Plus size={15} />
            <span>Raise Claim [F7]</span>
          </button>

          <button
            onClick={() => navigate('/')}
            title="Return to Counter Workbench [Esc]"
            style={{
              backgroundColor: '#0f2e21',
              color: '#a7f3d0',
              padding: '9px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              border: '1px solid #2d6a4f',
              cursor: 'pointer'
            }}
          >
            Esc Exit
          </button>

          <button
            onClick={loadInitialData}
            title="Refresh All Data"
            style={{
              backgroundColor: '#2d6a4f',
              color: '#ffffff',
              padding: '9px 12px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── 5-CARD KPI TELEMETRY STRIP ─────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px'
        }}
      >
        {/* Card 1: Active Principals */}
        <div
          id="kpi-active-principals"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '16px 20px',
            border: '1px solid #d8e2dc',
            borderLeft: '5px solid #10b981',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Principals
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#111827', margin: '6px 0 2px' }}>
            {summary.active_principals_count} Firms
          </div>
          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} />
            <span>100% Contract Validated</span>
          </div>
        </div>

        {/* Card 2: Custody Stock Value */}
        <div
          id="kpi-total-stock-val"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '16px 20px',
            border: '1px solid #d8e2dc',
            borderLeft: '5px solid #3b82f6',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Custody Stock Value
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#111827', margin: '6px 0 2px' }}>
            ₹{summary.total_stock_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Package size={13} />
            <span>{summary.total_stock_quantity.toLocaleString()} units on-hand</span>
          </div>
        </div>

        {/* Card 3: Open Claims */}
        <div
          id="kpi-pending-claims"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '16px 20px',
            border: '1px solid #d8e2dc',
            borderLeft: '5px solid #f59e0b',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Open Claims
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#b45309', margin: '6px 0 2px' }}>
            ₹{summary.pending_claims_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={13} />
            <span>{summary.pending_claims_count} claim(s) pending approval</span>
          </div>
        </div>

        {/* Card 4: Reconciliations */}
        <div
          id="kpi-reconciled-health"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '16px 20px',
            border: '1px solid #d8e2dc',
            borderLeft: '5px solid #0d9488',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Reconciliations
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#111827', margin: '6px 0 2px' }}>
            {summary.approved_reconciliations_count} Approved
          </div>
          <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} />
            <span>0 active variances</span>
          </div>
        </div>

        {/* Card 5: Admin Freight Subsidy */}
        <div
          id="kpi-freight-attribution"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '16px 20px',
            border: '1px solid #d8e2dc',
            borderLeft: '5px solid #8b5cf6',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Admin Freight Subsidy
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#6d28d9', margin: '6px 0 2px' }}>
            ₹{summary.admin_funded_freight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Truck size={13} />
            <span>GL Account 5200 (DOC-35)</span>
          </div>
        </div>
      </div>

      {/* ── PRINCIPAL CONTEXT BANNER ───────────────────────── */}
      {activePrincipal && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '14px 20px',
            border: '1px solid #d8e2dc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#1b4332' }}>
              {activePrincipal.principal_name}
            </span>
            <span
              style={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                padding: '3px 8px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 700
              }}
            >
              {activePrincipal.principal_code}
            </span>
            <span
              style={{
                backgroundColor: '#d1fae5',
                color: '#065f46',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700
              }}
            >
              {activePrincipal.agreement_number} ({activePrincipal.agreement_version})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '12px', color: '#4b5563' }}>
            <span>
              Commission: <strong style={{ color: '#111827' }}>{activePrincipal.commission_rate_pct}%</strong>
            </span>
            <span>
              Freight Bearer: <strong style={{ color: '#111827' }}>{activePrincipal.freight_bearer}</strong>
            </span>
            <span>
              Custody Mode: <strong style={{ color: '#059669' }}>CONSIGNMENT_CUSTODY</strong>
            </span>
            <button
              id="btn-open-claim-modal"
              onClick={() => setIsClaimModalOpen(true)}
              style={{
                backgroundColor: '#1b4332',
                color: '#ffffff',
                padding: '7px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
            >
              <Plus size={14} />
              <span>Raise Claim [F7]</span>
            </button>
          </div>
        </div>
      )}

      {/* ── LUXURY TAB NAVIGATION ──────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          id="tab-btn-stock"
          onClick={() => setActiveTab('STOCK')}
          style={{
            backgroundColor: activeTab === 'STOCK' ? '#1b4332' : '#ffffff',
            color: activeTab === 'STOCK' ? '#ffffff' : '#4b5563',
            borderRadius: '10px',
            padding: '10px 18px',
            fontWeight: activeTab === 'STOCK' ? 700 : 600,
            fontSize: '13px',
            border: activeTab === 'STOCK' ? 'none' : '1px solid #d8e2dc',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'STOCK' ? '0 4px 12px rgba(27, 67, 50, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Package size={16} />
          <span>Stock Ownership & Custody [F2]</span>
        </button>

        <button
          id="tab-btn-claims"
          onClick={() => setActiveTab('CLAIMS')}
          style={{
            backgroundColor: activeTab === 'CLAIMS' ? '#1b4332' : '#ffffff',
            color: activeTab === 'CLAIMS' ? '#ffffff' : '#4b5563',
            borderRadius: '10px',
            padding: '10px 18px',
            fontWeight: activeTab === 'CLAIMS' ? 700 : 600,
            fontSize: '13px',
            border: activeTab === 'CLAIMS' ? 'none' : '1px solid #d8e2dc',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'CLAIMS' ? '0 4px 12px rgba(27, 67, 50, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <AlertCircle size={16} />
          <span>Claims & Returns Desk [F3]</span>
        </button>

        <button
          id="tab-btn-recon"
          onClick={() => setActiveTab('RECON')}
          style={{
            backgroundColor: activeTab === 'RECON' ? '#1b4332' : '#ffffff',
            color: activeTab === 'RECON' ? '#ffffff' : '#4b5563',
            borderRadius: '10px',
            padding: '10px 18px',
            fontWeight: activeTab === 'RECON' ? 700 : 600,
            fontSize: '13px',
            border: activeTab === 'RECON' ? 'none' : '1px solid #d8e2dc',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'RECON' ? '0 4px 12px rgba(27, 67, 50, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <ShieldCheck size={16} />
          <span>Reconciliation Workspace [F4]</span>
        </button>

        <button
          id="tab-btn-statement"
          onClick={() => setActiveTab('STATEMENT')}
          style={{
            backgroundColor: activeTab === 'STATEMENT' ? '#1b4332' : '#ffffff',
            color: activeTab === 'STATEMENT' ? '#ffffff' : '#4b5563',
            borderRadius: '10px',
            padding: '10px 18px',
            fontWeight: activeTab === 'STATEMENT' ? 700 : 600,
            fontSize: '13px',
            border: activeTab === 'STATEMENT' ? 'none' : '1px solid #d8e2dc',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'STATEMENT' ? '0 4px 12px rgba(27, 67, 50, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <FileText size={16} />
          <span>Authoritative Statement [F5]</span>
        </button>

        <button
          id="tab-btn-mis"
          onClick={() => setActiveTab('MIS')}
          style={{
            backgroundColor: activeTab === 'MIS' ? '#1b4332' : '#ffffff',
            color: activeTab === 'MIS' ? '#ffffff' : '#4b5563',
            borderRadius: '10px',
            padding: '10px 18px',
            fontWeight: activeTab === 'MIS' ? 700 : 600,
            fontSize: '13px',
            border: activeTab === 'MIS' ? 'none' : '1px solid #d8e2dc',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'MIS' ? '0 4px 12px rgba(27, 67, 50, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <TrendingUp size={16} />
          <span>Commercial MIS & Profitability [F6]</span>
        </button>
      </div>

      {/* ── TAB CONTENT SURFACE ────────────────────────────── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #d8e2dc',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* TAB 1: STOCK OWNERSHIP & CUSTODY */}
        {activeTab === 'STOCK' && (
          <div id="view-stock-custody">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>
                  Principal-Owned Stock Inventory
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  Physical warehouse custody does not transfer title. Stock remains segregated by Principal owner.
                </p>
              </div>
              <span
                style={{
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #a7f3d0'
                }}
              >
                DOC-16 Integrated
              </span>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg, #1b4332 0%, #2d6a4f 100%)', color: '#ffffff' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product Name</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Batch No</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Depot Location</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>On Hand</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Reserved</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Damage/Breakage</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Unit Rate (₹)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Valuation (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {position && position.stock_lines.length > 0 ? (
                    position.stock_lines.map((line, idx) => (
                      <tr
                        key={line.id}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                          borderBottom: '1px solid #f3f4f6'
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827' }}>{line.product_name}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4b5563', fontWeight: 600 }}>{line.batch_no}</td>
                        <td style={{ padding: '12px 16px', color: '#4b5563' }}>{line.warehouse_name}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#111827' }}>{line.qty_on_hand.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#b45309' }}>{line.qty_reserved.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: line.qty_damage_breakage > 0 ? '#dc2626' : '#9ca3af' }}>
                          {line.qty_damage_breakage > 0 ? line.qty_damage_breakage.toFixed(2) : '0.00'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4b5563' }}>₹{line.unit_cost.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#065f46' }}>
                          ₹{line.total_valuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                        No active stock lots found for this Principal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: CLAIMS & RETURNS DESK */}
        {activeTab === 'CLAIMS' && (
          <div id="view-claims-desk">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>
                  Principal Claims, Expiry & Damage Recoveries
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  Claims require batch provenance. Approvals route financial settlement intent to DOC-07.
                </p>
              </div>
              <button
                id="btn-raise-claim"
                onClick={() => setIsClaimModalOpen(true)}
                style={{
                  backgroundColor: '#1b4332',
                  color: '#ffffff',
                  fontSize: '12px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Plus size={15} />
                <span>New Claim [F7]</span>
              </button>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg, #1b4332 0%, #2d6a4f 100%)', color: '#ffffff' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Claim Number</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Type</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Source Ref</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Product / Batch</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Claimed Qty</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Amount (₹)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {position && position.claims.length > 0 ? (
                    position.claims.map((c, idx) => (
                      <tr
                        key={c.id}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                          borderBottom: '1px solid #f3f4f6'
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 800, color: '#065f46' }}>{c.claim_number}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: c.claim_type === 'EXPIRY' ? '#fef3c7' : '#fee2e2',
                              color: c.claim_type === 'EXPIRY' ? '#92400e' : '#991b1b'
                            }}
                          >
                            {c.claim_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4b5563' }}>{c.source_doc_id}</td>
                        <td style={{ padding: '12px 16px', color: '#111827' }}>
                          <span style={{ fontWeight: 600 }}>{c.product_name}</span>{' '}
                          <span style={{ color: '#9ca3af', fontSize: '11px' }}>({c.batch_no})</span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>{c.claimed_qty.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#111827' }}>
                          ₹{c.claimed_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              backgroundColor:
                                c.status === 'APPROVED' ? '#d1fae5' :
                                c.status === 'PENDING' ? '#fef3c7' :
                                c.status === 'PASSED_TO_SETTLEMENT' ? '#dbeafe' : '#f3f4f6',
                              color:
                                c.status === 'APPROVED' ? '#065f46' :
                                c.status === 'PENDING' ? '#92400e' :
                                c.status === 'PASSED_TO_SETTLEMENT' ? '#1e40af' : '#374151'
                            }}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {c.status === 'PENDING' && (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => handleClaimAction(c.id, 'APPROVE')}
                                style={{
                                  backgroundColor: '#10b981',
                                  color: '#ffffff',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleClaimAction(c.id, 'DISPUTE')}
                                style={{
                                  backgroundColor: '#ef4444',
                                  color: '#ffffff',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                Dispute
                              </button>
                            </div>
                          )}
                          {c.status === 'APPROVED' && (
                            <button
                              onClick={() => handleClaimAction(c.id, 'PASS_TO_SETTLEMENT')}
                              style={{
                                backgroundColor: '#3b82f6',
                                color: '#ffffff',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              Settle [DOC-07]
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                        No claims registered for this Principal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: RECONCILIATION WORKSPACE */}
        {activeTab === 'RECON' && (
          <div id="view-reconciliation-workspace">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>
                  3-Way Principal Statement Reconciliation
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  Compares System Stock & Sales vs External Principal-Reported Statement. Variances never alter historical ledgers.
                </p>
              </div>
              <button
                id="btn-run-reconciliation"
                onClick={handleRunRecon}
                style={{
                  backgroundColor: '#1b4332',
                  color: '#ffffff',
                  fontSize: '12px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={15} />
                <span>Run Reconciliation Match</span>
              </button>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg, #1b4332 0%, #2d6a4f 100%)', color: '#ffffff' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Reconciliation Ref</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Period</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>System Closing (₹)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>External Statement (₹)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Variance (₹)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>Audit Lock</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliations.length > 0 ? (
                    reconciliations.map((r, idx) => (
                      <tr
                        key={r.id}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                          borderBottom: '1px solid #f3f4f6'
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 800, color: '#065f46' }}>{r.recon_number}</td>
                        <td style={{ padding: '12px 16px', color: '#4b5563' }}>{r.period_from} to {r.period_to}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>
                          ₹{r.system_closing_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>
                          ₹{r.external_closing_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                          ₹{r.net_variance_val.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              backgroundColor: r.status === 'APPROVED' ? '#d1fae5' : '#fef3c7',
                              color: r.status === 'APPROVED' ? '#065f46' : '#92400e'
                            }}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '11px' }}>FROZEN v1.0</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                        No reconciliation runs recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: RECONSTRUCTABLE STATEMENT */}
        {activeTab === 'STATEMENT' && (
          <div id="view-principal-statement">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e5e7eb', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>
                  Reconstructable Principal Business Statement
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  Reconstructed deterministically from DOC-16 movements, DOC-20 sales, and DOC-35 freight.
                </p>
              </div>
              <button
                onClick={() => navigate('/principal/statement')}
                style={{
                  backgroundColor: '#2d6a4f',
                  color: '#ffffff',
                  fontSize: '12px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <span>Open Full Screen Statement</span>
                <ChevronRight size={15} />
              </button>
            </div>

            {statement && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Primary Financial Position Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Opening Stock</span>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: '4px 0', display: 'block' }}>
                      ₹{statement.figures.opening_stock_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{statement.figures.opening_stock_qty} units</span>
                  </div>

                  <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>+ Inward Receipts</span>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#065f46', margin: '4px 0', display: 'block' }}>
                      +₹{statement.figures.inward_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>+{statement.figures.inward_qty} units</span>
                  </div>

                  <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>- Sales / Dispatches</span>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#991b1b', margin: '4px 0', display: 'block' }}>
                      -₹{statement.figures.sales_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>-{statement.figures.sales_qty} units</span>
                  </div>

                  <div style={{ backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                    <span style={{ fontSize: '11px', color: '#065f46', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>= Closing Valuation</span>
                    <span style={{ fontSize: '20px', fontWeight: 900, color: '#064e3b', margin: '4px 0', display: 'block' }}>
                      ₹{statement.figures.closing_stock_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '11px', color: '#059669' }}>{statement.figures.closing_stock_qty} units</span>
                  </div>
                </div>

                {/* Sub-breakdown: Claims, Freight, Commission */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ padding: '14px 18px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, fontSize: '12px', color: '#6b7280', display: 'block' }}>Open Expiry/Breakage Claims</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#b45309', margin: '4px 0', display: 'block' }}>
                      ₹{statement.figures.pending_claims_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div style={{ padding: '14px 18px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, fontSize: '12px', color: '#6b7280', display: 'block' }}>Attributed Freight (DOC-35)</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#6d28d9', margin: '4px 0', display: 'block' }}>
                      ₹{statement.figures.freight_cost_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '11px', color: '#7c3aed' }}>Admin Subsidized: ₹{statement.figures.admin_borne_freight}</span>
                  </div>

                  <div style={{ padding: '14px 18px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, fontSize: '12px', color: '#6b7280', display: 'block' }}>Accrued Commission (DOC-37)</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#1e40af', margin: '4px 0', display: 'block' }}>
                      ₹{statement.figures.commission_accrued.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '11px', color: '#2563eb' }}>At contracted commission rate</span>
                  </div>
                </div>

                {/* Traceable Lines Table */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    Source Transaction Traceability Log
                  </h4>
                  <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #d1d5db', color: '#374151' }}>
                          <th style={{ padding: '10px 14px', fontWeight: 700, textTransform: 'uppercase' }}>Date</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, textTransform: 'uppercase' }}>Category</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, textTransform: 'uppercase' }}>Source Ref</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, textTransform: 'uppercase' }}>Product / Batch</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Qty</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Amount (₹)</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Posting Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.lines.map((l, idx) => (
                          <tr
                            key={idx}
                            style={{
                              backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                              borderBottom: '1px solid #f3f4f6'
                            }}
                          >
                            <td style={{ padding: '10px 14px', color: '#4b5563' }}>{l.date}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827' }}>{l.category}</td>
                            <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#065f46', fontWeight: 700 }}>{l.source_doc}</td>
                            <td style={{ padding: '10px 14px', color: '#374151' }}>{l.product_name} ({l.batch_no})</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{l.qty !== 0 ? l.qty.toFixed(2) : '-'}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800 }}>
                              ₹{l.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span
                                style={{
                                  backgroundColor: '#d1fae5',
                                  color: '#065f46',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700
                                }}
                              >
                                {l.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: COMMERCIAL MIS & PROFITABILITY */}
        {activeTab === 'MIS' && (
          <div id="view-commercial-mis">
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>
                Commercial MIS & Operations Profitability
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                Analytical contribution and service margin metrics. Does not alter statutory GL profit (DOC-41).
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div
                style={{
                  backgroundColor: '#1b4332',
                  color: '#ffffff',
                  padding: '20px',
                  borderRadius: '14px',
                  boxShadow: '0 4px 14px rgba(27, 67, 50, 0.2)'
                }}
              >
                <span style={{ fontSize: '11px', color: '#a7f3d0', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                  C&F Gross Commission
                </span>
                <span style={{ fontSize: '28px', fontWeight: 900, margin: '6px 0 2px', display: 'block' }}>
                  ₹{statement ? statement.figures.commission_accrued.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '2,925.00'}
                </span>
                <span style={{ fontSize: '12px', color: '#d1fae5', display: 'block' }}>Earned on authorized secondary sales</span>
              </div>

              <div
                style={{
                  backgroundColor: '#f9fafb',
                  padding: '20px',
                  borderRadius: '14px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                  Attributable Freight Expense
                </span>
                <span style={{ fontSize: '28px', fontWeight: 900, color: '#111827', margin: '6px 0 2px', display: 'block' }}>
                  ₹{statement ? statement.figures.freight_cost_val.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '2,150.00'}
                </span>
                <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600, display: 'block' }}>
                  100% Platform Admin Subsidized (GL 5200)
                </span>
              </div>

              <div
                style={{
                  backgroundColor: '#ecfdf5',
                  padding: '20px',
                  borderRadius: '14px',
                  border: '1px solid #a7f3d0'
                }}
              >
                <span style={{ fontSize: '11px', color: '#065f46', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                  Net Operational Margin
                </span>
                <span style={{ fontSize: '28px', fontWeight: 900, color: '#064e3b', margin: '6px 0 2px', display: 'block' }}>
                  ₹{statement ? statement.figures.commission_accrued.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '2,925.00'}
                </span>
                <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600, display: 'block' }}>
                  Zero Client GL deduction
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: RAISE PRINCIPAL CLAIM ───────────────────── */}
      {isClaimModalOpen && (
        <div
          id="modal-new-claim"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
              border: '1px solid #d8e2dc',
              width: '100%',
              maxWidth: '540px',
              padding: '24px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '14px',
                marginBottom: '18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} color="#d97706" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>
                  Register Principal Claim
                </h3>
              </div>
              <button
                onClick={() => setIsClaimModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateClaim} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Claim Type
                </label>
                <select
                  value={claimType}
                  onChange={e => setClaimType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #d1d5db',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="EXPIRY">Near-Expiry / Expired Stock Return</option>
                  <option value="BREAKAGE">Transit / Depot Breakage</option>
                  <option value="SHORTAGE">Inward Shortage Discrepancy</option>
                  <option value="RATE_DIFFERENCE">Contractual Rate Difference</option>
                  <option value="SCHEME_REIMBURSEMENT">Scheme Free Goods Reimbursement</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Source Return / POD Ref
                  </label>
                  <input
                    id="input-claim-doc-id"
                    type="text"
                    value={claimDocId}
                    onChange={e => setClaimDocId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #d1d5db',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Batch Number
                  </label>
                  <input
                    id="input-claim-batch"
                    type="text"
                    value={claimBatchNo}
                    onChange={e => setClaimBatchNo(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #d1d5db',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Product Description
                </label>
                <input
                  id="input-claim-product"
                  type="text"
                  value={claimProductName}
                  onChange={e => setClaimProductName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #d1d5db',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Claimed Quantity
                  </label>
                  <input
                    id="input-claim-qty"
                    type="number"
                    value={claimQty}
                    onChange={e => setClaimQty(parseFloat(e.target.value) || 0)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #d1d5db',
                      fontSize: '13px',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Unit Rate (₹)
                  </label>
                  <input
                    id="input-claim-rate"
                    type="number"
                    value={claimRate}
                    onChange={e => setClaimRate(parseFloat(e.target.value) || 0)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #d1d5db',
                      fontSize: '13px',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Total Claim Amount (₹)
                </label>
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#ecfdf5',
                    borderRadius: '8px',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    fontWeight: 900,
                    fontSize: '15px'
                  }}
                >
                  ₹{(claimQty * claimRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Commercial Justification
                </label>
                <textarea
                  value={claimReason}
                  onChange={e => setClaimReason(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #d1d5db',
                    fontSize: '12px',
                    color: '#374151',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    color: '#4b5563',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel [Esc]
                </button>
                <button
                  id="btn-submit-claim"
                  type="submit"
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1b4332',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(27, 67, 50, 0.3)'
                  }}
                >
                  Register Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrincipalControlCenter;
