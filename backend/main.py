# ============================================================
# main.py — FastAPI Application Entry Point
# ============================================================
# This is the main file that starts the FastAPI backend server.
# It is equivalent to main.tsx on the frontend — the starting point.
#
# RESPONSIBILITIES:
# 1. Create the FastAPI app instance
# 2. Configure CORS (so the frontend on port 1420 can call APIs on port 8000)
# 3. Register all route modules (auth, and future modules)
# 4. Create database tables on startup (auto-migration for development)
# 5. Provide the /health endpoint
#
# HOW TO START THE SERVER:
#   cd backend
#   uvicorn main:app --reload --port 8000
#
# "main:app" means: from the file "main.py", use the object "app"
# "--reload" means: automatically restart when code changes (dev mode only)
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from dotenv import load_dotenv
import os

# Import our database setup and models
from database import engine, Base
import models  # Importing models registers them with SQLAlchemy's Base

# Import route modules
from auth.router import router as auth_router
from inventory.router import router as inventory_router

# Load environment variables from .env file
load_dotenv()

APP_ENV = os.getenv("APP_ENV", "development")


# ── CREATE FASTAPI APP ────────────────────────────────────────
# FastAPI() creates the web application instance.
# The parameters configure the auto-generated API documentation.
app = FastAPI(
    # title: Shown as the heading in /docs (Swagger UI)
    title="ERP Backend API",

    # description: Shown below the title in /docs
    description="""
    The backend API for the ERP system.
    
    **Modes:**
    - **LAN Mode:** Server on local network. Fast, offline-capable.
    - **Remote Mode:** Cloud-connected via Supabase. Works anywhere.
    
    **Authentication:** Uses JWT Bearer tokens.
    Include `Authorization: Bearer <token>` in all protected requests.
    """,

    # version: Shown in /docs and returned by /health
    version="1.0.0",

    # docs_url: The URL for the interactive Swagger UI documentation
    # Access it at http://localhost:8000/docs during development
    docs_url="/docs" if APP_ENV == "development" else None,

    # redoc_url: Alternative documentation UI
    redoc_url="/redoc" if APP_ENV == "development" else None,
)

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from limiter import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


# ── CONFIGURE CORS ───────────────────────────────────────────
# CORS = Cross-Origin Resource Sharing.
# The frontend runs on http://localhost:1420 (Vite/Tauri dev server).
# The backend runs on http://localhost:8000 (FastAPI).
# Browsers block requests between different ports by default (CORS policy).
# This middleware tells the browser: "It's okay for localhost:1420 to talk to us."
#
# In production, this would be locked down to the specific domain/IP of the ERP app.
app.add_middleware(
    CORSMiddleware,

    # allow_origins: Which origins (protocol + domain + port) can make requests.
    # "*" = any origin — ONLY acceptable in development.
    # In production: ["http://your-erp-server-ip:1420"]
    allow_origins=["*"] if APP_ENV == "development" else [
        "http://localhost:1420",
        "tauri://localhost", # Tauri desktop app origin
        "https://erp-rho-three.vercel.app" # Vercel hosted frontend
    ],

    # allow_credentials: Allow cookies and authorization headers to be sent.
    allow_credentials=True,

    # allow_methods: Which HTTP methods are allowed. ["*"] = all methods.
    allow_methods=["*"],

    # allow_headers: Which request headers are allowed.
    # "Authorization" must be included for JWT token support.
    allow_headers=["*"],
)


# ── REGISTER ROUTE MODULES ────────────────────────────────────
# Include all the route modules (routers) into the main app.
# Each router handles a group of related API endpoints.

# Authentication routes: /auth/login, /auth/logout, /auth/me
app.include_router(auth_router)

# Organizations routes
from api.organizations import router as organizations_router
app.include_router(organizations_router, prefix="/api")

# Bulletins routes
from api.bulletins import router as bulletins_router
app.include_router(bulletins_router, prefix="/api")

# Sales routes
from api.sales import router as sales_router
app.include_router(sales_router, prefix="/api")

# Batches routes
from api.batches import router as batches_router
app.include_router(batches_router, prefix="/api")

# Stock routes
from api.stock import router as stock_router
app.include_router(stock_router, prefix="/api")

# Inventory routes (products)
app.include_router(inventory_router, prefix="/api")

# Master data routes
from api.master import router as master_router
app.include_router(master_router, prefix="/api/master", tags=["Master Data"])

# Future routers will be added here as modules are built:
# app.include_router(hr_router)
# app.include_router(reports_router)


# ── STARTUP EVENT ─────────────────────────────────────────────
# This function runs ONCE when the server starts up.
# In development, it auto-creates any missing database tables.
#
# HOW IT WORKS:
# Base.metadata.create_all(engine) looks at all the SQLAlchemy
# models registered with Base (in models.py) and creates their
# corresponding tables in PostgreSQL IF they don't already exist.
# It does NOT modify or delete existing tables — safe to run repeatedly.
@app.on_event("startup")
def startup_event():
    """
    Runs on server startup.
    Creates database tables if they don't exist (dev auto-migration).
    """
    print("ERP Backend starting up...")
    print(f"   Environment: {APP_ENV}")

    # Create all database tables defined in models.py
    # This is equivalent to running CREATE TABLE IF NOT EXISTS for each model
    Base.metadata.create_all(bind=engine)
    print("Database tables verified/created successfully.")
    print(f"API documentation available at: http://localhost:{os.getenv('BACKEND_PORT', 8000)}/docs")
    print("Server is ready to accept connections.")


# ── HEALTH CHECK ENDPOINT ─────────────────────────────────────
# GET /health — Called by the frontend on startup to verify
# the backend server is running and the database is accessible.
# Also used by the LAN UDP discovery service to confirm connectivity.
@app.get(
    "/health",
    summary="Health check — verify server and database are running",
    tags=["System"]
)
def health_check():
    """
    Returns the health status of the server.

    The frontend calls this automatically when it starts to determine
    if a local server is available (LAN mode detection).

    Returns:
        JSON with server status, version, database status, and timestamp
    """
    # Test database connectivity by making a simple query
    try:
        from database import SessionLocal
        db = SessionLocal()
        db.execute("SELECT 1")  # Lightweight query just to test connection
        db.close()
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "ok",
        "version": "1.0.0",
        "database": db_status,
        "environment": APP_ENV,
        "timestamp": datetime.utcnow().isoformat()
    }


# ── ROOT ENDPOINT ─────────────────────────────────────────────
@app.get("/", tags=["System"])
def root():
    """Simple root endpoint — confirms the API is running."""
    return {
        "message": "ERP Backend API is running.",
        "docs": "/docs",
        "health": "/health"
    }
