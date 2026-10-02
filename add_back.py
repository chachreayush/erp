with open('src/pages/master/PartyMaster.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_str = "import { useNavigate } from 'react-router-dom'\n"
if import_str not in content:
    content = content.replace("import { apiClient } from '../../lib/api'", "import { apiClient } from '../../lib/api'\n" + import_str)

if "const navigate = useNavigate()" not in content:
    content = content.replace('export default function PartyMaster() {', 'export default function PartyMaster() {\n  const navigate = useNavigate()\n')

back_btn = "<Button variant=\"secondary\" onClick={() => navigate('/')} style={{ marginBottom: '16px' }}>&larr; Back to Dashboard</Button>\n      "
if back_btn not in content:
    content = content.replace("<div style={{ display: 'flex', justifyContent: 'space-between',", back_btn + "<div style={{ display: 'flex', justifyContent: 'space-between',")

with open('src/pages/master/PartyMaster.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
