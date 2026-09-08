from decimal import Decimal
from typing import List
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
from datetime import datetime
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

