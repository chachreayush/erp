import os

files = [
    'src/pages/procurement/PurchaseOrderMaster.tsx',
    'src/pages/procurement/GoodsReceipt.tsx',
    'src/pages/procurement/VendorComplaints.tsx'
]

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add import
    if "useReturnNavigation" not in content:
        content = content.replace("import apiClient from '../../lib/api';", "import apiClient from '../../lib/api';\nimport { useReturnNavigation } from '../../hooks/useReturnNavigation';")
        
        # Add hook call
        # find the start of the component function
        if 'export default function PurchaseOrderMaster() {' in content:
            content = content.replace(
                'export default function PurchaseOrderMaster() {',
                'export default function PurchaseOrderMaster() {\n  useReturnNavigation();'
            )
        elif 'export default function GoodsReceipt() {' in content:
            content = content.replace(
                'export default function GoodsReceipt() {',
                'export default function GoodsReceipt() {\n  useReturnNavigation();'
            )
        elif 'export default function VendorComplaints() {' in content:
            # VendorComplaints has a showForm state which acts like a modal
            content = content.replace(
                'export default function VendorComplaints() {',
                'export default function VendorComplaints() {\n'
            )
            content = content.replace(
                "const [description, setDescription] = useState('');",
                "const [description, setDescription] = useState('');\n\n  useReturnNavigation(showForm);"
            )

        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Added useReturnNavigation to {path}")
    else:
        print(f"useReturnNavigation already in {path}")
