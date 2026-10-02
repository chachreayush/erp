import { useNavigate } from 'react-router-dom';
import React, { useEffect } from 'react';
import { Package, AlertTriangle, RefreshCw, XCircle, FileText, ArrowRight } from 'lucide-react';

export default function InventoryDashboard() {
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

  return (
    <div style={{ backgroundColor: '#0b1120', flex: 1, display: 'flex', flexDirection: 'column', color: '#f8fafc', padding: '20px', height: '100vh', boxSizing: 'border-box', overflowY: 'auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#38bdf8' }}>Inventory Expiry & Breakage Cockpit</h1>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Real-time physical stock separation and ledger entries</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ color: '#34d399', fontWeight: 'bold', fontSize: '14px' }}>Main Stock Value</div>
            <Package size={20} color="#34d399" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₹4,520,000</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Healthy & Sellable Inventory</div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '14px' }}>Brk/Exp Stock Value</div>
            <XCircle size={20} color="#ef4444" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₹82,450</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Quarantined / Damaged Inventory</div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>Pending Customer Returns</div>
            <AlertTriangle size={20} color="#fbbf24" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>14</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Awaiting Intake / Review</div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ color: '#f472b6', fontWeight: 'bold', fontSize: '14px' }}>Vendor Claim Exposures</div>
            <FileText size={20} color="#f472b6" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₹65,000</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Eligible for Debit Notes</div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '16px' }}>Inventory Voucher Shortcuts</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {/* Customer Return */}
        <div 
          onClick={() => navigate('/brk-receive?type=bill')}
          style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#334155'}
        >
          <div style={{ color: '#3b82f6', marginBottom: '12px' }}><RefreshCw size={28} /></div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#f8fafc' }}>Receive Customer Breakage</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>Open standard Brk/Exp Receive voucher. Logs incoming damaged goods directly into your Brk/Exp Stock.</p>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6', fontSize: '12px', fontWeight: '500' }}>
            Open Voucher <ArrowRight size={14} />
          </div>
        </div>

        {/* Internal Shift */}
        <div 
          onClick={() => navigate('/stock-shift')}
          style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fbbf24'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#334155'}
        >
          <div style={{ color: '#fbbf24', marginBottom: '12px' }}><AlertTriangle size={28} /></div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#f8fafc' }}>Internal Expiry Shift</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>Found expired items on the shelf? Shift them from Main Stock to Brk/Exp Stock. Reflected in Product Register.</p>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontSize: '12px', fontWeight: '500' }}>
            Open Voucher <ArrowRight size={14} />
          </div>
        </div>

        {/* Vendor Claim */}
        <div 
          onClick={() => navigate('/brk-issue?type=bill')}
          style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#a78bfa'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#334155'}
        >
          <div style={{ color: '#a78bfa', marginBottom: '12px' }}><FileText size={28} /></div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#f8fafc' }}>Return to Vendor (Issue)</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>Open standard Brk/Exp Issue voucher. Send quarantined items back to the principal/vendor for Credit Notes.</p>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px', color: '#a78bfa', fontSize: '12px', fontWeight: '500' }}>
            Open Voucher <ArrowRight size={14} />
          </div>
        </div>
      </div>
      
    </div>
  )
}
