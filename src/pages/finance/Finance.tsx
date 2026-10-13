import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import { apiListVouchers, apiGetLedgers, apiGetFiscalYears, apiActivateFiscalYear, Ledger } from '../../lib/api';
import {
  DollarSign, CreditCard, TrendingUp, TrendingDown,
  FileText, BookOpen, BarChart3, PieChart, ArrowLeft,
  Scale, Building2, ShieldCheck, CheckCircle2, AlertCircle,
  Briefcase, Receipt, RefreshCw, Layers, ExternalLink
} from 'lucide-react';

export default function FinanceDashboard() {
  const navigate = useNavigate();
  useReturnNavigation();

  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [recentVouchers, setRecentVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [fyRes, ledgersRes, vouchersRes] = await Promise.all([
          apiGetFiscalYears(),
          apiGetLedgers(),
          apiListVouchers({ limit: 12 })
        ]);
        setFiscalYears(fyRes);
        setLedgers(ledgersRes);
        setRecentVouchers(vouchersRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
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
    container: { backgroundColor: '#020617', color: '#e2e8f0', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif', maxWidth: '1600px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
    title: { fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' },
    fySelect: { background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', outline: 'none' },
    summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' },
    card: { backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '18px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px' },
    cardTitle: { fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 },
    cardValue: { fontSize: '24px', fontWeight: 800, fontFamily: 'monospace' },
    categoryHeader: { fontSize: '15px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
    quickAccessGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '28px' },
    quickActionBtn: { backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '14px', color: '#e2e8f0', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '13px' },
    th: { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: 700 },
    td: { padding: '12px 16px', borderBottom: '1px solid #1e293b' },
    badge: { padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, display: 'inline-block' }
  };

  const getBadgeColor = (type: string) => {
    switch ((type || '').toLowerCase()) {
      case 'payment': return { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid #3b82f6' };
      case 'receipt': return { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid #22c55e' };
      case 'journal': return { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid #a855f7' };
      case 'contra': return { bg: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: '1px solid #f97316' };
      default: return { bg: '#1e293b', color: '#94a3b8', border: '1px solid #334155' };
    }
  };

  return (
    <div style={styles.container}>
      
      {/* ── HEADER ── */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: '4px'
              }}
              title="Return to Dashboard [ESC]"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 style={styles.title}>
              <Briefcase size={24} color="#6366f1" />
              Finance & Accounting Management (DOC-08, 09, 10, 41)
            </h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 30px' }}>
            Authoritative Double-Entry Accounting, Real-Time Ledgers, Settlement & Financial Statements
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Fiscal Year:</span>
            <select 
              style={styles.fySelect} 
              onChange={(e) => handleFyChange(e.target.value)}
              value={fiscalYears.find(f => f.is_active)?.id || ''}
            >
              {fiscalYears.map(fy => (
                <option key={fy.id} value={fy.id}>{fy.name} {fy.is_active ? ' (Active)' : ''}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => navigate('/')}
            style={{
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={14} /> [ESC] Exit
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div style={styles.summaryRow}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Cash in Hand</div>
          <div style={{ ...styles.cardValue, color: '#38bdf8' }}>
            ₹{Math.abs(cashBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {cashBalance >= 0 ? 'Dr' : 'Cr'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Liquid Cash Ledger</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Bank Accounts</div>
          <div style={{ ...styles.cardValue, color: '#4ade80' }}>
            ₹{Math.abs(bankBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {bankBalance >= 0 ? 'Dr' : 'Cr'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Bank Book Clearing</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Sundry Debtors (Receivables)</div>
          <div style={{ ...styles.cardValue, color: '#fb923c' }}>
            ₹{receivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Dr
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Customer Outstanding (DOC-09)</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Sundry Creditors (Payables)</div>
          <div style={{ ...styles.cardValue, color: '#f87171' }}>
            ₹{payables.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Vendor Payables (DOC-09)</div>
        </div>
      </div>

      {/* ── SECTION 1: DAILY TRANSACTION VOUCHERS (DOC-08) ── */}
      <div style={styles.categoryHeader}>
        <Receipt size={16} color="#60a5fa" />
        1. Daily Voucher Entry & Cash/Bank Transactions (DOC-08)
      </div>
      <div style={styles.quickAccessGrid}>
        <button 
          style={styles.quickActionBtn} 
          onClick={() => navigate('/finance/voucher/payment')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <DollarSign size={22} color="#60a5fa" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Payment Voucher</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Debit Vendor / Credit Bank or Cash</div>
          </div>
        </button>

        <button 
          style={styles.quickActionBtn} 
          onClick={() => navigate('/finance/voucher/receipt')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <TrendingUp size={22} color="#4ade80" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Receipt Voucher</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Debit Bank or Cash / Credit Customer</div>
          </div>
        </button>

        <button 
          style={styles.quickActionBtn} 
          onClick={() => navigate('/finance/voucher/journal')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <BookOpen size={22} color="#a78bfa" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Journal Voucher</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Multi-leg Accrual & Adjustment</div>
          </div>
        </button>

        <button 
          style={styles.quickActionBtn} 
          onClick={() => navigate('/finance/voucher/contra')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <CreditCard size={22} color="#fb923c" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Contra Voucher</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Cash Deposit, Withdrawal & Bank Transfer</div>
          </div>
        </button>

        <button 
          style={styles.quickActionBtn} 
          onClick={() => navigate('/finance/vouchers')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <FileText size={22} color="#38bdf8" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Voucher Register</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Complete List & Reversal Audit Trail</div>
          </div>
        </button>

        <button 
          style={styles.quickActionBtn} 
          onClick={() => navigate('/finance/daybook')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <BarChart3 size={22} color="#f59e0b" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Day Book</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Daily Chronological Transaction Register</div>
          </div>
        </button>
      </div>

      {/* ── SECTION 2: FINANCIAL STATEMENTS & CLOSING (DOC-41) ── */}
      <div style={styles.categoryHeader}>
        <Scale size={16} color="#38bdf8" />
        2. Authoritative Financial Statements & Period Closing (DOC-41)
      </div>
      <div style={styles.quickAccessGrid}>
        <button 
          style={styles.quickActionBtn} 
          onClick={() => navigate('/finance/trial-balance')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <Scale size={22} color="#6366f1" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Trial Balance</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Debit = Credit Balance Verification</div>
          </div>
        </button>

        <button 
          style={styles.quickActionBtn} 
          onClick={() => navigate('/finance/profit-loss')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <PieChart size={22} color="#10b981" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Profit & Loss Account</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Income, Expense & Net Operating Profit</div>
          </div>
        </button>

        <button 
          style={styles.quickActionBtn} 
          onClick={() => navigate('/finance/balance-sheet')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <Building2 size={22} color="#38bdf8" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Balance Sheet</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Liabilities, Capital & Asset Position</div>
          </div>
        </button>

        <button 
          style={styles.quickActionBtn} 
          onClick={() => navigate('/finance-reports')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <FileText size={22} color="#c084fc" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>General Ledger Statements</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Account Statement with Running Balances</div>
          </div>
        </button>
      </div>

      {/* ── SECTION 3: BANKING, ASSETS & RECONCILIATION ── */}
      <div style={styles.categoryHeader}>
        <ShieldCheck size={16} color="#10b981" />
        3. Bank Reconciliation, Operational Expenses & Fixed Assets
      </div>
      <div style={styles.quickAccessGrid}>
        <button 
          style={styles.quickActionBtn} 
          onClick={() => navigate('/finance/bank-reconciliation')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <ShieldCheck size={22} color="#10b981" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Bank Reconciliation (DOC-28)</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Match Statement vs Authoritative Bank Book</div>
          </div>
        </button>

        <button 
          style={styles.quickActionBtn} 
          onClick={() => navigate('/finance/expenses')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <DollarSign size={22} color="#f59e0b" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Expense Claims (DOC-26)</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Petty Cash & Employee Reimbursement</div>
          </div>
        </button>

        <button 
          style={styles.quickActionBtn} 
          onClick={() => navigate('/finance/fixed-assets')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <Building2 size={22} color="#a855f7" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Fixed Assets Register (DOC-27)</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Asset Depreciation & Capitalization</div>
          </div>
        </button>

        <button 
          style={styles.quickActionBtn} 
          onClick={() => navigate('/finance/claims')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <Receipt size={22} color="#ec4899" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Scheme Claims Recovery (DOC-14)</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Principal Free Goods & Rebate Settlement</div>
          </div>
        </button>
      </div>

      {/* ── RECENT VOUCHERS TABLE ── */}
      <div style={{ ...styles.card, marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#6366f1" />
            Recent Authoritative Vouchers Log
          </h2>
          <button
            onClick={() => navigate('/finance/vouchers')}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            View All Vouchers <ExternalLink size={12} />
          </button>
        </div>

        <table style={styles.table}>
          <thead>
            <tr style={{ backgroundColor: '#1e293b' }}>
              <th style={styles.th}>DATE</th>
              <th style={styles.th}>VOUCHER NO</th>
              <th style={styles.th}>TYPE</th>
              <th style={styles.th}>NARRATION / PARTICULARS</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>AMOUNT (₹)</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Loading vouchers...
                </td>
              </tr>
            ) : recentVouchers.length > 0 ? (
              recentVouchers.map(v => {
                const badge = getBadgeColor(v.voucher_type);
                return (
                  <tr key={v.id} style={{ transition: 'background-color 0.15s' }}>
                    <td style={styles.td}>{v.date ? v.date.split('T')[0] : '-'}</td>
                    <td style={{ ...styles.td, fontWeight: 700, color: '#f8fafc' }}>{v.voucher_number}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, backgroundColor: badge.bg, color: badge.color, border: badge.border }}>
                        {v.voucher_type}
                      </span>
                    </td>
                    <td style={{ ...styles.td, color: '#94a3b8' }}>{v.narration || 'Regular posting'}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#f8fafc' }}>
                      ₹{Number(v.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: v.status === 'Cancelled' ? '#f87171' : '#4ade80', fontWeight: 600 }}>
                        {v.status || 'Posted'}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  No vouchers recorded in this fiscal year yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
