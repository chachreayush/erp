import os

app_path = "src/App.tsx"
with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

routes_block = """          <Route path="/inventory" element={<ProtectedRoute><InventoryDashboard /></ProtectedRoute>} />
          <Route path="/inventory/customer-claims" element={<ProtectedRoute><CustomerClaims /></ProtectedRoute>} />
          <Route path="/inventory/vendor-claims" element={<ProtectedRoute><VendorClaims /></ProtectedRoute>} />
          <Route path="/inventory/replenishment" element={<ProtectedRoute><Replenishment /></ProtectedRoute>} />
"""

if "path=\"/inventory/customer-claims\"" not in content:
    # insert before <Route path="*" element={<Navigate to="/" replace />} />
    target = "<Route path=\"*\" element={<Navigate to=\"/\" replace />} />"
    if target in content:
        content = content.replace(target, routes_block + "          " + target)
    else:
        # Fallback to just before </Routes>
        routes_end = content.rfind("</Routes>")
        content = content[:routes_end] + routes_block + content[routes_end:]

    with open(app_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Routes injected.")
else:
    print("Routes already present.")
