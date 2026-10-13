import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, RefreshCw, Download, FileSpreadsheet, FileText, 
  Filter, Search, ArrowLeft, Sliders, CheckCircle2, Building2, 
  Users, Package, Receipt, Calendar, PlusCircle, Trash2, Play, AlertCircle,
  ChevronDown, ChevronRight, X, CheckSquare, Square
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { exportToCSV, exportToExcel, exportToPDF } from '../../lib/exportUtils';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';

export default function ReportViewer() {
  useReturnNavigation();
  const navigate = useNavigate();

  // Active top-level mode
  const [activeTab, setActiveTab] = useState<'sales_reports' | 'financial_reports' | 'inventory_reports' | 'designer'>('sales_reports');

  // Sales sub-report selection
  const [salesReportType, setSalesReportType] = useState<'party' | 'company' | 'product' | 'bill'>('company');

  // Common filters
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'mtd' | 'ytd'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [useExclusions, setUseExclusions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Data state
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Designer state
  const [designerSubject, setDesignerSubject] = useState<'Sales' | 'Ledger' | 'Inventory'>('Sales');
  const [designerGroupBy, setDesignerGroupBy] = useState<'company' | 'party' | 'product' | 'none'>('company');
  const [designerMinAmount, setDesignerMinAmount] = useState('');
  const [designerPartySearch, setDesignerPartySearch] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Apply date preset helper
  const handleDatePreset = (preset: 'all' | 'today' | 'mtd' | 'ytd') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'mtd') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];
      setFromDate(firstDay);
      setToDate(todayStr);
    } else if (preset === 'ytd') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];
      setFromDate(firstDayYear);
      setToDate(todayStr);
    }
  };

  // Company filter state (Marg ERP Style)
  const [companiesList, setCompaniesList] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [companyProductsMap, setCompanyProductsMap] = useState<Record<string, any[]>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Load all companies for the Marg selector
  const loadCompaniesList = async () => {
    try {
      const res = await apiClient.get('/api/master/manufacturers');
      setCompaniesList(res.data || []);
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  };

  useEffect(() => {
    loadCompaniesList();
  }, []);

  // Fetch product drilldown for a specific company
  const toggleCompanyDrilldown = async (companyId: string) => {
    if (expandedCompanyId === companyId) {
      setExpandedCompanyId(null);
      return;
    }
    setExpandedCompanyId(companyId);
    if (!companyProductsMap[companyId]) {
      setLoadingProducts(true);
      try {
        const res = await apiClient.get('/api/reports_v2/sales/company-wise/products', {
          params: {
            company_id: companyId,
            from_date: fromDate || undefined,
            to_date: toDate || undefined
          }
        });
        setCompanyProductsMap(prev => ({ ...prev, [companyId]: res.data?.data || [] }));
      } catch (err) {
        console.error('Failed to load company products:', err);
      } finally {
        setLoadingProducts(false);
      }
    }
  };

  // Fetch report data based on active tab and filters
  const fetchReportData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (activeTab === 'sales_reports') {
        const endpoint = `/api/reports_v2/sales/${salesReportType}-wise`;
        const res = await apiClient.get(endpoint, {
          params: {
            company_ids: salesReportType === 'company' && selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : undefined,
            from_date: fromDate || undefined,
            to_date: toDate || undefined,
            use_exclusions: useExclusions
          }
        });
        const rows = res.data?.data || [];
        setData(rows);
        if (rows.length > 0) {
          setColumns(Object.keys(rows[0]).filter(k => k !== 'company_id'));
        } else {
          setColumns([]);
        }
      } else if (activeTab === 'financial_reports') {
        const res = await apiClient.post('/api/reports_v2/execute/Ledger', { use_exclusions: useExclusions });
        const rows = res.data?.data || [];
        setData(rows);
        setColumns(rows.length > 0 ? Object.keys(rows[0]) : []);
      } else if (activeTab === 'inventory_reports') {
        const res = await apiClient.post('/api/reports_v2/execute/Inventory', { use_exclusions: useExclusions });
        const rows = res.data?.data || [];
        setData(rows);
        setColumns(rows.length > 0 ? Object.keys(rows[0]) : []);
      }
    } catch (err: any) {
      console.error('Failed to load report:', err);
      setData([]);
      setColumns([]);
      setErrorMessage(err?.response?.data?.detail || 'Unable to retrieve report records.');
    } finally {
      setLoading(false);
    }
  };

  // Run dynamic designer query
  const executeDesignerQuery = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.post('/api/reports_v2/query', {
        subject: designerSubject,
        group_by: designerGroupBy,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        min_amount: designerMinAmount || undefined,
        party_name: designerPartySearch || undefined,
        use_exclusions: useExclusions
      });
      setData(res.data?.data || []);
      setColumns(res.data?.columns || []);
    } catch (err: any) {
      console.error('Designer query error:', err);
      setErrorMessage(err?.response?.data?.detail || 'Unable to execute query. Please check filters.');
    } finally {
      setLoading(false);
    }
  };

  // Load published templates
  const loadTemplates = async () => {
    try {
      const res = await apiClient.get('/api/reports_v2/templates');
      setTemplates(res.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  // Save new template
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setErrorMessage('Please enter a name for your custom report template');
      return;
    }
    setSavingTemplate(true);
    setErrorMessage(null);
    try {
      await apiClient.post('/api/reports_v2/templates', {
        name: templateName,
        subject: designerSubject,
        config: {
          group_by: designerGroupBy,
          min_amount: designerMinAmount,
          party_name: designerPartySearch,
          use_exclusions: useExclusions
        },
        is_published: true
      });
      setTemplateName('');
      setNotification(`Template "${templateName}" saved successfully!`);
      setTimeout(() => setNotification(null), 3000);
      loadTemplates();
    } catch (err: any) {
      console.error('Failed to save template:', err);
      setErrorMessage('Error saving report template to library');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (id: string) => {
    try {
      await apiClient.delete(`/api/reports_v2/templates/${id}`);
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  // Run a saved template
  const handleRunTemplate = (tpl: any) => {
    const cfg = tpl.config || {};
    setDesignerSubject(tpl.subject || 'Sales');
    if (cfg.group_by) setDesignerGroupBy(cfg.group_by);
    if (cfg.min_amount) setDesignerMinAmount(cfg.min_amount);
    if (cfg.party_name) setDesignerPartySearch(cfg.party_name);
    if (cfg.use_exclusions !== undefined) setUseExclusions(cfg.use_exclusions);
    setActiveTab('designer');
    setTimeout(() => {
      executeDesignerQuery();
    }, 100);
  };

  useEffect(() => {
    if (activeTab !== 'designer') {
      fetchReportData();
    } else {
      executeDesignerQuery();
    }
    loadTemplates();
  }, [activeTab, salesReportType, fromDate, toDate, useExclusions, selectedCompanyIds]);

  // Filtered rows for search within results
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(term))
    );
  }, [data, searchTerm]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const count = filteredRows.length;
    let sumValue = 0;
    filteredRows.forEach(r => {
      const val = r.grand_total ?? r.total_sales ?? r.total_revenue ?? r['Total Sales (₹)'] ?? r['Total Value (₹)'] ?? r['Closing Balance (₹)'];
      if (val && !isNaN(Number(val))) {
        sumValue += Number(val);
      }
    });
    return { count, sumValue };
  }, [filteredRows]);

  // Exports
  const exportCols = useMemo(() => {
    return columns.map(c => ({
      header: c.replace(/_/g, ' ').toUpperCase(),
      key: c
    }));
  }, [columns]);

  const handleExportCSV = () => {
    if (filteredRows.length === 0 || exportCols.length === 0) return;
    exportToCSV(filteredRows, exportCols, `ERP_${activeTab}_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportExcel = () => {
    if (filteredRows.length === 0 || exportCols.length === 0) return;
    exportToExcel(filteredRows, exportCols, `ERP_${activeTab}_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    if (filteredRows.length === 0 || exportCols.length === 0) return;
    exportToPDF(filteredRows, exportCols, `ERP_${activeTab}_${new Date().toISOString().split('T')[0]}`, `Executive Management Report`);
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
  };

  return (
    <div style={{ backgroundColor: '#020617', minHeight: '100vh', margin: '0 auto', padding: '24px', animation: 'fadeIn 0.25s ease-in-out', color: '#e2e8f0' }}>
      
      {/* ── TOP HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: '4px'
              }}
              title="Return to Home [ESC]"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart3 size={24} color="#6366f1" />
              Financial, Statutory & Management Reporting (DOC-30)
            </h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 30px' }}>
            Company-wise & Party-wise Sales Intelligence, Audit Ledgers, and Custom Report Designer
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          style={{
            backgroundColor: '#1e293b',
            color: '#94a3b8',
            border: '1px solid #334155',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          [ESC] Exit
        </button>
      </div>

      {notification && (
        <div style={{
          backgroundColor: '#064e3b',
          border: '1px solid #059669',
          color: '#a7f3d0',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px'
        }}>
          <CheckCircle2 size={16} />
          {notification}
        </div>
      )}

      {errorMessage && (
        <div style={{
          backgroundColor: '#450a0a',
          border: '1px solid #dc2626',
          color: '#fca5a5',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px'
        }}>
          <AlertCircle size={16} />
          {errorMessage}
        </div>
      )}

      {/* ── MAIN MODULE NAVIGATION TABS ── */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('sales_reports')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'sales_reports' ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === 'sales_reports' ? '#f8fafc' : '#94a3b8',
            fontWeight: activeTab === 'sales_reports' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Receipt size={16} />
          Sales Reports Library
        </button>

        <button
          onClick={() => setActiveTab('financial_reports')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'financial_reports' ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === 'financial_reports' ? '#f8fafc' : '#94a3b8',
            fontWeight: activeTab === 'financial_reports' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Users size={16} />
          Ledgers & Balances
        </button>

        <button
          onClick={() => setActiveTab('inventory_reports')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'inventory_reports' ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === 'inventory_reports' ? '#f8fafc' : '#94a3b8',
            fontWeight: activeTab === 'inventory_reports' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Package size={16} />
          Stock & Inventory
        </button>

        <button
          onClick={() => setActiveTab('designer')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'designer' ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === 'designer' ? '#f8fafc' : '#94a3b8',
            fontWeight: activeTab === 'designer' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Sliders size={16} />
          Practical Report Designer
        </button>
      </div>

      {/* ── SALES REPORTS SUB-BAR ── */}
      {activeTab === 'sales_reports' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'company', label: 'Company-wise / Principal-wise Sales', icon: Building2 },
            { id: 'party', label: 'Party-wise (Customer) Sales', icon: Users },
            { id: 'product', label: 'Product-wise Sales Analysis', icon: Package },
            { id: 'bill', label: 'Sales Register (Bill-wise)', icon: Receipt }
          ].map(item => {
            const Icon = item.icon;
            const isSelected = salesReportType === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSalesReportType(item.id as any)}
                style={{
                  backgroundColor: isSelected ? '#3b82f6' : '#1e293b',
                  color: isSelected ? '#fff' : '#cbd5e1',
                  border: isSelected ? '1px solid #60a5fa' : '1px solid #334155',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}

          {salesReportType === 'company' && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setShowCompanyModal(true)}
                style={{
                  backgroundColor: selectedCompanyIds.length > 0 ? '#4f46e5' : '#1e293b',
                  color: '#fff',
                  border: '1px solid #6366f1',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Building2 size={14} />
                {selectedCompanyIds.length > 0 
                  ? `Selected Companies (${selectedCompanyIds.length} of ${companiesList.length})` 
                  : `Filter Companies (All ${companiesList.length})`}
              </button>

              {selectedCompanyIds.length > 0 && (
                <button
                  onClick={() => setSelectedCompanyIds([])}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#94a3b8',
                    border: '1px solid #475569',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  title="Clear company filter"
                >
                  Clear Filter
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── DESIGNER CONFIGURATION PANEL ── */}
      {activeTab === 'designer' && (
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} color="#6366f1" />
            Visual Report Designer & Aggregation Controls
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                1. Data Subject
              </label>
              <select
                value={designerSubject}
                onChange={(e) => setDesignerSubject(e.target.value as any)}
                style={{ ...inputStyle, width: '100%' }}
              >
                <option value="Sales">Sales Invoices & Challans</option>
                <option value="Ledger">Ledger Accounts & Balance</option>
                <option value="Inventory">Inventory Stock & Items</option>
              </select>
            </div>

            {designerSubject === 'Sales' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                  2. Aggregation / Group By
                </label>
                <select
                  value={designerGroupBy}
                  onChange={(e) => setDesignerGroupBy(e.target.value as any)}
                  style={{ ...inputStyle, width: '100%' }}
                >
                  <option value="company">Group by Company / Principal</option>
                  <option value="party">Group by Customer / Party</option>
                  <option value="product">Group by Product / Item</option>
                  <option value="none">Detailed Bill-by-Bill View</option>
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                3. Party Filter (Optional)
              </label>
              <input
                type="text"
                value={designerPartySearch}
                onChange={(e) => setDesignerPartySearch(e.target.value)}
                placeholder="e.g. Apex Hospital, Apollo..."
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                4. Min Amount Threshold (₹)
              </label>
              <input
                type="number"
                value={designerMinAmount}
                onChange={(e) => setDesignerMinAmount(e.target.value)}
                placeholder="e.g. 10000"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Name your report template..."
                style={{ ...inputStyle, minWidth: '240px' }}
              />
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !templateName.trim()}
                style={{
                  backgroundColor: '#059669',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: savingTemplate || !templateName.trim() ? 'not-allowed' : 'pointer',
                  opacity: savingTemplate || !templateName.trim() ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <PlusCircle size={14} />
                Save as Named Template
              </button>
            </div>

            <button
              onClick={executeDesignerQuery}
              disabled={loading}
              style={{
                backgroundColor: '#4f46e5',
                color: '#fff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
            >
              <Play size={14} />
              Execute & Preview Report
            </button>
          </div>
        </div>
      )}

      {/* ── FILTER & EXPORT TOOLBAR ── */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '10px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Date presets & pickers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', backgroundColor: '#1e293b', borderRadius: '6px', padding: '2px', border: '1px solid #334155' }}>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'mtd', label: 'This Month' },
              { id: 'ytd', label: 'This Year' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handleDatePreset(p.id as any)}
                style={{
                  background: datePreset === p.id ? '#3b82f6' : 'none',
                  color: datePreset === p.id ? '#fff' : '#94a3b8',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} color="#64748b" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setDatePreset('all'); }}
              style={inputStyle}
              title="From Date"
            />
            <span style={{ color: '#64748b', fontSize: '12px' }}>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setDatePreset('all'); }}
              style={inputStyle}
              title="To Date"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e293b', padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155' }}>
            <input
              type="checkbox"
              id="dash_exclusions"
              checked={useExclusions}
              onChange={(e) => setUseExclusions(e.target.checked)}
              style={{ accentColor: '#6366f1', cursor: 'pointer' }}
            />
            <label htmlFor="dash_exclusions" style={{ fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={12} color="#6366f1" />
              Exclude Disputed Parties
            </label>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in table..."
              style={{ ...inputStyle, paddingLeft: '32px', minWidth: '180px' }}
            />
          </div>
        </div>

        {/* Action & Export buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => activeTab === 'designer' ? executeDesignerQuery() : fetchReportData()}
            disabled={loading}
            style={{
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredRows.length === 0}
            style={{
              backgroundColor: '#0f766e',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: filteredRows.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredRows.length === 0 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} />
            CSV
          </button>

          <button
            onClick={handleExportExcel}
            disabled={filteredRows.length === 0}
            style={{
              backgroundColor: '#15803d',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: filteredRows.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredRows.length === 0 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileSpreadsheet size={14} />
            Excel
          </button>

          <button
            onClick={handleExportPDF}
            disabled={filteredRows.length === 0}
            style={{
              backgroundColor: '#b91c1c',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: filteredRows.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredRows.length === 0 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={14} />
            PDF
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Filtered Rows</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
            {summaryMetrics.count}
          </div>
        </div>

        {summaryMetrics.sumValue > 0 && (
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Aggregate Value</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
              ₹{summaryMetrics.sumValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        )}

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Exclusion Status</span>
          <div style={{ fontSize: '13px', fontWeight: 700, color: useExclusions ? '#f59e0b' : '#10b981', marginTop: '8px' }}>
            {useExclusions ? 'Disputed Parties Filtered' : 'Complete Authoritative Books'}
          </div>
        </div>
      </div>

      {/* ── MAIN DATA TABLE ── */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '14px', color: '#f8fafc' }}>
            {activeTab === 'sales_reports' ? `Sales Report: ${salesReportType.toUpperCase()}-WISE` : activeTab.toUpperCase().replace('_', ' ')}
          </span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {filteredRows.length} records returned
          </span>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '520px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e293b', position: 'sticky', top: 0, zIndex: 1 }}>
                {columns.map(col => (
                  <th key={col} style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 700, borderBottom: '1px solid #334155' }}>
                    {col.replace(/_/g, ' ').toUpperCase()}
                  </th>
                ))}
                {activeTab === 'sales_reports' && salesReportType === 'company' && (
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 700, borderBottom: '1px solid #334155', textAlign: 'center', width: '150px' }}>
                    DRILL DOWN
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={(columns.length || 1) + (activeTab === 'sales_reports' && salesReportType === 'company' ? 1 : 0)} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    Loading report facts from database...
                  </td>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row, idx) => {
                  const companyId = row.company_id || String(idx);
                  const isExpanded = expandedCompanyId === companyId;
                  return (
                    <React.Fragment key={companyId}>
                      <tr 
                        style={{ 
                          borderBottom: '1px solid #1e293b', 
                          transition: 'background-color 0.15s',
                          backgroundColor: isExpanded ? 'rgba(59, 130, 246, 0.1)' : 'transparent' 
                        }}
                        onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = '#1e293b'; }}
                        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {columns.map(col => {
                          const val = row[col];
                          const num = Number(val);
                          const isNumeric = val !== null && val !== undefined && val !== '' && !isNaN(num);
                          const isPureCount = col.toLowerCase().includes('invoices') || 
                                              col.toLowerCase().includes('quantity') || 
                                              col.toLowerCase().includes('count') || 
                                              col.toLowerCase().includes('qty');
                          const isMonetary = !isPureCount && (
                            col.toLowerCase().includes('total_sales') || 
                            col.toLowerCase().includes('sales') || 
                            col.toLowerCase().includes('amount') || 
                            col.toLowerCase().includes('rate') || 
                            col.toLowerCase().includes('tax') || 
                            col.toLowerCase().includes('balance') || 
                            col.toLowerCase().includes('turnover') || 
                            col.toLowerCase().includes('revenue') || 
                            col.includes('₹')
                          );
                          return (
                            <td 
                              key={col} 
                              style={{ 
                                padding: '12px 16px', 
                                color: isNumeric && num > 0 ? '#f8fafc' : '#cbd5e1',
                                textAlign: isNumeric ? 'right' : 'left',
                                fontFamily: isNumeric ? 'monospace' : 'inherit'
                              }}
                            >
                              {isNumeric 
                                ? (isPureCount 
                                    ? num.toLocaleString('en-IN') 
                                    : (isMonetary 
                                        ? `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
                                        : num.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                                      )
                                  )
                                : String(val ?? '-')}
                            </td>
                          );
                        })}
                        {activeTab === 'sales_reports' && salesReportType === 'company' && (
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button
                              onClick={() => toggleCompanyDrilldown(companyId)}
                              style={{
                                backgroundColor: isExpanded ? '#3b82f6' : '#1e293b',
                                color: isExpanded ? '#fff' : '#38bdf8',
                                border: isExpanded ? '1px solid #60a5fa' : '1px solid #334155',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s'
                              }}
                            >
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              {isExpanded ? 'Hide Products' : 'View Products'}
                            </button>
                          </td>
                        )}
                      </tr>

                      {/* Inline Product Drill-down drawer */}
                      {activeTab === 'sales_reports' && salesReportType === 'company' && isExpanded && (
                        <tr>
                          <td colSpan={columns.length + 1} style={{ padding: '16px 20px', backgroundColor: '#090d16', borderBottom: '2px solid #3b82f6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Package size={15} />
                                Product Sales Breakdown: {row.company_name} {row.company_code ? `(${row.company_code})` : ''}
                              </div>
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {companyProductsMap[companyId]?.length || 0} Products Mapped & Sold
                              </span>
                            </div>

                            {loadingProducts && !companyProductsMap[companyId] ? (
                              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                <RefreshCw size={16} className="animate-spin" style={{ display: 'inline', marginRight: '8px' }} />
                                Loading product sales facts from database...
                              </div>
                            ) : (companyProductsMap[companyId] && companyProductsMap[companyId].length > 0) ? (
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', backgroundColor: '#0f172a', borderRadius: '6px', overflow: 'hidden' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#1e293b' }}>
                                    <th style={{ padding: '9px 14px', color: '#94a3b8' }}>PRODUCT NAME</th>
                                    <th style={{ padding: '9px 14px', color: '#94a3b8' }}>ITEM CODE</th>
                                    <th style={{ padding: '9px 14px', color: '#94a3b8' }}>PACKING</th>
                                    <th style={{ padding: '9px 14px', color: '#94a3b8', textAlign: 'right' }}>QTY SOLD</th>
                                    <th style={{ padding: '9px 14px', color: '#94a3b8', textAlign: 'right' }}>AVG RATE</th>
                                    <th style={{ padding: '9px 14px', color: '#94a3b8', textAlign: 'right' }}>NET TURNOVER (₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {companyProductsMap[companyId].map((p: any, pIdx: number) => (
                                    <tr key={pIdx} style={{ borderBottom: '1px solid #1e293b' }}>
                                      <td style={{ padding: '9px 14px', fontWeight: 600, color: '#f8fafc' }}>{p.product_name}</td>
                                      <td style={{ padding: '9px 14px', color: '#94a3b8' }}>{p.item_code}</td>
                                      <td style={{ padding: '9px 14px', color: '#94a3b8' }}>{p.packing}</td>
                                      <td style={{ padding: '9px 14px', textAlign: 'right', color: '#f8fafc', fontWeight: 600 }}>{p.qty_sold}</td>
                                      <td style={{ padding: '9px 14px', textAlign: 'right', color: '#cbd5e1' }}>₹{Number(p.avg_rate).toFixed(2)}</td>
                                      <td style={{ padding: '9px 14px', textAlign: 'right', color: '#38bdf8', fontWeight: 700 }}>₹{Number(p.turnover).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                                No individual product sales found for this manufacturer in the selected period.
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={(columns.length || 1) + (activeTab === 'sales_reports' && salesReportType === 'company' ? 1 : 0)} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    No report records found for this period and filter scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SAVED REPORT TEMPLATES DIRECTORY ── */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} color="#6366f1" />
          Saved Report Templates Library ({templates.length})
        </h2>

        {templates.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {templates.map(tpl => (
              <div
                key={tpl.id}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc' }}>{tpl.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    Subject: <span style={{ color: '#38bdf8' }}>{tpl.subject}</span> | Group: {tpl.config?.group_by || 'Default'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => handleRunTemplate(tpl)}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Play size={10} /> Run
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    style={{
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                    title="Delete Template"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
            No saved custom templates yet. Switch to the <strong>Practical Report Designer</strong> tab to configure and save your first custom report.
          </p>
        )}
      </div>

      {/* ── MARG-STYLE COMPANY SELECTION MODAL ── */}
      {showCompanyModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={20} color="#6366f1" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                  Select Companies / Manufacturers (Marg ERP Filter)
                </h3>
              </div>
              <button
                onClick={() => setShowCompanyModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search and Selection Toolbar */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  value={companySearchQuery}
                  onChange={(e) => setCompanySearchQuery(e.target.value)}
                  placeholder="Type to search company name or code... (e.g. Cipla, Sun, Abbott)"
                  style={{
                    ...inputStyle,
                    width: '100%',
                    paddingLeft: '36px',
                    boxSizing: 'border-box',
                    fontSize: '14px'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedCompanyIds(companiesList.map(c => c.id))}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#38bdf8',
                      border: '1px solid #334155',
                      padding: '5px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Select All ({companiesList.length})
                  </button>
                  <button
                    onClick={() => setSelectedCompanyIds([])}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#94a3b8',
                      border: '1px solid #334155',
                      padding: '5px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => {
                      const allIds = companiesList.map(c => c.id);
                      setSelectedCompanyIds(allIds.filter(id => !selectedCompanyIds.includes(id)));
                    }}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #334155',
                      padding: '5px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Invert Selection
                  </button>
                </div>

                <span style={{ fontSize: '12px', fontWeight: 600, color: '#a5b4fc' }}>
                  {selectedCompanyIds.length} of {companiesList.length} Selected
                </span>
              </div>
            </div>

            {/* Scrollable Company Checkbox List */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px', padding: '10px 20px' }}>
              {companiesList
                .filter(c => {
                  if (!companySearchQuery.trim()) return true;
                  const q = companySearchQuery.toLowerCase();
                  return (c.name || '').toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q);
                })
                .map(comp => {
                  const isChecked = selectedCompanyIds.includes(comp.id);
                  return (
                    <div
                      key={comp.id}
                      onClick={() => {
                        setSelectedCompanyIds(prev =>
                          isChecked ? prev.filter(id => id !== comp.id) : [...prev, comp.id]
                        );
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: isChecked ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        borderBottom: '1px solid #1e293b',
                        transition: 'background 0.1s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isChecked ? (
                          <CheckSquare size={16} color="#6366f1" />
                        ) : (
                          <Square size={16} color="#64748b" />
                        )}
                        <span style={{ fontSize: '13px', fontWeight: isChecked ? 600 : 400, color: isChecked ? '#f8fafc' : '#cbd5e1' }}>
                          {comp.name}
                        </span>
                      </div>
                      {comp.code && (
                        <span style={{ fontSize: '11px', color: '#94a3b8', backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>
                          {comp.code}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowCompanyModal(false)}
                style={{
                  backgroundColor: '#1e293b',
                  color: '#cbd5e1',
                  border: '1px solid #334155',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowCompanyModal(false);
                  fetchReportData();
                }}
                style={{
                  backgroundColor: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
                }}
              >
                Apply Selection ({selectedCompanyIds.length === 0 ? 'All' : selectedCompanyIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
