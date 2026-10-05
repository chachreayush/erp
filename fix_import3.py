import os
import re

path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the broken import block
broken = """from sqlalchemy import UniqueConstraint,
    Column,
    Column,          # Defines a table column
    String,          # Text column (variable length)
    Boolean,         # True/False column
    DateTime,        # Date + time column
    ForeignKey,      # Links one table to another (relationship)
    Text,            # Long text column (for descriptions)
    Enum as SAEnum   # A column that only accepts specific values"""

fixed = """from sqlalchemy import (
    UniqueConstraint,
    Column,          # Defines a table column
    String,          # Text column (variable length)
    Boolean,         # True/False column
    DateTime,        # Date + time column
    ForeignKey,      # Links one table to another (relationship)
    Text,            # Long text column (for descriptions)
    Enum as SAEnum   # A column that only accepts specific values
)"""

content = content.replace(broken, fixed)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed models.py imports properly")
