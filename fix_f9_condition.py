import os

path = 'src/pages/sales/SalesBill.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove type.includes('challan') from F9 keydown
content = content.replace(
    "if (e.key === 'F9' && type.includes('challan')) {",
    "if (e.key === 'F9') {"
)

# Remove type.includes('challan') from Ribbon UI
content = content.replace(
    "{type.includes('challan') && <span className=\"mr-4 text-emerald-400 font-medium\"><kbd className=\"bg-[var(--color-bg-muted)] px-1 rounded border border-emerald-500/50 text-emerald-300\">F9</kbd> Load Order</span>}",
    "<span className=\"mr-4 text-emerald-400 font-medium\"><kbd className=\"bg-[var(--color-bg-muted)] px-1 rounded border border-emerald-500/50 text-emerald-300\">F9</kbd> Load Order</span>"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed challan-only restriction from F9")
