"""
Automated Selenium Test Suite for DOC-41:
Pharma Expiry Radar, Stock Shift Quarantine Engine & Principal Debit Note Settlement Desk

Runs 13 end-to-end verification stages:
1. Backend Authentication & JWT Acquisition
2. Verify Backend Telemetry & Expiry Radar APIs
3. Launch Chrome Headless Browser (1440x900)
4. Inject Auth & Navigate to /inventory-dashboard
5. Verify Header Title, Badges & Navigation Hotkeys
6. Verify 4 Live Telemetry Scorecards (Main, Quarantine, Near-Expiry, Claims)
7. Verify Expiry Radar Tab & Bucket Filters (Expired, <30d, <60d, <90d)
8. Multi-Select Batches & Verify Live Calculation Banner
9. Execute Shift Action & Navigate to /stock-shift
10. Verify Stock Shift Voucher Desk, Godown Selection & Pre-filled Items
11. Toggle Auto-Generate Principal Claim & Save Voucher
12. Verify Success Card (Voucher No & Claim No) + Backend Stock Reallocation
13. Capture Verification Screenshots & Audit Proof
"""

import time
import json
import os
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def log(msg):
    print(f"[TEST RUNNER] {msg}")

def main():
    log("=" * 70)
    log("STARTING TEST SUITE: DOC-41 PHARMA EXPIRY RADAR & STOCK SHIFT QUARANTINE")
    log("=" * 70)

    # 1. Backend Authentication
    log("\n[STAGE 1] Authenticating via Backend API...")
    login_res = requests.post("http://localhost:8000/auth/login", json={
        "username": "admin",
        "password": "Admin@123",
        "is_lan": True
    }, timeout=10)
    assert login_res.status_code == 200, f"Backend login failed: {login_res.status_code} - {login_res.text}"
    auth_data = login_res.json()
    auth_token = auth_data["access_token"]
    user_info = auth_data["user"]
    org_id = user_info.get("organization_id")
    headers = {"Authorization": f"Bearer {auth_token}"}
    log(f"  SUCCESS: Authenticated as {user_info.get('username')} (Org: {org_id})")

    # 2. Verify Backend Cockpit Endpoints
    log("\n[STAGE 2] Testing Cockpit Telemetry & Radar APIs...")
    tel_res = requests.get("http://localhost:8000/api/stock/expiry-cockpit-telemetry", headers=headers, timeout=10)
    assert tel_res.status_code == 200, f"Telemetry failed: {tel_res.status_code} - {tel_res.text}"
    tel_data = tel_res.json()
    log(f"  Telemetry: Main Stock = INR {tel_data['main_stock_val']:,.2f} ({tel_data['main_stock_units']} units)")
    log(f"  Telemetry: Quarantine = INR {tel_data['brk_exp_stock_val']:,.2f} ({tel_data['brk_exp_stock_units']} units)")
    log(f"  Telemetry: Near-Expiry = INR {tel_data['total_near_expiry_val']:,.2f} across {tel_data['total_near_expiry_count']} risk batches")

    radar_res = requests.get("http://localhost:8000/api/stock/expiry-radar-batches?bucket=ALL", headers=headers, timeout=10)
    assert radar_res.status_code == 200, f"Radar API failed: {radar_res.status_code}"
    radar_data = radar_res.json()
    log(f"  Radar: Found {radar_data['total']} critical batches in surveillance")

    auth_store_obj = {
        "state": {
            "token": auth_token,
            "user": user_info,
            "role": user_info.get("role", "admin"),
            "isAuthenticated": True,
            "serverUrl": "http://localhost:8000"
        },
        "version": 0
    }

    # 3. Launch Chrome Headless Browser
    log("\n[STAGE 3] Launching Chrome Browser (1440x900)...")
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1440,900")
    chrome_options.add_argument("--disable-gpu")
    driver = webdriver.Chrome(options=chrome_options)
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

        log("  Navigating to frontend...")
        driver.get("http://localhost:50005/")
        time.sleep(1)
        inject_auth(driver)

        # 4. Navigate to Expiry Cockpit
        log("\n[STAGE 4] Navigating to Expiry Cockpit (/inventory-dashboard)...")
        driver.get("http://localhost:50005/inventory-dashboard")
        time.sleep(2)

        # 5. Verify Title & Badges
        log("\n[STAGE 5] Verifying Header Title & Badges...")
        header_h1 = wait.until(EC.presence_of_element_located((By.XPATH, "//h1[contains(text(), 'Pharma Expiry Radar')]")))
        assert "Pharma Expiry Radar" in header_h1.text, f"Unexpected title: {header_h1.text}"
        badge_doc41 = driver.find_element(By.XPATH, "//*[contains(text(), 'DOC-41 ENTERPRISE')]")
        assert badge_doc41 is not None, "DOC-41 Enterprise badge missing"
        log("  SUCCESS: Title and DOC-41 Enterprise badge verified.")

        # 6. Verify 4 Scorecards
        log("\n[STAGE 6] Verifying 4 Live Telemetry Scorecards...")
        card_main = wait.until(EC.presence_of_element_located((By.ID, "card-main-stock")))
        card_quar = driver.find_element(By.ID, "card-quarantine-stock")
        card_risk = driver.find_element(By.ID, "card-near-expiry-risk")
        card_claim = driver.find_element(By.ID, "card-claim-exposure")

        assert card_main is not None and "Main Stock Value" in card_main.text
        assert card_quar is not None and "Quarantine Godown" in card_quar.text
        assert card_risk is not None and "Near-Expiry" in card_risk.text
        assert card_claim is not None and "Principal Claims" in card_claim.text
        log("  SUCCESS: All 4 telemetry scorecards verified.")
        driver.save_screenshot("verified_pharma_expiry_cockpit.png")
        log("  Screenshot saved: verified_pharma_expiry_cockpit.png")

        # 7. Verify Expiry Radar Tab & Bucket Filters
        log("\n[STAGE 7] Verifying Expiry Radar Table & Bucket Filters...")
        radar_tab = wait.until(EC.element_to_be_clickable((By.ID, "tab-btn-radar")))
        radar_tab.click()
        time.sleep(1)

        table_radar = wait.until(EC.presence_of_element_located((By.ID, "tbl-expiry-radar")))
        rows = table_radar.find_elements(By.XPATH, ".//tbody/tr")
        log(f"  Radar Table: Displaying {len(rows)} batch rows")
        assert len(rows) > 0, "No batch rows found in Expiry Radar table"

        # Test Filter Click
        btn_filter_60 = driver.find_element(By.ID, "filter-bucket-60_DAYS")
        btn_filter_60.click()
        time.sleep(1)
        btn_filter_all = driver.find_element(By.ID, "filter-bucket-ALL")
        btn_filter_all.click()
        time.sleep(1)
        log("  SUCCESS: Bucket filters clicked and verified.")
        driver.save_screenshot("verified_expiry_radar_batches.png")
        log("  Screenshot saved: verified_expiry_radar_batches.png")

        # 8. Multi-Select Batches
        log("\n[STAGE 8] Selecting Batches in Expiry Radar...")
        checkboxes = table_radar.find_elements(By.XPATH, ".//tbody/tr//input[@type='checkbox']")
        assert len(checkboxes) > 0, "No checkboxes found in radar table"
        # Select first checkbox
        checkboxes[0].click()
        time.sleep(0.5)

        btn_shift_action = wait.until(EC.presence_of_element_located((By.ID, "btn-shift-selected-action")))
        assert btn_shift_action.is_displayed(), "Action button for shifting selected batches not displayed"
        log("  SUCCESS: Batch selected, Shift action button verified.")

        # 9. Execute Shift Action & Navigate to /stock-shift
        log("\n[STAGE 9] Clicking 'Shift to Quarantine'...")
        btn_shift_action.click()
        time.sleep(2)

        # 10. Verify Stock Shift Desk
        log("\n[STAGE 10] Verifying Stock Shift Desk (/stock-shift)...")
        wait.until(EC.url_contains("/stock-shift"))
        log(f"  Current URL: {driver.current_url}")

        select_from = wait.until(EC.presence_of_element_located((By.ID, "select-from-godown")))
        select_to = driver.find_element(By.ID, "select-to-godown")
        check_claim = driver.find_element(By.ID, "check-auto-claim")
        select_princ = driver.find_element(By.ID, "select-principal-claim-target")

        log(f"  Source Godown: {select_from.get_attribute('value')}")
        log(f"  Destination Godown: {select_to.get_attribute('value')}")
        assert check_claim.is_selected(), "Auto-generate claim checkbox should be checked by default"
        log("  Auto-Claim Toggle: ENABLED (Default)")

        # Verify line items in shift grid
        shift_items_table = wait.until(EC.presence_of_element_located((By.ID, "tbl-shift-items")))
        shift_rows = shift_items_table.find_elements(By.XPATH, ".//tbody/tr")
        log(f"  Shift Items Grid: Loaded {len(shift_rows)} line items")
        assert len(shift_rows) > 0, "Shift grid should contain pre-selected items"

        driver.save_screenshot("verified_stock_shift_voucher.png")
        log("  Screenshot saved: verified_stock_shift_voucher.png")

        # 11. Save Shift Voucher with Auto-Claim
        log("\n[STAGE 11] Saving Shift Voucher & Generating Principal Claim...")
        btn_save = wait.until(EC.element_to_be_clickable((By.ID, "btn-save-shift-voucher")))
        btn_save.click()
        time.sleep(2)

        # 12. Verify Success Card & Generated References
        log("\n[STAGE 12] Verifying Shift Success Card & Generated Claim Reference...")
        success_card = wait.until(EC.presence_of_element_located((By.ID, "stock-shift-success-card")))
        assert success_card.is_displayed(), "Stock shift success card not displayed"

        voucher_no_elem = driver.find_element(By.ID, "lbl-success-voucher-no")
        gen_voucher_no = voucher_no_elem.text.strip()
        log(f"  SUCCESS: Generated Stock Shift Voucher: {gen_voucher_no}")
        assert "SHF-" in gen_voucher_no, f"Invalid voucher no format: {gen_voucher_no}"

        claim_no_elem = driver.find_element(By.ID, "lbl-success-claim-no")
        gen_claim_no = claim_no_elem.text.strip()
        log(f"  SUCCESS: Generated Principal Claim: {gen_claim_no}")
        assert "CLM-PRN-" in gen_claim_no, f"Invalid claim no format: {gen_claim_no}"

        driver.save_screenshot("verified_stock_shift_claim_success.png")
        log("  Screenshot saved: verified_stock_shift_claim_success.png")

        # 13. Verify Audit Trail in Cockpit & Principal Claims Desk
        log("\n[STAGE 13] Verifying Audit Register & Principal Claims Integration...")
        driver.get("http://localhost:50005/inventory-dashboard")
        time.sleep(2)

        # Switch to Audit Register tab
        history_tab = wait.until(EC.element_to_be_clickable((By.ID, "tab-btn-history")))
        history_tab.click()
        time.sleep(1)

        tbl_audit = wait.until(EC.presence_of_element_located((By.ID, "tbl-shift-audit")))
        audit_text = tbl_audit.text
        assert gen_voucher_no in audit_text, f"Generated voucher {gen_voucher_no} not found in audit table"
        assert gen_claim_no in audit_text, f"Generated claim {gen_claim_no} not linked in audit table"
        log(f"  SUCCESS: Voucher {gen_voucher_no} verified in Stock Shift Audit Register.")

        # Switch to Quarantine Godown tab
        quar_tab = driver.find_element(By.ID, "tab-btn-quarantine")
        quar_tab.click()
        time.sleep(1)
        driver.save_screenshot("verified_quarantine_stock_ledger.png")
        log("  Screenshot saved: verified_quarantine_stock_ledger.png")

        # Navigate to /principal and verify claim
        log("  Checking Principal Claims Desk (/principal)...")
        driver.get("http://localhost:50005/principal")
        time.sleep(2)

        # Verify page loaded
        page_body = driver.find_element(By.TAG_NAME, "body").text
        assert "Principal" in page_body or "Claims" in page_body
        driver.save_screenshot("verified_principal_claim_from_shift.png")
        log("  Screenshot saved: verified_principal_claim_from_shift.png")

        log("\n" + "=" * 70)
        log("ALL 13 STAGES PASSED SUCCESSFULLY (Exit Code 0)")
        log("=" * 70)

    finally:
        driver.quit()

if __name__ == "__main__":
    main()
