import requests

data = {
    "voucher_type": "payment",
    "date": "2026-10-07T00:00:00.000Z",
    "total_amount": 1200,
    "entries": [
        {"cr_dr": "Cr", "ledger_id": "00000000-0000-0000-0000-000000000001", "amount": 1200},
        {"cr_dr": "Dr", "ledger_id": "00000000-0000-0000-0000-000000000002", "amount": 1200}
    ]
}

# Login first to get token
login = requests.post("http://127.0.0.1:8000/auth/login", json={"username": "admin", "password": "password"})
token = login.json().get("access_token")

if token:
    res = requests.post(
        "http://127.0.0.1:8000/api/finance/vouchers",
        json=data,
        headers={"Authorization": f"Bearer {token}"}
    )
    print("STATUS:", res.status_code)
    print("ERROR:", res.text)
else:
    print("Login Failed:", login.text)
