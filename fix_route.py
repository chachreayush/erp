import os

# Fix App.tsx
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()
app = app.replace('<Route path="/inventory" element={<ProtectedRoute><InventoryDashboard /></ProtectedRoute>} />', 
                  '<Route path="/inventory-dashboard" element={<ProtectedRoute><InventoryDashboard /></ProtectedRoute>} />')
with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

# Fix Header.tsx (if there is a link)
with open('src/components/Layout/Header.tsx', 'r', encoding='utf-8') as f:
    header = f.read()
header = header.replace("path: '/inventory'", "path: '/inventory-dashboard'")
with open('src/components/Layout/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(header)

print('Fixed routing')
