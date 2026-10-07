import os

path = 'backend/requirements.txt'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if "python-dateutil" not in content:
    with open(path, 'a', encoding='utf-8') as f:
        f.write("\npython-dateutil==2.9.0.post0\n")
    print("Added python-dateutil to requirements.txt")
else:
    print("python-dateutil already in requirements.txt")
