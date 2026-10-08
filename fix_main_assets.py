with open("backend/main.py", "r", encoding="utf-8") as f:
    code = f.read()

target_import = "from api import (master, "
replacement_import = "from api import (master, assets, "
code = code.replace(target_import, replacement_import)

target_router = "app.include_router(expenses.router)"
replacement_router = "app.include_router(expenses.router)\napp.include_router(assets.router)"
code = code.replace(target_router, replacement_router)

with open("backend/main.py", "w", encoding="utf-8") as f:
    f.write(code)
