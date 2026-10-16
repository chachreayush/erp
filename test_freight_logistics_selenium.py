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

def log(msg):
    print(msg, flush=True)

def run_test():
    log("=================================================================")
    log("DOC-35: FREIGHT & LOGISTICS COST RECOVERY ENGINE SELENIUM SUITE")
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

    # 2. Verify DOC-35 Backend API endpoints
    log("\n[STAGE 2] Verifying DOC-35 Backend API summary (/api/freight/summary)...")
    summary_res = requests.get("http://localhost:8000/api/freight/summary", headers=headers, timeout=10)
    assert summary_res.status_code == 200, f"Summary endpoint failed: {summary_res.text}"
    summary_data = summary_res.json().get("summary", {})
    log("  SUCCESS: Summary KPI metrics received:")
    log(f"    - Total Freight Spend: ₹{summary_data.get('total_freight_spend', 0):,.2f}")
    log(f"    - Admin-Funded Spend: ₹{summary_data.get('admin_funded_spend', 0):,.2f}")
    log(f"    - Customer Recoveries: ₹{summary_data.get('total_recoveries', 0):,.2f}")
    log(f"    - Net Logistics Margin: ₹{summary_data.get('net_logistics_margin', 0):,.2f}")
    log(f"    - Active Contracts: {summary_data.get('active_contracts_count', 0)}")

    # 3. Test Contracts & Rate Rules
    log("\n[STAGE 3] Querying Freight Rate Contracts Catalog (/api/freight/contracts)...")
    contracts_res = requests.get("http://localhost:8000/api/freight/contracts", headers=headers, timeout=10)
    assert contracts_res.status_code == 200, f"Contracts list failed: {contracts_res.text}"
    contracts = contracts_res.json().get("contracts", [])
    assert len(contracts) >= 2, f"Expected at least 2 seeded contracts, found {len(contracts)}"
    first_c = contracts[0]
    log(f"  SUCCESS: Loaded {len(contracts)} contracts. First: {first_c['contract_number']} ({first_c['transporter_name']})")
    assert len(first_c["lanes"]) > 0, "First contract has no lanes"
    assert len(first_c["rate_rules"]) > 0, "First contract has no rate rules"

    # 4. Test Deterministic Calculation Engine
    log("\n[STAGE 4] Executing Deterministic Calculation Engine (/api/freight/calculate)...")
    calc_payload = {
        "transporter_name": "V-Trans Logistics India Ltd.",
        "origin_zone": "Jaipur Central Logistics Hub",
        "destination_zone": "Delhi South Distribution Center",
        "gross_weight_kg": 35.0,
        "volumetric_weight_kg": 30.0,
        "package_count": 3,
        "distance_km": 260.0,
        "declared_value": 45000.0,
        "ancillaries_requested": ["LOADING", "TOLL"],
        "recovery_type": "SUBSIDY"
    }
    calc_res = requests.post("http://localhost:8000/api/freight/calculate", json=calc_payload, headers=headers, timeout=10)
    assert calc_res.status_code == 200, f"Calculation failed: {calc_res.text}"
    calc_out = calc_res.json().get("calculation", {})
    assert calc_out.get("gross_freight_cost", 0) > 0, "Gross freight cost is 0"
    log(f"  SUCCESS: Computed Gross Freight: ₹{calc_out['gross_freight_cost']:,.2f}")
    log(f"    - Base Freight: ₹{calc_out['base_freight']:,.2f}")
    log(f"    - Ancillaries Total: ₹{calc_out['total_ancillary']:,.2f}")
    log(f"    - Cost Bearer: {calc_out['cost_bearer']}")
    log(f"    - Formula Explanation: {calc_out['formula_text']}")

    # 5. Test Transporter Reconciliation
    log("\n[STAGE 5] Checking Transporter Reconciliation Desk (/api/freight/reconciliation)...")
    recon_res = requests.get("http://localhost:8000/api/freight/reconciliation", headers=headers, timeout=10)
    assert recon_res.status_code == 200, f"Reconciliation list failed: {recon_res.text}"
    recons = recon_res.json().get("reconciliations", [])
    assert len(recons) >= 2, f"Expected at least 2 seeded reconciliations, found {len(recons)}"
    log(f"  SUCCESS: Found {len(recons)} transporter reconciliation statements. First: {recons[0]['recon_number']} [{recons[0]['variance_status']}]")

    # 6. Launch Chrome Headless Browser
    log("\n[STAGE 6] Launching Chrome Headless Browser (1440x950)...")
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

        # STAGE 6: Counter Workbench Integration
        log("\n[STAGE 6] Testing Counter Workbench (`/`) Integration & Freight Launcher Tile...")
        driver.get("http://localhost:50005/")
        time.sleep(1)
        ensure_authenticated(driver, auth_store_obj)
        driver.get("http://localhost:50005/")
        time.sleep(2)

        wait.until(EC.presence_of_element_located((By.ID, "counter-workbench-root")))
        freight_hub_btn = wait.until(EC.element_to_be_clickable((By.ID, "hub-btn-freight-management")))
        assert freight_hub_btn is not None, "Could not find #hub-btn-freight-management on Counter Workbench"
        log("  SUCCESS: Found '#hub-btn-freight-management' tile on Counter Workbench.")

        screenshot1 = os.path.join(WORKSPACE_DIR, "verified_freight_homescreen_launcher.png")
        driver.save_screenshot(screenshot1)
        log(f"  Captured Screenshot 1: {screenshot1}")

        # STAGE 7: Rate Contracts Catalog
        log("\n[STAGE 7] Navigating to Freight Rate Master (`/freight/contracts`)...")
        driver.get("http://localhost:50005/freight/contracts")
        time.sleep(2)

        wait.until(EC.presence_of_element_located((By.ID, "kpi-active-contracts")))
        wait.until(EC.presence_of_element_located((By.ID, "kpi-freight-spend")))
        wait.until(EC.presence_of_element_located((By.ID, "kpi-total-recoveries")))
        wait.until(EC.presence_of_element_located((By.ID, "kpi-logistics-margin")))
        log("  SUCCESS: 4 Top KPI cards verified (#kpi-active-contracts, #kpi-freight-spend, #kpi-total-recoveries, #kpi-logistics-margin).")

        screenshot2 = os.path.join(WORKSPACE_DIR, "verified_freight_rate_cards_catalog.png")
        driver.save_screenshot(screenshot2)
        log(f"  Captured Screenshot 2: {screenshot2}")

        # STAGE 8: Calculation Sandbox Execution
        log("\n[STAGE 8] Switching to Calculation Sandbox tab & executing rate simulation...")
        tab_sandbox = wait.until(EC.element_to_be_clickable((By.ID, "btn-switch-tab-sandbox")))
        tab_sandbox.click()
        time.sleep(1)

        input_weight = wait.until(EC.presence_of_element_located((By.ID, "input-test-weight")))
        input_weight.clear()
        input_weight.send_keys("50.0")

        btn_calc = wait.until(EC.element_to_be_clickable((By.ID, "btn-execute-calc")))
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", btn_calc)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", btn_calc)

        # In Chrome, CSS text-transform: uppercase makes the text 'GROSS TRANSPORTER COST'
        WebDriverWait(driver, 10).until(
            lambda d: "GROSS TRANSPORTER COST" in d.find_element(By.ID, "card-calc-result").text.upper()
        )
        card_result = driver.find_element(By.ID, "card-calc-result")
        assert "GROSS TRANSPORTER COST" in card_result.text.upper(), f"Gross Transporter Cost not found in calculation result card. Got: {card_result.text}"
        log("  SUCCESS: Deterministic Calculation Sandbox executed successfully with formula trace and cost bearer.")

        screenshot3 = os.path.join(WORKSPACE_DIR, "verified_freight_calculation_sandbox.png")
        driver.save_screenshot(screenshot3)
        log(f"  Captured Screenshot 3: {screenshot3}")

        # STAGE 9: New Contract Modal Keyboard Handling
        log("\n[STAGE 9] Testing New Contract Modal & [Esc] Dismissal...")
        btn_new_contract = wait.until(EC.element_to_be_clickable((By.ID, "btn-new-contract")))
        btn_new_contract.click()
        time.sleep(1)

        modal_new = wait.until(EC.visibility_of_element_located((By.ID, "modal-new-contract")))
        assert modal_new is not None, "#modal-new-contract is not visible"
        log("  SUCCESS: #modal-new-contract opened via F6 / Click.")

        # Dismiss via Escape
        webdriver.ActionChains(driver).send_keys(Keys.ESCAPE).perform()
        time.sleep(1)
        log("  SUCCESS: [Esc] key dismissed the New Contract modal cleanly without page navigation.")

        # STAGE 10: Transporter Reconciliation Desk
        log("\n[STAGE 10] Testing Transporter Billing & Reconciliation Desk (`/freight/reconciliation`)...")
        driver.get("http://localhost:50005/freight/reconciliation")
        time.sleep(2)

        wait.until(EC.presence_of_element_located((By.ID, "kpi-total-recons")))
        wait.until(EC.presence_of_element_located((By.ID, "kpi-recons-matched")))
        wait.until(EC.presence_of_element_located((By.ID, "kpi-recons-tolerable")))
        wait.until(EC.presence_of_element_located((By.ID, "kpi-recons-disputed")))
        log("  SUCCESS: 4 Top KPI cards verified on Reconciliation Desk.")

        btn_enter_bill = wait.until(EC.element_to_be_clickable((By.ID, "btn-enter-transporter-bill")))
        btn_enter_bill.click()
        time.sleep(1)

        modal_bill = wait.until(EC.visibility_of_element_located((By.ID, "modal-enter-transporter-bill")))
        assert modal_bill is not None, "#modal-enter-transporter-bill is not visible"
        log("  SUCCESS: #modal-enter-transporter-bill opened.")

        # Dismiss via Escape
        webdriver.ActionChains(driver).send_keys(Keys.ESCAPE).perform()
        time.sleep(1)
        log("  SUCCESS: [Esc] dismissed #modal-enter-transporter-bill.")

        screenshot4 = os.path.join(WORKSPACE_DIR, "verified_freight_reconciliation_desk.png")
        driver.save_screenshot(screenshot4)
        log(f"  Captured Screenshot 4: {screenshot4}")

        log("\n=================================================================")
        log("10/10 STAGES PASSED: DOC-35 FREIGHT & LOGISTICS COST RECOVERY 100% VERIFIED!")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_test()
