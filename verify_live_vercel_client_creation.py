import time
import json
import uuid
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

import sys

sys.stdout.reconfigure(encoding='utf-8')

def log(msg):
    print(f"[VERCEL-CLIENT-TEST] {msg}", flush=True)

def verify_live_vercel_client_registration():
    log("=================================================================")
    log("VERIFYING LIVE VERCEL CLIENT REGISTRATION ON PRODUCTION")
    log("URL: https://erp-rho-three.vercel.app")
    log("=================================================================")

    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--window-size=1600,1050")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")

    driver = webdriver.Chrome(options=chrome_options)
    driver.set_window_size(1600, 1050)
    wait = WebDriverWait(driver, 35)

    try:
        # Step 1: Open Login Page
        log("\n[STEP 1] Loading https://erp-rho-three.vercel.app/login...")
        driver.get("https://erp-rho-three.vercel.app/login")
        time.sleep(3)

        # Check for autofill chips
        wait.until(EC.presence_of_element_located((By.ID, "btn-quick-fill-admin")))
        wait.until(EC.presence_of_element_located((By.ID, "btn-quick-fill-client")))
        demo_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-demo-login")))
        log("  SUCCESS: Quick autofill chips and demo login button found on live Vercel.")

        driver.save_screenshot(r"C:\Users\DELL\.gemini\antigravity\brain\8eeeb440-bbec-4ca3-a399-79618929579d\verified_live_vercel_login_chips.png")
        log("  Screenshot saved: verified_live_vercel_login_chips.png")

        # Step 2: Click Demo Admin Login and await Live Cloud JWT
        log("\n[STEP 2] Clicking '⚡ Explore Live Demo as Admin (Full Cloud Access)'...")
        demo_btn.click()
        time.sleep(6)

        # Confirm navigation to main dashboard
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'DOC-31 COUNTER WORKBENCH') or contains(text(), 'Enterprise Master Firm') or contains(text(), 'My Organization') or contains(text(), 'System Admin')]")))
        log("  SUCCESS: Authenticated and landed on Dashboard.")

        # Verify real JWT token in localStorage
        auth_raw = driver.execute_script("return localStorage.getItem('erp-auth');")
        log(f"  Auth state retrieved from localStorage: {auth_raw[:100]}...")
        auth_data = json.loads(auth_raw)
        token = auth_data.get("state", {}).get("token", "")
        assert token.startswith("eyJ"), f"Expected genuine JWT token starting with eyJ, got: {token[:20]}"
        log("  SUCCESS: Genuine live JWT bearer token acquired from Render cloud backend!")

        # Step 3: Navigate to Client Management (/clients)
        log("\n[STEP 3] Navigating to https://erp-rho-three.vercel.app/clients...")
        driver.get("https://erp-rho-three.vercel.app/clients")
        time.sleep(4)

        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Client Management')]")))
        log("  SUCCESS: Client Management page loaded.")

        # Step 4: Open Register Client Modal
        log("\n[STEP 4] Opening Register Client Modal...")
        register_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Register Client') or contains(., 'New Client')]")))
        register_btn.click()
        time.sleep(2)

        # Step 5: Fill in New Client Details
        unique_suffix = uuid.uuid4().hex[:4].upper()
        test_org_name = f"Apex MedCorp {unique_suffix}"
        test_org_code = f"AMC-{unique_suffix}"
        test_admin_name = f"Dr. Ramesh Mehta {unique_suffix}"
        test_admin_username = f"admin_{test_org_code.lower()}"
        test_admin_password = "Password@123"

        log(f"\n[STEP 5] Registering new client: {test_org_name} ({test_org_code})...")

        # Find input fields
        inputs = driver.find_elements(By.CSS_SELECTOR, "input")
        log(f"  Found {len(inputs)} inputs in modal.")

        # Fill via script for 100% reliable React state binding
        driver.execute_script("""
            const inputs = document.querySelectorAll('input');
            const values = arguments[0];
            inputs[0].value = values.name;
            inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[1].value = values.code;
            inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[2].value = values.adminName;
            inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[3].value = values.username;
            inputs[3].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[4].value = values.password;
            inputs[4].dispatchEvent(new Event('input', { bubbles: true }));
        """, {
            "name": test_org_name,
            "code": test_org_code,
            "adminName": test_admin_name,
            "username": test_admin_username,
            "password": test_admin_password
        })
        time.sleep(1)

        # Step 6: Submit Registration Form
        log("\n[STEP 6] Submitting client registration...")
        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit' and (contains(., 'Register Client') or contains(., 'Register'))]")
        submit_btn.click()
        log("  Clicked submit button, awaiting cloud DB write...")

        # Wait for modal to close and client to appear
        time.sleep(5)
        wait.until(EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{test_org_code}')]")))
        log(f"  SUCCESS: Newly registered client '{test_org_name}' with code '{test_org_code}' found in live organizations list!")

        driver.save_screenshot(r"C:\Users\DELL\.gemini\antigravity\brain\8eeeb440-bbec-4ca3-a399-79618929579d\verified_live_vercel_client_registered.png")
        log("  Screenshot saved: verified_live_vercel_client_registered.png")

        log("\n=================================================================")
        log("100% SUCCESS: LIVE VERCEL CLIENT REGISTRATION VERIFIED!")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    verify_live_vercel_client_registration()
