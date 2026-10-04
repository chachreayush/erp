import os

path = 'backend/api/stock.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add "grn" to main_inward_types
if '"grn"' not in content:
    content = content.replace(
        'main_inward_types = ["purchase-bill"',
        'main_inward_types = ["grn", "purchase-bill"'
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added grn to main_inward_types")
else:
    print("grn already in main_inward_types")
