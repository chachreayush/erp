# ============================================================
# auth/router.py â€” Authentication API Endpoints
# ============================================================
# This file defines all the HTTP endpoints (URLs) for the
# authentication system. It uses FastAPI's APIRouter.
#
# ENDPOINTS DEFINED HERE:
# POST /auth/login   â†’ Authenticate and receive a JWT token
# POST /auth/logout  â†’ Invalidate the current session
# GET  /auth/me      â†’ Get the current user's profile
#
# HOW FASTAPI ROUTING WORKS:
# Each function below is decorated with @router.post or @router.get.
# FastAPI automatically:
# 1. Reads the incoming JSON and validates it against the schema
# 2. Injects dependencies (like the database session)
# 3. Calls the function with the validated data
# 4. Serializes the return value to JSON and sends the HTTP response
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session as DBSession

# Our modules
from database import get_db
from limiter import limiter
from schemas import LoginRequest, LoginResponse, UserProfileSchema, ErrorResponse
from auth.service import authenticate_user, build_permissions_for_role
from auth.utils import verify_access_token, hash_token_for_storage, ACCESS_TOKEN_EXPIRE_MINUTES
from models import Session as SessionModel, User, Organization, UserRole

# Create a router â€” a mini-FastAPI app that handles a group of related endpoints.
# This router is registered in main.py with the prefix "/auth",
# so all routes here become /auth/login, /auth/logout, etc.
router = APIRouter(
    prefix="/auth",   # All routes in this file start with /auth
    tags=["Authentication"]  # Groups these endpoints together in the auto-generated docs
)

# HTTPBearer is a FastAPI security scheme.
# It reads the "Authorization: Bearer <token>" header from incoming requests.
# We use this to protect endpoints that require a logged-in user.
security = HTTPBearer()


# â”€â”€ DEPENDENCY: Get Current User â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# This is a reusable dependency function that extracts and validates
# the JWT token from the request and returns the logged-in user.
#
# It is used with FastAPI's Depends() mechanism:
#   current_user: User = Depends(get_current_user)
# FastAPI calls this automatically before the endpoint function runs.
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: DBSession = Depends(get_db)
) -> User:
    """
    Validates the JWT token from the Authorization header and returns
    the corresponding User object from the database.

    FLOW:
    1. Extract the token from "Authorization: Bearer <token>" header
    2. Verify the JWT signature and expiry
    3. Extract user_id from the token payload
    4. Verify the session is still active in the database
    5. Fetch and return the User object

    Raises HTTP 401 if anything is invalid.

    Args:
        credentials: The Bearer token from the Authorization header
        db: The database session

    Returns:
        The authenticated User database object
    """
    # Standard 401 Unauthorized error â€” reused in multiple places
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired session. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"}  # OAuth2 standard header
    )

    # Step 1: Get the raw token string from the Authorization header
    token = credentials.credentials  # "Bearer <token>" â†’ just "<token>"

    # Step 2: Verify JWT signature, expiry, and structure
    payload = verify_access_token(token)
    if payload is None:
        raise credentials_error  # Token is invalid or expired

    # Step 3: Extract the user ID from the token payload
    user_id = payload.get("sub")  # "sub" is the standard JWT subject claim
    if not user_id:
        raise credentials_error

    # Step 4: Check the session is still active in the database
    # (Allows instant logout by deactivating the session record)
    token_hash = hash_token_for_storage(token)
    session = db.query(SessionModel).filter(
        SessionModel.token_hash == token_hash,
        SessionModel.is_active == True
    ).first()

    if not session:
        raise credentials_error  # Session was logged out or never existed

    # Step 5: Fetch the actual user from the database
    user = db.query(User).filter(
        User.id == user_id,
        User.is_active == True  # Disabled accounts are rejected even with valid token
    ).first()

    if not user:
        raise credentials_error

    return user  # Return the User object to the endpoint


# â”€â”€ ENDPOINT: POST /auth/login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@router.post(
    "/login",
    response_model=LoginResponse,         # Tells FastAPI what shape to return
    status_code=status.HTTP_200_OK,
    summary="Login with username and password",
    responses={
        401: {"model": ErrorResponse, "description": "Invalid credentials"},
        422: {"description": "Validation error â€” missing required fields"}
    }
)
@limiter.limit('5/minute')
def login(
    request: Request, login_req: LoginRequest,      # FastAPI auto-reads and validates the JSON body
    db: DBSession = Depends(get_db)  # FastAPI auto-provides the database session
):
    """
    Authenticates a user and returns a JWT access token.

    - **LAN Mode**: Pass `is_lan: true`. Organization code is ignored.
    - **Remote Mode**: Pass `is_lan: false` and include `org_code`.

    On success, the response contains:
    - `access_token`: Store this and send it as `Authorization: Bearer <token>`
    - `user`: The complete user profile to display in the UI
    """
    try:
        # Delegate all the actual login logic to the service function
        # The router only handles HTTP â€” the service handles business logic
        response = authenticate_user(login_req, db)
        return response

    except ValueError as e:
        # ValueError from service.py = a known business logic error
        # (wrong password, organization not found, etc.)
        # Convert to HTTP 401 Unauthorized
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)  # The human-readable message from service.py
        )

    except Exception as e:
        import traceback
        traceback.print_exc()

        # Any other unexpected error = HTTP 500 Internal Server Error
        # Don't expose internal error details to the client in production
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected server error occurred. Please try again."
        )


# â”€â”€ ENDPOINT: POST /auth/logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout and invalidate the current session"
)
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: DBSession = Depends(get_db)
):
    """
    Logs out the current user by deactivating their session in the database.

    After calling this endpoint, the user's JWT token is immediately
    invalidated â€” even if it hasn't expired yet. The frontend should
    also clear the stored token from localStorage/memory.
    """
    token = credentials.credentials
    token_hash = hash_token_for_storage(token)

    # Find and deactivate the session
    # Using update() is faster than fetch â†’ modify â†’ commit
    rows_updated = db.query(SessionModel).filter(
        SessionModel.token_hash == token_hash,
        SessionModel.is_active == True
    ).update({"is_active": False})

    db.commit()

    # Return success regardless of whether a session was found.
    # (Idempotent logout â€” logging out twice is not an error)
    return {"message": "Successfully logged out.", "sessions_closed": rows_updated}


# â”€â”€ ENDPOINT: GET /auth/me â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@router.get(
    "/me",
    response_model=UserProfileSchema,
    summary="Get the profile of the currently logged-in user"
)
def get_me(
    # Depends(get_current_user) = FastAPI calls get_current_user first,
    # validates the token, and passes the User object here automatically
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """
    Returns the full profile of the currently authenticated user.

    The frontend calls this on startup (after reading the token from
    localStorage) to restore the user session without a new login.

    Requires: `Authorization: Bearer <token>` header
    """
    # Fetch the user's organization for the response
    organization = db.query(Organization).filter(Organization.id == current_user.organization_id).first()

    # Build the permission set for the user's role
    permissions = build_permissions_for_role(current_user.role)

    return UserProfileSchema(
        id=current_user.id,
        name=current_user.name,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
        organization_id=current_user.organization_id,
        org_name=organization.name if organization else "Unknown",
        org_code=organization.org_code if organization else "",
        is_am_user=organization.is_am if organization else False,
        permissions=permissions,
        avatar_url=current_user.avatar_url
    )

import schemas

@router.post("/impersonate", response_model=LoginResponse)
def impersonate(request: schemas.ImpersonateRequest, current_user: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if current_user.role != UserRole.AM_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Account Master Admins can impersonate clients.")
    
    target_organization = db.query(Organization).filter(Organization.id == request.target_org_id, Organization.is_am == False).first()
    if not target_organization:
        raise HTTPException(status_code=404, detail="Client organization not found.")
    
    # Generate an impersonation JWT
    from auth.utils import create_access_token
    from datetime import timedelta
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token, token_expiry = create_access_token(
        user_id=str(current_user.id),
        organization_id=str(target_organization.id),
        role=UserRole.CM_ADMIN.value,
        expires_delta=access_token_expires
    )
    
    # Register the session with impersonation flag
    new_session = SessionModel(
        user_id=current_user.id,
        token_hash=hash_token_for_storage(access_token),
        expires_at=token_expiry,
        is_active=True
    )
    db.add(new_session)
    db.commit()
    
    # Return as if we logged in as a CM admin of that organization
    profile = UserProfileSchema(
        id=current_user.id,
        name=current_user.name,
        username=current_user.username,
        email=current_user.email,
        role=UserRole.CM_ADMIN.value,
        organization_id=target_organization.id,
        org_name=target_organization.name,
        org_code=target_organization.org_code,
        is_am_user=False,
        permissions=build_permissions_for_role(UserRole.CM_ADMIN),
        avatar_url=None
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=profile
    )


