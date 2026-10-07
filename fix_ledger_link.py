with open("src/pages/finance/LedgerStatement.tsx", "r", encoding="utf-8") as f:
    code = f.read()

import_statement = "import { useState, useEffect } from 'react';\nimport { useNavigate } from 'react-router-dom';"
if "useNavigate" not in code:
    code = code.replace("import { useState, useEffect } from 'react';", import_statement)

use_nav_decl = "export default function LedgerStatement() {\n  const navigate = useNavigate();"
if "const navigate = useNavigate();" not in code:
    code = code.replace("export default function LedgerStatement() {", use_nav_decl)

tr_target = "<tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>"
tr_replacement = "<tr key={i} onClick={() => navigate('/finance/voucher/' + entry.voucher_type.toLowerCase() + '/' + entry.voucher_id)} style={{ borderBottom: '1px solid #1e293b', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>"

code = code.replace(tr_target, tr_replacement)

with open("src/pages/finance/LedgerStatement.tsx", "w", encoding="utf-8") as f:
    f.write(code)
