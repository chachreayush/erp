import os
import re

path = 'src/pages/finance/VoucherEntry.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """  useEffect(() => {
    const fetchNextVoucherNo = () => {
      if (type) {
        apiGetNextVoucherNumber(type).then(res => setVoucherNumber(res.next_number)).catch(console.error);
      }
    };
    fetchNextVoucherNo();
  }, [type]);"""

if target in content:
    content = content.replace(target, "")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Removed old apiGetNextVoucherNumber useEffect")
else:
    print("Could not find the target useEffect")
