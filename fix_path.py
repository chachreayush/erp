with open('src/pages/HomeScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("path: '/admin/clients'", "path: '/clients'")
with open('src/pages/HomeScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
