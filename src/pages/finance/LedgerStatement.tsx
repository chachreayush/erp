import { useState, useEffect } from 'react';
import { apiGetLedgerStatement, apiGetLedgers, Ledger } from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import { useParams } from 'react-router-dom';

export default function LedgerStatement() {
  useReturnNavigation();
  const { ledgerId } = useParams<{ ledgerId: string }>();

  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [selectedLedger, setSelectedLedger] = useState<string>(ledgerId || '');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statement, setStatement] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLedgers = async () => {
      try {
        const data = await apiGetLedgers();
        setLedgers(data || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchLedgers();
  }, []);

  const loadData = async () => {
    if (!selectedLedger) return;
    setLoading(true);
    try {
      const data = await apiGetLedgerStatement(selectedLedger, fromDate, toDate);
      setStatement(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLedger) {
      loadData();
    }
  }, []); // Only initial load if URL has ledgerId

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#020617', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Ledger Account Register</h1>
        <button style={{ backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>[ESC] Exit</button>
      </div>

      <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Ledger</label>
          <select value={selectedLedger} onChange={e => setSelectedLedger(e.target.value)} style={{ backgroundColor: '#020617', color: '#e2e8f0', border: '1px solid #1e293b', padding: '8px', borderRadius: '4px', minWidth: '200px' }}>
            <option value="">-- Select Ledger --</option>
            {ledgers.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>From Date</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ backgroundColor: '#020617', color: '#e2e8f0', border: '1px solid #1e293b', padding: '8px', borderRadius: '4px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ backgroundColor: '#020617', color: '#e2e8f0', border: '1px solid #1e293b', padding: '8px', borderRadius: '4px' }} />
        </div>
        <button onClick={loadData} disabled={loading || !selectedLedger} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', opacity: (!selectedLedger ? 0.5 : 1) }}>
          {loading ? 'Loading...' : 'Load'}
        </button>
      </div>

      <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e293b', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>Date</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>Voucher No</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>Particulars</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155', textAlign: 'right' }}>Debit</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155', textAlign: 'right' }}>Credit</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #334155', textAlign: 'right' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {statement && (
              <tr style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#020617' }}>
                <td colSpan={5} style={{ padding: '12px 16px', fontWeight: 'bold' }}>Opening Balance</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold' }}>
                  {Math.abs(Number(statement.opening_balance || 0)).toFixed(2)} {Number(statement.opening_balance || 0) >= 0 ? 'Dr' : 'Cr'}
                </td>
              </tr>
            )}
            
            {statement?.entries?.map((entry: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{entry.date ? entry.date.split('T')[0] : ''}</td>
                <td style={{ padding: '12px 16px' }}>{entry.voucher_number}</td>
                <td style={{ padding: '12px 16px' }}>{entry.particulars}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{Number(entry.dr_amount || 0) > 0 ? Number(entry.dr_amount).toFixed(2) : ''}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{Number(entry.cr_amount || 0) > 0 ? Number(entry.cr_amount).toFixed(2) : ''}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#94a3b8' }}>
                  {Math.abs(Number(entry.running_balance || 0)).toFixed(2)} {entry.balance_type}
                </td>
              </tr>
            ))}

            {statement && (
              <tr style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#020617', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ padding: '12px 16px' }}>Current Total</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{Number(statement.total_dr || 0).toFixed(2)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{Number(statement.total_cr || 0).toFixed(2)}</td>
                <td style={{ padding: '12px 16px' }}></td>
              </tr>
            )}

            {statement && (
              <tr style={{ backgroundColor: '#1e293b', fontWeight: 'bold' }}>
                <td colSpan={5} style={{ padding: '12px 16px' }}>Closing Balance</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#e2e8f0' }}>
                  {Math.abs(Number(statement.closing_balance || 0)).toFixed(2)} {Number(statement.closing_balance || 0) >= 0 ? 'Dr' : 'Cr'}
                </td>
              </tr>
            )}

            {!statement && !loading && (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Select a ledger and load data.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
