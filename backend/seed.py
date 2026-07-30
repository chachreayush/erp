# ============================================================
# seed.py — Initial Database Data Setup Script
# ============================================================
# This script creates the very first records in the database:
# 1. The AM (Account Master) organization — your main organization
# 2. A default am_admin user you can log into immediately
#
# HOW TO RUN:
#   cd backend
#   python seed.py
#
# WHEN TO RUN:
# Run this ONCE after setting up PostgreSQL for the first time.
# Running it again is safe — it checks before inserting to avoid duplicates.
#
# IMPORTANT: Change the default password immediately after first login!
# ============================================================

import sys
import os

# Add the backend directory to Python's module search path
# so we can import our modules (database, models, etc.)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
import models
from auth.utils import hash_password
from datetime import datetime

# ── SEED CONFIGURATION ────────────────────────────────────────
# Change these values to match your business before running!

AM_COMPANY_NAME = "My Organization"        # Your organization's full name
AM_COMPANY_CODE = "AM-0001"           # The unique code for the AM organization

ADMIN_USERNAME  = "admin"             # Default admin login username
ADMIN_PASSWORD  = "Admin@123"         # CHANGE THIS immediately after first login!
ADMIN_NAME      = "System Admin"      # Display name for the admin user
ADMIN_EMAIL     = "admin@erp.local"   # Admin email address


def run_seed():
    """
    Creates the initial AM organization and admin user in the database.
    Safe to run multiple times — checks for existing records first.
    """
    print("=" * 60)
    print("  ERP Database Seed Script")
    print("=" * 60)

    # Create all tables first (in case they don't exist yet)
    print("\n[1/4] Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("      ✅ Tables ready.")

    # Open a database session
    db = SessionLocal()

    try:
        # ── CREATE AM COMPANY ────────────────────────────────────
        print("\n[2/4] Checking for AM organization...")

        existing_organization = db.query(models.Organization).filter(
            models.Organization.org_code == AM_COMPANY_CODE
        ).first()

        if existing_organization:
            print(f"      ⏭  Organization '{AM_COMPANY_CODE}' already exists — skipping.")
            organization = existing_organization
        else:
            organization = models.Organization(
                name=AM_COMPANY_NAME,
                org_code=AM_COMPANY_CODE,
                is_am=True,  # This is the Account Master organization
                is_active=True
            )
            db.add(organization)
            db.flush()  # flush() sends the INSERT but doesn't commit yet
                        # This gives us the organization.id for the user below
            print(f"      ✅ Created AM organization: '{AM_COMPANY_NAME}' ({AM_COMPANY_CODE})")

        # ── CREATE ADMIN USER ────────────────────────────────────
        print("\n[3/4] Checking for admin user...")

        existing_user = db.query(models.User).filter(
            models.User.username == ADMIN_USERNAME,
            models.User.organization_id == organization.id
        ).first()

        if existing_user:
            print(f"      ⏭  User '{ADMIN_USERNAME}' already exists — skipping.")
        else:
            # Hash the password before storing — NEVER store plain text
            hashed = hash_password(ADMIN_PASSWORD)

            admin_user = models.User(
                organization_id=organization.id,
                name=ADMIN_NAME,
                username=ADMIN_USERNAME,
                email=ADMIN_EMAIL,
                hashed_password=hashed,
                role=models.UserRole.AM_ADMIN,  # Full system access
                is_active=True
            )
            db.add(admin_user)
            print(f"      ✅ Created admin user: '{ADMIN_USERNAME}'")

        # ── COMMIT ALL CHANGES ───────────────────────────────────
        print("\n[4/4] Saving to database...")
        db.commit()
        print("      ✅ All changes committed successfully.")

        # ── SUMMARY ─────────────────────────────────────────────
        print("\n" + "=" * 60)
        print("  ✅ SEED COMPLETE!")
        print("=" * 60)
        print(f"\n  Organization:  {AM_COMPANY_NAME} ({AM_COMPANY_CODE})")
        print(f"  Username: {ADMIN_USERNAME}")
        print(f"  Password: {ADMIN_PASSWORD}")
        print("\n  ⚠️  IMPORTANT: Change the admin password after first login!")
        print("=" * 60)

    except Exception as e:
        # If anything goes wrong, roll back ALL changes
        # so the database is left in a clean state
        db.rollback()
        print(f"\n  ❌ ERROR: {e}")
        print("  Database changes rolled back. No data was modified.")
        sys.exit(1)

    finally:
        # Always close the database session
        db.close()


# Run the seed function when this script is executed directly
if __name__ == "__main__":
    run_seed()
