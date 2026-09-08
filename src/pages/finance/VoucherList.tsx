import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import { apiListVouchers, apiCancelVoucher } from '../../lib/api';
import { ArrowLeft, Search, XCircle } from 'lucide-react';

export default function VoucherList() {
  const navigate = useNavigate();
  useReturnNavigation();

  const [vouchers, setVouchers] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  const fetchVouchers = async () => {
    try {
      const res = await apiListVouchers({ voucher_type: typeFilter || undefined, from_date: fromDate || undefined, to_date: toDate || undefined, search: search || undefined });
      setVouchers(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [typeFilter, fromDate, toDate, search]);

  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to cancel this voucher?')) {
      try {
        await apiCancelVoucher(id);
        fetchVouchers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    container: { backgroundColor: '#020617', color: '#e2e8f0', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: 'bold', margin: 0 },
    escButton: { position: 'absolute', right: '24px', top: '24px', padding: '6px 12px', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    filterBar: { display: 'flex', gap: '16px', marginBottom: '24px', background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '12px', color: '#94a3b8' },
    input: { background: '#020617', color: '#e2e8f0', border: '1px solid #1e293b', padding: '8px', borderRadius: '4px', outline: 'none' },
    tableContainer: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #1e293b', color: '#94a3b8', fontWeight: 'normal' },
    tr: { cursor: 'pointer', transition: 'background 0.2s' },
    td: { padding: '12px 16px', borderBottom: '1px solid #1e293b' },
    badge: { padding: '4px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' }
  };

  const getBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'payment': return { bg: '#1e3a8a', color: '#60a5fa' };
      case 'receipt': return { bg: '#14532d', color: '#4ade80' };
      case 'journal': return { bg: '#4c1d95', color: '#a78bfa' };
      case 'contra': return { bg: '#7c2d12', color: '#fb923c' };
      case 'sales': return { bg: '#164e63', color: '#22d3ee' };
      case 'purchase': return { bg: '#7f1d1d', color: '#f87171' };
      default: return { bg: '#334155', color: '#94a3b8' };
    }
  };

  return (
    <div style={styles.container}>
      <button style={styles.escButton} onClick={() => navigate(-1)}><ArrowLeft size={16} /> [ESC] Exit</button>
      
      <div style={styles.header}>
        <h1 style={styles.title}>Voucher Register</h1>
      </div>

      <div style={styles.filterBar}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Type</label>
          <select style={styles.input} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All</option>
            <option value="payment">Payment</option>
            <option value="receipt">Receipt</option>
            <option value="journal">Journal</option>
            <option value="contra">Contra</option>
            <option value="sales">Sales</option>
            <option value="purchase">Purchase</option>
          </select>
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>From Date</label>
          <input style={styles.input} type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>To Date</label>
          <input style={styles.input} type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <div style={{ ...styles.inputGroup, flex: 1 }}>
          <label style={styles.label}>Search Narration/Voucher No</label>
          <div style={{ display: 'flex', alignItems: 'center', background: '#020617', border: '1px solid #1e293b', borderRadius: '4px', padding: '0 8px' }}>
            <Search size={16} color="#94a3b8" />
            <input style={{ ...styles.input, border: 'none', flex: 1 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." />
          </div>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Voucher No</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Narration</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map(v => {
              const typeBadge = getBadgeColor(v.voucher_type);
              const isCancelled = v.status?.toLowerCase() === 'cancelled';
              return (
                <tr key={v.id} style={{ ...styles.tr, opacity: isCancelled ? 0.6 : 1 }} onClick={() => navigate(`/finance/voucher/${v.voucher_type.toLowerCase()}/${v.id}`)}>
                  <td style={styles.td}>{v.date}</td>
                  <td style={styles.td}>{v.voucher_number}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, backgroundColor: typeBadge.bg, color: typeBadge.color }}>
                      {v.voucher_type}
                    </span>
                  </td>
                  <td style={{ ...styles.td, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {v.narration}
                  </td>
                  <td style={styles.td}>${v.amount?.toFixed(2)}</td>
                  <td style={styles.td}>
                    <span style={{ 
                      ...styles.badge, 
                      backgroundColor: isCancelled ? '#7f1d1d' : '#14532d', 
                      color: isCancelled ? '#f87171' : '#4ade80',
                      textDecoration: isCancelled ? 'line-through' : 'none'
                    }}>
                      {v.status || 'Active'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {!isCancelled && (
                      <button 
                        onClick={(e) => handleCancel(v.id, e)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Cancel Voucher"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {vouchers.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', padding: '32px' }}>
                  No vouchers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
