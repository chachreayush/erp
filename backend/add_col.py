from database import engine
from sqlalchemy import text

def add_column():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS role_permissions JSONB;"))
            print("Successfully added role_permissions column to organizations.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("Column already exists.")
            else:
                print(f"Error: {e}")

if __name__ == "__main__":
    add_column()
