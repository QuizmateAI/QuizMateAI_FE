# Session Summary

## Request

Sua danh sach chon tai lieu trong cac form tao de an tai lieu bi `warn` hoac `rejected`, chi cho phep nguoi dung thay va chon tai lieu da duoc duyet.

## Scope

- Feature hoac khu vuc tac dong:
  - Shared material picker logic duoc dung boi cac form tao trong Individual workspace.
  - Group wrappers va cac form Group dang fetch tai lieu rieng.
  - Dialog tao roadmap phase cua ca Individual va Group.
- Trong pham vi:
  - Chi hien thi tai lieu co status `ACTIVE` trong cac picker tao noi dung.
  - Loai bo id tai lieu khong hop le khoi selection hieu luc luc render, dem so luong va submit.
  - Dong bo hanh vi giua Group va Individual.
- Ngoai pham vi:
  - Khong doi business rule upload/moderation status.
  - Khong sua cac man hinh danh sach tai lieu tong quan ngoai create flows.

## Files changed

- `src/Pages/Users/Individual/Workspace/Components/useWorkspaceMaterialSelection.js`
- `src/Pages/Users/Group/Components/CreateQuizForm.jsx`
- `src/Pages/Users/Group/Components/CreateFlashcardForm.jsx`
- `src/Pages/Users/Group/Components/CreateGroupMockTestForm.jsx`
- `src/Pages/Users/Individual/Workspace/Components/RoadmapPhaseGenerateDialog.jsx`
- `src/Pages/Users/Group/Components/RoadmapPhaseGenerateDialog.jsx`
- `docs/assistant/sessions/2026-04-17__active-only-material-pickers.md`

## Summary of changes

- Cap nhat shared hook `useWorkspaceMaterialSelection` de chi normalize va tra ve material `ACTIVE`.
- Filter `selectedSourceIds` theo danh sach material hop le ngay trong shared hook de submit AI quiz/mock test/post-learning khong con gui id cua tai lieu warn/rejected.
- Cap nhat Group `CreateQuizForm` va `CreateFlashcardForm` wrappers de bo qua material khong `ACTIVE` ngay tu luc unwrap response.
- Cap nhat `CreateGroupMockTestForm` de:
  - chi nap material `ACTIVE`
  - dung derived selected ids hop le cho counter, checkbox state, deselect all va payload submit
- Cap nhat hai `RoadmapPhaseGenerateDialog` de:
  - chi render danh sach material `ACTIVE`
  - khong con hien row disabled cho material warn/rejected
  - chi dem va submit cac material ids hop le

## Verification

- Lenh da chay:
  - `npm exec eslint -- "src/Pages/Users/Individual/Workspace/Components/useWorkspaceMaterialSelection.js" "src/Pages/Users/Group/Components/CreateQuizForm.jsx" "src/Pages/Users/Group/Components/CreateFlashcardForm.jsx" "src/Pages/Users/Group/Components/CreateGroupMockTestForm.jsx" "src/Pages/Users/Individual/Workspace/Components/RoadmapPhaseGenerateDialog.jsx" "src/Pages/Users/Group/Components/RoadmapPhaseGenerateDialog.jsx"`
  - `npm run build`
- Test da chay:
  - ESLint scoped cho cac file lien quan: pass.
  - Vite production build cua `QuizMateAI_FE`: pass.
- Chua verify duoc:
  - Chua smoke test tay tren UI de check empty state khi workspace chi con tai lieu warn/rejected.

## Risks or follow-ups

- Mot so empty-state text hien tai van noi theo huong "khong co tai lieu", trong khi truong hop moi co the la "khong co tai lieu da duyet". Neu can UX ro hon thi nen doi fallback copy.
- Neu co them create form moi khong dung `useWorkspaceMaterialSelection`, can giu cung rule `ACTIVE`-only de tranh lech hanh vi.
