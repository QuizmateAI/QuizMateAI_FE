# Session Summary

## Request

Tao test case de kiem tra toc do hien thi cho first visit, login -> home, va tao workspace ca nhan / nhom lan dau. Sau khi test, neu chua dat thi lap ke hoach sua.

## Scope

- Feature hoac khu vuc tac dong: `QuizMateAI_FE`
- Trong pham vi:
  - route preload cho login -> home / workspace deep-link
  - Home first-render fetch strategy
  - create workspace flow khong bi block boi background invalidate
  - bundle budget va perf invariant tests
  - manual test case + execution report + skill card
- Ngoai pham vi:
  - Playwright/Lighthouse e2e browser harness
  - toi uu xong toan bo GroupWorkspacePage va locale payload trong cung session

## Files changed

- `package.json`
- `scripts/check-bundle-budget.mjs`
- `src/App.jsx`
- `src/lib/routeLoaders.js`
- `src/Pages/Authentication/Login.js`
- `src/Pages/Users/Home/HomePage.jsx`
- `src/hooks/useWorkspace.js`
- `src/test/auth/useLogin.test.jsx`
- `src/test/performance/useLogin.performance.test.jsx`
- `src/test/performance/useWorkspace.performance.test.jsx`
- `src/test/performance/HomePage.performance.test.jsx`
- `src/test/manual/performance-first-load-test-cases.md`
- `src/test/manual/performance-first-load-execution-report.md`
- `docs/assistant/skills/README.md`
- `docs/assistant/skills/performance-budget-check.md`
- `docs/assistant/sessions/_index.md`
- `docs/assistant/sessions/2026-04-09__first-load-performance-checks.md`

## Summary of changes

- Mo rong bundle budget check de bao phu landing, login, va home route chunk.
- Them perf test suite cho auth preload, Home first-render fetch guard, va non-blocking workspace creation.
- Toi uu nhe cho first-use flow:
  - preload `/home` truoc khi USER navigate sau login
  - preload workspace route cho deep-link login
  - khong fetch groups ngay tren Home workspace tab
  - delay wallet fetch sau first paint fallback
  - khong doi `invalidateQueries` xong moi tra create workspace/group workspace
- Them manual performance test cases va execution report de ghi ro pass/fail.
- Them skill card `performance-budget-check` de tai su dung cho cac task first-load sau nay.

## Verification

- `npx vitest run src/test/performance src/test/auth/useLogin.test.jsx`
  - Pass 4 files, 10 tests
- `npm run build`
  - Pass
- `npm run check:bundle-budget`
  - Fail 3 budget:
    - `GroupWorkspacePage` over budget
    - `vi` locale over budget
    - `en` locale over budget

## Risks or follow-ups

- Browser timing that cho login -> home va create workspace chua duoc automate bang browser that; hien tai moi co manual case + FE invariant checks.
- `GroupWorkspacePage` van import qua nhieu module o page entry.
- Locale file van lon va duoc load truoc bootstrap xong, co nguy co tiep tuc anh huong first visit neu khong tach namespace.
