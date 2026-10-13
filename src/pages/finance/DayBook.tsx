import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGetDayBook } from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import { ArrowLeft, RefreshCw, BookOpen } from 'lucide-react';

interface VoucherEntry {
  id: string;
  account_name: string;
  amount: number;
}

interface Voucher {
  id?: string;
  voucher_id?: string;
  voucher_number?: string;
  voucher_no?: string;
  voucher_type: string;
  date: string;
  entries?: any[];
  dr_entries?: VoucherEntry[];
  cr_entries?: VoucherEntry[];
  total_amount: number;
}

export default function DayBook() {
  useReturnNavigation();
  const navigate = useNavigate();
  
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
              <BookOpen size={22} color="#a78bfa" />
              Day Book (DOC-08 / DOC-09)
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 32px', color: '#94a3b8', fontSize: '13px' }}>
            Daily Chronological Transaction Register & Multi-Leg Postings
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
          {loading ? 'Loading...' : 'Fetch Day Book'}
        </button>
      </div>

      <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', overflow: 'hidden' }}>
        {Object.entries(grouped).map(([date, dateVouchers]) => (
          <div key={date}>
            <div style={{ backgroundColor: '#1e293b', padding: '10px 16px', fontWeight: 'bold', fontSize: '13px', color: '#38bdf8', borderBottom: '1px solid #334155' }}>
              Date: {date ? date.split('T')[0] : ''} ({dateVouchers.length} Vouchers)
            </div>
            {dateVouchers.map((v) => {
              const amount = Number(v.total_amount || 0);
              totalDr += amount;
              totalCr += amount;
              return (
                <div key={v.voucher_id || v.id} style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#f8fafc' }}>{v.voucher_number || v.voucher_no || 'VCH'}</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#334155', color: '#a5b4fc', fontWeight: 600 }}>{v.voucher_type}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '20px', marginTop: '4px' }}>
                      <div><strong style={{ color: '#60a5fa' }}>Dr:</strong> {v.entries?.filter((e: any) => e.cr_dr === 'Dr').map((e: any) => e.ledger_name).join(', ') || '-'}</div>
                      <div><strong style={{ color: '#f43f5e' }}>Cr:</strong> {v.entries?.filter((e: any) => e.cr_dr === 'Cr').map((e: any) => e.ledger_name).join(', ') || '-'}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', fontFamily: 'monospace', fontSize: '15px', color: '#f8fafc' }}>
                    ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {vouchers.length === 0 && !loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No voucher entries found for the selected date range.</div>
        )}

        {vouchers.length > 0 && (
          <div style={{ padding: '16px', backgroundColor: '#020617', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '2px solid #1e293b' }}>
            <span style={{ color: '#94a3b8' }}>Total Vouchers Value</span>
            <div style={{ display: 'flex', gap: '32px', fontFamily: 'monospace' }}>
              <span style={{ color: '#60a5fa' }}>Dr: ₹{totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span style={{ color: '#f43f5e' }}>Cr: ₹{totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
