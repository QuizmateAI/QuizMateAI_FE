## Summary

Standardized every `Function Details` block in `docs/screen-specs/*.md` to a copy-paste-friendly markdown table format:

| # | Item | Detail |
| --- | --- | --- |

## What Changed

- Converted all legacy numbered `Function Details` sections into the shared table layout.
- Kept the same five functional categories across screens:
  - `Data Fields`
  - `Validation Rules`
  - `Business Rules`
  - `Normal Case`
  - `Abnormal Cases`
- Replaced in-cell list markers from `-` to `•`.
- Collapsed spacing inside each `Detail` cell so entries are joined with a single `<br>` only.
- Re-saved all files in `docs/screen-specs` with UTF-8 BOM to keep `•` readable in Windows copy/paste workflows.

## Verification

- No remaining legacy `1. Data Fields` style blocks in `docs/screen-specs`.
- No remaining `<br><br>` spacing inside `Function Details` cells.
- Verified sample rendering in `01-public-auth.md` and existing converted sections in workspace specs.
