import os

path = 'tsconfig.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('"noUnusedLocals": true', '"noUnusedLocals": false')
content = content.replace('"noUnusedParameters": true', '"noUnusedParameters": false')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated tsconfig.json")
