DOC-14

SCHEME, FREE GOODS, REBATE, CLAIM & REIMBURSEMENT SETTLEMENT ENGINE

Detailed implementation specification for official schemes, extra principal allowances, free-goods consumption and automated reimbursement settlement

1. Executive Summary

The Scheme Engine records commercial entitlements separately from ordinary pricing and ordinary accounting transactions. It must distinguish an official customer-facing sales scheme such as “10 + 2” from a special principal-issued allowance such as “3 additional units to sell and recover later.” These are different commercial rights and must never be merged into one generic free-quantity field.

PRINCIPAL / COMMERCIAL AGREEMENT
        ↓
SCHEME VERSION / ENTITLEMENT
        ↓
ORDER / CHALLAN / INVOICE / CN / DN
        ↓
CONSUMPTION / CLAIMABLE QUANTITY
        ↓
CLAIM / REIMBURSEMENT
        ↓
SETTLEMENT ALLOCATION
        ↓
PRINCIPAL OPEN ITEM / MIS

The system must keep a complete chain from the original entitlement to every quantity/value consumed, claimed, reimbursed and settled. Historical transactions must continue to use the scheme version that was effective at their transaction time.

2. Core Business Scenario — Extra 3 Units

Primary example that the ERP must solve without operator confusion.

PURCHASE / PRINCIPAL ALLOWANCE
Product A: normal stock purchase = 10 units
Principal authorizes EXTRA SELLABLE ALLOWANCE = 3 units
Purpose: sell the 3 units now; principal will reimburse/adjust later
        ↓
SEPARATE OFFICIAL SCHEME
Product A official scheme = 10 + 2
        ↓
BILLING MUST SHOW BOTH
Official free quantity available = 2
Extra principal allowance remaining = 3
        ↓
IF 1 EXTRA UNIT IS USED
Extra allowance consumed = 1
Extra allowance pending reimbursement = 1
        ↓
AFTER ALL 3 ARE SOLD
Consumed = 3 | Reimbursed = 0 | Pending = 3
        ↓
PRINCIPAL REIMBURSES 3
Auto-match 3 eligible units → Pending = 0 → Settled

3. Scheme Philosophy

Commercial rules are master data with effective dates; transactions capture the version that actually applied.

Scheme benefits are tracked as entitlements and movements, not only as invoice discounts.

Free quantity can be operationally free to the customer while still having inventory cost and principal reimbursement implications.

Every consumed entitlement must remain traceable to the source order/challan/invoice/return.

Reimbursement can be monetary, quantity-based, document-based or a controlled combination.

Pending reimbursement is a measurable business asset/claim state and must have dedicated reports.

Scheme settlement must integrate with the universal settlement engine from DOC-07 rather than inventing a second allocation mechanism.

Historical schemes are immutable after use; revisions create new versions.

Automatic matching should be the default, with controlled manual override.

Small businesses should see a simple scheme panel; larger businesses can enable full claim/accrual/approval workflows.

4. Scheme Object Model

SCHEME PROGRAM
  ↓
SCHEME AGREEMENT / RULE SET
  ↓
SCHEME VERSION (effective-dated)
  ↓
ELIGIBILITY RULES
  ↓
ENTITLEMENT / ALLOWANCE
  ↓
CONSUMPTION MOVEMENTS
  ↓
CLAIM
  ↓
REIMBURSEMENT
  ↓
SETTLEMENT ALLOCATION

5. Scheme Types

6. Effective-Dated Scheme Versioning

Official schemes and reimbursement rules may change frequently. The system must use versioned effective dates rather than overwriting an existing rule.

Product A
├─ Scheme V1: 10 + 2 | Jan–Mar
├─ Scheme V2: 10 + 1 | Apr–Jun
└─ Scheme V3: 5 + 1  | Jul–Sep

New transactions use the version whose effective period matches the transaction date/time.

Historical posted transactions retain the resolved scheme-version ID and calculation snapshot.

Changing a future version does not change historical calculations.

Overlapping versions for the same scope must be blocked or explicitly resolved by priority.

Changes to an already-used version create a new revision/version and an audit event.

7. Eligibility & Rule Engine

The rule engine decides whether a product, customer, principal, order, challan, invoice, return or other event qualifies.

8. Scheme Conflict, Stacking & Priority Engine

The ERP must prevent accidental double benefits. Multiple schemes may be eligible, but the system must have explicit stacking rules.

ELIGIBLE SCHEMES
   ↓
PRIORITY / EXCLUSION CHECK
   ↓
STACKING RULE
   ├─ Stack all
   ├─ Highest priority only
   ├─ Best eligible scheme
   └─ Manual approval
   ↓
FINAL ENTITLEMENT PACKAGE

9. Entitlement Ledger

The Scheme Engine needs its own controlled quantity/value ledger. This is analogous to an operational subledger: it explains the commercial entitlement independently from the accounting ledger.

GRANTED → RESERVED → CONSUMED → CLAIMABLE → CLAIMED → APPROVED → REIMBURSED → ALLOCATED → SETTLED

10. Entitlement Balance Model

Granted
− Reserved
− Consumed
− Expired/Cancelled
= Available Entitlement

Claimable
− Approved/Rejected/Settled
= Pending Claim

Expected Reimbursement
− Reimbursed/Allocated
= Pending Recovery

11. Official Scheme: 10 + 2

QUALIFYING SALE = 10 units
        ↓
PAID / SALE QTY = 10
OFFICIAL FREE QTY = 2
        ↓
STOCK EFFECT = 12 units issued when policy permits
CUSTOMER PRICE = calculated only on chargeable quantity/value according to the scheme
        ↓
SCHEME CONSUMPTION MOVEMENT = 2 official free units

12. Extra Principal Allowance: 3 Units

PRINCIPAL AUTHORIZATION
Product A → +3 units sellable free allowance
        ↓
ENTITLEMENT = 3
        ↓
BILLING / CHALLAN
Extra allowance available = 3
        ↓
1 USED
Available = 2 | Consumed = 1 | Claimable = 1
        ↓
ALL 3 SOLD
Consumed = 3 | Pending reimbursement = 3
        ↓
PRINCIPAL SETTLES
Auto-match reimbursement to the 3 pending units
        ↓
Pending = 0 | Settled = 3

13. Scheme Cockpit Inside Billing / Challan / CN / DN

┌──────────────────────────────────────────────────────────────┐
│ SCHEME / ENTITLEMENT COCKPIT                                 │
├──────────────────────────────────────────────────────────────┤
│ Product A                                                     │
│ Official Scheme:        10 + 2                                │
│ Official Free Available:     2                               │
│                                                              │
│ Extra Principal Allowance:  3                                │
│ Extra Consumed:             1                                │
│ Extra Remaining:            2                                │
│ Pending reimbursement:      1                                │
│                                                              │
│ Recommended action: Use official free quantity first         │
│ [View Scheme] [Choose Source] [Allocation Detail]             │
└──────────────────────────────────────────────────────────────┘

The operator can see all relevant schemes at the exact moment of billing.

The system clearly labels official free quantity versus reimbursable extra allowance.

The operator can inspect why a benefit is available and what document created it.

If a transaction can consume more than one entitlement, the engine shows the proposed split before posting.

14. Scheme Source Selection

When multiple eligible buckets exist, the engine should suggest the safest allocation according to configured priority. The suggestion is visible and explainable before posting.

The actual priority must be configurable by company/principal because commercial agreements can differ.

15. Challan Integration

Delivery Challans must be scheme-aware even when no invoice exists yet.

CHALLAN
 ↓
Show active official schemes + extra allowances
 ↓
Reserve/consume entitlement as configured
 ↓
Link scheme movement to challan
 ↓
Invoice later inherits the scheme snapshot
 ↓
No duplicate scheme benefit

A challan may reserve a scheme benefit rather than consume it until invoice confirmation, depending on policy.

A cancelled challan releases reservations.

A converted challan carries forward the original entitlement references.

Partial conversion preserves the remaining reservation/entitlement balance.

16. Credit Note / Debit Note Integration

CN/DN must be able to reverse, adjust or settle scheme-related quantities/values without destroying the original history.

ORIGINAL SCHEME CONSUMPTION
        ↓
RETURN / CN / DN
        ↓
DETERMINE ELIGIBLE REVERSAL
        ↓
REVERSE OR ADJUST ENTITLEMENT
        ↓
RECALCULATE CLAIMABLE BALANCE

17. Reimbursement Methods

18. Partial Reimbursement

PENDING = 3 UNITS
        ↓
Principal reimburses 2
        ↓
Settled = 2 | Pending = 1
        ↓
Later reimburses 1
        ↓
Settled = 3 | Pending = 0

Every partial settlement must leave a precise residual balance. The original claim remains open until its remaining quantity/value reaches zero or is otherwise closed by an authorized write-off/expiration action.

19. Universal Scheme Settlement Workspace

SCHEME CLAIM / PENDING RECOVERY
        ↓
[Auto Match]
[Manual Match]
[Partial Match]
[Unapply]
[Reapply]
        ↓
SETTLEMENT ALLOCATION
        ↓
DOC-07 OPEN ITEM / SETTLEMENT ENGINE

20. Integration with DOC-07 Bill-by-Bill Settlement

The Scheme Engine must reuse the same universal settlement model already defined for invoice/payment/CN/DN allocation. A scheme claim becomes a structured open commercial item rather than a disconnected spreadsheet-like record.

SCHEME CLAIM
   ↓
OPEN ITEM TYPE = SCHEME CLAIM
   ↓
Settlement Sources:
  • Principal Credit Note
  • Principal Payment
  • Replacement Stock
  • Approved Adjustment
   ↓
SETTLEMENT ALLOCATION
   ↓
OPEN BALANCE = 0 → SETTLED

21. Integration with DOC-08 Posting Engine

22. Optional Accrual Model for Larger Businesses

Large companies may recognize an expected scheme reimbursement as an accrued receivable. This must be optional and configured per principal/scheme because small businesses may prefer a simpler claim-only model.

ELIGIBLE CONSUMPTION
        ↓
EXPECTED REIMBURSEMENT
        ↓
OPTIONAL ACCRUAL
        ↓
CLAIM
        ↓
ACTUAL CN / PAYMENT / STOCK
        ↓
REVERSE/TRUE-UP ACCRUAL
        ↓
SETTLED

SAP documents rebate accruals during qualifying billing and later partial/final settlement; this is a useful reference for the larger-enterprise mode. See the reference list at the end of this document.

23. Scheme Claims & Approval Workflow

AUTO-GENERATED CLAIM
        ↓
VALIDATE
        ↓
PENDING APPROVAL
        ↓
APPROVED / REJECTED / PARTIAL
        ↓
SUBMITTED TO PRINCIPAL
        ↓
SETTLEMENT RECEIVED
        ↓
ALLOCATE
        ↓
CLOSED

Microsoft documents workflow-based activation and approval of rebate deals and claims; the C&F ERP should use the same general discipline for high-value or exceptional claims. See the reference list at the end of this document.

24. Claim Status Model

25. Automatic Matching Rules for Reimbursement

26. Scheme Aging

Claim date → Age → 0–30 → 31–60 → 61–90 → 91–180 → 180+ days

Aging by claim date

Aging by eligibility date

Aging by submission date

Aging by promised reimbursement date

Optional principal-specific aging rules

27. Pending Scheme Settlement Reports

28. Billing-Time User Experience

Select Product A
      ↓
SCHEME ENGINE RETURNS
• Official scheme 10+2
• Extra allowance 3 units
• Already consumed 1 extra
• Remaining 2 extra
• Pending reimbursement 1
      ↓
BILLING USER SEES
Recommended scheme allocation
      ↓
CONFIRM
      ↓
POST
      ↓
Scheme consumption linked to invoice

No external calculator.

No spreadsheet lookup.

No need to remember which scheme is active.

Show effective date and scheme reference.

Warn when the selected benefit would exceed available entitlement.

Show source and reason in a tooltip/details drawer.

29. Batch Integration

Batch must remain visible wherever the scheme or reimbursement rule is batch-sensitive. This integrates directly with DOC-11.

30. Returns & Scheme Reconciliation

ORIGINAL INVOICE
  ↓
SCHEME CONSUMED 2
  ↓
CUSTOMER RETURNS 1
  ↓
RETURN RULE CHECK
  ├─ Reverse 1 entitlement
  ├─ Keep 1 claimable
  └─ Recalculate pending claim
      ↓
CLAIMABLE = 1

The exact return treatment must be configurable by scheme because some agreements allow returns to reduce qualifying volume while others may exclude returns after settlement.

31. Special Case — Extra Free Goods and Official Scheme Together

Sale requirement = 10 units
Official scheme = 10 + 2
Extra principal allowance remaining = 3
        ↓
Possible issue = 15 units total
        ↓
System proposes:
10 chargeable + 2 official free + 1 extra allowance
        ↓
User can inspect source of every 2+1 free quantity
        ↓
Posted entitlement movements:
Official scheme consumed = 2
Extra allowance consumed = 1
Extra claimable = 1

32. Expiry & Closing Rules

Schemes can expire without deleting historical transactions.

Unused entitlements may expire if agreement permits.

Pending claims can remain open after scheme validity ends if the agreement permits settlement after expiry.

Closing a scheme requires resolution of pending claims or explicit carry-forward/write-off policy.

No automatic write-off without an authorized rule and audit event.

33. Disputes & Exceptions

34. Data Model — Core Entities

35. API / Service Responsibilities

36. Live Cloud / Remote User Requirements

Scheme state must be live enough that remote users do not see stale entitlement balances that could cause double consumption.

LOCAL CONSUMPTION / REMOTE CONSUMPTION
        ↓
UNIQUE MOVEMENT ID
        ↓
VERSION / RESERVATION CHECK
        ↓
CLOUD TRANSACTION STATE
        ↓
OTHER CLIENTS RECEIVE UPDATED BALANCE

A remote user must see current available scheme balance or an explicit freshness indicator.

Two users must not be allowed to consume the same final entitlement quantity silently.

Failed sync must not create duplicate scheme consumption.

Reconciliation must identify missing or conflicting movements.

37. Keyboard-First Scheme Workflow

Open Billing → search Product → Alt/shortcut for Scheme Panel → review eligible schemes → Enter to accept suggestion → F-key/shortcut to open allocation detail → Save/Post

Use fast search for scheme/claim references.

Support keyboard allocation grids.

Show remaining balance in the focused row.

Avoid modal windows where a side drawer can preserve context.

All critical scheme actions have keyboard equivalents defined by DOC-05.

38. Small-Business Mode vs Enterprise Mode

39. Security & Permission Model

Create/edit schemes

Approve scheme versions

Grant extra allowances

Override eligibility

Consume extra allowance manually

Approve claims

Submit claims

Post reimbursement

Write-off

Unapply/reapply settlement

View claim profitability

View principal cost/recovery

Export sensitive reports

The client company controls its own scheme roles within the permission ceiling defined by the platform architecture. Platform Admin cannot be granted access by a client user, consistent with DOC-03.

40. Audit Trail

41. Controls & Validation

42. Reporting & Management Dashboard

SCHEME DASHBOARD
├─ Active Schemes
├─ Granted Benefit
├─ Consumed Benefit
├─ Pending Claim
├─ Pending Reimbursement
├─ Overdue Claims
├─ Expiring Entitlements
├─ Disputed Claims
├─ Settled This Period
└─ Principal-wise Exposure

43. End-to-End Example — Full Lifecycle

1. Principal A creates extra allowance: Product A = 3 units
2. ERP grants entitlement E-1001 = 3
3. Invoice INV-125 uses 1 extra unit
4. E-1001 consumed = 1; claimable = 1
5. Invoice INV-126 uses 2 extra units
6. E-1001 consumed = 3; claimable = 3
7. Claim CLM-200 created for 3
8. Principal approves claim
9. Principal issues CN-900 for claim value
10. CN-900 appears as an open settlement source
11. DOC-07 allocates CN-900 to CLM-200
12. DOC-09 updates scheme open item to zero
13. DOC-14 shows E-1001 = Settled
14. Dashboard removes CLM-200 from pending reimbursement

44. Acceptance Test Matrix

45. Non-Negotiable Rules

1. Official schemes and extra principal allowances are separate entitlement types.

2. Every entitlement has a unique identity and movement history.

3. Historical transactions retain the scheme version that was actually applied.

4. No free quantity can be consumed beyond available entitlement.

5. No reimbursement can be settled twice.

6. DOC-07 remains the universal settlement engine; DOC-14 does not create a parallel allocation system.

7. DOC-08 remains the accounting posting authority.

8. Pending scheme reimbursement must be reportable at quantity and value level.

9. Billing, challan, CN and DN must be able to display relevant scheme context before posting.

10. Automatic matches must be explainable and reversible through controlled actions.

11. Live/local/cloud synchronization must preserve entitlement movement uniqueness.

12. No silent write-off, expiration or override of commercial benefit.

46. Dependencies & Downstream Documents

47. Design Reference Patterns

The following current public documentation informed general design patterns rather than defining the C&F ERP requirements:

SAP Rebate Management: Accruals, partial settlement, final settlement, credit memo settlement. https://help.sap.com/docs/PRODUCT_ID/2754875d2d2a403f95e58a41a9c7d6de/2ceda5c8722d1014a1bbd405b4b2d252.html

SAP Free Goods: Inclusive and exclusive free-goods concepts. https://help.sap.com/docs/SAP_CUSTOMER_RELATIONSHIP_MANAGEMENT/dc1d869a338140e480792bd6c3b097c4/b97de8539b0e424de10000000a174cb4.html?locale=en-us

Microsoft Dynamics Rebate Management Deals: Effective rebate deals, claim inputs, inclusion/exclusion rules and paid-invoice conditions. https://learn.microsoft.com/en-us/dynamics365/supply-chain/rebate-management/rebate-management-deals

Microsoft Dynamics Rebate Workflows: Approval and activation workflow discipline. https://learn.microsoft.com/en-us/dynamics365/supply-chain/rebate-management/rebate-management-workflows

Microsoft Vendor Rebates: Claims, approval and future-reimbursement management. https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/vendor-rebates

48. Final Design Statement

DOC-14 defines a commercial entitlement engine that makes schemes visible at the moment of transaction, preserves historical scheme truth, separates official free goods from special principal allowances, tracks consumption and reimbursement independently, and turns pending scheme benefits into measurable claims that can be settled through the same universal settlement architecture already established in DOC-07 to DOC-09.

