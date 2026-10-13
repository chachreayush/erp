import os
import sys
import time
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select

def log(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

artifact_dir = r"C:\Users\DELL\.gemini\antigravity\brain\4793a238-58bd-40ed-9c37-093423cd07cd"

log("="*78)
log("MASTER SELENIUM SUITE: ALL 6 TRANSACTION VOUCHER MODULES VERIFICATION")
log("="*78)

# Step 1: Login via API
log("\n[SETUP] Authenticating via backend API (admin / Admin@123)...")
login_res = requests.post("http://localhost:8000/auth/login", json={
    "username": "admin",
    "password": "Admin@123",
    "is_lan": True
})
if login_res.status_code != 200:
    log(f"FAILED: Backend login returned {login_res.status_code}: {login_res.text}")
    sys.exit(1)

auth_data = login_res.json()
auth_token = auth_data["access_token"]
user_info = auth_data["user"]
org_id = user_info.get("organization_id")
log(f"SUCCESS: Authenticated as {user_info.get('username')} (Org: {org_id})")

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

# Step 2: Initialize Selenium Chrome Headless
log("\n[SETUP] Starting Chrome WebDriver (Selenium headless)...")
chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--window-size=1440,950")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--disable-gpu")

driver = webdriver.Chrome(options=chrome_options)
driver.set_window_size(1440, 950)
wait = WebDriverWait(driver, 20)

results_summary = []

def ensure_authenticated(driver, auth_store):
    driver.execute_script("""
        const authData = arguments[0];
        sessionStorage.setItem('erp-auth', JSON.stringify(authData));
        localStorage.setItem('erp-auth', JSON.stringify(authData));
        
        const mockInventory = [{
            id: '5efc2dbf-b614-4bc8-9c09-cf987cbc6cfb',
            name: 'Levocet 40',
            packing: '10 TAB',
            mrp: 120.0,
            p_rate: 102.0,
            rate_a: 102.0,
            igst_percent: 12.0
        }, {
            id: '8a7b9c1d-1234-5678-90ab-cdef12345678',
            name: 'Rosuvas 80',
            packing: '10 TAB',
            mrp: 140.0,
            p_rate: 85.0,
            rate_a: 85.0,
            igst_percent: 12.0
        }];
        localStorage.setItem('erp_inventory_items', JSON.stringify(mockInventory));
    """, auth_store)

def js_set_val(driver, element_id, val):
    driver.execute_script("""
        const el = document.getElementById(arguments[0]) || document.querySelector(arguments[0]);
        if (el) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(el, arguments[1]);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    """, element_id, str(val))

try:
    # Prime browser session on domain root
    driver.get("http://localhost:50005/")
    time.sleep(1)
    ensure_authenticated(driver, auth_store_obj)
    time.sleep(0.5)

    # =========================================================================
    # MODULE 1: SALES BILL (/sales?type=bill)
    # =========================================================================
    log("\n" + "="*75)
    log("[MODULE 1/6] TESTING SALES BILL (Marg Fast Keyboard Billing)")
    log("="*75)
    try:
        ensure_authenticated(driver, auth_store_obj)
        driver.get("http://localhost:50005/sales?type=bill")
        ensure_authenticated(driver, auth_store_obj)
        wait.until(EC.presence_of_element_located((By.ID, "product-input-1")))
        log("  -> Loaded /sales?type=bill successfully")
        time.sleep(1)

        # Set custom series
        seq1 = int(time.time()) % 8000 + 1000
        sales_test_series = f"RJ-INV-{seq1}"
        expected_sales_next = f"RJ-INV-{seq1 + 1}"
        
        bill_no_el = driver.find_element(By.XPATH, "//label[contains(text(), 'Entry No')]/following::input[1]")
        bill_no_el.click()
        bill_no_el.send_keys(Keys.CONTROL + "a")
        bill_no_el.send_keys(sales_test_series)
        time.sleep(0.3)
        log(f"  -> Customized Series set to: '{sales_test_series}' (Expected next: '{expected_sales_next}')")

        # Select Party
        party_input = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='Select Party']")
        party_input.click()
        time.sleep(1)
        wait.until(EC.visibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Debtor Customer')]")))
        cust_row = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//div[contains(., 'LIFECARE CHEMIST & DRUGGIST') and contains(@style, 'cursor: pointer')]")
        ))
        driver.execute_script("arguments[0].click();", cust_row)
        wait.until(EC.invisibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Debtor Customer')]")))
        time.sleep(0.5)
        log("  -> Party selected: LIFECARE CHEMIST & DRUGGIST")

        # Select Product Levocet 40
        prod_cell = wait.until(EC.element_to_be_clickable((By.ID, "product-input-1")))
        driver.execute_script("arguments[0].click();", prod_cell)
        time.sleep(0.3)
        prod_cell.send_keys(Keys.ENTER)
        time.sleep(0.8)

        wait.until(EC.visibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Product')]")))
        search_box = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='Search product...']")
        search_box.send_keys("Levocet")
        time.sleep(0.8)

        levocet_opt = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//div[contains(., 'Levocet 40') and contains(@style, 'cursor: pointer')]")
        ))
        driver.execute_script("arguments[0].click();", levocet_opt)
        wait.until(EC.invisibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Product')]")))
        time.sleep(0.5)
        log("  -> Product selected: Levocet 40")

        # Set line details
        js_set_val(driver, 'batch-input-1', 'LEV-881')
        js_set_val(driver, 'bottom-batch-input', 'LEV-881')
        js_set_val(driver, 'bottom-expiry-input', '12/28')
        js_set_val(driver, 'qty-input-1', '5')
        js_set_val(driver, 'prate-input-1', '102.00')
        time.sleep(0.5)

        prate_el = driver.find_element(By.ID, "prate-input-1")
        prate_el.send_keys(Keys.TAB)
        time.sleep(0.5)

        # Trigger save
        save_trigger = driver.find_element(By.XPATH, "//button[contains(text(), 'CONFIRM & SAVE')]")
        driver.execute_script("arguments[0].click();", save_trigger)
        time.sleep(0.8)

        yes_btn = wait.until(EC.element_to_be_clickable((By.ID, "yes-save-btn")))
        driver.execute_script("arguments[0].click();", yes_btn)
        log("  -> Clicked 'Yes, Save Bill'")

        # Wait dynamically for series continuation
        wait.until(lambda d: bill_no_el.get_attribute("value") == expected_sales_next)
        new_series = bill_no_el.get_attribute("value")
        log(f"  -> Next Series in UI: '{new_series}' (Expected: '{expected_sales_next}')")
        assert new_series == expected_sales_next, f"Series mismatch: {new_series} != {expected_sales_next}"
        
        # Verify in DB
        inv_check = requests.get(
            f"http://localhost:8000/api/sales/invoices?limit=5",
            headers={"Authorization": f"Bearer {auth_token}"}
        ).json()
        saved_inv = [i for i in inv_check if i.get("invoice_number") == sales_test_series]
        assert len(saved_inv) > 0, "Invoice not found in database!"
        log(f"  -> Verified in PostgreSQL: Invoice #{sales_test_series} GrandTotal=INR {saved_inv[0].get('grand_total')}")
        
        results_summary.append({"module": "Sales Bill", "series": sales_test_series, "next": new_series, "status": "PASS"})
    except Exception as e:
        log(f"  FAILED Sales Bill: {e}")
        driver.save_screenshot(os.path.join(artifact_dir, "debug_sales_err.png"))
        results_summary.append({"module": "Sales Bill", "series": "N/A", "next": "N/A", "status": f"FAIL: {e}"})

    # =========================================================================
    # MODULE 2: PURCHASE BILL (/purchase?type=bill)
    # =========================================================================
    log("\n" + "="*75)
    log("[MODULE 2/6] TESTING PURCHASE BILL (Inward Invoicing & Stock Accrual)")
    log("="*75)
    try:
        ensure_authenticated(driver, auth_store_obj)
        driver.get("http://localhost:50005/purchase?type=bill")
        ensure_authenticated(driver, auth_store_obj)
        wait.until(EC.presence_of_element_located((By.ID, "product-input-1")))
        log("  -> Loaded /purchase?type=bill successfully")
        time.sleep(1)

        seq2 = int(time.time()) % 8000 + 2000
        pb_test_series = f"RJ-PB-{seq2}"
        expected_pb_next = f"RJ-PB-{seq2 + 1}"

        # Entry no input
        entry_input = driver.find_element(By.XPATH, "//label[contains(text(), 'Entry No')]/following::input[1]")
        entry_input.click()
        entry_input.send_keys(Keys.CONTROL + "a")
        entry_input.send_keys(pb_test_series)
        time.sleep(0.3)
        log(f"  -> Customized Series set to: '{pb_test_series}' (Expected next: '{expected_pb_next}')")

        # Press Enter on Entry No -> pure keyboard triggers party modal!
        entry_input.send_keys(Keys.ENTER)
        time.sleep(1)

        # Wait for Vendor selection modal & select Sun Pharma Ltd.
        wait.until(EC.visibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Sundry Creditor')]")))
        vendor_row = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//div[contains(@style, 'cursor: pointer') and contains(., 'Sun Pharma')]")
        ))
        driver.execute_script("arguments[0].click();", vendor_row)
        wait.until(EC.invisibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Sundry Creditor')]")))
        time.sleep(0.5)
        log("  -> Vendor selected from Master: Sun Pharma Ltd.")

        # Set Party Inv No
        party_inv_el = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='INV-102']")
        party_inv_el.send_keys("SUPP-INV-990")
        party_inv_el.send_keys(Keys.TAB)
        time.sleep(0.3)
        log("  -> Party Inv No set to: SUPP-INV-990")

        # Select Product via Product Modal
        prod_input = driver.find_element(By.ID, "product-input-1")
        driver.execute_script("arguments[0].click();", prod_input)
        time.sleep(0.3)
        prod_input.send_keys(Keys.ENTER)
        time.sleep(0.8)

        wait.until(EC.visibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Product')]")))
        prod_opt = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//div[contains(@style, 'cursor: pointer') and (contains(., 'Paracetamol') or contains(., 'Amoxicillin') or contains(., 'Levocet'))]")
        ))
        driver.execute_script("arguments[0].click();", prod_opt)
        wait.until(EC.invisibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Product')]")))
        time.sleep(0.5)
        log("  -> Product selected from catalog")

        # Populate batch, qty, prate
        js_set_val(driver, 'batch-input-1', 'PB-BAT-01')
        js_set_val(driver, 'qty-input-1', '10')
        js_set_val(driver, 'prate-input-1', '85.00')
        time.sleep(0.5)

        prate_cell = driver.find_element(By.ID, "prate-input-1")
        prate_cell.send_keys(Keys.TAB)
        time.sleep(0.5)

        # Trigger save
        save_btn_trigger = driver.find_element(By.XPATH, "//button[contains(text(), 'SAVE (End / Ctrl+S)')]")
        driver.execute_script("arguments[0].click();", save_btn_trigger)
        time.sleep(0.8)

        yes_btn = wait.until(EC.element_to_be_clickable((By.ID, "yes-save-btn")))
        driver.execute_script("arguments[0].click();", yes_btn)
        log("  -> Clicked 'Yes, Save Bill'")

        wait.until(lambda d: entry_input.get_attribute("value") == expected_pb_next)
        new_pb_series = entry_input.get_attribute("value")
        log(f"  -> Next Series in UI: '{new_pb_series}' (Expected: '{expected_pb_next}')")
        assert new_pb_series == expected_pb_next, f"Series mismatch: {new_pb_series} != {expected_pb_next}"

        # Verify DB
        inv_check = requests.get(
            f"http://localhost:8000/api/sales/invoices?limit=5",
            headers={"Authorization": f"Bearer {auth_token}"}
        ).json()
        saved_inv = [i for i in inv_check if i.get("invoice_number") == pb_test_series]
        assert len(saved_inv) > 0, "Purchase Invoice not recorded in DB!"
        log(f"  -> Verified in PostgreSQL: Purchase Bill #{pb_test_series} GrandTotal=INR {saved_inv[0].get('grand_total')}")

        results_summary.append({"module": "Purchase Bill", "series": pb_test_series, "next": new_pb_series, "status": "PASS"})
    except Exception as e:
        log(f"  FAILED Purchase Bill: {e}")
        driver.save_screenshot(os.path.join(artifact_dir, "debug_purchase_err.png"))
        results_summary.append({"module": "Purchase Bill", "series": "N/A", "next": "N/A", "status": f"FAIL: {e}"})

    # =========================================================================
    # MODULE 3: SUPPLIER DEBIT NOTE / PURCHASE RETURN (/purchase-return)
    # =========================================================================
    log("\n" + "="*75)
    log("[MODULE 3/6] TESTING SUPPLIER DEBIT NOTE (Neumorphic White & Green)")
    log("="*75)
    try:
        ensure_authenticated(driver, auth_store_obj)
        driver.get("http://localhost:50005/purchase-return")
        ensure_authenticated(driver, auth_store_obj)
        dn_input = wait.until(EC.presence_of_element_located((By.XPATH, "//input[contains(@placeholder, 'DN-0001')]")))
        log("  -> Loaded /purchase-return successfully")
        time.sleep(1)

        seq3 = int(time.time()) % 8000 + 3000
        dn_test_series = f"RJ-DN-{seq3}"
        expected_dn_next = f"RJ-DN-{seq3 + 1}"

        dn_input.click()
        dn_input.send_keys(Keys.CONTROL + "a")
        dn_input.send_keys(dn_test_series)
        time.sleep(0.3)
        log(f"  -> Customized Series set to: '{dn_test_series}' (Expected next: '{expected_dn_next}')")

        # Select Supplier
        supplier_input = driver.find_element(By.XPATH, "//input[contains(@placeholder, 'Type to search supplier')]")
        supplier_input.send_keys(Keys.CONTROL + "a")
        supplier_input.send_keys("Sun Pharma Ltd.")
        time.sleep(1)

        # Select Inward Purchase Bill
        bill_picker_btn = driver.find_element(By.XPATH, "//button[contains(., 'Select Inward Purchase Bill') or contains(., 'Browse Inward Bills')]")
        bill_picker_btn.click()
        time.sleep(1.5)

        load_items_btns = driver.find_elements(By.XPATH, "//span[contains(text(), 'Load Items')] | //div[contains(text(), 'Invoice #')]")
        if load_items_btns:
            driver.execute_script("arguments[0].click();", load_items_btns[0])
            log("  -> Loaded items from Inward Purchase Bill")
        else:
            driver.find_element(By.XPATH, "//button[contains(text(), 'Cancel')]").click()
            time.sleep(0.5)
            driver.find_element(By.XPATH, "//button[contains(., '[F3] Direct Loose Return')]").click()
            time.sleep(0.5)
            driver.find_element(By.XPATH, "//button[contains(., 'Add Return Product')]").click()
            log("  -> Switched to Direct Loose Return and added product")

        time.sleep(1)

        # Ensure return quantity
        return_qty_inputs = driver.find_elements(By.ID, "return-qty-0")
        if return_qty_inputs:
            return_qty_inputs[0].click()
            return_qty_inputs[0].send_keys(Keys.CONTROL + "a")
            return_qty_inputs[0].send_keys("1")
            time.sleep(0.5)

        # Save Debit Note
        save_btn = driver.find_element(By.XPATH, "//button[contains(., 'Issue Debit Note')] | //*[@id='save-debit-note-btn']")
        driver.execute_script("arguments[0].click();", save_btn)
        log("  -> Clicked 'Issue Debit Note'")

        # Wait for success banner
        toast = wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'issued successfully')]")))
        log(f"  -> Success toast detected: '{toast.text}'")

        # Assert series continuation
        wait.until(lambda d: d.find_element(By.XPATH, "//input[contains(@placeholder, 'DN-0001')]").get_attribute("value") == expected_dn_next)
        new_dn_series = dn_input.get_attribute("value")
        log(f"  -> Next Series in UI: '{new_dn_series}' (Expected: '{expected_dn_next}')")
        assert new_dn_series == expected_dn_next, f"Series mismatch: {new_dn_series} != {expected_dn_next}"

        # Verify DB
        inv_check = requests.get(
            f"http://localhost:8000/api/sales/invoices?limit=5",
            headers={"Authorization": f"Bearer {auth_token}"}
        ).json()
        saved_inv = [i for i in inv_check if i.get("invoice_number") == dn_test_series]
        assert len(saved_inv) > 0, "Debit Note not recorded in DB!"
        log(f"  -> Verified in PostgreSQL: Debit Note #{dn_test_series} GrandTotal=INR {saved_inv[0].get('grand_total')}")

        results_summary.append({"module": "Supplier Debit Note", "series": dn_test_series, "next": new_dn_series, "status": "PASS"})
    except Exception as e:
        log(f"  FAILED Debit Note: {e}")
        driver.save_screenshot(os.path.join(artifact_dir, "debug_debit_note_err.png"))
        results_summary.append({"module": "Supplier Debit Note", "series": "N/A", "next": "N/A", "status": f"FAIL: {e}"})

    # =========================================================================
    # MODULE 4: CUSTOMER CREDIT NOTE / SALES RETURN (/sales-return)
    # =========================================================================
    log("\n" + "="*75)
    log("[MODULE 4/6] TESTING CUSTOMER CREDIT NOTE (Neumorphic White & Green)")
    log("="*75)
    try:
        ensure_authenticated(driver, auth_store_obj)
        driver.get("http://localhost:50005/sales-return")
        ensure_authenticated(driver, auth_store_obj)
        wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Customer Sales Return & Credit Note')]")))
        log("  -> Loaded /sales-return successfully")
        time.sleep(1)

        cn_input = driver.find_element(By.XPATH, "//label[contains(text(), 'Credit Note No')]/following::input[1]")
        seq4 = int(time.time()) % 8000 + 4000
        cn_test_series = f"RJ-CN-{seq4}"
        expected_cn_next = f"RJ-CN-{seq4 + 1}"

        cn_input.click()
        cn_input.send_keys(Keys.CONTROL + "a")
        cn_input.send_keys(cn_test_series)
        time.sleep(0.3)
        log(f"  -> Customized Series set to: '{cn_test_series}' (Expected next: '{expected_cn_next}')")

        # Select Customer - wait for async options
        wait.until(lambda d: len(Select(d.find_element(By.XPATH, "//label[contains(text(), 'Customer')]/following::select[1]")).options) > 1)
        cust_select = Select(driver.find_element(By.XPATH, "//label[contains(text(), 'Customer')]/following::select[1]"))
        cust_select.select_by_index(1)
        time.sleep(1.5)
        log(f"  -> Selected Customer: '{cust_select.first_selected_option.text}'")

        # Pick Sales Bill
        pick_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Select Original Sales Bill')]")))
        driver.execute_script("arguments[0].click();", pick_btn)
        time.sleep(1)

        wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Select Sales Invoice')]")))
        invoice_row = wait.until(EC.element_to_be_clickable((By.XPATH, "//div[contains(@style, 'cursor: pointer')][contains(., 'INV-') or contains(., 'DEL-') or contains(., 'RJ-')]")))
        driver.execute_script("arguments[0].click();", invoice_row)
        time.sleep(1)
        log("  -> Selected original sales bill and loaded lines")

        # Set return qty
        return_qty_0 = wait.until(EC.presence_of_element_located((By.ID, "return-qty-0")))
        return_qty_0.click()
        return_qty_0.send_keys(Keys.CONTROL + "a")
        return_qty_0.send_keys("1")
        time.sleep(0.5)

        # Save Credit Note
        save_btn = driver.find_element(By.XPATH, "//button[contains(., 'Issue Credit Note')] | //*[@id='save-credit-note-btn']")
        driver.execute_script("arguments[0].click();", save_btn)
        log("  -> Clicked 'Issue Credit Note'")

        # Wait for success toast
        toast = wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'issued successfully')]")))
        log(f"  -> Success toast detected: '{toast.text}'")

        # Assert series continuation
        wait.until(lambda d: d.find_element(By.XPATH, "//label[contains(text(), 'Credit Note No')]/following::input[1]").get_attribute("value") == expected_cn_next)
        new_cn_series = cn_input.get_attribute("value")
        log(f"  -> Next Series in UI: '{new_cn_series}' (Expected: '{expected_cn_next}')")
        assert new_cn_series == expected_cn_next, f"Series mismatch: {new_cn_series} != {expected_cn_next}"

        # Verify DB
        inv_check = requests.get(
            f"http://localhost:8000/api/sales/invoices?limit=5",
            headers={"Authorization": f"Bearer {auth_token}"}
        ).json()
        saved_inv = [i for i in inv_check if i.get("invoice_number") == cn_test_series]
        assert len(saved_inv) > 0, "Credit Note not recorded in DB!"
        log(f"  -> Verified in PostgreSQL: Credit Note #{cn_test_series} GrandTotal=INR {saved_inv[0].get('grand_total')}")

        results_summary.append({"module": "Customer Credit Note", "series": cn_test_series, "next": new_cn_series, "status": "PASS"})
    except Exception as e:
        log(f"  FAILED Credit Note: {e}")
        driver.save_screenshot(os.path.join(artifact_dir, "debug_credit_note_err.png"))
        results_summary.append({"module": "Customer Credit Note", "series": "N/A", "next": "N/A", "status": f"FAIL: {e}"})

    # =========================================================================
    # MODULE 5: BREAKAGE ISSUE (/brk-issue?type=bill)
    # =========================================================================
    log("\n" + "="*75)
    log("[MODULE 5/6] TESTING BREAKAGE & EXPIRY ISSUE (To Supplier/Mfg)")
    log("="*75)
    try:
        ensure_authenticated(driver, auth_store_obj)
        driver.get("http://localhost:50005/brk-issue?type=bill")
        ensure_authenticated(driver, auth_store_obj)
        wait.until(EC.presence_of_element_located((By.ID, "product-input-1")))
        title_el = driver.find_element(By.XPATH, "//h1[contains(., 'Breakage & Expiry Issue')]")
        log(f"  -> Loaded /brk-issue?type=bill successfully: '{title_el.text}'")
        time.sleep(1)

        seq5 = int(time.time()) % 8000 + 5000
        bki_test_series = f"RJ-BKI-{seq5}"
        expected_bki_next = f"RJ-BKI-{seq5 + 1}"

        entry_input = driver.find_element(By.XPATH, "//label[contains(text(), 'Entry No')]/following::input[1]")
        entry_input.click()
        entry_input.send_keys(Keys.CONTROL + "a")
        entry_input.send_keys(bki_test_series)
        time.sleep(0.3)
        log(f"  -> Customized Series set to: '{bki_test_series}' (Expected next: '{expected_bki_next}')")

        # Press Enter on Entry No -> pure keyboard triggers partyRef and opens party modal!
        entry_input.send_keys(Keys.ENTER)
        time.sleep(1)

        # Wait for Party Selection modal & select Sun Pharma Ltd.
        wait.until(EC.visibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Sundry Creditor')]")))
        party_row = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//div[contains(@style, 'cursor: pointer') and contains(., 'Sun Pharma')]")
        ))
        driver.execute_script("arguments[0].click();", party_row)
        wait.until(EC.invisibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Sundry Creditor')]")))
        time.sleep(0.5)
        log("  -> Party selected for Breakage Issue: Sun Pharma Ltd.")

        # Set Party Inv No
        party_inv_el = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='INV-102']")
        party_inv_el.send_keys("BKI-INV-101")
        party_inv_el.send_keys(Keys.TAB)
        time.sleep(0.3)
        log("  -> Party Inv No set to: BKI-INV-101")

        # Select Product
        prod_input = driver.find_element(By.ID, "product-input-1")
        driver.execute_script("arguments[0].click();", prod_input)
        time.sleep(0.3)
        prod_input.send_keys(Keys.ENTER)
        time.sleep(0.8)

        wait.until(EC.visibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Product')]")))
        prod_opt = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//div[contains(@style, 'cursor: pointer') and (contains(., 'Paracetamol') or contains(., 'Amoxicillin') or contains(., 'Levocet'))]")
        ))
        driver.execute_script("arguments[0].click();", prod_opt)
        wait.until(EC.invisibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Product')]")))
        time.sleep(0.5)
        log("  -> Product selected for Breakage Issue")

        # Populate batch, qty, prate
        js_set_val(driver, 'batch-input-1', 'BKI-DAM-01')
        js_set_val(driver, 'qty-input-1', '5')
        js_set_val(driver, 'prate-input-1', '75.00')
        time.sleep(0.5)

        prate_cell = driver.find_element(By.ID, "prate-input-1")
        prate_cell.send_keys(Keys.TAB)
        time.sleep(0.5)

        # Trigger save
        save_btn_trigger = driver.find_element(By.XPATH, "//button[contains(text(), 'SAVE (End / Ctrl+S)')]")
        driver.execute_script("arguments[0].click();", save_btn_trigger)
        time.sleep(0.8)

        yes_btn = wait.until(EC.element_to_be_clickable((By.ID, "yes-save-btn")))
        driver.execute_script("arguments[0].click();", yes_btn)
        log("  -> Clicked 'Yes, Save Bill'")

        wait.until(lambda d: entry_input.get_attribute("value") == expected_bki_next)
        new_bki_series = entry_input.get_attribute("value")
        log(f"  -> Next Series in UI: '{new_bki_series}' (Expected: '{expected_bki_next}')")
        assert new_bki_series == expected_bki_next, f"Series mismatch: {new_bki_series} != {expected_bki_next}"

        inv_check = requests.get(
            f"http://localhost:8000/api/sales/invoices?limit=5",
            headers={"Authorization": f"Bearer {auth_token}"}
        ).json()
        saved_inv = [i for i in inv_check if i.get("invoice_number") == bki_test_series]
        assert len(saved_inv) > 0, "Breakage Issue not recorded in DB!"
        log(f"  -> Verified in PostgreSQL: Breakage Issue #{bki_test_series} GrandTotal=INR {saved_inv[0].get('grand_total')}")

        results_summary.append({"module": "Breakage Issue", "series": bki_test_series, "next": new_bki_series, "status": "PASS"})
    except Exception as e:
        log(f"  FAILED Breakage Issue: {e}")
        driver.save_screenshot(os.path.join(artifact_dir, "debug_brk_issue_err.png"))
        results_summary.append({"module": "Breakage Issue", "series": "N/A", "next": "N/A", "status": f"FAIL: {e}"})

    # =========================================================================
    # MODULE 6: BREAKAGE RECEIVE (/brk-receive?type=bill)
    # =========================================================================
    log("\n" + "="*75)
    log("[MODULE 6/6] TESTING BREAKAGE & EXPIRY RECEIVE (From Chemist/Debtor)")
    log("="*75)
    try:
        ensure_authenticated(driver, auth_store_obj)
        driver.get("http://localhost:50005/brk-receive?type=bill")
        ensure_authenticated(driver, auth_store_obj)
        wait.until(EC.presence_of_element_located((By.ID, "product-input-1")))
        title_el = driver.find_element(By.XPATH, "//h1[contains(., 'Breakage & Expiry Receive')]")
        log(f"  -> Loaded /brk-receive?type=bill successfully: '{title_el.text}'")
        time.sleep(1)

        seq6 = int(time.time()) % 8000 + 6000
        bkr_test_series = f"RJ-BKR-{seq6}"
        expected_bkr_next = f"RJ-BKR-{seq6 + 1}"

        entry_input = driver.find_element(By.XPATH, "//label[contains(text(), 'Entry No')]/following::input[1]")
        entry_input.click()
        entry_input.send_keys(Keys.CONTROL + "a")
        entry_input.send_keys(bkr_test_series)
        time.sleep(0.3)
        log(f"  -> Customized Series set to: '{bkr_test_series}' (Expected next: '{expected_bkr_next}')")

        # Press Enter on Entry No -> pure keyboard triggers partyRef and opens party modal!
        entry_input.send_keys(Keys.ENTER)
        time.sleep(1)

        # Wait for Party Selection modal & select Sun Pharma Ltd.
        wait.until(EC.visibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Sundry Creditor')]")))
        party_row = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//div[contains(@style, 'cursor: pointer') and contains(., 'Sun Pharma')]")
        ))
        driver.execute_script("arguments[0].click();", party_row)
        wait.until(EC.invisibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Sundry Creditor')]")))
        time.sleep(0.5)
        log("  -> Party selected for Breakage Receive: Sun Pharma Ltd.")

        # Set Party Inv No
        party_inv_el = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='INV-102']")
        party_inv_el.send_keys("BKR-INV-101")
        party_inv_el.send_keys(Keys.TAB)
        time.sleep(0.3)
        log("  -> Party Inv No set to: BKR-INV-101")

        # Select Product
        prod_input = driver.find_element(By.ID, "product-input-1")
        driver.execute_script("arguments[0].click();", prod_input)
        time.sleep(0.3)
        prod_input.send_keys(Keys.ENTER)
        time.sleep(0.8)

        wait.until(EC.visibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Product')]")))
        prod_opt = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//div[contains(@style, 'cursor: pointer') and (contains(., 'Paracetamol') or contains(., 'Amoxicillin') or contains(., 'Levocet'))]")
        ))
        driver.execute_script("arguments[0].click();", prod_opt)
        wait.until(EC.invisibility_of_element_located((By.XPATH, "//h2[contains(text(), 'Select Product')]")))
        time.sleep(0.5)
        log("  -> Product selected for Breakage Receive")

        # Populate batch, qty, prate
        js_set_val(driver, 'batch-input-1', 'BKR-REC-01')
        js_set_val(driver, 'qty-input-1', '4')
        js_set_val(driver, 'prate-input-1', '60.00')
        time.sleep(0.5)

        prate_cell = driver.find_element(By.ID, "prate-input-1")
        prate_cell.send_keys(Keys.TAB)
        time.sleep(0.5)

        # Trigger save
        save_btn_trigger = driver.find_element(By.XPATH, "//button[contains(text(), 'SAVE (End / Ctrl+S)')]")
        driver.execute_script("arguments[0].click();", save_btn_trigger)
        time.sleep(0.8)

        yes_btn = wait.until(EC.element_to_be_clickable((By.ID, "yes-save-btn")))
        driver.execute_script("arguments[0].click();", yes_btn)
        log("  -> Clicked 'Yes, Save Bill'")

        wait.until(lambda d: entry_input.get_attribute("value") == expected_bkr_next)
        new_bkr_series = entry_input.get_attribute("value")
        log(f"  -> Next Series in UI: '{new_bkr_series}' (Expected: '{expected_bkr_next}')")
        assert new_bkr_series == expected_bkr_next, f"Series mismatch: {new_bkr_series} != {expected_bkr_next}"

        inv_check = requests.get(
            f"http://localhost:8000/api/sales/invoices?limit=5",
            headers={"Authorization": f"Bearer {auth_token}"}
        ).json()
        saved_inv = [i for i in inv_check if i.get("invoice_number") == bkr_test_series]
        assert len(saved_inv) > 0, "Breakage Receive not recorded in DB!"
        log(f"  -> Verified in PostgreSQL: Breakage Receive #{bkr_test_series} GrandTotal=INR {saved_inv[0].get('grand_total')}")

        results_summary.append({"module": "Breakage Receive", "series": bkr_test_series, "next": new_bkr_series, "status": "PASS"})
    except Exception as e:
        log(f"  FAILED Breakage Receive: {e}")
        driver.save_screenshot(os.path.join(artifact_dir, "debug_brk_receive_err.png"))
        results_summary.append({"module": "Breakage Receive", "series": "N/A", "next": "N/A", "status": f"FAIL: {e}"})

    # =========================================================================
    # SUMMARY TABLE
    # =========================================================================
    log("\n" + "="*78)
    log("MASTER SELENIUM SUITE: VERIFICATION SUMMARY TABLE")
    log("="*78)
    log(f"{'#':<3} | {'MODULE NAME':<25} | {'TEST SERIES':<15} | {'ADVANCED SERIES':<15} | {'STATUS':<10}")
    log("-" * 78)
    all_passed = True
    for idx, r in enumerate(results_summary, 1):
        status = r['status']
        if "FAIL" in status:
            all_passed = False
        log(f"{idx:<3} | {r['module']:<25} | {r['series']:<15} | {r['next']:<15} | {status:<10}")
    log("="*78)
    
    if all_passed:
        log(">>> FINAL RESULT: ALL 6 TRANSACTION MODULES VERIFIED 100% OPERATIONAL! ALL PASS! <<<")
    else:
        log(">>> FINAL RESULT: SOME MODULES FAILED VERIFICATION. REVIEW LOGS ABOVE. <<<")
        sys.exit(1)

finally:
    driver.quit()
    log("Selenium Chrome WebDriver closed cleanly.")
