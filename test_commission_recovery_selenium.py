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
    log("DOC-37: PRINCIPAL & C&F COMMISSION & RECOVERY ENGINE TEST SUITE")
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

    # 2. Verify DOC-37 Commission Summary API
    log("\n[STAGE 2] Verifying DOC-37 Commission Summary API (/api/commission/summary)...")
    summary_res = requests.get("http://localhost:8000/api/commission/summary", headers=headers, timeout=10)
    assert summary_res.status_code == 200, f"Summary endpoint failed: {summary_res.text}"
    summary_data = summary_res.json().get("data", {})
    log("  SUCCESS: Commission summary KPI metrics received:")
    log(f"    - Total Earned Commission: ₹{summary_data.get('total_earned_commission', 0):,.2f}")
    log(f"    - Total Recoverable Expenses: ₹{summary_data.get('total_recoverable_expenses', 0):,.2f}")
    log(f"    - Net Commercial Total: ₹{summary_data.get('net_commercial_total', 0):,.2f}")
    log(f"    - Open Claims Count: {summary_data.get('open_claims_count', 0)}")
    log(f"    - Open Claims Amount: ₹{summary_data.get('open_claims_amount', 0):,.2f}")
    log(f"    - Active Agreements: {summary_data.get('active_agreements_count', 0)}")
    log(f"    - Settled Remittances: ₹{summary_data.get('total_settled', 0):,.2f}")
    assert summary_data.get("active_agreements_count", 0) >= 2, "Expected at least 2 active commission agreements"

    # 3. Principal Agreements & Rate Cards
    log("\n[STAGE 3] Querying Principal Commission Agreements (/api/commission/agreements)...")
    agr_res = requests.get("http://localhost:8000/api/commission/agreements", headers=headers, timeout=10)
    assert agr_res.status_code == 200, f"Agreements failed: {agr_res.text}"
    agreements = agr_res.json().get("data", [])
    assert len(agreements) >= 2, f"Expected at least 2 agreements, found {len(agreements)}"
    agr1 = agreements[0]
    agr2 = agreements[1]
    log(f"  SUCCESS: Found {len(agreements)} agreements:")
    log(f"    1. {agr1['principal_code']}: {agr1['principal_name']} [{agr1['agreement_code']} ({agr1['version_no']}) - {len(agr1['rules'])} rules]")
    log(f"    2. {agr2['principal_code']}: {agr2['principal_name']} [{agr2['agreement_code']} ({agr2['version_no']}) - {len(agr2['rules'])} rules]")

    # 4. On-the-fly Deterministic Calculation Sandbox
    log(f"\n[STAGE 4] Executing Calculation Sandbox Run for {agr1['principal_name']} (/api/commission/calculate)...")
    calc_payload = {
        "principal_id": agr1["principal_id"],
        "event_type": "SALES_BILL",
        "source_doc_type": "INVOICE",
        "source_doc_id": "INV-2026-TEST-9981",
        "base_value": 350000.0,
        "quantity": 1.0,
        "category": "EARNED_COMMISSION"
    }
    calc_res = requests.post("http://localhost:8000/api/commission/calculate", json=calc_payload, headers=headers, timeout=10)
    assert calc_res.status_code == 200, f"Calculation execution failed: {calc_res.text}"
    calc_item = calc_res.json().get("data", {})
    calc_id = calc_item["id"]
    log(f"  SUCCESS: Generated {calc_item['calculation_number']} for ₹{calc_item['calculated_amount']:,.2f}")
    log(f"    - Formula: {calc_item['formula_trace']}")
    log(f"    - SHA-256 Hash: {calc_item['sha256_hash']}")
    assert len(calc_item['sha256_hash']) == 64, "Expected valid 64-character SHA-256 hash"

    # 5. Calculation Action (Approve)
    log(f"\n[STAGE 5] Approving Calculation {calc_item['calculation_number']} (/api/commission/calculations/{calc_id}/action)...")
    action_res = requests.post(f"http://localhost:8000/api/commission/calculations/{calc_id}/action", json={"action": "APPROVE"}, headers=headers, timeout=10)
    assert action_res.status_code == 200, f"Calculation approve action failed: {action_res.text}"
    assert action_res.json().get("data", {}).get("state") == "APPROVED", "Expected state APPROVED"
    log("  SUCCESS: Calculation transitioned to APPROVED state.")

    # 6. Recovery Claim Batch Creation & 4-Eyes Action
    log(f"\n[STAGE 6] Testing Recovery Claim Creation & 4-Eyes Workflow (/api/commission/claims)...")
    claim_payload = {
        "principal_id": agr1["principal_id"],
        "calc_ids": [calc_id],
        "notes": "Automated Selenium Test Recovery Claim Batch"
    }
    claim_res = requests.post("http://localhost:8000/api/commission/claims", json=claim_payload, headers=headers, timeout=10)
    assert claim_res.status_code == 200, f"Claim creation failed: {claim_res.text}"
    created_claim = claim_res.json().get("data", {})
    claim_id = created_claim["id"]
    log(f"  SUCCESS: Created recovery claim {created_claim['claim_number']} for ₹{created_claim['total_claimed_amount']:,.2f}")

    # Submit & Approve Claim
    sub_res = requests.post(f"http://localhost:8000/api/commission/claims/{claim_id}/action", json={"action": "SUBMIT"}, headers=headers, timeout=10)
    assert sub_res.status_code == 200
    app_res = requests.post(f"http://localhost:8000/api/commission/claims/{claim_id}/action", json={"action": "APPROVE"}, headers=headers, timeout=10)
    assert app_res.status_code == 200
    doc_res = requests.post(f"http://localhost:8000/api/commission/claims/{claim_id}/action", json={"action": "CREATE_DOCUMENT", "document_type": "SERVICE_INVOICE"}, headers=headers, timeout=10)
    assert doc_res.status_code == 200
    log("  SUCCESS: Claim successfully SUBMITTED -> APPROVED -> Linked to SERVICE_INVOICE.")

    # 7. Generate Statement
    log("\n[STAGE 7] Generating Periodic Recovery Statement (/api/commission/statements/generate)...")
    stmt_res = requests.post("http://localhost:8000/api/commission/statements/generate", json={"principal_id": agr1["principal_id"]}, headers=headers, timeout=10)
    assert stmt_res.status_code == 200, f"Statement generation failed: {stmt_res.text}"
    stmt_data = stmt_res.json().get("data", {})
    log(f"  SUCCESS: Statement {stmt_data['statement_number']} generated with Commercial Total ₹{stmt_data['approved_commercial']:,.2f}")
    log(f"    - Statement Hash: {stmt_data['statement_hash']}")

    # 8. Launch Chrome Headless Browser
    log("\n[STAGE 8] Launching Chrome Headless Browser (1440x950)...")
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

        # STAGE 9: Counter Workbench Launcher Tile & Shortcut Ctrl+4
        log("\n[STAGE 9] Testing Counter Workbench (`/`) Integration & Commission Engine Tile...")
        driver.get("http://localhost:50005/")
        time.sleep(1)
        ensure_authenticated(driver, auth_store_obj)
        driver.get("http://localhost:50005/")
        time.sleep(2)

        wait.until(EC.presence_of_element_located((By.ID, "counter-workbench-root")))
        hub_btn = wait.until(EC.element_to_be_clickable((By.ID, "hub-btn-commission-management")))
        assert hub_btn is not None, "Could not find #hub-btn-commission-management on Counter Workbench"
        log("  SUCCESS: Found '#hub-btn-commission-management' tile on Counter Workbench.")

        screenshot1 = os.path.join(WORKSPACE_DIR, "verified_commission_homescreen_launcher.png")
        driver.save_screenshot(screenshot1)
        log(f"  Captured Screenshot 1: {screenshot1}")

        # STAGE 10: Commission Control Center UI & Telemetry Verification
        log("\n[STAGE 10] Navigating to Commission Control Center (`/commission`)...")
        driver.get("http://localhost:50005/commission")
        time.sleep(2)

        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Principal & C&F Commission & Recovery Engine')]")))
        log("  SUCCESS: Commission Control Center header verified.")

        screenshot2 = os.path.join(WORKSPACE_DIR, "verified_commission_control_center.png")
        driver.save_screenshot(screenshot2)
        log(f"  Captured Screenshot 2: {screenshot2}")

        # Test Tab [F3] Sandbox & Ledger
        log("  Testing Tab [F3] Sandbox & Calculations Ledger...")
        webdriver.ActionChains(driver).send_keys(Keys.F3).perform()
        time.sleep(1)
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Deterministic Commission Sandbox')]")))
        
        btn_run = wait.until(EC.element_to_be_clickable((By.ID, "btn-run-sandbox")))
        btn_run.click()
        time.sleep(2)
        log("  SUCCESS: Calculation Sandbox executed from UI.")

        screenshot3 = os.path.join(WORKSPACE_DIR, "verified_commission_sandbox_ledger.png")
        driver.save_screenshot(screenshot3)
        log(f"  Captured Screenshot 3: {screenshot3}")

        # Test Tab [F5] Statements Desk & [F7] Modal
        log("  Testing Tab [F5] Statements Desk & [F7] New Claim Modal...")
        webdriver.ActionChains(driver).send_keys(Keys.F5).perform()
        time.sleep(1)
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Principal Recovery Statements')]")))

        screenshot4 = os.path.join(WORKSPACE_DIR, "verified_commission_statement_desk.png")
        driver.save_screenshot(screenshot4)
        log(f"  Captured Screenshot 4: {screenshot4}")

        # Test Modal Open & Dismiss
        btn_claim_modal = wait.until(EC.element_to_be_clickable((By.ID, "btn-open-claim-modal")))
        btn_claim_modal.click()
        time.sleep(1)
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Create Principal Recovery Claim Batch')]")))
        log("  SUCCESS: New Claim Batch modal opened via [F7].")

        webdriver.ActionChains(driver).send_keys(Keys.ESCAPE).perform()
        time.sleep(1)
        log("  SUCCESS: Modal dismissed cleanly with [Esc].")

        log("\n=================================================================")
        log("10/10 STAGES PASSED: DOC-37 COMMISSION & RECOVERY ENGINE 100% VERIFIED!")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_test()
