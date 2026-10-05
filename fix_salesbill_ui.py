import os

path = 'src/pages/sales/SalesBill.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target_ui = """        {/* Entry No */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '95px', flexShrink: 0 }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Entry No.
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
              fontWeight: '700', 
              outline: 'none',
              transition: 'border-color 0.2s',
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
          />
        </div>"""

replacement_ui = """        {/* Series Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '95px', flexShrink: 0 }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Series
          </label>
          <select 
            value={selectedSeriesId}
            onChange={e => handleSeriesChange(e.target.value)}
            style={{ 
              width: '100%', 
              backgroundColor: '#0f172a', 
              border: '1px solid #334155', 
              borderRadius: '6px', 
              padding: '6px 10px', 
              fontSize: '13px', 
              height: '34px', 
              color: '#38bdf8', 
              fontWeight: '700', 
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
          >
            {availableSeries.length === 0 ? <option value="">None</option> : availableSeries.map((s: any) => <option key={s.id} value={s.id}>{s.series_code}</option>)}
          </select>
        </div>

        {/* Entry No */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '105px', flexShrink: 0 }}>
          <label style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Entry No.
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
              fontWeight: '700', 
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={e => { e.target.style.borderColor = billNoError ? '#ef4444' : '#3b82f6'; e.target.select(); }}
            onBlur={e => { e.target.style.borderColor = '#334155' }}
          />
        </div>"""

if target_ui in content:
    content = content.replace(target_ui, replacement_ui)
    print("Replaced UI target exactly.")
else:
    print("UI target not found! Using regex block replace...")
    import re
    # Fallback if whitespace differs
    pattern = r"\{\/\*\s*Entry No\s*\*\/\}.*?<\/div>"
    content = re.sub(pattern, replacement_ui, content, flags=re.DOTALL | re.IGNORECASE, count=1)
    
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated SalesBill.tsx UI layout")
