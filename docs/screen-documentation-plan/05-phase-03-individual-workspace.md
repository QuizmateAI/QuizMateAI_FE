# Phase 3 - Individual Workspace

## Muc tieu phase

Doc shell workspace ca nhan theo dung thu tu: route/view mapping -> onboarding/profile -> sources -> studio views -> detail views -> analytics.

## Thu tu doc code de tranh lac

1. `src/lib/routePaths.js`
2. `src/Pages/Users/Individual/Workspace/utils/viewRouting.js`
3. `src/Pages/Users/Individual/Workspace/WorkspacePage.jsx`
4. `src/Pages/Users/Individual/Workspace/Components/PersonalWorkspaceSidebar.jsx`
5. `src/Pages/Users/Individual/Workspace/Components/ChatPanel.jsx`
6. Nhom profile/onboarding:
   - `IndividualWorkspaceProfileConfigDialog.jsx`
   - `IndividualWorkspaceProfileOverviewDialog.jsx`
   - `WorkspaceProfileWizard/*`
7. Nhom sources:
   - `SourcesPanel.jsx`
   - `SourceDetailView.jsx`
   - `UploadSourceDialog.jsx`
8. Nhom roadmap:
   - `RoadmapCanvasView*.jsx`
   - `RoadmapJourPanel.jsx`
   - `RoadmapPhaseGenerateDialog.jsx`
9. Nhom quiz/flashcard/mock-test/post-learning:
   - `QuizListView.jsx`
   - `CommunityQuizExplorerView.jsx`
   - `CreateQuizForm.jsx`
   - `QuizDetailView.jsx`
   - `EditQuizForm.jsx`
   - `FlashcardListView.jsx`
   - `CreateFlashcardForm.jsx`
   - `FlashcardDetailView.jsx`
   - `MockTestListView.jsx`
   - `CreateMockTestForm.jsx`
   - `MockTestDetailView.jsx`
   - `EditMockTestForm.jsx`
   - `PostLearningListView.jsx`
   - `CreatePostLearningForm.jsx`
10. `QuestionStatsView.jsx`
11. API wrappers:
    - `WorkspaceAPI.js`
    - `MaterialAPI.js`
    - `RoadmapAPI.js`
    - `QuizAPI.js`
    - `FlashcardAPI.js`
    - `AIAPI.js`

## Nhom screen va backlog chup

### A. Shell va onboarding

#### IND-01 Workspace Welcome / Overview

- Route goc: `/workspaces/:workspaceId`
- Can chup:
  - first entry state
  - state da co du lieu
  - mobile shell neu can
- Mo ta can neu:
  - sidebar action map
  - default active view
  - plan gate badge/disabled state tren sidebar

#### IND-02 Workspace Profile Config Dialog

- Trigger:
  - tao workspace moi
  - user chua hoan thanh onboarding
  - user muon mo lai config
- Can chup:
  - basic info step
  - roadmap config step
  - final confirmation state
- Mo ta can neu:
  - save tung buoc
  - confirm profile
  - rule khoa sua khi da co materials

#### IND-03 Workspace Profile Overview Dialog

- Trigger: open profile summary tu workspace shell
- Can chup:
  - profile da hoan thanh
  - state co/khong co roadmap
- Mo ta can neu:
  - tom tat learning goal, strengths, roadmap config, mock-test setup

### B. Sources va material detail

#### IND-04 Sources List

- Trigger: sidebar `sources`
- Can chup:
  - populated list
  - empty state
  - selected multi-item state neu co
- Mo ta can neu:
  - upload, delete, share, selection
  - progress/status badge cua tung source

#### IND-05 Source Detail

- Trigger: open 1 source tu `SourcesPanel`
- Can chup:
  - default detail state
  - moderation/analysis state neu source co du lieu moderation
- Mo ta can neu:
  - summary, metadata, moderation details, approve/reject neu co

#### IND-06 Upload Source Dialog

- Trigger: add source
- Can chup:
  - default dialog
  - uploading state
  - unsupported file / API fail
- Mo ta can neu:
  - accepted formats
  - progress update
  - sau upload refresh list the nao

### C. Roadmap

#### IND-07 Roadmap Canvas

- Trigger: sidebar `roadmap`
- Can chup:
  - empty state chua co roadmap
  - populated state `view2`
  - populated state `overview`
  - state dang generate roadmap/phase neu co progress UI
- Mo ta can neu:
  - route deep-link theo roadmap/phase/knowledge
  - canvas mode switching
  - create phase knowledge / pre-learning / quiz from roadmap

### D. Quiz studio

#### IND-08 Quiz List

- Trigger: sidebar `quiz`
- Can chup:
  - populated list
  - empty state
  - loading/search/filter neu co
- Mo ta can neu:
  - open detail, create quiz, open community explorer
  - share/delete behavior neu co

#### IND-09 Community Quiz Explorer

- Trigger: tu `QuizListView`
- Can chup:
  - default list
  - empty/loading
- Mo ta can neu:
  - user quay lai quiz list bang cach nao
  - recommendation/community data den tu dau

#### IND-10 Create Quiz Form

- Trigger: create action tu quiz list
- Can chup:
  - default create form
  - da chon material
  - loading/generating state
  - validation state
- Mo ta can neu:
  - selected source ids
  - AI config / recommendation panel
  - create xong quay ve dau

#### IND-11 Quiz Detail

- Trigger: open 1 quiz
- Can chup:
  - detail overview
  - CTA sang practice/exam neu co
- Mo ta can neu:
  - metadata, questions, actions, edit entry

#### IND-12 Edit Quiz Form

- Trigger: edit tu quiz detail
- Can chup:
  - populated form
  - save state
- Mo ta can neu:
  - route deep-link edit
  - save xong quay ve detail hay roadmap

### E. Flashcard

#### IND-13 Flashcard List

- Trigger: sidebar `flashcard`
- Can chup:
  - populated list
  - empty state
- Mo ta can neu:
  - create/delete/open detail

#### IND-14 Create Flashcard Form

- Trigger: create action tu flashcard list
- Can chup:
  - default form
  - material selected state
  - loading/generating state

#### IND-15 Flashcard Detail

- Trigger: open 1 flashcard set
- Can chup:
  - card front
  - card flipped/back content
- Mo ta can neu:
  - flip interaction, navigation within set

### F. Mock Test

#### IND-16 Mock Test List

- Trigger: sidebar `mockTest`
- Can chup:
  - list state
  - empty state
  - disabled create state neu plan/profile gate
- Mo ta can neu:
  - how mock test generation is entered

#### IND-17 Create Mock Test Form

- Trigger: create action tu mock test list
- Can chup:
  - form default
  - generating state
  - validation state

#### IND-18 Mock Test Detail

- Trigger: open 1 mock test
- Can chup:
  - detail state
  - CTA sang runtime neu co

#### IND-19 Edit Mock Test Form

- Trigger: edit 1 mock test
- Can chup:
  - populated form
  - save state

### G. Post-learning va analytics

#### IND-20 Post-Learning List

- Trigger: studio action `postLearning`
- Can chup:
  - list
  - empty state

#### IND-21 Create Post-Learning Form

- Trigger: create tu post-learning list
- Can chup:
  - default form
  - generating state

#### IND-22 Question Stats

- Trigger: sidebar `questionStats`
- Can chup:
  - populated analytics state
  - empty/no-data state
  - plan-gated state neu action bi khoa
- Mo ta can neu:
  - chi so nao duoc hien thi
  - cach mo quiz/question detail neu co cross-navigation

## Checklist verify sau khi xong phase

- Da mo ta duoc mapping `activeView <-> route`
- Da tach ro shell, dialog, list, detail, create/edit form
- Da note cac gate:
  - onboarding chua xong
  - plan entitlement
  - khong co materials
  - dang generate AI content

## Ghi chu quan trong

- `WorkspacePage.jsx` rat lon. Khong viet spec tung screen neu chua doc `viewRouting.js`.
- `SourceDetailView` va `SourcesPanel` la 2 screen logic khac nhau, du khong tach route.
- Neu muon danh so chuong theo BA document, nen danh rieng nhom workspace ca nhan thanh mot chapter lon.
