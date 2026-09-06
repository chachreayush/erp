import React, { useState, useEffect, useRef } from 'react' 
import { useReturnNavigation } from '../../hooks/useReturnNavigation'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Search, Building2, Tag, MapPin, DollarSign, Layers, CheckCircle } from 'lucide-react'

import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, MODAL_FIELD, MODAL_LABEL, MODAL_GAP } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { 
  apiGetLedgers, apiCreateLedger, apiUpdateLedger, apiDeleteLedger,
  apiGetSalts, apiCreateSalt, apiUpdateSalt, apiDeleteSalt,
  apiGetManufacturers, apiCreateManufacturer, apiUpdateManufacturer, apiDeleteManufacturer,
  apiGetHSNCodes, apiCreateHSNCode, apiUpdateHSNCode, apiDeleteHSNCode,
  apiGetStateCodes, apiCreateStateCode, apiUpdateStateCode, apiDeleteStateCode
} from '../../lib/api'
import { CompanyForm } from '../../components/master/CompanyForm'
import { SaltForm } from '../../components/master/SaltForm'
import { HSNForm } from '../../components/master/HSNForm'
import { LedgerForm } from '../../components/master/LedgerForm'
import { validateGST, validatePhone, validateEmail, validatePincode } from '../../lib/validation'


// Types for different master data items
interface LedgerItem { id: string; name: string; group: string; mobile: string; state: string; balance: number; type: 'Dr' | 'Cr' }
interface SaltItem { id: string; name: string; indications: string; dosage: string; sideEffects: string; precautions: string; labels: string }
interface CompanyItem { id: string; name: string; code: string; discount: number; status: string; prohibited: boolean; room_no?: string; floor?: string; rack_no?: string; rack_row_no?: string; dump_days?: number; is_supplier: string; supplier_ledger_id?: string; email?: string; cc?: string; bcc?: string; website?: string; contact_number?: string; field_staff_name?: string; field_staff_contact?: string; address?: string; }
interface HSNItem { id: string; code: string; description: string; igst: number; cgst: number; sgst: number }
interface StateItem { id: string; name: string; code: string; capital: string }
interface BalanceItem { id: string; ledgerName: string; openingBalance: number; opType: 'Dr' | 'Cr'; closingBalance: number; clType: 'Dr' | 'Cr' }

export default function MasterPage() {

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const activeTab = searchParams.get('tab') || 'ledger'
  const actionParam = searchParams.get('action')

  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  useReturnNavigation(isModalOpen)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Initial Data State
  const [ledgers, setLedgers] = useState<LedgerItem[]>([])

  const [salts, setSalts] = useState<SaltItem[]>([])

  const [companies, setCompanies] = useState<CompanyItem[]>([])

  const [hsns, setHsns] = useState<HSNItem[]>([])

  const [states, setStates] = useState<StateItem[]>([])

  const [balances, setBalances] = useState<BalanceItem[]>([])

  // Form states for modal inputs
  const [formData, setFormData] = useState<any>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
  // Track selected row index and focus zone for keyboard shortcuts
  const [focusedZone, setFocusedZone] = useState<'tabs' | 'list' | 'none'>('tabs')
  const [focusedTabIndex, setFocusedTabIndex] = useState(0)
  const [selectedItemIndex, setSelectedItemIndex] = useState(0)
  
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create')

  const loadData = async () => {
    try {
      const [l, s, m, h, st] = await Promise.all([
        apiGetLedgers(),
        apiGetSalts(),
        apiGetManufacturers(),
        apiGetHSNCodes(),
        apiGetStateCodes()
      ])
      
      setLedgers(l.map(x => ({ ...x, id: x.id as string, mobile: x.mobile || '', state: x.state || '', group: x.group_name, balance: x.opening_balance, type: x.op_type as 'Dr'|'Cr' })))
      setSalts(s.map(x => ({ id: x.id as string, name: x.formula, indications: x.indications || '', dosage: x.dosage || '', sideEffects: x.side_effects || '', precautions: x.precautions || '', labels: x.labels || '' })))
      setCompanies(m.map(x => ({ 
        id: x.id as string, 
        name: x.name, 
        code: x.short_code || '', 
        discount: x.default_discount, 
        status: x.status,
        prohibited: x.prohibited,
        room_no: x.room_no,
        floor: x.floor,
        rack_no: x.rack_no,
        rack_row_no: x.rack_row_no,
        dump_days: x.dump_days,
        is_supplier: x.is_supplier ? 'yes' : 'no',
        supplier_ledger_id: x.supplier_ledger_id,
        email: x.email,
        cc: x.cc,
        bcc: x.bcc,
        website: x.website,
        contact_number: x.contact_number,
        field_staff_name: x.field_staff_name,
        field_staff_contact: x.field_staff_contact,
        address: x.address
      })))
      setHsns(h.map(x => ({ id: x.id as string, code: x.code, description: x.description || '', igst: x.igst, cgst: x.cgst, sgst: x.sgst })))
      setStates(st.map(x => ({ id: x.id as string, name: x.name, code: x.gst_code || '', capital: x.capital || '' })))
      
      setBalances(l.map(x => ({ id: x.id as string, ledgerName: x.name, openingBalance: x.opening_balance, opType: x.op_type as 'Dr'|'Cr', closingBalance: x.closing_balance, clType: x.cl_type as 'Dr'|'Cr' })))
    } catch(e) {
      console.error("Failed to load master data", e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const editButtonRef = useRef<HTMLButtonElement>(null)

  // Sync focusedTabIndex with activeTab initially or when URL changes
  useEffect(() => {
    const tabsList = ['ledger', 'salt', 'company', 'hsn', 'state', 'balances']
    const idx = tabsList.indexOf(activeTab)
    if (idx !== -1) {
      setFocusedTabIndex(idx)
      setFocusedZone('list')
    }
  }, [activeTab])

  // Automatically trigger creation modal if action is 'new'
  useEffect(() => {
    if (actionParam === 'new' && activeTab === 'ledger') {
      setEditingId(null)
      setFormData({ name: '', group: 'Sundry Debtors', mobile: '', state: '07-Delhi', balance: 0, type: 'Dr' })
      setIsModalOpen(true)
    }
  }, [actionParam, activeTab])

  // Restore focus to header tabs when modal is closed
  useEffect(() => {
    if (!isModalOpen && !showUnsavedPrompt) {
      setFocusedZone('tabs')
      setTimeout(() => {
        const tabEl = document.getElementById(`tab-${focusedTabIndex}`);
        if (tabEl) tabEl.focus();
      }, 50)
    }
  }, [isModalOpen, showUnsavedPrompt, focusedTabIndex])

  // Autofocus Cancel button on unsaved prompt
  useEffect(() => {
    if (showUnsavedPrompt) {
      setTimeout(() => document.getElementById('prompt-cancel-btn')?.focus(), 50)
    }
  }, [showUnsavedPrompt])



  const handleOpenAddModal = () => {
    setEditingId(null)
    setModalMode('create')
    if (activeTab === 'ledger') setFormData({ name: '', group: 'Sundry Debtors', mobile: '', state: '07-Delhi', balance: 0, type: 'Dr' })
    else if (activeTab === 'salt') setFormData({ name: '', indications: '', dosage: '', sideEffects: '', precautions: '', labels: 'Normal' })
    else if (activeTab === 'company') setFormData({ name: '', code: '', discount: 0, supplier: 'Direct' })
    else if (activeTab === 'hsn') setFormData({ code: '', description: '', igst: 12, cgst: 6, sgst: 6 })
    else if (activeTab === 'state') setFormData({ name: '', code: '', capital: '' })
    else if (activeTab === 'balances') setFormData({ ledgerName: '', openingBalance: 0, opType: 'Dr', closingBalance: 0, clType: 'Dr' })
    setIsModalOpen(true)
    setTimeout(() => firstInputRef.current?.focus(), 50)
  }

  const handleEditItem = (item: any) => {
    setEditingId(item.id)
    setFormData({ ...item })
    setModalMode('view')
    setIsModalOpen(true)
    setTimeout(() => editButtonRef.current?.focus(), 50)
  }

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this master record?")) return
    
    try {
      if (activeTab === 'ledger') await apiDeleteLedger(id)
      else if (activeTab === 'salt') await apiDeleteSalt(id)
      else if (activeTab === 'company') await apiDeleteManufacturer(id)
      else if (activeTab === 'hsn') await apiDeleteHSNCode(id)
      else if (activeTab === 'state') await apiDeleteStateCode(id)
      else if (activeTab === 'balances') await apiDeleteLedger(id)
      
      await loadData()
    } catch(e) {
      console.error(e)
      alert("Failed to delete record")
    }
  }

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    const isEdit = !!editingId
    const newErrors: Record<string, string> = {}
    
    try {
      if (activeTab === 'ledger') {
        if (!formData.name) newErrors.name = "Required"
        if (!formData.group) newErrors.group = "Required"
        if (!formData.station) newErrors.station = "Required"
        
        if (formData.ledger_type !== 'Unregistered') {
          if (!formData.gstin) newErrors.gstin = "Required for registered ledgers"
          else {
            const err = validateGST(formData.gstin)
            if (err) newErrors.gstin = err
          }
        }

        const phoneErr = validatePhone(formData.mobile)
        if (phoneErr) newErrors.mobile = phoneErr

        const emailErr = validateEmail(formData.email)
        if (emailErr) newErrors.email = emailErr

        const pinErr = validatePincode(formData.pincode)
        if (pinErr) newErrors.pincode = pinErr

        if (Object.keys(newErrors).length > 0) {
          setFormErrors(newErrors)
          return
        }

        const payload: any = { 
          ...formData,
          opening_balance: Number(formData.opening_balance ?? formData.balance) || 0,
          op_type: formData.op_type ?? formData.type ?? 'Dr',
          closing_balance: Number(formData.closing_balance ?? formData.balance) || 0,
          cl_type: formData.cl_type ?? formData.type ?? 'Dr',
          group_name: formData.group ?? formData.group_name
        }
        if (isEdit) await apiUpdateLedger(editingId as string, payload)
        else await apiCreateLedger(payload)
      } else if (activeTab === 'salt') {
        const payload: any = { formula: formData.name, indications: formData.indications, dosage: formData.dosage, side_effects: formData.sideEffects, precautions: formData.precautions, labels: formData.labels }
        if (isEdit) await apiUpdateSalt(editingId as string, payload)
        else await apiCreateSalt(payload)
      } else if (activeTab === 'company') {
        const payload: any = { 
          name: formData.name, 
          short_code: formData.code, 
          status: formData.status || 'continue',
          prohibited: !!formData.prohibited,
          default_discount: Number(formData.discount)||0, 
          room_no: formData.room_no,
          floor: formData.floor,
          rack_no: formData.rack_no,
          rack_row_no: formData.rack_row_no,
          dump_days: Number(formData.dump_days)||0,
          is_supplier: formData.is_supplier === 'yes' ? true : false,
          supplier_ledger_id: formData.is_supplier === 'yes' ? (formData.supplier_ledger_id || null) : null,
          email: formData.email,
          cc: formData.cc,
          bcc: formData.bcc,
          website: formData.website,
          contact_number: formData.contact_number,
          field_staff_name: formData.field_staff_name,
          field_staff_contact: formData.field_staff_contact,
          address: formData.address
        }
        if (isEdit) await apiUpdateManufacturer(editingId as string, payload)
        else await apiCreateManufacturer(payload)
      } else if (activeTab === 'hsn') {
        const igst = Number(formData.igst) || 0
        const payload: any = { code: formData.code, description: formData.description, igst: igst, cgst: igst/2, sgst: igst/2 }
        if (isEdit) await apiUpdateHSNCode(editingId as string, payload)
        else await apiCreateHSNCode(payload)
      } else if (activeTab === 'state') {
        const payload: any = { name: formData.name, gst_code: formData.code, capital: formData.capital }
        if (isEdit) await apiUpdateStateCode(editingId as string, payload)
        else await apiCreateStateCode(payload)
      } else if (activeTab === 'balances') {
        if (isEdit) {
           const existing = ledgers.find(l => l.id === editingId)
           if (existing) {
              const payload: any = { name: existing.name, group_name: existing.group, mobile: existing.mobile, state: existing.state, opening_balance: Number(formData.openingBalance)||0, op_type: formData.opType||'Dr', closing_balance: Number(formData.closingBalance)||0, cl_type: formData.clType||'Dr' }
              await apiUpdateLedger(editingId as string, payload)
           }
        }
      }
      
      await loadData()
      
      if (modalMode === 'create') {
        handleOpenAddModal()
      } else {
        setModalMode('view')
      }
    } catch (error) {
      console.error(error)
      alert('Failed to save record.')
    }
  }

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    const form = e.currentTarget;
    const focusableElements = Array.from(form.querySelectorAll('input:not([disabled]), select:not([disabled]), button:not([disabled])')) as HTMLElement[];
    const index = focusableElements.indexOf(target);

    if (index === -1) return;

    if (e.key === 'Enter') {
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
        e.preventDefault();
        if (index < focusableElements.length - 1) {
          let nextElement = focusableElements[index + 1];
          if (nextElement.tagName === 'BUTTON') {
             const exitBtn = document.getElementById('btn-exit-without-saving');
             if (exitBtn) nextElement = exitBtn;
          }
          nextElement.focus();
        }
      }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (target.tagName === 'BUTTON' || (e.key === 'ArrowDown' && target.tagName !== 'SELECT')) {
        e.preventDefault();
        const nextIndex = Math.min(index + 1, focusableElements.length - 1);
        focusableElements[nextIndex].focus();
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (target.tagName === 'BUTTON' || (e.key === 'ArrowUp' && target.tagName !== 'SELECT')) {
        e.preventDefault();
        const prevIndex = Math.max(index - 1, 0);
        focusableElements[prevIndex].focus();
      }
    }
  }

  const tabs = [
    { id: 'ledger', label: 'Ledger Master', icon: <DollarSign size={15} /> },
    { id: 'salt', label: 'Salt Master', icon: <Layers size={15} /> },
    { id: 'company', label: 'Company Master', icon: <Building2 size={15} /> },
    { id: 'hsn', label: 'HSN & Tax Master', icon: <Tag size={15} /> },
    { id: 'state', label: 'State Master', icon: <MapPin size={15} /> },
    { id: 'balances', label: 'O/C Balances', icon: <CheckCircle size={15} /> }
  ]

  // Reset selection when search changes
  useEffect(() => {
    setSelectedItemIndex(0)
  }, [searchQuery])

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Type-to-search in background
      if (focusedZone === 'list' || focusedZone === 'tabs') {
        const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (isPrintable) {
          if (e.key === ' ') e.preventDefault(); // prevent scroll
          setSearchQuery(prev => prev + e.key);
        } else if (e.key === 'Backspace') {
          setSearchQuery(prev => prev.slice(0, -1));
        } else if (e.key === 'Escape') {
          if (searchQuery) {
            setSearchQuery('');
            setFocusedZone('tabs');
          } else if (focusedZone === 'list') {
            setFocusedZone('tabs');
          }
        }
      }

      let visibleItems: any[] = []
      if (activeTab === 'ledger') visibleItems = ledgers.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.group.toLowerCase().includes(searchQuery.toLowerCase()))
      else if (activeTab === 'salt') visibleItems = salts.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
      else if (activeTab === 'company') visibleItems = companies.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
      else if (activeTab === 'hsn') visibleItems = hsns.filter(i => i.code.includes(searchQuery) || i.description.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 50)
      else if (activeTab === 'state') visibleItems = states.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.code.includes(searchQuery))
      else if (activeTab === 'balances') visibleItems = balances.filter(i => i.ledgerName.toLowerCase().includes(searchQuery.toLowerCase()))

      if (e.key === 'F2') {
        e.preventDefault()
        handleOpenAddModal()
        return
      } else if (e.key === 'F3') {
        e.preventDefault()
        if (selectedItemIndex >= 0 && selectedItemIndex < visibleItems.length) {
          handleEditItem(visibleItems[selectedItemIndex])
        } else if (visibleItems.length > 0) {
          handleEditItem(visibleItems[0])
        }
        return
      }

      if (focusedZone === 'tabs') {
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          setFocusedTabIndex(prev => Math.min(prev + 1, tabs.length - 1))
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setFocusedTabIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
          e.preventDefault()
          navigate(`/master?tab=${tabs[focusedTabIndex].id}`)
          setFocusedZone('list')
          setSelectedItemIndex(0)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setFocusedZone('none')
          navigate('/bulletin')
          setTimeout(() => {
            const navMaster = document.getElementById('nav-master')
            if (navMaster) {
              navMaster.focus()
            }
          }, 50)
        }
      } else if (focusedZone === 'list') {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedItemIndex(prev => Math.min(prev + 1, visibleItems.length))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (selectedItemIndex > 0) {
            setSelectedItemIndex(prev => prev - 1)
          } else {
            setFocusedZone('tabs')
          }
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setSearchQuery('')
          setFocusedZone('tabs')
        } else if (e.key === 'Enter') {
          e.preventDefault()
          if (selectedItemIndex === 0) {
            handleOpenAddModal()
          } else if (selectedItemIndex > 0 && selectedItemIndex <= visibleItems.length) {
            handleEditItem(visibleItems[selectedItemIndex - 1])
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, isModalOpen, ledgers, salts, companies, hsns, states, balances, searchQuery, selectedItemIndex, focusedZone, focusedTabIndex, navigate, tabs])

  return (
    <div style={{ height: "100%", overflowY: "auto", maxWidth: '1300px', margin: '0 auto', padding: '8px 0', animation: 'fadeIn 0.25s ease-in-out' }}>
      
      {/* ── TOP HEADER ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            Master Data Setup & Configurations
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', margin: '2px 0 0 0' }}>
            Manage Ledgers, Pharmaceutical Salts, Companies, HSN Tax codes, States, and Opening/Closing Balances.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)', marginRight: '16px' }}>
            {searchQuery && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontWeight: 600, paddingRight: '12px', borderRight: '1px solid var(--color-border)' }}>
                <Search size={14} /> Searching: "{searchQuery}"
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><kbd style={{ padding: '2px 6px', background: 'var(--color-bg-hover)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>F2</kbd> Create</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><kbd style={{ padding: '2px 6px', background: 'var(--color-bg-hover)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>F3 / ↵</kbd> Modify</span>
          </div>
        </div>
      </div>

      {/* ── ACTION BANNER IF TRIGGERED FROM DROPDOWN ───────────────── */}
      {actionParam && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: actionParam === 'delete' ? 'var(--color-danger-light, rgba(239, 68, 68, 0.1))' : 'rgba(79, 70, 229, 0.1)',
          border: `1px solid ${actionParam === 'delete' ? '#ef4444' : 'var(--color-primary)'}`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: actionParam === 'delete' ? '#ef4444' : 'var(--color-primary)',
          fontWeight: 600,
          fontSize: '14px'
        }}>
          <span>
            {actionParam === 'new' && '✨ New Ledger Creation Mode Active: Create party accounts and general ledgers below.'}
            {actionParam === 'modify' && '✏️ Modify Ledger Mode Active: Click the Edit button on any ledger record below to modify its profile.'}
            {actionParam === 'delete' && '🗑️ Delete Ledger Mode Active: Click the Trash icon on any ledger record below to remove it from master data.'}
          </span>
        </div>
      )}

      {/* ── NAVIGATION TABS ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', borderBottom: '2px solid var(--color-border)', marginBottom: '12px', paddingBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id
          const isFocused = focusedZone === 'tabs' && focusedTabIndex === index
          return (
            <button
              id={`tab-${index}`}
              key={tab.id}
              type="button"
              onClick={() => {
                setSearchQuery('')
                navigate(`/master?tab=${tab.id}`)
                setFocusedTabIndex(index)
                setFocusedZone('list')
                setSelectedItemIndex(0)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'white' : 'var(--color-text-secondary)',
                backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-bg-surface)',
                border: 'none',
                outline: isFocused ? '2px solid var(--color-primary)' : 'none',
                outlineOffset: '2px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease-in-out',
                boxShadow: isActive ? '0 2px 4px rgba(79,70,229,0.2)' : 'none'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── TABLE DISPLAY AREA ─────────────────────────────────────── */}
      <Card padding="none">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-hover)', borderBottom: '1px solid var(--color-border)', textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                {activeTab === 'ledger' && <>
                  <th style={{ padding: '8px 16px' }}>Ledger / Party Name</th>
                  <th style={{ padding: '8px 16px' }}>Group</th>
                  <th style={{ padding: '8px 16px' }}>Mobile No</th>
                  <th style={{ padding: '8px 16px' }}>State / GSTIN</th>
                  <th style={{ padding: '8px 16px', textAlign: 'right' }}>Current Balance</th>
                </>}
                {activeTab === 'salt' && <>
                  <th style={{ padding: '8px 16px' }}>Pharmaceutical Salt Formula</th>
                  <th style={{ padding: '8px 16px' }}>Indications</th>
                  <th style={{ padding: '8px 16px' }}>Dosage</th>
                  <th style={{ padding: '8px 16px' }}>Labels</th>
                </>}
                {activeTab === 'company' && <>
                  <th style={{ padding: '8px 16px' }}>Company / Manufacturer Name</th>
                  <th style={{ padding: '8px 16px' }}>Short Code</th>
                  <th style={{ padding: '8px 16px' }}>Default Discount (%)</th>
                  <th style={{ padding: '8px 16px' }}>Supplier / Distributor</th>
                </>}
                {activeTab === 'hsn' && <>
                  <th style={{ padding: '8px 16px' }}>HSN Code</th>
                  <th style={{ padding: '8px 16px' }}>Commodity Description</th>
                  <th style={{ padding: '8px 16px', textAlign: 'center' }}>IGST (%)</th>
                  <th style={{ padding: '8px 16px', textAlign: 'center' }}>CGST (%)</th>
                  <th style={{ padding: '8px 16px', textAlign: 'center' }}>SGST (%)</th>
                </>}
                {activeTab === 'state' && <>
                  <th style={{ padding: '8px 16px' }}>State Name</th>
                  <th style={{ padding: '8px 16px', textAlign: 'center' }}>GST State Code</th>
                  <th style={{ padding: '8px 16px' }}>Capital City</th>
                </>}
                {activeTab === 'balances' && <>
                  <th style={{ padding: '8px 16px' }}>Account Ledger Name</th>
                  <th style={{ padding: '8px 16px', textAlign: 'right' }}>Opening Balance</th>
                  <th style={{ padding: '8px 16px', textAlign: 'center' }}>Dr / Cr</th>
                  <th style={{ padding: '8px 16px', textAlign: 'right' }}>Closing Balance</th>
                  <th style={{ padding: '8px 16px', textAlign: 'center' }}>Dr / Cr</th>
                </>}
                <th style={{ padding: '8px 16px', textAlign: 'center', width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* ADD NEW DYNAMIC ROW */}
              <tr 
                onClick={() => { setSelectedItemIndex(0); setFocusedZone('list'); handleOpenAddModal(); }}
                style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: (focusedZone === 'list' && selectedItemIndex === 0) ? 'rgba(79,70,229,0.1)' : 'var(--color-bg-surface)', cursor: 'pointer' }}>
                <td colSpan={100} style={{ padding: '8px 16px', fontWeight: 600, color: 'var(--color-primary)', textAlign: 'center' }}>
                  <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '8px', position: 'relative', top: '-1px' }} />
                  Add New {tabs.find(t => t.id === activeTab)?.label.replace(' Master', '').replace('O/C ', '')}
                </td>
              </tr>

              {/* LEDGERS TABLE */}
              {activeTab === 'ledger' && ledgers
                .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.group.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item, index) => {
                  const actualIndex = index + 1
                  const isSelected = focusedZone === 'list' && selectedItemIndex === actualIndex
                  return (
                  <tr key={item.id} 
                    onClick={() => { setSelectedItemIndex(actualIndex); setFocusedZone('list'); }}
                    style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isSelected ? 'rgba(79,70,229,0.1)' : 'transparent', transition: 'background 0.1s' }}>
                    <td style={{ padding: '8px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.name}</td>
                    <td style={{ padding: '8px 16px', color: 'var(--color-text-secondary)' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(79,70,229,0.08)', color: 'var(--color-primary)', fontSize: '11px', fontWeight: 600 }}>
                        {item.group}
                      </span>
                    </td>
                    <td style={{ padding: '8px 16px', color: 'var(--color-text-secondary)' }}>{item.mobile}</td>
                    <td style={{ padding: '8px 16px', color: 'var(--color-text-secondary)' }}>{item.state}</td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, color: item.type === 'Dr' ? '#059669' : '#dc2626' }}>
                      ₹{item.balance.toLocaleString()} {item.type}
                    </td>
                    <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleEditItem(item); }} style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-primary)' }} title="Modify"><Edit size={16} /></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )})}

              {/* SALTS TABLE */}
              {activeTab === 'salt' && salts
                .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item, index) => {
                  const actualIndex = index + 1
                  const isSelected = focusedZone === 'list' && selectedItemIndex === actualIndex
                  return (
                    <tr key={item.id} 
                      onClick={() => { setSelectedItemIndex(actualIndex); setFocusedZone('list'); }}
                      style={{ 
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: isSelected ? 'rgba(79,70,229,0.1)' : 'transparent',
                        transition: 'background 0.1s'
                      }}>
                      <td style={{ padding: '8px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.name}</td>
                      <td style={{ padding: '8px 16px', color: 'var(--color-text-secondary)' }}>{item.indications}</td>
                      <td style={{ padding: '8px 16px', color: 'var(--color-text-secondary)' }}>{item.dosage}</td>
                      <td style={{ padding: '8px 16px', color: 'var(--color-text-secondary)' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: item.labels.includes('H') ? '#fee2e2' : '#d1fae5', color: item.labels.includes('H') ? '#b91c1c' : '#047857', fontSize: '11px', fontWeight: 700 }}>
                          {item.labels}
                        </span>
                      </td>
                      <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleEditItem(item); }} style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-primary)' }}><Edit size={16} /></button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

              {/* COMPANIES TABLE */}
              {activeTab === 'company' && companies
                .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item, index) => {
                  const actualIndex = index + 1
                  const isSelected = focusedZone === 'list' && selectedItemIndex === actualIndex
                  return (
                  <tr key={item.id} onClick={() => { setSelectedItemIndex(actualIndex); setFocusedZone('list'); }} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isSelected ? 'rgba(79,70,229,0.1)' : 'transparent', transition: 'background 0.1s' }}>
                    <td style={{ padding: '8px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.name}</td>
                    <td style={{ padding: '8px 16px', fontWeight: 700, color: 'var(--color-primary)' }}>{item.code}</td>
                    <td style={{ padding: '8px 16px', color: '#059669', fontWeight: 600 }}>{item.discount}%</td>
                    <td style={{ padding: '8px 16px', color: 'var(--color-text-secondary)' }}>
                      {item.is_supplier === 'yes' ? (
                        <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#d1fae5', color: '#047857', fontSize: '11px', fontWeight: 700 }}>Supplier</span>
                      ) : (
                        <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#f3f4f6', color: '#4b5563', fontSize: '11px', fontWeight: 700 }}>Standard</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleEditItem(item); }} style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-primary)' }}><Edit size={16} /></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )})}

              {/* HSN TABLE */}
              {activeTab === 'hsn' && hsns
                .filter(i => i.code.includes(searchQuery) || i.description.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 50)
                .map((item, index) => {
                  const actualIndex = index + 1
                  const isSelected = focusedZone === 'list' && selectedItemIndex === actualIndex
                  return (
                  <tr key={item.id} onClick={() => { setSelectedItemIndex(actualIndex); setFocusedZone('list'); }} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isSelected ? 'rgba(79,70,229,0.1)' : 'transparent', transition: 'background 0.1s' }}>
                    <td style={{ padding: '8px 16px', fontWeight: 700, color: 'var(--color-primary)' }}>{item.code}</td>
                    <td style={{ padding: '8px 16px', color: 'var(--color-text-primary)' }}>{item.description}</td>
                    <td style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 700 }}>{item.igst}%</td>
                    <td style={{ padding: '8px 16px', textAlign: 'center', color: '#059669', fontWeight: 600 }}>{item.cgst}%</td>
                    <td style={{ padding: '8px 16px', textAlign: 'center', color: '#059669', fontWeight: 600 }}>{item.sgst}%</td>
                    <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleEditItem(item); }} style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-primary)' }}><Edit size={16} /></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )})}

              {/* STATES TABLE */}
              {activeTab === 'state' && states
                .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.code.includes(searchQuery))
                .map((item, index) => {
                  const actualIndex = index + 1
                  const isSelected = focusedZone === 'list' && selectedItemIndex === actualIndex
                  return (
                  <tr key={item.id} onClick={() => { setSelectedItemIndex(actualIndex); setFocusedZone('list'); }} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isSelected ? 'rgba(79,70,229,0.1)' : 'transparent', transition: 'background 0.1s' }}>
                    <td style={{ padding: '8px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.name}</td>
                    <td style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--color-primary)' }}>{item.code}</td>
                    <td style={{ padding: '8px 16px', color: 'var(--color-text-secondary)' }}>{item.capital}</td>
                    <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleEditItem(item); }} style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-primary)' }}><Edit size={16} /></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )})}

              {/* O/C BALANCES TABLE */}
              {activeTab === 'balances' && balances
                .filter(i => i.ledgerName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item, index) => {
                  const actualIndex = index + 1
                  const isSelected = focusedZone === 'list' && selectedItemIndex === actualIndex
                  return (
                  <tr key={item.id} onClick={() => { setSelectedItemIndex(actualIndex); setFocusedZone('list'); }} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isSelected ? 'rgba(79,70,229,0.1)' : 'transparent', transition: 'background 0.1s' }}>
                    <td style={{ padding: '8px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.ledgerName}</td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700 }}>₹{item.openingBalance.toLocaleString()}</td>
                    <td style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 700, color: item.opType === 'Dr' ? '#059669' : '#dc2626' }}>{item.opType}</td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700 }}>₹{item.closingBalance.toLocaleString()}</td>
                    <td style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 700, color: item.clType === 'Dr' ? '#059669' : '#dc2626' }}>{item.clType}</td>
                    <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleEditItem(item); }} style={{ padding: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-primary)' }}><Edit size={16} /></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} style={{ padding: '5px', border: 'none', background: 'background-transparent', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )})}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── CREATE / MODIFY MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (modalMode === 'create' || modalMode === 'edit') setShowUnsavedPrompt(true)
          else setIsModalOpen(false)
        }}
        title={`${editingId ? 'Modify' : 'Add New'} ${tabs.find(t => t.id === activeTab)?.label}`}
        maxWidth={activeTab === 'company' || activeTab === 'ledger' ? 'min(95vw, 1100px)' : '600px'}
        footer={
          modalMode === 'view' ? (
            <>
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Close View</Button>
              <Button 
                type="button" 
                variant="primary" 
                onClick={() => { handleDeleteItem(formData.id); setIsModalOpen(false) }}
                style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
              >Delete</Button>
              <Button 
                ref={editButtonRef}
                type="button" 
                variant="primary" 
                onClick={() => { setModalMode('edit'); setTimeout(() => firstInputRef.current?.focus(), 50) }}
              >Edit</Button>
            </>
          ) : (
            <>
              <Button id="btn-exit-without-saving" type="button" variant="secondary" onClick={() => setShowUnsavedPrompt(true)}>Exit without saving (Esc)</Button>
              <Button type="submit" form="master-form" variant="primary">Save</Button>
            </>
          )
        }
      >
        <form id="master-form" onSubmit={handleSaveForm} onKeyDown={handleFormKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: MODAL_GAP, marginTop: '4px' }}>
          
          {activeTab === 'ledger' && (
            <LedgerForm formData={formData} setFormData={setFormData} errors={formErrors} modalMode={modalMode} firstInputRef={firstInputRef as any} />
          )}

          {activeTab === 'salt' && (
            <SaltForm formData={formData} setFormData={setFormData} errors={formErrors} modalMode={modalMode} firstInputRef={firstInputRef as any} />
          )}

          {activeTab === 'company' && (
            <CompanyForm formData={formData} setFormData={setFormData} errors={formErrors} modalMode={modalMode} firstInputRef={firstInputRef as any} />
          )}

          {activeTab === 'hsn' && (
            <HSNForm formData={formData} setFormData={setFormData} errors={formErrors} modalMode={modalMode} firstInputRef={firstInputRef as any} />
          )}

          {activeTab === 'state' && <>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: MODAL_GAP }}>
              <Input ref={firstInputRef} disabled={modalMode === 'view'} variant="compact" label="State Name *" required value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Delhi" />
              <Input disabled={modalMode === 'view'} variant="compact" label="GST State Code *" required value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="e.g. 07" />
            </div>
            <Input disabled={modalMode === 'view'} variant="compact" label="Capital City" value={formData.capital || ''} onChange={e => setFormData({ ...formData, capital: e.target.value })} placeholder="e.g. New Delhi" />
          </>}

          {activeTab === 'balances' && <>
            <Input ref={firstInputRef} disabled={modalMode === 'view'} variant="compact" label="Account / Ledger Name *" required value={formData.ledgerName || ''} onChange={e => setFormData({ ...formData, ledgerName: e.target.value })} placeholder="Select or enter account name" />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: MODAL_GAP, alignItems: 'flex-end' }}>
              <Input disabled={modalMode === 'view'} variant="compact" label="Opening Balance" type="number" step="0.01" value={formData.openingBalance || 0} onChange={e => setFormData({ ...formData, openingBalance: Number(e.target.value) })} />
              <div>
                <label style={MODAL_LABEL}>Dr / Cr</label>
                <select disabled={modalMode === 'view'} value={formData.opType || 'Dr'} onChange={e => setFormData({ ...formData, opType: e.target.value as any })} style={MODAL_FIELD}>
                  <option value="Dr">Dr</option>
                  <option value="Cr">Cr</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: MODAL_GAP, alignItems: 'flex-end' }}>
              <Input disabled={modalMode === 'view'} variant="compact" label="Closing Balance" type="number" step="0.01" value={formData.closingBalance || 0} onChange={e => setFormData({ ...formData, closingBalance: Number(e.target.value) })} />
              <div>
                <label style={MODAL_LABEL}>Dr / Cr</label>
                <select disabled={modalMode === 'view'} value={formData.clType || 'Dr'} onChange={e => setFormData({ ...formData, clType: e.target.value as any })} style={MODAL_FIELD}>
                  <option value="Dr">Dr</option>
                  <option value="Cr">Cr</option>
                </select>
              </div>
            </div>
          </>}

        </form>
      </Modal
>

      <Modal
        isOpen={showUnsavedPrompt}
        onClose={() => {
          setShowUnsavedPrompt(false)
          setTimeout(() => firstInputRef.current?.focus(), 50)
        }}
        title="Exit without saving?"
        maxWidth="350px"
      >
        <p style={{ margin: '0 0 20px 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Are you sure you want to exit? Any unsaved changes will be lost.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button 
            id="prompt-cancel-btn" 
            type="button" 
            variant="secondary" 
            onClick={() => {
              setShowUnsavedPrompt(false)
              setTimeout(() => firstInputRef.current?.focus(), 50)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                document.getElementById('prompt-yes-btn')?.focus();
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            id="prompt-yes-btn"
            type="button" 
            variant="primary" 
            style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }} 
            onClick={() => {
              setShowUnsavedPrompt(false)
              setIsModalOpen(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                document.getElementById('prompt-cancel-btn')?.focus();
              }
            }}
          >
            Yes, Exit
          </Button>
        </div>
      </Modal>
    </div>
  )
}
