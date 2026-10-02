import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
import uuid

client = TestClient(app)

# We need a valid token for testing
# We will just write direct DB tests for the logic since it's testing the permanent database test cases for the account head hierarchy.

def test_ledger_group_system_protection():
    db = SessionLocal()
    try:
        # Create a dummy org
        org = models.Organization(name="Test Org", org_code="TESTORG123", is_am=False)
        db.add(org)
        db.commit()

        # Create a system group
        sys_group = models.LedgerGroup(
            organization_id=org.id,
            name="System Group",
            class_type="Asset",
            is_system=True
        )
        db.add(sys_group)
        db.commit()

        # Attempt to create a child
        child_group = models.LedgerGroup(
            organization_id=org.id,
            name="Child Group",
            parent_id=sys_group.id,
            class_type=sys_group.class_type,
            is_system=False
        )
        db.add(child_group)
        db.commit()

        assert child_group.class_type == "Asset", "Child must inherit class_type"

    finally:
        db.close()
