# Session Summary

## Request

Doc `QuizMateAI_FE/docs` truoc khi lam viec, sau do sua form tao quiz cua ca Group va Individual de co nut `Chon tat ca` cho cac muc chon theo danh sach checkbox.

## Scope

- Feature hoac khu vuc tac dong:
  - Shared create quiz AI form duoc dung boi ca Individual workspace va Group workspace.
- Trong pham vi:
  - Them bulk action cho danh sach tai lieu.
  - Them bulk action cho danh sach question types va bloom skills trong AI config.
  - Dam bao Group wrapper van di qua shared base form.
- Ngoai pham vi:
  - Khong refactor file `AIQuizTab.jsx` cua Group vi hien tai khong duoc mount.
  - Khong sua cac loi build/lint san co o khu vuc Roadmap khong lien quan den task.

## Files changed

- `src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/CreateQuizFormContainer.jsx`
- `src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/CreateQuizAiFormContent.jsx`
- `src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/useCreateQuizAiForm.js`
- `docs/assistant/sessions/2026-04-12__quiz-create-form-select-all-actions.md`

## Summary of changes

- Them `handleToggleAllMaterialSelection` o shared container de thao tac chon bo toan bo tai lieu thong qua callback selection tu parent.
- Truyen dung `workspaceMaterialsEmptyMessage` xuong UI shared form de Group wrapper van hien thi empty state rieng.
- Them bulk handlers trong `useCreateQuizAiForm` cho:
  - `handleSelectAllQuestionTypes`
  - `handleClearAllQuestionTypes`
  - `handleSelectAllBloomSkills`
  - `handleClearAllBloomSkills`
- Cap nhat `CreateQuizAiFormContent` de hien nut `Chon tat ca` / `Bo chon` cho:
  - Source materials
  - Question types
  - Bloom skills
- Group create quiz form khong can sua rieng vi dang wrap shared base form cua Individual, nen thay doi tren shared base ap dung cho ca hai flow.

## Verification

- Lenh da chay:
  - `npx eslint ...CreateQuizFormContainer.jsx ...CreateQuizAiFormContent.jsx ...useCreateQuizAiForm.js ...Group/Components/CreateQuizForm.jsx`
  - `npm run build`
- Test da chay:
  - ESLint scoped cho cac file lien quan: pass.
- Chua verify duoc:
  - Build toan FE hien dang fail vi loi san co ngoai pham vi task:
    - `src/Pages/Users/Group/Components/RoadmapJourPanel.jsx`
    - `src/Pages/Users/Individual/Workspace/Components/RoadmapJourPanel.jsx`
    - `src/Pages/Users/Group/Components/RoadmapCanvasViewStage.jsx`

## Risks or follow-ups

- Neu `AIQuizTab.jsx` cua Group duoc mang quay lai su dung trong tuong lai, bulk actions vua them trong shared form se chua tu dong co mat o file legacy do.
- Nen smoke test UI nhanh tren ca Group va Individual de xac nhan nut bulk action dong bo dung voi selection state tu Sources panel.
