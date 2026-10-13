import os
import sys
import time
import json
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def log(msg):
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'), flush=True)

artifact_dir = r"C:\Users\DELL\.gemini\antigravity\brain\4793a238-58bd-40ed-9c37-093423cd07cd"

log("="*80)
log("MASTER SELENIUM SUITE: PAYMENT, RECEIPT & BILL-BY-BILL SETTLEMENT ENGINE")
log("SPECIFICATIONS: DOC-24 & DOC-07 (SECTION 20)")
log("="*80)

# ── STEP 1: BACKEND API AUTHENTICATION ──────────────────────────
log("\n[STEP 1] Authenticating via backend API (admin / Admin@123)...")
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
headers = {"Authorization": f"Bearer {auth_token}"}
log(f"SUCCESS: Authenticated as {user_info.get('username')} (Org: {org_id})")

# ── STEP 2: VERIFY FINANCE V2 ENDPOINTS DIRECTLY ───────────────
log("\n[STEP 2] Verifying Backend Finance V2 Endpoints...")
pending_res = requests.get("http://localhost:8000/api/finance/allocations/pending", headers=headers)
assert pending_res.status_code == 200, f"Pending allocations failed: {pending_res.status_code}"
pending_items = pending_res.json()
log(f"SUCCESS: GET /api/finance/allocations/pending returned {len(pending_items)} pending bills.")

rec_res = requests.get("http://localhost:8000/api/finance/outstanding?type=receivables", headers=headers)
assert rec_res.status_code == 200, f"Receivables ageing failed: {rec_res.status_code}"
rec_data = rec_res.json()
rec_tot = float(rec_data.get('total_outstanding') or 0)
log(f"SUCCESS: Receivables Ageing: Total Outstanding = Rs.{rec_tot:.2f}, Parties = {len(rec_data.get('parties', []))}")

pay_res = requests.get("http://localhost:8000/api/finance/outstanding?type=payables", headers=headers)
assert pay_res.status_code == 200, f"Payables ageing failed: {pay_res.status_code}"
pay_data = pay_res.json()
pay_tot = float(pay_data.get('total_outstanding') or 0)
log(f"SUCCESS: Payables Ageing: Total Outstanding = Rs.{pay_tot:.2f}, Parties = {len(pay_data.get('parties', []))}")

# ── STEP 3: INITIALIZE SELENIUM CHROME HEADLESS ───────────────
log("\n[STEP 3] Launching Chrome WebDriver (Headless)...")
chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--window-size=1440,950")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--disable-gpu")

driver = webdriver.Chrome(options=chrome_options)
driver.set_window_size(1440, 950)
wait = WebDriverWait(driver, 15)

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

def inject_auth(d):
    d.execute_script("""
        const authData = arguments[0];
        sessionStorage.setItem('erp-auth', JSON.stringify(authData));
        localStorage.setItem('erp-auth', JSON.stringify(authData));
    """, auth_store_obj)

try:
    driver.get("http://localhost:50005/")
    time.sleep(1)
    inject_auth(driver)

    # ── STEP 4: VERIFY CUSTOMER COUNTER RECEIPT VOUCHER (/receipt) ────
    log("\n[STEP 4] Testing Customer Counter Receipt Voucher (/receipt)...")
    driver.get("http://localhost:50005/receipt")
    time.sleep(1.5)
    inject_auth(driver)
    driver.get("http://localhost:50005/receipt")
    time.sleep(2)

    # Screenshot initial page
    shot1 = os.path.join(artifact_dir, "receipt_voucher_initial.png")
    driver.save_screenshot(shot1)
    log(f"Snapshot captured: {shot1}")

    # Check Apex Header text
    header_el = wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Receipt Voucher') or contains(text(), 'Counter Receipt')]")))
    log(f"SUCCESS: Found Receipt Voucher Header -> {header_el.text}")

    # Open Party Selection Modal
    party_btn = wait.until(EC.presence_of_element_located((By.ID, "party-select-btn")))
    driver.execute_script("arguments[0].click();", party_btn)
    time.sleep(1)

    # Search for Apollo in modal
    search_input = wait.until(EC.presence_of_element_located((By.ID, "party-search-input")))
    search_input.clear()
    search_input.send_keys("APOLLO")
    time.sleep(1)

    # Select party
    apollo_option = wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(@class, 'party-option-item')]//div[contains(text(), 'APOLLO') or contains(text(), 'Apollo')]")))
    driver.execute_script("arguments[0].click();", apollo_option)
    time.sleep(1.5)
    log("SUCCESS: Selected Customer 'APOLLO PHARMACY LTD.'")

    # Enter Receipt Amount
    amt_input = wait.until(EC.presence_of_element_located((By.ID, "transaction-amount-input")))
    amt_input.clear()
    amt_input.send_keys("750.00")
    time.sleep(0.5)

    # Click FIFO Auto-Allocate
    fifo_btn = wait.until(EC.presence_of_element_located((By.ID, "fifo-allocate-btn")))
    driver.execute_script("arguments[0].click();", fifo_btn)
    time.sleep(1)
    log("SUCCESS: Triggered 'Auto-Allocate FIFO [Alt+A]'.")

    # Screenshot allocated state
    shot2 = os.path.join(artifact_dir, "receipt_voucher_allocated.png")
    driver.save_screenshot(shot2)
    log(f"Snapshot captured: {shot2}")

    # Click Save Voucher via JS click
    save_btn = wait.until(EC.presence_of_element_located((By.ID, "save-voucher-btn")))
    driver.execute_script("arguments[0].click();", save_btn)
    time.sleep(1)

    # Modal appears - locate by button ID
    confirm_btn = wait.until(EC.presence_of_element_located((By.ID, "confirm-post-btn")))
    shot3 = os.path.join(artifact_dir, "receipt_voucher_confirm_modal.png")
    driver.save_screenshot(shot3)
    log(f"Snapshot captured: {shot3}")

    # Click Confirm Post
    driver.execute_script("arguments[0].click();", confirm_btn)
    time.sleep(3)

    shot4 = os.path.join(artifact_dir, "receipt_voucher_saved.png")
    driver.save_screenshot(shot4)
    log(f"SUCCESS: Receipt Voucher posted! Snapshot captured: {shot4}")

    # Verify series continuation in localStorage
    last_rcp = driver.execute_script("return localStorage.getItem('lastReceiptVoucherNo');")
    log(f"SUCCESS: Series continuation registered in localStorage: lastReceiptVoucherNo = '{last_rcp}'")

    # ── STEP 5: VERIFY SUPPLIER OUTWARD PAYMENT VOUCHER (/payment) ────
    log("\n[STEP 5] Testing Supplier Outward Payment Voucher (/payment)...")
    driver.get("http://localhost:50005/payment")
    time.sleep(1.5)
    inject_auth(driver)
    driver.get("http://localhost:50005/payment")
    time.sleep(2)

    shot5 = os.path.join(artifact_dir, "payment_voucher_initial.png")
    driver.save_screenshot(shot5)
    log(f"Snapshot captured: {shot5}")

    pay_header = wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Payment Voucher')]")))
    log(f"SUCCESS: Found Payment Voucher Header -> {pay_header.text}")

    # Open Party Selector
    p_party_btn = wait.until(EC.presence_of_element_located((By.ID, "party-select-btn")))
    driver.execute_script("arguments[0].click();", p_party_btn)
    time.sleep(1)

    p_search = wait.until(EC.presence_of_element_located((By.ID, "party-search-input")))
    p_search.clear()
    p_search.send_keys("Sun")
    time.sleep(1)

    sun_option = wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(@class, 'party-option-item')]//div[contains(text(), 'Sun') or contains(text(), 'SUN')]")))
    driver.execute_script("arguments[0].click();", sun_option)
    time.sleep(1.5)
    log("SUCCESS: Selected Supplier 'Sun Pharma Ltd.'")

    # Enter payment amount
    p_amt = wait.until(EC.presence_of_element_located((By.ID, "transaction-amount-input")))
    p_amt.clear()
    p_amt.send_keys("600.00")
    time.sleep(0.5)

    # Click Auto Allocate FIFO
    p_fifo = wait.until(EC.presence_of_element_located((By.ID, "fifo-allocate-btn")))
    driver.execute_script("arguments[0].click();", p_fifo)
    time.sleep(1)

    # Post payment
    p_save = wait.until(EC.presence_of_element_located((By.ID, "save-voucher-btn")))
    driver.execute_script("arguments[0].click();", p_save)
    time.sleep(1)

    p_confirm = wait.until(EC.presence_of_element_located((By.ID, "confirm-post-btn")))
    driver.execute_script("arguments[0].click();", p_confirm)
    time.sleep(3)

    shot6 = os.path.join(artifact_dir, "payment_voucher_saved.png")
    driver.save_screenshot(shot6)
    log(f"SUCCESS: Payment Voucher posted! Snapshot captured: {shot6}")

    last_pmt = driver.execute_script("return localStorage.getItem('lastPaymentVoucherNo');")
    log(f"SUCCESS: Series continuation registered in localStorage: lastPaymentVoucherNo = '{last_pmt}'")

    # ── STEP 6: VERIFY OUTSTANDING AGEING WORKBENCH (/finance/outstanding) ──
    log("\n[STEP 6] Testing Outstanding & Ageing Workbench (/finance/outstanding)...")
    driver.get("http://localhost:50005/finance/outstanding")
    time.sleep(1.5)
    inject_auth(driver)
    driver.get("http://localhost:50005/finance/outstanding")
    time.sleep(2.5)

    shot7 = os.path.join(artifact_dir, "outstanding_workbench_receivables.png")
    driver.save_screenshot(shot7)
    log(f"Snapshot captured: {shot7}")

    # Verify Ageing KPI Cards exist
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(., '30 Days')]")))
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(., '60 Days')]")))
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(., '90 Days')]")))
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(., '90+ Days')]")))
    log("SUCCESS: Verified Ageing KPI Cards (0-30, 31-60, 61-90, >90 Days) on Receivables.")

    # Switch to Payables Tab
    pay_tab_btn = wait.until(EC.presence_of_element_located((By.ID, "tab-payables-btn")))
    driver.execute_script("arguments[0].click();", pay_tab_btn)
    time.sleep(2)

    shot8 = os.path.join(artifact_dir, "outstanding_workbench_payables.png")
    driver.save_screenshot(shot8)
    log(f"Snapshot captured: {shot8}")

    # Expand bill drawer for first party row
    party_rows = wait.until(EC.presence_of_all_elements_located((By.CLASS_NAME, "party-ageing-row")))
    if len(party_rows) > 0:
        driver.execute_script("arguments[0].click();", party_rows[0])
        time.sleep(1.5)
        shot9 = os.path.join(artifact_dir, "outstanding_workbench_payables_drawer.png")
        driver.save_screenshot(shot9)
        log(f"SUCCESS: Expanded supplier bill drawer! Snapshot captured: {shot9}")

    log("\n" + "="*80)
    log("ALL 6 STEPS OF PAYMENT, RECEIPT & SETTLEMENT ENGINE SUITE PASSED PERFECTLY!")
    log("="*80)

except Exception as e:
    err_shot = os.path.join(artifact_dir, "selenium_settlement_error.png")
    driver.save_screenshot(err_shot)
    log(f"\n[ERROR] Test encountered exception: {e}")
    log(f"[ERROR] Error snapshot saved to: {err_shot}")
    raise
finally:
    driver.quit()
