# Session Summary

## User Request

Change the `Function Details` formatting so it looks like the user's sample: a framed table with `#`, `Item`, and `Detail`, making it easier to copy-paste into formal documentation.

## Files Changed

- `docs/screen-specs/03-individual-workspace.md`
- `docs/screen-specs/04-group-workspace.md`

## Main Changes

- Converted the `Function Details` block of `IND-10 Create Quiz Form` into a table layout:
  - `| # | Item | Detail |`
- Converted the `Function Details` block of `GRP-12 Create Quiz Form` into the same table layout.
- Preserved the detailed content from the previous version, but moved it into table cells so the visual structure is closer to a BA/SRS document.
- Replaced non-ASCII bullet symbols with ASCII `-` inside table cells to avoid encoding issues when copying from markdown or opening in different editors.

## Remaining Risks

- Only the two quiz-creation sections were reformatted in this pass.
- The rest of `docs/screen-specs/` still contains mixed `Function Details` styles, so another normalization pass may be needed if the user wants every screen to use the same table format.

## Suggested Verification

- Preview `IND-10` and `GRP-12` in the markdown renderer and confirm the table borders and line breaks are acceptable for copy-paste use.
- If the result is good, use the same table pattern for the remaining screens.
