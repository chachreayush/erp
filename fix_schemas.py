import os

path = 'backend/schemas.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'import enum' not in content:
    content = 'import enum\n' + content
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
print('Fixed schemas.py')
