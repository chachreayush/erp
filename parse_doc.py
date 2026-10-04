import docx
import sys

doc_path = sys.argv[1]
out_path = sys.argv[2]

try:
    doc = docx.Document(doc_path)
    text = '\n'.join([p.text for p in doc.paragraphs])
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Successfully parsed to {out_path}")
except Exception as e:
    print(f"Error: {e}")
