#!/usr/bin/env python3
"""Render PDF poetry books to flattened PNGs with selected text blurred.

The manifest is intentionally kept outside version control because it contains
the source PDF names and text that should not be exposed by the public site.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
import tempfile
import unicodedata
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageFilter


@dataclass(frozen=True)
class Word:
    text: str
    x_min: float
    y_min: float
    x_max: float
    y_max: float


@dataclass(frozen=True)
class PdfPage:
    width: float
    height: float
    words: tuple[Word, ...]


def normalize(value: str) -> str:
    return unicodedata.normalize("NFC", value).casefold()


def require_command(name: str) -> None:
    if shutil.which(name) is None:
        raise RuntimeError(f"required command not found: {name}")


def load_pages(pdf_path: Path) -> list[PdfPage]:
    result = subprocess.run(
        ["pdftotext", "-bbox-layout", str(pdf_path), "-"],
        check=True,
        capture_output=True,
    )
    root = ET.fromstring(result.stdout)
    namespace = {"x": "http://www.w3.org/1999/xhtml"}
    pages: list[PdfPage] = []

    for page_node in root.findall(".//x:page", namespace):
        words = tuple(
            Word(
                text=word_node.text or "",
                x_min=float(word_node.attrib["xMin"]),
                y_min=float(word_node.attrib["yMin"]),
                x_max=float(word_node.attrib["xMax"]),
                y_max=float(word_node.attrib["yMax"]),
            )
            for word_node in page_node.findall(".//x:word", namespace)
        )
        pages.append(
            PdfPage(
                width=float(page_node.attrib["width"]),
                height=float(page_node.attrib["height"]),
                words=words,
            )
        )

    if not pages:
        raise ValueError(f"no pages found in {pdf_path}")

    return pages


def find_phrase(page: PdfPage, phrase: str) -> list[tuple[float, float, float, float]]:
    tokens = [normalize(token) for token in phrase.split()]
    if not tokens:
        raise ValueError("blur phrase cannot be empty")

    normalized_words = [normalize(word.text) for word in page.words]
    matches: list[tuple[float, float, float, float]] = []
    token_count = len(tokens)

    for start in range(len(page.words) - token_count + 1):
        if normalized_words[start : start + token_count] != tokens:
            continue
        matched_words = page.words[start : start + token_count]
        matches.append(
            (
                min(word.x_min for word in matched_words),
                min(word.y_min for word in matched_words),
                max(word.x_max for word in matched_words),
                max(word.y_max for word in matched_words),
            )
        )

    return matches


def validate_book(book: dict[str, Any], manifest_dir: Path) -> tuple[Path, Path, list[PdfPage]]:
    source_value = book.get("source_pdf")
    output_value = book.get("output_dir")
    if not isinstance(source_value, str) or not isinstance(output_value, str):
        raise ValueError("each book requires source_pdf and output_dir strings")

    source_pdf = (manifest_dir / source_value).resolve()
    output_dir = (manifest_dir / output_value).resolve()
    if not source_pdf.is_file():
        raise FileNotFoundError(f"source PDF not found: {source_pdf}")

    pages = load_pages(source_pdf)
    targets = book.get("targets")
    if not isinstance(targets, list) or not targets:
        raise ValueError(f"{source_pdf.name}: targets must be a non-empty list")

    for target in targets:
        page_number = target.get("page")
        phrase = target.get("phrase")
        expected = target.get("expected")
        if not isinstance(page_number, int) or not 1 <= page_number <= len(pages):
            raise ValueError(f"{source_pdf.name}: invalid target page {page_number!r}")
        if not isinstance(phrase, str) or not isinstance(expected, int) or expected < 1:
            raise ValueError(f"{source_pdf.name}: target requires phrase and positive expected count")

        actual = len(find_phrase(pages[page_number - 1], phrase))
        if actual != expected:
            raise ValueError(
                f"{source_pdf.name}: page {page_number} expected {expected} match(es), found {actual}"
            )

    return source_pdf, output_dir, pages


def render_book(
    book: dict[str, Any],
    source_pdf: Path,
    output_dir: Path,
    pages: list[PdfPage],
    dpi: int,
) -> None:
    radius = book.get("blur_radius")
    padding = book.get("padding", 4)
    if not isinstance(radius, (int, float)) or radius <= 0:
        raise ValueError(f"{source_pdf.name}: blur_radius must be positive")
    if not isinstance(padding, int) or padding < 0:
        raise ValueError(f"{source_pdf.name}: padding must be a non-negative integer")

    page_boxes: dict[int, list[tuple[float, float, float, float]]] = {}
    for target in book["targets"]:
        page_number = target["page"]
        page_boxes.setdefault(page_number, []).extend(
            find_phrase(pages[page_number - 1], target["phrase"])
        )

    with tempfile.TemporaryDirectory(prefix="collage-poetry-") as temp_dir_value:
        temp_dir = Path(temp_dir_value)
        prefix = temp_dir / "page"
        subprocess.run(
            ["pdftoppm", "-png", "-r", str(dpi), str(source_pdf), str(prefix)],
            check=True,
        )

        rendered_pages = sorted(
            temp_dir.glob("page-*.png"),
            key=lambda path: int(path.stem.rsplit("-", 1)[1]),
        )
        if len(rendered_pages) != len(pages):
            raise RuntimeError(
                f"{source_pdf.name}: rendered {len(rendered_pages)} pages, expected {len(pages)}"
            )

        output_dir.mkdir(parents=True, exist_ok=True)
        for page_number, rendered_path in enumerate(rendered_pages, start=1):
            with Image.open(rendered_path) as source_image:
                image = source_image.convert("RGB")
                pdf_page = pages[page_number - 1]
                scale_x = image.width / pdf_page.width
                scale_y = image.height / pdf_page.height

                for x_min, y_min, x_max, y_max in page_boxes.get(page_number, []):
                    box = (
                        max(0, math.floor(x_min * scale_x) - padding),
                        max(0, math.floor(y_min * scale_y) - padding),
                        min(image.width, math.ceil(x_max * scale_x) + padding),
                        min(image.height, math.ceil(y_max * scale_y) + padding),
                    )
                    blurred = image.crop(box).filter(ImageFilter.GaussianBlur(float(radius)))
                    image.paste(blurred, box)

                destination = output_dir / f"page-{page_number:02d}.png"
                image.save(destination, format="PNG", optimize=True)

        expected_names = {f"page-{page_number:02d}.png" for page_number in range(1, len(pages) + 1)}
        for old_page in output_dir.glob("page-*.png"):
            if old_page.name not in expected_names:
                old_page.unlink()

    print(f"{source_pdf.name}: wrote {len(pages)} pages to {output_dir}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render collage poetry PDFs to flattened, selectively blurred PNG pages."
    )
    parser.add_argument("manifest", type=Path, help="Path to the private JSON manifest")
    parser.add_argument("--dpi", type=int, default=220, help="Raster resolution (default: 220)")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.dpi <= 0:
        print("error: --dpi must be positive", file=sys.stderr)
        return 2

    try:
        require_command("pdftoppm")
        require_command("pdftotext")
        manifest_path = args.manifest.resolve()
        with manifest_path.open(encoding="utf-8") as manifest_file:
            manifest = json.load(manifest_file)
        books = manifest.get("books")
        if not isinstance(books, list) or not books:
            raise ValueError("manifest requires a non-empty books list")

        validated = [validate_book(book, manifest_path.parent) for book in books]
        for book, (source_pdf, output_dir, pages) in zip(books, validated):
            render_book(book, source_pdf, output_dir, pages, args.dpi)
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
