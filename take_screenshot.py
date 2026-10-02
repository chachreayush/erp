import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def take_screenshot():
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--disable-gpu')
    
    driver = webdriver.Chrome(options=options)
    try:
        # Navigate to the app and wait a bit for it to load
        driver.get('http://localhost:50005/')
        
        # We need to simulate login if there is one. 
        # But wait, maybe the app uses a token. Let's just try to go to the page and see if we can set local storage.
        # Actually, from previous context, the app might bypass login in dev or maybe we just need to click login.
        # Let's add a 2 second sleep and see.
        time.sleep(2)
        
        # If we need to login, we can execute script to set token, or just try to click login
        try:
            username = driver.find_element("xpath", "//input[@type='text']")
            password = driver.find_element("xpath", "//input[@type='password']")
            btn = driver.find_element("xpath", "//button[contains(text(), 'Sign In')]")
            if username and password and btn:
                username.send_keys("admin")
                password.send_keys("admin")
                btn.click()
                time.sleep(2)
        except Exception as e:
            pass
            
        driver.get('http://localhost:50005/master')
        time.sleep(3)
        
        # Save screenshot
        driver.save_screenshot(r'C:\Users\DELL\.gemini\antigravity\brain\8af5d42e-53e3-4425-a748-cbfe8c6eb22c\ledger_hierarchy_audit.png')
        print("Screenshot saved successfully.")
    finally:
        driver.quit()

if __name__ == '__main__':
    take_screenshot()
