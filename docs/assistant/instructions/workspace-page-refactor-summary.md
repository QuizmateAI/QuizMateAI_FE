# Workspace Page Refactor Summary

## Muc dich

Tom tat dot refactor va bug-fix da thuc hien cho `WorkspacePage` va cac file lien quan trong workspace ca nhan.

## Pham vi chinh

- Rut gon `src/Pages/Users/Individual/Workspace/WorkspacePage.jsx`
- Giam duplicate render va prop drift giua cac layout
- Tach logic lon ra utility va custom hook
- Don legacy state, debug log, va code khong con duoc su dung
- Giu external behavior o muc an toan, uu tien khong pha flow dang chay

## Phase 1

- Gom props chung cua `ChatPanel`, `SourcesPanel`, `RoadmapJourPanel`, `StudioPanel` vao mot noi de 2 layout dung cung config.
- Tach helper render panel de giam copy-paste JSX trong `WorkspacePage.jsx`.
- Loai bo phan resize dang do:
  - `handleStartResize`
  - `isResizingPanels`
  - `getChatMinWidth`
- Doi center panel desktop sang dung truc tiep `CHAT_PANEL_MIN_WIDTH`.
- Muc tieu cua phase nay la on dinh layout truoc khi tach logic.

## Phase 2

- Tach logic route/view mapping ra `src/Pages/Users/Individual/Workspace/utils/viewRouting.js`.
- Tach flow mock-test generation va profile-related generation state ra `src/Pages/Users/Individual/Workspace/hooks/useWorkspaceMockTestGeneration.js`.
- Giam bot khoi luong state/effect trong `WorkspacePage.jsx`, giu page o vai tro compose UI + noi hook.
- Chinh lai cac loi lint do cac ham/props cu khong con dong bo sau refactor.

## Phase 3

- Tach roadmap domain ra `src/Pages/Users/Individual/Workspace/hooks/useWorkspaceRoadmapManager.js`.
- Hook moi gom:
  - roadmap generation runtime
  - phase dialog state
  - phase knowledge generation
  - knowledge quiz generation
  - pre-learning generation
  - websocket progress handling
  - active task recovery / fallback
  - roadmap reload token
- `WorkspacePage.jsx` chi con noi hook vao UI thay vi om toan bo roadmap workflow trong cung 1 file.

## Phase 4

- Xoa legacy state chac chan khong con gia tri trong `WorkspacePage.jsx`:
  - `createdItems`
  - `roadmapEnabledState`
- Xoa cac `console.log` debug cho roadmap gate trong `WorkspacePage.jsx`.
- Noi toi thieu cho flow `postLearning` de giu feature thay vi xoa bo:
  - them tracking trong `handleStudioAction`
  - them `handleViewPostLearning`
  - them `handleCreatePostLearning`
  - mo rong `handleBackFromForm` de quay lai list `postLearning`
- Don `ChatPanel.jsx`:
  - bo prop `createdItems`
  - xoa duplicate render branch khong can thiet
  - giu lai mot `renderContent` duy nhat
  - giu route `postLearning` va `createPostLearning`
- Xoa state runtime khong duoc read trong roadmap hook:
  - `isGeneratingRoadmapStructure`

## Bug fix bo sung

- Sua loi `no-undef` trong `src/Pages/Users/Group/Components/CreateQuizFormParts/AIQuizTab.jsx`.
- Bo sung helper `getQuestionTypeLabel` de file nay lint/build sach loi.

## File tao moi

- `src/Pages/Users/Individual/Workspace/hooks/useWorkspaceMockTestGeneration.js`
- `src/Pages/Users/Individual/Workspace/hooks/useWorkspaceRoadmapManager.js`
- `src/Pages/Users/Individual/Workspace/utils/viewRouting.js`
- `src/test/workspace/viewRouting.test.js`
- `src/test/workspace/ChatPanel.test.jsx`
- `docs/assistant/instructions/workspace-page-refactor-summary.md`

## File cap nhat chinh

- `src/Pages/Users/Individual/Workspace/WorkspacePage.jsx`
- `src/Pages/Users/Individual/Workspace/Components/ChatPanel.jsx`
- `src/Pages/Users/Group/Components/CreateQuizFormParts/AIQuizTab.jsx`

## Ket qua chinh

- `WorkspacePage.jsx` ngan hon rat nhieu va de doc hon.
- Logic phan theo domain ro hon:
  - routing utility
  - mock-test hook
  - roadmap manager hook
- Khong con loi lint do cac bien resize bi mat dinh nghia.
- `ChatPanel` khong con bi duplicate render flow.
- Flow `postLearning` khong bi xoa, da duoc giu lai o muc ket noi an toan.

## Test case da them

- `src/test/workspace/viewRouting.test.js`
  - map `post-learning` -> `postLearning`
  - map `post-learning/create` -> `createPostLearning`
  - resolve deep link roadmap quiz detail voi `roadmapId` va `phaseId`
  - resolve deep link roadmap quiz edit voi `roadmapId` va `phaseId`
  - build lai path cho `quizDetail`, `editQuiz`, `postLearning`, `createPostLearning`
- `src/test/workspace/ChatPanel.test.jsx`
  - xac nhan `ChatPanel` truyen dung prop refactor sang `RoadmapCanvasView`
  - xac nhan flow list `postLearning` van noi dung `create` va `view`
  - xac nhan flow `createPostLearning` van noi dung `submit` va `back`

## Verify da chay

- `npm exec eslint -- "src/Pages/Users/Individual/Workspace/WorkspacePage.jsx" "src/Pages/Users/Individual/Workspace/Components/ChatPanel.jsx" "src/Pages/Users/Individual/Workspace/hooks/useWorkspaceRoadmapManager.js" -f json`
- `npm exec eslint -- "src/Pages/Users/Individual/Workspace/WorkspacePage.jsx" "src/Pages/Users/Group/Components/CreateQuizFormParts/AIQuizTab.jsx" -f json`
- `npm exec eslint -- "src/test/workspace/viewRouting.test.js" "src/test/workspace/ChatPanel.test.jsx" -f json`
- `npm exec vitest run src/test/workspace/viewRouting.test.js src/test/workspace/ChatPanel.test.jsx`
- `npm run build`

## Ket qua test gan nhat

- 2 test files pass
- 8 test cases pass
- Khong co lint error o 2 file test moi

## Phan co y chua xoa

- `postLearning` duoc giu lai vi day la feature co component that, khong phai code chet hoan toan.
- `src/Pages/Users/Individual/Workspace/Components/RoadmapListView.jsx` van con dau vet legacy `createdItems`, nhung file nay hien khong duoc `WorkspacePage` dung truc tiep.
- Neu muon don tiep, can audit rieng cac component workspace khong con duoc reference truoc khi xoa.

## Ghi chu cho lan sau

- Neu tiep tuc refactor, uu tien cao nhat la audit cac component workspace cu khong con duoc reference.
- Neu dong vao `postLearning` sau nay, nen quyet dinh ro:
  - giu no nhu list/detail quiz theo `PHASE`
  - hay tao flow detail rieng thay vi dung chung quiz detail

## Cap nhat 2026-04-09

- Personal workspace da duoc doi shell hoan toan:
  - bo layout 3 cot co dinh
  - them `PersonalWorkspaceSidebar`
  - them `PersonalWorkspaceTopbar`
  - route goc `/workspaces/:workspaceId` hien thi `overview`
  - `sources` tro thanh mot workspace view rieng
- Roadmap personal workspace da doi sang mot surface duy nhat:
  - `RoadmapCanvasView.jsx` duoc viet lai thanh fishbone roadmap dark immersive
  - bo hoan toan personal `canvasView`
  - bo localStorage state cho `roadmapCanvasView`
- Legacy personal files da xoa:
  - `WorkspaceHeader.jsx`
  - `StudioPanel.jsx`
  - `RoadmapCanvasView2.jsx`
  - `RoadmapJourPanel.jsx`
  - `RoadmapListView.jsx`
  - `RoadmapPhaseGenerateDialog.jsx`
- Test shell moi da duoc thay:
  - `WorkspacePage.test.jsx`
  - `ChatPanel.test.jsx`
  - `RoadmapCanvasView.test.jsx`
  - `SourcesPanel.test.jsx`
  - `viewRouting.test.js`
  - them `PersonalWorkspaceTopbar.test.jsx`
- Locale `workspace.json` cho `en` va `vi` da duoc bo sung namespace `workspace.shell` de support shell moi.
