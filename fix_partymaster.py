import os

path = 'src/pages/master/PartyMaster.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("icon={<Search size={16} />}", "leftIcon={<Search size={16} />}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed Input prop in PartyMaster.tsx")
