import os
from sqlalchemy import create_engine
from models import Base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./erp.db")
engine = create_engine(DATABASE_URL)

print("Creating DOC-16 tables...")
Base.metadata.create_all(bind=engine)
print("Done!")
