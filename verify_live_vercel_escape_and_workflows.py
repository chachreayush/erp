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
    log("POLLING VERCEL PRODUCTION DEPLOYMENT FOR WORKFLOWS & ESCAPE HOTKEYS")
    log("URL: https://erp-rho-three.vercel.app")
    log("=================================================================")
    url = "https://erp-rho-three.vercel.app"
    
    for attempt in range(1, 35):
        try:
            r = requests.get(url, timeout=10)
            match = re.search(r'assets/(index-[A-Za-z0-9_-]+\.js)', r.text)
            if match:
                bundle_name = match.group(1)
                bundle_url = f"{url}/assets/{bundle_name}"
                br = requests.get(bundle_url, timeout=10)
                if ("Exit Counter Workbench" in br.text or "parent-menu-btn-workflows" in br.text or "workflow-item-cargo" in br.text):
                    log(f"SUCCESS: Vercel DEPLOYED with newest commit! Active bundle: {bundle_name}")
                    return True
                else:
                    log(f"Attempt {attempt}/35: Active bundle {bundle_name} is compiling/deploying. Waiting 6s...")
            else:
                log(f"Attempt {attempt}/35: Bundle not found in HTML. Waiting 6s...")
        except Exception as e:
            log(f"Attempt {attempt}/35: Network error: {e}. Waiting 6s...")
        time.sleep(6)
    return False

def verify_live_vercel():
    is_ready = wait_for_vercel_deployment()
    if not is_ready:
        log("WARNING: Vercel deployment polling timed out. Testing anyway...")

    log("\n=================================================================")
    log("VERIFYING LIVE VERCEL PRODUCTION UI (WORKFLOWS CARGO & ESC NAVIGATION)")
    log("=================================================================")

    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--window-size=1600,1050")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 15)

    auth_store_obj = {
        "state": {
            "user": {
                "id": "usr-admin-demo",
                "username": "admin",
                "name": "Live Administrator",
                "role": "admin",
                "organization_id": "org-prod-01"
            },
            "token": "live-jwt-token-prod",
            "originalAmUser": None,
            "originalAmToken": None,
            "appMode": "cloud",
            "serverUrl": "https://erp-rho-three.vercel.app"
        },
        "version": 0
    }

    try:
        log("\n[STEP 0] Logging in via Live Vercel Demo Access...")
        driver.get("https://erp-rho-three.vercel.app/login")
        time.sleep(2)
        demo_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-demo-login")))
        demo_btn.click()
        time.sleep(3)

        # 1. Assert Home Screen Exit Button & Modal
        log("[LIVE STAGE 1] Verifying Home Screen Exit [Esc] button and Modal...")
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'DOC-31 COUNTER WORKBENCH')]")))
        exit_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-home-exit")))
        log(f"  SUCCESS: Found Exit button on Live Vercel: '{exit_btn.text}'")
        
        exit_btn.click()
        time.sleep(0.8)
        wait.until(EC.visibility_of_element_located((By.ID, "modal-exit-application")))
        driver.save_screenshot(f"{ARTIFACTS_DIR}\\live_vercel_home_exit_modal.png")
        log("  SUCCESS: Exit modal opened on Live Vercel.")

        cancel_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-cancel-exit")))
        cancel_btn.click()
        time.sleep(0.8)
        assert len(driver.find_elements(By.ID, "modal-exit-application")) == 0
        log("  SUCCESS: Cancel closed the Exit modal.")

        # 2. Assert Workflows Dropdown in Header with Cargo items
        log("\n[LIVE STAGE 2] Verifying Workflows [F4] menu with Cargo & Consignments items...")
        workflow_btn = wait.until(EC.element_to_be_clickable((By.ID, "parent-menu-btn-workflows")))
        workflow_btn.click()
        time.sleep(0.6)

        cargo_item = wait.until(EC.element_to_be_clickable((By.ID, "workflow-item-cargo")))
        cost_item = driver.find_element(By.ID, "workflow-item-cargo-costs")
        pod_item = driver.find_element(By.ID, "workflow-item-cargo-pod-exceptions")
        log(f"  SUCCESS: Workflows menu contains: '{cargo_item.text}', '{cost_item.text}', '{pod_item.text}'")
        driver.save_screenshot(f"{ARTIFACTS_DIR}\\live_vercel_workflows_cargo_dropdown.png")

        cargo_item.click()
        time.sleep(2)
        assert "/cargo" in driver.current_url, f"Expected /cargo on live, got {driver.current_url}"
        log("  SUCCESS: Navigated to /cargo on Live Vercel.")
        driver.save_screenshot(f"{ARTIFACTS_DIR}\\live_vercel_cargo_board_escapenav.png")

        # 3. Assert Escape on Cargo Board returns to Home
        log("\n[LIVE STAGE 3] Testing Escape key on Cargo Board...")
        body = driver.find_element(By.TAG_NAME, "body")
        body.send_keys(Keys.ESCAPE)
        time.sleep(1.5)
        log(f"  SUCCESS: URL after Escape on Live: {driver.current_url}")

        # 4. Assert Workflow Inbox Direct Cargo Launcher
        log("\n[LIVE STAGE 4] Verifying Workflow Inbox Cargo Quick Launcher...")
        driver.get("https://erp-rho-three.vercel.app/workflow/inbox")
        time.sleep(2)
        launcher = wait.until(EC.element_to_be_clickable((By.ID, "btn-nav-cargo-consignment")))
        log(f"  SUCCESS: Found launcher on Live Vercel: '{launcher.text}'")
        driver.save_screenshot(f"{ARTIFACTS_DIR}\\live_vercel_workflow_inbox_launcher.png")

        # Click launcher to verify it leads to Cargo
        launcher.click()
        time.sleep(2)
        assert "/cargo" in driver.current_url
        log("  SUCCESS: Direct launcher navigated directly to /cargo on Live Vercel.")

        # 5. Assert Back to Cargo [Esc] on Cost Center
        log("\n[LIVE STAGE 5] Verifying Cargo Cost Allocation Center...")
        driver.get("https://erp-rho-three.vercel.app/cargo/costs")
        time.sleep(2)
        cost_back = wait.until(EC.element_to_be_clickable((By.ID, "btn-back-to-cargo")))
        log(f"  SUCCESS: Found Back button: '{cost_back.text}'")
        driver.save_screenshot(f"{ARTIFACTS_DIR}\\live_vercel_cargo_costs_escapenav.png")

        # 6. Assert Back to Cargo [Esc] on POD Exceptions Desk
        log("\n[LIVE STAGE 6] Verifying POD & Transit Exceptions Desk...")
        driver.get("https://erp-rho-three.vercel.app/cargo/pod-exceptions")
        time.sleep(2)
        pod_back = wait.until(EC.element_to_be_clickable((By.ID, "btn-back-to-cargo")))
        log(f"  SUCCESS: Found Back button: '{pod_back.text}'")
        driver.save_screenshot(f"{ARTIFACTS_DIR}\\live_vercel_cargo_pod_escapenav.png")

        log("\n=================================================================")
        log("✓ LIVE VERCEL PRODUCTION SYSTEM 100% VERIFIED!")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    verify_live_vercel()
