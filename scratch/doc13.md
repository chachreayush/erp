DOC-13

WAREHOUSE, LOCATION, TRANSPORTER & VEHICLE MASTER FRAMEWORK

Detailed implementation specification for operational locations, stock custody and transport resources

1. Executive Summary

The ERP must know not only what product exists, but where it is, who owns it, in which condition it is held, how it should be picked, and how it will move. A warehouse is therefore a business master that connects physical stock to financial and operational records.

COMPANY
  ↓
BRANCH / SITE
  ↓
WAREHOUSE
  ↓
ZONE / AREA
  ↓
AISLE / RACK / SHELF / BIN
  ↓
PRODUCT + BATCH + OWNER + STOCK STATUS

TRANSPORT NETWORK
  ├─ TRANSPORTER
  ├─ VEHICLE
  ├─ DRIVER
  ├─ ROUTE
  └─ RATE-CONTRACT HOOK
           ↓
      CONSIGNMENT / DISPATCH

2. Master Principles

Warehouse identity is different from the physical storage bins inside it.

Physical location and stock ownership are separate dimensions.

Principal-owned stock must remain distinguishable from client-owned stock.

Batch and expiry context must remain attached to stock wherever batch management is enabled.

Every stock movement references a source and destination location or logical stock bucket.

A transporter is a business partner; a vehicle is an asset/resource; a driver is a person/resource.

Inactive or blocked transport and storage resources remain in history and are not hard-deleted.

Location and transport masters must be company-scoped unless explicitly designed as platform-shared infrastructure.

Warehouse controls should scale from a simple warehouse-only setup to bin-level WMS without forcing complexity on small businesses.

Every master change must be auditable and synchronization-safe.

3. Organizational & Physical Location Hierarchy

PLATFORM
  ↓
COMPANY
  ↓
BRANCH / SITE
  ↓
WAREHOUSE / DEPOT
  ↓
ZONE / STORAGE TYPE
  ↓
SECTION
  ↓
AISLE
  ↓
RACK
  ↓
SHELF / LEVEL
  ↓
BIN / LOCATION

This hierarchy should be configurable. A simple client can stop at Warehouse; a larger operation can activate the full hierarchy. SAP recommends separate warehouse numbers for distinct warehouse complexes, particularly when facilities are physically separated, and Dynamics 365 supports warehouse/location coordinate structures. (reference: SAP Help Portal and Microsoft Learn; see Appendix D).

4. Warehouse / Depot Master

4.1 Warehouse identity

4.2 Warehouse controls

Default receiving location

Default dispatch/staging location

Default returns location

Default quarantine location

Default damaged/expired location

Allow negative stock setting

Batch tracking policy

Expiry policy

Ownership policy

Cycle-count frequency

Cut-off times

Approval rules

4.3 Warehouse dashboard

WAREHOUSE DASHBOARD
  Stock value | Quantity | Batches | Expiry | Reserved | Available
  Inward today | Outward today | Pending picks | Pending dispatch
  Quarantine | Damage | Returns | Space utilization (if enabled)

5. Storage Location / Bin Master

A warehouse may operate with no bin-level control in a small business, but the architecture must allow granular locations later without redesign. Dynamics 365 explicitly supports location formats built from warehouse, aisle, rack, shelf and bin coordinates, and also supports location types such as bulk, picking, inbound dock and outbound dock. (reference: SAP Help Portal and Microsoft Learn; see Appendix D).

5.1 Location data

5.2 Location status

Available

Blocked for inbound

Blocked for outbound

Blocked for all

Inspection

Quarantine

Maintenance

Decommissioned

5.3 Location rules

PRODUCT/BATCH + OWNER + STORAGE CONDITION
            ↓
ELIGIBLE LOCATIONS
            ↓
PUTAWAY / PICK RULE
            ↓
SELECT BEST LOCATION

6. Stock Ownership & Custody

For C&F operations, physical possession does not necessarily mean economic ownership. The warehouse architecture must therefore keep physical location separate from owner/principal.

WAREHOUSE LOCATION + PRODUCT + BATCH + OWNER + STOCK STATUS = STOCK POSITION

7. Special & Logical Locations

These logical locations let the ERP represent operational status without corrupting the physical warehouse history.

8. Warehouse-Product Rules

9. Transporter Master

Transporters should be maintained as logistics business partners, with operational and commercial information that can be referenced by consignments and later freight contracts.

10. Vehicle Master

10.1 Vehicle availability rules

Prevent assignment of blocked/expired vehicle when policy requires.

Warn if planned load exceeds registered capacity.

Allow override only to authorized users and log the reason.

Retain historical assignments after the vehicle becomes inactive.

11. Driver / Crew Master

12. Route & Geography Master

ORIGIN → ROUTE → DESTINATION
          │
          ├─ Distance
          ├─ Expected Transit Time
          ├─ Service Area
          ├─ Preferred Transporters
          └─ Freight/Rate Contract Hook

13. Docks, Gates & Operational Points

13.1 Operational rules

Assign dock by transaction type where useful.

Prevent dispatch allocation to an unavailable dock.

Show dock queue to authorized operators.

Allow small businesses to disable dock-level management.

Maintain event history for gate/dock movements when enabled.

14. Transporter ↔ Vehicle ↔ Driver Relationship

TRANSPORTER
  ├─ Vehicle 1
  │    └─ Driver A
  ├─ Vehicle 2
  │    └─ Driver B
  └─ Contracted Vehicle 3
       └─ Assigned Driver C

15. Commercial & Freight Contract Hooks

Detailed freight logic belongs to the later Freight/Logistics document, but these masters must expose clean integration points.

TRANSPORTER + ROUTE + VEHICLE TYPE + DATE + SERVICE CLASS
                      ↓
                 RATE LOOKUP
                      ↓
             FREIGHT ENGINE (DOC-24)

16. Warehouse + Batch + Expiry Integration

Batch management from DOC-06/DOC-11 must remain available at warehouse/location level. A batch is not just a product attribute; its stock position depends on warehouse, exact location (when used), ownership and status.

PRODUCT
  ↓
BATCH
  ↓
OWNER / PRINCIPAL
  ↓
WAREHOUSE
  ↓
LOCATION
  ↓
STOCK STATUS
  ↓
AVAILABLE / RESERVED / QUARANTINED / DAMAGED / EXPIRED

16.1 Picking policy

17. Permissions & Operational Security

18. Keyboard-First Master Management

Ctrl/⌘ + K → Global Command Palette
W → Warehouse search
L → Location search
T → Transporter search
V → Vehicle search
N → New record
E → Edit selected
Enter → Open
Ctrl/⌘ + S → Save
Esc → Close
Alt/Option + A → Actions menu

Fast search by code/name/phone/vehicle/route.

Arrow-key table navigation.

Inline quick-create where safe.

No forced mouse use for standard workflows.

Shortcut visibility/help.

Permission-aware commands.

19. Master Lifecycle & Change Control

DRAFT → ACTIVE → RESTRICTED / BLOCKED → INACTIVE → ARCHIVED

Never hard-delete a transporter, vehicle, warehouse or location once referenced by a posted transaction. Instead use status transitions and retain historical identifiers.

20. Import, Bulk Update & Live Sync

CSV/Excel import with validation preview.

Bulk status changes.

Bulk location generation using templates.

Warehouse/location migration.

Transporter and vehicle onboarding.

Change-set IDs for live cloud sync.

Conflict detection on master edits.

Last-write-wins must not be used blindly for business-critical fields; protected fields use version/approval checks.

Remote users receive updated master data as soon as the sync tier commits it.

LOCAL MASTER CHANGE → CHANGE EVENT → CLOUD LIVE STATE → REMOTE USERS
REMOTE MASTER CHANGE → CLOUD COMMIT → LOCAL SYNC → LAN USERS

21. Operational Reports & Dashboards

22. Logical Data Model

COMPANY
 ├─ BRANCH / SITE
 │   └─ WAREHOUSE
 │       ├─ ZONE
 │       │   └─ SECTION
 │       │       └─ AISLE
 │       │           └─ RACK
 │       │               └─ SHELF
 │       │                   └─ BIN
 │       ├─ DOCKS / GATES
 │       └─ STOCK POSITIONS
 │             ├─ PRODUCT
 │             ├─ BATCH
 │             ├─ OWNER / PRINCIPAL
 │             └─ STATUS
 └─ TRANSPORT MASTER
      ├─ TRANSPORTER
      ├─ VEHICLE
      ├─ DRIVER
      └─ ROUTE

23. API / Service Requirements

24. Edge Cases & Failure Handling

25. Small-Business vs Large-Business Modes

26. Integration Map

DOC-06 / DOC-11 Product & Batch
          ↓
DOC-12 Principal
          ↓
DOC-13 Warehouse / Location / Transport
          ↓
Inventory Engine ── Billing ── Cargo ── Dispatch
          │           │          │          │
          └──────── Accounting / Posting ───┘
                       ↓
                 Reports / MIS

27. Acceptance Criteria

A company can create one simple warehouse without configuring advanced WMS structures.

A large company can create multiple branches and warehouses.

Warehouse locations can scale from warehouse-level stock to bin-level stock.

Physical location is separate from principal/stock ownership.

Batch stock can be located and traced by warehouse/location.

Blocked locations cannot receive ordinary putaway/picking.

Transporter and vehicle can be assigned to a consignment.

Blocked/inactive transport resources cannot be assigned under normal policy.

Historical transactions retain the original master snapshot/reference.

Master changes are audited and synchronized to the live cloud tier.

Remote users see newly committed master changes without manual database copying.

All protected actions respect DOC-03 permission boundaries.

No module can bypass company isolation from DOC-01.

28. Test Matrix

29. Non-Negotiable Rules

1. Warehouse is a company-scoped operational master unless explicitly designated as platform infrastructure.

2. Location is subordinate to a warehouse and cannot silently exist outside company scope.

3. Physical location does not determine economic ownership.

4. Product, batch and ownership must remain traceable in stock positions.

5. Posted history keeps its original warehouse/location/transporter/vehicle context.

6. Blocked resources cannot be used by ordinary workflows.

7. Transporter, vehicle and driver changes are audited.

8. No business module directly edits stock balances; it creates movements.

9. No business module bypasses company isolation or permission boundaries.

10. Live cloud synchronization must preserve master-data consistency.

11. Advanced WMS features are optional configuration, not mandatory complexity for small businesses.

Appendix A. Master Screen Inventory

Warehouse List

Warehouse Setup

Warehouse Dashboard

Zone/Area Setup

Location Hierarchy

Location Generator

Location Block/Unblock

Dock & Gate Setup

Transporter List

Transporter Master

Vehicle List

Vehicle Master

Driver Master

Route Master

Service Area Master

Warehouse-Product Rules

Stock Position by Location

Warehouse Transfer View

Transport Assignment View

Master Import Wizard

Master Change History

Capacity/Utilization View

Appendix B. Suggested Warehouse Master Screen

┌───────────────────────────────────────────────────────────┐
│ Warehouse: MAIN-01   Status: ACTIVE                      │
├───────────────────────────────────────────────────────────┤
│ Company | Branch | Address | Manager                     │
├───────────────────────────────────────────────────────────┤
│ Default Receiving | Picking | Dispatch | Returns         │
├───────────────────────────────────────────────────────────┤
│ Zones / Locations                                       │
│  Zone A → Rack 01 → Shelf 01 → Bin 01                  │
│  Zone B → Bulk                                             │
├───────────────────────────────────────────────────────────┤
│ Stock: Available | Reserved | Quarantine | Expiry       │
├───────────────────────────────────────────────────────────┤
│ Save | Block | Copy | Import | Audit | View Stock        │
└───────────────────────────────────────────────────────────┘

Appendix C. Transporter / Vehicle Assignment Screen

TRANSPORT ASSIGNMENT
Consignment: CN-000125
Route: Chhindwara → Nagpur
Transporter: ABC Transport
Vehicle: MP-XX-1234
Driver: Rajesh
Capacity Check: PASS
Documents: VALID
[Assign] [Change] [View History] [Override with Approval]

Appendix D. Reference Design Sources

The architecture was informed by current official documentation describing warehouse organizational structures, storage locations, location hierarchy and warehouse location rules. These are reference patterns, not copied implementations.

SAP Help Portal — Warehouse Number: https://help.sap.com/docs/SAP_SUPPLY_CHAIN_MANAGEMENT/dc8e3ce481cc493aad2145b99e6c53eb/10cccb53ad377114e10000000a174cb4.html

SAP Help Portal — Corporate Structure / Material Master: https://help.sap.com/docs/SAP_ERP_SPV/cb7b96d71e9c486e897c8fb57d5669a8/917cbd534f22b44ce10000000a174cb4.html

Microsoft Learn — Inventory locations: https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/inventory-locations

Microsoft Learn — Warehouse configuration: https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/warehouse-configuration

Microsoft Learn — Location directives: https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/create-location-directive

Final Definition

DOC-13 establishes the operational master layer between the company/principal architecture and the future inventory/cargo/dispatch engines. It gives the ERP one consistent way to answer: where is the stock, who owns it, what batch is it, what condition is it in, which warehouse/location holds it, and which transport resource can move it?

The design is intentionally scalable: a small business can operate with a single warehouse and simple transporter master, while a large business can activate zones, bins, docks, route management, capacity controls, multi-owner stock, advanced picking rules and logistics analytics without changing the foundational data model.

