import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import engine
from sqlalchemy import text

def run():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='products'"))
        columns = [r[0] for r in res.fetchall()]
        print("Columns in products table:", columns)

if __name__ == "__main__":
    run()
