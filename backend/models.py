# ============================================================
# models.py — Database Table Definitions (SQLAlchemy ORM)
# ============================================================
# This file defines the structure of every table in the
# PostgreSQL database using Python classes.
#
# WHAT IS AN ORM?
# ORM = Object-Relational Mapper. Instead of writing raw SQL
# like "CREATE TABLE users (...)", we write Python classes.
# SQLAlchemy translates these classes into real SQL tables.
#
# BENEFIT: We can interact with the database using Python
# objects (e.g., user.name = "Rahul") instead of SQL strings.
# This is safer, cleaner, and less error-prone.
#
# SPRINT 2 TABLES:
# 1. Organization  — Stores AM + all CM organizations
# 2. User     — All user accounts across all organizations
# 3. Session  — Active login sessions (JWT tracking)
# ============================================================

# Column types and relationships from SQLAlchemy
from sqlalchemy import (
    UniqueConstraint,
    Column,          # Defines a table column
    String,          # Text column (variable length)
    Boolean,         # True/False column
    DateTime,        # Date + time column
    ForeignKey,      # Links one table to another (relationship)
    Text,            # Long text column (for descriptions)
    Enum as SAEnum,  # A column that only accepts specific values
    Integer,
    Numeric,
    Float,
    JSON
)
from sqlalchemy.orm import relationship  # Defines relationships between tables
from sqlalchemy.dialects.postgresql import UUID, JSONB  # PostgreSQL-specific types
from database import Base  # The declarative base all models inherit from
import uuid                # Python standard library for generating UUIDs
from datetime import datetime, date  # For timestamps and dates
import enum                # Python standard library for enum definitions


# ── PYTHON ENUMS ──────────────────────────────────────────────
# These define the exact values a column is allowed to have.
# The database enforces these — invalid values are rejected.

class UserRole(str, enum.Enum):
    """
    Defines all possible user roles in the system.
    Inherits from str so these values work cleanly with JSON/Pydantic.
    """
    AM_ADMIN     = "am_admin"      # Account Master Admin — God mode
    CM_ADMIN     = "cm_admin"      # Client Module Admin
    MANAGER      = "manager"       # Manager — approvals, team view
    AREA_MANAGER = "area_manager"  # Regional/sales manager
    STAFF        = "staff"         # Standard ERP staff
    FIELD_STAFF  = "field_staff"   # Field/mobile staff
    VIEWER       = "viewer"        # Read-only access


# ── TABLE 1: Organization ──────────────────────────────────────────
class Organization(Base):
    """
    Stores every organization in the system.
    There is ONE AM organization (the software owner) and MANY CM organizations (clients).

    DATA ISOLATION RULE: Every piece of data in every other table
    has a organization_id that links it back to this table. This ensures
    data from Organization A can NEVER be seen by Organization B users.

    Table name in PostgreSQL: 'organizations'
    """
    __tablename__ = "organizations"  # The actual name of the table in the database

    # ── COLUMNS ─────────────────────────────────────────────────

    # id: Primary key — a UUID (universally unique ID like "a3b4c5...")
    # Uses PostgreSQL's native UUID type for guaranteed uniqueness.
    # default=uuid.uuid4 means a new random UUID is auto-generated
    # whenever a new organization is created — we never set this manually.
    id = Column(
        UUID(as_uuid=True),      # UUID type (stored as 128-bit value in DB)
        primary_key=True,        # This is the primary key (must be unique)
        default=uuid.uuid4,      # Auto-generate a new UUID on creation
        nullable=False           # Cannot be empty
    )

    # name: The full organization name shown in the UI
    # e.g., "Mumbai Traders Pvt Ltd"
    name = Column(String(255), nullable=False)

    # org_code: The short unique code used for remote login
    # e.g., "MUM-6135" — users type this when logging in remotely
    # unique=True ensures no two organizations can have the same code
    org_code = Column(String(20), unique=True, nullable=False, index=True)

    # is_am: Flags whether this is the Account Master organization.
    # Only ONE organization in the entire system should have is_am=True.
    # The AM organization's admin can see ALL organizations' data.
    is_am = Column(Boolean, default=False, nullable=False)

    # address: Optional physical address of the organization
    address = Column(Text, nullable=True)

    # phone: Contact phone number
    phone = Column(String(20), nullable=True)

    # email: Primary contact email for the organization
    email = Column(String(255), nullable=True)

    # is_active: Soft delete flag.
    # Instead of deleting a organization from the database (which would
    # orphan all their data), we set is_active=False to "deactivate" them.
    is_active = Column(Boolean, default=True, nullable=False)

    # created_at: When this organization record was created.
    # default=datetime.utcnow means the timestamp is set automatically.
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # role_permissions: JSONB column storing granular module-level access per role.
    # Example value:
    # {
    #   "manager": ["sales", "purchase", "inventory", "reports"],
    #   "staff": ["sales", "inventory"],
    #   "viewer": ["reports"]
    # }
    # If NULL, all roles get default full access.
    role_permissions = Column(JSONB, nullable=True)

    # ── RELATIONSHIPS ───────────────────────────────────────────
    # A organization has many users. This line creates a list of all
    # users belonging to this organization. (Not stored in the db directly,
    # SQLAlchemy builds this list for us on the fly).
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    
    # A organization has many products (Inventory).
    products = relationship("Product", back_populates="organization", cascade="all, delete-orphan")

    def __repr__(self):
        """String representation for debugging — shows in logs and Python shell"""
        return f"<Organization {self.org_code}: {self.name}>"


# ── TABLE 2: User ─────────────────────────────────────────────
class User(Base):
    """
    Stores every user account in the system across all organizations.

    SECURITY NOTE: Passwords are NEVER stored as plain text.
    Only the bcrypt-hashed version is stored. Even if someone
    steals the database, they cannot recover original passwords.

    Table name in PostgreSQL: 'users'
    """
    __tablename__ = "users"

    # ── COLUMNS ─────────────────────────────────────────────────

    # id: Primary key UUID — auto-generated, never set manually
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)

    # organization_id: Foreign key linking this user to their organization.
    # ForeignKey("organizations.id") means this value must exist in
    # the 'id' column of the 'organizations' table.
    # If a organization is deleted, what happens to their users?
    # ondelete="CASCADE" means users are deleted too — no orphaned records.
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True  # Add index for fast lookups by organization
    )

    # name: Full display name (e.g., "Rahul Sharma")
    name = Column(String(255), nullable=False)

    # username: The login username — must be unique WITHIN a organization.
    # Note: Two different organizations CAN have a user named "admin" —
    # the organization_id + username combination must be unique.
    username = Column(String(100), nullable=False, index=True)

    # email: User's email address
    email = Column(String(255), nullable=True)

    # hashed_password: The bcrypt hash of the user's password.
    # NEVER store plain text passwords.
    # bcrypt automatically includes a salt and is designed to be slow
    # (making brute-force attacks computationally expensive).
    hashed_password = Column(String(255), nullable=False)

    # role: The user's authority level — must be one of the UserRole enum values.
    # SAEnum maps the Python UserRole enum to a PostgreSQL ENUM type.
    
    # Permission: Direct Billing Allowed vs Sales Order Only
    allow_direct_billing = Column(Boolean, default=False, nullable=False)

    role = Column(
        SAEnum(UserRole),
        nullable=False,
        default=UserRole.STAFF  # Default role is standard staff
    )

    # is_active: Whether the user can log in.
    # Set to False to disable an account without deleting the user's data.
    is_active = Column(Boolean, default=True, nullable=False)

    # avatar_url: Optional URL to the user's profile picture.
    avatar_url = Column(String(500), nullable=True)

    # created_at: When the account was created
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # last_login: When the user last successfully logged in.
    # Updated every time they log in. Useful for security auditing.
    last_login = Column(DateTime, nullable=True)

    # ── RELATIONSHIPS ────────────────────────────────────────────
    # Link back to the Organization this user belongs to.
    # Accessing user.organization gives the full Organization object.
    organization = relationship("Organization", back_populates="users")

    # Link to all active sessions for this user.
    # Accessing user.sessions gives a list of their login sessions.
    sessions = relationship("Session", back_populates="user")

    def __repr__(self):
        return f"<User {self.username} @ {self.organization_id}>"


# ── TABLE 3: Session ──────────────────────────────────────────
class Session(Base):
    """
    Tracks active user logins.
    """
    __tablename__ = "sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)

    # is_active: Allows instantly deactivating a session without deleting it.
    # Set to False on logout — faster than a DELETE query.
    is_active = Column(Boolean, default=True, nullable=False)

    # ── RELATIONSHIPS ────────────────────────────────────────────
    # Link back to the User who owns this session
    user = relationship("User", back_populates="sessions")

    def __repr__(self):
        return f"<Session user={self.user_id} expires={self.expires_at}>"

# ── TABLE 4: Bulletin ──────────────────────────────────────────
class Bulletin(Base):
    """
    Organization-wide or global announcements and bulletins.
    """
    __tablename__ = "bulletins"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(String(50), nullable=False, default="general") # 'important' or 'general'
    is_global = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ── RELATIONSHIPS ────────────────────────────────────────────
    organization = relationship("Organization")
    author = relationship("User")

    def __repr__(self):
        return f"<Bulletin {self.title} priority={self.priority}>"


# ── TABLE 5: Product (Inventory) ──────────────────────────────
from sqlalchemy import UniqueConstraint, Numeric, Integer, Date

class Product(Base):
    """
    Stores products/inventory items for each organization.
    Includes comprehensive fields for Marg-style ERP features.
    """
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # ── Marg Profile Fields ──
    status = Column(String(50), nullable=False, default="continue")
    hide = Column(String(50), nullable=False, default="no")
    code = Column(String(100), nullable=False, index=True) # SKU or item code
    name = Column(String(255), nullable=False, index=True)
    packing = Column(String(100), nullable=True)
    unit = Column(String(50), nullable=True)
    colour_type = Column(String(50), nullable=True, default="normal")
    item_type = Column(String(50), nullable=True, default="normal")
    company_id = Column(UUID(as_uuid=True), ForeignKey("manufacturers.id"), nullable=True)
    salt_id = Column(UUID(as_uuid=True), ForeignKey("salts.id"), nullable=True)
    
    # ── Taxes & HSN ──
    hsn_applicable = Column(String(50), nullable=True, default="no")
    hsn_id = Column(UUID(as_uuid=True), ForeignKey("hsn_codes.id"), nullable=True)
    local_tax = Column(String(50), nullable=True, default="taxable")
    central_tax = Column(String(50), nullable=True, default="taxable")
    sgst_percent = Column(Numeric(5, 2), nullable=False, default=0)
    cgst_percent = Column(Numeric(5, 2), nullable=False, default=0)
    igst_percent = Column(Numeric(5, 2), nullable=False, default=0)
    
    # ── Pricing ──
    mrp = Column(Numeric(10, 2), nullable=False, default=0)
    p_rate = Column(Numeric(10, 2), nullable=False, default=0)
    pts_rate = Column(Numeric(10, 2), nullable=False, default=0)
    rate_a = Column(Numeric(10, 2), nullable=False, default=0)
    ptr_rate = Column(Numeric(10, 2), nullable=False, default=0)
    item_discount_percent = Column(Numeric(5, 2), nullable=False, default=0)
    discount_type = Column(String(50), nullable=True, default="applicable")
    category = Column(String(100), nullable=True, default="na")
    
    # ── MRP / Inventory Planning ──
    min_stock_level = Column(Integer, nullable=False, default=0)
    reorder_quantity = Column(Integer, nullable=False, default=0)

    # is_active: Soft delete flag
    is_active = Column(Boolean, default=True, nullable=False)

    # ── RELATIONSHIPS ────────────────────────────────────────────
    # DOC-11: New UOM & Multi-Tenant Batch Flags
    base_uom = Column(String(50), nullable=True, default="EACH")
    purchase_uom = Column(String(50), nullable=True)
    sales_uom = Column(String(50), nullable=True)
    pack_size = Column(String(100), nullable=True)
    track_batch = Column(Boolean, default=True, nullable=False)
    tax_rule_id = Column(String(100), nullable=True)

    organization = relationship("Organization", back_populates="products")
    principal_mappings = relationship("ProductPrincipalMapping", back_populates="product", cascade="all, delete-orphan")
    company = relationship("Manufacturer", foreign_keys=[company_id])
    salt_relation = relationship("Salt", foreign_keys=[salt_id])
    hsn = relationship("HSNCode", foreign_keys=[hsn_id])

    def __repr__(self):
        return f"<Product {self.code}: {self.name}>"


# -- TABLE 5.1: Batch (Inventory) ------------------------------
class ProductPrincipalMapping(Base):
    __tablename__ = "product_principal_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    
    principal_code = Column(String(100), nullable=False)
    principal_name = Column(String(255), nullable=True)
    principal_uom = Column(String(50), nullable=True)
    principal_pack = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    organization = relationship("Organization")
    product = relationship("Product", back_populates="principal_mappings")


class Batch(Base):
    __tablename__ = "batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_owner_id = Column(UUID(as_uuid=True), ForeignKey("principals.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    batch_number = Column(String(100), nullable=False, index=True)
    expiry = Column(String(50), nullable=True)
    
    # DOC-11 additions
    mfg_date = Column(String(50), nullable=True)
    sell_rate = Column(Numeric(12, 2), nullable=True, default=0)
    mrp = Column(Numeric(12, 2), nullable=False, default=0)
    rate = Column(Numeric(12, 2), nullable=False, default=0)
    rate_a = Column(Numeric(12, 2), nullable=False, default=0)
    rate_b = Column(Numeric(12, 2), nullable=False, default=0)
    rate_c = Column(Numeric(12, 2), nullable=False, default=0)
    cost = Column(Numeric(12, 2), nullable=False, default=0)
    
    current_stock = Column(Integer, nullable=False, default=0)
    brk_exp_stock = Column(Integer, nullable=False, default=0)

    # Relationships
    product = relationship("Product")
    organization = relationship("Organization")

    def __repr__(self):
        return f"<Batch {self.batch_number} - {self.product_id}>"

# -- TABLE 6: Invoice (Sales/Purchase) ------------------------

class DocumentSeries(Base):
    __tablename__ = "document_series"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    series_code = Column(String(50), nullable=False)  # e.g., 'W', 'I', 'C'
    invoice_type = Column(String(50), nullable=False) # e.g., 'sales_challan', 'sales_invoice', 'cash_bill'
    prefix = Column(String(20), nullable=True)        # e.g., 'W-'
    suffix = Column(String(20), nullable=True)        # e.g., '-25'
    next_number = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, default=True, nullable=False)
    
    __table_args__ = (
        UniqueConstraint('organization_id', 'series_code', name='uix_org_series_code'),
    )

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    invoice_type = Column(String(50), nullable=False, default="bill")
    invoice_number = Column(String(100), nullable=False, index=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    customer_name = Column(String(255), nullable=False, index=True)
    party_id = Column(UUID(as_uuid=True), ForeignKey('parties.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Advanced ERP Fields
    party_inv_no = Column(String(100), nullable=True, index=True)
    party_inv_date = Column(String(50), nullable=True)
    due_date = Column(String(50), nullable=True)
    series_id = Column(UUID(as_uuid=True), ForeignKey("document_series.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(String(500), nullable=True)
    dispatch_through = Column(String(100), nullable=True)
    destination = Column(String(100), nullable=True)
    bill_discount = Column(Numeric(12, 2), nullable=True, default=0)
    source_order_id = Column(UUID(as_uuid=True), ForeignKey("sales_orders.id", ondelete="SET NULL"), nullable=True)
    
    ledger1_name = Column(String(100), nullable=True)
    ledger1_amt = Column(Numeric(12, 2), nullable=True)
    ledger2_name = Column(String(100), nullable=True)
    ledger2_amt = Column(Numeric(12, 2), nullable=True)
    ledger3_name = Column(String(100), nullable=True)
    ledger3_amt = Column(Numeric(12, 2), nullable=True)
    
    # Financials
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    tax_total = Column(Numeric(12, 2), nullable=False, default=0)
    grand_total = Column(Numeric(12, 2), nullable=False, default=0)
    
    # -- RELATIONSHIPS --------------------------------------------
    organization = relationship("Organization")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Invoice {self.invoice_number}>"


# -- TABLE 7: InvoiceItem --------------------------------------
class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    product_name = Column(String(255), nullable=False) # Store name in case product is deleted
    quantity = Column(Integer, nullable=False, default=1)
    rate = Column(Numeric(10, 2), nullable=False)
    
    # Advanced ERP Item Fields
    batch = Column(String(100), nullable=True)
    expiry = Column(String(50), nullable=True)
    mrp = Column(Numeric(10, 2), nullable=True, default=0)
    discount_percent = Column(Numeric(5, 2), nullable=True, default=0)
    margin_percent = Column(String(50), nullable=True)
    
    # Taxes applied at time of sale
    igst_percent = Column(Numeric(5, 2), nullable=False, default=0)
    source_order_item_id = Column(UUID(as_uuid=True), ForeignKey("sales_order_items.id", ondelete="SET NULL"), nullable=True)
    source_challan_item_id = Column(UUID(as_uuid=True), ForeignKey("invoice_items.id", ondelete="SET NULL"), nullable=True)
    billed_qty = Column(Integer, nullable=False, default=0)
    source_invoice_item_id = Column(UUID(as_uuid=True), ForeignKey("invoice_items.id", ondelete="SET NULL"), nullable=True)
    returned_qty = Column(Integer, nullable=False, default=0)
    free_quantity = Column(Integer, default=0, nullable=True)
    disposition = Column(String(50), nullable=True, default="saleable")
    
    line_total = Column(Numeric(12, 2), nullable=False)

    # -- RELATIONSHIPS --------------------------------------------
    invoice = relationship("Invoice", back_populates="items")
    product = relationship("Product")

    def __repr__(self):
        return f"<InvoiceItem {self.product_name} x {self.quantity}>"


# -- TABLE 8: Station (Master Data) ---------------------------------
class Station(Base):
    __tablename__ = "stations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    name = Column(String(255), nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)
    
    def __repr__(self):
        return f"<Station {self.name}>"

# -- TABLE 9: Ledger (Finance) ---------------------------------
class Ledger(Base):
    __tablename__ = "ledgers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    name = Column(String(255), nullable=False)
    group_name = Column(String(100), nullable=True) # e.g. 'Cash-in-Hand', 'Bank Accounts'
    mobile = Column(String(20), nullable=True)
    state = Column(String(100), nullable=True)
    opening_balance = Column(Numeric(15, 2), nullable=False, default=0)
    op_type = Column(String(2), nullable=False, default='Dr') # Dr or Cr
    closing_balance = Column(Numeric(15, 2), nullable=False, default=0)
    cl_type = Column(String(2), nullable=False, default='Dr') # Dr or Cr
    group_id = Column(UUID(as_uuid=True), ForeignKey('ledger_groups.id', ondelete='SET NULL'), nullable=True)

    # --- New Fields ---
    station = Column(String(255), nullable=True)
    plot_no = Column(String(255), nullable=True)
    locality = Column(String(255), nullable=True)
    road_street = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    contact_person = Column(String(255), nullable=True)
    phone_number = Column(String(50), nullable=True)
    freeze_upto = Column(Numeric(15, 2), nullable=False, default=0)
    dl_no = Column(String(100), nullable=True)
    restrict_item = Column(String(500), nullable=True)
    ledger_type = Column(String(50), nullable=True, default='Unregistered')
    gstin = Column(String(50), nullable=True)
    tax_type = Column(String(50), nullable=True)
    pan_no = Column(String(50), nullable=True)
    ledger_date = Column(DateTime, default=datetime.utcnow, nullable=True)
    colour = Column(String(50), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    # -- RELATIONSHIPS --------------------------------------------
    organization = relationship("Organization")
    ledger_group = relationship("LedgerGroup")
    voucher_entries = relationship("VoucherEntry", back_populates="ledger")

    def __repr__(self):
        return f"<Ledger {self.name}: {self.closing_balance}>"


# -- TABLE 9: Salt (Master Data) ---------------------------------
class Salt(Base):
    __tablename__ = "salts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    formula = Column(String(255), nullable=False)
    indications = Column(Text, nullable=True)
    dosage = Column(Text, nullable=True)
    side_effects = Column(Text, nullable=True)
    precautions = Column(Text, nullable=True)
    labels = Column(String(100), nullable=True) # e.g. Sch H

    is_active = Column(Boolean, default=True, nullable=False)

    organization = relationship("Organization")

# -- TABLE 10: Manufacturer (Master Data) ---------------------------------
class Manufacturer(Base):
    __tablename__ = "manufacturers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    name = Column(String(255), nullable=False)
    short_code = Column(String(50), nullable=True)
    status = Column(String(20), nullable=False, default='continue') # 'continue' or 'close'
    prohibited = Column(Boolean, nullable=False, default=False)
    default_discount = Column(Numeric(5, 2), nullable=False, default=0)
    
    room_no = Column(String(50), nullable=True)
    floor = Column(String(50), nullable=True)
    rack_no = Column(String(50), nullable=True)
    rack_row_no = Column(String(50), nullable=True)
    dump_days = Column(Integer, nullable=True, default=0)
    
    is_supplier = Column(Boolean, nullable=False, default=False)
    supplier_ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="SET NULL"), nullable=True)
    sales_ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="SET NULL"), nullable=True)
    division = Column(String(100), nullable=True)
    gstin = Column(String(50), nullable=True)
    state_code = Column(String(10), nullable=True)
    
    email = Column(String(255), nullable=True)
    cc = Column(String(255), nullable=True)
    bcc = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    contact_number = Column(String(50), nullable=True)
    field_staff_name = Column(String(255), nullable=True)
    field_staff_contact = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    organization = relationship("Organization")
    supplier_ledger = relationship("Ledger", foreign_keys=[supplier_ledger_id])
    sales_ledger = relationship("Ledger", foreign_keys=[sales_ledger_id])


# -- TABLE 10.1: OrganizationManufacturerMapping ----------------------
class OrganizationManufacturerMapping(Base):
    """
    Maps which Product Companies (manufacturers) are allocated/authorized
    for a Client Master (CM) organization.
    """
    __tablename__ = "organization_manufacturer_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    manufacturer_id = Column(UUID(as_uuid=True), ForeignKey("manufacturers.id", ondelete="CASCADE"), nullable=False, index=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    commission_rate_override = Column(Numeric(5, 2), nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    organization = relationship("Organization")
    manufacturer = relationship("Manufacturer")

# -- TABLE 11: HSNCode (Master Data) ---------------------------------
class HSNCode(Base):
    __tablename__ = "hsn_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    igst = Column(Numeric(5, 2), nullable=False, default=0)
    cgst = Column(Numeric(5, 2), nullable=False, default=0)
    sgst = Column(Numeric(5, 2), nullable=False, default=0)
    type = Column(String(50), nullable=False, default="Goods")

    is_active = Column(Boolean, default=True, nullable=False)

    organization = relationship("Organization")

# -- TABLE 12: StateCode (Master Data) ---------------------------------
class StateCode(Base):
    __tablename__ = "state_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    name = Column(String(255), nullable=False)
    gst_code = Column(String(10), nullable=True)
    capital = Column(String(255), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    organization = relationship("Organization")



# -- TABLE 13: LedgerGroup (Finance) ---------------------------------
class LedgerGroup(Base):
    __tablename__ = "ledger_groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    name = Column(String(255), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("ledger_groups.id", ondelete="SET NULL"), nullable=True)
    
    # NEW FIELDS: Account Hierarchy & Protections
    class_type = Column(String(50), nullable=False, default="Asset") # 'Asset', 'Liability', 'Income', 'Expense'
    is_system = Column(Boolean, default=False, nullable=False) # Prevents deletion/renaming of core groups
    
    is_active = Column(Boolean, default=True, nullable=False)

    organization = relationship("Organization")
    parent = relationship("LedgerGroup", remote_side=[id])


# -- TABLE 14: Voucher (Finance) ---------------------------------
class Voucher(Base):
    __tablename__ = "vouchers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    voucher_type = Column(String(50), nullable=False) # Receipt, Payment, Journal, Contra, Sales, Purchase
    voucher_number = Column(String(100), nullable=False, index=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    narration = Column(Text, nullable=True)
    total_amount = Column(Numeric(15, 2), nullable=False, default=0)

    is_active = Column(Boolean, default=True, nullable=False)

    # ── NEW: Fiscal Year linkage ──
    fiscal_year_id = Column(UUID(as_uuid=True), ForeignKey("fiscal_years.id", ondelete="SET NULL"), nullable=True, index=True)

    # ── NEW: Status & Cancellation tracking ──
    status = Column(String(20), nullable=False, default='Active')  # Active, Cancelled, Reversed
    ref_invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    cancelled_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reversal_voucher_id = Column(UUID(as_uuid=True), ForeignKey("vouchers.id", ondelete="SET NULL"), nullable=True)

    organization = relationship("Organization")
    entries = relationship("VoucherEntry", back_populates="voucher", cascade="all, delete-orphan")
    fiscal_year = relationship("FiscalYear")
    ref_invoice = relationship("Invoice", foreign_keys=[ref_invoice_id])
    reversal_voucher = relationship("Voucher", foreign_keys=[reversal_voucher_id], remote_side=[id])


# -- TABLE 15: VoucherEntry (Finance) ---------------------------------
class VoucherEntry(Base):
    __tablename__ = "voucher_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    voucher_id = Column(UUID(as_uuid=True), ForeignKey("vouchers.id", ondelete="CASCADE"), nullable=False, index=True)
    ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="RESTRICT"), nullable=False, index=True)

    cr_dr = Column(String(2), nullable=False) # 'Cr' or 'Dr'
    amount = Column(Numeric(15, 2), nullable=False, default=0)

    # ── NEW: Denormalized ledger name for fast report rendering ──
    ledger_name = Column(String(255), nullable=True)

    voucher = relationship("Voucher", back_populates="entries")
    ledger = relationship("Ledger", back_populates="voucher_entries")


# -- TABLE 18: FiscalYear (Finance) ---------------------------------
class FiscalYear(Base):
    """
    Represents an accounting fiscal year (e.g., April 2025 - March 2026).
    Each organization can have multiple fiscal years but only one active at a time.
    Vouchers are scoped to a fiscal year. Users switch between FYs to view
    isolated data. Carry-forward is explicit.
    """
    __tablename__ = "fiscal_years"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    name = Column(String(50), nullable=False)           # e.g. "2025-26"
    start_date = Column(Date, nullable=False)            # e.g. 2025-04-01
    end_date = Column(Date, nullable=False)              # e.g. 2026-03-31
    is_active = Column(Boolean, default=True, nullable=False)   # Only one active per org
    is_locked = Column(Boolean, default=False, nullable=False)  # Prevents posting to closed years

    organization = relationship("Organization")


# -- TABLE 19: LedgerBalance (Finance - Per Fiscal Year) ---------------------------------
class LedgerBalance(Base):
    """
    Stores opening and closing balances for each ledger PER fiscal year.
    This enables complete fiscal year isolation — viewing FY 23-24 shows
    only that year's opening/closing. Carry-forward copies closing of
    FY X as opening of FY X+1.
    """
    __tablename__ = "ledger_balances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="CASCADE"), nullable=False, index=True)
    fiscal_year_id = Column(UUID(as_uuid=True), ForeignKey("fiscal_years.id", ondelete="CASCADE"), nullable=False, index=True)

    opening_balance = Column(Numeric(15, 2), nullable=False, default=0)
    op_type = Column(String(2), nullable=False, default='Dr')  # 'Dr' or 'Cr'
    closing_balance = Column(Numeric(15, 2), nullable=False, default=0)
    cl_type = Column(String(2), nullable=False, default='Dr')  # 'Dr' or 'Cr'

    organization = relationship("Organization")
    ledger = relationship("Ledger")
    fiscal_year = relationship("FiscalYear")


# -- TABLE 20: VoucherSequence (Finance - Auto Numbering) ---------------------------------
class VoucherSequence(Base):
    """
    Auto-incrementing voucher number generator per fiscal year and type.
    Generates numbers like PAY/25-26/001, REC/25-26/002, etc.
    Uses row-level locking for concurrency safety.
    """
    __tablename__ = "voucher_sequences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    fiscal_year_id = Column(UUID(as_uuid=True), ForeignKey("fiscal_years.id", ondelete="CASCADE"), nullable=False, index=True)
    voucher_type = Column(String(50), nullable=False)   # Payment, Receipt, Journal, Contra, Sales, Purchase
    prefix = Column(String(20), nullable=False)         # e.g. "PAY/25-26/"
    last_number = Column(Integer, nullable=False, default=0)

    organization = relationship("Organization")
    fiscal_year = relationship("FiscalYear")


# -- TABLE 21: AccountSetting (Finance - Configuration) ---------------------------------
class AccountSetting(Base):
    """
    Key-value configuration store for finance module settings.
    Examples: default_cash_ledger_id, default_sales_account_id, etc.
    """
    __tablename__ = "account_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    key = Column(String(100), nullable=False)   # e.g. 'default_cash_ledger_id'
    value = Column(Text, nullable=True)         # e.g. UUID string or setting value

    organization = relationship("Organization")


# -- TABLE 16: SystemState (System) ---------------------------------
class SystemState(Base):
    __tablename__ = "system_state"

    id = Column(Integer, primary_key=True, autoincrement=True)
    restart_count = Column(Integer, nullable=False, default=0)
    last_restarted_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# -- TABLE 17: ErrorEntry (Crash Recovery) ---------------------------------
class ErrorEntry(Base):
    __tablename__ = "error_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    module_name = Column(String(100), nullable=False) # e.g. 'SalesBill', 'PurchaseBill', 'PaymentVoucher'
    json_payload = Column(Text, nullable=False) # The serialized form state
    restart_count_at_creation = Column(Integer, nullable=False) # To track age across restarts

    organization = relationship("Organization")


# -- TABLE 22: InvoiceAllocation (Bill-by-Bill Allocation Engine) ----------
class InvoiceAllocation(Base):
    """
    Maps a Receipt/Payment Voucher to specific Invoices, Credit Notes,
    Debit Notes, or marks the amount as Floating (On Account advance).

    BUSINESS RULES:
    1. When a user enters a Receipt Voucher, they can allocate it against
       one or more: Sales Invoices, Credit Notes (CN), Debit Notes (DN),
       or previously unallocated Floating Vouchers.
    2. If the user does not allocate the entire receipt amount, the
       remaining balance is stored as a Floating/On Account advance
       (is_floating=True, no target links). This can be pulled up and
       allocated against future invoices.
    3. APPEND-ONLY RULE: Once an allocation is saved, it is NEVER
       hard-deleted. Mistakes are corrected by creating a new row
       with a negative allocated_amount that offsets the original.

    COLUMN LOGIC:
    - source_voucher_id : The Receipt or Payment voucher being allocated.
    - target_invoice_id : The Sales/Purchase Invoice being settled (nullable).
    - target_cn_dn_id   : A Credit Note or Debit Note being settled (nullable).
    - If BOTH target columns are NULL, the row is a Floating advance.
    """
    __tablename__ = "invoice_allocations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # ── Source: The Receipt/Payment Voucher being allocated ──
    source_voucher_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vouchers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    # ── Target: The Invoice being settled (nullable — NULL if floating) ──
    target_invoice_id = Column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="RESTRICT"),
        nullable=True,
        index=True
    )

    # ── Target: The Credit Note / Debit Note being settled (nullable) ──
    target_cn_dn_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vouchers.id", ondelete="RESTRICT"),
        nullable=True,
        index=True
    )

    # ── The amount allocated in this specific row ──
    allocated_amount = Column(Numeric(15, 2), nullable=False)

    # ── True if this row represents unallocated floating / on-account money ──
    is_floating = Column(Boolean, default=False, nullable=False)

    # ── Optional narration for audit trail ──
    narration = Column(Text, nullable=True)

    # ── Relationships ──
    organization = relationship("Organization")
    source_voucher = relationship(
        "Voucher",
        foreign_keys=[source_voucher_id],
        backref="allocations_as_source"
    )
    target_invoice = relationship(
        "Invoice",
        foreign_keys=[target_invoice_id],
        backref="allocations_as_target"
    )
    target_cn_dn = relationship(
        "Voucher",
        foreign_keys=[target_cn_dn_id],
        backref="allocations_as_cn_dn"
    )



# -- DOC-10: Business Partner / Party Master ------------------------
class Party(Base):
    __tablename__ = "parties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    legal_name = Column(String(255), nullable=False, index=True)
    trade_name = Column(String(255), nullable=True)
    pan = Column(String(15), nullable=True)
    gst = Column(String(20), nullable=True)
    status = Column(String(20), nullable=False, default='active') # 'active', 'inactive'
    tds_tcs_mode = Column(String(20), default='PROMPT') # 'AUTOMATIC', 'MANUAL', 'DEFER', 'PROMPT'
    is_non_filer_206ab_cca = Column(Boolean, default=False)

    # Relationships
    organization = relationship("Organization")
    addresses = relationship("PartyAddress", back_populates="party", cascade="all, delete-orphan")
    customer_profile = relationship("CustomerProfile", back_populates="party", uselist=False, cascade="all, delete-orphan")
    supplier_profile = relationship("SupplierProfile", back_populates="party", uselist=False, cascade="all, delete-orphan")


class PartyAddress(Base):
    __tablename__ = "party_addresses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    party_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="CASCADE"), nullable=False, index=True)
    
    address_type = Column(String(50), nullable=False) # 'Billing', 'Shipping', 'Corporate'
    is_default = Column(Boolean, default=False, nullable=False)

    line1 = Column(String(255), nullable=False)
    line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    country = Column(String(100), default="India")
    
    party = relationship("Party", back_populates="addresses")


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    party_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="CASCADE"), primary_key=True)
    ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="RESTRICT"), nullable=True) # Financial link
    
    route_id = Column(String(100), nullable=True) # String for now, can be FK to Routes later
    credit_limit = Column(Numeric(15, 2), nullable=False, default=0)
    credit_days = Column(Integer, nullable=False, default=0)
    price_list = Column(String(50), nullable=True) # e.g. 'Retail', 'Wholesale'
    company_ids = Column(JSON, nullable=True) # e.g. ["ALL"] or list of product manufacturer UUIDs
    
    party = relationship("Party", back_populates="customer_profile")
    ledger = relationship("Ledger")


class SupplierProfile(Base):
    __tablename__ = "supplier_profiles"

    party_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="CASCADE"), primary_key=True)
    ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="RESTRICT"), nullable=True) # Financial link
    
    payment_terms = Column(String(100), nullable=True)
    lead_time_days = Column(Integer, nullable=False, default=0)
    supplier_rating = Column(String(20), nullable=True)
    
    party = relationship("Party", back_populates="supplier_profile")
    ledger = relationship("Ledger")


# -- DOC-12: Principal Master & Agreements ------------------------------

class Principal(Base):
    __tablename__ = "principals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False, index=True)
    legal_name = Column(String(255), nullable=False)
    brand = Column(String(100), nullable=True)
    gstin = Column(String(15), nullable=True)
    status = Column(String(20), nullable=False, default='active') # active, suspended, archived
    
    # ── Product Company / Manufacturer Linkage ──
    manufacturer_id = Column(UUID(as_uuid=True), ForeignKey("manufacturers.id", ondelete="SET NULL"), nullable=True, index=True)

    # 🔗 RELATIONSHIPS 
    organization = relationship("Organization")
    manufacturer = relationship("Manufacturer", foreign_keys=[manufacturer_id])
    agreements = relationship("PrincipalAgreement", back_populates="principal", cascade="all, delete-orphan")
    warehouse_mappings = relationship("PrincipalWarehouseMapping", back_populates="principal", cascade="all, delete-orphan")


class PrincipalAgreement(Base):
    __tablename__ = "principal_agreements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_id = Column(UUID(as_uuid=True), ForeignKey("principals.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    version_name = Column(String(100), nullable=False)
    valid_from = Column(DateTime, nullable=False)
    valid_to = Column(DateTime, nullable=True)
    commission_percent = Column(Numeric(5, 2), nullable=False, default=0)
    handling_percent = Column(Numeric(5, 2), nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)

    # 🔗 RELATIONSHIPS 
    principal = relationship("Principal", back_populates="agreements")


class PrincipalWarehouseMapping(Base):
    __tablename__ = "principal_warehouse_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_id = Column(UUID(as_uuid=True), ForeignKey("principals.id", ondelete="CASCADE"), nullable=False, index=True)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 🔗 RELATIONSHIPS 
    principal = relationship("Principal", back_populates="warehouse_mappings")
    warehouse = relationship("Warehouse")


# -- DOC-13: Warehouse & Transport Master -------------------------------

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=True)
    manager_name = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default='active')

    # Defaults for operations
    default_receiving_bin_id = Column(UUID(as_uuid=True), nullable=True) # Logical foreign key to WarehouseBin
    default_dispatch_bin_id = Column(UUID(as_uuid=True), nullable=True)
    default_returns_bin_id = Column(UUID(as_uuid=True), nullable=True)

    # 🔗 RELATIONSHIPS
    zones = relationship("WarehouseZone", back_populates="warehouse", cascade="all, delete-orphan")


class WarehouseZone(Base):
    __tablename__ = "warehouse_zones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    storage_type = Column(String(50), nullable=True) # e.g. Bulk, Picking, Cold
    status = Column(String(20), nullable=False, default='active')

    # 🔗 RELATIONSHIPS
    warehouse = relationship("Warehouse", back_populates="zones")
    bins = relationship("WarehouseBin", back_populates="zone", cascade="all, delete-orphan")


class WarehouseBin(Base):
    __tablename__ = "warehouse_bins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("warehouse_zones.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False) # e.g. A1-R1-S1-B1
    aisle = Column(String(20), nullable=True)
    rack = Column(String(20), nullable=True)
    shelf = Column(String(20), nullable=True)
    bin_number = Column(String(20), nullable=True)
    status = Column(String(20), nullable=False, default='available')

    # 🔗 RELATIONSHIPS
    zone = relationship("WarehouseZone", back_populates="bins")


class Transporter(Base):
    __tablename__ = "transporters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    gstin = Column(String(15), nullable=True)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    status = Column(String(20), nullable=False, default='active')

    # 🔗 RELATIONSHIPS
    vehicles = relationship("Vehicle", back_populates="transporter", cascade="all, delete-orphan")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    transporter_id = Column(UUID(as_uuid=True), ForeignKey("transporters.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    registration_number = Column(String(50), nullable=False, index=True)
    vehicle_type = Column(String(50), nullable=True) # e.g. LCV, HCV, 3-Wheeler
    capacity_kg = Column(Numeric(10, 2), nullable=True)
    driver_name = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default='active')

    # 🔗 RELATIONSHIPS
    transporter = relationship("Transporter", back_populates="vehicles")


# -- DOC-14: Scheme & Free Goods Engine -------------------------------

class Scheme(Base):
    __tablename__ = "schemes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_id = Column(UUID(as_uuid=True), ForeignKey("principals.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    scheme_type = Column(String(50), nullable=False) # 'official', 'extra_allowance'
    status = Column(String(20), nullable=False, default='active')

    # 🔗 RELATIONSHIPS
    versions = relationship("SchemeVersion", back_populates="scheme", cascade="all, delete-orphan")


class SchemeVersion(Base):
    __tablename__ = "scheme_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    scheme_id = Column(UUID(as_uuid=True), ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    version_number = Column(Integer, nullable=False, default=1)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=False)
    
    # Simple rule: buy_qty gets free_qty
    buy_qty = Column(Numeric(10, 2), nullable=False, default=0)
    free_qty = Column(Numeric(10, 2), nullable=False, default=0)
    
    status = Column(String(20), nullable=False, default='active')

    # 🔗 RELATIONSHIPS
    scheme = relationship("Scheme", back_populates="versions")
    product = relationship("Product")


class Entitlement(Base):
    '''Tracks granted allowances like 3 extra units and their consumption'''
    __tablename__ = "entitlements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    scheme_version_id = Column(UUID(as_uuid=True), ForeignKey("scheme_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    granted_qty = Column(Numeric(10, 2), nullable=False, default=0)
    consumed_qty = Column(Numeric(10, 2), nullable=False, default=0)
    claimable_qty = Column(Numeric(10, 2), nullable=False, default=0) # consumed_qty - claimed_qty
    
    status = Column(String(20), nullable=False, default='active')

    # 🔗 RELATIONSHIPS
    scheme_version = relationship("SchemeVersion")


class SchemeMovement(Base):
    '''Ledger of entitlement consumption against transactions'''
    __tablename__ = "scheme_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    entitlement_id = Column(UUID(as_uuid=True), ForeignKey("entitlements.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document_type = Column(String(50), nullable=False) # e.g. 'invoice', 'challan'
    document_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    qty = Column(Numeric(10, 2), nullable=False)
    movement_type = Column(String(20), nullable=False) # 'consume', 'reverse'


class SchemeClaim(Base):
    '''Pending reimbursement claims sent to the principal'''
    __tablename__ = "scheme_claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_id = Column(UUID(as_uuid=True), ForeignKey("principals.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    claim_number = Column(String(50), nullable=False, index=True)
    claim_date = Column(Date, nullable=False)
    
    total_claim_qty = Column(Numeric(10, 2), nullable=False, default=0)
    settled_qty = Column(Numeric(10, 2), nullable=False, default=0)
    status = Column(String(20), nullable=False, default='pending') # pending, approved, settled, rejected

    # 🔗 RELATIONSHIPS
    principal = relationship("Principal")


# -- DOC-15: Pricing, Rate, MRP & Formula Engine ----------------------

class PriceList(Base):
    __tablename__ = "price_lists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False, default='active')

    rules = relationship("PriceListRule", back_populates="price_list", cascade="all, delete-orphan")


class PriceListRule(Base):
    __tablename__ = "price_list_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    price_list_id = Column(UUID(as_uuid=True), ForeignKey("price_lists.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=False)
    fixed_price = Column(Numeric(12, 4), nullable=False)
    
    price_list = relationship("PriceList", back_populates="rules")
    product = relationship("Product")


class PriceFormula(Base):
    __tablename__ = "price_formulas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    target_rate_type = Column(String(50), nullable=False) # e.g. 'retail'
    source_rate_type = Column(String(50), nullable=False) # e.g. 'purchase'
    operator = Column(String(20), nullable=False) # 'multiply', 'add_percent', etc.
    operand = Column(Numeric(10, 4), nullable=False) # e.g. 1.20 for 20% markup
    floor_price = Column(Numeric(12, 4), nullable=True)
    
    status = Column(String(20), nullable=False, default='active')


class CustomerPriceConfig(Base):
    __tablename__ = "customer_price_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    party_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    default_rate_type = Column(String(50), nullable=True) # e.g. 'distributor'
    price_list_id = Column(UUID(as_uuid=True), ForeignKey("price_lists.id", ondelete="SET NULL"), nullable=True)

    party = relationship("Party")
    price_list = relationship("PriceList")


# DOC-16: Inventory & Claims Engine Models

class StockStatus(str, enum.Enum):
    SELLABLE = "SELLABLE"
    EXPIRED = "EXPIRED"
    BREAKAGE = "BREAKAGE"
    QUARANTINE = "QUARANTINE"
    BLOCKED = "BLOCKED"
    SCRAP = "SCRAP"
    VENDOR_RETURN_PENDING = "VENDOR_RETURN_PENDING"

class SupplyClassification(str, enum.Enum):
    NORMAL = "NORMAL"
    SPECIAL = "SPECIAL"
    UNDERCUTTING = "UNDERCUTTING"
    NON_REORDER = "NON_REORDER"

class StockPosition(Base):
    __tablename__ = "stock_positions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=True, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"), nullable=True, index=True)
    principal_owner_id = Column(UUID(as_uuid=True), ForeignKey("principals.id"), nullable=True)
    
    status = Column(SAEnum(StockStatus), default=StockStatus.SELLABLE, nullable=False)
    classification = Column(SAEnum(SupplyClassification), default=SupplyClassification.NORMAL, nullable=False)
    
    quantity = Column(Numeric(14,4), default=0)
    reserved_quantity = Column(Numeric(14,4), default=0)

class StockMovement(Base):
    __tablename__ = "stock_movements"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"), nullable=True)
    
    source_document_type = Column(String(50)) # 'PURCHASE', 'SALE', 'CUSTOMER_RETURN'
    source_document_id = Column(String(50))
    
    quantity_change = Column(Numeric(14,4), nullable=False)
    status_before = Column(SAEnum(StockStatus), nullable=True)
    status_after = Column(SAEnum(StockStatus), nullable=False)
    
    movement_date = Column(DateTime, default=datetime.utcnow)
    user_context = Column(String(100), nullable=True)

class CustomerClaim(Base):
    __tablename__ = "customer_claims"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("parties.id"))
    claim_type = Column(String(50)) # 'EXPIRY', 'BREAKAGE'
    status = Column(String(50), default="QUARANTINED")
    claim_date = Column(DateTime, default=datetime.utcnow)
    
class CustomerClaimItem(Base):
    __tablename__ = "customer_claim_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("customer_claims.id", ondelete="CASCADE"))
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"))
    quantity = Column(Numeric(14,4), default=0)
    provenance_verified = Column(Boolean, default=False)
    
class VendorClaim(Base):
    __tablename__ = "vendor_claims"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("parties.id"))
    claim_type = Column(String(50))
    status = Column(String(50), default="SUBMITTED")
    claim_date = Column(DateTime, default=datetime.utcnow)
    
class VendorClaimItem(Base):
    __tablename__ = "vendor_claim_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("vendor_claims.id", ondelete="CASCADE"))
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"))
    source_receipt_id = Column(String(100), nullable=True) # Provenance receipt link
    quantity = Column(Numeric(14,4), default=0)

class ReorderRule(Base):
    __tablename__ = "reorder_rules"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True) # Null for generic fallback
    formula = Column(Text, nullable=False) 
    safety_stock = Column(Numeric(14,4), default=0)
    lead_time_days = Column(Integer, default=0)
    
class PurchaseProposal(Base):
    __tablename__ = "purchase_proposals"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    suggested_qty = Column(Numeric(14,4), default=0)
    explanation = Column(Text)
    status = Column(String(50), default="DRAFT")
    created_at = Column(DateTime, default=datetime.utcnow)


# =====================================================================
# DOC-17: Procurement Execution (POs, Rules, Complaints)
# =====================================================================

class VendorSupplyRule(Base):
    __tablename__ = "vendor_supply_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="CASCADE"), nullable=False)
    
    rule_type = Column(String(50), nullable=False, default="authorized") # fixed, authorized, blocked
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    po_number = Column(String(100), nullable=False, index=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="RESTRICT"), nullable=False)
    
    status = Column(String(50), nullable=False, default="DRAFT") # DRAFT, APPROVED, PARTIAL, COMPLETED, CANCELLED
    expected_delivery = Column(DateTime, nullable=True)
    supply_classification = Column(String(50), nullable=True) # e.g. Special Supply, Standard
    total_amount = Column(Numeric(15, 2), default=0.00)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    vendor = relationship("Party")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    received_qty = Column(Integer, nullable=False, default=0)
    rate = Column(Numeric(10, 2), nullable=False)
    line_total = Column(Numeric(15, 2), nullable=False)
    
    purchase_order = relationship("PurchaseOrder", back_populates="items")

class GoodsReceiptNote(Base):
    __tablename__ = "goods_receipt_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    grn_number = Column(String(100), nullable=False, index=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    po_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id", ondelete="SET NULL"), nullable=True, index=True)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="RESTRICT"), nullable=False)

    challan_number = Column(String(100), nullable=True) # Delivery Challan / Invoice
    challan_date = Column(DateTime, nullable=True)
    gate_entry_number = Column(String(100), nullable=True) # Physical security gate pass
    vehicle_number = Column(String(50), nullable=True) # e.g. DL-01-AB-1234
    received_by = Column(String(100), nullable=True) # Receiving officer name

    temperature_celsius = Column(Numeric(5, 2), nullable=True) # Cold-chain temperature e.g. 4.2°C
    seal_intact = Column(Boolean, default=True) # Tamper-evident seal verification
    inspection_status = Column(String(50), nullable=False, default="PENDING_INSPECTION") # PENDING_INSPECTION, ACCEPTED, REJECTED, PARTIAL_ACCEPT
    status = Column(String(50), nullable=False, default="DRAFT") # DRAFT, VERIFIED, CONVERTED_TO_PURCHASE, CANCELLED

    total_received_amount = Column(Numeric(15, 2), default=0.00)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("GoodsReceiptNoteItem", back_populates="grn", cascade="all, delete-orphan")
    purchase_order = relationship("PurchaseOrder")
    vendor = relationship("Party")

class GoodsReceiptNoteItem(Base):
    __tablename__ = "goods_receipt_note_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grn_id = Column(UUID(as_uuid=True), ForeignKey("goods_receipt_notes.id", ondelete="CASCADE"), nullable=False, index=True)
    po_item_id = Column(UUID(as_uuid=True), ForeignKey("purchase_order_items.id", ondelete="SET NULL"), nullable=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    product_name = Column(String(255), nullable=False)
    ordered_qty = Column(Integer, nullable=False, default=0) # from PO
    challan_qty = Column(Integer, nullable=False, default=0) # on delivery challan
    received_qty = Column(Integer, nullable=False, default=0) # physically counted
    accepted_qty = Column(Integer, nullable=False, default=0) # passed QC
    damaged_qty = Column(Integer, nullable=False, default=0) # quarantined/broken
    short_qty = Column(Integer, nullable=False, default=0) # challan - received

    batch_number = Column(String(100), nullable=True)
    expiry_date = Column(String(20), nullable=True) # MM/YY
    mrp = Column(Numeric(10, 2), default=0.00)
    purchase_rate = Column(Numeric(10, 2), default=0.00)
    line_total = Column(Numeric(15, 2), default=0.00)
    quality_remarks = Column(String(255), nullable=True)

    grn = relationship("GoodsReceiptNote", back_populates="items")


class VendorComplaint(Base):
    __tablename__ = "vendor_complaints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    complaint_number = Column(String(100), nullable=False, index=True)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="RESTRICT"), nullable=False)
    
    category = Column(String(50), nullable=False) # SHORTAGE, DAMAGE, QUALITY, PRICING
    status = Column(String(50), nullable=False, default="OPEN") # OPEN, PENDING, RESOLVED, CLOSED
    severity = Column(String(50), nullable=False, default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    
    description = Column(Text, nullable=True)
    related_document_id = Column(UUID(as_uuid=True), nullable=True) # Link to Invoice/GRN ID
    
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)



# =====================================================================
# DOC-18: Sales Order Management Engine
# =====================================================================

class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    order_number = Column(String(100), nullable=False, index=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    party_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="RESTRICT"), nullable=False)
    
    status = Column(String(50), nullable=False, default="DRAFT") # DRAFT, HOLD, APPROVED, CONFIRMED, CANCELLED, CLOSED
    total_amount = Column(Numeric(15, 2), default=0.00)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("SalesOrderItem", backref="order", lazy="joined", cascade="all, delete-orphan")
    holds = relationship("SalesOrderHold", backref="order", lazy="joined", cascade="all, delete-orphan")

class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("sales_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    allocated_qty = Column(Integer, nullable=False, default=0)
    rate = Column(Numeric(10, 2), nullable=False)
    line_total = Column(Numeric(15, 2), nullable=False)

class SalesOrderHold(Base):
    __tablename__ = "sales_order_holds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("sales_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    hold_reason = Column(String(255), nullable=False) # e.g., "Credit Limit Exceeded", "Price Override"
    status = Column(String(50), nullable=False, default="ACTIVE") # ACTIVE, CLEARED
    
    cleared_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    cleared_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DispatchRecord(Base):
    __tablename__ = "dispatch_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    challan_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    
    vehicle_number = Column(String(50), nullable=True)
    driver_name = Column(String(100), nullable=True)
    transport_agency = Column(String(100), nullable=True)
    
    status = Column(String(50), nullable=False, default="READY") # READY, IN_TRANSIT, DELIVERED, FAILED
    
    pod_captured = Column(Boolean, default=False)
    pod_date = Column(DateTime, nullable=True)
    pod_remarks = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


# -- DOC-28: Bank Reconciliation Models ---------------------------------
class BankStatementProfile(Base):
    __tablename__ = "bank_statement_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False) # e.g. "HDFC Current Account"
    
    # JSON mapping: {"date": "Transaction Date", "description": "Narration", "withdrawal": "Debit", "deposit": "Credit", "reference": "Cheque/Ref No."}
    column_mapping = Column(JSONB, nullable=False) 
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class BankStatementImport(Base):
    __tablename__ = "bank_statement_imports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="CASCADE"), nullable=False, index=True)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("bank_statement_profiles.id", ondelete="SET NULL"), nullable=True)
    
    filename = Column(String(255), nullable=False)
    import_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    imported_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

class BankStatementRow(Base):
    __tablename__ = "bank_statement_rows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    import_id = Column(UUID(as_uuid=True), ForeignKey("bank_statement_imports.id", ondelete="CASCADE"), nullable=False, index=True)
    
    transaction_date = Column(Date, nullable=False)
    description = Column(String(500), nullable=False)
    reference_no = Column(String(100), nullable=True)
    
    withdrawal = Column(Numeric(15, 2), default=0)
    deposit = Column(Numeric(15, 2), default=0)
    balance = Column(Numeric(15, 2), nullable=True)
    
    is_reconciled = Column(Boolean, default=False, nullable=False)
    matched_voucher_id = Column(UUID(as_uuid=True), ForeignKey("vouchers.id", ondelete="SET NULL"), nullable=True)
    
    # Store original row for audit
    raw_data = Column(JSONB, nullable=True)

class BankReconciliationMatch(Base):
    __tablename__ = "bank_reconciliation_matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    statement_row_id = Column(UUID(as_uuid=True), ForeignKey("bank_statement_rows.id", ondelete="CASCADE"), nullable=False, unique=True)
    voucher_id = Column(UUID(as_uuid=True), ForeignKey("vouchers.id", ondelete="CASCADE"), nullable=False)
    
    matched_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    matched_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    match_type = Column(String(50), nullable=False) # 'AUTO', 'MANUAL'

class CashVerification(Base):
    __tablename__ = "cash_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="CASCADE"), nullable=False, index=True)
    verification_date = Column(Date, nullable=False, default=date.today)
    denominations = Column(JSONB, nullable=False) # {"2000": 0, "500": 10, ...}
    system_balance = Column(Numeric(15, 2), nullable=False)
    counted_balance = Column(Numeric(15, 2), nullable=False)
    variance = Column(Numeric(15, 2), nullable=False) # counted - system
    status = Column(String(50), default="VERIFIED", nullable=False) # 'BALANCED', 'SURPLUS', 'SHORTAGE'
    remarks = Column(String(500), nullable=True)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    ledger = relationship("Ledger")

# -- TABLE 26: Expense Management ---------------------------------
class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="RESTRICT"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    organization = relationship("Organization")
    ledger = relationship("Ledger")

class EmployeeAdvance(Base):
    __tablename__ = "employee_advances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    employee_ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="RESTRICT"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    reason = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="Active") # Active, Settled
    voucher_id = Column(UUID(as_uuid=True), ForeignKey("vouchers.id", ondelete="SET NULL"), nullable=True)

    employee_ledger = relationship("Ledger")
    voucher = relationship("Voucher")

class ExpenseClaim(Base):
    __tablename__ = "expense_claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    claim_number = Column(String(100), nullable=False, index=True)
    employee_ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="RESTRICT"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False, default=0)
    status = Column(String(50), nullable=False, default="Draft") # Draft, Approved, Paid, Rejected
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    payment_voucher_id = Column(UUID(as_uuid=True), ForeignKey("vouchers.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(Text, nullable=True)

    employee_ledger = relationship("Ledger", foreign_keys=[employee_ledger_id])
    lines = relationship("ExpenseLine", back_populates="claim", cascade="all, delete-orphan")

class ExpenseLine(Base):
    __tablename__ = "expense_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("expense_claims.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("expense_categories.id", ondelete="RESTRICT"), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    bill_number = Column(String(100), nullable=True)
    bill_date = Column(DateTime, nullable=True)
    note = Column(String(255), nullable=True)

    claim = relationship("ExpenseClaim", back_populates="lines")
    category = relationship("ExpenseCategory")


class AssetCategory(Base):
    __tablename__ = "asset_categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), index=True)
    name = Column(String, nullable=False)
    depreciation_method = Column(String, default="WDV") # WDV or SLM
    depreciation_rate = Column(Numeric(5, 2), default=0) # Percentage
    
    # Ledger Mappings
    asset_ledger_id = Column(UUID(as_uuid=True), ForeignKey('ledgers.id'), nullable=False)
    acc_depreciation_ledger_id = Column(UUID(as_uuid=True), ForeignKey('ledgers.id'), nullable=False)
    depreciation_expense_ledger_id = Column(UUID(as_uuid=True), ForeignKey('ledgers.id'), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class FixedAsset(Base):
    __tablename__ = "fixed_assets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey('asset_categories.id'))
    
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)
    location = Column(String, nullable=True)
    
    purchase_date = Column(DateTime, nullable=False)
    purchase_value = Column(Numeric(15, 2), nullable=False)
    salvage_value = Column(Numeric(15, 2), default=0)
    
    current_net_block = Column(Numeric(15, 2), nullable=False)
    status = Column(String, default="Active") # Active, Disposed
    
    category = relationship("AssetCategory")
    depreciation_logs = relationship("DepreciationLog", back_populates="asset")
    
    created_at = Column(DateTime, default=datetime.utcnow)

class DepreciationLog(Base):
    __tablename__ = "depreciation_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey('fixed_assets.id'))
    voucher_id = Column(UUID(as_uuid=True), ForeignKey('vouchers.id'), nullable=True)
    
    run_date = Column(DateTime, nullable=False)
    depreciation_amount = Column(Numeric(15, 2), nullable=False)
    closing_net_block = Column(Numeric(15, 2), nullable=False)
    notes = Column(String, nullable=True)
    
    asset = relationship("FixedAsset", back_populates="depreciation_logs")
    created_at = Column(DateTime, default=datetime.utcnow)


# ============================================================
# DOC-29: GST, Tax, E-Invoicing, E-Way Bill & TDS/TCS Engine
# ============================================================
from sqlalchemy import Numeric

class TaxProfile(Base):
    __tablename__ = "tax_profiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    name = Column(String(100), nullable=False)
    jurisdiction = Column(String(50), nullable=False, default="IN")
    is_active = Column(Boolean, default=True)
    rules_json = Column(JSONB, nullable=True) # To store dynamic tax rules

class TaxTransactionLine(Base):
    __tablename__ = "tax_transaction_lines"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_item_id = Column(UUID(as_uuid=True), ForeignKey("invoice_items.id", ondelete="CASCADE"), nullable=False)
    
    tax_component = Column(String(50), nullable=False) # e.g., CGST, SGST, IGST, CESS
    tax_rate = Column(Numeric(5, 2), nullable=False)
    taxable_amount = Column(Numeric(12, 2), nullable=False)
    tax_amount = Column(Numeric(12, 2), nullable=False)
    rule_version = Column(String(50), nullable=True) # Tracks the version of the tax rule applied

class EinvoiceEwayLog(Base):
    __tablename__ = "einvoice_eway_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    log_type = Column(String(20), nullable=False) # 'EINVOICE', 'EWAYBILL'
    status = Column(String(20), nullable=False) # 'PENDING', 'EXPORTED', 'SUCCESS', 'ERROR'
    
    # Evidence from IRP
    irn = Column(String(100), nullable=True)
    ack_no = Column(String(100), nullable=True)
    ack_date = Column(String(50), nullable=True)
    signed_qr_data = Column(Text, nullable=True)
    signed_invoice_data = Column(Text, nullable=True)
    eway_bill_no = Column(String(100), nullable=True)
    eway_bill_valid_till = Column(String(50), nullable=True)
    
    # Audit trail
    error_message = Column(Text, nullable=True)
    request_payload_json = Column(JSONB, nullable=True)
    response_payload_json = Column(JSONB, nullable=True)

    # Transport & Dispatch Metadata (DOC-42)
    transporter_id = Column(String(100), nullable=True)
    transporter_name = Column(String(255), nullable=True)
    transporter_gstin = Column(String(50), nullable=True)
    vehicle_no = Column(String(50), nullable=True)
    vehicle_type = Column(String(30), default="REGULAR", nullable=True)
    distance_km = Column(Numeric(10, 2), default=100.0, nullable=True)
    transport_mode = Column(String(30), default="ROAD", nullable=True)
    doc_type = Column(String(20), default="INV", nullable=True)
    supply_type = Column(String(20), default="B2B", nullable=True)
    qr_code_svg = Column(Text, nullable=True)

class TdsTcsTransaction(Base):
    __tablename__ = "tds_tcs_transactions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    party_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="CASCADE"), nullable=False)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    financial_year = Column(String(10), nullable=False) # e.g. "2025-26"
    transaction_type = Column(String(20), nullable=False) # 'PURCHASE', 'SALE'
    transaction_amount = Column(Numeric(12, 2), nullable=False)
    cumulative_amount = Column(Numeric(12, 2), nullable=False) # Tracking towards 50L limit
    
    # Deduction info
    section_code = Column(String(20), nullable=True) # e.g., "194Q"
    deducted_amount = Column(Numeric(12, 2), nullable=True, default=0)
    is_threshold_breached = Column(Boolean, default=False)


# ==========================================
# DOC-30: Financial & Management Reporting
# ==========================================

class ReportTemplate(Base):
    __tablename__ = "report_templates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    name = Column(String, index=True)
    subject = Column(String) # e.g., "Sales", "Ledger", "Inventory"
    config = Column(JSONB) # Stores selected columns, calculations, default filters
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ReportVariant(Base):
    __tablename__ = "report_variants"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    template_id = Column(UUID(as_uuid=True), ForeignKey("report_templates.id"), nullable=True)
    name = Column(String)
    saved_state = Column(JSONB) # Hidden columns, custom order, active filters
    created_at = Column(DateTime, default=datetime.utcnow)

class DashboardExclusion(Base):
    __tablename__ = "dashboard_exclusions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    entity_type = Column(String) # 'Party', 'Ledger', 'Invoice'
    entity_id = Column(UUID(as_uuid=True))
    reason = Column(String)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    expiry_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ============================================================
# DOC-32: Workflow, Approval, Alert & Business Automation Engine
# ============================================================

class WorkflowDefinition(Base):
    __tablename__ = "workflow_definitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    module = Column(String(50), nullable=False, index=True)  # sales, purchase, inventory, finance, compliance
    trigger_event = Column(String(100), nullable=False)      # AMOUNT_THRESHOLD, CREDIT_BREACH, EXPIRY_QUARANTINE, etc.
    status = Column(String(20), default="active", nullable=False) # active, draft, retired
    version = Column(Integer, default=1, nullable=False)
    is_maker_checker_enforced = Column(Boolean, default=True, nullable=False)
    config_json = Column(JSONB, nullable=False) # Tiers, routing, actions, SLA rules
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization")


class WorkflowInstance(Base):
    __tablename__ = "workflow_instances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    definition_id = Column(UUID(as_uuid=True), ForeignKey("workflow_definitions.id", ondelete="CASCADE"), nullable=False, index=True)
    source_module = Column(String(50), nullable=False)
    source_document_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    document_number = Column(String(100), nullable=False, index=True)
    party_name = Column(String(255), nullable=True)
    amount = Column(Numeric(15, 2), nullable=True, default=0.0)
    initiator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    initiator_name = Column(String(255), nullable=True)
    current_stage = Column(Integer, default=1, nullable=False)
    status = Column(String(30), default="PENDING", nullable=False, index=True) # PENDING, APPROVED, REJECTED, ESCALATED, CANCELLED
    idempotency_key = Column(String(128), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization")
    definition = relationship("WorkflowDefinition")
    initiator = relationship("User", foreign_keys=[initiator_id])
    tasks = relationship("WorkflowTask", back_populates="instance", cascade="all, delete-orphan")
    audit_logs = relationship("WorkflowAuditLog", back_populates="instance", cascade="all, delete-orphan")


class WorkflowTask(Base):
    __tablename__ = "workflow_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instance_id = Column(UUID(as_uuid=True), ForeignKey("workflow_instances.id", ondelete="CASCADE"), nullable=False, index=True)
    stage_order = Column(Integer, default=1, nullable=False)
    assigned_role = Column(String(50), nullable=False) # manager, cm_admin, am_admin, finance_head
    assigned_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(30), default="PENDING", nullable=False, index=True) # PENDING, APPROVED, REJECTED, DELEGATED, ESCALATED, BYPASSED
    priority = Column(String(20), default="NORMAL", nullable=False) # URGENT, HIGH, NORMAL, LOW
    sla_hours = Column(Integer, default=24, nullable=False)
    sla_deadline = Column(DateTime, nullable=True)
    action_taken = Column(String(30), nullable=True) # APPROVE, REJECT, DELEGATE, ESCALATE
    action_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action_timestamp = Column(DateTime, nullable=True)
    comments = Column(Text, nullable=True)
    delegated_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    instance = relationship("WorkflowInstance", back_populates="tasks")
    assigned_user = relationship("User", foreign_keys=[assigned_user_id])
    action_by = relationship("User", foreign_keys=[action_by_id])
    delegated_to = relationship("User", foreign_keys=[delegated_to_id])


class WorkflowAuditLog(Base):
    __tablename__ = "workflow_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instance_id = Column(UUID(as_uuid=True), ForeignKey("workflow_instances.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False) # TRIGGERED, STAGE_ADVANCED, APPROVED, REJECTED, ESCALATED, RETRY_EXECUTED
    actor_name = Column(String(255), nullable=False)
    details_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    instance = relationship("WorkflowInstance", back_populates="audit_logs")


# ============================================================
# DOC-33: Audit Trail, Data Governance & Compliance Control Engine
# ============================================================

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_name = Column(String(100), nullable=False, default="System")
    event_type = Column(String(80), nullable=False, index=True) # CREATE, UPDATE, CANCEL, APPROVE, REJECT, POST, REVERSE, EXPORT, LOGIN, LEGAL_HOLD_APPLIED
    object_type = Column(String(60), nullable=False, index=True) # INVOICE, VOUCHER, PARTY, PRODUCT, PRICE_LIST, ROLE, RETENTION_POLICY, LEGAL_HOLD
    object_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    document_number = Column(String(100), nullable=True, index=True)
    event_time = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    before_payload = Column(JSONB, nullable=True)
    after_payload = Column(JSONB, nullable=True)
    reason = Column(Text, nullable=True)
    correlation_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    prev_hash = Column(String(64), nullable=True, index=True)
    event_hash = Column(String(64), nullable=False, index=True)
    is_verified = Column(Boolean, default=True, nullable=False)

    organization = relationship("Organization")
    actor = relationship("User", foreign_keys=[actor_id])


class RetentionPolicy(Base):
    __tablename__ = "retention_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    object_type = Column(String(60), nullable=False, index=True) # INVOICE, VOUCHER, AUDIT_EVENT, PARTY, MASTER
    retention_days = Column(Integer, nullable=False, default=2920) # Default 8 years (2920 days) statutory MCA/GST
    legal_hold_allowed = Column(Boolean, default=True, nullable=False)
    effective_from = Column(Date, default=date.today, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    organization = relationship("Organization")


class LegalHold(Base):
    __tablename__ = "legal_holds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    scope_type = Column(String(30), nullable=False) # RECORD, MODULE, PARTY, ALL
    scope_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    scope_description = Column(String(200), nullable=True)
    reason = Column(Text, nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    released_at = Column(DateTime, nullable=True)
    release_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    organization = relationship("Organization")
    created_by = relationship("User", foreign_keys=[created_by_id])


# ============================================================
# DOC-34: Cargo & Consignment Management Engine
# ============================================================

class Consignment(Base):
    __tablename__ = "consignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consignment_number = Column(String(50), nullable=False, unique=True, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True) # Beneficiary Client
    cost_bearer_company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True) # Admin or Client cost bearer
    source_dispatch_id = Column(UUID(as_uuid=True), nullable=True, index=True) # DOC-19 Dispatch / Invoice Link
    document_number = Column(String(100), nullable=True, index=True) # e.g. RJ-INV-6874 or SO-2026-1140
    transporter_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    transporter_name = Column(String(200), nullable=False, default="V-Trans Logistics India")
    vehicle_no = Column(String(50), nullable=True) # e.g. DL-01-AB-4921
    driver_name = Column(String(100), nullable=True)
    driver_phone = Column(String(30), nullable=True)
    origin_hub = Column(String(150), nullable=False, default="Jaipur Central Logistics Park")
    destination_hub = Column(String(150), nullable=False, default="Delhi South Distribution Center")
    lr_no = Column(String(80), nullable=True, index=True) # Lorry Receipt / Goods Receipt
    status = Column(String(30), nullable=False, default="PLANNED", index=True) # PLANNED, READY_FOR_LOADING, LOADING, DISPATCHED, IN_TRANSIT, DELIVERED, EXCEPTION, CLOSED
    dispatch_at = Column(DateTime, nullable=True)
    expected_delivery_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    is_admin_funded = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    beneficiary_company = relationship("Organization", foreign_keys=[company_id])
    cost_bearer_company = relationship("Organization", foreign_keys=[cost_bearer_company_id])
    packages = relationship("CargoPackage", back_populates="consignment", cascade="all, delete-orphan")
    costs = relationship("CargoCost", back_populates="consignment", cascade="all, delete-orphan")
    pod_records = relationship("PodRecord", back_populates="consignment", cascade="all, delete-orphan")


class CargoPackage(Base):
    __tablename__ = "cargo_packages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consignment_id = Column(UUID(as_uuid=True), ForeignKey("consignments.id", ondelete="CASCADE"), nullable=False, index=True)
    package_type = Column(String(40), nullable=False, default="Carton") # Carton, Box, Pallet, Bag, Drum, Loose
    barcode = Column(String(100), nullable=False, unique=True, index=True)
    gross_weight = Column(Numeric(18, 3), nullable=False, default=0.0) # kg
    tare_weight = Column(Numeric(18, 3), nullable=False, default=0.0) # kg
    net_weight = Column(Numeric(18, 3), nullable=False, default=0.0) # kg
    length_cm = Column(Numeric(18, 2), nullable=False, default=0.0)
    width_cm = Column(Numeric(18, 2), nullable=False, default=0.0)
    height_cm = Column(Numeric(18, 2), nullable=False, default=0.0)
    cbm = Column(Numeric(18, 6), nullable=False, default=0.0) # Length * Width * Height / 1,000,000
    is_fragile = Column(Boolean, default=False, nullable=False)
    status = Column(String(30), nullable=False, default="INTACT") # INTACT, DAMAGED, SHORT, REPACKED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    consignment = relationship("Consignment", back_populates="packages")


class CargoCost(Base):
    __tablename__ = "cargo_costs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consignment_id = Column(UUID(as_uuid=True), ForeignKey("consignments.id", ondelete="CASCADE"), nullable=False, index=True)
    beneficiary_company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    cost_bearer_company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    cost_type = Column(String(40), nullable=False, index=True) # FREIGHT, LOADING, TOLL, DRAYAGE, HANDLING, INSURANCE
    gross_cost = Column(Numeric(18, 2), nullable=False, default=0.0)
    recovery_amount = Column(Numeric(18, 2), nullable=False, default=0.0)
    net_bearer_cost = Column(Numeric(18, 2), nullable=False, default=0.0)
    is_admin_borne = Column(Boolean, default=True, nullable=False)
    is_recoverable = Column(Boolean, default=False, nullable=False)
    recovery_status = Column(String(30), default="UNBILLED", nullable=False) # UNBILLED, BILLED, RECOVERED, WAIVED
    accounting_voucher_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    consignment = relationship("Consignment", back_populates="costs")
    beneficiary_company = relationship("Organization", foreign_keys=[beneficiary_company_id])
    cost_bearer_company = relationship("Organization", foreign_keys=[cost_bearer_company_id])


class PodRecord(Base):
    __tablename__ = "pod_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consignment_id = Column(UUID(as_uuid=True), ForeignKey("consignments.id", ondelete="CASCADE"), nullable=False, index=True)
    received_by = Column(String(160), nullable=False)
    received_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    accepted_qty = Column(Numeric(18, 3), nullable=False, default=0.0)
    short_qty = Column(Numeric(18, 3), nullable=False, default=0.0)
    damage_qty = Column(Numeric(18, 3), nullable=False, default=0.0)
    status = Column(String(30), nullable=False, default="CONFIRMED") # CONFIRMED, DISCREPANCY, PENDING_REVIEW
    remarks = Column(Text, nullable=True)
    signature_token = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    consignment = relationship("Consignment", back_populates="pod_records")


# ============================================================
# DOC-35: Freight & Logistics Cost & Recovery Engine
# ============================================================

class FreightContract(Base):
    __tablename__ = "freight_contracts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_number = Column(String(80), nullable=False, unique=True, index=True)
    transporter_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    transporter_name = Column(String(200), nullable=False, default="V-Trans Logistics India")
    company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(30), nullable=False, default="ACTIVE", index=True) # ACTIVE, DRAFT, EXPIRED, TERMINATED
    effective_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    effective_to = Column(DateTime, nullable=True)
    priority = Column(Integer, default=1, nullable=False)
    vehicle_class = Column(String(50), nullable=False, default="ANY") # 14FT_TRUCK, 32FT_CONTAINER, TRAILER, ANY
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    lanes = relationship("FreightLane", back_populates="contract", cascade="all, delete-orphan")
    rate_rules = relationship("FreightRateRule", back_populates="contract", cascade="all, delete-orphan")
    ancillary_rules = relationship("FreightAncillaryRule", back_populates="contract", cascade="all, delete-orphan")


class FreightLane(Base):
    __tablename__ = "freight_lanes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("freight_contracts.id", ondelete="CASCADE"), nullable=True, index=True)
    origin_zone = Column(String(100), nullable=False, default="Jaipur Central")
    destination_zone = Column(String(100), nullable=False, default="Delhi South")
    distance_km = Column(Numeric(10, 2), nullable=False, default=260.0)
    distance_source = Column(String(40), default="CONTRACTED", nullable=False) # CONTRACTED, ESTIMATED, ACTUAL, GOOGLE_MAPS
    transit_days = Column(Integer, default=1, nullable=False)
    priority = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    contract = relationship("FreightContract", back_populates="lanes")


class FreightRateRule(Base):
    __tablename__ = "freight_rate_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("freight_contracts.id", ondelete="CASCADE"), nullable=False, index=True)
    lane_id = Column(UUID(as_uuid=True), ForeignKey("freight_lanes.id", ondelete="SET NULL"), nullable=True, index=True)
    charge_basis = Column(String(40), nullable=False, default="PER_KG") # FLAT, PER_KG, PER_PACKAGE, PER_QUINTAL, PER_TON, PER_KM, PERCENTAGE, SLAB, HYBRID
    base_rate = Column(Numeric(18, 2), nullable=False, default=6.50)
    min_charge = Column(Numeric(18, 2), nullable=False, default=500.0)
    max_cap = Column(Numeric(18, 2), nullable=True)
    slab_config = Column(Text, nullable=True) # JSON string of slabs
    rounding_rule = Column(String(40), default="NEAREST_1", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    contract = relationship("FreightContract", back_populates="rate_rules")


class FreightAncillaryRule(Base):
    __tablename__ = "freight_ancillary_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("freight_contracts.id", ondelete="CASCADE"), nullable=True, index=True)
    ancillary_type = Column(String(40), nullable=False) # LOADING, UNLOADING, HAMALI, TOLL, PARKING, DETENTION, INSURANCE, HANDLING, OTHER
    charge_basis = Column(String(40), nullable=False, default="FLAT") # FLAT, PER_KG, PER_PACKAGE, PERCENTAGE, ACTUAL
    rate = Column(Numeric(18, 2), nullable=False, default=0.0)
    is_mandatory = Column(Boolean, default=False, nullable=False)
    condition_text = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    contract = relationship("FreightContract", back_populates="ancillary_rules")


class FreightCostEvent(Base):
    __tablename__ = "freight_cost_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_number = Column(String(60), nullable=False, unique=True, index=True) # e.g. FCE-2026-0001
    consignment_id = Column(UUID(as_uuid=True), ForeignKey("consignments.id", ondelete="SET NULL"), nullable=True, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    beneficiary_company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    cost_bearer_company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("freight_contracts.id", ondelete="SET NULL"), nullable=True, index=True)
    cost_type = Column(String(50), nullable=False, default="COMBINED_FREIGHT", index=True) # BASE_FREIGHT, ANCILLARY_LOADING, ANCILLARY_TOLL, ANCILLARY_HAMALI, ANCILLARY_DETENTION, COMBINED_FREIGHT
    estimated_amount = Column(Numeric(18, 2), nullable=False, default=0.0)
    actual_amount = Column(Numeric(18, 2), nullable=False, default=0.0)
    variance_amount = Column(Numeric(18, 2), nullable=False, default=0.0) # actual - estimated
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(30), default="ESTIMATED", nullable=False, index=True) # ESTIMATED, ACCRUED, ACTUAL_RECEIVED, RECONCILED, FINALIZED, DISPUTED, CLOSED
    is_admin_funded = Column(Boolean, default=True, nullable=False)
    snapshot_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    accounting_voucher_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    allocations = relationship("FreightAllocation", back_populates="cost_event", cascade="all, delete-orphan")
    recoveries = relationship("FreightRecovery", back_populates="cost_event", cascade="all, delete-orphan")


class FreightCalculationSnapshot(Base):
    __tablename__ = "freight_calculation_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cost_event_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    source_ref = Column(String(100), nullable=True, index=True) # Consignment No or Bill No
    rule_version = Column(String(50), nullable=False, default="v2.0-DOC35")
    inputs_json = Column(Text, nullable=False) # JSON string of inputs
    outputs_json = Column(Text, nullable=False) # JSON string of computed outputs
    formula_text = Column(Text, nullable=False) # Explanatory text of formula
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class FreightAllocation(Base):
    __tablename__ = "freight_allocations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cost_event_id = Column(UUID(as_uuid=True), ForeignKey("freight_cost_events.id", ondelete="CASCADE"), nullable=False, index=True)
    target_type = Column(String(40), nullable=False, default="INVOICE") # INVOICE, CHALLAN, CONSIGNMENT, PACKAGE
    target_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    target_number = Column(String(100), nullable=True) # e.g. RJ-INV-6874
    allocation_method = Column(String(40), nullable=False, default="WEIGHT") # WEIGHT, VALUE, PACKAGE_COUNT, EQUAL, MANUAL
    allocated_ratio = Column(Numeric(8, 4), nullable=False, default=1.0)
    allocated_amount = Column(Numeric(18, 2), nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    cost_event = relationship("FreightCostEvent", back_populates="allocations")


class FreightRecovery(Base):
    __tablename__ = "freight_recoveries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cost_event_id = Column(UUID(as_uuid=True), ForeignKey("freight_cost_events.id", ondelete="CASCADE"), nullable=False, index=True)
    recovery_type = Column(String(40), nullable=False, default="FULL_PASS_THROUGH") # FULL_PASS_THROUGH, FIXED, RATE_BASED, PERCENTAGE, PRINCIPAL_CLAIM, SUBSIDY, NO_RECOVERY
    recovery_party_type = Column(String(40), nullable=False, default="CUSTOMER") # CUSTOMER, PRINCIPAL, CLIENT_COMPANY, INTERNAL
    recovery_party_id = Column(UUID(as_uuid=True), nullable=True)
    recovery_party_name = Column(String(200), nullable=True)
    recovery_amount = Column(Numeric(18, 2), nullable=False, default=0.0)
    subsidy_amount = Column(Numeric(18, 2), nullable=False, default=0.0)
    logistics_margin = Column(Numeric(18, 2), nullable=False, default=0.0) # recovery - actual_cost
    billing_invoice_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    status = Column(String(30), default="PENDING", nullable=False) # PENDING, BILLED, RECOVERED, WAIVED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    cost_event = relationship("FreightCostEvent", back_populates="recoveries")


class FreightReconciliation(Base):
    __tablename__ = "freight_reconciliations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recon_number = Column(String(80), nullable=False, unique=True, index=True)
    transporter_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    transporter_name = Column(String(200), nullable=False, default="V-Trans Logistics India")
    transporter_invoice_no = Column(String(100), nullable=False, index=True)
    transporter_invoice_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    expected_amount = Column(Numeric(18, 2), nullable=False, default=0.0)
    billed_amount = Column(Numeric(18, 2), nullable=False, default=0.0)
    approved_amount = Column(Numeric(18, 2), nullable=False, default=0.0)
    variance_amount = Column(Numeric(18, 2), nullable=False, default=0.0) # billed - expected
    variance_status = Column(String(40), default="MATCHED", nullable=False) # MATCHED, TOLERABLE, UNAPPROVED_EXCESS, DISPUTED, RESOLVED
    dispute_reason = Column(Text, nullable=True)
    approved_by_id = Column(UUID(as_uuid=True), nullable=True)
    status = Column(String(30), default="DRAFT", nullable=False, index=True) # DRAFT, SUBMITTED, RECONCILED, POSTED, DISPUTED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class FreightCostBearerPolicy(Base):
    __tablename__ = "freight_cost_bearer_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope_type = Column(String(40), nullable=False, default="GLOBAL") # GLOBAL, COMPANY, CLIENT, ROUTE, TRANSPORTER
    scope_id = Column(UUID(as_uuid=True), nullable=True)
    bearer_type = Column(String(40), nullable=False, default="ADMIN_COMPANY") # ADMIN_COMPANY, CLIENT_COMPANY, PRINCIPAL, CUSTOMER, SHARED
    bearer_company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    is_recharge_enabled = Column(Boolean, default=False, nullable=False)
    effective_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    effective_to = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class FreightException(Base):
    __tablename__ = "freight_exceptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cost_event_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    exception_type = Column(String(50), nullable=False) # MISSING_RATE, CONFLICTING_RATES, EXCESS_WEIGHT, HIGH_VARIANCE, DUPLICATE_BILL, TRANSIT_HOLD
    severity = Column(String(30), nullable=False, default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(30), nullable=False, default="OPEN") # OPEN, UNDER_REVIEW, APPROVED, REJECTED, RESOLVED
    description = Column(Text, nullable=False)
    resolution_notes = Column(Text, nullable=True)
    resolved_by_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ==============================================================================
# DOC-36: PRINCIPAL & C&F OPERATIONS MANAGEMENT MODELS
# ==============================================================================

class PrincipalOperatingContext(Base):
    __tablename__ = "principal_operating_contexts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    principal_code = Column(String(50), nullable=False, index=True)
    principal_name = Column(String(200), nullable=False)
    branch_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    agreement_version_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    status = Column(String(40), nullable=False, default="ACTIVE") # ACTIVE, SUSPENDED, TERMINATED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class PrincipalAgreementVersion(Base):
    __tablename__ = "principal_agreement_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    agreement_number = Column(String(80), nullable=False, index=True)
    version_no = Column(String(20), nullable=False, default="v1.0")
    valid_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    valid_to = Column(DateTime, nullable=True)
    terms_json = Column(JSON, nullable=True) # Commission %, freight terms, claim window, credit days
    status = Column(String(30), nullable=False, default="ACTIVE") # DRAFT, ACTIVE, SUPERSEDED, EXPIRED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrincipalProductRule(Base):
    __tablename__ = "principal_product_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    product_name = Column(String(200), nullable=False)
    sku_code = Column(String(100), nullable=False, index=True)
    branch_id = Column(UUID(as_uuid=True), nullable=True)
    warehouse_id = Column(UUID(as_uuid=True), nullable=True)
    valid_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    valid_to = Column(DateTime, nullable=True)
    is_exclusive = Column(Boolean, default=False, nullable=False)
    status = Column(String(30), default="ACTIVE", nullable=False) # ACTIVE, INACTIVE, RESTRICTED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrincipalCustomerRule(Base):
    __tablename__ = "principal_customer_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    customer_group = Column(String(100), nullable=True)
    territory_id = Column(String(100), nullable=True, index=True)
    territory_name = Column(String(200), nullable=True)
    valid_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    valid_to = Column(DateTime, nullable=True)
    status = Column(String(30), default="ACTIVE", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrincipalOwnershipRule(Base):
    __tablename__ = "principal_ownership_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    product_scope = Column(String(50), default="ALL", nullable=False) # ALL, CATEGORY, SPECIFIC_SKU
    warehouse_scope = Column(String(50), default="ALL", nullable=False) # ALL, SPECIFIC_WH
    mode = Column(String(50), default="CONSIGNMENT_CUSTODY", nullable=False) # CONSIGNMENT_CUSTODY, OUTRIGHT_PURCHASE, PRINCIPAL_OWNED
    valid_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    valid_to = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrincipalEvent(Base):
    __tablename__ = "principal_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    event_type = Column(String(60), nullable=False, index=True) # INWARD_RECEIPT, DISPATCH_SALE, RETURN_INWARD, EXPIRY_CLAIM, RECONCILIATION_MATCH
    event_time = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    source_doc_type = Column(String(50), nullable=False) # INWARD, INVOICE, CHALLAN, RETURN, CLAIM, RECON
    source_doc_id = Column(String(100), nullable=False, index=True)
    payload_json = Column(JSON, nullable=True)
    payload_hash = Column(String(64), nullable=True) # SHA-256 integrity hash
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrincipalStockSnapshot(Base):
    __tablename__ = "principal_stock_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    product_name = Column(String(200), nullable=False)
    batch_no = Column(String(100), nullable=False, index=True)
    warehouse_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    warehouse_name = Column(String(100), default="Central C&F Depot", nullable=False)
    as_of = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    qty_on_hand = Column(Numeric(14, 2), default=0.0, nullable=False)
    qty_reserved = Column(Numeric(14, 2), default=0.0, nullable=False)
    qty_damage_breakage = Column(Numeric(14, 2), default=0.0, nullable=False)
    unit_cost = Column(Numeric(14, 2), default=0.0, nullable=False)
    total_valuation = Column(Numeric(18, 2), default=0.0, nullable=False)
    source_version = Column(String(50), default="v1.0", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrincipalClaim(Base):
    __tablename__ = "principal_claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_number = Column(String(80), nullable=False, unique=True, index=True)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    principal_name = Column(String(200), nullable=False)
    claim_type = Column(String(50), nullable=False, index=True) # EXPIRY, BREAKAGE, SHORTAGE, RATE_DIFFERENCE, SCHEME_REIMBURSEMENT
    source_doc_type = Column(String(50), default="RETURN", nullable=False)
    source_doc_id = Column(String(100), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), nullable=True)
    product_name = Column(String(200), nullable=True)
    batch_no = Column(String(100), nullable=True)
    claimed_qty = Column(Numeric(14, 2), default=0.0, nullable=False)
    claimed_amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    approved_amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    reason = Column(Text, nullable=True)
    evidence_url = Column(String(500), nullable=True)
    status = Column(String(40), default="PENDING", nullable=False, index=True) # PENDING, UNDER_REVIEW, APPROVED, REJECTED, PASSED_TO_SETTLEMENT, SETTLED
    settlement_doc_id = Column(String(100), nullable=True) # Reference to DOC-07 settlement voucher
    approved_by_id = Column(UUID(as_uuid=True), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrincipalClaimLine(Base):
    __tablename__ = "principal_claim_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("principal_claims.id", ondelete="CASCADE"), nullable=False, index=True)
    source_movement_id = Column(String(100), nullable=True)
    product_id = Column(UUID(as_uuid=True), nullable=False)
    batch_no = Column(String(100), nullable=False)
    expiry_date = Column(DateTime, nullable=True)
    qty = Column(Numeric(14, 2), default=0.0, nullable=False)
    eligible_qty = Column(Numeric(14, 2), default=0.0, nullable=False)
    rate = Column(Numeric(14, 2), default=0.0, nullable=False)
    amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    approved_amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    status = Column(String(30), default="PENDING", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrincipalReconciliation(Base):
    __tablename__ = "principal_reconciliations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recon_number = Column(String(80), nullable=False, unique=True, index=True)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    principal_name = Column(String(200), nullable=False)
    period_from = Column(DateTime, nullable=False)
    period_to = Column(DateTime, nullable=False)
    system_opening_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    external_opening_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    system_closing_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    external_closing_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    net_variance_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    matched_lines_count = Column(Integer, default=0, nullable=False)
    variance_lines_count = Column(Integer, default=0, nullable=False)
    version = Column(String(20), default="v1.0", nullable=False)
    status = Column(String(40), default="DRAFT", nullable=False, index=True) # DRAFT, UNDER_REVIEW, APPROVED, FROZEN, DISPUTED
    approved_by_id = Column(UUID(as_uuid=True), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrincipalReconciliationLine(Base):
    __tablename__ = "principal_reconciliation_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reconciliation_id = Column(UUID(as_uuid=True), ForeignKey("principal_reconciliations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_key = Column(String(100), nullable=False, index=True) # Transaction ref, invoice, dispatch
    source_type = Column(String(50), nullable=False) # SALE, INWARD, RETURN, CLAIM, EXPENSE
    system_qty = Column(Numeric(14, 2), default=0.0, nullable=False)
    external_qty = Column(Numeric(14, 2), default=0.0, nullable=False)
    variance_qty = Column(Numeric(14, 2), default=0.0, nullable=False)
    system_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    external_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    variance_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    reason_code = Column(String(100), nullable=True) # RATE_MISMATCH, PROOF_SHORTAGE, UNPOSTED_RETURN
    status = Column(String(30), default="MATCHED", nullable=False) # MATCHED, VARIANCE, INVESTIGATION, RESOLVED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrincipalStatementRun(Base):
    __tablename__ = "principal_statement_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_number = Column(String(80), nullable=False, unique=True, index=True)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    period_from = Column(DateTime, nullable=False)
    period_to = Column(DateTime, nullable=False)
    filters_hash = Column(String(64), nullable=True)
    source_versions = Column(String(100), default="DOC16:v1,DOC08:v1", nullable=False)
    opening_stock_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    receipts_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    sales_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    returns_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    claims_pending_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    freight_cost_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    closing_stock_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    status = Column(String(30), default="COMPLETED", nullable=False) # GENERATING, COMPLETED, ARCHIVED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrincipalStatementLine(Base):
    __tablename__ = "principal_statement_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("principal_statement_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(UUID(as_uuid=True), nullable=True)
    source_doc_id = Column(String(100), nullable=False, index=True)
    category = Column(String(50), nullable=False) # OPENING, INWARD, SALE, RETURN, CLAIM, FREIGHT, COMMISSION, CLOSING
    product_name = Column(String(200), nullable=True)
    batch_no = Column(String(100), nullable=True)
    qty = Column(Numeric(14, 2), default=0.0, nullable=False)
    amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    status = Column(String(30), default="POSTED", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrincipalCostAttribution(Base):
    __tablename__ = "principal_cost_attributions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    source_cost_id = Column(String(100), nullable=False, index=True) # Links to DOC-35 FreightCostEvent
    bearer = Column(String(40), nullable=False, default="ADMIN_COMPANY") # ADMIN_COMPANY, PRINCIPAL, CLIENT_COMPANY
    recovery_target = Column(String(50), default="PRINCIPAL_CLAIM", nullable=False) # PRINCIPAL_CLAIM, CUSTOMER_INVOICE, SUBSIDY
    amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    policy_version = Column(String(50), default="v2.0", nullable=False)
    status = Column(String(30), default="ATTRIBUTED", nullable=False) # ATTRIBUTED, RECOVERED, ABSORBED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrincipalCommissionRef(Base):
    __tablename__ = "principal_commission_refs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    source_event_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    commission_doc_id = Column(String(100), nullable=False, index=True) # Links to DOC-37 commission voucher
    gross_sales_val = Column(Numeric(18, 2), default=0.0, nullable=False)
    commission_rate_pct = Column(Numeric(6, 2), default=5.0, nullable=False)
    commission_amount = Column(Numeric(18, 2), default=0.0, nullable=False)
    status = Column(String(30), default="ACCRUED", nullable=False) # ACCRUED, BILLED, SETTLED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrincipalSyncCheckpoint(Base):
    __tablename__ = "principal_sync_checkpoints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    scope_key = Column(String(100), nullable=False, index=True) # STOCK, CLAIMS, RECON, EVENTS
    cursor = Column(String(100), nullable=False)
    hash = Column(String(64), nullable=False)
    synced_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ==============================================================================
# DOC-37: PRINCIPAL & C&F COMMISSION & RECOVERY ENGINE MODELS
# ==============================================================================

class PrincipalCommissionAgreement(Base):
    __tablename__ = "principal_commission_agreements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    principal_code = Column(String(50), nullable=False, index=True)
    principal_name = Column(String(200), nullable=False)
    agreement_code = Column(String(80), nullable=False, index=True)
    version_no = Column(String(20), nullable=False, default="v1.0")
    valid_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    valid_to = Column(DateTime, nullable=True)
    status = Column(String(40), nullable=False, default="ACTIVE") # DRAFT, ACTIVE, SUPERSEDED, TERMINATED
    terms_json = Column(JSON, nullable=True) # commission %, minimum guarantees, recoverable ancillaries
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class CommissionRule(Base):
    __tablename__ = "commission_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agreement_id = Column(UUID(as_uuid=True), ForeignKey("principal_commission_agreements.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_code = Column(String(50), nullable=False, index=True)
    rule_name = Column(String(150), nullable=False)
    priority = Column(Integer, default=1, nullable=False)
    rule_type = Column(String(50), nullable=False, default="PERCENTAGE") # PERCENTAGE, PER_UNIT, FIXED_PERIOD, SLAB, MINIMUM_GUARANTEE, CAP_FLOOR, HYBRID
    rate_pct = Column(Numeric(6, 2), default=0.0, nullable=False)
    unit_rate = Column(Numeric(12, 2), default=0.0, nullable=False)
    fixed_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    min_guarantee_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    cap_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    floor_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    formula_config = Column(JSON, nullable=True)
    status = Column(String(30), default="ACTIVE", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CommissionScope(Base):
    __tablename__ = "commission_scopes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("commission_rules.id", ondelete="CASCADE"), nullable=False, index=True)
    product_scope = Column(String(50), default="ALL", nullable=False) # ALL, CATEGORY, SKU
    customer_scope = Column(String(50), default="ALL", nullable=False) # ALL, TIER, SPECIFIC
    territory_scope = Column(String(50), default="ALL", nullable=False)
    branch_id = Column(UUID(as_uuid=True), nullable=True)
    scope_filter_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CommissionEvent(Base):
    __tablename__ = "commission_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    event_type = Column(String(60), nullable=False, index=True) # SALES_BILL, SALES_RETURN, FREIGHT_COST, STORAGE_CHARGE, LOADING_CHARGE
    event_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    source_doc_type = Column(String(50), nullable=False) # INVOICE, RETURN, FREIGHT_EVENT, CONSIGNMENT
    source_doc_id = Column(String(100), nullable=False, index=True)
    source_line_id = Column(String(100), nullable=True)
    idempotency_key = Column(String(120), nullable=False, unique=True, index=True)
    payload_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CommissionMeasure(Base):
    __tablename__ = "commission_measures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("commission_events.id", ondelete="CASCADE"), nullable=False, index=True)
    measure_type = Column(String(50), nullable=False) # NET_SALES_VALUE, GROSS_SALES_VALUE, QUANTITY_UNITS, WEIGHT_KG, PACKAGE_COUNT
    base_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    base_quantity = Column(Numeric(14, 2), default=0.0, nullable=False)
    uom = Column(String(20), default="INR", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CommissionCalculation(Base):
    __tablename__ = "commission_calculations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    calculation_number = Column(String(80), nullable=False, unique=True, index=True)
    event_id = Column(UUID(as_uuid=True), ForeignKey("commission_events.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    principal_name = Column(String(200), nullable=False)
    category = Column(String(40), default="EARNED_COMMISSION", nullable=False) # EARNED_COMMISSION, RECOVERABLE_EXPENSE, SERVICE_FEE
    event_type = Column(String(60), nullable=True) # SALES_BILL, GODOWN_RENT, STAFF_SALARY, FREIGHT_COST
    client_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    client_name = Column(String(200), nullable=True)
    base_value = Column(Numeric(14, 2), default=0.0, nullable=False)
    rate_applied = Column(Numeric(8, 4), default=0.0, nullable=False)
    calculated_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    formula_trace = Column(Text, nullable=True)
    state = Column(String(40), default="CALCULATED", nullable=False, index=True) # CALCULATED, REVIEW_REQUIRED, APPROVED, BATCHED, RECOVERY_CREATED, DISPUTED, SETTLED, CANCELLED
    sha256_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CommissionAdjustment(Base):
    __tablename__ = "commission_adjustments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_calc_id = Column(UUID(as_uuid=True), ForeignKey("commission_calculations.id", ondelete="CASCADE"), nullable=False, index=True)
    delta_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    reason_code = Column(String(100), nullable=False) # RETURN_REDUCTION, RATE_CORRECTION, DISPUTE_RESOLUTION, RETRO_SLAB
    description = Column(Text, nullable=True)
    approved_by_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class RecoveryClaim(Base):
    __tablename__ = "recovery_claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_number = Column(String(80), nullable=False, unique=True, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    principal_name = Column(String(200), nullable=False)
    period_from = Column(DateTime, nullable=False)
    period_to = Column(DateTime, nullable=False)
    total_earned_commission = Column(Numeric(14, 2), default=0.0, nullable=False)
    total_recoverable_expenses = Column(Numeric(14, 2), default=0.0, nullable=False)
    total_claimed_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    approved_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    disputed_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    status = Column(String(40), default="DRAFT", nullable=False, index=True) # DRAFT, READY, SUBMITTED, ACKNOWLEDGED, APPROVED, PARTIALLY_APPROVED, DISPUTED, RECOVERY_CREATED, SETTLED, REJECTED
    submitted_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class RecoveryClaimLine(Base):
    __tablename__ = "recovery_claim_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("recovery_claims.id", ondelete="CASCADE"), nullable=False, index=True)
    calc_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    source_doc_type = Column(String(50), nullable=False)
    source_doc_id = Column(String(100), nullable=False, index=True)
    line_description = Column(String(255), nullable=False)
    requested_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    approved_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    disputed_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    status = Column(String(30), default="PENDING", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class RecoveryDocumentLink(Base):
    __tablename__ = "recovery_document_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("recovery_claims.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String(50), nullable=False) # SERVICE_INVOICE, CREDIT_NOTE, DEBIT_NOTE, RECOVERY_REQUEST
    document_number = Column(String(100), nullable=False, index=True)
    amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    linked_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class RecoveryStatement(Base):
    __tablename__ = "recovery_statements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    statement_number = Column(String(80), nullable=False, unique=True, index=True)
    principal_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    principal_name = Column(String(200), nullable=False)
    period_from = Column(DateTime, nullable=False)
    period_to = Column(DateTime, nullable=False)
    earned_commission = Column(Numeric(14, 2), default=0.0, nullable=False)
    service_fees = Column(Numeric(14, 2), default=0.0, nullable=False)
    expense_recovery = Column(Numeric(14, 2), default=0.0, nullable=False)
    adjustments = Column(Numeric(14, 2), default=0.0, nullable=False)
    approved_commercial = Column(Numeric(14, 2), default=0.0, nullable=False)
    invoiced_total = Column(Numeric(14, 2), default=0.0, nullable=False)
    settled_total = Column(Numeric(14, 2), default=0.0, nullable=False)
    outstanding_balance = Column(Numeric(14, 2), default=0.0, nullable=False)
    disputed_total = Column(Numeric(14, 2), default=0.0, nullable=False)
    statement_hash = Column(String(64), nullable=True)
    status = Column(String(30), default="GENERATED", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class RecoveryStatementLine(Base):
    __tablename__ = "recovery_statement_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    statement_id = Column(UUID(as_uuid=True), ForeignKey("recovery_statements.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(50), nullable=False) # EARNED_COMMISSION, SERVICE_FEE, EXPENSE_RECOVERY, ADJUSTMENT, SETTLEMENT
    reference_doc_id = Column(String(100), nullable=False, index=True)
    description = Column(String(255), nullable=False)
    amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CommissionException(Base):
    __tablename__ = "commission_exceptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String(100), nullable=False, index=True)
    exception_type = Column(String(60), nullable=False) # UNMAPPED_PRODUCT, EXPIRED_AGREEMENT, MISSING_RATE_CARD, UNAPPROVED_ANCILLARY
    severity = Column(String(20), default="WARNING", nullable=False) # INFO, WARNING, ERROR, CRITICAL
    description = Column(Text, nullable=False)
    state = Column(String(30), default="OPEN", nullable=False) # OPEN, RESOLVED, WAIVED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CommissionAudit(Base):
    __tablename__ = "commission_audits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    object_type = Column(String(60), nullable=False) # CALCULATION, CLAIM, STATEMENT, AGREEMENT
    object_id = Column(String(100), nullable=False, index=True)
    action = Column(String(50), nullable=False) # CALCULATE, APPROVE, DISPUTE, SUBMIT, RECONCILE, RECALCULATE
    actor_username = Column(String(100), default="admin", nullable=False)
    before_hash = Column(String(64), nullable=True)
    after_hash = Column(String(64), nullable=True)
    details_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ============================================================
# DOC-41: PHARMA EXPIRY RADAR & STOCK SHIFT QUARANTINE ENGINE
# ============================================================

class StockShiftVoucher(Base):
    __tablename__ = "stock_shift_vouchers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    voucher_no = Column(String(50), nullable=False, index=True)
    shift_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    from_godown = Column(String(100), default="MAIN_SALEABLE_GODOWN", nullable=False)
    to_godown = Column(String(100), default="QUARANTINE_EXPIRY_GODOWN", nullable=False)
    reason = Column(String(255), nullable=True)
    company_id = Column(UUID(as_uuid=True), nullable=True)
    principal_id = Column(UUID(as_uuid=True), nullable=True)
    total_items = Column(Integer, default=0, nullable=False)
    total_qty = Column(Numeric(12, 2), default=0.0, nullable=False)
    total_value = Column(Numeric(12, 2), default=0.0, nullable=False)
    auto_claim_generated = Column(Boolean, default=False, nullable=False)
    principal_claim_id = Column(UUID(as_uuid=True), ForeignKey("principal_claims.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(30), default="COMPLETED", nullable=False) # COMPLETED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    items = relationship("StockShiftItem", back_populates="voucher", cascade="all, delete-orphan")
    organization = relationship("Organization")
    principal_claim = relationship("PrincipalClaim")


class StockShiftItem(Base):
    __tablename__ = "stock_shift_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    voucher_id = Column(UUID(as_uuid=True), ForeignKey("stock_shift_vouchers.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_number = Column(String(100), nullable=False)
    expiry = Column(String(50), nullable=True)
    qty = Column(Integer, nullable=False, default=1)
    rate = Column(Numeric(12, 2), default=0.0, nullable=False)
    value = Column(Numeric(12, 2), default=0.0, nullable=False)
    mrp = Column(Numeric(12, 2), default=0.0, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    voucher = relationship("StockShiftVoucher", back_populates="items")
    product = relationship("Product")
    batch = relationship("Batch")


# =============================================================================
# DOC-43: STATUTORY GSTR-2B AUTO-DRAFTED ITC STATEMENT & MATCHING ENGINE
# =============================================================================

class Gstr2bEntry(Base):
    """
    Stores official auto-drafted GSTR-2B statement records received from the
    GSTN portal for Section 16(2)(aa) ITC matching against ERP Inward Purchases.
    """
    __tablename__ = "gstr2b_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_gstin = Column(String(15), nullable=False, index=True)
    supplier_name = Column(String(255), nullable=False)
    invoice_number = Column(String(100), nullable=False, index=True)
    invoice_type = Column(String(20), default="B2B", nullable=False) # B2B, CDNR, B2BUR
    invoice_date = Column(DateTime, nullable=False)
    taxable_value = Column(Numeric(12, 2), default=0.0, nullable=False)
    cgst = Column(Numeric(12, 2), default=0.0, nullable=False)
    sgst = Column(Numeric(12, 2), default=0.0, nullable=False)
    igst = Column(Numeric(12, 2), default=0.0, nullable=False)
    total_tax = Column(Numeric(12, 2), default=0.0, nullable=False)
    total_invoice_value = Column(Numeric(12, 2), default=0.0, nullable=False)
    place_of_supply = Column(String(50), nullable=True) # e.g. "27-Maharashtra"
    itc_availability = Column(String(20), default="YES", nullable=False) # YES, NO
    itc_applicable_percent = Column(Numeric(5, 2), default=100.0, nullable=False)
    gstr1_filing_date = Column(DateTime, nullable=True)
    gstr1_filing_period = Column(String(20), nullable=True) # e.g. "042026"
    reconciliation_status = Column(String(50), default="PENDING", nullable=False, index=True) # MATCHED, TAX_MISMATCH, MISSING_IN_BOOKS, CLAIMED, DISPUTED
    match_confidence = Column(Numeric(5, 2), default=0.0, nullable=False)
    matched_invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True)
    action_remarks = Column(String(500), nullable=True)
    action_taken_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    organization = relationship("Organization")
    matched_invoice = relationship("Invoice")







