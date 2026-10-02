import os

file_path = "src/components/Layout/Header.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

if "{ label: 'Claims & Replenishment', type: 'claims' }" not in text:
    text = text.replace(
        "{ label: 'Current Stock', type: 'current-stock' }",
        "{ label: 'Current Stock', type: 'current-stock' },\n  { label: 'Claims & Replenishment', type: 'claims' }"
    )
    
if "'claims': [" not in text:
    text = text.replace(
        "  'current-stock': [",
        "  'claims': [\n    { label: 'Customer Intake', path: '/inventory/customer-claims' },\n    { label: 'Vendor Claims', path: '/inventory/vendor-claims' },\n    { label: 'Reorder Engine', path: '/inventory/replenishment' }\n  ],\n  'current-stock': ["
    )
    
with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Updated Header.tsx")
