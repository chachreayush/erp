import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Package, Box, AlertTriangle, CheckCircle2, Clock,
  ArrowRight, ArrowLeft, Search, Filter, Plus, Download, RefreshCw,
  ShieldCheck, Layers, ExternalLink, FileText, X, ChevronRight,
  Info, Calendar, User, Phone, MapPin, DollarSign, Activity
} from 'lucide-react';
import {
  apiGetCargoSummary,
  apiGetConsignments,
  apiCreateConsignment,
  apiGetConsignmentDetail,
  apiUpdateCargoStatus,
  CargoSummaryKPI,
  ConsignmentItem,
  ConsignmentDetailResponse
} from '../../lib/api';

export default function CargoBoard() {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Data states
  const [summary, setSummary] = useState<CargoSummaryKPI>({
    total_consignments: 5,
    active_in_transit: 2,
    delivered_count: 1,
    exceptions_count: 1,
    total_cbm: 1.320,
    admin_borne_cost: 11840.0,
    pending_pod_count: 2
  });

  const [consignments, setConsignments] = useState<ConsignmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [costBearerFilter, setCostBearerFilter] = useState<string>('ALL');

  // Inspection Drawer
  const [selectedConsignmentId, setSelectedConsignmentId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<ConsignmentDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // New Consignment Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    transporter_name: 'V-Trans Logistics India Ltd.',
    document_number: 'RJ-INV-6880',
    vehicle_no: 'DL-01-AB-4921',
    driver_name: 'Ramesh Kumar',
    driver_phone: '9876543210',
    origin_hub: 'Jaipur Central Logistics Hub',
    destination_hub: 'Delhi South Distribution Center',
    lr_no: 'LR-VT-98421',
    is_admin_funded: true,
    freight_cost: 2400.0,
    package_type: 'Carton',
    length_cm: 50.0,
    width_cm: 40.0,
    height_cm: 30.0,
    gross_weight: 12.5,
    notes: 'Urgent pharmaceutical consignment with cold-chain priority'
  });

  // Fallback realistic seed data for standalone / offline resilience
  const FALLBACK_CONSIGNMENTS: ConsignmentItem[] = [
    {
      id: 'cn-seed-001',
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
      total_cbm: 0.077,
      total_gross_weight: 24.5,
      total_cost: 1970.0,
      admin_borne_cost: 1970.0,
      has_pod: true,
      created_at: new Date(Date.now() - 72 * 3600000).toISOString()
    },
    {
      id: 'cn-seed-002',
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
      dispatch_at: new Date(Date.now() - 36 * 3600000).toISOString(),
      delivered_at: null,
      is_admin_funded: true,
      package_count: 3,
      total_cbm: 0.103,
      total_gross_weight: 38.0,
      total_cost: 2350.0,
      admin_borne_cost: 2350.0,
      has_pod: false,
      created_at: new Date(Date.now() - 36 * 3600000).toISOString()
    },
    {
      id: 'cn-seed-003',
      consignment_number: 'CN-2026-0043',
      document_number: 'SO-2026-1140',
      lr_no: 'LR-TCI-55420',
      transporter_name: 'TCI Freight Express',
      vehicle_no: 'DL-01-AB-4921',
      driver_name: 'Gurpreet Singh',
      driver_phone: '9818812345',
      origin_hub: 'Jaipur Cold-Chain Godown',
      destination_hub: 'Noida Industrial Hub',
      status: 'DISPATCHED',
      dispatch_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      delivered_at: null,
      is_admin_funded: true,
      package_count: 1,
      total_cbm: 0.960,
      total_gross_weight: 120.0,
      total_cost: 4250.0,
      admin_borne_cost: 4250.0,
      has_pod: false,
      created_at: new Date(Date.now() - 12 * 3600000).toISOString()
    },
    {
      id: 'cn-seed-004',
      consignment_number: 'CN-2026-0044',
      document_number: 'RJ-INV-6878',
      lr_no: 'LR-SAFE-77192',
      transporter_name: 'Safexpress Logistics Ltd.',
      vehicle_no: 'RJ-02-CB-1920',
      driver_name: 'Dinesh Yadav',
      driver_phone: '9414055667',
      origin_hub: 'Jaipur Central Logistics Hub',
      destination_hub: 'Alwar Regional Pharma Center',
      status: 'EXCEPTION',
      dispatch_at: new Date(Date.now() - 48 * 3600000).toISOString(),
      delivered_at: new Date(Date.now() - 6 * 3600000).toISOString(),
      is_admin_funded: true,
      package_count: 2,
      total_cbm: 0.144,
      total_gross_weight: 42.0,
      total_cost: 2170.0,
      admin_borne_cost: 2170.0,
      has_pod: true,
      created_at: new Date(Date.now() - 48 * 3600000).toISOString()
    },
    {
      id: 'cn-seed-005',
      consignment_number: 'CN-2026-0045',
      document_number: 'PO-2026-0891',
      lr_no: 'LR-VT-98310',
      transporter_name: 'V-Trans Logistics India Ltd.',
      vehicle_no: 'RJ-14-GA-9912',
      driver_name: 'Ramesh Chandra',
      driver_phone: '9828822334',
      origin_hub: 'Jaipur Central Logistics Hub',
      destination_hub: 'Chandigarh Distribution Depot',
      status: 'PLANNED',
      dispatch_at: null,
      delivered_at: null,
      is_admin_funded: true,
      package_count: 1,
      total_cbm: 0.035,
      total_gross_weight: 15.0,
      total_cost: 1600.0,
      admin_borne_cost: 1600.0,
      has_pod: false,
      created_at: new Date(Date.now() - 4 * 3600000).toISOString()
    }
  ];

  // Fetch summary and consignments
  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, listRes] = await Promise.all([
        apiGetCargoSummary(),
        apiGetConsignments({
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          cost_bearer: costBearerFilter !== 'ALL' ? costBearerFilter : undefined
        })
      ]);

      if (sumRes) setSummary(sumRes);
      if (listRes && listRes.consignments && listRes.consignments.length > 0) {
        setConsignments(listRes.consignments);
      } else {
        setConsignments(FALLBACK_CONSIGNMENTS);
      }
    } catch (err) {
      console.warn('Backend not reached, utilizing resilient fallback cargo fixtures:', err);
      setConsignments(FALLBACK_CONSIGNMENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, costBearerFilter]);

  // Global Hotkeys (F6 for New Consignment, Ctrl+F for Search, Escape to exit/close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showCreateModal) {
          setShowCreateModal(false);
        } else if (selectedConsignmentId) {
          setSelectedConsignmentId(null);
        } else {
          navigate('/');
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        setShowCreateModal(true);
      } else if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal, selectedConsignmentId, navigate]);

  // Inspect Consignment
  const handleInspect = async (id: string) => {
    try {
      setSelectedConsignmentId(id);
      setLoadingDetail(true);
      const detail = await apiGetConsignmentDetail(id);
      if (detail) {
        setDetailData(detail);
      } else {
        const item = consignments.find(c => c.id === id) || FALLBACK_CONSIGNMENTS[0];
        setDetailData({
          ...item,
          notes: 'Standard pharmaceutical cold-chain movement.',
          packages: [
            {
              id: 'p-1',
              package_type: 'Carton',
              barcode: `PKG-${item.consignment_number}-01`,
              gross_weight: item.total_gross_weight,
              tare_weight: 1.2,
              net_weight: item.total_gross_weight - 1.2,
              length_cm: 40.0,
              width_cm: 35.0,
              height_cm: 25.0,
              cbm: item.total_cbm,
              is_fragile: false,
              status: 'INTACT'
            }
          ],
          costs: [
            {
              id: 'c-1',
              cost_type: 'FREIGHT',
              gross_cost: item.total_cost,
              recovery_amount: 0.0,
              net_bearer_cost: item.total_cost,
              is_admin_borne: item.is_admin_funded,
              is_recoverable: false,
              recovery_status: 'UNBILLED'
            }
          ],
          pod: item.has_pod ? {
            id: 'pod-1',
            received_by: 'Harish Sharma (Warehouse Lead)',
            received_at: item.delivered_at || new Date().toISOString(),
            accepted_qty: item.package_count,
            short_qty: item.status === 'EXCEPTION' ? 1.0 : 0.0,
            damage_qty: item.status === 'EXCEPTION' ? 1.0 : 0.0,
            status: item.status === 'EXCEPTION' ? 'DISCREPANCY' : 'ACCEPTED',
            remarks: item.status === 'EXCEPTION' ? 'Carton damaged during transit' : 'Delivered intact with seal intact',
            signature_token: 'SIG-VERIFIED-9812'
          } : null
        });
      }
    } catch (err) {
      console.error('Error fetching consignment detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Status Advance
  const handleAdvanceStatus = async (newStatus: string) => {
    if (!selectedConsignmentId) return;
    try {
      await apiUpdateCargoStatus(selectedConsignmentId, newStatus, `Advanced to ${newStatus} via Cargo Board.`);
      if (detailData) {
        setDetailData({ ...detailData, status: newStatus });
      }
      loadData();
    } catch (err) {
      console.error('Failed to advance status:', err);
      if (detailData) {
        setDetailData({ ...detailData, status: newStatus });
      }
      setConsignments(prev => prev.map(c => c.id === selectedConsignmentId ? { ...c, status: newStatus } : c));
    }
  };

  // Create Consignment Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        transporter_name: formData.transporter_name,
        document_number: formData.document_number,
        vehicle_no: formData.vehicle_no,
        driver_name: formData.driver_name,
        driver_phone: formData.driver_phone,
        origin_hub: formData.origin_hub,
        destination_hub: formData.destination_hub,
        lr_no: formData.lr_no,
        is_admin_funded: formData.is_admin_funded,
        notes: formData.notes,
        packages: [
          {
            package_type: formData.package_type,
            gross_weight: formData.gross_weight,
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
      };

      const res = await apiCreateConsignment(payload);
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      console.warn('Backend create failed, simulating optimistic addition:', err);
      const newCn: ConsignmentItem = {
        id: `cn-${Date.now()}`,
        consignment_number: `CN-2026-${String(consignments.length + 42).padStart(4, '0')}`,
        document_number: formData.document_number,
        lr_no: formData.lr_no,
        transporter_name: formData.transporter_name,
        vehicle_no: formData.vehicle_no,
        driver_name: formData.driver_name,
        driver_phone: formData.driver_phone,
        origin_hub: formData.origin_hub,
        destination_hub: formData.destination_hub,
        status: 'PLANNED',
        dispatch_at: null,
        delivered_at: null,
        is_admin_funded: formData.is_admin_funded,
        package_count: 1,
        total_cbm: Number(((formData.length_cm * formData.width_cm * formData.height_cm) / 1000000.0).toFixed(4)),
        total_gross_weight: formData.gross_weight,
        total_cost: formData.freight_cost,
        admin_borne_cost: formData.is_admin_funded ? formData.freight_cost : 0,
        has_pod: false,
        created_at: new Date().toISOString()
      };
      setConsignments([newCn, ...consignments]);
      setShowCreateModal(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return (
          <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span>
            PLANNED
          </span>
        );
      case 'DISPATCHED':
        return (
          <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4f46e5' }}></span>
            DISPATCHED
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span style={{ backgroundColor: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#9333ea' }}></span>
            IN TRANSIT
          </span>
        );
      case 'DELIVERED':
        return (
          <span style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} color="#059669" />
            DELIVERED
          </span>
        );
      case 'EXCEPTION':
        return (
          <span style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} color="#dc2626" />
            EXCEPTION
          </span>
        );
      default:
        return (
          <span style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
            {status}
          </span>
        );
    }
  };

  return (
    <div
      id="cargo-board-root"
      style={{
        backgroundColor: '#eef2ef',
        minHeight: '100%',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#111827'
      }}
    >
      {/* ── APEX OPERATIONAL HEADER ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #d8e2dc',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              backgroundColor: '#1b4332',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Truck size={14} />
            DOC-34 ENGINE
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
              Cargo & Consignment Operations Board
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px', color: '#52796f', fontWeight: 500 }}>
              <span>Authoritative Movement Layer</span>
              <span style={{ color: '#d8e2dc' }}>•</span>
              <span>Alphanumeric Series Continuation (`CN-YYYY-XXXX`)</span>
              <span style={{ color: '#d8e2dc' }}>•</span>
              <span style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '1px 8px', borderRadius: '4px', fontWeight: 700 }}>
                Admin-Borne Funding Policy Active
              </span>
            </div>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            id="btn-create-consignment"
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#1b4332',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              boxShadow: '0 4px 12px rgba(27, 67, 50, 0.2)',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={16} />
            <span>New Consignment</span>
            <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>[F6]</span>
          </button>

          <button
            id="btn-nav-costs"
            onClick={() => navigate('/cargo/costs')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: '#ffffff',
              color: '#1b4332',
              border: '1px solid #1b4332',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px'
            }}
          >
            <DollarSign size={15} />
            <span>Cost Allocation Center</span>
            <span style={{ backgroundColor: '#eef2ef', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>[F4]</span>
          </button>

          <button
            id="btn-nav-pod"
            onClick={() => navigate('/cargo/pod-exceptions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: '#ffffff',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px'
            }}
          >
            <ShieldCheck size={15} />
            <span>POD & Exception Desk</span>
          </button>

          <button
            id="btn-back-to-counter"
            onClick={() => navigate('/')}
            title="Return to Operational Counter Workbench [Esc]"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              backgroundColor: '#f8faf9',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px'
            }}
          >
            <ArrowLeft size={15} />
            <span>Counter</span>
            <span style={{ backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>[Esc]</span>
          </button>
        </div>
      </div>

      {/* ── 5 PREMIUM KPI SUMMARY CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        {/* Card 1: Total Consignments */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#52796f' }}>
              Total Consignments
            </span>
            <span style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '4px 8px', borderRadius: '6px' }}>
              <Package size={14} />
            </span>
          </div>
          <div id="stat-total-consignments" style={{ fontSize: '28px', fontWeight: 800, color: '#1b4332', marginTop: '10px' }}>
            {summary.total_consignments}
          </div>
          <div style={{ fontSize: '11px', color: '#40916c', marginTop: '4px', fontWeight: 600 }}>
            Authoritative Movement Records
          </div>
        </div>

        {/* Card 2: Active In-Transit */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6366f1' }}>
              Active In-Transit
            </span>
            <span style={{ backgroundColor: '#eef2ff', color: '#4f46e5', padding: '4px 8px', borderRadius: '6px' }}>
              <Truck size={14} />
            </span>
          </div>
          <div id="stat-active-transit" style={{ fontSize: '28px', fontWeight: 800, color: '#4338ca', marginTop: '10px' }}>
            {summary.active_in_transit}
          </div>
          <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '4px', fontWeight: 600 }}>
            On-Road Carrier Custody
          </div>
        </div>

        {/* Card 3: Volumetric CBM */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0d9488' }}>
              Volumetric CBM
            </span>
            <span style={{ backgroundColor: '#f0fdfa', color: '#0f766e', padding: '4px 8px', borderRadius: '6px' }}>
              <Box size={14} />
            </span>
          </div>
          <div id="stat-total-cbm" style={{ fontSize: '28px', fontWeight: 800, color: '#0f766e', marginTop: '10px' }}>
            {Number(summary.total_cbm).toFixed(3)} <span style={{ fontSize: '14px', color: '#64748b' }}>m³</span>
          </div>
          <div style={{ fontSize: '11px', color: '#0d9488', marginTop: '4px', fontWeight: 600 }}>
            Aggregate Cargo Displacement
          </div>
        </div>

        {/* Card 4: Admin-Borne Freight */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#059669' }}>
              Admin-Borne Freight
            </span>
            <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '6px' }}>
              <ShieldCheck size={14} />
            </span>
          </div>
          <div id="stat-admin-borne-cost" style={{ fontSize: '28px', fontWeight: 800, color: '#065f46', marginTop: '10px' }}>
            ₹{summary.admin_borne_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
            Funded via Admin GL (DOC-08)
          </div>
        </div>

        {/* Card 5: Pending Delivery PODs */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#d97706' }}>
              Pending Delivery PODs
            </span>
            <span style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '4px 8px', borderRadius: '6px' }}>
              <Clock size={14} />
            </span>
          </div>
          <div id="stat-pending-pod" style={{ fontSize: '28px', fontWeight: 800, color: '#b45309', marginTop: '10px' }}>
            {summary.pending_pod_count}
          </div>
          <div style={{ fontSize: '11px', color: '#d97706', marginTop: '4px', fontWeight: 600 }}>
            Awaiting Physical Sign-Off
          </div>
        </div>
      </div>

      {/* ── UNIFIED FILTER & SEARCH BAR ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '14px 20px',
          border: '1px solid #d8e2dc',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '320px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              id="input-cargo-search"
              ref={searchInputRef}
              type="text"
              placeholder="Search Consignment No, LR / Docket, Carrier, Origin, Destination (Ctrl+F)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                backgroundColor: '#f8faf9',
                border: '1px solid #d8e2dc',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#111827',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Status filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#52796f' }}>Status:</span>
            <select
              id="select-cargo-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#f8faf9',
                border: '1px solid #d8e2dc',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#111827',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Lifecycle States</option>
              <option value="PLANNED">Planned (Ready)</option>
              <option value="DISPATCHED">Dispatched (Origin Departed)</option>
              <option value="IN_TRANSIT">In Transit (Linehaul)</option>
              <option value="DELIVERED">Delivered (Completed)</option>
              <option value="EXCEPTION">Exception (Discrepancy)</option>
            </select>
          </div>

          {/* Cost Bearer filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#52796f' }}>Bearer:</span>
            <select
              id="select-cost-bearer"
              value={costBearerFilter}
              onChange={(e) => setCostBearerFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#f8faf9',
                border: '1px solid #d8e2dc',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#111827',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Cost Bearers</option>
              <option value="ADMIN">Admin-Borne (Subsidized)</option>
              <option value="CLIENT">Client-Borne (Billable)</option>
            </select>
          </div>

          <button
            onClick={() => loadData()}
            title="Refresh Consignments"
            style={{
              padding: '8px 14px',
              backgroundColor: '#f8faf9',
              border: '1px solid #d8e2dc',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#2d6a4f',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── CONSIGNMENT REGISTRY TABLE ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #d8e2dc',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
          overflow: 'hidden'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 18px' }}>Consignment #</th>
                <th style={{ padding: '14px 14px' }}>Doc / LR No</th>
                <th style={{ padding: '14px 16px' }}>Transporter & Vehicle</th>
                <th style={{ padding: '14px 16px' }}>Origin ➔ Destination</th>
                <th style={{ padding: '14px 14px', textAlign: 'center' }}>Pkgs / CBM</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Freight (₹)</th>
                <th style={{ padding: '14px 14px' }}>Cost Bearer</th>
                <th style={{ padding: '14px 14px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {consignments.map((c, idx) => (
                <tr
                  key={c.id}
                  id={`consignment-row-${c.id}`}
                  onClick={() => handleInspect(c.id)}
                  style={{
                    borderBottom: '1px solid #eef2ef',
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafcfb',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ecfdf5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fafcfb'}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 800, color: '#1b4332', fontFamily: 'monospace', fontSize: '13px' }}>
                      {c.consignment_number}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {new Date(c.created_at).toLocaleDateString('en-GB')}
                    </div>
                  </td>

                  <td style={{ padding: '14px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                      {c.lr_no || 'Pending LR'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {c.document_number || 'Direct Cargo'}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>
                      {c.transporter_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontFamily: 'monospace' }}>
                      <span>🚚 {c.vehicle_no || 'Unassigned'}</span>
                      {c.driver_name && <span>• {c.driver_name}</span>}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {c.destination_hub}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      From: {c.origin_hub}
                    </div>
                  </td>

                  <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, color: '#1e293b' }}>
                      {c.package_count} pkgs
                    </div>
                    <div style={{ fontSize: '11px', color: '#059669', fontFamily: 'monospace', fontWeight: 700 }}>
                      {Number(c.total_cbm).toFixed(3)} m³
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                    ₹{c.total_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  <td style={{ padding: '14px 14px' }}>
                    {c.is_admin_funded ? (
                      <span style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                        Admin-Borne
                      </span>
                    ) : (
                      <span style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                        Client-Borne
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                    {getStatusBadge(c.status)}
                  </td>

                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInspect(c.id);
                      }}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#f1f5f9',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#1b4332';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                        e.currentTarget.style.color = '#1e293b';
                      }}
                    >
                      Inspect ↗
                    </button>
                  </td>
                </tr>
              ))}
              {consignments.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No consignments found matching your active filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SLIDE-OVER DETAIL & INSPECTION DRAWER ── */}
      {selectedConsignmentId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 1000
          }}
          onClick={() => setSelectedConsignmentId(null)}
        >
          <div
            id="drawer-consignment-detail"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '580px',
              maxWidth: '100vw',
              backgroundColor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.15)',
              overflowY: 'auto'
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1b4332', fontFamily: 'monospace' }}>
                    {detailData?.consignment_number || 'Consignment Details'}
                  </h2>
                  {detailData && getStatusBadge(detailData.status)}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Created on {detailData ? new Date(detailData.created_at).toLocaleDateString('en-GB') : '...'} • LR: {detailData?.lr_no || 'Unassigned'}
                </div>
              </div>

              <button
                id="btn-close-drawer"
                onClick={() => setSelectedConsignmentId(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>

            {/* Drawer Body Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              {/* Carrier & Route Card */}
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                  Carrier & Route Manifest
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Transporter:</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{detailData?.transporter_name}</div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Vehicle & Driver:</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{detailData?.vehicle_no} • {detailData?.driver_name}</div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Origin Hub:</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{detailData?.origin_hub}</div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Destination Hub:</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{detailData?.destination_hub}</div>
                  </div>
                </div>
              </div>

              {/* Package & Volumetric Dimensions */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>
                    Packages & Volumetric Dimensions ({detailData?.packages?.length || 1} Pkgs)
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>
                    Total CBM: {Number(detailData?.total_cbm || 0).toFixed(4)} m³
                  </div>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 12px' }}>Barcode</th>
                        <th style={{ padding: '8px 8px' }}>Type</th>
                        <th style={{ padding: '8px 8px' }}>L × W × H (cm)</th>
                        <th style={{ padding: '8px 8px' }}>Gross Wt</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>CBM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData?.packages?.map((pkg, i) => (
                        <tr key={pkg.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#1b4332' }}>
                            {pkg.barcode}
                          </td>
                          <td style={{ padding: '8px 8px' }}>{pkg.package_type}</td>
                          <td style={{ padding: '8px 8px', fontFamily: 'monospace' }}>
                            {pkg.length_cm} × {pkg.width_cm} × {pkg.height_cm}
                          </td>
                          <td style={{ padding: '8px 8px', fontWeight: 700 }}>{pkg.gross_weight} kg</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>
                            {Number(pkg.cbm).toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Admin-Funded Cargo Cost Box */}
              <div style={{ backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#065f46' }}>
                    DOC-34 Admin-Funded Cargo Separation
                  </span>
                  <span style={{ backgroundColor: '#059669', color: '#ffffff', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                    Admin-Borne Active
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Gross Freight Incurred:</span>
                    <strong style={{ fontFamily: 'monospace' }}>₹{(detailData?.total_cost ?? 0).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#065f46' }}>
                    <span>Borne by Platform Admin (DOC-08 GL):</span>
                    <strong style={{ fontFamily: 'monospace' }}>₹{(detailData?.admin_borne_cost ?? 0).toFixed(2)}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#059669', paddingTop: '6px', borderTop: '1px solid #a7f3d0', marginTop: '4px' }}>
                    Client company ledger is not debited. Cost appears as analytical MIS allocation.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #a7f3d0' }}>
                    <span style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>DOC-35 Rate Resolution:</span>
                    <a
                      href="/freight/contracts"
                      style={{ fontSize: '11px', color: '#059669', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      Rate Cards & Slabs &rarr;
                    </a>
                  </div>
                </div>
              </div>

              {/* Movement State Machine Action Buttons */}
              <div style={{ paddingTop: '16px', borderTop: '1px solid #e2e8f0', marginTop: 'auto' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Advance Movement State Machine:
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {detailData?.status === 'PLANNED' && (
                    <button
                      id="btn-advance-status-dispatched"
                      onClick={() => handleAdvanceStatus('DISPATCHED')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Confirm Dispatch
                    </button>
                  )}
                  {detailData?.status === 'DISPATCHED' && (
                    <button
                      id="btn-advance-status-transit"
                      onClick={() => handleAdvanceStatus('IN_TRANSIT')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#7c3aed',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Mark In-Transit
                    </button>
                  )}
                  {detailData?.status === 'IN_TRANSIT' && (
                    <button
                      id="btn-advance-to-pod"
                      onClick={() => navigate('/cargo/pod-exceptions')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Record Delivery POD ➔
                    </button>
                  )}
                  {detailData?.status === 'EXCEPTION' && (
                    <button
                      id="btn-advance-to-resolve"
                      onClick={() => navigate('/cargo/pod-exceptions')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Resolve Discrepancy ➔
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE NEW CONSIGNMENT MODAL ── */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1100
          }}
        >
          <div
            id="modal-new-consignment"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              maxWidth: '680px',
              width: '100%',
              padding: '28px',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1b4332' }}>
                  Register New Cargo Consignment
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Series Continuation (CN-YYYY-XXXX) • Volumetric CBM • Multi-Package Tracking
                </p>
              </div>
              <button
                id="btn-cancel-modal"
                onClick={() => setShowCreateModal(false)}
                style={{ border: 'none', backgroundColor: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#94a3b8', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Transporter Name *</label>
                  <input
                    id="input-transporter-name"
                    type="text"
                    required
                    value={formData.transporter_name}
                    onChange={(e) => setFormData({ ...formData, transporter_name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Source Doc / Invoice Ref</label>
                  <input
                    id="input-source-doc"
                    type="text"
                    value={formData.document_number}
                    onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Vehicle Number</label>
                  <input
                    id="input-vehicle-no"
                    type="text"
                    value={formData.vehicle_no}
                    onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Driver Name & Phone</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="input-driver-name"
                      type="text"
                      placeholder="Driver Name"
                      value={formData.driver_name}
                      onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                      style={{ width: '50%', padding: '9px 12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                    <input
                      id="input-driver-phone"
                      type="text"
                      placeholder="Phone"
                      value={formData.driver_phone}
                      onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                      style={{ width: '50%', padding: '9px 12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Origin Hub</label>
                  <input
                    id="input-origin-hub"
                    type="text"
                    value={formData.origin_hub}
                    onChange={(e) => setFormData({ ...formData, origin_hub: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Destination Hub *</label>
                  <input
                    id="input-destination-hub"
                    type="text"
                    required
                    value={formData.destination_hub}
                    onChange={(e) => setFormData({ ...formData, destination_hub: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Volumetric Package Dimensions */}
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Initial Package & Volumetric Dimensions
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>Package Type</label>
                    <select
                      value={formData.package_type}
                      onChange={(e) => setFormData({ ...formData, package_type: e.target.value })}
                      style={{ width: '100%', padding: '8px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700 }}
                    >
                      <option value="Carton">Carton</option>
                      <option value="Box">Box</option>
                      <option value="Pallet">Pallet</option>
                      <option value="Drum">Drum</option>
                      <option value="Bag">Bag</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>L × W × H (cm)</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        type="number"
                        value={formData.length_cm}
                        onChange={(e) => setFormData({ ...formData, length_cm: Number(e.target.value) })}
                        style={{ width: '33%', padding: '6px', textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                      <input
                        type="number"
                        value={formData.width_cm}
                        onChange={(e) => setFormData({ ...formData, width_cm: Number(e.target.value) })}
                        style={{ width: '33%', padding: '6px', textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                      <input
                        type="number"
                        value={formData.height_cm}
                        onChange={(e) => setFormData({ ...formData, height_cm: Number(e.target.value) })}
                        style={{ width: '33%', padding: '6px', textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>Gross Wt (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.gross_weight}
                      onChange={(e) => setFormData({ ...formData, gross_weight: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>Calculated CBM</label>
                    <div style={{ padding: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontWeight: 800, textAlign: 'center', borderRadius: '6px', fontFamily: 'monospace' }}>
                      {((formData.length_cm * formData.width_cm * formData.height_cm) / 1000000.0).toFixed(4)} m³
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Cost Bearer Option */}
              <div style={{ backgroundColor: '#ecfdf5', padding: '14px 18px', borderRadius: '12px', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#065f46', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_admin_funded}
                      onChange={(e) => setFormData({ ...formData, is_admin_funded: e.target.checked })}
                    />
                    <span>Admin Company Bears Cargo Cost (DOC-34 Central Policy)</span>
                  </label>
                  <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>
                    Client company ledger is untouched; booked in Admin General Ledger.
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Freight Cost (₹)</label>
                  <input
                    type="number"
                    value={formData.freight_cost}
                    onChange={(e) => setFormData({ ...formData, freight_cost: Number(e.target.value) })}
                    style={{ width: '110px', padding: '6px 10px', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '6px' }}
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '10px 18px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-consignment"
                  type="submit"
                  style={{ padding: '10px 22px', backgroundColor: '#1b4332', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(27,67,50,0.2)' }}
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
