import pytest
import sys
import os
from fastapi.testclient import TestClient

# Make sure backend is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from database import SessionLocal, engine, Base
import models
from auth.utils import hash_password

client = TestClient(app)

# Global variables for tests
test_token = ""
test_org_id = None
test_user_id = None
test_created_org_id = None
test_created_user_id = None
test_bulletin_id = None
test_sales_id = None

@pytest.fixture(scope="module", autouse=True)
def setup_and_teardown():
    # Setup - runs before all tests
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Create AM Admin user to use for tests
    org = models.Organization(
        org_code="MASTER_TEST_ORG",
        name="Master Test Org"
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    
    user = models.User(
        organization_id=org.id,
        name="Test AM Admin",
        username="test_admin",
        hashed_password=hash_password("testpassword123"),
        role=models.UserRole.AM_ADMIN
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    global test_org_id, test_user_id
    test_org_id = org.id
    test_user_id = user.id
    db.close()
    
    yield
    
    # Teardown
    db = SessionLocal()
    # Delete created testing entities
    if test_sales_id:
        db.query(models.Invoice).filter(models.Invoice.id == test_sales_id).delete()
    if test_bulletin_id:
        db.query(models.Bulletin).filter(models.Bulletin.id == test_bulletin_id).delete()
    if test_created_user_id:
        db.query(models.User).filter(models.User.id == test_created_user_id).delete()
    if test_created_org_id:
        db.query(models.Organization).filter(models.Organization.id == test_created_org_id).delete()
        
    # Delete our master test org and user
    db.query(models.User).filter(models.User.id == test_user_id).delete()
    db.query(models.Organization).filter(models.Organization.id == test_org_id).delete()
    db.commit()
    db.close()

def test_login_success():
    global test_token
    payload = {
        "username": "test_admin",
        "password": "testpassword123",
        "org_code": "MASTER_TEST_ORG"
    }
    
    response = client.post("/api/auth/login", json=payload)
    if response.status_code == 404:
        response = client.post("/auth/login", json=payload)
        
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    test_token = data["access_token"]

def test_organizations_crud():
    global test_token, test_created_org_id
    headers = {"Authorization": f"Bearer {test_token}"}
    
    payload = {
        "org_code": "CLIENT_ORG_TEST",
        "org_name": "Client Org Test",
        "admin_username": "client_admin",
        "admin_password": "clientpassword",
        "admin_name": "Client Admin",
        "address": "123 Test St",
        "phone": "1234567890",
        "email": "test@test.com"
    }
    
    response = client.post("/api/organizations/register", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    test_created_org_id = data["id"]
    
    response = client.get("/api/organizations/", headers=headers)
    assert response.status_code == 200
    orgs = response.json()
    assert any(o["org_code"] == "CLIENT_ORG_TEST" for o in orgs)

def test_bulletins_crud():
    global test_token, test_bulletin_id
    headers = {"Authorization": f"Bearer {test_token}"}
    
    payload = {
        "title": "Test Bulletin",
        "content": "This is a test bulletin message",
        "priority": "high",
        "active": True
    }
    
    response = client.post("/api/bulletins/", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    test_bulletin_id = data["id"]
    
    response = client.get("/api/bulletins/", headers=headers)
    assert response.status_code == 200
    bulletins = response.json()
    assert any(b["id"] == test_bulletin_id for b in bulletins)

def test_sales_crud():
    global test_token, test_sales_id
    headers = {"Authorization": f"Bearer {test_token}"}
    
    payload = {
        "customer_name": "Test Customer",
        "invoice_number": "INV-TEST-001",
        "subtotal": 100.0,
        "tax_total": 18.0,
        "grand_total": 118.0,
        "items": [
            {
                "product_name": "Test Product",
                "quantity": 2,
                "rate": 50.0,
                "igst_percent": 18.0,
                "line_total": 118.0
            }
        ]
    }
    
    response = client.post("/api/sales/invoices", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    test_sales_id = data["id"]
    
    response = client.get("/api/sales/invoices", headers=headers)
    assert response.status_code == 200
    sales = response.json()
    assert any(s["id"] == test_sales_id for s in sales)