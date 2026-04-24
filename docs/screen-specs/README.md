# Screen Specifications

This folder contains the English, module-based screen specification set for the current `QuizMateAI_FE` frontend.

These files are intended to be the practical working specs, not only planning notes. Each module file now follows the same business-oriented structure:

- `Function Trigger`
- `Function Description`
- `Screen Layout`
- `Function Details`
- `Source of Truth`

## Files

- [01-public-auth.md](/C:/Learning/SEP490/Proj/QuizMateAI_FE/docs/screen-specs/01-public-auth.md)
- [02-user-core.md](/C:/Learning/SEP490/Proj/QuizMateAI_FE/docs/screen-specs/02-user-core.md)
- [03-individual-workspace.md](/C:/Learning/SEP490/Proj/QuizMateAI_FE/docs/screen-specs/03-individual-workspace.md)
- [04-group-workspace.md](/C:/Learning/SEP490/Proj/QuizMateAI_FE/docs/screen-specs/04-group-workspace.md)
- [04-group-workspace-appendix.md](/C:/Learning/SEP490/Proj/QuizMateAI_FE/docs/screen-specs/04-group-workspace-appendix.md)
- [05-quiz-runtime.md](/C:/Learning/SEP490/Proj/QuizMateAI_FE/docs/screen-specs/05-quiz-runtime.md)
- [06-admin-superadmin.md](/C:/Learning/SEP490/Proj/QuizMateAI_FE/docs/screen-specs/06-admin-superadmin.md)

## Documentation Rules

- Every screen or functional view should be documented in English.
- `Function Details` should remain expanded and readable, not compressed into short one-line cells.
- When one React route contains multiple functional sub-views, each sub-view should still be documented as a separate screen-level capability.
- `Source of Truth` should always point back to the real route, page, component, and API wrapper used by the frontend.

## Note About Authentication

The authentication area has two different forgot-password implementations in the codebase:

- An inline three-step forgot-password flow inside `LoginPage.jsx`
- A standalone `/forgot-password` route page

Both are documented separately because they represent different user-facing experiences.
