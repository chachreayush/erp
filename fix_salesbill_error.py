import os
import re

path = 'src/pages/sales/SalesBill.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the second occurrence or just find "const [billNoError, setBillNoError] = useState('')" 
# (without semicolon) and remove it.
content = content.replace("const [billNoError, setBillNoError] = useState('')\n", "")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed duplicate billNoError declaration")
