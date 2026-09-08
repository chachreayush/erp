
with open('src/pages/sales/SalesBill.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    return {
      name: p.name || '',
      pack: p.packing || '10 UNIT','''

replacement = '''    return {
      id: p.id,
      name: p.name || '',
      pack: p.packing || '10 UNIT','''

content = content.replace(target, replacement)

with open('src/pages/sales/SalesBill.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed TS error!')

