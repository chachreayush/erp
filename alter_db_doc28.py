from backend.database import engine
from backend.models import Base, BankStatementProfile, BankStatementImport, BankStatementRow, BankReconciliationMatch

# Create the new tables
Base.metadata.create_all(bind=engine, tables=[
    BankStatementProfile.__table__,
    BankStatementImport.__table__,
    BankStatementRow.__table__,
    BankReconciliationMatch.__table__
])
print("Successfully created DOC-28 tables in the database!")
