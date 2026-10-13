import requests

res = requests.post('http://localhost:8000/auth/login', json={'username': 'admin', 'password': 'Admin@123', 'is_lan': True})
token = res.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

p_res = requests.get('http://localhost:8000/api/parties/', headers=headers)
print('Total parties:', len(p_res.json()))
for p in p_res.json():
    name = p.get('legal_name')
    cust = p.get('is_customer')
    supp = p.get('is_supplier')
    has_cp = bool(p.get('customer_profile'))
    has_sp = bool(p.get('supplier_profile'))
    print(f"Name: {name} | Cust: {cust} | Supp: {supp} | CP: {has_cp} | SP: {has_sp}")
