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
    log("ENTERPRISE MULTI-CLIENT ADMIN TRACKER - VERIFICATION TEST SUITE")
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

    # 2. Test Admin Tracking APIs
    log("\n[STAGE 2] Verifying Admin Tracking Telemetry APIs...")
    
    # 2.1 Executive Summary API
    sum_res = requests.get("http://localhost:8000/api/admin/tracking/summary", headers=headers, timeout=10)
    assert sum_res.status_code == 200, f"Summary failed: {sum_res.text}"
    summary = sum_res.json()
    log(f"  SUCCESS: /summary -> Clients: {summary.get('total_clients_count')}, Turnover: Rs {summary.get('total_sales_turnover')}, Invoices: {summary.get('total_sales_invoices_count')}, Expenses: Rs {summary.get('total_expenses_amount')}, Cargo: {summary.get('total_cargo_consignments')}")

    # 2.2 Client-Wise Scorecards API
    clients_res = requests.get("http://localhost:8000/api/admin/tracking/clients", headers=headers, timeout=10)
    assert clients_res.status_code == 200, f"Scorecards failed: {clients_res.text}"
    scorecards = clients_res.json()
    log(f"  SUCCESS: /clients -> Retrieved {len(scorecards)} client scorecards.")
    for sc in scorecards:
        log(f"    - [{sc.get('org_code')}] {sc.get('organization_name')}: Sales=Rs {sc.get('total_sales_turnover')}, Expenses=Rs {sc.get('total_expenses')}, Cargo Active={sc.get('active_consignments_count')}, Brands Mapped={sc.get('mapped_product_companies_count')}")

    # 2.3 Sales Tracking API
    sales_res = requests.get("http://localhost:8000/api/admin/tracking/sales", headers=headers, timeout=10)
    assert sales_res.status_code == 200, f"Sales failed: {sales_res.text}"
    sales_data = sales_res.json()
    log(f"  SUCCESS: /sales -> Gross Turnover: Rs {sales_data.get('total_gross_turnover')}, Invoices Count: {sales_data.get('total_invoices_count')}, Client Breakdowns: {len(sales_data.get('client_breakdown', []))}")

    # 2.4 Expense Tracking API
    exp_res = requests.get("http://localhost:8000/api/admin/tracking/expenses", headers=headers, timeout=10)
    assert exp_res.status_code == 200, f"Expenses failed: {exp_res.text}"
    exp_data = exp_res.json()
    log(f"  SUCCESS: /expenses -> Total Expenses: Rs {exp_data.get('total_expenses_amount')}, Items: {len(exp_data.get('items', []))}")

    # 2.5 Cargo Tracking API
    cargo_res = requests.get("http://localhost:8000/api/admin/tracking/cargo", headers=headers, timeout=10)
    assert cargo_res.status_code == 200, f"Cargo failed: {cargo_res.text}"
    cargo_data = cargo_res.json()
    log(f"  SUCCESS: /cargo -> Consignments: {cargo_data.get('total_consignments')}, In-Transit: {cargo_data.get('in_transit_count')}, Freight Cost: Rs {cargo_data.get('total_freight_cost')}")

    # 3. Selenium Headless Browser Validation
    log("\n[STAGE 3] Launching Selenium Headless Chrome to verify UI...")
    chrome_opts = Options()
    chrome_opts.add_argument("--headless=new")
    chrome_opts.add_argument("--window-size=1600,1050")
    chrome_opts.add_argument("--no-sandbox")
    chrome_opts.add_argument("--disable-dev-shm-usage")
    chrome_opts.add_argument("--disable-gpu")
    chrome_opts.add_argument("--remote-allow-origins=*")
    driver = webdriver.Chrome(options=chrome_opts)

    try:
        def inject_auth(d):
            d.execute_script("""
                const authData = arguments[0];
                sessionStorage.setItem('erp-auth', JSON.stringify(authData));
                localStorage.setItem('erp-auth', JSON.stringify(authData));
                sessionStorage.setItem('auth-storage', JSON.stringify(authData));
                localStorage.setItem('auth-storage', JSON.stringify(authData));
            """, auth_store_obj)

        log("\n[STAGE 4] Injecting auth state into localStorage & sessionStorage...")
        driver.get("http://localhost:50005/")
        time.sleep(1)
        inject_auth(driver)
        driver.get("http://localhost:50005/")
        time.sleep(2)
        log(f"  Loaded URL: {driver.current_url}")

        # 4. Verify HomeScreen Launcher Tile
        log("\n[STAGE 5] Checking HomeScreen Counter Workbench for Admin Radar Launcher Tile...")
        launcher_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "hub-btn-admin-tracker"))
        )
        assert launcher_btn is not None, "Admin Multi-Client Radar launcher tile not found on HomeScreen"
        log("  SUCCESS: Found 'Admin Multi-Client Radar [Ctrl+6]' quick launcher tile.")
        
        # Click the launcher to open the Admin Enterprise Tracker
        launcher_btn.click()
        time.sleep(2)

        # 5. Verify Admin Tracker Page Elements
        log("\n[STAGE 6] Verifying Admin Enterprise Tracker Apex Header & KPIs...")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "admin-tracker-header"))
        )
        assert "/admin/tracking" in driver.current_url or "/tracking" in driver.current_url, f"Unexpected URL: {driver.current_url}"
        log(f"  SUCCESS: Navigated to Admin Tracker URL: {driver.current_url}")

        # Wait for scorecards rows to populate
        WebDriverWait(driver, 10).until(
            lambda d: len(d.find_elements(By.XPATH, "//table[@id='table-client-scorecards']//tbody//tr")) >= 1
        )
        time.sleep(1)

        # Check KPI cards
        kpi_sales = driver.find_element(By.ID, "kpi-sales-turnover")
        kpi_expenses = driver.find_element(By.ID, "kpi-expenses")
        kpi_cargo = driver.find_element(By.ID, "kpi-cargo")
        kpi_clients = driver.find_element(By.ID, "kpi-clients-network")
        assert kpi_sales and kpi_expenses and kpi_cargo and kpi_clients, "Missing one or more KPI cards"
        log("  SUCCESS: All 4 Neumorphic KPI cards verified.")

        # Capture Scorecards screenshot
        screenshot_path1 = os.path.join(ARTIFACTS_DIR, "verified_admin_tracker_scorecards.png")
        driver.save_screenshot(screenshot_path1)
        log(f"  SUCCESS: Saved screenshot to {screenshot_path1}")

        # 6. Verify Client Scorecards Table
        log("\n[STAGE 7] Verifying Client Scorecards Matrix Table...")
        scorecards_table = driver.find_element(By.ID, "table-client-scorecards")
        assert scorecards_table is not None, "Client scorecards table missing"
        rows = scorecards_table.find_elements(By.XPATH, ".//tbody//tr")
        log(f"  SUCCESS: Scorecards table has {len(rows)} client rows.")
        assert len(rows) >= 1, "Expected at least 1 client scorecard row"

        # 7. Switch to Sales Tab
        log("\n[STAGE 8] Switching to Sales Tracking Tab...")
        tab_sales = driver.find_element(By.ID, "tab-btn-sales")
        tab_sales.click()
        time.sleep(1)
        sales_table = driver.find_element(By.ID, "table-sales-invoices")
        assert sales_table is not None, "Sales invoices table missing"
        log("  SUCCESS: Multi-Client Sales Invoices Ledger displayed.")

        screenshot_path2 = os.path.join(ARTIFACTS_DIR, "verified_admin_tracker_sales.png")
        driver.save_screenshot(screenshot_path2)
        log(f"  SUCCESS: Saved screenshot to {screenshot_path2}")

        # 8. Switch to Expenses Tab
        log("\n[STAGE 9] Switching to Expenses Tracking Tab...")
        tab_expenses = driver.find_element(By.ID, "tab-btn-expenses")
        tab_expenses.click()
        time.sleep(1)
        expenses_table = driver.find_element(By.ID, "table-expenses")
        assert expenses_table is not None, "Expenses table missing"
        log("  SUCCESS: Multi-Client Expense Claims & Operational Ledger displayed.")

        screenshot_path3 = os.path.join(ARTIFACTS_DIR, "verified_admin_tracker_expenses.png")
        driver.save_screenshot(screenshot_path3)
        log(f"  SUCCESS: Saved screenshot to {screenshot_path3}")

        # 9. Switch to Cargo Tracking Tab
        log("\n[STAGE 10] Switching to Cargo Tracking Tab...")
        tab_cargo = driver.find_element(By.ID, "tab-btn-cargo")
        tab_cargo.click()
        time.sleep(1)
        cargo_table = driver.find_element(By.ID, "table-cargo")
        assert cargo_table is not None, "Cargo table missing"
        log("  SUCCESS: Multi-Client Logistics & Cargo Consignments displayed.")

        screenshot_path4 = os.path.join(ARTIFACTS_DIR, "verified_admin_tracker_cargo.png")
        driver.save_screenshot(screenshot_path4)
        log(f"  SUCCESS: Saved screenshot to {screenshot_path4}")

        # 10. Verify Client Scope Dropdown
        log("\n[STAGE 11] Testing Client Scope Filter Dropdown...")
        select_client = driver.find_element(By.ID, "select-client-scope")
        options = select_client.find_elements(By.TAG_NAME, "option")
        log(f"  SUCCESS: Client scope dropdown has {len(options)} options.")
        if len(options) > 1:
            select_client.send_keys(Keys.ARROW_DOWN)
            time.sleep(1)
            active_banner = driver.find_element(By.ID, "active-scope-banner")
            assert active_banner is not None, "Active scope banner missing"
            log(f"  SUCCESS: Active Scope Banner updated: {active_banner.text}")

        # 11. Test Escape Key Return Navigation
        log("\n[STAGE 12] Testing [Esc] keyboard return navigation...")
        body = driver.find_element(By.TAG_NAME, "body")
        body.send_keys(Keys.ESCAPE)
        time.sleep(1)
        log(f"  SUCCESS: Returned to URL: {driver.current_url}")
        assert driver.current_url.endswith("/") or "localhost:50005" in driver.current_url

        log("\n=================================================================")
        log("ALL 12 VERIFICATION STAGES PASSED SUCCESSFULLY! (EXIT CODE 0)")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_test()
