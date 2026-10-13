import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Calendar, FileText, User, ArrowLeft } from 'lucide-react';
import apiClient from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import { useNavigate } from 'react-router-dom';

export default function SalesOrderMaster() {
  useReturnNavigation();
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('SO-1001');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [partiesRes, productsRes] = await Promise.all([
          apiClient.get('/api/master/parties?type=customer'),
          apiClient.get('/api/products/')
        ]);
        setCustomers(partiesRes.data || []);
        setProducts(productsRes.data || []);
      } catch (err) {
        console.error('Failed to load master data', err);
      }
    };
    fetchMasterData();
  }, []);

  const addRow = () => {
    setItems([...items, { id: Date.now(), product_id: '', product_name: '', quantity: 1, rate: 0, line_total: 0 }]);
  };

  const updateItem = (id: number, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'product_id') {
          const prod = products.find(p => p.id === value);
          if (prod) {
            updated.product_name = prod.name;
            updated.rate = prod.rate_a || prod.sales_rate || prod.mrp || 0;
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

  const removeRow = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.line_total) || 0), 0);

  const handleSave = async () => {
    if (!selectedCustomer || items.length === 0) {
      alert('Please select a customer and add at least one item.');
      return;
    }
    
    try {
      await apiClient.post('/api/orders', {
        order_number: orderNumber,
        date: new Date(date).toISOString(),
        party_id: selectedCustomer,
        status: 'APPROVED',
        total_amount: totalAmount,
        items: items.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
          line_total: Number(i.line_total)
        }))
      });
      alert('Sales Order Created Successfully!');
      setItems([]);
      setOrderNumber(`SO-${parseInt(orderNumber.split('-')[1] || '1000') + 1}`);
    } catch (err: any) {
      console.error(err);
      alert('Failed to save Sales Order: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate(-1)} 
            style={{ backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <ArrowLeft size={14} /> [ESC] Exit
          </button>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>Create Sales Order</h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>Order intake and stock reservation engine (DOC-18)</p>
          </div>
        </div>
        <button onClick={handleSave} style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 18px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={16} /> Save Sales Order
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div style={{ flex: 1, backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Order Number</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0 8px' }}>
            <FileText size={14} color="var(--color-text-muted)" />
            <input type="text" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }} />
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Order Date</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0 8px' }}>
            <Calendar size={14} color="var(--color-text-muted)" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }} />
          </div>
        </div>

        <div style={{ flex: 2, backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Customer (Debtor)</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0 8px' }}>
            <User size={14} color="var(--color-text-muted)" />
            <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }}>
              <option value="" style={{ background: '#0f172a' }}>-- Select Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id} style={{ background: '#0f172a' }}>
                  {c.legal_name || c.trade_name || c.name || 'Customer'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ backgroundColor: 'var(--color-table-header)', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Product</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Quantity</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Rate (₹)</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Total (₹)</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid var(--color-border)', width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px 16px' }}>
                    <select value={item.product_id} onChange={e => updateItem(item.id, 'product_id', e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: 'var(--color-text)', width: '100%', padding: '6px', outline: 'none' }}>
                      <option value="">-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} {p.packing ? `(${p.packing})` : ''}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: 'var(--color-text)', width: '100%', padding: '6px', outline: 'none', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input type="number" step="0.01" value={item.rate} onChange={e => updateItem(item.id, 'rate', e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: 'var(--color-text)', width: '100%', padding: '6px', outline: 'none', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'right', color: 'var(--color-text)', fontWeight: '600' }}>
                    ₹{item.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                    <button onClick={() => removeRow(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No items added. Click "+ Add Item" below to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div style={{ backgroundColor: 'var(--color-bg)', borderTop: '1px solid var(--color-border)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={addRow} style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Add Item
          </button>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Total Order Value</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8' }}>
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
