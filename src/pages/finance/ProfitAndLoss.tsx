import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGetProfitLoss } from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import { ArrowLeft, RefreshCw, TrendingUp } from 'lucide-react';

export default function ProfitAndLoss() {
  useReturnNavigation();
  const navigate = useNavigate();
  
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiGetProfitLoss(fromDate, toDate);
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
              <TrendingUp size={22} color="#10b981" />
              Profit & Loss Statement (DOC-41)
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 32px', color: '#94a3b8', fontSize: '13px' }}>
            Income & Expense Accounts Summary for Selected Period
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
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>From Date</label>
          <input 
            type="date" 
            value={fromDate} 
            onChange={e => setFromDate(e.target.value)} 
            style={{ backgroundColor: '#020617', color: '#e2e8f0', border: '1px solid #334155', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} 
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>To Date</label>
          <input 
            type="date" 
            value={toDate} 
            onChange={e => setToDate(e.target.value)} 
            style={{ backgroundColor: '#020617', color: '#e2e8f0', border: '1px solid #334155', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }} 
          />
        </div>
        <button 
          onClick={loadData} 
          disabled={loading} 
          style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
          {loading ? 'Computing...' : 'Calculate P&L'}
        </button>
      </div>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
          {/* Expenses Column */}
          <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ padding: '14px 18px', margin: 0, borderBottom: '1px solid #1e293b', backgroundColor: '#1e293b', fontSize: '16px', fontWeight: 700, color: '#f87171' }}>Expenses</h2>
            <div style={{ padding: '16px', flex: 1 }}>
              {data.expenses?.map((group: any, i: number) => (
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
                    <span style={{ fontFamily: 'monospace', color: '#fca5a5' }}>₹{Number(group.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px', borderTop: '2px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', backgroundColor: '#020617' }}>
              <span style={{ color: '#f87171' }}>Total Expense</span>
              <span style={{ fontFamily: 'monospace', color: '#f87171' }}>₹{Number(data.total_expense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Incomes Column */}
          <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ padding: '14px 18px', margin: 0, borderBottom: '1px solid #1e293b', backgroundColor: '#1e293b', fontSize: '16px', fontWeight: 700, color: '#4ade80' }}>Income</h2>
            <div style={{ padding: '16px', flex: 1 }}>
              {data.incomes?.map((group: any, i: number) => (
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
                    <span style={{ fontFamily: 'monospace', color: '#86efac' }}>₹{Number(group.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px', borderTop: '2px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', backgroundColor: '#020617' }}>
              <span style={{ color: '#4ade80' }}>Total Income</span>
              <span style={{ fontFamily: 'monospace', color: '#4ade80' }}>₹{Number(data.total_income || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {data && (
        <div style={{ 
          marginTop: '20px', 
          padding: '20px', 
          borderRadius: '8px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          fontWeight: 'bold',
          fontSize: '18px',
          backgroundColor: data.net_profit >= 0 ? '#064e3b' : '#7f1d1d',
          color: 'white',
          border: `1px solid ${data.net_profit >= 0 ? '#047857' : '#b91c1c'}`
        }}>
          <span>Net {data.net_profit >= 0 ? 'Profit' : 'Loss'} for Selected Period</span>
          <span style={{ fontFamily: 'monospace', fontSize: '22px' }}>₹{Math.abs(data.net_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      )}

      {!data && !loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}>
          Select date range and load data to view P&L statement.
        </div>
      )}
    </div>
  );
}
