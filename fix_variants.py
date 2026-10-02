with open('src/pages/master/PartyMaster.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('<Input label=', '<Input variant="compact" label=')
content = content.replace('<Input type=', '<Input variant="compact" type=')

with open('src/pages/master/PartyMaster.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
