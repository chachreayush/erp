import os

path = 'src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '<Route path="master/transport" element={<TransportMaster />} />'
replacement = '<Route path="master/transport" element={<TransportMaster />} />\n        <Route path="series-master" element={<DocumentSeriesMaster />} />'

if target in content:
    if '<Route path="series-master"' not in content:
        content = content.replace(target, replacement)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Fixed App.tsx routing")
    else:
        print("Route already exists in App.tsx")
else:
    print("Target not found in App.tsx")
