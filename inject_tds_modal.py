import os

def inject_modal(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add import
    if "TdsTcsAlertModal" not in content:
        content = content.replace(
            "import React,",
            "import React, { useState, useEffect } from 'react';\nimport TdsTcsAlertModal from '../../components/TdsTcsAlertModal';\n//"
        )

    # 2. Add state inside the main component
    # We'll look for "export default function" or similar.
    # Actually, a simpler way is to find a common useState and inject there.
    if "const [tdsModalOpen, setTdsModalOpen] = useState(false);" not in content:
        content = content.replace(
            "const [isLoading, setIsLoading] = useState(false);",
            "const [isLoading, setIsLoading] = useState(false);\n  const [tdsModalOpen, setTdsModalOpen] = useState(false);\n  const [tdsPartyInfo, setTdsPartyInfo] = useState({ id: '', name: '', amountExceeding: 0 });"
        )
        if "const [tdsModalOpen" not in content:
            # Fallback for state injection
            content = content.replace(
                "const [items, setItems]",
                "const [tdsModalOpen, setTdsModalOpen] = useState(false);\n  const [tdsPartyInfo, setTdsPartyInfo] = useState({ id: '', name: '', amountExceeding: 0 });\n  const [items, setItems]"
            )

    # 3. Add the modal at the end of the return
    if "<TdsTcsAlertModal" not in content:
        # We find the last </div> before the end of the file, or inject just before </AppShell> or </Layout>
        content = content.replace(
            "</AppShell>",
            "  {tdsModalOpen && (\n        <TdsTcsAlertModal\n          partyId={tdsPartyInfo.id}\n          partyName={tdsPartyInfo.name}\n          amountExceeding={tdsPartyInfo.amountExceeding}\n          onClose={() => setTdsModalOpen(false)}\n          onSelectMode={(mode) => {\n            console.log('TDS Mode selected:', mode);\n            setTdsModalOpen(false);\n          }}\n        />\n      )}\n    </AppShell>"
        )
        if "<TdsTcsAlertModal" not in content:
            # Fallback
            content = content.replace(
                "    </div>\n  );\n}",
                "      {tdsModalOpen && (\n        <TdsTcsAlertModal\n          partyId={tdsPartyInfo.id}\n          partyName={tdsPartyInfo.name}\n          amountExceeding={tdsPartyInfo.amountExceeding}\n          onClose={() => setTdsModalOpen(false)}\n          onSelectMode={(mode) => {\n            console.log('TDS Mode selected:', mode);\n            setTdsModalOpen(false);\n          }}\n        />\n      )}\n    </div>\n  );\n}"
            )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

inject_modal("src/pages/sales/SalesBill.tsx")
inject_modal("src/pages/purchase/PurchaseBill.tsx")
