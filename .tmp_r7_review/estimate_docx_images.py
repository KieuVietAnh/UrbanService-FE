from __future__ import annotations

import hashlib
import io
import statistics
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image


DOCX = Path(r"C:\Users\richdesu\Downloads\Report7_FinalProjectReport.docx")


def resize_copy(im: Image.Image, max_width: int, max_height: int) -> Image.Image:
    out = im.copy()
    out.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    return out


def png_bytes(im: Image.Image, *, colors: int | None = None) -> int:
    out = io.BytesIO()
    image = im
    if colors is not None and im.mode not in {"1", "P"}:
        alpha = "A" in im.getbands()
        if alpha:
            rgba = im.convert("RGBA")
            image = rgba.quantize(colors=colors, method=Image.Quantize.FASTOCTREE)
        else:
            image = im.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
    image.save(out, format="PNG", optimize=True, compress_level=9)
    return len(out.getvalue())


def jpeg_bytes(im: Image.Image, quality: int) -> int:
    out = io.BytesIO()
    rgb = im.convert("RGB")
    rgb.save(out, format="JPEG", quality=quality, optimize=True, progressive=True, subsampling=1)
    return len(out.getvalue())


with zipfile.ZipFile(DOCX) as zf:
    infos = [i for i in zf.infolist() if i.filename.startswith("word/media/")]
    rows = []
    hash_groups = defaultdict(list)
    for info in infos:
        data = zf.read(info.filename)
        hash_groups[hashlib.sha256(data).hexdigest()].append(info.filename)
        try:
            with Image.open(io.BytesIO(data)) as im:
                im.load()
                fmt = im.format or info.filename.rsplit(".", 1)[-1].upper()
                width, height = im.size
                has_alpha = "A" in im.getbands()
                rows.append(
                    {
                        "name": info.filename,
                        "bytes": len(data),
                        "format": fmt,
                        "width": width,
                        "height": height,
                        "alpha": has_alpha,
                        "im": im.copy(),
                    }
                )
        except Exception as exc:
            print(f"UNREADABLE {info.filename}: {exc}")

print(f"media_files={len(infos)} readable={len(rows)}")
print(f"original_media_bytes={sum(r['bytes'] for r in rows)}")
print("formats=" + repr(dict(Counter(r["format"] for r in rows))))
print("alpha_images=" + str(sum(1 for r in rows if r["alpha"])))
print("dimensions=" + repr(dict(Counter((r["width"], r["height"]) for r in rows).most_common(20))))
print(f"max_dimensions={max((r['width'], r['height'], r['name']) for r in rows)}")
print(f"median_width={statistics.median(r['width'] for r in rows)} median_height={statistics.median(r['height'] for r in rows)}")
dups = [names for names in hash_groups.values() if len(names) > 1]
print(f"duplicate_hash_groups={len(dups)} duplicate_files_beyond_first={sum(len(g)-1 for g in dups)}")
for group in dups:
    print("duplicate=" + " | ".join(group))

scenarios = {
    "lossless_png_optimize_keep_jpeg": 0,
    "balanced_1800px_png_lossless_jpeg85": 0,
    "balanced_1600px_png_256color_jpeg85": 0,
    "small_1400px_png_256color_jpeg78": 0,
}

for row in rows:
    im = row["im"]
    fmt = row["format"].upper()
    original = row["bytes"]
    if fmt == "PNG":
        lossless = png_bytes(im)
        balanced_lossless = png_bytes(resize_copy(im, 1800, 2400))
        balanced_quant = png_bytes(resize_copy(im, 1600, 2200), colors=256)
        small_quant = png_bytes(resize_copy(im, 1400, 2000), colors=256)
        scenarios["lossless_png_optimize_keep_jpeg"] += min(original, lossless)
        scenarios["balanced_1800px_png_lossless_jpeg85"] += min(original, balanced_lossless)
        scenarios["balanced_1600px_png_256color_jpeg85"] += min(original, balanced_quant)
        scenarios["small_1400px_png_256color_jpeg78"] += min(original, small_quant)
    elif fmt in {"JPEG", "JPG"}:
        im1800 = resize_copy(im, 1800, 2400)
        im1600 = resize_copy(im, 1600, 2200)
        im1400 = resize_copy(im, 1400, 2000)
        scenarios["lossless_png_optimize_keep_jpeg"] += original
        scenarios["balanced_1800px_png_lossless_jpeg85"] += min(original, jpeg_bytes(im1800, 85))
        scenarios["balanced_1600px_png_256color_jpeg85"] += min(original, jpeg_bytes(im1600, 85))
        scenarios["small_1400px_png_256color_jpeg78"] += min(original, jpeg_bytes(im1400, 78))
    else:
        for key in scenarios:
            scenarios[key] += original

print("SCENARIOS")
for key, size in scenarios.items():
    print(f"{key}={size} bytes ({size/1024/1024:.2f} MiB)")

print("TOP_IMAGES")
for row in sorted(rows, key=lambda x: x["bytes"], reverse=True)[:20]:
    print(f"{row['name']} {row['format']} {row['width']}x{row['height']} {row['bytes']/1024:.1f} KiB alpha={row['alpha']}")
