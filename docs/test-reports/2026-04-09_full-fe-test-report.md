# Full FE Test Report - 2026-04-09

## Scope
- Project: `QuizMateAI_FE`
- Run type: full frontend test suite
- Purpose: separate consolidated report for all FE tests (independent from targeted workspace report)

## Commands Executed
```bash
npm run test
npm run test -- --reporter=json --outputFile=./test-results-full.json
```

## Overall Result
- Status: Failed (red)
- Test Suites: 82 total, 78 passed, 4 failed
- Test Cases: 144 total, 141 passed, 3 failed
- JSON artifact: `test-results-full.json`

## Failed Test Cases
1. File: `src/test/group/ChatPanel.test.jsx`
   - Test: `Group ChatPanel > passes roadmap reload token into the roadmap canvas view`
   - Failure: could not find `[data-testid="group-roadmap-canvas-view"]` in rendered output.

2. File: `src/test/quiz/QuizResultPage.test.jsx`
   - Test: `QuizResultPage > renders only concise recommendation results when the assessment is ready`
   - Failure: expected `Task response` not to be present, but element was found.

3. File: `src/test/quiz/QuizResultPage.test.jsx`
   - Test: `QuizResultPage > shows a clear fallback when no assessment is available yet`
   - Failure: could not find text `/Chưa có đánh giá AI cho lượt làm này/i`.

## Additional Runtime Note
- During command output, a non-test error line was printed:
  - `src/Pages/Authentication/Login.js:64:8  error  Irregular whitespace not allowed  no-irregular-whitespace`
- Despite this message, Vitest still produced full JSON test results above.

## Comparison With Targeted Workspace Batch
- Targeted workspace batch remains green from prior run:
  - 5 files passed
  - 13 tests passed
- Current red status belongs to broader FE suite outside the new workspace test additions.

## Status
- Full FE suite is currently not fully passing.
- Main blockers are concentrated in:
  - `src/test/group/ChatPanel.test.jsx`
  - `src/test/quiz/QuizResultPage.test.jsx`
