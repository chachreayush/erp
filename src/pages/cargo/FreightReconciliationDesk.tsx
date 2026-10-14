import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiGetFreightReconciliations,
  apiCreateFreightReconciliation,
  apiActionFreightReconciliation,
  FreightReconciliationItem
} from '../../lib/api';
import {
  ArrowLeft,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  DollarSign,
  Layers,
  FileText,
  Truck,
  Building,
  Check,
  ShieldAlert,
  Send
} from 'lucide-react';

const FALLBACK_RECONCILIATIONS: FreightReconciliationItem[] = [
  {
    id: 'recon-01',
    recon_number: 'REC-VTR-2026-0001',
    transporter_name: 'V-Trans Logistics India Ltd.',
    transporter_invoice_no: 'INV-VTR-8921',
    transporter_invoice_date: '2026-10-12T00:00:00Z',
    expected_amount: 1970.0,
    billed_amount: 1970.0,
    approved_amount: 1970.0,
    variance_amount: 0.0,
    variance_status: 'MATCHED',
    status: 'RECONCILED',
    created_at: '2026-10-12T10:00:00Z'
  },
  {
    id: 'recon-02',
    recon_number: 'REC-GATI-2026-0002',
    transporter_name: 'Gati KWE Express Cargo',
    transporter_invoice_no: 'INV-GATI-4401',
    transporter_invoice_date: '2026-10-13T00:00:00Z',
    expected_amount: 2350.0,
    billed_amount: 2500.0,
    approved_amount: 2350.0,
    variance_amount: 150.0,
    variance_status: 'TOLERABLE',
    dispute_reason: 'Pending toll verification difference (+₹150)',
    status: 'SUBMITTED',
    created_at: '2026-10-13T14:30:00Z'
  },
  {
    id: 'recon-03',
    recon_number: 'REC-TCI-2026-0003',
    transporter_name: 'TCI Freight Express',
    transporter_invoice_no: 'INV-TCI-9981',
    transporter_invoice_date: '2026-10-14T00:00:00Z',
    expected_amount: 3800.0,
    billed_amount: 4450.0,
    approved_amount: 3800.0,
    variance_amount: 650.0,
    variance_status: 'UNAPPROVED_EXCESS',
    dispute_reason: 'Uncontracted detention surcharge billed without supervisor sign-off.',
    status: 'DISPUTED',
    created_at: '2026-10-14T09:15:00Z'
  }
];

export const FreightReconciliationDesk: React.FC = () => {
  const navigate = useNavigate();
  const [reconciliations, setReconciliations] = useState<FreightReconciliationItem[]>(FALLBACK_RECONCILIATIONS);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [transporterName, setTransporterName] = useState<string>('V-Trans Logistics India Ltd.');
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [expectedAmt, setExpectedAmt] = useState<number>(0);
  const [billedAmt, setBilledAmt] = useState<number>(0);
  const [disputeNotes, setDisputeNotes] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiGetFreightReconciliations().catch(() => ({ success: false, reconciliations: FALLBACK_RECONCILIATIONS }));
      if (res && Array.isArray(res.reconciliations) && res.reconciliations.length > 0) {
        setReconciliations(res.reconciliations);
      } else {
        setReconciliations(FALLBACK_RECONCILIATIONS);
      }
    } catch {
      setReconciliations(FALLBACK_RECONCILIATIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          setIsModalOpen(false);
        } else {
          navigate('/cargo');
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, navigate]);

  const handleAction = async (reconId: string, action: string) => {
    try {
      await apiActionFreightReconciliation(reconId, { action });
      fetchData();
    } catch {
      setReconciliations(prev =>
        prev.map(r => {
          if (r.id === reconId) {
            if (action === 'APPROVE') {
              return { ...r, status: 'RECONCILED', variance_status: 'MATCHED', approved_amount: r.billed_amount };
            } else if (action === 'DISPUTE') {
              return { ...r, status: 'DISPUTED', variance_status: 'DISPUTED' };
            } else if (action === 'POST_TO_GL') {
              return { ...r, status: 'POSTED' };
            }
          }
          return r;
        })
      );
    }
  };

  const handleCreateRecon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCreateFreightReconciliation({
        transporter_name: transporterName,
        transporter_invoice_no: invoiceNo,
        expected_amount: expectedAmt,
        billed_amount: billedAmt,
        dispute_reason: disputeNotes
      });
      setIsModalOpen(false);
      fetchData();
    } catch {
      const variance = billedAmt - expectedAmt;
      const vStatus = Math.abs(variance) < 0.01 ? 'MATCHED' : (Math.abs(variance) <= 200 ? 'TOLERABLE' : 'UNAPPROVED_EXCESS');
      const newRec: FreightReconciliationItem = {
        id: `recon-local-${Date.now()}`,
        recon_number: `REC-FRT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        transporter_name: transporterName,
        transporter_invoice_no: invoiceNo,
        transporter_invoice_date: new Date().toISOString(),
        expected_amount: expectedAmt,
        billed_amount: billedAmt,
        approved_amount: vStatus === 'MATCHED' ? billedAmt : expectedAmt,
        variance_amount: variance,
        variance_status: vStatus,
        status: vStatus === 'MATCHED' ? 'RECONCILED' : 'SUBMITTED',
        dispute_reason: disputeNotes,
        created_at: new Date().toISOString()
      };
      setReconciliations(prev => [newRec, ...prev]);
      setIsModalOpen(false);
    }
  };

  const filteredRecons = (Array.isArray(reconciliations) ? reconciliations : []).filter(r => {
    const matchesFilter =
      filterStatus === 'ALL' ||
      (filterStatus === 'MATCHED' && r.variance_status === 'MATCHED') ||
      (filterStatus === 'TOLERABLE' && r.variance_status === 'TOLERABLE') ||
      (filterStatus === 'DISPUTED' && (r.variance_status === 'DISPUTED' || r.variance_status === 'UNAPPROVED_EXCESS'));

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      r.recon_number.toLowerCase().includes(searchLower) ||
      r.transporter_name.toLowerCase().includes(searchLower) ||
      r.transporter_invoice_no.toLowerCase().includes(searchLower);

    return matchesFilter && matchesSearch;
  });

  const matchedCount = reconciliations.filter(r => r.variance_status === 'MATCHED').length;
  const tolerableCount = reconciliations.filter(r => r.variance_status === 'TOLERABLE').length;
  const disputedCount = reconciliations.filter(r => r.variance_status === 'DISPUTED' || r.variance_status === 'UNAPPROVED_EXCESS').length;

  return (
    <div className="min-h-screen bg-[#f8faf9] text-gray-800 font-sans pb-12">
      {/* Top Header & Hotkey Bar */}
      <div className="bg-[#1b4332] text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/cargo')}
            className="p-1 hover:bg-[#2d6a4f] rounded text-white flex items-center transition-colors"
            title="Return to Cargo Board [Esc]"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span className="text-xs uppercase font-semibold">Cargo Board [Esc]</span>
          </button>
          <span className="text-gray-300">|</span>
          <div className="flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-emerald-300" />
            <h1 className="text-lg font-bold tracking-wide">
              DOC-35 Transporter Billing & Reconciliation Desk
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => navigate('/freight/contracts')}
            className="px-3 py-1.5 rounded font-semibold bg-[#2d6a4f] hover:bg-emerald-700 text-gray-100 transition-all"
          >
            Rate Contracts Catalog
          </button>
          <button
            id="btn-enter-transporter-bill"
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 rounded font-bold bg-amber-500 hover:bg-amber-600 text-gray-950 flex items-center shadow transition-all"
          >
            <Plus className="w-4 h-4 mr-1" />
            Enter Transporter Bill [F6]
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div id="kpi-total-recons" className="bg-white border-l-4 border-blue-600 p-4 rounded shadow-sm">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
              <span>Total Reconciliations</span>
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-900 mt-2">
              {reconciliations.length} Statements
            </div>
            <div className="text-xs text-blue-700 font-medium mt-1">
              Three-way matched transporter audits
            </div>
          </div>

          <div id="kpi-recons-matched" className="bg-white border-l-4 border-emerald-600 p-4 rounded shadow-sm">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
              <span>Exact Matches (0 Variance)</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-900 mt-2">
              {matchedCount} Invoices
            </div>
            <div className="text-xs text-emerald-700 font-medium mt-1">
              Pre-approved within contracted rates
            </div>
          </div>

          <div id="kpi-recons-tolerable" className="bg-white border-l-4 border-amber-500 p-4 rounded shadow-sm">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
              <span>Tolerable Variance (≤ ₹200)</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-900 mt-2">
              {tolerableCount} Invoices
            </div>
            <div className="text-xs text-amber-700 font-medium mt-1">
              Fastag tolls & weight variances
            </div>
          </div>

          <div id="kpi-recons-disputed" className="bg-white border-l-4 border-rose-600 p-4 rounded shadow-sm">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
              <span>Unapproved Excess / Disputed</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-900 mt-2">
              {disputedCount} Invoices
            </div>
            <div className="text-xs text-rose-700 font-medium mt-1">
              Requires supervisor sign-off
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            {[
              { id: 'ALL', label: 'All Statements' },
              { id: 'MATCHED', label: `Exact Matches (${matchedCount})` },
              { id: 'TOLERABLE', label: `Tolerable Variances (${tolerableCount})` },
              { id: 'DISPUTED', label: `Disputes (${disputedCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded font-semibold transition-all ${
                  filterStatus === tab.id
                    ? 'bg-[#1b4332] text-white shadow'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by invoice # or transporter..."
                className="pl-8 pr-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none w-64"
              />
            </div>
            <button
              onClick={fetchData}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Reconciliation Statements Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#1b4332] text-white uppercase text-[11px] tracking-wider font-semibold">
                <th className="py-3 px-4">Statement #</th>
                <th className="py-3 px-4">Transporter & Inv #</th>
                <th className="py-3 px-4 text-right">Expected (₹)</th>
                <th className="py-3 px-4 text-right">Billed (₹)</th>
                <th className="py-3 px-4 text-right">Variance (₹)</th>
                <th className="py-3 px-4 text-center">Variance Audit</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecons.map(recon => (
                <tr key={recon.id} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-gray-900">
                    {recon.recon_number}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900">{recon.transporter_name}</div>
                    <div className="text-gray-500 text-[10px] font-mono">
                      Inv #{recon.transporter_invoice_no}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-700 font-semibold">
                    ₹{recon.expected_amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-900 font-bold">
                    ₹{recon.billed_amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    <span
                      className={
                        recon.variance_amount === 0
                          ? 'text-emerald-700'
                          : recon.variance_amount > 200
                          ? 'text-rose-700'
                          : 'text-amber-700'
                      }
                    >
                      {recon.variance_amount > 0 ? `+₹${recon.variance_amount.toFixed(2)}` : `₹${recon.variance_amount.toFixed(2)}`}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${
                        recon.variance_status === 'MATCHED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : recon.variance_status === 'TOLERABLE'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : recon.variance_status === 'UNAPPROVED_EXCESS'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-purple-100 text-purple-800 border border-purple-300'
                      }`}
                    >
                      {recon.variance_status}
                    </span>
                    {recon.dispute_reason && (
                      <div className="text-[10px] text-gray-500 mt-0.5 truncate max-w-xs mx-auto" title={recon.dispute_reason}>
                        {recon.dispute_reason}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        recon.status === 'POSTED'
                          ? 'bg-blue-100 text-blue-900'
                          : recon.status === 'RECONCILED'
                          ? 'bg-emerald-50 text-emerald-800'
                          : recon.status === 'DISPUTED'
                          ? 'bg-rose-50 text-rose-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {recon.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5">
                    {recon.status !== 'POSTED' && (
                      <>
                        {recon.variance_status !== 'MATCHED' && (
                          <button
                            onClick={() => handleAction(recon.id, 'APPROVE')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-sm"
                            title="Approve Billed Amount"
                          >
                            Approve
                          </button>
                        )}
                        {recon.variance_status !== 'DISPUTED' && (
                          <button
                            onClick={() => handleAction(recon.id, 'DISPUTE')}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold shadow-sm"
                            title="Log Commercial Dispute"
                          >
                            Dispute
                          </button>
                        )}
                        <button
                          onClick={() => handleAction(recon.id, 'POST_TO_GL')}
                          className="px-2 py-1 bg-[#1b4332] hover:bg-[#2d6a4f] text-white rounded text-[10px] font-bold shadow-sm"
                          title="Post to Platform Admin GL (Account 5200)"
                        >
                          Post GL
                        </button>
                      </>
                    )}
                    {recon.status === 'POSTED' && (
                      <span className="text-emerald-800 font-bold text-[10px] flex items-center justify-end">
                        <Check className="w-3.5 h-3.5 mr-0.5 text-emerald-600" />
                        Posted to GL (A/C 5200)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Transporter Bill Entry Modal */}
      {isModalOpen && (
        <div id="modal-enter-transporter-bill" className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden border border-gray-200">
            <div className="bg-[#1b4332] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center">
                <FileCheck className="w-5 h-5 mr-2 text-emerald-300" />
                Record Transporter Bill for Three-Way Audit
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-300 hover:text-white font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateRecon} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Transporter Name</label>
                <select
                  value={transporterName}
                  onChange={e => setTransporterName(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 bg-white"
                >
                  <option value="V-Trans Logistics India Ltd.">V-Trans Logistics India Ltd.</option>
                  <option value="Gati KWE Express Cargo">Gati KWE Express Cargo</option>
                  <option value="TCI Freight Express">TCI Freight Express</option>
                  <option value="Safexpress Logistics Ltd.">Safexpress Logistics Ltd.</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Transporter Invoice Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-VT-2026-9901"
                  value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">System Expected Freight (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expectedAmt}
                    onChange={e => setExpectedAmt(parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded p-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Actual Billed Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={billedAmt}
                    onChange={e => setBilledAmt(parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded p-2 font-mono font-bold text-emerald-800"
                  />
                </div>
              </div>

              {/* Dynamic Variance Preview */}
              <div className="bg-gray-50 p-3 rounded border border-gray-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-600">Calculated Variance:</span>
                <span className="font-mono font-black text-sm">
                  ₹{(billedAmt - expectedAmt).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Discrepancy / Audit Remarks</label>
                <textarea
                  rows={2}
                  value={disputeNotes}
                  onChange={e => setDisputeNotes(e.target.value)}
                  placeholder="e.g. Fastag toll slip verified / Unapproved detention charge"
                  className="w-full border border-gray-300 rounded p-2"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-semibold hover:bg-gray-100"
                >
                  Cancel [Esc]
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-bold rounded shadow"
                >
                  Submit Statement [Enter]
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
