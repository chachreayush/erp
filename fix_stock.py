with open('backend/api/sales.py', 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(
    r'if not is_addition and batch_stock < item\.quantity:\s+raise HTTPException\(\s+status_code=400,\s+detail=f\"Insufficient stock[^\"]+\"\s+\)',
    '',
    content
)

with open('backend/api/sales.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Regex removed stock block!')
