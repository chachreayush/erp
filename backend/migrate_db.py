from database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE ledger_groups ADD COLUMN class_type VARCHAR(50) DEFAULT 'Asset' NOT NULL;"))
        conn.execute(text("ALTER TABLE ledger_groups ADD COLUMN is_system BOOLEAN DEFAULT FALSE NOT NULL;"))
        conn.commit()
    print("Migration complete.")

if __name__ == "__main__":
    run_migration()
