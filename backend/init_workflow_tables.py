import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base
import models

print("Creating DOC-32 workflow tables in database...")
Base.metadata.create_all(bind=engine)
print("Workflow tables created successfully!")
