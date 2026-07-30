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
    admin_password: str = Field(..., min_length=4)


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

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItemResponse(InvoiceItemBase):
    id: UUID4
    invoice_id: UUID4
    model_config = ConfigDict(from_attributes=True)


class InvoiceBase(BaseModel):
    customer_name: str
    invoice_number: str
    subtotal: float
    tax_total: float
    grand_total: float

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
    org_name: Optional[str] = None
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

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ── MASTER DATA SCHEMAS ────────────────────────────────────────

class LedgerBase(BaseModel):
    name: str
    group_name: str
    mobile: Optional[str] = None
    state: Optional[str] = None
    opening_balance: float = 0
    op_type: str = 'Dr'
    closing_balance: float = 0
    cl_type: str = 'Dr'

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
    default_discount: float = 0
    supplier: Optional[str] = None

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

class StateCodeCreate(StateCodeBase):
    pass

class StateCodeResponse(StateCodeBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
