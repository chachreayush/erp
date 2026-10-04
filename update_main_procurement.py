import os

path = 'backend/main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'from api.procurement import router as procurement_router' not in content:
    content = content.replace(
        'from api.replenishment import router as replenishment_router',
        'from api.replenishment import router as replenishment_router\nfrom api.procurement import router as procurement_router'
    )
    content = content.replace(
        'app.include_router(replenishment_router)',
        'app.include_router(replenishment_router)\napp.include_router(procurement_router, prefix="/api/procurement")'
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added procurement router to main.py")
else:
    print("Procurement router already in main.py")
