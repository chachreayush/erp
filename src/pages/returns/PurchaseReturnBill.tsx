import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  RotateCcw, Save, Plus, Trash2, ArrowLeft, Search, FileText, 
  Calendar, Building2, AlertTriangle, CheckCircle, ShieldAlert, 
  Layers, Package, Hash, HelpCircle, Eye, ListFilter, ArrowRight,
  TrendingDown, Check, RefreshCw, FileCheck, Info, X
} from 'lucide-react';
import apiClient from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import PurchaseReturnList from './PurchaseReturnList';

// Alphanumeric series continuation helper (Marg & Tally style)
const incrementSeries = (str: string): string => {
  if (!str) return 'DN-0001';
  const match = str.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const nextNum = parseInt(numStr, 10) + 1;
    const padded = nextNum.toString().padStart(numStr.length, '0');
    return `${prefix}${padded}`;
  }
  return `${str}-0001`;
};

// Types for return item lines
export interface ReturnLineItem {
  id: string | number;
  product_id?: string;
  product_name: string;
  batch: string;
  expiry: string;
  inward_qty: number;
  quantity: number; // Return Units
  rate: number;
  mrp: number;
  discount_percent: number;
  igst_percent: number;
  line_total: number;
  disposition: 'saleable' | 'breakage' | 'expiry';
  source_invoice_item_id?: string;
  source_invoice_no?: string;
}

const VENDOR_RETURN_REASONS = [
  'Breakage / Transit Damage',
  'Expired Goods Return to Supplier',
  'Near-Expiry Recall (< 3 Months)',
  'Excess Supply / Wrong Item Received',
  'Rate Difference / Price Slip Adjustment',
  'Batch Recall by Manufacturer',
  'Quality / Lab Test Failed'
];

export default function PurchaseReturnBill() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = searchParams.get('view'); // 'list' or null

  // Navigation hook with dirty check
  const [isDirty, setIsDirty] = useState(false);
  useReturnNavigation(isDirty);

  // Return mode: 'bill' (Against Inward Bill) vs 'direct' (Direct Supplier Return)
  const [returnMode, setReturnMode] = useState<'bill' | 'direct'>('bill');

  // Header state & series continuation
  const [debitNoteNumber, setDebitNoteNumber] = useState(() => {
    return localStorage.getItem('erp_series_purchase_return') || 'DN-0001';
  });
  const userModifiedSeriesRef = useRef(false);
  const [isCustomSeries, setIsCustomSeries] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reasonCode, setReasonCode] = useState(VENDOR_RETURN_REASONS[0]);
  const [remarks, setRemarks] = useState('');

  // Supplier state
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  const [supplierDetails, setSupplierDetails] = useState<any | null>(null);

  // Inward Purchase Bills for "Against Bill" Mode
  const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState('');
  const [selectedInvoiceDate, setSelectedInvoiceDate] = useState('');
  const [showBillPickerModal, setShowBillPickerModal] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Master products for Direct Return
  const [productsList, setProductsList] = useState<any[]>([]);

  // Line items state
  const [items, setItems] = useState<ReturnLineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load suppliers, products, and check latest DB invoice series on mount
  useEffect(() => {
    const initMasterData = async () => {
      try {
        const [partiesRes, prodsRes, lastInvsRes] = await Promise.all([
          apiClient.get('/api/parties/').catch(() => apiClient.get('/api/master/parties')),
          apiClient.get('/api/products/'),
          apiClient.get('/api/sales/invoices?invoice_type=purchase-return&limit=1').catch(() => ({ data: [] }))
        ]);
        
        const rawParties = partiesRes.data || [];
        setSuppliers(rawParties);
        setProductsList(prodsRes.data || []);

        // Only suggest DB series if user has not actively edited the input field
        const pastInvs = lastInvsRes.data || [];
        if (!userModifiedSeriesRef.current && pastInvs.length > 0 && !localStorage.getItem('erp_series_purchase_return')) {
          const nextSuggested = incrementSeries(pastInvs[0].invoice_number);
          setDebitNoteNumber(nextSuggested);
          localStorage.setItem('erp_series_purchase_return', nextSuggested);
        }
      } catch (err) {
        console.error('Failed to load master data for Debit Note:', err);
      }
    };
    initMasterData();
  }, []);

  // When supplier changes, query their past purchase invoices
  useEffect(() => {
    if (!selectedSupplierName) {
      setSupplierInvoices([]);
      return;
    }
    const loadSupplierBills = async () => {
      setLoadingInvoices(true);
      try {
        // Query invoices for supplier
        const res = await apiClient.get(`/api/sales/invoices/by-supplier/${encodeURIComponent(selectedSupplierName.trim())}`);
        setSupplierInvoices(res.data || []);
      } catch (err) {
        console.error('Failed to load supplier invoices:', err);
      } finally {
        setLoadingInvoices(false);
      }
    };
    loadSupplierBills();
  }, [selectedSupplierName]);

  // Handle supplier selection
  const handleSelectSupplier = (party: any) => {
    setSelectedSupplierId(party.id);
    const name = party.legal_name || party.trade_name || party.name || '';
    setSelectedSupplierName(name);
    setSupplierDetails(party);
    setItems([]);
    setSelectedInvoiceId('');
    setSelectedInvoiceNo('');
    setIsDirty(true);
  };

  // Populate items from selected inward purchase invoice
  const handleSelectInvoiceToReturn = (inv: any) => {
    setSelectedInvoiceId(inv.id);
    setSelectedInvoiceNo(inv.invoice_number);
    setSelectedInvoiceDate(inv.date ? inv.date.split('T')[0] : '');
    
    // Map bill items into return lines
    const returnLines: ReturnLineItem[] = (inv.items || []).map((it: any) => {
      const alreadyReturned = it.returned_qty || 0;
      const maxReturnable = Math.max(0, it.quantity - alreadyReturned);
      const rate = Number(it.rate) || 0;
      const mrp = Number(it.mrp) || rate;
      const disc = Number(it.discount_percent) || 0;
      const igst = Number(it.igst_percent) || 12;
      const lineTotal = maxReturnable * rate * (1 - disc / 100);

      return {
        id: Math.random().toString(36).substring(7),
        product_id: it.product_id,
        product_name: it.product_name,
        batch: it.batch || 'DEFAULT',
        expiry: it.expiry || '12/28',
        inward_qty: it.quantity,
        quantity: maxReturnable,
        rate: rate,
        mrp: mrp,
        discount_percent: disc,
        igst_percent: igst,
        line_total: lineTotal,
        disposition: 'breakage', // default to breakage/quarantine for supplier return
        source_invoice_item_id: it.id,
        source_invoice_no: inv.invoice_number
      };
    });

    setItems(returnLines);
    setShowBillPickerModal(false);
    setIsDirty(true);
    setTimeout(() => {
      const firstInput = document.getElementById('return-qty-0') as HTMLInputElement | null;
      firstInput?.focus();
      firstInput?.select();
    }, 60);
  };

  // Add manual empty line for Direct Return
  const addManualRow = () => {
    const newLine: ReturnLineItem = {
      id: Math.random().toString(36).substring(7),
      product_id: '',
      product_name: '',
      batch: 'B-' + Math.floor(1000 + Math.random() * 9000),
      expiry: '12/28',
      inward_qty: 0,
      quantity: 1,
      rate: 100,
      mrp: 120,
      discount_percent: 0,
      igst_percent: 12,
      line_total: 100,
      disposition: 'breakage'
    };
    setItems([...items, newLine]);
    setIsDirty(true);
  };

  // Update a field in a line item
  const updateLineItem = (id: string | number, field: keyof ReturnLineItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Product change in direct mode
        if (field === 'product_id') {
          const prod = productsList.find(p => p.id === value);
          if (prod) {
            updated.product_name = prod.name;
            updated.rate = prod.p_rate || prod.rate_a || 100;
            updated.mrp = prod.mrp || (updated.rate * 1.2);
            updated.igst_percent = prod.igst_percent || 12;
          }
        }

        // Clamp return qty to inward qty if linked to bill
        if (field === 'quantity' && returnMode === 'bill' && item.inward_qty > 0) {
          const num = Number(value) || 0;
          if (num > item.inward_qty) {
            alert(`Return units (${num}) cannot exceed original inward units (${item.inward_qty})`);
            updated.quantity = item.inward_qty;
          }
        }

        // Recompute line total
        const qty = Number(updated.quantity) || 0;
        const rate = Number(updated.rate) || 0;
        const disc = Number(updated.discount_percent) || 0;
        updated.line_total = qty * rate * (1 - disc / 100);

        return updated;
      }
      return item;
    }));
    setIsDirty(true);
  };

  const removeRow = (id: string | number) => {
    setItems(items.filter(item => item.id !== id));
    setIsDirty(true);
  };

  // Financial calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.line_total) || 0), 0);
  }, [items]);

  const totalTax = useMemo(() => {
    return items.reduce((sum, it) => {
      const lineTax = (Number(it.line_total) || 0) * ((Number(it.igst_percent) || 0) / 100);
      return sum + lineTax;
    }, 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return Math.round((subtotal + totalTax) * 100) / 100;
  }, [subtotal, totalTax]);

  const totalReturnUnits = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [items]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setReturnMode('bill');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setReturnMode('direct');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setSearchParams({ view: 'list' });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveDebitNote();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Submit Debit Note / Purchase Return
  const handleSaveDebitNote = async () => {
    if (!selectedSupplierName.trim()) {
      alert('Please select or specify a Supplier for this Debit Note.');
      return;
    }
    if (items.length === 0) {
      alert('Cannot issue an empty Debit Note. Add at least one returned product item.');
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    const payload = {
      invoice_type: 'purchase-return',
      invoice_number: debitNoteNumber.trim(),
      customer_name: selectedSupplierName.trim(), // In schema, party name is stored in customer_name
      party_id: selectedSupplierId || undefined,
      party_inv_no: selectedInvoiceNo || undefined,
      party_inv_date: selectedInvoiceDate || undefined,
      remarks: `Debit Note: ${reasonCode} ${remarks ? `(${remarks})` : ''}`,
      subtotal: subtotal,
      tax_total: totalTax,
      grand_total: grandTotal,
      items: items.map(it => ({
        product_id: it.product_id || undefined,
        product_name: it.product_name,
        batch: it.batch,
        expiry: it.expiry,
        quantity: Number(it.quantity),
        rate: Number(it.rate),
        mrp: Number(it.mrp) || Number(it.rate),
        discount_percent: Number(it.discount_percent) || 0,
        igst_percent: Number(it.igst_percent) || 0,
        line_total: Number(it.line_total),
        disposition: it.disposition,
        source_invoice_item_id: it.source_invoice_item_id || undefined
      }))
    };

    try {
      await apiClient.post('/api/sales/invoices', payload);
      
      // Calculate and persist next series continuation (Marg / Tally style)
      const nextSeq = incrementSeries(debitNoteNumber.trim());
      localStorage.setItem('erp_series_purchase_return', nextSeq);

      setStatusMessage({
        type: 'success',
        text: `Debit Note ${debitNoteNumber} issued successfully! Stock & Supplier Ledger updated in General Ledger.`
      });
      
      setIsDirty(false);
      setItems([]);
      setSelectedInvoiceNo('');
      setSelectedInvoiceDate('');
      
      // Continue next bill with advanced series
      setDebitNoteNumber(nextSeq);
      userModifiedSeriesRef.current = false;
      setIsCustomSeries(false);
    } catch (err: any) {
      console.error('Failed to post Debit Note:', err);
      setStatusMessage({
        type: 'error',
        text: 'Failed to issue Debit Note: ' + (err.response?.data?.detail || err.message)
      });
    } finally {
      setSaving(false);
    }
  };

  // If viewMode === 'list', render the return register
  if (viewMode === 'list') {
    return (
      <div style={{
        padding: '16px 20px',
        backgroundColor: '#eef2ef',
        minHeight: '100vh',
        color: '#111827',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          backgroundColor: '#ffffff',
          padding: '12px 18px',
          borderRadius: '10px',
          border: '1px solid #d8e2dc',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setSearchParams({})}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                fontSize: '13px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontWeight: '600',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={16} /> Back to Debit Note Entry
            </button>
            <div style={{ height: '16px', width: '1px', backgroundColor: '#cbd5e1' }} />
            <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <FileCheck size={20} color="#1b4332" />
              Supplier Debit Note Register (Purchase Returns)
            </h1>
          </div>
          <button 
            onClick={() => setSearchParams({})}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(45, 106, 79, 0.3)'
            }}
          >
            <Plus size={16} /> New Debit Note
          </button>
        </div>
        <div style={{
          flex: 1,
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #d8e2dc',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          padding: '8px'
        }}>
          <PurchaseReturnList 
            type="bill" 
            onSelectBill={(entryNo) => {
              setSearchParams({});
              setDebitNoteNumber(entryNo);
              userModifiedSeriesRef.current = true;
            }} 
          />
        </div>
      </div>
    );
  }

  // Filter suppliers for searchable dropdown
  const filteredSuppliers = suppliers.filter(s => {
    const q = supplierSearchQuery.toLowerCase();
    const name = (s.legal_name || s.trade_name || s.name || '').toLowerCase();
    const gstin = (s.gst || s.gstin || '').toLowerCase();
    return name.includes(q) || gstin.includes(q);
  });

  return (
    <div style={{ 
      backgroundColor: '#eef2ef', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      color: '#111827', 
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      paddingBottom: '48px',
      boxSizing: 'border-box'
    }}>
      {/* ── TOP HEADER / APEX COCKPIT RIBBON ── */}
      <header style={{ 
        backgroundColor: '#ffffff', 
        borderBottom: '1px solid #d8e2dc', 
        padding: '10px 18px', 
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)', 
        position: 'sticky', 
        top: 0, 
        zIndex: 30 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '38px', 
              height: '38px', 
              borderRadius: '9px', 
              background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#ffffff', 
              boxShadow: '0 2px 8px rgba(45, 106, 79, 0.3)' 
            }}>
              <RotateCcw size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
                  SUPPLIER DEBIT NOTE
                </h1>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  textTransform: 'uppercase', 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  color: '#ffffff', 
                  border: '1px solid rgba(255, 255, 255, 0.3)', 
                  padding: '2px 8px', 
                  borderRadius: '20px' 
                }}>
                  Purchase Return
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#d8f3dc', margin: '2px 0 0 0' }}>
                Pharma goods return to manufacturers & stockists with GL auto-reversal
              </p>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            backgroundColor: '#f1f5f9', 
            padding: '4px', 
            borderRadius: '10px', 
            border: '1px solid #cbd5e1' 
          }}>
            <button
              type="button"
              onClick={() => setReturnMode('bill')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.15s ease',
                background: returnMode === 'bill' ? 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)' : 'transparent',
                color: returnMode === 'bill' ? '#ffffff' : '#475569',
                boxShadow: returnMode === 'bill' ? '0 2px 6px rgba(45, 106, 79, 0.3)' : 'none'
              }}
            >
              <FileText size={14} />
              <span>[F2] Against Inward Bill</span>
              <span style={{ 
                fontSize: '10px', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontWeight: '600',
                backgroundColor: returnMode === 'bill' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                color: returnMode === 'bill' ? '#ffffff' : '#475569'
              }}>
                Recommended
              </span>
            </button>
            <button
              type="button"
              onClick={() => setReturnMode('direct')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.15s ease',
                background: returnMode === 'direct' ? 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)' : 'transparent',
                color: returnMode === 'direct' ? '#ffffff' : '#475569',
                boxShadow: returnMode === 'direct' ? '0 2px 6px rgba(45, 106, 79, 0.3)' : 'none'
              }}
            >
              <Package size={14} />
              <span>[F3] Direct Loose Return</span>
            </button>
          </div>

          {/* Header Action Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setSearchParams({ view: 'list' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#334155',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <ListFilter size={15} color="#64748b" />
              <span>[F5] Register</span>
            </button>
            <button
              type="button"
              onClick={handleSaveDebitNote}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(45, 106, 79, 0.35)',
                opacity: saving ? 0.6 : 1
              }}
            >
              <Save size={15} />
              <span>{saving ? 'Posting...' : '[Ctrl+S] Issue Debit Note'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── STATUS TOAST BANNER ── */}
      {statusMessage && (
        <div style={{
          margin: '12px 18px 0 18px',
          padding: '10px 16px',
          borderRadius: '9px',
          border: statusMessage.type === 'success' ? '1px solid #86efac' : '1px solid #fca5a5',
          backgroundColor: statusMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: statusMessage.type === 'success' ? '#14532d' : '#7f1d1d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600' }}>
            {statusMessage.type === 'success' ? (
              <CheckCircle size={18} color="#16a34a" />
            ) : (
              <AlertTriangle size={18} color="#dc2626" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: 'inherit', opacity: 0.8 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── MAIN WORKSPACE ── */}
      <main style={{ flex: 1, padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* TOP COCKPIT: VOUCHER CONFIG & SUPPLIER SELECTOR */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '10px', 
          border: '1px solid #d8e2dc', 
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', 
          padding: '12px 16px', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(12, 1fr)', 
          gap: '12px' 
        }}>
          
          {/* 1. Debit Note Series & Numbering (Marg/Tally continuation engine) */}
          <div style={{ 
            gridColumn: 'span 3', 
            backgroundColor: '#f8fafc', 
            padding: '10px 12px', 
            borderRadius: '9px', 
            border: '1px solid #e2e8f0', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between' 
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#1b4332', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Hash size={13} color="#2d6a4f" />
                  Debit Note Number
                </label>
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: '700', 
                  color: isCustomSeries ? '#92400e' : '#2d6a4f', 
                  backgroundColor: isCustomSeries ? '#fef3c7' : '#eaf4ee', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  border: isCustomSeries ? '1px solid #fde68a' : '1px solid #c2e0cf'
                }}>
                  {isCustomSeries ? 'Custom Series' : 'Auto Continuation'}
                </span>
              </div>
              <input
                type="text"
                value={debitNoteNumber}
                onChange={(e) => {
                  userModifiedSeriesRef.current = true;
                  setDebitNoteNumber(e.target.value);
                  setIsCustomSeries(true);
                  setIsDirty(true);
                }}
                placeholder="e.g. DN-0001 or RJ-DN-010"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: '800',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #2d6a4f',
                  borderRadius: '6px',
                  color: '#1b4332',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <p style={{ fontSize: '10px', color: '#64748b', margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={12} color="#94a3b8" />
              Edit series prefix or number anytime. ERP remembers and advances this sequence.
            </p>
          </div>

          {/* 2. Date & Reason Code */}
          <div style={{ 
            gridColumn: 'span 4', 
            backgroundColor: '#f8fafc', 
            padding: '10px 12px', 
            borderRadius: '9px', 
            border: '1px solid #e2e8f0', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between' 
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '5px' }}>
                  Voucher Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => { setDate(e.target.value); setIsDirty(true); }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '5px' }}>
                  Return Reason
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) => { setReasonCode(e.target.value); setIsDirty(true); }}
                  style={{
                    width: '100%',
                    padding: '6px 6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  {VENDOR_RETURN_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Reason notes / complaint ref..."
                value={remarks}
                onChange={(e) => { setRemarks(e.target.value); setIsDirty(true); }}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  fontSize: '11px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '5px',
                  color: '#334155',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* 3. Supplier / Vendor Selector */}
          <div style={{ 
            gridColumn: 'span 5', 
            backgroundColor: '#f8fafc', 
            padding: '10px 12px', 
            borderRadius: '9px', 
            border: '1px solid #e2e8f0', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#1b4332', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={13} color="#2d6a4f" />
                  Supplier / Sundry Creditor
                </label>
                {selectedInvoiceNo && (
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: '700', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    backgroundColor: '#fef3c7', 
                    color: '#92400e', 
                    border: '1px solid #fde68a' 
                  }}>
                    Linked Inward: #{selectedInvoiceNo}
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Type to search supplier (e.g. Sun Pharma, Cipla)..."
                  value={selectedSupplierName}
                  onChange={(e) => {
                    setSelectedSupplierName(e.target.value);
                    setSupplierSearchQuery(e.target.value);
                    setIsDirty(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #94a3b8',
                    borderRadius: '6px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {supplierSearchQuery && filteredSuppliers.length > 0 && selectedSupplierName !== filteredSuppliers[0]?.legal_name && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 50,
                    padding: '4px'
                  }}>
                    {filteredSuppliers.map(party => (
                      <div
                        key={party.id}
                        onClick={() => {
                          handleSelectSupplier(party);
                          setSupplierSearchQuery('');
                        }}
                        style={{
                          padding: '7px 10px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid #f1f5f9'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eaf4ee'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{party.legal_name || party.trade_name || party.name}</div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>GST: {party.gst || party.gstin || 'Unregistered'}</div>
                        </div>
                        <span style={{ fontSize: '10px', color: '#2d6a4f', fontWeight: '700', backgroundColor: '#eaf4ee', padding: '2px 6px', borderRadius: '4px', border: '1px solid #c2e0cf' }}>
                          Select
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Bill Selection Action for Mode "bill" */}
            <div style={{ marginTop: '8px' }}>
              {returnMode === 'bill' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedSupplierName.trim()) {
                      alert('Please select or type a supplier name first.');
                      return;
                    }
                    setShowBillPickerModal(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    backgroundColor: '#eaf4ee',
                    color: '#1b4332',
                    fontSize: '12px',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: '1px solid #c2e0cf',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Search size={14} color="#2d6a4f" />
                  {selectedInvoiceNo ? `Change Bill (Currently: #${selectedInvoiceNo})` : 'Select Inward Purchase Bill to Return Items'}
                </button>
              ) : (
                <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                  Direct stock return mode: ad-hoc return items from godown inventory.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── LINE ITEMS GRID TABLE ── */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '10px', 
          border: '1px solid #d8e2dc', 
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1, 
          overflow: 'hidden' 
        }}>
          {/* Table Header Bar */}
          <div style={{ 
            padding: '10px 16px', 
            borderBottom: '1px solid #d8e2dc', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            backgroundColor: '#f8fafc' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <Package size={16} color="#2d6a4f" />
                Return Line Items
              </h2>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: '700', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                backgroundColor: '#e2e8f0', 
                color: '#334155', 
                fontFamily: 'monospace' 
              }}>
                {items.length} {items.length === 1 ? 'Product' : 'Products'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {returnMode === 'direct' && (
                <button
                  type="button"
                  onClick={addManualRow}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
                    color: '#ffffff',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(45, 106, 79, 0.25)'
                  }}
                >
                  <Plus size={14} /> Add Return Product
                </button>
              )}
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear all return items?')) setItems([]);
                  }}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    color: '#dc2626',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Table Body */}
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #2d6a4f', color: '#334155', fontWeight: '800', textTransform: 'uppercase', fontSize: '11px' }}>
                  <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '8px 10px', minWidth: '180px' }}>Product Name</th>
                  <th style={{ padding: '8px 10px', width: '100px' }}>Batch</th>
                  <th style={{ padding: '8px 10px', width: '70px', textAlign: 'center' }}>Expiry</th>
                  <th style={{ padding: '8px 10px', width: '140px' }}>Stock Disposition</th>
                  {returnMode === 'bill' && (
                    <th style={{ padding: '8px 10px', width: '75px', textAlign: 'right' }}>Inward Qty</th>
                  )}
                  <th style={{ padding: '8px 10px', width: '85px', textAlign: 'right' }}>Return Units</th>
                  <th style={{ padding: '8px 10px', width: '90px', textAlign: 'right' }}>Purchase Rate (₹)</th>
                  <th style={{ padding: '8px 10px', width: '65px', textAlign: 'right' }}>Disc %</th>
                  <th style={{ padding: '8px 10px', width: '60px', textAlign: 'right' }}>GST %</th>
                  <th style={{ padding: '8px 10px', width: '100px', textAlign: 'right' }}>Debit Total (₹)</th>
                  <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>Del</th>
                </tr>
              </thead>
              <tbody style={{ color: '#0f172a' }}>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Package size={36} color="#cbd5e1" />
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>No Return Products Added</div>
                        <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
                          {returnMode === 'bill'
                            ? 'Select a supplier and click "Select Inward Purchase Bill" to automatically populate items from their delivery.'
                            : 'Click "Add Return Product" or press [F3] to specify items to return from godown stock.'}
                        </div>
                        {returnMode === 'bill' && selectedSupplierName && (
                          <button
                            type="button"
                            onClick={() => setShowBillPickerModal(true)}
                            style={{
                              marginTop: '8px',
                              padding: '6px 14px',
                              background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
                              color: '#ffffff',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            Browse Inward Bills
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfc' }}>
                      <td style={{ padding: '6px 10px', textAlign: 'center', color: '#94a3b8', fontFamily: 'monospace' }}>{idx + 1}</td>
                      
                      {/* Product Name */}
                      <td style={{ padding: '6px 10px' }}>
                        {returnMode === 'direct' ? (
                          <select
                            value={it.product_id || ''}
                            onChange={(e) => updateLineItem(it.id, 'product_id', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '700',
                              color: '#0f172a',
                              outline: 'none'
                            }}
                          >
                            <option value="">-- Choose Product --</option>
                            {productsList.map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.packing || 'TAB'})</option>
                            ))}
                          </select>
                        ) : (
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{it.product_name}</div>
                            {it.source_invoice_no && (
                              <div style={{ fontSize: '10px', color: '#64748b' }}>Bill: #{it.source_invoice_no}</div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Batch */}
                      <td style={{ padding: '6px 10px' }}>
                        <input
                          type="text"
                          value={it.batch}
                          onChange={(e) => updateLineItem(it.id, 'batch', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>

                      {/* Expiry */}
                      <td style={{ padding: '6px 10px' }}>
                        <input
                          type="text"
                          value={it.expiry}
                          placeholder="MM/YY"
                          onChange={(e) => updateLineItem(it.id, 'expiry', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px 4px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            textAlign: 'center',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>

                      {/* Pharma Stock Disposition */}
                      <td style={{ padding: '6px 10px' }}>
                        <select
                          value={it.disposition}
                          onChange={(e) => updateLineItem(it.id, 'disposition', e.target.value as any)}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            borderRadius: '5px',
                            border: it.disposition === 'saleable' ? '1px solid #86efac' : it.disposition === 'breakage' ? '1px solid #fca5a5' : '1px solid #fcd34d',
                            backgroundColor: it.disposition === 'saleable' ? '#f0fdf4' : it.disposition === 'breakage' ? '#fef2f2' : '#fffbeb',
                            color: it.disposition === 'saleable' ? '#166534' : it.disposition === 'breakage' ? '#991b1b' : '#92400e',
                            outline: 'none'
                          }}
                        >
                          <option value="breakage">🔴 Breakage Godown</option>
                          <option value="expiry">🟡 Expired Godown</option>
                          <option value="saleable">🟢 Saleable Stock</option>
                        </select>
                      </td>

                      {/* Inward Qty (Only for bill mode) */}
                      {returnMode === 'bill' && (
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#64748b' }}>
                          {it.inward_qty}
                        </td>
                      )}

                      {/* Return Quantity */}
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        <input
                          id={`return-qty-${idx}`}
                          type="number"
                          min="1"
                          max={it.inward_qty > 0 ? it.inward_qty : undefined}
                          value={it.quantity}
                          onChange={(e) => updateLineItem(it.id, 'quantity', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const nextRate = document.getElementById(`return-rate-${idx}`) as HTMLInputElement | null;
                              nextRate?.focus();
                              nextRate?.select();
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              (document.getElementById(`return-qty-${idx + 1}`) as HTMLInputElement | null)?.focus();
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              (document.getElementById(`return-qty-${idx - 1}`) as HTMLInputElement | null)?.focus();
                            }
                          }}
                          style={{
                            width: '65px',
                            padding: '4px 6px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            fontWeight: '700',
                            textAlign: 'right',
                            backgroundColor: '#ffffff',
                            border: '1.5px solid #2d6a4f',
                            borderRadius: '4px',
                            color: '#1b4332',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>

                      {/* Purchase Rate */}
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        <input
                          id={`return-rate-${idx}`}
                          type="number"
                          step="0.01"
                          value={it.rate}
                          onChange={(e) => updateLineItem(it.id, 'rate', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const nextDisc = document.getElementById(`return-disc-${idx}`) as HTMLInputElement | null;
                              nextDisc?.focus();
                              nextDisc?.select();
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              (document.getElementById(`return-rate-${idx + 1}`) as HTMLInputElement | null)?.focus();
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              (document.getElementById(`return-rate-${idx - 1}`) as HTMLInputElement | null)?.focus();
                            }
                          }}
                          style={{
                            width: '75px',
                            padding: '4px 6px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            textAlign: 'right',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            color: '#0f172a',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>

                      {/* Discount % */}
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        <input
                          id={`return-disc-${idx}`}
                          type="number"
                          step="0.1"
                          value={it.discount_percent}
                          onChange={(e) => updateLineItem(it.id, 'discount_percent', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const nextQty = document.getElementById(`return-qty-${idx + 1}`) as HTMLInputElement | null;
                              if (nextQty) {
                                nextQty.focus();
                                nextQty.select();
                              } else {
                                document.getElementById('save-debit-note-btn')?.focus();
                              }
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              (document.getElementById(`return-disc-${idx + 1}`) as HTMLInputElement | null)?.focus();
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              (document.getElementById(`return-disc-${idx - 1}`) as HTMLInputElement | null)?.focus();
                            }
                          }}
                          style={{
                            width: '50px',
                            padding: '4px 4px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            textAlign: 'right',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>

                      {/* GST % */}
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#475569' }}>
                        {it.igst_percent}%
                      </td>

                      {/* Line Total */}
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', color: '#1b4332' }}>
                        ₹{(it.line_total || 0).toFixed(2)}
                      </td>

                      {/* Delete */}
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeRow(it.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── FOOTER FINANCIAL SUMMARY BAR ── */}
          <div style={{ 
            backgroundColor: '#f8fafc', 
            borderTop: '1px solid #d8e2dc', 
            padding: '12px 18px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: '12px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12px', color: '#475569' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Total Items: </span>
                <span style={{ fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>{items.length}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Total Units: </span>
                <span style={{ fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>{totalReturnUnits}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Taxable Subtotal: </span>
                <span style={{ fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>₹{subtotal.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Total GST: </span>
                <span style={{ fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>₹{totalTax.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                  Grand Debit Note Total
                </span>
                <span style={{ fontSize: '24px', fontWeight: '900', color: '#1b4332', fontFamily: 'monospace' }}>
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                id="save-debit-note-btn"
                onClick={handleSaveDebitNote}
                disabled={saving || items.length === 0}
                style={{
                  padding: '9px 24px',
                  background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
                  color: '#ffffff',
                  borderRadius: '9px',
                  fontWeight: '800',
                  fontSize: '13px',
                  border: 'none',
                  cursor: saving || items.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 3px 10px rgba(45, 106, 79, 0.35)',
                  opacity: saving || items.length === 0 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Save size={16} />
                <span>Issue Debit Note</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── MODAL: SELECT INWARD BILL TO RETURN ── */}
      {showBillPickerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid #cbd5e1',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#2d6a4f" />
                  Select Inward Purchase Bill
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Supplier: <strong style={{ color: '#0f172a' }}>{selectedSupplierName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBillPickerModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', fontWeight: '800', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1 }}>
              {loadingInvoices ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                  <RefreshCw size={24} color="#2d6a4f" style={{ margin: '0 auto 8px auto' }} />
                  Loading supplier's past inward bills...
                </div>
              ) : supplierInvoices.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                  No inward purchase bills found for supplier <strong style={{ color: '#0f172a' }}>"{selectedSupplierName}"</strong>.
                  <p style={{ marginTop: '6px', color: '#94a3b8' }}>You can switch to <strong>[F3] Direct Loose Return</strong> to return items without an invoice link.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {supplierInvoices.map(inv => (
                    <div
                      key={inv.id}
                      onClick={() => handleSelectInvoiceToReturn(inv)}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0fdf4';
                        e.currentTarget.style.borderColor = '#86efac';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: '800', color: '#0f172a', fontSize: '13px' }}>
                            Invoice #{inv.invoice_number}
                          </span>
                          <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                            {inv.date ? inv.date.split('T')[0] : 'N/A'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {inv.items?.length || 0} Products Included
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '14px', color: '#1b4332', display: 'block' }}>
                          ₹{(Number(inv.grand_total) || 0).toFixed(2)}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#2d6a4f', backgroundColor: '#eaf4ee', padding: '2px 8px', borderRadius: '12px', display: 'inline-block', marginTop: '2px', border: '1px solid #c2e0cf' }}>
                          Load Items →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              padding: '10px 18px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px'
            }}>
              <span style={{ color: '#64748b' }}>Showing up to 50 recent inward bills</span>
              <button
                type="button"
                onClick={() => setShowBillPickerModal(false)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#e2e8f0',
                  color: '#334155',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM STICKY COMMAND BAR ── */}
      <footer style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        backgroundColor: '#ffffff', 
        borderTop: '1px solid #d8e2dc', 
        padding: '6px 18px', 
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.04)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        fontSize: '12px', 
        color: '#475569', 
        zIndex: 20 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <kbd style={{ padding: '2px 6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10px', fontWeight: '800', color: '#1e293b' }}>F2</kbd>
            <span>Against Bill</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <kbd style={{ padding: '2px 6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10px', fontWeight: '800', color: '#1e293b' }}>F3</kbd>
            <span>Direct Return</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <kbd style={{ padding: '2px 6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10px', fontWeight: '800', color: '#1e293b' }}>F5</kbd>
            <span>Register</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <kbd style={{ padding: '2px 6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10px', fontWeight: '800', color: '#1e293b' }}>Ctrl+S</kbd>
            <span>Save & Post</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
          <span style={{ color: '#64748b', fontWeight: '600' }}>Marg / Tally Series Continuation Engine Active</span>
        </div>
      </footer>
    </div>
  );
}
