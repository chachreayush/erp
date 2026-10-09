import os

main_path = "backend/main.py"

def inject_reports_v2_router():
    with open(main_path, "r", encoding="utf-8") as f:
        content = f.read()

    if "from api.reports_v2 import router as reports_v2_router" in content:
        print("Router already registered.")
        return

    # Add import
    import_statement = "from api.reports_v2 import router as reports_v2_router"
    content = content.replace("from api.reports import router as reports_router", 
                              "from api.reports import router as reports_router\n" + import_statement)
    
    # Add app.include_router
    include_statement = "app.include_router(reports_v2_router)"
    content = content.replace("app.include_router(reports_router)", 
                              "app.include_router(reports_router)\n" + include_statement)

    with open(main_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Router registered.")

inject_reports_v2_router()
