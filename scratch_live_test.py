from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time, json

options = Options()
options.add_argument('--headless=new')
options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
options.set_capability('unhandledPromptBehavior', 'accept')
driver = webdriver.Chrome(options=options)
try:
    driver.get('https://erp-rho-three.vercel.app/')
    time.sleep(2)
    auth = {'state': {'user': {'id': '1', 'username': 'admin', 'role': 'am_admin'}, 'token': 'tok', 'appMode': 'remote', 'serverUrl': 'https://erp-rho-three.vercel.app'}, 'version': 0}
    driver.execute_script("sessionStorage.setItem('erp-auth', JSON.stringify(arguments[0])); localStorage.setItem('erp-auth', JSON.stringify(arguments[0]));", auth)
    driver.get('https://erp-rho-three.vercel.app/audit')
    time.sleep(3)
    print('Audit URL:', driver.current_url)
    btn = driver.find_element(By.ID, 'btn-nav-governance')
    print('Found button:', btn.text)
    driver.execute_script("arguments[0].click();", btn)
    time.sleep(3)
    print('After click URL:', driver.current_url)
    body_text = driver.find_element(By.TAG_NAME, 'body').text
    print('Body len:', len(body_text))
    print('Body text:', repr(body_text[:300]))
    logs = driver.get_log('browser')
    print('Browser logs:')
    for l in logs:
        print(l)
finally:
    driver.quit()
