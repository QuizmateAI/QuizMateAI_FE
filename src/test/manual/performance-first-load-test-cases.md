# First Load Performance Test Cases

## Goal

Create a repeatable baseline for first-use perceived performance across public entry, auth, and first workspace creation flows.

## Recommended Environment

- Chrome latest, incognito window
- Browser cache disabled while recording cold-start runs
- CPU throttling: 4x slowdown for local FE regression
- Network: no throttling for local dev, optional Fast 3G for deployed benchmark comparison
- Capture one cold run and one warm run for each case

## Measurement Rules

- `feedback_start`: first visible spinner, toast, skeleton, or transition state after the action starts
- `route_ready`: destination page heading, primary CTA, or primary shell stays visible for at least 500 ms
- `api_duration`: request start to response received
- `fe_transition_duration`: response received to `route_ready`

Keep API time and FE transition time separate so slow backend responses do not hide frontend regressions.

## Automated Coverage In Repo

- Route chunk budgets: `scripts/check-bundle-budget.mjs`
- FE performance invariants: `src/test/performance/`
- Auth regression linkage: `src/test/auth/useLogin.test.jsx`

## Test Cases

### PERF_WEB_01

- Flow: first visit to `/`
- Type: cold-start route performance
- Preconditions: logged out, cache cleared
- Steps:
1. Open the site root in a fresh incognito window.
2. Start recording before navigation.
3. Stop recording after the landing hero and primary CTA are stable.
- Measure:
  - landing route chunk size
  - `feedback_start` if a loading fallback appears
  - `route_ready`
- Pass criteria:
  - Landing route chunk <= 35 kB
  - No blank loading state longer than 400 ms
  - Landing hero visible within 1.2 s on local baseline

### PERF_AUTH_01

- Flow: first visit to `/login`
- Type: cold-start auth route performance
- Preconditions: logged out, cache cleared
- Steps:
1. Open `/login` directly in a fresh incognito window.
2. Record until the login form is interactive.
- Measure:
  - login route chunk size
  - `route_ready`
- Pass criteria:
  - Login route chunk <= 35 kB
  - Username and password inputs visible within 1.2 s on local baseline

### PERF_AUTH_02

- Flow: first successful login after account creation
- Type: auth-to-home transition performance
- Preconditions: new account already registered and ready to log in
- Steps:
1. Open `/login`.
2. Enter valid credentials.
3. Submit login.
4. Stop recording when the Home shell is stable.
- Measure:
  - `feedback_start`
  - `api_duration`
  - `fe_transition_duration`
  - home route chunk size
- Pass criteria:
  - Visible feedback within 150 ms after submit
  - Home route chunk <= 50 kB
  - `fe_transition_duration` <= 1.2 s after login response
  - Home first view does not require group data before showing the workspace tab shell

### PERF_WS_01

- Flow: create first individual workspace from Home
- Type: first-create navigation performance
- Preconditions: logged in as USER, on `/home`, workspace tab active
- Steps:
1. Click `Create workspace`.
2. Stop recording when the individual workspace shell and profile-setup entry point are visible.
- Measure:
  - `feedback_start`
  - `api_duration`
  - `fe_transition_duration`
  - workspace route chunk size
- Pass criteria:
  - Visible feedback within 150 ms
  - Workspace route chunk <= 265 kB
  - `fe_transition_duration` <= 1.2 s after create response
  - Navigation is not blocked by background list refetch

### PERF_GRP_01

- Flow: create first group workspace from Home
- Type: first-create navigation performance
- Preconditions: logged in as USER, on `/home?tab=group`
- Steps:
1. Click `Create group`.
2. Stop recording when the group workspace shell is visible and stable.
- Measure:
  - `feedback_start`
  - `api_duration`
  - `fe_transition_duration`
  - group workspace route chunk size
- Pass criteria:
  - Visible feedback within 150 ms
  - Group workspace route chunk <= 225 kB
  - `fe_transition_duration` <= 1.5 s after create response
  - Navigation is not blocked by background list refetch

## Notes

- Browser timing for these cases should be saved in a separate execution report.
- If a route chunk passes but the browser timing still fails, inspect eager data fetches, locale payload size, and heavy child mounts.
