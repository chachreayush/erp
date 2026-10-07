import urllib.request
import json

data = {
    "voucher_type": "Payment",
    "date": "2026-10-07T00:00:00.000Z",
    "total_amount": 1200,
    "entries": [
        {"cr_dr": "Cr", "ledger_id": "00000000-0000-0000-0000-000000000001", "amount": 1200},
        {"cr_dr": "Dr", "ledger_id": "00000000-0000-0000-0000-000000000002", "amount": 1200}
    ]
}

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/finance/vouchers', 
    data=json.dumps(data).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print(e.read().decode())
