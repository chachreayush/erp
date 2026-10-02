import { useNavigate } from 'react-router-dom';
import React, { useEffect, { useState } from 'react';
import { Search, Info, AlertCircle, RefreshCw } from 'lucide-react';

export default function CustomerClaims() {

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

  const [customerName, setCustomerName] = useState('');
  const [productName, setProductName] = useState('');
  
  return (
    <div style={{ backgroundColor: '#0b1120', flex: 1, display: 'flex', flexDirection: 'column', color: '#f8fafc', padding: '16px', height: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Customer Expiry / Breakage Intake
          <span style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 6px', borderRadius: '10px' }}>
            Non-Sellable Quarantine
          </span>
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Left Side: Receiving Form */}
        <div style={{ flex: 1.5, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Customer / Party</label>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0 8px' }}>
                <Search size={14} color="#64748b" />
                <input type="text" placeholder="Select Customer (F2)" style={{ background: 'transparent', border: 'none', color: '#f8fafc', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Claim Type</label>
              <select style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }}>
                <option value="EXPIRY">Expiry (Date Passed)</option>
                <option value="BREAKAGE">Breakage / Damaged Goods</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Product</label>
              <input type="text" placeholder="Scan or Search Product" style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '13px', width: '100%', outline: 'none', boxSizing: 'border-box' }} value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Batch</label>
              <input type="text" placeholder="Batch No." style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '13px', width: '100%', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Qty Received</label>
              <input type="number" placeholder="Qty" style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '13px', width: '100%', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Expiry Date</label>
              <input type="text" placeholder="MM/YY" style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '13px', width: '100%', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={14} /> Receive to Quarantine
            </button>
            <button style={{ backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '4px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
              Clear
            </button>
          </div>
        </div>

        {/* Right Side: Provenance & Live Intelligence */}
        <div style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
            <Info size={16} color="#38bdf8" />
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', margin: 0 }}>System Traceability</h2>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Last sold by us?</span>
              <span style={{ color: '#f59e0b', fontWeight: '600' }}>UNKNOWN</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Original Invoice:</span>
              <span style={{ color: '#e2e8f0' }}>--</span>
            </div>
            
            <div style={{ borderTop: '1px dashed #334155', margin: '8px 0' }}></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Source Receipts:</span>
              <span style={{ color: '#e2e8f0' }}>--</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Principal:</span>
              <span style={{ color: '#e2e8f0' }}>--</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Eligible Claim Party:</span>
              <span style={{ color: '#34d399', fontWeight: '600' }}>--</span>
            </div>
            
            <div style={{ borderTop: '1px dashed #334155', margin: '8px 0' }}></div>
            
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ color: '#fca5a5', fontSize: '12px', lineHeight: '1.4' }}>
                <strong>Provenance Alert</strong><br/>
                Enter a Batch Number to trace the source of these goods. Goods must be accepted into Quarantine before upstream claims can be generated.
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  )
}
