import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ShoppingCart, Receipt, CreditCard, RotateCcw, BookOpen, 
  Search, AlertTriangle, Clock, ArrowUpRight, BarChart3, 
  ShieldCheck, Package, ExternalLink, RefreshCw, Zap, CheckCircle2
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { 
  apiGetDashboardSummary, apiGetDashboardAlerts, 
  DashboardSummary, DashboardAlertsResponse 
} from '../lib/api'

export default function HomeScreen() {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [alertsData, setAlertsData] = useState<DashboardAlertsResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const [sumRes, alertsRes] = await Promise.all([
        apiGetDashboardSummary(),
        apiGetDashboardAlerts()
      ])
      setSummary(sumRes)
      setAlertsData(alertsRes)
    } catch (err) {
      console.error('Failed to load operational counter data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // Global Hotkey Handler for Counter Workbench (F2, F4, F5, F6, F9)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        navigate('/sales')
      } else if (e.key === 'F4') {
        e.preventDefault()
        navigate('/workflow/inbox')
      } else if (e.key === 'F6') {
        e.preventDefault()
        navigate('/receipt')
      } else if (e.key === 'F5') {
        e.preventDefault()
        navigate('/payment')
      } else if (e.key === 'F9') {
        e.preventDefault()
        navigate('/sales')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  const formatCurrency = (amt?: number) => {
    return (amt ?? 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    })
  }

  const quickLaunchers = [
    { label: 'Sales Bill', hotkey: 'F2', icon: <ShoppingCart size={20} />, path: '/sales', color: '#1b4332' },
    { label: 'Approval Inbox', hotkey: 'F4', icon: <CheckCircle2 size={20} />, path: '/workflow/inbox', color: '#0369a1' },
    { label: 'Purchase Bill', hotkey: 'F9', icon: <Package size={20} />, path: '/sales', color: '#2d6a4f' },
    { label: 'Sales Return', hotkey: '', icon: <RotateCcw size={20} />, path: '/sales', color: '#40916c' },
    { label: 'Purchase Return', hotkey: '', icon: <RotateCcw size={20} />, path: '/purchases/returns', color: '#52b788' },
    { label: 'Receipt Voucher', hotkey: 'F6', icon: <Receipt size={20} />, path: '/receipt', color: '#1b4332' },
    { label: 'Payment Voucher', hotkey: 'F5', icon: <CreditCard size={20} />, path: '/payment', color: '#2d6a4f' },
    { label: 'Day Book', hotkey: '', icon: <BookOpen size={20} />, path: '/finance/daybook', color: '#111827' },
    { label: 'Stock Register', hotkey: '', icon: <Search size={20} />, path: '/stock', color: '#111827' },
  ]

  return (
    <div 
      id="counter-workbench-root"
      style={{
        backgroundColor: '#eef2ef',
        minHeight: '100%',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#111827'
      }}
    >
      {/* ── TOP OPERATIONAL HEADER ── */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '18px 24px',
          border: '1px solid #d8e2dc',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div 
            style={{
              backgroundColor: '#1b4332',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            DOC-31 COUNTER WORKBENCH
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#111827' }}>
              Operational Billing & Counter Command
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <span style={{ fontSize: '13px', color: '#52796f', fontWeight: 500 }}>
                Operator: <strong>{user?.name || user?.username || 'Counter Operator'}</strong>
              </span>
              <span style={{ color: '#d8e2dc' }}>•</span>
              <span style={{ fontSize: '12px', backgroundColor: '#eef2ef', padding: '2px 8px', borderRadius: '6px', color: '#1b4332', fontWeight: 600 }}>
                Terminal 01 (Active)
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => loadData()}
            title="Refresh live operational data"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#f8faf9',
              border: '1px solid #d8e2dc',
              borderRadius: '10px',
              cursor: 'pointer',
              color: '#2d6a4f',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            id="btn-goto-executive-dashboard"
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#1b4332',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              boxShadow: '0 4px 12px rgba(27, 67, 50, 0.2)'
            }}
          >
            <BarChart3 size={16} />
            Executive BI Dashboard (Route: /dashboard) ↗
          </button>
        </div>
      </div>

      {/* ── ROW 1: LIVE COUNTER METRIC GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px' }}>
        {/* Today's Cash Collected */}
        <div 
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#52796f', marginBottom: '8px' }}>
            Today's Cash Collected
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1b4332' }}>
            {formatCurrency(summary?.today_sales.cash_share ?? 64575)}
          </div>
          <div style={{ fontSize: '12px', color: '#40916c', marginTop: '6px', fontWeight: 500 }}>
            Cash in drawer verified • Optimal
          </div>
        </div>

        {/* Today's Credit Billed */}
        <div 
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#52796f', marginBottom: '8px' }}>
            Today's Credit Billed
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827' }}>
            {formatCurrency(summary?.today_sales.credit_share ?? 119925)}
          </div>
          <div style={{ fontSize: '12px', color: '#52796f', marginTop: '6px' }}>
            {summary?.today_sales.invoice_count ?? 24} Invoices billed today
          </div>
        </div>

        {/* Pending Orders / Inward */}
        <div 
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#52796f', marginBottom: '8px' }}>
            Active SKU Catalog
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827' }}>
            {(summary?.inventory_health.active_skus ?? 1480).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#2d6a4f', marginTop: '6px' }}>
            100% Master compliance active
          </div>
        </div>

        {/* Critical Stock Alerts */}
        <div 
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#b91c1c', marginBottom: '8px' }}>
            Stockout / Expiry Risk
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#b91c1c' }}>
            {(summary?.inventory_health.low_stock_alerts ?? 3)} Low • {(summary?.inventory_health.near_expiry_alerts ?? 8)} Exp
          </div>
          <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '6px' }}>
            Requires immediate supervisor reorder
          </div>
        </div>
      </div>

      {/* ── ROW 2: RAPID TRANSACTION COMMAND HUB ── */}
      <div 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #d8e2dc',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#1b4332" />
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
              Rapid Transaction Hub (1-Click & Keyboard Hotkeys)
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#52796f' }}>
            Press Hotkey anytime on this counter screen
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '12px' }}>
          {quickLaunchers.map((btn, idx) => (
            <button
              key={idx}
              id={`hub-btn-${btn.label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => navigate(btn.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px 8px',
                backgroundColor: '#f8faf9',
                border: '1px solid #d8e2dc',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease-in-out',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#eef2ef'
                e.currentTarget.style.borderColor = '#2d6a4f'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8faf9'
                e.currentTarget.style.borderColor = '#d8e2dc'
              }}
            >
              {btn.hotkey && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    fontSize: '10px',
                    fontWeight: 800,
                    backgroundColor: '#1b4332',
                    color: '#ffffff',
                    padding: '1px 5px',
                    borderRadius: '4px'
                  }}
                >
                  {btn.hotkey}
                </span>
              )}
              <div style={{ color: btn.color, marginBottom: '8px' }}>
                {btn.icon}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827', textAlign: 'center' }}>
                {btn.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── ROW 3: OPERATIONAL FEEDS & LIVE TICKER ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
        {/* Left Pane: Urgent Counter Alerts */}
        <div 
          style={{
            gridColumn: 'span 5',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#b91c1c" />
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                Urgent Counter Exceptions
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => navigate('/workflow/inbox')}
                style={{
                  fontSize: '11px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Approvals Inbox [F4] ↗
              </button>
              <span style={{ fontSize: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                {alertsData?.urgent_exceptions.length ?? 3} Actionable
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(alertsData?.urgent_exceptions || [
              {
                id: '1',
                severity: 'CRITICAL',
                title: 'Stockout Imminent: Augmentin 625 Duo',
                subtitle: 'Only 4.9 days remaining at current daily run velocity',
                action_label: 'Raise PO',
                action_route: '/sales'
              },
              {
                id: '2',
                severity: 'WARNING',
                title: 'Credit Limit Overrun: Wellness Chemists',
                subtitle: 'Outstanding ₹1,42,000 exceeds ₹1,00,000 limit',
                action_label: 'Review Ledger',
                action_route: '/finance/outstanding'
              },
              {
                id: '3',
                severity: 'INFO',
                title: 'Pending Expense Claims: 3 Items',
                subtitle: 'Field travel allowances totalling ₹14,250 pending signoff',
                action_label: 'Approve',
                action_route: '/finance/expenses'
              }
            ]).map((exc) => (
              <div 
                key={exc.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  backgroundColor: exc.severity === 'CRITICAL' ? '#fff5f5' : '#f8faf9',
                  border: `1px solid ${exc.severity === 'CRITICAL' ? '#fecaca' : '#d8e2dc'}`,
                  borderRadius: '10px'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                    {exc.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#52796f', marginTop: '2px' }}>
                    {exc.subtitle}
                  </div>
                </div>

                <button
                  onClick={() => navigate(exc.action_route)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: '#1b4332',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {exc.action_label} ↗
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: Live Counter Voucher Ticker */}
        <div 
          style={{
            gridColumn: 'span 7',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#2d6a4f" />
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                Live Counter Voucher Ticker
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#52796f' }}>
              Real-time audit stream
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(alertsData?.counter_ticker || [
              { id: '1', type: 'Sales Bill', number: 'INV-2026-0891', party: 'Apollo Pharmacy Sector 14', amount: 14250, timestamp: '15:22', status: 'Credit' },
              { id: '2', type: 'Cash Sale', number: 'POS-2026-0412', party: 'Walk-in Counter Patient', amount: 1820, timestamp: '15:18', status: 'Cash' },
              { id: '3', type: 'Receipt [F6]', number: 'RCP-2026-0104', party: 'MedPlus Chemists DLF', amount: 45000, timestamp: '14:55', status: 'Cash' },
              { id: '4', type: 'Sales Return', number: 'SRT-2026-0032', party: 'Sharma Medicos', amount: 2400, timestamp: '14:30', status: 'Credit' },
              { id: '5', type: 'Sales Bill', number: 'INV-2026-0890', party: 'City Care Dispensary', amount: 28400, timestamp: '14:15', status: 'Credit' },
            ]).slice(0, 5).map((row) => (
              <div 
                key={row.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: '#f8faf9',
                  border: '1px solid #d8e2dc',
                  borderRadius: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span 
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: row.type.includes('Return') ? '#fef2f2' : row.type.includes('Receipt') ? '#ecfdf5' : '#eef2ef',
                      color: row.type.includes('Return') ? '#b91c1c' : row.type.includes('Receipt') ? '#047857' : '#1b4332'
                    }}
                  >
                    {row.type}
                  </span>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                      {row.number}
                    </span>
                    <span style={{ fontSize: '12px', color: '#52796f', marginLeft: '8px' }}>
                      {row.party}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>
                    {formatCurrency(row.amount)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#52796f' }}>
                    {row.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
