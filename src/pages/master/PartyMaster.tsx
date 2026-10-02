import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit2, ChevronDown, ChevronRight, MapPin, Building, CreditCard, Truck } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { apiClient } from '../../lib/api'
import { useNavigate } from 'react-router-dom'


export default function PartyMaster() {
  const navigate = useNavigate()

  const [parties, setParties] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form State
  const [legalName, setLegalName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [pan, setPan] = useState('')
  const [gst, setGst] = useState('')
  
  // Roles
  const [isCustomer, setIsCustomer] = useState(false)
  const [isSupplier, setIsSupplier] = useState(false)

  // Financial
  const [createCustomerLedger, setCreateCustomerLedger] = useState(true)
  const [customerLedgerGroupId, setCustomerLedgerGroupId] = useState('')
  const [customerOpeningBalance, setCustomerOpeningBalance] = useState(0)
  const [customerOpType, setCustomerOpType] = useState('Dr')
  
  const [createSupplierLedger, setCreateSupplierLedger] = useState(true)
  const [supplierLedgerGroupId, setSupplierLedgerGroupId] = useState('')
  const [supplierOpeningBalance, setSupplierOpeningBalance] = useState(0)
  const [supplierOpType, setSupplierOpType] = useState('Cr')

  // Address
  const [address, setAddress] = useState({
    line1: '', line2: '', city: '', state: '', pincode: ''
  })

  // Customer Profile
  const [creditLimit, setCreditLimit] = useState(0)
  const [creditDays, setCreditDays] = useState(0)
  
  const [ledgerGroups, setLedgerGroups] = useState<any[]>([])

  useEffect(() => {
    fetchParties()
    fetchLedgerGroups()
  }, [])

  const fetchParties = async () => {
    try {
      const res = await apiClient.get('/master/parties/')
      setParties(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchLedgerGroups = async () => {
    try {
      const res = await apiClient.get('/finance/groups')
      setLedgerGroups(res.data.filter((g: any) => g.is_active))
    } catch (e) {
      console.error(e)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const payload = {
      legal_name: legalName,
      trade_name: tradeName,
      pan,
      gst,
      status: 'active',
      create_customer_ledger: createCustomerLedger,
      customer_ledger_group_id: createCustomerLedger ? customerLedgerGroupId : null,
      customer_opening_balance: customerOpeningBalance,
      customer_op_type: customerOpType,
      create_supplier_ledger: createSupplierLedger,
      supplier_ledger_group_id: createSupplierLedger ? supplierLedgerGroupId : null,
      supplier_opening_balance: supplierOpeningBalance,
      supplier_op_type: supplierOpType,
      addresses: [
        {
          address_type: 'Billing',
          is_default: true,
          ...address
        }
      ],
      customer_profile: isCustomer ? {
        credit_limit: creditLimit,
        credit_days: creditDays
      } : null,
      supplier_profile: isSupplier ? {
        lead_time_days: 0
      } : null
    }

    try {
      await apiClient.post('/master/parties/', payload)
      setIsModalOpen(false)
      fetchParties()
      // reset form
      setLegalName('')
      setTradeName('')
      setPan('')
      setGst('')
      setIsCustomer(false)
      setIsSupplier(false)
    } catch (err) {
      alert("Error saving party")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: 'var(--color-text)' }}>
      <Button variant="secondary" onClick={() => navigate('/')} style={{ marginBottom: '16px' }}>&larr; Back to Dashboard</Button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)' }}>Business Partner Master</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Unified Customer and Supplier Management (DOC-10)</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> New Business Partner
        </Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Input 
          icon={<Search size={16} />}
          placeholder="Search by legal name, trade name, GST, or PAN..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      <div style={{ 
        backgroundColor: 'var(--color-bg-surface)', 
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px' }}>Legal Name</th>
              <th style={{ padding: '12px 16px' }}>Trade Name</th>
              <th style={{ padding: '12px 16px' }}>GSTIN</th>
              <th style={{ padding: '12px 16px' }}>Roles</th>
              <th style={{ padding: '12px 16px' }}>Financial Ledger</th>
            </tr>
          </thead>
          <tbody>
            {parties.filter(p => p.legal_name.toLowerCase().includes(search.toLowerCase())).map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.legal_name}</td>
                <td style={{ padding: '12px 16px' }}>{p.trade_name || '-'}</td>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{p.gst || '-'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {p.customer_profile && <span style={{ padding: '2px 8px', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: '12px', fontSize: '12px' }}>Customer</span>}
                    {p.supplier_profile && <span style={{ padding: '2px 8px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '12px', fontSize: '12px' }}>Supplier</span>}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {p.customer_profile?.ledger_id || p.supplier_profile?.ledger_id ? 'Linked' : 'Not Linked'}
                </td>
              </tr>
            ))}
            {parties.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No business partners found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Business Partner" maxWidth="800px">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
          
          {/* Section 1: Core details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input variant="compact" label="Legal Name *" required value={legalName} onChange={e => setLegalName(e.target.value)} />
            <Input variant="compact" label="Trade Name" value={tradeName} onChange={e => setTradeName(e.target.value)} />
            <Input variant="compact" label="GSTIN" value={gst} onChange={e => setGst(e.target.value)} />
            <Input variant="compact" label="PAN" value={pan} onChange={e => setPan(e.target.value)} />
          </div>

          <hr style={{ borderColor: 'var(--color-border)', margin: '10px 0' }} />

          {/* Section 2: Roles */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px', display: 'block' }}>BUSINESS ROLES</label>
            <div style={{ display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={isCustomer} onChange={e => setIsCustomer(e.target.checked)} />
                Is a Customer
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={isSupplier} onChange={e => setIsSupplier(e.target.checked)} />
                Is a Supplier
              </label>
            </div>
          </div>

          {/* Section 3: Conditional Customer Profile */}
          {isCustomer && (
            <div style={{ backgroundColor: 'var(--color-bg-subtle)', padding: '16px', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}><Building size={16}/> Customer Settings</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input variant="compact" type="number" label="Credit Limit (₹)" value={creditLimit} onChange={e => setCreditLimit(Number(e.target.value))} />
                <Input variant="compact" type="number" label="Credit Days" value={creditDays} onChange={e => setCreditDays(Number(e.target.value))} />
              </div>
            </div>
          )}

          {/* Section 4: Address */}
          <div>
             <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px', display: 'block' }}>PRIMARY ADDRESS</label>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input variant="compact" label="Address Line 1 *" required value={address.line1} onChange={e => setAddress({...address, line1: e.target.value})} />
                <Input variant="compact" label="Address Line 2" value={address.line2} onChange={e => setAddress({...address, line2: e.target.value})} />
                <Input variant="compact" label="City" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Input variant="compact" label="State" value={address.state} onChange={e => setAddress({...address, state: e.target.value})} />
                  <Input variant="compact" label="Pincode" value={address.pincode} onChange={e => setAddress({...address, pincode: e.target.value})} />
                </div>
             </div>
          </div>

          {/* Section 5: Financial Integration */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px', display: 'block' }}>ACCOUNTING (AUTO-LINK)</label>
            
            {isCustomer && (
              <div style={{ backgroundColor: 'var(--color-bg-subtle)', padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px' }}>
                  <input type="checkbox" checked={createCustomerLedger} onChange={e => setCreateCustomerLedger(e.target.checked)} />
                  Automatically create Customer Ledger (AR)
                </label>
                {createCustomerLedger && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>AR Ledger Group *</label>
                      <select style={{ width: '100%', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} value={customerLedgerGroupId} onChange={e => setCustomerLedgerGroupId(e.target.value)}>
                        <option value="">-- Select AR Group --</option>
                        {ledgerGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Input variant="compact" type="number" label="Opening Balance" value={customerOpeningBalance} onChange={e => setCustomerOpeningBalance(Number(e.target.value))} />
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Dr/Cr</label>
                        <select style={{ width: '100%', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} value={customerOpType} onChange={e => setCustomerOpType(e.target.value)}>
                          <option value="Dr">Dr</option><option value="Cr">Cr</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isSupplier && (
              <div style={{ backgroundColor: 'var(--color-bg-subtle)', padding: '16px', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px' }}>
                  <input type="checkbox" checked={createSupplierLedger} onChange={e => setCreateSupplierLedger(e.target.checked)} />
                  Automatically create Supplier Ledger (AP)
                </label>
                {createSupplierLedger && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>AP Ledger Group *</label>
                      <select style={{ width: '100%', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} value={supplierLedgerGroupId} onChange={e => setSupplierLedgerGroupId(e.target.value)}>
                        <option value="">-- Select AP Group --</option>
                        {ledgerGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Input variant="compact" type="number" label="Opening Balance" value={supplierOpeningBalance} onChange={e => setSupplierOpeningBalance(Number(e.target.value))} />
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Dr/Cr</label>
                        <select style={{ width: '100%', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} value={supplierOpType} onChange={e => setSupplierOpType(e.target.value)}>
                          <option value="Cr">Cr</option><option value="Dr">Dr</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Create Business Partner'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
