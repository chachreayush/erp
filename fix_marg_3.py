import re
with open('src/components/Layout/MargAppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('        </div>\n      )}\n\n      {/* ?? 3. MAIN', '        </div>\n\n      {/* ?? 3. MAIN')
content = content.replace('        </div>\n        )}\n\n      {/* ?? 3. MAIN', '        </div>\n\n      {/* ?? 3. MAIN')
content = content.replace('        </div>\n      )}\n\n      {/* \u2796\u2796 3. MAIN', '        </div>\n\n      {/* \u2796\u2796 3. MAIN')
# Let's just use a loose regex
content = re.sub(r'</div>\s*\)\}\s*\{/\*\s*[^\w]*3\.\s*MAIN CONTENT', r'</div>\n\n      {/* ?? 3. MAIN CONTENT', content)

with open('src/components/Layout/MargAppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
