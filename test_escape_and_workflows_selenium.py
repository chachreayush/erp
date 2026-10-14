import time
import json
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

def run_test():
    log("=================================================================")
    log("ESCAPE NAVIGATION & WORKFLOWS CARGO INTEGRATION SELENIUM SUITE")
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
    log(f"  SUCCESS: Authenticated as {user_info.get('username')}")

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

    # 2. Launch Chrome Headless Browser
    log("\n[STAGE 2] Launching Chrome Headless Browser (1440x950)...")
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

        driver.get("http://localhost:50005/")
        time.sleep(1)
        ensure_authenticated(driver, auth_store_obj)
        time.sleep(0.5)
        driver.get("http://localhost:50005/")
        time.sleep(2)

        # 3. Test Workflows Dropdown in Header
        log("\n[STAGE 3] Testing Workflows [F4] header menu with Cargo items...")
        workflow_btn = wait.until(EC.element_to_be_clickable((By.ID, "parent-menu-btn-workflows")))
        workflow_btn.click()
        time.sleep(0.5)

        cargo_board_item = wait.until(EC.element_to_be_clickable((By.ID, "workflow-item-cargo")))
        cargo_cost_item = driver.find_element(By.ID, "workflow-item-cargo-costs")
        cargo_pod_item = driver.find_element(By.ID, "workflow-item-cargo-pod-exceptions")
        
        log(f"  SUCCESS: Found dropdown items: '{cargo_board_item.text}', '{cargo_cost_item.text}', '{cargo_pod_item.text}'")
        driver.save_screenshot(f"{ARTIFACTS_DIR}\\verified_workflows_cargo_dropdown.png")

        # Click Cargo & Consignment Board from Workflows menu
        cargo_board_item.click()
        time.sleep(1.5)
        assert "/cargo" in driver.current_url, f"Expected /cargo, got {driver.current_url}"
        log("  SUCCESS: Navigated to /cargo from Workflows dropdown.")

        # 4. Test Escape on Cargo Board -> returns to Home
        log("\n[STAGE 4] Testing Escape key on Cargo Board...")
        body = driver.find_element(By.TAG_NAME, "body")
        body.send_keys(Keys.ESCAPE)
        time.sleep(1)
        assert driver.current_url.rstrip("/").endswith("50005"), f"Expected home, got {driver.current_url}"
        log("  SUCCESS: Escape on Cargo Board returned to Counter Workbench (/).")

        # 5. Test Home Screen Exit [Esc] Modal
        log("\n[STAGE 5] Testing Home Screen Exit Application Modal [Esc]...")
        # Press Esc to trigger Exit modal
        body = driver.find_element(By.TAG_NAME, "body")
        body.send_keys(Keys.ESCAPE)
        time.sleep(0.8)

        exit_modal = wait.until(EC.visibility_of_element_located((By.ID, "modal-exit-application")))
        log("  SUCCESS: Pressing Escape opened #modal-exit-application.")
        driver.save_screenshot(f"{ARTIFACTS_DIR}\\verified_home_exit_modal.png")

        # Press Esc again to close modal
        body = driver.find_element(By.TAG_NAME, "body")
        body.send_keys(Keys.ESCAPE)
        time.sleep(0.8)
        assert len(driver.find_elements(By.ID, "modal-exit-application")) == 0, "Exit modal should be closed by Escape"
        log("  SUCCESS: Pressing Escape again closed #modal-exit-application.")

        # Click Exit [Esc] button in top header
        exit_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-home-exit")))
        exit_btn.click()
        time.sleep(0.8)
        wait.until(EC.visibility_of_element_located((By.ID, "modal-exit-application")))
        log("  SUCCESS: Clicking Exit [Esc] button opened modal.")

        cancel_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-cancel-exit")))
        cancel_btn.click()
        time.sleep(0.8)
        assert len(driver.find_elements(By.ID, "modal-exit-application")) == 0, "Exit modal should be closed by Cancel"
        log("  SUCCESS: Clicking Cancel [Esc] closed modal.")

        # 6. Test Workflow Inbox Direct Cargo Launcher & Escape
        log("\n[STAGE 6] Testing Workflow Inbox Direct Cargo Launcher & Escape...")
        driver.get("http://localhost:50005/workflow/inbox")
        time.sleep(1.5)

        cargo_launcher = wait.until(EC.element_to_be_clickable((By.ID, "btn-nav-cargo-consignment")))
        log(f"  SUCCESS: Found direct launcher in Workflow Inbox: '{cargo_launcher.text}'")
        driver.save_screenshot(f"{ARTIFACTS_DIR}\\verified_workflow_inbox_cargo_launcher.png")

        # Press Esc in Workflow Inbox -> returns to Home
        body = driver.find_element(By.TAG_NAME, "body")
        body.send_keys(Keys.ESCAPE)
        time.sleep(1)
        assert driver.current_url.rstrip("/").endswith("50005"), f"Expected home, got {driver.current_url}"
        log("  SUCCESS: Escape in Workflow Inbox returned to Counter Workbench (/).")

        # 7. Test Workflow Designer Escape -> returns to /workflow/inbox
        log("\n[STAGE 7] Testing Workflow Designer Escape navigation...")
        driver.get("http://localhost:50005/workflow/designer")
        time.sleep(1.5)
        body = driver.find_element(By.TAG_NAME, "body")
        body.send_keys(Keys.ESCAPE)
        time.sleep(1)
        assert "/workflow/inbox" in driver.current_url, f"Expected /workflow/inbox, got {driver.current_url}"
        log("  SUCCESS: Escape in Workflow Designer returned to /workflow/inbox.")

        # 8. Test Workflow Monitor Escape -> returns to /workflow/inbox
        log("\n[STAGE 8] Testing Workflow Monitor Escape navigation...")
        driver.get("http://localhost:50005/workflow/monitor")
        time.sleep(1.5)
        body = driver.find_element(By.TAG_NAME, "body")
        body.send_keys(Keys.ESCAPE)
        time.sleep(1)
        assert "/workflow/inbox" in driver.current_url, f"Expected /workflow/inbox, got {driver.current_url}"
        log("  SUCCESS: Escape in Workflow Monitor returned to /workflow/inbox.")

        # 9. Test Cargo Cost Allocation Center Escape -> returns to /cargo
        log("\n[STAGE 9] Testing Cargo Cost Allocation Center Escape navigation...")
        driver.get("http://localhost:50005/cargo/costs")
        time.sleep(1.5)
        back_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-back-to-cargo")))
        log(f"  SUCCESS: Found back button with [Esc] badge: '{back_btn.text}'")
        body = driver.find_element(By.TAG_NAME, "body")
        body.send_keys(Keys.ESCAPE)
        time.sleep(1)
        assert "/cargo" in driver.current_url, f"Expected /cargo, got {driver.current_url}"
        log("  SUCCESS: Escape in Cargo Cost Center returned to /cargo.")

        # 10. Test POD & Exception Desk Escape -> returns to /cargo
        log("\n[STAGE 10] Testing POD & Exception Desk Escape navigation...")
        driver.get("http://localhost:50005/cargo/pod-exceptions")
        time.sleep(1.5)
        back_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-back-to-cargo")))
        log(f"  SUCCESS: Found back button with [Esc] badge: '{back_btn.text}'")
        body = driver.find_element(By.TAG_NAME, "body")
        body.send_keys(Keys.ESCAPE)
        time.sleep(1)
        assert "/cargo" in driver.current_url, f"Expected /cargo, got {driver.current_url}"
        log("  SUCCESS: Escape in POD Exception Desk returned to /cargo.")

        # 11. Test Cargo Board Modal Escape (closing modal vs exiting page)
        log("\n[STAGE 11] Testing Cargo Board New Consignment Modal Escape isolation...")
        create_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-create-consignment")))
        create_btn.click()
        time.sleep(0.8)
        assert len(driver.find_elements(By.ID, "modal-new-consignment")) > 0, "New consignment modal should be open"
        log("  SUCCESS: Opened New Consignment modal.")

        body = driver.find_element(By.TAG_NAME, "body")
        body.send_keys(Keys.ESCAPE)
        time.sleep(0.8)
        assert len(driver.find_elements(By.ID, "modal-new-consignment")) == 0, "New consignment modal should close on Esc"
        assert "/cargo" in driver.current_url, "Should remain on /cargo after closing modal via Esc"
        log("  SUCCESS: Escape closed New Consignment modal without leaving /cargo page.")

        # 12. Test Audit Governance Console Escape -> returns to /audit
        log("\n[STAGE 12] Testing Audit Governance Console Escape navigation...")
        driver.get("http://localhost:50005/audit/governance")
        time.sleep(1.5)
        audit_back_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-back-to-audit")))
        log(f"  SUCCESS: Found back button with [Esc] badge in Governance Console: '{audit_back_btn.text}'")
        body = driver.find_element(By.TAG_NAME, "body")
        body.send_keys(Keys.ESCAPE)
        time.sleep(1)
        assert "/audit" in driver.current_url, f"Expected /audit, got {driver.current_url}"
        log("  SUCCESS: Escape in Governance Console returned to /audit.")

        # 13. Test Audit Explorer Escape -> returns to Counter Workbench (/)
        log("\n[STAGE 13] Testing Audit Explorer Escape navigation...")
        counter_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-back-to-counter")))
        log(f"  SUCCESS: Found Counter [Esc] button in Audit Explorer: '{counter_btn.text}'")
        body = driver.find_element(By.TAG_NAME, "body")
        body.send_keys(Keys.ESCAPE)
        time.sleep(1)
        assert driver.current_url.rstrip("/").endswith("50005"), f"Expected home, got {driver.current_url}"
        log("  SUCCESS: Escape in Audit Explorer returned to Counter Workbench (/).")

        log("\n=================================================================")
        log("✓ ALL 13 TEST STAGES PASSED CONVINCINGLY AND REPRODUCIBLY!")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_test()
