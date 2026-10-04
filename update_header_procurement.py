import os

path = 'src/components/Layout/Header.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

menu_items = """                <Link to="/po" className="block px-4 py-2 hover:bg-[var(--color-bg-subtle)] text-[var(--color-text)] no-underline">Purchase Order</Link>
                <Link to="/grn" className="block px-4 py-2 hover:bg-[var(--color-bg-subtle)] text-[var(--color-text)] no-underline">Goods Receipt Note (Inward)</Link>
                <Link to="/vendor-complaints" className="block px-4 py-2 hover:bg-[var(--color-bg-subtle)] text-[var(--color-text)] no-underline">Vendor Complaints</Link>"""

if 'to="/po"' not in content:
    content = content.replace(
        '<Link to="/purchase" className="block px-4 py-2 hover:bg-[var(--color-bg-subtle)] text-[var(--color-text)] no-underline">Purchase Bill</Link>',
        menu_items + '\n                <Link to="/purchase" className="block px-4 py-2 hover:bg-[var(--color-bg-subtle)] text-[var(--color-text)] no-underline">Purchase Bill</Link>'
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added menu items to Header.tsx")
else:
    print("Menu items already in Header.tsx")
