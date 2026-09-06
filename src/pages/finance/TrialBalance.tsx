import { useState, useEffect } from 'react';
import { apiGetTrialBalance } from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';

export default function TrialBalance() {
  useReturnNavigation();
  
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiGetTrialBalance(asOfDate);
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
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>Trial Balance</h1>
          {data?.fiscal_year && <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>Fiscal Year: {data.fiscal_year}</p>}
        </div>
        <button style={{ backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>[ESC] Exit</button>
      </div>

      <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>As of Date</label>
          <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} style={{ backgroundColor: '#020617', color: '#e2e8f0', border: '1px solid #1e293b', padding: '8px', borderRadius: '4px' }} />
        </div>
        <button onClick={loadData} disabled={loading} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Loading...' : 'Load'}
        </button>
      </div>

      <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e293b', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>Ledger Name</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>Group</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155', textAlign: 'right' }}>Debit</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155', textAlign: 'right' }}>Credit</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155', textAlign: 'right' }}>Closing Balance</th>
            </tr>
          </thead>
          <tbody>
            {data?.entries?.map((entry: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '12px 16px', fontWeight: '500' }}>{entry.ledger_name}</td>
                <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '13px' }}>{entry.group_name}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{entry.debit > 0 ? entry.debit.toFixed(2) : '-'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{entry.credit > 0 ? entry.credit.toFixed(2) : '-'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>
                  {Math.abs(entry.balance).toFixed(2)} {entry.balance >= 0 ? 'Dr' : 'Cr'}
                </td>
              </tr>
            ))}
            
            {data && (
              <tr style={{ backgroundColor: '#1e293b', fontWeight: 'bold' }}>
                <td colSpan={2} style={{ padding: '14px 16px' }}>Grand Total</td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>{data.total_debit?.toFixed(2)}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>{data.total_credit?.toFixed(2)}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}></td>
              </tr>
            )}

            {!data && !loading && (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Load data to view trial balance.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
