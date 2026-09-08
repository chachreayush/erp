import re
with open('src/components/Layout/MargAppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('          </div>\n        )}\n\n        {/* ?? 3. MAIN CONTENT AREA', '          </div>\n\n        {/* ?? 3. MAIN CONTENT AREA')

with open('src/components/Layout/MargAppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
