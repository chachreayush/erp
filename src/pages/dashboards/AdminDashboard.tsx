import { useAuthStore } from '../../store/authStore'
import GeographicMap from '../../components/dashboard/GeographicMap'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from 'recharts'
import { ArrowUpRight, FileText } from 'lucide-react'

const performanceData = [
  { name: 'Jan', sales: 4000, purchase: 2400 },
  { name: 'Feb', sales: 3000, purchase: 1398 },
  { name: 'Mar', sales: 2000, purchase: 9800 },
  { name: 'Apr', sales: 2780, purchase: 3908 },
  { name: 'May', sales: 1890, purchase: 4800 },
  { name: 'Jun', sales: 2390, purchase: 3800 },
  { name: 'Jul', sales: 3490, purchase: 4300 },
]

const expenseData = [
  { name: 'Transport', value: 32 },
  { name: 'Warehouse', value: 24 },
  { name: 'Freight', value: 18 },
  { name: 'Other', value: 26 },
]
const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#ef4444']

const cashFlowData = [
  { name: 'Jan', Inflow: 4000, Outflow: 2400 },
  { name: 'Feb', Inflow: 3000, Outflow: 1398 },
  { name: 'Mar', Inflow: 2000, Outflow: 9800 },
  { name: 'Apr', Inflow: 2780, Outflow: 3908 },
  { name: 'May', Inflow: 1890, Outflow: 4800 },
  { name: 'Jun', Inflow: 2390, Outflow: 3800 },
]

export default function AdminDashboard() {
  const user = useAuthStore(state => state.user)

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-in-out', minHeight: '100%', overflowY: 'auto' }}>
      
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Good morning, {(user?.name || 'Admin').split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: 0, fontWeight: 500 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} • Global Overview
          </p>
        </div>
      </div>

      {/* ── TOP KPI ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        {[
          { title: 'Total Sales', amount: '₹ 56,78,230', trend: '+ 14%', color: '#10b981' },
          { title: 'Total Purchase', amount: '₹ 42,15,760', trend: '+ 10%', color: '#10b981' },
          { title: 'Gross Profit', amount: '₹ 14,62,470', trend: '+ 18%', color: '#10b981' },
          { title: 'Cash & Bank', amount: '₹ 18,75,320', trend: '+ 7%', color: '#10b981' }
        ].map((kpi, idx) => (
          <div key={idx} style={{ backgroundColor: '#1e1f23', border: '1px solid #ffffff10', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ color: '#8892b0', fontSize: '14px', margin: 0, fontWeight: 600 }}>{kpi.title}</p>
            <h2 style={{ color: '#fff', fontSize: '28px', margin: 0, fontWeight: 800 }}>{kpi.amount}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: kpi.color, fontSize: '13px', fontWeight: 700 }}>
              <ArrowUpRight size={16} /> {kpi.trend}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3x2 PERFECT UNIFORM GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 1fr', gap: '24px', flex: 1, gridAutoRows: '340px' }}>
        
        {/* ROW 1: Map | Performance | Expense */}
        
        {/* Map - Now half height (spanning 1 row instead of 2) */}
        <GeographicMap />

        {/* Monthly Performance */}
        <div style={{ backgroundColor: '#1e1f23', border: '1px solid #ffffff10', borderRadius: '12px', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
           <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 700, color: '#fff' }}>Monthly Performance</h3>
           <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#8892b0" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8892b0" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}L`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1e1f23', borderColor: '#ffffff10' }} />
                  <Legend verticalAlign="top" height={36}/>
                  <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" dataKey="purchase" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPurchase)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Expense Breakdown */}
        <div style={{ backgroundColor: '#1e1f23', border: '1px solid #ffffff10', borderRadius: '12px', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
           <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700, color: '#fff' }}>Expense Breakdown</h3>
           <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ height: '180px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                      {expenseData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1e1f23', borderColor: '#ffffff10' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', marginTop: '16px' }}>
                {expenseData.map((exp, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#8892b0' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[idx] }} />
                    <span>{exp.name}</span>
                    <span style={{ color: '#fff', fontWeight: 700, marginLeft: 'auto' }}>{exp.value}%</span>
                  </div>
                ))}
              </div>
           </div>
        </div>


        {/* ROW 2: Top Products | Cash Flow | Recent Documents */}
        
        {/* Top Products Table */}
        <div style={{ backgroundColor: '#1e1f23', border: '1px solid #ffffff10', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
           <div style={{ padding: '20px 24px', borderBottom: '1px solid #ffffff10' }}>
             <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>Top Products</h3>
           </div>
           <div style={{ padding: '0 24px', flex: 1, overflowY: 'auto' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
               <thead>
                 <tr>
                   <th style={{ padding: '16px 0', color: '#8892b0', fontWeight: 600 }}>Product</th>
                   <th style={{ padding: '16px 0', color: '#8892b0', fontWeight: 600 }}>Qty Sold</th>
                   <th style={{ padding: '16px 0', color: '#8892b0', fontWeight: 600, textAlign: 'right' }}>Revenue</th>
                 </tr>
               </thead>
               <tbody>
                 {[
                   { name: 'Mobile Accessories', qty: '12,450', rev: '₹ 8.7L' },
                   { name: 'Electronics', qty: '8,330', rev: '₹ 6.3L' },
                   { name: 'Apparel', qty: '5,890', rev: '₹ 4.2L' },
                   { name: 'Home & Kitchen', qty: '4,560', rev: '₹ 3.1L' }
                 ].map((row, idx) => (
                   <tr key={idx} style={{ borderTop: '1px solid #ffffff0a' }}>
                     <td style={{ padding: '14px 0', color: '#fff', fontWeight: 500 }}>{row.name}</td>
                     <td style={{ padding: '14px 0', color: '#e2e8f0' }}>{row.qty}</td>
                     <td style={{ padding: '14px 0', color: '#fff', fontWeight: 600, textAlign: 'right' }}>{row.rev}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

        {/* Cash Flow */}
        <div style={{ backgroundColor: '#1e1f23', border: '1px solid #ffffff10', borderRadius: '12px', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
           <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 700, color: '#fff' }}>Cash Flow Overview</h3>
           <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#8892b0" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: '#1e1f23', borderColor: '#ffffff10' }} />
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Outflow" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Recent Documents */}
        <div style={{ backgroundColor: '#1e1f23', border: '1px solid #ffffff10', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
           <div style={{ padding: '20px 24px', borderBottom: '1px solid #ffffff10' }}>
             <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>Recent Documents</h3>
           </div>
           <div style={{ padding: '0', flex: 1, overflowY: 'auto' }}>
             {[
               { title: 'Sales Invoice #SI-1042', date: '13 May 2026' },
               { title: 'Purchase Order #PO-658', date: '13 May 2026' },
               { title: 'Payment Received #PR-341', date: '13 May 2026' },
               { title: 'Credit Note #CN-087', date: '11 May 2026' }
             ].map((doc, idx) => (
               <div key={idx} style={{ padding: '16px 24px', borderBottom: '1px solid #ffffff0a', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#3b82f620', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#fff', fontWeight: 600 }}>{doc.title}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#8892b0' }}>{doc.date}</p>
                  </div>
               </div>
             ))}
           </div>
        </div>

      </div>
    </div>
  )
}
