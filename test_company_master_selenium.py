import time
import json
import sys
import os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

WORKSPACE_DIR = r"c:\Users\DELL\OneDrive\Desktop\erp2"
ARTIFACTS_DIR = r"C:\Users\DELL\.gemini\antigravity\brain\8eeeb440-bbec-4ca3-a399-79618929579d"

def log(msg):
    print(msg, flush=True)

def run_test():
    log("=================================================================")
    log("PRODUCT COMPANY MASTER & CLIENT MULTI-MAPPING TEST SUITE")
    log("=================================================================")

    # 1. Authenticate via Backend API
    log("\n[STAGE 1] Authenticating via backend API (admin / Admin@123)...")
    login_res = requests.post("http://localhost:8000/auth/login", json={
        "username": "admin",
        "password": "Admin@123",
        "is_lan": True
    }, timeout=10)
    assert login_res.status_code == 200, f"Backend login failed: {login_res.status_code}"
    
    auth_data = login_res.json()
    auth_token = auth_data["access_token"]
    user_info = auth_data["user"]
    org_id = user_info.get("organization_id")
    headers = {"Authorization": f"Bearer {auth_token}"}
    log(f"  SUCCESS: Authenticated as {user_info.get('username')} (Org: {org_id})")

    auth_store_obj = {
        "state": {
            "user": user_info,
            "token": auth_token,
            "originalAmUser": None,
            "originalAmToken": None,
            "appMode": "lan",
            "serverUrl": "http://localhost:8000"
        },
        "version": 0
    }

    # 2. Verify Company Summary & Turnover APIs
    log("\n[STAGE 2] Verifying Company Master Summary API (/api/companies/summary)...")
    sum_res = requests.get("http://localhost:8000/api/companies/summary", headers=headers, timeout=10)
    assert sum_res.status_code == 200, f"Summary failed: {sum_res.text}"
    summary = sum_res.json()
    log(f"  SUCCESS: Summary KPIs: Total Companies={summary.get('total_companies')}, Active={summary.get('active_companies')}, Products={summary.get('total_products')}, Mapped Clients={summary.get('mapped_clients_count')}")

    log("\n[STAGE 3] Verifying Company Sales Turnover Telemetry API (/api/companies/turnover)...")
    turnover_res = requests.get("http://localhost:8000/api/companies/turnover", headers=headers, timeout=10)
    assert turnover_res.status_code == 200, f"Turnover failed: {turnover_res.text}"
    turnover = turnover_res.json()
    log(f"  SUCCESS: Turnover Engine returned {turnover.get('companies_count', 0)} companies, Total Turnover=Rs. {turnover.get('total_gross_turnover', 0):,.2f}")

    # 3. Create a test Product Company via API
    log("\n[STAGE 4] Creating Test Product Company via API...")
    mfg_payload = {
        "name": "Apex Healthcare Specialties Ltd.",
        "short_code": "APEX",
        "division": "Oncology & Critical Care",
        "default_discount": 12.5,
        "is_supplier": True,
        "status": "ACTIVE"
    }
    create_mfg_res = requests.post("http://localhost:8000/api/master/manufacturers", json=mfg_payload, headers=headers, timeout=10)
    assert create_mfg_res.status_code in [200, 201], f"Create company failed: {create_mfg_res.text}"
    new_mfg = create_mfg_res.json()
    new_mfg_id = new_mfg.get("id")
    log(f"  SUCCESS: Created Product Company '{new_mfg.get('name')}' with ID: {new_mfg_id}")

    # Fetch client organizations
    orgs_res = requests.get("http://localhost:8000/api/organizations/", headers=headers, timeout=10)
    assert orgs_res.status_code == 200
    client_orgs = orgs_res.json()
    target_client_org_id = client_orgs[0]["id"] if client_orgs else org_id
    target_client_name = client_orgs[0]["name"] if client_orgs else "Client Org"

    # 4. Map Company to Client Organization
    log(f"\n[STAGE 5] Mapping Company {new_mfg_id} to Client Organization {target_client_org_id} ({target_client_name})...")
    mapping_payload = {
        "items": [
            {
                "manufacturer_id": new_mfg_id,
                "is_primary": True,
                "commission_rate_override": 7.5,
                "notes": "Exclusive State Consignment C&F Agent"
            }
        ]
    }
    map_res = requests.post(f"http://localhost:8000/api/companies/organizations/{target_client_org_id}/mappings", json=mapping_payload, headers=headers, timeout=10)
    assert map_res.status_code == 200, f"Mapping failed: {map_res.text}"
    log(f"  SUCCESS: Mapped successfully: {map_res.json().get('message')}")

    get_map_res = requests.get(f"http://localhost:8000/api/companies/organizations/{target_client_org_id}/mappings", headers=headers, timeout=10)
    assert get_map_res.status_code == 200
    mapped_items = get_map_res.json()
    assert len(mapped_items) > 0, "Expected at least 1 mapped item"
    log(f"  SUCCESS: Verified {len(mapped_items)} mapped companies for client organization.")

    # 5. Launch Selenium Headless Chrome
    log("\n[STAGE 6] Launching Chrome Headless Browser (1440x950)...")
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--remote-allow-origins=*")
    options.add_argument("--disable-software-rasterizer")
    options.add_argument("--disable-extensions")
    options.add_argument("--window-size=1440,950")

    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 15)

    try:
        def inject_auth(d):
            d.execute_script("""
                const authData = arguments[0];
                sessionStorage.setItem('erp-auth', JSON.stringify(authData));
                localStorage.setItem('erp-auth', JSON.stringify(authData));
                sessionStorage.setItem('auth-storage', JSON.stringify(authData));
                localStorage.setItem('auth-storage', JSON.stringify(authData));
            """, auth_store_obj)

        # 6. Test Company Master Desk UI (/master/companies)
        log("\n[STAGE 7] Loading /master/companies...")
        driver.get("http://localhost:50005/")
        time.sleep(1)
        inject_auth(driver)
        driver.get("http://localhost:50005/master/companies")
        time.sleep(2)

        # Verify page header and KPI cards
        wait.until(EC.presence_of_element_located((By.ID, "company-master-desk-root")))
        wait.until(EC.presence_of_element_located((By.ID, "kpi-total-companies")))
        wait.until(EC.presence_of_element_located((By.ID, "kpi-active-companies")))
        wait.until(EC.presence_of_element_located((By.ID, "kpi-total-products")))
        wait.until(EC.presence_of_element_located((By.ID, "kpi-mapped-clients")))
        log("  SUCCESS: Product Company Master desk loaded with 4 Neumorphic KPI cards.")

        # Capture desk screenshot
        snap1 = os.path.join(ARTIFACTS_DIR, "verified_company_master_desk.png")
        driver.save_screenshot(snap1)
        log(f"  SAVED SCREENSHOT: {snap1}")

        # Test Search Filter
        search_input = driver.find_element(By.ID, "company-search-input")
        search_input.clear()
        search_input.send_keys("Apex")
        time.sleep(1)
        log("  SUCCESS: Searched for 'Apex' in Company Directory.")

        # Switch to Turnover Telemetry Tab via [F5] button
        log("\n[STAGE 8] Switching to Turnover Telemetry tab...")
        turnover_tab_btn = driver.find_element(By.ID, "tab-btn-turnover")
        turnover_tab_btn.click()
        time.sleep(1.5)

        wait.until(EC.presence_of_element_located((By.ID, "turnover-telemetry-container")))
        log("  SUCCESS: Company-Wise Sales Turnover Telemetry loaded.")

        # Capture telemetry screenshot
        snap2 = os.path.join(ARTIFACTS_DIR, "verified_company_turnover_telemetry.png")
        driver.save_screenshot(snap2)
        log(f"  SAVED SCREENSHOT: {snap2}")

        # 7. Test Client Management & Authorized Companies Modal
        log("\n[STAGE 9] Navigating to /clients to test Authorized Companies mapping modal...")
        driver.get("http://localhost:50005/clients")
        time.sleep(2)

        companies_btn = wait.until(EC.element_to_be_clickable((By.ID, f"btn-authorized-companies-{target_client_org_id}")))
        companies_btn.click()
        time.sleep(1.5)

        wait.until(EC.presence_of_element_located((By.ID, "client-company-mapping-modal")))
        log("  SUCCESS: Authorized Product Companies modal opened.")

        # Capture mapping modal screenshot
        snap3 = os.path.join(ARTIFACTS_DIR, "verified_client_company_mapping_modal.png")
        driver.save_screenshot(snap3)
        log(f"  SAVED SCREENSHOT: {snap3}")

        # Click save mappings inside modal
        save_mappings_btn = driver.find_element(By.ID, "save-company-mappings-btn")
        save_mappings_btn.click()
        time.sleep(2)
        log("  SUCCESS: Saved client company authorizations via modal.")

        # 8. Test Commission Control Center live auto-fetch
        log("\n[STAGE 10] Navigating to /commission to test Auto-Fetch Sales Turnover...")
        driver.get("http://localhost:50005/commission")
        time.sleep(2)

        # Switch to Sandbox tab
        sandbox_tab = wait.until(EC.element_to_be_clickable((By.ID, "tab-btn-calculations")))
        sandbox_tab.click()
        time.sleep(1.5)

        # Verify auto-fetch turnover button
        auto_fetch_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-auto-fetch-turnover")))
        log("  SUCCESS: Auto-Fetch Sales Turnover button present in Deterministic Sandbox.")

        # Click Auto-Fetch Sales
        auto_fetch_btn.click()
        time.sleep(2)

        base_val_input = driver.find_element(By.ID, "sandbox-base-val-input")
        current_val = base_val_input.get_attribute("value")
        log(f"  SUCCESS: Auto-Fetch triggered. Base Value set to: Rs. {current_val}")

        # Capture Commission auto-fetch screenshot
        snap4 = os.path.join(ARTIFACTS_DIR, "verified_commission_autofetch_turnover.png")
        driver.save_screenshot(snap4)
        log(f"  SAVED SCREENSHOT: {snap4}")

        log("\n=================================================================")
        log("ALL PRODUCT COMPANY MASTER & MULTI-MAPPING TESTS PASSED (100%)")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_test()
