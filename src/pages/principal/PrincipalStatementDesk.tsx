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
    <div className="min-h-screen bg-[#f4f6f4] p-4 text-gray-800">
      {/* ── TOP ACTION BAR ──────────────────────────────────── */}
      <div className="bg-[#1b4332] text-white p-4 rounded shadow mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/principal')}
            className="p-1.5 bg-[#0f2e21] hover:bg-[#091f16] rounded text-emerald-300 transition-all flex items-center space-x-1 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back [Esc]</span>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded">
                DOC-36 Authoritative View
              </span>
              <span className="text-xs text-emerald-300">Auditable Source Traceability</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Principal Business Statement Desk</h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            id="select-statement-principal"
            value={selectedPrincipalId}
            onChange={e => setSelectedPrincipalId(e.target.value)}
            className="bg-white text-gray-900 font-bold text-xs rounded px-3 py-2 border-0 shadow"
          >
            {principals.map(p => (
              <option key={p.id} value={p.id}>
                {p.principal_code} — {p.principal_name}
              </option>
            ))}
          </select>

          <button
            onClick={() => window.print()}
            className="bg-[#2d6a4f] hover:bg-[#23533e] text-white text-xs px-3 py-2 rounded font-bold flex items-center space-x-1"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {statement && (
        <div className="space-y-4">
          {/* ── STATEMENT HEADER CARD ──────────────────────────── */}
          <div className="bg-white p-5 rounded shadow border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 mb-4 gap-2">
              <div>
                <span className="text-xs font-mono text-gray-400">STATEMENT RECORD</span>
                <h2 className="text-lg font-bold text-[#1b4332]">{statement.principal_name}</h2>
                <div className="text-xs text-gray-500 flex items-center space-x-3 mt-1">
                  <span>Code: <strong className="text-gray-700">{statement.principal_code}</strong></span>
                  <span>Agreement: <strong className="text-emerald-700">{statement.agreement_number}</strong></span>
                  <span>Period: <strong className="text-gray-700">{statement.period}</strong></span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-gray-400 font-semibold block uppercase">Closing Stock Valuation</span>
                <span className="text-2xl font-black text-emerald-950">
                  ₹{statement.figures.closing_stock_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-emerald-700 font-bold block">
                  {statement.figures.closing_stock_qty.toLocaleString()} Units in C&F Custody
                </span>
              </div>
            </div>

            {/* 4-Column Movement Equation */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded border">
                <span className="text-gray-500 font-semibold block uppercase text-[10px]">Opening Stock</span>
                <span className="text-base font-bold text-gray-900">
                  ₹{statement.figures.opening_stock_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-gray-500 block text-[10px]">{statement.figures.opening_stock_qty} units</span>
              </div>

              <div className="p-3 bg-gray-50 rounded border">
                <span className="text-emerald-700 font-semibold block uppercase text-[10px]">+ Inward Receipts</span>
                <span className="text-base font-bold text-emerald-800">
                  +₹{statement.figures.inward_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-emerald-700 block text-[10px]">+{statement.figures.inward_qty} units</span>
              </div>

              <div className="p-3 bg-gray-50 rounded border">
                <span className="text-rose-700 font-semibold block uppercase text-[10px]">- Outward Dispatches</span>
                <span className="text-base font-bold text-rose-800">
                  -₹{statement.figures.sales_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-rose-700 block text-[10px]">-{statement.figures.sales_qty} units</span>
              </div>

              <div className="p-3 bg-gray-50 rounded border">
                <span className="text-blue-700 font-semibold block uppercase text-[10px]">+ Customer Returns</span>
                <span className="text-base font-bold text-blue-800">
                  +₹{statement.figures.returns_val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-blue-700 block text-[10px]">+{statement.figures.returns_qty} units</span>
              </div>
            </div>
          </div>

          {/* ── TRANSACTION DETAIL LINES TABLE ─────────────────── */}
          <div className="bg-white p-5 rounded shadow border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Traceable Transaction Lines</h3>
                <p className="text-xs text-gray-500">
                  Direct drill-down to originating invoices, dispatches, inward documents, and freight events.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                {['ALL', 'INWARD', 'SALE', 'RETURN', 'FREIGHT'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1 rounded font-bold transition-all ${
                      filterCategory === cat
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table id="table-statement-lines" className="w-full text-left text-xs border">
                <thead>
                  <tr className="bg-gray-100 border-b text-gray-600 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Source Document No</th>
                    <th className="py-2.5 px-3">Item / Description</th>
                    <th className="py-2.5 px-3">Batch Provenance</th>
                    <th className="py-2.5 px-3 text-right">Movement Qty</th>
                    <th className="py-2.5 px-3 text-right">Line Valuation (₹)</th>
                    <th className="py-2.5 px-3 text-center">Accounting Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLines.length > 0 ? (
                    filteredLines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-3 text-gray-600">{line.date}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            line.category === 'INWARD' ? 'bg-emerald-100 text-emerald-800' :
                            line.category === 'SALE' ? 'bg-rose-100 text-rose-800' :
                            line.category === 'RETURN' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {line.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-900">{line.source_doc}</td>
                        <td className="py-2 px-3 font-medium text-gray-900">{line.product_name}</td>
                        <td className="py-2 px-3 font-mono text-gray-500">{line.batch_no}</td>
                        <td className="py-2 px-3 text-right font-bold text-gray-800">
                          {line.qty !== 0 ? line.qty.toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-gray-900">
                          ₹{line.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            {line.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-4 text-center text-gray-500">
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
