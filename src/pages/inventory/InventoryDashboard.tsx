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
    <div style={{ backgroundColor: 'var(--color-bg)', flex: 1, display: 'flex', flexDirection: 'column', color: 'var(--color-text)', padding: '20px', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: 'var(--color-primary)' }}>Inventory Expiry & Breakage Cockpit</h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Real-time physical stock separation and ledger entries</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        
        <div style={{ backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '14px' }}>Main Stock Value</div>
            <Package size={20} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₹4,520,000</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Healthy & Sellable Inventory</div>
        </div>

        <div style={{ backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ color: 'var(--color-danger)', fontWeight: 'bold', fontSize: '14px' }}>Brk/Exp Stock Value</div>
            <XCircle size={20} color="var(--color-danger)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₹82,450</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Quarantined / Damaged Inventory</div>
        </div>

        <div style={{ backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ color: 'var(--color-warning)', fontWeight: 'bold', fontSize: '14px' }}>Pending Customer Returns</div>
            <AlertTriangle size={20} color="var(--color-warning)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>14</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Awaiting Intake / Review</div>
        </div>

        <div style={{ backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ color: 'var(--color-info)', fontWeight: 'bold', fontSize: '14px' }}>Vendor Claim Exposures</div>
            <FileText size={20} color="var(--color-info)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₹65,000</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Eligible for Debit Notes</div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text)', marginBottom: '16px' }}>Inventory Voucher Shortcuts</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {/* Customer Return */}
        <div 
          onClick={() => navigate('/brk-receive?type=bill')}
          style={{ backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
        >
          <div style={{ color: 'var(--color-primary)', marginBottom: '12px' }}><RefreshCw size={28} /></div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--color-text)' }}>Receive Customer Breakage</h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>Open standard Brk/Exp Receive voucher. Logs incoming damaged goods directly into your Brk/Exp Stock.</p>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '500' }}>
            Open Voucher <ArrowRight size={14} />
          </div>
        </div>

        {/* Internal Shift */}
        <div 
          onClick={() => navigate('/stock-shift')}
          style={{ backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-warning)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
        >
          <div style={{ color: 'var(--color-warning)', marginBottom: '12px' }}><AlertTriangle size={28} /></div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--color-text)' }}>Internal Expiry Shift</h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>Found expired items on the shelf? Shift them from Main Stock to Brk/Exp Stock. Reflected in Product Register.</p>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-warning)', fontSize: '12px', fontWeight: '500' }}>
            Open Voucher <ArrowRight size={14} />
          </div>
        </div>

        {/* Vendor Claim */}
        <div 
          onClick={() => navigate('/brk-issue?type=bill')}
          style={{ backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-info)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
        >
          <div style={{ color: 'var(--color-info)', marginBottom: '12px' }}><FileText size={28} /></div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--color-text)' }}>Return to Vendor (Issue)</h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>Open standard Brk/Exp Issue voucher. Send quarantined items back to the principal/vendor for Credit Notes.</p>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-info)', fontSize: '12px', fontWeight: '500' }}>
            Open Voucher <ArrowRight size={14} />
          </div>
        </div>
      </div>
      
    </div>
  )
}
