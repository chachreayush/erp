C&F ERP

DOC-12 • PRINCIPAL MASTER & C&F PRINCIPAL MANAGEMENT

Principal relationships, ownership, commercial terms, schemes, commission, claims, reconciliation and principal-wise MIS

1. Executive Summary

The Principal Master represents the commercial and operational relationship between the C&F company and each principal whose products, stock, schemes, pricing, claims or services are handled by the ERP. The principal layer must sit above transaction screens and below platform/company security, so every principal-linked transaction can inherit the correct commercial and operational context without duplicating data.

PLATFORM / CLIENT COMPANY
        ↓
PRINCIPAL MASTER
        ├── Principal Profile
        ├── Agreements / Commercial Terms
        ├── Products & Batches
        ├── Ownership Rules
        ├── Price Lists / Schemes
        ├── Commission / Handling
        ├── Claims / Recoveries
        ├── Stock & Reconciliation
        └── Principal MIS
                ↓
      SALES / BILLING / CARGO / ACCOUNTING

2. Relationship With the Master Principles

Principal data belongs to the client company unless explicitly defined as platform-managed reference data.

Principal-level configuration never overrides the Platform Admin security boundary.

Company Admin can manage principal records only within permissions assigned by the Platform Admin.

Principal context must be available to transaction engines without requiring users to re-enter it repeatedly.

Principal-specific stock ownership must be separable from physical warehouse location.

Principal-specific schemes must be effective-dated and auditable.

Principal transactions must remain traceable from source document through accounting and MIS.

Principal commercial changes must not rewrite historical transactions; historical documents retain the rule/version used at posting time.

3. Principal Entity Definition

A Principal is a business party for whom the C&F company performs clearing, forwarding, warehousing, distribution, sales support, inventory handling, reimbursement, commission or related services. A principal may also interact with the ERP through reports, statements or future portal access.

4. Principal Lifecycle

PROSPECT / PLANNED
      ↓
ONBOARDING
      ↓
CONFIGURATION
      ↓
ACTIVE
      ↓
TEMPORARILY SUSPENDED (optional)
      ↓
OFFBOARDED / ARCHIVED

4.1 Onboarding checklist

Create principal profile.

Enter statutory and contact information.

Define operating branches/depots.

Map products/SKUs and principal codes.

Define ownership model.

Configure price lists and commercial rules.

Configure scheme agreements and reimbursement behavior.

Configure commission/handling/recovery rules.

Configure accounting mappings if needed.

Assign users and principal-level permissions.

Validate sample transaction before activating the principal.

4.2 Status behavior

5. Principal ↔ Company Architecture

CLIENT COMPANY
   ├── Principal A
   │    ├── Products
   │    ├── Warehouses
   │    ├── Stock ownership
   │    ├── Sales
   │    ├── Schemes
   │    └── Claims
   ├── Principal B
   └── Principal C

One principal can operate across multiple branches and warehouses of the same client company. The same external principal may exist in another client company as a separate relationship record, even if the legal entity is the same, unless a later controlled platform-level master strategy explicitly supports sharing.

6. Principal Ownership & Stock Model

The ERP must distinguish physical possession from economic ownership. This is critical for C&F businesses and aligns with established consignment inventory patterns where stock can be physically held by one entity while owned by another. Microsoft Dynamics 365 documents a consignment model in which vendor-owned inventory can be held at the customer site and ownership changes only at a defined consumption event. Odoo similarly documents consignment stock as inventory stored/sold without the receiving company owning it up-front. citeturn881361search0turn881361search8

PHYSICAL LOCATION
      │
      ├── Warehouse / Depot
      │
      └── Bin / Location

OWNERSHIP
      │
      ├── Principal A
      ├── Principal B
      └── Client Company

PRODUCT + BATCH + LOCATION + OWNER = STOCK POSITION

6.1 Ownership modes

7. Principal–Product Mapping

The same physical product can have a different code, price, scheme, pack, reporting category or commercial interpretation for different principals. Therefore, the ERP should maintain a Principal Product Mapping rather than duplicating the global product master.

8. Principal Warehouses, Depots & Service Locations

A principal can operate across one or more client warehouses or depots. Principal-level location rules should define where products may be received, stored, dispatched and reported.

PRINCIPAL
  ├── Branch / Service Region
  │     ├── Warehouse A
  │     └── Warehouse B
  └── Other locations

9. Principal Commercial Agreement

Commercial terms should be represented as effective-dated versions. A new agreement never changes the meaning of already-posted documents.

10. Principal Scheme & Reimbursement Relationship

The detailed Scheme & Free-Goods Reimbursement Engine is specified in the dedicated DOC-14. This document defines only the principal relationship that supplies scheme context.

PRINCIPAL AGREEMENT
      ↓
SCHEME VERSION
      ↓
PRODUCT / BATCH ELIGIBILITY
      ↓
BILLING / CHALLAN / CN / DN
      ↓
CONSUMPTION
      ↓
CLAIMABLE QUANTITY / VALUE
      ↓
REIMBURSEMENT / CREDIT
      ↓
SETTLEMENT

DOC-14 remains the authoritative scheme calculation and settlement engine.

Principal Master stores which agreements/scheme families are active for that principal.

Historical invoices retain the exact scheme version or rule snapshot used at posting.

Principal reconciliation must show granted, consumed, claimed, reimbursed and pending quantities/values.

11. Principal Commission & Service Revenue

The C&F company may earn commission or service income from principal activity. Commission should be calculated from configurable contractual rules and posted through the Accounting Posting Engine defined in DOC-08.

ELIGIBLE TRANSACTIONS → COMMISSION CALCULATION → ACCRUAL (if configured) → CLAIM / SETTLEMENT → ACCOUNTING

12. Principal Claims & Recoveries

Principal claims are amounts the C&F company expects to recover from the principal, often arising from schemes, freight, handling, damages, shortages, market support or other contractual items.

12.1 Claim lifecycle

ELIGIBLE EVENT → CLAIM DRAFT → VALIDATE → SUBMIT → PRINCIPAL RESPONSE → APPROVED / DISPUTED → REIMBURSED → SETTLED

13. Principal Reconciliation

The ERP should provide a principal reconciliation workspace that compares what the C&F company believes is due against what the principal has acknowledged/reimbursed.

ERP POSITION ↔ PRINCIPAL POSITION ↔ DIFFERENCE / EXCEPTION ↔ RESOLUTION ↔ AUDIT

14. Principal Statement

The Principal Statement should behave as a principal-specific business statement, not merely a generic ledger. It should support operational and financial views.

15. Principal Dashboard

┌──────────────────────────────────────────────────────────────┐
│ PRINCIPAL DASHBOARD                                          │
├──────────────────────────────────────────────────────────────┤
│ Sales MTD     Stock Value     Commission     Pending Claims  │
│ ₹            QTY             ₹             ₹                │
├──────────────────────────────────────────────────────────────┤
│ Scheme Pending   Freight Recovery   Outstanding / Payable   │
│ QTY / ₹          ₹                ₹                         │
├──────────────────────────────────────────────────────────────┤
│ Top Products | Warehouse Stock | Aging | Exceptions          │
└──────────────────────────────────────────────────────────────┘

Principal health/status

Pending reconciliations

Pending scheme reimbursements

Claims aging

Stock by warehouse

Expiry exposure

Sales trend

Commission trend

Freight/recovery variance

Recent principal communications

16. Principal User / Portal Access

A future principal-facing portal can be implemented without exposing the client company ERP. The principal would receive a constrained view of its own data, governed by a separate integration/security policy.

17. Principal Permissions

Permissions are subject to the ceiling defined by Platform Admin and company roles defined in DOC-03.

18. Small-Business Mode vs Large-Business Mode

19. Search & Keyboard-First Principal Management

Global search by principal code, name, GSTIN and contact

Quick open Principal Dashboard

Keyboard navigation of principal list

Quick add principal

Quick add principal-product mapping

Search by product inside principal context

Open reconciliation from keyboard

Show recent principals and favorites

Command palette actions respect permissions

ALT/CTRL + K → SEARCH PRINCIPAL → OPEN → DASHBOARD / PRODUCTS / STOCK / SCHEMES / CLAIMS / RECONCILIATION

20. Data Model

20.1 Relationship model

PRINCIPAL
 ├── AGREEMENTS
 ├── PRODUCTS → PRODUCT / BATCH
 ├── LOCATIONS → WAREHOUSE
 ├── STOCK MOVEMENTS
 ├── SALES / RETURNS
 ├── SCHEMES → DOC-14
 ├── COMMISSION
 ├── CLAIMS
 ├── RECONCILIATION
 └── DOCUMENTS

21. Accounting Integration

Principal commercial events must feed the DOC-08 Posting Engine using configurable account mappings. The principal dimension should be available to accounting reports even when the posting account itself is shared.

22. Inventory & Batch Integration

Principal identity must be retained on stock positions and movements wherever ownership or reporting requires it. Batch tracking from DOC-11 remains the authoritative batch model.

PRINCIPAL + PRODUCT + BATCH + WAREHOUSE + QTY + OWNERSHIP
                 ↓
          STOCK POSITION
                 ↓
RECEIPT → TRANSFER → DISPATCH → RETURN → ADJUSTMENT

Principal-specific batch report

Principal-wise expiry

Principal-owned blocked/quarantine stock

Principal stock reconciliation

Batch trace from principal receipt to customer invoice where applicable

23. Billing / Challan Integration

When a billing, challan, credit note or debit note is created, the principal context should be resolved automatically wherever the transaction is principal-linked. The user should be able to see the applicable principal, scheme family, price rule and stock ownership before posting.

CUSTOMER + PRODUCT + WAREHOUSE + PRINCIPAL
                 ↓
        COMMERCIAL CONTEXT
                 ├── PRICE
                 ├── SCHEME
                 ├── STOCK OWNER
                 ├── COMMISSION
                 ├── FREIGHT / RECOVERY
                 └── TAX / ACCOUNTING HOOKS

24. Sync & Remote Access

Principal changes are company data and must follow the local-first/live-cloud rules in DOC-04. Remote users should see the latest acknowledged principal configuration available in the cloud transaction tier.

Versioned principal master changes

Change ID + revision

Local → cloud → remote propagation

Remote updates subject to company permissions

Conflict protection for concurrent commercial edits

Principal agreements synchronized with effective dates

Offline draft handling when remote connectivity is unavailable

25. Audit & Governance

26. Exception Handling

Principal inactive but transaction attempted

Product not mapped to principal

Warehouse not authorized for principal

Expired commercial agreement

Overlapping scheme versions

Missing reimbursement reference

Claim exceeds eligible amount

Stock ownership mismatch

Principal reconciliation mismatch

Duplicate principal code

Remote conflict on agreement version

27. Reporting Requirements

28. API / Service Requirements

29. Testing & Acceptance Criteria

Create principal and activate

Map products and warehouses

Principal-owned stock appears correctly

Client-owned stock remains distinct

Create sales transaction with automatic principal context

Historical transaction retains agreement/scheme version

Commission calculates correctly

Claim lifecycle works

Principal reconciliation identifies differences

Suspend principal blocks new transactions as configured

Concurrent edit conflict is handled

Remote user receives latest principal data

Unauthorized user cannot access another principal

Platform Admin access remains auditable

30. Reference ERP Patterns

The design uses documented patterns from established ERP systems as reference points, not as copied product behavior. Dynamics 365 documents explicit consignment ownership and vendor collaboration around on-hand and consumed inventory; Odoo documents consignment stock as inventory stored and sold without the receiving company owning it up-front; SAP documents rebate/settlement agreements with validity periods, accrual and partial/final settlement processes. These patterns support the use of explicit ownership dimensions, effective-dated agreements and settlement workflows in this C&F design. citeturn881361search0turn881361search8turn881361search1turn881361search11

31. Non-Negotiable Principal Rules

1. Principal is a first-class entity, never just an invoice text field.

2. Principal ownership is separate from physical warehouse location.

3. Historical transactions retain the rule/version used at posting.

4. Principal commercial terms are effective-dated.

5. Principal scheme settlement is handled by DOC-14, not duplicated here.

6. Principal financial effects post through DOC-08.

7. Principal stock and batch information integrates with DOC-06/DOC-11 and inventory documents.

8. All principal data remains company-scoped under DOC-01 to DOC-03 security.

9. Principal users never receive platform administration privileges.

10. Every important principal balance or status must be traceable to source records.

32. Dependencies & Next Documents

33. Definition of Done

Principal entity model approved.

Principal lifecycle and status rules approved.

Ownership model approved.

Principal-product mapping approved.

Commercial agreement model approved.

Commission and claim hooks approved.

Reconciliation model approved.

Permission matrix approved.

Database entities reviewed.

API/service contracts reviewed.

Accounting/posting references reviewed.

Inventory/batch integration reviewed.

Billing/challan integration reviewed.

Reports defined.

UAT scenarios approved.

34. Final Design Outcome

After implementation, a user selecting a principal should receive a consistent commercial and operational context across the ERP: the correct products, batches, warehouses, ownership rules, pricing, schemes, commission, recovery, freight behavior and reporting dimensions. The principal relationship should therefore become a reusable context object throughout the C&F workflow rather than repeated data entry on individual documents.

PRINCIPAL SELECTED
      ↓
COMMERCIAL CONTEXT RESOLVED
      ↓
PRODUCT / BATCH / WAREHOUSE / OWNERSHIP
      ↓
SALES / BILLING / CARGO / CLAIM / COMMISSION
      ↓
ACCOUNTING + SETTLEMENT
      ↓
PRINCIPAL MIS + RECONCILIATION

Appendix A — Principal Master Screen Layout

┌──────────────────────────────────────────────────────────────┐
│ PRINCIPAL MASTER                         Active ●            │
├──────────────────────────────────────────────────────────────┤
│ Code | Legal Name | Brand | GSTIN | Status                   │
├──────────────────────────────────────────────────────────────┤
│ Contacts | Addresses | Agreements | Products | Warehouses    │
├──────────────────────────────────────────────────────────────┤
│ Ownership | Pricing | Schemes | Commission | Claims         │
├──────────────────────────────────────────────────────────────┤
│ Stock | Reconciliation | Statement | Documents | Audit       │
├──────────────────────────────────────────────────────────────┤
│ Save | Activate | Suspend | Reconcile | Open Dashboard      │
└──────────────────────────────────────────────────────────────┘

Appendix B — Suggested Principal Dashboard Cards

Appendix C — Data Precision & Audit Notes

Quantity precision must follow product/UOM configuration.

Monetary precision must follow company/currency configuration.

Effective dates must be timezone-aware and unambiguous.

Agreement versions must not be overwritten after use in posted transactions.

Principal-code changes require audit history.

Archived principals remain available for historical reports.

