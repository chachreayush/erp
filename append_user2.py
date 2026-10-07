with open("USER_WORKFLOW_MANUAL.md", "r", encoding="utf-8") as f:
    code = f.read()

marker = "## 2. Finance & Accounting Workflows"
replacement = marker + """

### 2.5 Expense Claims & Reimbursements
- **Path:** `Finance -> Expense Management`
- **Workflow:** 
  1. Users draft claims with multi-line categories.
  2. Approvers click the "Approve" checkmark.
  3. The system converts the claim into a Journal Voucher behind the scenes.
  4. The Finance team settles the employee's payable balance later with a standard Payment Voucher.
  5. **Drill-Down:** All vouchers are clickable from the Ledger Statement to allow instant editing/modification.
"""
code = code.replace(marker, replacement)

with open("USER_WORKFLOW_MANUAL.md", "w", encoding="utf-8") as f:
    f.write(code)
