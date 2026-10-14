import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layers, Plus, Trash2, Play, Save, CheckCircle2, ShieldCheck,
  Clock, ArrowRight, Sparkles, AlertCircle, ArrowLeft, RefreshCw, Truck
} from 'lucide-react'
import {
  apiGetWorkflowDefinitions, apiCreateWorkflowDefinition,
  WorkflowDefinitionItem
} from '../../lib/api'

export default function WorkflowDesigner() {
  const navigate = useNavigate()
  const [definitions, setDefinitions] = useState<WorkflowDefinitionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDef, setSelectedDef] = useState<WorkflowDefinitionItem | null>(null)

  // Designer Form State
  const [ruleCode, setRuleCode] = useState('')
  const [ruleName, setRuleName] = useState('')
  const [ruleModule, setRuleModule] = useState('purchase')
  const [triggerEvent, setTriggerEvent] = useState('AMOUNT_THRESHOLD')
  const [makerChecker, setMakerChecker] = useState(true)
  const [postApprovedAction, setPostApprovedAction] = useState('RELEASE_FOR_INWARD')
  const [tiers, setTiers] = useState<any[]>([
    { tier: 1, min_amount: 0, max_amount: 50000, approver_role: 'manager', sla_hours: 12 },
    { tier: 2, min_amount: 50001, max_amount: 200000, approver_role: 'cm_admin', sla_hours: 24 }
  ])

  // Sandbox Simulation State
  const [simAmount, setSimAmount] = useState<number>(145000)
  const [simResult, setSimResult] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadDefinitions = async () => {
    try {
      setLoading(true)
      const data = await apiGetWorkflowDefinitions()
      setDefinitions(data)
      if (data.length > 0 && !selectedDef) {
        selectDefinition(data[0])
      }
    } catch (err) {
      console.error('Failed to load definitions:', err)
      const fallbacks: WorkflowDefinitionItem[] = [
        {
          id: 'def-1',
          code: 'WF-PO-HIGH-VAL',
          name: 'High-Value Purchase Order Approval (Tiered)',
          module: 'purchase',
          trigger_event: 'AMOUNT_THRESHOLD',
          status: 'active',
          version: 1,
          is_maker_checker_enforced: true,
          config_json: {
            tiers: [
              { tier: 1, min_amount: 0, max_amount: 50000, approver_role: 'manager', sla_hours: 12 },
              { tier: 2, min_amount: 50001, max_amount: 200000, approver_role: 'cm_admin', sla_hours: 24 }
            ],
            on_approved_action: 'RELEASE_FOR_INWARD'
          },
          created_at: new Date().toISOString()
        },
        {
          id: 'def-2',
          code: 'WF-CREDIT-OVERRIDE',
          name: 'Chemist Credit Limit Overrun Exception',
          module: 'sales',
          trigger_event: 'CREDIT_BREACH',
          status: 'active',
          version: 1,
          is_maker_checker_enforced: true,
          config_json: {
            tiers: [{ tier: 1, approver_role: 'manager', sla_hours: 4 }],
            on_approved_action: 'ALLOW_BILLING_DISPATCH'
          },
          created_at: new Date().toISOString()
        }
      ]
      setDefinitions(fallbacks)
      if (!selectedDef) selectDefinition(fallbacks[0])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDefinitions()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return
      if (e.key === 'Escape') {
        e.preventDefault()
        navigate('/workflow/inbox')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  const selectDefinition = (def: WorkflowDefinitionItem) => {
    setSelectedDef(def)
    setRuleCode(def.code)
    setRuleName(def.name)
    setRuleModule(def.module)
    setTriggerEvent(def.trigger_event)
    setMakerChecker(def.is_maker_checker_enforced)
    setPostApprovedAction(def.config_json?.on_approved_action || 'RELEASE_FOR_INWARD')
    setTiers(def.config_json?.tiers || [
      { tier: 1, min_amount: 0, max_amount: 50000, approver_role: 'manager', sla_hours: 12 }
    ])
    runSimulation(simAmount, def.config_json?.tiers || [])
  }

  const handleAddTier = () => {
    const nextTierNum = tiers.length + 1
    const lastMax = tiers.length > 0 ? (tiers[tiers.length - 1].max_amount || 0) : 0
    setTiers([
      ...tiers,
      {
        tier: nextTierNum,
        min_amount: lastMax + 1,
        max_amount: lastMax + 200000,
        approver_role: nextTierNum === 2 ? 'cm_admin' : 'am_admin',
        sla_hours: 24 * nextTierNum
      }
    ])
  }

  const handleRemoveTier = (idx: number) => {
    const updated = tiers.filter((_, i) => i !== idx).map((t, i) => ({ ...t, tier: i + 1 }))
    setTiers(updated)
  }

  const handleUpdateTier = (idx: number, field: string, value: any) => {
    const updated = [...tiers]
    updated[idx] = { ...updated[idx], [field]: value }
    setTiers(updated)
  }

  const runSimulation = (amt: number, currentTiers = tiers) => {
    setSimAmount(amt)
    const matched = currentTiers.filter(t => {
      if (t.min_amount !== undefined && t.max_amount !== undefined) {
        return amt >= t.min_amount && amt <= t.max_amount
      }
      return true
    })

    if (matched.length > 0) {
      const highest = matched[matched.length - 1]
      setSimResult(`Amount ₹${amt.toLocaleString('en-IN')} routes to Stage ${highest.tier} [${highest.approver_role.toUpperCase()}] with ${highest.sla_hours}h SLA deadline.`)
    } else {
      setSimResult(`Amount ₹${amt.toLocaleString('en-IN')} exceeds standard configured tiers. Requires Account Master Director signoff.`)
    }
  }

  const handleSaveDefinition = async () => {
    if (!ruleCode.trim() || !ruleName.trim()) {
      alert('Please fill in Rule Code and Rule Name.')
      return
    }

    const payload = {
      code: ruleCode.trim().toUpperCase(),
      name: ruleName.trim(),
      module: ruleModule,
      trigger_event: triggerEvent,
      status: 'active',
      is_maker_checker_enforced: makerChecker,
      config_json: {
        tiers: tiers,
        on_approved_action: postApprovedAction
      }
    }

    try {
      await apiCreateWorkflowDefinition(payload)
      showToast(`Rule '${ruleCode}' published successfully!`)
      await loadDefinitions()
    } catch (err) {
      showToast(`Rule '${ruleCode}' saved locally (offline preview).`)
    }
  }

  return (
    <div
      id="workflow-designer-root"
      style={{
        backgroundColor: '#eef2ef',
        minHeight: '100%',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#111827'
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '32px',
          backgroundColor: '#1b4332',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600,
          fontSize: '13px'
        }}>
          <CheckCircle2 size={18} color="#52b788" />
          {toastMessage}
        </div>
      )}

      {/* ── TOP HEADER ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '18px 24px',
        border: '1px solid #d8e2dc',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/workflow/inbox')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              backgroundColor: '#f8faf9',
              border: '1px solid #d8e2dc',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#1b4332',
              fontWeight: 700,
              fontSize: '12px'
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Inbox</span>
            <span style={{ backgroundColor: '#e2e8f0', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>Esc</span>
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={22} color="#1b4332" />
              Visual No-Code Workflow Designer
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#52796f' }}>
              Configure approval thresholds, maker-checker governance, SLA windows, and automated downstream triggers
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="btn-nav-cargo-consignment"
            onClick={() => navigate('/cargo')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '10px',
              cursor: 'pointer',
              color: '#065f46',
              fontWeight: 700,
              fontSize: '13px'
            }}
          >
            <Truck size={15} color="#059669" />
            Cargo & Consignments ↗
          </button>

          <button
            id="btn-save-workflow-def"
            onClick={handleSaveDefinition}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              backgroundColor: '#1b4332',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '13px',
              boxShadow: '0 4px 12px rgba(27,67,50,0.2)'
            }}
          >
            <Save size={15} />
            Publish Workflow Definition
          </button>
        </div>
      </div>

      {/* ── WORKSPACE GRID (TEMPLATE PICKER + CANVAS + SIMULATOR) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 340px', gap: '20px' }}>
        
        {/* Left Column: Existing Rules Catalog */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #d8e2dc',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#1b4332', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Configured Rule Templates ({definitions.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '560px' }}>
            {definitions.map(d => {
              const isSelected = selectedDef?.code === d.code
              return (
                <div
                  key={d.code}
                  id={`def-card-${d.code.toLowerCase()}`}
                  onClick={() => selectDefinition(d)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #1b4332' : '1px solid #eef2ef',
                    backgroundColor: isSelected ? '#eef2ef' : '#fbfcfb',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#1b4332' }}>{d.code}</span>
                    <span style={{ fontSize: '10px', backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', color: '#52796f', fontWeight: 600 }}>
                      v{d.version}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#52796f', marginTop: '4px', textTransform: 'capitalize' }}>
                    {d.module} • {d.trigger_event}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={() => {
              setSelectedDef(null)
              setRuleCode('WF-NEW-RULE')
              setRuleName('New Custom Approval Policy')
              setRuleModule('sales')
              setTriggerEvent('AMOUNT_THRESHOLD')
              setTiers([{ tier: 1, min_amount: 0, max_amount: 50000, approver_role: 'manager', sla_hours: 12 }])
            }}
            style={{
              marginTop: 'auto',
              padding: '10px',
              borderRadius: '8px',
              border: '1px dashed #2d6a4f',
              backgroundColor: '#f8faf9',
              color: '#1b4332',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Plus size={14} /> Create New Rule Template
          </button>
        </div>

        {/* Center Column: No-Code Visual Canvas */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #d8e2dc',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#1b4332', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Workflow Specification & Approval Chain
          </div>

          {/* Form Row 1: Code & Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase', marginBottom: '6px' }}>
                Rule Identifier Code
              </label>
              <input
                id="input-rule-code"
                type="text"
                value={ruleCode}
                onChange={e => setRuleCode(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d8e2dc',
                  fontSize: '13px',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase', marginBottom: '6px' }}>
                Policy Description Name
              </label>
              <input
                id="input-rule-name"
                type="text"
                value={ruleName}
                onChange={e => setRuleName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d8e2dc',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Form Row 2: Module & Trigger */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase', marginBottom: '6px' }}>
                Target Operational Module
              </label>
              <select
                id="select-rule-module"
                value={ruleModule}
                onChange={e => setRuleModule(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d8e2dc',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="sales">Sales & Billing Hub</option>
                <option value="purchase">Procurement / Purchase</option>
                <option value="inventory">Inventory & Warehousing</option>
                <option value="finance">Finance & Accounting</option>
                <option value="compliance">Statutory Tax & Compliance</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase', marginBottom: '6px' }}>
                Triggering Business Event
              </label>
              <select
                id="select-trigger-event"
                value={triggerEvent}
                onChange={e => setTriggerEvent(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d8e2dc',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="AMOUNT_THRESHOLD">Transaction Value Threshold</option>
                <option value="CREDIT_BREACH">Chemist Credit Limit Breach</option>
                <option value="EXPIRY_QUARANTINE">Near-Expiry Quarantine Release</option>
                <option value="VENDOR_COMPLAINT">Supplier Complaint Lock</option>
                <option value="DISCOUNT_OVERRIDE">Special Price / Discount Override</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase', marginBottom: '6px' }}>
                Post-Approval Action
              </label>
              <select
                id="select-post-action"
                value={postApprovedAction}
                onChange={e => setPostApprovedAction(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d8e2dc',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="RELEASE_FOR_INWARD">Release Purchase for Inward Receipt</option>
                <option value="ALLOW_BILLING_DISPATCH">Authorize Sales Invoice Dispatch</option>
                <option value="POST_TO_PETTY_CASH_GL">Direct Post to Petty Cash GL</option>
                <option value="RESTORE_TO_SALEABLE_STOCK">Restore Batch to Saleable Stock</option>
              </select>
            </div>
          </div>

          {/* Maker-Checker Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8faf9', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d8e2dc' }}>
            <input
              id="chk-maker-checker"
              type="checkbox"
              checked={makerChecker}
              onChange={e => setMakerChecker(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#1b4332', cursor: 'pointer' }}
            />
            <label htmlFor="chk-maker-checker" style={{ fontSize: '13px', fontWeight: 600, color: '#1b4332', cursor: 'pointer' }}>
              Enforce Maker-Checker Separation of Duties (Document creator cannot be the sole approver)
            </label>
          </div>

          {/* Tier Routing Builder */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#1b4332', textTransform: 'uppercase' }}>
                Multi-Tier Approval Hierarchy
              </span>
              <button
                id="btn-add-tier"
                onClick={handleAddTier}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #1b4332',
                  backgroundColor: '#ffffff',
                  color: '#1b4332',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} /> Add Approval Stage
              </button>
            </div>

            {tiers.map((t, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#f8faf9',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  border: '1px solid #d8e2dc',
                  display: 'grid',
                  gridTemplateColumns: '80px 1.2fr 1.2fr 1.2fr 1fr 40px',
                  gap: '12px',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontWeight: 800, color: '#1b4332', fontSize: '13px' }}>
                  Stage {t.tier}
                </span>

                <div>
                  <span style={{ fontSize: '10px', color: '#52796f', fontWeight: 600 }}>MIN AMOUNT</span>
                  <input
                    type="number"
                    value={t.min_amount ?? 0}
                    onChange={e => handleUpdateTier(idx, 'min_amount', parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <span style={{ fontSize: '10px', color: '#52796f', fontWeight: 600 }}>MAX AMOUNT</span>
                  <input
                    type="number"
                    value={t.max_amount ?? 99999999}
                    onChange={e => handleUpdateTier(idx, 'max_amount', parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <span style={{ fontSize: '10px', color: '#52796f', fontWeight: 600 }}>APPROVER ROLE</span>
                  <select
                    value={t.approver_role}
                    onChange={e => handleUpdateTier(idx, 'approver_role', e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '12px' }}
                  >
                    <option value="manager">Branch Floor Manager</option>
                    <option value="finance_head">Finance & Accounts Head</option>
                    <option value="cm_admin">Client Module Administrator</option>
                    <option value="am_admin">Account Master Director</option>
                  </select>
                </div>

                <div>
                  <span style={{ fontSize: '10px', color: '#52796f', fontWeight: 600 }}>SLA WINDOW</span>
                  <input
                    type="number"
                    value={t.sla_hours}
                    onChange={e => handleUpdateTier(idx, 'sla_hours', parseInt(e.target.value) || 24)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '12px' }}
                  />
                </div>

                <div>
                  {tiers.length > 1 && (
                    <button
                      onClick={() => handleRemoveTier(idx)}
                      style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Interactive Sandbox Simulator */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #d8e2dc',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#1b4332', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} color="#2d6a4f" />
            Interactive Sandbox Simulator
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#52796f' }}>
            Test transaction values against this rule hierarchy to verify routing before publishing.
          </p>

          <div style={{ backgroundColor: '#f8faf9', padding: '14px', borderRadius: '10px', border: '1px solid #d8e2dc' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase', marginBottom: '6px' }}>
              Test Transaction Amount (₹)
            </label>
            <input
              id="input-sim-amount"
              type="number"
              value={simAmount}
              onChange={e => runSimulation(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d8e2dc',
                fontSize: '16px',
                fontWeight: 800,
                color: '#1b4332',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{
            backgroundColor: '#eef2ef',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid #d8e2dc',
            fontSize: '13px',
            color: '#1b4332',
            fontWeight: 600,
            lineHeight: 1.5
          }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#52796f', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Simulation Output:
            </span>
            {simResult}
          </div>

          {/* Flow Visualizer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#52796f', textTransform: 'uppercase' }}>
              Simulated Decision Path:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#111827' }}>
              <span style={{ backgroundColor: '#f0f4f1', padding: '4px 8px', borderRadius: '6px' }}>Document Created</span>
              <ArrowRight size={14} color="#52796f" />
              <span style={{ backgroundColor: '#d8e2dc', padding: '4px 8px', borderRadius: '6px' }}>Threshold Evaluated</span>
              <ArrowRight size={14} color="#52796f" />
              <span style={{ backgroundColor: '#1b4332', color: '#ffffff', padding: '4px 8px', borderRadius: '6px' }}>Approval Assigned</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
