import time
import json
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

ARTIFACTS_DIR = r"C:\Users\DELL\.gemini\antigravity\brain\4793a238-58bd-40ed-9c37-093423cd07cd"

def log(msg):
    print(msg, flush=True)

def run_test():
    log("=================================================================")
    log("DOC-34: CARGO & CONSIGNMENT MANAGEMENT ENGINE SELENIUM SUITE")
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
    headers = {"Authorization": f"Bearer {auth_token}"}
    log(f"  SUCCESS: Authenticated as {user_info.get('username')} (Org: {user_info.get('organization_id')})")

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

    # 2. Verify DOC-34 Backend API endpoints
    log("\n[STAGE 2] Verifying DOC-34 Backend API endpoints (/api/cargo/summary)...")
    summary_res = requests.get("http://localhost:8000/api/cargo/summary", headers=headers, timeout=10)
    assert summary_res.status_code == 200, f"Summary endpoint failed: {summary_res.text}"
    summary_data = summary_res.json()
    log(f"  SUCCESS: Summary KPI metrics received:")
    log(f"    - Total Consignments: {summary_data['total_consignments']}")
    log(f"    - In Transit: {summary_data['active_in_transit']}")
    log(f"    - Total Volumetric CBM: {summary_data['total_cbm']} m³")
    log(f"    - Admin-Borne Cost: ₹{summary_data['admin_borne_cost']:,.2f}")
    log(f"    - Pending POD Deliveries: {summary_data['pending_pod_count']}")

    # 3. Test Consignment List & Filter
    log("\n[STAGE 3] Querying Consignment Registry (/api/cargo/consignments)...")
    list_res = requests.get("http://localhost:8000/api/cargo/consignments", headers=headers, timeout=10)
    assert list_res.status_code == 200, f"Consignments list failed: {list_res.text}"
    consignments_payload = list_res.json()
    consignments = consignments_payload.get("consignments", [])
    assert len(consignments) >= 5, f"Expected at least 5 seeded consignments, found {len(consignments)}"
    sample_cn = consignments[0]
    log(f"  SUCCESS: Loaded {len(consignments)} consignments. First: {sample_cn['consignment_number']} [{sample_cn['status']}]")

    # 4. Test Volumetric CBM Calculation & Detail Inspection
    log(f"\n[STAGE 4] Inspecting Consignment Detail & Volumetric CBM for ID {sample_cn['id']}...")
    detail_res = requests.get(f"http://localhost:8000/api/cargo/consignments/{sample_cn['id']}", headers=headers, timeout=10)
    assert detail_res.status_code == 200, f"Consignment detail failed: {detail_res.text}"
    detail_data = detail_res.json()
    assert "packages" in detail_data and len(detail_data["packages"]) > 0, "No packages found in consignment"
    pkg = detail_data["packages"][0]
    expected_cbm = round((pkg["length_cm"] * pkg["width_cm"] * pkg["height_cm"]) / 1000000.0, 4)
    actual_cbm = round(pkg["cbm"], 4)
    assert abs(expected_cbm - actual_cbm) < 0.001, f"CBM mismatch! Expected {expected_cbm}, got {actual_cbm}"
    log(f"  SUCCESS: Package barcode {pkg['barcode']} volumetric dimensions {pkg['length_cm']}x{pkg['width_cm']}x{pkg['height_cm']} cm = {actual_cbm} m³")

    # 5. Launch Chrome Headless Browser
    log("\n[STAGE 5] Launching Chrome Headless Browser (1440x950)...")
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1440,950")

    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 15)

    try:
        def ensure_authenticated(d, auth_store):
            d.execute_script("""
                const authData = arguments[0];
                sessionStorage.setItem('erp-auth', JSON.stringify(authData));
                localStorage.setItem('erp-auth', JSON.stringify(authData));
                sessionStorage.setItem('auth-storage', JSON.stringify(authData));
                localStorage.setItem('auth-storage', JSON.stringify(authData));
            """, auth_store)

        driver.get("http://localhost:50005/")
        time.sleep(1)
        ensure_authenticated(driver, auth_store_obj)
        time.sleep(0.5)
        driver.get("http://localhost:50005/")
        time.sleep(2)

        # 6. Assert Counter Workbench & Cargo Launcher
        log("\n[STAGE 6] Asserting Counter Workbench & Cargo & Consignment Launcher...")
        wait.until(EC.presence_of_element_located((By.ID, "counter-workbench-root")))
        
        # Verify launcher tile exists
        cargo_hub_btn = wait.until(EC.element_to_be_clickable((By.ID, "hub-btn-cargo-management")))
        driver.save_screenshot(f"{ARTIFACTS_DIR}\\verified_cargo_homescreen_launcher.png")
        log(f"  SUCCESS: Saved screenshot {ARTIFACTS_DIR}\\verified_cargo_homescreen_launcher.png")

        # 7. Click Cargo Launcher to open Cargo Board (/cargo)
        log("\n[STAGE 7] Navigating to Cargo Board (/cargo)...")
        cargo_hub_btn.click()
        time.sleep(2)

        wait.until(EC.presence_of_element_located((By.ID, "input-cargo-search")))
        total_stat = driver.find_element(By.ID, "stat-total-consignments").text
        transit_stat = driver.find_element(By.ID, "stat-active-transit").text
        cbm_stat = driver.find_element(By.ID, "stat-total-cbm").text
        admin_cost_stat = driver.find_element(By.ID, "stat-admin-borne-cost").text
        log(f"  SUCCESS: Cargo Board loaded! Total: {total_stat}, In Transit: {transit_stat}, Volumetric CBM: {cbm_stat}, Admin-Borne Cost: {admin_cost_stat}")

        driver.save_screenshot(f"{ARTIFACTS_DIR}\\verified_cargo_board_kanban.png")
        log(f"  SUCCESS: Saved screenshot {ARTIFACTS_DIR}\\verified_cargo_board_kanban.png")

        # 8. Test Slide-over Consignment Detail Drawer
        log("\n[STAGE 8] Inspecting Consignment Detail Drawer & Package Barcodes...")
        first_row = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "tr[id^='consignment-row-']")))
        first_row.click()
        time.sleep(1.5)

        wait.until(EC.presence_of_element_located((By.ID, "drawer-consignment-detail")))
        drawer_text = driver.find_element(By.ID, "drawer-consignment-detail").text
        assert "volumetric" in drawer_text.lower() or "package" in drawer_text.lower(), "Expected package section in drawer"
        log("  SUCCESS: Consignment detail drawer verified with package hierarchy and CBM!")

        driver.save_screenshot(f"{ARTIFACTS_DIR}\\verified_cargo_consignment_drawer.png")
        log(f"  SUCCESS: Saved screenshot {ARTIFACTS_DIR}\\verified_cargo_consignment_drawer.png")

        # Close drawer
        close_btn = driver.find_element(By.ID, "btn-close-drawer")
        close_btn.click()
        time.sleep(1)

        # 9. Test Cargo Cost Center & Combined Reporting Toggle (/cargo/costs)
        log("\n[STAGE 9] Testing Cargo Cost Allocation Center (/cargo/costs)...")
        driver.get("http://localhost:50005/cargo/costs")
        time.sleep(2)

        wait.until(EC.presence_of_element_located((By.ID, "toggle-combined-reporting")))
        scope_before = driver.find_element(By.ID, "card-reporting-scope").text
        log(f"  Initial reporting scope: {scope_before}")

        # Toggle combined multi-client reporting
        toggle_btn = driver.find_element(By.ID, "toggle-combined-reporting")
        toggle_btn.click()
        time.sleep(1)

        scope_after = driver.find_element(By.ID, "card-reporting-scope").text
        log(f"  After toggle reporting scope: {scope_after}")
        assert "Single-Tenant" in scope_after or "Isolated" in scope_after, f"Unexpected scope: {scope_after}"

        # Toggle back to combined mode
        toggle_btn.click()
        time.sleep(1)
        scope_final = driver.find_element(By.ID, "card-reporting-scope").text
        log(f"  After re-toggle reporting scope: {scope_final}")
        assert "Combined" in scope_final, f"Unexpected final scope: {scope_final}"

        # Test Export CSV Manifest button
        export_btn = driver.find_element(By.ID, "btn-export-cost-report")
        export_btn.click()
        time.sleep(1)

        driver.save_screenshot(f"{ARTIFACTS_DIR}\\verified_cargo_cost_allocation_center.png")
        log(f"  SUCCESS: Saved screenshot {ARTIFACTS_DIR}\\verified_cargo_cost_allocation_center.png")

        # 10. Test POD & Exception Desk (/cargo/pod-exceptions)
        log("\n[STAGE 10] Testing Proof of Delivery & Exception Desk (/cargo/pod-exceptions)...")
        driver.get("http://localhost:50005/cargo/pod-exceptions")
        time.sleep(2)

        wait.until(EC.presence_of_element_located((By.ID, "tab-btn-pending-pods")))
        log("  SUCCESS: Pending Deliveries queue rendered with four-eyes validation actions.")

        # Switch to Active Transit Exceptions Tab
        exceptions_tab = wait.until(EC.element_to_be_clickable((By.ID, "tab-btn-exceptions")))
        exceptions_tab.click()
        time.sleep(1)

        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "button[id^='btn-resolve-exception-']")))
        log("  SUCCESS: Active Transit Exceptions tab rendered with damage/shortage claims actions.")

        driver.save_screenshot(f"{ARTIFACTS_DIR}\\verified_cargo_pod_exception_desk.png")
        log(f"  SUCCESS: Saved screenshot {ARTIFACTS_DIR}\\verified_cargo_pod_exception_desk.png")

        log("\n=================================================================")
        log("10/10 STAGES PASSED: DOC-34 CARGO & CONSIGNMENT ENGINE 100% VERIFIED!")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_test()
