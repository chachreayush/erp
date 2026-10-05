import os

path = 'backend/schemas.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "fiscal_year_id: Optional[UUID] = None\n    ref_invoice_id: Optional[UUID] = None"
replacement = "fiscal_year_id: Optional[UUID] = None\n    ref_invoice_id: Optional[UUID] = None\n    series_id: Optional[UUID] = None"

if "series_id: Optional[UUID] = None" not in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated schemas.py successfully")
else:
    print("Already updated")
