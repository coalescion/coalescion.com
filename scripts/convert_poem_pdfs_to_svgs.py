#!/usr/bin/env python3
"""Convert poem PDFs to cleaned SVGs for the poetry SVG folder."""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = REPO_ROOT / "poems" / "poem_svgs"
BACKGROUND_REMOVER = REPO_ROOT / "scripts" / "remove_svg_background.py"
SLUG_RE = re.compile(r"[^a-z0-9]+")
TRAILING_BRAND_RE = re.compile(r"\s+coalescion(?:\.com)?\s*$", re.I)
SLUG_ALIASES = {
    "my_ears_hear_ear": "my_ear_hears_ear",
    "staggering_starling": "staggering_starlight",
    "to_catch_a_needle_a_second_demo": "to_catch_a_needle",
}


def slugify(value: str) -> str:
    value = TRAILING_BRAND_RE.sub("", value)
    slug = SLUG_RE.sub("_", value.lower()).strip("_")
    return SLUG_ALIASES.get(slug, slug) or "poem"


def iter_pdf_files(paths: Iterable[Path], *, recursive: bool) -> list[Path]:
    pdfs: list[Path] = []
    for path in paths:
        if path.is_dir():
            pattern = "**/*.pdf" if recursive else "*.pdf"
            pdfs.extend(sorted(path.glob(pattern)))
        elif not path.exists():
            raise ValueError(f"{path} does not exist")
        elif path.suffix.lower() == ".pdf":
            pdfs.append(path)
        else:
            raise ValueError(f"{path} is not a PDF file or directory")
    return pdfs


def unique_destination(destination: Path) -> Path:
    if not destination.exists():
        return destination

    counter = 2
    while True:
        candidate = destination.with_name(f"{destination.stem}_{counter}{destination.suffix}")
        if not candidate.exists():
            return candidate
        counter += 1


def run_command(command: list[str], *, dry_run: bool) -> None:
    print(" ".join(command))
    if dry_run:
        return
    subprocess.run(command, check=True)


def convert_pdf(
    pdf_path: Path,
    *,
    output_dir: Path,
    page: int,
    overwrite: bool,
    unique_names: bool,
    dry_run: bool,
) -> Path:
    destination = output_dir / f"{slugify(pdf_path.stem)}.svg"
    if destination.exists() and not overwrite:
        if unique_names:
            destination = unique_destination(destination)
        else:
            raise FileExistsError(f"{destination} already exists; pass --overwrite to replace it")

    if dry_run:
        run_command(["pdf2svg", str(pdf_path), str(destination), str(page)], dry_run=True)
        run_command([sys.executable, str(BACKGROUND_REMOVER), str(destination)], dry_run=True)
        return destination

    output_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="poem-svg-") as tmp_dir:
        temp_svg = Path(tmp_dir) / destination.name
        run_command(["pdf2svg", str(pdf_path), str(temp_svg), str(page)], dry_run=False)
        run_command([sys.executable, str(BACKGROUND_REMOVER), str(temp_svg)], dry_run=False)
        shutil.move(str(temp_svg), destination)

    return destination


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Convert poem PDF files with pdf2svg, remove page backgrounds, "
            "and place the cleaned SVGs in poems/poem_svgs."
        )
    )
    parser.add_argument("paths", nargs="+", type=Path, help="PDF files or directories of PDFs")
    parser.add_argument(
        "-o",
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="folder for generated SVGs (default: %(default)s)",
    )
    parser.add_argument(
        "--page",
        type=int,
        default=1,
        help="PDF page to convert with pdf2svg (default: %(default)s)",
    )
    parser.add_argument(
        "-r",
        "--recursive",
        action="store_true",
        help="search input directories recursively for PDFs",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="replace an existing SVG with the same slugged filename",
    )
    parser.add_argument(
        "--unique-names",
        action="store_true",
        help="append _2, _3, etc. instead of failing when an SVG already exists",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print the commands that would run without writing SVG files",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if args.page < 1:
        print("error: --page must be 1 or greater", file=sys.stderr)
        return 2

    if args.overwrite and args.unique_names:
        print("error: pass only one of --overwrite or --unique-names", file=sys.stderr)
        return 2

    if shutil.which("pdf2svg") is None and not args.dry_run:
        print("error: pdf2svg was not found on PATH", file=sys.stderr)
        return 1

    if not BACKGROUND_REMOVER.exists():
        print(f"error: missing {BACKGROUND_REMOVER}", file=sys.stderr)
        return 1

    try:
        pdfs = iter_pdf_files(args.paths, recursive=args.recursive)
    except ValueError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2

    if not pdfs:
        print("No PDF files found.", file=sys.stderr)
        return 1

    failures = 0
    for pdf_path in pdfs:
        try:
            destination = convert_pdf(
                pdf_path,
                output_dir=args.output_dir,
                page=args.page,
                overwrite=args.overwrite,
                unique_names=args.unique_names,
                dry_run=args.dry_run,
            )
        except (OSError, subprocess.CalledProcessError) as error:
            failures += 1
            print(f"{pdf_path}: error: {error}", file=sys.stderr)
            continue

        action = "would write" if args.dry_run else "wrote"
        print(f"{pdf_path}: {action} {destination}")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
