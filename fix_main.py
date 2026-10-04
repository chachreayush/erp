import os

path = 'backend/main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(r'\n', '\n')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed main.py')
