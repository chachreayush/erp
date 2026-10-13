import os
import glob
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

pages = [
    'src/pages/sales/SalesOrderMaster.tsx',
    'src/pages/sales/OrderApprovalDashboard.tsx',
    'src/pages/sales/DispatchManager.tsx',
    'src/pages/sales/BillingConsolidation.tsx',
    'src/pages/procurement/PurchaseOrderMaster.tsx',
    'src/pages/procurement/GoodsReceipt.tsx',
    'src/pages/procurement/VendorComplaints.tsx',
    'src/pages/inventory/Replenishment.tsx',
    'src/pages/stock/StockShiftVoucher.tsx',
    'src/pages/master/PrincipalMaster.tsx',
    'src/pages/master/PartyMaster.tsx',
    'src/pages/master/LedgerGroupMaster.tsx',
    'src/pages/master/DocumentSeriesMaster.tsx',
    'src/pages/master/SchemeMaster.tsx',
    'src/pages/master/PricingMaster.tsx',
    'src/pages/master/WarehouseMaster.tsx',
    'src/pages/master/TransportMaster.tsx',
    'src/pages/master/ErrorEntries.tsx',
    'src/pages/finance/ExpenseManagement.tsx',
    'src/pages/finance/FixedAssets.tsx',
    'src/pages/finance/BankReconciliation.tsx',
    'src/pages/gst/GstReports.tsx',
    'src/pages/bulletin/BulletinBoard.tsx'
]

print("PAGE DETAILED CAPABILITY AUDIT:")
for p in pages:
    if not os.path.exists(p):
        print(f"MISSING FILE: {p}")
        continue
    with open(p, 'r', encoding='utf-8', errors='ignore') as f:
        code = f.read()
    
    # check fetch/api endpoints
    endpoints = re.findall(r'(/api/[a-zA-Z0-9_\-\/]+)', code)
    # check imports from lib/api
    api_imports = re.findall(r'import\s+.*?\{([^}]+)\}\s+from\s+[\'\"].*api[\'\"]', code)
    # check buttons/actions
    buttons = re.findall(r'<button[^>]*>([^<]+)</button>', code)
    # check inputs
    inputs = len(re.findall(r'<input|<select|<textarea', code))
    
    print(f"\n--- {p} ({len(code.splitlines())} lines) ---")
    print(f"  API Calls: {list(set(endpoints))[:5]}")
    if api_imports:
        print(f"  API Imports: {api_imports[0].strip()[:60]}")
    print(f"  Inputs/Fields: {inputs}")
    print(f"  Action Buttons: {[b.strip() for b in buttons if b.strip()][:5]}")
