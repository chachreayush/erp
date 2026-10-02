import os

file_path = 'backend/api/stock.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add stock-shift to arrays
if '"stock-shift"' not in content:
    content = content.replace(
        'main_outward_types = ["sales-bill", "sales-challan", "purchase-return-debit", "purchase-return-challan", "purchase-return-bill", "stock-issue-entry"]',
        'main_outward_types = ["sales-bill", "sales-challan", "purchase-return-debit", "purchase-return-challan", "purchase-return-bill", "stock-issue-entry", "stock-shift"]'
    )
    content = content.replace(
        'brk_inward_types = ["brk-receive-bill", "brk-receive-challan"]',
        'brk_inward_types = ["brk-receive-bill", "brk-receive-challan", "stock-shift"]'
    )
    
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated stock.py')
