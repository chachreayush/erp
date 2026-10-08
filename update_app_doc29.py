import os

app_path = "src/App.tsx"

with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if "ComplianceWorkbench" not in content:
    content = content.replace(
        "import SettingsPage from './pages/SettingsPage';",
        "import SettingsPage from './pages/SettingsPage';\nimport ComplianceWorkbench from './pages/ComplianceWorkbench';\nimport SignedLedger from './pages/SignedLedger';"
    )

# Add routes
if "<Route path=\"compliance\"" not in content:
    content = content.replace(
        "<Route path=\"settings\"         element={<SettingsPage />} />",
        "<Route path=\"settings\"         element={<SettingsPage />} />\n        <Route path=\"compliance\"         element={<ComplianceWorkbench />} />\n        <Route path=\"compliance/signed\"  element={<SignedLedger />} />"
    )

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Update Sidebar
sidebar_path = "src/components/Sidebar.tsx"
if os.path.exists(sidebar_path):
    with open(sidebar_path, 'r', encoding='utf-8') as f:
        sb_content = f.read()
    
    if "Compliance Workbench" not in sb_content:
        # We will add it under the 'GST & Compliance' or simply inject a new menu item.
        # Check where to inject.
        if "to=\"/gst\"" in sb_content:
            sb_content = sb_content.replace(
                "to=\"/gst\"",
                "to=\"/gst\"\n          >\n            GST Reports\n          </NavLink>\n          <NavLink\n            className={({ isActive }) =>\n              `flex items-center px-4 py-2 text-sm ${isActive ? 'bg-indigo-700 text-white' : 'text-indigo-100 hover:bg-indigo-600'}`\n            }\n            to=\"/compliance\"\n          >\n            Compliance Workbench\n          </NavLink>\n          <NavLink\n            className={({ isActive }) =>\n              `flex items-center px-4 py-2 text-sm ${isActive ? 'bg-indigo-700 text-white' : 'text-indigo-100 hover:bg-indigo-600'}`\n            }\n            to=\"/compliance/signed\""
            )
            with open(sidebar_path, 'w', encoding='utf-8') as f:
                f.write(sb_content)

print("App.tsx and Sidebar.tsx updated.")
