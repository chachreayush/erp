import os
import re

files = [
    'src/pages/Settings.tsx',
    'src/pages/Dashboard.tsx',
    'src/pages/admin/ClientManagement.tsx',
    'src/pages/inventory/Products.tsx'
]

for file in files:
    path = os.path.join('C:\\Users\\DELL\\OneDrive\\Desktop\\erp2', file)
    if not os.path.exists(path):
        continue
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Replace the very first <div style={{ or <div className=... with an overflowY auto if possible
    # A simple regex for the first return ( <div ...
    
    new_content = re.sub(
        r'return\s*\(\s*<div\s+style=\{\{\s*',
        r'return (\n    <div style={{ height: "100%", overflowY: "auto", ',
        content,
        count=1
    )
    
    if content == new_content:
        new_content = re.sub(
            r'return\s*\(\s*<div([^>]*)>',
            r'return (\n    <div\1 style={{ height: "100%", overflowY: "auto" }}>',
            content,
            count=1
        )
        
    if content != new_content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {file}')
