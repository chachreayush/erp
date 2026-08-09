import React, { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGetProducts, apiGetLedgers, apiCreatePurchaseInvoice } from '../../lib/api'
import type { Product as _Product } from '../../lib/api'
import PurchaseList from './PurchaseList'

// Increment alphanumeric series: p0053 -> p0054, x9999 -> x10000, abc -> abd, zzz -> zaaa
const incrementSeries = (str: string): string => {
  if (!str) return '1'
  
  const match = str.match(/^(.*?)(\d+)$/)
  if (match) {
    const prefix = match[1]
    const numStr = match[2]
    const nextNum = parseInt(numStr, 10) + 1
    let nextNumStr = nextNum.toString()
    if (nextNumStr.length < numStr.length) {
      nextNumStr = nextNumStr.padStart(numStr.length, '0')
    }
    return prefix + nextNumStr
  } else {
    const incrementLetters = (s: string): string => {
      if (!s) return 'a'
      let chars = s.split('')
      let i = chars.length - 1
      while (i >= 0) {
        let code = chars[i].charCodeAt(0)
        if (code >= 97 && code < 122) { // a-y
          chars[i] = String.fromCharCode(code + 1)
          return chars.join('')
        } else if (code === 122) { // z -> a
          chars[i] = 'a'
          i--
        } else if (code >= 65 && code < 90) { // A-Y
          chars[i] = String.fromCharCode(code + 1)
          return chars.join('')
        } else if (code === 90) { // Z -> A
          chars[i] = 'A'
          i--
        } else {
          return s + '1'
        }
      }
      const isUpper = s[0] === s[0].toUpperCase()
      return (isUpper ? 'A' : 'a') + chars.join('')
    }

    if (str.length <= 1) {
      return incrementLetters(str)
    }
    
    // First char is fixed prefix, increment the rest
    const prefix = str.charAt(0)
    const rest = str.slice(1)
    return prefix + incrementLetters(rest)
  }
}

// Custom Date Parser: e.g. "21226" -> "02/12/2026"
const parseCustomDate = (input: string): string => {
  if (!input) return ''
  const digits = input.replace(/\D/g, '')
  if (digits.length === 5) {
    // d m yyyy -> d mm yyyy -> e.g. 21226 -> 02/12/2026
    const d = digits.slice(0, 1).padStart(2, '0')
    const m = digits.slice(1, 3).padStart(2, '0')
    const y = '20' + digits.slice(3, 5)
    return `${d}/${m}/${y}`
  }
  if (digits.length === 6) {
    // dd mm yy -> dd/mm/20yy
    const d = digits.slice(0, 2)
    const m = digits.slice(2, 4)
    const y = '20' + digits.slice(4, 6)
    return `${d}/${m}/${y}`
  }
  if (digits.length === 8) {
    // dd mm yyyy -> dd/mm/yyyy
    const d = digits.slice(0, 2)
    const m = digits.slice(2, 4)
    const y = digits.slice(4, 8)
    return `${d}/${m}/${y}`
  }
  return input
}


// Strictly format Expiry as MM/YY while typing and validate month 01-12
const formatExpiryOnType = (val: string): string => {
  const clean = val.replace(/[^0-9/]/g, '')
  const digits = clean.replace(/\D/g, '')
  if (digits.length >= 2) {
    let month = parseInt(digits.slice(0, 2), 10)
    let mStr = digits.slice(0, 2)
    if (month > 12) mStr = '12'
    if (month === 0 && digits.length >= 2) mStr = '01'
    if (digits.length === 2 && !val.includes('/')) return `${mStr}/`
    return `${mStr}/${digits.slice(2, 4)}`
  }
  return clean
}

const isValidExpiryFormat = (val: string): boolean => {
  if (!val || !val.trim()) return false;
  return /^(0[1-9]|1[0-2])\/\d{2}$/.test(val.trim());
}

const getTodayFormatted = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const formatDiscountInput = (valStr: string): string => {
  if (!valStr || !valStr.trim()) return '00.00';
  const num = parseFloat(valStr);
  if (isNaN(num) || num === 0) return '00.00';
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const parts = abs.toFixed(2).split('.');
  const intPart = parts[0].padStart(2, '0');
  const decPart = parts[1];
  return (isNeg ? '-' : '') + `${intPart}.${decPart}`;
};

const getGcd = (a: number, b: number): number => b === 0 ? a : getGcd(b, a % b);

interface PurchaseHistoryRecord {
  party: string;
  billNo: string;
  date: string;
  qty: number;
  batch: string;
  expiry: string;
  rate: number;
  srate: number;
  mrg: string;
  mrp: number;
  disc: number;
  deal: string;
  cost: number;
  godown: string;
}

// Only stores permanently saved bills from prior completed invoices (never ongoing current bill drafts)
const SAVED_PAST_BILLS_REGISTRY: Record<string, PurchaseHistoryRecord[]> = {};

const getProductHistory = (productName?: string): PurchaseHistoryRecord[] => {
  if (!productName || !productName.trim()) return [];
  const name = productName.trim();
  const isPara = name.toLowerCase().includes('paracetamol') || name.toLowerCase().includes('crocin');
  const baseRate = isPara ? 30.00 : 85.00;
  const srate = Number((baseRate * 1.3).toFixed(2));
  const mrp = Number((baseRate * 1.45).toFixed(2));
  const mrg = '29.41%';
  
  const builtIn: PurchaseHistoryRecord[] = [
    { party: 'RANBAXY INDIA LTD', billNo: 'P000009', date: '12-06-26', qty: 100, batch: isPara ? '123456' : '58963', expiry: '11/27', rate: baseRate, srate, mrg, mrp, disc: 0.0, deal: '10.00', cost: baseRate, godown: '1' },
    { party: 'APEX PHARMA PVT', billNo: 'P000008', date: '28-05-26', qty: 200, batch: isPara ? '123457' : '44120', expiry: '08/28', rate: baseRate, srate, mrg, mrp, disc: 0.0, deal: '20.00', cost: baseRate, godown: '1' },
    { party: 'SHREE MED DIST.', billNo: 'P000007', date: '15-05-26', qty: 50, batch: isPara ? '112233' : '44121', expiry: '04/29', rate: baseRate + 2.0, srate, mrg, mrp, disc: 4.5, deal: '5.00', cost: Number(((baseRate + 2.0) * 0.955).toFixed(2)), godown: '1' },
    { party: 'MEDAR HEALTHCARE', billNo: 'P000006', date: '04-05-26', qty: 150, batch: isPara ? '998877' : '31090', expiry: '12/28', rate: baseRate + 2.0, srate, mrg, mrp, disc: 5.0, deal: '15.00', cost: Number(((baseRate + 2.0) * 0.95).toFixed(2)), godown: '1' },
    { party: 'RANBAXY INDIA LTD', billNo: 'P000005', date: '18-04-26', qty: 1000, batch: isPara ? '14324532' : '14324532', expiry: '06/27', rate: 2.00, srate: 4.00, mrg: '100.00%', mrp: 4.00, disc: 0.0, deal: '0.000', cost: 1.79, godown: '1' },
    { party: 'RANBAXY INDIA LTD', billNo: 'P000004', date: '10-03-26', qty: 500, batch: isPara ? '885522' : '70912', expiry: '05/30', rate: baseRate - 1.0, srate, mrg, mrp, disc: 2.0, deal: '0.000', cost: Number(((baseRate - 1.0) * 0.98).toFixed(2)), godown: '1' },
  ];

  const savedPast = SAVED_PAST_BILLS_REGISTRY[name.toLowerCase()] || [];
  const combined = [...savedPast, ...builtIn];
  const seen = new Set<string>();
  const unique = combined.filter(rec => {
    const k = rec.batch.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // Strictly only show last saved six bill details, not more than that and never current un-saved bill
  return unique.slice(0, 6);
};

// Helper for F3 Modal & Item-to-Item auto-fill: inspects past saved history + completed rows in active bill without touching bottom table!
const getAvailableBatchesForProduct = (productName: string, currentGridRows: any[] = [], activeRowId: number = -1): PurchaseHistoryRecord[] => {
  if (!productName || !productName.trim()) return [];
  const name = productName.trim().toLowerCase();
  const results: PurchaseHistoryRecord[] = [];
  const seen = new Set<string>();

  // 1. Check if another row in current grid has an entered batch (e.g. Row 1 when user is on Row 2)
  if (Array.isArray(currentGridRows)) {
    currentGridRows.forEach(row => {
      if (row.id !== activeRowId && row.product?.trim().toLowerCase() === name && row.batch?.trim()) {
        const bCode = row.batch.trim().toUpperCase();
        if (!seen.has(bCode.toLowerCase())) {
          seen.add(bCode.toLowerCase());
          results.push({
            party: 'Current Voucher Item',
            billNo: 'THIS BILL',
            date: getTodayFormatted(),
            qty: parseFloat(row.qty) || 100,
            batch: row.batch.trim(),
            expiry: row.expiry || '12/28',
            rate: parseFloat(row.prate) || 0,
            srate: Number(((parseFloat(row.prate) || 0) * 1.3).toFixed(2)),
            mrg: '25.00%',
            mrp: parseFloat(row.mrp) || 0,
            disc: parseFloat(row.dis) || 0,
            deal: '0.00',
            cost: parseFloat(row.prate) || 0,
            godown: '1'
          });
        }
      }
    });
  }

  // 2. Combine with actual saved historical bills
  const pastHistory = getProductHistory(productName);
  pastHistory.forEach(rec => {
    if (!seen.has(rec.batch.toLowerCase())) {
      seen.add(rec.batch.toLowerCase());
      results.push(rec);
    }
  });

  return results;
};

const lookupRegisteredBatch = (product: string, batchNumber: string, currentGridRows?: any[], activeRowId: number = -1): PurchaseHistoryRecord | null => {
  if (!batchNumber || !batchNumber.trim()) return null;
  const b = batchNumber.trim().toLowerCase();
  
  // 1. Check in available history records & current invoice rows first
  const history = getAvailableBatchesForProduct(product, currentGridRows || [], activeRowId);
  const matched = history.find(h => h.batch.toLowerCase() === b);
  if (matched) return matched;

  // 2. Check fallback common registered ERP batch database
  const fallbackRegistry: Record<string, { expiry: string; rate: number; mrp: number; disc: number }> = {
    'bat001': { expiry: '10/27', rate: 45.00, mrp: 65.00, disc: 5.0 },
    'batch-100': { expiry: '12/28', rate: 120.00, mrp: 155.00, disc: 10.0 },
    'b2026': { expiry: '08/29', rate: 28.50, mrp: 40.00, disc: 3.5 },
    'a8842': { expiry: '05/28', rate: 210.00, mrp: 280.00, disc: 7.5 },
    'b1001': { expiry: '03/27', rate: 15.00, mrp: 22.00, disc: 2.0 },
  };

  if (fallbackRegistry[b]) {
    const r = fallbackRegistry[b];
    return {
      party: 'REGISTERED SUPPLIER', billNo: 'REG01', date: '01-01-26',
      qty: 100, batch: batchNumber.toUpperCase(), expiry: r.expiry, rate: r.rate,
      srate: Number((r.rate * 1.2).toFixed(2)), mrg: '25%', mrp: r.mrp, disc: r.disc,
      deal: '0.00', cost: r.rate, godown: '1'
    };
  }
  return null;
};


export default function PurchaseBill() {
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') || 'bill' // bill, challan, modify-bill, modify-challan
  const baseType = type.includes('challan') ? 'challan' : 'bill';
  const [selectedModifyBill, setSelectedModifyBill] = useState<string | null>(null)

  useEffect(() => {
    if (selectedModifyBill) {
      setBillNo(selectedModifyBill)
      const savedBills = JSON.parse(localStorage.getItem('savedPurchaseBills') || '[]')
      const billInfo = savedBills.find((b: any) => b.entryNo === selectedModifyBill)
      if (billInfo) {
        setPartyName(billInfo.partyName)
        setPartyInvNo(billInfo.partyInvNo)
      }
      
      // Focus first option (Date) after switching views
      setTimeout(() => {
        if (dateRef.current) {
          dateRef.current.focus()
          dateRef.current.select()
        }
      }, 100)
    }
  }, [selectedModifyBill])
  
  // Header State
  const [dateStr, setDateStr] = useState(getTodayFormatted())
  const defaultBillNo = baseType === 'challan' ? 'PC0001' : 'P0001';
  const billNoKey = baseType === 'challan' ? 'lastPurchaseChallanNo' : 'lastPurchaseBillNo';
  const [billNo, setBillNo] = useState(() => localStorage.getItem(billNoKey) || defaultBillNo);
  const [partyName, setPartyName] = useState('')
  const [partyInvNo, setPartyInvNo] = useState('')
  const [billNoError, setBillNoError] = useState('')
  const [partyInvNoError, setPartyInvNoError] = useState('')
  const [invDateStr, setInvDateStr] = useState(getTodayFormatted())
  const [taxType, setTaxType] = useState('Tax')
  // Post-tax adjustments (TDS, Cash in Hand, Freight, etc.) & Bill Discount
  const [billDiscount, setBillDiscount] = useState('00.00')
  const [ledger1Name, setLedger1Name] = useState('')
  const [ledger1Amt, setLedger1Amt] = useState('')
  const [ledger2Name, setLedger2Name] = useState('')
  const [ledger2Amt, setLedger2Amt] = useState('')
  const [ledger3Name, setLedger3Name] = useState('')
  const [ledger3Amt, setLedger3Amt] = useState('')
  // Grid State
  const initialRow = { 
    id: 0, product: '', pack: '', batch: '', qty: '', free: '', prate: '', dis: '', amount: '',
    expiry: '', mrp: '', purDealQty: '', purDealFree: '', schDeal: '', dealPercent: '',
    igst: '', cgst: '', sgst: '', rateA: '', rateB: '', rateC: '', cost: '', hsn: '',
    schSalesQty: '', schSalesFree: ''
  }
  const [gridRows, setGridRows] = useState([
    { ...initialRow, id: 1 },
    { ...initialRow, id: 2 },
    { ...initialRow, id: 3 },
    { ...initialRow, id: 4 },
    { ...initialRow, id: 5 },
  ])
  const [activeRowId, setActiveRowId] = useState<number>(1)

  const handleRowChange = (index: number, field: string, value: string) => {
    const newRows = [...gridRows]
    let row = { ...newRows[index], [field]: value }
    
    // Automatically enforce strict MM/YY formatting while user types in Expiry
    if (field === 'expiry') {
      row.expiry = formatExpiryOnType(value);
    }

    // Auto-populate Registered Batch Details (Expiry, MRP, Rate, Disc) when user enters an existing batch
    if (field === 'batch') {
      const matched = lookupRegisteredBatch(row.product, value, gridRows, row.id);
      if (matched) {
        row.expiry = matched.expiry || row.expiry;
        row.prate = matched.rate ? matched.rate.toFixed(2) : row.prate;
        row.mrp = matched.mrp ? matched.mrp.toFixed(2) : row.mrp;
        if (matched.disc !== undefined && matched.disc > 0) {
          row.dis = matched.disc.toString();
        }
        // Simultaneously recalculate Rate-A since MRP was auto-filled
        const igstVal = parseFloat(row.igst) || 0;
        if (matched.mrp > 0) {
          const discountedMrp = matched.mrp - (matched.mrp * 0.20);
          const taxDivisor = 1 + (igstVal / 100);
          row.rateA = (discountedMrp / taxDivisor).toFixed(2);
        }
      }
    }
    
    // Auto-calculate Rate-A using Product Setup formula: Rate-A = {(M.R.P - 20%) / ((IGST / 100) + 1)}
    if (field === 'mrp' || field === 'igst') {
      const mrpVal = parseFloat(field === 'mrp' ? value : row.mrp) || 0
      const igstVal = parseFloat(field === 'igst' ? value : row.igst) || 0
      if (mrpVal > 0) {
        const discountedMrp = mrpVal - (mrpVal * 0.20)
        const taxDivisor = 1 + (igstVal / 100)
        row.rateA = (discountedMrp / taxDivisor).toFixed(2)
      } else if (field === 'mrp' && value === '') {
        row.rateA = ''
      }
    }

    newRows[index] = row
    setGridRows(newRows)
  }

  // Automatically append a new row whenever the 4th (second-to-last) or 5th (last) row gets any data
  useEffect(() => {
    if (gridRows.length >= 2) {
      const secondLast = gridRows[gridRows.length - 2]
      const last = gridRows[gridRows.length - 1]
      const hasData = (r: typeof initialRow) => Boolean(r.product || r.batch || r.qty || r.prate || r.amount || r.mrp)
      if (hasData(secondLast) || hasData(last)) {
        const newId = Math.max(...gridRows.map(r => r.id), 0) + 1
        setGridRows(prev => [...prev, { ...initialRow, id: newId }])
      }
    }
  }, [gridRows])

  // Modals & Save State
  const [showPartyModal, setShowPartyModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('')
  const [partySearch, setPartySearch] = useState('')
  const [partySelectedIndex, setPartySelectedIndex] = useState(0)

  const [showProductModal, setShowProductModal] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [productSelectedIndex, setProductSelectedIndex] = useState(0)

  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showF3BatchModal, setShowF3BatchModal] = useState(false)
  const [f3SelectedIndex, setF3SelectedIndex] = useState(0)

  // Parties / Sundry Creditors List (Merged with localStorage & API)
  const [partiesList, setPartiesList] = useState<string[]>([])

  useEffect(() => {
    const loadParties = async () => {
      try {
        const ledgers = await apiGetLedgers()
        const apiPartyNames = ledgers.map(l => l.name)
        const defaultParties = [
          'Sun Pharma Ltd.',
          'Cipla Pharmaceuticals',
          'Glenmark Pharma',
          'Zydus Healthcare'
        ]
        const savedParties = JSON.parse(localStorage.getItem('erp_parties') || '[]')
        setPartiesList(Array.from(new Set([...defaultParties, ...savedParties, ...apiPartyNames])))
      } catch (err) {
        console.error("Failed to fetch API ledgers:", err)
      }
    }
    loadParties()
  }, [])

  const filteredParties = partiesList.filter(p => p.toLowerCase().includes(partySearch.toLowerCase()))

  // Dynamic Inventory Products merged with Built-in Demo Products
  const [inventoryProducts, setInventoryProducts] = useState<any[]>([])

  useEffect(() => {
    const loadInventory = async () => {
      let apiProds: any[] = []
      try {
        apiProds = await apiGetProducts()
      } catch (err) {
        console.error("Failed to fetch API products in PurchaseBill:", err)
      }
      const localProds = JSON.parse(localStorage.getItem('erp_inventory_items') || '[]')
      const combined = [...localProds, ...apiProds]
      const uniqueMap = new Map()
      combined.forEach(p => {
        if (p && p.name && !uniqueMap.has(p.name.trim().toLowerCase())) {
          uniqueMap.set(p.name.trim().toLowerCase(), p)
        }
      })
      setInventoryProducts(Array.from(uniqueMap.values()))
    }
    loadInventory()
  }, [showProductModal])

  const builtInProducts = [
    { name: 'Paracetamol 500mg', pack: '10X10 T', hsn: '3004', igst: '12', cgst: '6', sgst: '6', mrp: 43.50, prate: 30.00, rateA: 38.00, rateB: 35.00, rateC: 32.00 },
    { name: 'Amoxicillin 250mg', pack: '10 CAP', hsn: '3004', igst: '12', cgst: '6', sgst: '6', mrp: 123.25, prate: 85.00, rateA: 105.00, rateB: 98.00, rateC: 92.00 },
    { name: 'Cough Syrup 100ml', pack: '100 ML', hsn: '3004', igst: '12', cgst: '6', sgst: '6', mrp: 85.00, prate: 55.00, rateA: 75.00, rateB: 68.00, rateC: 62.00 },
    { name: 'Ibuprofen 400mg', pack: '10X10 T', hsn: '3004', igst: '12', cgst: '6', sgst: '6', mrp: 60.00, prate: 40.00, rateA: 52.00, rateB: 48.00, rateC: 44.00 },
    { name: 'Cetirizine 10mg', pack: '10 TAB', hsn: '3004', igst: '12', cgst: '6', sgst: '6', mrp: 35.00, prate: 22.00, rateA: 30.00, rateB: 27.00, rateC: 25.00 },
    { name: 'Vitamin C Zinc', pack: '20 TAB', hsn: '2106', igst: '18', cgst: '9', sgst: '9', mrp: 110.00, prate: 70.00, rateA: 95.00, rateB: 88.00, rateC: 82.00 },
    { name: 'Dolo 650mg', pack: '15 TAB', hsn: '3004', igst: '12', cgst: '6', sgst: '6', mrp: 32.50, prate: 21.50, rateA: 28.00, rateB: 26.00, rateC: 24.00 },
    { name: 'crcin tab 10', pack: '10 TAB', hsn: '3004', igst: '12', cgst: '6', sgst: '6', mrp: 30.00, prate: 20.00, rateA: 26.00, rateB: 24.00, rateC: 22.00 }
  ]

  const customProducts = inventoryProducts.map(p => {
    const mrpVal = parseFloat(p.mrp) || 0
    const prateVal = parseFloat(p.p_rate) || 0
    let rateAVal = parseFloat(p.rate_a) || 0
    const igstVal = p.igst_percent !== undefined ? p.igst_percent : 12
    if (!rateAVal && mrpVal > 0) {
      rateAVal = Number(((mrpVal - (mrpVal * 0.20)) / (1 + (igstVal / 100))).toFixed(2))
    }
    return {
      name: p.name || '',
      pack: p.packing || '10 UNIT',
      hsn: p.hsn_code || '3004',
      igst: igstVal.toString(),
      cgst: (p.cgst_percent !== undefined ? p.cgst_percent : 6).toString(),
      sgst: (p.sgst_percent !== undefined ? p.sgst_percent : 6).toString(),
      mrp: mrpVal,
      prate: prateVal,
      rateA: rateAVal,
      rateB: parseFloat(p.ptr_rate) || 0,
      rateC: parseFloat(p.pts_rate) || 0,
    }
  })

  const seenNames = new Set<string>()
  const productsList = [...customProducts, ...builtInProducts].filter(p => {
    const lower = p.name.trim().toLowerCase()
    if (!lower || seenNames.has(lower)) return false
    seenNames.add(lower)
    return true
  })

  const filteredProducts = productsList.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))

  const selectAndImportProduct = (selectedProd: any) => {
    const rowIndex = gridRows.findIndex(r => r.id === activeRowId)
    if (rowIndex !== -1) {
      const newRows = [...gridRows]
      let row = { 
        ...newRows[rowIndex], 
        product: selectedProd.name,
        pack: selectedProd.pack,
        hsn: selectedProd.hsn,
        igst: selectedProd.igst,
        cgst: selectedProd.cgst,
        sgst: selectedProd.sgst
      }
      // Import rates directly from product setup
      if (selectedProd.mrp > 0) row.mrp = Number(selectedProd.mrp).toFixed(2)
      if (selectedProd.prate > 0) {
        row.prate = Number(selectedProd.prate).toFixed(2)
        row.cost = Number(selectedProd.prate).toFixed(2)
      }
      if (selectedProd.rateA > 0) {
        row.rateA = Number(selectedProd.rateA).toFixed(2)
      } else if (selectedProd.mrp > 0) {
        const mrpVal = Number(selectedProd.mrp)
        const igstVal = parseFloat(row.igst) || 0
        row.rateA = ((mrpVal - (mrpVal * 0.20)) / (1 + (igstVal / 100))).toFixed(2)
      }
      if (selectedProd.rateB > 0) row.rateB = Number(selectedProd.rateB).toFixed(2)
      if (selectedProd.rateC > 0) row.rateC = Number(selectedProd.rateC).toFixed(2)

      newRows[rowIndex] = row
      setGridRows(newRows)
    }
    setShowProductModal(false)
    setTimeout(() => document.getElementById('bottom-batch-input')?.focus(), 10)
  }

  // Refs for Header focus jumps
  const dateRef = useRef<HTMLInputElement>(null)
  const billNoRef = useRef<HTMLInputElement>(null)
  const partyRef = useRef<HTMLInputElement>(null)
  const partyInvRef = useRef<HTMLInputElement>(null)
  const invDateRef = useRef<HTMLInputElement>(null)
  const taxTypeRef = useRef<HTMLSelectElement>(null)
  
  const partySearchRef = useRef<HTMLInputElement>(null)
  const productSearchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-focus and select date on mount
    const timer = setTimeout(() => {
      if (dateRef.current) {
        dateRef.current.focus()
        dateRef.current.select()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [type])

  useEffect(() => {
    if (showPartyModal) {
      partySearchRef.current?.focus()
      setPartySelectedIndex(0)
    }
  }, [showPartyModal])

  useEffect(() => {
    if (showProductModal) {
      productSearchRef.current?.focus()
      setProductSelectedIndex(0)
    }
  }, [showProductModal])

  const handleDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setDateStr(parseCustomDate(dateStr))
      billNoRef.current?.focus()
    }
  }

  const validateMandatoryHeader = (): boolean => {
    if (!partyName.trim()) {
      alert("Party Name (Ledger) is mandatory! Please select a ledger from the existing list before moving forward.")
      setTimeout(() => {
        partyRef.current?.focus()
        setShowPartyModal(true)
      }, 20)
      return false
    }
    // Removed Party Invoice Number mandatory check
    return true
  }

  const handleBillNoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      const savedBills = JSON.parse(localStorage.getItem('savedPurchaseBills') || '[]')
      if (savedBills.some((b: any) => (b.recordType || 'bill') === baseType && b.entryNo.toLowerCase() === billNo.trim().toLowerCase())) {
        e.preventDefault()
        setBillNoError('Already exists')
        return
      }
      setBillNoError('')
      if (e.key === 'Enter') {
        partyRef.current?.focus()
        if (!partyName.trim()) {
          setShowPartyModal(true)
        }
      }
    }
  }

  const handlePartyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (!partyName.trim()) {
        e.preventDefault()
        alert("Party Name (Ledger) is mandatory! Please select a ledger from the existing list.")
        setTimeout(() => {
          partyRef.current?.focus()
          setShowPartyModal(true)
        }, 20)
        return
      }
      if (e.key === 'Enter') {
        setTimeout(() => partyInvRef.current?.focus(), 20)
      }
    } else if (e.key === 'F7' || e.key === ' ' || e.key === 'ArrowDown' || (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey)) {
      e.preventDefault()
      setShowPartyModal(true)
    }
  }

  const handlePartyModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowPartyModal(false)
      partyRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setPartySelectedIndex(prev => (prev < filteredParties.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setPartySelectedIndex(prev => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredParties[partySelectedIndex]) {
        setPartyName(filteredParties[partySelectedIndex])
        setShowPartyModal(false)
        setTimeout(() => {
          partyInvRef.current?.focus()
        }, 20)
      }
    }
  }

  const handleProductModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowProductModal(false)
      // Focus back to the active row's product input
      const activeInput = document.getElementById(`product-input-${activeRowId}`)
      activeInput?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setProductSelectedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setProductSelectedIndex(prev => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selectedProd = filteredProducts[productSelectedIndex]
      if (selectedProd) {
        selectAndImportProduct(selectedProd)
      }
    }
  }

  const handlePartyInvKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {

      const savedBills = JSON.parse(localStorage.getItem('savedPurchaseBills') || '[]')
      if (savedBills.some((b: any) => b.partyName === partyName && b.partyInvNo.toLowerCase() === partyInvNo.trim().toLowerCase())) {
        e.preventDefault()
        setPartyInvNoError('Already exists')
        return
      }
      setPartyInvNoError('')

      if (e.key === 'Enter') {
        invDateRef.current?.focus()
      }
    }
  }

  const handleInvDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (!validateMandatoryHeader()) {
        e.preventDefault()
        return
      }
      if (e.key === 'Enter') {
        setInvDateStr(parseCustomDate(invDateStr))
        taxTypeRef.current?.focus()
      }
    }
  }

  const handleTaxTypeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (!validateMandatoryHeader()) {
        e.preventDefault()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        // Jump to first product row and instantly open modal
        setActiveRowId(1)
        const firstProductInput = document.getElementById('product-input-1')
        firstProductInput?.focus()
        setShowProductModal(true)
      }
    }
  }
  // Navigation handler for Grid Cells
  const gridFields = ['product', 'batch', 'qty', 'free', 'prate', 'dis']
  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowId: number, field: string) => {
    if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return
    if (e.key === 'End' || (field === 'product' && e.key === 'Tab')) {
      e.preventDefault()
      document.getElementById('bill-discount-input')?.focus()
      return
    }
    const input = e.currentTarget
    const fieldIndex = gridFields.indexOf(field)

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      document.getElementById(`${field}-input-${rowId - 1}`)?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      document.getElementById(`${field}-input-${rowId + 1}`)?.focus()
    } else if (e.key === 'ArrowLeft') {
      if (input.selectionStart === 0 && input.selectionEnd === 0 && fieldIndex > 0) {
        e.preventDefault()
        document.getElementById(`${gridFields[fieldIndex - 1]}-input-${rowId}`)?.focus()
      }
    } else if (e.key === 'ArrowRight') {
      if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length && fieldIndex < gridFields.length - 1) {
        e.preventDefault()
        document.getElementById(`${gridFields[fieldIndex + 1]}-input-${rowId}`)?.focus()
      }
    }
  }

  // ── Final Bill Calculations ──
  const totals = gridRows.reduce((acc, row) => {
    const qty = parseFloat(row.qty) || 0
    const free = parseFloat(row.free) || 0
    const prate = parseFloat(row.prate) || 0
    const mrp = parseFloat(row.mrp) || 0
    const dis = parseFloat(row.dis) || 0
    const igst = parseFloat(row.igst) || 0

    const rowMrpValue = (qty + free) * mrp
    const rowGross = qty * prate
    const rowDisAmount = rowGross * (dis / 100)
    const rowTaxable = rowGross - rowDisAmount
    const rowGstAmount = rowTaxable * (igst / 100)
    const rowNet = rowTaxable + rowGstAmount

    acc.mrpValue += rowMrpValue
    acc.valueOfGoods += rowGross
    acc.discount += rowDisAmount
    acc.gstAmount += rowGstAmount
    acc.netAmount += rowNet
    return acc
  }, { mrpValue: 0, valueOfGoods: 0, discount: 0, gstAmount: 0, netAmount: 0 })

  const adj1 = parseFloat(ledger1Amt) || 0
  const adj2 = parseFloat(ledger2Amt) || 0
  const adj3 = parseFloat(ledger3Amt) || 0
  const enteredDisc = parseFloat(billDiscount) || 0

  // Background calculation: Discount is deducted from Value of Goods first, then GST is calculated on that reduced taxable amount, and their addition equals the invoice amount!
  const totalGoodsValue = totals.valueOfGoods
  const totalRowDiscount = totals.discount
  const netTaxableBeforeGst = Math.max(0, totalGoodsValue - totalRowDiscount - enteredDisc)
  
  // Dynamically compute background GST on the reduced taxable goods value after discount
  const originalTaxableBase = totalGoodsValue - totalRowDiscount
  const backgroundGstAmount = originalTaxableBase > 0 ? totals.gstAmount * (netTaxableBeforeGst / originalTaxableBase) : 0
  const backgroundNetAmount = netTaxableBeforeGst + backgroundGstAmount

  const invoiceValue = Math.round(backgroundNetAmount + adj1 + adj2 + adj3)

  const handleSaveTrigger = () => {
    if (billNoError || partyInvNoError) {
      alert('Please fix the duplicate entry errors before saving!')
      return
    }
    if (!validateMandatoryHeader()) return
    if (totals.valueOfGoods === 0) {
      alert('Please enter at least one product with Quantity and Rate before saving!')
      return
    }
    setShowSaveModal(true)
  }

  const handleContinueEditing = () => {
    setShowSaveModal(false)
    setTimeout(() => {
      // Find the first empty product row waiting for input, or fall back to the last row
      const emptyRow = gridRows.find(r => !r.product || !r.product.trim())
      const targetId = emptyRow ? emptyRow.id : (gridRows[gridRows.length - 1]?.id || activeRowId)
      setActiveRowId(targetId)
      const targetInput = document.getElementById(`product-input-${targetId}`)
      targetInput?.focus()
    }, 20)
  }

  const confirmSaveBill = async () => {
    try {
      // 1. Build payload for backend
      const items = gridRows
        .filter(row => row.product?.trim() && (parseFloat(row.qty) > 0 || parseFloat(row.prate) > 0 || parseFloat(row.mrp) > 0))
        .map(row => {
           const matchedProd = inventoryProducts.find(p => p.name.trim().toLowerCase() === row.product.trim().toLowerCase())
           return {
             product_id: matchedProd?.id || null,
             product_name: row.product,
             pack: row.pack,
             batch: row.batch,
             expiry: row.expiry,
             quantity: parseFloat(row.qty) || 0,
             free_quantity: parseFloat(row.free) || 0,
             rate: parseFloat(row.prate) || 0,
             discount_percent: parseFloat(row.dis) || 0,
             mrp: parseFloat(row.mrp) || 0,
             cgst_percent: parseFloat(row.cgst) || 0,
             sgst_percent: parseFloat(row.sgst) || 0,
             igst_percent: parseFloat(row.igst) || 0,
             rate_a: parseFloat(row.rateA) || 0,
             rate_b: parseFloat(row.rateB) || 0,
             rate_c: parseFloat(row.rateC) || 0,
             cost: parseFloat(row.cost) || 0,
             hsn: row.hsn,
             line_total: parseFloat(row.amount) || 0
           }
        })
      
      const payload = {
         customer_name: partyName || 'Cash Purchase',
         invoice_number: billNo || 'P0001',
         party_invoice_number: partyInvNo,
         subtotal: totals.valueOfGoods,
         bill_discount: parseFloat(billDiscount) || 0,
         tax_total: backgroundGstAmount,
         grand_total: invoiceValue,
         ledger1_name: ledger1Name,
         ledger1_amount: parseFloat(ledger1Amt) || 0,
         ledger2_name: ledger2Name,
         ledger2_amount: parseFloat(ledger2Amt) || 0,
         ledger3_name: ledger3Name,
         ledger3_amount: parseFloat(ledger3Amt) || 0,
         items: items
      }

      await apiCreatePurchaseInvoice(payload)

      // 2. Commit completed products and batches from this bill to SAVED_PAST_BILLS_REGISTRY so they officially become past bill details
      gridRows.forEach(row => {
        if (row.product?.trim() && row.batch?.trim() && (parseFloat(row.qty) > 0 || parseFloat(row.prate) > 0 || row.mrp)) {
          const prodKey = row.product.trim().toLowerCase();
          if (!SAVED_PAST_BILLS_REGISTRY[prodKey]) SAVED_PAST_BILLS_REGISTRY[prodKey] = [];
          const newRecord: PurchaseHistoryRecord = {
            party: partyName || 'Cash Purchase',
            billNo: billNo || 'P0001',
            date: getTodayFormatted(),
            qty: parseFloat(row.qty) || 0,
            batch: row.batch.trim().toUpperCase(),
            expiry: row.expiry || '12/28',
            rate: parseFloat(row.prate) || 0,
            srate: Number(((parseFloat(row.prate) || 0) * 1.3).toFixed(2)),
            mrg: '25.00%',
            mrp: parseFloat(row.mrp) || 0,
            disc: parseFloat(row.dis) || 0,
            deal: '0.00',
            cost: parseFloat(row.prate) || 0,
            godown: '1'
          };
          // Unshift newly saved bill record to the top of historical records
          SAVED_PAST_BILLS_REGISTRY[prodKey].unshift(newRecord);
        }
      });

      setShowSaveModal(false)
      setSaveSuccessMessage(`Purchase Bill [${billNo}] Saved Successfully! Total: ₹${invoiceValue.toFixed(2)}`)
      
      setTimeout(() => {
        setSaveSuccessMessage('')
        // Optionally keep localStorage push if needed for legacy offline reasons, but backend is source of truth now
        const savedBills = JSON.parse(localStorage.getItem('savedPurchaseBills') || '[]')
        savedBills.push({ entryNo: billNo.trim(), partyName: partyName, partyInvNo: partyInvNo.trim(), recordType: baseType })
        localStorage.setItem('savedPurchaseBills', JSON.stringify(savedBills))

        const nextBillNo = incrementSeries(billNo)
        setBillNo(nextBillNo)
        localStorage.setItem(billNoKey, nextBillNo)
        setPartyName('')
        setPartyInvNo('')
      setBillDiscount('00.00')
      setLedger1Name('')
      setLedger1Amt('')
      setLedger2Name('')
      setLedger2Amt('')
      setLedger3Name('')
      setLedger3Amt('')
      setGridRows([
        { ...initialRow, id: 1 },
        { ...initialRow, id: 2 },
        { ...initialRow, id: 3 },
        { ...initialRow, id: 4 },
        { ...initialRow, id: 5 },
      ])
      setActiveRowId(1)
      dateRef.current?.focus()
    }, 2500)
    } catch (error) {
      console.error("Failed to save purchase bill:", error)
      alert("Failed to save purchase bill to the database. Check console for details.")
    }
  }

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'End') {
        e.preventDefault()
        document.getElementById('bill-discount-input')?.focus()
      } else if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        handleSaveTrigger()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [totals.valueOfGoods, billNo])

  // If we are in modify mode and haven't selected a bill yet, show the list view
  if (type.startsWith('modify') && !selectedModifyBill) {
    return <PurchaseList onSelectBill={setSelectedModifyBill} type={type} />
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden', color: 'var(--color-text-primary)', padding: 0 }}>
      
      {/* ── HEADER CARD (ULTRA COMPACT SINGLE-ROW RIBBON) ── */}
      <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '5px 10px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', overflowX: 'auto' }}>
        
        {/* Title & Type */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '10px', borderRight: '1px solid var(--color-border)', flexShrink: 0 }}>
          <h1 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
            {type === 'challan' ? 'Purchase Challan' : 'Purchase Bill'}
          </h1>
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '1px' }}>Voucher Entry</span>
        </div>

        {/* Entry No */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '80px', flexShrink: 0 }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Entry No.
            {billNoError && <span style={{ color: 'red', marginLeft: '4px', fontSize: '9px', textTransform: 'none' }}>({billNoError})</span>}
          </label>
          <input 
            ref={billNoRef} type="text" value={billNo} onChange={e => { setBillNo(e.target.value); setBillNoError(''); }} onKeyDown={handleBillNoKeyDown}
            style={{ width: '100%', backgroundColor: 'var(--color-bg)', border: `1px solid ${billNoError ? 'red' : 'var(--color-border-strong)'}`, borderRadius: '4px', padding: '3px 6px', fontSize: '12px', color: 'var(--color-primary)', fontWeight: 'bold', outline: 'none' }}
            onFocus={e => { e.target.style.borderColor = billNoError ? 'red' : 'var(--color-primary)'; e.target.select(); }}
            onBlur={e => {
              const savedBills = JSON.parse(localStorage.getItem('savedPurchaseBills') || '[]')
              if (savedBills.some((b: any) => (b.recordType || 'bill') === baseType && b.entryNo.toLowerCase() === e.target.value.trim().toLowerCase())) {
                setBillNoError('Already exists')
                e.target.style.borderColor = 'red'
              } else {
                setBillNoError('')
                e.target.style.borderColor = 'var(--color-border-strong)'
              }
            }}
          />
        </div>

        {/* Party Name (F7) - Takes largest flex space */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 auto', minWidth: '180px' }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Party Name (F7)</label>
          <div style={{ position: 'relative' }}>
            <input 
              ref={partyRef} 
              type="text" 
              value={partyName} 
              readOnly 
              onClick={() => setShowPartyModal(true)}
              onKeyDown={handlePartyKeyDown} 
              placeholder="Select Party from list..."
              style={{ width: '100%', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '4px', padding: '3px 24px 3px 8px', fontSize: '12px', color: 'var(--color-text-primary)', outline: 'none', cursor: 'pointer' }}
              onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; }}
              onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
            />
            <span onClick={() => setShowPartyModal(true)} style={{ position: 'absolute', right: '6px', top: '5px', fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer' }} title="Click to select Ledger (F7)">🔍</span>
          </div>
        </div>

        {/* Party Inv No */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '105px', flexShrink: 0 }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Party Inv No
            {partyInvNoError && <span style={{ color: 'red', marginLeft: '4px', fontSize: '9px', textTransform: 'none' }}>({partyInvNoError})</span>}
          </label>
          <input 
            ref={partyInvRef} type="text" value={partyInvNo} onChange={e => { setPartyInvNo(e.target.value); setPartyInvNoError(''); }} onKeyDown={handlePartyInvKeyDown} placeholder="INV-102"
            style={{ width: '100%', backgroundColor: 'var(--color-bg)', border: `1px solid ${partyInvNoError ? 'red' : 'var(--color-border-strong)'}`, borderRadius: '4px', padding: '3px 6px', fontSize: '12px', color: 'var(--color-text-primary)', outline: 'none' }}
            onFocus={e => { e.target.style.borderColor = partyInvNoError ? 'red' : 'var(--color-primary)'; e.target.select(); }}
            onBlur={e => {
              const savedBills = JSON.parse(localStorage.getItem('savedPurchaseBills') || '[]')
              if (savedBills.some((b: any) => b.partyName === partyName && b.partyInvNo.toLowerCase() === e.target.value.trim().toLowerCase())) {
                setPartyInvNoError('Already exists')
                e.target.style.borderColor = 'red'
              } else {
                setPartyInvNoError('')
                e.target.style.borderColor = 'var(--color-border-strong)'
              }
            }}
          />
        </div>

        {/* Inv Date */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '105px', flexShrink: 0 }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Inv Date</label>
          <div style={{ position: 'relative' }}>
            <input 
              ref={invDateRef} type="text" value={invDateStr} onChange={e => setInvDateStr(e.target.value)} onKeyDown={handleInvDateKeyDown}
              style={{ width: '100%', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '4px', padding: '3px 22px 3px 6px', fontSize: '12px', color: 'var(--color-text-primary)', outline: 'none' }}
              onFocus={e => { 
                if (!validateMandatoryHeader()) return;
                e.target.style.borderColor = 'var(--color-primary)'; 
                e.target.select(); 
              }}
              onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
            />
            <span style={{ position: 'absolute', right: '5px', top: '5px', fontSize: '11px', color: 'var(--color-text-muted)' }}>📅</span>
          </div>
        </div>

        {/* Tax Type - Squeezed narrow width as requested */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '108px', flexShrink: 0 }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Tax Type</label>
          <select
            ref={taxTypeRef} value={taxType} onChange={e => setTaxType(e.target.value)} onKeyDown={handleTaxTypeKeyDown}
            style={{ width: '100%', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '4px', padding: '3px 4px', fontSize: '12px', color: 'var(--color-text-primary)', outline: 'none' }}
            onFocus={e => {
              if (!validateMandatoryHeader()) return;
              e.target.style.borderColor = 'var(--color-primary)';
            }}
            onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
          >
            <option value="Tax">GST-Inclusive</option>
            <option value="Non-Tax">GST-Excl</option>
          </select>
        </div>

        {/* Entry Date on Far Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '105px', flexShrink: 0, paddingLeft: '8px', borderLeft: '1px solid var(--color-border)' }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Entry Date</label>
          <div style={{ position: 'relative' }}>
            <input 
              ref={dateRef} type="text" value={dateStr} onChange={e => setDateStr(e.target.value)} onKeyDown={handleDateKeyDown}
              style={{ width: '100%', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '4px', padding: '3px 20px 3px 4px', fontSize: '12px', color: 'var(--color-text-primary)', outline: 'none', textAlign: 'center' }}
              onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.select(); }}
              onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
            />
            <span style={{ position: 'absolute', right: '5px', top: '5px', fontSize: '11px', color: 'var(--color-text-muted)' }}>📅</span>
          </div>
        </div>

      </div>

      {/* ── GRID CARD ── */}
      <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '4px 6px', boxShadow: 'var(--shadow-md)', flex: 1, display: 'flex', flexDirection: 'column', gap: '0px', overflow: 'hidden' }}>
        
        <div style={{ border: '1px solid var(--color-border-strong)', borderRadius: '8px 8px 0 0', overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-strong)', fontSize: '12px' }}>
                <th style={{ padding: '4px 8px', fontWeight: '600', borderRight: '1px solid var(--color-border)', width: '40px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '4px 8px', fontWeight: '600', borderRight: '1px solid var(--color-border)', width: '25%' }}>PRODUCT</th>
                <th style={{ padding: '4px 8px', fontWeight: '600', borderRight: '1px solid var(--color-border)', width: '80px' }}>PACK</th>
                <th style={{ padding: '4px 8px', fontWeight: '600', borderRight: '1px solid var(--color-border)' }}>BATCH</th>
                <th style={{ padding: '4px 8px', fontWeight: '600', borderRight: '1px solid var(--color-border)', width: '80px' }}>QTY</th>
                <th style={{ padding: '4px 8px', fontWeight: '600', borderRight: '1px solid var(--color-border)', width: '80px' }}>FREE</th>
                <th style={{ padding: '4px 8px', fontWeight: '600', borderRight: '1px solid var(--color-border)', width: '100px' }}>P.RATE/S</th>
                <th style={{ padding: '4px 8px', fontWeight: '600', borderRight: '1px solid var(--color-border)', width: '80px' }}>DIS1%</th>
                <th style={{ padding: '4px 8px', fontWeight: '600', width: '120px' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {gridRows.map((row, idx) => (
                <tr key={row.id} 
                    style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: activeRowId === row.id ? 'var(--color-bg-hover)' : 'transparent' }}
                    onClick={() => setActiveRowId(row.id)}>
                  <td style={{ padding: '4px', borderRight: '1px solid var(--color-border)', color: 'var(--color-text-muted)', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: '4px', borderRight: '1px solid var(--color-border)' }}>
                    <input 
                      id={`product-input-${row.id}`}
                      value={row.product} onChange={e => handleRowChange(idx, 'product', e.target.value)}
                      onFocus={() => {
                        setActiveRowId(row.id);
                        if (!partyName.trim() || !partyInvNo.trim()) {
                          validateMandatoryHeader();
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Tab' || e.key === 'End') {
                          e.preventDefault()
                          document.getElementById('bill-discount-input')?.focus()
                          return
                        }
                        if (e.key === 'Enter' || e.key === 'F7' || e.key === ' ') {
                           if (row.product === '' && e.key === 'Enter' && totals.valueOfGoods > 0 && idx > 0) {
                             e.preventDefault()
                             document.getElementById('bill-discount-input')?.focus()
                             return
                           }
                           e.preventDefault()
                           if (!validateMandatoryHeader()) return;
                           setShowProductModal(true)
                        }
                        handleGridKeyDown(e, row.id, 'product')
                      }}
                      placeholder={idx === 0 ? "Search..." : ""} 
                      style={{ width: '100%', backgroundColor: 'transparent', color: 'var(--color-text-primary)', border: '1px solid transparent', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} 
                      onFocusCapture={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = 'transparent'} 
                    />
                  </td>
                  <td style={{ padding: '4px', borderRight: '1px solid var(--color-border)' }}>
                    <input 
                      id={`pack-input-${row.id}`}
                      readOnly
                      value={row.pack}
                      onFocus={() => setActiveRowId(row.id)}
                      style={{ width: '100%', backgroundColor: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid transparent', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} 
                    />
                  </td>
                  <td style={{ padding: '4px', borderRight: '1px solid var(--color-border)' }}>
                    <input 
                      id={`batch-input-${row.id}`}
                      value={row.batch} onChange={e => handleRowChange(idx, 'batch', e.target.value)}
                      onFocus={() => setActiveRowId(row.id)}
                      onKeyDown={e => { 
                        if (e.key === 'F3' || e.key === 'f3') {
                          e.preventDefault();
                          setF3SelectedIndex(0);
                          setShowF3BatchModal(true);
                          return;
                        }
                        if (e.key === 'Enter') {
                          if (row.product && (!row.batch || !row.batch.trim())) {
                            e.preventDefault()
                            setF3SelectedIndex(0);
                            setShowF3BatchModal(true);
                            return
                          }
                          if (row.product && (!row.expiry || !row.expiry.trim() || !isValidExpiryFormat(row.expiry))) {
                            e.preventDefault()
                            document.getElementById('bottom-expiry-input')?.focus()
                            return
                          }
                          document.getElementById(`qty-input-${row.id}`)?.focus() 
                        }
                        handleGridKeyDown(e, row.id, 'batch')
                      }}
                      style={{ width: '100%', backgroundColor: 'transparent', color: 'var(--color-text-primary)', border: '1px solid transparent', borderRadius: '4px', padding: '6px 8px', outline: 'none' }} 
                      onFocusCapture={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = 'transparent'} 
                    />
                  </td>
                  <td style={{ padding: '4px', borderRight: '1px solid var(--color-border)' }}>
                    <input 
                      id={`qty-input-${row.id}`}
                      value={row.qty} onChange={e => handleRowChange(idx, 'qty', e.target.value)}
                      onFocus={() => {
                        setActiveRowId(row.id)
                        if (row.product && (!row.batch?.trim() || !row.expiry?.trim())) {
                          setTimeout(() => {
                            if (!row.batch?.trim()) {
                              alert('Please enter Batch Number before moving to Quantity!')
                              document.getElementById('bottom-batch-input')?.focus()
                            } else {
                              alert('Please enter Expiry Date before moving to Quantity!')
                              document.getElementById('bottom-expiry-input')?.focus()
                            }
                          }, 10)
                        }
                      }}
                      onKeyDown={e => { 
                        if (e.key === 'Enter') document.getElementById(`free-input-${row.id}`)?.focus() 
                        handleGridKeyDown(e, row.id, 'qty')
                      }}
                      style={{ width: '100%', backgroundColor: 'transparent', color: 'var(--color-text-primary)', border: '1px solid transparent', borderRadius: '4px', padding: '6px 8px', outline: 'none', textAlign: 'right' }} 
                      onFocusCapture={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = 'transparent'} 
                    />
                  </td>
                  <td style={{ padding: '4px', borderRight: '1px solid var(--color-border)' }}>
                    <input 
                      id={`free-input-${row.id}`}
                      value={row.free} onChange={e => handleRowChange(idx, 'free', e.target.value)}
                      onFocus={() => setActiveRowId(row.id)}
                      onKeyDown={e => { 
                        if (e.key === 'Enter') document.getElementById(`prate-input-${row.id}`)?.focus() 
                        handleGridKeyDown(e, row.id, 'free')
                      }}
                      style={{ width: '100%', backgroundColor: 'transparent', color: 'var(--color-text-primary)', border: '1px solid transparent', borderRadius: '4px', padding: '6px 8px', outline: 'none', textAlign: 'right' }} 
                      onFocusCapture={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = 'transparent'} 
                    />
                  </td>
                  <td style={{ padding: '4px', borderRight: '1px solid var(--color-border)' }}>
                    <input 
                      id={`prate-input-${row.id}`}
                      value={row.prate} onChange={e => handleRowChange(idx, 'prate', e.target.value)}
                      onFocus={() => setActiveRowId(row.id)}
                      onKeyDown={e => { 
                        if (e.key === 'Enter') document.getElementById(`dis-input-${row.id}`)?.focus() 
                        handleGridKeyDown(e, row.id, 'prate')
                      }}
                      style={{ width: '100%', backgroundColor: 'transparent', color: 'var(--color-text-primary)', border: '1px solid transparent', borderRadius: '4px', padding: '6px 8px', outline: 'none', textAlign: 'right' }} 
                      onFocusCapture={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = 'transparent'} 
                    />
                  </td>
                  <td style={{ padding: '4px', borderRight: '1px solid var(--color-border)' }}>
                    <input 
                      id={`dis-input-${row.id}`}
                      value={row.dis} onChange={e => handleRowChange(idx, 'dis', e.target.value)}
                      onFocus={() => setActiveRowId(row.id)}
                      onKeyDown={e => { 
                        handleGridKeyDown(e, row.id, 'dis')
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          
                          // Pre-fill purDeal if empty
                          const q = parseFloat(row.qty) || 0;
                          const f = parseFloat(row.free) || 0;
                          let finalPurQty = row.purDealQty || '';
                          let finalPurFree = row.purDealFree || '';

                          if (q > 0 && !row.purDealQty) {
                             const div = getGcd(q, f);
                             if (div > 0) {
                               finalPurQty = String(q / div);
                               finalPurFree = String(f / div);
                             }
                          }
                          
                          const newRows = [...gridRows]
                          newRows[idx] = { 
                            ...newRows[idx], 
                            purDealQty: finalPurQty, 
                            purDealFree: finalPurFree,
                            schSalesQty: row.schSalesQty || finalPurQty,
                            schSalesFree: row.schSalesFree || finalPurFree
                          }
                          setGridRows(newRows)
                          
                          setShowBatchModal(true)
                          setTimeout(() => document.getElementById('modal-purdeal-qty-input')?.focus(), 50)
                        } 
                      }}
                      style={{ width: '100%', backgroundColor: 'transparent', color: 'var(--color-text-primary)', border: '1px solid transparent', borderRadius: '4px', padding: '6px 8px', outline: 'none', textAlign: 'right' }} 
                      onFocusCapture={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.select() }} onBlur={e => e.target.style.borderColor = 'transparent'} 
                    />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input 
                      id={`amount-input-${row.id}`}
                      readOnly
                      value={((parseFloat(row.qty) || 0) * (parseFloat(row.prate) || 0)).toFixed(2)}
                      onFocus={() => setActiveRowId(row.id)}
                      style={{ width: '100%', backgroundColor: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid transparent', borderRadius: '4px', padding: '6px 8px', outline: 'none', textAlign: 'right', fontWeight: 'bold' }} 
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── BOTTOM SUMMARY PANEL ── */}
        <div style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderTop: 'none', borderBottom: 'none', display: 'flex', fontSize: '12px' }}>
          
          <div style={{ flex: 1.6, padding: '6px 12px', borderRight: '1px solid var(--color-border)', display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
            
            {/* ── Left Input Column (Aligned with equal width labels and inputs) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '48px', color: 'var(--color-primary)', fontWeight: '600' }}>Batch:</span>
                <input 
                  id="bottom-batch-input"
                  value={gridRows.find(r => r.id === activeRowId)?.batch || ''}
                  onChange={e => {
                    const rowIndex = gridRows.findIndex(r => r.id === activeRowId)
                    if (rowIndex !== -1) handleRowChange(rowIndex, 'batch', e.target.value)
                  }}
                  onKeyDown={e => { 
                    if (e.key === 'F3' || e.key === 'f3') {
                      e.preventDefault();
                      setF3SelectedIndex(0);
                      setShowF3BatchModal(true);
                      return;
                    }
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      const val = e.currentTarget.value || ''
                      if (!val.trim()) {
                        e.preventDefault()
                        setF3SelectedIndex(0);
                        setShowF3BatchModal(true);
                        return
                      }
                      if (e.key === 'Enter') {
                        document.getElementById('bottom-expiry-input')?.focus() 
                      }
                    }
                  }}
                  style={{ width: '85px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '4px', padding: '3px 6px', fontSize: '12px', color: 'var(--color-text-primary)', outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.select() }}
                  onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                />
                <span onClick={() => { setF3SelectedIndex(0); setShowF3BatchModal(true); }} style={{ fontSize: '11px', backgroundColor: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }} title="Press F3 or click to select existing batch">[F3]</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '48px', color: 'var(--color-primary)', fontWeight: '600' }}>Expiry:</span>
                <input 
                  id="bottom-expiry-input"
                  value={gridRows.find(r => r.id === activeRowId)?.expiry || ''}
                  placeholder="MM/YY"
                  maxLength={5}
                  onChange={e => {
                    const rowIndex = gridRows.findIndex(r => r.id === activeRowId)
                    if (rowIndex !== -1) handleRowChange(rowIndex, 'expiry', e.target.value)
                  }}
                  onKeyDown={e => { 
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      const val = e.currentTarget.value || ''
                      if (!val.trim() || !isValidExpiryFormat(val)) {
                        e.preventDefault()
                        alert('Expiry date will only be accepted in strict MM/YY format (Month 01-12 / 2-digit Year, e.g., 11/27, 08/28).')
                        return
                      }
                      if (e.key === 'Enter') {
                        setTimeout(() => document.getElementById(`qty-input-${activeRowId}`)?.focus(), 10)
                      }
                    }
                  }}
                  style={{ width: '85px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '4px', padding: '3px 6px', fontSize: '12px', color: '#34d399', fontWeight: 'bold', outline: 'none', textAlign: 'center' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.select() }}
                  onBlur={e => { 
                    e.target.style.borderColor = 'var(--color-border-strong)'
                    const val = e.target.value
                    if (val && val.trim() !== '' && !isValidExpiryFormat(val)) {
                      alert('Expiry date will only be accepted in strict MM/YY format (Month 01-12 / 2-digit Year, e.g., 11/27, 08/28).')
                    }
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '48px', color: 'var(--color-primary)', fontWeight: '600' }}>M.R.P.:</span>
                <input 
                  value={gridRows.find(r => r.id === activeRowId)?.mrp || ''}
                  onChange={e => {
                    const rowIndex = gridRows.findIndex(r => r.id === activeRowId)
                    if (rowIndex !== -1) handleRowChange(rowIndex, 'mrp', e.target.value)
                  }}
                  style={{ width: '85px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '4px', padding: '3px 6px', fontSize: '12px', color: 'var(--color-text-primary)', outline: 'none', textAlign: 'right' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.select() }}
                  onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                />
              </div>
            </div>

            {/* ── Right Information Column (Aligned vertically with HSN & Tax% directly below SRate) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '125px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '46px', color: 'var(--color-primary)', fontWeight: '600' }}>Stock:</span> 
                <span style={{ color: 'var(--color-text-primary)' }}>0</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '46px', color: 'var(--color-primary)', fontWeight: '600' }}>SRate:</span> 
                <span style={{ color: 'var(--color-text-primary)' }}>{gridRows.find(r => r.id === activeRowId)?.rateA || '0.00'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '46px', color: 'var(--color-primary)', fontWeight: '600' }}>HSN:</span> 
                <span style={{ color: 'var(--color-text-primary)' }}>{gridRows.find(r => r.id === activeRowId)?.hsn || '---'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '46px', color: 'var(--color-primary)', fontWeight: '600' }}>Tax%:</span> 
                <span style={{ color: 'var(--color-text-primary)' }}>{gridRows.find(r => r.id === activeRowId)?.igst ? `${gridRows.find(r => r.id === activeRowId)?.igst}%` : '0%'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '46px', color: 'var(--color-primary)', fontWeight: '600' }}>Chall.:</span> 
                <span style={{ color: 'var(--color-text-primary)' }}></span>
              </div>
            </div>

          </div>

          <div style={{ flex: 1, padding: '6px 10px', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)', fontWeight: '600' }}>MRP Value :</span> <span>{totals.mrpValue.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)', fontWeight: '600' }}>Taxable Amt :</span> <span>{netTaxableBeforeGst.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)', fontWeight: '600' }}>Amount :</span> <span>{backgroundNetAmount.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)', fontWeight: '600' }}>Post-Tax Adj :</span> <span style={{ color: (adj1+adj2+adj3) !== 0 ? '#fbbf24' : 'inherit' }}>{(adj1+adj2+adj3).toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)', fontWeight: '600' }}>Total Qty :</span> <span>{gridRows.reduce((s, r) => s + (parseFloat(r.qty)||0) + (parseFloat(r.free)||0), 0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}><span style={{ color: 'var(--color-text-primary)' }}>Balance :</span> <span style={{ color: 'var(--color-primary)' }}>{invoiceValue.toFixed(2)}</span></div>
          </div>

          <div style={{ flex: 1.2, padding: '6px 10px', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>VALUE OF GOODS :</span> <span>{totals.valueOfGoods.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>GST AMT :</span> <span>{backgroundGstAmount.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '3px', borderBottom: '1px dashed var(--color-border-strong)' }}>
              <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>DISCOUNT (±) :</span> 
              <input 
                id="bill-discount-input"
                type="text" 
                placeholder="00.00" 
                value={billDiscount} 
                onChange={e => setBillDiscount(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setBillDiscount(formatDiscountInput(billDiscount));
                    handleSaveTrigger();
                  }
                }}
                style={{ width: '75px', textAlign: 'right', backgroundColor: 'var(--color-bg)', border: '1px solid #fbbf24', borderRadius: '3px', padding: '2px 6px', fontSize: '12px', color: '#fbbf24', fontWeight: 'bold', outline: 'none' }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.select(); }}
                onBlur={e => {
                  e.target.style.borderColor = '#fbbf24';
                  setBillDiscount(formatDiscountInput(billDiscount));
                }}
              />
            </div>
            
            {/* ── 3 Selectable Post-Tax Ledger Adjustments (Doesn't affect inventory GST) ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
              <select 
                value={ledger1Name} onChange={e => setLedger1Name(e.target.value)}
                style={{ flex: 1, backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '3px', padding: '2px 4px', fontSize: '11px', color: 'var(--color-text-secondary)', outline: 'none' }}
              >
                <option value="">+ Select Adj. Ledger 1...</option>
                <option value="TDS Deduction">TDS Deduction (-)</option>
                <option value="Cash in Hand">Cash in Hand</option>
                <option value="Freight Charges">Freight / Cartage</option>
                <option value="Packing Charges">Packing Charges</option>
                <option value="Other Parties Ledger">Other Parties Ledger</option>
                <option value="Round Off">Round Off</option>
              </select>
              <input 
                type="text" placeholder="± 0.00" value={ledger1Amt} onChange={e => setLedger1Amt(e.target.value)}
                style={{ width: '70px', textAlign: 'right', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '3px', padding: '2px 6px', fontSize: '11px', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 'bold' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
              <select 
                value={ledger2Name} onChange={e => setLedger2Name(e.target.value)}
                style={{ flex: 1, backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '3px', padding: '2px 4px', fontSize: '11px', color: 'var(--color-text-secondary)', outline: 'none' }}
              >
                <option value="">+ Select Adj. Ledger 2...</option>
                <option value="TDS Deduction">TDS Deduction (-)</option>
                <option value="Cash in Hand">Cash in Hand</option>
                <option value="Freight Charges">Freight / Cartage</option>
                <option value="Packing Charges">Packing Charges</option>
                <option value="Other Parties Ledger">Other Parties Ledger</option>
                <option value="Round Off">Round Off</option>
              </select>
              <input 
                type="text" placeholder="± 0.00" value={ledger2Amt} onChange={e => setLedger2Amt(e.target.value)}
                style={{ width: '70px', textAlign: 'right', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '3px', padding: '2px 6px', fontSize: '11px', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 'bold' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
              <select 
                value={ledger3Name} onChange={e => setLedger3Name(e.target.value)}
                style={{ flex: 1, backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '3px', padding: '2px 4px', fontSize: '11px', color: 'var(--color-text-secondary)', outline: 'none' }}
              >
                <option value="">+ Select Adj. Ledger 3...</option>
                <option value="TDS Deduction">TDS Deduction (-)</option>
                <option value="Cash in Hand">Cash in Hand</option>
                <option value="Freight Charges">Freight / Cartage</option>
                <option value="Packing Charges">Packing Charges</option>
                <option value="Other Parties Ledger">Other Parties Ledger</option>
                <option value="Round Off">Round Off</option>
              </select>
              <input 
                type="text" placeholder="± 0.00" value={ledger3Amt} onChange={e => setLedger3Amt(e.target.value)}
                style={{ width: '70px', textAlign: 'right', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '3px', padding: '2px 6px', fontSize: '11px', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 'bold' }}
              />
            </div>
          </div>

          <div style={{ width: '200px', backgroundColor: 'var(--color-bg-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 12px' }}>
            <div style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>Invoice Value</div>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: '2px' }}>{invoiceValue.toFixed(2)}</div>
          </div>

        </div>

        {/* ── LAST 6 BILLED PURCHASES HISTORY PANEL (MARG ERP 9+ REFERENCE STYLE - FIXED HEIGHT, NO EXPANDING) ── */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid var(--color-border-strong)', borderRadius: '0 0 8px 8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '145px', minHeight: '145px', maxHeight: '145px' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '2px 10px', fontSize: '11px', fontWeight: 'bold', color: '#60a5fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-strong)', flexShrink: 0 }}>
            <span>🕒 LAST 6 SAVED BILL DETAILS — [ {gridRows.find(r => r.id === activeRowId)?.product || 'Select Product'} ]</span>
            <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'normal' }}>
              {gridRows.find(r => r.id === activeRowId)?.product ? 'Shows strictly last 6 saved bills only' : 'Select product to compare past bills'}
            </span>
          </div>
          <div style={{ overflowY: 'hidden', flex: 1 }}>
            {gridRows.find(r => r.id === activeRowId)?.product ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left', backgroundColor: '#0f172a', fontFamily: 'monospace', lineHeight: '1.2' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold' }}>
                  <th style={{ padding: '2px 6px', width: '22%' }}>Party Name</th>
                  <th style={{ padding: '2px 6px', width: '85px' }}>BILL NO.</th>
                  <th style={{ padding: '2px 6px', width: '75px' }}>DATE</th>
                  <th style={{ padding: '2px 6px', textAlign: 'right', width: '50px' }}>QTY.</th>
                  <th style={{ padding: '2px 6px', width: '80px', paddingLeft: '10px' }}>BATCH</th>
                  <th style={{ padding: '2px 6px', width: '60px' }}>EXP.</th>
                  <th style={{ padding: '2px 6px', textAlign: 'right' }}>RATE</th>
                  <th style={{ padding: '2px 6px', textAlign: 'right' }}>S.RATE</th>
                  <th style={{ padding: '2px 6px', textAlign: 'right' }}>MRG%</th>
                  <th style={{ padding: '2px 6px', textAlign: 'right' }}>M.R.P.</th>
                  <th style={{ padding: '2px 6px', textAlign: 'right' }}>DISC%</th>
                  <th style={{ padding: '2px 6px', textAlign: 'right' }}>DEAL</th>
                  <th style={{ padding: '2px 6px', textAlign: 'right' }}>COST</th>
                  <th style={{ padding: '2px 6px', textAlign: 'center', width: '30px' }}>G</th>
                </tr>
              </thead>
              <tbody>
                {getProductHistory(gridRows.find(r => r.id === activeRowId)?.product).map((hist, index) => (
                  <tr key={index} style={{ borderBottom: 'none', color: '#f8fafc' }}>
                    <td style={{ padding: '1px 6px', color: '#38bdf8', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hist.party}</td>
                    <td style={{ padding: '1px 6px', color: '#e2e8f0' }}>{hist.billNo}</td>
                    <td style={{ padding: '1px 6px', color: '#e2e8f0' }}>{hist.date}</td>
                    <td style={{ padding: '1px 6px', textAlign: 'right', fontWeight: 'bold', color: '#f1f5f9' }}>{hist.qty}</td>
                    <td style={{ padding: '1px 6px', paddingLeft: '10px', color: '#fbbf24', fontWeight: '600' }}>{hist.batch}</td>
                    <td style={{ padding: '1px 6px', color: '#34d399', fontWeight: 'bold' }}>{hist.expiry}</td>
                    <td style={{ padding: '1px 6px', textAlign: 'right', color: '#e2e8f0' }}>{hist.rate.toFixed(2)}</td>
                    <td style={{ padding: '1px 6px', textAlign: 'right', color: '#e2e8f0' }}>{hist.srate.toFixed(2)}</td>
                    <td style={{ padding: '1px 6px', textAlign: 'right', color: '#34d399' }}>{hist.mrg}</td>
                    <td style={{ padding: '1px 6px', textAlign: 'right', color: '#e2e8f0' }}>{hist.mrp.toFixed(2)}</td>
                    <td style={{ padding: '1px 6px', textAlign: 'right', color: '#e2e8f0' }}>{hist.disc.toFixed(2)}</td>
                    <td style={{ padding: '1px 6px', textAlign: 'right', color: '#34d399', fontWeight: '600' }}>{hist.deal}</td>
                    <td style={{ padding: '1px 6px', textAlign: 'right', fontWeight: 'bold', color: '#a78bfa' }}>{hist.cost.toFixed(2)}</td>
                    <td style={{ padding: '1px 6px', textAlign: 'center', color: '#94a3b8' }}>{hist.godown}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#64748b', fontStyle: 'italic', fontSize: '12px' }}>
                ℹ️ Select a product from Product List above to view its Last 6 Saved Purchase Bills.
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* ── FOOTER ACTION BAR (ULTRA LOW PROFILE TO MAXIMIZE PRODUCT GRID HEIGHT) ── */}
      <div style={{ display: 'flex', gap: '4px', padding: '2px 8px', backgroundColor: '#0f172a', borderRadius: '4px', color: '#fff', alignItems: 'center', fontSize: '11px', overflowX: 'auto', minHeight: '26px', borderTop: '1px solid var(--color-border)' }}>
        <button style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '1px 6px', cursor: 'pointer', borderRadius: '2px', fontSize: '10px', fontWeight: '500', opacity: 0.85 }}>HELP</button>
        <button style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', padding: '1px 6px', cursor: 'pointer', borderRadius: '2px', fontSize: '10px' }}>SALE</button>
        <button style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', padding: '1px 6px', cursor: 'pointer', borderRadius: '2px', fontSize: '10px' }}>PURC</button>
        <button style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', padding: '1px 6px', cursor: 'pointer', borderRadius: '2px', fontSize: '10px' }}>SC</button>
        <button style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', padding: '1px 6px', cursor: 'pointer', borderRadius: '2px', fontSize: '10px' }}>PC</button>
        <button onClick={handleSaveTrigger} style={{ background: '#7f1d1d', color: '#f8fafc', border: '1px solid #991b1b', padding: '2px 12px', cursor: 'pointer', borderRadius: '2px', marginLeft: 'auto', fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.3px' }}>SAVE (End / Ctrl+S)</button>
      </div>
      
      {/* ── F7 PARTY SELECTION MODAL ── */}
      {showPartyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', width: '500px', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ backgroundColor: 'var(--color-primary)', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Select Sundry Creditor / Supplier</h2>
              <button onClick={() => setShowPartyModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            
            <div style={{ padding: '16px' }}>
              <input 
                ref={partySearchRef}
                type="text"
                value={partySearch}
                onChange={e => setPartySearch(e.target.value)}
                onKeyDown={handlePartyModalKeyDown}
                placeholder="Search party by name..."
                style={{ width: '100%', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '6px', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text-primary)', outline: 'none' }}
              />
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {filteredParties.map((party, index) => (
                <div 
                  key={party}
                  ref={index === partySelectedIndex ? (el => el?.scrollIntoView({ block: 'nearest' })) : null}
                  style={{ 
                    padding: '12px 24px', 
                    cursor: 'pointer', 
                    backgroundColor: index === partySelectedIndex ? 'var(--color-bg-hover)' : 'transparent',
                    borderLeft: index === partySelectedIndex ? '4px solid var(--color-primary)' : '4px solid transparent',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px'
                  }}
                  onClick={() => {
                    setPartyName(party)
                    setShowPartyModal(false)
                    setTimeout(() => partyInvRef.current?.focus(), 20)
                  }}
                >
                  {party}
                </div>
              ))}
              {filteredParties.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No parties found.</div>
              )}
            </div>
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', fontSize: '12px', textAlign: 'center' }}>
              Use ↑↓ arrows to navigate. Press <b>Enter</b> to select. Press <b>Esc</b> to close.
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCT SELECTION MODAL ── */}
      {showProductModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', width: '500px', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ backgroundColor: 'var(--color-primary)', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Select Product</h2>
              <button onClick={() => setShowProductModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            
            <div style={{ padding: '16px' }}>
              <input 
                ref={productSearchRef}
                type="text"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                onKeyDown={handleProductModalKeyDown}
                placeholder="Search product..."
                style={{ width: '100%', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', borderRadius: '6px', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text-primary)', outline: 'none' }}
              />
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {filteredProducts.map((prod, index) => (
                <div 
                  key={prod.name}
                  ref={index === productSelectedIndex ? (el => el?.scrollIntoView({ block: 'nearest' })) : null}
                  style={{ 
                    padding: '12px 24px', 
                    cursor: 'pointer', 
                    backgroundColor: index === productSelectedIndex ? 'var(--color-bg-hover)' : 'transparent',
                    borderLeft: index === productSelectedIndex ? '4px solid var(--color-primary)' : '4px solid transparent',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px'
                  }}
                  onClick={() => selectAndImportProduct(prod)}
                >
                  {prod.name}
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No products found.</div>
              )}
            </div>
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', fontSize: '12px', textAlign: 'center' }}>
              Use ↑↓ arrows to navigate. Press <b>Enter</b> to select. Press <b>Esc</b> to close.
            </div>
          </div>
        </div>
      )}

      {/* ── BATCH DETAIL WINDOW (PURCHASE DEAL) ── */}
      {showBatchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', width: '750px', boxShadow: 'var(--shadow-2xl)', display: 'flex', flexDirection: 'column', color: 'var(--color-text-primary)', fontFamily: 'monospace', fontSize: '14px', borderRadius: '8px', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid var(--color-border)' }}>
              BATCH DETAIL WINDOW
            </div>
            
            {/* Top Product Row */}
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold', fontSize: '16px', color: 'var(--color-primary)' }}>
              <span>{gridRows.find(r => r.id === activeRowId)?.product || ''} {gridRows.find(r => r.id === activeRowId)?.pack || ''}</span>
              <span>HSN/SAC: {gridRows.find(r => r.id === activeRowId)?.hsn || ''}</span>
            </div>

            {/* Middle Form Area */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div><span style={{ color: 'var(--color-text-secondary)' }}>Batch &nbsp;&nbsp;&nbsp;&nbsp;:</span> {gridRows.find(r => r.id === activeRowId)?.batch || ''}</div>
                <div><span style={{ color: 'var(--color-text-secondary)' }}>PurRate: &nbsp;&nbsp;&nbsp;&nbsp;</span> {gridRows.find(r => r.id === activeRowId)?.prate || '0.00'}</div>
                <div><span style={{ color: 'var(--color-text-secondary)' }}>Cost &nbsp;&nbsp;&nbsp;&nbsp;:</span> {parseFloat(gridRows.find(r => r.id === activeRowId)?.prate || '0').toFixed(3)}</div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Pur.Deal &nbsp;: </span>
                  <input 
                    id="modal-purdeal-qty-input"
                    value={gridRows.find(r => r.id === activeRowId)?.purDealQty || ''}
                    onChange={e => {
                      const idx = gridRows.findIndex(r => r.id === activeRowId)
                      if (idx !== -1) handleRowChange(idx, 'purDealQty', e.target.value)
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('modal-purdeal-free-input')?.focus() }}
                    style={{ width: '40px', background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-strong)', marginLeft: '8px', textAlign: 'right', padding: '2px 4px', borderRadius: '4px', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.select() }}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                  />
                  <span style={{ margin: '0 4px', color: 'var(--color-text-muted)' }}>+</span>
                  <input 
                    id="modal-purdeal-free-input"
                    value={gridRows.find(r => r.id === activeRowId)?.purDealFree || ''}
                    onChange={e => {
                      const idx = gridRows.findIndex(r => r.id === activeRowId)
                      if (idx !== -1) handleRowChange(idx, 'purDealFree', e.target.value)
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('modal-mrp-input')?.focus() }}
                    style={{ width: '40px', background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-strong)', textAlign: 'right', padding: '2px 4px', borderRadius: '4px', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.select() }}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                  />
                </div>
                <div><span style={{ color: 'var(--color-text-secondary)' }}>IGST% :</span> {gridRows.find(r => r.id === activeRowId)?.igst || '0.00'}</div>
                <div><span style={{ color: 'var(--color-text-secondary)' }}>CGST% :</span> {gridRows.find(r => r.id === activeRowId)?.cgst || '0.00'}</div>
                <div><span style={{ color: 'var(--color-text-secondary)' }}>SGST% :</span> {gridRows.find(r => r.id === activeRowId)?.sgst || '0.00'}</div>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }}></div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>M.R.P. &nbsp;&nbsp;&nbsp;: </span>
                  <input 
                    id="modal-mrp-input"
                    value={gridRows.find(r => r.id === activeRowId)?.mrp || ''}
                    onChange={e => {
                      const idx = gridRows.findIndex(r => r.id === activeRowId)
                      if (idx !== -1) handleRowChange(idx, 'mrp', e.target.value)
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('modal-rate-a-input')?.focus() }}
                    style={{ width: '80px', background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-strong)', marginLeft: '16px', textAlign: 'right', padding: '2px 4px', borderRadius: '4px', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.select() }}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Rate-A &nbsp;&nbsp;&nbsp;: </span>
                  <input 
                    id="modal-rate-a-input"
                    value={gridRows.find(r => r.id === activeRowId)?.rateA || ''}
                    onChange={e => {
                      const idx = gridRows.findIndex(r => r.id === activeRowId)
                      if (idx !== -1) handleRowChange(idx, 'rateA', e.target.value)
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('modal-rate-b-input')?.focus() }}
                    style={{ width: '80px', background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-strong)', marginLeft: '16px', textAlign: 'right', padding: '2px 4px', borderRadius: '4px', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.select() }}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Rate-B &nbsp;&nbsp;&nbsp;: </span>
                  <input 
                    id="modal-rate-b-input"
                    value={gridRows.find(r => r.id === activeRowId)?.rateB || ''}
                    onChange={e => {
                      const idx = gridRows.findIndex(r => r.id === activeRowId)
                      if (idx !== -1) handleRowChange(idx, 'rateB', e.target.value)
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('modal-rate-c-input')?.focus() }}
                    style={{ width: '80px', background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-strong)', marginLeft: '16px', textAlign: 'right', padding: '2px 4px', borderRadius: '4px', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.select() }}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Rate-C &nbsp;&nbsp;&nbsp;: </span>
                  <input 
                    id="modal-rate-c-input"
                    value={gridRows.find(r => r.id === activeRowId)?.rateC || ''}
                    onChange={e => {
                      const idx = gridRows.findIndex(r => r.id === activeRowId)
                      if (idx !== -1) handleRowChange(idx, 'rateC', e.target.value)
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('modal-sch-qty-input')?.focus() }}
                    style={{ width: '80px', background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-strong)', marginLeft: '16px', textAlign: 'right', padding: '2px 4px', borderRadius: '4px', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.select() }}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Sch sales &nbsp;: </span>
                  <input 
                    id="modal-sch-qty-input"
                    value={gridRows.find(r => r.id === activeRowId)?.schSalesQty || ''}
                    onChange={e => {
                      const idx = gridRows.findIndex(r => r.id === activeRowId)
                      if (idx !== -1) handleRowChange(idx, 'schSalesQty', e.target.value)
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('modal-sch-free-input')?.focus() }}
                    style={{ width: '40px', background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-strong)', marginLeft: '8px', textAlign: 'right', padding: '2px 4px', borderRadius: '4px', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.select() }}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                  />
                  <span style={{ margin: '0 4px', color: 'var(--color-text-muted)' }}>+</span>
                  <input 
                    id="modal-sch-free-input"
                    value={gridRows.find(r => r.id === activeRowId)?.schSalesFree || ''}
                    onChange={e => {
                      const idx = gridRows.findIndex(r => r.id === activeRowId)
                      if (idx !== -1) handleRowChange(idx, 'schSalesFree', e.target.value)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        setShowBatchModal(false)
                        // Jump to the next row's product input
                        setTimeout(() => {
                           const nextInput = document.getElementById(`product-input-${activeRowId + 1}`)
                           nextInput?.focus()
                        }, 10)
                      }
                    }}
                    style={{ width: '40px', background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-strong)', textAlign: 'right', padding: '2px 4px', borderRadius: '4px', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.select() }}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                  />
                </div>
              </div>

            </div>

            {/* Margin Table */}
            <div style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '16px', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', padding: '6px 12px', borderBottom: '1px solid var(--color-border)', fontWeight: '600' }}>
                <div style={{ flex: 1, textAlign: 'right' }}>COST WITH<br/>DEAL</div>
                <div style={{ flex: 1, textAlign: 'right' }}>SALES<br/>MARGIN%</div>
                <div style={{ flex: 1, textAlign: 'right' }}>COST W/O<br/>DEAL</div>
                <div style={{ flex: 1, textAlign: 'right' }}>SALES<br/>MARGIN%</div>
                <div style={{ flex: 2, textAlign: 'center' }}>&lt;---------- MRP V/S ----------&gt;<br/>PURC.% RATE-A% RATE-B% RATE-C%</div>
                <div style={{ flex: 1, textAlign: 'right' }}>SALE/PUR<br/>MARGIN%</div>
              </div>
              <div style={{ padding: '12px' }}>
                <div style={{ display: 'flex', color: 'var(--color-text-primary)' }}>
                  <div style={{ width: '40px', fontWeight: 'bold' }}>OLD</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>0.00</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>0.00</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>0.00</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>0.00</div>
                  <div style={{ flex: 2, textAlign: 'center' }}>0.00 &nbsp; 0.00 &nbsp; 0.00 &nbsp; 0.00</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>0.00</div>
                </div>
                <div style={{ display: 'flex', color: '#ef4444', marginTop: '8px' }}>
                  <div style={{ width: '40px', fontWeight: 'bold' }}>NEW</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>{parseFloat(gridRows.find(r => r.id === activeRowId)?.prate || '0').toFixed(2)}</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>-100.00</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>{parseFloat(gridRows.find(r => r.id === activeRowId)?.prate || '0').toFixed(2)}</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>-100.00</div>
                  <div style={{ flex: 2, textAlign: 'center' }}>-100.00</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>-100.00</div>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '6px', textAlign: 'center', backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 'bold' }}>
              F7-CHANGE HSN/SAC F10-Inclusive Rate
            </div>

          </div>
        </div>
      )}

      {/* ── SAVE BILL CONFIRMATION MODAL ── */}
      {showSaveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}
             onKeyDown={e => {
               if (e.key === 'Escape') {
                 e.preventDefault()
                 handleContinueEditing()
               }
             }}>
          <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '2px solid var(--color-primary)', borderRadius: '12px', width: '420px', padding: '24px', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', margin: '0 0 16px 0' }}>Save Purchase Bill?</h2>
            <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Invoice No:</span> <strong style={{ color: 'var(--color-primary)' }}>{billNo}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Party:</span> <strong>{partyName || 'Cash Purchase'}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Value of Goods:</span> <span>₹{totals.valueOfGoods.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total GST Amount:</span> <span>₹{backgroundGstAmount.toFixed(2)}</span></div>
              <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
                <span>Net Invoice Value:</span> <span style={{ color: '#10b981' }}>₹{invoiceValue.toFixed(2)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button 
                id="yes-save-btn"
                autoFocus
                onClick={confirmSaveBill} 
                onKeyDown={e => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Tab') {
                    e.preventDefault()
                    document.getElementById('no-continue-btn')?.focus()
                  }
                }}
                style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 24px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', outline: 'none' }}
                onFocus={e => e.target.style.boxShadow = '0 0 0 3px #10b98188'}
                onBlur={e => e.target.style.boxShadow = 'none'}>
                Yes, Save Bill (Enter)
              </button>
              <button 
                id="no-continue-btn"
                onClick={handleContinueEditing} 
                onKeyDown={e => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault()
                    document.getElementById('yes-save-btn')?.focus()
                  } else if (e.key === 'Enter') {
                    e.preventDefault()
                    handleContinueEditing()
                  }
                }}
                style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-strong)', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', outline: 'none' }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px #3b82f666' }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-border-strong)'; e.target.style.boxShadow = 'none' }}>
                No / Continue Editing (Esc/→)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SAVE SUCCESS TOAST MESSAGE ── */}
      {saveSuccessMessage && (
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#10b981', color: '#fff', padding: '14px 24px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)', fontWeight: 'bold', zIndex: 400, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>✓</span> {saveSuccessMessage}
        </div>
      )}

      {/* ── F3 BATCH SELECTION MODAL ── */}
      {showF3BatchModal && (() => {
        const currentProd = gridRows.find(r => r.id === activeRowId)?.product || '';
        const historyList = getAvailableBatchesForProduct(currentProd, gridRows, activeRowId);
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
               onKeyDown={e => {
                 if (e.key === 'Escape') setShowF3BatchModal(false);
                 if (e.key === 'ArrowDown') setF3SelectedIndex(prev => Math.min(prev + 1, historyList.length - 1));
                 if (e.key === 'ArrowUp') setF3SelectedIndex(prev => Math.max(prev - 1, 0));
                 if (e.key === 'Enter' && historyList[f3SelectedIndex]) {
                   const b = historyList[f3SelectedIndex];
                   const idx = gridRows.findIndex(r => r.id === activeRowId);
                   if (idx !== -1) {
                     const newRows = [...gridRows];
                     let row = { ...newRows[idx], batch: b.batch, expiry: b.expiry, prate: b.rate.toFixed(2), mrp: b.mrp.toFixed(2), dis: (b.disc || 0).toString() };
                     const igstVal = parseFloat(row.igst) || 0;
                     if (b.mrp > 0) {
                       row.rateA = ((b.mrp - (b.mrp * 0.20)) / (1 + (igstVal / 100))).toFixed(2);
                     }
                     newRows[idx] = row;
                     setGridRows(newRows);
                   }
                   setShowF3BatchModal(false);
                   setTimeout(() => document.getElementById('bottom-expiry-input')?.focus(), 10);
                 }
               }}
               tabIndex={-1} ref={el => el?.focus()}>
            <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '2px solid #3b82f6', borderRadius: '12px', width: '650px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column', outline: 'none' }}>
              <div style={{ padding: '12px 20px', backgroundColor: '#1e3a8a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #3b82f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ backgroundColor: '#3b82f6', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>F3</span>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Select Registered Batch — {currentProd}</h3>
                </div>
                <button onClick={() => setShowF3BatchModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px' }}>✕</button>
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border-strong)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '8px' }}>Batch No</th>
                      <th style={{ padding: '8px' }}>Expiry (MM/YY)</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>M.R.P.</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>P.Rate</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Available Qty</th>
                      <th style={{ padding: '8px' }}>Party / Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((hist, idx) => (
                      <tr key={idx}
                          ref={idx === f3SelectedIndex ? (el => el?.scrollIntoView({ block: 'nearest' })) : null}
                          onClick={() => {
                            const b = hist;
                            const rIdx = gridRows.findIndex(r => r.id === activeRowId);
                            if (rIdx !== -1) {
                              const newRows = [...gridRows];
                              let row = { ...newRows[rIdx], batch: b.batch, expiry: b.expiry, prate: b.rate.toFixed(2), mrp: b.mrp.toFixed(2), dis: (b.disc || 0).toString() };
                              const igstVal = parseFloat(row.igst) || 0;
                              if (b.mrp > 0) row.rateA = ((b.mrp - (b.mrp * 0.20)) / (1 + (igstVal / 100))).toFixed(2);
                              newRows[rIdx] = row;
                              setGridRows(newRows);
                            }
                            setShowF3BatchModal(false);
                            setTimeout(() => document.getElementById('bottom-expiry-input')?.focus(), 10);
                          }}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: idx === f3SelectedIndex ? '#3b82f633' : 'transparent',
                            borderLeft: idx === f3SelectedIndex ? '4px solid #3b82f6' : '4px solid transparent',
                            borderBottom: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                            fontWeight: idx === f3SelectedIndex ? 'bold' : 'normal',
                          }}>
                        <td style={{ padding: '10px 8px', color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>{hist.batch}</td>
                        <td style={{ padding: '10px 8px', color: '#34d399', fontWeight: 'bold' }}>{hist.expiry}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>₹{hist.mrp.toFixed(2)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#60a5fa' }}>₹{hist.rate.toFixed(2)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold' }}>{hist.qty}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--color-text-muted)', fontSize: '12px' }}>{hist.party}</td>
                      </tr>
                    ))}
                    {historyList.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No previous batches recorded for this product yet. Enter batch manually!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div style={{ padding: '12px', backgroundColor: 'var(--color-bg-elevated)', borderTop: '1px solid var(--color-border)', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Use <b>↑ ↓</b> arrows to navigate • Press <b>Enter</b> to populate selected batch • Press <b>Esc</b> to cancel
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  )
}

