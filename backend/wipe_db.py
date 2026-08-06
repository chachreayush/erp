import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from database import Base, engine
import models

# Wipe the database
print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("Creating all tables...")
Base.metadata.create_all(bind=engine)
print("Database wiped successfully!")
