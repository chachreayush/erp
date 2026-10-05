import os

path = 'backend/main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'from api.billing import router as billing_router' not in content:
    content = content.replace(
        'from api.dispatch import router as dispatch_router',
        'from api.dispatch import router as dispatch_router\nfrom api.billing import router as billing_router'
    )
    content = content.replace(
        'app.include_router(dispatch_router, prefix="/api/dispatch")',
        'app.include_router(dispatch_router, prefix="/api/dispatch")\napp.include_router(billing_router, prefix="/api/billing")'
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added billing router to main.py")
