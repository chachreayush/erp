DOC-15

PRICING, RATE, MRP & FORMULA ENGINE

Multi-price architecture with customer defaults, effective-dated rates and configurable formula-driven price calculation

1. Executive Summary

The ERP needs more than a single “Selling Rate” field. Different businesses can have MRP, purchase/cost rates, standard selling rates, distributor/stockist/wholesale/retail prices, contract rates, customer-specific rates, quantity-based prices and formula-derived prices. DOC-15 creates one controlled pricing engine that can resolve these alternatives consistently.

PRODUCT / BATCH / CUSTOMER / PRINCIPAL / QTY / DATE / UOM
                         ↓
                 PRICE CONTEXT
                         ↓
                 PRICE RESOLUTION
                         ↓
                FORMULA ENGINE (if needed)
                         ↓
               PRICE ADJUSTMENTS (if allowed)
                         ↓
                   SCHEME ENGINE
                         ↓
                 TAX / TOTAL CALCULATION

2. Pricing Philosophy

Every product may have multiple valid price points; the ERP must know what each price means.

A customer can have a default pricing policy without preventing an authorized user from changing the applicable rate for a particular transaction.

Customer-product rates must be possible and must override broader defaults when valid.

Rates are effective-dated and versioned; changing tomorrow’s rate must never rewrite yesterday’s invoice.

Formula-based pricing is a first-class feature, but formulas must be controlled, versioned and protected from circular dependencies.

MRP, purchase/cost and selling rates are separate concepts even when one is calculated from another.

Schemes from DOC-14 are a separate commercial layer; the pricing engine should not silently consume a reimbursement entitlement as a normal discount.

A price selected on a posted document becomes a historical snapshot and must retain its source, formula/version and override reason.

3. Pricing Objects & Rate Types

4. Multiple Price Points per Product

PRODUCT A
├─ Purchase Rate        ₹80
├─ Standard Cost        ₹82
├─ MRP                  ₹120
├─ Retail Rate          ₹110
├─ Wholesale Rate       ₹102
├─ Distributor Rate      ₹98
├─ Institutional Rate    ₹95
└─ Principal Contract    ₹92

The product master should display the relevant price points, but transaction pricing must still go through the resolution engine. A product may also have batch-specific MRP or transaction purchase cost where the business requires it.

5. Customer Default Pricing

Every customer can have a default rate policy. The default should be easy to change later and should not require editing individual product records.

CUSTOMER MASTER
   Default Rate Type = Distributor
                ↓
Billing selects Customer A
                ↓
Pricing engine starts with Distributor Rate

6. Customer + Product Specific Pricing

The ERP must allow a more specific default for an individual customer-product combination.

Customer A → Default: Distributor Rate
       │
       └── Product A → Customer-Product Rate = ₹94

Product B → falls back to Distributor Rate

7. Price Lists

A price list is a reusable collection of rates and/or pricing rules. Customers may be assigned a price list by default; users with permission may change the price list at transaction time.

8. Effective Dates & Versioning

RATE V1: 01-Jan → 31-Mar   ₹100
RATE V2: 01-Apr → 30-Jun   ₹105
RATE V3: 01-Jul → 30-Sep   ₹110

The engine uses the transaction date/time according to the company pricing policy. Once a sales invoice or equivalent posted document stores the resolved rate, later price-list changes must not alter the historical transaction.

9. Price Resolution Precedence

The exact sequence should be configurable, but the ERP should have a deterministic default. The most specific valid rule should normally win over a broad default.

EXPLICIT AUTHORIZED FINAL OVERRIDE
          ↓
CUSTOMER + PRODUCT AGREEMENT
          ↓
CUSTOMER-SPECIFIC PRICE LIST
          ↓
PRINCIPAL / CHANNEL / SEGMENT PRICE
          ↓
QUANTITY-TIER PRICE
          ↓
CUSTOMER DEFAULT RATE TYPE
          ↓
STANDARD PRODUCT RATE
          ↓
FORMULA FALLBACK
          ↓
NO PRICE → EXCEPTION

10. Formula-Driven Pricing Engine

The system must allow an administrator to define formulas so that entering or updating one price can automatically calculate another price. The formulas are metadata, not hard-coded code.

INPUT SOURCES
Purchase Rate | Standard Cost | MRP | Standard Rate | Customer Rate | Principal Rate | Quantity | UOM
                                  ↓
                         FORMULA DEFINITION
                                  ↓
                          CALCULATED RATE
                                  ↓
                        ROUNDING / LIMITS

10.1 Formula examples

11. Formula Builder

┌────────────────────────────────────────────────────────────┐
│ Formula: Distributor Rate                                  │
├────────────────────────────────────────────────────────────┤
│ Source: [ Purchase Rate ▼ ]                                 │
│ Operation: [ Multiply ▼ ]     Value: [ 1.20 ]             │
│ Then: [ Round to 0.05 ▼ ]                                  │
│ Floor: [ ₹____ ]    Ceiling: [ ₹____ ]                    │
│ Applicable: Product Group / Principal / Effective Dates    │
│                                                            │
│ Preview: ₹80 → ₹96.00                                      │
│ [Validate Formula]   [Test]   [Save Version]               │
└────────────────────────────────────────────────────────────┘

11.1 Supported operators

Add fixed amount

Subtract fixed amount

Multiply by factor

Divide by factor

Add percentage

Subtract percentage

Markup percentage

Margin percentage

Min / Max / Clamp

Round up / round down / nearest

Conditional IF

Tier/slab lookup

UOM conversion

Currency conversion

Select another named rate as source

12. Formula Dependency & Circularity Control

The engine must build a dependency graph for calculated rates and reject circular formulas.

BAD EXAMPLE
Selling Rate → MRP → Selling Rate
          ↑          ↓
          └──────────┘

SYSTEM RESPONSE
Formula validation fails → explain the cycle → do not publish formula

Every formula has an input dependency list.

Calculated prices have a clear calculation order.

A formula cannot depend on itself directly or indirectly.

Publishing a new formula requires validation and test calculation.

Existing posted transactions use the historical formula version stored at posting time.

13. Price Direction & Reverse Calculation

The user may enter any one of the configured anchor prices and request the ERP to calculate related rates, provided the dependency graph permits it.

Option A: Enter Purchase Rate ₹80
   → Calculate MRP ₹120
   → Calculate Distributor ₹98
   → Calculate Retail ₹110

Option B: Enter MRP ₹120
   → Calculate Distributor ₹98
   → Calculate Retail ₹110

Option C: Enter negotiated selling ₹94
   → Show derived margin against purchase/cost
   → DO NOT silently overwrite MRP unless an explicit reverse formula permits it

14. Price Constraints & Controls

15. MRP Architecture

MRP should be stored as a distinct price concept and may be product-level or batch-level according to the company’s product/industry configuration. The pricing engine must keep the source and effective date visible.

Product default MRP

Batch MRP

Effective-date MRP

MRP history

MRP source

Tax-inclusion flag where configured

MRP display/print control

MRP validation against sale price rules

16. Purchase Rate & Cost Architecture

Purchase price can vary by supplier, date, batch, quantity and transaction. The ERP should distinguish transaction purchase cost from standard/reference cost.

17. Batch-Aware Pricing

DOC-11 established Batch as a first-class entity. DOC-15 must allow pricing rules to optionally use batch context without making every price batch-specific.

PRODUCT A
  ├─ Batch A1 → MRP ₹120 → Purchase ₹78
  ├─ Batch A2 → MRP ₹125 → Purchase ₹82
  └─ Batch A3 → MRP ₹125 → Purchase ₹85

Customer price can be resolved from: Product rule + Batch rule + Customer rule + Date

Batch-specific MRP

Batch-specific purchase cost

Batch-specific price restrictions where required

FEFO/FIFO batch selection before final price calculation when batch affects price

Historical invoice stores the exact batch and resolved rate

Returns use the original pricing snapshot where policy requires

18. UOM & Pack-Based Pricing

Price calculation must understand units and conversions rather than assuming every sale occurs in the base UOM.

1 Carton = 10 Boxes
1 Box = 10 Pieces

Carton Price ₹1,000
→ Box Price ₹100
→ Piece Price ₹10

Unit-specific prices

Automatic conversion

Price-unit field

Pack-size awareness

Validation against UOM precision

Rounding after conversion according to company rule

19. Quantity Tiers & Volume Pricing

The engine should select the applicable tier using the transaction quantity and the configured rule. Quantity thresholds can be per line, order, customer commitment or agreement depending on the document type.

20. Customer Rate Defaults — Detailed Behavior

CUSTOMER MASTER
Default Rate Type = Wholesale
Default Price List = PL-WH-01
      ↓
TRANSACTION
User sees: Wholesale Rate ₹102
      ↓
User may change to Contract-02 if permission allows
      ↓
Rate becomes transaction snapshot
      ↓
Future master changes do not rewrite this invoice

21. Price Override & Approval

Manual override is allowed only when permission exists.

Capture old price, new price, reason, user, timestamp and source.

Optional approval threshold based on deviation, margin or final value.

Do not change the master price when the user overrides one transaction.

A transaction override may be saved for reuse only through a deliberate “Save as customer/product rate” action with separate permission.

22. Integration with DOC-14 Scheme Engine

Pricing and scheme logic must remain distinct but connected.

BASE PRICE ENGINE
      ↓
RESOLVED SELLING PRICE
      ↓
DOC-14 OFFICIAL SCHEME / EXTRA ALLOWANCE
      ↓
DISCOUNT / FREE-GOODS / COMMERCIAL ADJUSTMENT
      ↓
FINAL TRANSACTION PRICE

23. Billing, Challan, CN & DN Integration

Billing pulls a resolved base price automatically.

Challan can resolve/display the same rate context before invoicing.

CN/DN should normally reference the original document and reuse its historical price context where appropriate.

User can open “Why this price?” to see the winning rule, source rate, formula version, effective date and overrides.

Changing today’s price list must not alter a posted historical document.

24. Price Preview / Simulation

Before posting, authorized users should be able to simulate a price without changing master data.

SIMULATION
Product + Customer + Qty + Date + Batch + UOM
              ↓
Resolved Base Rate
              ↓
Formula / Adjustments
              ↓
Scheme Preview
              ↓
Expected Net Rate / Margin

Compare price points side-by-side

Show margin estimate

Show MRP vs sale

Show purchase/cost vs sale

Test quantity tiers

Test formula versions

Never mutate live master data from simulation

25. Price Explainability

FINAL RATE ₹98
│
├─ Rate Type: Distributor Rate
├─ Price List: PL-DIST-01
├─ Customer Default: Distributor
├─ Product: Product A
├─ Formula: Purchase × 1.225
├─ Purchase Source: Batch A2 ₹80
├─ Formula Version: V3
├─ Effective: 01-Apr-2026
└─ Override: None

This “Why this price?” panel is a major usability and auditability feature. Users should not have to guess where a rate came from.

26. Formula & Price Versioning

Publishing a formula creates a new immutable version. Old transactions retain their historic version/reference.

27. Currency & Tax Treatment

Each price can have a currency where multi-currency is enabled.

Currency conversion should use a controlled exchange-rate source.

Rate records must indicate tax-inclusive or tax-exclusive status where required.

The pricing engine should normally resolve the commercial price before final tax calculation.

Tax-inclusive/primitive-price formulas must be explicit to prevent double-tax calculation.

28. Commercial Price Conditions

A rate can be conditional on multiple attributes.

29. Price Rule Precedence & Conflict Handling

When several rules match, the engine should select deterministically. Recommended default behavior: highest specificity → highest explicit priority → latest valid version → configured tie-breaker. Equal-priority conflicting rules should be an exception rather than silently selecting an arbitrary price.

30. Data Architecture

31. API / Service Architecture

PricingService
 ├─ resolvePrice(context)
 ├─ calculateFormula(formulaId, inputs)
 ├─ listCandidates(context)
 ├─ explainPrice(resolutionId)
 ├─ simulatePrice(request)
 ├─ validateFormula(formula)
 ├─ publishPriceVersion()
 └─ validateOverride()

The pricing service should be a reusable domain service. Billing, quotation, sales order, challan and other commercial documents should call the same service rather than implementing separate pricing rules.

32. Local / Live Cloud Considerations

Price-rule changes are transactional master-data events.

Local LAN users should receive the latest published pricing rules quickly.

Remote users read the live cloud pricing state.

Price resolution must use a known version/snapshot so concurrent updates do not change an in-progress transaction unpredictably.

Formula publication and price-list changes must be idempotent and auditable across local/cloud sync.

33. Keyboard-First Pricing UX

F4 / shortcut → Open Price Context
Type customer → product → qty → UOM
Enter → resolve rate
Ctrl+Shift+P → price explanation
Ctrl+Shift+S → simulate
Ctrl+Shift+O → authorized override
Esc → close without change

Search-first price lists

Keyboard selection of rate type

Enter to accept

Arrow keys for candidate rates

Visible shortcut hints

No mouse required for common price resolution

34. Small-Business Mode vs Large-Business Mode

35. Security & Permissions

View prices

Create/edit price lists

Publish prices

Create formulas

Publish formulas

Set customer defaults

Set customer-product rates

Override transaction price

Approve price exceptions

View cost

View margin

Export pricing data

View price-resolution history

36. Audit Trail

37. Edge Cases & Failure Rules

No valid rate → block or configurable manual-price workflow; never silently invent a price.

Two equally ranked fixed prices → exception.

Formula cycle → publication blocked.

MRP lower than calculated selling rate → validation warning/block depending on rule.

Purchase rate unavailable → use configured fallback or exception.

Customer rate expired → fall back to next valid rate.

Future rate not yet effective → do not use early.

Batch selected after price resolution and batch changes price → re-resolve and show change.

UOM conversion missing → block price calculation.

Cloud price version differs from local → display version/status and resolve using transaction context.

38. Testing Strategy

39. Example Scenarios

39.1 Customer default pricing

Customer A default = Distributor Rate
Product A Distributor = ₹98
Billing → Customer A + Product A → ₹98

39.2 Customer-product negotiated rate

Customer A default = Distributor ₹98
Customer A + Product A = ₹94
Billing → ₹94 (specific rule wins)

39.3 Formula from purchase

Purchase Rate = ₹80
Markup = 20%
Selling Rate = ₹96

39.4 Formula from MRP

MRP = ₹120
Configured distributor discount = 18%
Distributor Rate = ₹98.40

39.5 Formula with floor

Calculated rate = ₹88
Minimum selling floor = ₹90
System blocks/warns and requests authorized override

39.6 Official scheme + extra allowance

Base price resolved → DOC-14 official scheme evaluated → extra principal allowance evaluated separately → final transaction data retains price + scheme entitlement references

40. Reports & Management Views

Price list register

Customer-wise price register

Customer-product negotiated rates

Product price history

Price changes by date

Formula register

Formula version history

Price exception report

Manual override report

Price deviation report

Margin-by-rate-type report

MRP vs selling comparison

Purchase vs selling analysis

Price resolution audit

Expired/future price report

Unused rate-rule report

41. Non-Negotiable Rules

1. One central pricing engine is used by sales order, quotation, challan, invoice and other commercial documents.

2. Customer defaults are separate from customer-product overrides.

3. Price rules are effective-dated and versioned.

4. Posted transactions retain their historical price snapshot.

5. Formulas are metadata and cannot create circular dependencies.

6. MRP, purchase/cost and selling rates remain distinct concepts.

7. DOC-14 scheme entitlements are not replaced by ordinary price discounts.

8. Every resolved price is explainable.

9. Manual overrides require permission and are audited.

10. No valid price means an exception; the system never silently invents one.

42. Dependencies & Future Documents

43. Reference Patterns Used for Design

This specification uses documented ERP pricing patterns as design references, not as copied implementations. SAP documents condition records based on customer, product, quantity and date; Microsoft Dynamics 365 documents base prices, trade-agreement prices, price adjustments, customer agreements, priority/concurrence and net pricing; Odoo documents customer-assigned and prioritized pricelists and time/quantity-based pricing.

44. Final Product Philosophy for Pricing

USER ENTERS OR SELECTS
Customer + Product + Qty + Batch + UOM
            ↓
ERP UNDERSTANDS
Customer default + product rules + principal + dates + price list + formula + constraints
            ↓
ERP EXPLAINS
“Why this price?”
            ↓
ERP APPLIES
Base Price → Authorized Adjustments → DOC-14 Schemes → Tax
            ↓
ERP RECORDS
Historical price snapshot + source + formula version + overrides

