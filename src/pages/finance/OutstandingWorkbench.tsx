import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiGetOutstandingReport,
  OutstandingReportResponse,
  OutstandingPartySummary
} from '../../lib/api';
import {
  FileText,
  CreditCard,
  Receipt,
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export default function OutstandingWorkbench() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'receivables' | 'payables'>('receivables');
  const [reportData, setReportData] = useState<OutstandingReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedParties, setExpandedParties] = useState<Record<string, boolean>>({});

  const fetchReport = (type: 'receivables' | 'payables', searchTerm = '') => {
    setLoading(true);
    apiGetOutstandingReport({ type, search: searchTerm || undefined })
      .then(res => {
        setReportData(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport(tab, search);
  }, [tab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport(tab, search);
  };

  const toggleExpand = (partyId: string) => {
    setExpandedParties(prev => ({
      ...prev,
      [partyId]: !prev[partyId]
    }));
  };

  const handleExportCsv = () => {
    if (!reportData || reportData.parties.length === 0) return;
    const headers = [
      'Party Name',
      'GSTIN',
      'Total Invoiced',
      'Total Settled',
      'Net Outstanding',
      '0-30 Days',
      '31-60 Days',
      '61-90 Days',
      '90+ Days Overdue'
    ];
    const rows = reportData.parties.map(p => [
      `"${p.party_name}"`,
      `"${p.gstin || ''}"`,
      p.total_invoiced,
      p.total_settled,
      p.total_outstanding,
      p.bucket_0_30,
      p.bucket_31_60,
      p.bucket_61_90,
      p.bucket_90_plus
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Outstanding_${tab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-6 font-sans">
      {/* ── APEX HEADER ── */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-950 text-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <Clock className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  Outstanding & Ageing Analysis Workbench (DOC-07 Section 20)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30">
                  Real-Time Ageing
                </span>
              </div>
              <p className="text-sm text-emerald-200/90 mt-1">
                Real-time aging analysis for debtor collections and supplier payables across 0–30, 31–60, 61–90, and 90+ day buckets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/receipt')}
              className="px-4 py-2 bg-emerald-700/80 hover:bg-emerald-700 border border-emerald-500/50 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              New Receipt [F6]
            </button>
            <button
              onClick={() => navigate('/payment')}
              className="px-4 py-2 bg-amber-600/80 hover:bg-amber-600 border border-amber-400/50 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              New Payment [F5]
            </button>
          </div>
        </div>
      </div>

      {/* ── TAB SELECTOR & TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-xl w-fit">
          <button
            id="tab-receivables-btn"
            onClick={() => setTab('receivables')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              tab === 'receivables'
                ? 'bg-white text-emerald-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-700" />
            Debtor Receivables (Chemists)
          </button>
          <button
            id="tab-payables-btn"
            onClick={() => setTab('payables')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              tab === 'payables'
                ? 'bg-white text-emerald-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4 text-amber-700" />
            Creditor Payables (Suppliers)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="outstanding-search-input"
              type="text"
              placeholder={`Search ${tab === 'receivables' ? 'chemist' : 'supplier'}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700 w-64 shadow-sm"
            />
          </form>

          <button
            onClick={() => fetchReport(tab, search)}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!reportData || reportData.parties.length === 0}
            className="px-3 py-1.5 bg-emerald-900 hover:bg-emerald-950 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI METRIC CARDS BANNER ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total {tab === 'receivables' ? 'Receivable' : 'Payable'}
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            ₹{(reportData?.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across {reportData?.total_parties || 0} active accounts</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-emerald-200/80 p-4 bg-emerald-50/20">
          <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            0 – 30 Days (Current)
          </div>
          <div className="text-xl font-black text-emerald-900 mt-1">
            ₹{(reportData?.total_bucket_0_30 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-1">Normal credit terms</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-amber-200/80 p-4 bg-amber-50/20">
          <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            31 – 60 Days
          </div>
          <div className="text-xl font-black text-amber-900 mt-1">
            ₹{(reportData?.total_bucket_31_60 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-700/80 mt-1">Follow-up due</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-orange-200/80 p-4 bg-orange-50/20">
          <div className="text-xs font-semibold text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            61 – 90 Days
          </div>
          <div className="text-xl font-black text-orange-900 mt-1">
            ₹{(reportData?.total_bucket_61_90 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-orange-700/80 mt-1">Collection hold risk</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-red-200/80 p-4 bg-red-50/20">
          <div className="text-xs font-semibold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            90+ Days Overdue
          </div>
          <div className="text-xl font-black text-red-900 mt-1">
            ₹{(reportData?.total_bucket_90_plus || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-red-700/80 mt-1">Immediate escalation</div>
        </div>
      </div>

      {/* ── PARTY-WISE OUTSTANDING TABLE ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-700" />
            Party-Wise Ageing Statement ({reportData?.parties.length || 0} Records)
          </h2>
          <span className="text-xs text-slate-500">Click any row to expand open bills</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-emerald-900 text-white font-bold">
                <th className="py-3 px-3 w-8"></th>
                <th className="py-3 px-3">Party Legal Name</th>
                <th className="py-3 px-3">GSTIN</th>
                <th className="py-3 px-3 text-right">Total Billed</th>
                <th className="py-3 px-3 text-right">Settled</th>
                <th className="py-3 px-3 text-right">Net Due (₹)</th>
                <th className="py-3 px-3 text-right">0–30d</th>
                <th className="py-3 px-3 text-right">31–60d</th>
                <th className="py-3 px-3 text-right">61–90d</th>
                <th className="py-3 px-3 text-right">90+d</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    Calculating real-time ageing balances...
                  </td>
                </tr>
              ) : !reportData || reportData.parties.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No outstanding {tab} found. All accounts are settled!
                  </td>
                </tr>
              ) : (
                reportData.parties.map(party => {
                  const isExpanded = Boolean(expandedParties[party.party_id]);
                  return (
                    <React.Fragment key={party.party_id}>
                      <tr
                        id={`party-row-${party.party_id}`}
                        className={`party-ageing-row hover:bg-slate-50 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-slate-50/80 font-medium' : ''
                        }`}
                        onClick={() => toggleExpand(party.party_id)}
                      >
                        <td className="py-3 px-3 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {party.party_name}
                          {party.credit_limit && (
                            <span className="block text-[10px] font-normal text-slate-400">
                              Credit Limit: ₹{party.credit_limit.toLocaleString('en-IN')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                          {party.gstin || 'UNREGISTERED'}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          ₹{party.total_invoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-700 font-medium">
                          ₹{party.total_settled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                          ₹{party.total_outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-800 font-bold">
                          {party.bucket_0_30 > 0
                            ? `₹${party.bucket_0_30.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                        <td className="py-3 px-3 text-right text-amber-800 font-bold">
                          {party.bucket_31_60 > 0
                            ? `₹${party.bucket_31_60.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                        <td className="py-3 px-3 text-right text-orange-800 font-bold">
                          {party.bucket_61_90 > 0
                            ? `₹${party.bucket_61_90.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                        <td className="py-3 px-3 text-right text-red-800 font-bold">
                          {party.bucket_90_plus > 0
                            ? `₹${party.bucket_90_plus.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                        <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            id={`settle-btn-${party.party_id}`}
                            onClick={() =>
                              navigate(
                                tab === 'receivables'
                                  ? `/receipt?party_id=${party.party_id}`
                                  : `/payment?party_id=${party.party_id}`
                              )
                            }
                            className="px-2.5 py-1 bg-emerald-900 hover:bg-emerald-950 text-white rounded font-bold text-[11px] shadow-sm transition-all flex items-center gap-1 mx-auto"
                          >
                            <span>{tab === 'receivables' ? 'Receive' : 'Pay'}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>

                      {/* EXPANDABLE BILLS DRAWER */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={11} className="p-0 bg-slate-50/60">
                            <div className="p-4 pl-12 pr-6 border-y border-slate-200 space-y-2">
                              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                <span>Underlying Open Invoices ({party.bills.length} Bills)</span>
                                <span className="text-[11px] text-slate-500">
                                  DOC-07 Bill-by-Bill Allocation Status
                                </span>
                              </div>

                              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-700 font-bold">
                                      <th className="py-2 px-3">Bill Number</th>
                                      <th className="py-2 px-3">Date</th>
                                      <th className="py-2 px-3 text-right">Invoice Value</th>
                                      <th className="py-2 px-3 text-right">Allocated / Paid</th>
                                      <th className="py-2 px-3 text-right">Net Due</th>
                                      <th className="py-2 px-3 text-center">Overdue Days</th>
                                      <th className="py-2 px-3 text-center">Ageing Bracket</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {party.bills.map(bill => (
                                      <tr key={bill.invoice_id} className="hover:bg-slate-50">
                                        <td className="py-2 px-3 font-bold text-slate-800">
                                          {bill.invoice_number}
                                        </td>
                                        <td className="py-2 px-3 text-slate-600">
                                          {new Date(bill.date).toLocaleDateString('en-IN')}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-700">
                                          ₹{bill.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2 px-3 text-right text-emerald-700 font-medium">
                                          ₹{bill.allocated_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                                          ₹{bill.outstanding_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                              bill.days_overdue > 60
                                                ? 'bg-red-100 text-red-800'
                                                : bill.days_overdue > 30
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-emerald-100 text-emerald-800'
                                            }`}
                                          >
                                            {bill.days_overdue} days
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-center font-bold text-slate-700">
                                          {bill.ageing_bucket}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
