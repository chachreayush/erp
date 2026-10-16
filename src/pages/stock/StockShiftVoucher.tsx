import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Save, ArrowLeft, Trash2, Calendar, FileText, Filter, Download, 
  ShieldAlert, CheckCircle2, ExternalLink, ArrowRight, Warehouse, AlertTriangle
} from 'lucide-react';
import apiClient from '../../lib/api';

interface ShiftItemRow {
  id: number | string;
  batch_id: string;
  product_id: string;
  product_name: string;
  batch_number: string;
  expiry: string;
  current_stock: number;
  qty: number;
  rate: number;
  value: number;
}

export default function StockShiftVoucher() {
  useReturnNavigation();
  const navigate = useNavigate();
  const location = useLocation();

  // Header State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftNo, setShiftNo] = useState('SHF-2026-AUTO');
  const [fromGodown, setFromGodown] = useState('MAIN_SALEABLE_GODOWN');
  const [toGodown, setToGodown] = useState('QUARANTINE_EXPIRY_GODOWN');
  const [remarks, setRemarks] = useState('Pharma Expiry & Damaged Stock Quarantine');

  // Principal & Claim Configuration
  const [autoGenerateClaim, setAutoGenerateClaim] = useState(true);
  const [selectedPrincipalId, setSelectedPrincipalId] = useState('');
  const [principals, setPrincipals] = useState<any[]>([]);

  // Line items state
  const [items, setItems] = useState<ShiftItemRow[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [filterExpiry, setFilterExpiry] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Success Result State
  const [saveResult, setSaveResult] = useState<any | null>(null);

  // Fetch Master Data (Manufacturers & Principals)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [compRes, princRes] = await Promise.all([
          apiClient.get('/api/master/manufacturers').catch(() => ({ data: [] })),
          apiClient.get('/api/principal/summary').catch(() => ({ data: null }))
        ]);
        setCompanies(compRes.data || []);
        
        // Populate Principals list
        const defaultPrincipals = [
          { id: '11111111-1111-1111-1111-111111111111', name: 'Sun Pharma Healthcare Ltd.' },
          { id: '22222222-2222-2222-2222-222222222222', name: 'Cipla Therapeutics Ltd.' },
          { id: '78fca6c8-eb92-41c4-96ec-ac2e150d56a4', name: 'Krishna Medical Agencies (Client)' }
        ];
        setPrincipals(defaultPrincipals);
        setSelectedPrincipalId(defaultPrincipals[0].id);
      } catch (err) {
        console.error('Failed to load manufacturers/principals', err);
      }
    };
    fetchData();
  }, []);

  // Pre-populate if navigated with selected batches from Expiry Radar
  useEffect(() => {
    if (location.state?.preSelectedBatches && Array.isArray(location.state.preSelectedBatches)) {
      const incoming = location.state.preSelectedBatches.map((b: any, idx: number) => ({
        id: Date.now() + idx,
        batch_id: b.batch_id,
        product_id: b.product_id,
        product_name: b.product_name,
        batch_number: b.batch_number,
        expiry: b.expiry || '-',
        current_stock: Number(b.current_stock) || 0,
        qty: Number(b.qty) || Number(b.current_stock) || 1,
        rate: Number(b.rate) || 0,
        value: (Number(b.qty) || Number(b.current_stock) || 1) * (Number(b.rate) || 0)
      }));
      setItems(incoming);
    }
  }, [location.state]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/inventory-dashboard');
      } else if (e.key === 'F2') {
        e.preventDefault();
        navigate('/inventory-dashboard');
      } else if (e.key === 'F8') {
        e.preventDefault();
        navigate('/principal');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const updateItem = (id: number | string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'rate') {
          const qty = Number(updated.qty) || 0;
          const rate = Number(updated.rate) || 0;
          updated.value = qty * rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeRow = (id: number | string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const clearGrid = () => {
    if (window.confirm('Clear all items from the shift grid?')) {
      setItems([]);
      setSaveResult(null);
    }
  };

  const handleAutoFill = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterExpiry) params.append('expiry_before', filterExpiry);
      if (filterCompany) params.append('company_id', filterCompany);

      const res = await apiClient.get('/api/stock/auto-shift-candidates?' + params.toString());
      if (res.data && res.data.candidates) {
        const newItems: ShiftItemRow[] = res.data.candidates.map((c: any, index: number) => ({
          id: Date.now() + index,
          batch_id: c.batch_id,
          product_id: c.product_id,
          product_name: c.product_name,
          batch_number: c.batch_number,
          expiry: c.expiry || '-',
          current_stock: Number(c.qty) || 0,
          qty: Number(c.qty) || 0,
          rate: Number(c.rate) || 0,
          value: Number(c.value) || 0
        }));
        setItems(newItems);
        if (newItems.length === 0) {
          alert('No batches matched the selected filters.');
        }
      }
    } catch (err) {
      console.error('Failed to load shift candidates', err);
      alert('Failed to load candidates.');
    } finally {
      setLoading(false);
    }
  };

  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalValue = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  // Save Shift Voucher to Backend
  const handleSave = async () => {
    if (items.length === 0) {
      alert('Cannot save an empty stock shift voucher. Please load or add batches.');
      return;
    }

    // Validate quantities against stock
    for (const it of items) {
      if (it.qty <= 0) {
        alert(`Quantity for item ${it.product_name} must be greater than zero.`);
        return;
      }
      if (it.current_stock > 0 && it.qty > it.current_stock) {
        alert(`Shift quantity (${it.qty}) exceeds available stock (${it.current_stock}) for batch ${it.batch_number}.`);
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        voucher_no: shiftNo === 'SHF-2026-AUTO' ? undefined : shiftNo,
        shift_date: date,
        from_godown: fromGodown,
        to_godown: toGodown,
        reason: remarks,
        principal_id: autoGenerateClaim ? selectedPrincipalId : undefined,
        auto_create_principal_claim: autoGenerateClaim,
        items: items.map(it => ({
          batch_id: it.batch_id,
          product_id: it.product_id,
          qty: Number(it.qty),
          rate: Number(it.rate)
        }))
      };

      const res = await apiClient.post('/api/stock/shifts', payload);
      setSaveResult(res.data);
    } catch (err: any) {
      console.error('Failed to save stock shift voucher', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to save shift voucher';
      alert(`Error saving shift voucher: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-bg, #0f172a)', flex: 1, display: 'flex', flexDirection: 'column', color: 'var(--color-text, #f8fafc)', padding: '16px 24px', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      
      {/* ── Action Bar ──────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-subtle, #1e293b)', padding: '12px 18px', borderRadius: '8px', border: '1px solid var(--color-border, #334155)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button 
            id="btn-back-to-cockpit"
            onClick={() => navigate('/inventory-dashboard')} 
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted, #94a3b8)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--color-text, #f8fafc)' }}>
              Internal Stock Shift Voucher (Main Saleable &rarr; Quarantine Godown)
            </h1>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)' }}>
              DOC-41 Pharma Expiry Reallocation & Automated Principal Claim Bridging
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            id="btn-save-shift-voucher"
            onClick={handleSave} 
            disabled={saving || items.length === 0}
            style={{ 
              backgroundColor: items.length === 0 ? '#475569' : '#059669', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              padding: '8px 18px', 
              fontSize: '13px', 
              fontWeight: 600, 
              cursor: items.length === 0 ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px' 
            }}
          >
            <Save size={16} /> {saving ? 'Executing Shift...' : 'Save Shift Voucher [F7]'}
          </button>
        </div>
      </div>

      {/* ── SUCCESS RESULT CARD (Rendered upon Save) ──── */}
      {saveResult && (
        <div id="stock-shift-success-card" style={{ backgroundColor: 'rgba(6, 78, 59, 0.4)', border: '1px solid #10b981', borderRadius: '8px', padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <CheckCircle2 size={28} color="#34d399" />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#34d399' }}>
                  Stock Shift Voucher Recorded Successfully!
                </div>
                <div style={{ fontSize: '13px', color: '#e2e8f0', marginTop: '2px' }}>
                  Voucher No: <strong id="lbl-success-voucher-no" style={{ fontFamily: 'monospace', color: '#67e8f9' }}>{saveResult.voucher_no}</strong> | Shifted <strong>{saveResult.total_qty} units</strong> ({saveResult.total_items} items) into Quarantine Godown.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="btn-view-in-audit"
                onClick={() => navigate('/inventory-dashboard')}
                style={{ backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                View in Audit Register [F2]
              </button>
              {saveResult.principal_claim && (
                <button
                  id="btn-view-claim-desk"
                  onClick={() => navigate('/principal')}
                  style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Open Claim Desk [F8] <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>

          {saveResult.principal_claim && (
            <div id="card-auto-claim-details" style={{ marginTop: '12px', backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid #0369a1', borderRadius: '6px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase' }}>⚡ Automated Principal Claim Filed:</span>
                <div style={{ fontSize: '13px', color: '#f8fafc', marginTop: '2px' }}>
                  Claim No: <strong id="lbl-success-claim-no" style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{saveResult.principal_claim.claim_number}</strong> | Principal: <strong>{saveResult.principal_claim.principal_name}</strong> | Amount: <strong style={{ color: '#4ade80' }}>₹{saveResult.principal_claim.claimed_amount.toFixed(2)}</strong>
                </div>
              </div>
              <span style={{ backgroundColor: '#0c4a6e', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                {saveResult.principal_claim.status}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Voucher Configuration Header ────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }}>
        
        {/* Date */}
        <div style={{ backgroundColor: 'var(--color-bg-subtle, #1e293b)', border: '1px solid var(--color-border, #334155)', borderRadius: '8px', padding: '12px 14px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '4px' }}>Shift Date</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-bg, #0f172a)', border: '1px solid var(--color-border, #334155)', borderRadius: '4px', padding: '0 8px' }}>
            <Calendar size={14} color="var(--color-text-muted, #94a3b8)" />
            <input 
              id="input-shift-date"
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text, #f8fafc)', padding: '6px', fontSize: '12px', width: '100%', outline: 'none' }} 
            />
          </div>
        </div>

        {/* Voucher No */}
        <div style={{ backgroundColor: 'var(--color-bg-subtle, #1e293b)', border: '1px solid var(--color-border, #334155)', borderRadius: '8px', padding: '12px 14px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '4px' }}>Shift Voucher No.</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-bg, #0f172a)', border: '1px solid var(--color-border, #334155)', borderRadius: '4px', padding: '0 8px' }}>
            <FileText size={14} color="var(--color-text-muted, #94a3b8)" />
            <input 
              id="input-shift-voucher-no"
              type="text" 
              value={shiftNo} 
              onChange={(e) => setShiftNo(e.target.value)} 
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text, #f8fafc)', padding: '6px', fontSize: '12px', width: '100%', outline: 'none', fontFamily: 'monospace' }} 
            />
          </div>
        </div>

        {/* From Godown */}
        <div style={{ backgroundColor: 'var(--color-bg-subtle, #1e293b)', border: '1px solid var(--color-border, #334155)', borderRadius: '8px', padding: '12px 14px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '4px' }}>Source Godown (From)</label>
          <select
            id="select-from-godown"
            value={fromGodown}
            onChange={e => setFromGodown(e.target.value)}
            style={{ width: '100%', backgroundColor: 'var(--color-bg, #0f172a)', color: 'var(--color-text, #f8fafc)', border: '1px solid var(--color-border, #334155)', borderRadius: '4px', padding: '6px 8px', fontSize: '12px' }}
          >
            <option value="MAIN_SALEABLE_GODOWN">Main Saleable Godown</option>
            <option value="DISPATCH_HOLDING_BAY">Dispatch Holding Bay</option>
          </select>
        </div>

        {/* To Godown */}
        <div style={{ backgroundColor: 'var(--color-bg-subtle, #1e293b)', border: '1px solid var(--color-border, #334155)', borderRadius: '8px', padding: '12px 14px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '4px' }}>Destination Godown (To)</label>
          <select
            id="select-to-godown"
            value={toGodown}
            onChange={e => setToGodown(e.target.value)}
            style={{ width: '100%', backgroundColor: 'var(--color-bg, #0f172a)', color: 'var(--color-text, #f8fafc)', border: '1px solid var(--color-border, #334155)', borderRadius: '4px', padding: '6px 8px', fontSize: '12px' }}
          >
            <option value="QUARANTINE_EXPIRY_GODOWN">Quarantine / Expiry Godown</option>
            <option value="BREAKAGE_DAMAGED_GODOWN">Breakage / Damaged Godown</option>
          </select>
        </div>
      </div>

      {/* ── Auto-Claim Configuration Bar ────────────── */}
      <div style={{ backgroundColor: 'var(--color-bg-subtle, #1e293b)', border: '1px solid var(--color-border, #334155)', borderRadius: '8px', padding: '12px 18px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            id="check-auto-claim"
            type="checkbox"
            checked={autoGenerateClaim}
            onChange={e => setAutoGenerateClaim(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <div>
            <label htmlFor="check-auto-claim" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary, #38bdf8)', cursor: 'pointer' }}>
              ⚡ Auto-Generate Principal Expiry Claim & Debit Note
            </label>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)' }}>
              Automatically post an official claim (CLM-PRN-XXXX) to the Principal Claims Desk for recovery.
            </div>
          </div>
        </div>

        {autoGenerateClaim && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)' }}>Target Principal:</span>
            <select
              id="select-principal-claim-target"
              value={selectedPrincipalId}
              onChange={e => setSelectedPrincipalId(e.target.value)}
              style={{
                backgroundColor: 'var(--color-bg, #0f172a)',
                color: 'var(--color-text, #f8fafc)',
                border: '1px solid #0284c7',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {principals.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Auto-Fill Candidates Filter ──────────────── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-end', backgroundColor: 'var(--color-bg-subtle, #1e293b)', border: '1px solid var(--color-border, #334155)', borderRadius: '8px', padding: '12px 16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '4px' }}>Filter: Expired Before (MM/YY)</label>
          <input 
            id="filter-expiry-mmyy"
            type="text" 
            placeholder="e.g. 12/26" 
            value={filterExpiry} 
            onChange={(e) => setFilterExpiry(e.target.value)} 
            style={{ backgroundColor: 'var(--color-bg, #0f172a)', border: '1px solid var(--color-border, #334155)', borderRadius: '4px', color: 'var(--color-text, #f8fafc)', padding: '6px 8px', fontSize: '12px', width: '100%', outline: 'none', boxSizing: 'border-box' }} 
          />
        </div>
        
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '4px' }}>Filter: Manufacturer</label>
          <select 
            id="filter-shift-company"
            value={filterCompany} 
            onChange={(e) => setFilterCompany(e.target.value)}
            style={{ backgroundColor: 'var(--color-bg, #0f172a)', border: '1px solid var(--color-border, #334155)', borderRadius: '4px', color: 'var(--color-text, #f8fafc)', padding: '6px 8px', fontSize: '12px', width: '100%', outline: 'none', boxSizing: 'border-box' }}
          >
            <option value="">-- All Manufacturers --</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            id="btn-auto-load-candidates"
            onClick={handleAutoFill} 
            disabled={loading} 
            style={{ backgroundColor: 'var(--color-primary, #38bdf8)', color: '#0f172a', border: 'none', borderRadius: '4px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> {loading ? 'Loading...' : 'Auto-Load Candidates'}
          </button>
          
          <button 
            id="btn-clear-shift-grid"
            onClick={clearGrid} 
            style={{ backgroundColor: 'transparent', color: '#f87171', border: '1px solid #f87171', borderRadius: '4px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            Clear Grid
          </button>
        </div>
      </div>

      {/* ── Shift Items Grid ─────────────────────────── */}
      <div style={{ flex: 1, backgroundColor: 'var(--color-bg-subtle, #1e293b)', border: '1px solid var(--color-border, #334155)', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table id="tbl-shift-items" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ backgroundColor: 'rgba(0,0,0,0.25)', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ borderBottom: '1px solid var(--color-border, #334155)', color: 'var(--color-text-muted, #94a3b8)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', width: '30px' }}>#</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Product (Main Stock)</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', width: '130px' }}>Batch No</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', width: '90px' }}>Expiry</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', width: '100px' }}>Stock Avail</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', width: '100px' }}>Shift Qty</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', width: '100px' }}>Cost Rate</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', width: '110px' }}>Shift Value</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-muted, #94a3b8)' }}>
                    No items added. Use "Auto-Load Candidates" or navigate from the Expiry Radar table [F2].
                  </td>
                </tr>
              ) : items.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border, #334155)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--color-text-muted, #94a3b8)' }}>{index + 1}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{item.product_name}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{item.batch_number}</td>
                  <td style={{ padding: '8px 12px', color: '#f87171', fontFamily: 'monospace' }}>{item.expiry}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-text-muted, #94a3b8)' }}>{item.current_stock}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <input 
                      type="number" 
                      className="input-item-shift-qty"
                      value={item.qty || ''} 
                      onChange={(e) => updateItem(item.id, 'qty', e.target.value)} 
                      style={{ backgroundColor: 'var(--color-bg, #0f172a)', border: '1px solid var(--color-border, #334155)', borderRadius: '4px', color: 'var(--color-text, #f8fafc)', width: '100%', outline: 'none', textAlign: 'right', padding: '4px 6px', fontWeight: 600 }} 
                    />
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <input 
                      type="number" 
                      value={item.rate || ''} 
                      onChange={(e) => updateItem(item.id, 'rate', e.target.value)} 
                      style={{ backgroundColor: 'var(--color-bg, #0f172a)', border: '1px solid var(--color-border, #334155)', borderRadius: '4px', color: 'var(--color-text, #f8fafc)', width: '100%', outline: 'none', textAlign: 'right', padding: '4px 6px' }} 
                    />
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#38bdf8' }}>
                    ₹{(item.value || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <button onClick={() => removeRow(item.id)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Footer Summary ─────────────────────────── */}
        <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--color-border, #334155)', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)' }}>
            Total Items: <strong style={{ color: 'var(--color-text, #f8fafc)' }}>{items.length} batches</strong>
          </div>

          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)' }}>Total Shift Quantity</div>
              <div id="lbl-total-shift-qty" style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text, #f8fafc)' }}>{totalQty} Units</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)' }}>Total Shift Valuation</div>
              <div id="lbl-total-shift-val" style={{ fontSize: '16px', fontWeight: 'bold', color: '#38bdf8' }}>₹{totalValue.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
