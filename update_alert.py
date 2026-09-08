with open('src/pages/sales/SalesBill.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(
    r'\} catch \(err\) \{\s+console\.error\(err\);\s+alert\(\'Failed to save to backend database\. Check console\.\'\);\s+return;\s+\}',
    """} catch (err: any) {
        console.error(err);
        const errMsg = err.response?.data?.detail || err.message || 'Failed to save to backend database. Check console.';
        alert(errMsg);
        return;
      }""",
    content
)

with open('src/pages/sales/SalesBill.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated alert error message!')
