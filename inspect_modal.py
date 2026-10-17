import json
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

chrome_options = Options()
chrome_options.add_argument('--headless=new')
chrome_options.add_argument('--window-size=1600,1050')
driver = webdriver.Chrome(options=chrome_options)
try:
    driver.get('https://erp-rho-three.vercel.app/login')
    time.sleep(3)
    driver.find_element(By.ID, 'btn-demo-login').click()
    time.sleep(6)
    driver.get('https://erp-rho-three.vercel.app/clients')
    time.sleep(4)
    btn = driver.find_element(By.XPATH, "//button[contains(., 'Register Client')]")
    btn.click()
    time.sleep(2)
    inputs = driver.find_elements(By.CSS_SELECTOR, 'input')
    print('Found inputs:', len(inputs))
    for idx, inp in enumerate(inputs):
        print(f"Input {idx}: name='{inp.get_attribute('name')}', placeholder='{inp.get_attribute('placeholder')}', id='{inp.get_attribute('id')}'")
    
    # Check form action or buttons inside modal
    buttons = driver.find_elements(By.CSS_SELECTOR, "div[style*='fixed'] button")
    print('Found modal buttons:', len(buttons))
    for b in buttons:
        print(f"Button: text='{b.text}', type='{b.get_attribute('type')}'")
finally:
    driver.quit()
