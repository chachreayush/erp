import os

path = 'src/pages/sales/SalesBill.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Bring back billNo state and generation logic
state_injection = """
  // --- DOC-20 Document Series Engine ---
  const [availableSeries, setAvailableSeries] = useState<any[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [billNo, setBillNo] = useState(''); 
  const [billNoError, setBillNoError] = useState('');
  
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const { data } = await apiClient.get(`/api/billing/series`);
        let targetType = "sales_invoice";
        if (type.includes('challan')) targetType = "sales_challan";
        
        const filtered = data.filter((s: any) => s.invoice_type === targetType);
        setAvailableSeries(filtered);
        
        if (filtered.length > 0) {
          const lastSeries = localStorage.getItem(`lastSeriesId_${targetType}`);
          let activeSeries = filtered.find((s:any) => s.id === lastSeries) || filtered[0];
          setSelectedSeriesId(activeSeries.id);
          
          // Auto-fill the billNo input with the projected series number
          if (!billNo || billNo === 'Auto') {
             const projected = `${activeSeries.prefix || ''}${activeSeries.next_number}${activeSeries.suffix || ''}`;
             setBillNo(projected);
          }
        }
      } catch(e) {}
    };
    fetchSeries();
  }, [type]);

  // When user manually changes the series dropdown, update the projected billNo
  const handleSeriesChange = (newSeriesId: string) => {
    setSelectedSeriesId(newSeriesId);
    let targetType = "sales_invoice";
    if (type.includes('challan')) targetType = "sales_challan";
    localStorage.setItem(`lastSeriesId_${targetType}`, newSeriesId);
    
    const activeSeries = availableSeries.find(s => s.id === newSeriesId);
    if (activeSeries) {
      const projected = `${activeSeries.prefix || ''}${activeSeries.next_number}${activeSeries.suffix || ''}`;
      setBillNo(projected);
      setBillNoError('');
    }
  };
"""

content = content.replace(
    """  // --- DOC-20 Document Series Engine ---
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
          // Restore last selected series if it exists in the filtered list
          const lastSeries = localStorage.getItem(`lastSeriesId_${targetType}`);
          if (lastSeries && filtered.some((s:any) => s.id === lastSeries)) {
            setSelectedSeriesId(lastSeries);
          } else {
            setSelectedSeriesId(filtered[0].id);
          }
        }
      } catch(e) {}
    };
    fetchSeries();
  }, [type]);""",
    state_injection
)

# 2. Fix UI: Place the Series Dropdown AND the BillNo input next to each other
ui_target = """            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
              Series
            </label>
            <select
              value={selectedSeriesId}
              onChange={e => {
                setSelectedSeriesId(e.target.value);
                let targetType = "sales_invoice";
                if (type.includes('challan')) targetType = "sales_challan";
                localStorage.setItem(`lastSeriesId_${targetType}`, e.target.value);
              }}
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
            </select>"""

ui_replacement = """          <div style={{ flex: '1 1 120px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
              Series
            </label>
            <select
              value={selectedSeriesId}
              onChange={e => handleSeriesChange(e.target.value)}
              style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', height: '34px', color: '#38bdf8', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box' }}
            >
              {availableSeries.length === 0 ? <option value="">None</option> : availableSeries.map((s: any) => <option key={s.id} value={s.id}>{s.series_code}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
              Bill No {billNoError && <span style={{ color: '#ef4444', textTransform: 'none' }}>({billNoError})</span>}
            </label>
            <input 
              ref={billNoRef}
              type="text" 
              value={billNo} 
              onChange={e => { setBillNo(e.target.value); setBillNoError(''); }} 
              style={{ width: '100%', backgroundColor: '#0f172a', border: `1px solid ${billNoError ? '#ef4444' : '#334155'}`, borderRadius: '6px', padding: '6px 10px', fontSize: '13px', height: '34px', color: '#38bdf8', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = billNoError ? '#ef4444' : '#3b82f6'; e.target.select(); }}
              onBlur={e => { e.target.style.borderColor = '#334155' }}
            />"""

content = content.replace(ui_target, ui_replacement)

# Remove the "flex: '1 1 120px'" from the container around ui_target if I injected it directly.
# Let's do a safer regex replacement to ensure the structure holds.
import re
content = re.sub(r"<div style={{ flex: '1 1 120px' }}>\s*<div style={{ flex: '1 1 120px' }}>", r"<div style={{ flex: '1 1 120px' }}>", content)

# 3. Payload fix: pass the manually edited billNo to the backend
content = content.replace(
    "invoice_number: 'Auto',",
    "invoice_number: billNo.trim(),"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated SalesBill.tsx for manual BillNo editing")
