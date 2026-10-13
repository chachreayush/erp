from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("""
        SELECT column_name, data_type, character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = 'ledgers';
    """))
    for row in res:
        col, dt, ml = row[0], row[1], row[2]
        if ml is not None and ml <= 32:
            print(f"Col: {col} | MaxLen: {ml}")
