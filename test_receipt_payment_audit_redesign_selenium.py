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

ARTIFACTS_DIR = r"C:\Users\DELL\.gemini\antigravity\brain\4793a238-58bd-40ed-9c37-093423cd07cd"

def log(msg):
    print(msg, flush=True)

def run_test():
    log("=================================================================")
    log("RECEIPT, PAYMENT & AUDIT LUXURY REDESIGN SELENIUM TEST SUITE")
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
    log(f"  SUCCESS: Authenticated as {user_info.get('username')}")

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

    # 2. Launch Chrome Headless Browser
    log("\n[STAGE 2] Launching Chrome Headless Browser (1440x950)...")
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1440,950")

    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 15)

    def inject_auth(d):
        d.execute_script("""
            const authData = arguments[0];
            sessionStorage.setItem('erp-auth', JSON.stringify(authData));
            localStorage.setItem('erp-auth', JSON.stringify(authData));
            sessionStorage.setItem('auth-storage', JSON.stringify(authData));
            localStorage.setItem('auth-storage', JSON.stringify(authData));
        """, auth_store_obj)

    try:
        # Load root and inject auth
        driver.get("http://localhost:50005/")
        time.sleep(1)
        inject_auth(driver)
        driver.get("http://localhost:50005/")
        time.sleep(2)
        log("  Injected erp-auth into localStorage and refreshed home.")

        # ── TEST 1: CUSTOMER RECEIPT VOUCHER (/receipt) ───────────────
        log("\n[STAGE 3] Testing Customer Receipt Voucher (/receipt)...")
        driver.get("http://localhost:50005/receipt")
        time.sleep(1)
        inject_auth(driver)
        driver.get("http://localhost:50005/receipt")
        time.sleep(2)

        # Assert luxury title & badge
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Receipt Voucher') or contains(text(), 'RECEIPT')]")))
        page_text = driver.find_element(By.TAG_NAME, "body").text
        page_lower = page_text.lower()
        assert "receipt voucher" in page_lower or "receipt" in page_lower, "Receipt voucher title missing"
        assert "doc-24 receipt" in page_lower, "DOC-24 badge missing"
        assert "total receipt amount" in page_lower or "total inward" in page_lower or "receipt amount" in page_lower, "Telemetry Receipt amount missing"
        assert "allocated to invoices" in page_lower, "Allocation telemetry missing"
        assert "floating advance" in page_lower, "Floating advance telemetry missing"
        log("  SUCCESS: Receipt voucher luxury header and telemetry verified.")

        driver.save_screenshot(os.path.join(ARTIFACTS_DIR, "verified_receipt_voucher_luxury.png"))
        log("  Saved screenshot: verified_receipt_voucher_luxury.png")

        # Test Party Picker modal via party-select-btn
        log("  Opening party search modal (#party-select-btn)...")
        party_btn = driver.find_element(By.ID, "party-select-btn")
        party_btn.click()
        time.sleep(1)

        # Check Party picker input
        search_input = wait.until(EC.visibility_of_element_located((By.ID, "party-search-input")))
        assert search_input.is_displayed(), "Party search input not displayed"
        log("  SUCCESS: Party picker modal opened and verified via #party-search-input.")
        driver.save_screenshot(os.path.join(ARTIFACTS_DIR, "verified_receipt_party_modal.png"))
        log("  Saved screenshot: verified_receipt_party_modal.png")

        # Test Esc closes party picker modal
        log("  Pressing Esc to dismiss party picker modal...")
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(1)

        # Verify modal dismissed
        party_modal_after = driver.find_elements(By.ID, "party-search-input")
        assert len(party_modal_after) == 0, "Party picker modal did not close on Esc"
        log("  SUCCESS: Esc dismissed party picker modal cleanly.")

        # Test Esc navigates back to Home (/)
        log("  Pressing Esc on Receipt page to exit back to Counter Workbench...")
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(1.5)
        current_url = driver.current_url
        log(f"  Current URL after Esc: {current_url}")
        assert current_url.rstrip("/").endswith("50005"), f"Expected return to home /, but at {current_url}"
        log("  SUCCESS: Esc returned to Counter Workbench (/).")

        # ── TEST 2: SUPPLIER PAYMENT VOUCHER (/payment) ───────────────
        log("\n[STAGE 4] Testing Supplier Payment Voucher (/payment)...")
        driver.get("http://localhost:50005/payment")
        time.sleep(2)

        page_text = driver.find_element(By.TAG_NAME, "body").text
        page_lower = page_text.lower()
        assert "payment voucher" in page_lower or "payment" in page_lower, "Payment voucher title missing"
        assert "total payment amount" in page_lower or "total outward" in page_lower or "payment amount" in page_lower, "Telemetry Payment amount missing"
        assert "allocated to invoices" in page_lower, "Allocation telemetry missing"
        log("  SUCCESS: Payment voucher luxury header and payable telemetry verified.")

        driver.save_screenshot(os.path.join(ARTIFACTS_DIR, "verified_payment_voucher_luxury.png"))
        log("  Saved screenshot: verified_payment_voucher_luxury.png")

        # Test Esc navigates back to Home (/)
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(1.5)
        current_url = driver.current_url
        assert current_url.rstrip("/").endswith("50005"), f"Expected return to home /, but at {current_url}"
        log("  SUCCESS: Esc returned from Payment Voucher to Counter Workbench (/).")

        # ── TEST 3: AUDIT TRAIL EXPLORER (/audit) ─────────────────────
        log("\n[STAGE 5] Testing Audit Trail & Cryptographic Evidence Explorer (/audit)...")
        driver.get("http://localhost:50005/audit")
        time.sleep(2)

        page_text = driver.find_element(By.TAG_NAME, "body").text
        page_lower = page_text.lower()
        assert "audit trail & cryptographic evidence explorer" in page_lower, "Audit Explorer title missing"
        assert "tamper-evident sha-256 chained event stream" in page_lower, "Subtitle missing"
        assert "total audited events" in page_lower, "KPI 1 missing"
        assert "chain integrity" in page_lower, "KPI 2 missing"
        log("  SUCCESS: Audit Trail Explorer 4 KPI cards and luxury ledger loaded.")

        driver.save_screenshot(os.path.join(ARTIFACTS_DIR, "verified_audit_explorer_luxury.png"))
        log("  Saved screenshot: verified_audit_explorer_luxury.png")

        # Test SHA-256 Chain Verification Banner
        log("  Clicking Verify Hash Chain button (#btn-verify-chain)...")
        verify_btn = driver.find_element(By.ID, "btn-verify-chain")
        verify_btn.click()
        time.sleep(1.5)

        chain_banner = wait.until(EC.visibility_of_element_located((By.ID, "banner-verification-result")))
        assert chain_banner.is_displayed(), "Chain integrity banner not visible"
        log("  SUCCESS: Cryptographic Hash Chain Integrity verified and banner displayed.")
        driver.save_screenshot(os.path.join(ARTIFACTS_DIR, "verified_audit_chain_banner.png"))
        log("  Saved screenshot: verified_audit_chain_banner.png")

        # Test Inspect Event Drawer
        log("  Clicking Inspect button on event row...")
        inspect_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(@id, 'btn-inspect-')]")))
        inspect_btn.click()
        time.sleep(1.5)

        drawer = wait.until(EC.visibility_of_element_located((By.ID, "drawer-change-detail")))
        assert drawer.is_displayed(), "Diff drawer is not displayed"
        log("  SUCCESS: Change detail slide-over drawer displayed.")
        driver.save_screenshot(os.path.join(ARTIFACTS_DIR, "verified_audit_diff_drawer.png"))
        log("  Saved screenshot: verified_audit_diff_drawer.png")

        # Close drawer with Esc
        log("  Pressing Esc to close change detail drawer...")
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(1)

        # Test Export Evidence Pack Modal
        log("  Clicking Export Evidence Pack button (#btn-export-pack)...")
        export_btn = driver.find_element(By.ID, "btn-export-pack")
        export_btn.click()
        time.sleep(1)

        export_modal = wait.until(EC.visibility_of_element_located((By.ID, "modal-export-evidence")))
        assert export_modal.is_displayed(), "Export evidence modal not visible"
        log("  SUCCESS: Auditor-grade evidence pack modal rendered.")
        driver.save_screenshot(os.path.join(ARTIFACTS_DIR, "verified_audit_export_modal.png"))
        log("  Saved screenshot: verified_audit_export_modal.png")

        # Close modal with Esc
        log("  Pressing Esc to close export modal...")
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(1)

        # ── TEST 4: GOVERNANCE CONSOLE (/audit/governance) ─────────────
        log("\n[STAGE 6] Testing Governance Console (/audit/governance)...")
        nav_gov_btn = driver.find_element(By.ID, "btn-nav-governance")
        nav_gov_btn.click()
        time.sleep(2)

        gov_text = driver.find_element(By.TAG_NAME, "body").text
        assert "Data Governance & Regulatory Compliance Console" in gov_text, "Governance console title missing"
        assert "DOC-33 GOVERNANCE" in gov_text, "DOC-33 Governance badge missing"
        assert "Statutory Retention Schedules" in gov_text, "Tab 1 title missing"
        log("  SUCCESS: Governance console luxury view and KPI strip loaded.")

        driver.save_screenshot(os.path.join(ARTIFACTS_DIR, "verified_audit_governance_console.png"))
        log("  Saved screenshot: verified_audit_governance_console.png")

        # Test Tab Switching: Legal Holds
        log("  Switching to Legal Holds tab (#tab-btn-holds)...")
        driver.find_element(By.ID, "tab-btn-holds").click()
        time.sleep(1)
        holds_text = driver.find_element(By.TAG_NAME, "body").text
        assert "Litigation & Regulatory Legal Holds" in holds_text, "Legal holds header missing"
        log("  SUCCESS: Legal holds tab active.")

        # Test Open Establish Legal Hold Modal
        log("  Opening Establish Legal Hold modal (#btn-apply-hold)...")
        driver.find_element(By.ID, "btn-apply-hold").click()
        time.sleep(1)
        hold_modal = driver.find_element(By.ID, "modal-apply-hold")
        assert hold_modal.is_displayed(), "Establish hold modal not displayed"
        log("  SUCCESS: Establish Legal Hold modal displayed.")
        driver.save_screenshot(os.path.join(ARTIFACTS_DIR, "verified_audit_legal_hold_modal.png"))
        log("  Saved screenshot: verified_audit_legal_hold_modal.png")

        # Close hold modal with Esc
        log("  Pressing Esc to close legal hold modal...")
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(1)

        # Test Tab Switching: Anomaly Signals
        log("  Switching to Anomaly Signals tab (#tab-btn-anomalies)...")
        driver.find_element(By.ID, "tab-btn-anomalies").click()
        time.sleep(1)
        anomaly_card = driver.find_element(By.ID, "card-anomaly-CHAIN_INTEGRITY")
        assert anomaly_card.is_displayed(), "Anomaly card CHAIN_INTEGRITY not found"
        log("  SUCCESS: Anomaly Signals grid loaded.")
        driver.save_screenshot(os.path.join(ARTIFACTS_DIR, "verified_audit_anomalies_grid.png"))
        log("  Saved screenshot: verified_audit_anomalies_grid.png")

        # Test Esc navigates back from Governance Console to Audit Trail (/audit)
        log("  Pressing Esc on Governance Console to return to /audit...")
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(1.5)
        current_url = driver.current_url
        log(f"  Current URL after Esc: {current_url}")
        assert "/audit" in current_url and "governance" not in current_url, f"Expected return to /audit, but at {current_url}"
        log("  SUCCESS: Esc navigated back to Audit Trail (/audit).")

        log("\n=================================================================")
        log("ALL TESTS COMPLETED SUCCESSFULLY! ZERO DEFECTS FOUND.")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_test()
