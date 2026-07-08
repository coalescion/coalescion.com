#!/usr/bin/env python3
"""Calculate the CSS scale needed for SVG text to render at a target size."""

from __future__ import annotations

import argparse
import math
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


CSS_DPI = 96.0
DEFAULT_ROOT_FONT_SIZE_PX = 16.0
TEXT_TAGS = {"text", "tspan", "textPath"}


@dataclass(frozen=True)
class FontSample:
    element: str
    font_px: float
    text: str


@dataclass(frozen=True)
class SvgGeometry:
    width_px: float
    height_px: float
    view_box_width: float | None
    view_box_height: float | None


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


def parse_css_length(
    raw_value: str,
    *,
    root_font_px: float,
    current_font_px: float | None = None,
) -> float:
    value = raw_value.strip()
    if not value:
        raise ValueError("empty length")

    match = re.fullmatch(r"([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)([a-z%]*)", value, re.I)
    if not match:
        raise ValueError(f"unsupported length: {raw_value!r}")

    number = float(match.group(1))
    unit = match.group(2).lower()

    if unit in ("", "px"):
        return number
    if unit == "rem":
        return number * root_font_px
    if unit == "em":
        if current_font_px is None:
            raise ValueError(f"{raw_value!r} needs a parent font size")
        return number * current_font_px
    if unit == "pt":
        return number * CSS_DPI / 72.0
    if unit == "pc":
        return number * CSS_DPI / 6.0
    if unit == "in":
        return number * CSS_DPI
    if unit == "cm":
        return number * CSS_DPI / 2.54
    if unit == "mm":
        return number * CSS_DPI / 25.4
    if unit == "q":
        return number * CSS_DPI / 101.6

    raise ValueError(f"unsupported length unit in {raw_value!r}")


def parse_view_box(svg: ET.Element) -> tuple[float, float] | tuple[None, None]:
    value = svg.get("viewBox")
    if not value:
        return None, None

    parts = re.split(r"[\s,]+", value.strip())
    if len(parts) != 4:
        raise ValueError(f"invalid viewBox: {value!r}")

    return float(parts[2]), float(parts[3])


def read_svg_geometry(svg: ET.Element, *, root_font_px: float) -> SvgGeometry:
    view_box_width, view_box_height = parse_view_box(svg)
    width_attr = svg.get("width")
    height_attr = svg.get("height")

    if width_attr:
        width_px = parse_css_length(width_attr, root_font_px=root_font_px)
    elif view_box_width:
        width_px = view_box_width
    else:
        raise ValueError("SVG is missing both width and viewBox width")

    if height_attr:
        height_px = parse_css_length(height_attr, root_font_px=root_font_px)
    elif view_box_height:
        height_px = view_box_height
    else:
        raise ValueError("SVG is missing both height and viewBox height")

    return SvgGeometry(
        width_px=width_px,
        height_px=height_px,
        view_box_width=view_box_width,
        view_box_height=view_box_height,
    )


def multiply_matrix(
    a: tuple[float, float, float, float, float, float],
    b: tuple[float, float, float, float, float, float],
) -> tuple[float, float, float, float, float, float]:
    a0, a1, a2, a3, a4, a5 = a
    b0, b1, b2, b3, b4, b5 = b
    return (
        a0 * b0 + a2 * b1,
        a1 * b0 + a3 * b1,
        a0 * b2 + a2 * b3,
        a1 * b2 + a3 * b3,
        a0 * b4 + a2 * b5 + a4,
        a1 * b4 + a3 * b5 + a5,
    )


def parse_number_list(value: str) -> list[float]:
    return [
        float(part)
        for part in re.findall(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?", value, re.I)
    ]


def parse_transform(transform: str | None) -> tuple[float, float, float, float, float, float]:
    matrix = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
    if not transform:
        return matrix

    for name, raw_args in re.findall(r"([a-zA-Z]+)\s*\(([^)]*)\)", transform):
        args = parse_number_list(raw_args)
        kind = name.lower()

        if kind == "matrix" and len(args) == 6:
            next_matrix = tuple(args)  # type: ignore[assignment]
        elif kind == "translate" and args:
            tx = args[0]
            ty = args[1] if len(args) > 1 else 0.0
            next_matrix = (1.0, 0.0, 0.0, 1.0, tx, ty)
        elif kind == "scale" and args:
            sx = args[0]
            sy = args[1] if len(args) > 1 else sx
            next_matrix = (sx, 0.0, 0.0, sy, 0.0, 0.0)
        elif kind == "rotate" and args:
            angle = math.radians(args[0])
            cos_a = math.cos(angle)
            sin_a = math.sin(angle)
            rotate = (cos_a, sin_a, -sin_a, cos_a, 0.0, 0.0)
            if len(args) >= 3:
                cx, cy = args[1], args[2]
                next_matrix = multiply_matrix(
                    multiply_matrix((1.0, 0.0, 0.0, 1.0, cx, cy), rotate),
                    (1.0, 0.0, 0.0, 1.0, -cx, -cy),
                )
            else:
                next_matrix = rotate
        elif kind == "skewx" and args:
            next_matrix = (1.0, 0.0, math.tan(math.radians(args[0])), 1.0, 0.0, 0.0)
        elif kind == "skewy" and args:
            next_matrix = (1.0, math.tan(math.radians(args[0])), 0.0, 1.0, 0.0, 0.0)
        else:
            continue

        matrix = multiply_matrix(matrix, next_matrix)

    return matrix


def matrix_uniform_scale(matrix: tuple[float, float, float, float, float, float]) -> float:
    a, b, c, d, _e, _f = matrix
    scale_x = math.hypot(a, b)
    scale_y = math.hypot(c, d)
    if scale_x == 0 or scale_y == 0:
        return 0.0
    return math.sqrt(scale_x * scale_y)


def inherited_value(element: ET.Element, styles: dict[str, str], name: str) -> str | None:
    if name in styles:
        return styles[name]
    return element.get(name)


def direct_text(element: ET.Element) -> str:
    pieces = []
    if element.text:
        pieces.append(element.text)
    for child in element:
        if child.tail:
            pieces.append(child.tail)
    return " ".join("".join(pieces).split())


def walk_text_samples(
    element: ET.Element,
    *,
    root_font_px: float,
    parent_font_px: float,
    parent_transform: tuple[float, float, float, float, float, float],
) -> Iterable[FontSample]:
    styles = parse_style(element.get("style"))
    font_raw = inherited_value(element, styles, "font-size")
    font_px = parent_font_px
    if font_raw:
        font_px = parse_css_length(
            font_raw,
            root_font_px=root_font_px,
            current_font_px=parent_font_px,
        )

    transform = multiply_matrix(parent_transform, parse_transform(element.get("transform")))
    tag = local_name(element.tag)

    if tag in TEXT_TAGS and direct_text(element):
        rendered_font_px = font_px * matrix_uniform_scale(transform)
        yield FontSample(element=tag, font_px=rendered_font_px, text=direct_text(element))

    for child in element:
        yield from walk_text_samples(
            child,
            root_font_px=root_font_px,
            parent_font_px=font_px,
            parent_transform=transform,
        )


def round_key(value: float) -> float:
    return round(value, 6)


def choose_source_size(samples: list[FontSample], mode: str, explicit_size: float | None) -> float:
    if explicit_size is not None:
        return explicit_size

    sizes = [sample.font_px for sample in samples]
    if mode == "first":
        return sizes[0]
    if mode == "smallest":
        return min(sizes)
    if mode == "largest":
        return max(sizes)
    if mode == "median":
        sorted_sizes = sorted(sizes)
        return sorted_sizes[len(sorted_sizes) // 2]

    counts = Counter(round_key(size) for size in sizes)
    selected_key, _count = counts.most_common(1)[0]
    for size in sizes:
        if round_key(size) == selected_key:
            return size

    raise ValueError("unable to choose source font size")


def format_number(value: float) -> str:
    return f"{value:.6f}".rstrip("0").rstrip(".")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Determine the CSS scale/rendered size needed for text inside an SVG "
            "to display at a target font size."
        )
    )
    parser.add_argument("svg", type=Path, help="Path to the SVG file.")
    parser.add_argument(
        "target_font_size",
        help="Desired rendered font size, for example 1.2rem, 19.2px, or 12pt.",
    )
    parser.add_argument(
        "--root-font-size",
        default=f"{DEFAULT_ROOT_FONT_SIZE_PX}px",
        help="Root font size used to resolve rem values. Default: 16px.",
    )
    parser.add_argument(
        "--match",
        choices=("most-common", "first", "smallest", "largest", "median"),
        default="most-common",
        help="Which detected source font size to match when the SVG contains several. Default: most-common.",
    )
    parser.add_argument(
        "--source-font-size",
        help="Override detected source font size, for example 12 or 10pt.",
    )
    parser.add_argument(
        "--css-selector",
        default=".poem-image",
        help="Selector to include in the CSS snippet. Default: .poem-image.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        root_font_px = parse_css_length(args.root_font_size, root_font_px=DEFAULT_ROOT_FONT_SIZE_PX)
        target_px = parse_css_length(args.target_font_size, root_font_px=root_font_px)
        tree = ET.parse(args.svg)
        svg = tree.getroot()
        if local_name(svg.tag) != "svg":
            raise ValueError(f"{args.svg} is not an SVG document")

        geometry = read_svg_geometry(svg, root_font_px=root_font_px)

        source_override = None
        if args.source_font_size:
            source_override = parse_css_length(
                args.source_font_size,
                root_font_px=root_font_px,
            )

        samples = list(
            walk_text_samples(
                svg,
                root_font_px=root_font_px,
                parent_font_px=16.0,
                parent_transform=(1.0, 0.0, 0.0, 1.0, 0.0, 0.0),
            )
        )
        if not samples and source_override is None:
            raise ValueError("no <text> elements with text content were found")

        if geometry.view_box_width and geometry.view_box_height:
            viewport_scale_x = geometry.width_px / geometry.view_box_width
            viewport_scale_y = geometry.height_px / geometry.view_box_height
            viewport_scale = math.sqrt(viewport_scale_x * viewport_scale_y)
        else:
            viewport_scale = 1.0

        adjusted_samples = [
            FontSample(
                element=sample.element,
                font_px=sample.font_px * viewport_scale,
                text=sample.text,
            )
            for sample in samples
        ]

        source_px = choose_source_size(adjusted_samples, args.match, source_override)
        scale = target_px / source_px
        rendered_width = geometry.width_px * scale
        rendered_height = geometry.height_px * scale

    except (ET.ParseError, OSError, ValueError, ZeroDivisionError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(f"SVG: {args.svg}")
    print(f"Target font size: {format_number(target_px)}px ({args.target_font_size})")
    print(f"Source font size used: {format_number(source_px)}px")
    print(f"Scale multiplier: {format_number(scale)}")
    print(f"Rendered width: {format_number(rendered_width)}px")
    print(f"Rendered height: {format_number(rendered_height)}px")
    print()
    print("CSS:")
    print(f"{args.css_selector} {{")
    print(f"  width: {format_number(rendered_width)}px;")
    print("  height: auto;")
    print("}")

    if adjusted_samples:
        counts = Counter(round_key(sample.font_px) for sample in adjusted_samples)
        if len(counts) > 1:
            print()
            print("Detected multiple source font sizes:")
            for size, count in sorted(counts.items()):
                matched = " (used)" if math.isclose(size, round_key(source_px), rel_tol=0, abs_tol=1e-6) else ""
                print(f"  {format_number(size)}px: {count} text element(s){matched}")
            print("A single scale can exactly match only one source font size.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
