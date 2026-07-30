import re

file_path = "src/pages/master/MasterPage.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add imports
import_statement = """import { 
  apiGetLedgers, apiCreateLedger, apiUpdateLedger, apiDeleteLedger,
  apiGetSalts, apiCreateSalt, apiUpdateSalt, apiDeleteSalt,
  apiGetManufacturers, apiCreateManufacturer, apiUpdateManufacturer, apiDeleteManufacturer,
  apiGetHSNCodes, apiCreateHSNCode, apiUpdateHSNCode, apiDeleteHSNCode,
  apiGetStateCodes, apiCreateStateCode, apiUpdateStateCode, apiDeleteStateCode
} from '../../lib/api'
"""
content = content.replace("import { Modal } from '../../components/ui/Modal'", "import { Modal } from '../../components/ui/Modal'\n" + import_statement)

# 2. Replace initial mock data with empty arrays
content = re.sub(r'const \[ledgers, setLedgers\] = useState<LedgerItem\[\]>\(\[\s*{.*?\]\)', 'const [ledgers, setLedgers] = useState<LedgerItem[]>([])', content, flags=re.DOTALL)
content = re.sub(r'const \[salts, setSalts\] = useState<SaltItem\[\]>\(\[\s*{.*?\]\)', 'const [salts, setSalts] = useState<SaltItem[]>([])', content, flags=re.DOTALL)
content = re.sub(r'const \[companies, setCompanies\] = useState<CompanyItem\[\]>\(\[\s*{.*?\]\)', 'const [companies, setCompanies] = useState<CompanyItem[]>([])', content, flags=re.DOTALL)
content = re.sub(r'const \[hsns, setHsns\] = useState<HSNItem\[\]>\(\[\s*{.*?\]\)', 'const [hsns, setHsns] = useState<HSNItem[]>([])', content, flags=re.DOTALL)
content = re.sub(r'const \[states, setStates\] = useState<StateItem\[\]>\(\[\s*{.*?\]\)', 'const [states, setStates] = useState<StateItem[]>([])', content, flags=re.DOTALL)
content = re.sub(r'const \[balances, setBalances\] = useState<BalanceItem\[\]>\(\[\s*{.*?\]\)', 'const [balances, setBalances] = useState<BalanceItem[]>([])', content, flags=re.DOTALL)

# 3. Add loadData function
load_data_fn = """
  const loadData = async () => {
    try {
      const [l, s, m, h, st] = await Promise.all([
        apiGetLedgers(),
        apiGetSalts(),
        apiGetManufacturers(),
        apiGetHSNCodes(),
        apiGetStateCodes()
      ])
      
      setLedgers(l.map(x => ({ id: x.id as string, name: x.name, group: x.group_name, mobile: x.mobile || '', state: x.state || '', balance: x.opening_balance, type: x.op_type as 'Dr'|'Cr' })))
      setSalts(s.map(x => ({ id: x.id as string, name: x.formula, indications: x.indications || '', dosage: x.dosage || '', sideEffects: x.side_effects || '', precautions: x.precautions || '', labels: x.labels || '' })))
      setCompanies(m.map(x => ({ id: x.id as string, name: x.name, code: x.short_code || '', discount: x.default_discount, supplier: x.supplier || '' })))
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
"""
content = content.replace("const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create')", "const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create')\n" + load_data_fn)


# 4. Replace handleSaveForm
old_save_form = """  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault()
    const isEdit = !!editingId
    const targetId = isEdit ? editingId : Date.now().toString()
    const savedItem = { ...formData, id: targetId }

    if (activeTab === 'ledger') {
      setLedgers(isEdit ? ledgers.map(i => i.id === targetId ? savedItem : i) : [savedItem, ...ledgers])
    } else if (activeTab === 'salt') {
      setSalts(isEdit ? salts.map(i => i.id === targetId ? savedItem : i) : [savedItem, ...salts])
    } else if (activeTab === 'company') {
      setCompanies(isEdit ? companies.map(i => i.id === targetId ? savedItem : i) : [savedItem, ...companies])
    } else if (activeTab === 'hsn') {
      const igst = Number(formData.igst) || 0
      savedItem.cgst = igst / 2
      savedItem.sgst = igst / 2
      setHsns(isEdit ? hsns.map(i => i.id === targetId ? savedItem : i) : [savedItem, ...hsns])
    } else if (activeTab === 'state') {
      setStates(isEdit ? states.map(i => i.id === targetId ? savedItem : i) : [savedItem, ...states])
    } else if (activeTab === 'balances') {
      setBalances(isEdit ? balances.map(i => i.id === targetId ? savedItem : i) : [savedItem, ...balances])
    }
    
    if (modalMode === 'create') {
      handleOpenAddModal()
    } else {
      setModalMode('view')
      setFormData(savedItem)
    }
  }"""

new_save_form = """  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    const isEdit = !!editingId
    
    try {
      if (activeTab === 'ledger') {
        const payload: any = { name: formData.name, group_name: formData.group, mobile: formData.mobile, state: formData.state, opening_balance: Number(formData.balance)||0, op_type: formData.type||'Dr', closing_balance: Number(formData.balance)||0, cl_type: formData.type||'Dr' }
        if (isEdit) await apiUpdateLedger(editingId as string, payload)
        else await apiCreateLedger(payload)
      } else if (activeTab === 'salt') {
        const payload: any = { formula: formData.name, indications: formData.indications, dosage: formData.dosage, side_effects: formData.sideEffects, precautions: formData.precautions, labels: formData.labels }
        if (isEdit) await apiUpdateSalt(editingId as string, payload)
        else await apiCreateSalt(payload)
      } else if (activeTab === 'company') {
        const payload: any = { name: formData.name, short_code: formData.code, default_discount: Number(formData.discount)||0, supplier: formData.supplier }
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
  }"""
content = content.replace(old_save_form, new_save_form)


# 5. Replace handleDeleteItem
old_delete_item = """  const handleDeleteItem = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this master record?")) return
    if (activeTab === 'ledger') setLedgers(ledgers.filter(i => i.id !== id))
    else if (activeTab === 'salt') setSalts(salts.filter(i => i.id !== id))
    else if (activeTab === 'company') setCompanies(companies.filter(i => i.id !== id))
    else if (activeTab === 'hsn') setHsns(hsns.filter(i => i.id !== id))
    else if (activeTab === 'state') setStates(states.filter(i => i.id !== id))
    else if (activeTab === 'balances') setBalances(balances.filter(i => i.id !== id))
  }"""

new_delete_item = """  const handleDeleteItem = async (id: string) => {
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
  }"""
content = content.replace(old_delete_item, new_delete_item)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done refactoring MasterPage.tsx")
