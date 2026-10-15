import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Building2,
  Calendar,
  Printer,
  Download,
  ArrowLeft,
  Search,
  CheckCircle,
  Truck,
  TrendingDown,
  TrendingUp,
  Package
} from 'lucide-react';
import {
  apiGetPrincipals,
  apiGetPrincipalStatement,
  PrincipalListItem,
  PrincipalStatement
} from '../../lib/api';

export const PrincipalStatementDesk: React.FC = () => {
  const navigate = useNavigate();
  const [principals, setPrincipals] = useState<PrincipalListItem[]>([]);
  const [selectedPrincipalId, setSelectedPrincipalId] = useState<string>('');
  const [statement, setStatement] = useState<PrincipalStatement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  useEffect(() => {
    const fetchPrincipals = async () => {
      try {
        setLoading(true);
        const res = await apiGetPrincipals();
        if (res && res.principals && res.principals.length > 0) {
          setPrincipals(res.principals);
          setSelectedPrincipalId(res.principals[0].id);
        }
      } catch (err) {
        console.error('Error loading principals for statement desk:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrincipals();
  }, []);

  useEffect(() => {
    if (!selectedPrincipalId) return;
    const fetchStatement = async () => {
      try {
        setLoading(true);
        const res = await apiGetPrincipalStatement(selectedPrincipalId);
        if (res && res.statement) {
          setStatement(res.statement);
        }
      } catch (err) {
        console.error('Error fetching statement:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatement();
  }, [selectedPrincipalId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/principal');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const filteredLines = statement?.lines.filter(l => {
    if (filterCategory === 'ALL') return true;
    return l.category === filterCategory;
  }) || [];

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
      {/* ── TOP ACTION BAR ──────────────────────────────────── */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/principal')}
            title="Return to Principal Control Center [Esc]"
            style={{
              padding: '8px 12px',
              backgroundColor: '#0f2e21',
              border: '1px solid #2d6a4f',
              borderRadius: '8px',
              color: '#a7f3d0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <ArrowLeft size={16} />
            <span>Back [Esc]</span>
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span
                style={{
                  backgroundColor: '#0f2e21',
                  color: '#a7f3d0',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}
              >
                DOC-36 Authoritative View
              </span>
              <span style={{ fontSize: '11px', color: '#a7f3d0', fontWeight: 600 }}>
                Auditable Source Traceability
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
              Principal Business Statement Desk
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            id="select-statement-principal"
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
            onClick={() => window.print()}
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '9px 16px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Printer size={15} />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {statement && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ── STATEMENT HEADER CARD ──────────────────────────── */}
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid #d8e2dc',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '18px',
                marginBottom: '18px'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>
                  STATEMENT RECORD
                </span>
                <h2 style={{ margin: '4px 0 6px', fontSize: '20px', fontWeight: 800, color: '#1b4332' }}>
                  {statement.principal_name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                  <span>Code: <strong style={{ color: '#111827' }}>{statement.principal_code}</strong></span>
                  <span>Agreement: <strong style={{ color: '#059669' }}>{statement.agreement_number}</strong></span>
                  <span>Period: <strong style={{ color: '#111827' }}>{statement.period}</strong></span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                  Closing Stock Valuation
                </span>
                <span style={{ fontSize: '28px', fontWeight: 900, color: '#064e3b', display: 'block', margin: '2px 0' }}>
                  ₹{statement.figures.closing_stock_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700, display: 'block' }}>
                  {statement.figures.closing_stock_qty.toLocaleString()} Units in C&F Custody
                </span>
              </div>
            </div>

            {/* 4-Column Movement Equation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
              <div style={{ padding: '14px 16px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', display: 'block' }}>Opening Stock</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: '4px 0', display: 'block' }}>
                  ₹{statement.figures.opening_stock_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ color: '#6b7280', fontSize: '11px' }}>{statement.figures.opening_stock_qty} units</span>
              </div>

              <div style={{ padding: '14px 16px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <span style={{ color: '#059669', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', display: 'block' }}>+ Inward Receipts</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#065f46', margin: '4px 0', display: 'block' }}>
                  +₹{statement.figures.inward_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ color: '#059669', fontSize: '11px' }}>+{statement.figures.inward_qty} units</span>
              </div>

              <div style={{ padding: '14px 16px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <span style={{ color: '#dc2626', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', display: 'block' }}>- Outward Dispatches</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b', margin: '4px 0', display: 'block' }}>
                  -₹{statement.figures.sales_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ color: '#dc2626', fontSize: '11px' }}>-{statement.figures.sales_qty} units</span>
              </div>

              <div style={{ padding: '14px 16px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <span style={{ color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', display: 'block' }}>+ Customer Returns</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#1e40af', margin: '4px 0', display: 'block' }}>
                  +₹{statement.figures.returns_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ color: '#2563eb', fontSize: '11px' }}>+{statement.figures.returns_qty} units</span>
              </div>
            </div>
          </div>

          {/* ── TRANSACTION DETAIL LINES TABLE ─────────────────── */}
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid #d8e2dc',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>
                  Traceable Transaction Lines
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  Direct drill-down to originating invoices, dispatches, inward documents, and freight events.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {['ALL', 'INWARD', 'SALE', 'RETURN', 'FREIGHT'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '11px',
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: filterCategory === cat ? '#1b4332' : '#f3f4f6',
                      color: filterCategory === cat ? '#ffffff' : '#4b5563',
                      boxShadow: filterCategory === cat ? '0 2px 6px rgba(27, 67, 50, 0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <table id="table-statement-lines" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg, #1b4332 0%, #2d6a4f 100%)', color: '#ffffff' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textTransform: 'uppercase' }}>Category</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textTransform: 'uppercase' }}>Source Document No</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textTransform: 'uppercase' }}>Item / Description</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textTransform: 'uppercase' }}>Batch Provenance</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Movement Qty</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Line Valuation (₹)</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Accounting Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLines.length > 0 ? (
                    filteredLines.map((line, idx) => (
                      <tr
                        key={idx}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                          borderBottom: '1px solid #f3f4f6'
                        }}
                      >
                        <td style={{ padding: '12px 14px', color: '#4b5563' }}>{line.date}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontWeight: 800,
                              backgroundColor:
                                line.category === 'INWARD' ? '#d1fae5' :
                                line.category === 'SALE' ? '#fee2e2' :
                                line.category === 'RETURN' ? '#dbeafe' : '#f3e8ff',
                              color:
                                line.category === 'INWARD' ? '#065f46' :
                                line.category === 'SALE' ? '#991b1b' :
                                line.category === 'RETURN' ? '#1e40af' : '#6b21a8'
                            }}
                          >
                            {line.category}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#065f46' }}>
                          {line.source_doc}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827' }}>{line.product_name}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#6b7280' }}>{line.batch_no}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>
                          {line.qty !== 0 ? line.qty.toFixed(2) : '-'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#111827' }}>
                          ₹{line.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              backgroundColor: '#d1fae5',
                              color: '#065f46',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontWeight: 800
                            }}
                          >
                            {line.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                        No transactions found for selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrincipalStatementDesk;
