import requests

res = requests.post('http://localhost:8000/auth/login', json={'username': 'admin', 'password': 'Admin@123', 'is_lan': True})
token = res.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

b_res = requests.get('http://localhost:8000/api/batches/', headers=headers)
print('Batches status:', b_res.status_code)
batches = b_res.json()
print('Total batches returned:', len(batches))
for b in batches[:8]:
    print(f"Batch: {b['batch_number']} | Exp: {b['expiry']} | Stock: {b['current_stock']} | NearExp: {b['is_near_expiry']} | Expired: {b['is_expired']}")
