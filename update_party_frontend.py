with open('src/pages/master/PartyMaster.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Change API endpoint
content = content.replace("apiClient.get('/master/ledger-groups')", "apiClient.get('/finance/groups')")

# Update state variables
old_state = """  // Financial
  const [createLedger, setCreateLedger] = useState(true)
  const [ledgerGroupId, setLedgerGroupId] = useState('')
  const [openingBalance, setOpeningBalance] = useState(0)
  const [opType, setOpType] = useState('Dr')"""

new_state = """  // Financial
  const [createCustomerLedger, setCreateCustomerLedger] = useState(true)
  const [customerLedgerGroupId, setCustomerLedgerGroupId] = useState('')
  const [customerOpeningBalance, setCustomerOpeningBalance] = useState(0)
  const [customerOpType, setCustomerOpType] = useState('Dr')
  
  const [createSupplierLedger, setCreateSupplierLedger] = useState(true)
  const [supplierLedgerGroupId, setSupplierLedgerGroupId] = useState('')
  const [supplierOpeningBalance, setSupplierOpeningBalance] = useState(0)
  const [supplierOpType, setSupplierOpType] = useState('Cr')"""

content = content.replace(old_state, new_state)

# Update payload
old_payload = """      status: 'active',
      create_ledger: createLedger,
      ledger_group_id: createLedger ? ledgerGroupId : null,
      opening_balance: openingBalance,
      op_type: opType,"""

new_payload = """      status: 'active',
      create_customer_ledger: createCustomerLedger,
      customer_ledger_group_id: createCustomerLedger ? customerLedgerGroupId : null,
      customer_opening_balance: customerOpeningBalance,
      customer_op_type: customerOpType,
      create_supplier_ledger: createSupplierLedger,
      supplier_ledger_group_id: createSupplierLedger ? supplierLedgerGroupId : null,
      supplier_opening_balance: supplierOpeningBalance,
      supplier_op_type: supplierOpType,"""

content = content.replace(old_payload, new_payload)

# Replace the single accounting block with two
old_accounting = """          {/* Section 5: Financial Integration */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px', display: 'block' }}>ACCOUNTING (AUTO-LINK)</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px' }}>
              <input type="checkbox" checked={createLedger} onChange={e => setCreateLedger(e.target.checked)} />
              Automatically create an accounting Ledger for this party
            </label>

            {createLedger && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Ledger Group *</label>
                  <select 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                    value={ledgerGroupId} 
                    onChange={e => setLedgerGroupId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Group --</option>
                    {ledgerGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Input variant="compact" type="number" label="Opening Balance" value={openingBalance} onChange={e => setOpeningBalance(Number(e.target.value))} />
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Dr/Cr</label>
                    <select 
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                      value={opType} 
                      onChange={e => setOpType(e.target.value)}
                    >
                      <option value="Dr">Dr</option>
                      <option value="Cr">Cr</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>"""

new_accounting = """          {/* Section 5: Financial Integration */}
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
          </div>"""

content = content.replace(old_accounting, new_accounting)

with open('src/pages/master/PartyMaster.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
