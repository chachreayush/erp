import os

files = [
    'src/pages/sales/SalesBill.tsx',
    'src/pages/purchase/PurchaseBill.tsx'
]

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Import useAuthStore
    if "import { useAuthStore }" not in content:
        content = content.replace(
            "import { useSearchParams } from 'react-router-dom'",
            "import { useSearchParams } from 'react-router-dom'\nimport { useAuthStore } from '../../store/authStore'"
        )
        
        # Add permission check logic
        hook_start = "export default function " + path.split('/')[-1].replace('.tsx', '') + "() {"
        
        permission_check = """
  const user = useAuthStore(state => state.user)
  // Default to true for backward compatibility. Admin or true allows direct billing.
  const canDirectBill = user?.role === 'am_admin' || user?.role === 'cm_admin' || user?.allowDirectBilling !== false;

  if (!canDirectBill) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center text-[var(--color-text-dim)]">
        <div>
          <div className="text-4xl mb-4">~T</div>
          <h2 className="text-2xl font-bold mb-2">Direct Billing Disabled</h2>
          <p>Your account is configured for strict Sales Orders only. Please create a Sales Order and request approval.</p>
        </div>
      </div>
    )
  }
"""
        if path == 'src/pages/purchase/PurchaseBill.tsx':
             permission_check = permission_check.replace('Sales Order', 'Purchase Order').replace('Sales Orders', 'Purchase Orders')
             
        content = content.replace(hook_start, hook_start + '\n' + permission_check)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {path} with permission check")
    else:
        print(f"Permission check already in {path}")
