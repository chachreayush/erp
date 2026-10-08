import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Bell, LogOut, ChevronDown, ChevronRight } from 'lucide-react'
import GlobalSearch from '../GlobalSearch'

// ── NAV ITEMS DEFINITION ───────────────────────────────────────
interface NavItem {
  label: string
  path: string
  module?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', module: undefined },
  { label: 'Master', path: '/master', module: undefined },
  { label: 'Finance & Accounting', path: '/finance', module: 'finance' },
  { label: 'Inventory', path: '/inventory-dashboard', module: 'inventory' },
  { label: 'Sales & Purchase', path: '/sales', module: 'sales' },
  { label: 'CRM & Admin', path: '/crm', module: 'crm' },
  { label: 'GST & Compliance', path: '/gst', module: undefined },
  { label: 'HR Management', path: '/hr', module: 'hr' },
  { label: 'Reports', path: '/reports', module: 'reports' },
  { label: 'Settings', path: '/settings', module: 'settings' }
]

interface MenuItem {
  label?: string
  isSeparator?: boolean
  type?: string
  path?: string
}

const parentMenuItems: MenuItem[] = [
  { label: 'Sale', type: 'sale' },
  { label: 'Purchase', type: 'purchase' },
  { label: 'Sale Return', type: 'sale-return' },
  { label: 'Purchase Return', type: 'purchase-return' },
  { label: 'Brk/Exp Receive', type: 'brk-receive' },
  { label: 'Brk/Exp Issue', type: 'brk-issue' },
  { isSeparator: true },
  { label: 'GST Inward (Expenses)', type: 'gst-inward' },
  { label: 'GST Outward (Services)', type: 'gst-outward' },
  { isSeparator: true },
  { label: 'Stock Issue', type: 'stock-issue' },
  { label: 'Stock Receive', type: 'stock-receive' },
  { label: 'Sales Order', type: 'sales-order' }
]

const subItemsMap: Record<string, { label: string; path: string }[]> = {
  'sale': [
    { label: 'Sales Order', path: '/sales-order-master' },
    { label: 'Order Approvals', path: '/order-approvals' },
    { label: 'Dispatch & POD', path: '/dispatch-manager' },
    { label: 'Billing Consolidation', path: '/billing-consolidation' },
    { label: 'Bill', path: '/sales?type=bill' },
    { label: 'Challan', path: '/sales?type=challan' },
    { label: 'Sales Return', path: '/sales?type=credit_note' },
    { label: 'Modify Bill', path: '/sales?type=modify-bill' },
    { label: 'Modify Challan', path: '/sales?type=modify-challan' }
  ],
  'purchase': [
    { label: 'Purchase Order', path: '/po' },
    { label: 'Goods Receipt Note (GRN)', path: '/grn' },
    { label: 'Vendor Complaints', path: '/vendor-complaints' },
    { label: 'Purchase Bill', path: '/purchase?type=bill' },
    { label: 'Purchase Challan', path: '/purchase?type=challan' },
    { label: 'Modify Purchase', path: '/purchase?type=modify-bill' },
    { label: 'Modify Purchase Challan', path: '/purchase?type=modify-challan' }
  ],
  'sale-return': [
    { label: 'Credit Note', path: '/sales-return?type=credit' },
    { label: 'Challan', path: '/sales-return?type=challan' },
    { label: 'Modify Credit Note', path: '/sales-return?type=modify-credit' },
    { label: 'Modify Challan', path: '/sales-return?type=modify-challan' }
  ],
  'purchase-return': [
    { label: 'Debit Note', path: '/purchase-return?type=debit' },
    { label: 'Challan', path: '/purchase-return?type=challan' },
    { label: 'Modify Debit Note', path: '/purchase-return?type=modify-debit' },
    { label: 'Modify Challan', path: '/purchase-return?type=modify-challan' }
  ],
  'brk-receive': [
    { label: 'Receive Entry', path: '/brk-receive?type=entry' },
    { label: 'Challan', path: '/brk-receive?type=challan' },
    { label: 'Modify Entry', path: '/brk-receive?type=modify-entry' },
    { label: 'Modify Challan', path: '/brk-receive?type=modify-challan' }
  ],
  'brk-issue': [
    { label: 'Issue Entry', path: '/brk-issue?type=entry' },
    { label: 'Challan', path: '/brk-issue?type=challan' },
    { label: 'Modify Entry', path: '/brk-issue?type=modify-entry' },
    { label: 'Modify Challan', path: '/brk-issue?type=modify-challan' }
  ],
  'gst-inward': [
    { label: 'Inward Entry', path: '/gst-inward?type=entry' },
    { label: 'Modify Entry', path: '/gst-inward?type=modify' }
  ],
  'gst-outward': [
    { label: 'Outward Entry', path: '/gst-outward?type=entry' },
    { label: 'Modify Entry', path: '/gst-outward?type=modify' }
  ],
  'stock-issue': [
    { label: 'Stock Issue Entry', path: '/stock-issue?type=entry' },
    { label: 'Modify Entry', path: '/stock-issue?type=modify' }
  ],
  'stock-receive': [
    { label: 'Stock Receive Entry', path: '/stock-receive?type=entry' },
    { label: 'Modify Entry', path: '/stock-receive?type=modify' }
  ],
  'sales-order': [
    { label: 'Order Entry', path: '/sales-order?type=entry' },
    { label: 'Modify Entry', path: '/sales-order?type=modify' }
  ]
}


const financeMenuItems: MenuItem[] = [
  { label: 'Payment Voucher', path: '/finance/voucher/payment' },
  { label: 'Receipt Voucher', path: '/finance/voucher/receipt' },
  { label: 'Journal Voucher', path: '/finance/voucher/journal' },
  { label: 'Contra Voucher', path: '/finance/voucher/contra' },
  { isSeparator: true },
  { label: 'Voucher Register', path: '/finance/vouchers' },
  { label: 'Day Book', path: '/finance/daybook' },
  { isSeparator: true },
  { label: 'Bank Reconciliation', path: '/finance/bank-reconciliation' },
              { label: 'Fixed Assets', path: '/finance/fixed-assets' },
    { label: 'Expense Management', path: '/finance/expenses' },
      { label: 'Ledger Statement', path: '/finance/ledger-statement' },
  { label: 'Trial Balance', path: '/finance/trial-balance' },
  { label: 'Profit & Loss', path: '/finance/profit-loss' },
  { label: 'Balance Sheet', path: '/finance/balance-sheet' },
  { isSeparator: true },
  { label: 'Scheme Claims', path: '/finance/claims' },
  { label: 'Ledger Groups', path: '/master/ledger-groups' },
  { label: 'Accounts & Ledgers', path: '/finance' }
]

const inventoryMenuItems: MenuItem[] = [
  { label: 'Product', type: 'product' },
  { label: 'Current Stock', type: 'current-stock' },
  { label: 'Claims & Replenishment', type: 'claims' }
]

const inventorySubItemsMap: Record<string, { label: string; path: string }[]> = {
  'product': [
    { label: 'Create', path: '/inventory?action=create' },
    { label: 'Modify', path: '/inventory?action=modify' }
  ],
  'claims': [
    { label: 'Reorder Engine', path: '/inventory/replenishment' },
    { label: 'Internal Expiry Shift', path: '/stock-shift' }
  ],
  'current-stock': [
    { label: 'View Stock', path: '/stock' },
    { label: 'Brk/Exp Stock', path: '/brk-exp-stock' }
  ]
}

const masterMenuItems: MenuItem[] = [
  { label: 'Ledger', type: 'ledger' },
  { label: 'Masters', type: 'masters' }
]

const masterSubItemsMap: Record<string, { label: string; path: string }[]> = {
  'ledger': [
    { label: 'New Ledger', path: '/master?tab=ledger&action=new' },
    { label: 'Modify Ledger', path: '/master?tab=ledger&action=modify' },
    { label: 'Delete Ledger', path: '/master?tab=ledger&action=delete' }
  ],
  'masters': [
      { label: 'Business Partners', path: '/master/parties' },
    { label: 'Salt', path: '/master?tab=salt' },
    { label: 'Company', path: '/master?tab=company' },
    { label: 'HSN', path: '/master?tab=hsn' },
    { label: 'State', path: '/master?tab=state' },
    { label: 'O/C Balances', path: '/master?tab=balances' },
    { label: 'Account Heads', path: '/master/ledger-groups' },
    { label: 'Principal Master', path: '/master/principals' },
    { label: 'Warehouse Master', path: '/master/warehouses' },
    { label: 'Transport Master', path: '/master/transport' },
      { label: 'Document Series', path: '/series-master' },
    { label: 'Scheme Master', path: '/master/schemes' },
    { label: 'Pricing & Formulas', path: '/master/pricing' },
    { label: 'Crash Recovery', path: '/master/error-entries' }
  ]
}

// CRM & Admin menu items — built dynamically based on role
// (defined as a function inside the component to access `user`)


function Header() {
  const user = useAuthStore(state => state.user)
  const originalAmUser = useAuthStore(state => state.originalAmUser)
  const logout = useAuthStore(state => state.logout)
  const revertImpersonation = useAuthStore(state => state.revertImpersonation)
  const hasPermission = useAuthStore(state => state.hasPermission)

  const navigate = useNavigate()
  const location = useLocation()

  // Dropdown States
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false)
  const [salesSubDropdownOpen, setSalesSubDropdownOpen] = useState(false)
  
  const [inventoryDropdownOpen, setInventoryDropdownOpen] = useState(false)
  const [inventorySubDropdownOpen, setInventorySubDropdownOpen] = useState(false)
  
  const [masterDropdownOpen, setMasterDropdownOpen] = useState(false)
  const [masterSubDropdownOpen, setMasterSubDropdownOpen] = useState(false)
  const [financeDropdownOpen, setFinanceDropdownOpen] = useState(false)
  const [crmDropdownOpen, setCrmDropdownOpen] = useState(false)
  const [gstDropdownOpen, setGstDropdownOpen] = useState(false)

  // Keyboard navigation indexes
  const [_focusedMainIndex, setFocusedMainIndex] = useState(0)
  const [focusedParentIndex, setFocusedParentIndex] = useState(0) 
  const [focusedSubIndex, setFocusedSubIndex] = useState(-1) 
  
  const [focusedInvParentIndex, setFocusedInvParentIndex] = useState(0)
  const [focusedInvSubIndex, setFocusedInvSubIndex] = useState(-1)

  const [focusedMasterParentIndex, setFocusedMasterParentIndex] = useState(0)
  const [focusedMasterSubIndex, setFocusedMasterSubIndex] = useState(-1)
  const [focusedFinanceParentIndex, setFocusedFinanceParentIndex] = useState(0)
  const [focusedCrmParentIndex, setFocusedCrmParentIndex] = useState(0)
  const [focusedGstParentIndex, setFocusedGstParentIndex] = useState(0)

  // Refs for focusing
  const mainItemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const parentDropdownRefs = useRef<(HTMLButtonElement | null)[]>([])
  const subDropdownRefs = useRef<(HTMLButtonElement | null)[]>([])
  const inventoryParentRefs = useRef<(HTMLButtonElement | null)[]>([])
  const inventorySubRefs = useRef<(HTMLButtonElement | null)[]>([])
  const masterParentRefs = useRef<(HTMLButtonElement | null)[]>([])
  const masterSubRefs = useRef<(HTMLButtonElement | null)[]>([])
  const financeParentRefs = useRef<(HTMLButtonElement | null)[]>([])
  const crmParentRefs = useRef<(HTMLButtonElement | null)[]>([])
  const gstParentRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Filter permission items
  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (!item.module) return true
    return hasPermission(item.module as any, 'view')
  })

  // Build CRM menu items dynamically based on role
  const crmMenuItems: MenuItem[] = [
    { label: 'CRM Dashboard', path: '/crm' },
    ...(user?.role === 'am_admin' ? [{ label: 'Client Management', path: '/clients' }] : []),
    { label: 'Bulletin Board', path: '/bulletin' }
  ]

  // GST & Compliance menu items
  const gstMenuItems: MenuItem[] = [
    { label: 'GSTR-1', path: '/gst?tab=gstr1' },
    { label: 'GSTR-2', path: '/gst?tab=gstr2' },
    { label: 'GSTR-3B', path: '/gst?tab=gstr3b' },
    { isSeparator: true },
    { label: 'Finance Reports', path: '/finance-reports' }
  ]

  // Full header menu items (CRM & Admin, Client Mgmt, Bulletin are now inside the CRM dropdown)
  const headerItems = [
    ...visibleNavItems
  ]

  // Auto-focus Dashboard on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      mainItemRefs.current[0]?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Helper functions to get next/prev focusable parent index skipping separators
  const getNextParentIndex = (index: number) => {
    let next = (index + 1) % parentMenuItems.length
    while (parentMenuItems[next].isSeparator) {
      next = (next + 1) % parentMenuItems.length
    }
    return next
  }

  const getPrevParentIndex = (index: number) => {
    let prev = (index - 1 + parentMenuItems.length) % parentMenuItems.length
    while (parentMenuItems[prev].isSeparator) {
      prev = (prev - 1 + parentMenuItems.length) % parentMenuItems.length
    }
    return prev
  }

  // Main navigation key handler (Left/Right arrow keys)
  const handleMainKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const nextIndex = (index + 1) % headerItems.length
      setFocusedMainIndex(nextIndex)
      mainItemRefs.current[nextIndex]?.focus()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const prevIndex = (index - 1 + headerItems.length) % headerItems.length
      setFocusedMainIndex(prevIndex)
      mainItemRefs.current[prevIndex]?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      const item = headerItems[index]
      if (item.label === 'Sales & Purchase') {
        e.preventDefault()
        closeAllDropdowns()
        setSalesDropdownOpen(true)
        setFocusedParentIndex(0)
        setTimeout(() => {
          parentDropdownRefs.current[0]?.focus()
        }, 50)
      } else if (item.label === 'Inventory') {
        e.preventDefault()
        closeAllDropdowns()
        setInventoryDropdownOpen(true)
        setFocusedInvParentIndex(0)
        setTimeout(() => {
          inventoryParentRefs.current[0]?.focus()
        }, 50)
      } else if (item.label === 'Finance & Accounting') {
        e.preventDefault()
        closeAllDropdowns()
        setFinanceDropdownOpen(true)
        setFocusedFinanceParentIndex(0)
        setTimeout(() => {
          financeParentRefs.current[0]?.focus()
        }, 50)
      } else if (item.label === 'CRM & Admin') {
        e.preventDefault()
        closeAllDropdowns()
        setCrmDropdownOpen(true)
        setFocusedCrmParentIndex(0)
        setTimeout(() => {
          crmParentRefs.current[0]?.focus()
        }, 50)
      } else if (item.label === 'GST & Compliance') {
        e.preventDefault()
        closeAllDropdowns()
        setGstDropdownOpen(true)
        setFocusedGstParentIndex(0)
        setTimeout(() => {
          gstParentRefs.current[0]?.focus()
        }, 50)
      } else if (item.label === 'Master') {
        e.preventDefault()
        closeAllDropdowns()
        setMasterDropdownOpen(true)
        setFocusedMasterParentIndex(0)
        setTimeout(() => {
          masterParentRefs.current[0]?.focus()
        }, 50)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        closeAllDropdowns()
        navigate(item.path)
      }
    }
  }

  // Parent dropdown key handler (Up/Down in Sales/Purchase submenu)
  const handleParentDropdownKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = getNextParentIndex(index)
      setFocusedParentIndex(nextIndex)
      parentDropdownRefs.current[nextIndex]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = getPrevParentIndex(index)
      setFocusedParentIndex(prevIndex)
      parentDropdownRefs.current[prevIndex]?.focus()
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault()
      const item = parentMenuItems[index]
      if (item.type) {
        setSalesSubDropdownOpen(true)
        setFocusedSubIndex(0)
        setTimeout(() => {
          subDropdownRefs.current[0]?.focus()
        }, 50)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeAllDropdowns()
      // Focus back to main Sales & Purchase button
      const spIndex = headerItems.findIndex(item => item.label === 'Sales & Purchase')
      if (spIndex !== -1) {
        mainItemRefs.current[spIndex]?.focus()
      }
    }
  }

  // Sub-dropdown key handler (Sales -> Bill, Challan, Modify Bill, Modify Challan)
  const handleSubDropdownKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number, subItemsLength: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (index + 1) % subItemsLength
      setFocusedSubIndex(nextIndex)
      subDropdownRefs.current[nextIndex]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (index - 1 + subItemsLength) % subItemsLength
      setFocusedSubIndex(prevIndex)
      subDropdownRefs.current[prevIndex]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
      e.preventDefault()
      setSalesSubDropdownOpen(false)
      setFocusedSubIndex(-1)
      parentDropdownRefs.current[focusedParentIndex]?.focus() 
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = parentMenuItems[focusedParentIndex]
      const subItems = subItemsMap[item.type || ''] || []
      navigate(subItems[index].path)
      closeAllDropdowns()
    }
  }

  // Inventory dropdown key handlers
  const handleInvParentDropdownKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, _index: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedInvParentIndex(0)
      inventoryParentRefs.current[0]?.focus()
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault()
      setInventorySubDropdownOpen(true)
      setFocusedInvSubIndex(0)
      setTimeout(() => {
        inventorySubRefs.current[0]?.focus()
      }, 50)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeAllDropdowns()
      const invIndex = headerItems.findIndex(item => item.label === 'Inventory')
      if (invIndex !== -1) {
        mainItemRefs.current[invIndex]?.focus()
      }
    }
  }

  const handleInvSubDropdownKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number, subItemsLength: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (index + 1) % subItemsLength
      setFocusedInvSubIndex(nextIndex)
      inventorySubRefs.current[nextIndex]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (index - 1 + subItemsLength) % subItemsLength
      setFocusedInvSubIndex(prevIndex)
      inventorySubRefs.current[prevIndex]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
      e.preventDefault()
      setInventorySubDropdownOpen(false)
      setFocusedInvSubIndex(-1)
      inventoryParentRefs.current[focusedInvParentIndex]?.focus()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = inventoryMenuItems[focusedInvParentIndex]
      const subItems = inventorySubItemsMap[item.type || ''] || []
      navigate(subItems[index].path)
      closeAllDropdowns()
    }
  }

  // Master dropdown key handlers
  const handleMasterParentDropdownKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (index + 1) % masterMenuItems.length
      setFocusedMasterParentIndex(nextIndex)
      masterParentRefs.current[nextIndex]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (index - 1 + masterMenuItems.length) % masterMenuItems.length
      setFocusedMasterParentIndex(prevIndex)
      masterParentRefs.current[prevIndex]?.focus()
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault()
      setMasterSubDropdownOpen(true)
      setFocusedMasterSubIndex(0)
      setTimeout(() => {
        masterSubRefs.current[0]?.focus()
      }, 50)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeAllDropdowns()
      const masterIndex = headerItems.findIndex(item => item.label === 'Master')
      if (masterIndex !== -1) {
        mainItemRefs.current[masterIndex]?.focus()
      }
    }
  }

  const handleMasterSubDropdownKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number, subItemsLength: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (index + 1) % subItemsLength
      setFocusedMasterSubIndex(nextIndex)
      masterSubRefs.current[nextIndex]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (index - 1 + subItemsLength) % subItemsLength
      setFocusedMasterSubIndex(prevIndex)
      masterSubRefs.current[prevIndex]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
      e.preventDefault()
      setMasterSubDropdownOpen(false)
      setFocusedMasterSubIndex(-1)
      masterParentRefs.current[focusedMasterParentIndex]?.focus()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = masterMenuItems[focusedMasterParentIndex]
      const subItems = masterSubItemsMap[item.type || ''] || []
      navigate(subItems[index].path)
      closeAllDropdowns()
    }
  }

  // Finance dropdown key handlers
  const handleFinanceParentDropdownKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (index + 1) % financeMenuItems.length
      setFocusedFinanceParentIndex(nextIndex)
      financeParentRefs.current[nextIndex]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (index - 1 + financeMenuItems.length) % financeMenuItems.length
      setFocusedFinanceParentIndex(prevIndex)
      financeParentRefs.current[prevIndex]?.focus()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = financeMenuItems[index]
      if (item && item.path) {
        navigate(item.path)
        closeAllDropdowns()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeAllDropdowns()
      const finIndex = headerItems.findIndex(item => item.label === 'Finance & Accounting')
      if (finIndex !== -1) {
        mainItemRefs.current[finIndex]?.focus()
      }
    }
  }

  // GST & Compliance dropdown key handlers
  const handleGstParentDropdownKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    // Skip separators for navigation
    const navigableGstItems = gstMenuItems.filter(item => !item.isSeparator)
    const getNextGstIdx = (idx: number) => {
      let next = (idx + 1) % gstMenuItems.length
      while (gstMenuItems[next].isSeparator) next = (next + 1) % gstMenuItems.length
      return next
    }
    const getPrevGstIdx = (idx: number) => {
      let prev = (idx - 1 + gstMenuItems.length) % gstMenuItems.length
      while (gstMenuItems[prev].isSeparator) prev = (prev - 1 + gstMenuItems.length) % gstMenuItems.length
      return prev
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = getNextGstIdx(index)
      setFocusedGstParentIndex(nextIndex)
      gstParentRefs.current[nextIndex]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = getPrevGstIdx(index)
      setFocusedGstParentIndex(prevIndex)
      gstParentRefs.current[prevIndex]?.focus()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = gstMenuItems[index]
      if (item && item.path) {
        navigate(item.path)
        closeAllDropdowns()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeAllDropdowns()
      const gstIndex = headerItems.findIndex(item => item.label === 'GST & Compliance')
      if (gstIndex !== -1) {
        mainItemRefs.current[gstIndex]?.focus()
      }
    }
  }

  // CRM & Admin dropdown key handlers
  const handleCrmParentDropdownKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (index + 1) % crmMenuItems.length
      setFocusedCrmParentIndex(nextIndex)
      crmParentRefs.current[nextIndex]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (index - 1 + crmMenuItems.length) % crmMenuItems.length
      setFocusedCrmParentIndex(prevIndex)
      crmParentRefs.current[prevIndex]?.focus()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = crmMenuItems[index]
      if (item && item.path) {
        navigate(item.path)
        closeAllDropdowns()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeAllDropdowns()
      const crmIndex = headerItems.findIndex(item => item.label === 'CRM & Admin')
      if (crmIndex !== -1) {
        mainItemRefs.current[crmIndex]?.focus()
      }
    }
  }

  const closeAllDropdowns = () => {
    setSalesDropdownOpen(false)
    setSalesSubDropdownOpen(false)
    setFocusedSubIndex(-1)
    setInventoryDropdownOpen(false)
    setInventorySubDropdownOpen(false)
    setFocusedInvSubIndex(-1)
    setMasterDropdownOpen(false)
    setMasterSubDropdownOpen(false)
    setFinanceDropdownOpen(false)
    setCrmDropdownOpen(false)
    setGstDropdownOpen(false)
    setFocusedMasterSubIndex(-1)
  }

  const closeAllSalesDropdowns = closeAllDropdowns

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/' || location.pathname === '/dashboard'
    if (path === '/crm') return location.pathname.startsWith('/crm') || location.pathname.startsWith('/clients') || location.pathname.startsWith('/bulletin')
    if (path === '/gst') return location.pathname.startsWith('/gst') || location.pathname.startsWith('/finance-reports')
    return location.pathname.startsWith(path)
  }

  return (
    <header style={{
      height: 'var(--header-height)',
      minHeight: 'var(--header-height)',
      backgroundColor: 'var(--color-bg-surface)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      flexShrink: 0,
      position: 'relative',
      zIndex: 100
    }}>
      
      {/* ── LEFT: LOGO & APP BRAND ─────────────────────────── */}
      <div 
        onClick={() => {
          closeAllDropdowns()
          navigate('/')
        }}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '24px', cursor: 'pointer' }}
      >
        <div style={{
          width: '28px', height: '28px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, var(--color-primary), #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 800, color: 'white',
          letterSpacing: '-0.5px'
        }}>
          E
        </div>
        <span style={{
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.3px'
        }}>
          ERP
        </span>
      </div>

      {/* ── MIDDLE: MAIN NAVIGATION OPTIONS ──────────────────── */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flex: 1
      }}>
        {headerItems.map((item, index) => {
          const active = isActive(item.path)
          const isSalesPurchase = item.label === 'Sales & Purchase'
          const isInventory = item.label === 'Inventory'
          const isMaster = item.label === 'Master'
          const isFinance = item.label === 'Finance & Accounting'
          const isCrm = item.label === 'CRM & Admin'
          const isGst = item.label === 'GST & Compliance'

          return (
            <div key={item.path} style={{ position: 'relative', display: 'inline-block' }}>
              <button
                id={`nav-${item.label.toLowerCase().replace(/[^a-z]/g, '')}`}
                ref={el => { mainItemRefs.current[index] = el }}
                onClick={() => {
                  if (isSalesPurchase) {
                    closeAllDropdowns(); setSalesDropdownOpen(!salesDropdownOpen)
                  } else if (isInventory) {
                    closeAllDropdowns(); setInventoryDropdownOpen(!inventoryDropdownOpen)
                  } else if (isMaster) {
                    closeAllDropdowns(); setMasterDropdownOpen(!masterDropdownOpen)
                  } else if (isFinance) {
                    closeAllDropdowns(); setFinanceDropdownOpen(!financeDropdownOpen)
                  } else if (isCrm) {
                    closeAllDropdowns(); setCrmDropdownOpen(!crmDropdownOpen)
                  } else if (isGst) {
                    closeAllDropdowns(); setGstDropdownOpen(!gstDropdownOpen)
                  } else {
                    closeAllDropdowns()
                    navigate(item.path)
                  }
                }}
                onKeyDown={(e) => handleMainKeyDown(e, index)}
                onMouseEnter={() => {
                  if (salesDropdownOpen || inventoryDropdownOpen || masterDropdownOpen || financeDropdownOpen || crmDropdownOpen || gstDropdownOpen) {
                    if (isSalesPurchase) { closeAllDropdowns(); setSalesDropdownOpen(true); }
                    else if (isInventory) { closeAllDropdowns(); setInventoryDropdownOpen(true); }
                    else if (isMaster) { closeAllDropdowns(); setMasterDropdownOpen(true); }
                    else if (isFinance) { closeAllDropdowns(); setFinanceDropdownOpen(true); }
                    else if (isCrm) { closeAllDropdowns(); setCrmDropdownOpen(true); }
                    else if (isGst) { closeAllDropdowns(); setGstDropdownOpen(true); }
                    else { closeAllDropdowns() }
                  }
                }}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: active ? 600 : 500,
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: active ? 'rgba(79,70,229,0.1)' : 'transparent',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  transition: 'all var(--transition-fast)',
                  whiteSpace: 'nowrap'
                }}
              >
                {item.label}
                {(isSalesPurchase || isInventory || isMaster || isFinance || isCrm || isGst) && <ChevronDown size={10} style={{ marginLeft: '4px', display: 'inline' }} />}
              </button>

              {/* ── SALES & PURCHASE PARENT DROPDOWN ───────────────── */}
              {isSalesPurchase && salesDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-md)',
                  padding: '4px',
                  minWidth: '180px',
                  zIndex: 110,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  {parentMenuItems.map((parentItem, idx) => {
                    if (parentItem.isSeparator) {
                      return (
                        <div 
                          key={`sep-${idx}`} 
                          style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }} 
                        />
                      )
                    }

                    const isParentFocused = focusedParentIndex === idx
                    const isSubOpen = isParentFocused && salesSubDropdownOpen
                    const subItems = subItemsMap[parentItem.type || ''] || []

                    return (
                      <div key={parentItem.label} style={{ position: 'relative' }}>
                        <button
                          ref={el => { parentDropdownRefs.current[idx] = el }}
                          onKeyDown={e => handleParentDropdownKeyDown(e, idx)}
                          onClick={() => {
                            setFocusedParentIndex(idx)
                            setSalesSubDropdownOpen(!salesSubDropdownOpen)
                          }}
                          onMouseEnter={() => {
                            setFocusedParentIndex(idx)
                            setSalesSubDropdownOpen(true)
                          }}
                          style={{
                            padding: '6px 8px',
                            fontSize: '11px',
                            textAlign: 'left',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: isParentFocused ? 'rgba(79,70,229,0.1)' : 'transparent',
                            color: isParentFocused ? 'var(--color-primary)' : 'var(--color-text-primary)',
                            cursor: 'pointer',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span>{parentItem.label}</span>
                          <ChevronRight size={10} />
                        </button>

                        {/* ── NESTED SUB-DROPDOWN (FLYOUT) ────────────────── */}
                        {isSubOpen && subItems.length > 0 && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: '100%',
                            marginLeft: '4px',
                            backgroundColor: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            boxShadow: 'var(--shadow-md)',
                            padding: '4px',
                            minWidth: '160px',
                            zIndex: 120,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}>
                            {subItems.map((subItem, sIdx) => (
                              <button
                                key={subItem.label}
                                ref={el => { subDropdownRefs.current[sIdx] = el }}
                                onClick={() => {
                                  navigate(subItem.path)
                                  closeAllSalesDropdowns()
                                }}
                                onKeyDown={e => handleSubDropdownKeyDown(e, sIdx, subItems.length)}
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '11px',
                                  textAlign: 'left',
                                  border: 'none',
                                  borderRadius: '4px',
                                  backgroundColor: focusedSubIndex === sIdx ? 'rgba(79,70,229,0.1)' : 'transparent',
                                  color: focusedSubIndex === sIdx ? 'var(--color-primary)' : 'var(--color-text-primary)',
                                  cursor: 'pointer',
                                  width: '100%'
                                }}
                              >
                                {subItem.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}




              {/* ── INVENTORY PARENT DROPDOWN ───────────────── */}
              {isInventory && inventoryDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-md)',
                  padding: '4px',
                  minWidth: '150px',
                  zIndex: 110,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  {inventoryMenuItems.map((invItem, idx) => {
                    const isParentFocused = focusedInvParentIndex === idx
                    const isSubOpen = isParentFocused && inventorySubDropdownOpen
                    const subItems = inventorySubItemsMap[invItem.type || ''] || []

                    return (
                      <div key={invItem.label} style={{ position: 'relative' }}>
                        <button
                          ref={el => { inventoryParentRefs.current[idx] = el }}
                          onKeyDown={e => handleInvParentDropdownKeyDown(e, idx)}
                          onClick={() => {
                            setFocusedInvParentIndex(idx)
                            setInventorySubDropdownOpen(!inventorySubDropdownOpen)
                          }}
                          onMouseEnter={() => {
                            setFocusedInvParentIndex(idx)
                            setInventorySubDropdownOpen(true)
                          }}
                          style={{
                            padding: '6px 8px',
                            fontSize: '11px',
                            textAlign: 'left',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: isParentFocused ? 'rgba(79,70,229,0.1)' : 'transparent',
                            color: isParentFocused ? 'var(--color-primary)' : 'var(--color-text-primary)',
                            cursor: 'pointer',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span>{invItem.label}</span>
                          <ChevronRight size={10} />
                        </button>

                        {/* ── NESTED SUB-DROPDOWN (FLYOUT: CREATE / MODIFY) ────────────────── */}
                        {isSubOpen && subItems.length > 0 && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: '100%',
                            marginLeft: '4px',
                            backgroundColor: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            boxShadow: 'var(--shadow-md)',
                            padding: '4px',
                            minWidth: '140px',
                            zIndex: 120,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}>
                            {subItems.map((subItem, sIdx) => (
                              <button
                                key={subItem.label}
                                ref={el => { inventorySubRefs.current[sIdx] = el }}
                                onClick={() => {
                                  navigate(subItem.path)
                                  closeAllDropdowns()
                                }}
                                onKeyDown={e => handleInvSubDropdownKeyDown(e, sIdx, subItems.length)}
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '11px',
                                  textAlign: 'left',
                                  border: 'none',
                                  borderRadius: '4px',
                                  backgroundColor: focusedInvSubIndex === sIdx ? 'rgba(79,70,229,0.1)' : 'transparent',
                                  color: focusedInvSubIndex === sIdx ? 'var(--color-primary)' : 'var(--color-text-primary)',
                                  cursor: 'pointer',
                                  width: '100%'
                                }}
                              >
                                {subItem.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}




              {/* ── MASTER PARENT DROPDOWN ───────────────── */}
              {isMaster && masterDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-md)',
                  padding: '4px',
                  minWidth: '150px',
                  zIndex: 110,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  {masterMenuItems.map((mstItem, idx) => {
                    const isParentFocused = focusedMasterParentIndex === idx
                    const isSubOpen = isParentFocused && masterSubDropdownOpen
                    const subItems = masterSubItemsMap[mstItem.type || ''] || []

                    return (
                      <div key={mstItem.label} style={{ position: 'relative' }}>
                        <button
                          ref={el => { masterParentRefs.current[idx] = el }}
                          onKeyDown={e => handleMasterParentDropdownKeyDown(e, idx)}
                          onClick={() => {
                            setFocusedMasterParentIndex(idx)
                            setMasterSubDropdownOpen(!masterSubDropdownOpen)
                          }}
                          onMouseEnter={() => {
                            setFocusedMasterParentIndex(idx)
                            setMasterSubDropdownOpen(true)
                          }}
                          style={{
                            padding: '6px 8px',
                            fontSize: '11px',
                            textAlign: 'left',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: isParentFocused ? 'rgba(79,70,229,0.1)' : 'transparent',
                            color: isParentFocused ? 'var(--color-primary)' : 'var(--color-text-primary)',
                            cursor: 'pointer',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span>{mstItem.label}</span>
                          <ChevronRight size={10} />
                        </button>

                        {/* ── NESTED SUB-DROPDOWN ────────────────── */}
                        {isSubOpen && subItems.length > 0 && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: '100%',
                            marginLeft: '4px',
                            backgroundColor: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            boxShadow: 'var(--shadow-md)',
                            padding: '4px',
                            minWidth: '150px',
                            zIndex: 120,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}>
                            {subItems.map((subItem, sIdx) => (
                              <button
                                key={subItem.label}
                                ref={el => { masterSubRefs.current[sIdx] = el }}
                                onClick={() => {
                                  navigate(subItem.path)
                                  closeAllDropdowns()
                                }}
                                onKeyDown={e => handleMasterSubDropdownKeyDown(e, sIdx, subItems.length)}
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '11px',
                                  textAlign: 'left',
                                  border: 'none',
                                  borderRadius: '4px',
                                  backgroundColor: focusedMasterSubIndex === sIdx ? 'rgba(79,70,229,0.1)' : 'transparent',
                                  color: focusedMasterSubIndex === sIdx ? 'var(--color-primary)' : 'var(--color-text-primary)',
                                  cursor: 'pointer',
                                  width: '100%'
                                }}
                              >
                                {subItem.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── FINANCE PARENT DROPDOWN ───────────────── */}
              {isFinance && financeDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-md)',
                  padding: '4px',
                  minWidth: '180px',
                  zIndex: 110,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  {financeMenuItems.map((finItem, idx) => {
                    if (finItem.isSeparator) {
                      return (
                        <div 
                          key={`fin-sep-${idx}`} 
                          style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }} 
                        />
                      )
                    }

                    const isParentFocused = focusedFinanceParentIndex === idx

                    return (
                      <div key={finItem.label || `fin-${idx}`} style={{ position: 'relative' }}>
                        <button
                          ref={el => { financeParentRefs.current[idx] = el }}
                          onKeyDown={e => handleFinanceParentDropdownKeyDown(e, idx)}
                          onClick={() => {
                            if (finItem.path) {
                              navigate(finItem.path)
                              closeAllDropdowns()
                            }
                          }}
                          onMouseEnter={() => {
                            setFocusedFinanceParentIndex(idx)
                          }}
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 500,
                            textAlign: 'left',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: isParentFocused ? 'rgba(79,70,229,0.1)' : 'transparent',
                            color: isParentFocused ? 'var(--color-primary)' : 'var(--color-text-primary)',
                            cursor: 'pointer',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span>{finItem.label}</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── CRM & ADMIN DROPDOWN ───────────────── */}
              {isCrm && crmDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-md)',
                  padding: '4px',
                  minWidth: '170px',
                  zIndex: 110,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  {crmMenuItems.map((crmItem, idx) => {
                    const isParentFocused = focusedCrmParentIndex === idx

                    return (
                      <div key={crmItem.label || `crm-${idx}`} style={{ position: 'relative' }}>
                        <button
                          ref={el => { crmParentRefs.current[idx] = el }}
                          onKeyDown={e => handleCrmParentDropdownKeyDown(e, idx)}
                          onClick={() => {
                            if (crmItem.path) {
                              navigate(crmItem.path)
                              closeAllDropdowns()
                            }
                          }}
                          onMouseEnter={() => {
                            setFocusedCrmParentIndex(idx)
                          }}
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 500,
                            textAlign: 'left',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: isParentFocused ? 'rgba(79,70,229,0.1)' : 'transparent',
                            color: isParentFocused ? 'var(--color-primary)' : 'var(--color-text-primary)',
                            cursor: 'pointer',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span>{crmItem.label}</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── GST & COMPLIANCE DROPDOWN ───────────────── */}
              {isGst && gstDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-md)',
                  padding: '4px',
                  minWidth: '170px',
                  zIndex: 110,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  {gstMenuItems.map((gstItem, idx) => {
                    if (gstItem.isSeparator) {
                      return (
                        <div
                          key={`gst-sep-${idx}`}
                          style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }}
                        />
                      )
                    }
                    const isParentFocused = focusedGstParentIndex === idx
                    return (
                      <div key={gstItem.label || `gst-${idx}`} style={{ position: 'relative' }}>
                        <button
                          ref={el => { gstParentRefs.current[idx] = el }}
                          onKeyDown={e => handleGstParentDropdownKeyDown(e, idx)}
                          onClick={() => {
                            if (gstItem.path) {
                              navigate(gstItem.path)
                              closeAllDropdowns()
                            }
                          }}
                          onMouseEnter={() => {
                            setFocusedGstParentIndex(idx)
                          }}
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 500,
                            textAlign: 'left',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: isParentFocused ? 'rgba(79,70,229,0.1)' : 'transparent',
                            color: isParentFocused ? 'var(--color-primary)' : 'var(--color-text-primary)',
                            cursor: 'pointer',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span>{gstItem.label}</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}


            </div>
          )
        })}
      </nav>

      <GlobalSearch />

      {/* ── RIGHT: NOTIFICATIONS + USER PROFILE ──────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
        
        {/* Impersonation alert */}
        {originalAmUser && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '4px 8px', backgroundColor: 'var(--color-danger-light)',
            color: 'var(--color-danger)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-danger)', fontSize: '11px', fontWeight: 600
          }}>
            <span>Client: {user?.companyName}</span>
            <button
              onClick={() => {
                revertImpersonation()
                navigate('/clients')
              }}
              style={{
                backgroundColor: 'var(--color-danger)', color: 'white',
                border: 'none', borderRadius: '4px', padding: '2px 6px',
                cursor: 'pointer', fontSize: '10px', fontWeight: 700
              }}
            >
              Exit
            </button>
          </div>
        )}

        <button
          style={{
            width: '32px', height: '32px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-secondary)',
            position: 'relative'
          }}
        >
          <Bell size={16} />
          <span style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '6px', height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-danger)',
            border: '1.5px solid var(--color-bg-surface)'
          }} />
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-primary)'
            }}
          >
            <div style={{
              width: '24px', height: '24px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700, color: 'white',
              flexShrink: 0
            }}>
              {(user?.name || 'User')
                .split(' ')
                .map(n => n[0] || '')
                .slice(0, 2)
                .join('')
                .toUpperCase()
              }
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ?? 'User'}
            </span>
            <ChevronDown size={12} />
          </button>

          {userMenuOpen && (
            <div style={{
              position: 'absolute', top: '38px', right: 0,
              width: '180px',
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              zIndex: 200
            }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{user?.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{user?.companyName}</div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '8px 12px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  border: 'none', backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--color-danger)',
                  fontSize: '12px', fontWeight: 500,
                  textAlign: 'left'
                }}
              >
                <LogOut size={12} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
