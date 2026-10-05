import os

path = 'src/pages/sales/SalesBill.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State for Series Selection
series_state_injection = """
  // --- DOC-20 Document Series Engine ---
  const [availableSeries, setAvailableSeries] = useState<any[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [billNo, setBillNo] = useState('Auto'); // Will be generated on backend
  
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const { data } = await apiClient.get(`/api/billing/series`);
        // Filter by invoice_type natively in JS for flexibility
        let targetType = "sales_invoice";
        if (type.includes('challan')) targetType = "sales_challan";
        
        const filtered = data.filter((s: any) => s.invoice_type === targetType);
        setAvailableSeries(filtered);
        if (filtered.length > 0) {
          setSelectedSeriesId(filtered[0].id);
        }
      } catch(e) {}
    };
    fetchSeries();
  }, [type]);

  // --- DOC-20 Consolidation Workbench Data Loader ---
  useEffect(() => {
    const isConsolidation = searchParams.get('from_consolidation');
    if (isConsolidation) {
      const dataStr = sessionStorage.getItem('consolidation_data');
      if (dataStr) {
        try {
          const data = JSON.parse(dataStr);
          if (data.party) setPartyName(data.party);
          if (data.items && Array.isArray(data.items)) {
            const newRows = [...data.items];
            while (newRows.length < 8) {
              newRows.push({
                id: Math.random().toString(36).substring(7),
                product: '', batch: '', expiry: '', qty: '', free: '', mrp: '', rate: '', dis: ''
              });
            }
            setGridRows(newRows);
          }
          // Clear it so it doesn't leak
          sessionStorage.removeItem('consolidation_data');
        } catch (e) {}
      }
    }
  }, [searchParams]);
"""

# Replace old billNo state
if 'DOC-20 Document Series Engine' not in content:
    content = content.replace(
        "const defaultBillNo = baseType === 'challan' ? 'SC0001' : 'S0001';",
        series_state_injection
    )
    content = content.replace(
        "const billNoKey = baseType === 'challan' ? 'lastSalesChallanNo' : 'lastSalesBillNo';",
        ""
    )
    content = content.replace(
        "const [billNo, setBillNo] = useState(() => localStorage.getItem(billNoKey) || defaultBillNo);",
        ""
    )

# 2. Modify API Payload to include series_id
if 'series_id: selectedSeriesId' not in content:
    content = content.replace(
        "invoice_number: billNo.trim(),",
        "invoice_number: 'Auto',\n      series_id: selectedSeriesId,"
    )
    content = content.replace(
        "invoice_number: billNo || 'P0001',",
        "invoice_number: 'Auto',"
    )
    # Remove the frontend auto-increment local storage logic
    content = content.replace(
        "const nextBillNo = incrementSeries(billNo)\n      setBillNo(nextBillNo)\n      localStorage.setItem(billNoKey, nextBillNo)",
        ""
    )

# 3. Replace the text input with a select dropdown for series
select_ui = """
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
              Series
            </label>
            <select
              value={selectedSeriesId}
              onChange={e => setSelectedSeriesId(e.target.value)}
              style={{
                width: '100%', 
                backgroundColor: '#0f172a', 
                border: '1px solid #334155', 
                borderRadius: '6px', 
                padding: '6px 10px', 
                fontSize: '13px', 
                height: '34px', 
                color: '#38bdf8', 
                fontWeight: 'bold', 
                outline: 'none', 
                boxSizing: 'border-box'
              }}
            >
              {availableSeries.length === 0 ? (
                <option value="">No Series Configured</option>
              ) : (
                availableSeries.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.series_code} ({s.prefix}..)</option>
                ))
              )}
            </select>
"""

content = content.replace(
    """            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
              Bill No
              {billNoError && <span style={{ color: '#ef4444', marginLeft: '4px', textTransform: 'none' }}>({billNoError})</span>}
            </label>
            <input 
              ref={billNoRef} 
              type="text" 
              value={billNo} 
              onChange={e => { setBillNo(e.target.value); setBillNoError(''); }} 
              onKeyDown={handleBillNoKeyDown}
              style={{ 
                width: '100%', 
                backgroundColor: '#0f172a', 
                border: `1px solid ${billNoError ? '#ef4444' : '#334155'}`, 
                borderRadius: '6px', 
                padding: '6px 10px', 
                fontSize: '13px', 
                height: '34px', 
                color: '#38bdf8', 
                fontWeight: 'bold', 
                outline: 'none', 
                boxSizing: 'border-box' 
              }}
              onFocus={e => { e.target.style.borderColor = billNoError ? '#ef4444' : '#3b82f6'; e.target.select(); }}
              onBlur={e => {
                const savedBills = JSON.parse(localStorage.getItem('savedSalesBills') || '[]')
                if (savedBills.some((b: any) => (b.recordType || 'bill') === baseType && b.entryNo.toLowerCase() === e.target.value.trim().toLowerCase())) {
                  setBillNoError('Exists')
                  e.target.style.borderColor = '#ef4444'
                } else {
                  setBillNoError('')
                  e.target.style.borderColor = '#334155'
                }
              }}
            />""",
    select_ui
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated SalesBill.tsx UI for Series Selection")
