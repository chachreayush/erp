import os

path = 'src/pages/sales/SalesBill.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "cursor: 'pointer' }}>F3 - Batch</button>"
replacement = "cursor: 'pointer' }}>F3 - Batch</button>\n                  <button onClick={(e) => { e.preventDefault(); fetchPendingSOs(); setShowSOModal(true); }} style={{ backgroundColor: '#1e293b', border: '1px solid #10b981', color: '#10b981', fontSize: '10px', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>F9 - Load SO</button>"

if 'F9 - Load SO' not in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added F9 button to shortcuts box")
else:
    print("F9 button already exists")
