# Enterprise ERP — Git Workflow & Repository Management Manual
*Complete Multi-Folder Synchronization, Version Control, and Release Guide*

This document outlines the version control architecture, synchronization commands, and release procedures connecting the development workspace (`erp2`), the local Git repository (`erp`), and the GitHub remote origin.

---

## 1. Repository Architecture & Topography

```
+-----------------------------------------------------------------------------------+
|                        DEV WORKSPACE: C:\...\Desktop\erp2                         |
|  - Active coding directory                                                        |
|  - Running Vite dev server (Port 50005) & FastAPI (Port 8000)                     |
+-----------------------------------------------------------------------------------+
                                        |
                 +----------------------+----------------------+
                 | Robocopy Synchronization Commands
                 v
+-----------------------------------------------------------------------------------+
|                     LOCAL GIT REPOSITORY: C:\...\Desktop\erp                      |
|  - Houses the .git metadata directory                                             |
|  - Tracks commits on branch: main                                                 |
+-----------------------------------------------------------------------------------+
                                        |
                 +----------------------+----------------------+
                 | git push origin main
                 v
+-----------------------------------------------------------------------------------+
|                     GITHUB REMOTE ORIGIN (PRODUCTION SOURCE)                      |
|  - URL: https://github.com/chachreayush/erp.git                                   |
|  - Triggers automated CI/CD deployments to Vercel (Frontend) & Render (Backend)  |
+-----------------------------------------------------------------------------------+
```

---

## 2. The Two-Folder Synchronization Engine

Because the primary development occurs in `erp2` while the `.git` repository folder is `erp`, an automated synchronization process mirrors tested, verified code to `erp` before committing.

### 2.1 Automated Synchronization Script (`sync_to_erp.py`)

A dedicated script `sync_to_erp.py` in the workspace root automates the entire mirroring process using Windows `robocopy` and properly handles exit codes:

```python
# sync_to_erp.py
import subprocess
import sys

def run_sync():
    commands = [
        ['robocopy', r'C:\Users\DELL\OneDrive\Desktop\erp2\src', r'C:\Users\DELL\OneDrive\Desktop\erp\src', '/MIR', '/XD', 'node_modules'],
        ['robocopy', r'C:\Users\DELL\OneDrive\Desktop\erp2\backend', r'C:\Users\DELL\OneDrive\Desktop\erp\backend', '/MIR', '/XD', '__pycache__', '.venv', '.pytest_cache'],
        ['robocopy', r'C:\Users\DELL\OneDrive\Desktop\erp2', r'C:\Users\DELL\OneDrive\Desktop\erp', '*.md', '*.json', '*.txt', '*.html', '/XF', 'package-lock.json', '/XD', 'node_modules', 'backend', 'src', '.git']
    ]
    for cmd in commands:
        res = subprocess.run(cmd, capture_output=True, text=True)
        # Note: Robocopy returns 0 (no changes) or 1 (files copied successfully)
        if res.returncode > 1:
            print(f"Error executing {cmd[1]}: Return code {res.returncode}")
            sys.exit(res.returncode)
    print("Synchronization to original erp folder completed successfully!")
```

Run simply with:
```powershell
C:\Python313\python.exe sync_to_erp.py
```

### 2.2 Manual Robocopy Commands Reference

Execute these commands in Windows PowerShell if manual execution is preferred:

```powershell
# 1. Synchronize Frontend Source (/src)
robocopy "C:\Users\DELL\OneDrive\Desktop\erp2\src" "C:\Users\DELL\OneDrive\Desktop\erp\src" /MIR /XD node_modules

# 2. Synchronize Backend Source (/backend)
robocopy "C:\Users\DELL\OneDrive\Desktop\erp2\backend" "C:\Users\DELL\OneDrive\Desktop\erp\backend" /MIR /XD __pycache__ .venv .pytest_cache

# 3. Synchronize Documentation, Manuals & Configs
robocopy "C:\Users\DELL\OneDrive\Desktop\erp2" "C:\Users\DELL\OneDrive\Desktop\erp" *.md *.json *.txt *.html /XF package-lock.json /XD node_modules backend src .git
```

> [!CAUTION]
> The `/XD node_modules .git` and `/XF package-lock.json` flags are mandatory. Never copy or mirror the `.git` folder from destination or delete it. In Robocopy, exit codes `0` (no files copied) and `1` (files successfully copied) are both success states. Any exit code $\ge 8$ signifies an error.

---

## 3. Git Release & Push Workflow

Once the folders are mirrored, execute the standard Git release sequence in `C:\Users\DELL\OneDrive\Desktop\erp`:

### Step 1: Check Working Tree Status
```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp
git status
```
Verify that modified files correspond to the modules and manuals recently updated.

### Step 2: Stage & Inspect Changes
```powershell
git add .
git diff --staged --stat
```

### Step 3: Commit with Semantic Message
Format commit messages according to conventional commit guidelines:
```powershell
git commit -m "docs: overhaul developer manuals, user workflows, series continuation & QA audits"
```

### Step 4: Push to Remote GitHub Origin
```powershell
git push origin main
```
This triggers the automatic production deployment webhook on Vercel.

---

## 4. Git Best Practices & Safety Rules

1. **Verify Before Syncing**: Never run the Robocopy mirror command while compilation or tests are failing in `erp2`. Always run `npx tsc --noEmit` first.
2. **Never Commit Secrets**: Ensure `.env` in `backend` and `src` is listed in `.gitignore` so database passwords and secret keys are never exposed on GitHub.
3. **Branch Protection**: The `main` branch represents production code deployed to live pharmacies and cashiers. Ensure all changes are verified via Selenium before pushing to `main`.

---
*End of Git Workflow Manual.*
