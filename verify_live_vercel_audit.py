import time
import json
import re
import sys
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

def wait_for_vercel_deployment():
    log("=================================================================")
    log("POLLING VERCEL PRODUCTION DEPLOYMENT FOR DOC-33 AUDIT TRAIL")
    log("URL: https://erp-rho-three.vercel.app")
    log("=================================================================")
    url = "https://erp-rho-three.vercel.app"
    
    for attempt in range(1, 25):
        try:
            r = requests.get(url, timeout=10)
            match = re.search(r'assets/(index-[A-Za-z0-9_-]+\.js)', r.text)
            if match:
                bundle_name = match.group(1)
                bundle_url = f"{url}/assets/{bundle_name}"
                br = requests.get(bundle_url, timeout=10)
                if "audit/governance" in br.text or "Audit Explorer" in br.text:
                    log(f"SUCCESS: Vercel DEPLOYED with DOC-33! Active bundle: {bundle_name}")
                    return True
                else:
                    log(f"Attempt {attempt}/25: Active bundle {bundle_name} is not yet DOC-33. Waiting 8s...")
            else:
                log(f"Attempt {attempt}/25: Bundle not found in HTML. Waiting 8s...")
        except Exception as e:
            log(f"Attempt {attempt}/25: Network error: {e}. Waiting 8s...")
        time.sleep(8)
    return False

def verify_live_vercel():
    is_ready = wait_for_vercel_deployment()
    if not is_ready:
        log("WARNING: Vercel deployment timed out or bundle not yet updated. Testing anyway...")

    log("\n=================================================================")
    log("VERIFYING LIVE VERCEL PRODUCTION UI (DOC-33)")
    log("=================================================================")

    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--window-size=1600,1050")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")

    driver = webdriver.Chrome(options=chrome_options)
    driver.set_window_size(1600, 1050)
    wait = WebDriverWait(driver, 25)

    try:
        # Step 1: Open Vercel Login and Click Instant Demo Admin Access
        log("\n[STEP 1] Loading https://erp-rho-three.vercel.app/login...")
        driver.get("https://erp-rho-three.vercel.app/login")
        time.sleep(2)

        demo_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-demo-login")))
        log("  SUCCESS: Demo Admin 1-Click Access button found.")
        demo_btn.click()
        time.sleep(3)

        # Step 2: Verify Counter Workbench on Live Vercel
        log("\n[STEP 2] Verifying Counter Workbench on Live Vercel...")
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'DOC-31 COUNTER WORKBENCH')]")))
        log("  SUCCESS: Counter Workbench loaded on Live Vercel.")

        audit_btn = wait.until(EC.presence_of_element_located((By.ID, "hub-btn-audit-trail")))
        log("  SUCCESS: Audit Trail launcher verified on Live Vercel.")

        driver.save_screenshot(f"{ARTIFACTS_DIR}\\live_vercel_audit_homescreen_verified.png")
        log(f"  Screenshot saved: live_vercel_audit_homescreen_verified.png")

        # Step 3: Click launcher to go to Audit Explorer
        log("\n[STEP 3] Clicking Audit Trail Launcher to open /audit...")
        audit_btn.click()
        time.sleep(3)

        curr_url = driver.current_url
        log(f"  Current URL: {curr_url}")
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Audit Trail & Cryptographic Evidence Explorer')]")))
        log("  SUCCESS: Unified Audit Explorer loaded on Live Vercel.")

        search_input = wait.until(EC.presence_of_element_located((By.ID, "input-audit-search")))
        log("  SUCCESS: Audit search input verified on Live Vercel.")

        driver.save_screenshot(f"{ARTIFACTS_DIR}\\live_vercel_audit_explorer_verified.png")
        log(f"  Screenshot saved: live_vercel_audit_explorer_verified.png")

        # Step 4: Click row to verify Change Detail Drawer & SHA-256 seal
        log("\n[STEP 4] Inspecting Audit Record Drawer on Live Vercel...")
        first_row = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "tr[id^='audit-row-']")))
        first_row.click()
        time.sleep(1.5)

        wait.until(EC.presence_of_element_located((By.ID, "drawer-change-detail")))
        hash_badge = wait.until(EC.presence_of_element_located((By.ID, "badge-hash-intact")))
        log(f"  SUCCESS: Change Detail Drawer verified on Live Vercel! Badge: '{hash_badge.text}'")

        driver.save_screenshot(f"{ARTIFACTS_DIR}\\live_vercel_audit_diff_drawer_verified.png")
        log(f"  Screenshot saved: live_vercel_audit_diff_drawer_verified.png")

        # Close drawer
        close_btn = driver.find_element(By.ID, "btn-close-drawer")
        close_btn.click()
        time.sleep(1)

        # Step 5: Test Data Governance Console (/audit/governance)
        log("\n[STEP 5] Navigating to Data Governance Console (/audit/governance)...")
        driver.get("https://erp-rho-three.vercel.app/audit/governance")
        time.sleep(3)

        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Data Governance & Regulatory Compliance Console')]")))
        log("  SUCCESS: Governance Console loaded on Live Vercel.")

        # Tab 2: Holds
        holds_tab = wait.until(EC.element_to_be_clickable((By.ID, "tab-btn-holds")))
        holds_tab.click()
        time.sleep(1)
        wait.until(EC.presence_of_element_located((By.ID, "btn-apply-hold")))
        log("  SUCCESS: Statutory Legal Holds verified on Live Vercel.")

        # Tab 3: Anomalies
        anom_tab = wait.until(EC.element_to_be_clickable((By.ID, "tab-btn-anomalies")))
        anom_tab.click()
        time.sleep(1)
        wait.until(EC.presence_of_element_located((By.ID, "card-anomaly-CHAIN_INTEGRITY")))
        log("  SUCCESS: Forensic Anomaly Signals verified on Live Vercel.")

        driver.save_screenshot(f"{ARTIFACTS_DIR}\\live_vercel_audit_governance_verified.png")
        log(f"  Screenshot saved: live_vercel_audit_governance_verified.png")

        log("\n=================================================================")
        log("LIVE VERCEL PRODUCTION VERIFICATION COMPLETE: 100% SUCCESS!")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    verify_live_vercel()
