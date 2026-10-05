import os

path = 'backend/main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'from api.dispatch import router as dispatch_router' not in content:
    content = content.replace(
        'from api.orders import router as orders_router',
        'from api.orders import router as orders_router\nfrom api.dispatch import router as dispatch_router'
    )
    content = content.replace(
        'app.include_router(orders_router, prefix="/api/orders")',
        'app.include_router(orders_router, prefix="/api/orders")\napp.include_router(dispatch_router, prefix="/api/dispatch")'
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added dispatch router to main.py")
