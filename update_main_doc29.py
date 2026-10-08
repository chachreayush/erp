import os

main_path = "backend/main.py"

with open(main_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if "from api.compliance import router as compliance_router" not in content:
    content = content.replace(
        "from api.assets import router as assets_router",
        "from api.assets import router as assets_router\nfrom api.compliance import router as compliance_router\nfrom api.tds_tcs import router as tds_tcs_router"
    )

# Add route includes
if "app.include_router(compliance_router" not in content:
    content = content.replace(
        "app.include_router(assets_router)",
        "app.include_router(assets_router)\napp.include_router(compliance_router, prefix=\"/api/compliance\", tags=[\"Compliance\"])\napp.include_router(tds_tcs_router, prefix=\"/api/tds_tcs\", tags=[\"TDS/TCS\"])"
    )

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("main.py updated.")
