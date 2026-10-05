import os
import re

path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the double closing parenthesis
content = content.replace("    Enum as SAEnum   # A column that only accepts specific values\n)\n)", "    Enum as SAEnum   # A column that only accepts specific values\n)")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed double parenthesis")
