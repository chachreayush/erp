import re
with open('src/components/Layout/MargAppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\{isHomeScreen\s*&&\s*\(\s*<div\s+className="marg-title-bar">', r'<div className="marg-title-bar">', content)
content = re.sub(r'\{isHomeScreen\s*&&\s*\(\s*<div\s+className="marg-menu-bar">', r'<div className="marg-menu-bar">', content)

content = re.sub(r'</div>\s*</div>\s*\)\}\s*\{/\* 2\. MENU BAR', r'</div>\n        </div>\n\n        {/* 2. MENU BAR', content)
content = re.sub(r'</div>\s*</div>\s*\)\}\s*<div\s+className="marg-center-content">', r'</div>\n        </div>\n\n        <div className="marg-center-content">', content)

with open('src/components/Layout/MargAppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
