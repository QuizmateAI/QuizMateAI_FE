# First Load Performance Execution Report

## Date

- 2026-04-09

## Scope

- Route chunk budgets after splitting `GroupWorkspacePage` and i18n namespaces
- Browser timing for first visit, login to home, first individual workspace creation, and first group workspace creation
- Repair plan for flows that still miss the acceptance thresholds

## Commands Run

- `npx vitest run src/test/performance src/test/auth/useLogin.test.jsx`
- `VITE_LAUNCH_MODE=false NODE_OPTIONS=--max-old-space-size=4096 npm run build`
- `npm run check:bundle-budget`
- `npx playwright test scripts/manual-first-use-timing.spec.js --reporter=line`

## Automated Results

### Vitest

- Status: PASS
- Result: 4 files, 10 tests passed
- Covered signals:
  - USER login preloads `/home` before navigation
  - Deep-link login preloads workspace route before navigation
  - Home default tab does not enable group query on first render
  - Home defers wallet fetch until after first paint fallback timer
  - Individual and group workspace creation no longer wait for background invalidation before resolving

### Bundle Budgets

- Status: PASS
- root app chunk: `217.33 kB / 275.00 kB`
- landing route chunk: `23.87 kB / 35.00 kB`
- login route chunk: `27.12 kB / 35.00 kB`
- home route chunk: `41.35 kB / 50.00 kB`
- workspace route chunk: `108.55 kB / 265.00 kB`
- group workspace route chunk: `76.12 kB / 225.00 kB`
- shared UI vendor chunk: `114.65 kB / 125.00 kB`
- vi public locale payload: `17.86 kB / 24.00 kB`
- en public locale payload: `15.19 kB / 24.00 kB`
- vi auth locale payload: `22.16 kB / 25.00 kB`
- en auth locale payload: `18.79 kB / 25.00 kB`
- vi home locale payload: `34.63 kB / 40.00 kB`
- en home locale payload: `29.54 kB / 40.00 kB`
- vi workspace locale payload: `95.75 kB / 105.00 kB`
- en workspace locale payload: `85.69 kB / 105.00 kB`
- vi group locale payload: `122.91 kB / 130.00 kB`
- en group locale payload: `110.40 kB / 130.00 kB`
- vi admin locale payload: `70.70 kB / 80.00 kB`
- en admin locale payload: `62.15 kB / 80.00 kB`

## Browser Timing

- Status: PARTIAL
- Artifact: `src/test/manual/performance-first-load-browser-timing.json`
- Measurement mode: production preview build with `VITE_LAUNCH_MODE=false`
- Reason for that build flag: production builds otherwise enable launch mode and redirect public routes to `LaunchingPage` until April 17, 2026
- Auth and create-flow API timing used mocked responses because the local backend at `http://localhost:8080` was not stable on April 9, 2026 during verification

### Browser Timing Results

| Test case | Status | Evidence |
| --- | --- | --- |
| `PERF_WEB_01` | Pass | `/` route ready in `1054 ms`; landing chunk passed |
| `PERF_AUTH_01` | Pass | `/login` route ready in `901 ms`; login chunk passed |
| `PERF_AUTH_02` | Fail | feedback `334 ms` > `150 ms`; FE transition `1359 ms` > `1200 ms`; mocked API `252 ms` |
| `PERF_WS_01` | Fail | feedback `34 ms` passed; FE transition `1406 ms` > `1200 ms`; mocked API `273 ms` |
| `PERF_GRP_01` | Pass | feedback `91 ms`; FE transition `676 ms`; mocked API `337 ms`; group chunk passed |

## Findings

### Fixed in this session

- `GroupWorkspacePage` no longer ships as a single heavy first-load chunk; leader-only tabs, dialogs, challenge area, and chat panel now load on demand.
- `vi` and `en` locale payloads are split by route namespace and loaded only when the route needs them.
- Group workspace first-create flow now meets both the chunk budget and the FE transition timing target in the browser harness.

### Still missing the acceptance threshold

- `PERF_AUTH_02` still misses both `feedback_start` and `fe_transition_duration`.
- `PERF_WS_01` still misses `fe_transition_duration` even though its immediate feedback is now fast.

## Repair Plan

### Plan A: Reduce Login to Home first-use delay

1. Start `preloadHomePage()` and home namespace preload while the login page is idle or as soon as the user starts typing, instead of waiting for a successful login response.
2. Keep the submit button in an explicit pending state immediately on click and preserve that state through the navigation handoff.
3. Audit the first Home render after login and push non-shell work such as subscription, feedback, and other secondary queries behind idle or deferred loading if they still compete with the first paint.

### Plan B: Reduce first individual workspace transition delay

1. Preload `IndividualWorkspaceProfileConfigDialog` and `WorkspaceOnboardingUpdateGuardDialog` together with the workspace route before the create action resolves.
2. Revisit the first render of `WorkspacePage` so header plus onboarding dialog can appear before heavier side-panel work finishes.
3. Re-run the browser timing harness and keep tuning until `fe_transition_duration <= 1200 ms`.

### Plan C: Finish real API acceptance

1. Restore the local backend on `http://localhost:8080`.
2. Re-run the same Playwright harness without mocked auth/create endpoints.
3. Compare real `api_duration` against the current mocked-FE timings so any remaining misses are clearly separated into backend vs frontend causes.

## Notes

- The reusable browser harness now lives at `scripts/manual-first-use-timing.spec.js`.
- The browser artifact in this report is valid for frontend transition regression checking, but it is not yet the final real-backend acceptance artifact because the local API was unavailable during this run.
