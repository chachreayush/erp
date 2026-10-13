import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, BarChart3, PieChart as PieChartIcon, 
  MapPin, Maximize2, X, RefreshCw, ArrowUpRight,
  ShieldCheck, ShieldAlert, Award, FileText, ChevronRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { useAuthStore } from '../../store/authStore'
import {
  apiGetDashboardSummary, apiGetSalesTerritories, apiGetDashboardTrends,
  DashboardSummary, SalesTerritoriesResponse, DashboardTrendsResponse, SalesTerritory
} from '../../lib/api'

export default function ClientDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [territoriesData, setTerritoriesData] = useState<SalesTerritoriesResponse | null>(null)
  const [trends, setTrends] = useState<DashboardTrendsResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [useExclusions, setUseExclusions] = useState<boolean>(true)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Current Quarter (Q2 FY 2026–27)')
  
  // Modal state for enlarged sales territory intelligence
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false)
  const [activeTerritoryId, setActiveTerritoryId] = useState<string>('delhi_ncr')

  const loadData = async () => {
    try {
      setLoading(true)
      const [sumRes, terrRes, trendsRes] = await Promise.all([
        apiGetDashboardSummary(useExclusions),
        apiGetSalesTerritories(),
        apiGetDashboardTrends()
      ])
      setSummary(sumRes)
      setTerritoriesData(terrRes)
      setTrends(trendsRes)
    } catch (err) {
      console.error('Failed to load executive dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [useExclusions])

  const formatCurrency = (amt?: number) => {
    return (amt ?? 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    })
  }

  const selectedTerritory: SalesTerritory = 
    territoriesData?.territories.find(t => t.id === activeTerritoryId) || 
    (territoriesData?.territories[0] ?? {
      id: 'delhi_ncr',
      name: 'Delhi NCR Capital Zone',
      short_name: 'Delhi NCR',
      turnover: 2480000,
      share_percent: 43.7,
      retail_chemists: 280,
      quota_target: 2100000,
      attainment_percent: 118.1,
      growth_yoy: 16.4,
      top_molecule: 'Augmentin 625 Duo Tablets',
      status: 'Target Exceeded'
    })

  const opexColors = ['#1b4332', '#2d6a4f', '#40916c', '#52b788', '#74c69d']

  return (
    <div
      id="executive-dashboard-root"
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
      {/* ── TOP EXECUTIVE CONTROLS & HEADER ── */}
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
            DOC-31 BI ENGINE
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#111827' }}>
              Business Intelligence & Control Centre
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#52796f' }}>
              Multi-Dimensional Analytics • Executive KPI Aggregations • Territory Turnover Focus
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Exclusion Filter Toggle */}
          <button
            id="toggle-exclusion-btn"
            onClick={() => setUseExclusions(!useExclusions)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: useExclusions ? '#1b4332' : '#f8faf9',
              color: useExclusions ? '#ffffff' : '#2d6a4f',
              border: '1px solid #d8e2dc',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            {useExclusions ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
            {useExclusions ? 'Active Operations' : 'Monitored Exclusions'}
          </button>

          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid #d8e2dc',
              backgroundColor: '#f8faf9',
              fontSize: '13px',
              fontWeight: 600,
              color: '#111827'
            }}
          >
            <option>Current Quarter (Q2 FY 2026–27)</option>
            <option>Month to Date (MTD)</option>
            <option>Year to Date (YTD)</option>
          </select>

          {/* Back to Operational Counter Home */}
          <button
            id="btn-back-to-counter"
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#f8faf9',
              border: '1px solid #d8e2dc',
              borderRadius: '10px',
              cursor: 'pointer',
              color: '#1b4332',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            🏠 Back to Counter Home
          </button>
        </div>
      </div>

      {/* ── ROW 1: EXECUTIVE KPI STRIP (4 METRICS) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px' }}>
        {/* Gross Revenue */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', letterSpacing: '0.04em' }}>
              Gross Revenue (Sales)
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
              +{summary?.mtd_sales.growth_yoy ?? 14.2}% YoY
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827' }}>
            {formatCurrency(summary?.mtd_sales.amount ?? 5678230)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#52796f', marginTop: '6px' }}>
            <span>Target: ₹50.00L</span>
            <span style={{ fontWeight: 600, color: '#1b4332' }}>{summary?.mtd_sales.attainment_percent ?? 113.6}% Attainment</span>
          </div>
        </div>

        {/* Procurement Volume */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', letterSpacing: '0.04em' }}>
              Procurement Volume
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
              +{summary?.procurement_volume.growth_yoy ?? 9.8}% YoY
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827' }}>
            {formatCurrency(summary?.procurement_volume.amount ?? 4215760)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#52796f', marginTop: '6px' }}>
            <span>COGS Ratio: {summary?.procurement_volume.cogs_ratio_percent ?? 74.2}%</span>
            <span style={{ fontWeight: 600, color: '#1b4332' }}>{summary?.procurement_volume.inward_count ?? 28} Inward Suppliers</span>
          </div>
        </div>

        {/* Gross Operating Margin */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', letterSpacing: '0.04em' }}>
              Gross Operating Margin
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
              +{summary?.gross_operating_margin.margin_percent ?? 18.5}% Margin
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827' }}>
            {formatCurrency(summary?.gross_operating_margin.amount ?? 1462470)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#52796f', marginTop: '6px' }}>
            <span>Net Profit Est: ₹9.85L</span>
            <span style={{ fontWeight: 600, color: '#1b4332' }}>Margin Health: Strong</span>
          </div>
        </div>

        {/* Consolidated Liquidity */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f', letterSpacing: '0.04em' }}>
              Consolidated Liquidity
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
              Quick Ratio {summary?.consolidated_liquidity.quick_ratio ?? 1.82}
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827' }}>
            {formatCurrency(summary?.consolidated_liquidity.total_liquidity ?? 1875320)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#52796f', marginTop: '6px' }}>
            <span>Cash: ₹85K | Bank: ₹17.9L</span>
            <span style={{ fontWeight: 600, color: '#1b4332' }}>Working Capital OK</span>
          </div>
        </div>
      </div>

      {/* ── ROW 2: COMPARATIVE TRENDS, OPEX DONUT & COMPACT REGIONAL SALES MAP ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '18px' }}>
        
        {/* Card 1 (Col 6): Sales Turnover vs Purchase Trend */}
        <div
          style={{
            gridColumn: 'span 6',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#1b4332" />
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                  Sales Turnover vs Purchase Trend
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1b4332', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1b4332' }}></span>
                  Sales
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
                  Purchase
                </span>
              </div>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#52796f' }}>
              7-Month Comparative Volume Analysis (₹ Lakhs)
            </p>
          </div>

          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trends?.monthly_performance || [
                  { name: 'Apr', sales: 5.4, purchase: 4.1 },
                  { name: 'May', sales: 4.9, purchase: 3.6 },
                  { name: 'Jun', sales: 7.2, purchase: 5.2 },
                  { name: 'Jul', sales: 6.8, purchase: 4.8 },
                  { name: 'Aug', sales: 7.9, purchase: 5.4 },
                  { name: 'Sep', sales: 8.4, purchase: 6.1 },
                  { name: 'Oct', sales: 9.2, purchase: 6.3 },
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1b4332" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#1b4332" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="purchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" />
                <XAxis dataKey="name" stroke="#52796f" fontSize={11} />
                <YAxis stroke="#52796f" fontSize={11} unit="L" />
                <RechartsTooltip />
                <Area type="monotone" dataKey="sales" stroke="#1b4332" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="purchase" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#purchGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2 (Col 3): Operating Expense Distribution Donut */}
        <div
          style={{
            gridColumn: 'span 3',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <PieChartIcon size={18} color="#2d6a4f" />
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                Operating Expenses
              </span>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#52796f' }}>
              P&L Overheads: ₹4.77 Lakhs
            </p>
          </div>

          <div style={{ height: '140px', width: '100%', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trends?.operating_expenses.breakdown || [
                    { name: 'Freight', percentage: 32 },
                    { name: 'Godown', percentage: 24 },
                    { name: 'Travel', percentage: 18 },
                    { name: 'Assets', percentage: 13 },
                    { name: 'Admin', percentage: 13 },
                  ]}
                  dataKey="percentage"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={60}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {(trends?.operating_expenses.breakdown || [0,1,2,3,4]).map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={opexColors[idx % opexColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>₹4.77L</div>
              <div style={{ fontSize: '10px', color: '#52796f' }}>Opex</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', marginTop: '10px' }}>
            {(trends?.operating_expenses.breakdown || [
              { name: 'Freight', short_name: 'Freight', percentage: 32 },
              { name: 'Godown', short_name: 'Godown', percentage: 24 },
              { name: 'Travel', short_name: 'Travel', percentage: 18 },
              { name: 'Assets', short_name: 'Assets', percentage: 13 },
              { name: 'Admin', short_name: 'Admin', percentage: 13 },
            ]).slice(0, 4).map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#52796f' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: opexColors[idx] }}></span>
                  {item.short_name || item.name}
                </span>
                <span style={{ fontWeight: 700, color: '#111827' }}>{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3 (Col 3): COMPACT REGIONAL SALES MAP (Click to Expand) */}
        <div
          id="compact-sales-map-card"
          onClick={() => setIsMapModalOpen(true)}
          style={{
            gridColumn: 'span 3',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2d6a4f'
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(45, 106, 79, 0.12)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d8e2dc'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={18} color="#1b4332" />
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                  Regional Sales Map
                </span>
              </div>
              <button
                id="btn-expand-sales-map"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMapModalOpen(true)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#eef2ef',
                  color: '#1b4332',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  cursor: 'pointer'
                }}
              >
                <Maximize2 size={12} />
                Expand ↗
              </button>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#52796f' }}>
              Territory Turnover Distribution
            </p>

            {/* Compact Map Preview Container */}
            <div
              style={{
                height: '115px',
                backgroundColor: '#f8faf9',
                borderRadius: '12px',
                border: '1px solid #d8e2dc',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg viewBox="0 0 400 240" style={{ width: '100%', height: '100%' }}>
                {/* Punjab & Haryana */}
                <polygon
                  points="140,20 220,50 200,105 130,85"
                  fill="#74c69d"
                  stroke="#ffffff"
                  strokeWidth="2"
                  opacity="0.85"
                />
                {/* Delhi NCR (Center highlight) */}
                <polygon
                  points="190,80 230,85 220,120 180,115"
                  fill="#1b4332"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                {/* Uttar Pradesh */}
                <polygon
                  points="220,55 350,85 370,150 240,165 215,115"
                  fill="#52b788"
                  stroke="#ffffff"
                  strokeWidth="2"
                  opacity="0.75"
                />
                {/* Rajasthan */}
                <polygon
                  points="60,85 145,80 180,165 140,220 70,185"
                  fill="#95d5b2"
                  stroke="#ffffff"
                  strokeWidth="2"
                  opacity="0.8"
                />
                {/* Center marker pins */}
                <circle cx="205" cy="100" r="4" fill="#ffffff" />
                <circle cx="165" cy="55" r="3" fill="#ffffff" />
                <circle cx="280" cy="105" r="3" fill="#ffffff" />
                <circle cx="115" cy="140" r="3" fill="#ffffff" />
              </svg>

              <div
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(4px)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#1b4332',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                }}
              >
                Delhi NCR: ₹24.8L (44%)
              </div>
            </div>
          </div>

          {/* Territory Turnover Quick List */}
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
            {(territoriesData?.territories || [
              { id: '1', short_name: 'Delhi NCR', turnover: 2480000 },
              { id: '2', short_name: 'Punjab & Haryana', turnover: 1640000 },
              { id: '3', short_name: 'Uttar Pradesh', turnover: 1420000 },
              { id: '4', short_name: 'Rajasthan', turnover: 920000 },
            ]).map((t, idx) => (
              <div key={t.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#52796f' }}>{idx + 1}. {t.short_name}</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>
                  ₹{(t.turnover / 100000).toFixed(2)} Lakhs
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '8px', fontSize: '10px', textAlign: 'center', color: '#52796f', fontStyle: 'italic' }}>
            🔍 Click card to inspect state-wise sales analytics
          </div>
        </div>
      </div>

      {/* ── ROW 3: TOP PRODUCTS & STATUTORY AGEING DISTRIBUTION ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '18px' }}>
        {/* Left: Top 5 Pharmaceutical Products */}
        <div
          style={{
            gridColumn: 'span 6',
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
              <Award size={18} color="#1b4332" />
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                Top 5 Revenue-Generating Pharmaceutical Products
              </span>
            </div>
            <button
              onClick={() => navigate('/stock')}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#2d6a4f',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Full Register →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(trends?.top_products || [
              { rank: 1, product_name: 'Augmentin 625 Duo Tablets', manufacturer: 'GSK', turnover: 482000, quantity_packs: 1240, share_pct: 34 },
              { rank: 2, product_name: 'Crocin 650 Advance', manufacturer: 'Haleon', turnover: 395000, quantity_packs: 2850, share_pct: 28 },
              { rank: 3, product_name: 'Dolo 650mg Paracetamol', manufacturer: 'Micro Labs', turnover: 310000, quantity_packs: 3100, share_pct: 22 },
              { rank: 4, product_name: 'Azithral 500mg Tablets', manufacturer: 'Alembic', turnover: 245000, quantity_packs: 890, share_pct: 17 },
              { rank: 5, product_name: 'Pan-D Capsules', manufacturer: 'Alkem Labs', turnover: 198000, quantity_packs: 940, share_pct: 14 }
            ]).map((prod) => (
              <div key={prod.rank}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 700, color: '#111827' }}>
                    {prod.rank}. {prod.product_name} ({prod.manufacturer})
                  </span>
                  <span style={{ fontWeight: 800, color: '#1b4332' }}>
                    {formatCurrency(prod.turnover)} <span style={{ fontSize: '11px', color: '#52796f', fontWeight: 400 }}>({prod.quantity_packs} Packs)</span>
                  </span>
                </div>
                <div style={{ width: '100%', height: '7px', backgroundColor: '#eef2ef', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(prod.turnover / 482000) * 100}%`,
                      backgroundColor: prod.rank === 1 ? '#1b4332' : prod.rank === 2 ? '#2d6a4f' : '#40916c',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Statutory Receivables Outstanding Ageing Distribution */}
        <div
          style={{
            gridColumn: 'span 6',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #d8e2dc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#2d6a4f" />
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                  Receivables Outstanding Ageing Distribution
                </span>
              </div>
              <button
                onClick={() => navigate('/finance/outstanding')}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#2d6a4f',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Ageing Workbench →
              </button>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#52796f' }}>
              Statutory Aging Risk Buckets (Total Receivables: {formatCurrency(trends?.receivables_ageing.total_outstanding ?? 682450)})
            </p>

            {/* Proportion Bar */}
            <div style={{ display: 'flex', height: '18px', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ width: '52%', backgroundColor: '#2d6a4f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 700 }}>52%</div>
              <div style={{ width: '27%', backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 700 }}>27%</div>
              <div style={{ width: '14%', backgroundColor: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 700 }}>14%</div>
              <div style={{ width: '7%', backgroundColor: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 700 }}>7%</div>
            </div>

            {/* 4 Buckets Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {(trends?.receivables_ageing.buckets || [
                { bucket: '0–30 Days', label: 'Current Healthy', amount: 354800, severity: 'success' },
                { bucket: '31–60 Days', label: 'Follow-up Due', amount: 184250, severity: 'warning' },
                { bucket: '61–90 Days', label: 'High Risk', amount: 95500, severity: 'danger' },
                { bucket: '90+ Days', label: 'Overdue Default', amount: 47900, severity: 'critical' },
              ]).map((b, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: idx === 0 ? '#f0fdf4' : idx === 1 ? '#fffbeb' : idx === 2 ? '#fff7ed' : '#fef2f2',
                    border: `1px solid ${idx === 0 ? '#bbf7d0' : idx === 1 ? '#fde68a' : idx === 2 ? '#fed7aa' : '#fecaca'}`,
                    borderRadius: '10px',
                    padding: '12px 10px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#52796f' }}>
                    {b.bucket}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827', margin: '4px 0' }}>
                    {formatCurrency(b.amount)}
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: idx === 0 ? '#15803d' : idx === 1 ? '#b45309' : idx === 2 ? '#c2410c' : '#b91c1c' }}>
                    ● {b.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE EXPANDED SALES MAP MODAL ── */}
      {isMapModalOpen && (
        <div
          id="mapModal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => setIsMapModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '960px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #d8e2dc'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid #d8e2dc',
                backgroundColor: '#ffffff'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#1b4332', color: '#ffffff', padding: '2px 8px', borderRadius: '4px' }}>
                    FULL TERRITORY BREAKDOWN
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '4px' }}>
                    Sales Turnover Focus
                  </span>
                </div>
                <h2 style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                  🗺 Regional Pharmaceutical Sales Intelligence & Market Coverage
                </h2>
              </div>
              <button
                id="btn-close-map-modal"
                onClick={() => setIsMapModalOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid #d8e2dc',
                  backgroundColor: '#f8faf9',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#111827'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
              {/* Left Column: Enlarged Interactive Vector Map */}
              <div
                style={{
                  gridColumn: 'span 7',
                  backgroundColor: '#f8faf9',
                  borderRadius: '16px',
                  border: '1px solid #d8e2dc',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '340px'
                }}
              >
                <svg viewBox="0 0 450 280" style={{ width: '100%', height: '280px' }}>
                  {/* Punjab & Haryana */}
                  <polygon
                    points="140,25 240,60 215,125 130,100"
                    fill={activeTerritoryId === 'punjab_haryana' ? '#1b4332' : '#74c69d'}
                    stroke="#ffffff"
                    strokeWidth="3"
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setActiveTerritoryId('punjab_haryana')}
                  />
                  <text x="175" y="75" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                    PUNJAB & HARYANA
                  </text>

                  {/* Delhi NCR */}
                  <polygon
                    points="205,95 250,100 240,140 195,135"
                    fill={activeTerritoryId === 'delhi_ncr' ? '#0f291e' : '#1b4332'}
                    stroke="#ffffff"
                    strokeWidth="3"
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setActiveTerritoryId('delhi_ncr')}
                  />
                  <text x="300" y="115" fill="#1b4332" fontSize="11" fontWeight="bold">
                    DELHI NCR (₹24.8L)
                  </text>

                  {/* Uttar Pradesh */}
                  <polygon
                    points="245,65 390,100 415,175 270,195 240,135"
                    fill={activeTerritoryId === 'uttar_pradesh' ? '#1b4332' : '#52b788'}
                    stroke="#ffffff"
                    strokeWidth="3"
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setActiveTerritoryId('uttar_pradesh')}
                  />
                  <text x="330" y="145" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                    UTTAR PRADESH
                  </text>

                  {/* Rajasthan */}
                  <polygon
                    points="50,100 150,95 190,195 145,260 65,220"
                    fill={activeTerritoryId === 'rajasthan' ? '#1b4332' : '#95d5b2'}
                    stroke="#ffffff"
                    strokeWidth="3"
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setActiveTerritoryId('rajasthan')}
                  />
                  <text x="110" y="170" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                    RAJASTHAN
                  </text>
                </svg>

                <div style={{ fontSize: '11px', color: '#52796f', textAlign: 'center' }}>
                  💡 Click on any territory polygon to view instant sales drill-down
                </div>
              </div>

              {/* Right Column: Territory Performance & State List */}
              <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Active Territory Card */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #2d6a4f',
                    borderRadius: '14px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(45, 106, 79, 0.08)'
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#1b4332', marginBottom: '8px' }}>
                    {selectedTerritory.name}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div style={{ backgroundColor: '#f8faf9', padding: '10px', borderRadius: '8px', border: '1px solid #d8e2dc' }}>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#52796f', fontWeight: 700 }}>Billed Turnover</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{formatCurrency(selectedTerritory.turnover)}</div>
                    </div>
                    <div style={{ backgroundColor: '#f8faf9', padding: '10px', borderRadius: '8px', border: '1px solid #d8e2dc' }}>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#52796f', fontWeight: 700 }}>Retail Chemists</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{selectedTerritory.retail_chemists} Outlets</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#2d6a4f', fontWeight: 600 }}>
                    Attainment: {selectedTerritory.attainment_percent}% of Monthly Sales Quota
                  </div>
                </div>

                {/* State Performance Table */}
                <div style={{ border: '1px solid #d8e2dc', borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f8faf9', borderBottom: '1px solid #d8e2dc', color: '#52796f' }}>
                      <tr>
                        <th style={{ padding: '8px 12px' }}>Territory</th>
                        <th style={{ padding: '8px 12px' }}>Turnover</th>
                        <th style={{ padding: '8px 12px' }}>Coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(territoriesData?.territories || []).map((t) => (
                        <tr
                          key={t.id}
                          onClick={() => setActiveTerritoryId(t.id)}
                          style={{
                            borderBottom: '1px solid #eef2ef',
                            cursor: 'pointer',
                            backgroundColor: activeTerritoryId === t.id ? '#f0fdf4' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#111827' }}>{t.short_name}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1b4332' }}>₹{(t.turnover / 100000).toFixed(2)}L</td>
                          <td style={{ padding: '8px 12px', color: '#52796f' }}>{t.retail_chemists} Outlets</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={() => {
                    setIsMapModalOpen(false)
                    navigate('/reports')
                  }}
                  style={{
                    padding: '12px',
                    backgroundColor: '#1b4332',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Open Full Territory Sales Register (DOC-30) →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
