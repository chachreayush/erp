import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGetBalanceSheet } from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import { ArrowLeft, RefreshCw, Scale, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function BalanceSheet() {
  useReturnNavigation();
  const navigate = useNavigate();
  
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiGetBalanceSheet(asOfDate);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isBalanced = data && Math.abs((data.total_liabilities || 0) - (data.total_assets || 0)) < 0.01;

  return (
    <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#020617', color: '#e2e8f0', fontFamily: 'sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => navigate('/finance')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              title="Return to Finance [ESC]"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Scale size={22} color="#38bdf8" />
              Balance Sheet (DOC-41)
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 32px', color: '#94a3b8', fontSize: '13px' }}>
            Authoritative Financial Position: Liabilities & Capital vs Assets
          </p>
        </div>
        <button 
          onClick={() => navigate('/finance')}
          style={{ backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
        >
          <ArrowLeft size={14} /> [ESC] Exit
        </button>
      </div>

      <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>As of Date</label>
          <input 
            type="date" 
            value={asOfDate} 
            onChange={e => setAsOfDate(e.target.value)} 
            style={{ backgroundColor: '#020617', color: '#e2e8f0', border: '1px solid #334155', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} 
          />
        </div>
        <button 
          onClick={loadData} 
          disabled={loading} 
          style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
          {loading ? 'Evaluating...' : 'Generate Balance Sheet'}
        </button>

        {data && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: isBalanced ? '#10b981' : '#f87171' }}>
            {isBalanced ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {isBalanced ? 'Books Balanced (Assets = Liabilities)' : `Discrepancy: ₹${Math.abs((data.total_liabilities || 0) - (data.total_assets || 0)).toFixed(2)}`}
          </div>
        )}
      </div>

      {!isBalanced && data && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #b91c1c', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
          <AlertTriangle size={16} />
          <span>Accounting discrepancy detected: Liabilities and Assets do not equate by ₹{Math.abs(data.total_liabilities - data.total_assets).toFixed(2)}. Verify closing ledger postings.</span>
        </div>
      )}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
          {/* Liabilities Column */}
          <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ padding: '14px 18px', margin: 0, borderBottom: '1px solid #1e293b', backgroundColor: '#1e293b', fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Liabilities & Capital</h2>
            <div style={{ padding: '16px', flex: 1 }}>
              {data.liabilities?.map((group: any, i: number) => (
                <div key={i} style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: '700', marginBottom: '8px', color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase' }}>{group.group_name}</div>
                  {group.items?.map((item: any, j: number) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                      <span style={{ color: '#cbd5e1' }}>{item.name}</span>
                      <span style={{ fontFamily: 'monospace', color: '#f8fafc' }}>₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', borderTop: '1px dashed #334155', marginTop: '6px', fontWeight: 'bold' }}>
                    <span style={{ color: '#94a3b8' }}>Total {group.group_name}</span>
                    <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>₹{Number(group.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px', borderTop: '2px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', backgroundColor: '#020617' }}>
              <span style={{ color: '#f8fafc' }}>Total Liabilities</span>
              <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>₹{Number(data.total_liabilities || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Assets Column */}
          <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ padding: '14px 18px', margin: 0, borderBottom: '1px solid #1e293b', backgroundColor: '#1e293b', fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Assets</h2>
            <div style={{ padding: '16px', flex: 1 }}>
              {data.assets?.map((group: any, i: number) => (
                <div key={i} style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: '700', marginBottom: '8px', color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase' }}>{group.group_name}</div>
                  {group.items?.map((item: any, j: number) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                      <span style={{ color: '#cbd5e1' }}>{item.name}</span>
                      <span style={{ fontFamily: 'monospace', color: '#f8fafc' }}>₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', borderTop: '1px dashed #334155', marginTop: '6px', fontWeight: 'bold' }}>
                    <span style={{ color: '#94a3b8' }}>Total {group.group_name}</span>
                    <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>₹{Number(group.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px', borderTop: '2px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', backgroundColor: '#020617' }}>
              <span style={{ color: '#f8fafc' }}>Total Assets</span>
              <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>₹{Number(data.total_assets || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}>
          Select as of date and load data to view balance sheet.
        </div>
      )}
    </div>
  );
}
