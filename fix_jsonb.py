import os

path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("column_mapping = Column(JSON, nullable=False)", "column_mapping = Column(JSONB, nullable=False)")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed JSON to JSONB")
