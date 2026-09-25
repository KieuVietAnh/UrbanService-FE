from pathlib import Path
from zipfile import ZipFile
from lxml import etree

docx = Path(r"C:\Users\richdesu\Downloads\Report7_FinalProjectReport.docx")
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(docx) as zf:
    root = etree.fromstring(zf.read("word/document.xml"))
for idx, sect in enumerate(root.xpath("//w:sectPr", namespaces=ns), 1):
    pg = sect.find("w:pgNumType", namespaces=ns)
    start = pg.get(f"{{{ns['w']}}}start") if pg is not None else None
    fmt = pg.get(f"{{{ns['w']}}}fmt") if pg is not None else None
    print(f"section={idx} page_start={start} page_format={fmt}")
