# Session Summary — 2026-04-19

## Request

Implement phần FE cho tính năng "Tạo quiz thủ công & chỉnh sửa quiz" theo plan `Planning/plan-manual-quiz-and-edit.md`. BE chưa sẵn sàng nên dùng mock data. Chia phase và đảm bảo build pass.

## Scope

- Feature: Manual quiz creation + Edit/duplicate flow (scope workspace cá nhân)
- Trong phạm vi: FE web, mock API, QuizDetailView Edit button, ManualQuizWizard toàn bộ
- Ngoài phạm vi: Mobile, BE implementation, trang kết quả ẩn AI panel, CTA community share

## Files changed

- `src/api/QuizAPI.js` — thêm 4 mock exports: `duplicateQuiz`, `createManualQuizBulk`, `getWorkspaceQuestionsCatalog`, `importQuestionsToQuiz`
- `src/Pages/Users/Individual/Workspace/Components/resolveEditRule.js` — utility mới
- `src/Pages/Users/Individual/Workspace/Components/ConfirmDuplicateDialog.jsx` — component mới
- `src/Pages/Users/Individual/Workspace/Components/QuizDetailView.jsx` — thêm Edit button, `isCreator`, `canViewAnswers` update, `ConfirmDuplicateDialog`
- `src/Pages/Users/Individual/Workspace/Components/ManualQuizWizard/index.jsx` — wizard container
- `src/Pages/Users/Individual/Workspace/Components/ManualQuizWizard/Step1Config.jsx`
- `src/Pages/Users/Individual/Workspace/Components/ManualQuizWizard/Step2Questions.jsx`
- `src/Pages/Users/Individual/Workspace/Components/ManualQuizWizard/QuestionCard.jsx`
- `src/Pages/Users/Individual/Workspace/Components/ManualQuizWizard/AnswerEditor.jsx`
- `src/Pages/Users/Individual/Workspace/Components/ManualQuizWizard/QuestionNav.jsx`
- `src/Pages/Users/Individual/Workspace/Components/ManualQuizWizard/ImportQuestionsPanel.jsx`
- `src/Pages/Users/Individual/Workspace/Components/ManualQuizWizard/useQuestionTimeBalancer.js`
- `src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/CreateQuizFormContainer.jsx` — thêm tab AI / Thủ công
- `src/Pages/Users/Individual/Workspace/Components/useWorkspaceMaterialSelection.js` — fix 2 typo pre-existing (`ndew Set`, `async ("Ngọc ăn cứt")`)

## Summary of changes

- **API mocks**: 4 hàm trả dummy data với setTimeout để FE render được trước khi BE xong. Comment `// TODO: replace mock` để swap sau.
- **resolveEditRule**: pure function trả `EDIT_IN_PLACE | REQUIRES_DUPLICATE | LOCKED_UNTIL_FIRST_ATTEMPT` theo matrix createVia × hasHistoryCompleted.
- **QuizDetailView**: nút "Chỉnh sửa" hiện chỉ với creator, disabled + tooltip khi AI quiz chưa attempt, trigger duplicate dialog khi cần.
- **canViewAnswers**: thêm nhánh `isCreator` — creator luôn thấy đáp án quiz mình tạo (plan 3.4).
- **ManualQuizWizard**: 2-step flow; Step1 config + scaffold; Step2 layout 2 cột (nav trái + cards phải); autosave localStorage draft; build payload + submit.
- **AnswerEditor**: 6 loại câu hỏi (MCQ, MS, TF, SA, FB, Matching) mỗi loại UI riêng.
- **QuestionNav**: filter all/chưa xong/lỗi, jump-to form, thêm câu, nhập từ quiz khác.
- **ImportQuestionsPanel**: dialog catalog câu từ workspace (mock), checkbox multi-select, filter type/difficulty/search.
- **useQuestionTimeBalancer**: toggleLock, setDuration, rebalanceToDefault, distributeEvenly với min 5s guard.
- **Tab AI/Manual**: CreateQuizFormContainer thêm tab bar, lưu mode vào localStorage.

## Verification

- Lệnh đã chạy: `npm run lint`, `npm run build`
- Kết quả: build ✓ (56s). 4 lint errors còn lại đều pre-existing (Eye unused trong 2 ChatPanel, tickAnimation order trong useProgressTracking).
- Chưa verify: render thực tế trên browser (BE mock chưa tích hợp router state sau submit).

## Risks or follow-ups

- `quiz.creatorId` cần BE trả về trong QuizResponse — khi thiếu, `isCreator` luôn false → Edit button không hiện.
- Swap mock: tìm `// TODO: replace mock` trong `QuizAPI.js` khi BE sẵn sàng.
- Phase còn lại: ẩn CTA community share cho manual quiz (plan 5.9), trang kết quả im lặng (plan 5.8), Mobile Sprint 3.
- UI layout cần cải thiện: header quá nhiều layer (step indicator + tab + sub-header), side nav chiếm không gian trên màn nhỏ → xem xét sticky bar hoặc collapsible nav.

---

## Continuation — 2026-04-19 (session 2)

### Requests

1. Nối API thật (đọc BE commit `5b78d28 update: manual quiz flow`).
2. Form tạo quiz quá trống hai bên — fill vừa container.
3. Nhiều cải tiến Step2: card gọn hơn, bubble bar dùng được drag + arrow, filter popover bị che, auto-lock khi chỉnh giờ, bỏ difficulty/bloom per-question, Step1 chỉ nhập tổng thời gian.

### Files changed

| File | Thay đổi |
|---|---|
| `src/api/QuizAPI.js` | Thay 4 mock bằng real API calls (`api.post`/`api.get`) |
| `ManualQuizWizard/Step1Config.jsx` | Bỏ `perQuestionSeconds` field; chỉ còn `duration` (tổng phút); hint text preview giây/câu; bỏ `max-w-lg mx-auto` |
| `ManualQuizWizard/index.jsx` | Bỏ `perQuestionSeconds` khỏi DEFAULT_CONFIG; `buildScaffoldQuestions` tính `perQ = duration×60/count`; payload set `difficulty: null`, `bloomId: null` |
| `ManualQuizWizard/Step2Questions.jsx` | Truyền `totalBudgetSeconds` vào balancer; `handleDistributeEvenly` dùng `totalBudgetSeconds`; `addQuestion` tính duration từ budget; bỏ `max-w-3xl mx-auto` |
| `ManualQuizWizard/useQuestionTimeBalancer.js` | `setDuration` giờ auto-lock câu vừa sửa + rebalance unlocked còn lại; nếu tất cả khác đã lock → `window.confirm` trước khi đổi tổng |
| `ManualQuizWizard/QuestionCard.jsx` | Bỏ select Độ khó + Bloom; compact (`p-3`, `space-y-3`, textarea rows 2/1); score + duration/lock gộp vào header row |
| `ManualQuizWizard/StickyQuestionBar.jsx` | Thêm nút `←`/`→` cuộn bubble; drag-to-scroll (mousedown/move/up); filter popover đổi `bottom-full` → `top-full` để không bị cắt |

### Key decisions

- **Real API endpoints**: `POST /quiz/manual:create-bulk`, `GET /quiz/workspace/{id}/questions-catalog` (param `excludeQuizId`), `POST /quiz/{id}/questions:import`, `POST /quiz/{id}/duplicate`.
- **Bỏ per-question difficulty/bloom**: manual quiz không cần granular taxonomy; BE nhận `null`, phân loại sau hoặc bỏ qua.
- **Auto-lock logic**: khi user nhập thủ công → lock câu đó → rebalance unlocked → nếu không còn unlocked thì confirm đổi tổng. Không dùng confirm khi vẫn còn câu unlocked để hệ thống tự xử lý.
- **Total time only in Step1**: timerMode vẫn có 2 chế độ (toàn bài / từng câu) nhưng cả hai đều chỉ config `duration` phút. Khi timerMode=false, hệ thống chia đều khi tạo scaffold; user tùy chỉnh ở Step2.

### Remaining

- Phase plan còn lại: ẩn community share CTA cho manual quiz (plan 5.9), trang kết quả ẩn AI panel (plan 5.8), Mobile Sprint 3.
- Cần test thực tế trên browser với BE thật.
