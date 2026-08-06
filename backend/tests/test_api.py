import pytest
import sys
import os
from fastapi.testclient import TestClient

# Make sure backend is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from auth.router import get_current_user
from database import SessionLocal, engine, Base
import models
import uuid

client = TestClient(app)

# We need a valid user for auth dependency override
test_org_id = None
test_user_id = None

def get_test_user():
    db = SessionLocal()
    # Try to find an existing user
    user = db.query(models.User).first()
    
    global test_org_id, test_user_id
    if user:
        db.close()
        return user
    else:
        # Create dummy org and user if none exist
        org = models.Organization(
            org_code="TEST_ORG",
            name="Test Organization"
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        test_org_id = org.id
        
        user = models.User(
            organization_id=org.id,
            name="Test User",
            username="testuser",
            hashed_password="hashed_password",
            role=models.UserRole.CASHIER
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        test_user_id = user.id
        db.close()
        return user

app.dependency_overrides[get_current_user] = get_test_user

# Global IDs to track created test records for cleanup
test_ledger_id = None
test_salt_id = None
test_company_id = None
test_hsn_id = None
test_state_id = None
test_product_id = None

@pytest.fixture(scope="module", autouse=True)
def setup_and_teardown():
    # Setup - runs before all tests
    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)
    
    yield
    # Teardown - clean up the database
    global test_ledger_id, test_salt_id, test_company_id, test_hsn_id, test_state_id, test_product_id
    
    if test_product_id:
        client.delete(f"/products/{test_product_id}")
    if test_company_id:
        client.delete(f"/api/master/manufacturers/{test_company_id}")
    if test_salt_id:
        client.delete(f"/api/master/salts/{test_salt_id}")
    if test_hsn_id:
        client.delete(f"/api/master/hsn/{test_hsn_id}")
    if test_ledger_id:
        client.delete(f"/api/master/ledgers/{test_ledger_id}")
    if test_state_id:
        client.delete(f"/api/master/states/{test_state_id}")
        
    # Clean up dummy user/org if we created them
    if test_user_id or test_org_id:
        db = SessionLocal()
        if test_user_id:
            db.query(models.User).filter(models.User.id == test_user_id).delete()
        if test_org_id:
            db.query(models.Organization).filter(models.Organization.id == test_org_id).delete()
        db.commit()
        db.close()


def test_ledger_crud():
    global test_ledger_id
    # Create
    payload = {
        "name": "TEST_LEDGER_99",
        "group_name": "Sundry Debtors",
        "mobile": "9999999999",
        "state": "07-Delhi",
        "opening_balance": 500.0,
        "op_type": "Dr"
    }
    response = client.post("/api/master/ledgers", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == payload["name"]
    test_ledger_id = data["id"]

    # Read
    response = client.get("/api/master/ledgers")
    assert response.status_code == 200
    ledgers = response.json()
    assert any(l["id"] == test_ledger_id for l in ledgers)

    # Update
    update_payload = {
        "name": "TEST_LEDGER_99_UPDATED",
        "group_name": "Sundry Debtors",
        "opening_balance": 1000.0,
        "op_type": "Cr"
    }
    response = client.put(f"/api/master/ledgers/{test_ledger_id}", json=update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "TEST_LEDGER_99_UPDATED"


def test_salt_crud():
    global test_salt_id
    # Create
    payload = {
        "formula": "TEST_SALT_XYZ",
        "indications": "Headache",
        "side_effects": "Nausea"
    }
    response = client.post("/api/master/salts", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["formula"] == payload["formula"]
    test_salt_id = data["id"]

    # Read
    response = client.get("/api/master/salts")
    assert response.status_code == 200
    salts = response.json()
    assert any(s["id"] == test_salt_id for s in salts)

    # Update
    update_payload = {
        "formula": "TEST_SALT_XYZ_UPDATED",
        "indications": "Fever"
    }
    response = client.put(f"/api/master/salts/{test_salt_id}", json=update_payload)
    assert response.status_code == 200
    assert response.json()["formula"] == update_payload["formula"]


def test_hsn_crud():
    global test_hsn_id
    payload = {
        "code": "9999",
        "description": "Test HSN",
        "cgst": 9.0,
        "sgst": 9.0,
        "igst": 18.0,
        "type": "Goods"
    }
    response = client.post("/api/master/hsn", json=payload)
    assert response.status_code == 200
    test_hsn_id = response.json()["id"]

    # Update
    response = client.put(f"/api/master/hsn/{test_hsn_id}", json={
        "code": "9999",
        "igst": 12.0,
        "cgst": 6.0,
        "sgst": 6.0,
        "type": "Service"
    })
    assert response.status_code == 200
    assert response.json()["igst"] == 12.0
    assert response.json()["type"] == "Service"


def test_company_crud():
    global test_company_id, test_ledger_id
    if not test_ledger_id:
        pytest.fail("Ledger must be created first to test supplier integration")
        
    payload = {
        "name": "TEST_COMPANY_LTD",
        "short_code": "TCL",
        "default_discount": 10.5,
        "status": "continue",
        "prohibited": False,
        "is_supplier": True,
        "supplier_ledger_id": test_ledger_id,
        "dump_days": 30
    }
    response = client.post("/api/master/manufacturers", json=payload)
    assert response.status_code == 200
    test_company_id = response.json()["id"]

    response = client.put(f"/api/master/manufacturers/{test_company_id}", json={
        "name": "TEST_COMPANY_LTD_2",
        "short_code": "TCL2",
        "default_discount": 15.0,
        "status": "close",
        "prohibited": True,
        "is_supplier": False,
        "supplier_ledger_id": None
    })
    assert response.status_code == 200
    assert response.json()["prohibited"] == True


def test_state_crud():
    global test_state_id
    payload = {
        "name": "TEST_STATE",
        "gst_code": "99",
        "capital": "Testville"
    }
    response = client.post("/api/master/states", json=payload)
    assert response.status_code == 200
    test_state_id = response.json()["id"]

    response = client.put(f"/api/master/states/{test_state_id}", json={
        "name": "TEST_STATE",
        "gst_code": "99",
        "capital": "Testville 2"
    })
    assert response.status_code == 200


def test_product_crud():
    global test_product_id, test_company_id, test_salt_id, test_hsn_id
    payload = {
        "name": "TEST_PRODUCT_500MG",
        "code": "TP500",
        "packing": "10x10",
        "company_name": "TEST_COMPANY_LTD_2",
        "salt": "TEST_SALT_XYZ_UPDATED",
        "hsn_code": "9999",
        "mrp": 100.0,
        "rate_a": 80.0,
        "p_rate": 70.0,
        "pts_rate": 70.0,
        "ptr_rate": 80.0,
        "igst_percent": 12.0,
        "cgst_percent": 6.0,
        "sgst_percent": 6.0,
        "status": "continue"
    }
    response = client.post("/products", json=payload)
    assert response.status_code == 200
    test_product_id = response.json()["id"]

    response = client.get("/products")
    assert response.status_code == 200
    assert any(p["id"] == test_product_id for p in response.json())
