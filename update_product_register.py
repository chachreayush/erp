import os

file_path = 'src/pages/stock/ProductRegister.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "else if (type.startsWith('stock-issue')) route = '/stock-issue?type=modify-bill';"
replacement = target + "\n    else if (type.startsWith('stock-shift')) route = '/stock-shift';"

if "route = '/stock-shift';" not in content:
    content = content.replace(target, replacement)
    
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated ProductRegister.tsx')
