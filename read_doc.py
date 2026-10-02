import sys
import docx

def read_docx(path, out_path):
    doc = docx.Document(path)
    text = '\n'.join([p.text for p in doc.paragraphs])
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(text)

if __name__ == "__main__":
    read_docx(r'C:\Users\DELL\Desktop\New folder (3)\2  erp first to last plan outline.docx', r'c:\Users\DELL\OneDrive\Desktop\erp2\outline.txt')
