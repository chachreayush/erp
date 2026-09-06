import { useState, useEffect } from 'react';
import { apiGetDayBook } from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';

interface VoucherEntry {
  id: string;
  account_name: string;
  amount: number;
}

interface Voucher {
  id: string;
  voucher_no: string;
  voucher_type: string;
  date: string;
  dr_entries: VoucherEntry[];
  cr_entries: VoucherEntry[];
  total_amount: number;
}

export default function DayBook() {
  useReturnNavigation();
  
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiGetDayBook(fromDate, toDate);
      setVouchers(data.vouchers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const grouped = vouchers.reduce((acc, v) => {
    if (!acc[v.date]) acc[v.date] = [];
    acc[v.date].push(v);
    return acc;
  }, {} as Record<string, Voucher[]>);

  let totalDr = 0;
  let totalCr = 0;

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#020617', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Day Book</h1>
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

      <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', overflow: 'hidden' }}>
        {Object.entries(grouped).map(([date, dateVouchers]) => (
          <div key={date}>
            <div style={{ backgroundColor: '#1e293b', padding: '8px 16px', fontWeight: 'bold', fontSize: '14px' }}>
              {date ? date.split('T')[0] : ''}
            </div>
            {dateVouchers.map((v) => {
              const amount = Number(v.total_amount || 0);
              totalDr += amount;
              totalCr += amount;
              return (
                <div key={v.voucher_id || v.id} style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      {v.voucher_number} <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', backgroundColor: '#334155', color: '#cbd5e1' }}>{v.voucher_type}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', gap: '20px' }}>
                      <div>Dr: {v.entries?.filter((e: any) => e.cr_dr === 'Dr').map((e: any) => e.ledger_name).join(', ')}</div>
                      <div>Cr: {v.entries?.filter((e: any) => e.cr_dr === 'Cr').map((e: any) => e.ledger_name).join(', ')}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                    {amount.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {vouchers.length === 0 && !loading && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No entries found for the selected date range.</div>
        )}

        {vouchers.length > 0 && (
          <div style={{ padding: '16px', backgroundColor: '#020617', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '2px solid #1e293b' }}>
            <span>Totals</span>
            <div style={{ display: 'flex', gap: '32px' }}>
              <span>Dr: {totalDr.toFixed(2)}</span>
              <span>Cr: {totalCr.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
