from __future__ import annotations

import collections
import json
import posixpath
import re
import sys
import zipfile
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree as ET


DOCX = Path(r"C:\Users\richdesu\Downloads\Report7_FinalProjectReport.docx")
OUT = Path(r"D:\US\.tmp_report7_review_20260924_1941\audit.json")

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pr": "http://schemas.openxmlformats.org/package/2006/relationships",
    "ct": "http://schemas.openxmlformats.org/package/2006/content-types",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
    "cp": "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
    "dc": "http://purl.org/dc/elements/1.1/",
    "dcterms": "http://purl.org/dc/terms/",
    "ep": "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties",
}
W = "{" + NS["w"] + "}"
R = "{" + NS["r"] + "}"
WP = "{" + NS["wp"] + "}"


def xml(zf: zipfile.ZipFile, name: str):
    try:
        return ET.fromstring(zf.read(name))
    except KeyError:
        return None


def clean(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def para_text(p) -> str:
    # Visible text excludes deleted text but includes inserted text.
    pieces = []
    for e in p.iter():
        if e.tag == W + "t":
            pieces.append(e.text or "")
        elif e.tag == W + "tab":
            pieces.append("\t")
        elif e.tag == W + "br":
            pieces.append("\n")
    return clean("".join(pieces))


def source_part_from_rels(rels_name: str) -> str:
    p = PurePosixPath(rels_name)
    if rels_name == "_rels/.rels":
        return ""
    # word/_rels/document.xml.rels -> word/document.xml
    parent = p.parent.parent
    base = p.name[:-5] if p.name.endswith(".rels") else p.name
    return str(parent / base)


def main():
    report = {}
    with zipfile.ZipFile(DOCX) as zf:
        names = set(zf.namelist())
        report["zip_test"] = zf.testzip()
        report["zip_entries"] = len(names)
        report["file_size"] = DOCX.stat().st_size
        report["parts"] = sorted(names)

        # Metadata
        core = xml(zf, "docProps/core.xml")
        app = xml(zf, "docProps/app.xml")
        meta = {}
        if core is not None:
            for key, xp in {
                "title": ".//dc:title",
                "creator": ".//dc:creator",
                "last_modified_by": ".//cp:lastModifiedBy",
                "created": ".//dcterms:created",
                "modified": ".//dcterms:modified",
                "revision": ".//cp:revision",
            }.items():
                el = core.find(xp, NS)
                meta[key] = el.text if el is not None else None
        if app is not None:
            for key in ["Pages", "Words", "Characters", "Paragraphs", "Lines", "Application", "AppVersion"]:
                el = app.find(f".//ep:{key}", NS)
                meta[key.lower()] = el.text if el is not None else None
        report["metadata"] = meta

        # Styles map.
        styles = xml(zf, "word/styles.xml")
        style_names = {}
        if styles is not None:
            for st in styles.findall("w:style", NS):
                sid = st.get(W + "styleId")
                nm = st.find("w:name", NS)
                style_names[sid] = nm.get(W + "val") if nm is not None else sid

        document = xml(zf, "word/document.xml")
        assert document is not None
        body = document.find("w:body", NS)
        paras = []
        bookmarks = {}
        for idx, p in enumerate(document.findall(".//w:p", NS)):
            ppr = p.find("w:pPr", NS)
            sid = None
            num_id = None
            ilvl = None
            if ppr is not None:
                ps = ppr.find("w:pStyle", NS)
                sid = ps.get(W + "val") if ps is not None else None
                numpr = ppr.find("w:numPr", NS)
                if numpr is not None:
                    ne = numpr.find("w:numId", NS)
                    ie = numpr.find("w:ilvl", NS)
                    num_id = ne.get(W + "val") if ne is not None else None
                    ilvl = ie.get(W + "val") if ie is not None else None
            text = para_text(p)
            bms = [b.get(W + "name") for b in p.findall(".//w:bookmarkStart", NS) if b.get(W + "name")]
            for b in bms:
                bookmarks[b] = {"paragraph_index": idx, "text": text}
            anchors = [h.get(W + "anchor") for h in p.findall(".//w:hyperlink", NS) if h.get(W + "anchor")]
            paras.append({
                "index": idx,
                "text": text,
                "style_id": sid,
                "style": style_names.get(sid, sid),
                "num_id": num_id,
                "ilvl": ilvl,
                "bookmarks": bms,
                "anchors": anchors,
            })
        report["paragraph_count_xml"] = len(paras)

        # Headings.
        heading_re = re.compile(r"heading\s*(\d+)$", re.I)
        headings = []
        for p in paras:
            m = heading_re.search(p["style"] or "")
            if m:
                q = dict(p)
                q["level"] = int(m.group(1))
                lead = re.match(r"^\s*((?:\d+\.)*\d+\.?)\s+", p["text"])
                q["manual_prefix"] = lead.group(1) if lead else None
                headings.append(q)
        report["headings"] = headings
        report["heading_style_counts"] = dict(collections.Counter(h["style"] for h in headings))
        report["heading_jumps"] = [
            {"from": a, "to": b}
            for a, b in zip(headings, headings[1:])
            if b["level"] > a["level"] + 1
        ]

        # TOC structure and target integrity.
        toc_paras = [p for p in paras if (p["style"] or "").lower().startswith("toc")]
        report["toc_paragraphs"] = toc_paras
        missing_toc_targets = []
        mismatched_toc_text = []
        for p in toc_paras:
            for anchor in p["anchors"]:
                if anchor not in bookmarks:
                    missing_toc_targets.append({"paragraph": p, "anchor": anchor})
                else:
                    # TOC text usually ends with a page number.
                    toc_text = re.sub(r"\s+\d+\s*$", "", p["text"]).strip()
                    dest = bookmarks[anchor]["text"]
                    if clean(toc_text).casefold() != clean(dest).casefold():
                        mismatched_toc_text.append({"toc": toc_text, "heading": dest, "anchor": anchor})
        report["toc_missing_targets"] = missing_toc_targets
        report["toc_text_mismatches"] = mismatched_toc_text

        # Field instructions and balance.
        instr = [clean(e.text or "") for e in document.findall(".//w:instrText", NS)]
        fld_types = [e.get(W + "fldCharType") for e in document.findall(".//w:fldChar", NS)]
        report["field_instructions"] = instr
        report["field_char_counts"] = dict(collections.Counter(fld_types))

        # Suspicious placeholders / template instructions.
        placeholder_rx = re.compile(
            r"(?:\bTODO\b|\bTBD\b|\bplaceholder\b|to be (?:inserted|provided|completed|updated)|"
            r"\[\s*(?:screen|image|insert)|<\s*insert|briefly describe|provide information about|"
            r"describe the steps needed|required information should be provided|project team will insert)",
            re.I,
        )
        report["placeholders"] = [p for p in paras if p["text"] and placeholder_rx.search(p["text"])]

        # Consecutive/near duplicate nontrivial paragraphs.
        near_dupes = []
        for i, p in enumerate(paras):
            t = clean(p["text"])
            if len(t) < 4:
                continue
            for j in range(i + 1, min(i + 4, len(paras))):
                if clean(paras[j]["text"]).casefold() == t.casefold():
                    near_dupes.append({"first": p, "second": paras[j]})
        report["near_duplicate_paragraphs"] = near_dupes
        report["exact_text_counts"] = [
            {"text": t, "count": c}
            for t, c in collections.Counter(clean(p["text"]) for p in paras if clean(p["text"])).most_common()
            if c > 1 and len(t) >= 12
        ][:100]

        # Tables and basic row risks.
        tables = document.findall(".//w:tbl", NS)
        table_stats = []
        for ti, tbl in enumerate(tables):
            rows = tbl.findall("w:tr", NS)
            max_cells = 0
            cell_lengths = []
            fixed_heights = 0
            cant_split = 0
            for row in rows:
                cells = row.findall("w:tc", NS)
                max_cells = max(max_cells, len(cells))
                for c in cells:
                    cell_lengths.append(len(clean("".join(e.text or "" for e in c.findall(".//w:t", NS)))))
                trpr = row.find("w:trPr", NS)
                if trpr is not None:
                    ht = trpr.find("w:trHeight", NS)
                    if ht is not None and ht.get(W + "hRule") == "exact":
                        fixed_heights += 1
                    if trpr.find("w:cantSplit", NS) is not None:
                        cant_split += 1
            table_stats.append({
                "index": ti,
                "rows": len(rows),
                "max_cells": max_cells,
                "max_cell_chars": max(cell_lengths) if cell_lengths else 0,
                "fixed_height_rows": fixed_heights,
                "cant_split_rows": cant_split,
            })
        report["table_count"] = len(tables)
        report["table_stats"] = table_stats

        # Drawings/images, dimensions, alt text, ids.
        drawings = []
        docpr_ids = []
        for d in document.findall(".//w:drawing", NS):
            extent = d.find(".//wp:extent", NS)
            docpr = d.find(".//wp:docPr", NS)
            blip = d.find(".//a:blip", NS)
            rid = blip.get(R + "embed") if blip is not None else None
            cx = int(extent.get("cx")) if extent is not None and extent.get("cx") else None
            cy = int(extent.get("cy")) if extent is not None and extent.get("cy") else None
            did = docpr.get("id") if docpr is not None else None
            if did:
                docpr_ids.append(did)
            drawings.append({
                "rid": rid,
                "width_in": round(cx / 914400, 3) if cx else None,
                "height_in": round(cy / 914400, 3) if cy else None,
                "docpr_id": did,
                "name": docpr.get("name") if docpr is not None else None,
                "descr": docpr.get("descr") if docpr is not None else None,
                "title": docpr.get("title") if docpr is not None else None,
            })
        report["drawing_count"] = len(drawings)
        report["drawings"] = drawings
        report["duplicate_docpr_ids"] = [k for k, v in collections.Counter(docpr_ids).items() if v > 1]
        report["missing_alt_text_count"] = sum(1 for d in drawings if not (d["descr"] or d["title"]))

        # Relationships: duplicates and broken internal targets.
        broken_rels = []
        duplicate_rel_ids = []
        rel_summary = collections.Counter()
        document_rels = {}
        for rels_name in sorted(n for n in names if n.endswith(".rels")):
            root = xml(zf, rels_name)
            if root is None:
                continue
            source = source_part_from_rels(rels_name)
            ids = []
            for rel in list(root):
                rid = rel.get("Id")
                ids.append(rid)
                target = rel.get("Target")
                typ = rel.get("Type", "").rsplit("/", 1)[-1]
                rel_summary[typ] += 1
                if rels_name == "word/_rels/document.xml.rels":
                    document_rels[rid] = {"target": target, "type": typ, "mode": rel.get("TargetMode")}
                if rel.get("TargetMode") == "External":
                    continue
                base = posixpath.dirname(source)
                resolved = posixpath.normpath(posixpath.join(base, target))
                if resolved.startswith("../"):
                    resolved = resolved[3:]
                if resolved not in names:
                    broken_rels.append({"rels": rels_name, "id": rid, "target": target, "resolved": resolved, "type": typ})
            for rid, cnt in collections.Counter(ids).items():
                if cnt > 1:
                    duplicate_rel_ids.append({"rels": rels_name, "id": rid, "count": cnt})
        report["relationship_summary"] = dict(rel_summary)
        report["broken_relationships"] = broken_rels
        report["duplicate_relationship_ids"] = duplicate_rel_ids
        report["drawing_missing_relationships"] = [d for d in drawings if d["rid"] and d["rid"] not in document_rels]

        # Media inventory and unused media.
        media = sorted(n for n in names if n.startswith("word/media/") and not n.endswith("/"))
        used_media = set()
        for rel in document_rels.values():
            if rel["type"] == "image" and rel["target"]:
                used_media.add(posixpath.normpath(posixpath.join("word", rel["target"])))
        report["media_count"] = len(media)
        report["media_bytes"] = sum(zf.getinfo(n).file_size for n in media)
        report["unused_media"] = [m for m in media if m not in used_media]

        # Review markup.
        change_tags = [
            "ins", "del", "moveFrom", "moveTo", "pPrChange", "rPrChange", "tblPrChange",
            "trPrChange", "tcPrChange", "sectPrChange", "numberingChange",
        ]
        report["tracked_changes"] = {tag: len(document.findall(f".//w:{tag}", NS)) for tag in change_tags}
        settings = xml(zf, "word/settings.xml")
        report["track_revisions_enabled"] = bool(settings is not None and settings.find("w:trackRevisions", NS) is not None)

        comments_root = xml(zf, "word/comments.xml")
        comment_ids = []
        if comments_root is not None:
            comment_ids = [c.get(W + "id") for c in comments_root.findall("w:comment", NS)]
        starts = [e.get(W + "id") for e in document.findall(".//w:commentRangeStart", NS)]
        ends = [e.get(W + "id") for e in document.findall(".//w:commentRangeEnd", NS)]
        refs = [e.get(W + "id") for e in document.findall(".//w:commentReference", NS)]
        report["comments"] = {
            "part_present": "word/comments.xml" in names,
            "ids": comment_ids,
            "starts": starts,
            "ends": ends,
            "references": refs,
            "unbalanced": sorted(set(comment_ids) ^ (set(starts) & set(ends) & set(refs))),
            "comments_extended_present": "word/commentsExtended.xml" in names,
        }

        # Bookmarks / drawing anchors.
        bm_starts = [e.get(W + "id") for e in document.findall(".//w:bookmarkStart", NS)]
        bm_ends = [e.get(W + "id") for e in document.findall(".//w:bookmarkEnd", NS)]
        report["bookmark_counts"] = {"start": len(bm_starts), "end": len(bm_ends)}
        report["bookmark_unbalanced_ids"] = sorted(set(bm_starts) ^ set(bm_ends))

        # Content types required parts.
        ct = xml(zf, "[Content_Types].xml")
        overrides = {}
        if ct is not None:
            for e in ct.findall("ct:Override", NS):
                overrides[e.get("PartName")] = e.get("ContentType")
        report["comments_content_type"] = overrides.get("/word/comments.xml")
        report["content_type_override_count"] = len(overrides)

        # Full text dump for deterministic searches.
        full_text = "\n".join(p["text"] for p in paras if p["text"])
        Path(r"D:\US\.tmp_report7_review_20260924_1941\text.txt").write_text(full_text, encoding="utf-8")

    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = {
        "file_size": report["file_size"],
        "zip_test": report["zip_test"],
        "metadata": report["metadata"],
        "paragraphs": report["paragraph_count_xml"],
        "headings": len(report["headings"]),
        "heading_style_counts": report["heading_style_counts"],
        "heading_jumps": len(report["heading_jumps"]),
        "toc_paragraphs": len(report["toc_paragraphs"]),
        "toc_missing_targets": len(report["toc_missing_targets"]),
        "toc_text_mismatches": len(report["toc_text_mismatches"]),
        "placeholders": len(report["placeholders"]),
        "near_duplicate_paragraphs": len(report["near_duplicate_paragraphs"]),
        "tables": report["table_count"],
        "drawings": report["drawing_count"],
        "media": report["media_count"],
        "media_bytes": report["media_bytes"],
        "broken_relationships": len(report["broken_relationships"]),
        "duplicate_relationship_ids": len(report["duplicate_relationship_ids"]),
        "tracked_changes": report["tracked_changes"],
        "track_revisions_enabled": report["track_revisions_enabled"],
        "comments": report["comments"],
        "bookmark_counts": report["bookmark_counts"],
        "bookmark_unbalanced": len(report["bookmark_unbalanced_ids"]),
        "field_char_counts": report["field_char_counts"],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
