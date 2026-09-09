from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time

def capture_dashboard():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    driver = webdriver.Chrome(options=chrome_options)
    driver.get("http://localhost:50005/")
    
    # Wait for the map and dashboard to load
    time.sleep(10)
    
    screenshot_path = "C:\\Users\\DELL\\.gemini\\antigravity\\brain\\8af5d42e-53e3-4425-a748-cbfe8c6eb22c\\admin_dashboard_audit.png"
    driver.save_screenshot(screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")
    driver.quit()

if __name__ == "__main__":
    capture_dashboard()
