import os

docs_to_update = [
    'PROJECT_MEMORY.md',
    'Developer_and_User_Manual.md',
    'User_Manual_and_Workflow.md'
]

update_text = """

### Recent Updates (September 2026)
- **Deep Architecture Validation:** Successfully completed a comprehensive code and visual audit of the Multi-Tenant (AM/CM) structure, CQRS Append-Only Ledgers, and Bill-by-Bill allocations.
- **Claude UI Handoff:** Formally assigned the UI/UX implementation of the Receipt Modal, Challan-to-Invoice Conversion Screen, CRM Permissions Grid, and ERP Finance & Billing Master to Claude (via `Frontend_UI_UX_Spec_For_Claude.docx`).
- **Sync & Deployment:** Synced the `erp2` repository back to the original `erp` folder, committed to Git, and aligned with Vercel for continuous deployment.
"""

for doc in docs_to_update:
    path = os.path.join(r'C:\Users\DELL\OneDrive\Desktop\erp2', doc)
    if os.path.exists(path):
        with open(path, 'a', encoding='utf-8') as f:
            f.write(update_text)
        print(f"Updated {doc}")
