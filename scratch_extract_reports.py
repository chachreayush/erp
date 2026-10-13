import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/reports/ReportViewer.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# find report definitions
matches = re.findall(r"id:\s*['\"]([^'\"]+)['\"],\s*name:\s*['\"]([^'\"]+)['\"]", c)
print(f"Total report items found in ReportViewer: {len(matches)}")
for rid, rname in matches:
    print(f"  - {rid:30} : {rname}")
