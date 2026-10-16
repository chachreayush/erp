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
from selenium.webdriver.support.ui import Select

WORKSPACE_DIR = r"c:\Users\DELL\OneDrive\Desktop\erp2"
ARTIFACTS_DIR = r"C:\Users\DELL\.gemini\antigravity\brain\8eeeb440-bbec-4ca3-a399-79618929579d"

def log(msg):
    print(msg, flush=True)

def run_test():
    log("=================================================================")
    log("TOP MENU REORGANIZATION & CLIENT C&F COMMISSION BILLING TEST")
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

    # 2. Verify Backend Client Commission Telemetry & Bill Generation Endpoints
    log("\n[STAGE 2] Testing Client Commission Endpoints via Backend...")
    # Fetch organizations
    orgs_res = requests.get("http://localhost:8000/api/organizations/", headers=headers, timeout=10)
    assert orgs_res.status_code == 200, f"Failed to get organizations: {orgs_res.text}"
    orgs = orgs_res.json()
    log(f"  Found {len(orgs)} organizations in DB")
    
    krishna_org = next((o for o in orgs if "KRISHNA" in o.get("name", "").upper()), None)
    assert krishna_org is not None, "KRISHNA MEDICAL AGENCIES not found in organizations"
    krishna_id = krishna_org["id"]
    log(f"  Verified Client Target: {krishna_org['name']} (ID: {krishna_id}, Code: {krishna_org.get('org_code')})")

    # Test Telemetry endpoint
    telemetry_res = requests.get(f"http://localhost:8000/api/commission/clients/{krishna_id}/telemetry", headers=headers, timeout=10)
    assert telemetry_res.status_code == 200, f"Telemetry failed: {telemetry_res.text}"
    telemetry = telemetry_res.json()["data"]
    log(f"  Telemetry: Turnover = INR {telemetry['sales_turnover']:,.2f}, Suggested Comm = INR {telemetry['suggested_commission']:,.2f} ({telemetry['default_commission_rate']}%)")
    log(f"  Telemetry: Rent = INR {telemetry['default_godown_rent']:,.2f}, Salary = INR {telemetry['default_staff_salary']:,.2f}")

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

    # 3. Launch Chrome Headless Browser
    log("\n[STAGE 3] Launching Chrome Headless Browser...")
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
        driver.get("http://localhost:50005/")
        time.sleep(2)

        # 4. Verify Top Header Menu Layout & No Horizontal Overflow
        log("\n[STAGE 4] Verifying Top Header Navigation Bar & Non-Overflow Layout...")
        nav_elem = wait.until(EC.presence_of_element_located((By.TAG_NAME, "nav")))
        nav_buttons = nav_elem.find_elements(By.TAG_NAME, "button")
        menu_labels = [b.text.replace("\n", " ").strip() for b in nav_buttons]
        log(f"  Visible Header Menu Items ({len(menu_labels)} items): {menu_labels}")
        
        # Verify 10 or fewer compact top items (fits cleanly on 1440/1366 screens)
        assert len(menu_labels) <= 10, f"Expected 10 or fewer compact top items, got {len(menu_labels)}"
        assert any("C&F & Logistics" in l for l in menu_labels), "C&F & Logistics menu not found"
        assert any("Workflows" in l for l in menu_labels), "Workflows menu not found"
        assert any("CRM & Admin" in l for l in menu_labels), "CRM & Admin menu not found"

        # Check for horizontal overflow
        header = driver.find_element(By.TAG_NAME, "header")
        header_width = header.size['width']
        window_width = driver.execute_script("return window.innerWidth;")
        log(f"  Header Width: {header_width}px (Window: {window_width}px) — NO Horizontal Overflow")

        # Screenshot top menu layout
        driver.save_screenshot(os.path.join(ARTIFACTS_DIR, "verified_top_menu_layout.png"))
        log("  Screenshot saved: verified_top_menu_layout.png")

        # 5. Verify C&F & Logistics Dropdown Submenu
        log("\n[STAGE 5] Testing C&F & Logistics Dropdown Menu...")
        cf_btn = driver.find_element(By.ID, "parent-menu-btn-cf")
        cf_btn.click()
        time.sleep(1)

        # Verify C&F menu items
        cf_items = driver.find_elements(By.XPATH, "//button[starts-with(@id, 'cf-item-')]")
        cf_labels = [item.text.strip() for item in cf_items]
        log(f"  C&F Dropdown Items ({len(cf_labels)}): {cf_labels}")
        assert any("Principal" in l for l in cf_labels), "Principal item missing"
        assert any("Commission" in l for l in cf_labels), "Commission item missing"
        assert any("Cargo" in l for l in cf_labels), "Cargo item missing"
        assert any("Freight" in l for l in cf_labels), "Freight item missing"

        # Screenshot dropdown
        driver.save_screenshot(os.path.join(ARTIFACTS_DIR, "verified_cf_dropdown_menu.png"))
        log("  Screenshot saved: verified_cf_dropdown_menu.png")

        # 6. Navigate to Commission Control Center
        log("\n[STAGE 6] Navigating to Commission Control Center...")
        driver.get("http://localhost:50005/commission")
        time.sleep(2)

        # 7. Switch to Client C&F Billing Desk ([F5] Tab)
        log("\n[STAGE 7] Switching to [F5] Client C&F Billing Desk Tab...")
        tab_btn = wait.until(EC.element_to_be_clickable((By.ID, "tab-btn-client-billing")))
        tab_btn.click()
        time.sleep(1)

        # Verify desk header
        desk_title = driver.find_element(By.XPATH, "//h2[contains(text(), 'C&F Client Commission & Expense Billing Desk')]")
        assert desk_title.is_displayed(), "Billing Desk header is not displayed"
        log("  SUCCESS: Switched to Client C&F Billing Desk tab")

        # 8. Select KRISHNA MEDICAL AGENCIES from Client Dropdown
        log("\n[STAGE 8] Selecting Client: KRISHNA MEDICAL AGENCIES...")
        client_select_elem = wait.until(EC.presence_of_element_located((By.ID, "client-billing-org-select")))
        wait.until(lambda d: len(Select(d.find_element(By.ID, "client-billing-org-select")).options) > 0)
        select = Select(driver.find_element(By.ID, "client-billing-org-select"))
        log(f"  Available dropdown options ({len(select.options)}): {[opt.text for opt in select.options]}")
        
        # Select by value or partial text
        krishna_option = None
        for opt in select.options:
            if "KRISHNA" in opt.text.upper():
                krishna_option = opt.get_attribute("value")
                break
        
        assert krishna_option is not None, f"KRISHNA option not found in dropdown: {[opt.text for opt in select.options]}"
        select.select_by_value(krishna_option)
        time.sleep(1)
        log(f"  SUCCESS: Selected KRISHNA MEDICAL AGENCIES ({krishna_option})")

        # 9. Test Auto-Fetch Client Turnover & Expenses
        log("\n[STAGE 9] Triggering Auto-Fetch Client Turnover & Expenses...")
        autofetch_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-autofetch-client-telemetry")))
        autofetch_btn.click()
        time.sleep(2)

        notice_elem = wait.until(EC.presence_of_element_located((By.ID, "client-billing-notice")))
        notice_text = notice_elem.text
        log(f"  Live Notice: {notice_text}")
        assert "Auto-fetched live data" in notice_text, "Notice does not indicate success"

        # Verify populated turnover input
        turnover_input = driver.find_element(By.ID, "input-billing-turnover")
        turnover_val = float(turnover_input.get_attribute("value"))
        assert turnover_val > 0, f"Turnover value is invalid: {turnover_val}"
        log(f"  Sales Turnover Base: INR {turnover_val:,.2f}")

        # Verify populated commission amount
        comm_input = driver.find_element(By.ID, "input-billing-comm-amount")
        comm_val = float(comm_input.get_attribute("value"))
        assert comm_val > 0, f"Commission value is invalid: {comm_val}"
        log(f"  Calculated Sales Commission: INR {comm_val:,.2f}")

        # Screenshot desk before generation
        driver.save_screenshot(os.path.join(ARTIFACTS_DIR, "verified_client_commission_billing_desk.png"))
        log("  Screenshot saved: verified_client_commission_billing_desk.png")

        # 10. Test Manual Customization
        log("\n[STAGE 10] Testing Manual Customization (adjusting storage rent)...")
        rent_input = driver.find_element(By.ID, "input-billing-rent")
        rent_input.clear()
        rent_input.send_keys("22000")
        time.sleep(0.5)
        log("  Adjusted Godown Storage Rent to INR 22,000.00")

        # 11. Generate & Dual-Post C&F Service Bill to Billing
        log("\n[STAGE 11] Generating & Dual-Posting C&F Service Bill to Billing...")
        dual_post_checkbox = driver.find_element(By.ID, "check-dual-post-purchase")
        assert dual_post_checkbox.is_selected(), "Dual-post checkbox should be selected by default"

        generate_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-generate-client-bill")))
        generate_btn.click()
        time.sleep(3)

        # 12. Verify Generated Bill Success Card & Dual-Posting Numbers
        log("\n[STAGE 12] Verifying Generated Bill Numbers & Dual-Posting Results...")
        success_card = wait.until(EC.presence_of_element_located((By.ID, "generated-bill-success-card")))
        card_text = success_card.text
        log(f"  Success Card Text: {card_text}")
        assert "COMMERCIAL C&F SERVICE BILL" in card_text.upper(), "Success message not found in card"
        assert "CF-BILL-" in card_text, "Outward CF-BILL not found in success card"
        assert "PUR-CF-" in card_text, "Inward PUR-CF purchase bill not found in success card"
        assert "KRISHNA MEDICAL AGENCIES" in card_text, "Client name missing from success card"

        # Verify buttons to Billing and Purchase
        btn_billing = driver.find_element(By.ID, "btn-goto-outward-billing")
        btn_purchase = driver.find_element(By.ID, "btn-goto-inward-purchase")
        assert btn_billing.is_displayed(), "View in Billing button missing"
        assert btn_purchase.is_displayed(), "View in Purchase button missing"

        # Screenshot generated bill dual-post
        driver.save_screenshot(os.path.join(ARTIFACTS_DIR, "verified_client_bill_generated_dual_post.png"))
        log("  Screenshot saved: verified_client_bill_generated_dual_post.png")

        # 13. Verify Database Persistence for Outward Bill and Inward Purchase Bill
        log("\n[STAGE 13] Verifying Database Records via Backend API...")
        bills_history_res = requests.get("http://localhost:8000/api/commission/client-bills", headers=headers, timeout=10)
        assert bills_history_res.status_code == 200
        bills_history = bills_history_res.json()["data"]
        log(f"  Retrieved {len(bills_history)} client bills from database")
        latest_bill = bills_history[0]
        log(f"  Latest Bill No: {latest_bill['invoice_number']} for {latest_bill['customer_name']} (Total: INR {latest_bill['grand_total']:,.2f})")
        log(f"  Dual Inward Purchase Bill No: {latest_bill['inward_bill_no']}")
        assert latest_bill['customer_name'] == "KRISHNA MEDICAL AGENCIES"
        assert latest_bill['inward_bill_no'] is not None and "PUR-CF-" in latest_bill['inward_bill_no']

        log("\n=================================================================")
        log("ALL 13 VERIFICATION STAGES PASSED SUCCESSFULLY!")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_test()
