import os

path = 'src/components/Layout/Header.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "{ label: 'Transport Master', path: '/master/transport' },"
replacement = "{ label: 'Transport Master', path: '/master/transport' },\n      { label: 'Document Series', path: '/series-master' },"

if target in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added Document Series to Header")
else:
    print("Target not found in Header.tsx")
