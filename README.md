_coalescion._
the aristic project of aiden karpf.

## Structure

- `index.html` is the homepage.
- `menu_pages/` contains the top-level section pages linked from the homepage.
- `poems/` contains individual poem pages linked from `menu_pages/poetry.html`.
- `css/` contains shared styles.
- `js/` contains shared page behavior.
- `logo/` contains logo and brand image files.
- `fonts/` contains bundled font files and their licenses.
- `images/` is reserved for artwork or page imagery.
- `CNAME` is required by GitHub Pages for the custom domain.

## SVG Utilities

Convert poem PDFs to cleaned SVGs in `poems/poem_svgs/`:

```sh
python3 scripts/convert_poem_pdfs_to_svgs.py /path/to/poem-pdfs
```

The script converts PDF page 1 with `pdf2svg`, runs `scripts/remove_svg_background.py`,
and names each SVG from the PDF filename, for example `Fish Dream.pdf` becomes
`poems/poem_svgs/fish_dream.svg`. Pass `--overwrite` to replace an existing SVG or
`--unique-names` to keep both versions.

Remove full-page background fills from one SVG:

```sh
python3 scripts/remove_svg_background.py poems/poem_svgs/template.svg
```

Preview changes without writing:

```sh
python3 scripts/remove_svg_background.py --dry-run poems/poem_svgs
```

Write cleaned copies to a separate folder:

```sh
python3 scripts/remove_svg_background.py --output-dir /tmp/clean-svgs poems/poem_svgs
```
