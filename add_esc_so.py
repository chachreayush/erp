import os

files = [
    'src/pages/sales/SalesOrderMaster.tsx',
    'src/pages/sales/OrderApprovalDashboard.tsx'
]

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add import
    if "useReturnNavigation" not in content:
        if path == 'src/pages/sales/SalesOrderMaster.tsx':
            content = content.replace("import apiClient from '../../lib/api';", "import apiClient from '../../lib/api';\nimport { useReturnNavigation } from '../../hooks/useReturnNavigation';")
            content = content.replace(
                'export default function SalesOrderMaster() {',
                'export default function SalesOrderMaster() {\n  useReturnNavigation();'
            )
        elif path == 'src/pages/sales/OrderApprovalDashboard.tsx':
            content = content.replace("import { useAuthStore } from '../../store/authStore';", "import { useAuthStore } from '../../store/authStore';\nimport { useReturnNavigation } from '../../hooks/useReturnNavigation';")
            content = content.replace(
                'export default function OrderApprovalDashboard() {',
                'export default function OrderApprovalDashboard() {\n  useReturnNavigation();'
            )

        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Added useReturnNavigation to {path}")
    else:
        print(f"useReturnNavigation already in {path}")
