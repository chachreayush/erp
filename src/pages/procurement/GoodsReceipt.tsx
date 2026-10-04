import React, { useState, useEffect } from 'react';
import { Save, Download, PackageCheck, AlertTriangle } from 'lucide-react';
import apiClient from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import { useNavigate } from 'react-router-dom';

export default function GoodsReceipt() {
  useReturnNavigation();
  const navigate = useNavigate();
  const [grnNumber, setGrnNumber] = useState('GRN-1001');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [pos, setPos] = useState<any[]>([]);
  const [selectedPo, setSelectedPo] = useState('');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const res = await apiClient.get('/api/procurement/orders');
        setPos(res.data.filter((po: any) => po.status === 'APPROVED' || po.status === 'PARTIAL'));
      } catch (err) {
        console.error('Failed to load POs', err);
      }
    };
    fetchPOs();
  }, []);

  const handleLoadPo = () => {
    const po = pos.find(p => p.id === selectedPo);
    if (!po) return;
    
    // Map PO items to GRN items (which will be saved as InvoiceItems)
    const grnItems = po.items.map((item: any, index: number) => ({
      id: Date.now() + index,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity - item.received_qty, // default to remaining qty
      rate: item.rate,
      igst_percent: 0,
      line_total: (item.quantity - item.received_qty) * item.rate,
    }));
    setItems(grnItems);
  };

  const updateItem = (id: number, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.line_total = (Number(updated.quantity) || 0) * (Number(updated.rate) || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.line_total) || 0), 0);
  const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const handleSaveGRN = async () => {
    if (items.length === 0) {
      alert('Cannot save empty GRN.');
      return;
    }

    const po = pos.find(p => p.id === selectedPo);
    
    try {
      // Save as an Invoice with type "grn"
      await apiClient.post('/api/sales/invoices', {
        invoice_type: 'grn',
        customer_name: po ? `Vendor (PO: ${po.po_number})` : 'Vendor',
        invoice_number: grnNumber,
        date: new Date(date).toISOString(),
        items: items.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
          igst_percent: 0,
          line_total: Number(i.line_total)
        }))
      });
      alert('Goods Receipt Note (GRN) saved! Stock has been updated.');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Failed to save GRN.');
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PackageCheck size={24} color="var(--color-primary)" /> Goods Receipt Note (Inward)
        </h1>
        <button onClick={handleSaveGRN} style={{ backgroundColor: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={16} /> Post GRN (Update Stock)
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Import from Purchase Order</label>
          <select value={selectedPo} onChange={e => setSelectedPo(e.target.value)} style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', borderRadius: '4px' }}>
            <option value="">-- Select Pending PO --</option>
            {pos.map(p => (
              <option key={p.id} value={p.id}>{p.po_number} ({new Date(p.date).toLocaleDateString()})</option>
            ))}
          </select>
        </div>
        <div>
          <button onClick={handleLoadPo} style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: '4px', padding: '8px 16px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Load PO Items
          </button>
        </div>
        <div style={{ flex: 1, marginLeft: '32px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>GRN Number</label>
          <input type="text" value={grnNumber} onChange={e => setGrnNumber(e.target.value)} style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', borderRadius: '4px' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', borderRadius: '4px' }} />
        </div>
      </div>

      <div style={{ flex: 1, backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ backgroundColor: 'var(--color-table-header)', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Product</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Expected Qty</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Received Qty</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Rate</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Value</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const poItem = pos.find(p => p.id === selectedPo)?.items.find((i: any) => i.product_id === item.product_id);
                const expected = poItem ? poItem.quantity - poItem.received_qty : 0;
                const variance = item.quantity - expected;
                
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '500' }}>{item.product_name}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--color-text-muted)' }}>{expected}</td>
                    <td style={{ padding: '8px 16px' }}>
                      <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', width: '100%', outline: 'none', textAlign: 'right', padding: '4px 8px', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{Number(item.rate).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>{item.line_total.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {variance < 0 ? (
                        <span style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px' }}>
                          <AlertTriangle size={12} /> Shortage
                        </span>
                      ) : variance > 0 ? (
                        <span style={{ color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px' }}>
                          <AlertTriangle size={12} /> Excess
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-success)', fontSize: '11px' }}>Match</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Select a PO and click "Load PO Items" to begin receiving goods.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ backgroundColor: 'var(--color-bg)', borderTop: '1px solid var(--color-border)', padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: '32px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Total Received Qty</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)' }}>{totalQty}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Total Value</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-primary)' }}>₹{totalAmount.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
