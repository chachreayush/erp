with open("backend/main.py", "r", encoding="utf-8") as f:
    code = f.read()

import_statement = "from api.billing import router as billing_router\nfrom api.expenses import router as expenses_router"
code = code.replace("from api.billing import router as billing_router", import_statement)

register_statement = "app.include_router(billing_router, prefix=\"/api/billing\")\napp.include_router(expenses_router, prefix=\"/api\")"
code = code.replace("app.include_router(billing_router, prefix=\"/api/billing\")", register_statement)

with open("backend/main.py", "w", encoding="utf-8") as f:
    f.write(code)
