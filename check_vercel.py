import requests
import time
import re

print("Checking Vercel production deployment at https://erp-rho-three.vercel.app...")
url = "https://erp-rho-three.vercel.app"

for i in range(15):
    try:
        r = requests.get(url, timeout=10)
        match = re.search(r'assets/(index-[A-Za-z0-9_-]+\.js)', r.text)
        if match:
            bundle_name = match.group(1)
            bundle_url = f"{url}/assets/{bundle_name}"
            br = requests.get(bundle_url, timeout=10)
            if "workflow/inbox" in br.text:
                print(f"SUCCESS: Vercel DEPLOYED with DOC-32! Bundle: {bundle_name} contains 'workflow/inbox'")
                break
            else:
                print(f"Attempt {i+1}: Active bundle {bundle_name} does not yet have 'workflow/inbox'. Waiting 8s...")
        else:
            print(f"Attempt {i+1}: Could not find bundle in index.html. Waiting 8s...")
    except Exception as e:
        print(f"Attempt {i+1}: Network error: {e}")
    time.sleep(8)
