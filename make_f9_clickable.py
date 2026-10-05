import os

path = 'src/pages/sales/SalesBill.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the F9 text a clickable button
f9_button_target = '<span className="mr-4 text-emerald-400 font-medium"><kbd className="bg-[var(--color-bg-muted)] px-1 rounded border border-emerald-500/50 text-emerald-300">F9</kbd> Load Order</span>'
f9_button_replacement = '<span className="mr-4 text-emerald-400 font-medium cursor-pointer hover:text-emerald-300 transition-colors" onClick={(e) => { e.preventDefault(); fetchPendingSOs(); setShowSOModal(true); }}><kbd className="bg-[var(--color-bg-muted)] px-1 rounded border border-emerald-500/50 text-emerald-300">F9</kbd> Load Order</span>'

if f9_button_target in content:
    content = content.replace(f9_button_target, f9_button_replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Made F9 button clickable")
else:
    print("F9 button target not found")
