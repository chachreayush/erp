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

from pydantic import BaseModel, EmailStr, Field, UUID4
from typing import Optional
from datetime import datetime
from uuid import UUID
from models import UserRole  # Import the role enum from our models


# ── AUTH REQUEST SCHEMAS ───────────────────────────────────────
# These define what the client must send in the request body

class LoginRequest(BaseModel):
    """
    Data the frontend sends when a user tries to log in.

    LAN Mode:   only username + password are required
    Remote Mode: company_code + username + password are required
    """
    # company_code: The short company identifier (e.g., "MUM-6135")
    # Optional because LAN users don't need to specify their company —
    # the server already knows which company it belongs to.
    company_code: Optional[str] = Field(
        default=None,
        description="Required for remote login. The company's unique code."
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
    # If True, we skip company_code validation and use the local company.
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
    company_id:  UUID                  # The user's company UUID
    company_name: str                  # Human-readable company name
    company_code: str                  # Company short code (e.g., "MUM-6135")
    is_am_user:  bool                  # True if belongs to AM company
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
    detail: str  # The human-readable error message (e.g., "Invalid password")


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
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    price: Optional[str] = None
    stock: str = "0"
    status: str = "active"

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: UUID4
    company_id: UUID4
    created_at: datetime

    model_config = {"from_attributes": True}
