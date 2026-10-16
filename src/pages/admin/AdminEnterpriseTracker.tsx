import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  TrendingUp,
  DollarSign,
  Truck,
  Layers,
  ArrowLeft,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  Package,
  Calendar,
  Building,
  BarChart3,
  ExternalLink,
  MapPin,
  Tag,
  CreditCard,
  FileText
} from 'lucide-react';
import {
  apiGetAdminTrackingSummary,
  apiGetAdminClientScorecards,
  apiGetAdminSalesTracking,
  apiGetAdminExpenseTracking,
  apiGetAdminCargoTracking,
  apiGetOrganizations,
  AdminTrackingSummary,
  ClientScorecardItem,
  AdminSalesInvoiceItem,
  AdminExpenseItem,
  AdminCargoItem,
  Organization
} from '../../lib/api';

const S = {
  canvas: {
    minHeight: '100vh',
    backgroundColor: '#eef2ef',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    color: '#111827',
    padding: '24px 32px'
  },
  header: {
    backgroundColor: '#1b4332',
    borderRadius: '16px',
    padding: '22px 30px',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    boxShadow: '0 4px 20px rgba(27, 67, 50, 0.25)',
    flexWrap: 'wrap' as const,
    gap: '16px'
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '20px',
    border: '1px solid #d8e2dc',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
    position: 'relative' as const,
    overflow: 'hidden' as const
  },
  tabButton: (active: boolean) => ({
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600 as const,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    border: active ? '1px solid #1b4332' : '1px solid #d8e2dc',
    backgroundColor: active ? '#1b4332' : '#ffffff',
    color: active ? '#ffffff' : '#4b5563',
    transition: 'all 0.2s ease',
    boxShadow: active ? '0 2px 8px rgba(27, 67, 50, 0.2)' : 'none'
  }),
  tableTh: {
    backgroundColor: '#1b4332',
    color: '#ffffff',
    fontWeight: 700 as const,
    fontSize: '12px',
    padding: '12px 16px',
    textAlign: 'left' as const,
    borderBottom: '2px solid #2d6a4f',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  },
  tableTd: {
    padding: '14px 16px',
    fontSize: '13px',
    color: '#1f2937',
    borderBottom: '1px solid #f3f4f6'
  }
};

export default function AdminEnterpriseTracker() {
  const navigate = useNavigate();

  // Active Tab: 'scorecards' | 'sales' | 'expenses' | 'cargo'
  const [activeTab, setActiveTab] = useState<'scorecards' | 'sales' | 'expenses' | 'cargo'>('scorecards');

  // Filters
  const [selectedClientOrgId, setSelectedClientOrgId] = useState<string>('');
  const [dateRangePreset, setDateRangePreset] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Loading & State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [summary, setSummary] = useState<AdminTrackingSummary | null>(null);
  const [scorecards, setScorecards] = useState<ClientScorecardItem[]>([]);
  const [salesData, setSalesData] = useState<{
    gross_turnover: number;
    invoices_count: number;
    invoices: AdminSalesInvoiceItem[];
    client_breakdown: any[];
  }>({ gross_turnover: 0, invoices_count: 0, invoices: [], client_breakdown: [] });
  const [expenseData, setExpenseData] = useState<{
    total_amount: number;
    items: AdminExpenseItem[];
    category_breakdown: any[];
    client_breakdown: any[];
  }>({ total_amount: 0, items: [], category_breakdown: [], client_breakdown: [] });
  const [cargoData, setCargoData] = useState<{
    total_consignments: number;
    in_transit_count: number;
    delivered_count: number;
    exceptions_count: number;
    total_freight_cost: number;
    consignments: AdminCargoItem[];
    client_breakdown: any[];
  }>({
    total_consignments: 0,
    in_transit_count: 0,
    delivered_count: 0,
    exceptions_count: 0,
    total_freight_cost: 0,
    consignments: [],
    client_breakdown: []
  });

  // Calculate Date Boundaries
  const dateParams = useMemo(() => {
    if (dateRangePreset === 'all') return {};
    const now = new Date();
    const toDate = now.toISOString().split('T')[0];
    let fromDate = toDate;

    if (dateRangePreset === 'today') {
      fromDate = toDate;
    } else if (dateRangePreset === 'last7') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      fromDate = d.toISOString().split('T')[0];
    } else if (dateRangePreset === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      fromDate = d.toISOString().split('T')[0];
    } else if (dateRangePreset === 'fy') {
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      fromDate = `${year}-04-01`;
    }

    return { from_date: fromDate, to_date: toDate };
  }, [dateRangePreset]);

  // Load Initial Organizations & Summary
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Orgs for Dropdown
      const orgsRes = await apiGetOrganizations();
      setOrganizations(orgsRes || []);

      // 2. Fetch Executive Summary
      const summaryRes = await apiGetAdminTrackingSummary();
      setSummary(summaryRes);

      // 3. Fetch Client Scorecards
      const scorecardsRes = await apiGetAdminClientScorecards();
      setScorecards(scorecardsRes || []);

      // 4. Fetch Tab Specific Data
      const clientOrgId = selectedClientOrgId || undefined;

      const [salesRes, expRes, cargoRes] = await Promise.all([
        apiGetAdminSalesTracking({
          client_org_id: clientOrgId,
          ...dateParams,
          search: searchQuery || undefined,
          limit: 100
        }),
        apiGetAdminExpenseTracking({
          client_org_id: clientOrgId,
          ...dateParams,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          limit: 100
        }),
        apiGetAdminCargoTracking({
          client_org_id: clientOrgId,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: searchQuery || undefined,
          limit: 100
        })
      ]);

      setSalesData({
        gross_turnover: salesRes.total_gross_turnover,
        invoices_count: salesRes.total_invoices_count,
        invoices: salesRes.invoices,
        client_breakdown: salesRes.client_breakdown || []
      });

      setExpenseData({
        total_amount: expRes.total_expenses_amount,
        items: expRes.items,
        category_breakdown: expRes.category_breakdown || [],
        client_breakdown: expRes.client_breakdown || []
      });

      setCargoData({
        total_consignments: cargoRes.total_consignments,
        in_transit_count: cargoRes.in_transit_count,
        delivered_count: cargoRes.delivered_count,
        exceptions_count: cargoRes.exceptions_count,
        total_freight_cost: cargoRes.total_freight_cost,
        consignments: cargoRes.consignments,
        client_breakdown: cargoRes.client_breakdown || []
      });
    } catch (err) {
      console.error('Failed to load Enterprise Admin Tracking telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClientOrgId, dateParams, searchQuery, statusFilter]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleTabChange = useCallback((tab: 'scorecards' | 'sales' | 'expenses' | 'cargo') => {
    setActiveTab(tab);
    setStatusFilter('ALL');
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/');
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleTabChange('scorecards');
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleTabChange('sales');
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleTabChange('expenses');
      } else if (e.key === 'F6') {
        e.preventDefault();
        handleTabChange('cargo');
      } else if (e.key === 'F5') {
        // Prevent default browser refresh to trigger data reload
        e.preventDefault();
        fetchAllData();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, fetchAllData, handleTabChange]);

  // Format INR Currency
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  const selectedClientName = useMemo(() => {
    if (!selectedClientOrgId) return 'All Client Companies (Consolidated)';
    const match = organizations.find((o) => o.id === selectedClientOrgId);
    return match ? `${match.name} (${match.org_code})` : 'Selected Client';
  }, [selectedClientOrgId, organizations]);

  return (
    <div style={S.canvas}>
      {/* ── APEX HEADER BAR ─────────────────────────────────────── */}
      <header style={S.header} id="admin-tracker-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '10px',
              padding: '10px',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease'
            }}
            title="Return to Counter Workbench [Esc]"
            id="btn-back-workbench"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                Enterprise Multi-Client Admin Tracker
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#40916c',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  letterSpacing: '0.05em'
                }}
              >
                MAIN ADMIN RADAR
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#d8e2dc', opacity: 0.9 }}>
              Consolidated real-time operational telemetry across all client organizations, sales turnover, C&F expenses, and cargo logistics.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Client Company Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#d8e2dc', fontWeight: 600 }}>Client Scope:</span>
            <select
              id="select-client-scope"
              value={selectedClientOrgId}
              onChange={(e) => setSelectedClientOrgId(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                color: '#111827',
                border: '1px solid #d8e2dc',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">All Client Companies (Consolidated)</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} [{org.org_code}] {org.is_am ? '★ AM Main' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <select
            id="select-date-preset"
            value={dateRangePreset}
            onChange={(e) => setDateRangePreset(e.target.value)}
            style={{
              backgroundColor: '#ffffff',
              color: '#111827',
              border: '1px solid #d8e2dc',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="last7">Last 7 Days</option>
            <option value="month">Current Month</option>
            <option value="fy">Financial Year (FY)</option>
          </select>

          {/* Refresh Action Button */}
          <button
            id="btn-refresh-telemetry"
            onClick={fetchAllData}
            disabled={isLoading}
            style={{
              backgroundColor: '#2d6a4f',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Refresh Telemetry [F5]"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </header>

      {/* ── ACTIVE SCOPE BANNER ─────────────────────────────────── */}
      <div
        id="active-scope-banner"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '12px 20px',
          border: '1px solid #d8e2dc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building2 size={18} style={{ color: '#2d6a4f' }} />
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Active Analysis Scope:</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#1b4332' }}>{selectedClientName}</span>
          {selectedClientOrgId && (
            <button
              onClick={() => setSelectedClientOrgId('')}
              style={{
                background: '#fee2e2',
                color: '#b91c1c',
                border: 'none',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Reset to All
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#6b7280' }}>
          <span>
            Shortcut Keys: <kbd style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>F2</kbd> Clients |{' '}
            <kbd style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>F3</kbd> Sales |{' '}
            <kbd style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>F4</kbd> Expenses |{' '}
            <kbd style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>F6</kbd> Cargo |{' '}
            <kbd style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>Esc</kbd> Exit
          </span>
        </div>
      </div>

      {/* ── 4 NEUMORPHIC KPI CARDS ─────────────────────────────── */}
      <div style={S.kpiGrid} id="admin-tracker-kpis">
        {/* KPI 1: Gross Sales Turnover */}
        <div style={S.card} id="kpi-sales-turnover">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                Total Sales Turnover
              </span>
              <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#1b4332', margin: '6px 0 2px 0' }}>
                {formatINR(selectedClientOrgId ? salesData.gross_turnover : summary?.total_sales_turnover || 0)}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#059669', fontWeight: 500 }}>
                {selectedClientOrgId ? salesData.invoices_count : summary?.total_sales_invoices_count || 0} Invoices Dispatched
              </p>
            </div>
            <div
              style={{
                backgroundColor: '#d8f3dc',
                color: '#1b4332',
                padding: '12px',
                borderRadius: '12px'
              }}
            >
              <TrendingUp size={22} />
            </div>
          </div>
        </div>

        {/* KPI 2: Total Operating Expenses */}
        <div style={S.card} id="kpi-expenses">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                Total Expenses & C&F
              </span>
              <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#b91c1c', margin: '6px 0 2px 0' }}>
                {formatINR(selectedClientOrgId ? expenseData.total_amount : summary?.total_expenses_amount || 0)}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                Operational, Rent & Staff Claims
              </p>
            </div>
            <div
              style={{
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                padding: '12px',
                borderRadius: '12px'
              }}
            >
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        {/* KPI 3: In-Transit Cargo */}
        <div style={S.card} id="kpi-cargo">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                Cargo & Consignments
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0 2px 0' }}>
                <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#1d4ed8', margin: 0 }}>
                  {selectedClientOrgId ? cargoData.in_transit_count : summary?.active_in_transit_cargo || 0}
                </h3>
                <span
                  style={{
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                >
                  IN-TRANSIT
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                {selectedClientOrgId ? cargoData.delivered_count : summary?.delivered_cargo_count || 0} Delivered |{' '}
                {selectedClientOrgId ? cargoData.total_consignments : summary?.total_cargo_consignments || 0} Total
              </p>
            </div>
            <div
              style={{
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                padding: '12px',
                borderRadius: '12px'
              }}
            >
              <Truck size={22} />
            </div>
          </div>
        </div>

        {/* KPI 4: Client Network & Product Brands */}
        <div style={S.card} id="kpi-clients-network">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                Clients & Product Brands
              </span>
              <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#7c3aed', margin: '6px 0 2px 0' }}>
                {summary?.total_clients_count || 0} Clients
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                {summary?.total_product_companies_count || 0} Authorized Product Brands
              </p>
            </div>
            <div
              style={{
                backgroundColor: '#ede9fe',
                color: '#7c3aed',
                padding: '12px',
                borderRadius: '12px'
              }}
            >
              <Layers size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION ─────────────────────────────────────── */}
      <div
        id="admin-tracker-tabs"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          borderBottom: '1px solid #d8e2dc',
          paddingBottom: '12px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            id="tab-btn-scorecards"
            onClick={() => handleTabChange('scorecards')}
            style={S.tabButton(activeTab === 'scorecards')}
          >
            <Building2 size={16} />
            <span>[F2] Client Scorecards</span>
            <span
              style={{
                backgroundColor: activeTab === 'scorecards' ? '#2d6a4f' : '#f3f4f6',
                color: activeTab === 'scorecards' ? '#ffffff' : '#374151',
                padding: '2px 7px',
                borderRadius: '10px',
                fontSize: '11px'
              }}
            >
              {scorecards.length}
            </span>
          </button>

          <button
            id="tab-btn-sales"
            onClick={() => handleTabChange('sales')}
            style={S.tabButton(activeTab === 'sales')}
          >
            <TrendingUp size={16} />
            <span>[F3] Sales Tracking</span>
            <span
              style={{
                backgroundColor: activeTab === 'sales' ? '#2d6a4f' : '#f3f4f6',
                color: activeTab === 'sales' ? '#ffffff' : '#374151',
                padding: '2px 7px',
                borderRadius: '10px',
                fontSize: '11px'
              }}
            >
              {salesData.invoices.length}
            </span>
          </button>

          <button
            id="tab-btn-expenses"
            onClick={() => handleTabChange('expenses')}
            style={S.tabButton(activeTab === 'expenses')}
          >
            <DollarSign size={16} />
            <span>[F4] Expenses Tracking</span>
            <span
              style={{
                backgroundColor: activeTab === 'expenses' ? '#2d6a4f' : '#f3f4f6',
                color: activeTab === 'expenses' ? '#ffffff' : '#374151',
                padding: '2px 7px',
                borderRadius: '10px',
                fontSize: '11px'
              }}
            >
              {expenseData.items.length}
            </span>
          </button>

          <button
            id="tab-btn-cargo"
            onClick={() => handleTabChange('cargo')}
            style={S.tabButton(activeTab === 'cargo')}
          >
            <Truck size={16} />
            <span>[F6] Cargo Tracking</span>
            <span
              style={{
                backgroundColor: activeTab === 'cargo' ? '#2d6a4f' : '#f3f4f6',
                color: activeTab === 'cargo' ? '#ffffff' : '#374151',
                padding: '2px 7px',
                borderRadius: '10px',
                fontSize: '11px'
              }}
            >
              {cargoData.consignments.length}
            </span>
          </button>
        </div>

        {/* Search filter for active tab */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #d8e2dc',
              padding: '6px 12px',
              gap: '6px',
              width: '240px'
            }}
          >
            <Search size={15} style={{ color: '#9ca3af' }} />
            <input
              id="input-tracker-search"
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '13px',
                width: '100%',
                backgroundColor: 'transparent'
              }}
            />
          </div>

          {(activeTab === 'expenses' || activeTab === 'cargo') && (
            <select
              id="select-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #d8e2dc',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Statuses</option>
              {activeTab === 'expenses' ? (
                <>
                  <option value="Approved">Approved</option>
                  <option value="Paid">Paid</option>
                  <option value="Settled">Settled</option>
                </>
              ) : (
                <>
                  <option value="IN_TRANSIT">In-Transit</option>
                  <option value="LOADING">Loading</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="EXCEPTION">Exception</option>
                </>
              )}
            </select>
          )}
        </div>
      </div>

      {/* ── TAB 1: CLIENT-WISE SCORECARDS (MATRIX) ─────────────── */}
      {activeTab === 'scorecards' && (
        <div style={S.card} id="section-client-scorecards">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1b4332' }}>
                Client Organization Performance Matrix
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                Comparative overview of sales turnover, operating expenses, cargo throughput, and mapped product brands by client.
              </p>
            </div>
            <button
              onClick={() => navigate('/clients')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              <span>Manage Clients Master</span>
              <ExternalLink size={13} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }} id="table-client-scorecards">
              <thead>
                <tr>
                  <th style={S.tableTh}>Client Company</th>
                  <th style={S.tableTh}>Type</th>
                  <th style={{ ...S.tableTh, textAlign: 'right' }}>Sales Turnover</th>
                  <th style={{ ...S.tableTh, textAlign: 'center' }}>Invoices</th>
                  <th style={{ ...S.tableTh, textAlign: 'right' }}>Expenses</th>
                  <th style={{ ...S.tableTh, textAlign: 'center' }}>Cargo In-Transit</th>
                  <th style={S.tableTh}>Mapped Product Brands</th>
                  <th style={{ ...S.tableTh, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {scorecards
                  .filter((sc) => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      sc.organization_name.toLowerCase().includes(q) ||
                      sc.org_code.toLowerCase().includes(q)
                    );
                  })
                  .map((client) => {
                    const isCurrentFilter = selectedClientOrgId === client.organization_id;
                    return (
                      <tr
                        key={client.organization_id}
                        style={{
                          backgroundColor: isCurrentFilter ? '#f0fdf4' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={S.tableTd}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Building2 size={16} style={{ color: client.is_am ? '#d97706' : '#2d6a4f' }} />
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827' }}>{client.organization_name}</div>
                              <span style={{ fontSize: '11px', color: '#6b7280' }}>Code: {client.org_code}</span>
                            </div>
                          </div>
                        </td>
                        <td style={S.tableTd}>
                          {client.is_am ? (
                            <span
                              style={{
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700
                              }}
                            >
                              AM ADMIN
                            </span>
                          ) : (
                            <span
                              style={{
                                backgroundColor: '#e0f2fe',
                                color: '#0369a1',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600
                              }}
                            >
                              CLIENT ORG
                            </span>
                          )}
                        </td>
                        <td style={{ ...S.tableTd, textAlign: 'right', fontWeight: 700, color: '#1b4332' }}>
                          {formatINR(client.total_sales_turnover)}
                        </td>
                        <td style={{ ...S.tableTd, textAlign: 'center' }}>
                          <span
                            style={{
                              backgroundColor: '#f3f4f6',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            {client.sales_invoices_count}
                          </span>
                        </td>
                        <td style={{ ...S.tableTd, textAlign: 'right', fontWeight: 600, color: '#b91c1c' }}>
                          {formatINR(client.total_expenses)}
                        </td>
                        <td style={{ ...S.tableTd, textAlign: 'center' }}>
                          {client.active_consignments_count > 0 ? (
                            <span
                              style={{
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700
                              }}
                            >
                              {client.active_consignments_count} Active
                            </span>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>0</span>
                          )}
                        </td>
                        <td style={S.tableTd}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {client.mapped_companies && client.mapped_companies.length > 0 ? (
                              client.mapped_companies.map((m, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    backgroundColor: m.is_primary ? '#dcfce7' : '#f3f4f6',
                                    color: m.is_primary ? '#166534' : '#374151',
                                    border: m.is_primary ? '1px solid #86efac' : '1px solid #e5e7eb',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 500
                                  }}
                                  title={`${m.name} ${m.commission_rate_override ? `(${m.commission_rate_override}%)` : ''}`}
                                >
                                  {m.short_code || m.name}
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                                No brands mapped
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ ...S.tableTd, textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setSelectedClientOrgId(client.organization_id);
                              handleTabChange('sales');
                            }}
                            style={{
                              backgroundColor: isCurrentFilter ? '#1b4332' : '#ffffff',
                              color: isCurrentFilter ? '#ffffff' : '#2d6a4f',
                              border: '1px solid #2d6a4f',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>Drilldown</span>
                            <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: GLOBAL SALES TRACKING ─────────────────────────── */}
      {activeTab === 'sales' && (
        <div style={S.card} id="section-sales-tracking">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1b4332' }}>
                Multi-Client Sales Invoices Ledger
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                Consolidated billings and sales invoices with client company attribution.
              </p>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1b4332' }}>
              Showing {salesData.invoices.length} of {salesData.invoices_count} invoices | Total:{' '}
              {formatINR(salesData.gross_turnover)}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }} id="table-sales-invoices">
              <thead>
                <tr>
                  <th style={S.tableTh}>Invoice #</th>
                  <th style={S.tableTh}>Date</th>
                  <th style={S.tableTh}>Client Company</th>
                  <th style={S.tableTh}>Customer / Party</th>
                  <th style={S.tableTh}>Type</th>
                  <th style={{ ...S.tableTh, textAlign: 'center' }}>Items</th>
                  <th style={{ ...S.tableTh, textAlign: 'right' }}>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {salesData.invoices.length > 0 ? (
                  salesData.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ ...S.tableTd, fontWeight: 600, color: '#1e40af' }}>{inv.invoice_number}</td>
                      <td style={S.tableTd}>{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                      <td style={S.tableTd}>
                        <span
                          style={{
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {inv.client_name} [{inv.client_code}]
                        </span>
                      </td>
                      <td style={S.tableTd}>{inv.customer_name || 'Walk-in / Cash Customer'}</td>
                      <td style={S.tableTd}>
                        <span
                          style={{
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 500,
                            textTransform: 'uppercase'
                          }}
                        >
                          {inv.invoice_type}
                        </span>
                      </td>
                      <td style={{ ...S.tableTd, textAlign: 'center' }}>{inv.items_count}</td>
                      <td style={{ ...S.tableTd, textAlign: 'right', fontWeight: 700, color: '#1b4332' }}>
                        {formatINR(inv.grand_total)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ ...S.tableTd, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>
                      No sales invoices found for the selected client or date scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: EXPENSE & C&F CLAIMS TRACKING ─────────────────── */}
      {activeTab === 'expenses' && (
        <div style={S.card} id="section-expense-tracking">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1b4332' }}>
                Multi-Client Expense Claims & Operational Ledger
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                C&F operational charges, godown storage rent, dedicated staff salaries, and freight costs.
              </p>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#b91c1c' }}>
              Total Expenses: {formatINR(expenseData.total_amount)}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }} id="table-expenses">
              <thead>
                <tr>
                  <th style={S.tableTh}>Claim #</th>
                  <th style={S.tableTh}>Date</th>
                  <th style={S.tableTh}>Client Company</th>
                  <th style={S.tableTh}>Status</th>
                  <th style={S.tableTh}>Remarks / Notes</th>
                  <th style={{ ...S.tableTh, textAlign: 'right' }}>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenseData.items.length > 0 ? (
                  expenseData.items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ ...S.tableTd, fontWeight: 600, color: '#374151' }}>{item.claim_number}</td>
                      <td style={S.tableTd}>{new Date(item.date).toLocaleDateString('en-IN')}</td>
                      <td style={S.tableTd}>
                        <span
                          style={{
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {item.client_name} [{item.client_code}]
                        </span>
                      </td>
                      <td style={S.tableTd}>
                        <span
                          style={{
                            backgroundColor:
                              item.status === 'Approved'
                                ? '#dcfce7'
                                : item.status === 'Paid'
                                ? '#e0e7ff'
                                : '#fef3c7',
                            color:
                              item.status === 'Approved'
                                ? '#166534'
                                : item.status === 'Paid'
                                ? '#3730a3'
                                : '#92400e',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={S.tableTd}>{item.remarks || 'Standard operational claim'}</td>
                      <td style={{ ...S.tableTd, textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>
                        {formatINR(item.total_amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ ...S.tableTd, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>
                      No expense claims found for the selected scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: CARGO & CONSIGNMENT TRACKING ─────────────────── */}
      {activeTab === 'cargo' && (
        <div style={S.card} id="section-cargo-tracking">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1b4332' }}>
                Multi-Client Logistics & Cargo Consignments
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                Cross-client freight shipments, driver contact telemetry, LR tracking, and delivery statuses.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}
              >
                In-Transit: {cargoData.in_transit_count}
              </span>
              <span
                style={{
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}
              >
                Delivered: {cargoData.delivered_count}
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }} id="table-cargo">
              <thead>
                <tr>
                  <th style={S.tableTh}>Consignment #</th>
                  <th style={S.tableTh}>Client Company</th>
                  <th style={S.tableTh}>Transporter</th>
                  <th style={S.tableTh}>Vehicle / Driver</th>
                  <th style={S.tableTh}>Route (Origin → Destination)</th>
                  <th style={S.tableTh}>Status</th>
                  <th style={{ ...S.tableTh, textAlign: 'right' }}>Freight Cost</th>
                </tr>
              </thead>
              <tbody>
                {cargoData.consignments.length > 0 ? (
                  cargoData.consignments.map((cargo) => (
                    <tr key={cargo.id}>
                      <td style={S.tableTd}>
                        <div style={{ fontWeight: 600, color: '#1e40af' }}>{cargo.consignment_number}</div>
                        {cargo.lr_no && <div style={{ fontSize: '11px', color: '#6b7280' }}>LR: {cargo.lr_no}</div>}
                      </td>
                      <td style={S.tableTd}>
                        <span
                          style={{
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {cargo.client_name}
                        </span>
                      </td>
                      <td style={S.tableTd}>{cargo.transporter_name}</td>
                      <td style={S.tableTd}>
                        <div style={{ fontWeight: 500 }}>{cargo.vehicle_no || 'Pending Assignment'}</div>
                        {cargo.driver_name && (
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            {cargo.driver_name} {cargo.driver_phone ? `(${cargo.driver_phone})` : ''}
                          </div>
                        )}
                      </td>
                      <td style={S.tableTd}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <span style={{ color: '#4b5563' }}>{cargo.origin_hub}</span>
                          <span style={{ color: '#9ca3af' }}>→</span>
                          <span style={{ fontWeight: 600, color: '#111827' }}>{cargo.destination_hub}</span>
                        </div>
                      </td>
                      <td style={S.tableTd}>
                        <span
                          style={{
                            backgroundColor:
                              cargo.status === 'DELIVERED'
                                ? '#dcfce7'
                                : cargo.status === 'IN_TRANSIT'
                                ? '#dbeafe'
                                : cargo.status === 'EXCEPTION'
                                ? '#fee2e2'
                                : '#fef3c7',
                            color:
                              cargo.status === 'DELIVERED'
                                ? '#166534'
                                : cargo.status === 'IN_TRANSIT'
                                ? '#1e40af'
                                : cargo.status === 'EXCEPTION'
                                ? '#991b1b'
                                : '#92400e',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}
                        >
                          {cargo.status}
                        </span>
                      </td>
                      <td style={{ ...S.tableTd, textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                        {formatINR(cargo.gross_cost)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ ...S.tableTd, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>
                      No cargo consignments found for the selected scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
