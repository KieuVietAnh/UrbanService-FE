import json
from collections import Counter, defaultdict
from pathlib import Path
import re

d = json.loads(Path(r"D:\US\.tmp_report7_review_20260924_1941\audit.json").read_text(encoding="utf-8"))

def show(title, rows, limit=None):
    print("\n##", title)
    for row in (rows if limit is None else rows[:limit]):
        print(json.dumps(row, ensure_ascii=False))

show("HEADING JUMPS", d["heading_jumps"])
show("PLACEHOLDERS", d["placeholders"])
show("NEAR DUPES", d["near_duplicate_paragraphs"])
show("TOC MISMATCHES", d["toc_text_mismatches"])
print("\n## FIELD INSTRUCTIONS")
for x in d["field_instructions"]: print(x)

print("\n## HEADING OUTLINE")
for h in d["headings"]:
    print(f"p{h['index']} L{h['level']} style={h['style']!r} num={h['num_id']}/{h['ilvl']} prefix={h['manual_prefix']!r}: {h['text']}")

print("\n## DUPLICATE MANUAL PREFIXES (heading text prefixes)")
by = defaultdict(list)
for h in d["headings"]:
    if h["manual_prefix"]:
        by[h["manual_prefix"].rstrip(".")].append(h)
for k, vals in by.items():
    if len(vals) > 1:
        print(k, "=>", [(v['index'], v['level'], v['text']) for v in vals])

print("\n## TABLE RISKS")
for t in d["table_stats"]:
    if t["max_cell_chars"] > 500 or t["fixed_height_rows"] or t["rows"] > 50:
        print(t)

print("\n## DRAWING RISKS")
for i, x in enumerate(d["drawings"]):
    if (x["width_in"] or 0) > 6.35 or (x["height_in"] or 0) > 9.8:
        print(i, x)
print("missing_alt", d["missing_alt_text_count"], "duplicate_docPr", d["duplicate_docpr_ids"])

print("\n## PACKAGE")
print("unused_media", len(d["unused_media"]), d["unused_media"][:20])
print("broken_relationships", d["broken_relationships"])
print("drawing_missing_relationships", d["drawing_missing_relationships"])
print("relationship_summary", d["relationship_summary"])
