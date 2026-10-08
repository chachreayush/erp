with open("USER_WORKFLOW_MANUAL.md", "r", encoding="utf-8") as f:
    code = f.read()

target = "### 2.5 Expense Claims & Reimbursements"
replacement = """### 2.6 Bank Statement Reconciliation
- **Path:** `Finance -> Bank Reconciliation`
- **Workflow:** 
  1. User uploads a CSV statement exported from their bank portal.
  2. The system parses it using saved column mapping profiles.
  3. User compares the left pane (bank rows) against the right pane (system vouchers).
  4. Matching items are snapped together, verifying that physical cash matches the ERP accounting.

""" + target
code = code.replace(target, replacement)

with open("USER_WORKFLOW_MANUAL.md", "w", encoding="utf-8") as f:
    f.write(code)
