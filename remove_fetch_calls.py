import os
import re

path = 'src/pages/finance/VoucherEntry.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("fetchNextVoucherNo();", "// fetchNextVoucherNo();")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed old apiGetNextVoucherNumber fetches")
