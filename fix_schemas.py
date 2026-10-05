import os

path = 'backend/schemas.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("series_id: Optional[UUID] = None.0", "series_id: Optional[UUID] = None")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed schemas.py syntax")
