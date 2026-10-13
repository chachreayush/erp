import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGetTrialBalance } from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import { ArrowLeft, RefreshCw, BarChart2 } from 'lucide-react';

export default function TrialBalance() {
  useReturnNavigation();
  const navigate = useNavigate();
  
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
              <BarChart2 size={22} color="#6366f1" />
              Trial Balance (DOC-41 / DOC-08)
            </h1>
          </div>
          {data?.fiscal_year && <p style={{ margin: '4px 0 0 32px', color: '#94a3b8', fontSize: '13px' }}>Active Fiscal Year: {data.fiscal_year}</p>}
        </div>
        <button
          onClick={() => navigate('/finance')}
          style={{ backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
        >
          <ArrowLeft size={14} /> [ESC] Exit
        </button>
      </div>

      <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
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
          {loading ? 'Calculating...' : 'Generate Trial Balance'}
        </button>
      </div>

      <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e293b', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: 700 }}>LEDGER NAME</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: 700 }}>GROUP</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155', textAlign: 'right', color: '#94a3b8', fontWeight: 700 }}>DEBIT (₹)</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155', textAlign: 'right', color: '#94a3b8', fontWeight: 700 }}>CREDIT (₹)</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155', textAlign: 'right', color: '#94a3b8', fontWeight: 700 }}>CLOSING BALANCE (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data?.entries?.map((entry: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '12px 16px', fontWeight: '600', color: '#f8fafc' }}>{entry.ledger_name}</td>
                <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>{entry.group_name}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: entry.debit > 0 ? '#f8fafc' : '#64748b' }}>
                  {entry.debit > 0 ? `₹${Number(entry.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: entry.credit > 0 ? '#f8fafc' : '#64748b' }}>
                  {entry.credit > 0 ? `₹${Number(entry.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', fontFamily: 'monospace', color: '#38bdf8' }}>
                  ₹{Math.abs(entry.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {entry.balance >= 0 ? 'Dr' : 'Cr'}
                </td>
              </tr>
            ))}
            
            {data && (
              <tr style={{ backgroundColor: '#1e293b', fontWeight: 'bold' }}>
                <td colSpan={2} style={{ padding: '14px 16px', color: '#f8fafc' }}>Grand Total</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#f8fafc' }}>
                  ₹{Number(data.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#f8fafc' }}>
                  ₹{Number(data.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', color: Math.abs((data.total_debit || 0) - (data.total_credit || 0)) < 0.01 ? '#10b981' : '#ef4444' }}>
                  {Math.abs((data.total_debit || 0) - (data.total_credit || 0)) < 0.01 ? 'Balanced (Diff ₹0.00)' : `Diff ₹${Math.abs((data.total_debit || 0) - (data.total_credit || 0)).toFixed(2)}`}
                </td>
              </tr>
            )}

            {!data && !loading && (
              <tr>
                <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>Load data to view trial balance.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
