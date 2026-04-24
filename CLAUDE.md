# QuizMateAI FE Claude Rules

Read `../CLAUDE.md` first. Apply these frontend-specific rules inside `QuizMateAI_FE`.

- Keep React pages thin; extract reusable UI into components and reusable logic into hooks/utilities.
- Keep frontend permission gates aligned with backend permission codes, but never treat them as security.
- Prefer Tailwind utilities and existing `src/Components/ui` primitives.
- Use Vietnamese for user-facing labels/errors unless the screen is already English-first.
- Keep JSX, JS, test, prompt, and markdown files under 1000 lines. Split files before adding non-trivial code to anything above 800 lines.
- Run targeted Vitest/ESLint for changed behavior and `npm run build` for routing/import/build-sensitive changes.
- In review-only mode, do not edit code. Report findings with exact file and line references.
