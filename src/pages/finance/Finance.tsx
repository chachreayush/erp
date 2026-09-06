import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import { apiListVouchers, apiGetLedgers, apiGetFiscalYears, apiActivateFiscalYear, Ledger } from '../../lib/api';
import {
  DollarSign, CreditCard, TrendingUp, TrendingDown,
  FileText, BookOpen, BarChart3, PieChart, ArrowLeft
} from 'lucide-react';

export default function FinanceDashboard() {
  const navigate = useNavigate();
  useReturnNavigation();

  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [recentVouchers, setRecentVouchers] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fyRes, ledgersRes, vouchersRes] = await Promise.all([
          apiGetFiscalYears(),
          apiGetLedgers(),
          apiListVouchers({ limit: 10 })
        ]);
        setFiscalYears(fyRes);
        setLedgers(ledgersRes);
        setRecentVouchers(vouchersRes);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const handleFyChange = async (id: string) => {
    try {
      await apiActivateFiscalYear(id);
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const getBalance = (groupNames: string[]) => {
    return ledgers
      .filter(l => groupNames.includes(l.group_name))
      .reduce((sum, l) => {
        const bal = l.closing_balance || 0;
        return l.cl_type === 'Dr' ? sum + bal : sum - bal;
      }, 0);
  };

  const cashBalance = getBalance(['Cash-in-hand']);
  const bankBalance = getBalance(['Bank Accounts']);
  const receivables = getBalance(['Sundry Debtors']);
  const payables = Math.abs(getBalance(['Sundry Creditors']));

  const styles: Record<string, React.CSSProperties> = {
    container: { backgroundColor: '#020617', color: '#e2e8f0', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: 'bold', margin: 0 },
    escButton: { position: 'absolute', right: '24px', top: '24px', padding: '6px 12px', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    fySelect: { background: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b', padding: '8px', borderRadius: '4px' },
    summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
    card: { backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' },
    cardTitle: { fontSize: '14px', color: '#94a3b8' },
    cardValue: { fontSize: '24px', fontWeight: 'bold' },
    quickAccessGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
    quickActionBtn: { backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', color: '#e2e8f0', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '16px' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '1px solid #1e293b', color: '#94a3b8' },
    td: { padding: '12px', borderBottom: '1px solid #1e293b' },
    badge: { padding: '4px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' }
  };

  const getBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'payment': return { bg: '#1e3a8a', color: '#60a5fa' };
      case 'receipt': return { bg: '#14532d', color: '#4ade80' };
      case 'journal': return { bg: '#4c1d95', color: '#a78bfa' };
      case 'contra': return { bg: '#7c2d12', color: '#fb923c' };
      default: return { bg: '#334155', color: '#94a3b8' };
    }
  };

  return (
    <div style={styles.container}>
      <button style={styles.escButton} onClick={() => navigate(-1)}><ArrowLeft size={16} /> [ESC] Exit</button>
      <div style={styles.header}>
        <h1 style={styles.title}>Finance & Accounting</h1>
        <select style={styles.fySelect} onChange={(e) => handleFyChange(e.target.value)}>
          {fiscalYears.map(fy => (
            <option key={fy.id} value={fy.id}>{fy.name} {fy.is_active ? ' (Active)' : ''}</option>
          ))}
        </select>
      </div>

      <div style={styles.summaryRow}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Cash Balance</div>
          <div style={styles.cardValue}>${Math.abs(cashBalance).toFixed(2)} {cashBalance >= 0 ? 'Dr' : 'Cr'}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Bank Balance</div>
          <div style={styles.cardValue}>${Math.abs(bankBalance).toFixed(2)} {bankBalance >= 0 ? 'Dr' : 'Cr'}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Total Receivables</div>
          <div style={styles.cardValue}>${receivables.toFixed(2)}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Total Payables</div>
          <div style={styles.cardValue}>${payables.toFixed(2)}</div>
        </div>
      </div>

      <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Quick Access</h2>
      <div style={styles.quickAccessGrid}>
        <button style={styles.quickActionBtn} onClick={() => navigate('/finance/voucher/payment')}><DollarSign size={20} color="#60a5fa" /> Payment Voucher</button>
        <button style={styles.quickActionBtn} onClick={() => navigate('/finance/voucher/receipt')}><TrendingUp size={20} color="#4ade80" /> Receipt Voucher</button>
        <button style={styles.quickActionBtn} onClick={() => navigate('/finance/voucher/journal')}><BookOpen size={20} color="#a78bfa" /> Journal Voucher</button>
        <button style={styles.quickActionBtn} onClick={() => navigate('/finance/voucher/contra')}><CreditCard size={20} color="#fb923c" /> Contra Voucher</button>
        <button style={styles.quickActionBtn} onClick={() => navigate('/finance/vouchers')}><FileText size={20} /> Voucher Register</button>
        <button style={styles.quickActionBtn} onClick={() => navigate('/finance/daybook')}><BarChart3 size={20} /> Day Book</button>
        <button style={styles.quickActionBtn} onClick={() => navigate('/finance/trial-balance')}><TrendingDown size={20} /> Trial Balance</button>
        <button style={styles.quickActionBtn} onClick={() => navigate('/finance/profit-loss')}><PieChart size={20} /> Profit & Loss</button>
      </div>

      <div style={{ ...styles.card, marginTop: '24px' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>Recent Vouchers</h2>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Number</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentVouchers.map(v => {
              const badgeColors = getBadgeColor(v.voucher_type);
              return (
                <tr key={v.id}>
                  <td style={styles.td}>{v.date}</td>
                  <td style={styles.td}>{v.voucher_number}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, backgroundColor: badgeColors.bg, color: badgeColors.color }}>
                      {v.voucher_type}
                    </span>
                  </td>
                  <td style={styles.td}>${v.amount?.toFixed(2)}</td>
                  <td style={styles.td}>{v.status}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
