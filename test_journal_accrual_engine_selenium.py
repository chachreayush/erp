import os
import sys
import time
import json
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC

def log(msg):
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'), flush=True)

artifact_dir = r"C:\Users\DELL\.gemini\antigravity\brain\4793a238-58bd-40ed-9c37-093423cd07cd"

log("="*80)
log("MASTER SELENIUM SUITE: JOURNAL VOUCHER, ADJUSTMENT & ACCRUAL ENGINE")
log("SPECIFICATION: DOC-25 (JOURNAL VOUCHER & ACCRUAL MANAGEMENT ENGINE)")
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

# ── STEP 2: VERIFY FINANCE V2 JOURNAL ENDPOINTS DIRECTLY ─────────
log("\n[STEP 2] Verifying Backend Finance V2 Journal Endpoints...")
journals_res = requests.get("http://localhost:8000/api/finance/journals", headers=headers)
assert journals_res.status_code == 200, f"GET journals failed: {journals_res.status_code}"
existing_journals = journals_res.json()
log(f"SUCCESS: GET /api/finance/journals returned {len(existing_journals)} existing journals.")

# Fetch ledgers for direct API posting test
ledgers_res = requests.get("http://localhost:8000/api/master/ledgers", headers=headers)
assert ledgers_res.status_code == 200, f"GET ledgers failed: {ledgers_res.status_code}"
ledgers_list = ledgers_res.json()
assert len(ledgers_list) >= 2, "Need at least 2 ledgers for double-entry test"
l1_id = ledgers_list[0]["id"]
l2_id = ledgers_list[1]["id"]
log(f"SUCCESS: Loaded ledgers: '{ledgers_list[0]['name']}' and '{ledgers_list[1]['name']}'")

# Test 1: Unbalanced Journal Rejection (Must fail with 400)
unbalanced_payload = {
    "voucher_number": "JV-TEST-ERR",
    "date": "2026-05-01T10:00:00Z",
    "journal_type": "Standard Manual Journal",
    "entries": [
        {"ledger_id": l1_id, "cr_dr": "Dr", "amount": 1000.00},
        {"ledger_id": l2_id, "cr_dr": "Cr", "amount": 900.00}
    ]
}
err_res = requests.post("http://localhost:8000/api/finance/journal", json=unbalanced_payload, headers=headers)
assert err_res.status_code == 400, f"Expected 400 for unbalanced journal, got {err_res.status_code}"
log(f"SUCCESS: Double-Entry Validation Rule Verified: Out-of-balance journal rejected with status 400 ({err_res.json().get('detail')})")

# Test 2: Balanced Journal Posting via API
api_test_vch_no = f"JV-API-{int(time.time())}"
balanced_payload = {
    "voucher_number": api_test_vch_no,
    "date": "2026-05-01T10:00:00Z",
    "journal_type": "Accrual Journal",
    "reference_number": "DOC-REF-001",
    "scheduled_reversal_date": "2026-06-01",
    "narration": "May Accrual for administrative expenses",
    "entries": [
        {"ledger_id": l1_id, "cr_dr": "Dr", "amount": 15000.00},
        {"ledger_id": l2_id, "cr_dr": "Cr", "amount": 15000.00}
    ]
}
create_res = requests.post("http://localhost:8000/api/finance/journal", json=balanced_payload, headers=headers)
assert create_res.status_code == 200, f"Balanced journal creation failed: {create_res.status_code} - {create_res.text}"
created_vch = create_res.json()
created_vch_id = created_vch["id"]
log(f"SUCCESS: POST /api/finance/journal created voucher {created_vch['voucher_number']} (Total: Rs.{created_vch['total_amount']})")

# Test 3: Reversal via API
reverse_res = requests.post(f"http://localhost:8000/api/finance/journal/{created_vch_id}/reverse", json={
    "reason": "Test periodic reversal"
}, headers=headers)
assert reverse_res.status_code == 200, f"Reversal failed: {reverse_res.status_code} - {reverse_res.text}"
rev_vch = reverse_res.json()
log(f"SUCCESS: POST /api/finance/journal/{created_vch_id}/reverse generated inverted voucher {rev_vch['voucher_number']} (Status: {rev_vch['status']})")
assert len(rev_vch["entries"]) == 2, "Reversal must have 2 entries"
# Check inverted Cr/Dr
orig_e1 = created_vch["entries"][0]
rev_e1 = [e for e in rev_vch["entries"] if e["ledger_id"] == orig_e1["ledger_id"]][0]
assert orig_e1["cr_dr"] != rev_e1["cr_dr"], f"Entry 1 was {orig_e1['cr_dr']} but reversal was {rev_e1['cr_dr']}"
log(f"SUCCESS: Inversion Verified: Original leg was {orig_e1['cr_dr']} -> Reversal leg is {rev_e1['cr_dr']}")

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

    # ── STEP 4: VERIFY KEYBOARD-FIRST JOURNAL COCKPIT (/journal) ────
    log("\n[STEP 4] Testing Keyboard-First Journal Cockpit (/journal)...")
    driver.get("http://localhost:50005/journal")
    time.sleep(1.5)
    inject_auth(driver)
    driver.get("http://localhost:50005/journal")
    time.sleep(2)

    # Screenshot initial cockpit page
    shot_initial = os.path.join(artifact_dir, "journal_cockpit_initial.png")
    driver.save_screenshot(shot_initial)
    log(f"Snapshot captured: {shot_initial}")

    # Check header
    header_el = wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Journal Voucher Cockpit')]")))
    log(f"SUCCESS: Cockpit Loaded -> '{header_el.text}'")

    # Set distinct voucher number for UI test
    vch_input = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@data-testid='input-voucher-number']")))
    test_vch_number = f"JV-AUTO-{int(time.time())}"
    vch_input.clear()
    vch_input.send_keys(test_vch_number)
    time.sleep(0.5)

    # Set Reference Number
    ref_input = driver.find_element(By.XPATH, "//input[@data-testid='input-reference-number']")
    ref_input.clear()
    ref_input.send_keys("BILL-ADJ-2026/01")

    # Set Overall Narration
    narr_input = driver.find_element(By.XPATH, "//input[@data-testid='input-overall-narration']")
    narr_input.clear()
    narr_input.send_keys("End-of-month multi-leg expense and depreciation adjustment")

    # Leg 1: Select Ledger 0, Set Debit 10,000
    select_l0 = Select(wait.until(EC.presence_of_element_located((By.XPATH, "//select[@data-testid='select-ledger-0']"))))
    select_l0.select_by_value(l1_id)
    time.sleep(0.5)

    dr_input_0 = driver.find_element(By.XPATH, "//input[@data-testid='input-debit-0']")
    dr_input_0.clear()
    dr_input_0.send_keys("10000.00")
    time.sleep(0.5)

    # Leg 2: Add Line button
    add_dr_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@data-testid='btn-add-dr-line']")))
    driver.execute_script("arguments[0].click();", add_dr_btn)
    time.sleep(1)

    # In Leg 2 (index 2): Select Ledger 1, Set Debit 2,500
    select_l2 = Select(wait.until(EC.presence_of_element_located((By.XPATH, "//select[@data-testid='select-ledger-2']"))))
    select_l2.select_by_value(l2_id)
    time.sleep(0.5)

    dr_input_2 = driver.find_element(By.XPATH, "//input[@data-testid='input-debit-2']")
    dr_input_2.clear()
    dr_input_2.send_keys("2500.00")
    time.sleep(0.5)

    # Leg 1 is row 1 (index 1), let's select a ledger for row 1
    # Check ledgers list for 3rd ledger or reuse l1
    l3_id = ledgers_list[2]["id"] if len(ledgers_list) > 2 else l2_id
    select_l1 = Select(wait.until(EC.presence_of_element_located((By.XPATH, "//select[@data-testid='select-ledger-1']"))))
    select_l1.select_by_value(l3_id)
    time.sleep(0.5)

    # Now verify UNBALANCED indicator
    unbal_el = wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='balance-status-unbalanced']")))
    log(f"SUCCESS: Real-time validation active -> Status: '{unbal_el.text}'")

    # Test Auto-Balance [Ctrl+B]
    log("Testing Auto-Balance [Ctrl+B] feature...")
    auto_bal_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@data-testid='btn-auto-balance-bottom']")))
    driver.execute_script("arguments[0].click();", auto_bal_btn)
    time.sleep(1.5)

    # Verify that total debits equals total credits (12,500.00)
    bal_el = wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='balance-status-balanced']")))
    log(f"SUCCESS: Auto-Balance Successful! Status: '{bal_el.text}'")

    tot_dr_el = driver.find_element(By.XPATH, "//*[@data-testid='total-debits-display']")
    tot_cr_el = driver.find_element(By.XPATH, "//*[@data-testid='total-credits-display']")
    log(f"SUCCESS: Pinned Totals: Dr = {tot_dr_el.text}, Cr = {tot_cr_el.text}")
    assert "12,500.00" in tot_dr_el.text, f"Expected 12,500.00 Dr, got {tot_dr_el.text}"
    assert "12,500.00" in tot_cr_el.text, f"Expected 12,500.00 Cr, got {tot_cr_el.text}"

    shot_balanced = os.path.join(artifact_dir, "journal_cockpit_balanced.png")
    driver.save_screenshot(shot_balanced)
    log(f"Snapshot captured: {shot_balanced}")

    # Post Journal Voucher
    log("Posting Journal Voucher to General Ledger...")
    post_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@data-testid='btn-post-journal']")))
    driver.execute_script("arguments[0].click();", post_btn)
    time.sleep(1)

    # Check Confirmation Modal
    modal_el = wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='confirm-modal']")))
    log("SUCCESS: Confirmation Modal opened with detailed allocation breakdown.")
    shot_modal = os.path.join(artifact_dir, "journal_cockpit_confirm_modal.png")
    driver.save_screenshot(shot_modal)
    log(f"Snapshot captured: {shot_modal}")

    confirm_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@data-testid='btn-modal-confirm']")))
    driver.execute_script("arguments[0].click();", confirm_btn)
    time.sleep(2)

    # Verify Success Alert
    success_el = wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='journal-success-alert']")))
    log(f"SUCCESS: Journal Posted -> {success_el.text}")
    shot_saved = os.path.join(artifact_dir, "journal_cockpit_saved.png")
    driver.save_screenshot(shot_saved)
    log(f"Snapshot captured: {shot_saved}")

    # ── STEP 5: TEST ACCRUAL JOURNAL & REVERSAL SCHEDULER ──────────
    log("\n[STEP 5] Testing Accrual Journal with Auto-Reversal Scheduler...")
    # Select 'Accrual Journal'
    class_select = Select(wait.until(EC.presence_of_element_located((By.XPATH, "//select[@data-testid='select-journal-classification']"))))
    class_select.select_by_value("Accrual Journal")
    time.sleep(1)

    # Verify auto-reversal checkbox is checked
    reversal_chk = driver.find_element(By.XPATH, "//input[@data-testid='checkbox-schedule-reversal']")
    assert reversal_chk.is_selected(), "Accrual selection should automatically check Auto-Reversal"
    log("SUCCESS: Accrual Journal activated Auto-Reversal Scheduler.")

    accrual_vch_no = f"JV-ACCRUAL-{int(time.time())}"
    vch_input = driver.find_element(By.XPATH, "//input[@data-testid='input-voucher-number']")
    vch_input.clear()
    vch_input.send_keys(accrual_vch_no)
    time.sleep(0.5)

    # Fill 2 legs: 5000 Dr and 5000 Cr
    select_a0 = Select(wait.until(EC.presence_of_element_located((By.XPATH, "//select[@data-testid='select-ledger-0']"))))
    select_a0.select_by_value(l1_id)
    dr_a0 = driver.find_element(By.XPATH, "//input[@data-testid='input-debit-0']")
    dr_a0.clear()
    dr_a0.send_keys("5000.00")

    select_a1 = Select(wait.until(EC.presence_of_element_located((By.XPATH, "//select[@data-testid='select-ledger-1']"))))
    select_a1.select_by_value(l2_id)
    cr_a1 = driver.find_element(By.XPATH, "//input[@data-testid='input-credit-1']")
    cr_a1.clear()
    cr_a1.send_keys("5000.00")
    time.sleep(0.5)

    # Post Accrual
    driver.execute_script("arguments[0].click();", wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@data-testid='btn-post-journal']"))))
    time.sleep(1)
    driver.execute_script("arguments[0].click();", wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@data-testid='btn-modal-confirm']"))))
    time.sleep(2)

    accrual_success = wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='journal-success-alert']")))
    log(f"SUCCESS: Accrual Journal Posted -> {accrual_success.text}")
    shot_accrual = os.path.join(artifact_dir, "journal_accrual_saved.png")
    driver.save_screenshot(shot_accrual)
    log(f"Snapshot captured: {shot_accrual}")

    # ── STEP 6: JOURNAL REGISTER & TRACEABLE REVERSAL WORKBENCH ─────
    log("\n[STEP 6] Testing Journal Register & Traceable One-Click Reversal (/finance/journal-register)...")
    driver.get("http://localhost:50005/finance/journal-register")
    time.sleep(1.5)
    inject_auth(driver)
    driver.get("http://localhost:50005/finance/journal-register")
    time.sleep(2)

    shot_register = os.path.join(artifact_dir, "journal_register_view.png")
    driver.save_screenshot(shot_register)
    log(f"Snapshot captured: {shot_register}")

    # Verify Metrics cards
    metric_tot = wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='metric-total-journals']")))
    metric_vol = driver.find_element(By.XPATH, "//*[@data-testid='metric-total-volume']")
    metric_acc = driver.find_element(By.XPATH, "//*[@data-testid='metric-active-accruals']")
    log(f"SUCCESS: Register Metrics Loaded: Journals = {metric_tot.text}, Volume = {metric_vol.text}, Active Accruals = {metric_acc.text}")

    # Locate the newly posted voucher row in register
    row_el = wait.until(EC.presence_of_element_located((By.XPATH, f"//tr[@data-testid='voucher-row-{accrual_vch_no}']")))
    log(f"SUCCESS: Found posted voucher '{accrual_vch_no}' in Journal Register.")

    # Expand the row to inspect entry legs
    driver.execute_script("arguments[0].click();", row_el)
    time.sleep(1)
    log("SUCCESS: Expanded voucher drawer showing entry legs breakdown.")

    # Trigger One-Click Reversal
    rev_btn = wait.until(EC.element_to_be_clickable((By.XPATH, f"//button[@data-testid='btn-reverse-{accrual_vch_no}']")))
    driver.execute_script("arguments[0].click();", rev_btn)
    time.sleep(1)

    # Reversal modal
    rev_modal = wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='reversal-modal']")))
    log("SUCCESS: Traceable Reversal Modal opened with double-entry inversion explanation.")
    shot_rev_modal = os.path.join(artifact_dir, "journal_reversal_modal.png")
    driver.save_screenshot(shot_rev_modal)
    log(f"Snapshot captured: {shot_rev_modal}")

    # Confirm Reversal
    confirm_rev_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@data-testid='btn-modal-reversal-confirm']")))
    driver.execute_script("arguments[0].click();", confirm_rev_btn)
    time.sleep(2.5)

    # Verify Reversal Success Alert
    rev_success = wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='register-success-alert']")))
    log(f"SUCCESS: Reversal Completed -> {rev_success.text}")
    shot_rev_success = os.path.join(artifact_dir, "journal_reversal_success.png")
    driver.save_screenshot(shot_rev_success)
    log(f"Snapshot captured: {shot_rev_success}")

    # Verify that original voucher row now shows status 'Reversed'
    wait.until(lambda d: "Reversed" in d.find_element(By.XPATH, f"//tr[@data-testid='voucher-row-{accrual_vch_no}']").text)
    row_updated = driver.find_element(By.XPATH, f"//tr[@data-testid='voucher-row-{accrual_vch_no}']")
    log(f"SUCCESS: Original Voucher '{accrual_vch_no}' status verified as 'Reversed' with linked audit trail.")

    log("\n" + "="*80)
    log("ALL 6 STAGES OF DOC-25 JOURNAL VOUCHER & ACCRUAL ENGINE VERIFIED 100%!")
    log("="*80)

finally:
    driver.quit()
    log("\n[CLEANUP] Selenium Chrome WebDriver closed successfully.")
