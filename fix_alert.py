with open('src/pages/finance/VoucherEntry.tsx', 'r', encoding='utf-8') as f:
    code = f.read()
code = code.replace("alert('Error saving voucher');", "alert('Error: ' + (err.response?.data?.detail || err.message || 'Unknown error'));")
with open('src/pages/finance/VoucherEntry.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
