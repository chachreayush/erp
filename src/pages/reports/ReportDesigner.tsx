import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sliders, Play, PlusCircle, Trash2, Download, FileSpreadsheet, FileText, 
  RefreshCw, ArrowLeft, Filter, Search, CheckCircle2, AlertCircle, Database,
  Calendar, Layers, BarChart3
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { exportToCSV, exportToExcel, exportToPDF } from '../../lib/exportUtils';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';

export default function ReportDesigner() {
  useReturnNavigation();
  const navigate = useNavigate();

  // Designer query controls
  const [subject, setSubject] = useState<'Sales' | 'Ledger' | 'Inventory'>('Sales');
  const [groupBy, setGroupBy] = useState<'company' | 'party' | 'product' | 'none'>('company');
  const [partySearch, setPartySearch] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'mtd' | 'ytd'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [useExclusions, setUseExclusions] = useState(false);

  // Template state
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Query execution & data state
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle Date presets
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

  // Load published templates
  const loadTemplates = async () => {
    try {
      const res = await apiClient.get('/api/reports_v2/templates');
      setTemplates(res.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  // Run dynamic designer query
  const executeQuery = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.post('/api/reports_v2/query', {
        subject,
        group_by: groupBy,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        min_amount: minAmount || undefined,
        party_name: partySearch || undefined,
        use_exclusions: useExclusions
      });
      setData(res.data?.data || []);
      setColumns(res.data?.columns || []);
    } catch (err: any) {
      console.error('Designer query error:', err);
      setErrorMessage(err?.response?.data?.detail || 'Unable to execute query. Check parameters and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Save new template
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setErrorMessage('Please enter a descriptive name for your custom report template');
      return;
    }
    setSavingTemplate(true);
    setErrorMessage(null);
    try {
      await apiClient.post('/api/reports_v2/templates', {
        name: templateName,
        subject,
        config: {
          group_by: groupBy,
          min_amount: minAmount,
          party_name: partySearch,
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

  // Load a saved template
  const handleApplyTemplate = (tpl: any) => {
    const cfg = tpl.config || {};
    setSubject(tpl.subject || 'Sales');
    if (cfg.group_by) setGroupBy(cfg.group_by);
    if (cfg.min_amount) setMinAmount(cfg.min_amount);
    if (cfg.party_name) setPartySearch(cfg.party_name);
    if (cfg.use_exclusions !== undefined) setUseExclusions(cfg.use_exclusions);
    setNotification(`Loaded settings from "${tpl.name}". Executing...`);
    setTimeout(() => {
      setNotification(null);
      executeQuery();
    }, 400);
  };

  useEffect(() => {
    loadTemplates();
    executeQuery();
  }, []);

  // Filtered rows for in-table search
  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return data;
    const term = tableSearch.toLowerCase();
    return data.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(term))
    );
  }, [data, tableSearch]);

  // Aggregate metrics
  const totalSum = useMemo(() => {
    let sum = 0;
    filteredRows.forEach(r => {
      const val = r.grand_total ?? r.total_sales ?? r.total_revenue ?? r['Total Sales (₹)'] ?? r['Total Value (₹)'] ?? r['Closing Balance (₹)'];
      if (val && !isNaN(Number(val))) {
        sum += Number(val);
      }
    });
    return sum;
  }, [filteredRows]);

  // Export functions
  const exportCols = useMemo(() => {
    return columns.map(c => ({
      header: c.replace(/_/g, ' ').toUpperCase(),
      key: c
    }));
  }, [columns]);

  const handleExportCSV = () => {
    if (filteredRows.length === 0 || exportCols.length === 0) return;
    exportToCSV(filteredRows, exportCols, `Report_${subject}_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportExcel = () => {
    if (filteredRows.length === 0 || exportCols.length === 0) return;
    exportToExcel(filteredRows, exportCols, `Report_${subject}_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    if (filteredRows.length === 0 || exportCols.length === 0) return;
    exportToPDF(filteredRows, exportCols, `Report_${subject}_${new Date().toISOString().split('T')[0]}`, `Custom ${subject} Analysis Report`);
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
    <div style={{ backgroundColor: '#020617', minHeight: '100vh', margin: '0 auto', padding: '24px', color: '#e2e8f0', animation: 'fadeIn 0.2s ease-in-out' }}>
      
      {/* ── TOP HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => navigate('/reports')}
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
              title="Return to Report Catalog [ESC]"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sliders size={24} color="#6366f1" />
              Advanced Custom Report Designer (DOC-30 Section 5)
            </h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 30px' }}>
            Visual Semantic Query Builder: Select Subject, Grouping, Range & Aggregations with Real-Time Execution
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/reports')}
            style={{
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #334155',
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
            <BarChart3 size={15} />
            Standard Predefined Reports
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={14} />
            [ESC] Exit
          </button>
        </div>
      </div>

      {/* ── NOTIFICATION & ERROR BANNERS ── */}
      {notification && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
          <CheckCircle2 size={16} />
          {notification}
        </div>
      )}
      {errorMessage && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
          <AlertCircle size={16} />
          {errorMessage}
        </div>
      )}

      {/* ── QUERY BUILDER CONTROLS CARD ── */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
          <Database size={16} color="#6366f1" />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Query Parameters & Semantic Aggregations
          </h2>
        </div>

        {/* 4 Column Configuration Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          
          {/* Dimension 1: Data Subject */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
              1. Business Data Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as any)}
              style={{ ...inputStyle, width: '100%' }}
            >
              <option value="Sales">Sales Invoices & Challans</option>
              <option value="Ledger">General Ledger & Accounts</option>
              <option value="Inventory">Inventory Stock & Products</option>
            </select>
          </div>

          {/* Dimension 2: Group By */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
              2. Grouping Dimension
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              style={{ ...inputStyle, width: '100%' }}
            >
              <option value="company">Group by Company / Principal</option>
              <option value="party">Group by Customer / Party</option>
              <option value="product">Group by Product / SKU</option>
              <option value="none">Detailed Bill-by-Bill View</option>
            </select>
          </div>

          {/* Dimension 3: Party Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
              3. Customer / Party Search (Optional)
            </label>
            <input
              type="text"
              value={partySearch}
              onChange={(e) => setPartySearch(e.target.value)}
              placeholder="Filter by customer name..."
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Dimension 4: Min Amount Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
              4. Min Amount Threshold (₹)
            </label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="e.g. 50000"
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Date Ranges & Exclusion Scope */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} color="#94a3b8" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>Date Range:</span>
            {(['all', 'today', 'mtd', 'ytd'] as const).map(p => (
              <button
                key={p}
                onClick={() => handleDatePreset(p)}
                style={{
                  backgroundColor: datePreset === p ? '#3b82f6' : '#1e293b',
                  color: datePreset === p ? '#fff' : '#94a3b8',
                  border: '1px solid #334155',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setDatePreset('all'); }}
              style={inputStyle}
            />
            <span style={{ color: '#64748b', fontSize: '12px' }}>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setDatePreset('all'); }}
              style={inputStyle}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#cbd5e1', marginLeft: 'auto' }}>
            <input
              type="checkbox"
              checked={useExclusions}
              onChange={(e) => setUseExclusions(e.target.checked)}
              style={{ accentColor: '#f59e0b', width: '15px', height: '15px' }}
            />
            Apply Disputed / Non-Authoritative Exclusions (DOC-30 Rule 9)
          </label>
        </div>

        {/* Action bar: Template Saving & Execute */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderTop: '1px solid #1e293b', marginTop: '16px', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Name this template to reuse..."
              style={{ ...inputStyle, minWidth: '260px' }}
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
              Save to Library
            </button>
          </div>

          <button
            onClick={executeQuery}
            disabled={loading}
            style={{
              backgroundColor: '#4f46e5',
              color: '#fff',
              border: 'none',
              padding: '10px 22px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
            }}
          >
            <Play size={14} />
            {loading ? 'Executing Query...' : 'Execute & Preview Report'}
          </button>
        </div>
      </div>

      {/* ── TOOLBAR: EXPORTS & TABLE SEARCH ── */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '10px',
        padding: '12px 18px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Search within query results..."
            style={{ ...inputStyle, width: '100%', paddingLeft: '32px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', marginRight: '6px' }}>
            Export:
          </span>
          <button
            onClick={handleExportCSV}
            disabled={filteredRows.length === 0}
            style={{
              backgroundColor: '#0f766e',
              color: '#fff',
              border: 'none',
              padding: '7px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: filteredRows.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredRows.length === 0 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Download size={13} />
            CSV
          </button>

          <button
            onClick={handleExportExcel}
            disabled={filteredRows.length === 0}
            style={{
              backgroundColor: '#15803d',
              color: '#fff',
              border: 'none',
              padding: '7px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: filteredRows.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredRows.length === 0 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <FileSpreadsheet size={13} />
            Excel
          </button>

          <button
            onClick={handleExportPDF}
            disabled={filteredRows.length === 0}
            style={{
              backgroundColor: '#b91c1c',
              color: '#fff',
              border: 'none',
              padding: '7px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: filteredRows.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredRows.length === 0 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <FileText size={13} />
            PDF
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Filtered Rows</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
            {filteredRows.length}
          </div>
        </div>

        {totalSum > 0 && (
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Aggregate Value</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
              ₹{totalSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        )}

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Scope Dimension</span>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#a5b4fc', marginTop: '8px' }}>
            {subject} • {groupBy.toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── LIVE PREVIEW DATA TABLE ── */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '14px', color: '#f8fafc' }}>
            Live Query Result: {subject} (Grouped by: {groupBy})
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length || 1} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    Running SQL query and aggregating records...
                  </td>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row, idx) => (
                  <tr 
                    key={idx} 
                    style={{ borderBottom: '1px solid #1e293b', transition: 'background-color 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {columns.map(col => {
                      const val = row[col];
                      const num = Number(val);
                      const isNumeric = val !== null && val !== undefined && val !== '' && !isNaN(num);
                      const isPureCount = col.toLowerCase().includes('invoices') || 
                                          col.toLowerCase().includes('count') || 
                                          col.toLowerCase().includes('qty') || 
                                          col.toLowerCase().includes('units');
                      const isMonetary = !isPureCount && (
                        col.toLowerCase().includes('total_sales') || 
                        col.toLowerCase().includes('sales') || 
                        col.toLowerCase().includes('amount') || 
                        col.toLowerCase().includes('rate') || 
                        col.toLowerCase().includes('tax') || 
                        col.toLowerCase().includes('balance') || 
                        col.toLowerCase().includes('turnover') || 
                        col.toLowerCase().includes('revenue') || 
                        col.toLowerCase().includes('value') || 
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length || 1} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    No report records match the selected designer parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SAVED CUSTOM REPORT TEMPLATES DIRECTORY ── */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} color="#6366f1" />
          Saved Report Templates Library ({templates.length})
        </h2>

        {templates.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {templates.map(tpl => (
              <div
                key={tpl.id}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>{tpl.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                    Subject: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{tpl.subject}</span> | Group: {tpl.config?.group_by || 'Default'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleApplyTemplate(tpl)}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Play size={11} /> Run
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    style={{
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    title="Delete Template"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
            No saved custom templates yet. Configure parameters above and click <strong>"Save to Library"</strong>.
          </p>
        )}
      </div>

    </div>
  );
}
