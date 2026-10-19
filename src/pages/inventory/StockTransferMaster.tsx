import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Send, CheckCircle2, AlertTriangle, Truck,
  Building2, Package, MapPin, Calendar, Clock, Printer, FileText,
  Search, Plus, Trash2, ShieldAlert, ArrowRight, Check, X
} from 'lucide-react';
import {
  apiGetStockTransferTelemetry,
  apiGetStockTransferWarehouses,
  apiGetStockTransferOrders,
  apiGetStockTransferOrder,
  apiCreateStockTransferOrder,
  apiDispatchStockTransferOrder,
  apiAcknowledgeStockTransferInward,
  StockTransferTelemetry,
  StockTransferWarehouse,
  StockTransferOrderRecord
} from '../../lib/api';

export default function StockTransferMaster() {
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'register' | 'create' | 'dispatch' | 'radar'>('register');

  // Telemetry & Master Data
  const [telemetry, setTelemetry] = useState<StockTransferTelemetry>({
    active_transit_count: 0,
    active_transit_value: 0,
    pending_requisitions: 0,
    acknowledged_today: 0,
    total_transit_variance_units: 0
  });
  const [warehouses, setWarehouses] = useState<StockTransferWarehouse[]>([]);
  const [orders, setOrders] = useState<StockTransferOrderRecord[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order for Dispatch or Acknowledge
  const [selectedOrder, setSelectedOrder] = useState<StockTransferOrderRecord | null>(null);

  // Tab [F2] Requisition Form State
  const [reqSourceWh, setReqSourceWh] = useState('');
  const [reqDestWh, setReqDestWh] = useState('');
  const [reqPriority, setReqPriority] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY'>('ROUTINE');
  const [reqExpectedDate, setReqExpectedDate] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [reqItems, setReqItems] = useState<Array<{
    product_id: string;
    product_name: string;
    requested_qty: number;
    unit_rate: number;
  }>>([
    { product_id: '', product_name: '', requested_qty: 10, unit_rate: 150.0 }
  ]);

  // Tab [F3] Outward Dispatch Form State
  const [dispatchOrderId, setDispatchOrderId] = useState('');
  const [dispVehicle, setDispVehicle] = useState('DL-01-TR-8842');
  const [dispTransporter, setDispTransporter] = useState('Gati KWE Logistics');
  const [dispDocket, setDispDocket] = useState('DKT-883921');
  const [dispEWay, setDispEWay] = useState('EWB-993821884');
  const [dispDriverName, setDispDriverName] = useState('Ramesh Yadav');
  const [dispDriverPhone, setDispDriverPhone] = useState('+91 98765 43210');
  const [dispItems, setDispItems] = useState<Array<{
    item_id: string;
    product_name: string;
    batch_number: string;
    expiry_date: string;
    dispatched_qty: number;
  }>>([]);

  // Modals
  const [showAckModal, setShowAckModal] = useState(false);
  const [ackOrder, setAckOrder] = useState<StockTransferOrderRecord | null>(null);
  const [ackItems, setAckItems] = useState<Array<{
    item_id: string;
    product_name: string;
    dispatched_qty: number;
    received_qty: number;
    damaged_qty: number;
    loss_reason: string;
  }>>([]);
  const [ackManager, setAckManager] = useState('Suresh Patel');
  const [ackRemarks, setAckRemarks] = useState('');

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOrder, setPrintOrder] = useState<StockTransferOrderRecord | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initial Data Fetch
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [telemRes, whRes, ordRes] = await Promise.all([
        apiGetStockTransferTelemetry(),
        apiGetStockTransferWarehouses(),
        apiGetStockTransferOrders({ status: statusFilter === 'ALL' ? undefined : statusFilter })
      ]);
      setTelemetry(telemRes);
      setWarehouses(whRes);
      setOrders(ordRes);

      if (whRes.length >= 2) {
        if (!reqSourceWh) setReqSourceWh(whRes[0].id);
        if (!reqDestWh) setReqDestWh(whRes[1].id);
      }
    } catch (err: any) {
      console.error('Failed to load stock transfer data:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, reqSourceWh, reqDestWh]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load sample products for builder
  useEffect(() => {
    const fetchSampleProducts = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/stock/', {
          headers: { Authorization: `Bearer ${localStorage.getItem('erp_token') || sessionStorage.getItem('erp-auth') || ''}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped = data.map((d: any) => ({
              id: d.product_id,
              name: d.product_name,
              sale_rate: 150.0
            }));
            setProducts(mapped);
            if (reqItems[0] && !reqItems[0].product_id) {
              setReqItems([{
                product_id: mapped[0].id,
                product_name: mapped[0].name || 'Product',
                requested_qty: 20,
                unit_rate: 150.0
              }]);
            }
          }
        }
      } catch (e) {
        // Fallback demo products
        setProducts([
          { id: '11111111-1111-1111-1111-111111111111', name: 'Amoxicillin 500mg Trihydrate', sale_rate: 185.50 },
          { id: '22222222-2222-2222-2222-222222222222', name: 'Paracetamol 650mg Fast Relief', sale_rate: 34.00 },
          { id: '33333333-3333-3333-3333-333333333333', name: 'Azithromycin 500mg Tablets', sale_rate: 220.00 }
        ]);
      }
    };
    fetchSampleProducts();
  }, []);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAckModal) setShowAckModal(false);
        else if (showPrintModal) setShowPrintModal(false);
        else navigate('/');
      } else if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('register');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('create');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('dispatch');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('radar');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAckModal, showPrintModal, navigate]);

  // Handle Order Selection in Dispatch tab
  const handleSelectDispatchOrder = (ordId: string) => {
    setDispatchOrderId(ordId);
    const ord = orders.find(o => o.id === ordId);
    if (ord) {
      setSelectedOrder(ord);
      setDispItems(ord.items.map(itm => ({
        item_id: itm.id,
        product_name: itm.product_name,
        batch_number: itm.batch_number || `BAT-${new Date().getFullYear()}-01`,
        expiry_date: itm.expiry_date || '12/28',
        dispatched_qty: itm.requested_qty
      })));
    }
  };

  // Submit New STO Requisition
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqSourceWh || !reqDestWh) {
      showToast('Please select both Source and Destination warehouses', 'error');
      return;
    }
    if (reqSourceWh === reqDestWh) {
      showToast('Source and Destination warehouses must be different', 'error');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        source_warehouse_id: reqSourceWh,
        destination_warehouse_id: reqDestWh,
        priority: reqPriority,
        expected_delivery_date: reqExpectedDate ? new Date(reqExpectedDate).toISOString() : null,
        notes: reqNotes,
        items: reqItems.map(itm => ({
          product_id: itm.product_id,
          product_name: itm.product_name,
          requested_qty: itm.requested_qty,
          unit_rate: itm.unit_rate
        }))
      };

      const res = await apiCreateStockTransferOrder(payload);
      showToast(`Stock Transfer Order ${res.order_number} created successfully!`, 'success');
      loadData();
      setActiveTab('register');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to create Stock Transfer Order', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit Outward Dispatch
  const handleDispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrderId) {
      showToast('Please select an order to dispatch', 'error');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        vehicle_number: dispVehicle,
        transporter_name: dispTransporter,
        docket_number: dispDocket,
        eway_bill_number: dispEWay,
        driver_name: dispDriverName,
        driver_phone: dispDriverPhone,
        items: dispItems.map(itm => ({
          item_id: itm.item_id,
          batch_number: itm.batch_number,
          expiry_date: itm.expiry_date,
          dispatched_qty: itm.dispatched_qty
        }))
      };

      const res = await apiDispatchStockTransferOrder(dispatchOrderId, payload);
      showToast(`Challan ${res.challan_number} issued! Consignment is now IN_TRANSIT`, 'success');
      loadData();
      setActiveTab('radar');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Dispatch failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open Acknowledge Modal
  const openAcknowledgeModal = (ord: StockTransferOrderRecord) => {
    setAckOrder(ord);
    setAckItems(ord.items.map(itm => ({
      item_id: itm.id,
      product_name: itm.product_name,
      dispatched_qty: itm.dispatched_qty || itm.requested_qty,
      received_qty: itm.dispatched_qty || itm.requested_qty,
      damaged_qty: 0,
      loss_reason: ''
    })));
    setShowAckModal(true);
  };

  // Submit Inward Acknowledgement
  const handleConfirmInwardAck = async () => {
    if (!ackOrder) return;
    try {
      setLoading(true);
      const payload = {
        acknowledged_by: ackManager,
        notes: ackRemarks,
        items: ackItems.map(itm => ({
          item_id: itm.item_id,
          received_qty: itm.received_qty,
          damaged_qty: itm.damaged_qty,
          loss_reason: itm.loss_reason
        }))
      };

      const res = await apiAcknowledgeStockTransferInward(ackOrder.id, payload);
      showToast(`Transfer ${res.order_number} acknowledged! Stock updated at receiving hub.`, 'success');
      setShowAckModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to acknowledge inward', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch =
        o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.source_warehouse_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.destination_warehouse_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.challan_number && o.challan_number.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [orders, searchQuery]);

  // Orders eligible for dispatch
  const dispatchEligibleOrders = useMemo(() => {
    return orders.filter(o => o.status === 'APPROVED' || o.status === 'DRAFT');
  }, [orders]);

  // In-Transit Orders for Radar
  const inTransitOrders = useMemo(() => {
    return orders.filter(o => o.status === 'IN_TRANSIT');
  }, [orders]);

  // Format INR Currency
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: '24px 32px' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '32px',
          zIndex: 9999,
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Top Apex Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1b4332',
        padding: '16px 24px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        border: '1px solid #2d6a4f'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            backgroundColor: '#10b981',
            padding: '10px',
            borderRadius: '10px',
            color: '#0f2e21',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Truck size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Stock Transfer Orders (STO) & In-Transit Radar
              </h1>
              <span style={{
                backgroundColor: '#0f2e21',
                color: '#a7f3d0',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #2d6a4f'
              }}>
                DOC-47 MULTI-BRANCH LOGISTICS
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              Inter-Depot Stock Movements, Outward Delivery Challans & Receiving Hub Acknowledgement
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            id="btn-new-sto-header"
            onClick={() => setActiveTab('create')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#10b981',
              color: '#0f2e21',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <Plus size={16} /> New STO [F2]
          </button>

          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#334155',
              color: '#cbd5e1',
              border: '1px solid #475569',
              borderRadius: '8px',
              padding: '10px 14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '10px 14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <ArrowLeft size={15} /> Exit [Esc]
          </button>
        </div>
      </div>

      {/* 4 Telemetry Scorecards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div id="card-active-transit" style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '16px 20px',
          borderLeft: '5px solid #3b82f6',
          borderTop: '1px solid #334155',
          borderRight: '1px solid #334155',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Active In-Transit
            </span>
            <Truck size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
            {telemetry.active_transit_count} Consignments
          </div>
          <div style={{ fontSize: '13px', color: '#60a5fa', fontWeight: 600, marginTop: '2px' }}>
            {formatINR(telemetry.active_transit_value)} In-Transit Value
          </div>
        </div>

        <div id="card-pending-requisitions" style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '16px 20px',
          borderLeft: '5px solid #f59e0b',
          borderTop: '1px solid #334155',
          borderRight: '1px solid #334155',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Pending Requisitions
            </span>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
            {telemetry.pending_requisitions} Orders
          </div>
          <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '2px' }}>
            Awaiting Outward Dispatch at Hubs
          </div>
        </div>

        <div id="card-acknowledged-today" style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '16px 20px',
          borderLeft: '5px solid #10b981',
          borderTop: '1px solid #334155',
          borderRight: '1px solid #334155',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Acknowledged Today
            </span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
            {telemetry.acknowledged_today} Transfers
          </div>
          <div style={{ fontSize: '12px', color: '#34d399', marginTop: '2px' }}>
            Successfully Inducted into Destination Stock
          </div>
        </div>

        <div id="card-transit-variance" style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '16px 20px',
          borderLeft: '5px solid #ef4444',
          borderTop: '1px solid #334155',
          borderRight: '1px solid #334155',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Transit Variance Units
            </span>
            <ShieldAlert size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
            {telemetry.total_transit_variance_units} Units
          </div>
          <div style={{ fontSize: '12px', color: '#f87171', marginTop: '2px' }}>
            Breakage / Shortage Segregated in Quarantine
          </div>
        </div>
      </div>

      {/* 4 Operational Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', marginBottom: '20px' }}>
        <button
          id="tab-sto-register"
          onClick={() => setActiveTab('register')}
          style={{
            padding: '12px 20px',
            backgroundColor: activeTab === 'register' ? '#1b4332' : 'transparent',
            color: activeTab === 'register' ? '#a7f3d0' : '#94a3b8',
            border: 'none',
            borderBottom: activeTab === 'register' ? '3px solid #10b981' : '3px solid transparent',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px 8px 0 0'
          }}
        >
          <FileText size={16} /> [F1] Master STO Register
        </button>

        <button
          id="tab-create-sto"
          onClick={() => setActiveTab('create')}
          style={{
            padding: '12px 20px',
            backgroundColor: activeTab === 'create' ? '#1b4332' : 'transparent',
            color: activeTab === 'create' ? '#a7f3d0' : '#94a3b8',
            border: 'none',
            borderBottom: activeTab === 'create' ? '3px solid #10b981' : '3px solid transparent',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px 8px 0 0'
          }}
        >
          <Plus size={16} /> [F2] Create Requisition Desk
        </button>

        <button
          id="tab-dispatch-desk"
          onClick={() => setActiveTab('dispatch')}
          style={{
            padding: '12px 20px',
            backgroundColor: activeTab === 'dispatch' ? '#1b4332' : 'transparent',
            color: activeTab === 'dispatch' ? '#a7f3d0' : '#94a3b8',
            border: 'none',
            borderBottom: activeTab === 'dispatch' ? '3px solid #10b981' : '3px solid transparent',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px 8px 0 0'
          }}
        >
          <Send size={16} /> [F3] Outward Dispatch & Challan
        </button>

        <button
          id="tab-in-transit-radar"
          onClick={() => setActiveTab('radar')}
          style={{
            padding: '12px 20px',
            backgroundColor: activeTab === 'radar' ? '#1b4332' : 'transparent',
            color: activeTab === 'radar' ? '#a7f3d0' : '#94a3b8',
            border: 'none',
            borderBottom: activeTab === 'radar' ? '3px solid #10b981' : '3px solid transparent',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px 8px 0 0'
          }}
        >
          <Truck size={16} /> [F4] In-Transit Radar ({inTransitOrders.length})
        </button>
      </div>

      {/* ── TAB 1: MASTER STO REGISTER ──────────────────────────────────────── */}
      {activeTab === 'register' && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }} />
                <input
                  id="input-search-sto"
                  type="text"
                  placeholder="Search by Order #, Hub, or Challan..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 12px 8px 36px',
                    color: '#ffffff',
                    fontSize: '13px',
                    width: '320px'
                  }}
                />
              </div>

              <select
                id="select-sto-status-filter"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '13px'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="APPROVED">APPROVED</option>
                <option value="IN_TRANSIT">IN_TRANSIT</option>
                <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>

            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Showing {filteredOrders.length} Stock Transfer Orders
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '2px solid #334155' }}>
                <th style={{ padding: '12px', color: '#94a3b8' }}>Order No / Date</th>
                <th style={{ padding: '12px', color: '#94a3b8' }}>Route (Source ➔ Destination)</th>
                <th style={{ padding: '12px', color: '#94a3b8' }}>Priority</th>
                <th style={{ padding: '12px', color: '#94a3b8' }}>Challan / Transport</th>
                <th style={{ padding: '12px', color: '#94a3b8' }}>Dispatched / Recv</th>
                <th style={{ padding: '12px', color: '#94a3b8' }}>Transfer Value</th>
                <th style={{ padding: '12px', color: '#94a3b8' }}>Status</th>
                <th style={{ padding: '12px', color: '#94a3b8', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    No stock transfer orders found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(ord => (
                  <tr key={ord.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#38bdf8' }}>{ord.order_number}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {ord.order_date ? new Date(ord.order_date).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#ffffff' }}>{ord.source_warehouse_name}</span>
                        <ArrowRight size={13} color="#10b981" />
                        <span style={{ color: '#ffffff', fontWeight: 600 }}>{ord.destination_warehouse_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: ord.priority === 'EMERGENCY' ? '#7f1d1d' : ord.priority === 'URGENT' ? '#78350f' : '#064e3b',
                        color: ord.priority === 'EMERGENCY' ? '#fca5a5' : ord.priority === 'URGENT' ? '#fcd34d' : '#6ee7b7'
                      }}>
                        {ord.priority}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {ord.challan_number ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#cbd5e1' }}>{ord.challan_number}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{ord.vehicle_number || ord.transporter_name}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '12px' }}>Not Dispatched</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div>{ord.total_dispatched_qty} / {ord.total_requested_qty} units</div>
                      {ord.total_transit_loss_qty > 0 && (
                        <div style={{ color: '#ef4444', fontSize: '11px' }}>Loss: {ord.total_transit_loss_qty} u</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#34d399' }}>
                      {formatINR(ord.total_transfer_value)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor:
                          ord.status === 'COMPLETED' ? '#064e3b' :
                          ord.status === 'IN_TRANSIT' ? '#1e3a8a' :
                          ord.status === 'APPROVED' ? '#312e81' : '#78350f',
                        color:
                          ord.status === 'COMPLETED' ? '#6ee7b7' :
                          ord.status === 'IN_TRANSIT' ? '#93c5fd' :
                          ord.status === 'APPROVED' ? '#c7d2fe' : '#fcd34d'
                      }}>
                        {ord.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {(ord.status === 'APPROVED' || ord.status === 'DRAFT') && (
                          <button
                            id={`btn-dispatch-sto-${ord.id}`}
                            onClick={() => {
                              handleSelectDispatchOrder(ord.id);
                              setActiveTab('dispatch');
                            }}
                            style={{
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Dispatch [F3]
                          </button>
                        )}

                        {ord.status === 'IN_TRANSIT' && (
                          <button
                            id={`btn-ack-sto-${ord.id}`}
                            onClick={() => openAcknowledgeModal(ord)}
                            style={{
                              backgroundColor: '#10b981',
                              color: '#0f2e21',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Receive [F4]
                          </button>
                        )}

                        {ord.challan_number && (
                          <button
                            id={`btn-print-sto-${ord.id}`}
                            onClick={() => {
                              setPrintOrder(ord);
                              setShowPrintModal(true);
                            }}
                            style={{
                              backgroundColor: '#334155',
                              color: '#cbd5e1',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              cursor: 'pointer'
                            }}
                            title="Print Stock Transfer Delivery Challan"
                          >
                            <Printer size={14} />
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
      )}

      {/* ── TAB 2: CREATE REQUISITION DESK ───────────────────────────────────── */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateOrder} style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#38bdf8' }}>
            New Stock Transfer Order Requisition
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Source Warehouse (Supplying Depot) *
              </label>
              <select
                id="select-source-warehouse"
                value={reqSourceWh}
                onChange={e => setReqSourceWh(e.target.value)}
                required
                style={{
                  width: '100%',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px',
                  color: '#ffffff',
                  fontSize: '13px'
                }}
              >
                <option value="">Select Supplying Hub...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Destination Warehouse (Receiving Hub) *
              </label>
              <select
                id="select-dest-warehouse"
                value={reqDestWh}
                onChange={e => setReqDestWh(e.target.value)}
                required
                style={{
                  width: '100%',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px',
                  color: '#ffffff',
                  fontSize: '13px'
                }}
              >
                <option value="">Select Receiving Hub...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Requisition Priority
              </label>
              <select
                id="select-sto-priority"
                value={reqPriority}
                onChange={e => setReqPriority(e.target.value as any)}
                style={{
                  width: '100%',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px',
                  color: '#ffffff',
                  fontSize: '13px'
                }}
              >
                <option value="ROUTINE">ROUTINE (Standard Replenishment)</option>
                <option value="URGENT">URGENT (Low Safety Stock)</option>
                <option value="EMERGENCY">EMERGENCY (Critical Zero Stock)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Expected Arrival Date
              </label>
              <input
                id="input-sto-expected-date"
                type="date"
                value={reqExpectedDate}
                onChange={e => setReqExpectedDate(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px',
                  color: '#ffffff',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>Line Items to Requisition</span>
              <button
                type="button"
                id="btn-add-sto-line"
                onClick={() => setReqItems([...reqItems, { product_id: products[0]?.id || '', product_name: products[0]?.name || 'Product', requested_qty: 10, unit_rate: 100 }])}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#334155',
                  color: '#38bdf8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            <table id="table-sto-items" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '10px', color: '#94a3b8' }}>Product Description</th>
                  <th style={{ padding: '10px', color: '#94a3b8', width: '150px' }}>Requested Qty</th>
                  <th style={{ padding: '10px', color: '#94a3b8', width: '150px' }}>Transfer Rate (₹)</th>
                  <th style={{ padding: '10px', color: '#94a3b8', width: '150px' }}>Line Total (₹)</th>
                  <th style={{ padding: '10px', color: '#94a3b8', width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {reqItems.map((itm, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '8px' }}>
                      <select
                        id={`select-sto-product-${idx}`}
                        value={itm.product_id}
                        onChange={e => {
                          const p = products.find(prod => prod.id === e.target.value);
                          const updated = [...reqItems];
                          updated[idx].product_id = e.target.value;
                          updated[idx].product_name = p ? p.name : 'Product';
                          if (p && p.sale_rate) updated[idx].unit_rate = Number(p.sale_rate);
                          setReqItems(updated);
                        }}
                        style={{
                          width: '100%',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '8px',
                          color: '#ffffff',
                          fontSize: '13px'
                        }}
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input
                        id={`input-sto-qty-${idx}`}
                        type="number"
                        min="1"
                        value={itm.requested_qty}
                        onChange={e => {
                          const updated = [...reqItems];
                          updated[idx].requested_qty = Number(e.target.value);
                          setReqItems(updated);
                        }}
                        style={{
                          width: '100%',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '8px',
                          color: '#ffffff',
                          fontSize: '13px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input
                        id={`input-sto-rate-${idx}`}
                        type="number"
                        step="0.01"
                        value={itm.unit_rate}
                        onChange={e => {
                          const updated = [...reqItems];
                          updated[idx].unit_rate = Number(e.target.value);
                          setReqItems(updated);
                        }}
                        style={{
                          width: '100%',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '8px',
                          color: '#ffffff',
                          fontSize: '13px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#34d399' }}>
                      {formatINR(itm.requested_qty * itm.unit_rate)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {reqItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setReqItems(reqItems.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '16px' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>
              Total Requisition Value:{' '}
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#34d399', marginLeft: '8px' }}>
                {formatINR(reqItems.reduce((acc, itm) => acc + (itm.requested_qty * itm.unit_rate), 0))}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                style={{
                  backgroundColor: '#334155',
                  color: '#cbd5e1',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                id="btn-submit-sto"
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: '#10b981',
                  color: '#0f2e21',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Submit & Approve Requisition [Enter]
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── TAB 3: OUTWARD DISPATCH WORKBENCH ─────────────────────────────────── */}
      {activeTab === 'dispatch' && (
        <form onSubmit={handleDispatchOrder} style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#38bdf8' }}>
            Outward Dispatch & Delivery Challan Generator
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Select Approved Stock Transfer Order *
            </label>
            <select
              id="select-dispatch-sto"
              value={dispatchOrderId}
              onChange={e => handleSelectDispatchOrder(e.target.value)}
              required
              style={{
                width: '100%',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px',
                color: '#ffffff',
                fontSize: '13px'
              }}
            >
              <option value="">Choose Order to Dispatch...</option>
              {dispatchEligibleOrders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.order_number} ({o.source_warehouse_name} ➔ {o.destination_warehouse_name}) — {formatINR(o.total_transfer_value)}
                </option>
              ))}
            </select>
          </div>

          {selectedOrder && (
            <>
              {/* Transport & Carrier Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Vehicle Number *
                  </label>
                  <input
                    id="input-dispatch-vehicle"
                    type="text"
                    value={dispVehicle}
                    onChange={e => setDispVehicle(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#ffffff',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Transporter / Carrier Name *
                  </label>
                  <input
                    id="input-dispatch-transporter"
                    type="text"
                    value={dispTransporter}
                    onChange={e => setDispTransporter(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#ffffff',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Docket / Lorry Receipt (LR) #
                  </label>
                  <input
                    id="input-dispatch-docket"
                    type="text"
                    value={dispDocket}
                    onChange={e => setDispDocket(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#ffffff',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    CBIC E-Way Bill Number
                  </label>
                  <input
                    id="input-dispatch-eway"
                    type="text"
                    value={dispEWay}
                    onChange={e => setDispEWay(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#ffffff',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Driver Name
                  </label>
                  <input
                    id="input-dispatch-driver-name"
                    type="text"
                    value={dispDriverName}
                    onChange={e => setDispDriverName(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#ffffff',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                    Driver Mobile Phone
                  </label>
                  <input
                    id="input-dispatch-driver-phone"
                    type="text"
                    value={dispDriverPhone}
                    onChange={e => setDispDriverPhone(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#ffffff',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              {/* Batch Allocation */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', marginBottom: '10px' }}>
                  Batch Allocation & Dispatched Quantities
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
                      <th style={{ padding: '10px', color: '#94a3b8' }}>Product Description</th>
                      <th style={{ padding: '10px', color: '#94a3b8', width: '180px' }}>Allocated Batch #</th>
                      <th style={{ padding: '10px', color: '#94a3b8', width: '120px' }}>Expiry (MM/YY)</th>
                      <th style={{ padding: '10px', color: '#94a3b8', width: '140px' }}>Dispatch Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispItems.map((itm, idx) => (
                      <tr key={itm.item_id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '10px', fontWeight: 600 }}>{itm.product_name}</td>
                        <td style={{ padding: '8px' }}>
                          <input
                            id={`input-dispatch-batch-${idx}`}
                            type="text"
                            value={itm.batch_number}
                            onChange={e => {
                              const updated = [...dispItems];
                              updated[idx].batch_number = e.target.value;
                              setDispItems(updated);
                            }}
                            style={{
                              width: '100%',
                              backgroundColor: '#0f172a',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              color: '#ffffff',
                              fontSize: '13px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            id={`input-dispatch-expiry-${idx}`}
                            type="text"
                            value={itm.expiry_date}
                            onChange={e => {
                              const updated = [...dispItems];
                              updated[idx].expiry_date = e.target.value;
                              setDispItems(updated);
                            }}
                            style={{
                              width: '100%',
                              backgroundColor: '#0f172a',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              color: '#ffffff',
                              fontSize: '13px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            id={`input-dispatch-qty-${idx}`}
                            type="number"
                            min="1"
                            value={itm.dispatched_qty}
                            onChange={e => {
                              const updated = [...dispItems];
                              updated[idx].dispatched_qty = Number(e.target.value);
                              setDispItems(updated);
                            }}
                            style={{
                              width: '100%',
                              backgroundColor: '#0f172a',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              color: '#ffffff',
                              fontSize: '13px'
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  style={{
                    backgroundColor: '#334155',
                    color: '#cbd5e1',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  id="btn-confirm-dispatch-sto"
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Send size={16} /> Confirm & Generate Outward Delivery Challan [Enter]
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {/* ── TAB 4: IN-TRANSIT RADAR ─────────────────────────────────────────── */}
      {activeTab === 'radar' && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#38bdf8' }}>
                Active In-Transit Pipeline Radar
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                Live consignments moving between warehouses, tracking carrier and arrival status.
              </p>
            </div>
            <span style={{
              backgroundColor: '#1e3a8a',
              color: '#93c5fd',
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '8px'
            }}>
              {inTransitOrders.length} Shipments on the Road
            </span>
          </div>

          {inTransitOrders.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
              <Truck size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <div style={{ fontSize: '15px', fontWeight: 600 }}>All transfer shipments have arrived and been acknowledged.</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>Dispatch an approved order from Tab [F3] to see live telemetry.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {inTransitOrders.map(ord => (
                <div key={ord.id} style={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  padding: '18px',
                  border: '1px solid #334155'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8' }}>{ord.order_number}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px' }}>Challan: {ord.challan_number}</span>
                    </div>
                    <span style={{
                      backgroundColor: '#065f46',
                      color: '#a7f3d0',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}>
                      ON SCHEDULE
                    </span>
                  </div>

                  {/* Route Bar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#1e293b',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>ORIGIN HUB</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{ord.source_warehouse_name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                      <div style={{ height: '2px', width: '40px', backgroundColor: '#10b981' }}></div>
                      <Truck size={18} />
                      <div style={{ height: '2px', width: '40px', backgroundColor: '#10b981' }}></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>RECEIVING HUB</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{ord.destination_warehouse_name}</div>
                    </div>
                  </div>

                  {/* Transport Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px', marginBottom: '14px' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Vehicle:</span>
                      <div style={{ fontWeight: 600, color: '#cbd5e1' }}>{ord.vehicle_number || 'N/A'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Carrier:</span>
                      <div style={{ fontWeight: 600, color: '#cbd5e1' }}>{ord.transporter_name || 'N/A'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Docket #:</span>
                      <div style={{ fontWeight: 600, color: '#cbd5e1' }}>{ord.docket_number || 'N/A'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#34d399' }}>
                      {formatINR(ord.total_transfer_value)} ({ord.total_dispatched_qty} units)
                    </div>

                    <button
                      id={`btn-radar-receive-${ord.id}`}
                      onClick={() => openAcknowledgeModal(ord)}
                      style={{
                        backgroundColor: '#10b981',
                        color: '#0f2e21',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={15} /> Receive & Acknowledge Inward [F4]
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: INWARD HUB ACKNOWLEDGEMENT & DISCREPANCY ─────────────────── */}
      {showAckModal && ackOrder && (
        <div id="modal-acknowledge-inward" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9000
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '14px',
            width: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            border: '1px solid #334155',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                  Destination Hub Inward Acknowledgement
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  Order: {ackOrder.order_number} | Challan: {ackOrder.challan_number} | Vehicle: {ackOrder.vehicle_number}
                </p>
              </div>
              <button
                onClick={() => setShowAckModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '10px', color: '#94a3b8' }}>Product Description</th>
                    <th style={{ padding: '10px', color: '#94a3b8', width: '110px' }}>Dispatched</th>
                    <th style={{ padding: '10px', color: '#94a3b8', width: '120px' }}>Received Qty</th>
                    <th style={{ padding: '10px', color: '#94a3b8', width: '120px' }}>Damaged Qty</th>
                    <th style={{ padding: '10px', color: '#94a3b8', width: '160px' }}>Loss Reason / Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {ackItems.map((itm, idx) => (
                    <tr key={itm.item_id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{itm.product_name}</td>
                      <td style={{ padding: '10px', color: '#60a5fa' }}>{itm.dispatched_qty} units</td>
                      <td style={{ padding: '6px' }}>
                        <input
                          id={`input-ack-received-qty-${idx}`}
                          type="number"
                          min="0"
                          max={itm.dispatched_qty}
                          value={itm.received_qty}
                          onChange={e => {
                            const updated = [...ackItems];
                            updated[idx].received_qty = Number(e.target.value);
                            setAckItems(updated);
                          }}
                          style={{
                            width: '100%',
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            color: '#ffffff',
                            fontSize: '13px'
                          }}
                        />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input
                          id={`input-ack-damage-qty-${idx}`}
                          type="number"
                          min="0"
                          value={itm.damaged_qty}
                          onChange={e => {
                            const updated = [...ackItems];
                            updated[idx].damaged_qty = Number(e.target.value);
                            setAckItems(updated);
                          }}
                          style={{
                            width: '100%',
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            color: '#ffffff',
                            fontSize: '13px'
                          }}
                        />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input
                          id={`input-ack-reason-${idx}`}
                          type="text"
                          placeholder="e.g. transit leakage"
                          value={itm.loss_reason}
                          onChange={e => {
                            const updated = [...ackItems];
                            updated[idx].loss_reason = e.target.value;
                            setAckItems(updated);
                          }}
                          style={{
                            width: '100%',
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            color: '#ffffff',
                            fontSize: '13px'
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Receiving Manager *
                </label>
                <input
                  id="input-ack-manager"
                  type="text"
                  value={ackManager}
                  onChange={e => setAckManager(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  General Inward Remarks
                </label>
                <input
                  id="input-ack-remarks"
                  type="text"
                  placeholder="e.g. Unloaded at Bay 2, all seals intact"
                  value={ackRemarks}
                  onChange={e => setAckRemarks(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowAckModal(false)}
                style={{
                  backgroundColor: '#334155',
                  color: '#cbd5e1',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel [Esc]
              </button>

              <button
                id="btn-confirm-inward-ack"
                type="button"
                onClick={handleConfirmInwardAck}
                disabled={loading}
                style={{
                  backgroundColor: '#10b981',
                  color: '#0f2e21',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Check size={16} /> Confirm Inward Stock & Update Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PRINTABLE STOCK TRANSFER CHALLAN ─────────────────────────── */}
      {showPrintModal && printOrder && (
        <div id="modal-print-sto-challan" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            color: '#000000',
            borderRadius: '12px',
            width: '750px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            fontFamily: 'monospace'
          }}>
            <div style={{ borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>GOODS DELIVERY CHALLAN (STOCK TRANSFER)</h2>
                <span style={{ fontSize: '12px', fontWeight: 700, border: '1px solid #000', padding: '2px 6px' }}>
                  GST RULE 55 COMPLIANT
                </span>
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Challan #: <strong>{printOrder.challan_number || 'STD-DRAFT'}</strong> | Ref Order #: <strong>{printOrder.order_number}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', fontSize: '12px', marginBottom: '16px' }}>
              <div style={{ border: '1px solid #ccc', padding: '10px' }}>
                <div style={{ fontWeight: 800 }}>DISPATCHING (SOURCE) DEPOT:</div>
                <div>{printOrder.source_warehouse_name}</div>
                <div>Dispatch Date: {printOrder.dispatch_date ? new Date(printOrder.dispatch_date).toLocaleString() : 'N/A'}</div>
                <div>Dispatched By: {printOrder.dispatched_by || 'Warehouse Incharge'}</div>
              </div>

              <div style={{ border: '1px solid #ccc', padding: '10px' }}>
                <div style={{ fontWeight: 800 }}>RECEIVING (DESTINATION) DEPOT:</div>
                <div>{printOrder.destination_warehouse_name}</div>
                <div>Vehicle #: <strong>{printOrder.vehicle_number || 'N/A'}</strong></div>
                <div>Transporter: {printOrder.transporter_name || 'N/A'} | LR #: {printOrder.docket_number || 'N/A'}</div>
                <div>E-Way Bill #: {printOrder.eway_bill_number || 'N/A'}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                  <th style={{ padding: '6px', textAlign: 'left' }}>#</th>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Product Description</th>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Batch #</th>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Expiry</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Dispatched Qty</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Transfer Rate</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {printOrder.items.map((itm, i) => (
                  <tr key={itm.id} style={{ borderBottom: '1px dotted #ccc' }}>
                    <td style={{ padding: '6px' }}>{i + 1}</td>
                    <td style={{ padding: '6px' }}>{itm.product_name}</td>
                    <td style={{ padding: '6px' }}>{itm.batch_number || 'BAT-DEF'}</td>
                    <td style={{ padding: '6px' }}>{itm.expiry_date || '12/28'}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>{itm.dispatched_qty}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{itm.unit_rate.toFixed(2)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>{itm.line_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #000' }}>
                  <td colSpan={4} style={{ padding: '8px', fontWeight: 800 }}>GRAND TOTAL TRANSFER VALUATION:</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800 }}>{printOrder.total_dispatched_qty}</td>
                  <td></td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800 }}>{printOrder.total_transfer_value.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', marginTop: '40px', fontSize: '11px' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: '6px', textAlign: 'center' }}>
                Authorized Dispatch Signature
              </div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '6px', textAlign: 'center' }}>
                Receiving Hub Goods Inward Stamp & Signature
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                id="btn-close-challan-modal"
                onClick={() => setShowPrintModal(false)}
                style={{
                  backgroundColor: '#e2e8f0',
                  color: '#334155',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close [Esc]
              </button>

              <button
                id="btn-trigger-print-challan"
                onClick={() => window.print()}
                style={{
                  backgroundColor: '#1b4332',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={15} /> Print Physical Challan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
