import os

app_path = "src/App.tsx"

def inject_app_routing():
    with open(app_path, "r", encoding="utf-8") as f:
        content = f.read()

    if "import ReportViewer" in content:
        print("Already injected.")
        return

    # Add imports
    imports = """
import ReportViewer from './pages/reports/ReportViewer';
import ReportDesigner from './pages/reports/ReportDesigner';
"""
    content = content.replace("import { Routes, Route, Navigate } from 'react-router-dom'", "import { Routes, Route, Navigate } from 'react-router-dom'\n" + imports)

    with open(app_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Injected into App.tsx")

inject_app_routing()
