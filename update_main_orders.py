import os

path = 'backend/main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'from api.orders import router as orders_router' not in content:
    content = content.replace(
        'from api.procurement import router as procurement_router',
        'from api.procurement import router as procurement_router\nfrom api.orders import router as orders_router'
    )
    content = content.replace(
        'app.include_router(procurement_router, prefix="/api/procurement")',
        'app.include_router(procurement_router, prefix="/api/procurement")\napp.include_router(orders_router, prefix="/api/orders")'
    )
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added orders router to main.py")
else:
    print("orders router already in main.py")
