# Session Summary

## Request

- Add/complete i18n for upload source dialogs (Individual + Group) and sweep `src/Pages/Users/Individual` for remaining hard-coded UI text.

## Scope

- In scope:
  - Remove remaining hard-coded English strings in the Individual workspace area.
  - Ensure upload dialog uses i18n keys consistently (avoid fallback strings when keys already exist).
  - Add missing locale keys to both `en.json` and `vi.json`.
- Out of scope:
  - Full FE build / full manual QA across all flows.

## Files Changed

- `src/Components/features/Workspace/UploadSourceDialogBase.jsx`
- `src/Pages/Users/Individual/Workspace/Components/ChatPanel.jsx`
- `src/Pages/Users/Individual/Workspace/Components/CreateMockTestForm.jsx`
- `src/Pages/Users/Individual/Workspace/Components/CreatePostLearningForm.jsx`
- `src/Pages/Users/Individual/Workspace/Components/EditMockTestForm.jsx`
- `src/Pages/Users/Individual/Workspace/Components/EditQuizForm.jsx`
- `src/Pages/Users/Individual/Workspace/Components/FlashcardDetailView.jsx`
- `src/Pages/Users/Individual/Workspace/Components/FlashcardListView.jsx`
- `src/Pages/Users/Individual/Workspace/Components/MockTestListView.jsx`
- `src/Pages/Users/Individual/Workspace/Components/PostLearningListView.jsx`
- `src/Pages/Users/Individual/Workspace/Components/QuizListView.jsx`
- `src/Pages/Users/Individual/Workspace/Components/SourcesPanel.jsx`
- `src/Pages/Users/Individual/Workspace/Components/WorkspaceHeader.jsx`
- `src/Pages/Users/Individual/Workspace/Components/WorkspaceProfileWizard/WorkspaceProfileStepTwo.jsx`
- `src/i18n/locales/en.json`
- `src/i18n/locales/vi.json`

## Summary Of Changes

- `UploadSourceDialogBase`:
  - Removed fallback strings from `t(...)` calls where keys already exist, to prevent accidental English display and keep i18n usage consistent.
  - Standardized `workspace.sources.title`, `workspace.upload.untitled`, `workspace.upload.relevanceRate`, and YouTube URL panel strings to use only i18n keys.
- Individual workspace screens:
  - Removed remaining hard-coded English strings such as `Refresh`, `View 1/2`, `Mock Test`, `Post-learning`, `Flashcard`, and `Checking...`.
  - Localized True/False options to `common.boolean.true/false`.
  - Localized delete-confirm dialogs in MockTest/PostLearning list views to use existing `workspace.quiz.*` keys (no fallback English).
  - Added localized fallbacks for missing roadmap/phase names: `workspace.roadmap.fallbackName` and `workspace.phase.fallbackName`.
  - Localized accessibility label `common.options` and workspace edit aria-label `workspace.header.editWorkspace`.
  - Flashcard detail: localized group Assign button + "coming soon" alert.
- Locales:
  - Added keys: `common.checking`, `common.boolean.true`, `common.boolean.false`, `common.options`,
    `workspace.header.editWorkspace`, `workspace.roadmap.refreshPhasesTooltip`, `workspace.roadmap.fallbackName`,
    `workspace.phase.fallbackName`, `workspace.mockTest.workspaceLabel`,
    `workspace.profileConfig.fields.templateTotalSectionPoints`,
    `workspace.flashcard.assign`, `workspace.flashcard.assignComingSoon`.

## Verification

- JSON parse:
  - Parsed `src/i18n/locales/en.json` and `src/i18n/locales/vi.json`.
- Lint:
  - Ran eslint on the touched components and `UploadSourceDialogBase.jsx`.

## Notes / Risks

- `vi.json` is UTF-8 without BOM; some Windows tools may display mojibake if opened as ANSI. The FE runtime (Vite) should still treat it as UTF-8.
- There may still be Vietnamese hard-coded copy in some Individual components (non-English) that could be moved to i18n in a later sweep if needed.

