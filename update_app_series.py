import os

path = 'src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

imports = """import DocumentSeriesMaster from './pages/master/DocumentSeriesMaster'
"""

routes = """
        {/* Document Series Route */}
        <Route path="series-master" element={<DocumentSeriesMaster />} />
"""

if 'import DocumentSeriesMaster' not in content:
    content = content.replace("import TransportMaster from './pages/master/TransportMaster'", imports + "import TransportMaster from './pages/master/TransportMaster'")
    content = content.replace('<Route path="transport-master" element={<TransportMaster />} />', '<Route path="transport-master" element={<TransportMaster />} />' + routes)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added DocumentSeriesMaster route to App.tsx")

path2 = 'src/components/Layout/Header.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

target2 = """    { label: 'Party', path: '/party-master' },
    { label: 'Ledger', path: '/master?tab=ledgers' },"""

replacement2 = """    { label: 'Party', path: '/party-master' },
    { label: 'Ledger', path: '/master?tab=ledgers' },
    { label: 'Document Series', path: '/series-master' },"""

if "{ label: 'Document Series', path: '/series-master' }" not in content2:
    content2 = content2.replace(target2, replacement2)
    with open(path2, 'w', encoding='utf-8') as f:
        f.write(content2)
    print("Successfully added Document Series to Header.tsx")
