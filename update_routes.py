import os

# App.tsx
app_path = "src/App.tsx"
with open(app_path, "r", encoding="utf-8") as f:
    app = f.read()

app = app.replace("import CustomerClaims from './pages/inventory/CustomerClaims';", "")
app = app.replace("import VendorClaims from './pages/inventory/VendorClaims';", "")

if "import StockShiftVoucher from './pages/stock/StockShiftVoucher';" not in app:
    app = app.replace("import Replenishment from './pages/inventory/Replenishment';", 
                      "import Replenishment from './pages/inventory/Replenishment';\nimport StockShiftVoucher from './pages/stock/StockShiftVoucher';")

app = app.replace('<Route path="/inventory/customer-claims" element={<ProtectedRoute><CustomerClaims /></ProtectedRoute>} />\n', "")
app = app.replace('<Route path="/inventory/vendor-claims" element={<ProtectedRoute><VendorClaims /></ProtectedRoute>} />\n', "")

if '<Route path="/stock-shift" element={<ProtectedRoute><StockShiftVoucher /></ProtectedRoute>} />' not in app:
    app = app.replace('<Route path="/inventory/replenishment" element={<ProtectedRoute><Replenishment /></ProtectedRoute>} />',
                      '<Route path="/inventory/replenishment" element={<ProtectedRoute><Replenishment /></ProtectedRoute>} />\n          <Route path="/stock-shift" element={<ProtectedRoute><StockShiftVoucher /></ProtectedRoute>} />')

with open(app_path, "w", encoding="utf-8") as f:
    f.write(app)
print("Updated App.tsx")

# Header.tsx
header_path = "src/components/Layout/Header.tsx"
with open(header_path, "r", encoding="utf-8") as f:
    header = f.read()

# Replace inventory SubItemsMap for 'claims'
target = "  'claims': [\n    { label: 'Customer Intake', path: '/inventory/customer-claims' },\n    { label: 'Vendor Claims', path: '/inventory/vendor-claims' },\n    { label: 'Reorder Engine', path: '/inventory/replenishment' }\n  ],"
replacement = "  'claims': [\n    { label: 'Reorder Engine', path: '/inventory/replenishment' },\n    { label: 'Internal Expiry Shift', path: '/stock-shift' }\n  ],"

header = header.replace(target, replacement)

with open(header_path, "w", encoding="utf-8") as f:
    f.write(header)
print("Updated Header.tsx")
