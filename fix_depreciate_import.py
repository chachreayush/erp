with open("backend/api/assets.py", "r", encoding="utf-8") as f:
    code = f.read()

target1 = "from api.finance_v2 import generate_next_voucher_number"
replacement1 = "from api.finance_v2 import _get_next_voucher_number"

target2 = "v_num = generate_next_voucher_number(db, org_id, 'Journal', fy.id)"
replacement2 = "v_num = _get_next_voucher_number(db, org_id, 'Journal', fy.id)"

code = code.replace(target1, replacement1)
code = code.replace(target2, replacement2)

with open("backend/api/assets.py", "w", encoding="utf-8") as f:
    f.write(code)
