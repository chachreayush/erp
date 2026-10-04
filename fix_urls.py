import os

path = 'src/pages/stock/StockShiftVoucher.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("apiClient.get('/master/manufacturers')", "apiClient.get('/api/master/manufacturers')")
content = content.replace("apiClient.get('/stock/auto-shift-candidates?' + params.toString())", "apiClient.get('/api/stock/auto-shift-candidates?' + params.toString())")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed URLs')
