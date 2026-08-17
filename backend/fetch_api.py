import requests
import json

def run():
    # Login
    res = requests.post("http://127.0.0.1:8000/auth/login", data={"username": "admin", "password": "password"})
    if res.status_code != 200:
        print("Login failed", res.text)
        return
    token = res.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Fetch stock
    res = requests.get("http://127.0.0.1:8000/api/stock/", headers=headers)
    stock_data = res.json()
    print(f"API /api/stock/ returned {len(stock_data)} items")
    
    # Fetch products
    res = requests.get("http://127.0.0.1:8000/products/", headers=headers)
    products_data = res.json()
    print(f"API /products/ returned {len(products_data)} items")
    
    # Compare
    stock_ids = {p['product_id'] for p in stock_data}
    product_ids = {p['id'] for p in products_data}
    
    missing_in_stock = product_ids - stock_ids
    print(f"Missing in stock: {len(missing_in_stock)}")

if __name__ == "__main__":
    run()
