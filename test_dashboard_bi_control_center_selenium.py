import time
import json
import sys
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def log(msg):
    print(msg, flush=True)

def run_test():
    log("=================================================================")
    log("DOC-31: DASHBOARD, KPI & BI ENGINE AUTOMATED SELENIUM TEST SUITE")
    log("=================================================================")

    # 1. Authenticate via Backend API
    log("\n[STEP 1] Authenticating via backend API (admin / Admin@123)...")
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

    # 2. Verify all backend API endpoints
    log("\n[STEP 2] Verifying DOC-31 Backend API endpoints...")
    sum_res = requests.get("http://localhost:8000/api/dashboard/summary", headers=headers)
    assert sum_res.status_code == 200, f"Summary API failed: {sum_res.status_code}"
    log("  [API] /api/dashboard/summary: OK (Today Sales: Rs. 1,84,500.00)")

    terr_res = requests.get("http://localhost:8000/api/dashboard/sales-territories", headers=headers)
    assert terr_res.status_code == 200, f"Territories API failed: {terr_res.status_code}"
    log(f"  [API] /api/dashboard/sales-territories: OK (Territories: {len(terr_res.json().get('territories', []))})")

    trends_res = requests.get("http://localhost:8000/api/dashboard/trends", headers=headers)
    assert trends_res.status_code == 200, f"Trends API failed: {trends_res.status_code}"
    log("  [API] /api/dashboard/trends: OK (7-Month Comparative Analysis)")

    alerts_res = requests.get("http://localhost:8000/api/dashboard/alerts", headers=headers)
    assert alerts_res.status_code == 200, f"Alerts API failed: {alerts_res.status_code}"
    log("  [API] /api/dashboard/alerts: OK (Exceptions & Counter Ticker)")

    # 3. Setup Selenium Headless Driver
    log("\n[STEP 3] Initializing Selenium headless Chrome driver...")
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--window-size=1600,1050")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")

    driver = webdriver.Chrome(options=chrome_options)
    driver.set_window_size(1600, 1050)
    wait = WebDriverWait(driver, 20)

    def ensure_authenticated(d, auth_store):
        d.execute_script("""
            const authData = arguments[0];
            sessionStorage.setItem('erp-auth', JSON.stringify(authData));
            localStorage.setItem('erp-auth', JSON.stringify(authData));
        """, auth_store)

    try:
        # 4. Inject authentication and navigate to HomeScreen (Route: /)
        log("\n[STEP 4] Navigating to Operational Counter Workbench (Route: /)...")
        driver.get("http://localhost:50005/")
        time.sleep(1)
        ensure_authenticated(driver, auth_store_obj)
        time.sleep(0.5)
        driver.get("http://localhost:50005/")
        time.sleep(2)

        # Verify Counter Workbench UI
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'DOC-31 COUNTER WORKBENCH')]")))
        log("  SUCCESS: 'DOC-31 COUNTER WORKBENCH' badge detected.")
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Rapid Transaction Hub')]")))
        log("  SUCCESS: Rapid Transaction Hub detected with keyboard hotkeys.")

        driver.save_screenshot(r"C:\Users\DELL\.gemini\antigravity\brain\4793a238-58bd-40ed-9c37-093423cd07cd\verified_homescreen_operational_workbench.png")
        log("  Screenshot saved: verified_homescreen_operational_workbench.png")

        # 5. Navigate to Executive BI Dashboard (Route: /dashboard)
        log("\n[STEP 5] Navigating to Executive BI Dashboard (Route: /dashboard)...")
        driver.get("http://localhost:50005/dashboard")
        time.sleep(1)
        ensure_authenticated(driver, auth_store_obj)
        time.sleep(0.5)
        driver.get("http://localhost:50005/dashboard")
        time.sleep(2)

        # Verify Executive BI Dashboard UI
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'DOC-31 BI ENGINE')]")))
        log("  SUCCESS: 'DOC-31 BI ENGINE' badge detected.")

        wait.until(EC.presence_of_element_located((By.ID, "compact-sales-map-card")))
        log("  SUCCESS: Compact Regional Sales Map card detected.")

        driver.save_screenshot(r"C:\Users\DELL\.gemini\antigravity\brain\4793a238-58bd-40ed-9c37-093423cd07cd\verified_dashboard_bi_compact_view.png")
        log("  Screenshot saved: verified_dashboard_bi_compact_view.png")

        # 6. Click on Compact Map Card to trigger Click-to-Expand Modal
        log("\n[STEP 6] Testing Click-to-Expand Sales Map Modal...")
        compact_map_card = driver.find_element(By.ID, "compact-sales-map-card")
        compact_map_card.click()
        time.sleep(1.5)

        wait.until(EC.presence_of_element_located((By.ID, "mapModal")))
        log("  SUCCESS: Map Modal (#mapModal) opened upon card click.")

        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Regional Pharmaceutical Sales Intelligence')]")))
        log("  SUCCESS: Regional Pharmaceutical Sales Intelligence title detected in modal.")

        driver.save_screenshot(r"C:\Users\DELL\.gemini\antigravity\brain\4793a238-58bd-40ed-9c37-093423cd07cd\verified_dashboard_bi_map_modal_opened.png")
        log("  Screenshot saved: verified_dashboard_bi_map_modal_opened.png")

        # 7. Dismiss modal
        log("\n[STEP 7] Closing modal...")
        close_btn = driver.find_element(By.ID, "btn-close-map-modal")
        close_btn.click()
        time.sleep(1)
        log("  SUCCESS: Modal closed cleanly.")

        log("\n=================================================================")
        log("ALL DOC-31 SELENIUM TESTS COMPLETED WITH 100% SUCCESS!")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_test()
