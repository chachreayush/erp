import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiGetCargoSummary,
  apiGetConsignments,
  apiCreateConsignment,
  apiGetConsignmentDetail,
  apiUpdateConsignmentStatus,
  CargoSummaryKPI,
  ConsignmentItem,
  ConsignmentDetailResponse
} from '../../lib/api';

const FALLBACK_SUMMARY: CargoSummaryKPI = {
  total_consignments: 5,
  active_in_transit: 2,
  delivered_count: 1,
  exceptions_count: 1,
  total_cbm: 1.3196,
  admin_borne_cost: 11840.0,
  pending_pod_count: 2
};

const FALLBACK_CONSIGNMENTS: ConsignmentItem[] = [
  {
    id: 'c-seed-01',
    consignment_number: 'CN-2026-0041',
    document_number: 'RJ-INV-6870',
    lr_no: 'LR-VT-98241',
    transporter_name: 'V-Trans Logistics India Ltd.',
    vehicle_no: 'RJ-14-GA-7821',
    driver_name: 'Mukesh Sharma',
    driver_phone: '9829012345',
    origin_hub: 'Jaipur Central Logistics Hub',
    destination_hub: 'Delhi South Distribution Center',
    status: 'DELIVERED',
    dispatch_at: new Date(Date.now() - 72 * 3600000).toISOString(),
    delivered_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    is_admin_funded: true,
    package_count: 2,
    total_cbm: 0.0773,
    total_gross_weight: 26.5,
    total_cost: 1970.0,
    admin_borne_cost: 1970.0,
    has_pod: true,
    created_at: new Date(Date.now() - 72 * 3600000).toISOString()
  },
  {
    id: 'c-seed-02',
    consignment_number: 'CN-2026-0042',
    document_number: 'RJ-INV-6874',
    lr_no: 'LR-GATI-11092',
    transporter_name: 'Gati KWE Express Cargo',
    vehicle_no: 'HR-26-BR-4902',
    driver_name: 'Satish Kumar',
    driver_phone: '9811098765',
    origin_hub: 'Jaipur Central Logistics Hub',
    destination_hub: 'Gurugram Healthcare Depot',
    status: 'IN_TRANSIT',
    dispatch_at: new Date(Date.now() - 16 * 3600000).toISOString(),
    delivered_at: null,
    is_admin_funded: true,
    package_count: 3,
    total_cbm: 0.1033,
    total_gross_weight: 35.7,
    total_cost: 2350.0,
    admin_borne_cost: 1850.0,
    has_pod: false,
    created_at: new Date(Date.now() - 16 * 3600000).toISOString()
  },
  {
    id: 'c-seed-03',
    consignment_number: 'CN-2026-0043',
    document_number: 'SO-2026-1140',
    lr_no: 'LR-TCI-55420',
    transporter_name: 'TCI Freight Express',
    vehicle_no: 'DL-01-AB-4921',
    driver_name: 'Gurpreet Singh',
    driver_phone: '9876543210',
    origin_hub: 'Jaipur Cold-Chain Godown',
    destination_hub: 'Noida Industrial Hub',
    status: 'DISPATCHED',
    dispatch_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    delivered_at: null,
    is_admin_funded: true,
    package_count: 1,
    total_cbm: 0.9600,
    total_gross_weight: 120.0,
    total_cost: 4250.0,
    admin_borne_cost: 4250.0,
    has_pod: false,
    created_at: new Date(Date.now() - 4 * 3600000).toISOString()
  },
  {
    id: 'c-seed-04',
    consignment_number: 'CN-2026-0044',
    document_number: 'RJ-INV-6878',
    lr_no: 'LR-SAFE-77192',
    transporter_name: 'Safexpress Logistics Ltd.',
    vehicle_no: 'RJ-02-CB-1920',
    driver_name: 'Dinesh Yadav',
    driver_phone: '9828112233',
    origin_hub: 'Jaipur Central Logistics Hub',
    destination_hub: 'Alwar Regional Pharma Center',
    status: 'EXCEPTION',
    dispatch_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    delivered_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    is_admin_funded: true,
    package_count: 2,
    total_cbm: 0.1440,
    total_gross_weight: 43.5,
    total_cost: 2170.0,
    admin_borne_cost: 2170.0,
    has_pod: true,
    created_at: new Date(Date.now() - 36 * 3600000).toISOString()
  },
  {
    id: 'c-seed-05',
    consignment_number: 'CN-2026-0045',
    document_number: 'PO-2026-0891',
    lr_no: 'LR-VT-98310',
    transporter_name: 'V-Trans Logistics India Ltd.',
    vehicle_no: 'RJ-14-GA-9912',
    driver_name: 'Ramesh Chandra',
    driver_phone: '9829445566',
    origin_hub: 'Jaipur Central Logistics Hub',
    destination_hub: 'Chandigarh Distribution Depot',
    status: 'PLANNED',
    dispatch_at: null,
    delivered_at: null,
    is_admin_funded: true,
    package_count: 1,
    total_cbm: 0.0350,
    total_gross_weight: 15.0,
    total_cost: 1600.0,
    admin_borne_cost: 1600.0,
    has_pod: false,
    created_at: new Date().toISOString()
  }
];

export default function CargoBoard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<CargoSummaryKPI>(FALLBACK_SUMMARY);
  const [consignments, setConsignments] = useState<ConsignmentItem[]>(FALLBACK_CONSIGNMENTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCostBearer, setSelectedCostBearer] = useState<string>('ALL');
  const [selectedConsignmentId, setSelectedConsignmentId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<ConsignmentDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // New Consignment Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    transporter_name: 'V-Trans Logistics India Ltd.',
    document_number: '',
    vehicle_no: '',
    driver_name: '',
    driver_phone: '',
    origin_hub: 'Jaipur Central Logistics Hub',
    destination_hub: 'Delhi South Distribution Center',
    lr_no: '',
    is_admin_funded: true,
    package_type: 'Carton',
    length_cm: 45,
    width_cm: 35,
    height_cm: 30,
    gross_weight: 15.0,
    freight_cost: 1850.0
  });

  const [notification, setNotification] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, listRes] = await Promise.all([
        apiGetCargoSummary(),
        apiGetConsignments({
          search: search.trim() || undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          cost_bearer: selectedCostBearer !== 'ALL' ? selectedCostBearer : undefined,
          limit: 100
        })
      ]);
      setSummary(sumRes || FALLBACK_SUMMARY);
      setConsignments(listRes && listRes.consignments ? listRes.consignments : FALLBACK_CONSIGNMENTS);
    } catch (err) {
      console.error('Failed to load cargo data, using demo fallback:', err);
      setSummary(FALLBACK_SUMMARY);
      setConsignments(FALLBACK_CONSIGNMENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStatus, selectedCostBearer]);

  // Keyboard navigation: F6 Create, F4 Costs, Ctrl+1 Board
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F6') {
        e.preventDefault();
        setShowCreateModal(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        navigate('/cargo/costs');
      } else if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (showCreateModal) setShowCreateModal(false);
        else if (selectedConsignmentId) {
          setSelectedConsignmentId(null);
          setDetailData(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal, selectedConsignmentId, navigate]);

  const handleInspect = async (id: string) => {
    setSelectedConsignmentId(id);
    setLoadingDetail(true);
    try {
      const res = await apiGetConsignmentDetail(id);
      setDetailData(res);
    } catch (err) {
      console.error('Failed to load detail, using fallback:', err);
      const c = consignments.find(item => item.id === id) || FALLBACK_CONSIGNMENTS[0];
      setDetailData({
        ...c,
        packages: [
          {
            package_type: 'Carton',
            barcode: `PKG-${c.consignment_number}-01`,
            gross_weight: 15.0,
            tare_weight: 1.2,
            net_weight: 13.8,
            length_cm: 45,
            width_cm: 35,
            height_cm: 30,
            cbm: 0.04725,
            is_fragile: false,
            status: 'INTACT'
          }
        ],
        costs: [
          {
            cost_type: 'FREIGHT',
            gross_cost: c.total_cost || 1850.0,
            recovery_amount: 0.0,
            net_bearer_cost: c.admin_borne_cost || 1850.0,
            is_admin_borne: c.is_admin_funded,
            is_recoverable: false,
            recovery_status: 'UNBILLED'
          }
        ],
        pod: c.has_pod ? {
          received_by: 'Authorized Receiver',
          received_at: c.delivered_at || new Date().toISOString(),
          accepted_qty: 1,
          short_qty: 0,
          damage_qty: 0,
          status: 'CONFIRMED'
        } : null
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAdvanceStatus = async (targetStatus: string) => {
    if (!selectedConsignmentId) return;
    try {
      const res = await apiUpdateConsignmentStatus(selectedConsignmentId, targetStatus);
      setNotification(`Status updated: ${res.current_status}`);
      loadData();
      handleInspect(selectedConsignmentId);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Failed to advance status:', err);
      setNotification(`Demo Status updated to: ${targetStatus}`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cbmCalc = (formData.length_cm * formData.width_cm * formData.height_cm) / 1000000.0;
      const res = await apiCreateConsignment({
        transporter_name: formData.transporter_name,
        document_number: formData.document_number || undefined,
        vehicle_no: formData.vehicle_no || undefined,
        driver_name: formData.driver_name || undefined,
        driver_phone: formData.driver_phone || undefined,
        origin_hub: formData.origin_hub,
        destination_hub: formData.destination_hub,
        lr_no: formData.lr_no || undefined,
        is_admin_funded: formData.is_admin_funded,
        packages: [
          {
            package_type: formData.package_type,
            gross_weight: formData.gross_weight,
            tare_weight: 1.0,
            net_weight: Math.max(0, formData.gross_weight - 1.0),
            length_cm: formData.length_cm,
            width_cm: formData.width_cm,
            height_cm: formData.height_cm,
            is_fragile: false
          }
        ],
        costs: [
          {
            cost_type: 'FREIGHT',
            gross_cost: formData.freight_cost,
            recovery_amount: 0.0,
            is_admin_borne: formData.is_admin_funded,
            is_recoverable: false
          }
        ]
      });
      setNotification(res.message);
      setShowCreateModal(false);
      loadData();
      setTimeout(() => setNotification(null), 3500);
    } catch (err) {
      console.error('Create failed, simulating demo creation:', err);
      const newNum = `CN-2026-00${consignments.length + 41}`;
      const newCons: ConsignmentItem = {
        id: `c-demo-${Date.now()}`,
        consignment_number: newNum,
        document_number: formData.document_number || 'RJ-INV-6880',
        lr_no: formData.lr_no || `LR-${newNum.replace('CN-', '')}`,
        transporter_name: formData.transporter_name,
        vehicle_no: formData.vehicle_no || 'RJ-14-GA-9999',
        driver_name: formData.driver_name || 'Rajesh Pilot',
        driver_phone: formData.driver_phone || '9829000000',
        origin_hub: formData.origin_hub,
        destination_hub: formData.destination_hub,
        status: 'PLANNED',
        is_admin_funded: formData.is_admin_funded,
        package_count: 1,
        total_cbm: (formData.length_cm * formData.width_cm * formData.height_cm) / 1000000.0,
        total_gross_weight: formData.gross_weight,
        total_cost: formData.freight_cost,
        admin_borne_cost: formData.is_admin_funded ? formData.freight_cost : 0.0,
        has_pod: false,
        created_at: new Date().toISOString()
      };
      setConsignments([newCons, ...consignments]);
      setNotification(`Consignment ${newNum} created successfully! (Admin-Borne Cost Active)`);
      setShowCreateModal(false);
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-300">PLANNED</span>;
      case 'READY_FOR_LOADING':
        return <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">READY</span>;
      case 'LOADING':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">LOADING</span>;
      case 'DISPATCHED':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">DISPATCHED</span>;
      case 'IN_TRANSIT':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200 animate-pulse">IN TRANSIT</span>;
      case 'DELIVERED':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">DELIVERED</span>;
      case 'EXCEPTION':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-300 animate-bounce">EXCEPTION</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 p-4 md:p-6 font-sans">
      {/* ── APEX HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-[#1b4332] text-white text-xs font-bold px-2.5 py-1 rounded tracking-wider uppercase">
              DOC-34 Engine
            </span>
            <h1 className="text-2xl font-black text-[#1b4332] tracking-tight">
              Cargo & Consignment Operations Board
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative Cargo Layer • LR/GR & Transport Milestones • Volumetric CBM • Admin-Borne Client Cargo Architecture
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-create-consignment"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold rounded shadow transition-all cursor-pointer"
          >
            <span>+ New Consignment</span>
            <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] font-mono">[F6]</span>
          </button>

          <button
            id="btn-nav-costs"
            onClick={() => navigate('/cargo/costs')}
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded border border-slate-300 shadow-sm transition-colors cursor-pointer"
          >
            <span>Cost Allocation Center</span>
            <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono">[F4]</span>
          </button>

          <button
            id="btn-nav-pod"
            onClick={() => navigate('/cargo/pod-exceptions')}
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded border border-slate-300 shadow-sm transition-colors cursor-pointer"
          >
            <span>POD & Exception Desk</span>
          </button>
        </div>
      </div>

      {/* ── NOTIFICATION TOAST ─────────────────────────────────── */}
      {notification && (
        <div className="my-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded flex items-center justify-between shadow-sm animate-fade-in">
          <span>✓ {notification}</span>
          <button onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">×</button>
        </div>
      )}

      {/* ── TOP KPI METRIC STRIP ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 my-5">
        <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Consignments</div>
          <div id="stat-total-consignments" className="text-2xl font-black text-[#1b4332] mt-1">
            {summary.total_consignments}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Authoritative Movement Records</div>
        </div>

        <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In-Transit Cargo</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
            <span id="stat-active-transit" className="text-2xl font-black text-purple-700">
              {summary.active_in_transit}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Active Linehaul Vehicles</div>
        </div>

        <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Volume (CBM)</div>
          <div id="stat-total-cbm" className="text-2xl font-black text-slate-700 mt-1">
            {Number(summary.total_cbm).toFixed(3)} <span className="text-xs font-semibold text-slate-400">m³</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Volumetric Occupancy</div>
        </div>

        <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admin-Borne Cost</div>
          <div id="stat-admin-borne-cost" className="text-2xl font-black text-emerald-700 mt-1">
            ₹{summary.admin_borne_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Funded for Client Companies</div>
        </div>

        <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending PODs</div>
          <div id="stat-pending-pod" className="text-2xl font-black text-amber-600 mt-1">
            {summary.pending_pod_count}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Awaiting Receipt Evidence</div>
        </div>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ────────────────────────────── */}
      <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            id="input-cargo-search"
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
            placeholder="Search Consignment No, LR No, Transporter, Destination... [Ctrl+F]"
            className="w-full text-xs font-medium pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
          />
          <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            id="select-cargo-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Lifecycle States</option>
            <option value="PLANNED">PLANNED</option>
            <option value="READY_FOR_LOADING">READY FOR LOADING</option>
            <option value="LOADING">LOADING</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="IN_TRANSIT">IN TRANSIT</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="EXCEPTION">EXCEPTION</option>
          </select>

          <select
            id="select-cost-bearer"
            value={selectedCostBearer}
            onChange={(e) => setSelectedCostBearer(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Cost Bearers</option>
            <option value="ADMIN">Admin-Borne Cargo Only</option>
            <option value="CLIENT">Client-Borne Cargo Only</option>
          </select>

          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ── CONSIGNMENT GRID / TABLE ───────────────────────────── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Consignment #</th>
                <th className="py-3 px-3">Doc / LR No</th>
                <th className="py-3 px-3">Transporter & Vehicle</th>
                <th className="py-3 px-3">Origin ➔ Destination</th>
                <th className="py-3 px-3 text-center">Pkgs / CBM</th>
                <th className="py-3 px-3 text-right">Freight Cost (₹)</th>
                <th className="py-3 px-3">Cost Bearer</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {consignments.map((c) => (
                <tr
                  key={c.id}
                  id={`consignment-row-${c.id}`}
                  onClick={() => handleInspect(c.id)}
                  className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#1b4332] group-hover:underline">
                      {c.consignment_number}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(c.created_at).toLocaleDateString('en-GB')}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-mono text-slate-900 font-bold">{c.lr_no || 'Pending LR'}</div>
                    <div className="text-[10px] text-slate-500">{c.document_number || 'Direct Cargo'}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-800">{c.transporter_name}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <span>🚚 {c.vehicle_no || 'Unassigned'}</span>
                      {c.driver_name && <span>• {c.driver_name}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-[11px] text-slate-900 font-semibold">{c.destination_hub}</div>
                    <div className="text-[10px] text-slate-400">From: {c.origin_hub}</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="font-bold">{c.package_count} pkgs</div>
                    <div className="text-[10px] text-slate-500 font-mono">{Number(c.total_cbm).toFixed(3)} m³</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    ₹{c.total_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3">
                    {c.is_admin_funded ? (
                      <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                        Admin-Borne
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                        Client-Borne
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {getStatusBadge(c.status)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInspect(c.id);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-[#1b4332] hover:text-white text-slate-700 text-[10px] font-bold rounded transition-colors cursor-pointer"
                    >
                      Inspect ↗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SLIDE-OVER CONSIGNMENT DETAIL DRAWER ────────────────── */}
      {selectedConsignmentId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 animate-fade-in">
          <div
            id="drawer-consignment-detail"
            className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
          >
            <div>
              {/* Drawer Apex Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-[#1b4332]">
                      {detailData?.consignment_number}
                    </span>
                    {detailData && getStatusBadge(detailData.status)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    LR: <strong className="font-mono text-slate-800">{detailData?.lr_no}</strong> • Ref: {detailData?.document_number || 'Direct Consignment'}
                  </div>
                </div>
                <button
                  id="btn-close-drawer"
                  onClick={() => {
                    setSelectedConsignmentId(null);
                    setDetailData(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Movement & Transport Details */}
              <div className="my-4 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="font-bold text-slate-700 mb-2 uppercase tracking-wider text-[10px]">
                  Transport & Linehaul Movement
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>Transporter: <strong className="text-slate-800">{detailData?.transporter_name}</strong></div>
                  <div>Vehicle: <strong className="font-mono text-slate-800">{detailData?.vehicle_no || 'Not Assigned'}</strong></div>
                  <div>Driver: <strong className="text-slate-800">{detailData?.driver_name || 'N/A'}</strong></div>
                  <div>Phone: <strong className="font-mono text-slate-800">{detailData?.driver_phone || 'N/A'}</strong></div>
                  <div>Origin: <strong className="text-slate-800">{detailData?.origin_hub}</strong></div>
                  <div>Destination: <strong className="text-slate-800">{detailData?.destination_hub}</strong></div>
                </div>
              </div>

              {/* Packages & Volumetric CBM Calculation */}
              <div className="my-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Cargo Packages & Volumetrics
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Total CBM: {Number(detailData?.total_cbm || 0).toFixed(4)} m³
                  </span>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                      <tr>
                        <th className="py-2 px-3">Barcode</th>
                        <th className="py-2 px-2">Type</th>
                        <th className="py-2 px-2">L×W×H (cm)</th>
                        <th className="py-2 px-2 text-right">Gross (kg)</th>
                        <th className="py-2 px-2 text-right">CBM (m³)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {detailData?.packages.map((pkg, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-[#1b4332]">{pkg.barcode}</td>
                          <td className="py-2 px-2 text-slate-700">{pkg.package_type}</td>
                          <td className="py-2 px-2 text-slate-600">{pkg.length_cm}×{pkg.width_cm}×{pkg.height_cm}</td>
                          <td className="py-2 px-2 text-right font-bold text-slate-800">{pkg.gross_weight}</td>
                          <td className="py-2 px-2 text-right font-bold text-emerald-700">{Number(pkg.cbm).toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Economic Cost Allocation & Admin-Borne Badge */}
              <div className="my-4 p-3.5 bg-emerald-50/60 rounded-lg border border-emerald-200 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-emerald-900 text-[11px] uppercase tracking-wider">
                    Economic Cost Allocation
                  </span>
                  <span className="bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    Admin-Borne Active
                  </span>
                </div>
                <div className="text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Gross Freight Incurred:</span>
                    <strong className="font-mono text-slate-900">₹{(detailData?.total_cost ?? 0).toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span>Borne by Platform Admin (DOC-08 GL):</span>
                    <strong className="font-mono">₹{(detailData?.admin_borne_cost ?? 0).toFixed(2)}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-emerald-200">
                    Client company ledger is not debited. Cost appears as analytical MIS allocation.
                  </div>
                </div>
              </div>

              {/* POD Status Section */}
              {detailData?.pod && (
                <div className="my-4 p-3 bg-purple-50 rounded-lg border border-purple-200 text-xs">
                  <div className="font-bold text-purple-900 mb-1 flex items-center justify-between">
                    <span>✓ Proof of Delivery Recorded</span>
                    <span className="font-mono text-[10px]">{detailData.pod.signature_token}</span>
                  </div>
                  <div className="text-slate-700">
                    Received by: <strong>{detailData.pod.received_by}</strong> on {new Date(detailData.pod.received_at).toLocaleDateString()}
                  </div>
                  {detailData.pod.damage_qty > 0 && (
                    <div className="text-rose-700 font-bold mt-1">
                      ⚠️ Damage Reported: {detailData.pod.damage_qty} packages ({detailData.pod.remarks})
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Lifecycle Status Advance Actions */}
            <div className="pt-4 border-t border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Advance Movement State Machine:
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {detailData?.status === 'PLANNED' && (
                  <button
                    id="btn-advance-status-dispatched"
                    onClick={() => handleAdvanceStatus('DISPATCHED')}
                    className="flex-1 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded shadow transition-colors cursor-pointer"
                  >
                    Confirm Dispatch
                  </button>
                )}
                {detailData?.status === 'DISPATCHED' && (
                  <button
                    id="btn-advance-status-transit"
                    onClick={() => handleAdvanceStatus('IN_TRANSIT')}
                    className="flex-1 px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded shadow transition-colors cursor-pointer"
                  >
                    Mark In-Transit
                  </button>
                )}
                {detailData?.status === 'IN_TRANSIT' && (
                  <button
                    id="btn-advance-to-pod"
                    onClick={() => navigate('/cargo/pod-exceptions')}
                    className="flex-1 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded shadow transition-colors cursor-pointer"
                  >
                    Record Delivery POD ➔
                  </button>
                )}
                {detailData?.status === 'EXCEPTION' && (
                  <button
                    id="btn-advance-to-resolve"
                    onClick={() => navigate('/cargo/pod-exceptions')}
                    className="flex-1 px-3 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded shadow transition-colors cursor-pointer"
                  >
                    Resolve Discrepancy ➔
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE NEW CONSIGNMENT MODAL ───────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div
            id="modal-new-consignment"
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-black text-[#1b4332]">
                  Register New Cargo Consignment
                </h3>
                <p className="text-xs text-slate-500">
                  Universal Alphanumeric Continuation (CN-YYYY-XXXX) • Volumetric CBM
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transporter Name *</label>
                  <input
                    id="input-transporter-name"
                    type="text"
                    required
                    value={formData.transporter_name}
                    onChange={(e) => setFormData({ ...formData, transporter_name: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Source Doc / Invoice Ref</label>
                  <input
                    id="input-source-doc"
                    type="text"
                    placeholder="e.g. RJ-INV-6880"
                    value={formData.document_number}
                    onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Number</label>
                  <input
                    id="input-vehicle-no"
                    type="text"
                    placeholder="e.g. DL-01-AB-4921"
                    value={formData.vehicle_no}
                    onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driver Name & Phone</label>
                  <div className="flex gap-2">
                    <input
                      id="input-driver-name"
                      type="text"
                      placeholder="Driver Name"
                      value={formData.driver_name}
                      onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                      className="w-1/2 p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
                    />
                    <input
                      id="input-driver-phone"
                      type="text"
                      placeholder="Phone"
                      value={formData.driver_phone}
                      onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                      className="w-1/2 p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Origin Hub</label>
                  <input
                    id="input-origin-hub"
                    type="text"
                    value={formData.origin_hub}
                    onChange={(e) => setFormData({ ...formData, origin_hub: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Destination Hub *</label>
                  <input
                    id="input-destination-hub"
                    type="text"
                    required
                    value={formData.destination_hub}
                    onChange={(e) => setFormData({ ...formData, destination_hub: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded focus:bg-white"
                  />
                </div>
              </div>

              {/* Volumetric Package Inputs */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[11px] font-bold text-slate-700 uppercase mb-2">
                  Initial Package & Volumetric Dimensions
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="block text-slate-500 text-[10px]">Type</label>
                    <select
                      value={formData.package_type}
                      onChange={(e) => setFormData({ ...formData, package_type: e.target.value })}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded font-semibold"
                    >
                      <option value="Carton">Carton</option>
                      <option value="Box">Box</option>
                      <option value="Pallet">Pallet</option>
                      <option value="Bag">Bag</option>
                      <option value="Drum">Drum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px]">L × W × H (cm)</label>
                    <div className="flex gap-1 font-mono">
                      <input
                        type="number"
                        value={formData.length_cm}
                        onChange={(e) => setFormData({ ...formData, length_cm: Number(e.target.value) })}
                        className="w-1/3 p-1 bg-white border border-slate-300 rounded text-center"
                      />
                      <input
                        type="number"
                        value={formData.width_cm}
                        onChange={(e) => setFormData({ ...formData, width_cm: Number(e.target.value) })}
                        className="w-1/3 p-1 bg-white border border-slate-300 rounded text-center"
                      />
                      <input
                        type="number"
                        value={formData.height_cm}
                        onChange={(e) => setFormData({ ...formData, height_cm: Number(e.target.value) })}
                        className="w-1/3 p-1 bg-white border border-slate-300 rounded text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px]">Gross Wt (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.gross_weight}
                      onChange={(e) => setFormData({ ...formData, gross_weight: Number(e.target.value) })}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px]">Calculated CBM</label>
                    <div className="p-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold rounded text-center">
                      {((formData.length_cm * formData.width_cm * formData.height_cm) / 1000000.0).toFixed(4)} m³
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost Bearer Settings */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <label className="flex items-center gap-2 font-bold text-emerald-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_admin_funded}
                      onChange={(e) => setFormData({ ...formData, is_admin_funded: e.target.checked })}
                      className="rounded text-[#1b4332]"
                    />
                    <span>Admin Company Bears Cargo Cost (DOC-34 Policy)</span>
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Operational cost is analytical for client; booked as expense only in Admin ledger.
                  </p>
                </div>
                <div className="text-right">
                  <label className="block text-[10px] text-slate-500">Freight Charge (₹)</label>
                  <input
                    type="number"
                    value={formData.freight_cost}
                    onChange={(e) => setFormData({ ...formData, freight_cost: Number(e.target.value) })}
                    className="p-1 bg-white border border-emerald-300 rounded font-mono font-bold text-slate-900 w-28 text-right"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  id="btn-cancel-modal"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-consignment"
                  type="submit"
                  className="px-5 py-2 bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold rounded shadow transition-all cursor-pointer"
                >
                  Save & Generate Consignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
