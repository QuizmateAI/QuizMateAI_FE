# Session Summary

## Request

User yeu cau chia FE thanh tung phase de quet va cover toan bo i18n, sua cac trang chua import / chua dung i18n, recheck lai sau khi sua vi co the phat sinh loi font / dau tieng Viet, va sau moi phase phai ghi summary ra file `.md`.

## Scope

- Feature hoac khu vuc tac dong:
  - Individual workspace
  - Group workspace / challenge flow
  - Quiz / community quiz / exam / mock test related UI duoc route preload trong phase nay
- Trong pham vi:
  - Quet hard-code user-facing text, alt, aria, placeholder, toast trong workspace / group / quiz cluster
  - Bo sung locale key trong `common.json`, `workspace.json`, `group.json`
  - Sua component bi thieu `useTranslation` hoac dang goi `t(...)` sai
  - Recheck build va rescan lai sau khi sua
- Ngoai pham vi:
  - Admin / super-admin

## Files changed

- `src/i18n/locales/en/common.json`
- `src/i18n/locales/vi/common.json`
- `src/i18n/locales/en/workspace.json`
- `src/i18n/locales/vi/workspace.json`
- `src/i18n/locales/en/group.json`
- `src/i18n/locales/vi/group.json`
- `src/Pages/Users/Individual/Workspace/Components/PersonalWorkspaceSidebar.jsx`
- `src/Pages/Users/Group/Components/GroupSidebar.jsx`
- `src/Pages/Users/Group/Components/GroupWorkspaceHeader.jsx`
- `src/Pages/Users/Group/Group_leader/GroupWalletTab.jsx`
- `src/Pages/Users/Group/Group_leader/GroupMembersTab.jsx`
- `src/Pages/Users/Individual/Workspace/Components/ManualQuizWizard/QuestionNav.jsx`
- `src/Pages/Users/Individual/Workspace/Components/RoadmapCanvasViewOverview.jsx`
- `src/Pages/Users/Group/Components/RoadmapCanvasViewOverview.jsx`
- `src/Pages/Users/Individual/Workspace/Components/QuizMetadataEditModal.jsx`
- `src/Pages/Users/Group/Components/CreateChallengeWizard.jsx`
- `src/Pages/Users/Quiz/components/CommunityQuizDetailDialog.jsx`
- `src/Pages/Users/Quiz/components/CommunityQuizFeedbackDialog.jsx`
- `src/Pages/Users/Quiz/components/HourglassLoader.jsx`
- `src/Pages/Users/Quiz/ExamQuizPage.jsx`
- `src/Pages/Users/Group/Components/ChallengeDetailView.jsx`

## Summary of changes

- Them common key moi cho scroll button, language flag alt, open-actions aria, va hourglass loader aria.
- Bo sung mot nhom key moi trong `workspace.json` cho community quiz detail / feedback, metadata edit modal, exam navigation lock, va workspace shell profile label.
- Bo sung mot nhom key moi trong `group.json` cho challenge mode labels, team / solo / personal config labels, va missing-round-quiz error.
- Chuyen sidebar / header / wallet / members action labels trong workspace va group shell sang `t(...)`, gom logo alt, credit icon alt, switch-language aria, flag alt, go-home aria.
- Chuyen `QuestionNav` placeholder, `RoadmapCanvasViewOverview` scroll aria, `QuizMetadataEditModal` labels / placeholders / errors sang locale key.
- Sua `CreateChallengeWizard` de render label / description theo key locale thay vi string constants hard-code.
- Sua `CommunityQuizDetailDialog` va `CommunityQuizFeedbackDialog` de import `useTranslation`, localize toast / placeholder / default title / description, va loai bo cac string hard-code con sot.
- Chuyen `HourglassLoader` aria-label sang locale key va localize exam lock toast trong `ExamQuizPage`.

## Verification

- Da parse JSON lai cho `src/i18n/locales/en/common.json`, `src/i18n/locales/vi/common.json`, `src/i18n/locales/en/workspace.json`, `src/i18n/locales/vi/workspace.json`, `src/i18n/locales/en/group.json`, `src/i18n/locales/vi/group.json`.
- Da rescan lai workspace / group / quiz / mocktest cluster; phan con lai chu yeu la internal code, enum, hoac ky tu ky thuat khong hien thi cho user.
- Da xac nhan `useTranslation` co mat trong cac file moi patch nhu `QuestionNav.jsx`, `HourglassLoader.jsx`, `CommunityQuizFeedbackDialog.jsx`, `CommunityQuizDetailDialog.jsx`, `QuizMetadataEditModal.jsx`.
- Da chay `npm run build` trong `QuizMateAI_FE`: pass.
- Build van con warning cu cua Vite ve `src/api/ProfileAPI.js`; khong phat sinh tu phase nay.

## Risks or follow-ups

- Admin / super-admin cluster van can quet o phase tiep theo.
- Manual browser QA van hieu ich neu can bat loi typography / spacing / font switching chi lo ra tren UI that.
