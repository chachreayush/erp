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
log("STATUTORY GST COMPLIANCE & TAX FILING ENGINE VERIFICATION SUITE")
log("DOC-30 Section 8 & DOC-42: GSTR-1, GSTR-2, GSTR-3B & GSTN Offline JSON")
log("="*80)

# =============================================================================
# PART 1: BACKEND API VALIDATION
# =============================================================================
log("\n[STEP 1] Authenticating via backend API (admin / Admin@123)...")
login_res = None
for attempt in range(1, 5):
    try:
        login_res = requests.post("http://localhost:8000/auth/login", json={
            "username": "admin",
            "password": "Admin@123",
            "is_lan": True
        }, timeout=10)
        if login_res.status_code == 200:
            break
        log(f"  Attempt {attempt}: returned {login_res.status_code}, retrying...")
        time.sleep(2)
    except Exception as e:
        log(f"  Attempt {attempt} failed with {e}, retrying...")
        time.sleep(2)

if not login_res or login_res.status_code != 200:
    log(f"FAILED: Backend login returned {getattr(login_res, 'status_code', 'NO_RES')}: {getattr(login_res, 'text', '')}")
    sys.exit(1)

auth_data = login_res.json()
auth_token = auth_data["access_token"]
user_info = auth_data["user"]
headers = {"Authorization": f"Bearer {auth_token}"}
log(f"SUCCESS: Authenticated as {user_info.get('username')} (Org: {user_info.get('organization_id')})")

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

log("\n[STEP 2] Verifying GST Compliance API endpoints...")

# 2.1 Summary
res_sum = requests.get("http://localhost:8000/api/gst/summary", headers=headers)
assert res_sum.status_code == 200, f"Summary failed: {res_sum.status_code}"
sum_data = res_sum.json()
metrics = sum_data.get("metrics", {})
log(f"  [API] /api/gst/summary: OK -> Net Outward Taxable: Rs.{metrics.get('outward_taxable', 0):,.2f}, Net Tax: Rs.{metrics.get('outward_tax', 0):,.2f}")
log(f"        Net Inward Taxable: Rs.{metrics.get('inward_taxable', 0):,.2f}, Net ITC: Rs.{metrics.get('inward_itc_tax', 0):,.2f}")
log(f"        Net Cash Payable: Rs.{metrics.get('net_gst_payable', 0):,.2f}, ITC Carry-Forward: Rs.{metrics.get('itc_credit_balance', 0):,.2f}")

# 2.2 GSTR-1
res_g1 = requests.get("http://localhost:8000/api/gst/gstr1", headers=headers)
assert res_g1.status_code == 200, f"GSTR-1 failed: {res_g1.status_code}"
g1_data = res_g1.json()
log(f"  [API] /api/gst/gstr1: OK -> B2B: {len(g1_data.get('b2b', []))} invs, B2CS: {len(g1_data.get('b2cs', []))} invs, CDNR: {len(g1_data.get('cdnr', []))} notes")
log(f"        HSN Summary lines: {len(g1_data.get('hsn_summary', []))}, Doc Issues sequences: {len(g1_data.get('doc_issues', []))}")

# 2.3 GSTR-2
res_g2 = requests.get("http://localhost:8000/api/gst/gstr2", headers=headers)
assert res_g2.status_code == 200, f"GSTR-2 failed: {res_g2.status_code}"
g2_data = res_g2.json()
g2_sum = g2_data.get("summary", {})
log(f"  [API] /api/gst/gstr2: OK -> Inward purchases: {len(g2_data.get('inward_supplies', []))}, ITC reversals: {len(g2_data.get('itc_reversals', []))}")
log(f"        Gross ITC: Rs.{g2_sum.get('gross_itc_available', 0):,.2f}, Net Eligible ITC: Rs.{g2_sum.get('net_eligible_itc', 0):,.2f}")

# 2.4 GSTR-3B
res_g3 = requests.get("http://localhost:8000/api/gst/gstr3b", headers=headers)
assert res_g3.status_code == 200, f"GSTR-3B failed: {res_g3.status_code}"
g3_data = res_g3.json()
log(f"  [API] /api/gst/gstr3b: OK -> Table 3.1: {len(g3_data.get('table_3_1_outward', []))} rows, Table 4: {len(g3_data.get('table_4_itc', []))} rows, Table 5.1: {len(g3_data.get('table_5_1_payment', []))} rows")

# 2.5 Government Offline JSON
res_json = requests.get("http://localhost:8000/api/gst/gstr1/json", headers=headers)
assert res_json.status_code == 200, f"GSTN JSON failed: {res_json.status_code}"
offline_json = res_json.json()
assert "gstin" in offline_json and "fp" in offline_json and "b2b" in offline_json, "Missing GSTN schema keys"
log(f"  [API] /api/gst/gstr1/json: OK -> GSTN Portal Schema Valid (GSTIN: {offline_json.get('gstin')}, FP: {offline_json.get('fp')}, Version: {offline_json.get('version')})")

# =============================================================================
# PART 2: SELENIUM HEADLESS WORKBENCH VERIFICATION
# =============================================================================
log("\n[STEP 3] Initializing Selenium headless Chrome driver...")
chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--window-size=1500,1000")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--disable-gpu")

driver = webdriver.Chrome(options=chrome_options)
driver.set_window_size(1500, 1000)
wait = WebDriverWait(driver, 30)

def ensure_authenticated(d, auth_store):
    d.execute_script("""
        const authData = arguments[0];
        sessionStorage.setItem('erp-auth', JSON.stringify(authData));
        localStorage.setItem('erp-auth', JSON.stringify(authData));
    """, auth_store)

try:
    log("\n[STEP 4] Injecting authentication into browser session...")
    driver.get("http://localhost:50005/")
    time.sleep(1)
    ensure_authenticated(driver, auth_store_obj)
    time.sleep(0.5)
    log("  Session storage seeded with authenticated credentials.")

    log("\n[STEP 5] Navigating to GST & Compliance Workbench (/gst)...")
    driver.get("http://localhost:50005/gst")
    time.sleep(1)
    ensure_authenticated(driver, auth_store_obj)
    time.sleep(1)

    # Verify Header
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Statutory GST Compliance')]")))
    log("  SUCCESS: GST & Compliance page title detected.")

    # Verify Executive Metrics
    wait.until(EC.presence_of_element_located((By.ID, "metric-outward-taxable")))
    time.sleep(2.5)
    outward_text = driver.find_element(By.ID, "metric-outward-taxable").text
    inward_text = driver.find_element(By.ID, "metric-inward-taxable").text
    net_payable_text = driver.find_element(By.ID, "metric-net-payable").text
    itc_credit_text = driver.find_element(By.ID, "metric-itc-credit").text

    log(f"  Executive Metrics Loaded:")
    log(f"    - Outward Supplies : {outward_text}")
    log(f"    - Inward ITC       : {inward_text}")
    log(f"    - Net Cash Payable : {net_payable_text}")
    log(f"    - ITC Carried Fwd  : {itc_credit_text}")

    summary_screenshot = os.path.join(artifact_dir, "gst_executive_summary_view.png")
    driver.save_screenshot(summary_screenshot)
    driver.save_screenshot(os.path.join(artifact_dir, "gst_cockpit_initial_view.png"))
    log(f"  Screenshot saved: {summary_screenshot} and gst_cockpit_initial_view.png")

    # =========================================================================
    # GSTR-1 Verification
    # =========================================================================
    log("\n[STEP 6] Testing GSTR-1 Outward Supplies Multi-Table Views...")
    tab_gstr1 = driver.find_element(By.ID, "tab-gstr1")
    tab_gstr1.click()
    time.sleep(1)

    # Subtab B2B
    sub_b2b = driver.find_element(By.ID, "subtab-b2b")
    sub_b2b.click()
    time.sleep(0.5)
    wait.until(EC.presence_of_element_located((By.ID, "gst-table-b2b")))
    b2b_rows = driver.find_elements(By.XPATH, "//table[@id='gst-table-b2b']/tbody/tr")
    log(f"  Table 4 (B2B): Verified ({len(b2b_rows)} rows displayed)")

    # Subtab B2CS
    sub_b2cs = driver.find_element(By.ID, "subtab-b2cs")
    sub_b2cs.click()
    time.sleep(0.5)
    wait.until(EC.presence_of_element_located((By.ID, "gst-table-b2cs")))
    b2cs_rows = driver.find_elements(By.XPATH, "//table[@id='gst-table-b2cs']/tbody/tr")
    log(f"  Table 7 (B2CS): Verified ({len(b2cs_rows)} rows displayed)")

    # Subtab CDNR
    sub_cdnr = driver.find_element(By.ID, "subtab-cdnr")
    sub_cdnr.click()
    time.sleep(0.5)
    wait.until(EC.presence_of_element_located((By.ID, "gst-table-cdnr")))
    cdnr_rows = driver.find_elements(By.XPATH, "//table[@id='gst-table-cdnr']/tbody/tr")
    log(f"  Table 9B (CDNR): Verified ({len(cdnr_rows)} rows displayed)")

    # Subtab HSN
    sub_hsn = driver.find_element(By.ID, "subtab-hsn")
    sub_hsn.click()
    time.sleep(0.5)
    wait.until(EC.presence_of_element_located((By.ID, "gst-table-hsn")))
    hsn_rows = driver.find_elements(By.XPATH, "//table[@id='gst-table-hsn']/tbody/tr")
    log(f"  Table 12 (HSN Summary): Verified ({len(hsn_rows)} rows displayed)")

    # Subtab Docs
    sub_docs = driver.find_element(By.ID, "subtab-docs")
    sub_docs.click()
    time.sleep(0.5)
    wait.until(EC.presence_of_element_located((By.ID, "gst-table-docs")))
    doc_rows = driver.find_elements(By.XPATH, "//table[@id='gst-table-docs']/tbody/tr")
    log(f"  Table 13 (Documents Issued): Verified ({len(doc_rows)} serial sequence rows displayed)")

    gstr1_screenshot = os.path.join(artifact_dir, "gst_gstr1_view.png")
    driver.save_screenshot(gstr1_screenshot)
    log(f"  Screenshot saved: {gstr1_screenshot}")

    # =========================================================================
    # GSTR-2 Verification
    # =========================================================================
    log("\n[STEP 7] Testing GSTR-2 Inward Supplies (ITC) Register...")
    tab_gstr2 = driver.find_element(By.ID, "tab-gstr2")
    tab_gstr2.click()
    time.sleep(1)

    wait.until(EC.presence_of_element_located((By.ID, "gst-table-gstr2")))
    gstr2_rows = driver.find_elements(By.XPATH, "//table[@id='gst-table-gstr2']/tbody/tr")
    log(f"  GSTR-2 Inward Register: Verified ({len(gstr2_rows)} purchase records displayed)")

    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'GSTR-2 Input Tax Credit (ITC) Matching')]")))
    log("  GSTR-2 ITC Reconciliation Banner: Verified")

    gstr2_screenshot = os.path.join(artifact_dir, "gst_gstr2_view.png")
    driver.save_screenshot(gstr2_screenshot)
    log(f"  Screenshot saved: {gstr2_screenshot}")

    # =========================================================================
    # GSTR-3B Verification
    # =========================================================================
    log("\n[STEP 8] Testing GSTR-3B Monthly Consolidated Return...")
    tab_gstr3b = driver.find_element(By.ID, "tab-gstr3b")
    tab_gstr3b.click()
    time.sleep(1)

    wait.until(EC.presence_of_element_located((By.ID, "gst-table-gstr3b-31")))
    t31_rows = driver.find_elements(By.XPATH, "//table[@id='gst-table-gstr3b-31']/tbody/tr")
    log(f"  Table 3.1 (Outward Supplies): Verified ({len(t31_rows)} rows displayed)")

    wait.until(EC.presence_of_element_located((By.ID, "gst-table-gstr3b-4")))
    t4_rows = driver.find_elements(By.XPATH, "//table[@id='gst-table-gstr3b-4']/tbody/tr")
    log(f"  Table 4 (Eligible ITC): Verified ({len(t4_rows)} rows displayed)")

    wait.until(EC.presence_of_element_located((By.ID, "gst-table-gstr3b-51")))
    t51_rows = driver.find_elements(By.XPATH, "//table[@id='gst-table-gstr3b-51']/tbody/tr")
    log(f"  Table 5.1 (Payment of Tax): Verified ({len(t51_rows)} rows displayed)")

    gstr3b_screenshot = os.path.join(artifact_dir, "gst_gstr3b_view.png")
    driver.save_screenshot(gstr3b_screenshot)
    log(f"  Screenshot saved: {gstr3b_screenshot}")

    # =========================================================================
    # JSON Export & Filtering Action
    # =========================================================================
    log("\n[STEP 9] Testing Government GSTN Offline JSON Action...")
    json_btn = driver.find_element(By.ID, "download-gstn-json-btn")
    json_btn.click()

    # Wait for the download generation and the success notification banner
    wait.until(EC.presence_of_element_located((By.ID, "gst-notification-banner")))
    wait.until(EC.text_to_be_present_in_element((By.ID, "gst-notification-banner"), "upload to gst.gov.in"))
    banner_text = driver.find_element(By.ID, "gst-notification-banner").text
    log(f"  GSTN JSON Action Triggered -> Banner Message: '{banner_text}'")

    log("\n[STEP 10] Testing Filter Controls & Quick Presets...")
    mtd_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'MTD')]")
    mtd_btn.click()
    time.sleep(0.5)

    fetch_btn = driver.find_element(By.ID, "fetch-gst-returns-btn")
    fetch_btn.click()
    time.sleep(1.5)
    log("  Filter preset 'MTD' clicked and 'Fetch Returns' executed successfully.")

    log("\n[STEP 11] Navigating to E-Invoicing & E-Way Bill Workbench (/compliance)...")
    driver.get("http://localhost:50005/compliance")
    time.sleep(2)
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'E-Invoicing & E-Way Bill Compliance Workbench')]")))
    compliance_screenshot = os.path.join(artifact_dir, "gst_compliance_workbench_view.png")
    driver.save_screenshot(compliance_screenshot)
    log(f"  Screenshot saved: {compliance_screenshot}")

    log("\n" + "="*80)
    log("ALL STATUTORY GST COMPLIANCE & FILING ENGINE TESTS PASSED (100% SUCCESS)!")
    log("="*80)

except Exception as e:
    err_screenshot = os.path.join(artifact_dir, "debug_gst_compliance_err.png")
    try:
        driver.save_screenshot(err_screenshot)
        log(f"Error screenshot captured at {err_screenshot}")
    except Exception:
        pass
    log(f"\nTEST SUITE FAILED WITH EXCEPTION: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    try:
        driver.quit()
    except Exception:
        pass
