import os
import re

path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Instead of exact multi-line, let's use regex to replace everything between igst_percent and mrp
new_content = re.sub(
    r'(igst_percent = Column\(Numeric\(5, 2\), nullable=False, default=0\)).*?(# 💰 Pricing 💰)',
    r'\1\n    \2',
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Regex replace applied")
