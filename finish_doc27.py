with open("PROJECT_MEMORY.md", "r", encoding="utf-8") as f:
    code = f.read()

target = "### Completed Modules"
replacement = target + "\n- **DOC-27: Fixed Assets & Depreciation Engine**\n  - Implemented `AssetCategory`, `FixedAsset`, and `DepreciationLog` models.\n  - Built `/api/assets` router with `POST /depreciate` to automatically calculate WDV/SLM depreciation and post perfectly balanced Journal Vouchers.\n  - Built dual-screen UI: `AssetCategories.tsx` for GL mapping, and `FixedAssets.tsx` for asset registry, history tracking, and manual depreciation triggers."
if "DOC-27:" not in code:
    code = code.replace(target, replacement)

with open("PROJECT_MEMORY.md", "w", encoding="utf-8") as f:
    f.write(code)

with open("USER_WORKFLOW_MANUAL.md", "r", encoding="utf-8") as f:
    code2 = f.read()

target2 = "### 2.6 Bank Statement Reconciliation"
replacement2 = """### 2.7 Fixed Asset Lifecycle & Depreciation
- **Path:** `Finance -> Fixed Assets`
- **Workflow:** 
  1. Define `Asset Categories` (e.g., Computers, Machinery) and map them to specific Asset, Accumulated Depreciation, and Depreciation Expense Ledgers.
  2. Register a new asset in the registry with its purchase date and gross block value. (Note: initial payment must still be recorded via Payment Voucher).
  3. Periodically click `Depreciate` to calculate fractional depreciation and automatically post a Journal Voucher to the exact mapped ledgers.

""" + target2
if "2.7 Fixed Asset Lifecycle" not in code2:
    code2 = code2.replace(target2, replacement2)

with open("USER_WORKFLOW_MANUAL.md", "w", encoding="utf-8") as f:
    f.write(code2)
