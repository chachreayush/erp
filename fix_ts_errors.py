import os
import re

# Fix 1: Add apiClient to SalesBill.tsx imports and series_id to InvoiceCreatePayload
lib_api_path = 'src/lib/api.ts'
with open(lib_api_path, 'r', encoding='utf-8') as f:
    api_content = f.read()

if "series_id?: string;" not in api_content:
    api_content = api_content.replace(
        "organization_id?: string;\n}",
        "organization_id?: string;\n  series_id?: string;\n}"
    )
    with open(lib_api_path, 'w', encoding='utf-8') as f:
        f.write(api_content)
    print("Added series_id to lib/api.ts")

sales_bill_path = 'src/pages/sales/SalesBill.tsx'
with open(sales_bill_path, 'r', encoding='utf-8') as f:
    sb_content = f.read()

if "apiClient" not in sb_content.split('\n')[0]:
    sb_content = sb_content.replace(
        "import { apiSaveDraft, apiCreateInvoice, apiGetInvoice, InvoiceCreatePayload } from '../../lib/api';",
        "import apiClient, { apiSaveDraft, apiCreateInvoice, apiGetInvoice, InvoiceCreatePayload } from '../../lib/api';"
    )
    with open(sales_bill_path, 'w', encoding='utf-8') as f:
        f.write(sb_content)
    print("Added apiClient import to SalesBill.tsx")

# Fix 2: Add series_id to Voucher type in VoucherEntry.tsx
voucher_path = 'src/pages/finance/VoucherEntry.tsx'
with open(voucher_path, 'r', encoding='utf-8') as f:
    v_content = f.read()

if "series_id?: string;" not in v_content:
    v_content = v_content.replace(
        "voucher_number: string;",
        "voucher_number: string;\n  series_id?: string;"
    )
    with open(voucher_path, 'w', encoding='utf-8') as f:
        f.write(v_content)
    print("Added series_id to Voucher type in VoucherEntry.tsx")

