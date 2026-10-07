import os

# Fix api.ts
api_path = 'src/lib/api.ts'
with open(api_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will find "export interface Invoice {" and insert series_id
if "series_id?: string;" not in content:
    content = content.replace("export interface Invoice {\n  id: string;", "export interface Invoice {\n  id: string;\n  series_id?: string;")
    with open(api_path, 'w', encoding='utf-8') as f:
        f.write(content)

# Fix VoucherEntry.tsx
v_path = 'src/pages/finance/VoucherEntry.tsx'
with open(v_path, 'r', encoding='utf-8') as f:
    content = f.read()

if "series_id?: string;" not in content:
    content = content.replace("voucher_number: string;", "voucher_number: string;\n  series_id?: string;")
    with open(v_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed api.ts and VoucherEntry.tsx")
