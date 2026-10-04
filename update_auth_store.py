import os

path = 'src/store/authStore.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'allowDirectBilling?: boolean' not in content:
    content = content.replace(
        'permissions: UserPermissions // Exact module-level permissions for this user',
        'permissions: UserPermissions // Exact module-level permissions for this user\n  allowDirectBilling?: boolean // If false, user must go through Sales Orders and cannot do direct invoicing'
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added allowDirectBilling to authStore.ts")
else:
    print("allowDirectBilling already in authStore.ts")
