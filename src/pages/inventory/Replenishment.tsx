import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { Settings, Calculator, ShoppingCart, List, FileText } from 'lucide-react';

export default function Replenishment() {

  const navigate = useNavigate();
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/dashboard');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const [activeTab, setActiveTab] = useState('proposals');

  return (
    <div style={{ backgroundColor: '#0b1120', flex: 1, display: 'flex', flexDirection: 'column', color: '#f8fafc', padding: '16px', height: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#f8fafc' }}>Replenishment & Reorder Engine</h1>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Generate purchase proposals based on configured rules and eligible stock</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', marginBottom: '16px' }}>
        <button 
          onClick={() => setActiveTab('proposals')}
          style={{ backgroundColor: activeTab === 'proposals' ? '#1e293b' : 'transparent', color: activeTab === 'proposals' ? '#38bdf8' : '#94a3b8', border: 'none', borderBottom: activeTab === 'proposals' ? '2px solid #38bdf8' : '2px solid transparent', padding: '8px 16px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingCart size={16} /> Purchase Proposals
        </button>
        <button 
          onClick={() => setActiveTab('rules')}
          style={{ backgroundColor: activeTab === 'rules' ? '#1e293b' : 'transparent', color: activeTab === 'rules' ? '#38bdf8' : '#94a3b8', border: 'none', borderBottom: activeTab === 'rules' ? '2px solid #38bdf8' : '2px solid transparent', padding: '8px 16px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={16} /> Reorder Rules & Formulas
        </button>
      </div>

      {activeTab === 'proposals' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Select criteria to generate new purchase proposals based on current Reorder-Eligible stock.
            </div>
            <button style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={16} /> Generate Proposals
            </button>
          </div>
          
          <div style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#1e293b' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '500' }}>Product</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '500' }}>Formula Applied</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: '500' }}>Reorder-Eligible Stock</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: '500' }}>Suggested Qty</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: '500' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <List size={32} style={{ opacity: 0.5, marginBottom: '12px', display: 'block', margin: '0 auto' }} />
                    No proposals generated yet. Click "Generate Proposals" to run the engine.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '16px' }}>Formula Builder</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Product / Category Target</label>
                <select style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '13px', width: '100%', outline: 'none', marginBottom: '16px' }}>
                  <option value="ALL">All Products (Global Default)</option>
                  <option value="CAT1">Category: Fast Movers</option>
                </select>

                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Safety Stock Qty</label>
                <input type="number" defaultValue="10" style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '13px', width: '100%', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#38bdf8', marginBottom: '4px' }}>Calculation Formula</label>
                <textarea 
                  defaultValue="MAX(0, (AVG_SALES_60D * 1.5) + Safety_Stock - Reorder_Eligible_Stock)"
                  style={{ backgroundColor: '#1e293b', border: '1px solid #38bdf8', borderRadius: '4px', color: '#f8fafc', padding: '12px', fontSize: '14px', fontFamily: 'monospace', width: '100%', height: '100px', outline: 'none', boxSizing: 'border-box', resize: 'none' }} 
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', backgroundColor: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1', cursor: 'pointer' }}>AVG_SALES_60D</span>
                  <span style={{ fontSize: '10px', backgroundColor: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1', cursor: 'pointer' }}>Reorder_Eligible_Stock</span>
                  <span style={{ fontSize: '10px', backgroundColor: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1', cursor: 'pointer' }}>Safety_Stock</span>
                  <span style={{ fontSize: '10px', backgroundColor: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1', cursor: 'pointer' }}>Eligible_Open_PO</span>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 24px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
