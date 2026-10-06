import os

path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("raw_data = Column(JSON, nullable=True)", "raw_data = Column(JSONB, nullable=True)")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed JSON to JSONB for raw_data")
