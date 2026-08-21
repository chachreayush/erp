import React, { useState } from 'react' 
import { useReturnNavigation } from '../../hooks/useReturnNavigation'
import { Plus, Download, Receipt } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

export default function FinancePage() {

  const [isAdding, setIsAdding] = useState(false)
  useReturnNavigation(isAdding)
  const [ledgers, setLedgers] = useState<{name: string, group: string, balance: number}[]>([
    { name: 'Cash Account', group: 'Cash-in-Hand', balance: 15000 },
    { name: 'HDFC Bank', group: 'Bank Accounts', balance: 250000 },
    { name: 'Sales A/c', group: 'Sales Accounts', balance: 0 }
  ])

  const [newLedger, setNewLedger] = useState({
    name: '',
    group: '',
    balance: ''
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLedgers([{ name: newLedger.name, group: newLedger.group, balance: Number(newLedger.balance) || 0 }, ...ledgers])
    setIsAdding(false)
    setNewLedger({ name: '', group: '', balance: '' })
  }

  return (
    <div style={{ maxWidth: '1200px', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* ── HEADER & ACTIONS ────────────────────────────────── */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: '4px' }}>
            Finance & Accounting
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Manage ledgers, accounts, and financial transactions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" leftIcon={<Download size={16} />}>
            Export
          </Button>
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsAdding(true)}>
            Create Ledger
          </Button>
        </div>
      </div>

      {/* ── ADD LEDGER MODAL (MARG POPUP WORKFLOW) ──────────── */}
      <Modal 
        isOpen={isAdding} 
        onClose={() => setIsAdding(false)} 
        title="Ledger Creation"
        maxWidth="500px"
      >
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '16px' }}>
          Create a new accounting ledger (Popup workflow).
        </p>
        <form onSubmit={handleCreateSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input 
              label="Ledger Name *" 
              required 
              value={newLedger.name}
              onChange={e => setNewLedger({...newLedger, name: e.target.value})}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginLeft: '2px' }}>
                Account Group *
              </label>
              <select 
                required
                style={{
                  width: '100%', padding: '12px 16px',
                  backgroundColor: 'var(--color-bg-input)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text)',
                  fontSize: '15px', outline: 'none'
                }}
                value={newLedger.group}
                onChange={e => setNewLedger({...newLedger, group: e.target.value})}
              >
                <option value="">Select Group...</option>
                <option value="Sundry Debtors">Sundry Debtors</option>
                <option value="Sundry Creditors">Sundry Creditors</option>
                <option value="Bank Accounts">Bank Accounts</option>
                <option value="Cash-in-Hand">Cash-in-Hand</option>
                <option value="Sales Accounts">Sales Accounts</option>
                <option value="Purchase Accounts">Purchase Accounts</option>
                <option value="Direct Expenses">Direct Expenses</option>
              </select>
            </div>
            <Input 
              label="Opening Balance (₹)" 
              type="number"
              value={newLedger.balance}
              onChange={e => setNewLedger({...newLedger, balance: e.target.value})}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Ledger
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── LEDGERS DATA TABLE ──────────────────────────────── */}
      <Card padding="none">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-hover)' }}>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Ledger Name</th>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Under Group</th>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledgers.map((ledger, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '32px', height: '32px', borderRadius: 'var(--radius-md)', 
                        backgroundColor: 'var(--color-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                      }}>
                        <Receipt size={16} color="var(--color-text-secondary)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{ledger.name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>{ledger.group}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      ₹{ledger.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </td>
                </tr>
              ))}
              {ledgers.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No ledgers found. Click "Create Ledger" to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
