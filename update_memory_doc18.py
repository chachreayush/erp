import os

path = 'PROJECT_MEMORY.md'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_update = """
## [Update - DOC-18 Sales Order & Order Management Engine]
Implemented `SalesOrder`, `SalesOrderItem`, and `SalesOrderHold` models.
Introduced an explicit **Hold Engine** where orders exceeding credit limits or pricing margins are put on `HOLD`. Admins/Managers must explicitly review these in the `OrderApprovalDashboard`.
**Crucial Permission Note**: To prevent the Hold engine from slowing down fast billing, the `User` model now has a `allow_direct_billing` flag. Admin/Manager roles or users with this flag enabled can bypass the strict SO flow and use the fast-path direct `SalesBill` / `PurchaseBill` invoicing. Users without this flag are hard-blocked from accessing direct billing and must go through the Sales Order approval flow.
"""

if 'DOC-18 Sales Order & Order Management Engine' not in content:
    content = content.replace(
        '## [Update - DOC-17 Procurement Engine]',
        new_update + '\n## [Update - DOC-17 Procurement Engine]'
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated PROJECT_MEMORY.md")
else:
    print("PROJECT_MEMORY.md already updated")
