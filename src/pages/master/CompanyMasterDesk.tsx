import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, Search, ArrowLeft, RefreshCw, Layers,
  TrendingUp, DollarSign, Package, CheckCircle2, XCircle,
  Edit2, Trash2, ShieldCheck, ChevronRight, Filter, Users,
  BarChart3, FileText, ExternalLink, X, Save
} from 'lucide-react';
import {
  apiGetManufacturers,
  apiCreateManufacturer,
  apiUpdateManufacturer,
  apiDeleteManufacturer,
  apiGetLedgers,
  apiGetCompanyMasterSummary,
  apiGetCompanyTurnover,
  Manufacturer,
  ManufacturerCreate,
  Ledger,
  CompanyMasterSummary,
  CompanyTurnoverResponse
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
    padding: '20px 28px',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '20px',
    border: '1px solid #d8e2dc',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
    position: 'relative' as const,
    overflow: 'hidden' as const
  },
  pillTab: (active: boolean) => ({
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    border: active ? 'none' : '1px solid #d8e2dc',
    backgroundColor: active ? '#1b4332' : '#ffffff',
    color: active ? '#ffffff' : '#4b5563',
    boxShadow: active ? '0 4px 12px rgba(27, 67, 50, 0.25)' : 'none',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px'
  }),
  tableHeader: {
    background: 'linear-gradient(90deg, #1b4332 0%, #2d6a4f 100%)',
    color: '#ffffff',
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    borderRight: '1px solid rgba(255, 255, 255, 0.1)'
  },
  tableCell: {
    padding: '12px 16px',
    fontSize: '13px',
    borderBottom: '1px solid #e5e7eb',
    color: '#1f2937'
  },
  input: {
    backgroundColor: '#ffffff',
    border: '1.5px solid #d8e2dc',
    borderRadius: '8px',
    padding: '9px 14px',
    fontSize: '13px',
    color: '#111827',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    color: '#4b5563',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    marginBottom: '5px'
  }
};

export const CompanyMasterDesk: React.FC = () => {
  const navigate = useNavigate();

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'TURNOVER'>('DIRECTORY');

  // Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [companies, setCompanies] = useState<Manufacturer[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [summary, setSummary] = useState<CompanyMasterSummary>({
    total_companies: 0,
    active_companies: 0,
    total_products: 0,
    mapped_clients_count: 0
  });

  // Turnover Analytics
  const [turnoverData, setTurnoverData] = useState<CompanyTurnoverResponse | null>(null);
  const [turnoverLoading, setTurnoverLoading] = useState<boolean>(false);
  const [periodFrom, setPeriodFrom] = useState<string>('');
  const [periodTo, setPeriodTo] = useState<string>('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCompany, setEditingCompany] = useState<Manufacturer | null>(null);
  const [formData, setFormData] = useState<ManufacturerCreate>({
    name: '',
    short_code: '',
    status: 'continue',
    prohibited: false,
    default_discount: 0,
    room_no: '',
    floor: '',
    rack_no: '',
    rack_row_no: '',
    dump_days: 0,
    is_supplier: false,
    supplier_ledger_id: '',
    sales_ledger_id: '',
    division: 'Generics',
    gstin: '',
    state_code: '08',
    email: '',
    contact_number: '',
    field_staff_name: '',
    field_staff_contact: '',
    address: ''
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Load Initial Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, ledgRes, sumRes] = await Promise.all([
        apiGetManufacturers({ search: searchQuery }).catch(() => []),
        apiGetLedgers().catch(() => []),
        apiGetCompanyMasterSummary().catch(() => ({
          total_companies: 0,
          active_companies: 0,
          total_products: 0,
          mapped_clients_count: 0
        }))
      ]);
      setCompanies(compRes);
      setLedgers(ledgRes);
      setSummary(sumRes);
    } catch (err) {
      console.error('Failed to load companies data:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Load Turnover Data
  const fetchTurnover = useCallback(async () => {
    setTurnoverLoading(true);
    try {
      const res = await apiGetCompanyTurnover({
        period_from: periodFrom ? new Date(periodFrom).toISOString() : undefined,
        period_to: periodTo ? new Date(periodTo).toISOString() : undefined
      });
      setTurnoverData(res);
    } catch (err) {
      console.error('Failed to load turnover analytics:', err);
    } finally {
      setTurnoverLoading(false);
    }
  }, [periodFrom, periodTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'TURNOVER') {
      fetchTurnover();
    }
  }, [activeTab, fetchTurnover]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          setIsModalOpen(false);
        } else {
          navigate('/master');
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('DIRECTORY');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveTab('TURNOVER');
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleOpenCreateModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, navigate]);

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      short_code: '',
      status: 'continue',
      prohibited: false,
      default_discount: 0,
      room_no: '',
      floor: '',
      rack_no: '',
      rack_row_no: '',
      dump_days: 0,
      is_supplier: false,
      supplier_ledger_id: '',
      sales_ledger_id: '',
      division: 'Generics',
      gstin: '',
      state_code: '08',
      email: '',
      contact_number: '',
      field_staff_name: '',
      field_staff_contact: '',
      address: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (comp: Manufacturer) => {
    setEditingCompany(comp);
    setFormData({
      name: comp.name,
      short_code: comp.short_code || '',
      status: comp.status,
      prohibited: comp.prohibited,
      default_discount: comp.default_discount || 0,
      room_no: comp.room_no || '',
      floor: comp.floor || '',
      rack_no: comp.rack_no || '',
      rack_row_no: comp.rack_row_no || '',
      dump_days: comp.dump_days || 0,
      is_supplier: comp.is_supplier,
      supplier_ledger_id: comp.supplier_ledger_id || '',
      sales_ledger_id: comp.sales_ledger_id || '',
      division: comp.division || 'Generics',
      gstin: comp.gstin || '',
      state_code: comp.state_code || '08',
      email: comp.email || '',
      contact_number: comp.contact_number || '',
      field_staff_name: comp.field_staff_name || '',
      field_staff_contact: comp.field_staff_contact || '',
      address: comp.address || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Company name is required.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingCompany && editingCompany.id) {
        await apiUpdateManufacturer(editingCompany.id, formData);
      } else {
        await apiCreateManufacturer(formData);
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to save company:', err);
      setFormError(err.response?.data?.detail || err.message || 'Failed to save product company.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to deactivate Product Company "${name}"?`)) {
      try {
        await apiDeleteManufacturer(id);
        await fetchData();
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to deactivate company.');
      }
    }
  };

  // Filtered ledgers
  const creditorLedgers = useMemo(() => {
    return ledgers.filter(l => l.group_name === 'Sundry Creditors' || l.group_name === 'Suppliers');
  }, [ledgers]);

  const debtorLedgers = useMemo(() => {
    return ledgers.filter(l => l.group_name === 'Sundry Debtors' || l.group_name === 'Customers');
  }, [ledgers]);

  return (
    <div style={S.canvas} id="company-master-desk-root">
      {/* ── TOP APEX OPERATIONAL HEADER ───────────────────────── */}
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/master')}
            style={{
              backgroundColor: '#2d6a4f',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700
            }}
            title="Return to Master [Esc]"
          >
            <ArrowLeft size={16} />
            <span>Master [Esc]</span>
          </button>

          <div style={{ width: '1px', height: '28px', backgroundColor: 'rgba(255,255,255,0.2)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)'
            }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.01em' }}>
                  Product Company (Manufacturer) Master
                </h1>
                <span style={{
                  backgroundColor: '#0f2e21',
                  color: '#a7f3d0',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  fontFamily: 'monospace'
                }}>
                  DOC-09 & C&F
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#a7f3d0', opacity: 0.9 }}>
                Brand catalog manufacturers, trading ledger links, and company-wise sales turnover tracking
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchData}
            style={{
              backgroundColor: '#2d6a4f',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              padding: '8px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700
            }}
            title="Refresh Catalog Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            id="btn-new-company"
            onClick={handleOpenCreateModal}
            style={{
              backgroundColor: '#10b981',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              padding: '9px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 800,
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)'
            }}
          >
            <Plus size={16} />
            <span>+ New Company [F4]</span>
          </button>
        </div>
      </div>

      {/* ── 4 EXECUTIVE TELEMETRY KPI CARDS ─────────────────────── */}
      <div style={S.kpiGrid}>
        {/* Total Companies */}
        <div style={{ ...S.card, borderLeft: '5px solid #10b981' }} id="kpi-total-companies">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
              Product Companies
            </span>
            <Building2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#1b4332', fontFamily: 'monospace' }}>
            {summary.total_companies}
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginTop: '4px' }} id="kpi-active-companies">
            ✓ {summary.active_companies} Active trading brands
          </div>
        </div>

        {/* Catalog Products */}
        <div style={{ ...S.card, borderLeft: '5px solid #3b82f6' }} id="kpi-total-products">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
              Associated Products
            </span>
            <Package size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#1e40af', fontFamily: 'monospace' }}>
            {summary.total_products}
          </div>
          <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700, marginTop: '4px' }}>
            Across all pharmaceutical brands
          </div>
        </div>

        {/* Client Multi-Mappings */}
        <div style={{ ...S.card, borderLeft: '5px solid #8b5cf6' }} id="kpi-mapped-clients">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
              Client Mappings
            </span>
            <Users size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#5b21b6', fontFamily: 'monospace' }}>
            {summary.mapped_clients_count} Clients
          </div>
          <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 700, marginTop: '4px' }}>
            Authorized CM multi-tenant links
          </div>
        </div>

        {/* Fast Action to Commission */}
        <div style={{ ...S.card, borderLeft: '5px solid #f59e0b', cursor: 'pointer' }} onClick={() => navigate('/commission')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
              C&F Commission Desk
            </span>
            <DollarSign size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#b45309', marginTop: '6px' }}>
            Calculate Turnover Bills ↗
          </div>
          <div style={{ fontSize: '11px', color: '#92400e', marginTop: '6px' }}>
            Dual-post into Client Purchase Section [Ctrl+4]
          </div>
        </div>
      </div>

      {/* ── PILL TAB NAVIGATION ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          id="tab-btn-directory"
          onClick={() => setActiveTab('DIRECTORY')}
          style={S.pillTab(activeTab === 'DIRECTORY')}
        >
          <Layers size={16} />
          <span>Product Companies Directory [F2] ({companies.length})</span>
        </button>

        <button
          id="tab-btn-turnover"
          onClick={() => setActiveTab('TURNOVER')}
          style={S.pillTab(activeTab === 'TURNOVER')}
        >
          <TrendingUp size={16} />
          <span>Company-Wise Sales & Turnover Telemetry [F5]</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: PRODUCT COMPANIES DIRECTORY
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'DIRECTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter Bar */}
          <div style={{
            ...S.card,
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ position: 'relative', width: '360px' }}>
              <Search size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '11px' }} />
              <input
                id="company-search-input"
                type="text"
                placeholder="Search brand, code, division... [F3]"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ ...S.input, paddingLeft: '38px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#4b5563' }}>
              <span>Showing <strong>{companies.length}</strong> product companies</span>
            </div>
          </div>

          {/* Companies Table */}
          <div style={{ ...S.card, padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} id="table-companies">
              <thead>
                <tr>
                  <th style={S.tableHeader}>Company / Brand Name</th>
                  <th style={S.tableHeader}>Short Code</th>
                  <th style={S.tableHeader}>Division</th>
                  <th style={S.tableHeader}>Purchase Supplier Ledger</th>
                  <th style={S.tableHeader}>Sales / Channel Ledger</th>
                  <th style={{ ...S.tableHeader, textAlign: 'center' }}>Products</th>
                  <th style={{ ...S.tableHeader, textAlign: 'center' }}>Status</th>
                  <th style={{ ...S.tableHeader, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ ...S.tableCell, textAlign: 'center', padding: '36px', color: '#6b7280' }}>
                      Loading product companies...
                    </td>
                  </tr>
                ) : companies.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ ...S.tableCell, textAlign: 'center', padding: '36px', color: '#6b7280' }}>
                      No product companies found matching your search.
                    </td>
                  </tr>
                ) : (
                  companies.map((c, idx) => {
                    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
                    return (
                      <tr key={c.id} style={{ backgroundColor: rowBg, transition: 'background-color 0.1s' }} className="company-row">
                        <td style={{ ...S.tableCell, fontWeight: 700, color: '#111827' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Building2 size={16} color="#1b4332" />
                            <span>{c.name}</span>
                          </div>
                        </td>
                        <td style={{ ...S.tableCell, fontFamily: 'monospace', fontWeight: 800, color: '#047857' }}>
                          <span style={{ backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                            {c.short_code || '---'}
                          </span>
                        </td>
                        <td style={{ ...S.tableCell, color: '#4b5563', fontSize: '12px' }}>
                          {c.division || 'Generics'}
                        </td>
                        <td style={{ ...S.tableCell, color: '#1b4332', fontWeight: 600 }}>
                          {c.supplier_ledger_name ? (
                            <span>{c.supplier_ledger_name}</span>
                          ) : (
                            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Direct Company</span>
                          )}
                        </td>
                        <td style={{ ...S.tableCell, color: '#1e40af', fontWeight: 600 }}>
                          {c.sales_ledger_name ? (
                            <span>{c.sales_ledger_name}</span>
                          ) : (
                            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>All Debtors</span>
                          )}
                        </td>
                        <td style={{ ...S.tableCell, textAlign: 'center', fontFamily: 'monospace', fontWeight: 800 }}>
                          <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                            {c.products_count ?? 0}
                          </span>
                        </td>
                        <td style={{ ...S.tableCell, textAlign: 'center' }}>
                          {c.status === 'continue' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                              <CheckCircle2 size={12} /> Active
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                              <XCircle size={12} /> Closed
                            </span>
                          )}
                        </td>
                        <td style={{ ...S.tableCell, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleOpenEditModal(c)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#2563eb' }}
                              title="Edit Company Details"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteCompany(c.id!, c.name)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#dc2626' }}
                              title="Deactivate Company"
                            >
                              <Trash2 size={15} />
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
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: COMPANY-WISE SALES & TURNOVER TELEMETRY
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'TURNOVER' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} id="turnover-telemetry-container">
          {/* Turnover Filter Bar */}
          <div style={{
            ...S.card,
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <label style={S.label}>From Date</label>
                <input
                  type="date"
                  value={periodFrom}
                  onChange={e => setPeriodFrom(e.target.value)}
                  style={S.input}
                />
              </div>
              <div>
                <label style={S.label}>To Date</label>
                <input
                  type="date"
                  value={periodTo}
                  onChange={e => setPeriodTo(e.target.value)}
                  style={S.input}
                />
              </div>
              <div style={{ alignSelf: 'flex-end' }}>
                <button
                  onClick={fetchTurnover}
                  style={{
                    backgroundColor: '#1b4332',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Filter size={15} />
                  <span>Filter Turnover</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>
                  Total Verified Turnover
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#1b4332', fontFamily: 'monospace' }}>
                  ₹{(turnoverData?.total_gross_turnover || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Turnover Table */}
          <div style={{ ...S.card, padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} id="table-company-turnover">
              <thead>
                <tr>
                  <th style={S.tableHeader}>Product Company</th>
                  <th style={S.tableHeader}>Brand Code</th>
                  <th style={{ ...S.tableHeader, textAlign: 'right' }}>Gross Turnover (₹)</th>
                  <th style={{ ...S.tableHeader, textAlign: 'center' }}>Units Sold</th>
                  <th style={{ ...S.tableHeader, textAlign: 'center' }}>Invoices</th>
                  <th style={S.tableHeader}>Top Selling Products</th>
                  <th style={S.tableHeader}>Top Purchasing Chemist / Buyers</th>
                  <th style={{ ...S.tableHeader, textAlign: 'center' }}>C&F Commission</th>
                </tr>
              </thead>
              <tbody>
                {turnoverLoading ? (
                  <tr>
                    <td colSpan={8} style={{ ...S.tableCell, textAlign: 'center', padding: '36px', color: '#6b7280' }}>
                      Calculating live company-wise turnover...
                    </td>
                  </tr>
                ) : !turnoverData || turnoverData.companies.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ ...S.tableCell, textAlign: 'center', padding: '36px', color: '#6b7280' }}>
                      No sales invoice items recorded for product companies in this date window.
                    </td>
                  </tr>
                ) : (
                  turnoverData.companies.map((c, idx) => {
                    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
                    return (
                      <tr key={c.company_id} style={{ backgroundColor: rowBg }}>
                        <td style={{ ...S.tableCell, fontWeight: 800, color: '#111827' }}>
                          {c.company_name}
                        </td>
                        <td style={{ ...S.tableCell, fontFamily: 'monospace', fontWeight: 800, color: '#047857' }}>
                          {c.short_code || '---'}
                        </td>
                        <td style={{ ...S.tableCell, textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#1b4332', fontSize: '14px' }}>
                          ₹{c.gross_turnover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...S.tableCell, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                          {c.total_quantity_sold}
                        </td>
                        <td style={{ ...S.tableCell, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                          {c.invoices_count}
                        </td>
                        <td style={{ ...S.tableCell, fontSize: '12px' }}>
                          {c.top_products.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                              {c.top_products.map((p, pIdx) => (
                                <li key={pIdx}>
                                  <strong>{p.product_name}</strong> ({p.quantity_sold} units)
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>None</span>
                          )}
                        </td>
                        <td style={{ ...S.tableCell, fontSize: '12px' }}>
                          {c.top_customers.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                              {c.top_customers.map((cust, cIdx) => (
                                <li key={cIdx}>
                                  <strong>{cust.customer_name}</strong> ({cust.invoices_count} invs)
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>None</span>
                          )}
                        </td>
                        <td style={{ ...S.tableCell, textAlign: 'center' }}>
                          <button
                            onClick={() => navigate(`/commission?company_id=${c.company_id}&base_val=${c.gross_turnover}`)}
                            style={{
                              backgroundColor: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              color: '#065f46',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Calculate Bill ↗
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

      {/* ── CREATE / EDIT COMPANY MODAL ───────────────────────── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '720px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid #d8e2dc'
          }}>
            {/* Modal Header */}
            <div style={{
              backgroundColor: '#1b4332',
              padding: '16px 24px',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={20} color="#a7f3d0" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  {editingCompany ? 'Edit Product Company' : 'Register New Product Company (Manufacturer)'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveCompany} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {formError && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #f87171',
                  borderRadius: '8px',
                  color: '#b91c1c',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  {formError}
                </div>
              )}

              {/* Row 1: Name & Short Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={S.label}>Brand / Company Name *</label>
                  <input
                    id="input-company-name"
                    type="text"
                    required
                    placeholder="e.g. Cipla Ltd., Sun Pharma"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    style={S.input}
                  />
                </div>
                <div>
                  <label style={S.label}>Short Code</label>
                  <input
                    id="input-company-code"
                    type="text"
                    placeholder="e.g. CIP, SUN"
                    value={formData.short_code}
                    onChange={e => setFormData({ ...formData, short_code: e.target.value })}
                    style={{ ...S.input, fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Row 2: Division & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={S.label}>Division</label>
                  <input
                    type="text"
                    placeholder="e.g. Generics, Derma, Cardio"
                    value={formData.division}
                    onChange={e => setFormData({ ...formData, division: e.target.value })}
                    style={S.input}
                  />
                </div>
                <div>
                  <label style={S.label}>Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    style={S.input}
                  >
                    <option value="continue">Active (Continue)</option>
                    <option value="close">Closed</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Discount (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.default_discount}
                    onChange={e => setFormData({ ...formData, default_discount: parseFloat(e.target.value) || 0 })}
                    style={S.input}
                  />
                </div>
              </div>

              {/* Row 3: Supplier Ledger & Sales Channel Ledger */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={S.label}>Supplier Ledger (Sundry Creditor)</label>
                  <select
                    id="select-supplier-ledger"
                    value={formData.supplier_ledger_id}
                    onChange={e => setFormData({
                      ...formData,
                      supplier_ledger_id: e.target.value,
                      is_supplier: Boolean(e.target.value)
                    })}
                    style={S.input}
                  >
                    <option value="">-- Direct / No Middleman Supplier --</option>
                    {creditorLedgers.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.group_name})</option>
                    ))}
                  </select>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>
                    Party from whom we purchase this company's products
                  </div>
                </div>

                <div>
                  <label style={S.label}>Sales Channel Ledger (Sundry Debtor)</label>
                  <select
                    id="select-sales-ledger"
                    value={formData.sales_ledger_id}
                    onChange={e => setFormData({ ...formData, sales_ledger_id: e.target.value })}
                    style={S.input}
                  >
                    <option value="">-- All Customers / Regular Debtors --</option>
                    {debtorLedgers.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.group_name})</option>
                    ))}
                  </select>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>
                    Specific customer or consignment agent channel
                  </div>
                </div>
              </div>

              {/* Row 4: GSTIN & State Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={S.label}>Company GSTIN</label>
                  <input
                    type="text"
                    placeholder="27AABCM6135Q1Z8"
                    value={formData.gstin}
                    onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    style={{ ...S.input, fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={S.label}>State Code</label>
                  <input
                    type="text"
                    placeholder="08"
                    value={formData.state_code}
                    onChange={e => setFormData({ ...formData, state_code: e.target.value })}
                    style={{ ...S.input, fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              {/* Row 5: Storage Allocation (Room / Floor / Rack) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={S.label}>Room No</label>
                  <input
                    type="text"
                    value={formData.room_no}
                    onChange={e => setFormData({ ...formData, room_no: e.target.value })}
                    style={S.input}
                  />
                </div>
                <div>
                  <label style={S.label}>Floor</label>
                  <input
                    type="text"
                    value={formData.floor}
                    onChange={e => setFormData({ ...formData, floor: e.target.value })}
                    style={S.input}
                  />
                </div>
                <div>
                  <label style={S.label}>Rack No</label>
                  <input
                    type="text"
                    value={formData.rack_no}
                    onChange={e => setFormData({ ...formData, rack_no: e.target.value })}
                    style={S.input}
                  />
                </div>
                <div>
                  <label style={S.label}>Rack Row</label>
                  <input
                    type="text"
                    value={formData.rack_row_no}
                    onChange={e => setFormData({ ...formData, rack_row_no: e.target.value })}
                    style={S.input}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '12px',
                borderTop: '1px solid #e5e7eb',
                paddingTop: '16px'
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    color: '#374151',
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel [Esc]
                </button>
                <button
                  id="btn-save-company-submit"
                  type="submit"
                  disabled={saving}
                  style={{
                    backgroundColor: '#1b4332',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '9px 24px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(27, 67, 50, 0.3)'
                  }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Product Company'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyMasterDesk;
