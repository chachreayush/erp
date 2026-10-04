import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Calendar, FileText, User } from 'lucide-react';
import apiClient from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';

export default function SalesOrderMaster() {
  useReturnNavigation();
  const [poNumber, setPoNumber] = useState('SO-1001');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendors, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [partiesRes, productsRes] = await Promise.all([
          apiClient.get('/api/master/parties?type=vendor'),
          apiClient.get('/api/products/')
        ]);
        setCustomers(partiesRes.data);
        setProducts(productsRes.data);
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
            updated.rate = prod.sales_rate || 0;
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
      alert('Please select a vendor and add at least one item.');
      return;
    }
    
    try {
      await apiClient.post('/api/orders', {
        po_number: poNumber,
        date: new Date(date).toISOString(),
        vendor_id: selectedCustomer,
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
      setPoNumber(`SO-${parseInt(poNumber.split('-')[1]) + 1}`);
    } catch (err) {
      console.error(err);
      alert('Failed to save PO.');
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Create Sales Order</h1>
        <button onClick={handleSave} style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={16} /> Save PO
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: 1, backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>PO Number</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0 8px' }}>
            <FileText size={14} color="var(--color-text-muted)" />
            <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }} />
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>PO Date</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0 8px' }}>
            <Calendar size={14} color="var(--color-text-muted)" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }} />
          </div>
        </div>

        <div style={{ flex: 2, backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Customer</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0 8px' }}>
            <User size={14} color="var(--color-text-muted)" />
            <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }}>
              <option value="">-- Select Customer --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
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
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Rate</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Total</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px 16px' }}>
                    <select value={item.product_id} onChange={e => updateItem(item.id, 'product_id', e.target.value)} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--color-text)', width: '100%', outline: 'none' }}>
                      <option value="">-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--color-text)', width: '100%', outline: 'none', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input type="number" value={item.rate} onChange={e => updateItem(item.id, 'rate', e.target.value)} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--color-text)', width: '100%', outline: 'none', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'right', color: 'var(--color-text)', fontWeight: '500' }}>
                    {item.line_total.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                    <button onClick={() => removeRow(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No items added. Click "+ Add Item" to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div style={{ backgroundColor: 'var(--color-bg)', borderTop: '1px solid var(--color-border)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={addRow} style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Add Item
          </button>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Total Amount</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-primary)' }}>₹{totalAmount.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
