# ============================================================
# auth/utils.py — JWT Token & Password Security Utilities
# ============================================================
# This file contains the security "toolkit" for the auth system.
# Two main responsibilities:
#
# 1. PASSWORD HASHING: Securely hash passwords using bcrypt so
#    we NEVER store plain-text passwords in the database.
#
# 2. JWT TOKEN: Create and verify JSON Web Tokens (JWT).
#    A JWT is a signed, tamper-proof string that proves a user
#    is who they claim to be without needing a database lookup
#    on every single request.
#
# HOW JWT WORKS (Plain English):
# When a user logs in, we create a token containing their user ID
# and role, signed with our SECRET_KEY (like a wax seal on a letter).
# On every subsequent request, the user sends this token. We verify
# the signature — if it's valid and not expired, we trust the claim.
# If anyone tampers with the token data, the signature breaks and
# the token is rejected.
# ============================================================

from datetime import datetime, timedelta
from typing import Optional
import hashlib  # Built-in Python library for hashing

# jose — JSON Object Signing and Encryption library for JWT
from jose import JWTError, jwt

# bcrypt — secure password hashing library
import bcrypt

# python-dotenv — read secret keys from .env file
from dotenv import load_dotenv
import os

# Load .env variables into environment
load_dotenv()

# ── LOAD CONFIGURATION FROM .ENV ─────────────────────────────
# These values come from the backend/.env file.
# NEVER hardcode secrets directly in source code.

# The secret key used to sign and verify JWT tokens.
# Must be a long random string (min 32 characters).
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError(
        "JWT_SECRET_KEY must be set in environment variables. "
        "Create a .env file with JWT_SECRET_KEY=your-secret-key"
    )

# The algorithm used for signing. HS256 is the standard symmetric algorithm.
# "HS" = HMAC Signature, "256" = SHA-256 hash function.
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# How many minutes a token stays valid after login.
# Default: 480 minutes = 8 hours (a full workday session)
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "480")
)


# ── PASSWORD HASHING ─────────────────────────────────────────
# We use bcrypt directly instead of passlib to ensure compatibility
# with modern Python versions and latest bcrypt libraries.


# ── PASSWORD UTILITIES ────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    """
    Takes a plain-text password and returns a bcrypt hash string.
    The hash is safe to store in the database.

    Example:
        hash_password("MySecret123") 
        → "$2b$12$EXAMPLEhashstringhere..."

    The resulting string contains:
    - The algorithm ($2b$)
    - The cost factor ($12$) — higher = slower = more secure
    - The salt + hash combined in one string

    Args:
        plain_password: The raw password typed by the user or admin

    Returns:
        A bcrypt hash string — safe to store in the database
    """
    # Hash password with a randomly generated salt
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Checks if a plain-text password matches a stored bcrypt hash.
    Used during login to verify the user typed the correct password.

    HOW IT WORKS:
    bcrypt re-hashes the plain_password using the same salt that's
    embedded in hashed_password, then compares the results.
    If they match, the password is correct.

    Args:
        plain_password:  The password typed in the login form
        hashed_password: The hash stored in the database

    Returns:
        True if the password is correct, False if not
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False


# ── JWT TOKEN UTILITIES ───────────────────────────────────────

def create_access_token(
    user_id: str,
    organization_id: str,
    role: str,
    expires_delta: Optional[timedelta] = None
) -> tuple[str, datetime]:
    """
    Creates a signed JWT access token for a successfully logged-in user.

    WHAT GOES INTO THE TOKEN (the "payload"):
    - sub (subject): The user's ID — identifies WHO the token belongs to
    - organization_id: Their organization — for data isolation checks
    - role: Their role — for permission decisions
    - exp (expiry): When the token stops being valid

    The payload is NOT secret — it can be decoded without the key.
    But it IS tamper-proof — changing any value breaks the signature.

    Args:
        user_id:      The user's UUID as a string
        organization_id:   The user's organization UUID as a string
        role:         The user's role string (e.g., "am_admin")
        expires_delta: How long until expiry. Defaults to setting in .env.

    Returns:
        A tuple of:
        - The JWT token string (send this to the frontend)
        - The exact datetime when the token expires (store in DB session)
    """
    # Calculate the exact expiry datetime
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    # Build the token payload — the data encoded inside the JWT
    payload = {
        "sub": user_id,          # Subject: who this token belongs to
        "organization_id": organization_id, # For data isolation
        "role": role,             # For permission checks
        "exp": expire,            # Expiry timestamp — jose validates this automatically
        "iat": datetime.utcnow()  # Issued-at timestamp (for auditing)
    }

    # Sign and encode the token using our SECRET_KEY and ALGORITHM
    # This creates the compact "eyJhbGci..." string format
    encoded_jwt = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt, expire


def verify_access_token(token: str) -> Optional[dict]:
    """
    Verifies a JWT token sent by the frontend on a protected request.
    Called on every authenticated API request.

    WHAT THIS CHECKS:
    1. The signature — has the token been tampered with?
    2. The expiry — has the token expired?
    3. The structure — is it a valid JWT?

    Args:
        token: The JWT string from the Authorization header

    Returns:
        The decoded payload dict if valid (contains user_id, role, etc.)
        None if the token is invalid or expired
    """
    try:
        # Decode and verify the token
        # jose automatically checks the expiry (exp) claim
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload  # Returns the decoded payload dict

    except JWTError:
        # JWTError covers: expired tokens, invalid signature, malformed tokens
        # Return None — the calling code will reject the request with 401
        return None


def hash_token_for_storage(token: str) -> str:
    """
    Creates a SHA-256 hash of a JWT token for database storage.
    We store this hash in the sessions table instead of the raw token.

    WHY HASH THE TOKEN?
    If an attacker steals the sessions table, they get hashes —
    which are one-way and cannot be reversed to get the original tokens.
    It's the same principle as hashing passwords.

    Args:
        token: The raw JWT token string

    Returns:
        A hex SHA-256 hash string (64 characters)
    """
    # SHA-256 hash of the token encoded as UTF-8 bytes
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
