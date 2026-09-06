# ============================================================
# auth/service.py — Authentication Business Logic
# ============================================================
# This file contains the CORE LOGIN LOGIC of the entire system.
# It is the "brain" of authentication — it takes credentials,
# validates them against the database, builds permissions,
# and returns a complete session package.
#
# WHY A SEPARATE SERVICE FILE?
# Keeping business logic out of the router (routes file) is
# a best practice called "separation of concerns":
# - router.py  → handles HTTP (what URL, what method, what response code)
# - service.py → handles business logic (IS this login valid? WHAT permissions?)
# This makes code easier to test, debug, and reuse.
# ============================================================

from sqlalchemy.orm import Session as DBSession
from datetime import timedelta
from typing import Optional
from uuid import UUID

# Our own modules
from models import User, Organization, Session as SessionModel, UserRole
from schemas import (
    LoginRequest, LoginResponse, UserProfileSchema,
    UserPermissionsSchema, ModulePermissionSchema
)
from auth.utils import (
    verify_password,
    create_access_token,
    hash_token_for_storage,
    ACCESS_TOKEN_EXPIRE_MINUTES
)


# ── PERMISSION BUILDER ────────────────────────────────────────
def build_permissions_for_role(role: UserRole) -> UserPermissionsSchema:
    """
    Builds the complete permission set for a user based on their role.
    
    This is the SINGLE SOURCE OF TRUTH for role-based access control.
    When a role's permissions need to change, only this function needs updating.

    PERMISSION PHILOSOPHY:
    - Higher roles get more permissions — additive, not restrictive
    - Deletion and approval always require Manager level or above
    - AM Admin sees everything; Viewer sees everything but can do nothing

    Args:
        role: The UserRole enum value for the user

    Returns:
        A UserPermissionsSchema with all module permissions set
    """

    # Helper lambdas for cleaner code below
    # full(): All permissions enabled
    full    = lambda: ModulePermissionSchema(view=True, create=True, edit=True, delete=True, approve=True)
    # editor(): Can view, create, edit — but NOT delete or approve
    editor  = lambda: ModulePermissionSchema(view=True, create=True, edit=True, delete=False, approve=False)
    # viewer_only(): Can ONLY view — no modifications at all
    viewer_only = lambda: ModulePermissionSchema(view=True, create=False, edit=False, delete=False, approve=False)
    # no_access(): Cannot even see the module
    no_access = lambda: ModulePermissionSchema(view=False, create=False, edit=False, delete=False, approve=False)

    # ── AM_ADMIN: Complete system access ────────────────────────
    # The Account Master Admin is the god-mode user.
    # Has full access to every module in every organization.
    if role == UserRole.AM_ADMIN:
        all_full = full()
        return UserPermissionsSchema(
            finance=all_full, inventory=all_full, sales=all_full,
            crm=all_full, hr=all_full, reports=all_full, settings=all_full
        )

    # ── CM_ADMIN: Full access within their organization ───────────────
    # Same as AM_ADMIN but only for their own organization's data.
    # Data isolation is enforced at the database query level,
    # not at the permission level — so permissions are the same as AM_ADMIN.
    elif role == UserRole.CM_ADMIN:
        all_full = full()
        return UserPermissionsSchema(
            finance=all_full, inventory=all_full, sales=all_full,
            crm=all_full, hr=all_full, reports=all_full, settings=all_full
        )

    # ── MANAGER: Full operations but cannot change system settings ─
    elif role == UserRole.MANAGER:
        return UserPermissionsSchema(
            finance=full(),
            inventory=full(),
            sales=full(),
            crm=full(),
            hr=full(),
            reports=full(),
            settings=viewer_only()  # Can VIEW settings but not change them
        )

    # ── AREA_MANAGER: Sales + CRM full access, finance view only ──
    elif role == UserRole.AREA_MANAGER:
        return UserPermissionsSchema(
            finance=viewer_only(),   # Can see financial data but not modify
            inventory=editor(),      # Can manage inventory
            sales=full(),            # Full sales management
            crm=full(),              # Full CRM management
            hr=viewer_only(),        # Can see their team's HR data
            reports=viewer_only(),   # Can view reports
            settings=no_access()     # No settings access
        )

    # ── STAFF: Standard day-to-day ERP operations ───────────────
    elif role == UserRole.STAFF:
        return UserPermissionsSchema(
            finance=editor(),        # Can create invoices, edit — no delete/approve
            inventory=editor(),      # Can add/edit stock — no delete
            sales=editor(),          # Can create/edit orders
            crm=editor(),            # Can manage customers
            hr=no_access(),          # No HR access (privacy)
            reports=viewer_only(),   # Can view reports
            settings=no_access()     # No settings access
        )

    # ── FIELD_STAFF: Mobile-focused, limited access ─────────────
    elif role == UserRole.FIELD_STAFF:
        return UserPermissionsSchema(
            finance=viewer_only(),   # Can view outstanding amounts for collection
            inventory=viewer_only(), # Can check stock levels
            sales=editor(),          # Primary function — create orders in the field
            crm=editor(),            # Can create/edit customer visit records
            hr=no_access(),
            reports=viewer_only(),   # Can see their own sales reports
            settings=no_access()
        )

    # ── VIEWER: Read-only access to everything ───────────────────
    elif role == UserRole.VIEWER:
        view = viewer_only()
        return UserPermissionsSchema(
            finance=view, inventory=view, sales=view,
            crm=view, hr=view, reports=view, settings=no_access()
        )

    # ── DEFAULT: No access (safety fallback) ────────────────────
    # If somehow an unknown role gets through, deny everything.
    else:
        no = no_access()
        return UserPermissionsSchema(
            finance=no, inventory=no, sales=no,
            crm=no, hr=no, reports=no, settings=no
        )


# ── MAIN LOGIN SERVICE FUNCTION ───────────────────────────────
def authenticate_user(
    request: LoginRequest,
    db: DBSession,
    is_server_mode: bool = False
) -> LoginResponse:
    """
    The main login function. Validates credentials and creates a session.

    COMPLETE FLOW:
    1. Find the organization (from org_code or use local organization in LAN mode)
    2. Find the user by username within that organization
    3. Verify the password against the stored bcrypt hash
    4. Build the user's permission set based on their role
    5. Create a JWT access token
    6. Save the session to the database
    7. Return the token + full user profile to the frontend

    Args:
        request:        The LoginRequest data from the frontend
        db:             The database session (injected by FastAPI)
        is_server_mode: If True, this machine is the server — use local AM organization

    Returns:
        LoginResponse with token and user profile on success

    Raises:
        ValueError: With a human-readable error message on any failure
                   (wrong password, user not found, organization not found, etc.)
    """

    # ── STEP 1: FIND THE COMPANY ─────────────────────────────────
    if request.is_lan or is_server_mode:
        # LAN MODE: The server knows it belongs to the AM organization.
        # Find the AM organization (there should be exactly one).
        organization = db.query(Organization).filter(
            Organization.is_am == True,
            Organization.is_active == True
        ).first()

        if not organization:
            raise ValueError(
                "No AM organization found in the database. "
                "Please run the seed script to create the initial organization."
            )
    else:
        # REMOTE MODE: Use the org_code the user typed to find their organization
        if not request.org_code:
            raise ValueError("Organization ID is required for remote login.")

        organization = db.query(Organization).filter(
            Organization.org_code == request.org_code.upper(),  # Normalize to uppercase
            Organization.is_active == True  # Only active organizations can log in
        ).first()

        if not organization:
            raise ValueError(
                f"Organization '{request.org_code}' not found or is inactive. "
                "Please check your Organization ID."
            )

    # ── STEP 2: FIND THE USER ─────────────────────────────────────
    # Look up the user by username within the specific organization.
    # The same username can exist in multiple organizations — that's fine.
    # We filter by BOTH organization_id AND username for exact match.
    user = db.query(User).filter(
        User.username == request.username,
        User.organization_id == organization.id,
        User.is_active == True  # Disabled accounts cannot log in
    ).first()

    # Use the same generic error for both "user not found" and "wrong password"
    # WHY? If we say "user not found", attackers know valid usernames.
    # Generic error reveals nothing useful to an attacker.
    invalid_credentials_error = ValueError(
        "Invalid username or password. Please try again."
    )

    if not user:
        raise invalid_credentials_error

    # ── STEP 3: VERIFY THE PASSWORD ──────────────────────────────
    # verify_password() re-hashes the submitted password using the same
    # salt embedded in the stored hash and compares them.
    if not verify_password(request.password, user.hashed_password):
        raise invalid_credentials_error

    # ── STEP 4: BUILD PERMISSIONS ────────────────────────────────
    # Get the full permission set for this user's role.
    permissions = build_permissions_for_role(user.role)

    # ── STEP 5: CREATE JWT TOKEN ─────────────────────────────────
    token_str, token_expires = create_access_token(
        user_id=str(user.id),
        organization_id=str(user.organization_id),
        role=user.role.value if hasattr(user.role, "value") else str(user.role)
    )

    # ── STEP 6: SAVE SESSION TO DATABASE ─────────────────────────
    # Hash the token before storing (security best practice)
    token_hash = hash_token_for_storage(token_str)

    # Note: We now allow multiple active sessions per user 
    # to support multi-device and multi-tab usage.

    # Create the new session record
    new_session = SessionModel(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=token_expires,
        is_active=True
    )
    db.add(new_session)

    # Update the user's last_login timestamp
    from datetime import datetime
    user.last_login = datetime.utcnow()

    # Commit all changes to the database
    db.commit()

    # ── STEP 7: BUILD AND RETURN THE RESPONSE ────────────────────
    user_profile = UserProfileSchema(
        id=user.id,
        name=user.name,
        username=user.username,
        email=user.email,
        role=user.role,
        organization_id=user.organization_id,
        org_name=organization.name,
        org_code=organization.org_code,
        is_am_user=organization.is_am,
        permissions=permissions,
        avatar_url=user.avatar_url
    )

    return LoginResponse(
        access_token=token_str,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert minutes to seconds
        user=user_profile
    )
