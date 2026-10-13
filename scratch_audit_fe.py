import os
import glob
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

pages = glob.glob('src/pages/**/*.tsx', recursive=True) + glob.glob('src/pages/*.tsx')
components = glob.glob('src/components/**/*.tsx', recursive=True)

all_files = sorted(set(pages + components))

print(f"Total TSX files to audit: {len(all_files)}")

issues = []

for f in all_files:
    fname = f.replace('\\', '/')
    with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
        lines = fp.readlines()
    
    code = ''.join(lines)
    
    # 1. Check for localStorage.getItem('token')
    if "localStorage.getItem('token')" in code or 'localStorage.getItem("token")' in code:
        issues.append((fname, "CRITICAL_AUTH_BUG", "Uses localStorage.getItem('token') instead of Zustand authStore / sessionStorage"))
        
    # 2. Check for dollar signs in UI
    dollar_matches = re.findall(r'(\$\s*\{?[a-zA-Z0-9_\.]+\}?|\$\d+)', code)
    # Filter out template literals like `${...}`
    real_dollars = [m for m in dollar_matches if not m.startswith('${')]
    if real_dollars:
        issues.append((fname, "CURRENCY_BUG", f"Found raw '$' symbol: {real_dollars[:3]}"))
        
    # 3. Check for mock hotkey buttons without keydown listeners
    mock_hotkeys = re.findall(r'\[(F\d+|ESC|ENTER|ALT\+[A-Z]|CTRL\+[A-Z])\]', code)
    has_keydown = "addEventListener('keydown'" in code or 'addEventListener("keydown"' in code or 'onKeyDown' in code or 'useHotkeys' in code or 'useReturnNavigation' in code
    if mock_hotkeys and not has_keydown:
        issues.append((fname, "MOCK_HOTKEY_BUG", f"Displays hotkey labels {mock_hotkeys[:3]} but has NO keydown listener or hook!"))
        
    # 4. Check for light background leak
    if "bg-white" in code and "bg-slate-900" not in code and "bg-slate-950" not in code and "bg-[#020617]" not in code and "bg-gray-900" not in code:
        # Check if it's completely light theme
        issues.append((fname, "THEME_LEAK", "Uses unstyled bg-white container without dark slate theme wrapper"))

print(f"\nAudit complete. Found {len(issues)} issues across files.")
for f, cat, desc in issues:
    print(f"[{cat:18}] {f:42} -> {desc}")

