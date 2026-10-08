with open("PROJECT_MEMORY.md", "r", encoding="utf-8") as f:
    code = f.read()

target = "### Completed Modules"
replacement = target + "\n- **DOC-25: Bank Statement Import Engine**\n  - Implemented `/api/finance/bank-statements/upload` for CSV parsing.\n  - Built dynamic `BankStatementProfile` system for mapping different bank CSV formats.\n  - Split-pane visual reconciliation UI (`BankReconciliation.tsx`) to match bank rows to ERP vouchers."
code = code.replace(target, replacement)

with open("PROJECT_MEMORY.md", "w", encoding="utf-8") as f:
    f.write(code)
