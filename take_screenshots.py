
from playwright.sync_api import sync_playwright
import time

def capture():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        
        # Navigate to login
        page.goto("http://localhost:50005/")
        
        try:
            if page.locator("input[name=\"username\"]").is_visible(timeout=3000):
                page.fill("input[name=\"username\"]", "admin")
                page.fill("input[name=\"password\"]", "Admin@123")
                page.click("button[type=\"submit\"]")
                page.wait_for_load_state("networkidle")
                time.sleep(2)
        except:
            pass

        # Go to Sales
        page.goto("http://localhost:50005/sales?type=bill")
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        
        # Take full page screenshot
        page.screenshot(path="C:/Users/DELL/.gemini/antigravity/brain/30c6bcb4-3d4d-4694-928d-f4b580461717/sales_panel_audit_fixed.png", full_page=False)
        print("Screenshot saved!")
        browser.close()

if __name__ == "__main__":
    capture()

