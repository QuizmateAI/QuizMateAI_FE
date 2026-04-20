# Quiz Runtime Specifications

## QZ-01 Practice Quiz

Function Trigger:
- Route Trigger: A USER opens `/quizzes/practice/:quizId`.
- Navigation Trigger: The page is opened from a workspace, group workspace, recommendation panel, or another quiz-entry CTA.

Function Description:
- Actor: USER.
- Purpose: To let the user answer quiz questions in practice mode and receive immediate correctness feedback.
- Interface: A quiz runtime page with a quiz header, question card, question navigation panel, and practice-specific feedback state.
- Data Processing:
  - Quiz Load: Quiz detail loading for attempt initialization
  - Attempt Start: Practice-mode attempt creation
  - Question Submission: Per-question answer checking
  - Attempt Completion: Final attempt submission

Screen Layout:
- Quiz header
- Main question area
- Question navigation panel
- Immediate feedback / explanation region

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `quizId`: The quiz identifier from the route.<br>• Current question payload.<br>• Selected answer state.<br>• Practice result state for the current question.<br>• Explanation or correct-answer metadata.<br>• Attempt progress state. |
| 2 | Validation Rules | • The route must provide a valid `quizId`.<br>• Answer submission requires a valid selected answer or a supported empty-answer rule for the question type.<br>• The page must wait for quiz data to load before enabling practice actions. |
| 3 | Business Rules | • Practice mode returns correctness feedback immediately after question submission.<br>• Once a question is submitted in practice mode, the UI may lock that question state and reveal explanation content.<br>• The runtime should keep track of question progress so the user can move across the quiz.<br>• This flow is different from exam mode because correctness is shown before final completion. |
| 4 | Normal Case | • The user opens a practice quiz.<br>• The page loads the quiz and creates or resumes a practice attempt.<br>• The user answers a question.<br>• The app checks the answer and shows immediate feedback.<br>• The user continues through the remaining questions and completes the attempt. |
| 5 | Abnormal Cases | • Invalid or missing `quizId`.<br>• Quiz data fails to load.<br>• Per-question submission fails.<br>• Connectivity issues interrupt the practice flow. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:125)
- Page: [PracticeQuizPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Quiz/PracticeQuizPage.jsx)
- API Layer: [QuizAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/QuizAPI.js)

## QZ-02 Exam Quiz

Function Trigger:
- Route Trigger: A USER opens `/quizzes/exams/:quizId`.
- Navigation Trigger: The page is opened from quiz detail, challenge, mock-test, or exam-start actions.

Function Description:
- Actor: USER.
- Purpose: To let the user complete a quiz in exam mode with timer handling, autosave behavior, and deferred scoring.
- Interface: A quiz runtime page with a timed exam layout, answer-state navigation, and exam submit flow.
- Data Processing:
  - Quiz Load: Exam-ready quiz payload or in-progress attempt payload
  - Attempt Start: Exam-mode attempt creation
  - Answer Save: Autosave and manual save behavior
  - Attempt Submit: Final exam submission

Screen Layout:
- Quiz header with timer context
- Main question area
- Question navigation panel with answered-state indicators
- Submit action and confirmation flow

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `quizId`<br>• Current question payload<br>• Selected answers<br>• Current timer state<br>• Save status<br>• Submission state<br>• Unanswered-question count |
| 2 | Validation Rules | • The page requires a valid `quizId`.<br>• Save and submit actions require a valid active attempt state.<br>• Final submission may require explicit user confirmation, especially when unanswered questions remain. |
| 3 | Business Rules | • Exam mode does not reveal correctness immediately after each question.<br>• The flow supports timer strategies such as total-duration mode and per-question mode where configured.<br>• Answer changes may trigger autosave behavior.<br>• Refresh or re-entry should restore progress when the attempt is still active.<br>• The page must preserve exam integrity even during intermediate save events. |
| 4 | Normal Case | • The user opens an exam quiz.<br>• The page loads or restores the active exam attempt.<br>• The user answers questions while the timer runs.<br>• The app autosaves progress during the attempt.<br>• The user submits the exam and is redirected to the result page. |
| 5 | Abnormal Cases | • Invalid quiz route.<br>• Quiz load failure.<br>• Autosave failure.<br>• Timer expiration edge case.<br>• Final submission failure. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:126)
- Page: [ExamQuizPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Quiz/ExamQuizPage.jsx)
- Hooks: [useQuizProgress.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Quiz/hooks/useQuizProgress.js), [useQuizAutoSave.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Quiz/hooks/useQuizAutoSave.js)

## QZ-03 Quiz Result

Function Trigger:
- Route Trigger: A USER opens `/quizzes/results/:attemptId`.
- Redirect Trigger: The app navigates here after a completed practice or exam submission.

Function Description:
- Actor: USER.
- Purpose: To show final attempt results, enable answer review, and connect the user back to the originating learning flow.
- Interface: A result page with summary metrics, review content, and next-step actions.
- Data Processing:
  - Result Fetch: Attempt result lookup
  - Quiz Review Fetch: Full quiz data for review mode
  - Follow-up Support: Assessment or next-step generation flows where available

Screen Layout:
- Result summary hero
- Score and metrics section
- Question review section
- Follow-up CTA section

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `attemptId`: Route identifier for the completed attempt.<br>• Final score.<br>• Accuracy metrics.<br>• Time spent.<br>• Question review data.<br>• Origin context used for back navigation. |
| 2 | Validation Rules | • The page requires a valid `attemptId`.<br>• Review content should only be shown after the result payload is available.<br>• If result resolution is delayed, the page must handle loading and retry states safely. |
| 3 | Business Rules | • The page should support stable back navigation into the originating workspace, group workspace, or challenge flow.<br>• Result context may be persisted on the client to improve navigation continuity.<br>• The result page is both a summary screen and a transition point into the next learning action. |
| 4 | Normal Case | • The user completes a quiz attempt.<br>• The app redirects to the result page.<br>• The page loads the final result and review content.<br>• The user reviews the outcome and either returns to the source flow or follows a recommended next action. |
| 5 | Abnormal Cases | • Invalid `attemptId`.<br>• Result data is temporarily unavailable.<br>• Review content fails to load.<br>• Follow-up generation or assessment logic fails. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:127)
- Page: [QuizResultPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Quiz/QuizResultPage.jsx)
