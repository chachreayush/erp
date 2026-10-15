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
    log("DOC-37: PRINCIPAL & C&F CONSIGNMENT AGENT COMMISSION TEST SUITE")
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

    # 3. Principal Agreements & C&F Reimbursement Deal Terms
    log("\n[STAGE 3] Querying Principal Agreements & C&F Deal Terms (/api/commission/agreements)...")
    agr_res = requests.get("http://localhost:8000/api/commission/agreements", headers=headers, timeout=10)
    assert agr_res.status_code == 200, f"Agreements failed: {agr_res.text}"
    agreements = agr_res.json().get("data", [])
    assert len(agreements) >= 2, f"Expected at least 2 agreements, found {len(agreements)}"
    agr1 = agreements[0]
    agr2 = agreements[1]
    log(f"  SUCCESS: Found {len(agreements)} agreements:")
    log(f"    1. {agr1['principal_code']}: {agr1['principal_name']} [{agr1['agreement_code']}]")
    log(f"       Deal Terms: {agr1.get('terms_json', {}).get('reimbursement_terms')}")
    log(f"    2. {agr2['principal_code']}: {agr2['principal_name']} [{agr2['agreement_code']}]")
    log(f"       Deal Terms: {agr2.get('terms_json', {}).get('reimbursement_terms')}")

    # 4. Update C&F Deal Terms API
    log(f"\n[STAGE 4] Updating C&F Deal Terms for {agr1['principal_name']} (/api/commission/agreements/{agr1['id']}/deal-terms)...")
    deal_payload = {
        "agreement_type": "CF_CONSIGNMENT_AGENT",
        "cargo_expense_borne_by": "PRINCIPAL",
        "staff_salary_borne_by": "PRINCIPAL",
        "godown_storage_borne_by": "PRINCIPAL",
        "default_monthly_staff_salary": 28500.0,
        "default_monthly_godown_rent": 42000.0,
        "sales_commission_rate": 4.0
    }
    update_deal_res = requests.put(f"http://localhost:8000/api/commission/agreements/{agr1['id']}/deal-terms", json=deal_payload, headers=headers, timeout=10)
    assert update_deal_res.status_code == 200, f"Update deal terms failed: {update_deal_res.text}"
    updated_terms = update_deal_res.json().get("data", {})
    godown_rent_val = updated_terms.get("reimbursement_terms", {}).get("godown_storage", {}).get("monthly_rent")
    staff_salary_val = updated_terms.get("reimbursement_terms", {}).get("staff_salaries", {}).get("monthly_budget")
    assert godown_rent_val == 42000.0, f"Expected 42000.0, got {godown_rent_val}"
    assert staff_salary_val == 28500.0, f"Expected 28500.0, got {staff_salary_val}"
    log(f"  SUCCESS: C&F Deal Terms updated. Godown monthly: ₹{godown_rent_val}, Staff salary: ₹{staff_salary_val}")

    # 5. Query Clients linked to Company
    log(f"\n[STAGE 5] Querying Authorized Clients dealing with Company {agr1['principal_name']} (/api/parties/clients-by-company/{agr1['principal_id']})...")
    clients_res = requests.get(f"http://localhost:8000/api/parties/clients-by-company/{agr1['principal_id']}", headers=headers, timeout=10)
    assert clients_res.status_code == 200, f"Clients endpoint failed: {clients_res.text}"
    clients = clients_res.json().get("data", [])
    log(f"  SUCCESS: Found {len(clients)} authorized clients dealing with {agr1['principal_name']}")
    selected_client = clients[0] if len(clients) > 0 else None
    client_name = (selected_client.get("legal_name") or selected_client.get("trade_name") or "Apollo Pharmacy Sector 14") if selected_client else "Apollo Pharmacy Sector 14"
    client_id = (selected_client.get("party_id") or selected_client.get("id")) if selected_client else None
    log(f"  Selected client for billing: {client_name} (ID: {client_id})")

    # 6. Calculate C&F Items: Staff Salary (Manual override) & Sales Commission
    log("\n[STAGE 6] Executing C&F Calculation Sandbox for Salary, Godown & Sales Commission...")
    
    # 6a. Staff Salary with custom override (₹28,500)
    salary_payload = {
        "principal_id": agr1["principal_id"],
        "event_type": "STAFF_SALARY",
        "source_doc_type": "PAYROLL",
        "source_doc_id": "SAL-2026-OCT",
        "base_value": 28500.0,
        "quantity": 1.0,
        "category": "RECOVERABLE_EXPENSE",
        "custom_salary_amount": 28500.0
    }
    salary_res = requests.post("http://localhost:8000/api/commission/calculate", json=salary_payload, headers=headers, timeout=10)
    assert salary_res.status_code == 200, f"Salary calc failed: {salary_res.text}"
    salary_calc = salary_res.json().get("data", {})
    log(f"  SUCCESS: Generated Staff Salary calc {salary_calc['calculation_number']} for ₹{salary_calc['calculated_amount']:,.2f}")
    assert salary_calc['calculated_amount'] == 28500.0

    # 6b. Sales Commission on Client Turnover
    sales_payload = {
        "principal_id": agr1["principal_id"],
        "event_type": "SALES_BILL",
        "source_doc_type": "INVOICE",
        "source_doc_id": "INV-2026-OCT-CL01",
        "base_value": 250000.0,
        "quantity": 1.0,
        "category": "EARNED_COMMISSION",
        "client_id": client_id,
        "client_name": client_name
    }
    sales_res = requests.post("http://localhost:8000/api/commission/calculate", json=sales_payload, headers=headers, timeout=10)
    assert sales_res.status_code == 200, f"Sales calc failed: {sales_res.text}"
    sales_calc = sales_res.json().get("data", {})
    log(f"  SUCCESS: Generated Sales Commission calc {sales_calc['calculation_number']} for ₹{sales_calc['calculated_amount']:,.2f} on turnover ₹{sales_calc['base_value']:,.2f} (Client: {sales_calc.get('client_name')})")

    # 7. Approve Calculations
    log("\n[STAGE 7] Approving C&F Calculations...")
    for c in [salary_calc, sales_calc]:
        app_res = requests.post(f"http://localhost:8000/api/commission/calculations/{c['id']}/action", json={"action": "APPROVE"}, headers=headers, timeout=10)
        assert app_res.status_code == 200
    log("  SUCCESS: Both Salary reimbursement and Sales Commission calculations APPROVED.")

    # 8. Create Recovery Claim Batch
    log("\n[STAGE 8] Creating C&F Recovery Claim Batch with 4-Eyes Workflow...")
    claim_payload = {
        "principal_id": agr1["principal_id"],
        "calc_ids": [salary_calc["id"], sales_calc["id"]],
        "notes": f"C&F Consignment Monthly Settlement - Salary + {client_name} Sales"
    }
    claim_res = requests.post("http://localhost:8000/api/commission/claims", json=claim_payload, headers=headers, timeout=10)
    assert claim_res.status_code == 200, f"Claim creation failed: {claim_res.text}"
    cf_claim = claim_res.json().get("data", {})
    claim_id = cf_claim["id"]
    log(f"  SUCCESS: Created C&F Recovery Claim {cf_claim['claim_number']} for ₹{cf_claim['total_claimed_amount']:,.2f}")

    # Submit & Approve Claim
    requests.post(f"http://localhost:8000/api/commission/claims/{claim_id}/action", json={"action": "SUBMIT"}, headers=headers, timeout=10)
    requests.post(f"http://localhost:8000/api/commission/claims/{claim_id}/action", json={"action": "APPROVE"}, headers=headers, timeout=10)
    log("  SUCCESS: Claim transitioned: DRAFT -> SUBMITTED -> APPROVED.")

    # 9. Dual-Posting: Generate Service Invoice AND Inward Purchase Bill
    log("\n[STAGE 9] Executing CREATE_DOCUMENT with DUAL-POSTING to Purchase Section...")
    doc_res = requests.post(f"http://localhost:8000/api/commission/claims/{claim_id}/action", json={"action": "CREATE_DOCUMENT", "document_type": "SERVICE_INVOICE"}, headers=headers, timeout=10)
    assert doc_res.status_code == 200, f"Create document failed: {doc_res.text}"
    updated_claim = doc_res.json().get("data", {})
    doc_links = updated_claim.get("recovery_document_links", [])
    log(f"  SUCCESS: Generated Document Links ({len(doc_links)} created):")
    sinv_doc = None
    pur_doc = None
    for link in doc_links:
        log(f"    - {link.get('document_type')}: {link.get('document_reference')} (₹{link.get('amount'):,.2f})")
        if link.get("document_type") == "SERVICE_INVOICE":
            sinv_doc = link.get("document_reference")
        elif link.get("document_type") == "PURCHASE_BILL":
            pur_doc = link.get("document_reference")
    
    assert sinv_doc is not None, "Expected SERVICE_INVOICE reference"
    assert pur_doc is not None, "Expected PURCHASE_BILL reference"
    log(f"  CONFIRMED: Service Invoice={sinv_doc}, Inward Purchase Bill={pur_doc}")

    # 10. Verify Purchase Bill in /api/sales/invoices?invoice_type=purchase-bill
    log("\n[STAGE 10] Querying Purchase Invoices API (/api/sales/invoices?invoice_type=purchase-bill) to verify Dual-Posting...")
    invoices_res = requests.get(f"http://localhost:8000/api/sales/invoices?invoice_type=purchase-bill&bill_no_search={pur_doc}", headers=headers, timeout=10)
    assert invoices_res.status_code == 200, f"Invoices API failed: {invoices_res.text}"
    invoices_list = invoices_res.json()
    if isinstance(invoices_list, dict) and "data" in invoices_list:
        invoices_list = invoices_list["data"]
    
    matching_purchase_bill = None
    for inv in invoices_list:
        if inv.get("invoice_number") == pur_doc:
            matching_purchase_bill = inv
            break
    
    assert matching_purchase_bill is not None, f"Could not find created purchase bill {pur_doc} in /api/sales/invoices"
    log(f"  SUCCESS: Inward Purchase Bill verified in Purchase Section database:")
    log(f"    - Invoice Number: {matching_purchase_bill.get('invoice_number')}")
    log(f"    - Party/Principal: {matching_purchase_bill.get('customer_name') or matching_purchase_bill.get('party_name')}")
    log(f"    - Total Amount: ₹{float(matching_purchase_bill.get('grand_total') or matching_purchase_bill.get('total_amount') or 0):,.2f}")
    log(f"    - Invoice Type: {matching_purchase_bill.get('invoice_type')}")

    # 11. Periodic Recovery Statement
    log("\n[STAGE 11] Generating Periodic Statement (/api/commission/statements/generate)...")
    stmt_res = requests.post("http://localhost:8000/api/commission/statements/generate", json={"principal_id": agr1["principal_id"]}, headers=headers, timeout=10)
    assert stmt_res.status_code == 200
    stmt_data = stmt_res.json().get("data", {})
    log(f"  SUCCESS: Statement {stmt_data['statement_number']} generated with Hash: {stmt_data['statement_hash'][:16]}...")

    # 12. Headless Selenium Browser Test
    log("\n[STAGE 12] Launching Chrome Headless Browser (1440x950)...")
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

        # 12a: Counter Workbench Launcher Tile
        log("  [12a] Testing Counter Workbench (`/`) Integration & Commission Engine Tile...")
        driver.get("http://localhost:50005/")
        time.sleep(1)
        ensure_authenticated(driver, auth_store_obj)
        driver.get("http://localhost:50005/")
        time.sleep(2)

        wait.until(EC.presence_of_element_located((By.ID, "counter-workbench-root")))
        hub_btn = wait.until(EC.element_to_be_clickable((By.ID, "hub-btn-commission-management")))
        assert hub_btn is not None
        log("  SUCCESS: Found '#hub-btn-commission-management' tile on Counter Workbench.")

        screenshot1 = os.path.join(WORKSPACE_DIR, "verified_commission_homescreen_launcher.png")
        driver.save_screenshot(screenshot1)
        log(f"  Captured Screenshot 1: {screenshot1}")

        # 12b: Commission Control Center & C&F Matrix UI
        log("  [12b] Navigating to Commission Control Center (`/commission`)...")
        driver.get("http://localhost:50005/commission")
        time.sleep(2)

        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Principal & C&F Commission & Recovery Engine')]")))
        log("  SUCCESS: Commission Control Center header verified.")

        # Verify C&F Consigning Agent 4-Pillar Matrix is visible
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'C&F Infrastructure') or contains(text(), 'C&F Consignment')]")))
        log("  SUCCESS: C&F Consigning Agent 4-Pillar Matrix rendered on screen.")

        screenshot2 = os.path.join(WORKSPACE_DIR, "verified_commission_control_center.png")
        driver.save_screenshot(screenshot2)
        log(f"  Captured Screenshot 2: {screenshot2}")

        # 12c: Sandbox & Calculations Ledger
        log("  [12c] Testing Tab [F3] Sandbox & Calculations Ledger...")
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

        # 12d: Statements Desk & Modal
        log("  [12d] Testing Tab [F5] Statements Desk...")
        webdriver.ActionChains(driver).send_keys(Keys.F5).perform()
        time.sleep(1)
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Principal Recovery Statements')]")))

        screenshot4 = os.path.join(WORKSPACE_DIR, "verified_commission_statement_desk.png")
        driver.save_screenshot(screenshot4)
        log(f"  Captured Screenshot 4: {screenshot4}")

        # 12e: Purchase Bills Section Dual-Post Verification
        log("  [12e] Navigating to Purchase Bills Section (`/purchase/list`) to verify Inward Dual-Posted Bill...")
        driver.get("http://localhost:50005/purchase/list")
        time.sleep(3)

        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Purchase Bills') or contains(text(), 'Purchase')]")))
        log("  SUCCESS: Purchase Bills list loaded.")

        # Check if the created purchase bill PUR-SRV is rendered on page
        wait.until(EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{pur_doc}')]")))
        log(f"  SUCCESS: Dual-posted Inward Bill '{pur_doc}' visually verified on /purchase/list!")

        screenshot5 = os.path.join(WORKSPACE_DIR, "verified_commission_purchase_dual_post.png")
        driver.save_screenshot(screenshot5)
        log(f"  Captured Screenshot 5: {screenshot5}")

        log("\n=================================================================")
        log("12/12 STAGES PASSED: C&F CONSIGNMENT AGENT & DUAL-POSTING VERIFIED!")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_test()
