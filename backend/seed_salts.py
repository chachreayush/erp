import sys
import os
import uuid
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
import models

SALTS = [
    ("Paracetamol", "Fever, Pain relief", "500mg, 650mg", "Liver damage on overdose", "Avoid alcohol", "Normal"),
    ("Ibuprofen", "Inflammation, Pain", "200mg, 400mg", "Stomach upset, ulcers", "Take with food", "Normal"),
    ("Amoxicillin", "Bacterial infections", "250mg, 500mg", "Diarrhea, rash", "Complete full course", "H"),
    ("Azithromycin", "Respiratory infections", "250mg, 500mg", "Nausea, vomiting", "Take on empty stomach", "H"),
    ("Cetirizine", "Allergies, Hay fever", "10mg", "Drowsiness, dry mouth", "Avoid driving", "Normal"),
    ("Levocetirizine", "Allergies", "5mg", "Mild drowsiness", "Take at night", "Normal"),
    ("Omeprazole", "Acidity, Ulcers", "20mg, 40mg", "Headache, nausea", "Take before food", "Normal"),
    ("Pantoprazole", "GERD, Acid reflux", "40mg", "Diarrhea, dizziness", "Take 30 mins before breakfast", "Normal"),
    ("Metformin", "Type 2 Diabetes", "500mg, 1000mg", "GI upset, lactic acidosis", "Take with meals", "H"),
    ("Glimepiride", "Type 2 Diabetes", "1mg, 2mg", "Hypoglycemia, weight gain", "Monitor blood sugar", "H"),
    ("Amlodipine", "Hypertension", "5mg, 10mg", "Ankle swelling, dizziness", "Monitor BP regularly", "H"),
    ("Losartan", "Hypertension", "50mg", "Dizziness, hyperkalemia", "Avoid potassium supplements", "H"),
    ("Telmisartan", "High Blood Pressure", "40mg, 80mg", "Fatigue, back pain", "Do not take if pregnant", "H"),
    ("Atorvastatin", "High Cholesterol", "10mg, 20mg", "Muscle pain, liver issues", "Avoid grapefruit juice", "H"),
    ("Rosuvastatin", "Cholesterol management", "10mg", "Muscle aches", "Report unexplained muscle pain", "H"),
    ("Diclofenac", "Severe pain, Arthritis", "50mg", "Stomach ulcers, kidney issues", "Do not use long term", "H"),
    ("Aceclofenac", "Pain and Inflammation", "100mg", "Dyspepsia, dizziness", "Take after meals", "Normal"),
    ("Levofloxacin", "Bacterial infections", "500mg", "Tendon rupture, CNS effects", "Avoid antacids", "H"),
    ("Ciprofloxacin", "Urinary tract infections", "500mg", "Tendonitis, photosensitivity", "Drink plenty of water", "H"),
    ("Ondansetron", "Nausea, Vomiting", "4mg, 8mg", "Headache, constipation", "Dissolve in mouth if MD", "Normal")
]

def run():
    db = SessionLocal()
    try:
        org = db.query(models.Organization).first()
        if not org:
            print("No organizations found.")
            return

        print(f"Seeding salts for organization: {org.name}")
        
        new_salts = []
        for formula, indications, dosage, side_effects, precautions, labels in SALTS:
            new_salts.append(models.Salt(
                id=uuid.uuid4(),
                organization_id=org.id,
                formula=formula,
                indications=indications,
                dosage=dosage,
                side_effects=side_effects,
                precautions=precautions,
                labels=labels,
                created_at=datetime.utcnow()
            ))
            
        db.bulk_save_objects(new_salts)
        db.commit()
        
        print(f"Successfully seeded {len(new_salts)} salts.")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
