# ============================================================
# database.py — PostgreSQL Database Connection Setup
# ============================================================
# This file creates and manages the connection between the
# FastAPI backend and the PostgreSQL database.
#
# HOW IT WORKS:
# 1. SQLAlchemy reads the DATABASE_URL from the .env file
# 2. It creates an "engine" — think of this as the cable
#    that connects Python to PostgreSQL
# 3. It creates a "SessionLocal" factory — every time we
#    need to talk to the database, we create a new session
#    (like opening a conversation), do our work, then close it
# 4. "Base" is the parent class all our database table
#    definitions (models) will inherit from
# ============================================================

# SQLAlchemy — the Python library that talks to PostgreSQL
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# python-dotenv — reads our .env file for the DATABASE_URL
from dotenv import load_dotenv
import os

# Load all values from the .env file into environment variables
# This MUST happen before we try to read DATABASE_URL
load_dotenv()

# ── READ DATABASE URL FROM ENVIRONMENT ────────────────────────
# os.getenv() reads the DATABASE_URL variable from the .env file
# Example value: "postgresql://erp_user:erp_password@localhost:5432/erp_db"
DATABASE_URL = os.getenv("DATABASE_URL")

# Raise a clear error if .env is missing or DATABASE_URL is not set
# Better to crash early with a clear message than fail silently later
if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL not found in .env file. "
        "Please ensure backend/.env exists and contains DATABASE_URL."
    )

# Convert connection string for psycopg3 compatibility if needed
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# ── CREATE THE ENGINE ─────────────────────────────────────────
# The engine is SQLAlchemy's core — it manages the actual
# database connections under the hood using a connection pool.
#
# pool_pre_ping=True: Before using a connection from the pool,
# send a lightweight "ping" to verify it's still alive.
# This prevents errors if PostgreSQL restarted while the app was running.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True  # Test connections before using them
)

# ── CREATE SESSION FACTORY ────────────────────────────────────
# SessionLocal is a class. Each time we call SessionLocal(),
# we get a new database session — an active conversation with
# the database that we can use to run queries.
#
# autocommit=False: Changes are NOT saved automatically.
#   We must explicitly call session.commit() to save changes.
#   This gives us full control and prevents partial data saves.
#
# autoflush=False: Don't automatically send pending changes
#   to the database before each query. We control this manually.
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False
)

# ── BASE CLASS FOR ALL MODELS ─────────────────────────────────
# All our database table definitions (in models.py) will
# inherit from this Base class. SQLAlchemy uses this to
# know which Python classes represent database tables.
Base = declarative_base()


# ── DATABASE SESSION DEPENDENCY ───────────────────────────────
# This is a FastAPI "dependency" — a function FastAPI calls
# automatically to provide a database session to any endpoint
# that needs one.
#
# It uses Python's "yield" keyword (a generator function):
# 1. Creates a new database session (db = SessionLocal())
# 2. "yields" it to the route handler (the endpoint function)
# 3. After the endpoint finishes (success OR error),
#    execution returns here and db.close() always runs.
#
# This pattern ensures database sessions are ALWAYS closed
# properly, preventing connection leaks.
def get_db():
    """
    Provides a database session to FastAPI route handlers.
    Automatically closes the session when the request is done.

    Usage in a route:
        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            results = db.query(MyModel).all()
            return results
    """
    db = SessionLocal()  # Open a new database session
    try:
        yield db          # Give the session to the route handler
    finally:
        db.close()        # ALWAYS close — even if an error occurred
