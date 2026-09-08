import re

with open('src/pages/sales/SalesBill.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the 5 initial rows with 15 initial rows
rows = ",\n      ".join([f"{{ ...initialRow, id: {i} }}" for i in range(1, 16)])
content = re.sub(
    r'const \[gridRows,\s*setGridRows\]\s*=\s*useState\(\[\s*\{[^\}]+\},\s*\{[^\}]+\},\s*\{[^\}]+\},\s*\{[^\}]+\},\s*\{[^\}]+\}\s*\]\)',
    f'const [gridRows, setGridRows] = useState([\n      {rows}\n    ])',
    content
)

with open('src/pages/sales/SalesBill.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
