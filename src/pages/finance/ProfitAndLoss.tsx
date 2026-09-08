import { useState, useEffect } from 'react';
import { apiGetProfitLoss } from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';

export default function ProfitAndLoss() {
  useReturnNavigation();
  
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
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#020617', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Profit & Loss Statement</h1>
        <button style={{ backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>[ESC] Exit</button>
      </div>

      <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>From Date</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ backgroundColor: '#020617', color: '#e2e8f0', border: '1px solid #1e293b', padding: '8px', borderRadius: '4px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ backgroundColor: '#020617', color: '#e2e8f0', border: '1px solid #1e293b', padding: '8px', borderRadius: '4px' }} />
        </div>
        <button onClick={loadData} disabled={loading} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Loading...' : 'Load'}
        </button>
      </div>

      {data && (
        <div style={{ display: 'flex', gap: '20px', flexDirection: 'row' }}>
          {/* Expenses Column */}
          <div style={{ flex: 1, backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ padding: '16px', margin: 0, borderBottom: '1px solid #1e293b', backgroundColor: '#1e293b', fontSize: '18px' }}>Expenses</h2>
            <div style={{ padding: '16px', flex: 1 }}>
              {data.expenses?.map((group: any, i: number) => (
                <div key={i} style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#94a3b8' }}>{group.group_name}</div>
                  {group.items?.map((item: any, j: number) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px' }}>
                      <span>{item.name}</span>
                      <span>{item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px', borderTop: '1px dashed #334155', marginTop: '4px', fontWeight: 'bold' }}>
                    <span>Total {group.group_name}</span>
                    <span>{group.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px', borderTop: '2px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', backgroundColor: '#020617' }}>
              <span>Total Expense</span>
              <span>{data.total_expense?.toFixed(2)}</span>
            </div>
          </div>

          {/* Incomes Column */}
          <div style={{ flex: 1, backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ padding: '16px', margin: 0, borderBottom: '1px solid #1e293b', backgroundColor: '#1e293b', fontSize: '18px' }}>Income</h2>
            <div style={{ padding: '16px', flex: 1 }}>
              {data.incomes?.map((group: any, i: number) => (
                <div key={i} style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#94a3b8' }}>{group.group_name}</div>
                  {group.items?.map((item: any, j: number) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px' }}>
                      <span>{item.name}</span>
                      <span>{item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px', borderTop: '1px dashed #334155', marginTop: '4px', fontWeight: 'bold' }}>
                    <span>Total {group.group_name}</span>
                    <span>{group.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px', borderTop: '2px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', backgroundColor: '#020617' }}>
              <span>Total Income</span>
              <span>{data.total_income?.toFixed(2)}</span>
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
          fontSize: '20px',
          backgroundColor: data.net_profit >= 0 ? '#064e3b' : '#7f1d1d',
          color: 'white',
          border: `1px solid ${data.net_profit >= 0 ? '#047857' : '#b91c1c'}`
        }}>
          <span>Net {data.net_profit >= 0 ? 'Profit' : 'Loss'}</span>
          <span>{Math.abs(data.net_profit).toFixed(2)}</span>
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
