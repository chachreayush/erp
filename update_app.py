with open('src/App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '<Route path="master"' in line:
        lines.insert(i, '        <Route path="master/parties" element={<PartyMaster />} />\n')
        break

for i, line in enumerate(lines):
    if 'import MasterPage' in line or 'import LedgerGroupMaster' in line:
        lines.insert(i, "import PartyMaster from './pages/master/PartyMaster'\n")
        break

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
