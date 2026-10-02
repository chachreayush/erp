import React from 'react';
import { Package, AlertTriangle, RefreshCw, XCircle, FileText } from 'lucide-react';

export default function InventoryDashboard() {
  return (
    <div style={{ backgroundColor: '#0b1120', flex: 1, display: 'flex', flexDirection: 'column', color: '#f8fafc', padding: '20px', height: '100vh', boxSizing: 'border-box', overflowY: 'auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#38bdf8' }}>Inventory & Stock Position Cockpit</h1>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Real-time physical stock and status tracking</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ color: '#34d399', fontWeight: 'bold', fontSize: '14px' }}>Sellable Stock</div>
            <Package size={20} color="#34d399" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>125,400</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Units in Warehouse</div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '14px' }}>Expired Stock</div>
            <XCircle size={20} color="#ef4444" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>1,250</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Non-sellable / Quarantined</div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>Breakage / Damage</div>
            <AlertTriangle size={20} color="#fbbf24" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>185</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Incident-driven damage</div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ color: '#a78bfa', fontWeight: 'bold', fontSize: '14px' }}>Customer Returns</div>
            <RefreshCw size={20} color="#a78bfa" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>42</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Pending Inspection</div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ color: '#f472b6', fontWeight: 'bold', fontSize: '14px' }}>Vendor Claim Value</div>
            <FileText size={20} color="#f472b6" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₹82,000</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Pending Settlement</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Recent Stock Movements */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#e2e8f0', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>Recent Stock Movements</h2>
          <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
            No recent movements found.
          </div>
        </div>

        {/* Claim Aging & Settlement Exposure */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#e2e8f0', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>Claims Pending Settlement</h2>
          <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
            All claims are settled or no claims exist.
          </div>
        </div>
      </div>
      
    </div>
  )
}
