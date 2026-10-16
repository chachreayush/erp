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
log("MASTER SELENIUM SUITE: EXPENSE, PETTY CASH & EMPLOYEE REIMBURSEMENT ENGINE")
log("SPECIFICATION: DOC-26 (EXPENSE, PETTY CASH & EMPLOYEE REIMBURSEMENT ENGINE)")
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

# ── STEP 2: VERIFY DOC-26 ENDPOINTS & SEED EMPLOYEE LEDGER ──────
log("\n[STEP 2] Verifying Backend DOC-26 Expense & Advance Endpoints...")
cat_res = requests.get("http://localhost:8000/api/expenses/categories", headers=headers)
assert cat_res.status_code == 200, f"GET categories failed: {cat_res.status_code}"
categories = cat_res.json()
log(f"SUCCESS: Loaded {len(categories)} operational expense categories:")
for c in categories[:4]:
    log(f"  - [{c['id']}] {c['name']}")

sum_res = requests.get("http://localhost:8000/api/expenses/summary", headers=headers)
assert sum_res.status_code == 200, f"GET summary failed: {sum_res.status_code}"
initial_summary = sum_res.json()
log(f"SUCCESS: Current Operational KPI Summary: {initial_summary}")

# Verify or create dedicated Employee Ledger
ledgers_res = requests.get("http://localhost:8000/api/master/ledgers", headers=headers)
assert ledgers_res.status_code == 200, f"GET ledgers failed: {ledgers_res.status_code}"
all_ledgers = ledgers_res.json()

target_emp_ledger = next((l for l in all_ledgers if "Vikram Malhotra" in l.get("name", "")), None)
if not target_emp_ledger:
    create_l_res = requests.post("http://localhost:8000/api/master/ledgers", json={
        "name": "Vikram Malhotra (Field Exec)",
        "group_name": "Current Liabilities",
        "opening_balance": 0.0,
        "dr_cr": "Cr",
        "is_active": True
    }, headers=headers)
    assert create_l_res.status_code == 200, f"Failed to create employee ledger: {create_l_res.text}"
    target_emp_ledger = create_l_res.json()
    log(f"SUCCESS: Created Employee Ledger: {target_emp_ledger['name']} ({target_emp_ledger['id']})")
else:
    log(f"SUCCESS: Found Employee Ledger: {target_emp_ledger['name']} ({target_emp_ledger['id']})")

emp_id = target_emp_ledger["id"]
emp_name = target_emp_ledger["name"]

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

created_advance_id = None
created_claim_number = f"EXP-{int(time.time())}"

try:
    driver.get("http://localhost:50005/")
    time.sleep(1)
    inject_auth(driver)

    # ── STEP 4: VERIFY EXPENSE WORKBENCH (/finance/expenses) ───────
    log("\n[STEP 4] Navigating to Expense & Petty Cash Engine (/finance/expenses)...")
    driver.get("http://localhost:50005/finance/expenses")
    time.sleep(1.5)
    inject_auth(driver)
    driver.get("http://localhost:50005/finance/expenses")
    time.sleep(2)

    # Screenshot initial cockpit page
    shot_initial = os.path.join(artifact_dir, "expense_cockpit_initial.png")
    driver.save_screenshot(shot_initial)
    log(f"Snapshot captured: {shot_initial}")

    # Check header
    header_el = wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Operational Expense & Petty Cash Manager')]")))
    doc_badge = driver.find_element(By.XPATH, "//*[contains(text(), 'DOC-26')]")
    log(f"SUCCESS: Cockpit Loaded -> '{header_el.text}' [{doc_badge.text}]")

    # Verify 4 Metric Cards
    m_exp = wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='metric-total-expenses']")))
    m_pnd = driver.find_element(By.XPATH, "//*[@data-testid='metric-pending-claims']")
    m_act = driver.find_element(By.XPATH, "//*[@data-testid='metric-active-advances']")
    m_stl = driver.find_element(By.XPATH, "//*[@data-testid='metric-settled-advances']")
    log(f"SUCCESS: KPI Metrics Present -> Total Exp: {m_exp.text}, Pending: {m_pnd.text}, Active Adv: {m_act.text}, Settled Adv: {m_stl.text}")

    # ── STEP 5: ISSUE EMPLOYEE ADVANCE (Rs. 5,000.00) VIA UI ────────
    log("\n[STEP 5] Testing UI Modal: Issue Employee Advance (Rs. 5,000.00)...")
    btn_issue_adv = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@data-testid='btn-issue-advance']")))
    btn_issue_adv.click()
    time.sleep(1)

    # Advance modal visible
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='advance-modal']")))
    log("SUCCESS: Issue Advance modal displayed.")

    # Select Employee
    sel_adv_emp = Select(wait.until(EC.presence_of_element_located((By.XPATH, "//select[@data-testid='select-advance-employee']"))))
    sel_adv_emp.select_by_value(emp_id)
    time.sleep(0.5)

    # Input Amount 5000.00
    inp_adv_amt = driver.find_element(By.XPATH, "//input[@data-testid='input-advance-amount']")
    inp_adv_amt.clear()
    inp_adv_amt.send_keys("5000.00")
    time.sleep(0.5)

    # Input Reason
    inp_adv_rsn = driver.find_element(By.XPATH, "//input[@data-testid='input-advance-reason']")
    inp_adv_rsn.clear()
    inp_adv_rsn.send_keys("Client Field Tour & Incidentals Advance")
    time.sleep(0.5)

    # Submit
    btn_sub_adv = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@data-testid='btn-submit-advance']")))
    btn_sub_adv.click()
    log("Submitted Advance creation form.")

    # Wait for success banner
    success_el = wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='expense-success-alert']")))
    log(f"SUCCESS: Advance confirmation received -> '{success_el.text}'")

    # Switch to Advances tab to verify
    tab_adv = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@data-testid='tab-advances']")))
    tab_adv.click()
    time.sleep(1.5)

    # Find advance in table
    adv_table = wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='advances-table']")))
    adv_rows = adv_table.find_elements(By.XPATH, ".//tbody/tr")
    log(f"SUCCESS: Advances Tab loaded {len(adv_rows)} advance rows.")

    # Screenshot advance tab
    shot_adv = os.path.join(artifact_dir, "expense_advance_issued.png")
    driver.save_screenshot(shot_adv)
    log(f"Snapshot captured: {shot_adv}")

    # Fetch advance ID from API
    adv_list_res = requests.get("http://localhost:8000/api/expenses/advances", headers=headers)
    assert adv_list_res.status_code == 200
    user_advs = [a for a in adv_list_res.json() if a.get("employee_ledger_id") == emp_id and a.get("status") == "Active"]
    assert len(user_advs) >= 1, "Expected at least 1 active advance for employee"
    active_adv = user_advs[0]
    created_advance_id = active_adv["id"]
    log(f"SUCCESS: Backend confirmed Active Advance #{created_advance_id} for {emp_name} (Amount: Rs.{active_adv['amount']})")

    # ── STEP 6: RECORD MULTI-LINE EXPENSE CLAIM WITH ADVANCE LINK ───
    log("\n[STEP 6] Testing UI Modal: Record Multi-Line Expense Claim (Rs. 4,000.00)...")
    # Switch back to claims tab
    tab_claims = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@data-testid='tab-claims']")))
    tab_claims.click()
    time.sleep(1)

    # Click + New Expense Claim
    btn_new_claim = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@data-testid='btn-new-claim']")))
    btn_new_claim.click()
    time.sleep(1)

    # Claim modal visible
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='expense-claim-modal']")))
    log("SUCCESS: Expense Claim Entry Modal displayed.")

    # Wait for Employee dropdown to populate
    wait.until(lambda d: len(Select(d.find_element(By.XPATH, "//select[@data-testid='select-employee']")).options) > 1)
    sel_claim_emp = Select(driver.find_element(By.XPATH, "//select[@data-testid='select-employee']"))
    sel_claim_emp.select_by_value(emp_id)
    time.sleep(1) # wait for advances to filter

    # Select Active Advance Linkage
    wait.until(lambda d: len(Select(d.find_element(By.XPATH, "//select[@data-testid='select-advance']")).options) > 1)
    sel_adv_link = Select(driver.find_element(By.XPATH, "//select[@data-testid='select-advance']"))
    # Select the advance option
    found_opt = False
    for opt in sel_adv_link.options:
        if created_advance_id in opt.get_attribute("value"):
            sel_adv_link.select_by_value(opt.get_attribute("value"))
            found_opt = True
            log(f"SUCCESS: Selected linked advance: '{opt.text}'")
            break
    if not found_opt and len(sel_adv_link.options) > 1:
        sel_adv_link.select_by_index(1)
        log("SUCCESS: Selected advance by index 1.")

    # Enter Claim Number
    inp_claim_no = driver.find_element(By.XPATH, "//input[@data-testid='input-claim-number']")
    inp_claim_no.clear()
    inp_claim_no.send_keys(created_claim_number)

    # Enter Remarks
    inp_claim_rem = driver.find_element(By.XPATH, "//input[@data-testid='input-claim-remarks']")
    inp_claim_rem.clear()
    inp_claim_rem.send_keys("Regional Distribution Tour, Porterage & Client Refreshments")

    # Wait for Categories dropdown to populate
    wait.until(lambda d: len(Select(d.find_element(By.XPATH, "//select[@data-testid='select-category-0']")).options) > 1)
    sel_cat_0 = Select(driver.find_element(By.XPATH, "//select[@data-testid='select-category-0']"))
    sel_cat_0.select_by_index(1) # First category
    cat_0_name = sel_cat_0.first_selected_option.text
    log(f"Line 1 Category: {cat_0_name}")

    inp_bill_0 = driver.find_element(By.XPATH, "//input[@data-testid='input-bill-number-0']")
    inp_bill_0.clear()
    inp_bill_0.send_keys("TR-0881")

    inp_amt_0 = driver.find_element(By.XPATH, "//input[@data-testid='input-amount-0']")
    inp_amt_0.clear()
    inp_amt_0.send_keys("2500.00")

    inp_note_0 = driver.find_element(By.XPATH, "//input[@data-testid='input-note-0']")
    inp_note_0.clear()
    inp_note_0.send_keys("Inter-city express train ticket")

    # Add Line 1
    btn_add_line = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@data-testid='btn-add-line']")))
    btn_add_line.click()
    time.sleep(0.5)

    # Item Line 1: Supplies / Porterage (Rs. 1,200.00)
    sel_cat_1 = Select(wait.until(EC.presence_of_element_located((By.XPATH, "//select[@data-testid='select-category-1']"))))
    sel_cat_1.select_by_index(2)
    cat_1_name = sel_cat_1.first_selected_option.text
    log(f"Line 2 Category: {cat_1_name}")

    inp_bill_1 = driver.find_element(By.XPATH, "//input[@data-testid='input-bill-number-1']")
    inp_bill_1.clear()
    inp_bill_1.send_keys("PT-104")

    inp_amt_1 = driver.find_element(By.XPATH, "//input[@data-testid='input-amount-1']")
    inp_amt_1.clear()
    inp_amt_1.send_keys("1200.00")

    inp_note_1 = driver.find_element(By.XPATH, "//input[@data-testid='input-note-1']")
    inp_note_1.clear()
    inp_note_1.send_keys("Sample cartons loading & station porterage")

    # Add Line 2
    btn_add_line.click()
    time.sleep(0.5)

    # Item Line 2: Refreshments (Rs. 300.00)
    sel_cat_2 = Select(wait.until(EC.presence_of_element_located((By.XPATH, "//select[@data-testid='select-category-2']"))))
    sel_cat_2.select_by_index(3)
    cat_2_name = sel_cat_2.first_selected_option.text
    log(f"Line 3 Category: {cat_2_name}")

    inp_bill_2 = driver.find_element(By.XPATH, "//input[@data-testid='input-bill-number-2']")
    inp_bill_2.clear()
    inp_bill_2.send_keys("RF-442")

    inp_amt_2 = driver.find_element(By.XPATH, "//input[@data-testid='input-amount-2']")
    inp_amt_2.clear()
    inp_amt_2.send_keys("300.00")

    inp_note_2 = driver.find_element(By.XPATH, "//input[@data-testid='input-note-2']")
    inp_note_2.clear()
    inp_note_2.send_keys("Working refreshment with dealer network")

    # Verify Total Claim Amount
    tot_display = wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='total-claim-amount']")))
    log(f"SUCCESS: Multi-line total calculated -> '{tot_display.text}'")

    # Screenshot Draft Claim Modal
    shot_draft = os.path.join(artifact_dir, "expense_claim_draft.png")
    driver.save_screenshot(shot_draft)
    log(f"Snapshot captured: {shot_draft}")

    # Submit Claim
    btn_submit = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@data-testid='btn-submit-claim']")))
    btn_submit.click()
    log("Submitted Expense Claim.")

    # Wait for success banner
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='expense-success-alert']")))
    log("SUCCESS: Claim created successfully in Draft status.")
    time.sleep(1.5)

    # ── STEP 7: CLAIM APPROVAL & GL POSTING VIA UI ─────────────────
    log(f"\n[STEP 7] Testing One-Click Approval for Claim {created_claim_number}...")
    # Dismiss creation banner if present
    try:
        dismiss_btn = driver.find_element(By.XPATH, "//*[@data-testid='expense-success-alert']//button")
        dismiss_btn.click()
        time.sleep(0.5)
    except Exception:
        pass

    # Locate claim row
    claim_row = wait.until(EC.presence_of_element_located((By.XPATH, f"//tr[@data-testid='claim-row-{created_claim_number}']")))
    log(f"SUCCESS: Located claim row for {created_claim_number} in table.")

    # Click Approve Button
    btn_app = wait.until(EC.element_to_be_clickable((By.XPATH, f"//button[@data-testid='btn-approve-{created_claim_number}']")))
    btn_app.click()
    log("Clicked Approve button.")

    # Wait for approval success banner
    wait.until(EC.text_to_be_present_in_element((By.XPATH, "//*[@data-testid='expense-success-alert']"), "successfully approved"))
    app_banner = driver.find_element(By.XPATH, "//*[@data-testid='expense-success-alert']")
    log(f"SUCCESS: Approval Banner displayed -> '{app_banner.text}'")

    # Wait for claim row status updated to Approved and action says GL Committed
    status_badge = wait.until(EC.presence_of_element_located((By.XPATH, f"//tr[@data-testid='claim-row-{created_claim_number}']//span[contains(text(), 'Approved')]")))
    gl_committed = wait.until(EC.presence_of_element_located((By.XPATH, f"//tr[@data-testid='claim-row-{created_claim_number}']//span[contains(text(), 'GL Committed')]")))
    log(f"SUCCESS: UI Verified: Claim Status is '{status_badge.text}', Action is '{gl_committed.text}'")

    # Screenshot approved claim state
    shot_approved = os.path.join(artifact_dir, "expense_claim_approved.png")
    driver.save_screenshot(shot_approved)
    log(f"Snapshot captured: {shot_approved}")

    # ── STEP 8: ASSERT DOUBLE-ENTRY INVARIANCE & ADVANCE SETTLEMENT ─
    log("\n[STEP 8] Asserting Backend GL Accounting & Advance Settlement...")
    claims_res = requests.get("http://localhost:8000/api/expenses/claims", headers=headers)
    assert claims_res.status_code == 200
    approved_claims = [c for c in claims_res.json() if c.get("claim_number") == created_claim_number]
    assert len(approved_claims) == 1, "Approved claim not found in API"
    app_claim = approved_claims[0]

    assert app_claim["status"] == "Approved", f"Expected Approved, got {app_claim['status']}"
    vch_id = app_claim.get("payment_voucher_id") or app_claim.get("voucher_id")
    assert vch_id is not None, "Voucher ID must be populated"
    log(f"SUCCESS: Claim {created_claim_number} linked to Journal Voucher ID: {vch_id}")

    # Verify Journal Voucher in GL
    jv_res = requests.get(f"http://localhost:8000/api/finance/vouchers/{vch_id}", headers=headers)
    assert jv_res.status_code == 200, f"GET voucher failed: {jv_res.text}"
    jv = jv_res.json()
    log(f"SUCCESS: Journal Voucher loaded -> Voucher #{jv['voucher_number']}, Total: Rs.{jv['total_amount']}")

    # Check Double-Entry Invariance
    entries = jv.get("entries", [])
    total_dr = sum(float(e["amount"]) for e in entries if e["cr_dr"] == "Dr")
    total_cr = sum(float(e["amount"]) for e in entries if e["cr_dr"] == "Cr")
    log(f"SUCCESS: Double-Entry Balance Check: Total Dr = Rs.{total_dr:.2f}, Total Cr = Rs.{total_cr:.2f}")
    assert abs(total_dr - total_cr) < 0.001, f"Journal voucher unbalanced: Dr {total_dr} vs Cr {total_cr}"
    assert abs(total_dr - 4000.00) < 0.001, f"Expected total Rs.4000.00, got Dr {total_dr}"

    # Verify Credit leg is the employee
    cr_entries = [e for e in entries if e["cr_dr"] == "Cr"]
    assert len(cr_entries) == 1, f"Expected 1 Credit leg, got {len(cr_entries)}"
    assert cr_entries[0]["ledger_id"] == emp_id, f"Credit leg ledger mismatch: {cr_entries[0]['ledger_id']} vs {emp_id}"
    log(f"SUCCESS: Credit Leg Verified: Rs.{cr_entries[0]['amount']} credited to {emp_name}")

    # Verify Debit legs are the 3 expense categories
    dr_entries = [e for e in entries if e["cr_dr"] == "Dr"]
    assert len(dr_entries) == 3, f"Expected 3 Debit legs for the 3 expense lines, got {len(dr_entries)}"
    log(f"SUCCESS: Debit Legs Verified: 3 category debit entries totaling Rs.{total_dr:.2f}")

    # Verify Advance Settlement
    adv_check_res = requests.get("http://localhost:8000/api/expenses/advances", headers=headers)
    assert adv_check_res.status_code == 200
    linked_adv = next((a for a in adv_check_res.json() if a.get("id") == created_advance_id), None)
    assert linked_adv is not None, "Linked advance not found"
    assert linked_adv["status"] == "Settled", f"Advance status expected Settled, got {linked_adv['status']}"
    assert linked_adv.get("voucher_id") == vch_id, f"Advance voucher_id mismatch: {linked_adv.get('voucher_id')} vs {vch_id}"
    log(f"SUCCESS: Automatic Advance Settlement Verified: Advance {created_advance_id} is Settled and linked to Voucher {vch_id}")

    # Verify Updated Summary KPIs
    final_sum_res = requests.get("http://localhost:8000/api/expenses/summary", headers=headers)
    assert final_sum_res.status_code == 200
    final_summary = final_sum_res.json()
    log(f"SUCCESS: Final Operational KPI Summary: {final_summary}")
    assert final_summary["settled_advances_count"] >= 1, "Settled advances count should be >= 1"

    log("\n" + "="*80)
    log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY WITH EXIT CODE 0!")
    log(f"Captured Visual Artifacts in: {artifact_dir}")
    log("="*80)

finally:
    driver.quit()
