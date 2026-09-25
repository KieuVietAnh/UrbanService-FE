import json
import re
import sys
import zipfile
from pathlib import Path

from lxml import etree


W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def element_text(node):
    parts = []
    for el in node.iter():
        if el.tag == W + "t" and el.text:
            parts.append(el.text)
        elif el.tag == W + "tab":
            parts.append("\t")
        elif el.tag in {W + "br", W + "cr"}:
            parts.append("\n")
        elif el.tag == W + "delText" and el.text:
            parts.append("[DELETED:" + el.text + "]")
    return "".join(parts)


def paragraph_style(p):
    style = p.find("./w:pPr/w:pStyle", namespaces={"w": W[1:-1]})
    return style.get(W + "val") if style is not None else ""


def iter_body_blocks(root):
    body = root.find(".//w:body", namespaces={"w": W[1:-1]})
    for child in body:
        if child.tag == W + "p":
            yield "P", paragraph_style(child), element_text(child)
        elif child.tag == W + "tbl":
            rows = child.findall("./w:tr", namespaces={"w": W[1:-1]})
            for row_no, row in enumerate(rows, 1):
                cells = []
                for cell in row.findall("./w:tc", namespaces={"w": W[1:-1]}):
                    cell_text = " ".join(
                        re.sub(r"\s+", " ", element_text(p)).strip()
                        for p in cell.findall(".//w:p", namespaces={"w": W[1:-1]})
                    ).strip()
                    cells.append(cell_text)
                yield "T", f"row{row_no}", " | ".join(cells)


def main():
    source = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source) as zf:
        names = zf.namelist()
        doc_xml = zf.read("word/document.xml")
        root = etree.fromstring(doc_xml)
        blocks = list(iter_body_blocks(root))

        extras = []
        for name in names:
            if re.fullmatch(r"word/(header|footer)\d+\.xml", name) or name in {
                "word/footnotes.xml",
                "word/endnotes.xml",
                "word/comments.xml",
            }:
                extra_root = etree.fromstring(zf.read(name))
                text = re.sub(r"\s+", " ", element_text(extra_root)).strip()
                extras.append((name, text))

        core_props = {}
        if "docProps/core.xml" in names:
            core_root = etree.fromstring(zf.read("docProps/core.xml"))
            for child in core_root:
                if child.text:
                    core_props[etree.QName(child).localname] = child.text

    block_path = out_dir / "blocks.tsv"
    with block_path.open("w", encoding="utf-8", newline="\n") as fh:
        for idx, (kind, style, text) in enumerate(blocks, 1):
            clean = text.replace("\t", " ").replace("\r", " ").replace("\n", " ")
            fh.write(f"{idx}\t{kind}\t{style}\t{clean}\n")

    all_text = "\n".join(text for _, _, text in blocks)
    (out_dir / "all_text.txt").write_text(all_text, encoding="utf-8")
    (out_dir / "extras.json").write_text(
        json.dumps(extras, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    stats = {
        "source": str(source),
        "size_bytes": source.stat().st_size,
        "blocks": len(blocks),
        "paragraph_blocks": sum(k == "P" for k, _, _ in blocks),
        "table_row_blocks": sum(k == "T" for k, _, _ in blocks),
        "nonempty_blocks": sum(bool(t.strip()) for _, _, t in blocks),
        "word_count_approx": len(re.findall(r"\S+", all_text)),
        "media_files": sum(name.startswith("word/media/") for name in names),
        "has_comments": "word/comments.xml" in names,
        "core_properties": core_props,
    }
    (out_dir / "stats.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(stats, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
