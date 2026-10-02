import os
import glob
import docx
import re

files = sorted(glob.glob(r'C:\Users\DELL\Desktop\New folder (3)\DOC-*.docx'))
res = []

for f in files:
    if os.path.basename(f).startswith('~$'): continue # Skip temp files
    try:
        doc = docx.Document(f)
        text = '\n'.join([p.text for p in doc.paragraphs])
        
        # Look for ASCII UI box characters or specific UI words
        has_ui = bool(re.search(r'[┌├│└]|UI Mockup|Screen Layout|Keyboard-First UI', text))
        
        # Look for Database schema keywords
        has_db = bool(re.search(r'Database Entities|Table:|Schema|Data Model|Data structure', text, re.IGNORECASE))
        
        doc_num = os.path.basename(f)[:6]
        size_kb = os.path.getsize(f) // 1024
        
        # Rough proxy for "detail": length of the document text
        text_length = len(text)
        
        res.append(f"{doc_num} | {size_kb}KB | Length: {text_length} | Has UI: {has_ui} | Has DB: {has_db}")
    except Exception as e:
        res.append(f"{os.path.basename(f)[:6]} | Error reading: {e}")

with open(r'c:\Users\DELL\OneDrive\Desktop\erp2\doc_analysis.txt', 'w', encoding='utf-8') as out:
    out.write('\n'.join(res))
