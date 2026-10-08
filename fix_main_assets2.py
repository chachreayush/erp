with open("backend/main.py", "r", encoding="utf-8") as f:
    code = f.read()

import_target = "from api.expenses import router as expenses_router"
import_replacement = import_target + "\nfrom api.assets import router as assets_router"
if "assets_router" not in code:
    code = code.replace(import_target, import_replacement)

router_target = 'app.include_router(expenses_router, prefix="/api")'
router_replacement = router_target + '\napp.include_router(assets_router)'
if "assets_router)" not in code:
    code = code.replace(router_target, router_replacement)

with open("backend/main.py", "w", encoding="utf-8") as f:
    f.write(code)
