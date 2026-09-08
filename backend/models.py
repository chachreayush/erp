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
    Column,          # Defines a table column
    String,          # Text column (variable length)
    Boolean,         # True/False column
    DateTime,        # Date + time column
    ForeignKey,      # Links one table to another (relationship)
    Text,            # Long text column (for descriptions)
    Enum as SAEnum   # A column that only accepts specific values
)
from sqlalchemy.orm import relationship  # Defines relationships between tables
from sqlalchemy.dialects.postgresql import UUID  # PostgreSQL-specific UUID type
from database import Base  # The declarative base all models inherit from
import uuid                # Python standard library for generating UUIDs
from datetime import datetime  # For timestamps
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
from sqlalchemy import Numeric, Integer, Date

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
    organization = relationship("Organization", back_populates="products")
    company = relationship("Manufacturer", foreign_keys=[company_id])
    salt_relation = relationship("Salt", foreign_keys=[salt_id])
    hsn = relationship("HSNCode", foreign_keys=[hsn_id])

    def __repr__(self):
        return f"<Product {self.code}: {self.name}>"


# -- TABLE 5.1: Batch (Inventory) ------------------------------
class Batch(Base):
    __tablename__ = "batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    batch_number = Column(String(100), nullable=False, index=True)
    expiry = Column(String(50), nullable=True)
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
    
    # Advanced ERP Fields
    party_inv_no = Column(String(100), nullable=True, index=True)
    party_inv_date = Column(String(50), nullable=True)
    due_date = Column(String(50), nullable=True)
    remarks = Column(String(500), nullable=True)
    dispatch_through = Column(String(100), nullable=True)
    destination = Column(String(100), nullable=True)
    bill_discount = Column(Numeric(12, 2), nullable=True, default=0)
    
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
    supplier_ledger = relationship("Ledger")

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

