import os

path = 'backend/api/finance_v2.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """    try:
        # 3. Auto-generate voucher number if not provided
        v_number = voucher.voucher_number
        if not v_number:
            v_number = _get_next_voucher_number(db, org_id, voucher.voucher_type, fy.id)"""

replacement = """    try:
        # 3. Auto-generate voucher number if not provided
        v_number = voucher.voucher_number
        
        # DOC-24: Update Document Series if provided
        if voucher.series_id:
            series = db.query(models.DocumentSeries).filter(
                models.DocumentSeries.id == voucher.series_id
            ).with_for_update().first()
            if series:
                # If the provided v_number is greater than or equal to the next_number in series, bump the series
                import re
                match = re.search(r'\\d+$', v_number) if v_number else None
                if match:
                    parsed_num = int(match.group())
                    if parsed_num >= series.next_number:
                        series.next_number = parsed_num + 1
                        db.add(series)

        if not v_number:
            v_number = _get_next_voucher_number(db, org_id, voucher.voucher_type, fy.id)"""

if "DOC-24: Update Document Series if provided" not in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated finance_v2.py successfully")
else:
    print("Already updated finance_v2.py")
