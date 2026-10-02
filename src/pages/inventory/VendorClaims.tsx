import React, { useState } from 'react';
import { Search, FileText, Send, AlertTriangle } from 'lucide-react';

export default function VendorClaims() {
  const [vendorName, setVendorName] = useState('');
  
  return (
    <div style={{ backgroundColor: '#0b1120', flex: 1, display: 'flex', flexDirection: 'column', color: '#f8fafc', padding: '16px', height: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Vendor / Principal Claims
          <span style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 6px', borderRadius: '10px' }}>
            Upstream Settlement
          </span>
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Claim Party (Vendor/Principal)</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', padding: '0 8px' }}>
            <Search size={14} color="#64748b" />
            <input type="text" placeholder="Select Vendor (F2)" style={{ background: 'transparent', border: 'none', color: '#f8fafc', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }} value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Claim Type</label>
          <select style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }}>
            <option value="EXPIRY">Expiry Claim</option>
            <option value="BREAKAGE">Breakage Claim</option>
            <option value="RETURN">Return Delivery</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Settlement Method</label>
          <select style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '13px', width: '100%', outline: 'none' }}>
            <option value="CN">Credit Note (CN)</option>
            <option value="DN">Debit Note (DN)</option>
            <option value="REPLACEMENT">Replacement Stock</option>
          </select>
        </div>
      </div>

      <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', margin: 0 }}>Eligible Quarantined Stock</h2>
          <button style={{ backgroundColor: 'transparent', color: '#38bdf8', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>
            Auto-Select FIFO
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ backgroundColor: '#0b1120', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '500', width: '40px' }}>
                  <input type="checkbox" />
                </th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '500' }}>Product</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '500' }}>Batch</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '500' }}>Source Receipt</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: '500' }}>Qty in Qty</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: '500' }}>Claim Qty</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: '500' }}>Rate</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: '500' }}>Claim Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  <AlertTriangle size={32} style={{ opacity: 0.5, marginBottom: '12px', display: 'block', margin: '0 auto' }} />
                  Select a Vendor to view eligible quarantined stock.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style={{ backgroundColor: '#0b1120', borderTop: '1px solid #334155', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>
            Total Selected: <span style={{ color: '#f8fafc', fontWeight: '600' }}>0 items</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ fontSize: '18px', color: '#f8fafc' }}>
              Claim Value: <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>₹0.00</span>
            </div>
            <button style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '10px 20px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={16} /> Submit Claim
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
