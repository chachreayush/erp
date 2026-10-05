import os
import re

path = 'src/pages/finance/VoucherEntry.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State for DocumentSeries
state_injection = """  // --- DOC-24 Document Series Integration ---
  const [availableSeries, setAvailableSeries] = useState<any[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [voucherNoError, setVoucherNoError] = useState('');
  
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const { data } = await apiClient.get(`/api/billing/series`);
        const targetType = type ? type.toLowerCase() : 'payment';
        const filtered = data.filter((s: any) => s.invoice_type === targetType);
        setAvailableSeries(filtered);
        
        if (filtered.length > 0) {
          const lastSeries = localStorage.getItem(`lastVoucherSeriesId_${targetType}`);
          let activeSeries = filtered.find((s:any) => s.id === lastSeries) || filtered[0];
          setSelectedSeriesId(activeSeries.id);
          
          if (!voucherNumber || voucherNumber === '') {
             const projected = `${activeSeries.prefix || ''}${activeSeries.next_number}${activeSeries.suffix || ''}`;
             setVoucherNumber(projected);
          }
        }
      } catch(e) {}
    };
    fetchSeries();
  }, [type]);

  const handleSeriesChange = (newSeriesId: string) => {
    setSelectedSeriesId(newSeriesId);
    const targetType = type ? type.toLowerCase() : 'payment';
    localStorage.setItem(`lastVoucherSeriesId_${targetType}`, newSeriesId);
    
    const activeSeries = availableSeries.find((s: any) => s.id === newSeriesId);
    if (activeSeries) {
      const projected = `${activeSeries.prefix || ''}${activeSeries.next_number}${activeSeries.suffix || ''}`;
      setVoucherNumber(projected);
      setVoucherNoError('');
    }
  };
"""

if "DOC-24 Document Series Integration" not in content:
    # We will inject this near `const [ledgers, setLedgers] = useState<Ledger[]>([]);`
    # Also we need to import apiClient.
    if "import apiClient" not in content:
        content = content.replace("import { apiGetLedgers", "import apiClient from '../../lib/api';\nimport { apiGetLedgers")

    content = content.replace(
        "const [ledgers, setLedgers] = useState<Ledger[]>([]);",
        "const [ledgers, setLedgers] = useState<Ledger[]>([]);\n" + state_injection
    )

# 2. Modify the API call to include series_id
if "series_id: selectedSeriesId" not in content:
    content = content.replace(
        "voucher_number: voucherNumber,",
        "voucher_number: voucherNumber,\n          series_id: selectedSeriesId,"
    )

# 3. Replace the Voucher No read-only input
old_ui = """        <div style={styles.topBar}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Voucher No</label>
            <input style={styles.input} value={voucherNumber} readOnly />
          </div>"""

new_ui = """        <div style={styles.topBar}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>Series</label>
              <select 
                value={selectedSeriesId}
                onChange={e => handleSeriesChange(e.target.value)}
                style={{ ...styles.input, backgroundColor: '#0f172a', borderColor: '#334155', color: '#38bdf8', fontWeight: 'bold', minWidth: '100px' }}
              >
                {availableSeries.length === 0 ? <option value="">None</option> : availableSeries.map((s: any) => <option key={s.id} value={s.id}>{s.series_code}</option>)}
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>
                Voucher No {voucherNoError && <span style={{ color: '#ef4444', fontWeight: 'normal' }}>({voucherNoError})</span>}
              </label>
              <input 
                style={{ ...styles.input, backgroundColor: '#0f172a', borderColor: voucherNoError ? '#ef4444' : '#334155', color: '#38bdf8', fontWeight: 'bold' }} 
                value={voucherNumber} 
                onChange={e => { setVoucherNumber(e.target.value); setVoucherNoError(''); }} 
              />
            </div>
          </div>"""

if "flex: 1" not in content and "handleSeriesChange" in content:
    content = content.replace(old_ui, new_ui)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated VoucherEntry.tsx successfully")
