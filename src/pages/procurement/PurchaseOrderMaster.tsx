import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, ShoppingCart, RefreshCw, AlertTriangle, CheckCircle2, 
  Clock, ArrowRight, Printer, Share2, Plus, Trash2, Calendar, 
  FileText, User, Search, Filter, CheckSquare, Square, 
  DollarSign, TrendingUp, ShieldCheck, ChevronRight, X, ExternalLink
} from 'lucide-react';
import apiClient from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';

interface RadarItem {
  product_id: string;
  product_code: string;
  product_name: string;
  packing: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  reorder_quantity: number;
  pending_po_qty: number;
  effective_stock: number;
  deficit_qty: number;
  suggested_order_qty: number;
  p_rate: number;
  mrp: number;
  estimated_cost: number;
  status: string;
  lead_time_days: number;
  preferred_vendor_id: string;
  preferred_vendor_name: string;
  selected?: boolean;
}

interface VendorComparison {
  vendor_id: string;
  vendor_name: string;
  gst_number: string;
  last_purchase_date: string;
  offered_rate: number;
  mrp: number;
  discount_percent: number;
  net_effective_rate: number;
  payment_credit_days: number;
  lead_time_days: number;
  reliability_rating: number;
  optimization_badge: string;
}

export default function PurchaseOrderMaster() {
  useReturnNavigation();
  const navigate = useNavigate();

  // Active Tab: 'directory' | 'radar' | 'create' | 'rates'
  const [activeTab, setActiveTab] = useState<'directory' | 'radar' | 'create' | 'rates'>('directory');

  // Master Data
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Scorecards State
  const [scorecards, setScorecards] = useState({
    critical_out_of_stock_count: 0,
    below_reorder_count: 0,
    total_deficit_budget: 0,
    active_pos_pipeline_count: 0,
    total_active_pos_value: 0
  });

  // Tab 1: Directory State
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [directoryStatusFilter, setDirectoryStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Tab 2: Replenishment Radar State
  const [radarItems, setRadarItems] = useState<RadarItem[]>([]);
  const [radarFilter, setRadarFilter] = useState<'ALL' | 'CRITICAL' | 'REORDER'>('ALL');
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);

  // Tab 3: Create PO State
  const [poNumber, setPoNumber] = useState(`PO-${new Date().toISOString().slice(0,7).replace('-','')}-0001`);
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [supplyClassification, setSupplyClassification] = useState('Standard Pharma Stock');
  const [poItems, setPoItems] = useState<any[]>([
    { id: 1, product_id: '', product_name: '', quantity: 10, rate: 0, line_total: 0 }
  ]);
  const [isSavingPo, setIsSavingPo] = useState(false);

  // Tab 4: Vendor Rate Comparison State
  const [selectedProductForRates, setSelectedProductForRates] = useState<string>('');
  const [vendorRatesData, setVendorRatesData] = useState<VendorComparison[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);

  // Modals State
  const [activeDispatchPo, setActiveDispatchPo] = useState<any | null>(null);
  const [activeConvertPo, setActiveConvertPo] = useState<any | null>(null);
  const [conversionMessage, setConversionMessage] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch parties & products
      const [partiesRes, prodsRes] = await Promise.all([
        apiClient.get('/api/parties/?limit=100').catch(() => ({ data: [] })),
        apiClient.get('/api/products/?limit=100').catch(() => ({ data: [] }))
      ]);
      setVendors(partiesRes.data || []);
      setProducts(prodsRes.data || []);

      if (partiesRes.data && partiesRes.data.length > 0) {
        setSelectedVendorId(partiesRes.data[0].id);
      }

      // 2. Fetch Orders
      await fetchOrders();

      // 3. Fetch Replenishment Radar
      await fetchReplenishmentRadar();

    } catch (err) {
      console.error('Failed to load procurement initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await apiClient.get('/api/procurement/orders');
      setPurchaseOrders(res.data || []);
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
    }
  };

  const fetchReplenishmentRadar = async () => {
    try {
      const res = await apiClient.get('/api/procurement/replenishment-radar');
      if (res.data) {
        setScorecards(res.data.scorecards || scorecards);
        const mappedItems = (res.data.items || []).map((i: any) => ({
          ...i,
          selected: i.status === 'CRITICAL_OUT_OF_STOCK' || i.deficit_qty > 0
        }));
        setRadarItems(mappedItems);
        if (mappedItems.length > 0 && !selectedProductForRates) {
          setSelectedProductForRates(mappedItems[0].product_id);
          fetchVendorRates(mappedItems[0].product_id);
        }
      }
    } catch (err) {
      console.error('Failed to load replenishment radar:', err);
    }
  };

  const fetchVendorRates = async (productId: string) => {
    if (!productId) return;
    setRatesLoading(true);
    try {
      const res = await apiClient.get(`/api/procurement/vendor-rate-comparison/${productId}`);
      if (res.data && res.data.vendors) {
        setVendorRatesData(res.data.vendors);
      }
    } catch (err) {
      console.error('Failed to fetch vendor comparison rates:', err);
    } finally {
      setRatesLoading(false);
    }
  };

  // Keyboard Shortcuts Navigation ([F1] to [F4], [Esc])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('directory');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('radar');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('create');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('rates');
      } else if (e.key === 'Escape') {
        if (activeDispatchPo || activeConvertPo) {
          e.preventDefault();
          setActiveDispatchPo(null);
          setActiveConvertPo(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDispatchPo, activeConvertPo]);

  // Handle PO Item Updates in Tab 3
  const updatePoItem = (id: number, field: string, val: any) => {
    setPoItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: val };
        if (field === 'product_id') {
          const prod = products.find(p => p.id === val);
          if (prod) {
            updated.product_name = prod.name;
            updated.rate = Number(prod.p_rate) || 0;
          }
        }
        if (field === 'quantity' || field === 'rate' || field === 'product_id') {
          updated.line_total = (Number(updated.quantity) || 0) * (Number(updated.rate) || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const addPoItemRow = () => {
    const newId = Date.now();
    setPoItems(prev => [...prev, { id: newId, product_id: '', product_name: '', quantity: 10, rate: 0, line_total: 0 }]);
  };

  const removePoItemRow = (id: number) => {
    if (poItems.length === 1) return;
    setPoItems(prev => prev.filter(i => i.id !== id));
  };

  const poSubtotal = poItems.reduce((acc, curr) => acc + (Number(curr.line_total) || 0), 0);
  const poGst = poSubtotal * 0.18; // 18% standard pharma GST
  const poGrandTotal = poSubtotal + poGst;

  // Save New PO Action
  const handleSavePurchaseOrder = async () => {
    if (!selectedVendorId) {
      alert('Please select a supplier / vendor.');
      return;
    }
    const validItems = poItems.filter(i => i.product_id && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      alert('Please add at least one valid product line with quantity > 0.');
      return;
    }

    setIsSavingPo(true);
    try {
      const payload = {
        po_number: poNumber,
        date: new Date(poDate).toISOString(),
        vendor_id: selectedVendorId,
        status: 'APPROVED',
        expected_delivery: new Date(expectedDelivery).toISOString(),
        supply_classification: supplyClassification,
        total_amount: poGrandTotal,
        items: validItems.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: Number(i.quantity),
          received_qty: 0,
          rate: Number(i.rate),
          line_total: Number(i.line_total)
        }))
      };

      await apiClient.post('/api/procurement/orders', payload);
      alert(`Purchase Order ${poNumber} created and approved successfully!`);
      // Reset form
      setPoNumber(`PO-${new Date().toISOString().slice(0,7).replace('-','')}-${String(Math.floor(Math.random() * 8999) + 1000)}`);
      setPoItems([{ id: Date.now(), product_id: '', product_name: '', quantity: 10, rate: 0, line_total: 0 }]);
      await fetchOrders();
      await fetchReplenishmentRadar();
      setActiveTab('directory');
    } catch (err: any) {
      console.error('Failed to save PO:', err);
      alert('Failed to save purchase order: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSavingPo(false);
    }
  };

  // Toggle item selection in Replenishment Radar
  const toggleRadarItem = (productId: string) => {
    setRadarItems(prev => prev.map(item => 
      item.product_id === productId ? { ...item, selected: !item.selected } : item
    ));
  };

  const toggleAllRadarItems = () => {
    const allSelected = radarItems.every(i => i.selected);
    setRadarItems(prev => prev.map(i => ({ ...i, selected: !allSelected })));
  };

  // 1-Click Bulk PO Generation from Replenishment Radar
  const handleGenerateBulkPos = async () => {
    const selected = radarItems.filter(i => i.selected && i.suggested_order_qty > 0);
    if (selected.length === 0) {
      alert('Please select at least one item with suggested reorder quantity > 0.');
      return;
    }

    setIsGeneratingBulk(true);
    try {
      const ordersPayload = selected.map(item => ({
        product_id: item.product_id,
        vendor_id: item.preferred_vendor_id || (vendors[0]?.id),
        quantity: item.suggested_order_qty,
        rate: item.p_rate,
        product_name: item.product_name
      }));

      const res = await apiClient.post('/api/procurement/generate-from-replenishment', { orders: ordersPayload });
      alert(res.data.message || 'Bulk Purchase Orders generated successfully!');
      await fetchOrders();
      await fetchReplenishmentRadar();
      setActiveTab('directory');
    } catch (err: any) {
      console.error('Failed to generate bulk POs:', err);
      alert('Failed to generate bulk POs: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  // Convert PO to Inward Purchase Bill
  const handleConvertToPurchaseBill = async (po: any) => {
    setIsConverting(true);
    try {
      const res = await apiClient.post(`/api/procurement/orders/${po.id}/convert-to-purchase`);
      setConversionMessage(res.data.message);
      await fetchOrders();
      await fetchReplenishmentRadar();
      setTimeout(() => {
        setActiveConvertPo(null);
        setConversionMessage(null);
        navigate('/purchase');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to convert PO to Purchase Bill:', err);
      alert('Failed to convert: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsConverting(false);
    }
  };

  // Format WhatsApp message for PO dispatch
  const getWhatsAppPayload = (po: any) => {
    if (!po) return '';
    const itemsList = (po.items || []).map((i: any, idx: number) => 
      `${idx + 1}. *${i.product_name}* - Qty: ${i.quantity} @ ₹${Number(i.rate).toFixed(2)} = ₹${Number(i.line_total).toFixed(2)}`
    ).join('\n');

    return `*OFFICIAL PURCHASE ORDER — APEX MEDCORP*\n` +
      `*PO Number:* ${po.po_number}\n` +
      `*Date:* ${new Date(po.date).toLocaleDateString()}\n` +
      `*Supplier:* ${po.vendor_name || 'Valued Partner'}\n` +
      `*Expected Delivery:* ${po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : 'Immediate'}\n\n` +
      `*Line Items:*\n${itemsList}\n\n` +
      `*Total PO Value:* ₹${Number(po.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
      `*Terms:* 30 Days Credit / Standard Supply Warranty\n` +
      `Please acknowledge receipt and confirm expected dispatch schedule.`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Purchase Order dispatch slip copied to clipboard!');
  };

  // Filtered Directory Orders
  const filteredOrders = purchaseOrders.filter(po => {
    const matchesStatus = directoryStatusFilter === 'ALL' || po.status === directoryStatusFilter;
    const matchesSearch = !searchQuery || 
      po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (po.vendor_name && po.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Filtered Radar Items
  const filteredRadarItems = radarItems.filter(item => {
    if (radarFilter === 'CRITICAL') return item.status === 'CRITICAL_OUT_OF_STOCK';
    if (radarFilter === 'REORDER') return item.status === 'BELOW_REORDER_LEVEL';
    return true;
  });

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#0f172a'
    }}>
      {/* ── TOP HEADER / ACTION BAR ─────────────────────────────────────── */}
      <header style={{
        backgroundColor: '#1b4332',
        color: '#ffffff',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid #2d6a4f',
        boxShadow: '0 4px 12px rgba(27, 67, 50, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            backgroundColor: '#2d6a4f',
            padding: '10px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2)'
          }}>
            <ShoppingCart size={22} color="#52b788" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em', margin: 0 }}>
                Enterprise Procurement & Stock Replenishment Desk
              </h1>
              <span style={{
                backgroundColor: '#52b788',
                color: '#1b4332',
                fontSize: '10px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '12px',
                textTransform: 'uppercase'
              }}>
                DOC-45
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#d1e7dd', margin: '2px 0 0 0' }}>
              Autonomous Deficit Detection • Best-Rate Vendor Intelligence • Keyboard Accelerated PO Builder
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="btn-refresh-procurement"
            onClick={fetchInitialData}
            style={{
              backgroundColor: '#2d6a4f',
              color: '#ffffff',
              border: '1px solid #40916c',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh [F5]
          </button>
          <button
            id="btn-quick-create-po"
            onClick={() => setActiveTab('create')}
            style={{
              backgroundColor: '#52b788',
              color: '#1b4332',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
          >
            <Plus size={15} />
            New Purchase Order [F3]
          </button>
        </div>
      </header>

      {/* ── 4 TELEMETRY SCORECARDS ────────────────────────────────────────── */}
      <section style={{
        padding: '16px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        backgroundColor: '#f1f5f9'
      }}>
        {/* Card 1: Critical Stock */}
        <div id="card-critical-stock" style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #ef4444',
          padding: '14px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Critical Out of Stock
            </span>
            <AlertTriangle size={16} color="#ef4444" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444' }}>
              {scorecards.critical_out_of_stock_count}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>items with 0 balance</span>
          </div>
        </div>

        {/* Card 2: Below Reorder */}
        <div id="card-reorder-stock" style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #f59e0b',
          padding: '14px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Below Reorder Level
            </span>
            <TrendingUp size={16} color="#f59e0b" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b' }}>
              {scorecards.below_reorder_count}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>items near deficit</span>
          </div>
        </div>

        {/* Card 3: Replenishment Budget */}
        <div id="card-replenishment-budget" style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #1b4332',
          padding: '14px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Projected Deficit Outlay
            </span>
            <DollarSign size={16} color="#1b4332" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '22px', fontWeight: '800', color: '#1b4332' }}>
              ₹{scorecards.total_deficit_budget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 4: Active PO Pipeline */}
        <div id="card-pending-pos" style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #3b82f6',
          padding: '14px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Active PO Pipeline
            </span>
            <Clock size={16} color="#3b82f6" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#3b82f6' }}>
              {scorecards.active_pos_pipeline_count}
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              (₹{scorecards.total_active_pos_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
            </span>
          </div>
        </div>
      </section>

      {/* ── TAB NAVIGATION BUTTONS ───────────────────────────────────────── */}
      <nav style={{
        padding: '0 24px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #cbd5e1',
        display: 'flex',
        gap: '4px'
      }}>
        <button
          id="tab-po-directory"
          onClick={() => setActiveTab('directory')}
          style={{
            padding: '12px 18px',
            fontSize: '13px',
            fontWeight: activeTab === 'directory' ? '700' : '500',
            color: activeTab === 'directory' ? '#1b4332' : '#64748b',
            border: 'none',
            borderBottom: activeTab === 'directory' ? '3px solid #1b4332' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FileText size={16} />
          [F1] Master PO Directory
          <span style={{
            fontSize: '11px',
            backgroundColor: activeTab === 'directory' ? '#eef7f2' : '#f1f5f9',
            color: activeTab === 'directory' ? '#1b4332' : '#64748b',
            padding: '2px 8px',
            borderRadius: '10px'
          }}>
            {purchaseOrders.length}
          </span>
        </button>

        <button
          id="tab-replenishment-radar"
          onClick={() => setActiveTab('radar')}
          style={{
            padding: '12px 18px',
            fontSize: '13px',
            fontWeight: activeTab === 'radar' ? '700' : '500',
            color: activeTab === 'radar' ? '#1b4332' : '#64748b',
            border: 'none',
            borderBottom: activeTab === 'radar' ? '3px solid #1b4332' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <TrendingUp size={16} color={activeTab === 'radar' ? '#1b4332' : '#64748b'} />
          [F2] Stock Replenishment Radar
          <span style={{
            fontSize: '11px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: '10px'
          }}>
            {radarItems.length} Deficits
          </span>
        </button>

        <button
          id="tab-create-po"
          onClick={() => setActiveTab('create')}
          style={{
            padding: '12px 18px',
            fontSize: '13px',
            fontWeight: activeTab === 'create' ? '700' : '500',
            color: activeTab === 'create' ? '#1b4332' : '#64748b',
            border: 'none',
            borderBottom: activeTab === 'create' ? '3px solid #1b4332' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Plus size={16} />
          [F3] Create New Purchase Order
        </button>

        <button
          id="tab-vendor-rates"
          onClick={() => setActiveTab('rates')}
          style={{
            padding: '12px 18px',
            fontSize: '13px',
            fontWeight: activeTab === 'rates' ? '700' : '500',
            color: activeTab === 'rates' ? '#1b4332' : '#64748b',
            border: 'none',
            borderBottom: activeTab === 'rates' ? '3px solid #1b4332' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <DollarSign size={16} />
          [F4] Vendor Rate Intelligence
        </button>
      </nav>

      {/* ── MAIN TAB CONTENT AREA ────────────────────────────────────────── */}
      <main style={{ padding: '20px 24px', flex: 1 }}>

        {/* ── TAB 1: MASTER PO DIRECTORY ─────────────────────────────────── */}
        {activeTab === 'directory' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              gap: '16px'
            }}>
              {/* Search input */}
              <div style={{
                position: 'relative',
                flex: 1,
                maxWidth: '380px'
              }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
                <input
                  id="input-search-po"
                  type="text"
                  placeholder="Search PO #, supplier, or items..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    fontSize: '13px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Status filter pills */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['ALL', 'APPROVED', 'COMPLETED', 'DRAFT', 'CANCELLED'].map(st => (
                  <button
                    key={st}
                    id={`btn-filter-status-${st.toLowerCase()}`}
                    onClick={() => setDirectoryStatusFilter(st)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: directoryStatusFilter === st ? '700' : '500',
                      backgroundColor: directoryStatusFilter === st ? '#1b4332' : '#ffffff',
                      color: directoryStatusFilter === st ? '#ffffff' : '#64748b',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* PO Orders Table */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155' }}>PO Number</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155' }}>Date</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155' }}>Supplier / Vendor</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155', textAlign: 'right' }}>Total Amount</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155' }}>Delivery Due</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        No Purchase Orders found. Use <strong>[F2] Replenishment Radar</strong> or <strong>[F3] Create New PO</strong>.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(po => {
                      const isCompleted = po.status === 'COMPLETED';
                      const isApproved = po.status === 'APPROVED';
                      return (
                        <tr key={po.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: '#1b4332' }}>
                            {po.po_number}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>
                            {new Date(po.date).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b' }}>
                            {po.vendor_name || 'Pharma Vendor'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                            ₹{Number(po.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>
                            {po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : '3 Days'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: isCompleted ? '#dcfce7' : isApproved ? '#e0e7ff' : '#f1f5f9',
                              color: isCompleted ? '#15803d' : isApproved ? '#4338ca' : '#64748b'
                            }}>
                              {po.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                              {/* WhatsApp / Print Dispatch Button */}
                              <button
                                id={`btn-dispatch-po-${po.id}`}
                                title="Share WhatsApp Slip & Print"
                                onClick={() => setActiveDispatchPo(po)}
                                style={{
                                  backgroundColor: '#25D366',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '5px 8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: '600'
                                }}
                              >
                                <Share2 size={13} /> Dispatch
                              </button>

                              {/* Convert to Inward Purchase Bill Button */}
                              {po.status !== 'COMPLETED' && (
                                <button
                                  id={`btn-convert-po-purchase-${po.id}`}
                                  title="Convert to Inward Purchase Voucher"
                                  onClick={() => setActiveConvertPo(po)}
                                  style={{
                                    backgroundColor: '#1b4332',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '5px 8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    fontWeight: '600'
                                  }}
                                >
                                  <ArrowRight size={13} /> Book Inward
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: STOCK REPLENISHMENT RADAR ───────────────────────────── */}
        {activeTab === 'radar' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                  Replenishment Filter:
                </span>
                {(['ALL', 'CRITICAL', 'REORDER'] as const).map(f => (
                  <button
                    key={f}
                    id={`btn-radar-filter-${f.toLowerCase()}`}
                    onClick={() => setRadarFilter(f)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: radarFilter === f ? '700' : '500',
                      backgroundColor: radarFilter === f ? '#1b4332' : '#ffffff',
                      color: radarFilter === f ? '#ffffff' : '#64748b',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {f === 'ALL' ? 'All Deficits' : f === 'CRITICAL' ? '0-Stock Only' : 'Below Safety Stock'}
                  </button>
                ))}
              </div>

              {/* 1-Click Bulk PO Generator Button */}
              <button
                id="btn-bulk-generate-pos"
                onClick={handleGenerateBulkPos}
                disabled={isGeneratingBulk || radarItems.filter(i => i.selected).length === 0}
                style={{
                  backgroundColor: '#1b4332',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: isGeneratingBulk ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(27,67,50,0.2)'
                }}
              >
                <ShoppingCart size={16} color="#52b788" />
                {isGeneratingBulk ? 'Generating POs...' : `[F7] Generate Bulk POs (${radarItems.filter(i => i.selected).length})`}
              </button>
            </div>

            {/* Radar Grid */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', width: '40px', textAlign: 'center' }}>
                      <input
                        id="checkbox-select-all"
                        type="checkbox"
                        checked={radarItems.length > 0 && radarItems.every(i => i.selected)}
                        onChange={toggleAllRadarItems}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: '#334155' }}>Item Code & Name</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: '#334155' }}>Packing</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: '#334155', textAlign: 'right' }}>Current Stock</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: '#334155', textAlign: 'right' }}>Safety Min</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: '#334155', textAlign: 'right' }}>Deficit Qty</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: '#334155', textAlign: 'right' }}>Order Qty</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: '#334155', textAlign: 'right' }}>Purchase Rate</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: '#334155', textAlign: 'right' }}>Est. Outlay</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: '#334155' }}>Preferred Supplier</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: '#334155', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRadarItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        All products are currently stocked at or above safety levels.
                      </td>
                    </tr>
                  ) : (
                    filteredRadarItems.map(item => {
                      const isCritical = item.status === 'CRITICAL_OUT_OF_STOCK';
                      return (
                        <tr
                          key={item.product_id}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: item.selected ? '#f0fdf4' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <input
                              id={`checkbox-item-${item.product_id}`}
                              type="checkbox"
                              checked={!!item.selected}
                              onChange={() => toggleRadarItem(item.product_id)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.product_name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{item.product_code}</div>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#475569' }}>
                            {item.packing} ({item.unit})
                          </td>
                          <td style={{
                            padding: '10px 14px',
                            textAlign: 'right',
                            fontWeight: '700',
                            color: isCritical ? '#dc2626' : '#ea580c'
                          }}>
                            {item.current_stock}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#64748b' }}>
                            {item.min_stock_level}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>
                            {item.deficit_qty}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#1b4332' }}>
                            {item.suggested_order_qty}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#334155' }}>
                            ₹{item.p_rate.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                            ₹{item.estimated_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#1e293b' }}>
                            <button
                              id={`btn-view-vendor-rates-${item.product_id}`}
                              onClick={() => {
                                setSelectedProductForRates(item.product_id);
                                fetchVendorRates(item.product_id);
                                setActiveTab('rates');
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#1b4332',
                                fontWeight: '600',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                textAlign: 'left',
                                padding: 0
                              }}
                            >
                              {item.preferred_vendor_name}
                            </button>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: isCritical ? '#fee2e2' : '#fef3c7',
                              color: isCritical ? '#dc2626' : '#b45309'
                            }}>
                              {isCritical ? '0-STOCK' : 'REORDER'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: CREATE NEW PURCHASE ORDER ───────────────────────────── */}
        {activeTab === 'create' && (
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              padding: '20px'
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1b4332', marginTop: 0, marginBottom: '16px' }}>
                Purchase Order Specification
              </h2>

              {/* Order Header Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    PO Number
                  </label>
                  <input
                    id="input-po-number"
                    type="text"
                    value={poNumber}
                    onChange={e => setPoNumber(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    PO Date
                  </label>
                  <input
                    id="input-po-date"
                    type="date"
                    value={poDate}
                    onChange={e => setPoDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Supplier / Vendor
                  </label>
                  <select
                    id="select-po-vendor"
                    value={selectedVendorId}
                    onChange={e => setSelectedVendorId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px'
                    }}
                  >
                    <option value="">-- Choose Supplier --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.legal_name || v.trade_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Expected Delivery Date
                  </label>
                  <input
                    id="input-po-delivery"
                    type="date"
                    value={expectedDelivery}
                    onChange={e => setExpectedDelivery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px'
                    }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Supply Classification & Instructions
                  </label>
                  <input
                    id="input-po-supply-type"
                    type="text"
                    value={supplyClassification}
                    onChange={e => setSupplyClassification(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px'
                    }}
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div style={{
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '16px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', width: '45%' }}>Product Item</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', width: '18%' }}>Quantity</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', width: '18%' }}>Purchase Rate</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', width: '15%' }}>Line Total</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', width: '4%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 14px' }}>
                          <select
                            id={`select-po-product-${idx}`}
                            value={item.product_id}
                            onChange={e => updatePoItem(item.id, 'product_id', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              fontSize: '12px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px'
                            }}
                          >
                            <option value="">-- Select Product --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.code})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                          <input
                            id={`input-po-qty-${idx}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updatePoItem(item.id, 'quantity', e.target.value)}
                            style={{
                              width: '90px',
                              padding: '6px 8px',
                              fontSize: '12px',
                              textAlign: 'right',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                          <input
                            id={`input-po-rate-${idx}`}
                            type="number"
                            step="0.01"
                            value={item.rate}
                            onChange={e => updatePoItem(item.id, 'rate', e.target.value)}
                            style={{
                              width: '100px',
                              padding: '6px 8px',
                              fontSize: '12px',
                              textAlign: 'right',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                          ₹{Number(item.line_total).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                          <button
                            id={`btn-remove-po-row-${idx}`}
                            onClick={() => removePoItemRow(item.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Row Button & Financial Totals */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <button
                  id="btn-add-po-row"
                  onClick={addPoItemRow}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#1b4332',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={14} /> Add Line Item
                </button>

                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '14px 20px',
                  minWidth: '260px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: '#64748b' }}>Subtotal:</span>
                    <span style={{ fontWeight: '600' }}>₹{poSubtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: '#64748b' }}>GST (18% Estimated):</span>
                    <span style={{ fontWeight: '600' }}>₹{poGst.toFixed(2)}</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '15px',
                    fontWeight: '800',
                    color: '#1b4332',
                    borderTop: '1px solid #cbd5e1',
                    paddingTop: '8px',
                    marginTop: '6px'
                  }}>
                    <span>Grand Total:</span>
                    <span>₹{poGrandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  id="btn-save-purchase-order"
                  onClick={handleSavePurchaseOrder}
                  disabled={isSavingPo}
                  style={{
                    backgroundColor: '#1b4332',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '11px 24px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: isSavingPo ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(27,67,50,0.2)'
                  }}
                >
                  <CheckCircle2 size={16} />
                  {isSavingPo ? 'Saving Purchase Order...' : 'Submit & Approve Purchase Order [Enter]'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: VENDOR RATE INTELLIGENCE ────────────────────────────── */}
        {activeTab === 'rates' && (
          <div>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '16px 20px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                Select Product to Compare Suppliers:
              </span>
              <select
                id="select-rate-comparison-product"
                value={selectedProductForRates}
                onChange={e => {
                  setSelectedProductForRates(e.target.value);
                  fetchVendorRates(e.target.value);
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  minWidth: '320px'
                }}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) — Base P.Rate: ₹{p.p_rate}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor Comparative Matrix */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155' }}>Vendor / Distributor</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155' }}>GSTIN</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155', textAlign: 'right' }}>Offered Rate</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155', textAlign: 'right' }}>Discount %</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155', textAlign: 'right' }}>Net Effective Rate</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155', textAlign: 'center' }}>Credit Days</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155', textAlign: 'center' }}>Lead Time</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#334155', textAlign: 'center' }}>Optimization Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {ratesLoading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                        Loading supplier comparison quotes...
                      </td>
                    </tr>
                  ) : vendorRatesData.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        No supplier quotes found for the selected product.
                      </td>
                    </tr>
                  ) : (
                    vendorRatesData.map(v => (
                      <tr key={v.vendor_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>
                          {v.vendor_name}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>
                          {v.gst_number}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#334155' }}>
                          ₹{v.offered_rate.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                          {v.discount_percent}%
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: '#1b4332' }}>
                          ₹{v.net_effective_rate.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569' }}>
                          {v.payment_credit_days} Days
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569' }}>
                          {v.lead_time_days} Days
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            backgroundColor: v.optimization_badge === 'BEST_PRICE' ? '#dcfce7' : '#e0f2fe',
                            color: v.optimization_badge === 'BEST_PRICE' ? '#15803d' : '#0369a1'
                          }}>
                            {v.optimization_badge}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL 1: WHATSAPP / PRINT DISPATCH SLIP ───────────────────────── */}
      {activeDispatchPo && (
        <div
          id="modal-po-dispatch"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            maxWidth: '560px',
            width: '92%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#1b4332',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Share2 size={18} color="#52b788" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>
                  Supplier Dispatch Slip — {activeDispatchPo.po_number}
                </h3>
              </div>
              <button
                id="btn-close-dispatch-modal"
                onClick={() => setActiveDispatchPo(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: 0 }}>
                A structured procurement dispatch summary has been formatted for immediate communication with <strong>{activeDispatchPo.vendor_name || 'Vendor'}</strong>.
              </p>

              <textarea
                id="textarea-po-dispatch-text"
                readOnly
                value={getWhatsAppPayload(activeDispatchPo)}
                rows={9}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                  resize: 'none'
                }}
              />

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  id="btn-copy-po-whatsapp"
                  onClick={() => copyToClipboard(getWhatsAppPayload(activeDispatchPo))}
                  style={{
                    flex: 1,
                    backgroundColor: '#1b4332',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Share2 size={14} /> Copy WhatsApp Text
                </button>

                <a
                  id="btn-open-whatsapp-web"
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getWhatsAppPayload(activeDispatchPo))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    backgroundColor: '#25D366',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={14} /> Open in WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: PO-TO-PURCHASE CONVERSION CONFIRMATION ─────────────── */}
      {activeConvertPo && (
        <div
          id="modal-convert-po-purchase"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            maxWidth: '480px',
            width: '92%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#1b4332',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#52b788" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>
                  Convert PO to Inward Purchase Bill
                </h3>
              </div>
              <button
                id="btn-close-convert-modal"
                onClick={() => setActiveConvertPo(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {conversionMessage ? (
                <div style={{
                  padding: '14px',
                  backgroundColor: '#dcfce7',
                  border: '1px solid #86efac',
                  borderRadius: '6px',
                  color: '#15803d',
                  fontSize: '13px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  {conversionMessage}
                  <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>
                    Redirecting to Inward Purchase Desk...
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '13px', color: '#334155', marginTop: 0 }}>
                    Are you sure you want to book Goods Inward for Purchase Order <strong>{activeConvertPo.po_number}</strong>?
                  </p>
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    fontSize: '12px',
                    marginBottom: '16px'
                  }}>
                    <div><strong>Supplier:</strong> {activeConvertPo.vendor_name || 'Vendor'}</div>
                    <div style={{ marginTop: '4px' }}><strong>PO Value:</strong> ₹{Number(activeConvertPo.total_amount).toFixed(2)}</div>
                    <div style={{ marginTop: '4px' }}><strong>Target Bill:</strong> PUR-{activeConvertPo.po_number}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      id="btn-confirm-convert-po"
                      onClick={() => handleConvertToPurchaseBill(activeConvertPo)}
                      disabled={isConverting}
                      style={{
                        flex: 1,
                        backgroundColor: '#1b4332',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: isConverting ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isConverting ? 'Booking Inward...' : 'Confirm & Generate Purchase Bill'}
                    </button>
                    <button
                      id="btn-cancel-convert-modal"
                      onClick={() => setActiveConvertPo(null)}
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel [Esc]
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
