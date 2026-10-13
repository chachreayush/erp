import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, {
  apiGetAssetSummary,
  apiGetAssetCategories,
  apiGetFixedAssets,
  apiRegisterFixedAsset,
  apiGetAssetDepreciationLogs,
  apiRunAssetDepreciation,
  apiBulkDepreciateAssets,
  apiDisposeAsset,
  AssetCategory,
  FixedAsset,
  DepreciationLog,
  AssetSummaryResponse,
  BulkDepreciationResponse,
  AssetDisposalResponse,
  Ledger
} from '../../lib/api';
import {
  Building2,
  Plus,
  Calculator,
  History,
  Trash2,
  TrendingDown,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Zap,
  DollarSign,
  ArrowRight,
  Search,
  Filter,
  RefreshCw,
  FileText
} from 'lucide-react';

export default function FixedAssets() {
  const navigate = useNavigate();

  // State
  const [summary, setSummary] = useState<AssetSummaryResponse | null>(null);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'register' | 'bulk' | 'logs'>('register');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Disposed'>('All');

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newCatId, setNewCatId] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newPurchaseDate, setNewPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newPurchaseValue, setNewPurchaseValue] = useState('');
  const [newSalvageValue, setNewSalvageValue] = useState('0');

  // Single Depreciate Modal
  const [showDepModal, setShowDepModal] = useState(false);
  const [depAsset, setDepAsset] = useState<FixedAsset | null>(null);
  const [depRunDate, setDepRunDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [depNotes, setDepNotes] = useState('');

  // Bulk Depreciate
  const [bulkRunDate, setBulkRunDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkResult, setBulkResult] = useState<BulkDepreciationResponse | null>(null);

  // History Drawer/Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyAsset, setHistoryAsset] = useState<FixedAsset | null>(null);
  const [historyLogs, setHistoryLogs] = useState<DepreciationLog[]>([]);

  // Disposal Modal
  const [showDisposeModal, setShowDisposeModal] = useState(false);
  const [disposeAssetTarget, setDisposeAssetTarget] = useState<FixedAsset | null>(null);
  const [disposeDate, setDisposeDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saleProceeds, setSaleProceeds] = useState('0');
  const [settlementLedgerId, setSettlementLedgerId] = useState('');
  const [disposeNotes, setDisposeNotes] = useState('');

  // Messages
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [sumRes, assetRes, catRes, ledRes] = await Promise.all([
        apiGetAssetSummary().catch(() => null),
        apiGetFixedAssets().catch(() => []),
        apiGetAssetCategories().catch(() => []),
        apiClient.get('/api/master/ledgers').then(r => r.data).catch(() => [])
      ]);
      if (sumRes) setSummary(sumRes);
      setAssets(assetRes || []);
      setCategories(catRes || []);
      setLedgers(ledRes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatId || !newName || !newPurchaseValue) {
      setNotification({ type: 'error', message: 'Please select a Category and enter Asset Name and Purchase Cost.' });
      return;
    }
    try {
      const cost = parseFloat(newPurchaseValue);
      const salvage = parseFloat(newSalvageValue || '0');
      await apiRegisterFixedAsset({
        category_id: newCatId,
        name: newName,
        description: newDesc,
        serial_number: newSerial,
        location: newLocation,
        purchase_date: newPurchaseDate,
        purchase_value: cost,
        salvage_value: salvage
      });
      setShowRegisterModal(false);
      setNewName('');
      setNewDesc('');
      setNewSerial('');
      setNewLocation('');
      setNewPurchaseValue('');
      setNewSalvageValue('0');
      setNotification({ type: 'success', message: `✓ Asset '${newName}' capitalized successfully for ₹${cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}!` });
      fetchInitialData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.detail || 'Failed to register asset.' });
    }
  };

  const handleRunSingleDepreciation = async () => {
    if (!depAsset) return;
    try {
      const res = await apiRunAssetDepreciation(depAsset.id, depRunDate, depNotes);
      setShowDepModal(false);
      setNotification({
        type: 'success',
        message: `✓ Depreciation of ₹${res.depreciation_amount.toFixed(2)} posted to GL for '${depAsset.name}'! Closing Net Block: ₹${res.closing_net_block.toFixed(2)}.`
      });
      fetchInitialData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.detail || 'Failed to calculate depreciation.' });
    }
  };

  const handleRunBulkDepreciation = async () => {
    try {
      setLoading(true);
      const res = await apiBulkDepreciateAssets(bulkRunDate, bulkNotes);
      setBulkResult(res);
      setNotification({
        type: 'success',
        message: `✓ ${res.message} ${res.voucher_number ? `(Journal Voucher #${res.voucher_number})` : ''}`
      });
      fetchInitialData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.detail || 'Bulk depreciation run failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async (asset: FixedAsset) => {
    setHistoryAsset(asset);
    try {
      const logs = await apiGetAssetDepreciationLogs(asset.id);
      setHistoryLogs(logs);
      setShowHistoryModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disposeAssetTarget) return;
    try {
      const proceedsNum = parseFloat(saleProceeds || '0');
      const res = await apiDisposeAsset(disposeAssetTarget.id, {
        disposal_date: disposeDate,
        sale_proceeds: proceedsNum,
        settlement_ledger_id: settlementLedgerId || undefined,
        notes: disposeNotes
      });
      setShowDisposeModal(false);
      setNotification({ type: 'success', message: `✓ ${res.message}` });
      fetchInitialData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.detail || 'Disposal transaction failed.' });
    }
  };

  // Filtered Assets
  const filteredAssets = assets.filter(a => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.serial_number && a.serial_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.location && a.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = !filterCategory || a.category_id === filterCategory;
    const matchesStatus = filterStatus === 'All' || a.status === filterStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#eef2ef', padding: '24px 32px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: '#1b4332' }}>
      
      {/* ── TOP HEADER CARD ── */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #d8e2dc', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#40916c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Finance Hub / Fixed Assets & Depreciation Engine
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <Building2 size={22} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#1b4332', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Fixed Asset & Lifecycle Manager
                  <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#d8f3dc', color: '#1b4332', padding: '3px 8px', borderRadius: '6px', border: '1px solid #b7e4c7' }}>
                    DOC-27
                  </span>
                </h1>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#52796f' }}>
                  Statutory WDV/SLM Depreciation, General Ledger Asset Register, Bulk Depreciation & Disposal Accounting
                </p>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/finance/profit-loss')}
              style={{ backgroundColor: '#ffffff', color: '#2d6a4f', border: '1px solid #b7e4c7', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowUpRight size={15} color="#2d6a4f" /> P&L Statement ↗
            </button>
            <button
              onClick={() => navigate('/finance/balance-sheet')}
              style={{ backgroundColor: '#ffffff', color: '#2d6a4f', border: '1px solid #b7e4c7', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FileText size={15} color="#2d6a4f" /> Balance Sheet ↗
            </button>
            <button
              onClick={() => navigate('/finance/asset-categories')}
              style={{ backgroundColor: '#ffffff', color: '#2d6a4f', border: '1px solid #b7e4c7', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Layers size={15} color="#2d6a4f" /> Asset Categories
            </button>
            <button
              data-testid="btn-open-register-modal"
              onClick={() => setShowRegisterModal(true)}
              style={{ backgroundColor: '#1b4332', color: '#ffffff', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(27,67,50,0.2)' }}
            >
              <Plus size={16} /> + Capitalize New Asset
            </button>
          </div>
        </div>
      </div>

      {/* ── NOTIFICATION BANNER ── */}
      {notification && (
        <div style={{
          backgroundColor: notification.type === 'success' ? '#d8f3dc' : '#fee2e2',
          border: `1px solid ${notification.type === 'success' ? '#74c69d' : '#f87171'}`,
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: notification.type === 'success' ? '#1b4332' : '#991b1b',
          fontSize: '13.5px',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {notification.type === 'success' ? <CheckCircle2 size={18} color="#2d6a4f" /> : <AlertCircle size={18} color="#dc2626" />}
            {notification.message}
          </div>
          <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: 'inherit' }}>×</button>
        </div>
      )}

      {/* ── 3-STEP ACCOUNTING BANNER ── */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #d8e2dc', padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1b4332', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={15} color="#40916c" />
            HOW FIXED ASSET ACCOUNTING & DEPRECIATION WORKS (SCHEDULE II & INCOME TAX BLOCK RULES)
          </div>
          <span style={{ fontSize: '11px', color: '#52796f', fontWeight: 600 }}>Ind AS 16 / AS 10 Compliant</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          <div style={{ backgroundColor: '#f8faf9', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2ece9', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '6px', padding: '6px 8px', fontWeight: 800, fontSize: '12px' }}>Dr</div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1b4332' }}>1. Asset Capitalization</div>
              <div style={{ fontSize: '11.5px', color: '#52796f' }}>Debits Gross Block (Balance Sheet Asset) and Credits Bank / Vendor liability.</div>
            </div>
          </div>
          <div style={{ backgroundColor: '#f8faf9', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2ece9', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '6px', padding: '6px 8px', fontWeight: 800, fontSize: '12px' }}>Dr / Cr</div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1b4332' }}>2. Depreciation Run (P&L Impact)</div>
              <div style={{ fontSize: '11.5px', color: '#52796f' }}>Debits Depreciation Expense (P&L Indirect Exp) and Credits Accumulated Depreciation.</div>
            </div>
          </div>
          <div style={{ backgroundColor: '#f8faf9', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2ece9', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '6px', padding: '6px 8px', fontWeight: 800, fontSize: '12px' }}>NBV</div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1b4332' }}>3. Net Carrying Value (Net Block)</div>
              <div style={{ fontSize: '11.5px', color: '#52796f' }}>Net Block = Original Cost − Accum. Depreciation. Disposals record net gain/loss in P&L.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 KPI CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #d8e2dc', borderLeft: '5px solid #2d6a4f', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', letterSpacing: '0.05em' }}>Gross Block (Original Cost)</span>
            <Building2 size={16} color="#2d6a4f" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1b4332', marginTop: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
            ₹{(summary?.total_gross_block || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: '#52796f', marginTop: '4px' }}>Original capitalized fixed asset value</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #d8e2dc', borderLeft: '5px solid #d97706', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', letterSpacing: '0.05em' }}>Accumulated Depreciation</span>
            <TrendingDown size={16} color="#d97706" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706', marginTop: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
            ₹{(summary?.total_accumulated_depreciation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: '#52796f', marginTop: '4px' }}>Total written off across books</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #d8e2dc', borderLeft: '5px solid #10b981', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', letterSpacing: '0.05em' }}>Net Carrying Amount (NBV)</span>
            <ShieldCheck size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
            ₹{(summary?.total_net_block || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: '#52796f', marginTop: '4px' }}>Current balance sheet carrying value</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #d8e2dc', borderLeft: '5px solid #7c3aed', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', letterSpacing: '0.05em' }}>Active Fixed Assets</span>
            <Layers size={16} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#7c3aed', marginTop: '6px' }}>
            {summary?.active_assets_count || 0}
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#52796f', marginLeft: '6px' }}>
              ({summary?.categories_count || 0} categories)
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#52796f', marginTop: '4px' }}>{summary?.disposed_assets_count || 0} retired/disposed assets</div>
        </div>
      </div>

      {/* ── PILL TAB NAVIGATION ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          data-testid="tab-register"
          onClick={() => setActiveTab('register')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'register' ? 'none' : '1px solid #d8e2dc',
            background: activeTab === 'register' ? 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)' : '#ffffff',
            color: activeTab === 'register' ? '#ffffff' : '#52796f',
            boxShadow: activeTab === 'register' ? '0 4px 12px rgba(27,67,50,0.15)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Building2 size={15} /> Asset Registry & Net Block ({assets.length})
        </button>
        <button
          data-testid="tab-bulk"
          onClick={() => setActiveTab('bulk')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'bulk' ? 'none' : '1px solid #d8e2dc',
            background: activeTab === 'bulk' ? 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)' : '#ffffff',
            color: activeTab === 'bulk' ? '#ffffff' : '#52796f',
            boxShadow: activeTab === 'bulk' ? '0 4px 12px rgba(27,67,50,0.15)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Zap size={15} /> ⚡ Bulk Depreciation Workbench
        </button>
      </div>

      {/* ── TAB 1: ASSET REGISTRY ── */}
      {activeTab === 'register' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #d8e2dc', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          
          {/* Table Filters Bar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2ece9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', backgroundColor: '#fcfdfc' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <Search size={15} color="#52796f" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                <input
                  type="text"
                  placeholder="Search asset, serial #, location..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none', backgroundColor: '#ffffff', color: '#1b4332' }}
                />
              </div>

              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none', backgroundColor: '#ffffff', color: '#1b4332' }}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.depreciation_rate}%)</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none', backgroundColor: '#ffffff', color: '#1b4332' }}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Disposed">Disposed Only</option>
              </select>
            </div>

            <div style={{ fontSize: '12px', fontWeight: 600, color: '#52796f' }}>
              Showing {filteredAssets.length} of {assets.length} assets
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(90deg, #1b4332 0%, #2d6a4f 50%, #40916c 100%)', color: '#ffffff' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>ASSET NAME & LOCATION</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>CATEGORY & METHOD</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>ACQUISITION DATE</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>ORIGINAL COST (₹)</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>ACCUM. DEP (₹)</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>CURRENT NET BLOCK (₹)</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#52796f' }}>
                      No fixed assets found matching filter criteria. Click <b>+ Capitalize New Asset</b> to add one.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset, idx) => {
                    const cat = categories.find(c => c.id === asset.category_id);
                    const costNum = Number(asset.purchase_value);
                    const netNum = Number(asset.current_net_block);
                    const accumNum = Math.max(0, costNum - netNum);

                    return (
                      <tr
                        key={asset.id}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8faf9',
                          borderBottom: '1px solid #e2ece9',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: '#1b4332' }}>{asset.name}</div>
                          <div style={{ fontSize: '11px', color: '#52796f', marginTop: '2px' }}>
                            {asset.serial_number ? `S/N: ${asset.serial_number} | ` : ''}
                            {asset.location ? `Loc: ${asset.location}` : 'General Warehouse'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontWeight: 600, color: '#2d6a4f' }}>{cat?.name || 'Unassigned'}</span>
                          <div style={{ fontSize: '11px', color: '#52796f', marginTop: '2px' }}>
                            {cat ? `${cat.depreciation_rate}% (${cat.depreciation_method})` : '-'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px', color: '#2d6a4f', whiteSpace: 'nowrap' }}>
                          {new Date(asset.purchase_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#1b4332' }}>
                          ₹{costNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: '#d97706', fontWeight: 600 }}>
                          ₹{accumNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#10b981' }}>
                          ₹{netNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: asset.status === 'Active' ? '#d8f3dc' : '#f1f5f9',
                            color: asset.status === 'Active' ? '#1b4332' : '#64748b',
                            border: `1px solid ${asset.status === 'Active' ? '#b7e4c7' : '#cbd5e1'}`
                          }}>
                            {asset.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => handleViewHistory(asset)}
                              title="View Depreciation Log"
                              style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', color: '#2d6a4f', padding: '5px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <History size={13} /> History
                            </button>
                            {asset.status === 'Active' && (
                              <>
                                <button
                                  data-testid={`btn-depreciate-${asset.id}`}
                                  onClick={() => { setDepAsset(asset); setShowDepModal(true); }}
                                  style={{ backgroundColor: '#d8f3dc', border: '1px solid #74c69d', color: '#1b4332', padding: '5px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Calculator size={13} /> Depreciate
                                </button>
                                <button
                                  onClick={() => { setDisposeAssetTarget(asset); setShowDisposeModal(true); }}
                                  title="Dispose or Sell Asset"
                                  style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '5px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Trash2 size={13} /> Dispose
                                </button>
                              </>
                            )}
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
      )}

      {/* ── TAB 2: BULK DEPRECIATION WORKBENCH ── */}
      {activeTab === 'bulk' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #d8e2dc', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e2ece9', paddingBottom: '14px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1b4332', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} color="#2d6a4f" /> Bulk Period Depreciation Posting Engine
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#52796f' }}>
                Executes monthly/period depreciation across all eligible active fixed assets and posts a single consolidated balanced Journal Voucher to the General Ledger.
              </p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, backgroundColor: '#d8f3dc', color: '#1b4332', padding: '5px 10px', borderRadius: '6px' }}>
              Atomic GL Batch Post
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Depreciation Posting Date *</label>
              <input
                type="date"
                value={bulkRunDate}
                onChange={e => setBulkRunDate(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Batch Narration / Audit Memo</label>
              <input
                type="text"
                placeholder="e.g. Monthly depreciation charge for October 2026"
                value={bulkNotes}
                onChange={e => setBulkNotes(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Active Assets Eligible for Run */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1b4332', marginBottom: '10px' }}>
              Eligible Active Assets for Current Period:
            </h3>
            <div style={{ backgroundColor: '#f8faf9', borderRadius: '8px', border: '1px solid #e2ece9', padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {assets.filter(a => a.status === 'Active' && Number(a.current_net_block) > Number(a.salvage_value)).map(a => {
                  const cat = categories.find(c => c.id === a.category_id);
                  const rate = cat?.depreciation_rate || 0;
                  const estMonthly = (Number(a.current_net_block) * (rate / 100)) / 12;
                  return (
                    <div key={a.id} style={{ backgroundColor: '#ffffff', padding: '12px 14px', borderRadius: '6px', border: '1px solid #d8e2dc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#1b4332' }}>{a.name}</div>
                        <div style={{ fontSize: '11px', color: '#52796f' }}>NBV: ₹{Number(a.current_net_block).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({rate}%)</div>
                      </div>
                      <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#d97706', fontSize: '12px' }}>
                        +₹{estMonthly.toFixed(2)}/mo
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
            <button
              data-testid="btn-bulk-depreciate-run"
              onClick={handleRunBulkDepreciation}
              disabled={loading}
              style={{
                backgroundColor: '#1b4332',
                color: '#ffffff',
                border: 'none',
                padding: '11px 24px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(27,67,50,0.2)'
              }}
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
              {loading ? 'Posting to General Ledger...' : 'Post Bulk Depreciation to General Ledger'}
            </button>
          </div>

          {bulkResult && (
            <div style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', backgroundColor: '#d8f3dc', border: '1px solid #74c69d', color: '#1b4332' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>✓ Bulk Run Completed!</div>
              <div style={{ fontSize: '13px' }}>
                Processed {bulkResult.assets_processed} assets with total depreciation of ₹{bulkResult.total_depreciation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.
                {bulkResult.voucher_number && ` Balanced Journal Voucher #${bulkResult.voucher_number} posted to General Ledger.`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REGISTER ASSET MODAL ── */}
      {showRegisterModal && (
        <div data-testid="modal-register-asset" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '580px', border: '1px solid #d8e2dc', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2ece9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, #1b4332 0%, #2d6a4f 100%)', color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} />
                <span style={{ fontWeight: 800, fontSize: '16px' }}>Capitalize New Fixed Asset</span>
              </div>
              <button onClick={() => setShowRegisterModal(false)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleRegisterSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Asset Category *</label>
                  <select
                    data-testid="select-asset-category"
                    value={newCatId}
                    onChange={e => setNewCatId(e.target.value)}
                    required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="">-- Select Statutory Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.depreciation_rate}% {c.depreciation_method})</option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Asset Name / Model *</label>
                  <input
                    data-testid="input-asset-name"
                    type="text"
                    required
                    placeholder="e.g. Dell PowerEdge R750 Server Rack"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Original Purchase Cost (₹) *</label>
                  <input
                    data-testid="input-purchase-value"
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 150000"
                    value={newPurchaseValue}
                    onChange={e => setNewPurchaseValue(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none', fontWeight: 700, color: '#1b4332' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Salvage / Scrap Value (₹)</label>
                  <input
                    data-testid="input-salvage-value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newSalvageValue}
                    onChange={e => setNewSalvageValue(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Acquisition Date *</label>
                  <input
                    data-testid="input-purchase-date"
                    type="date"
                    required
                    value={newPurchaseDate}
                    onChange={e => setNewPurchaseDate(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Serial / Tag Number</label>
                  <input
                    data-testid="input-serial-no"
                    type="text"
                    placeholder="e.g. SRV-2026-904"
                    value={newSerial}
                    onChange={e => setNewSerial(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Physical Location / Room</label>
                  <input
                    data-testid="input-location"
                    type="text"
                    placeholder="e.g. Server Room Rack 2, Head Office"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Accounting preview */}
              {newPurchaseValue && (
                <div style={{ backgroundColor: '#d8f3dc', border: '1px solid #74c69d', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '12px', color: '#1b4332', fontFamily: "'JetBrains Mono', monospace" }}>
                  <div>CAPITALIZATION ACCOUNTING PREVIEW:</div>
                  <div style={{ marginTop: '4px', fontWeight: 700 }}>
                    Dr: Fixed Assets (Gross Block) ₹{parseFloat(newPurchaseValue || '0').toFixed(2)} | Initial Net Block: ₹{parseFloat(newPurchaseValue || '0').toFixed(2)}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', color: '#52796f', padding: '9px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  data-testid="btn-submit-register-asset"
                  type="submit"
                  style={{ backgroundColor: '#1b4332', border: 'none', color: '#ffffff', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Capitalize Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SINGLE DEPRECIATE MODAL ── */}
      {showDepModal && depAsset && (
        <div data-testid="modal-depreciate-asset" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '520px', border: '1px solid #d8e2dc', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2ece9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, #1b4332 0%, #2d6a4f 100%)', color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calculator size={18} />
                <span style={{ fontWeight: 800, fontSize: '16px' }}>Post Asset Depreciation to GL</span>
              </div>
              <button onClick={() => setShowDepModal(false)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#f8faf9', borderRadius: '8px', border: '1px solid #e2ece9' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1b4332' }}>{depAsset.name}</div>
                <div style={{ fontSize: '12px', color: '#52796f', marginTop: '2px' }}>
                  Current Net Block: ₹{Number(depAsset.current_net_block).toLocaleString('en-IN', { minimumFractionDigits: 2 })} | Salvage: ₹{Number(depAsset.salvage_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Depreciation Posting Date *</label>
                <input
                  type="date"
                  value={depRunDate}
                  onChange={e => setDepRunDate(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Audit Narration</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly depreciation charge"
                  value={depNotes}
                  onChange={e => setDepNotes(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
                />
              </div>

              {/* Live Preview Box */}
              <div style={{ backgroundColor: '#d8f3dc', border: '1px solid #74c69d', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '12px', color: '#1b4332', fontFamily: "'JetBrains Mono', monospace" }}>
                <div>JOURNAL VOUCHER DOUBLE-ENTRY PREVIEW:</div>
                <div style={{ marginTop: '4px', fontWeight: 700 }}>
                  Dr: Depreciation Expense A/c (P&L Exp) | Cr: Accumulated Depreciation A/c
                </div>
                <div style={{ fontSize: '11px', color: '#2d6a4f', marginTop: '4px' }}>
                  📉 Directly debits Profit & Loss Statement (DOC-41), reducing Net Profit in real time.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowDepModal(false)}
                  style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', color: '#52796f', padding: '9px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  data-testid="btn-confirm-depreciate"
                  onClick={handleRunSingleDepreciation}
                  style={{ backgroundColor: '#1b4332', border: 'none', color: '#ffffff', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Confirm & Post Journal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSET DISPOSAL MODAL ── */}
      {showDisposeModal && disposeAssetTarget && (
        <div data-testid="modal-dispose-asset" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '520px', border: '1px solid #d8e2dc', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2ece9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, #991b1b 0%, #b91c1c 100%)', color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} />
                <span style={{ fontWeight: 800, fontSize: '16px' }}>Retire / Dispose Fixed Asset</span>
              </div>
              <button onClick={() => setShowDisposeModal(false)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleDisposeSubmit} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#991b1b' }}>{disposeAssetTarget.name}</div>
                <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '2px' }}>
                  Cost: ₹{Number(disposeAssetTarget.purchase_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })} | Net Carrying Value: ₹{Number(disposeAssetTarget.current_net_block).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Disposal Date *</label>
                  <input
                    type="date"
                    required
                    value={disposeDate}
                    onChange={e => setDisposeDate(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Sale Proceeds Received (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={saleProceeds}
                    onChange={e => setSaleProceeds(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Settlement Deposit Account (If Sale &gt; 0)</label>
                <select
                  value={settlementLedgerId}
                  onChange={e => setSettlementLedgerId(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
                >
                  <option value="">-- Select Cash or Bank Account --</option>
                  {ledgers.filter(l => l.group_name === 'Cash-in-hand' || l.group_name === 'Bank Accounts').map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.group_name})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Reason / Disposal Note</label>
                <input
                  type="text"
                  placeholder="e.g. Scrapped due to obsolescence / Sold to scrap dealer"
                  value={disposeNotes}
                  onChange={e => setDisposeNotes(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowDisposeModal(false)}
                  style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', color: '#52796f', padding: '9px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#b91c1c', border: 'none', color: '#ffffff', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Confirm Disposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── HISTORY DRAWER/MODAL ── */}
      {showHistoryModal && historyAsset && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '640px', border: '1px solid #d8e2dc', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2ece9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, #1b4332 0%, #2d6a4f 100%)', color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} />
                <span style={{ fontWeight: 800, fontSize: '16px' }}>Depreciation Audit Trail: {historyAsset.name}</span>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ padding: '24px', maxHeight: '450px', overflowY: 'auto' }}>
              {historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#52796f' }}>
                  No depreciation logs found for this asset yet.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8faf9', borderBottom: '2px solid #e2ece9', color: '#1b4332' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>RUN DATE</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>DEP AMOUNT (₹)</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>CLOSING NBV (₹)</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>NOTES / MEMO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #e2ece9' }}>
                        <td style={{ padding: '10px', color: '#2d6a4f', fontWeight: 600 }}>
                          {new Date(log.run_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: '#d97706', fontWeight: 700 }}>
                          ₹{Number(log.depreciation_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: '#10b981', fontWeight: 700 }}>
                          ₹{Number(log.closing_net_block).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px', color: '#52796f' }}>{log.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #e2ece9', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#fcfdfc' }}>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{ backgroundColor: '#1b4332', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
