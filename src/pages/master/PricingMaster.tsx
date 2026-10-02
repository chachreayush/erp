import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Search, Plus, DollarSign, Calculator, Play, X, ChevronDown, ChevronUp } from 'lucide-react'

export default function PricingMaster() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'lists' | 'formulas' | 'customers' | 'simulator'>('lists')

  const [priceLists, setPriceLists] = useState<any[]>([])
  const [formulas, setFormulas] = useState<any[]>([])
  const [configs, setConfigs] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [parties, setParties] = useState<any[]>([])
  
  // Modals
  const [showListModal, setShowListModal] = useState(false)
  const [showFormulaModal, setShowFormulaModal] = useState(false)
  const [showRuleModal, setShowRuleModal] = useState<string | null>(null)
  
  // Forms
  const [listForm, setListForm] = useState({ code: '', name: '', description: '', status: 'active' })
  const [formulaForm, setFormulaForm] = useState({ target_rate_type: '', source_rate_type: 'mrp', operator: 'multiply', operand: 1, floor_price: 0 })
  const [ruleForm, setRuleForm] = useState({ product_id: '', valid_from: new Date().toISOString().split('T')[0], valid_to: '2099-12-31', fixed_price: 0 })
  
  // Simulator State
  const [simProduct, setSimProduct] = useState('')
  const [simParty, setSimParty] = useState('')
  const [simDate, setSimDate] = useState(new Date().toISOString().split('T')[0])
  const [simResult, setSimResult] = useState<any>(null)

  const [expandedList, setExpandedList] = useState<string | null>(null)
  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null)
  const [isCustomSource, setIsCustomSource] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!showListModal && !showFormulaModal && !showRuleModal) {
          navigate('/')
        } else {
          setShowListModal(false)
          setShowFormulaModal(false)
          setShowRuleModal(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showListModal, showFormulaModal, showRuleModal, navigate])

  const fetchData = useCallback(async () => {
    try {
      const [lRes, fRes, cRes, prRes, paRes] = await Promise.all([
        apiClient.get('/api/pricing/lists'),
        apiClient.get('/api/pricing/formulas'),
        apiClient.get('/api/pricing/customer-config'),
        apiClient.get('/api/products/'),
        apiClient.get('/api/parties/')
      ])
      setPriceLists(lRes.data)
      setFormulas(fRes.data)
      setConfigs(cRes.data)
      setProducts(prRes.data)
      setParties(paRes.data)
    } catch (err) { console.error(err) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreateList = async () => {
    await apiClient.post('/api/pricing/lists', listForm)
    setShowListModal(false)
    fetchData()
  }

  const handleCreateRule = async (listId: string) => {
    if(!ruleForm.product_id) return alert("Select product")
    await apiClient.post(`/api/pricing/lists/${listId}/rules`, ruleForm)
    setShowRuleModal(null)
    fetchData()
  }

  const openNewFormula = () => {
    setEditingFormulaId(null)
    setFormulaForm({ target_rate_type: '', source_rate_type: 'mrp', operator: 'multiply', operand: 1, floor_price: 0 })
    setIsCustomSource(false)
    setShowFormulaModal(true)
  }

  const openEditFormula = (f: any) => {
    setEditingFormulaId(f.id)
    setFormulaForm({
        target_rate_type: f.target_rate_type,
        source_rate_type: f.source_rate_type,
        operator: f.operator,
        operand: f.operand,
        floor_price: f.floor_price || 0
    })
    setIsCustomSource(!['mrp', 'purchase', 'standard'].includes(f.source_rate_type))
    setShowFormulaModal(true)
  }

  const handleDeleteFormula = async (id: string) => {
    if(window.confirm('Are you sure you want to delete this formula?')) {
        await apiClient.delete(`/api/pricing/formulas/${id}`)
        fetchData()
    }
  }

  const handleSaveFormula = async () => {
    if (editingFormulaId) {
        await apiClient.put(`/api/pricing/formulas/${editingFormulaId}`, formulaForm)
    } else {
        await apiClient.post('/api/pricing/formulas', formulaForm)
    }
    setShowFormulaModal(false)
    setEditingFormulaId(null)
    fetchData()
  }

  const runSimulation = async () => {
    if (!simProduct || !simParty || !simDate) return alert("Select product, party and date")
    try {
      const res = await apiClient.get(`/api/pricing/simulate?product_id=${simProduct}&party_id=${simParty}&tx_date=${simDate}`)
      setSimResult(res.data)
    } catch (err) { alert('Simulation failed') }
  }

  const renderFormulaExplanation = (f: any) => {
    const op = f.operator === 'multiply' ? 'multiplied by factor' : 'plus margin percentage of'
    return `Set ${f.target_rate_type.toUpperCase()} RATE equal to ${f.source_rate_type.toUpperCase()} ${op} ${f.operand}.`
  }

  return (
    <div style={{ padding: '24px', background: 'var(--color-bg)', minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
        <DollarSign size={24} color="var(--color-primary)" />
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Pricing & Formulas</h1>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)' }}>
        {['lists', 'formulas', 'customers', 'simulator'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: '8px 16px', border: 'none', background: 'transparent',
              borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: activeTab === tab ? 600 : 500, cursor: 'pointer', textTransform: 'capitalize'
            }}
          >
            {tab === 'lists' && '1. Price Lists (Fixed Rates)'}
            {tab === 'formulas' && '2. Formula Builder'}
            {tab === 'customers' && '3. Assign to Customers'}
            {tab === 'simulator' && '4. Simulator / Test Engine'}
          </button>
        ))}
      </div>

      {activeTab === 'lists' && (
        <div>
          <div style={{ marginBottom: 16, color: 'var(--color-text-muted)', fontSize: 14 }}>
            Create specific Price Lists (e.g. "Diwali Special", "Tier-1 Contract") and add fixed product prices to them.
          </div>
          <button onClick={() => setShowListModal(true)} style={{...btnStyle, marginBottom: 16}}><Plus size={14}/> New Price List</button>
          <div style={{ display: 'grid', gap: '12px' }}>
            {priceLists.map(l => (
              <div key={l.id} style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                <div 
                  style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setExpandedList(expandedList === l.id ? null : l.id)}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{l.name} <span style={{color:'var(--color-text-muted)', fontWeight: 400}}>({l.code})</span></div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{l.description}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: '12px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 8px', borderRadius: 12 }}>
                      {l.rules?.length || 0} items configured
                    </div>
                    {expandedList === l.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {expandedList === l.id && (
                  <div style={{ borderTop: '1px solid var(--color-border)', padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <h4 style={{ margin: 0, fontSize: 14 }}>Configured Prices</h4>
                      <button onClick={() => setShowRuleModal(l.id)} style={{...btnStyle, background: 'var(--color-primary)', color: '#fff'}}><Plus size={14} /> Add Product Price</button>
                    </div>
                    {l.rules && l.rules.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', textAlign: 'left' }}>
                            <th style={{ padding: '8px' }}>Product</th>
                            <th style={{ padding: '8px' }}>Valid From</th>
                            <th style={{ padding: '8px' }}>Valid To</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Fixed Price (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {l.rules.map((r: any) => {
                            const p = products.find(x => x.id === r.product_id)
                            return (
                              <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '8px' }}>{p?.name || 'Unknown'}</td>
                                <td style={{ padding: '8px' }}>{r.valid_from}</td>
                                <td style={{ padding: '8px' }}>{r.valid_to}</td>
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>₹{parseFloat(r.fixed_price).toFixed(2)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>No prices configured in this list yet.</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'formulas' && (
        <div>
          <div style={{ marginBottom: 16, color: 'var(--color-text-muted)', fontSize: 14 }}>
            Create automated rules (e.g. "Distributor Rate is always 20% below MRP"). These calculate dynamically in billing.
          </div>
          <button onClick={openNewFormula} style={{...btnStyle, marginBottom: 16}}><Plus size={14}/> New Formula</button>
          <div style={{ display: 'grid', gap: '12px' }}>
            {formulas.map(f => (
              <div key={f.id} style={{ padding: '16px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 12, borderRadius: '50%' }}>
                  <Calculator size={24} color="#10b981" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, textTransform: 'uppercase', color: '#10b981' }}>{f.target_rate_type} RATE</div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                    {renderFormulaExplanation(f)}
                  </div>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--color-text-muted)', marginTop: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: 4, display: 'inline-block' }}>
                    Logic: {f.target_rate_type} = {f.source_rate_type} {f.operator === 'multiply' ? '×' : '+%'} {f.operand}
                    {f.floor_price ? ` | Min Value: ₹${f.floor_price}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: 'auto' }}>
                  <button onClick={() => openEditFormula(f)} style={{...btnStyle, background: 'var(--color-bg)'}}>Edit</button>
                  <button onClick={() => handleDeleteFormula(f.id)} style={{...btnStyle, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div>
           <div style={{ marginBottom: 16, color: 'var(--color-text-muted)', fontSize: 14 }}>
            Assign a Default Rate Type (which uses Formulas) or a specific Price List (which uses fixed rates) to a Customer.
          </div>
          <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Assigned Customer Configurations</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '8px' }}>Customer Name</th>
                  <th style={{ padding: '8px' }}>Default Rate Type (Formula Based)</th>
                  <th style={{ padding: '8px' }}>Assigned Price List (Fixed Rates)</th>
                </tr>
              </thead>
              <tbody>
                {configs.map(c => {
                  const p = parties.find(x => x.id === c.party_id)
                  const l = priceLists.find(x => x.id === c.price_list_id)
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{p?.legal_name || 'Unknown'}</td>
                      <td style={{ padding: '8px', textTransform: 'uppercase', color: '#10b981' }}>{c.default_rate_type || '--'}</td>
                      <td style={{ padding: '8px', color: '#38bdf8' }}>{l?.name || '--'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'simulator' && (
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ width: '320px', background: 'var(--color-bg-surface)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>1. Select Context</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Sundry Debtor (Customer)</label>
                <select style={selectStyle} value={simParty} onChange={e => setSimParty(e.target.value)}>
                  <option value="">-- Select Sundry Debtor --</option>
                  {parties.map(p => <option key={p.id} value={p.id}>{p.legal_name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Product</label>
                <select style={selectStyle} value={simProduct} onChange={e => setSimProduct(e.target.value)}>
                  <option value="">-- Select Product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <Input variant="dense" label="Transaction Date" type="date" value={simDate} onChange={e => setSimDate(e.target.value)} />
              <button onClick={runSimulation} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff', justifyContent: 'center', marginTop: '12px', padding: '10px' }}>
                <Play size={14} /> Calculate Price
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, background: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={16} color="var(--color-primary)"/> Resolution Audit Trail (Why this price?)
            </h3>
            {!simResult ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
                Select a Customer and Product, then click Calculate Price to see how the Engine resolves the final price.
              </div>
            ) : (
              <div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '20px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#10b981', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>Final Resolved Price</div>
                  <div style={{ fontSize: '42px', fontWeight: 800, color: '#fff', margin: '8px 0' }}>₹{simResult.final_price?.toFixed(2)}</div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Selected Mechanism: <span style={{ color: '#fff', fontWeight: 600, textTransform: 'uppercase' }}>{simResult.source}</span></div>
                </div>
                
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Engine Evaluation Log:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {simResult.trace?.map((t: string, i: number) => (
                    <div key={i} style={{ fontSize: '13px', fontFamily: 'monospace', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', borderLeft: i === simResult.trace.length - 1 ? '3px solid #10b981' : '3px solid var(--color-primary)' }}>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {showListModal && (
        <div style={overlayStyle} onClick={() => setShowListModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Create New Price List</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input variant="dense" label="Code (e.g. WH-2026)" value={listForm.code} onChange={e => setListForm({...listForm, code: e.target.value})} />
              <Input variant="dense" label="List Name (e.g. Wholesale 2026)" value={listForm.name} onChange={e => setListForm({...listForm, name: e.target.value})} />
              <Input variant="dense" label="Description" value={listForm.description} onChange={e => setListForm({...listForm, description: e.target.value})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={handleCreateList} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff' }}>Save Price List</button>
            </div>
          </div>
        </div>
      )}

      {showRuleModal && (
        <div style={overlayStyle} onClick={() => setShowRuleModal(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Add Product Price to List</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Product</label>
                <select style={selectStyle} value={ruleForm.product_id} onChange={e => setRuleForm({...ruleForm, product_id: e.target.value})}>
                  <option value="">-- Select Product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (MRP: ₹{p.mrp})</option>)}
                </select>
              </div>
              <Input variant="dense" type="date" label="Valid From" value={ruleForm.valid_from} onChange={e => setRuleForm({...ruleForm, valid_from: e.target.value})} />
              <Input variant="dense" type="date" label="Valid To" value={ruleForm.valid_to} onChange={e => setRuleForm({...ruleForm, valid_to: e.target.value})} />
              <Input variant="dense" type="number" label="Fixed Price (₹)" value={String(ruleForm.fixed_price)} onChange={e => setRuleForm({...ruleForm, fixed_price: Number(e.target.value)})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={() => handleCreateRule(showRuleModal)} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff' }}>Save Price</button>
            </div>
          </div>
        </div>
      )}

      {showFormulaModal && (
        <div style={overlayStyle} onClick={() => setShowFormulaModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>
                {editingFormulaId ? 'Edit Price Formula' : 'Create Price Formula'}
            </h2>
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '12px', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
              E.g., To make P.T.R (Price to Retailer) always 20% less than MRP:<br/>
              Target: <b>ptr</b>, Source: <b>M.R.P.</b>, Operation: <b>Multiply</b>, Value: <b>0.80</b><br/><br/>
              E.g., To make STR (Special Trans Rate) always 5% more than PTR:<br/>
              Target: <b>str</b>, Source: <b>Custom (ptr)</b>, Operation: <b>Add Markup %</b>, Value: <b>5</b>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input variant="dense" label="Target Rate Name (e.g. str, ptr, rate_a)" placeholder="str" value={formulaForm.target_rate_type} onChange={e => setFormulaForm({...formulaForm, target_rate_type: e.target.value.toLowerCase()})} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '120px', fontSize: '12px', color: 'var(--color-text-muted)' }}>Source Base</label>
                  <select style={selectStyle} value={isCustomSource ? 'custom' : formulaForm.source_rate_type} onChange={e => {
                      if(e.target.value === 'custom') {
                          setIsCustomSource(true)
                          setFormulaForm({...formulaForm, source_rate_type: ''})
                      } else {
                          setIsCustomSource(false)
                          setFormulaForm({...formulaForm, source_rate_type: e.target.value})
                      }
                  }}>
                    <option value="mrp">M.R.P.</option>
                    <option value="purchase">Purchase Cost</option>
                    <option value="standard">Standard Selling Rate</option>
                    <option value="custom">Other Rate (Custom)</option>
                  </select>
                </div>
                {isCustomSource && (
                    <Input variant="dense" label="Type Custom Source Rate Name" placeholder="e.g. ptr, rate_a" value={formulaForm.source_rate_type} onChange={e => setFormulaForm({...formulaForm, source_rate_type: e.target.value.toLowerCase()})} />
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ width: '120px', fontSize: '12px', color: 'var(--color-text-muted)' }}>Calculation</label>
                <select style={selectStyle} value={formulaForm.operator} onChange={e => setFormulaForm({...formulaForm, operator: e.target.value})}>
                  <option value="multiply">Multiply by Factor (e.g. 0.8)</option>
                  <option value="add_percent">Add Markup % (e.g. 15)</option>
                </select>
              </div>
              <Input variant="dense" label="Calculation Value" type="number" step="0.01" value={String(formulaForm.operand)} onChange={e => setFormulaForm({...formulaForm, operand: Number(e.target.value)})} />
              <Input variant="dense" label="Floor Price / Minimum (₹)" type="number" step="0.01" value={String(formulaForm.floor_price)} onChange={e => setFormulaForm({...formulaForm, floor_price: Number(e.target.value)})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={handleSaveFormula} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff' }}>Save Formula</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)' }
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const modalStyle: React.CSSProperties = { background: 'var(--color-bg-surface)', borderRadius: '12px', padding: '24px 28px', width: '450px', border: '1px solid var(--color-border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', color: 'var(--color-text-primary)' }
const selectStyle: React.CSSProperties = { flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', width: '100%' }
