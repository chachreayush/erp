import os

path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("from sqlalchemy import UniqueConstraint, (", "from sqlalchemy import UniqueConstraint,\n    Column,")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed models.py syntax")
