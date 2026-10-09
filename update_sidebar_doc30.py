import os

sidebar_path = "src/components/Layout/Sidebar.tsx"

def inject_sidebar():
    with open(sidebar_path, "r", encoding="utf-8") as f:
        content = f.read()

    if "/reports/viewer" in content:
        print("Already injected.")
        return

    report_links = """
            <li>
              <Link to="/reports/viewer" className="flex items-center p-2 text-gray-700 rounded-lg hover:bg-gray-100 group">
                <span className="flex-1 whitespace-nowrap">Report Viewer (DOC-30)</span>
              </Link>
            </li>
            <li>
              <Link to="/reports/designer" className="flex items-center p-2 text-gray-700 rounded-lg hover:bg-gray-100 group">
                <span className="flex-1 whitespace-nowrap">Report Designer (DOC-30)</span>
              </Link>
            </li>
"""
    # Insert after GST Compliance
    content = content.replace('span className="flex-1 whitespace-nowrap">GST Compliance (DOC-29)</span>\n              </Link>\n            </li>', 
                              'span className="flex-1 whitespace-nowrap">GST Compliance (DOC-29)</span>\n              </Link>\n            </li>\n' + report_links)

    with open(sidebar_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Injected into Sidebar.tsx")

inject_sidebar()
