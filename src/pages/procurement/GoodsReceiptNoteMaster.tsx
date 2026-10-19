import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackageCheck, Clock, CheckCircle2, AlertTriangle, Search, Filter,
  RefreshCw, ArrowRight, Printer, Plus, Trash2, Calendar, FileText,
  Truck, ShieldCheck, Thermometer, Barcode, CheckSquare, X, ChevronRight,
  ExternalLink, Layers, DollarSign, User, ShieldAlert, Sparkles, Volume2
} from 'lucide-react';
import apiClient, {
  GoodsReceiptNoteRecord,
  GrnItem,
  GrnTelemetry,
  apiGetGrnTelemetry,
  apiGetPendingPurchaseOrders,
  apiGetGoodsReceiptNotes,
  apiCreateGoodsReceiptNote,
  apiUpdateGrnInspection,
  apiConvertGrnToPurchase
} from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';

export default function GoodsReceiptNoteMaster() {
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'register' | 'gate' | 'barcode' | 'qc'>('register');

  // Master Data
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pendingPOs, setPendingPOs] = useState<any[]>([]);

  // Telemetry
  const [telemetry, setTelemetry] = useState<GrnTelemetry>({
    total_grns: 0,
    pending_inspection: 0,
    inspected_accepted: 0,
    converted_to_purchase: 0,
    total_damaged_qty: 0,
    total_inward_value: 0
  });

  // Tab 1: Register State
  const [grnList, setGrnList] = useState<GoodsReceiptNoteRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [qcFilter, setQcFilter] = useState('ALL');

  // Tab 2: Gate Inward & PO Matcher State
  const [selectedPoId, setSelectedPoId] = useState('');
  const [gateVendorId, setGateVendorId] = useState('');
  const [gateEntryNumber, setGateEntryNumber] = useState(`GATE-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-01`);
  const [challanNumber, setChallanNumber] = useState('');
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNumber, setVehicleNumber] = useState('DL-01-AB-4421');
  const [receivedBy, setReceivedBy] = useState('Store Officer Rajesh K.');
  const [receivingTemp, setReceivingTemp] = useState('4.5');
  const [sealIntact, setSealIntact] = useState(true);
  const [gateItems, setGateItems] = useState<GrnItem[]>([
    {
      product_name: 'Amoxicillin 500mg Strip',
      ordered_qty: 100,
      challan_qty: 100,
      received_qty: 100,
      accepted_qty: 100,
      damaged_qty: 0,
      short_qty: 0,
      batch_number: 'AMX-2026-B1',
      expiry_date: '10/28',
      mrp: 85.00,
      purchase_rate: 42.50,
      line_total: 4250.00,
      quality_remarks: 'Primary packaging clean and intact'
    }
  ]);
  const [isSavingGate, setIsSavingGate] = useState(false);

  // Tab 3: Barcode Rapid Scanner Desk State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanHistory, setScanHistory] = useState<{ code: string; name: string; time: string; qty: number }[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Tab 4: Physical QC Desk State
  const [selectedGrnForQc, setSelectedGrnForQc] = useState<GoodsReceiptNoteRecord | null>(null);
  const [qcTemperature, setQcTemperature] = useState<number>(4.2);
  const [qcSealVerified, setQcSealVerified] = useState(true);
  const [qcItemsState, setQcItemsState] = useState<GrnItem[]>([]);
  const [qcOverallVerdict, setQcOverallVerdict] = useState<'ACCEPTED' | 'PARTIAL_ACCEPT' | 'REJECTED'>('ACCEPTED');
  const [qcRemarks, setQcRemarks] = useState('Passed standard organoleptic & temperature inward inspection.');
  const [isSubmittingQc, setIsSubmittingQc] = useState(false);

  // Modals
  const [inspectionModalGrn, setInspectionModalGrn] = useState<GoodsReceiptNoteRecord | null>(null);
  const [convertModalGrn, setConvertModalGrn] = useState<GoodsReceiptNoteRecord | null>(null);
  const [convertInvoiceNumber, setConvertInvoiceNumber] = useState('');
  const [convertCreditDays, setConvertCreditDays] = useState(30);
  const [convertGstRate, setConvertGstRate] = useState(18.00);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionSuccess, setConversionSuccess] = useState<string | null>(null);
  const [printModalGrn, setPrintModalGrn] = useState<GoodsReceiptNoteRecord | null>(null);

  const isAnyModalOpen = Boolean(inspectionModalGrn || convertModalGrn || printModalGrn);
  useReturnNavigation(isAnyModalOpen);

  // Keyboard Shortcuts (F1, F2, F3, F4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnyModalOpen) return;
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('register');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('gate');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('barcode');
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('qc');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnyModalOpen]);

  // Initial Data Fetch
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [telemRes, posRes, grnsRes, partiesRes, prodsRes] = await Promise.all([
        apiGetGrnTelemetry().catch(() => ({
          total_grns: 0, pending_inspection: 0, inspected_accepted: 0,
          converted_to_purchase: 0, total_damaged_qty: 0, total_inward_value: 0
        })),
        apiGetPendingPurchaseOrders().catch(() => []),
        apiGetGoodsReceiptNotes().catch(() => []),
        apiClient.get('/api/parties/?limit=100').then(r => r.data).catch(() => []),
        apiClient.get('/api/products/?limit=100').then(r => r.data).catch(() => [])
      ]);

      setTelemetry(telemRes);
      setPendingPOs(posRes);
      setGrnList(grnsRes);
      setVendors(partiesRes);
      setProducts(prodsRes);

      if (grnsRes.length > 0 && !selectedGrnForQc) {
        const pendingOne = grnsRes.find((g: GoodsReceiptNoteRecord) => g.inspection_status === 'PENDING_INSPECTION') || grnsRes[0];
        handleSelectGrnForQc(pendingOne);
      }
    } catch (err) {
      console.error('Failed to load GRN data', err);
    } finally {
      setLoading(false);
    }
  };

  // Sound feedback for scanner
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // Audio not permitted or supported
    }
  };

  // Tab 2: Handle PO Selection in Gate Matcher
  const handlePoSelect = (poId: string) => {
    setSelectedPoId(poId);
    const po = pendingPOs.find(p => p.id === poId);
    if (!po) return;

    setGateVendorId(po.vendor_id);
    const matchedItems: GrnItem[] = (po.items || []).map((item: any) => {
      const pendingQty = item.pending_qty > 0 ? item.pending_qty : item.ordered_qty;
      return {
        po_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        ordered_qty: item.ordered_qty,
        challan_qty: pendingQty,
        received_qty: pendingQty,
        accepted_qty: pendingQty,
        damaged_qty: 0,
        short_qty: 0,
        batch_number: `B-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        expiry_date: '12/28',
        mrp: Number(item.rate) * 1.5,
        purchase_rate: Number(item.rate),
        line_total: pendingQty * Number(item.rate),
        quality_remarks: 'Gate inward recorded from PO'
      };
    });

    if (matchedItems.length > 0) {
      setGateItems(matchedItems);
    }
  };

  const updateGateItem = (index: number, field: keyof GrnItem, value: any) => {
    const updated = [...gateItems];
    const item = { ...updated[index], [field]: value };

    // Auto-calculate short quantity
    if (field === 'challan_qty' || field === 'received_qty') {
      const cQty = Number(field === 'challan_qty' ? value : item.challan_qty) || 0;
      const rQty = Number(field === 'received_qty' ? value : item.received_qty) || 0;
      item.short_qty = Math.max(0, cQty - rQty);
      item.accepted_qty = rQty;
    }

    if (field === 'accepted_qty' || field === 'purchase_rate') {
      const aQty = Number(field === 'accepted_qty' ? value : item.accepted_qty) || 0;
      const rate = Number(field === 'purchase_rate' ? value : item.purchase_rate) || 0;
      item.line_total = aQty * rate;
    }

    updated[index] = item;
    setGateItems(updated);
  };

  const addManualGateItem = () => {
    setGateItems([
      ...gateItems,
      {
        product_name: '',
        ordered_qty: 0,
        challan_qty: 1,
        received_qty: 1,
        accepted_qty: 1,
        damaged_qty: 0,
        short_qty: 0,
        batch_number: `B-${Math.floor(1000 + Math.random() * 9000)}`,
        expiry_date: '12/28',
        mrp: 100,
        purchase_rate: 60,
        line_total: 60,
        quality_remarks: 'Direct gate inward'
      }
    ]);
  };

  const removeGateItem = (index: number) => {
    setGateItems(gateItems.filter((_, i) => i !== index));
  };

  // Submit Gate Inward GRN
  const handleSaveGateInward = async () => {
    if (!gateVendorId && !selectedPoId) {
      alert('Please select a Purchase Order or Supplier.');
      return;
    }
    if (gateItems.length === 0) {
      alert('Please include at least one inward item.');
      return;
    }

    setIsSavingGate(true);
    try {
      const payload = {
        grn_number: 'AUTO',
        date: new Date().toISOString(),
        po_id: selectedPoId || null,
        vendor_id: gateVendorId,
        challan_number: challanNumber || `CH-${Math.floor(100000 + Math.random() * 900000)}`,
        challan_date: challanDate ? new Date(challanDate).toISOString() : new Date().toISOString(),
        gate_entry_number: gateEntryNumber,
        vehicle_number: vehicleNumber,
        received_by: receivedBy,
        temperature_celsius: parseFloat(receivingTemp) || null,
        seal_intact: sealIntact,
        remarks: `Gate inward logged via PO Matcher. Gate pass: ${gateEntryNumber}`,
        items: gateItems.map(it => ({
          po_item_id: it.po_item_id || null,
          product_id: it.product_id || null,
          product_name: it.product_name,
          ordered_qty: Number(it.ordered_qty) || 0,
          challan_qty: Number(it.challan_qty) || 0,
          received_qty: Number(it.received_qty) || 0,
          accepted_qty: Number(it.accepted_qty) || 0,
          damaged_qty: Number(it.damaged_qty) || 0,
          short_qty: Number(it.short_qty) || 0,
          batch_number: it.batch_number || null,
          expiry_date: it.expiry_date || null,
          mrp: Number(it.mrp) || 0,
          purchase_rate: Number(it.purchase_rate) || 0,
          line_total: Number(it.line_total) || 0,
          quality_remarks: it.quality_remarks || null
        }))
      };

      const created = await apiCreateGoodsReceiptNote(payload);
      alert(`Gate Inward GRN #${created.grn_number} successfully registered!`);
      await loadAllData();
      setActiveTab('register');
    } catch (err: any) {
      alert(`Failed to save GRN: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsSavingGate(false);
    }
  };

  // Tab 3: Barcode Scan Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    playBeep();
    const code = barcodeInput.trim();
    // Match against products
    const matched = products.find(p => p.barcode === code || p.code === code || p.name.toLowerCase().includes(code.toLowerCase()));
    const productName = matched ? matched.name : `Scanned SKU (${code})`;

    setScanHistory(prev => [
      {
        code,
        name: productName,
        time: new Date().toLocaleTimeString(),
        qty: 1
      },
      ...prev.slice(0, 49)
    ]);

    // Also increment or add to gate items if on gate desk
    const existingIndex = gateItems.findIndex(it => it.product_name === productName);
    if (existingIndex >= 0) {
      updateGateItem(existingIndex, 'received_qty', (Number(gateItems[existingIndex].received_qty) || 0) + 1);
    } else {
      setGateItems(prev => [
        ...prev,
        {
          product_id: matched?.id || null,
          product_name: productName,
          ordered_qty: 0,
          challan_qty: 1,
          received_qty: 1,
          accepted_qty: 1,
          damaged_qty: 0,
          short_qty: 0,
          batch_number: `B-SCAN-${Math.floor(100 + Math.random() * 900)}`,
          expiry_date: '12/28',
          mrp: matched?.mrp || 120,
          purchase_rate: matched?.purchase_rate || 75,
          line_total: matched?.purchase_rate || 75,
          quality_remarks: 'Scanned at dock'
        }
      ]);
    }

    setBarcodeInput('');
  };

  // Tab 4: QC Desk Handler
  const handleSelectGrnForQc = (grn: GoodsReceiptNoteRecord) => {
    setSelectedGrnForQc(grn);
    setQcTemperature(grn.temperature_celsius ? Number(grn.temperature_celsius) : 4.2);
    setQcSealVerified(grn.seal_intact ?? true);
    setQcOverallVerdict(grn.inspection_status === 'PENDING_INSPECTION' ? 'ACCEPTED' : grn.inspection_status as any);
    setQcRemarks(grn.remarks || 'QC physical inspection completed.');
    setQcItemsState(
      (grn.items || []).map(it => ({
        ...it,
        accepted_qty: it.accepted_qty > 0 ? it.accepted_qty : it.received_qty,
        damaged_qty: it.damaged_qty || 0,
        short_qty: it.short_qty || 0
      }))
    );
  };

  const updateQcItem = (index: number, field: keyof GrnItem, value: any) => {
    const updated = [...qcItemsState];
    const item = { ...updated[index], [field]: value };

    if (field === 'damaged_qty') {
      const dmg = Number(value) || 0;
      const rec = Number(item.received_qty) || 0;
      item.accepted_qty = Math.max(0, rec - dmg);
    }
    if (field === 'accepted_qty') {
      const acc = Number(value) || 0;
      const rec = Number(item.received_qty) || 0;
      item.damaged_qty = Math.max(0, rec - acc);
    }

    updated[index] = item;
    setQcItemsState(updated);
  };

  const submitQcInspection = async () => {
    if (!selectedGrnForQc) return;

    setIsSubmittingQc(true);
    try {
      const payload = {
        temperature_celsius: qcTemperature,
        seal_intact: qcSealVerified,
        inspection_status: qcOverallVerdict,
        remarks: qcRemarks,
        items: qcItemsState.map(it => ({
          item_id: it.id,
          accepted_qty: Number(it.accepted_qty) || 0,
          damaged_qty: Number(it.damaged_qty) || 0,
          short_qty: Number(it.short_qty) || 0,
          batch_number: it.batch_number,
          expiry_date: it.expiry_date,
          mrp: Number(it.mrp) || 0,
          purchase_rate: Number(it.purchase_rate) || 0,
          quality_remarks: it.quality_remarks
        }))
      };

      await apiUpdateGrnInspection(selectedGrnForQc.id, payload);
      alert(`Physical QC Inspection recorded for GRN #${selectedGrnForQc.grn_number}!`);
      await loadAllData();
      if (inspectionModalGrn) {
        setInspectionModalGrn(null);
      }
    } catch (err: any) {
      alert(`QC update failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsSubmittingQc(false);
    }
  };

  // Convert to Purchase Bill
  const executeConvertToPurchase = async () => {
    if (!convertModalGrn) return;
    setIsConverting(true);
    setConversionSuccess(null);
    try {
      const res = await apiConvertGrnToPurchase(convertModalGrn.id, {
        invoice_number: convertInvoiceNumber || null,
        payment_terms_days: convertCreditDays,
        tax_rate: convertGstRate
      });
      setConversionSuccess(res.message);
      await loadAllData();
    } catch (err: any) {
      alert(`Conversion failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  // Filtered Register Data
  const filteredGrns = grnList.filter(grn => {
    const matchesSearch =
      (grn.grn_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (grn.vendor_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (grn.challan_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (grn.vehicle_number || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || grn.status === statusFilter;
    const matchesQc = qcFilter === 'ALL' || grn.inspection_status === qcFilter;

    return matchesSearch && matchesStatus && matchesQc;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* ── HEADER & NAVIGATION ────────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/po')}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Return to Purchase Orders (Esc)"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800">
                DOC-46 COMPLIANT
              </span>
              <span className="text-xs text-slate-400">Procurement &gt; Inward Receiving</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center space-x-2">
              <span>Goods Receipt Note (GRN) & Quality Inspection Desk</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-mono">
                /grn
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            id="btn-new-gate-inward"
            onClick={() => setActiveTab('gate')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-900/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Gate Inward [F2]</span>
          </button>
        </div>
      </header>

      {/* ── 4 TELEMETRY SCORECARDS ─────────────────────────────────────────── */}
      <section className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/40 border-b border-slate-800/80">
        {/* Card 1: Total Inward Value */}
        <div id="card-grn-total" className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Inward GRNs</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{telemetry.total_grns}</span>
            <span className="text-xs text-slate-400">receipts</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>Inward Value:</span>
            <span className="font-mono text-cyan-400 font-semibold">₹{telemetry.total_inward_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Card 2: Gate Pending QC */}
        <div id="card-grn-pending" className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Gate Inward / QC Pending</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-amber-400">{telemetry.pending_inspection}</span>
            <span className="text-xs text-amber-400/70">awaiting inspection</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            <span>Tamper seal & cold-chain pending</span>
          </div>
        </div>

        {/* Card 3: Inspected & Passed */}
        <div id="card-grn-accepted" className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Inspected & Accepted</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-400">{telemetry.inspected_accepted}</span>
            <span className="text-xs text-emerald-400/70">passed QC</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>GL Converted:</span>
            <span className="font-mono text-emerald-300 font-medium">{telemetry.converted_to_purchase} bills</span>
          </div>
        </div>

        {/* Card 4: Quarantined & Damaged */}
        <div id="card-grn-damaged" className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Quarantine & Damaged Units</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-rose-400">{telemetry.total_damaged_qty}</span>
            <span className="text-xs text-rose-400/70">units isolated</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            <span>Auto-routed to Breakage/Expiry Ledger</span>
          </div>
        </div>
      </section>

      {/* ── 4 OPERATIONAL TABS HEADER ──────────────────────────────────────── */}
      <div className="px-6 border-b border-slate-800 bg-slate-900/70 flex items-center space-x-1">
        <button
          id="tab-grn-register"
          onClick={() => setActiveTab('register')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-xs transition ${
            activeTab === 'register'
              ? 'border-cyan-500 text-cyan-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>[F1] Master Inward Register</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
            {grnList.length}
          </span>
        </button>

        <button
          id="tab-grn-gate"
          onClick={() => setActiveTab('gate')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-xs transition ${
            activeTab === 'gate'
              ? 'border-cyan-500 text-cyan-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>[F2] Gate Inward & PO Matcher</span>
        </button>

        <button
          id="tab-grn-barcode"
          onClick={() => {
            setActiveTab('barcode');
            setTimeout(() => barcodeInputRef.current?.focus(), 100);
          }}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-xs transition ${
            activeTab === 'barcode'
              ? 'border-cyan-500 text-cyan-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Barcode className="w-3.5 h-3.5" />
          <span>[F3] Barcode Rapid Scanner Desk</span>
        </button>

        <button
          id="tab-grn-qc"
          onClick={() => setActiveTab('qc')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-xs transition ${
            activeTab === 'qc'
              ? 'border-cyan-500 text-cyan-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Thermometer className="w-3.5 h-3.5" />
          <span>[F4] Physical Quality & Cold-Chain Desk</span>
        </button>
      </div>

      {/* ── TAB CONTENT BODY ───────────────────────────────────────────────── */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* ================================================================= */}
        {/* TAB 1: MASTER INWARD REGISTER                                     */}
        {/* ================================================================= */}
        {activeTab === 'register' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2 flex-1 min-w-[280px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by GRN#, Vendor, Delivery Challan, Vehicle..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-400">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ALL">All Status</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="CONVERTED_TO_PURCHASE">CONVERTED_TO_PURCHASE</option>
                  </select>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-400">QC Status:</span>
                  <select
                    value={qcFilter}
                    onChange={e => setQcFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ALL">All QC Status</option>
                    <option value="PENDING_INSPECTION">PENDING_INSPECTION</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="PARTIAL_ACCEPT">PARTIAL_ACCEPT</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
              </div>
            </div>

            {/* GRN Enterprise Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/70 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">GRN Number</th>
                    <th className="py-3 px-4">Inward Date & Gate Pass</th>
                    <th className="py-3 px-4">Vendor & PO Link</th>
                    <th className="py-3 px-4">Cold-Chain & Seal</th>
                    <th className="py-3 px-4">QC Verdict</th>
                    <th className="py-3 px-4 text-right">Inward Amount</th>
                    <th className="py-3 px-4 text-center">GL Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredGrns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No Goods Receipt Notes found. Click "New Gate Inward [F2]" to register receiving dock inward.
                      </td>
                    </tr>
                  ) : (
                    filteredGrns.map(grn => {
                      const temp = grn.temperature_celsius ? Number(grn.temperature_celsius) : null;
                      const isColdChainOk = temp === null || temp <= 8.0;

                      return (
                        <tr key={grn.id} className="hover:bg-slate-800/40 transition group">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-cyan-400">{grn.grn_number}</span>
                            <div className="text-[11px] text-slate-400">
                              Challan: <span className="font-mono text-slate-300">{grn.challan_number || 'N/A'}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-slate-200">
                              {new Date(grn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {grn.gate_entry_number || 'N/A'} | {grn.vehicle_number || 'N/A'}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{grn.vendor_name || 'Vendor'}</div>
                            <div className="text-[11px] text-slate-400">
                              {grn.po_number ? (
                                <span className="font-mono text-indigo-400">PO: {grn.po_number}</span>
                              ) : (
                                <span className="text-slate-500">Direct Inward</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-1.5">
                              {temp !== null ? (
                                <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold ${
                                  isColdChainOk ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                                }`}>
                                  {temp.toFixed(1)}°C
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">Ambient</span>
                              )}

                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                grn.seal_intact ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                              }`}>
                                {grn.seal_intact ? 'Seal OK' : 'Tampered'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                              grn.inspection_status === 'ACCEPTED'
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                                : grn.inspection_status === 'PARTIAL_ACCEPT'
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                                : grn.inspection_status === 'REJECTED'
                                ? 'bg-rose-950/80 text-rose-400 border border-rose-800'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {grn.inspection_status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="font-mono font-bold text-white">
                              ₹{Number(grn.total_received_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {(grn.items || []).length} SKU lines
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              grn.status === 'CONVERTED_TO_PURCHASE'
                                ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700'
                                : grn.status === 'VERIFIED'
                                ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {grn.status}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => {
                                  handleSelectGrnForQc(grn);
                                  setInspectionModalGrn(grn);
                                }}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 text-[11px] font-medium transition"
                                title="Run QC Checklist"
                              >
                                QC
                              </button>

                              <button
                                onClick={() => {
                                  setConvertModalGrn(grn);
                                  setConvertInvoiceNumber(`PUR-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.floor(1000 + Math.random() * 9000)}`);
                                }}
                                disabled={grn.status === 'CONVERTED_TO_PURCHASE'}
                                className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                                  grn.status === 'CONVERTED_TO_PURCHASE'
                                    ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                                    : 'bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 hover:text-emerald-300 border border-emerald-800'
                                }`}
                                title="Convert to General Ledger Purchase Bill"
                              >
                                Convert
                              </button>

                              <button
                                onClick={() => setPrintModalGrn(grn)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                                title="Print GRN Slip Preview"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
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

        {/* ================================================================= */}
        {/* TAB 2: GATE INWARD & PO MATCHER                                   */}
        {/* ================================================================= */}
        {activeTab === 'gate' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Top Control Strip */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center space-x-2">
                <Truck className="w-4 h-4 text-cyan-400" />
                <span>Receiving Dock Inward & Purchase Order Matcher</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Select Approved Purchase Order</label>
                  <select
                    value={selectedPoId}
                    onChange={e => handlePoSelect(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Manual Direct Inward (No PO) --</option>
                    {pendingPOs.map(po => (
                      <option key={po.id} value={po.id}>
                        {po.po_number} - {po.vendor_name} ({po.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Supplier / Vendor</label>
                  <select
                    value={gateVendorId}
                    onChange={e => setGateVendorId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Choose Vendor --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Gate Entry Pass Number</label>
                  <input
                    type="text"
                    value={gateEntryNumber}
                    onChange={e => setGateEntryNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Vehicle Registration Number</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={e => setVehicleNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Delivery Challan / Invoice #</label>
                  <input
                    type="text"
                    value={challanNumber}
                    placeholder="e.g. DC-98421"
                    onChange={e => setChallanNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Challan Date</label>
                  <input
                    type="date"
                    value={challanDate}
                    onChange={e => setChallanDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Receiving Officer</label>
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={e => setReceivedBy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <div className="flex-1">
                    <label className="block text-slate-400 text-[11px] mb-0.5">Cold-Chain Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={receivingTemp}
                      onChange={e => setReceivingTemp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <label className="flex items-center space-x-2 cursor-pointer mt-3">
                    <input
                      type="checkbox"
                      checked={sealIntact}
                      onChange={e => setSealIntact(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300 font-medium">Seal Intact</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 shadow space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Inward Items Verification & Shortage Calculation</span>
                </h3>

                <button
                  onClick={addManualGateItem}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 min-w-[180px]">Product Description</th>
                      <th className="py-2.5 px-3 w-20 text-center">PO Qty</th>
                      <th className="py-2.5 px-3 w-24 text-center">Challan Qty</th>
                      <th className="py-2.5 px-3 w-24 text-center">Received Qty</th>
                      <th className="py-2.5 px-3 w-20 text-center">Short Qty</th>
                      <th className="py-2.5 px-3 w-28">Batch No.</th>
                      <th className="py-2.5 px-3 w-20">Expiry</th>
                      <th className="py-2.5 px-3 w-24 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-3 w-28 text-right">Total (₹)</th>
                      <th className="py-2.5 px-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {gateItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.product_name}
                            onChange={e => updateGateItem(idx, 'product_name', e.target.value)}
                            placeholder="Product name"
                            className="w-full bg-slate-950 border border-slate-700/60 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </td>

                        <td className="py-2 px-3 text-center font-mono text-slate-400">
                          {item.ordered_qty}
                        </td>

                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            value={item.challan_qty}
                            onChange={e => updateGateItem(idx, 'challan_qty', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700/60 rounded px-2 py-1 text-xs text-center font-mono text-white focus:outline-none focus:border-cyan-500"
                          />
                        </td>

                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            value={item.received_qty}
                            onChange={e => updateGateItem(idx, 'received_qty', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700/60 rounded px-2 py-1 text-xs text-center font-mono text-emerald-400 font-bold focus:outline-none focus:border-cyan-500"
                          />
                        </td>

                        <td className="py-2 px-3 text-center">
                          <span className={`font-mono font-bold ${item.short_qty > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                            {item.short_qty}
                          </span>
                        </td>

                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.batch_number || ''}
                            onChange={e => updateGateItem(idx, 'batch_number', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700/60 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        </td>

                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.expiry_date || ''}
                            placeholder="MM/YY"
                            onChange={e => updateGateItem(idx, 'expiry_date', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700/60 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        </td>

                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="0.01"
                            value={item.purchase_rate}
                            onChange={e => updateGateItem(idx, 'purchase_rate', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700/60 rounded px-2 py-1 text-xs text-right font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        </td>

                        <td className="py-2 px-3 text-right font-mono font-semibold text-white">
                          ₹{(Number(item.line_total) || 0).toFixed(2)}
                        </td>

                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => removeGateItem(idx)}
                            className="text-slate-500 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Summary Strip & Action */}
              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-800 text-xs">
                <div className="flex items-center space-x-6 text-slate-400 font-mono">
                  <span>Lines: <strong className="text-white">{gateItems.length}</strong></span>
                  <span>Total Challan Qty: <strong className="text-white">{gateItems.reduce((acc, it) => acc + (Number(it.challan_qty) || 0), 0)}</strong></span>
                  <span>Total Received Qty: <strong className="text-emerald-400">{gateItems.reduce((acc, it) => acc + (Number(it.received_qty) || 0), 0)}</strong></span>
                  <span>Total Shortage: <strong className="text-rose-400">{gateItems.reduce((acc, it) => acc + (Number(it.short_qty) || 0), 0)}</strong></span>
                  <span>Total Value: <strong className="text-cyan-400">₹{gateItems.reduce((acc, it) => acc + (Number(it.line_total) || 0), 0).toFixed(2)}</strong></span>
                </div>

                <button
                  onClick={handleSaveGateInward}
                  disabled={isSavingGate}
                  className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition disabled:opacity-50"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>{isSavingGate ? 'Saving Inward...' : 'Confirm & Save Gate Inward'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: BARCODE RAPID SCANNER DESK                                 */}
        {/* ================================================================= */}
        {activeTab === 'barcode' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Rapid Scanner Input Card */}
            <div className="bg-slate-900/80 p-6 rounded-2xl border border-cyan-500/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <Barcode className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Rapid Barcode Dock Scanner</h2>
                    <p className="text-xs text-slate-400">Scan GS1-128, EAN-13, or Pharma 2D DataMatrix directly at the receiving dock</p>
                  </div>
                </div>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    soundEnabled
                      ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{soundEnabled ? 'Chirp On' : 'Muted'}</span>
                </button>
              </div>

              <form onSubmit={handleBarcodeSubmit} className="relative">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode or press Enter..."
                  autoFocus
                  className="w-full bg-slate-950 border-2 border-cyan-500/50 rounded-xl px-5 py-3.5 text-base font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400 shadow-inner"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 bottom-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center space-x-1"
                >
                  <span>Register Scan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Scan History Feed */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider">Live Dock Scanning Stream</span>
                <span>{scanHistory.length} items logged</span>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {scanHistory.length === 0 ? (
                  <div className="py-12 text-center text-slate-600 text-xs">
                    No scans registered in this session. Focus the input above and trigger your barcode handheld scanner.
                  </div>
                ) : (
                  scanHistory.map((scan, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-cyan-800 transition"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                          {scan.code}
                        </span>
                        <span className="text-xs font-medium text-white">{scan.name}</span>
                      </div>

                      <div className="flex items-center space-x-4 text-xs font-mono">
                        <span className="text-emerald-400 font-bold">+{scan.qty} unit</span>
                        <span className="text-slate-500">{scan.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: PHYSICAL QUALITY & COLD-CHAIN DESK                         */}
        {/* ================================================================= */}
        {activeTab === 'qc' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* GRN Selection & Cold Chain Monitor */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Select GRN to Inspect */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Select Goods Receipt Note
                </label>
                <select
                  value={selectedGrnForQc?.id || ''}
                  onChange={e => {
                    const found = grnList.find(g => g.id === e.target.value);
                    if (found) handleSelectGrnForQc(found);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {grnList.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.grn_number} - {g.vendor_name || 'Vendor'} ({g.inspection_status})
                    </option>
                  ))}
                </select>

                {selectedGrnForQc && (
                  <div className="text-[11px] space-y-1 text-slate-400 pt-2 border-t border-slate-800">
                    <div>Gate Pass: <span className="font-mono text-slate-300">{selectedGrnForQc.gate_entry_number || 'N/A'}</span></div>
                    <div>Vehicle: <span className="font-mono text-slate-300">{selectedGrnForQc.vehicle_number || 'N/A'}</span></div>
                    <div>Status: <span className="font-mono text-cyan-400">{selectedGrnForQc.status}</span></div>
                  </div>
                )}
              </div>

              {/* Cold-Chain Thermometer Widget */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Cold-Chain Monitor</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    Standard: 2.0°C – 8.0°C
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-3xl font-black font-mono text-cyan-400">
                    {qcTemperature.toFixed(1)}°C
                  </div>
                  <input
                    type="range"
                    min="-5"
                    max="30"
                    step="0.1"
                    value={qcTemperature}
                    onChange={e => setQcTemperature(parseFloat(e.target.value))}
                    className="flex-1 accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div className="text-[11px] flex items-center justify-between">
                  <span className="text-slate-400">Compliance Status:</span>
                  <span className={`font-semibold ${
                    qcTemperature >= 2.0 && qcTemperature <= 8.0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}>
                    {qcTemperature >= 2.0 && qcTemperature <= 8.0
                      ? 'VALID (Within Cold-Chain Limit)'
                      : 'BREACH (Temperature Exceeded)'}
                  </span>
                </div>
              </div>

              {/* Tamper Seal & QC Verdict Widget */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tamper & Overall Verdict</span>
                </span>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qcSealVerified}
                      onChange={e => setQcSealVerified(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-cyan-500"
                    />
                    <span>Tamper Seal Verified</span>
                  </label>

                  <select
                    value={qcOverallVerdict}
                    onChange={e => setQcOverallVerdict(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="PARTIAL_ACCEPT">PARTIAL_ACCEPT</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <input
                  type="text"
                  value={qcRemarks}
                  onChange={e => setQcRemarks(e.target.value)}
                  placeholder="QC inspection findings & notes..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Item-level Inspection Disposition */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 shadow space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Item Quality Disposition & Damage Isolation
                </h3>
                <span className="text-xs text-slate-400">
                  Damaged units will automatically be segregated from sellable stock into Quarantined Breakage Ledger
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Product Description</th>
                      <th className="py-2.5 px-3 w-24 text-center">Received Qty</th>
                      <th className="py-2.5 px-3 w-28 text-center">Accepted Qty</th>
                      <th className="py-2.5 px-3 w-28 text-center">Damaged / Leak</th>
                      <th className="py-2.5 px-3 w-24 text-center">Short Qty</th>
                      <th className="py-2.5 px-3 w-28">Batch</th>
                      <th className="py-2.5 px-3 w-20">Expiry</th>
                      <th className="py-2.5 px-3 min-w-[200px]">QC Defect Reason / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {qcItemsState.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-medium text-white">
                          {item.product_name}
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-300">
                          {item.received_qty}
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            max={item.received_qty}
                            value={item.accepted_qty}
                            onChange={e => updateQcItem(idx, 'accepted_qty', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center font-mono font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            max={item.received_qty}
                            value={item.damaged_qty}
                            onChange={e => updateQcItem(idx, 'damaged_qty', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {item.short_qty}
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.batch_number || ''}
                            onChange={e => updateQcItem(idx, 'batch_number', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.expiry_date || ''}
                            onChange={e => updateQcItem(idx, 'expiry_date', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.quality_remarks || ''}
                            onChange={e => updateQcItem(idx, 'quality_remarks', e.target.value)}
                            placeholder="e.g. 2 vials shattered in transit"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Submit QC Verdict Button */}
              <div className="flex items-center justify-end pt-3">
                <button
                  onClick={submitQcInspection}
                  disabled={isSubmittingQc || !selectedGrnForQc}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 transition disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmittingQc ? 'Submitting QC Verdict...' : 'Submit Physical QC & Cold-Chain Verdict'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL 1: QUALITY INSPECTION MODAL ─────────────────────────────── */}
      {inspectionModalGrn && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Physical Quality Inspection & Cold-Chain Certification</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">GRN #{inspectionModalGrn.grn_number} | {inspectionModalGrn.vendor_name || 'Vendor'}</p>
              </div>
              <button
                onClick={() => setInspectionModalGrn(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">Cold-Chain Temperature (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={qcTemperature}
                  onChange={e => setQcTemperature(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-cyan-400 font-mono font-bold"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcSealVerified}
                    onChange={e => setQcSealVerified(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                  />
                  <span className="font-medium text-slate-200">Tamper Seal Verified & Intact</span>
                </label>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">QC Decision</span>
                <select
                  value={qcOverallVerdict}
                  onChange={e => setQcOverallVerdict(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-bold"
                >
                  <option value="ACCEPTED">ACCEPTED</option>
                  <option value="PARTIAL_ACCEPT">PARTIAL_ACCEPT</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Item Dispositions</h4>
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase">
                    <tr>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3 text-center">Received</th>
                      <th className="py-2 px-3 text-center">Accepted</th>
                      <th className="py-2 px-3 text-center">Damaged</th>
                      <th className="py-2 px-3">Batch</th>
                      <th className="py-2 px-3">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {qcItemsState.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 text-white">{it.product_name}</td>
                        <td className="py-2 px-3 text-center font-mono">{it.received_qty}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={it.accepted_qty}
                            onChange={e => updateQcItem(idx, 'accepted_qty', e.target.value)}
                            className="w-16 mx-auto block bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-emerald-400 font-bold"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={it.damaged_qty}
                            onChange={e => updateQcItem(idx, 'damaged_qty', e.target.value)}
                            className="w-16 mx-auto block bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-rose-400 font-bold"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={it.batch_number || ''}
                            onChange={e => updateQcItem(idx, 'batch_number', e.target.value)}
                            className="w-24 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-slate-200"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={it.expiry_date || ''}
                            onChange={e => updateQcItem(idx, 'expiry_date', e.target.value)}
                            className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-slate-200"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setInspectionModalGrn(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitQcInspection}
                disabled={isSubmittingQc}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40"
              >
                {isSubmittingQc ? 'Submitting...' : 'Confirm QC Certification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CONVERT TO PURCHASE BILL MODAL ───────────────────────── */}
      {convertModalGrn && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Convert GRN to Purchase Bill</span>
              </h3>
              <button
                onClick={() => {
                  setConvertModalGrn(null);
                  setConversionSuccess(null);
                }}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {conversionSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-xs text-emerald-200 font-medium">{conversionSuccess}</p>
                <button
                  onClick={() => {
                    setConvertModalGrn(null);
                    setConversionSuccess(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Close & Done
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-slate-400">Target Goods Receipt Note:</div>
                  <div className="font-mono text-cyan-400 font-bold">{convertModalGrn.grn_number}</div>
                  <div className="text-slate-400">Vendor: <span className="text-white font-medium">{convertModalGrn.vendor_name || 'Vendor'}</span></div>
                  <div className="text-slate-400">Inward Value: <span className="font-mono text-emerald-400 font-bold">₹{Number(convertModalGrn.total_received_amount).toFixed(2)}</span></div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Purchase Invoice Number</label>
                  <input
                    type="text"
                    value={convertInvoiceNumber}
                    onChange={e => setConvertInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Credit Days</label>
                    <input
                      type="number"
                      value={convertCreditDays}
                      onChange={e => setConvertCreditDays(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">GST Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={convertGstRate}
                      onChange={e => setConvertGstRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/80 text-[11px] text-indigo-300">
                  Converting automatically posts to the General Ledger and increments physical batch inventory for saleable stock.
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setConvertModalGrn(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeConvertToPurchase}
                    disabled={isConverting}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/40"
                  >
                    {isConverting ? 'Posting Bill...' : 'Generate Purchase Bill'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 3: PRINTABLE GRN SLIP PREVIEW ────────────────────────────── */}
      {printModalGrn && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 space-y-6 shadow-2xl">
            {/* Print Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-wide text-slate-950">
                  Goods Receipt Note (GRN) & Inward Slip
                </h2>
                <p className="text-xs text-slate-500">Pharma ERP Dock Logistics & Quality Inspection Certification</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-base font-bold text-slate-800">{printModalGrn.grn_number}</span>
                <p className="text-xs text-slate-500">Date: {new Date(printModalGrn.date).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Inward Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <div><strong>Supplier:</strong> {printModalGrn.vendor_name || 'Vendor'}</div>
                <div><strong>PO Link:</strong> {printModalGrn.po_number || 'Direct Inward'}</div>
                <div><strong>Challan / Inv #:</strong> {printModalGrn.challan_number || 'N/A'}</div>
              </div>
              <div>
                <div><strong>Gate Entry Pass:</strong> {printModalGrn.gate_entry_number || 'N/A'}</div>
                <div><strong>Vehicle Number:</strong> {printModalGrn.vehicle_number || 'N/A'}</div>
                <div><strong>Receiving Officer:</strong> {printModalGrn.received_by || 'Store Officer'}</div>
              </div>
            </div>

            {/* Cold Chain Certification Strip */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs">
              <div>
                <strong>Cold-Chain Temp:</strong> {printModalGrn.temperature_celsius ? `${printModalGrn.temperature_celsius}°C` : 'Ambient'}
              </div>
              <div>
                <strong>Tamper Seal:</strong> {printModalGrn.seal_intact ? 'VERIFIED INTACT' : 'TAMPERED / BROKEN'}
              </div>
              <div>
                <strong>QC Verdict:</strong> <span className="font-bold text-emerald-700">{printModalGrn.inspection_status}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 uppercase text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3 text-center">Challan</th>
                    <th className="py-2 px-3 text-center">Received</th>
                    <th className="py-2 px-3 text-center">Accepted</th>
                    <th className="py-2 px-3 text-center">Damaged</th>
                    <th className="py-2 px-3">Batch & Expiry</th>
                    <th className="py-2 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(printModalGrn.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-medium text-slate-800">{it.product_name}</td>
                      <td className="py-2 px-3 text-center font-mono">{it.challan_qty}</td>
                      <td className="py-2 px-3 text-center font-mono">{it.received_qty}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">{it.accepted_qty}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-rose-700">{it.damaged_qty}</td>
                      <td className="py-2 px-3 font-mono">{it.batch_number || 'N/A'} ({it.expiry_date || 'N/A'})</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">₹{Number(it.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs text-slate-600 border-t border-slate-200">
              <div>
                <div className="border-t border-slate-400 pt-1 font-semibold">Security Gate Officer</div>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1 font-semibold">Quality Inspection Officer</div>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1 font-semibold">Warehouse General Manager</div>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setPrintModalGrn(null)}
                className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
