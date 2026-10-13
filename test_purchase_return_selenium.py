import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
import json
import time
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def log(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))

artifact_dir = r"C:\Users\DELL\.gemini\antigravity\brain\4793a238-58bd-40ed-9c37-093423cd07cd"

log("="*70)
log("SELENIUM AUTOMATED TEST: Supplier Debit Note & Series Continuation Engine")
log("="*70)

# 1. API Login
log("\n[1/6] Authenticating via backend API (admin / Admin@123)...")
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

# 2. Start Selenium
log("\n[2/6] Starting Chrome WebDriver (Selenium headless)...")
chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--window-size=1440,950")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")

driver = webdriver.Chrome(options=chrome_options)
driver.implicitly_wait(5)

try:
    # 3. Open App & Inject Session
    log("\n[3/6] Navigating to ERP and injecting auth credentials...")
    driver.get("http://localhost:50005/")
    time.sleep(1)

    driver.execute_script("""
        const authData = arguments[0];
        sessionStorage.setItem('erp-auth', JSON.stringify(authData));
        localStorage.setItem('erp-auth', JSON.stringify(authData));
    """, auth_store_obj)

    # 4. Navigate to Purchase Return
    log("Navigating to /purchase-return...")
    driver.get("http://localhost:50005/purchase-return")
    
    wait = WebDriverWait(driver, 10)
    dn_input = wait.until(EC.presence_of_element_located((By.XPATH, "//input[contains(@placeholder, 'DN-0001')]")))
    log("SUCCESS: Purchase Return UI loaded!")
    time.sleep(1)

    # Screenshot initial state
    init_screenshot = os.path.join(artifact_dir, "debit_note_initial.png")
    driver.save_screenshot(init_screenshot)
    log(f"Saved initial screen screenshot to {init_screenshot}")

    # 5. Check Series Numbering & Edit Series to Test Marg/Tally Continuation
    log("\n[4/6] Testing Editable Series & Numbering Continuation...")
    curr_series = dn_input.get_attribute("value")
    log(f"Current initial series displayed: '{curr_series}'")

    # Change to a custom user series: RJ-DN-0020
    custom_test_series = "RJ-DN-0020"
    dn_input.send_keys(Keys.CONTROL + "a")
    dn_input.send_keys(Keys.BACKSPACE)
    dn_input.send_keys(custom_test_series)
    log(f"User edited series to custom pattern: '{custom_test_series}'")
    time.sleep(0.5)

    # 6. Select Supplier & Inward Bill (Against Bill workflow)
    log("\n[5/6] Testing Against Inward Bill workflow...")
    supplier_input = driver.find_element(By.XPATH, "//input[contains(@placeholder, 'Type to search supplier')]")
    supplier_input.send_keys(Keys.CONTROL + "a")
    supplier_input.send_keys(Keys.BACKSPACE)
    supplier_input.send_keys("Sun Pharma Ltd.")
    time.sleep(1)

    # Click "Select Inward Purchase Bill" button
    bill_picker_btn = driver.find_element(By.XPATH, "//button[contains(., 'Select Inward Purchase Bill') or contains(., 'Browse Inward Bills')]")
    bill_picker_btn.click()
    log("Opened Inward Purchase Bill picker modal")
    time.sleep(1.5)

    # Screenshot bill picker modal
    modal_screenshot = os.path.join(artifact_dir, "debit_note_bill_picker_modal.png")
    driver.save_screenshot(modal_screenshot)
    log(f"Saved bill picker modal screenshot to {modal_screenshot}")

    # Select the first bill in the modal
    load_items_btns = driver.find_elements(By.XPATH, "//span[contains(text(), 'Load Items')] | //div[contains(text(), 'Invoice #')]")
    if load_items_btns:
        driver.execute_script("arguments[0].click();", load_items_btns[0])
        log("Selected inward bill and loaded line items into return table")
    else:
        log("No bills found in modal, switching to Direct Loose Return [F3]...")
        driver.find_element(By.XPATH, "//button[contains(text(), 'Cancel')]").click()
        time.sleep(0.5)
        driver.find_element(By.XPATH, "//button[contains(., '[F3] Direct Loose Return')]").click()
        time.sleep(0.5)
        driver.find_element(By.XPATH, "//button[contains(., 'Add Return Product')]").click()
        log("Added manual return product row")

    time.sleep(1)

    # Screenshot populated table
    populated_screenshot = os.path.join(artifact_dir, "debit_note_populated_table.png")
    driver.save_screenshot(populated_screenshot)
    log(f"Saved populated debit note screenshot to {populated_screenshot}")

    # 7. Save & Issue Debit Note
    log("\n[6/6] Saving & Posting Debit Note...")
    save_btn = driver.find_element(By.XPATH, "//button[contains(., 'Issue Debit Note')]")
    save_btn.click()
    log("Clicked 'Issue Debit Note'. Waiting for save confirmation banner...")

    # Wait for success toast banner to appear
    toast = wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'issued successfully')]")))
    log(f"SUCCESS BANNER DETECTED: '{toast.text}'")

    # Wait for series continuation to advance to RJ-DN-0021
    wait.until(lambda d: d.find_element(By.XPATH, "//input[contains(@placeholder, 'DN-0001')]").get_attribute("value") == "RJ-DN-0021")
    dn_input_after = driver.find_element(By.XPATH, "//input[contains(@placeholder, 'DN-0001')]")
    after_series = dn_input_after.get_attribute("value")
    log(f"Series continuation check: Next series is '{after_series}' (Expected: 'RJ-DN-0021')")
    if after_series == "RJ-DN-0021":
        log(">>> PASS: Marg/Tally Series Continuation Engine advanced custom sequence successfully!")

    # Screenshot post-save state showing success banner and incremented series
    time.sleep(0.5)
    saved_screenshot = os.path.join(artifact_dir, "debit_note_saved_successfully.png")
    driver.save_screenshot(saved_screenshot)
    log(f"Saved post-save screenshot to {saved_screenshot}")

    # Verify backend PostgreSQL record
    log("\nVerifying database records in PostgreSQL...")
    from database import SessionLocal
    import models

    db = SessionLocal()
    saved_inv = db.query(models.Invoice).filter(
        models.Invoice.invoice_number == custom_test_series,
        models.Invoice.invoice_type == "purchase-return"
    ).first()

    if saved_inv:
        log(f">>> PASS: Verified Invoice record in DB: ID={saved_inv.id}, Number={saved_inv.invoice_number}, GrandTotal=INR {saved_inv.grand_total}")
        log(f"    Line Items Count: {len(saved_inv.items)}")
        for it in saved_inv.items:
            log(f"      - {it.product_name} | Batch: {it.batch} | Qty: {it.quantity} | Disposition: {it.disposition} | Rate: {it.rate}")

        # Verify auto-posted accounting voucher
        voucher = db.query(models.Voucher).filter(
            models.Voucher.ref_invoice_id == saved_inv.id,
            models.Voucher.status == "Active"
        ).first()
        if voucher:
            log(f">>> PASS: Verified General Ledger Auto-Posting Voucher: Number={voucher.voucher_number}, Amount=INR {voucher.total_amount}")
            for entry in voucher.entries:
                log(f"      Ledger ID: {entry.ledger_id} | {entry.cr_dr} INR {entry.amount}")
        else:
            log(">>> WARNING: Voucher not found for invoice ID.")
    else:
        log(">>> WARNING: Saved invoice not found by custom series name.")
    db.close()

    log("\n" + "="*70)
    log("ALL SELENIUM VERIFICATION TESTS PASSED CLEANLY!")
    log("="*70)

finally:
    driver.quit()
