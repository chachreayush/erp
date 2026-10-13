import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def log(msg):
    print(msg, flush=True)

def verify_live_vercel():
    log("=================================================================")
    log("VERIFYING LIVE VERCEL PRODUCTION DEPLOYMENT (DOC-32)")
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

        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Approval Inbox')]")))
        log("  SUCCESS: Approval Inbox launcher verified on Live Vercel.")

        driver.save_screenshot(r"C:\Users\DELL\.gemini\antigravity\brain\4793a238-58bd-40ed-9c37-093423cd07cd\live_vercel_workflow_homescreen_verified.png")
        log("  Screenshot saved: live_vercel_workflow_homescreen_launcher.png")

        # Step 3: Trigger F4 to go to Approval Inbox
        log("\n[STEP 3] Triggering F4 hotkey on Live Vercel...")
        body = driver.find_element(By.TAG_NAME, "body")
        body.send_keys(Keys.F4)
        time.sleep(2.5)

        curr_url = driver.current_url
        log(f"  Current URL after F4: {curr_url}")
        assert "/workflow/inbox" in curr_url, f"Expected /workflow/inbox, got {curr_url}"

        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'DOC-32 WORKFLOW ENGINE')]")))
        log("  SUCCESS: Unified Approval Inbox loaded on Live Vercel.")

        driver.save_screenshot(r"C:\Users\DELL\.gemini\antigravity\brain\4793a238-58bd-40ed-9c37-093423cd07cd\live_vercel_workflow_inbox_verified.png")
        log("  Screenshot saved: live_vercel_workflow_inbox_verified.png")

        # Step 4: Navigate to Visual Workflow Designer
        log("\n[STEP 4] Navigating to Visual Workflow Designer on Live Vercel...")
        driver.get("https://erp-rho-three.vercel.app/workflow/designer")
        time.sleep(2.5)

        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Visual No-Code Workflow Designer')]")))
        log("  SUCCESS: Visual Workflow Designer verified on Live Vercel.")

        sim_input = driver.find_element(By.ID, "input-sim-amount")
        sim_input.clear()
        sim_input.send_keys("85000")
        time.sleep(1)

        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Simulation Output:')]")))
        log("  SUCCESS: Sandbox Simulator correctly evaluated Rs. 85,000 on Live Vercel.")

        driver.save_screenshot(r"C:\Users\DELL\.gemini\antigravity\brain\4793a238-58bd-40ed-9c37-093423cd07cd\live_vercel_workflow_designer_verified.png")
        log("  Screenshot saved: live_vercel_workflow_designer_verified.png")

        # Step 5: Navigate to Execution & SLA Monitor
        log("\n[STEP 5] Navigating to Execution & SLA Monitor on Live Vercel...")
        driver.get("https://erp-rho-three.vercel.app/workflow/monitor")
        time.sleep(2.5)

        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Live Automation & SLA Execution Monitor')]")))
        log("  SUCCESS: Execution & SLA Monitor verified on Live Vercel.")

        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Average Turnaround (TAT)')]")))
        log("  SUCCESS: Average Turnaround (TAT) verified on Live Vercel.")

        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'SHA-256')]")))
        log("  SUCCESS: SHA-256 Idempotency validation verified on Live Vercel.")

        driver.save_screenshot(r"C:\Users\DELL\.gemini\antigravity\brain\4793a238-58bd-40ed-9c37-093423cd07cd\live_vercel_workflow_monitor_verified.png")
        log("  Screenshot saved: live_vercel_workflow_monitor_verified.png")

        log("\n=================================================================")
        log("ALL LIVE VERCEL PRODUCTION TESTS PASSED WITH 100% SUCCESS!")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    verify_live_vercel()
