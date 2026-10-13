addition = """

## 14. Master Selenium Testing Suite: Journal Voucher & Accrual Engine (DOC-25)

The automated test suite `test_journal_accrual_engine_selenium.py` provides end-to-end regression verification of multi-leg journal entries, dynamic auto-balancing (`[Ctrl+B]`), accrual scheduling, and traceable one-click reversals:

```powershell
cd C:\\Users\\DELL\\OneDrive\\Desktop\\erp2
C:\\Python313\\python.exe test_journal_accrual_engine_selenium.py
```

### 14.1 Architecture & Endpoints Under Test
* `POST /api/finance/journal`: Validates sum(Debits) == sum(Credits) > 0, generates sequential voucher number (with series lock), inserts master `models.Voucher` and multi-leg `models.VoucherEntry` records, and updates per-FY `models.LedgerBalance` and `models.Ledger.closing_balance`.
* `GET /api/finance/journals`: Queries journal vouchers with classification filters (`journal_type`), status, and date range.
* `POST /api/finance/journal/{id}/reverse`: Executes atomic GL inversion (Dr -> Cr, Cr -> Dr), updates ledger balances, transitions original voucher status to `Reversed`, and links `reversal_voucher_id`.

### 14.2 Automated Verification Assertions (6/6 Stages - 100% Pass):
1. **API Authentication & Tenant Context**: Authenticates as `admin` on Neon PostgreSQL (`Org: 78fca6c8-eb92-41c4-96ec-ac2e150d56a4`).
2. **Direct Backend API Verification**:
   - Asserts HTTP 200 on `GET /api/finance/journals`.
   - Asserts HTTP 400 Bad Request rejection when posting unbalanced entries (Debit 1000 != Credit 900).
   - Posts balanced entry via API and validates status, entries count, and voucher numbering.
   - Tests `POST /api/finance/journal/{id}/reverse`, asserting inversion where original Dr became Cr and vice versa.
3. **Headless Chrome Initialization**: Launches Selenium WebDriver (1440x950) with auth injection in `sessionStorage` and `localStorage`.
4. **Keyboard-First Cockpit Entry (`/journal`)**:
   - Enters multi-leg transaction: Rent Expense Dr Rs.10,000.00, Electricity Dr Rs.2,500.00.
   - Asserts real-time validation displays `OUT OF BALANCE`.
   - Triggers Auto-Balance (`[Ctrl+B]`), asserting automatic population of Leg 3 (Cash/Bank Cr Rs.12,500.00) and `BALANCED` status.
   - Confirms pre-posting modal and asserts success banner and series rollover.
5. **Accrual Journal & Auto-Reversal Scheduler**:
   - Selects `Accrual Journal` classification, verifying automatic activation of the Auto-Reversal checkbox.
   - Posts balanced accrual entry and captures screenshot.
6. **Journal Register & One-Click Reversal (`/finance/journal-register`)**:
   - Verifies audit metrics cards (Total Journals, Volume, Active Accruals, Reversals).
   - Expands voucher drawer showing underlying multi-leg debit and credit legs.
   - Clicks `[Reverse ↩]`, opens reversal modal, inputs audit reason, and posts reversal.
   - Asserts status transition to `Reversed` and verification of linked reversal voucher number.

---
*End of Developer Manual.*
"""

path = r"c:\Users\DELL\OneDrive\Desktop\erp2\DEVELOPER_MANUAL.md"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content_clean = content.replace("*End of Developer Manual.*", "").rstrip()
with open(path, "w", encoding="utf-8") as f:
    f.write(content_clean + addition)

print("DEVELOPER_MANUAL.md updated successfully")
