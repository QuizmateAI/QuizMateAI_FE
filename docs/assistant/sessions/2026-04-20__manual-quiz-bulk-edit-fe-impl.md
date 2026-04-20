# Session Summary - 2026-04-20

## Request

Implement FE bulk edit quiz thủ công theo plan `plan-manual-quiz-bulk-edit.md`: edit mode, clone mode, EditChoiceDialog, QuizMetadataEditModal, routing, và fix nút "Chỉnh sửa" / "Làm quiz" không hiển thị.

## Scope

- Feature: Manual quiz create / edit / clone flow
- Trong phạm vi: FE routing, wizard edit/clone mode, dialog REQUIRES_DUPLICATE, metadata edit modal, isCreator fix, quiz status ACTIVE
- Ngoài phạm vi: BE endpoint `PUT /quiz/{id}/manual:update-bulk` (chưa có), mobile

## Architecture

### Pattern: Full-state replace

FE gửi toàn bộ state của quiz (config + tất cả question + answer kèm optional ID). BE nhận → diff → add/update/delete trong 1 transaction.

- `questionId` **có** → UPDATE
- `questionId` **null** → INSERT
- `questionId` **có trong DB nhưng không có trong request** → DELETE (xử lý ở BE)

### 3 chế độ của ManualQuizWizard

| Prop | Chế độ | Submit |
|---|---|---|
| (default) | Create | `createManualQuizBulk` → `onCreateQuiz` |
| `editingQuizId` | Edit in-place | `updateManualQuizBulk` → `onSaveQuiz` |
| `cloneFromQuizId` | Clone as new | `createManualQuizBulk` (no IDs) → `onCreateQuiz` |

### Routing flow

```
QuizDetailView
  ├─ EDIT_IN_PLACE (manual, no attempts)
  │    → onEdit(quiz) → WorkspacePage.handleEditQuiz → activeView="editQuiz"
  │    → ChatPanel: ManualQuizWizard(editingQuizId)
  │
  ├─ REQUIRES_DUPLICATE (manual, has attempts)
  │    → EditChoiceDialog
  │    ├─ Option A: "Cập nhật thông tin cơ bản" → QuizMetadataEditModal → PUT /quiz/{id}
  │    └─ Option B: "Tạo bản sao" → duplicateQuiz → onEdit(newQuiz) → ManualQuizWizard(editingQuizId)
  │
  ├─ REQUIRES_DUPLICATE (AI quiz)
  │    → ConfirmDuplicateDialog (cũ, 1 option)
  │
  └─ "Tạo tương tự" button (manual only)
       → onCreateSimilar(quiz) → WorkspacePage.handleCreateSimilarQuiz
       → selectedQuiz._editMode = "clone", activeView="editQuiz"
       → ChatPanel: ManualQuizWizard(cloneFromQuizId)
```

## Files Changed

### Mới tạo

- `src/api/QuizAPI.js`
  - thêm `updateManualQuizBulk(quizId, payload)` → `PUT /quiz/{quizId}/manual:update-bulk`

- `ManualQuizWizard/wizardHelpers.js`
  - `mapQuizToWizardState(quizFull, questionTypes)` — map BE response → wizard state, giữ IDs (`_questionId`, `_sectionId`, `_answerId`)
  - `mapQuizToNewWizardState(quizFull, questionTypes)` — clone: strip toàn bộ IDs

- `Components/EditChoiceDialog.jsx`
  - Dialog 2 lựa chọn cho REQUIRES_DUPLICATE manual quiz
  - Option A: metadata-only (gọi `onEditMetadata`)
  - Option B: duplicate + edit toàn bộ (gọi `onDuplicate`, async với loading)

- `Components/QuizMetadataEditModal.jsx`
  - Modal 4 field: title, description, timerMode, duration
  - Tự gọi `updateQuiz(quizId, payload)` → `onSaved(updatedFields)` → parent cập nhật `quizMeta`

### Sửa đổi

- `ManualQuizWizard/index.jsx`
  - Props mới: `editingQuizId`, `cloneFromQuizId`, `onSaveQuiz`
  - Loading state khi load quiz từ API (`initialLoading`)
  - Load quiz + questionTypes song song (`Promise.all`)
  - `buildUpdatePayload(config, questions, sectionId, questionTypes)` — kèm IDs cho update-bulk
  - `buildAnswerPayload(q, a)` — helper kèm `answerId` nếu có
  - Submit: nếu `editingQuizId` → `updateManualQuizBulk` → `onSaveQuiz`; else → `createManualQuizBulk` → `onCreateQuiz`
  - Edit/clone mode banner UI
  - Draft autosave chỉ chạy trong create mode (không chạy khi edit/clone)
  - `status: "ACTIVE"` thêm vào `buildPayload` (create mode) → quiz tạo ra là ACTIVE ngay

- `Components/QuizDetailView.jsx`
  - Import `EditChoiceDialog`, `QuizMetadataEditModal`, `Copy` icon
  - Prop mới: `onCreateSimilar`
  - State mới: `metadataEditOpen`
  - `isManualQuiz` computed từ `effectiveQuiz.createVia`
  - `handleMetadataSaved(updatedFields)` → update `quizMeta` local state
  - **Fix `isCreator`**: individual workspace (`_contextType === "WORKSPACE"`) → `currentUserId > 0` là đủ (BE không trả `creatorId` nhất quán; owner duy nhất có thể vào workspace cá nhân của mình)
  - Thay `ConfirmDuplicateDialog` bằng conditional: manual → `EditChoiceDialog`, AI → `ConfirmDuplicateDialog`
  - Thêm `QuizMetadataEditModal`
  - Nút "Tạo tương tự" (chỉ hiển thị khi `isManualQuiz && onCreateSimilar`)

- `Components/ChatPanel.jsx`
  - `LazyManualQuizWizard` lazy import
  - Prop mới: `onCreateSimilarQuiz` (forward xuống `LazyQuizDetailView`)
  - "editQuiz" case: kiểm tra `createVia` + `_editMode`:
    - manual + `_editMode === "clone"` → `LazyManualQuizWizard(cloneFromQuizId)`
    - manual (edit in-place hoặc sau duplicate) → `LazyManualQuizWizard(editingQuizId)`
    - AI / fallback → `LazyEditQuizForm` (không đổi)

- `WorkspacePage.jsx`
  - `handleCreateSimilarQuiz(quiz)` — set `selectedQuiz._editMode = "clone"`, `activeView = "editQuiz"`
  - Pass `onCreateSimilarQuiz: handleCreateSimilarQuiz` vào ChatPanel props

## Bugs Fixed

### Nút "Chỉnh sửa" không hiển thị

**Root cause**: `isCreator = currentUserId > 0 && Number(quiz?.creatorId || 0) === currentUserId`. BE không trả về `creatorId` trong quiz response → luôn `false`.

**Fix**: Trong individual workspace (`_contextType === "WORKSPACE"`), user duy nhất có thể xem workspace của mình là owner → dùng `currentUserId > 0` thay vì match `creatorId`.

### Nút "Làm quiz" không hiển thị

**Root cause**: `isActiveQuiz = currentStatus === "ACTIVE"`. Quiz tạo qua `createManualQuizBulk` không có `status` trong payload → BE có thể default DRAFT.

**Fix**: Thêm `status: "ACTIVE"` vào `buildPayload`.

## Verification

- `npm run build` → pass
- Build size ổn định, không regressions

## Risks / Follow-ups

- `PUT /quiz/{id}/manual:update-bulk` chưa có trên BE → edit mode FE sẽ gọi endpoint chưa tồn tại, sẽ nhận 404. FE đã sẵn sàng khi BE implement.
- Khi BE triển khai `update-bulk`, cần test:
  - Câu hỏi mới (không có `questionId`) → được INSERT
  - Câu hỏi cũ (có `questionId`) → được UPDATE
  - Câu hỏi bị xóa khỏi wizard → được DELETE
  - Matching question: pairs serialize/deserialize đúng
- `status: "ACTIVE"` trong payload: nếu BE endpoint `create-bulk` ignore trường này hoặc có behavior khác, cần recheck.
- Draft localStorage: chỉ save ở create mode. Nếu user reload trong edit mode → mất state (intentional — edit state luôn load từ API).
