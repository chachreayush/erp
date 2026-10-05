import os

path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'UniqueConstraint' not in content[:500]:
    content = content.replace(
        'from sqlalchemy import Column, String, Boolean, Integer, Numeric, DateTime, ForeignKey, Text',
        'from sqlalchemy import Column, String, Boolean, Integer, Numeric, DateTime, ForeignKey, Text, UniqueConstraint'
    )
    # If the first attempt didn't work (maybe different imports)
    if 'UniqueConstraint' not in content[:500]:
        content = content.replace(
            'from sqlalchemy import ',
            'from sqlalchemy import UniqueConstraint, '
        )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added UniqueConstraint import to models.py")
else:
    print("UniqueConstraint already imported")
