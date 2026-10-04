import os

files = ['DEVELOPER_MANUAL.md', 'USER_WORKFLOW_MANUAL.md']

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    new_update = """
## [Update - DOC-18 Sales Order & Order Management Engine]
- **Hold Engine**: Orders exceeding credit limits or pricing margins are put on `HOLD`. Admins/Managers must explicitly review these in the `OrderApprovalDashboard` (accessible via Sales & Purchase > Sale > Order Approvals).
- **Direct Billing Bypass (Permissions)**: To prevent the Hold engine from slowing down fast billing, the `User` account has an `allow_direct_billing` permission flag. Admin/Manager roles or users with this flag enabled can bypass the strict Sales Order flow and use the fast-path direct `SalesBill` / `PurchaseBill` invoicing. Users without this flag are hard-blocked from accessing direct billing and must go through the Sales Order approval flow.
"""

    if 'DOC-18 Sales Order' not in content:
        content += new_update
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {path}")
    else:
        print(f"{path} already updated")
