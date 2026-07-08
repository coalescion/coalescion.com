#!/usr/bin/env python3
"""Remove page-sized background fills from one or more SVG files."""

from __future__ import annotations

import argparse
import re
import shutil
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


SVG_NS = "http://www.w3.org/2000/svg"
SKIP_ANCESTORS = {"clipPath", "defs", "mask", "pattern", "symbol"}
BACKGROUND_TAGS = {"rect", "path"}
LENGTH_RE = re.compile(r"^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)", re.I)
NUMBER_RE = re.compile(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?", re.I)


@dataclass(frozen=True)
class Box:
    x: float
    y: float
    width: float
    height: float

    @property
    def right(self) -> float:
        return self.x + self.width

    @property
    def bottom(self) -> float:
        return self.y + self.height

    @property
    def area(self) -> float:
        return abs(self.width * self.height)


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def parse_style(style: str | None) -> dict[str, str]:
    if not style:
        return {}

    declarations: dict[str, str] = {}
    for declaration in style.split(";"):
        if ":" not in declaration:
            continue
        name, value = declaration.split(":", 1)
        declarations[name.strip().lower()] = value.strip()
    return declarations


def format_style(styles: dict[str, str]) -> str:
    return "; ".join(f"{name}: {value}" for name, value in styles.items())


def parse_length(value: str | None, *, relative_to: float | None = None) -> float | None:
    if value is None:
        return None

    raw = value.strip()
    if raw.endswith("%") and relative_to is not None:
        try:
            return float(raw[:-1]) * relative_to / 100.0
        except ValueError:
            return None

    match = LENGTH_RE.match(raw)
    if not match:
        return None
    return float(match.group(1))


def parse_view_box(svg: ET.Element) -> Box | None:
    view_box = svg.get("viewBox")
    if not view_box:
        return None

    parts = [float(part) for part in NUMBER_RE.findall(view_box)]
    if len(parts) != 4:
        return None
    return Box(parts[0], parts[1], parts[2], parts[3])


def read_canvas(svg: ET.Element) -> Box | None:
    view_box = parse_view_box(svg)
    if view_box:
        return view_box

    width = parse_length(svg.get("width"))
    height = parse_length(svg.get("height"))
    if width is None or height is None:
        return None
    return Box(0.0, 0.0, width, height)


def visible_fill(element: ET.Element) -> bool:
    styles = parse_style(element.get("style"))
    fill = styles.get("fill", element.get("fill"))
    opacity = styles.get("opacity", element.get("opacity"))
    fill_opacity = styles.get("fill-opacity", element.get("fill-opacity"))

    if fill is None:
        return False
    if fill.strip().lower() in {"none", "transparent"}:
        return False
    if opacity is not None and parse_length(opacity) == 0:
        return False
    if fill_opacity is not None and parse_length(fill_opacity) == 0:
        return False
    return True


def has_visible_stroke(element: ET.Element) -> bool:
    styles = parse_style(element.get("style"))
    stroke = styles.get("stroke", element.get("stroke"))
    stroke_opacity = styles.get("stroke-opacity", element.get("stroke-opacity"))
    if stroke is None or stroke.strip().lower() in {"none", "transparent"}:
        return False
    return stroke_opacity is None or parse_length(stroke_opacity) != 0


def rect_box(element: ET.Element, canvas: Box) -> Box | None:
    width = parse_length(element.get("width"), relative_to=canvas.width)
    height = parse_length(element.get("height"), relative_to=canvas.height)
    if width is None or height is None:
        return None

    x = parse_length(element.get("x"), relative_to=canvas.width)
    y = parse_length(element.get("y"), relative_to=canvas.height)
    return Box(canvas.x + (x or 0.0), canvas.y + (y or 0.0), width, height)


def path_box(element: ET.Element) -> Box | None:
    d = element.get("d")
    if not d:
        return None

    numbers = [float(part) for part in NUMBER_RE.findall(d)]
    if len(numbers) < 4:
        return None

    xs = numbers[0::2]
    ys = numbers[1::2]
    min_x = min(xs)
    max_x = max(xs)
    min_y = min(ys)
    max_y = max(ys)
    return Box(min_x, min_y, max_x - min_x, max_y - min_y)


def covers_canvas(candidate: Box, canvas: Box, *, tolerance: float) -> bool:
    x_ok = candidate.x <= canvas.x + tolerance
    y_ok = candidate.y <= canvas.y + tolerance
    right_ok = candidate.right >= canvas.right - tolerance
    bottom_ok = candidate.bottom >= canvas.bottom - tolerance
    return x_ok and y_ok and right_ok and bottom_ok


def large_enough(candidate: Box, canvas: Box) -> bool:
    return canvas.area > 0 and candidate.area >= canvas.area * 0.9


def has_skip_ancestor(element: ET.Element, parent_map: dict[ET.Element, ET.Element]) -> bool:
    parent = parent_map.get(element)
    while parent is not None:
        if local_name(parent.tag) in SKIP_ANCESTORS:
            return True
        parent = parent_map.get(parent)
    return False


def remove_background_styles(svg: ET.Element) -> int:
    removed = 0
    for element in svg.iter():
        if "background-color" in element.attrib:
            del element.attrib["background-color"]
            removed += 1

        styles = parse_style(element.get("style"))
        if "background-color" in styles:
            del styles["background-color"]
            removed += 1
            if styles:
                element.set("style", format_style(styles))
            else:
                element.attrib.pop("style", None)
    return removed


def find_background_elements(svg: ET.Element, *, tolerance: float) -> list[ET.Element]:
    canvas = read_canvas(svg)
    if canvas is None:
        return []

    parent_map = {child: parent for parent in svg.iter() for child in parent}
    matches: list[ET.Element] = []

    for element in svg.iter():
        tag = local_name(element.tag)
        if tag not in BACKGROUND_TAGS:
            continue
        if has_skip_ancestor(element, parent_map):
            continue
        if not visible_fill(element) or has_visible_stroke(element):
            continue

        if tag == "rect":
            box = rect_box(element, canvas)
            if box and covers_canvas(box, canvas, tolerance=tolerance):
                matches.append(element)
        elif tag == "path":
            box = path_box(element)
            if box and (covers_canvas(box, canvas, tolerance=tolerance) or large_enough(box, canvas)):
                matches.append(element)

    return matches


def remove_elements(root: ET.Element, elements: Iterable[ET.Element]) -> int:
    parent_map = {child: parent for parent in root.iter() for child in parent}
    removed = 0
    for element in elements:
        parent = parent_map.get(element)
        if parent is None:
            continue
        parent.remove(element)
        removed += 1
    return removed


def iter_svg_files(paths: Iterable[Path]) -> list[Path]:
    files: list[Path] = []
    for path in paths:
        if path.is_dir():
            files.extend(sorted(path.rglob("*.svg")))
        elif path.suffix.lower() == ".svg":
            files.append(path)
        else:
            raise ValueError(f"{path} is not an SVG file or directory")
    return files


def output_path_for(source: Path, *, output_dir: Path | None, suffix: str) -> Path:
    if output_dir is None:
        return source
    return output_dir / f"{source.stem}{suffix}{source.suffix}"


def process_file(
    source: Path,
    *,
    output_dir: Path | None,
    suffix: str,
    backup: bool,
    dry_run: bool,
    tolerance: float,
) -> tuple[Path, int]:
    ET.register_namespace("", SVG_NS)
    tree = ET.parse(source)
    root = tree.getroot()
    if local_name(root.tag) != "svg":
        raise ValueError(f"{source} is not an SVG document")

    matches = find_background_elements(root, tolerance=tolerance)
    removed_styles = remove_background_styles(root)
    removed_elements = remove_elements(root, matches)
    total_removed = removed_styles + removed_elements

    destination = output_path_for(source, output_dir=output_dir, suffix=suffix)
    if dry_run or total_removed == 0:
        return destination, total_removed

    if output_dir is None and backup:
        shutil.copy2(source, source.with_suffix(source.suffix + ".bak"))
    else:
        destination.parent.mkdir(parents=True, exist_ok=True)

    tree.write(destination, encoding="unicode", xml_declaration=False)
    return destination, total_removed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Remove solid, page-sized background fills from SVG files."
    )
    parser.add_argument("paths", nargs="+", type=Path, help="SVG files or directories to process")
    parser.add_argument(
        "-o",
        "--output-dir",
        type=Path,
        help="write cleaned SVGs to this directory instead of editing in place",
    )
    parser.add_argument(
        "--suffix",
        default="-no-bg",
        help="suffix for files written with --output-dir (default: %(default)s)",
    )
    parser.add_argument(
        "--backup",
        action="store_true",
        help="when editing in place, save a .svg.bak copy before writing",
    )
    parser.add_argument("--dry-run", action="store_true", help="report changes without writing files")
    parser.add_argument(
        "--tolerance",
        type=float,
        default=1.0,
        help="coordinate tolerance for matching full-page shapes (default: %(default)s)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    try:
        files = iter_svg_files(args.paths)
    except ValueError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2

    if not files:
        print("No SVG files found.", file=sys.stderr)
        return 1

    failures = 0
    for source in files:
        try:
            destination, removed = process_file(
                source,
                output_dir=args.output_dir,
                suffix=args.suffix,
                backup=args.backup,
                dry_run=args.dry_run,
                tolerance=args.tolerance,
            )
        except (ET.ParseError, OSError, ValueError) as error:
            failures += 1
            print(f"{source}: error: {error}", file=sys.stderr)
            continue

        action = "would remove" if args.dry_run else "removed"
        target = f" -> {destination}" if destination != source else ""
        print(f"{source}: {action} {removed} background item(s){target}")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
