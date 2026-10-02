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
    <div style={{ backgroundColor: '#0b1120', flex: 1, display: 'flex', flexDirection: 'column', color: '#f8fafc', padding: '16px', height: '100vh', boxSizing: 'border-box' }}>
      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: '12px 20px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#f8fafc' }}>Internal Stock Shift (Main -> Brk/Exp)</h1>
        </div>
        <button onClick={handleSave} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={16} /> Save Shift Voucher
        </button>
      </div>

      {/* Header Info */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Shift Date</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0 8px' }}>
            <Calendar size={14} color="#64748b" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#f8fafc', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }} />
          </div>
        </div>
        <div style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Shift Voucher No.</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0 8px' }}>
            <FileText size={14} color="#64748b" />
            <input type="text" value={shiftNo} onChange={(e) => setShiftNo(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#f8fafc', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }} />
          </div>
        </div>
        <div style={{ flex: 2, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Remarks / Reason</label>
          <input type="text" placeholder="e.g. Found expired on Shelf A" value={remarks} onChange={(e) => setRemarks(e.target.value)} style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '13px', width: '100%', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ backgroundColor: '#1e293b', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '500', width: '40px' }}>#</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '500' }}>Product (Main Stock)</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '500' }}>Batch</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: '500', width: '120px' }}>Qty</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: '500', width: '120px' }}>Rate</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: '500', width: '120px' }}>Value</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: '500', width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '8px 16px', color: '#64748b' }}>{index + 1}</td>
                  <td style={{ padding: '8px 16px' }}>
                    <input type="text" placeholder="Select Product" value={item.product} onChange={(e) => updateItem(item.id, 'product', e.target.value)} style={{ backgroundColor: 'transparent', border: 'none', color: '#f8fafc', width: '100%', outline: 'none' }} />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input type="text" placeholder="Batch No" value={item.batch} onChange={(e) => updateItem(item.id, 'batch', e.target.value)} style={{ backgroundColor: 'transparent', border: 'none', color: '#f8fafc', width: '100%', outline: 'none' }} />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input type="number" value={item.qty || ''} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} style={{ backgroundColor: 'transparent', border: 'none', color: '#f8fafc', width: '100%', outline: 'none', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input type="number" value={item.rate || ''} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} style={{ backgroundColor: 'transparent', border: 'none', color: '#f8fafc', width: '100%', outline: 'none', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'right', color: '#f8fafc' }}>
                    {item.value.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                    <button onClick={() => removeRow(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer Summary */}
        <div style={{ backgroundColor: '#0b1120', borderTop: '1px solid #334155', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={addRow} style={{ backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
            + Add Row
          </button>
          
          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Total Shift Qty</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f8fafc' }}>{totalQty}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Total Shift Value</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>₹{totalValue.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
