import re

files = [
    'src/pages/sales/SalesBill.tsx',
    'src/pages/purchase/PurchaseBill.tsx',
    'src/pages/returns/SalesReturnBill.tsx',
    'src/pages/returns/PurchaseReturnBill.tsx',
    'src/pages/brk/BrkIssueBill.tsx',
    'src/pages/brk/BrkReceiveBill.tsx',
    'src/pages/sales/Billing.tsx'
]

for file in files:
    import os
    path = os.path.join('C:\\Users\\DELL\\OneDrive\\Desktop\\erp2', file)
    if not os.path.exists(path):
        continue
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # We will remove the alert from validateMandatoryHeader entirely, but wait, the user needs to know.
    # Instead, let's remove the validateMandatoryHeader call from the onFocus events.
    # The onKeyDown already handles Enter/Tab navigation correctly without an infinite loop.
    
    # Remove from onFocus in the inputs
    content = re.sub(r'if \(\!validateMandatoryHeader\(\)\) return;?\n\s*', '', content)
    content = re.sub(r'if \(\!partyName\.trim\(\)\) \{\s*validateMandatoryHeader\(\);\s*\}', '', content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f'Updated {file}')
