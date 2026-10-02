import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Trash2, Calendar, FileText } from 'lucide-react';

export default function StockShiftVoucher() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftNo, setShiftNo] = useState('SHF-001');
  const [remarks, setRemarks] = useState('');
  
  const [items, setItems] = useState([
    { id: 1, product: '', batch: '', qty: 0, rate: 0, value: 0 }
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/dashboard');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const addRow = () => {
    setItems([...items, { id: Date.now(), product: '', batch: '', qty: 0, rate: 0, value: 0 }]);
  };

  const updateItem = (id: number, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'rate') {
          updated.value = (Number(updated.qty) || 0) * (Number(updated.rate) || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const removeRow = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalValue = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  const handleSave = () => {
    alert('Stock Shift Voucher Saved Successfully! Product Register updated.');
    navigate('/dashboard');
  };

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', flex: 1, display: 'flex', flexDirection: 'column', color: 'var(--color-text)', padding: '20px', height: '100%', boxSizing: 'border-box' }}>
      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-subtle)', padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--color-text)' }}>Internal Stock Shift (Main -&gt; Brk/Exp)</h1>
        </div>
        <button onClick={handleSave} style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={16} /> Save Shift Voucher
        </button>
      </div>

      {/* Header Info */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div style={{ flex: 1, backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Shift Date</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0 8px' }}>
            <Calendar size={14} color="var(--color-text-muted)" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }} />
          </div>
        </div>
        <div style={{ flex: 1, backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Shift Voucher No.</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0 8px' }}>
            <FileText size={14} color="var(--color-text-muted)" />
            <input type="text" value={shiftNo} onChange={(e) => setShiftNo(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }} />
          </div>
        </div>
        <div style={{ flex: 2, backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Remarks / Reason</label>
          <input type="text" placeholder="e.g. Found expired on Shelf A" value={remarks} onChange={(e) => setRemarks(e.target.value)} style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ backgroundColor: 'var(--color-table-header)', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--color-text)', fontWeight: '500', width: '40px', borderBottom: '1px solid var(--color-border)' }}>#</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--color-text)', fontWeight: '500', borderBottom: '1px solid var(--color-border)' }}>Product (Main Stock)</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--color-text)', fontWeight: '500', borderBottom: '1px solid var(--color-border)' }}>Batch</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text)', fontWeight: '500', width: '120px', borderBottom: '1px solid var(--color-border)' }}>Qty</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text)', fontWeight: '500', width: '120px', borderBottom: '1px solid var(--color-border)' }}>Rate</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text)', fontWeight: '500', width: '120px', borderBottom: '1px solid var(--color-border)' }}>Value</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--color-text)', fontWeight: '500', width: '60px', borderBottom: '1px solid var(--color-border)' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px 16px', color: 'var(--color-text-muted)' }}>{index + 1}</td>
                  <td style={{ padding: '8px 16px' }}>
                    <input type="text" placeholder="Select Product" value={item.product} onChange={(e) => updateItem(item.id, 'product', e.target.value)} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--color-text)', width: '100%', outline: 'none' }} />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input type="text" placeholder="Batch No" value={item.batch} onChange={(e) => updateItem(item.id, 'batch', e.target.value)} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--color-text)', width: '100%', outline: 'none' }} />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input type="number" value={item.qty || ''} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--color-text)', width: '100%', outline: 'none', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input type="number" value={item.rate || ''} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--color-text)', width: '100%', outline: 'none', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'right', color: 'var(--color-text)', fontWeight: '500' }}>
                    {item.value.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                    <button onClick={() => removeRow(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer Summary */}
        <div style={{ backgroundColor: 'var(--color-bg)', borderTop: '1px solid var(--color-border)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={addRow} style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
            + Add Row
          </button>
          
          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Total Shift Qty</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text)' }}>{totalQty}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Total Shift Value</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>₹{totalValue.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
