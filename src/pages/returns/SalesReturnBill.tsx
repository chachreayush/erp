import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  RotateCcw, Save, Plus, Trash2, ArrowLeft, Search, FileText, 
  Calendar, User, AlertTriangle, CheckCircle, ShieldAlert, 
  Layers, Package, Hash, HelpCircle, Eye, ListFilter
} from 'lucide-react';
import apiClient from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import SalesReturnList from './SalesReturnList';

// Marg/Tally series continuation helper
const incrementSeries = (str: string): string => {
  if (!str) return '1';
  const match = str.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const nextNum = parseInt(numStr, 10) + 1;
    return `${prefix}${nextNum.toString().padStart(numStr.length, '0')}`;
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
  sold_qty: number;
  quantity: number; // Return Quantity
  rate: number;
  mrp: number;
  discount_percent: number;
  igst_percent: number;
  line_total: number;
  disposition: 'saleable' | 'breakage' | 'expiry';
  source_invoice_item_id?: string;
  source_invoice_no?: string;
}

const RETURN_REASONS = [
  'Breakage / Transit Damage',
  'Expired Medicine',
  'Near Expiry (< 3 Months)',
  'Excess Supply / Wrong Item Dispatched',
  'Rate Difference / Price Slip Adjustment',
  'Chemist Order Cancelled / Rejected'
];

export default function SalesReturnBill() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = searchParams.get('view'); // 'list' or null

  // Navigation hook with dirty check
  const [isDirty, setIsDirty] = useState(false);
  useReturnNavigation(isDirty);

  // Return mode: 'bill' (Against Bill) vs 'direct' (Direct Return)
  const [returnMode, setReturnMode] = useState<'bill' | 'direct'>('bill');

  // Header state
  const [creditNoteNumber, setCreditNoteNumber] = useState(() => {
    return localStorage.getItem('erp_series_sales_return') || 'CN-0001';
  });
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reasonCode, setReasonCode] = useState(RETURN_REASONS[0]);
  const [remarks, setRemarks] = useState('');

  // Customer state
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');

  // Bill selection modal for "Against Bill"
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
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

  // Load customers and products on mount
  useEffect(() => {
    const initMasterData = async () => {
      try {
        const [partiesRes, prodsRes] = await Promise.all([
          apiClient.get('/api/master/parties?type=customer'),
          apiClient.get('/api/products/')
        ]);
        setCustomers(partiesRes.data || []);
        setProductsList(prodsRes.data || []);
      } catch (err) {
        console.error('Failed to load return master data:', err);
      }
    };
    initMasterData();
  }, []);

  // When customer changes, load their past invoices if in "Against Bill" mode
  useEffect(() => {
    if (!selectedCustomerName) {
      setCustomerInvoices([]);
      return;
    }
    const loadPastInvoices = async () => {
      setLoadingInvoices(true);
      try {
        const res = await apiClient.get(`/api/sales/invoices/by-customer/${encodeURIComponent(selectedCustomerName)}`);
        setCustomerInvoices(res.data || []);
      } catch (err) {
        console.error('Failed to load past invoices for customer:', err);
      } finally {
        setLoadingInvoices(false);
      }
    };
    loadPastInvoices();
  }, [selectedCustomerName]);

  // Handle customer dropdown selection
  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    const found = customers.find(c => c.id === custId);
    const name = found?.legal_name || found?.trade_name || found?.name || '';
    setSelectedCustomerName(name);
    setItems([]);
    setSelectedInvoiceId('');
    setSelectedInvoiceNo('');
    setIsDirty(true);
  };

  // Populate items from selected sales invoice
  const handleSelectInvoiceToReturn = (inv: any) => {
    setSelectedInvoiceId(inv.id);
    setSelectedInvoiceNo(inv.invoice_number);
    setSelectedInvoiceDate(inv.date ? inv.date.split('T')[0] : '');
    
    // Map bill items into return lines
    const returnLines: ReturnLineItem[] = (inv.items || []).map((it: any) => {
      const alreadyReturned = it.returned_qty || 0;
      const maxReturnable = Math.max(0, it.quantity - alreadyReturned);
      const rate = Number(it.rate) || 0;
      const mrp = Number(it.mrp) || 0;
      const disc = Number(it.discount_percent) || 0;
      const igst = Number(it.igst_percent) || 0;
      const lineTotal = maxReturnable * rate * (1 - disc / 100);

      return {
        id: Math.random().toString(36).substring(7),
        product_id: it.product_id,
        product_name: it.product_name,
        batch: it.batch || 'DEFAULT',
        expiry: it.expiry || '12/28',
        sold_qty: it.quantity,
        quantity: maxReturnable,
        rate: rate,
        mrp: mrp,
        discount_percent: disc,
        igst_percent: igst,
        line_total: lineTotal,
        disposition: 'breakage', // Default to breakage for safety inspection
        source_invoice_item_id: it.id,
        source_invoice_no: inv.invoice_number
      };
    });

    setItems(returnLines);
    setShowBillPickerModal(false);
    setIsDirty(true);
  };

  // Add manual empty line for Direct Return
  const addManualRow = () => {
    const newLine: ReturnLineItem = {
      id: Math.random().toString(36).substring(7),
      product_id: '',
      product_name: '',
      batch: '',
      expiry: '',
      sold_qty: 0,
      quantity: 1,
      rate: 0,
      mrp: 0,
      discount_percent: 0,
      igst_percent: 12,
      line_total: 0,
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
            updated.rate = prod.rate_a || prod.p_rate || prod.sales_rate || 0;
            updated.mrp = prod.mrp || 0;
            updated.igst_percent = prod.igst_percent || 12;
          }
        }

        // Clamp return qty to sold qty if linked to invoice
        if (field === 'quantity' && returnMode === 'bill' && item.sold_qty > 0) {
          const num = Number(value) || 0;
          if (num > item.sold_qty) {
            alert(`Return quantity (${num}) cannot exceed original billed quantity (${item.sold_qty})`);
            updated.quantity = item.sold_qty;
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
    return subtotal + totalTax;
  }, [subtotal, totalTax]);

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
        handleSaveCreditNote();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Submit Credit Note / Sales Return
  const handleSaveCreditNote = async () => {
    if (!selectedCustomerName) {
      alert('Please select a customer for this Credit Note.');
      return;
    }
    if (items.length === 0) {
      alert('Cannot issue an empty Sales Return. Add at least one returned product item.');
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    const payload = {
      invoice_type: 'sales-return',
      invoice_number: creditNoteNumber,
      customer_name: selectedCustomerName,
      party_id: selectedCustomerId || undefined,
      party_inv_no: selectedInvoiceNo || undefined,
      party_inv_date: selectedInvoiceDate || undefined,
      remarks: `Sales Return: ${reasonCode} ${remarks ? `(${remarks})` : ''}`,
      subtotal: subtotal,
      tax_total: totalTax,
      grand_total: grandTotal,
      items: items.map(it => ({
        product_id: it.product_id,
        product_name: it.product_name,
        batch: it.batch,
        expiry: it.expiry,
        quantity: Number(it.quantity),
        rate: Number(it.rate),
        mrp: Number(it.mrp) || 0,
        discount_percent: Number(it.discount_percent) || 0,
        igst_percent: Number(it.igst_percent) || 0,
        line_total: Number(it.line_total),
        disposition: it.disposition,
        source_invoice_item_id: it.source_invoice_item_id
      }))
    };

    try {
      const res = await apiClient.post('/api/sales/invoices', payload);
      setStatusMessage({
        type: 'success',
        text: `Credit Note ${creditNoteNumber} issued successfully! Stock and Customer Ledger updated.`
      });
      setIsDirty(false);
      setItems([]);
      setSelectedInvoiceNo('');
      setSelectedInvoiceDate('');
      
      // Increment CN number preserving custom series
      const nextCN = incrementSeries(creditNoteNumber);
      setCreditNoteNumber(nextCN);
      localStorage.setItem('erp_series_sales_return', nextCN);
    } catch (err: any) {
      console.error('Failed to post Credit Note:', err);
      setStatusMessage({
        type: 'error',
        text: 'Failed to issue Credit Note: ' + (err.response?.data?.detail || err.message)
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
              <ArrowLeft size={16} /> Back to Return Entry
            </button>
            <div style={{ height: '16px', width: '1px', backgroundColor: '#cbd5e1' }} />
            <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <RotateCcw size={20} color="#1b4332" />
              Customer Sales Return & Credit Note Register
            </h1>
          </div>
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
          <SalesReturnList 
            type="sales-return-bill"
            onSelectBill={(entryNo) => {
              setSearchParams({});
            }}
          />
        </div>
      </div>
    );
  }

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
            <button 
              onClick={() => navigate('/sales')} 
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
            >
              <ArrowLeft size={15} /> [ESC] Exit
            </button>
            <div style={{ height: '24px', width: '1px', backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <div style={{ 
              width: '38px', 
              height: '38px', 
              borderRadius: '9px', 
              background: '#ffffff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#1b4332', 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' 
            }}>
              <RotateCcw size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.01em' }}>
                  Customer Sales Return & Credit Note
                </h1>
                <span style={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  color: '#ffffff', 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.3)' 
                }}>
                  DOC-21 / DOC-23
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#d8f3dc' }}>
                Pharmaceutical Return Disposition, RMA Inspection & Credit Note Engine
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={() => setSearchParams({ view: 'list' })}
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ListFilter size={15} /> [F5] View Register
            </button>
            <button 
              id="save-credit-note-btn"
              onClick={handleSaveCreditNote}
              disabled={saving}
              style={{ 
                background: saving ? '#64748b' : '#1b4332', 
                color: '#ffffff', 
                border: '1px solid #52b788', 
                borderRadius: '8px', 
                padding: '8px 22px', 
                fontSize: '13px', 
                fontWeight: 700, 
                cursor: saving ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' 
              }}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Credit Note [Ctrl+S]'}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>

        {/* ── NOTIFICATION ALERT BANNER ── */}
        {statusMessage && (
          <div style={{ 
            padding: '12px 18px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px',
            backgroundColor: statusMessage.type === 'success' ? '#e8f5e9' : '#fef2f2',
            color: statusMessage.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            {statusMessage.type === 'success' ? <CheckCircle size={18} color="#166534" /> : <AlertTriangle size={18} color="#991b1b" />}
            <span style={{ fontWeight: 600 }}>{statusMessage.text}</span>
          </div>
        )}

        {/* ── RETURN MODE TOGGLE BAR ── */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          backgroundColor: '#ffffff', 
          padding: '10px 16px', 
          borderRadius: '10px', 
          border: '1px solid #d8e2dc', 
          alignItems: 'center',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)'
        }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginRight: '6px' }}>Return Workflow Mode:</span>
          <button 
            onClick={() => setReturnMode('bill')}
            style={{ 
              backgroundColor: returnMode === 'bill' ? '#1b4332' : '#f8fafc',
              color: returnMode === 'bill' ? '#ffffff' : '#475569',
              border: `1px solid ${returnMode === 'bill' ? '#1b4332' : '#cbd5e1'}`,
              borderRadius: '8px', 
              padding: '7px 16px', 
              fontSize: '13px', 
              fontWeight: 600, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              boxShadow: returnMode === 'bill' ? '0 2px 6px rgba(27, 67, 50, 0.25)' : 'none'
            }}
          >
            <FileText size={15} /> [F2] Against Original Invoice (Recommended)
          </button>
          <button 
            onClick={() => setReturnMode('direct')}
            style={{ 
              backgroundColor: returnMode === 'direct' ? '#1b4332' : '#f8fafc',
              color: returnMode === 'direct' ? '#ffffff' : '#475569',
              border: `1px solid ${returnMode === 'direct' ? '#1b4332' : '#cbd5e1'}`,
              borderRadius: '8px', 
              padding: '7px 16px', 
              fontSize: '13px', 
              fontWeight: 600, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              boxShadow: returnMode === 'direct' ? '0 2px 6px rgba(27, 67, 50, 0.25)' : 'none'
            }}
          >
            <Package size={15} /> [F3] Direct Counter Return (Loose Stock)
          </button>
        </div>

      {/* ── HEADER DETAILS PANEL ── */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', borderRadius: '10px', padding: '16px 18px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)' }}>
        
        {/* Credit Note Number */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>
            Credit Note No (CN)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)' }}>
            <Hash size={15} color="#1b4332" />
            <input 
              type="text" 
              value={creditNoteNumber} 
              onChange={e => {
                setCreditNoteNumber(e.target.value);
                localStorage.setItem('erp_series_sales_return', e.target.value);
              }}
              style={{ background: 'transparent', border: 'none', color: '#1b4332', fontWeight: 700, padding: '8px 6px', fontSize: '13px', width: '100%', outline: 'none' }} 
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>
            Return Date
          </label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px' }}>
            <Calendar size={15} color="#64748b" />
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#111827', padding: '8px 6px', fontSize: '13px', width: '100%', outline: 'none' }} 
            />
          </div>
        </div>

        {/* Customer Selector */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>
            Customer (Debtor Account)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px' }}>
            <User size={15} color="#2d6a4f" />
            <select 
              value={selectedCustomerId} 
              onChange={e => handleCustomerSelect(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#111827', padding: '8px 6px', fontSize: '13px', width: '100%', outline: 'none' }}
            >
              <option value="" style={{ background: '#ffffff', color: '#64748b' }}>-- Select Chemist / Debtor --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id} style={{ background: '#ffffff', color: '#111827' }}>
                  {c.legal_name || c.trade_name || c.name || 'Customer'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reason Code */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>
            Primary Return Reason
          </label>
          <select 
            value={reasonCode}
            onChange={e => setReasonCode(e.target.value)}
            style={{ width: '100%', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#111827', padding: '8px 10px', fontSize: '13px', outline: 'none' }}
          >
            {RETURN_REASONS.map(r => (
              <option key={r} value={r} style={{ background: '#ffffff', color: '#111827' }}>{r}</option>
            ))}
          </select>
        </div>

        {/* Optional Source Invoice Selection Bar (When in Against Bill mode) */}
        {returnMode === 'bill' && (
          <div style={{ gridColumn: 'span 5', backgroundColor: '#f0fdf4', padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>Linked Original Invoice:</span>
              {selectedInvoiceNo ? (
                <span style={{ backgroundColor: '#ffffff', border: '1px solid #16a34a', padding: '3px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, color: '#15803d', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  {selectedInvoiceNo} ({selectedInvoiceDate})
                </span>
              ) : (
                <span style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>
                  {selectedCustomerName ? 'No invoice chosen yet. Click to pick from past bills.' : 'Please select a customer first.'}
                </span>
              )}
            </div>
            
            <button 
              onClick={() => setShowBillPickerModal(true)}
              disabled={!selectedCustomerName}
              style={{ 
                backgroundColor: !selectedCustomerName ? '#cbd5e1' : '#1b4332', 
                color: '#ffffff', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 700, cursor: !selectedCustomerName ? 'not-allowed' : 'pointer',
                boxShadow: !selectedCustomerName ? 'none' : '0 2px 6px rgba(27, 67, 50, 0.25)'
              }}
            >
              {loadingInvoices ? 'Loading Bills...' : '🔍 Select Original Sales Bill'}
            </button>
          </div>
        )}

      </div>

      {/* ── RETURN ITEM GRID ── */}
      <div style={{ flex: 1, backgroundColor: '#ffffff', border: '1px solid #d8e2dc', borderRadius: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table className="w-full text-slate-800" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', backgroundColor: '#ffffff' }}>
            <thead style={{ backgroundColor: '#e8f5e9', position: 'sticky', top: 0, zIndex: 10, borderBottom: '2px solid #b7e4c7' }}>
              <tr>
                <th style={{ padding: '11px 16px', textAlign: 'left', color: '#1b4332', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Product Name</th>
                <th style={{ padding: '11px 10px', textAlign: 'left', color: '#1b4332', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Batch</th>
                <th style={{ padding: '11px 10px', textAlign: 'left', color: '#1b4332', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Expiry</th>
                {returnMode === 'bill' && (
                  <th style={{ padding: '11px 10px', textAlign: 'right', color: '#475569', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Sold Qty</th>
                )}
                <th style={{ padding: '11px 10px', textAlign: 'right', color: '#1b4332', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Return Qty</th>
                <th style={{ padding: '11px 10px', textAlign: 'right', color: '#1b4332', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Rate (₹)</th>
                <th style={{ padding: '11px 10px', textAlign: 'right', color: '#1b4332', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Disc %</th>
                <th style={{ padding: '11px 10px', textAlign: 'right', color: '#1b4332', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Net (₹)</th>
                <th style={{ padding: '11px 14px', textAlign: 'left', color: '#1b4332', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Stock Disposition</th>
                <th style={{ padding: '11px 10px', textAlign: 'center', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: '#ffffff' }}>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fbfcfb' }}>
                  
                  {/* Product */}
                  <td style={{ padding: '8px 16px', minWidth: '220px' }}>
                    {returnMode === 'bill' ? (
                      <span style={{ fontWeight: 700, color: '#1b4332', fontSize: '13px' }}>{item.product_name}</span>
                    ) : (
                      <select 
                        value={item.product_id}
                        onChange={e => updateLineItem(item.id, 'product_id', e.target.value)}
                        style={{ width: '100%', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#111827', padding: '6px 8px', outline: 'none' }}
                      >
                        <option value="">-- Select Product --</option>
                        {productsList.map(p => (
                          <option key={p.id} value={p.id}>{p.name} {p.packing ? `(${p.packing})` : ''}</option>
                        ))}
                      </select>
                    )}
                  </td>

                  {/* Batch */}
                  <td style={{ padding: '8px 10px', width: '120px' }}>
                    <input 
                      type="text" 
                      value={item.batch}
                      readOnly={returnMode === 'bill'}
                      onChange={e => updateLineItem(item.id, 'batch', e.target.value)}
                      style={{ width: '100%', backgroundColor: returnMode === 'bill' ? 'transparent' : '#f8fafc', border: returnMode === 'bill' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', color: '#111827', padding: '6px 8px', fontFamily: 'monospace', outline: 'none' }}
                    />
                  </td>

                  {/* Expiry */}
                  <td style={{ padding: '8px 10px', width: '90px' }}>
                    <input 
                      type="text" 
                      value={item.expiry}
                      readOnly={returnMode === 'bill'}
                      placeholder="MM/YY"
                      onChange={e => updateLineItem(item.id, 'expiry', e.target.value)}
                      style={{ width: '100%', backgroundColor: returnMode === 'bill' ? 'transparent' : '#f8fafc', border: returnMode === 'bill' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', color: '#111827', padding: '6px 8px', fontFamily: 'monospace', outline: 'none' }}
                    />
                  </td>

                  {/* Sold Qty (Against Bill only) */}
                  {returnMode === 'bill' && (
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {item.sold_qty}
                    </td>
                  )}

                  {/* Return Qty */}
                  <td style={{ padding: '8px 10px', width: '100px' }}>
                    <input 
                      id={`return-qty-${idx}`}
                      type="number" 
                      min="1"
                      max={returnMode === 'bill' && item.sold_qty > 0 ? item.sold_qty : undefined}
                      value={item.quantity}
                      onChange={e => updateLineItem(item.id, 'quantity', e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (returnMode === 'direct') {
                            document.getElementById(`return-rate-${idx}`)?.focus();
                          } else {
                            if (idx < items.length - 1) {
                              document.getElementById(`return-qty-${idx + 1}`)?.focus();
                            } else {
                              document.getElementById('save-credit-note-btn')?.focus();
                            }
                          }
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          if (idx < items.length - 1) {
                            document.getElementById(`return-qty-${idx + 1}`)?.focus();
                          }
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          if (idx > 0) {
                            document.getElementById(`return-qty-${idx - 1}`)?.focus();
                          }
                        }
                      }}
                      style={{ width: '100%', backgroundColor: '#ffffff', border: '1.5px solid #2d6a4f', borderRadius: '6px', color: '#1b4332', fontWeight: 800, padding: '6px 8px', textAlign: 'right', outline: 'none', boxShadow: '0 1px 3px rgba(45, 106, 79, 0.15)' }}
                    />
                  </td>

                  {/* Rate */}
                  <td style={{ padding: '8px 10px', width: '100px' }}>
                    <input 
                      id={`return-rate-${idx}`}
                      type="number" 
                      step="0.01"
                      value={item.rate}
                      readOnly={returnMode === 'bill'}
                      onChange={e => updateLineItem(item.id, 'rate', e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById(`return-disc-${idx}`)?.focus();
                        } else if (e.key === 'ArrowDown' && idx < items.length - 1) {
                          e.preventDefault();
                          document.getElementById(`return-rate-${idx + 1}`)?.focus();
                        } else if (e.key === 'ArrowUp' && idx > 0) {
                          e.preventDefault();
                          document.getElementById(`return-rate-${idx - 1}`)?.focus();
                        }
                      }}
                      style={{ width: '100%', backgroundColor: returnMode === 'bill' ? 'transparent' : '#f8fafc', border: returnMode === 'bill' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', color: '#111827', padding: '6px 8px', textAlign: 'right', fontWeight: 600, outline: 'none' }}
                    />
                  </td>

                  {/* Discount */}
                  <td style={{ padding: '8px 10px', width: '70px' }}>
                    <input 
                      id={`return-disc-${idx}`}
                      type="number" 
                      value={item.discount_percent}
                      readOnly={returnMode === 'bill'}
                      onChange={e => updateLineItem(item.id, 'discount_percent', e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (idx < items.length - 1) {
                            document.getElementById(`return-qty-${idx + 1}`)?.focus();
                          } else {
                            document.getElementById('save-credit-note-btn')?.focus();
                          }
                        } else if (e.key === 'ArrowDown' && idx < items.length - 1) {
                          e.preventDefault();
                          document.getElementById(`return-disc-${idx + 1}`)?.focus();
                        } else if (e.key === 'ArrowUp' && idx > 0) {
                          e.preventDefault();
                          document.getElementById(`return-disc-${idx - 1}`)?.focus();
                        }
                      }}
                      style={{ width: '100%', backgroundColor: returnMode === 'bill' ? 'transparent' : '#f8fafc', border: returnMode === 'bill' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', color: '#64748b', padding: '6px 8px', textAlign: 'right', outline: 'none' }}
                    />
                  </td>

                  {/* Net Line Total */}
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#1b4332', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{item.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Stock Disposition Selector */}
                  <td style={{ padding: '8px 14px', width: '180px' }}>
                    <select 
                      value={item.disposition}
                      onChange={e => updateLineItem(item.id, 'disposition', e.target.value as any)}
                      style={{ 
                        width: '100%', borderRadius: '6px', padding: '6px 8px', outline: 'none', fontSize: '12px', fontWeight: 700,
                        backgroundColor: item.disposition === 'saleable' ? '#f0fdf4' : item.disposition === 'breakage' ? '#fef2f2' : '#fefce8',
                        border: item.disposition === 'saleable' ? '1px solid #86efac' : item.disposition === 'breakage' ? '1px solid #fca5a5' : '1px solid #fde047',
                        color: item.disposition === 'saleable' ? '#166534' : item.disposition === 'breakage' ? '#991b1b' : '#854d0e'
                      }}
                    >
                      <option value="saleable">🟢 Return to Saleable</option>
                      <option value="breakage">🔴 Move to Breakage</option>
                      <option value="expiry">🟡 Move to Expiry</option>
                    </select>
                  </td>

                  {/* Remove row */}
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <button 
                      onClick={() => removeRow(item.id)}
                      style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}
                      title="Remove Row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>

                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                    {returnMode === 'bill' ? (
                      <div>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>No items loaded yet.</p>
                        <p style={{ margin: '6px 0 16px 0', fontSize: '13px' }}>Select a Customer above and choose an Original Sales Bill to load invoice items.</p>
                        <button 
                          onClick={() => setShowBillPickerModal(true)} 
                          disabled={!selectedCustomerName}
                          style={{ 
                            backgroundColor: !selectedCustomerName ? '#cbd5e1' : '#1b4332', 
                            color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '13px', fontWeight: 700, cursor: !selectedCustomerName ? 'not-allowed' : 'pointer',
                            boxShadow: !selectedCustomerName ? 'none' : '0 2px 8px rgba(27, 67, 50, 0.25)'
                          }}
                        >
                          🔍 Pick Sales Invoice
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>Direct Return Mode Active</p>
                        <p style={{ margin: '6px 0 16px 0', fontSize: '13px' }}>Click "+ Add Return Item" below to manually input returned items.</p>
                        <button 
                          onClick={addManualRow} 
                          style={{ backgroundColor: '#1b4332', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(27, 67, 50, 0.25)' }}
                        >
                          + Add Return Item
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── GRID FOOTER & TOTALS ── */}
        <div style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #d8e2dc', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {returnMode === 'direct' && (
              <button 
                onClick={addManualRow}
                style={{ backgroundColor: '#ffffff', color: '#1b4332', border: '1px solid #b7e4c7', borderRadius: '8px', padding: '7px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              >
                <Plus size={15} /> + Add Item
              </button>
            )}
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
              Items: <strong>{items.length}</strong> | Units Returned: <strong>{items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Subtotal</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Tax (GST)</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                ₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ textAlign: 'right', backgroundColor: '#ffffff', padding: '8px 18px', borderRadius: '8px', border: '1px solid #b7e4c7', boxShadow: '0 2px 8px rgba(45, 106, 79, 0.08)' }}>
              <div style={{ fontSize: '11px', color: '#1b4332', textTransform: 'uppercase', fontWeight: 700 }}>Total Credit Amount</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1b4332' }}>
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>
      </main>

      {/* ── MODAL: PICK ORIGINAL SALES BILL ── */}
      {showBillPickerModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', borderRadius: '12px', width: '720px', maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 45px rgba(0,0,0,0.15)' }}>
            
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>
                  Select Sales Invoice for {selectedCustomerName}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Click an invoice to load its billed items and verify original rates and taxes
                </p>
              </div>
              <button 
                onClick={() => setShowBillPickerModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1, backgroundColor: '#f8fafc' }}>
              {customerInvoices.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No past sales invoices found for this customer.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {customerInvoices.map((inv) => (
                    <div 
                      key={inv.id}
                      onClick={() => handleSelectInvoiceToReturn(inv)}
                      style={{ 
                        backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#1b4332';
                        e.currentTarget.style.backgroundColor = '#f0fdf4';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1b4332' }}>
                          Invoice #{inv.invoice_number}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          Date: {inv.date ? new Date(inv.date).toLocaleDateString() : 'N/A'} • Items: {inv.items?.length || 0}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                          ₹{Number(inv.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span style={{ fontSize: '11px', color: '#1b4332', fontWeight: 700 }}>Select & Load &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right', backgroundColor: '#ffffff' }}>
              <button 
                onClick={() => setShowBillPickerModal(false)}
                style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
