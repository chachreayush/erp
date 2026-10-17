import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Printer,
  Truck,
  FileText,
  Check,
  X,
  Search,
  RefreshCw,
  QrCode,
  Calendar,
  MapPin,
  ExternalLink,
  Layers,
  ChevronRight,
  Clock
} from 'lucide-react';
import { useReturnNavigation } from '../hooks/useReturnNavigation';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../lib/api';

interface QualifyingInvoice {
  id: string;
  invoice_number: string;
  date: string | null;
  customer_name: string;
  customer_gstin: string;
  place_of_supply: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  has_irn: boolean;
  irn: string | null;
  ack_no: string | null;
  ack_date: string | null;
  has_eway: boolean;
  eway_bill_no: string | null;
  eway_valid_till: string | null;
  vehicle_no: string | null;
  transporter_name: string | null;
  distance_km: number;
  compliance_status: 'COMPLIANT' | 'PARTIAL' | 'PENDING';
}

interface ComplianceSummary {
  status: string;
  total_qualifying_count: number;
  total_qualifying_val: number;
  pending_eway_count: number;
  pending_eway_val: number;
  generated_irn_count: number;
  generated_irn_val: number;
  compliance_rate: number;
  transporters: Array<{
    id: string;
    name: string;
    gstin: string;
    default_km: number;
  }>;
}

interface EwaySlipData {
  status: string;
  slip_title: string;
  eway_bill_no: string;
  eway_bill_date: string;
  generated_by: string;
  valid_from: string;
  valid_until: string;
  mode: string;
  approx_distance: string;
  irn: string;
  ack_no: string;
  signed_qr_data: string;
  part_a: {
    supplier_gstin: string;
    supplier_name: string;
    dispatch_address: string;
    recipient_gstin: string;
    recipient_name: string;
    delivery_address: string;
    doc_no: string;
    doc_date: string;
    value_of_goods: number;
    hsn_code: string;
    reason_for_transport: string;
  };
  part_b: {
    mode: string;
    vehicle_no: string;
    from_place: string;
    entered_date: string;
    transporter_id: string;
    transporter_name: string;
  };
}

export default function ComplianceWorkbench() {
  useReturnNavigation();
  const navigate = useNavigate();

  // ── States ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'qualifying' | 'register' | 'nic'>('qualifying');
  const [summary, setSummary] = useState<ComplianceSummary>({
    status: 'success',
    total_qualifying_count: 0,
    total_qualifying_val: 0,
    pending_eway_count: 0,
    pending_eway_val: 0,
    generated_irn_count: 0,
    generated_irn_val: 0,
    compliance_rate: 0,
    transporters: []
  });

  const [invoices, setInvoices] = useState<QualifyingInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_EWAY' | 'PENDING_IRN' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // ── Transport Modal State ──────────────────────────────────────────────
  const [isTransportModalOpen, setIsTransportModalOpen] = useState<boolean>(false);
  const [selectedTransporterId, setSelectedTransporterId] = useState<string>('TR-DEL-01');
  const [transporterName, setTransporterName] = useState<string>('Delhi-NCR Express Cargo');
  const [transporterGstin, setTransporterGstin] = useState<string>('07AABCE1234F1Z1');
  const [vehicleNo, setVehicleNo] = useState<string>('DL-01-AB-1234');
  const [vehicleType, setVehicleType] = useState<string>('REGULAR');
  const [distanceKm, setDistanceKm] = useState<number>(180);
  const [transportMode, setTransportMode] = useState<string>('ROAD');
  const [generateIrnToggle, setGenerateIrnToggle] = useState<boolean>(true);
  const [generateEwayToggle, setGenerateEwayToggle] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // ── Slip Preview Modal State ───────────────────────────────────────────
  const [isSlipModalOpen, setIsSlipModalOpen] = useState<boolean>(false);
  const [slipData, setSlipData] = useState<EwaySlipData | null>(null);
  const [loadingSlip, setLoadingSlip] = useState<boolean>(false);

  const storeToken = useAuthStore(state => state.token);
  const getToken = () => storeToken || localStorage.getItem('token') || '';

  // ── Fetch Data ─────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Summary
      const sumRes = await apiClient.get('/api/compliance/summary');
      if (sumRes.data) {
        setSummary(sumRes.data);
      }

      // 2. Fetch Invoices
      const invRes = await apiClient.get('/api/compliance/invoices', {
        params: {
          status: statusFilter,
          search: searchQuery || undefined
        }
      });
      if (Array.isArray(invRes.data)) {
        setInvoices(invRes.data);
      }
    } catch (err) {
      console.error('Error fetching compliance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, searchQuery]);

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('qualifying');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('register');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('nic');
      } else if (e.key === 'F5') {
        e.preventDefault();
        fetchData();
      } else if (e.key === 'F7') {
        e.preventDefault();
        handleOpenTransportModal();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleExportNicJson();
      } else if (e.key === 'Escape') {
        if (isSlipModalOpen) {
          setIsSlipModalOpen(false);
        } else if (isTransportModalOpen) {
          setIsTransportModalOpen(false);
        } else {
          navigate('/gst');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSlipModalOpen, isTransportModalOpen, selectedIds, invoices]);

  // ── Selection Logic ────────────────────────────────────────────────────
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === invoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invoices.map(i => i.id));
    }
  };

  // ── Open Transport Modal ───────────────────────────────────────────────
  const handleOpenTransportModal = (singleId?: string) => {
    const idsToProcess = singleId ? [singleId] : selectedIds;
    if (idsToProcess.length === 0) {
      alert('Please select at least one qualifying consignment to assign transport.');
      return;
    }
    if (singleId && !selectedIds.includes(singleId)) {
      setSelectedIds([singleId]);
    }
    setIsTransportModalOpen(true);
  };

  // ── Handle Transporter Pre-selection ───────────────────────────────────
  const handleSelectTransporterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTransporterId(val);
    const found = summary.transporters.find(t => t.id === val);
    if (found) {
      setTransporterName(found.name);
      setTransporterGstin(found.gstin);
      setDistanceKm(found.default_km);
    }
  };

  // ── Confirm Generation of E-Way Bill & IRN ─────────────────────────────
  const handleConfirmGeneration = async () => {
    const idsToGenerate = selectedIds;
    if (idsToGenerate.length === 0) return;

    setIsGenerating(true);
    setStatusMsg(null);
    try {
      const res = await apiClient.post('/api/compliance/generate-eway-irn', {
        invoice_ids: idsToGenerate,
        transporter_id: selectedTransporterId,
        transporter_name: transporterName,
        transporter_gstin: transporterGstin,
        vehicle_no: vehicleNo,
        vehicle_type: vehicleType,
        distance_km: Number(distanceKm),
        transport_mode: transportMode,
        generate_irn: generateIrnToggle,
        generate_eway: generateEwayToggle
      });

      const data = res.data;
      setIsTransportModalOpen(false);
      setStatusMsg({
        text: `✓ Success! Cryptographic IRN, digital Ack No, and 12-digit E-Way Bill generated for ${data.results?.length || idsToGenerate.length} consignment(s).`,
        type: 'success'
      });
      setSelectedIds([]);
      await fetchData();
    } catch (err: any) {
      setStatusMsg({
        text: `Error generating compliance documents: ${err.message}`,
        type: 'error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Preview & Print CBIC E-Way Bill Slip ───────────────────────────────
  const handlePreviewSlip = async (invoiceId: string) => {
    setLoadingSlip(true);
    setIsSlipModalOpen(true);
    try {
      const res = await apiClient.get(`/api/compliance/eway-slip/${invoiceId}`);
      if (res.data) {
        setSlipData(res.data);
      } else {
        alert('Could not fetch E-Way Bill slip');
        setIsSlipModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      setIsSlipModalOpen(false);
    } finally {
      setLoadingSlip(false);
    }
  };

  // ── Export NIC Bulk JSON ───────────────────────────────────────────────
  const handleExportNicJson = async () => {
    const idsToExport = selectedIds.length > 0 ? selectedIds : invoices.map(i => i.id);
    if (idsToExport.length === 0) {
      alert('No qualifying invoices available for NIC JSON export.');
      return;
    }

    try {
      const res = await apiClient.post('/api/compliance/export-nic-json', {
        invoice_ids: idsToExport
      });

      if (res.data) {
        const data = res.data;
        const jsonBlob = new Blob([JSON.stringify(data.payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(jsonBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `NIC_IRP_Bulk_Schema1.1_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setStatusMsg({
          text: `✓ Official NIC Bulk Upload Schema 1.1 JSON downloaded for ${data.invoice_count} invoice(s). Ready for direct upload to GST IRP / NIC portal.`,
          type: 'success'
        });
      }
    } catch (err: any) {
      alert(`Error exporting NIC JSON: ${err.message}`);
    }
  };

  // ── Calculated selected totals ─────────────────────────────────────────
  const selectedTotalVal = useMemo(() => {
    return invoices
      .filter(i => selectedIds.includes(i.id))
      .reduce((sum, cur) => sum + cur.grand_total, 0);
  }, [invoices, selectedIds]);

  return (
    <div style={{ backgroundColor: '#eef2ef', minHeight: '100vh', padding: '24px', color: '#111827', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* ── Apex Operational Header ──────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              id="btn-back-gst"
              onClick={() => navigate('/gst')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#2d6a4f',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '6px'
              }}
              title="Return to GST Reports [ESC]"
            >
              <ArrowLeft size={20} />
            </button>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#2d6a4f' }}>
              STATUTORY COMPLIANCE & LOGISTICS DESK
            </span>
            <span style={{ backgroundColor: '#d8e2dc', color: '#1b4332', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
              DOC-42
            </span>
            <span style={{ backgroundColor: '#2d6a4f', color: '#ffffff', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
              NIC & CBIC COMPLIANT
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1b4332', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={28} color="#1b4332" />
            Statutory GST E-Way Bill & E-Invoice Desk (DOC-42)
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#52796f' }}>
            NIC Schema 1.1 Bulk JSON Generator, Cryptographic IRN Registry & CBIC Transport Part A/B Delivery Slips
          </p>
        </div>

        {/* Global Operational Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            id="btn-refresh-compliance"
            onClick={fetchData}
            style={{
              backgroundColor: '#ffffff',
              color: '#1b4332',
              border: '1px solid #d8e2dc',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={15} /> [F5] Refresh
          </button>
          
          <button
            id="btn-open-transport-modal"
            onClick={() => handleOpenTransportModal()}
            style={{
              backgroundColor: '#1b4332',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(27,67,50,0.2)'
            }}
          >
            <Truck size={15} /> [F7] Assign Transport & Generate ({selectedIds.length})
          </button>

          <button
            id="btn-export-nic-json"
            onClick={handleExportNicJson}
            style={{
              backgroundColor: '#2d6a4f',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={15} /> [F8] Export NIC Bulk JSON
          </button>
        </div>
      </div>

      {/* ── Status Feedback Banner ────────────────────────────────────────── */}
      {statusMsg && (
        <div
          id="compliance-status-banner"
          style={{
            marginBottom: '16px',
            padding: '12px 18px',
            backgroundColor: statusMsg.type === 'success' ? '#e8f5e9' : (statusMsg.type === 'error' ? '#ffebee' : '#e0f2fe'),
            border: `1px solid ${statusMsg.type === 'success' ? '#81c784' : (statusMsg.type === 'error' ? '#ef9a9a' : '#90cdf4')}`,
            borderRadius: '8px',
            color: statusMsg.type === 'success' ? '#1b5e20' : (statusMsg.type === 'error' ? '#c62828' : '#0369a1'),
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── 4 Live Telemetry Scorecards ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        
        {/* Card 1: Qualifying Invoices */}
        <div
          id="card-qualifying-invoices"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
              Qualifying Consignments
            </span>
            <span style={{ backgroundColor: '#eef2ef', color: '#1b4332', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
              &gt; ₹50,000 / B2B
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1b4332' }}>
            {summary.total_qualifying_count}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Gross Value: <strong style={{ color: '#111827' }}>₹{summary.total_qualifying_val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
          </div>
        </div>

        {/* Card 2: Pending E-Way Bills */}
        <div
          id="card-pending-eway"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
              Pending E-Way Bills
            </span>
            <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
              Part A & B Slips
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#b45309' }}>
            {summary.pending_eway_count}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Pending Value: <strong style={{ color: '#b45309' }}>₹{summary.pending_eway_val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
          </div>
        </div>

        {/* Card 3: Generated IRNs */}
        <div
          id="card-generated-irn"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#2d6a4f', textTransform: 'uppercase' }}>
              Generated IRNs & QR
            </span>
            <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
              IRP Authenticated
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#2d6a4f' }}>
            {summary.generated_irn_count}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Compliant Value: <strong style={{ color: '#2d6a4f' }}>₹{summary.generated_irn_val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
          </div>
        </div>

        {/* Card 4: Compliance Rate */}
        <div
          id="card-compliance-rate"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1b4332', textTransform: 'uppercase' }}>
              Statutory Compliance
            </span>
            <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
              Live KPI
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1b4332' }}>
            {summary.compliance_rate}%
          </div>
          <div style={{ width: '100%', backgroundColor: '#e5e7eb', height: '6px', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${summary.compliance_rate}%`,
                backgroundColor: summary.compliance_rate > 80 ? '#10b981' : (summary.compliance_rate > 40 ? '#f59e0b' : '#ef4444'),
                height: '100%'
              }}
            />
          </div>
        </div>
      </div>

      {/* ── 3 High-Contrast Operational Tabs ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          id="tab-qualifying-invoices"
          onClick={() => setActiveTab('qualifying')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            backgroundColor: activeTab === 'qualifying' ? '#1b4332' : '#ffffff',
            color: activeTab === 'qualifying' ? '#ffffff' : '#374151',
            boxShadow: activeTab === 'qualifying' ? '0 2px 6px rgba(27,67,50,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Layers size={16} /> [F2] Qualifying Invoices Desk ({invoices.length})
        </button>

        <button
          id="tab-eway-register"
          onClick={() => setActiveTab('register')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            backgroundColor: activeTab === 'register' ? '#1b4332' : '#ffffff',
            color: activeTab === 'register' ? '#ffffff' : '#374151',
            boxShadow: activeTab === 'register' ? '0 2px 6px rgba(27,67,50,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FileText size={16} /> [F3] E-Way & IRN Register ({invoices.filter(i => i.has_eway || i.has_irn).length})
        </button>

        <button
          id="tab-nic-center"
          onClick={() => setActiveTab('nic')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            backgroundColor: activeTab === 'nic' ? '#1b4332' : '#ffffff',
            color: activeTab === 'nic' ? '#ffffff' : '#374151',
            boxShadow: activeTab === 'nic' ? '0 2px 6px rgba(27,67,50,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <QrCode size={16} /> [F4] NIC JSON Export Center
        </button>
      </div>

      {/* ── TAB 1: Qualifying Invoices Desk ──────────────────────────────── */}
      {activeTab === 'qualifying' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #d8e2dc', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          
          {/* Table Filters & Search Bar */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #d8e2dc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8faf9', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                id="btn-filter-all"
                onClick={() => setStatusFilter('ALL')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: statusFilter === 'ALL' ? '1px solid #1b4332' : '1px solid #e5e7eb',
                  backgroundColor: statusFilter === 'ALL' ? '#1b4332' : '#ffffff',
                  color: statusFilter === 'ALL' ? '#ffffff' : '#4b5563',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                All Consignments
              </button>
              <button
                id="btn-filter-pending-eway"
                onClick={() => setStatusFilter('PENDING_EWAY')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: statusFilter === 'PENDING_EWAY' ? '1px solid #b45309' : '1px solid #e5e7eb',
                  backgroundColor: statusFilter === 'PENDING_EWAY' ? '#fef3c7' : '#ffffff',
                  color: statusFilter === 'PENDING_EWAY' ? '#92400e' : '#4b5563',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ⚡ Pending E-Way
              </button>
              <button
                id="btn-filter-pending-irn"
                onClick={() => setStatusFilter('PENDING_IRN')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: statusFilter === 'PENDING_IRN' ? '1px solid #4338ca' : '1px solid #e5e7eb',
                  backgroundColor: statusFilter === 'PENDING_IRN' ? '#e0e7ff' : '#ffffff',
                  color: statusFilter === 'PENDING_IRN' ? '#3730a3' : '#4b5563',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🔒 Pending IRN
              </button>
              <button
                id="btn-filter-compliant"
                onClick={() => setStatusFilter('COMPLETED')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: statusFilter === 'COMPLETED' ? '1px solid #166534' : '1px solid #e5e7eb',
                  backgroundColor: statusFilter === 'COMPLETED' ? '#dcfce7' : '#ffffff',
                  color: statusFilter === 'COMPLETED' ? '#14532d' : '#4b5563',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ✓ Fully Compliant
              </button>
            </div>

            {/* Search Input & Selection info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  id="search-compliance-input"
                  type="text"
                  placeholder="Search Doc No or Consignee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              {selectedIds.length > 0 && (
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1b4332', backgroundColor: '#e8f5e9', padding: '6px 12px', borderRadius: '6px' }}>
                  Selected: {selectedIds.length} (₹{selectedTotalVal.toLocaleString('en-IN')})
                </div>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div style={{ overflowX: 'auto' }}>
            <table id="tbl-qualifying-invoices" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', color: '#52796f', borderBottom: '1px solid #d8e2dc', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px', width: '40px', textAlign: 'center' }}>
                    <input
                      id="btn-select-all-compliance"
                      type="checkbox"
                      checked={selectedIds.length === invoices.length && invoices.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ padding: '12px 14px' }}>Document No</th>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                  <th style={{ padding: '12px 14px' }}>Consignee / Party</th>
                  <th style={{ padding: '12px 14px' }}>Destination</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Amount</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>E-Way Bill</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>IRN & QR</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                      Loading qualifying consignments...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                      <ShieldCheck size={40} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                      Zero consignments match filter. All invoices meet statutory criteria!
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: selectedIds.includes(inv.id) ? '#f0fdf4' : 'transparent',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          id={`checkbox-inv-${inv.id}`}
                          type="checkbox"
                          checked={selectedIds.includes(inv.id)}
                          onChange={() => handleToggleSelect(inv.id)}
                        />
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1b4332' }}>
                        <div id={`cell-inv-no-${inv.id}`}>{inv.invoice_number}</div>
                        <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 400 }}>GSTIN: {inv.customer_gstin}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#374151' }}>
                        {inv.date ? inv.date.split('T')[0] : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#111827', fontWeight: 600 }}>
                        {inv.customer_name}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#4b5563' }}>
                        {inv.place_of_supply}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#111827' }}>
                        ₹{Number(inv.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {inv.has_eway ? (
                          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            {inv.eway_bill_no}
                          </span>
                        ) : (
                          <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            Pending Part B
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {inv.has_irn ? (
                          <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            IRN Verified
                          </span>
                        ) : (
                          <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            Awaiting IRN
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            id={`btn-action-generate-${inv.id}`}
                            onClick={() => handleOpenTransportModal(inv.id)}
                            style={{
                              backgroundColor: '#1b4332',
                              color: '#ffffff',
                              border: 'none',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                            title="Assign Transport & Generate Compliance Documents"
                          >
                            Generate
                          </button>
                          {inv.has_eway && (
                            <button
                              id={`btn-view-slip-${inv.id}`}
                              onClick={() => handlePreviewSlip(inv.id)}
                              style={{
                                backgroundColor: '#f3f4f6',
                                color: '#1b4332',
                                border: '1px solid #d8e2dc',
                                padding: '5px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Preview CBIC Part A/B Slip"
                            >
                              <Printer size={13} /> Slip
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: Generated E-Way & IRN Register ───────────────────────── */}
      {activeTab === 'register' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #d8e2dc', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #d8e2dc', backgroundColor: '#f8faf9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1b4332' }}>
              Statutory E-Way Bill & IRN Registry Logs
            </span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              Click any slip button to inspect CBIC Part A & Part B Delivery Challans
            </span>
          </div>

          <table id="tbl-compliance-history" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', color: '#52796f', borderBottom: '1px solid #d8e2dc', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 14px' }}>Doc No</th>
                <th style={{ padding: '12px 14px' }}>Consignee</th>
                <th style={{ padding: '12px 14px' }}>Cryptographic IRN Hash</th>
                <th style={{ padding: '12px 14px' }}>Ack No & Date</th>
                <th style={{ padding: '12px 14px' }}>E-Way Bill No</th>
                <th style={{ padding: '12px 14px' }}>Valid Till</th>
                <th style={{ padding: '12px 14px' }}>Vehicle No</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>CBIC Slip</th>
              </tr>
            </thead>
            <tbody>
              {invoices.filter(i => i.has_eway || i.has_irn).length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                    <ShieldCheck size={36} color="#9ca3af" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    No generated E-Way Bills or IRNs found in register. Switch to [F2] and generate compliance documents.
                  </td>
                </tr>
              ) : (
                invoices
                  .filter(i => i.has_eway || i.has_irn)
                  .map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1b4332' }}>
                        {inv.invoice_number}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#111827' }}>
                        {inv.customer_name}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '11px', color: '#4338ca' }}>
                        {inv.irn ? `${inv.irn.slice(0, 16)}...${inv.irn.slice(-8)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#374151' }}>
                        <div>{inv.ack_no || '—'}</div>
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>{inv.ack_date || ''}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#15803d' }}>
                        {inv.eway_bill_no || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6b7280' }}>
                        {inv.eway_valid_till || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827' }}>
                        {inv.vehicle_no || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          id={`btn-print-eway-slip-${inv.id}`}
                          onClick={() => handlePreviewSlip(inv.id)}
                          style={{
                            backgroundColor: '#1b4332',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Printer size={13} /> Print Slip
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB 3: NIC JSON Export Center ───────────────────────────────── */}
      {activeTab === 'nic' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #d8e2dc', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1b4332', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={22} color="#1b4332" />
                NIC Offline Bulk Schema 1.1 JSON Generator
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#52796f' }}>
                Generates strict Government-compliant JSON payload adhering to National Informatics Centre (NIC) e-Invoice System version 1.1 specifications.
              </p>
            </div>
            <button
              id="btn-download-nic-json"
              onClick={handleExportNicJson}
              style={{
                backgroundColor: '#1b4332',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Download size={16} /> Download NIC Bulk Upload JSON
            </button>
          </div>

          <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', color: '#f8fafc', fontFamily: 'monospace', fontSize: '12px', overflowX: 'auto', maxHeight: '350px' }}>
            <pre style={{ margin: 0 }}>
{`// NIC E-Invoice & E-Way Bill Bulk Upload Payload (v1.1)
[
  {
    "Version": "1.1",
    "TranDtls": { "TaxSch": "GST", "SupTyp": "B2B", "RegRev": "N", "IgstOnIntra": "N" },
    "DocDtls": { "Typ": "INV", "No": "${invoices[0]?.invoice_number || 'INV-2026-0001'}", "Dt": "18/10/2026" },
    "SellerDtls": { "Gstin": "07AABCS1429B1Z1", "LglNm": "Standard Pharma Pvt Ltd", "Stcd": "07" },
    "BuyerDtls": { "Gstin": "${invoices[0]?.customer_gstin || '07BBBBB1234B1Z5'}", "LglNm": "${invoices[0]?.customer_name || 'Consignee Buyer'}", "Pos": "07" },
    "ItemList": [
      { "SlNo": "1", "PrdDesc": "Pharmaceutical Formulations (DOC-42 Consignment)", "HsnCd": "30049099", "Qty": 100, "Unit": "BOX", "GstRt": 18.0 }
    ],
    "ValDtls": { "AssVal": ${invoices[0]?.subtotal || 100000}, "TotInvVal": ${invoices[0]?.grand_total || 118000} },
    "EwbDtls": { "TransId": "TR-DEL-01", "TransName": "Delhi-NCR Express Cargo", "Distance": 180, "VehNo": "DL-01-AB-1234", "VehType": "R" }
  }
]`}
            </pre>
          </div>

          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ backgroundColor: '#f8faf9', padding: '14px', borderRadius: '8px', border: '1px solid #d8e2dc' }}>
              <div style={{ fontWeight: 700, color: '#1b4332', fontSize: '13px', marginBottom: '4px' }}>1. Batch Export</div>
              <div style={{ fontSize: '12px', color: '#52796f' }}>Select multiple qualifying invoices in [F2] and click Export NIC Bulk JSON to create a verified upload payload.</div>
            </div>
            <div style={{ backgroundColor: '#f8faf9', padding: '14px', borderRadius: '8px', border: '1px solid #d8e2dc' }}>
              <div style={{ fontWeight: 700, color: '#1b4332', fontSize: '13px', marginBottom: '4px' }}>2. IRP Portal Upload</div>
              <div style={{ fontSize: '12px', color: '#52796f' }}>Log in to einvoice1.gst.gov.in and upload the JSON under Bulk Generation. Download signed response.</div>
            </div>
            <div style={{ backgroundColor: '#f8faf9', padding: '14px', borderRadius: '8px', border: '1px solid #d8e2dc' }}>
              <div style={{ fontWeight: 700, color: '#1b4332', fontSize: '13px', marginBottom: '4px' }}>3. Instant Offline Validation</div>
              <div style={{ fontSize: '12px', color: '#52796f' }}>Import the response file to automatically attach 64-char IRN, 12-digit E-Way Bill numbers, and signed QR codes.</div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: Transporter & Vehicle Assignment (#modal-transport-assignment) ── */}
      {isTransportModalOpen && (
        <div
          id="modal-transport-assignment"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(3px)'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '560px',
              maxWidth: '90vw',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              border: '1px solid #d8e2dc',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ backgroundColor: '#1b4332', padding: '18px 24px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Truck size={22} color="#ffffff" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  Assign Transporter & Dispatch Details
                </h3>
              </div>
              <button
                id="btn-cancel-transport-modal"
                onClick={() => setIsTransportModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '12px', color: '#166534' }}>
                Generating statutory compliance documents for <strong>{selectedIds.length}</strong> consignment(s) with total valuation of <strong>₹{selectedTotalVal.toLocaleString('en-IN')}</strong>.
              </div>

              {/* Transporter Preset Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Select Registered Transporter
                </label>
                <select
                  id="select-transporter"
                  value={selectedTransporterId}
                  onChange={handleSelectTransporterChange}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    color: '#111827',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {summary.transporters.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.id}) — GSTIN: {t.gstin}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid: Vehicle No & Distance */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                    Vehicle Number (Part B)
                  </label>
                  <input
                    id="input-vehicle-no"
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                    placeholder="e.g. DL-01-AB-1234"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#111827'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                    Distance (in KM)
                  </label>
                  <input
                    id="input-transport-distance"
                    type="number"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    min={1}
                    max={5000}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      color: '#111827'
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                    Calculated Validity: <strong>{Math.max(1, Math.ceil(distanceKm / 200))} Day(s)</strong> (CBIC 200 km rule)
                  </div>
                </div>
              </div>

              {/* Grid: Mode & Vehicle Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                    Transport Mode
                  </label>
                  <select
                    id="select-transport-mode"
                    value={transportMode}
                    onChange={(e) => setTransportMode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px'
                    }}
                  >
                    <option value="ROAD">1 - Road (Truck / LCV / Container)</option>
                    <option value="RAIL">2 - Rail (Indian Railways Express Cargo)</option>
                    <option value="AIR">3 - Air (Domestic / International Air Cargo)</option>
                    <option value="SHIP">4 - Ship (Coastal / River Freight)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                    Vehicle Type
                  </label>
                  <select
                    id="select-vehicle-type"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px'
                    }}
                  >
                    <option value="REGULAR">Regular Cargo Carrier</option>
                    <option value="ODC">Over Dimensional Cargo (ODC)</option>
                  </select>
                </div>
              </div>

              {/* Compliance Document Generation Toggles */}
              <div style={{ backgroundColor: '#f9fafb', padding: '14px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>
                  Statutory Output Toggles
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      id="toggle-gen-eway"
                      type="checkbox"
                      checked={generateEwayToggle}
                      onChange={(e) => setGenerateEwayToggle(e.target.checked)}
                    />
                    <span>Generate 12-digit E-Way Bill (Part A & B)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      id="toggle-gen-irn"
                      type="checkbox"
                      checked={generateIrnToggle}
                      onChange={(e) => setGenerateIrnToggle(e.target.checked)}
                    />
                    <span>Generate Cryptographic IRN & Signed QR</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => setIsTransportModalOpen(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel [ESC]
                </button>
                <button
                  id="btn-confirm-generate-compliance"
                  onClick={handleConfirmGeneration}
                  disabled={isGenerating}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1b4332',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(27,67,50,0.2)'
                  }}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Confirm & Generate Compliance Slips
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CBIC Official E-Way Bill Part A/B Slip (#modal-eway-slip-preview) ── */}
      {isSlipModalOpen && (
        <div
          id="modal-eway-slip-preview"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            backdropFilter: 'blur(4px)',
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '800px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
          >
            {/* Slip Modal Bar */}
            <div style={{ backgroundColor: '#1b4332', padding: '14px 20px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={18} />
                <span style={{ fontWeight: 800, fontSize: '14px' }}>
                  Government of India — CBIC E-Way Bill (Part A & Part B)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  id="btn-print-slip-dialog"
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: '#2d6a4f',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Printer size={14} /> Print Slip
                </button>
                <button
                  id="btn-close-slip-modal"
                  onClick={() => setIsSlipModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Slip Printable Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#fcfdfc' }}>
              {loadingSlip || !slipData ? (
                <div style={{ padding: '50px', textAlign: 'center', color: '#6b7280' }}>
                  <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  Fetching official CBIC Part A/B Delivery Slip...
                </div>
              ) : (
                <div style={{ border: '2px solid #111827', padding: '20px', backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
                  
                  {/* CBIC Header */}
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #111827', paddingBottom: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>GOVERNMENT OF INDIA</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', margin: '2px 0' }}>
                      E-WAY BILL
                    </div>
                    <div style={{ fontSize: '11px', color: '#4b5563' }}>
                      (Central Board of Indirect Taxes and Customs - NIC National Portal)
                    </div>
                  </div>

                  {/* E-Way Bill Metadata Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '14px', marginBottom: '14px' }}>
                    <div>
                      <table style={{ width: '100%', fontSize: '12px' }}>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: 700, width: '140px', padding: '3px 0' }}>E-Way Bill No:</td>
                            <td style={{ fontWeight: 900, color: '#1b4332', fontSize: '14px' }}>{slipData.eway_bill_no}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 700, padding: '3px 0' }}>E-Way Bill Date:</td>
                            <td>{slipData.eway_bill_date}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 700, padding: '3px 0' }}>Generated By:</td>
                            <td>{slipData.generated_by}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 700, padding: '3px 0' }}>Valid From:</td>
                            <td>{slipData.valid_from}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 700, padding: '3px 0' }}>Valid Until:</td>
                            <td style={{ fontWeight: 800, color: '#b45309' }}>{slipData.valid_until}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* QR Code Block */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed #9ca3af', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ width: '100px', height: '100px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {/* High-Contrast SVG QR Representation */}
                        <svg width="90" height="90" viewBox="0 0 100 100">
                          <rect width="100" height="100" fill="#ffffff" />
                          <rect x="10" y="10" width="25" height="25" fill="#1b4332" />
                          <rect x="15" y="15" width="15" height="15" fill="#ffffff" />
                          <rect x="18" y="18" width="9" height="9" fill="#1b4332" />
                          
                          <rect x="65" y="10" width="25" height="25" fill="#1b4332" />
                          <rect x="70" y="15" width="15" height="15" fill="#ffffff" />
                          <rect x="73" y="18" width="9" height="9" fill="#1b4332" />
                          
                          <rect x="10" y="65" width="25" height="25" fill="#1b4332" />
                          <rect x="15" y="70" width="15" height="15" fill="#ffffff" />
                          <rect x="18" y="73" width="9" height="9" fill="#1b4332" />
                          
                          <rect x="45" y="20" width="10" height="10" fill="#1b4332" />
                          <rect x="45" y="45" width="10" height="10" fill="#1b4332" />
                          <rect x="65" y="45" width="10" height="10" fill="#1b4332" />
                          <rect x="45" y="70" width="10" height="10" fill="#1b4332" />
                          <rect x="75" y="75" width="12" height="12" fill="#1b4332" />
                        </svg>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 800, marginTop: '4px', color: '#1b4332' }}>
                        SIGNED DIGITAL QR
                      </span>
                    </div>
                  </div>

                  {/* PART - A Header */}
                  <div style={{ backgroundColor: '#f3f4f6', padding: '6px 10px', fontWeight: 900, fontSize: '12px', border: '1px solid #d1d5db', marginBottom: '8px' }}>
                    PART - A (Consignment & Tax Invoice Details)
                  </div>

                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginBottom: '16px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700, width: '30%' }}>GSTIN of Supplier:</td>
                        <td style={{ padding: '4px 6px' }}>{slipData.part_a.supplier_gstin} - {slipData.part_a.supplier_name}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700 }}>Dispatch From:</td>
                        <td style={{ padding: '4px 6px' }}>{slipData.part_a.dispatch_address}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700 }}>GSTIN of Recipient:</td>
                        <td style={{ padding: '4px 6px' }}>{slipData.part_a.recipient_gstin} - {slipData.part_a.recipient_name}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700 }}>Place of Delivery:</td>
                        <td style={{ padding: '4px 6px' }}>{slipData.part_a.delivery_address}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700 }}>Document No & Date:</td>
                        <td style={{ padding: '4px 6px', fontWeight: 700 }}>{slipData.part_a.doc_no} Dt. {slipData.part_a.doc_date}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700 }}>Value of Goods:</td>
                        <td style={{ padding: '4px 6px', fontWeight: 800 }}>₹{slipData.part_a.value_of_goods.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700 }}>HSN Code:</td>
                        <td style={{ padding: '4px 6px' }}>{slipData.part_a.hsn_code}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 6px', fontWeight: 700 }}>Reason for Transportation:</td>
                        <td style={{ padding: '4px 6px' }}>{slipData.part_a.reason_for_transport}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* PART - B Header */}
                  <div style={{ backgroundColor: '#f3f4f6', padding: '6px 10px', fontWeight: 900, fontSize: '12px', border: '1px solid #d1d5db', marginBottom: '8px' }}>
                    PART - B (Vehicle & Transporter Details)
                  </div>

                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginBottom: '16px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e5e7eb', textAlign: 'left' }}>
                        <th style={{ padding: '6px' }}>Mode</th>
                        <th style={{ padding: '6px' }}>Vehicle / Trans Doc No</th>
                        <th style={{ padding: '6px' }}>From Place</th>
                        <th style={{ padding: '6px' }}>Entered Date</th>
                        <th style={{ padding: '6px' }}>Transporter ID & Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '6px' }}>{slipData.part_b.mode}</td>
                        <td style={{ padding: '6px', fontWeight: 900, color: '#1b4332' }}>{slipData.part_b.vehicle_no}</td>
                        <td style={{ padding: '6px' }}>{slipData.part_b.from_place}</td>
                        <td style={{ padding: '6px' }}>{slipData.part_b.entered_date}</td>
                        <td style={{ padding: '6px' }}>{slipData.part_b.transporter_id} - {slipData.part_b.transporter_name}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* IRN & Ack Box */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '10px', fontSize: '10px', fontFamily: 'monospace', color: '#334155' }}>
                    <div><strong>IRN:</strong> {slipData.irn}</div>
                    <div><strong>Ack No:</strong> {slipData.ack_no}</div>
                    <div style={{ wordBreak: 'break-all', marginTop: '2px', color: '#64748b' }}><strong>Payload Hash:</strong> {slipData.signed_qr_data}</div>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '9px', color: '#6b7280' }}>
                    This is a computer-generated statutory E-Way Bill slip generated under Rule 138 of the CGST Rules, 2017.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
