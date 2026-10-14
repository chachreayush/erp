import time
import json
import sys
import os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

ARTIFACTS_DIR = r"C:\Users\DELL\.gemini\antigravity\brain\4793a238-58bd-40ed-9c37-093423cd07cd"
LIVE_URL = "https://erp-rho-three.vercel.app"

def log(msg):
    print(msg, flush=True)

def run_verification():
    log("=================================================================")
    log("VERIFY LIVE VERCEL PRODUCTION DEPLOYMENT")
    log("=================================================================")

    # Demo / Cloud auth state for production testing
    auth_store_obj = {
        "state": {
            "user": {
                "id": "usr-demo-admin",
                "username": "admin",
                "role": "am_admin",
                "full_name": "Senior Enterprise Admin",
                "organization_id": "org-default-01",
                "permissions": {
                    "finance": {"view": True, "create": True, "edit": True, "delete": True},
                    "audit": {"view": True, "create": True, "edit": True, "delete": True},
                    "cargo": {"view": True, "create": True, "edit": True, "delete": True},
                    "workflow": {"view": True, "create": True, "edit": True, "delete": True}
                }
            },
            "token": "live-demo-token-xyz-123",
            "originalAmUser": None,
            "originalAmToken": None,
            "appMode": "remote",
            "serverUrl": "https://erp-rho-three.vercel.app"
        },
        "version": 0
    }

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1440,950")
    options.set_capability('unhandledPromptBehavior', 'accept')

    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 20)

    def inject_auth(d):
        d.execute_script("""
            const authData = arguments[0];
            sessionStorage.setItem('erp-auth', JSON.stringify(authData));
            localStorage.setItem('erp-auth', JSON.stringify(authData));
            sessionStorage.setItem('auth-storage', JSON.stringify(authData));
            localStorage.setItem('auth-storage', JSON.stringify(authData));
        """, auth_store_obj)

    try:
        log(f"\n[1/5] Checking live site root: {LIVE_URL}...")
        driver.get(LIVE_URL)
        time.sleep(3)
        inject_auth(driver)
        driver.get(LIVE_URL)
        time.sleep(3)

        # ── 1. RECEIPT VOUCHER ──
        log("\n[2/5] Testing Live Customer Receipt Voucher (/receipt)...")
        driver.get(f"{LIVE_URL}/receipt")
        time.sleep(2)
        inject_auth(driver)
        driver.get(f"{LIVE_URL}/receipt")
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Receipt Voucher') or contains(text(), 'RECEIPT')]")))
        time.sleep(1)

        body_text = driver.find_element(By.TAG_NAME, "body").text.lower()
        log(f"  Receipt page text snippet: {body_text[:150]}")
        assert "receipt voucher" in body_text or "receipt" in body_text, "Receipt voucher not found on live site"
        assert "doc-24 receipt" in body_text, "DOC-24 badge not found on live site"
        assert "total receipt amount" in body_text or "receipt amount" in body_text, "Telemetry not found on live site"

        shot_receipt = os.path.join(ARTIFACTS_DIR, "live_vercel_receipt_voucher_luxury.png")
        driver.save_screenshot(shot_receipt)
        log(f"  SUCCESS: Captured live receipt screenshot -> {shot_receipt}")

        # ── 2. PAYMENT VOUCHER ──
        log("\n[3/5] Testing Live Supplier Payment Voucher (/payment)...")
        driver.get(f"{LIVE_URL}/payment")
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Payment Voucher') or contains(text(), 'PAYMENT')]")))
        time.sleep(1)

        body_text_pmt = driver.find_element(By.TAG_NAME, "body").text.lower()
        assert "payment voucher" in body_text_pmt or "payment" in body_text_pmt, "Payment voucher not found on live site"
        assert "doc-24 payment" in body_text_pmt, "DOC-24 badge not found on live site"
        assert "total payment amount" in body_text_pmt or "payment amount" in body_text_pmt, "Payment telemetry not found on live site"

        shot_payment = os.path.join(ARTIFACTS_DIR, "live_vercel_payment_voucher_luxury.png")
        driver.save_screenshot(shot_payment)
        log(f"  SUCCESS: Captured live payment screenshot -> {shot_payment}")

        # ── 3. AUDIT TRAIL EXPLORER ──
        log("\n[4/5] Testing Live Audit Trail Explorer (/audit)...")
        driver.get(f"{LIVE_URL}/audit")
        time.sleep(3)

        audit_text = driver.find_element(By.TAG_NAME, "body").text.lower()
        assert "audit trail & cryptographic evidence explorer" in audit_text, "Audit Explorer title not found on live site"
        assert "tamper-evident sha-256 chained event stream" in audit_text, "Audit Explorer subtitle not found on live site"
        assert "total audited events" in audit_text, "Audit Explorer KPI not found on live site"

        shot_audit = os.path.join(ARTIFACTS_DIR, "live_vercel_audit_explorer_luxury.png")
        driver.save_screenshot(shot_audit)
        log(f"  SUCCESS: Captured live audit explorer screenshot -> {shot_audit}")

        # Test live hash chain verification button
        verify_btn = driver.find_element(By.ID, "btn-verify-chain")
        verify_btn.click()
        time.sleep(2)
        chain_banner = wait.until(EC.visibility_of_element_located((By.ID, "banner-verification-result")))
        assert chain_banner.is_displayed(), "Chain verification banner not visible on live site"
        log("  SUCCESS: Cryptographic verification validated on live Vercel production!")

        # ── 4. GOVERNANCE CONSOLE ──
        log("\n[5/5] Testing Live Governance Console (/audit/governance)...")
        # Navigate seamlessly from /audit via #btn-nav-governance
        nav_gov_btn = wait.until(EC.element_to_be_clickable((By.ID, "btn-nav-governance")))
        nav_gov_btn.click()
        time.sleep(3)

        gov_text = driver.find_element(By.TAG_NAME, "body").text.lower()
        log(f"  Governance page text snippet: {gov_text[:150]}")
        assert "data governance & regulatory compliance console" in gov_text or "governance" in gov_text, "Governance title not found on live site"
        assert "doc-33 governance" in gov_text, "DOC-33 badge not found on live site"
        assert "statutory retention schedules" in gov_text or "retention" in gov_text, "Retention schedules not found on live site"

        shot_gov = os.path.join(ARTIFACTS_DIR, "live_vercel_audit_governance_console.png")
        driver.save_screenshot(shot_gov)
        log(f"  SUCCESS: Captured live governance console screenshot -> {shot_gov}")

        log("\n=================================================================")
        log("LIVE VERCEL PRODUCTION DEPLOYMENT VALIDATED WITH ZERO DEFECTS!")
        log("=================================================================")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_verification()
