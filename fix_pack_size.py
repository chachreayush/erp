import os

path = 'src/lib/api.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('pack_size?: number', 'pack_size?: number | string')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed pack_size type in api.ts")
