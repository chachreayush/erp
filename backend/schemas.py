import enum
from decimal import Decimal
from typing import List, Dict
# ============================================================
# schemas.py — Pydantic Request/Response Data Shapes
# ============================================================
# Pydantic schemas define the SHAPE of data coming IN to the
# API (requests) and going OUT of the API (responses).
#
# DIFFERENCE FROM MODELS:
# - models.py  → Database tables (what PostgreSQL stores)
# - schemas.py → API data shapes (what JSON looks like over the wire)
#
# WHY WE NEED BOTH:
# The database User model contains hashed_password.
# We NEVER want to send hashed_password back in an API response.
# Pydantic schemas let us control exactly what fields are exposed.
#
# VALIDATION:
# Pydantic automatically validates incoming request data.
# If a required field is missing or the wrong type, it returns
# a clear 422 error to the client before the code even runs.
# ============================================================

from pydantic import BaseModel, EmailStr, Field, UUID4, ConfigDict
from typing import Optional
from datetime import datetime, date
from uuid import UUID
from models import UserRole  # Import the role enum from our models


# ── AUTH REQUEST SCHEMAS ───────────────────────────────────────
# These define what the client must send in the request body

class ClientRegistrationRequest(BaseModel):
    org_name: str = Field(..., min_length=2, max_length=255)
    org_code: str = Field(..., min_length=2, max_length=20)
    admin_name: str = Field(..., min_length=2, max_length=255)
    admin_username: str = Field(..., min_length=2, max_length=100)
    admin_password: str = Field(..., min_length=8)


class ImpersonateRequest(BaseModel):
    target_org_id: UUID4 = Field(..., description="The ID of the client organization to switch to")

class LoginRequest(BaseModel):
    """
    Data the frontend sends when a user tries to log in.

    LAN Mode:   only username + password are required
    Remote Mode: org_code + username + password are required
    """
    # org_code: The short organization identifier (e.g., "MUM-6135")
    # Optional because LAN users don't need to specify their organization —
    # the server already knows which organization it belongs to.
    org_code: Optional[str] = Field(
        default=None,
        description="Required for remote login. The organization's unique code."
    )

    # username: The login username — required always
    username: str = Field(
        ...,  # ... means REQUIRED — cannot be omitted
        min_length=1,
        max_length=100,
        description="The user's login username"
    )

    # password: The plain-text password (sent over HTTPS in production)
    # We never store this — we immediately hash it and compare
    password: str = Field(
        ...,
        min_length=1,
        description="The user's password"
    )

    # is_lan: Flag from the frontend indicating whether this is a LAN login.
    # If True, we skip org_code validation and use the local organization.
    is_lan: bool = Field(
        default=False,
        description="True if connecting via local network, False if remote"
    )


# ── PERMISSION SCHEMA ─────────────────────────────────────────
class ModulePermissionSchema(BaseModel):
    """
    The permission flags for a single ERP module.
    Mirrors the ModulePermission interface in the frontend's authStore.ts
    """
    view:    bool = False  # Can the user see this module?
    create:  bool = False  # Can the user create new records?
    edit:    bool = False  # Can the user edit existing records?
    delete:  bool = False  # Can the user delete records?
    approve: bool = False  # Can the user approve pending actions?


class UserPermissionsSchema(BaseModel):
    """
    The complete set of permissions for all ERP modules.
    One ModulePermissionSchema block per module.
    """
    finance:   ModulePermissionSchema = ModulePermissionSchema()
    inventory: ModulePermissionSchema = ModulePermissionSchema()
    sales:     ModulePermissionSchema = ModulePermissionSchema()
    crm:       ModulePermissionSchema = ModulePermissionSchema()
    hr:        ModulePermissionSchema = ModulePermissionSchema()
    reports:   ModulePermissionSchema = ModulePermissionSchema()
    settings:  ModulePermissionSchema = ModulePermissionSchema()


# ── USER PROFILE SCHEMA ───────────────────────────────────────
class UserProfileSchema(BaseModel):
    """
    The user profile data returned after a successful login.
    This is what gets stored in the frontend's authStore.

    IMPORTANT: hashed_password is deliberately NOT included here.
    Pydantic will never expose it in the response even though the
    User database model contains it.
    """
    id:          UUID                  # The user's database UUID
    name:        str                   # Full display name
    username:    str                   # Login username
    email:       Optional[str]         # Email (optional)
    role:        UserRole              # Role enum value
    organization_id:  UUID                  # The user's organization UUID
    org_name: str                  # Human-readable organization name
    org_code: str                  # Organization short code (e.g., "MUM-6135")
    is_am_user:  bool                  # True if belongs to AM organization
    permissions: UserPermissionsSchema # Full module permissions
    avatar_url:  Optional[str]         # Profile picture URL (optional)

    # model_config tells Pydantic to work with SQLAlchemy model objects
    # (called ORM mode). Without this, Pydantic can only read plain dicts.
    model_config = {"from_attributes": True}


# ── LOGIN RESPONSE SCHEMA ──────────────────────────────────────
class LoginResponse(BaseModel):
    """
    What the server sends back to the frontend after a successful login.
    Contains the JWT access token and the full user profile.
    """
    # access_token: The JWT string the frontend stores and sends
    # with every future API request in the Authorization header.
    # Format: "Bearer eyJhbGciOiJIUzI1NiIs..."
    access_token: str

    # token_type: Always "bearer" — part of the OAuth2 standard.
    # The frontend uses this to format the Authorization header correctly.
    token_type: str = "bearer"

    # expires_in: How many seconds until the token expires.
    # Frontend can use this to show a "session expiring" warning.
    expires_in: int

    # user: The complete user profile — stored in authStore on the frontend.
    user: UserProfileSchema


# ── ERROR RESPONSE SCHEMA ─────────────────────────────────────
class ErrorResponse(BaseModel):
    """
    Standard error response format.
    All API errors use this shape so the frontend always knows
    exactly where to find the error message.
    """
    detail: str

# ── BULLETIN SCHEMAS ──────────────────────────────────────────
class BulletinBase(BaseModel):
    title: str = Field(..., max_length=255)
    content: str
    priority: str = Field(default="general") # 'important' or 'general'

class BulletinCreate(BulletinBase):
    is_global: bool = False
    target_org_id: Optional[UUID] = None

class BulletinUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    content: Optional[str] = None
    priority: Optional[str] = None
    is_global: Optional[bool] = None

class BulletinResponse(BulletinBase):
    id: UUID
    organization_id: UUID
    author_id: UUID
    is_global: bool
    created_at: datetime
    updated_at: datetime
    author_name: str = Field(default="Unknown")

    model_config = ConfigDict(from_attributes=True)


# ── SALES (INVOICE) SCHEMAS ───────────────────────────────

class InvoiceItemBase(BaseModel):
    product_id: Optional[UUID4] = None
    product_name: str
    quantity: int
    rate: float
    igst_percent: float = 0.0
    line_total: float
    
    # Advanced ERP fields
    batch: Optional[str] = None
    expiry: Optional[str] = None
    mfg_date: Optional[str] = None
    sell_rate: Optional[float] = None
    mrp: Optional[float] = 0.0
    discount_percent: Optional[float] = 0.0
    margin_percent: Optional[str] = None

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItemResponse(InvoiceItemBase):
    id: UUID4
    invoice_id: UUID4
    model_config = ConfigDict(from_attributes=True)


class InvoiceBase(BaseModel):
    customer_name: str
    invoice_type: str = "bill"
    invoice_number: str
    subtotal: float
    tax_total: float
    grand_total: float
    
    # Advanced ERP fields
    party_inv_no: Optional[str] = None
    party_inv_date: Optional[str] = None
    due_date: Optional[str] = None
    remarks: Optional[str] = None
    dispatch_through: Optional[str] = None
    destination: Optional[str] = None
    bill_discount: Optional[float] = 0.0
    
    ledger1_name: Optional[str] = None
    ledger1_amt: Optional[float] = None
    ledger2_name: Optional[str] = None
    ledger2_amt: Optional[float] = None
    ledger3_name: Optional[str] = None
    ledger3_amt: Optional[float] = None

class InvoiceCreate(InvoiceBase):
    items: list[InvoiceItemCreate]

class InvoiceResponse(InvoiceBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    date: datetime
    items: list[InvoiceItemResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

# ── HEALTH CHECK SCHEMA ───────────────────────────────────────
class HealthResponse(BaseModel):
    """
    Response from the GET /health endpoint.
    The frontend calls this on startup to confirm the server is running.
    """
    status: str       # "ok" if server is running normally
    version: str      # Current API version (e.g., "1.0.0")
    database: str     # "connected" or "disconnected" — DB health status
    timestamp: datetime  # Current server timestamp

# ── PRODUCT (INVENTORY) SCHEMAS ───────────────────────────────
































class ProductBase(BaseModel):
    # Base
    status: str = "continue"
    hide: str = "no"
    code: str
    name: str
    packing: Optional[str] = None
    unit: Optional[str] = None
    colour_type: str = "normal"
    item_type: str = "normal"
    company_name: Optional[str] = None
    salt: Optional[str] = None
    
    # DOC-11 Fields
    base_uom: Optional[str] = "EACH"
    purchase_uom: Optional[str] = None
    sales_uom: Optional[str] = None
    pack_size: Optional[str] = None
    track_batch: bool = True
    tax_rule_id: Optional[str] = None
    
    # Taxes & HSN
    hsn_applicable: str = "no"
    hsn_code: Optional[str] = None
    local_tax: str = "taxable"
    central_tax: str = "taxable"
    sgst_percent: float = 0.0
    cgst_percent: float = 0.0
    igst_percent: float = 0.0
    
    # Pricing
    mrp: float = 0.0
    p_rate: float = 0.0
    pts_rate: float = 0.0
    rate_a: float = 0.0
    ptr_rate: float = 0.0
    item_discount_percent: float = 0.0
    discount_type: str = "applicable"
    category: str = "na"
    min_stock_level: int = 0
    reorder_quantity: int = 0
    is_active: bool = True


class ProductPrincipalMappingBase(BaseModel):
    principal_code: str
    principal_name: Optional[str] = None
    principal_uom: Optional[str] = None
    principal_pack: Optional[str] = None

class ProductPrincipalMappingCreate(ProductPrincipalMappingBase):
    product_id: UUID4

class ProductPrincipalMappingResponse(ProductPrincipalMappingBase):
    id: UUID4
    product_id: UUID4
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ── MASTER DATA SCHEMAS ────────────────────────────────────────

class StationBase(BaseModel):
    name: str
    is_active: bool = True

class StationCreate(StationBase):
    pass

class StationResponse(StationBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LedgerBase(BaseModel):
    name: str
    group_name: Optional[str] = None
    group_id: Optional[UUID] = None
    mobile: Optional[str] = None
    state: Optional[str] = None
    opening_balance: float = 0
    op_type: str = 'Dr'
    closing_balance: float = 0
    cl_type: str = 'Dr'
    
    station: Optional[str] = None
    plot_no: Optional[str] = None
    locality: Optional[str] = None
    road_street: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    pincode: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    contact_person: Optional[str] = None
    phone_number: Optional[str] = None
    freeze_upto: float = 0
    dl_no: Optional[str] = None
    restrict_item: Optional[str] = None
    ledger_type: Optional[str] = 'Unregistered'
    gstin: Optional[str] = None
    tax_type: Optional[str] = None
    pan_no: Optional[str] = None
    ledger_date: Optional[datetime] = None
    colour: Optional[str] = None
    is_active: bool = True

class LedgerCreate(LedgerBase):
    pass

class LedgerResponse(LedgerBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SaltBase(BaseModel):
    formula: str
    indications: Optional[str] = None
    dosage: Optional[str] = None
    side_effects: Optional[str] = None
    precautions: Optional[str] = None
    labels: Optional[str] = None
    is_active: bool = True

class SaltCreate(SaltBase):
    pass

class SaltResponse(SaltBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ManufacturerBase(BaseModel):
    name: str
    short_code: Optional[str] = None
    status: str = 'continue'
    prohibited: bool = False
    default_discount: float = 0
    
    room_no: Optional[str] = None
    floor: Optional[str] = None
    rack_no: Optional[str] = None
    rack_row_no: Optional[str] = None
    dump_days: Optional[int] = 0
    
    is_supplier: bool = False
    supplier_ledger_id: Optional[UUID4] = None
    
    email: Optional[str] = None
    cc: Optional[str] = None
    bcc: Optional[str] = None
    website: Optional[str] = None
    contact_number: Optional[str] = None
    field_staff_name: Optional[str] = None
    field_staff_contact: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True

class ManufacturerCreate(ManufacturerBase):
    pass

class ManufacturerResponse(ManufacturerBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class HSNCodeBase(BaseModel):
    code: str
    description: Optional[str] = None
    igst: float = 0
    cgst: float = 0
    sgst: float = 0
    type: str = "Goods"
    is_active: bool = True

class HSNCodeCreate(HSNCodeBase):
    pass

class HSNCodeResponse(HSNCodeBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class StateCodeBase(BaseModel):
    name: str
    gst_code: Optional[str] = None
    capital: Optional[str] = None
    is_active: bool = True

class StateCodeCreate(StateCodeBase):
    pass

class StateCodeResponse(StateCodeBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
class BatchResponse(BaseModel):
    id: UUID4
    product_id: UUID4
    batch_number: str
    expiry: Optional[str] = None
    mfg_date: Optional[str] = None
    sell_rate: Optional[float] = None
    mrp: float
    rate: float
    rate_a: float = 0
    rate_b: float = 0
    rate_c: float = 0
    cost: float
    current_stock: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# -- LEDGER GROUP SCHEMAS --
class LedgerGroupBase(BaseModel):
    name: str
    parent_id: Optional[UUID] = None
    class_type: str = "Asset"
    is_system: bool = False
    is_active: bool = True

class LedgerGroupCreate(LedgerGroupBase):
    pass

class LedgerGroupResponse(LedgerGroupBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

# -- VOUCHER ENTRY SCHEMAS (V2) --
class VoucherEntryBase(BaseModel):
    ledger_id: UUID
    cr_dr: str
    amount: Decimal
    ledger_name: Optional[str] = None  # Denormalized for display

class VoucherEntryCreate(VoucherEntryBase):
    pass

class VoucherEntryResponse(VoucherEntryBase):
    id: UUID
    class Config:
        from_attributes = True

# -- VOUCHER SCHEMAS (V2) --
class VoucherBase(BaseModel):
    voucher_type: str
    voucher_number: Optional[str] = None  # Auto-generated if not provided
    date: datetime
    narration: Optional[str] = None
    total_amount: Decimal
    is_active: bool = True

class VoucherCreate(VoucherBase):
    entries: List[VoucherEntryCreate]
    fiscal_year_id: Optional[UUID] = None
    ref_invoice_id: Optional[UUID] = None

class VoucherResponse(VoucherBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    status: str = 'Active'
    fiscal_year_id: Optional[UUID] = None
    ref_invoice_id: Optional[UUID] = None
    cancelled_at: Optional[datetime] = None
    reversal_voucher_id: Optional[UUID] = None
    entries: List[VoucherEntryResponse]
    class Config:
        from_attributes = True

class VoucherListQuery(BaseModel):
    """Query parameters for filtering voucher lists"""
    voucher_type: Optional[str] = None
    from_date: Optional[str] = None  # ISO date string
    to_date: Optional[str] = None
    ledger_id: Optional[UUID] = None
    status: Optional[str] = None  # Active, Cancelled
    search: Optional[str] = None  # Search narration/voucher_number
    skip: int = 0
    limit: int = 50

# -- FISCAL YEAR SCHEMAS --
class FiscalYearCreate(BaseModel):
    name: str  # e.g. "2025-26"
    start_date: str  # ISO date e.g. "2025-04-01"
    end_date: str  # ISO date e.g. "2026-03-31"
    is_active: bool = True

class FiscalYearResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    start_date: str
    end_date: str
    is_active: bool
    is_locked: bool
    created_at: datetime
    class Config:
        from_attributes = True

class FiscalYearSwitchRequest(BaseModel):
    fiscal_year_id: UUID

# -- LEDGER BALANCE (PER FISCAL YEAR) SCHEMAS --
class LedgerBalanceResponse(BaseModel):
    id: UUID
    ledger_id: UUID
    fiscal_year_id: UUID
    opening_balance: Decimal
    op_type: str
    closing_balance: Decimal
    cl_type: str
    class Config:
        from_attributes = True

# -- VOUCHER SEQUENCE SCHEMAS --
class NextVoucherNumberResponse(BaseModel):
    voucher_type: str
    next_number: str
    prefix: str

# -- CARRY FORWARD SCHEMAS --
class CarryForwardRequest(BaseModel):
    source_fiscal_year_id: UUID
    target_fiscal_year_id: UUID

class CarryForwardResponse(BaseModel):
    ledgers_carried: int
    message: str

# -- CHART OF ACCOUNTS SEEDING --
class SeedChartOfAccountsResponse(BaseModel):
    groups_created: int
    message: str

# =============================================
# REPORTING SCHEMAS
# =============================================

# -- DAY BOOK --
class DayBookEntry(BaseModel):
    voucher_id: UUID
    voucher_number: str
    voucher_type: str
    date: datetime
    narration: Optional[str] = None
    total_amount: Decimal
    status: str
    entries: List[VoucherEntryResponse]

class DayBookResponse(BaseModel):
    from_date: str
    to_date: str
    vouchers: List[DayBookEntry]
    total_dr: Decimal
    total_cr: Decimal

# -- LEDGER STATEMENT / ACCOUNT REGISTER --
class LedgerStatementEntry(BaseModel):
    date: datetime
    voucher_id: UUID
    voucher_number: str
    voucher_type: str
    particulars: str  # Contra ledger name(s)
    dr_amount: Optional[Decimal] = None
    cr_amount: Optional[Decimal] = None
    running_balance: Decimal
    balance_type: str  # 'Dr' or 'Cr'

class LedgerStatementResponse(BaseModel):
    ledger_id: UUID
    ledger_name: str
    from_date: str
    to_date: str
    opening_balance: Decimal
    opening_type: str
    entries: List[LedgerStatementEntry]
    closing_balance: Decimal
    closing_type: str
    total_dr: Decimal
    total_cr: Decimal

# -- TRIAL BALANCE --
class TrialBalanceRow(BaseModel):
    ledger_id: UUID
    ledger_name: str
    group_name: Optional[str] = None
    dr_total: Decimal
    cr_total: Decimal
    closing_balance: Decimal
    balance_type: str  # 'Dr' or 'Cr'

class TrialBalanceResponse(BaseModel):
    as_of_date: str
    fiscal_year_name: Optional[str] = None
    rows: List[TrialBalanceRow]
    grand_dr_total: Decimal
    grand_cr_total: Decimal

# -- PROFIT & LOSS --
class PLRow(BaseModel):
    group_name: str
    ledger_name: Optional[str] = None
    amount: Decimal
    is_group_total: bool = False

class PLResponse(BaseModel):
    from_date: str
    to_date: str
    income_items: List[PLRow]
    expense_items: List[PLRow]
    total_income: Decimal
    total_expense: Decimal
    net_profit_or_loss: Decimal
    result_type: str  # 'Profit' or 'Loss'

# -- BALANCE SHEET --
class BalanceSheetRow(BaseModel):
    group_name: str
    ledger_name: Optional[str] = None
    amount: Decimal
    is_group_total: bool = False

class BalanceSheetResponse(BaseModel):
    as_of_date: str
    liabilities: List[BalanceSheetRow]
    assets: List[BalanceSheetRow]
    total_liabilities: Decimal
    total_assets: Decimal

# -- ERROR ENTRY (DRAFT) SCHEMAS --
class ErrorEntryBase(BaseModel):
    module_name: str
    json_payload: str

class ErrorEntryCreate(ErrorEntryBase):
    pass

class ErrorEntryResponse(ErrorEntryBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    restart_count_at_creation: int
    class Config:
        from_attributes = True


# ── BILL-BY-BILL ALLOCATION SCHEMAS ──────────────────────────────────

class AllocationItemCreate(BaseModel):
    """
    A single allocation line within a Receipt/Payment allocation request.
    The user can allocate against an Invoice, a CN/DN, or leave it floating.

    RULES:
    - If target_invoice_id is set: this settles (part of) an Invoice.
    - If target_cn_dn_id is set: this settles (part of) a Credit/Debit Note.
    - If BOTH are None: this is a Floating / On Account advance.
    - allocated_amount can be negative to offset a prior mistake (append-only).
    """
    target_invoice_id: Optional[UUID] = Field(
        None, description="The Sales/Purchase Invoice ID being settled"
    )
    target_cn_dn_id: Optional[UUID] = Field(
        None, description="The Credit Note or Debit Note voucher ID being settled"
    )
    allocated_amount: Decimal = Field(
        ..., description="Amount allocated in this line (negative for offset corrections)"
    )
    narration: Optional[str] = Field(
        None, max_length=500, description="Optional note for audit trail"
    )


class AllocationCreate(BaseModel):
    """
    Top-level request body for creating allocations from a single
    Receipt/Payment Voucher. Contains one or more allocation lines.

    The API must validate:
    - SUM(allocated_amount) <= source voucher's total_amount
    - Each target_invoice_id or target_cn_dn_id exists and belongs to the same org
    - Any line with both targets as None is automatically marked is_floating=True
    """
    source_voucher_id: UUID = Field(
        ..., description="The Receipt or Payment Voucher being allocated"
    )
    allocations: List[AllocationItemCreate] = Field(
        ..., min_length=1, description="One or more allocation lines"
    )


class AllocationRead(BaseModel):
    """
    Response schema for a single allocation row.
    Returned when reading allocation history for a voucher or invoice.
    """
    id: UUID
    organization_id: UUID
    created_at: datetime
    source_voucher_id: UUID
    target_invoice_id: Optional[UUID] = None
    target_cn_dn_id: Optional[UUID] = None
    allocated_amount: Decimal
    is_floating: bool
    narration: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AllocationSummary(BaseModel):
    """
    Summary view for the "Pending Allocations" screen.
    Shows a voucher or invoice with its total amount and how much
    has been allocated vs. how much remains outstanding.
    """
    id: UUID
    voucher_number: Optional[str] = None
    invoice_number: Optional[str] = None
    date: Optional[datetime] = None
    total_amount: Decimal
    allocated_total: Decimal = Field(
        default=Decimal("0"), description="Sum of all allocated_amount rows"
    )
    outstanding: Decimal = Field(
        default=Decimal("0"), description="total_amount - allocated_total"
    )
    document_type: str = Field(
        ..., description="'Invoice', 'Receipt', 'Payment', 'CN', 'DN', 'Floating'"
    )


# ── CRM PERMISSIONS MATRIX SCHEMAS ────────────────────────────
# Used by GET/PUT /api/organizations/{org_id}/permissions

class OrganizationPermissionsResponse(BaseModel):
    """
    Returns the role_permissions JSONB for a single organization.
    Maps role names to lists of allowed module strings.
    Example: { "manager": ["sales", "inventory"], "staff": ["sales"] }
    """
    org_id: UUID
    org_name: str
    role_permissions: Optional[Dict[str, List[str]]] = None

    class Config:
        from_attributes = True


class OrganizationPermissionsUpdate(BaseModel):
    """
    Accepts a full replacement of the role_permissions JSONB.
    The frontend sends the entire permissions object on every save.
    """
    role_permissions: Dict[str, List[str]] = Field(
        ..., description="Map of role name → list of allowed module slugs"
    )



# -- DOC-10: Business Partner / Party Master ------------------------
from typing import List

class PartyAddressBase(BaseModel):
    address_type: str
    is_default: bool = False
    line1: str
    line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: str = "India"

class PartyAddressCreate(PartyAddressBase):
    pass

class PartyAddressResponse(PartyAddressBase):
    id: UUID
    party_id: UUID

    class Config:
        orm_mode = True

class CustomerProfileBase(BaseModel):
    route_id: Optional[str] = None
    credit_limit: float = 0
    credit_days: int = 0
    price_list: Optional[str] = None

class SupplierProfileBase(BaseModel):
    payment_terms: Optional[str] = None
    lead_time_days: int = 0
    supplier_rating: Optional[str] = None

class CustomerProfileCreate(CustomerProfileBase):
    pass

class SupplierProfileCreate(SupplierProfileBase):
    pass

class CustomerProfileResponse(CustomerProfileBase):
    party_id: UUID
    ledger_id: Optional[UUID] = None

    class Config:
        orm_mode = True

class SupplierProfileResponse(SupplierProfileBase):
    party_id: UUID
    ledger_id: Optional[UUID] = None

    class Config:
        orm_mode = True

class PartyBase(BaseModel):
    legal_name: str
    trade_name: Optional[str] = None
    pan: Optional[str] = None
    gst: Optional[str] = None
    status: str = 'active'

class PartyCreate(PartyBase):
    addresses: List[PartyAddressCreate] = []
    customer_profile: Optional[CustomerProfileCreate] = None
    supplier_profile: Optional[SupplierProfileCreate] = None
    
    # Customer Ledger Info
    create_customer_ledger: bool = False
    customer_ledger_group_id: Optional[UUID] = None
    customer_opening_balance: float = 0
    customer_op_type: str = "Dr"
    
    # Supplier Ledger Info
    create_supplier_ledger: bool = False
    supplier_ledger_group_id: Optional[UUID] = None
    supplier_opening_balance: float = 0
    supplier_op_type: str = "Cr"

class PartyResponse(PartyBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime
    addresses: List[PartyAddressResponse] = []
    customer_profile: Optional[CustomerProfileResponse] = None
    supplier_profile: Optional[SupplierProfileResponse] = None

    class Config:
        orm_mode = True


# ============================================================
# DOC-12: Principal Master Schemas
# ============================================================

class PrincipalBase(BaseModel):
    code: str
    legal_name: str
    brand: Optional[str] = None
    gstin: Optional[str] = None
    status: str = "active"

class PrincipalCreate(PrincipalBase):
    pass

class PrincipalResponse(PrincipalBase):
    id: UUID
    organization_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class PrincipalAgreementBase(BaseModel):
    version_name: str
    valid_from: datetime
    valid_to: Optional[datetime] = None
    commission_percent: float = 0
    handling_percent: float = 0
    is_active: bool = True

class PrincipalAgreementCreate(PrincipalAgreementBase):
    principal_id: UUID

class PrincipalAgreementResponse(PrincipalAgreementBase):
    id: UUID
    organization_id: UUID
    principal_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class PrincipalWarehouseMappingCreate(BaseModel):
    principal_id: UUID
    warehouse_id: UUID

class PrincipalWarehouseMappingResponse(BaseModel):
    id: UUID
    organization_id: UUID
    principal_id: UUID
    warehouse_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# DOC-13: Warehouse & Transport Schemas
# ============================================================

# -- WAREHOUSE --
class WarehouseBinBase(BaseModel):
    code: str
    aisle: Optional[str] = None
    rack: Optional[str] = None
    shelf: Optional[str] = None
    bin_number: Optional[str] = None
    status: str = "available"

class WarehouseBinCreate(WarehouseBinBase):
    zone_id: UUID

class WarehouseBinResponse(WarehouseBinBase):
    id: UUID
    organization_id: UUID
    warehouse_id: UUID
    zone_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class WarehouseZoneBase(BaseModel):
    code: str
    name: str
    storage_type: Optional[str] = None
    status: str = "active"

class WarehouseZoneCreate(WarehouseZoneBase):
    pass

class WarehouseZoneResponse(WarehouseZoneBase):
    id: UUID
    organization_id: UUID
    warehouse_id: UUID
    created_at: datetime
    bins: List[WarehouseBinResponse] = []
    class Config:
        from_attributes = True

class WarehouseBase(BaseModel):
    code: str
    name: str
    address: Optional[str] = None
    manager_name: Optional[str] = None
    status: str = "active"

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseResponse(WarehouseBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    zones: List[WarehouseZoneResponse] = []
    default_receiving_bin_id: Optional[UUID] = None
    default_dispatch_bin_id: Optional[UUID] = None
    default_returns_bin_id: Optional[UUID] = None
    class Config:
        from_attributes = True


# -- TRANSPORT --
class VehicleBase(BaseModel):
    registration_number: str
    vehicle_type: Optional[str] = None
    capacity_kg: Optional[float] = None
    driver_name: Optional[str] = None
    status: str = "active"

class VehicleCreate(VehicleBase):
    transporter_id: UUID

class VehicleResponse(VehicleBase):
    id: UUID
    organization_id: UUID
    transporter_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class TransporterBase(BaseModel):
    code: str
    name: str
    gstin: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    status: str = "active"

class TransporterCreate(TransporterBase):
    pass

class TransporterResponse(TransporterBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    vehicles: List[VehicleResponse] = []
    class Config:
        from_attributes = True


# ============================================================
# DOC-14: Scheme & Free Goods Engine
# ============================================================

class SchemeVersionBase(BaseModel):
    version_number: int = 1
    valid_from: date
    valid_to: date
    buy_qty: float
    free_qty: float
    status: str = "active"

class SchemeVersionCreate(SchemeVersionBase):
    product_id: UUID

class SchemeVersionResponse(SchemeVersionBase):
    id: UUID
    scheme_id: UUID
    product_id: UUID
    class Config:
        from_attributes = True

class SchemeBase(BaseModel):
    code: str
    name: str
    scheme_type: str
    status: str = "active"

class SchemeCreate(SchemeBase):
    principal_id: UUID

class SchemeResponse(SchemeBase):
    id: UUID
    principal_id: UUID
    versions: List[SchemeVersionResponse] = []
    class Config:
        from_attributes = True

class EntitlementBase(BaseModel):
    granted_qty: float
    status: str = "active"

class EntitlementCreate(EntitlementBase):
    scheme_version_id: UUID

class EntitlementResponse(EntitlementBase):
    id: UUID
    organization_id: UUID
    scheme_version_id: UUID
    consumed_qty: float
    claimable_qty: float
    created_at: datetime
    class Config:
        from_attributes = True

class SchemeClaimBase(BaseModel):
    claim_number: str
    claim_date: date
    total_claim_qty: float
    status: str = "pending"

class SchemeClaimCreate(SchemeClaimBase):
    principal_id: UUID

class SchemeClaimResponse(SchemeClaimBase):
    id: UUID
    organization_id: UUID
    principal_id: UUID
    settled_qty: float
    created_at: datetime
    class Config:
        from_attributes = True


# ============================================================
# DOC-15: Pricing, Rate, MRP & Formula Engine
# ============================================================

class PriceListRuleBase(BaseModel):
    product_id: UUID
    valid_from: date
    valid_to: date
    fixed_price: float

class PriceListRuleCreate(PriceListRuleBase):
    pass

class PriceListRuleResponse(PriceListRuleBase):
    id: UUID
    price_list_id: UUID
    class Config:
        from_attributes = True

class PriceListBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    status: str = "active"

class PriceListCreate(PriceListBase):
    pass

class PriceListResponse(PriceListBase):
    id: UUID
    organization_id: UUID
    rules: List[PriceListRuleResponse] = []
    created_at: datetime
    class Config:
        from_attributes = True

class PriceFormulaBase(BaseModel):
    target_rate_type: str
    source_rate_type: str
    operator: str
    operand: float
    floor_price: Optional[float] = None
    status: str = "active"

class PriceFormulaCreate(PriceFormulaBase):
    pass

class PriceFormulaResponse(PriceFormulaBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class CustomerPriceConfigBase(BaseModel):
    party_id: UUID
    default_rate_type: Optional[str] = None
    price_list_id: Optional[UUID] = None

class CustomerPriceConfigCreate(CustomerPriceConfigBase):
    pass

class CustomerPriceConfigResponse(CustomerPriceConfigBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True


# DOC-16: Inventory & Claims Schemas

class StockStatusEnum(str, enum.Enum):
    SELLABLE = "SELLABLE"
    EXPIRED = "EXPIRED"
    BREAKAGE = "BREAKAGE"
    QUARANTINE = "QUARANTINE"
    BLOCKED = "BLOCKED"
    SCRAP = "SCRAP"
    VENDOR_RETURN_PENDING = "VENDOR_RETURN_PENDING"

class SupplyClassificationEnum(str, enum.Enum):
    NORMAL = "NORMAL"
    SPECIAL = "SPECIAL"
    UNDERCUTTING = "UNDERCUTTING"
    NON_REORDER = "NON_REORDER"

class StockPositionBase(BaseModel):
    warehouse_id: Optional[UUID4] = None
    product_id: UUID4
    batch_id: Optional[UUID4] = None
    principal_owner_id: Optional[UUID4] = None
    status: StockStatusEnum = StockStatusEnum.SELLABLE
    classification: SupplyClassificationEnum = SupplyClassificationEnum.NORMAL
    quantity: float = 0.0
    reserved_quantity: float = 0.0

class StockPositionCreate(StockPositionBase):
    organization_id: UUID4

class StockPositionResponse(StockPositionBase):
    id: UUID4
    organization_id: UUID4
    
    class Config:
        orm_mode = True

class CustomerClaimItemBase(BaseModel):
    product_id: UUID4
    batch_id: UUID4
    quantity: float

class CustomerClaimBase(BaseModel):
    customer_id: UUID4
    claim_type: str
    status: str = "QUARANTINED"
    items: List[CustomerClaimItemBase]

class VendorClaimItemBase(BaseModel):
    product_id: UUID4
    batch_id: UUID4
    quantity: float
    source_receipt_id: Optional[str] = None

class VendorClaimBase(BaseModel):
    vendor_id: UUID4
    claim_type: str
    status: str = "SUBMITTED"
    items: List[VendorClaimItemBase]

class ReorderRuleBase(BaseModel):
    product_id: Optional[UUID4] = None
    formula: str
    safety_stock: float = 0.0
    lead_time_days: int = 0

class ReorderRuleCreate(ReorderRuleBase):
    pass

class ReorderRuleResponse(ReorderRuleBase):
    id: UUID4
    organization_id: UUID4
    
    class Config:
        orm_mode = True
        
class PurchaseProposalBase(BaseModel):
    product_id: UUID4
    suggested_qty: float
    explanation: Optional[str] = None
    status: str = "DRAFT"
    
class PurchaseProposalResponse(PurchaseProposalBase):
    id: UUID4
    created_at: datetime
    
    class Config:
        orm_mode = True


# =====================================================================
# DOC-17: Procurement Schemas (POs, Rules, Complaints)
# =====================================================================

class VendorSupplyRuleBase(BaseModel):
    product_id: UUID4
    vendor_id: UUID4
    rule_type: str
    is_active: bool = True

class VendorSupplyRuleCreate(VendorSupplyRuleBase):
    pass

class VendorSupplyRuleResponse(VendorSupplyRuleBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderItemBase(BaseModel):
    product_id: Optional[UUID4] = None
    product_name: str
    quantity: int
    received_qty: int = 0
    rate: Decimal
    line_total: Decimal

class PurchaseOrderBase(BaseModel):
    po_number: str
    date: datetime
    vendor_id: UUID4
    status: str = "DRAFT"
    expected_delivery: Optional[datetime] = None
    supply_classification: Optional[str] = None
    total_amount: Decimal = Decimal('0.00')

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemBase]

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: UUID4
    po_id: UUID4
    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderResponse(PurchaseOrderBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    items: List[PurchaseOrderItemResponse] = []
    model_config = ConfigDict(from_attributes=True)

class VendorComplaintBase(BaseModel):
    complaint_number: str
    vendor_id: UUID4
    category: str
    status: str = "OPEN"
    severity: str = "MEDIUM"
    description: Optional[str] = None
    related_document_id: Optional[UUID4] = None

class VendorComplaintCreate(VendorComplaintBase):
    pass

class VendorComplaintResponse(VendorComplaintBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    resolved_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)



# =====================================================================
# DOC-18: Sales Order Management Schemas
# =====================================================================

class SalesOrderItemBase(BaseModel):
    product_id: Optional[UUID4] = None
    product_name: str
    quantity: int
    allocated_qty: int = 0
    rate: Decimal
    line_total: Decimal

class SalesOrderBase(BaseModel):
    order_number: str
    date: datetime
    party_id: UUID4
    status: str = "DRAFT"
    total_amount: Decimal = Decimal('0.00')

class SalesOrderCreate(SalesOrderBase):
    items: List[SalesOrderItemBase]

class SalesOrderHoldBase(BaseModel):
    hold_reason: str
    status: str = "ACTIVE"

class SalesOrderHoldResponse(SalesOrderHoldBase):
    id: UUID4
    order_id: UUID4
    organization_id: UUID4
    created_at: datetime
    cleared_at: Optional[datetime] = None
    cleared_by_user_id: Optional[UUID4] = None
    model_config = ConfigDict(from_attributes=True)

class SalesOrderItemResponse(SalesOrderItemBase):
    id: UUID4
    order_id: UUID4
    model_config = ConfigDict(from_attributes=True)

class SalesOrderResponse(SalesOrderBase):
    id: UUID4
    organization_id: UUID4
    created_by_user_id: Optional[UUID4] = None
    created_at: datetime
    items: List[SalesOrderItemResponse] = []
    holds: List[SalesOrderHoldResponse] = [] # Optional, maybe fetched separately or joined
    model_config = ConfigDict(from_attributes=True)

