import os

path = 'src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

routes = """
        <Route path="po" element={<PurchaseOrderMaster />} />
        <Route path="grn" element={<GoodsReceipt />} />
        <Route path="vendor-complaints" element={<VendorComplaints />} />
"""

if '<Route path="po"' not in content:
    content = content.replace(
        '<Route path="purchase"         element={<PurchaseBill />} />',
        '<Route path="purchase"         element={<PurchaseBill />} />' + routes
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Force injected routes")
else:
    print("Routes exist")
