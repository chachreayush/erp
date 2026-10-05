import os

path = 'src/pages/master/LedgerGroupMaster.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("group: 'hover' // For generic hover state", "")
content = content.replace("className=\"tree-node\"", "className=\"tree-node group\"")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed group style in LedgerGroupMaster.tsx")
