import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { 
  Package, AlertTriangle, RefreshCw, XCircle, FileText, ArrowRight, 
  Clock, ShieldAlert, CheckSquare, Square, Search, Filter, ExternalLink,
  ChevronRight, ArrowUpDown
} from 'lucide-react';
import apiClient from '../../lib/api';

interface TelemetryData {
  main_stock_val: number;
  main_stock_units: number;
  brk_exp_stock_val: number;
  brk_exp_stock_units: number;
  expired_count: number;
  expired_val: number;
  near_30_count: number;
  near_30_val: number;
  near_60_count: number;
  near_60_val: number;
  near_90_count: number;
  near_90_val: number;
  total_near_expiry_count: number;
  total_near_expiry_val: number;
  pending_claims_count: number;
  pending_claims_val: number;
  recent_shifts: any[];
}

interface RadarBatch {
  batch_id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  company_name: string;
  company_id?: string;
  batch_number: string;
  expiry: string;
  days_to_expiry: number;
  status_tag: 'EXPIRED' | '30_DAYS' | '60_DAYS' | '90_DAYS' | 'HEALTHY';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL';
  current_stock: number;
  brk_exp_stock: number;
  rate: number;
  value: number;
  mrp: number;
}

interface ShiftVoucherSummary {
  id: string;
  voucher_no: string;
  shift_date: string;
  from_godown: string;
  to_godown: string;
  reason: string;
  total_items: number;
  total_qty: number;
  total_value: number;
  status: string;
  auto_claim_generated: boolean;
  principal_claim?: {
    claim_id: string;
    claim_number: string;
    status: string;
  };
}

export default function InventoryDashboard() {
  const navigate = useNavigate();
  
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'radar' | 'quarantine' | 'history'>('radar');
  
  // Telemetry & Batches State
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [batches, setBatches] = useState<RadarBatch[]>([]);
  const [quarantineBatches, setQuarantineBatches] = useState<RadarBatch[]>([]);
  const [shifts, setShifts] = useState<ShiftVoucherSummary[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  
  // Filters
  const [selectedBucket, setSelectedBucket] = useState<string>('ALL');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Load telemetry and master data
  const loadData = async () => {
    try {
      setRefreshing(true);
      const [telRes, compRes, shiftRes] = await Promise.all([
        apiClient.get('/api/stock/expiry-cockpit-telemetry'),
        apiClient.get('/api/master/manufacturers').catch(() => ({ data: [] })),
        apiClient.get('/api/stock/shifts').catch(() => ({ data: { shifts: [] } }))
      ]);
      setTelemetry(telRes.data);
      setCompanies(compRes.data || []);
      setShifts(shiftRes.data?.shifts || []);
    } catch (err) {
      console.error('Failed to load cockpit telemetry', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Load Radar batches based on bucket / filters
  const loadRadarBatches = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBucket) params.append('bucket', selectedBucket);
      if (selectedCompany) params.append('company_id', selectedCompany);
      if (searchQuery) params.append('search', searchQuery);

      const res = await apiClient.get('/api/stock/expiry-radar-batches?' + params.toString());
      setBatches(res.data?.batches || []);

      // Also fetch quarantine stock items
      const qRes = await apiClient.get('/api/stock?type=brk-exp').catch(() => null);
      if (qRes && qRes.data) {
        // Map products with quarantine stock
        setQuarantineBatches([]);
      }
    } catch (err) {
      console.error('Failed to load radar batches', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadRadarBatches();
  }, [selectedBucket, selectedCompany, searchQuery]);

  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/dashboard');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('radar');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('quarantine');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('history');
      } else if (e.key === 'F5') {
        e.preventDefault();
        loadData();
        loadRadarBatches();
      } else if (e.key === 'F7') {
        e.preventDefault();
        handleProceedToShift();
      } else if (e.key === 'F8') {
        e.preventDefault();
        navigate('/principal');
      } else if (e.key === 'F9') {
        e.preventDefault();
        navigate('/stock');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, selectedBatchIds, batches]);

  // Batch Selection Handlers
  const toggleSelectBatch = (batchId: string) => {
    const updated = new Set(selectedBatchIds);
    if (updated.has(batchId)) {
      updated.delete(batchId);
    } else {
      updated.add(batchId);
    }
    setSelectedBatchIds(updated);
  };

  const selectAllBatches = () => {
    if (selectedBatchIds.size === batches.length) {
      setSelectedBatchIds(new Set());
    } else {
      setSelectedBatchIds(new Set(batches.map(b => b.batch_id)));
    }
  };

  // Proceed to Stock Shift with pre-selected items
  const handleProceedToShift = () => {
    const selectedList = batches.filter(b => selectedBatchIds.has(b.batch_id));
    navigate('/stock-shift', {
      state: {
        preSelectedBatches: selectedList.map(b => ({
          batch_id: b.batch_id,
          product_id: b.product_id,
          product_name: b.product_name,
          batch_number: b.batch_number,
          expiry: b.expiry,
          current_stock: b.current_stock,
          qty: b.current_stock, // default shift all
          rate: b.rate,
          value: b.value
        }))
      }
    });
  };

  // Helper formatting
  const formatCurr = (val: number) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  const renderBadge = (tag: string) => {
    switch (tag) {
      case 'EXPIRED':
        return <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>🔴 EXPIRED</span>;
      case '30_DAYS':
        return <span style={{ backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fb923c', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>🟠 &lt; 30 DAYS</span>;
      case '60_DAYS':
        return <span style={{ backgroundColor: '#fef9c3', color: '#a16207', border: '1px solid #facc15', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>🟡 &lt; 60 DAYS</span>;
      case '90_DAYS':
        return <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #38bdf8', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>🔵 &lt; 90 DAYS</span>;
      default:
        return <span style={{ backgroundColor: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>HEALTHY</span>;
    }
  };

  const selectedBatchesCount = selectedBatchIds.size;
  const selectedBatchesVal = batches
    .filter(b => selectedBatchIds.has(b.batch_id))
    .reduce((sum, b) => sum + b.value, 0);

  return (
    <div style={{ backgroundColor: 'var(--color-bg, #0f172a)', flex: 1, display: 'flex', flexDirection: 'column', color: 'var(--color-text, #f8fafc)', padding: '16px 24px', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      
      {/* ── Top Bar / Header ──────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, color: 'var(--color-primary, #38bdf8)' }}>
              Pharma Expiry Radar & Breakage Cockpit
            </h1>
            <span style={{ fontSize: '11px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #0284c7', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              DOC-41 ENTERPRISE
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted, #94a3b8)', marginTop: '2px' }}>
            Real-time batch shelf-life surveillance, Quarantine Stock Shift engine, and Principal debit note claim bridging
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            id="btn-refresh-cockpit"
            onClick={() => { loadData(); loadRadarBatches(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-bg-subtle, #1e293b)', color: 'var(--color-text, #f8fafc)', border: '1px solid var(--color-border, #334155)', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> [F5] Refresh
          </button>
          
          <button 
            id="btn-nav-shift-voucher"
            onClick={handleProceedToShift}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-warning, #d97706)', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
          >
            <AlertTriangle size={14} /> [F7] Stock Shift
          </button>

          <button 
            id="btn-nav-principal-desk"
            onClick={() => navigate('/principal')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
          >
            <ShieldAlert size={14} /> [F8] Principal Claims
          </button>
        </div>
      </div>

      {/* ── 4 Telemetry Scorecards ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
        
        {/* Card 1: Main Saleable Stock */}
        <div id="card-main-stock" style={{ backgroundColor: 'var(--color-bg-subtle, #1e293b)', border: '1px solid var(--color-border, #334155)', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '13px' }}>Main Stock Value</span>
            <Package size={18} color="#4ade80" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--color-text, #f8fafc)' }}>
            {formatCurr(telemetry?.main_stock_val || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)', marginTop: '4px' }}>
            Healthy Stock: <strong>{telemetry?.main_stock_units || 0}</strong> Units
          </div>
        </div>

        {/* Card 2: Quarantined / Brk-Exp Stock */}
        <div id="card-quarantine-stock" style={{ backgroundColor: 'var(--color-bg-subtle, #1e293b)', border: '1px solid var(--color-border, #334155)', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#f87171', fontWeight: 'bold', fontSize: '13px' }}>Quarantine Godown</span>
            <XCircle size={18} color="#f87171" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--color-text, #f8fafc)' }}>
            {formatCurr(telemetry?.brk_exp_stock_val || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)', marginTop: '4px' }}>
            Quarantined: <strong>{telemetry?.brk_exp_stock_units || 0}</strong> Units
          </div>
        </div>

        {/* Card 3: Total Near-Expiry & Expired Stock */}
        <div id="card-near-expiry-risk" style={{ backgroundColor: 'var(--color-bg-subtle, #1e293b)', border: '1px solid var(--color-border, #334155)', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#fb923c', fontWeight: 'bold', fontSize: '13px' }}>Near-Expiry Surveillance</span>
            <Clock size={18} color="#fb923c" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--color-text, #f8fafc)' }}>
            {formatCurr(telemetry?.total_near_expiry_val || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)', marginTop: '4px' }}>
            Risk Batches: <strong>{telemetry?.total_near_expiry_count || 0}</strong> across 90-day window
          </div>
        </div>

        {/* Card 4: Principal Claims & Debit Note Exposure */}
        <div id="card-claim-exposure" style={{ backgroundColor: 'var(--color-bg-subtle, #1e293b)', border: '1px solid var(--color-border, #334155)', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '13px' }}>Principal Claims Exposure</span>
            <FileText size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--color-text, #f8fafc)' }}>
            {formatCurr(telemetry?.pending_claims_val || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)', marginTop: '4px' }}>
            Active Pending Claims: <strong>{telemetry?.pending_claims_count || 0}</strong>
          </div>
        </div>
      </div>

      {/* ── Main Tab Navigation Bar ────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border, #334155)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            id="tab-btn-radar"
            onClick={() => setActiveTab('radar')}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: activeTab === 'radar' ? 'var(--color-primary, #38bdf8)' : 'transparent',
              color: activeTab === 'radar' ? '#0f172a' : 'var(--color-text, #f8fafc)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={16} /> [F2] Expiry Radar ({batches.length})
          </button>

          <button
            id="tab-btn-quarantine"
            onClick={() => setActiveTab('quarantine')}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: activeTab === 'quarantine' ? 'var(--color-primary, #38bdf8)' : 'transparent',
              color: activeTab === 'quarantine' ? '#0f172a' : 'var(--color-text, #f8fafc)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShieldAlert size={16} /> [F3] Quarantine Godown Stock
          </button>

          <button
            id="tab-btn-history"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: activeTab === 'history' ? 'var(--color-primary, #38bdf8)' : 'transparent',
              color: activeTab === 'history' ? '#0f172a' : 'var(--color-text, #f8fafc)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={16} /> [F4] Stock Shift Audit Register ({shifts.length})
          </button>
        </div>

        {activeTab === 'radar' && selectedBatchesCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#fb923c', fontWeight: 600 }}>
              {selectedBatchesCount} Batches Selected ({formatCurr(selectedBatchesVal)})
            </span>
            <button
              id="btn-shift-selected-action"
              onClick={handleProceedToShift}
              style={{
                backgroundColor: '#d97706',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ⚡ Shift to Quarantine [F7] <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── TAB 1: EXIRY RADAR ──────────────────────────── */}
      {activeTab === 'radar' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          
          {/* Controls Bar: Bucket Pills, Manufacturer Filter, Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', backgroundColor: 'var(--color-bg-subtle, #1e293b)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border, #334155)' }}>
            
            {/* Bucket Filter Pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'ALL', label: 'All Critical' },
                { id: 'EXPIRED', label: '🔴 Expired' },
                { id: '30_DAYS', label: '🟠 < 30 Days' },
                { id: '60_DAYS', label: '🟡 < 60 Days' },
                { id: '90_DAYS', label: '🔵 < 90 Days' },
              ].map(b => (
                <button
                  key={b.id}
                  id={`filter-bucket-${b.id}`}
                  onClick={() => setSelectedBucket(b.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: selectedBucket === b.id ? '1px solid #38bdf8' : '1px solid var(--color-border, #334155)',
                    backgroundColor: selectedBucket === b.id ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: selectedBucket === b.id ? '#38bdf8' : 'var(--color-text-muted, #94a3b8)'
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Company & Search Inputs */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                id="filter-company-select"
                value={selectedCompany}
                onChange={e => setSelectedCompany(e.target.value)}
                style={{
                  backgroundColor: 'var(--color-bg, #0f172a)',
                  color: 'var(--color-text, #f8fafc)',
                  border: '1px solid var(--color-border, #334155)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '12px'
                }}
              >
                <option value="">All Manufacturers / Principals</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-bg, #0f172a)', border: '1px solid var(--color-border, #334155)', borderRadius: '4px', padding: '0 8px' }}>
                <Search size={14} color="var(--color-text-muted, #94a3b8)" />
                <input
                  id="search-batches-input"
                  type="text"
                  placeholder="Search item / batch..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--color-text, #f8fafc)',
                    padding: '6px 8px',
                    fontSize: '12px',
                    outline: 'none',
                    width: '180px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Batches Table */}
          <div style={{ backgroundColor: 'var(--color-bg-subtle, #1e293b)', borderRadius: '8px', border: '1px solid var(--color-border, #334155)', overflowX: 'auto', flex: 1 }}>
            <table id="tbl-expiry-radar" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--color-border, #334155)', color: 'var(--color-text-muted, #94a3b8)' }}>
                  <th style={{ padding: '10px 12px', width: '40px', textAlign: 'center' }}>
                    <button 
                      id="btn-select-all-batches"
                      onClick={selectAllBatches}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-primary, #38bdf8)', cursor: 'pointer', padding: 0 }}
                    >
                      {selectedBatchIds.size > 0 && selectedBatchIds.size === batches.length ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th style={{ padding: '10px 12px' }}>Product & SKU</th>
                  <th style={{ padding: '10px 12px' }}>Manufacturer / Principal</th>
                  <th style={{ padding: '10px 12px' }}>Batch No</th>
                  <th style={{ padding: '10px 12px' }}>Expiry (MM/YY)</th>
                  <th style={{ padding: '10px 12px' }}>Status Tag</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Days Left</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Saleable Stock</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Cost Rate</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Value</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted, #94a3b8)' }}>
                      No stock batches matching the selected near-expiry radar filter.
                    </td>
                  </tr>
                ) : (
                  batches.map(b => {
                    const isSelected = selectedBatchIds.has(b.batch_id);
                    return (
                      <tr 
                        key={b.batch_id}
                        data-batch-id={b.batch_id}
                        style={{
                          borderBottom: '1px solid var(--color-border, #334155)',
                          backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                          transition: 'background-color 0.15s'
                        }}
                      >
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectBatch(b.batch_id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text, #f8fafc)' }}>{b.product_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)' }}>{b.product_code}</div>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-muted, #94a3b8)' }}>
                          {b.company_name}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, fontFamily: 'monospace' }}>
                          {b.batch_number}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>
                          {b.expiry}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {renderBadge(b.status_tag)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: b.days_to_expiry <= 0 ? '#f87171' : b.days_to_expiry <= 30 ? '#fb923c' : 'inherit' }}>
                          {b.days_to_expiry <= 0 ? 'EXPIRED' : `${b.days_to_expiry}d`}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                          {b.current_stock}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-text-muted, #94a3b8)' }}>
                          ₹{b.rate.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                          {formatCurr(b.value)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              navigate('/stock-shift', {
                                state: {
                                  preSelectedBatches: [{
                                    batch_id: b.batch_id,
                                    product_id: b.product_id,
                                    product_name: b.product_name,
                                    batch_number: b.batch_number,
                                    expiry: b.expiry,
                                    current_stock: b.current_stock,
                                    qty: b.current_stock,
                                    rate: b.rate,
                                    value: b.value
                                  }]
                                }
                              });
                            }}
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid #d97706',
                              color: '#d97706',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Shift
                          </button>
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

      {/* ── TAB 2: QUARANTINE GODOWN ────────────────────── */}
      {activeTab === 'quarantine' && (
        <div style={{ backgroundColor: 'var(--color-bg-subtle, #1e293b)', borderRadius: '8px', border: '1px solid var(--color-border, #334155)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text, #f8fafc)' }}>
                Quarantined & Breakage Stock Ledger
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)', marginTop: '2px' }}>
                Inventory segregated from saleable godown awaiting disposal, debit note claims, or vendor returns.
              </div>
            </div>

            <button
              id="btn-file-principal-claim-quarantine"
              onClick={() => navigate('/principal')}
              style={{
                backgroundColor: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ⚡ File Principal Expiry Claim <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ border: '1px solid var(--color-border, #334155)', borderRadius: '6px', padding: '16px', backgroundColor: 'var(--color-bg, #0f172a)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)' }}>Quarantine Godown Value:</span>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171' }}>{formatCurr(telemetry?.brk_exp_stock_val || 0)}</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--color-border, #334155)', paddingLeft: '24px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)' }}>Quarantined Units:</span>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-text, #f8fafc)' }}>{telemetry?.brk_exp_stock_units || 0} Units</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--color-border, #334155)', paddingLeft: '24px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)' }}>Recovery / Claim Status:</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#38bdf8', marginTop: '4px' }}>
                  {telemetry?.pending_claims_count ? `${telemetry.pending_claims_count} Claims Filed (${formatCurr(telemetry.pending_claims_val)})` : 'No pending claims'}
                </div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--color-text-muted, #94a3b8)', lineHeight: 1.6, margin: 0 }}>
            Items shifted into Quarantine Stock are automatically blocked from billing at Counter Workbench [F7] and FEFO allocation.
            To file debit notes against the manufacturer (e.g., Sun Pharma, Cipla, Krishna Medical Agencies), execute an automatic claim filing during Stock Shift or via the Principal Claims Desk.
          </p>
        </div>
      )}

      {/* ── TAB 3: STOCK SHIFT AUDIT REGISTER ───────────── */}
      {activeTab === 'history' && (
        <div style={{ backgroundColor: 'var(--color-bg-subtle, #1e293b)', borderRadius: '8px', border: '1px solid var(--color-border, #334155)', overflowX: 'auto' }}>
          <table id="tbl-shift-audit" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--color-border, #334155)', color: 'var(--color-text-muted, #94a3b8)' }}>
                <th style={{ padding: '10px 14px' }}>Voucher No</th>
                <th style={{ padding: '10px 14px' }}>Date</th>
                <th style={{ padding: '10px 14px' }}>From Godown</th>
                <th style={{ padding: '10px 14px' }}>To Godown</th>
                <th style={{ padding: '10px 14px' }}>Reason</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Items</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Qty</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Valuation</th>
                <th style={{ padding: '10px 14px' }}>Principal Claim</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted, #94a3b8)' }}>
                    No stock shift vouchers recorded yet.
                  </td>
                </tr>
              ) : (
                shifts.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border, #334155)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-primary, #38bdf8)' }}>
                      {s.voucher_no}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-text-muted, #94a3b8)' }}>
                      {s.shift_date ? s.shift_date.split('T')[0] : '-'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>{s.from_godown}</td>
                    <td style={{ padding: '10px 14px' }}>{s.to_godown}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-text-muted, #94a3b8)' }}>{s.reason || '-'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{s.total_items}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{s.total_qty}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{formatCurr(s.total_value)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {s.auto_claim_generated && s.principal_claim ? (
                        <span 
                          onClick={() => navigate('/principal')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            border: '1px solid #0284c7',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {s.principal_claim.claim_number} <ExternalLink size={10} />
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted, #94a3b8)', fontSize: '11px' }}>None</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: '#064e3b', color: '#34d399', border: '1px solid #059669', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Quick Voucher Shortcuts Footer ─────────────── */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '16px' }}>
        <div 
          onClick={() => navigate('/brk-receive?type=bill')}
          style={{ flex: 1, backgroundColor: 'var(--color-bg-subtle, #1e293b)', border: '1px solid var(--color-border, #334155)', borderRadius: '8px', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          <RefreshCw size={24} color="#38bdf8" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text, #f8fafc)' }}>Customer Breakage Intake</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)' }}>Log customer returned damaged goods into Brk/Exp stock</div>
          </div>
        </div>

        <div 
          onClick={() => navigate('/stock-shift')}
          style={{ flex: 1, backgroundColor: 'var(--color-bg-subtle, #1e293b)', border: '1px solid var(--color-border, #334155)', borderRadius: '8px', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          <AlertTriangle size={24} color="#f59e0b" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text, #f8fafc)' }}>Internal Expiry Shift [F7]</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)' }}>Transfer shelf items from Saleable to Quarantine Godown</div>
          </div>
        </div>

        <div 
          onClick={() => navigate('/principal')}
          style={{ flex: 1, backgroundColor: 'var(--color-bg-subtle, #1e293b)', border: '1px solid var(--color-border, #334155)', borderRadius: '8px', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          <FileText size={24} color="#4ade80" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text, #f8fafc)' }}>Principal Expiry Claims [F8]</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)' }}>Recover expired value and generate GST debit notes</div>
          </div>
        </div>
      </div>

    </div>
  );
}
