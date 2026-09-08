import re

with open('src/pages/sales/SalesBill.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

rows = ",\n      ".join([f"{{ ...initialRow, id: {i} }}" for i in range(1, 16)])

old_str = '''  const [gridRows, setGridRows] = useState([
    { ...initialRow, id: 1 },
    { ...initialRow, id: 2 },
    { ...initialRow, id: 3 },
    { ...initialRow, id: 4 },
    { ...initialRow, id: 5 },
  ])'''

# try to replace using string replace instead of regex to avoid whitespace issues
new_content = re.sub(
    r'const \[gridRows,\s*setGridRows\]\s*=\s*useState\(\[\s*\{[^\}]+\},\s*\{[^\}]+\},\s*\{[^\}]+\},\s*\{[^\}]+\},\s*\{[^\}]+\},?\s*\]\)',
    f'const [gridRows, setGridRows] = useState([\n      {rows}\n    ])',
    content
)

with open('src/pages/sales/SalesBill.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
