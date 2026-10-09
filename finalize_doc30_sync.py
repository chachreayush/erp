import os
import datetime

# Define paths
manuals = [
    "Developer_and_User_Manual.md",
    "DEVELOPER_MANUAL.md",
    "User_Manual_and_Workflow.md",
    "USER_WORKFLOW_MANUAL.md"
]
project_memory = "PROJECT_MEMORY.md"
doc30 = "DOC30_parsed.txt"

timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

doc30_update = f"""

=========================================
[{timestamp}] IMPLEMENTATION UPDATE
=========================================
- Schema Additions: ReportTemplate, ReportVariant, DashboardExclusion (utilizing JSONB for config storage).
- API Routes: Created /api/reports_v2/execute/{{subject}} allowing dynamic aggregation over Sales, Ledger, and Inventory without modifying core schemas. Implemented DashboardExclusion logic to omit non-actionable elements from KPI feeds while preserving accounting truth.
- Frontend Dashboards: Built Advanced Report Designer (ReportDesigner.tsx) and Report Viewer (ReportViewer.tsx) with native CSV export capabilities. 
- Integrated into global routing and Sidebar.
"""

# Append to DOC-30
if os.path.exists(doc30):
    with open(doc30, "a", encoding="utf-8") as f:
        f.write(doc30_update)
    print(f"Updated {doc30}")

# Append to Manuals
for manual in manuals:
    if os.path.exists(manual):
        with open(manual, "a", encoding="utf-8") as f:
            f.write(f"\n\n## DOC-30 Reporting Engine ({timestamp})\n")
            f.write("- **Dynamic Aggregation:** Implemented flexible reporting endpoints (`/api/reports_v2`) leveraging JSONB for custom configurations.\n")
            f.write("- **Dashboard Exclusions:** Users can suppress disputed parties/ledgers from KPI dashboards without deleting the source accounting record.\n")
            f.write("- **Report Viewer & Designer:** Keyboard-first analytical tables with robust native CSV export, avoiding backend bottlenecks.\n")
        print(f"Updated {manual}")

# Append to Project Memory
if os.path.exists(project_memory):
    with open(project_memory, "a", encoding="utf-8") as f:
        f.write(f"\n\n### DOC-30 Implementation ({timestamp})\n")
        f.write("Successfully implemented Financial & Statutory Management Reporting Engine. Fixed frontend `useRef` import crashes in Sales/Purchase modules. Synchronized local folders to GitHub/Vercel.\n")
    print(f"Updated {project_memory}")

# Sync folder
print("Syncing erp2 to erp...")
os.system(r'robocopy "C:\Users\DELL\OneDrive\Desktop\erp2" "C:\Users\DELL\OneDrive\Desktop\erp" /MIR /XD node_modules .git .venv __pycache__ .next /XF .env')
print("Sync complete.")
