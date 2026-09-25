import json, re, zipfile
from pathlib import Path
from collections import Counter
from xml.etree import ElementTree as ET

p = Path(r"D:\US\.tmp_report7_review_20260924_1941\audit.json")
d = json.loads(p.read_text(encoding="utf-8"))

print("H1-H3 totals/nonempty:")
for lev in (1,2,3,4,5):
    hs=[h for h in d['headings'] if h['level']==lev]
    print(lev,len(hs),sum(bool(h['text']) for h in hs))

toc_anchors={a for t in d['toc_paragraphs'] for a in t['anchors']}
print("TOC anchors",len(toc_anchors))
not_linked=[]
for h in d['headings']:
    if h['level']<=3 and h['text']:
        b=[x for x in h['bookmarks'] if x.startswith('_Toc')]
        if not any(x in toc_anchors for x in b): not_linked.append(h)
print("H1-H3 not linked in visible TOC",len(not_linked))
for x in not_linked: print(x['index'],x['level'],x['text'],x['bookmarks'])

print("\nSRS 3.4 area")
for h in d['headings']:
    if 2350<=h['index']<=2790: print(h['index'],h['level'],h['text'])

print("\nSDD 3.x area")
for h in d['headings']:
    if 4600<=h['index']<=6870: print(h['index'],h['level'],h['text'])

usable_w=8.27-.98-.98
wide=[x for x in d['drawings'] if x['width_in'] and x['width_in']>usable_w]
tall=[x for x in d['drawings'] if x['height_in'] and x['height_in']>9.0]
print("\nDRAWINGS usable width",usable_w,"wide",len(wide),"maxw",max(x['width_in'] for x in d['drawings']),"tall>9",len(tall),"maxh",max(x['height_in'] for x in d['drawings']))
print("width counts",Counter(x['width_in'] for x in wide).most_common(10))
print("tall",tall)

print("\nTOC entries first/last")
for x in d['toc_paragraphs'][:8]+d['toc_paragraphs'][-8:]: print(x['text'],x['anchors'])

print("\nExact project title count",sum('project title' in x.lower() for x in Path(r'D:\US\.tmp_report7_review_20260924_1941\text.txt').read_text(encoding='utf-8').splitlines()))
print("Fields",d['field_instructions'][0],"PAGE fields",[x for x in d['field_instructions'] if re.match(r'^PAGE(?:\s|$)',x,re.I)])

NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}; W='{'+NS['w']+'}'
with zipfile.ZipFile(r'C:\Users\richdesu\Downloads\Report7_FinalProjectReport.docx') as z:
    doc=ET.fromstring(z.read('word/document.xml'))
    tbls=doc.findall('.//w:tbl',NS)
    print("\nTABLE DETAILS")
    for i,t in enumerate(tbls):
        rows=t.findall('w:tr',NS)
        heads=sum(1 for r in rows if r.find('w:trPr/w:tblHeader',NS) is not None)
        if len(rows)>30 or i in (4,5,40):
            first=' | '.join(''.join(e.text or '' for e in c.findall('.//w:t',NS)) for c in rows[0].findall('w:tc',NS)) if rows else ''
            print(i,'rows',len(rows),'repeat_header_rows',heads,'firstrow',first[:300])
    print("header parts",[n for n in z.namelist() if re.match(r'word/(header|footer)\d*\.xml$',n)])
    print("top media by uncompressed size")
    media=[z.getinfo(n) for n in z.namelist() if n.startswith('word/media/')]
    for info in sorted(media,key=lambda x:x.file_size,reverse=True)[:12]:
        print(info.filename,info.file_size,info.compress_size)
