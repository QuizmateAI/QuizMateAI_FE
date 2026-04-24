# Individual Workspace Specifications

## IND-01 Workspace Welcome / Overview

Function Trigger:
- Route Trigger: The user opens `/workspaces/:workspaceId`.
- Default View Trigger: `WorkspacePage` resolves the route to the `overview` state when no more specific sub-view is requested.
- Recovery Trigger: If an invalid workspace sub-path is entered, the shell falls back to a safe workspace view.

Function Description:
- Actor: USER.
- Purpose: To provide the main entry point for an individual learning workspace and expose navigation to documents, roadmap, quizzes, flashcards, mock tests, post-learning outputs, and analytics.
- Interface: A full-screen workspace shell with a persistent left sidebar, a responsive mobile menu, and a main content region rendered through the workspace chat/studio panel.
- Data Processing:
  - Workspace shell data is loaded through `useWorkspace`.
  - Workspace personalization and profile state are loaded from `WorkspaceAPI`.
  - Feature gates are resolved through `usePlanEntitlements`.

Screen Layout:
- Left Sidebar:
  - Workspace title.
  - Navigation items for all major workspace functions.
  - Language, theme, and profile shortcuts.
- Main Content:
  - Welcome state or overview state, depending on workspace readiness.
  - Workspace-level banners such as mock-test generation status.
  - Studio content area rendered by `ChatPanel`.
- Mobile Behavior:
  - Collapsible sidebar launched from a top-left menu button.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `workspaceId`: Primary route identifier for the current workspace.<br>• `currentWorkspace`: Workspace metadata such as display title, name, and shell-level identity.<br>• `activeView`: The currently selected workspace function, for example `overview`, `sources`, `roadmap`, or `quiz`.<br>• `planEntitlements`: Capability flags controlling access to roadmap creation, analytics, and advanced study features.<br>• `workspaceProfile`: Normalized onboarding and configuration data used to decide what the user can do next. |
| 2 | Validation Rules | • `workspaceId` must exist before workspace content can be resolved.<br>• Unknown or malformed sub-paths must be translated into a valid workspace view instead of leaving the shell in a broken state.<br>• Views that depend on profile completion or plan entitlement must remain disabled until those prerequisites are satisfied. |
| 3 | Business Rules | • The workspace shell is the root controller for all individual study functions.<br>• Sidebar navigation must preserve the current workspace context while switching sub-views.<br>• If profile onboarding is incomplete, the shell may open the profile setup flow before enabling certain study actions.<br>• Feature gating is role-safe and plan-safe: the user can see the shell even when some actions are disabled. |
| 4 | Normal Case | • The user opens a valid workspace.<br>• The shell loads workspace metadata, profile state, and feature flags.<br>• The sidebar becomes available.<br>• The main panel renders the default overview or the requested deep-linked view.<br>• The user continues into a study activity from the same shell. |
| 5 | Abnormal Cases | • The workspace identifier is invalid.<br>• Workspace detail loading fails.<br>• Profile state is incomplete or inconsistent.<br>• The requested sub-path is not recognized and must be corrected to a safe fallback view. |
Source of Truth:
- Page: [WorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/WorkspacePage.jsx:1)
- Sidebar: [PersonalWorkspaceSidebar.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/PersonalWorkspaceSidebar.jsx:1)
- Overview Components: [WorkspaceOverviewView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/WorkspaceOverviewView.jsx:1), [WelcomePanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/WelcomePanel.jsx:1)

## IND-02 Workspace Profile Configuration Dialog

Function Trigger:
- Onboarding Trigger: The dialog opens when a newly created workspace still requires profile setup.
- UI Trigger: The user selects the profile setup or profile edit action from the workspace shell.
- Guard Trigger: Some study functions redirect the user into this dialog when the workspace profile is incomplete.

Function Description:
- Actor: USER.
- Purpose: To collect the learning context required for roadmap generation, mock-test setup, and personalized study recommendations.
- Interface: A multi-step profile wizard presented as a dialog layered on top of the workspace shell.
- Data Processing:
  - Basic Step Save: `saveIndividualWorkspaceBasicStep`
  - Personal Info Step Save: `saveIndividualWorkspacePersonalInfoStep`
  - Roadmap Config Step Save: `saveIndividualWorkspaceRoadmapConfigStep`
  - Mock Test Setup Start: `startIndividualWorkspaceMockTestPersonalInfoStep`
  - Final Confirmation: `confirmIndividualWorkspaceProfile`

Screen Layout:
- Step Container:
  - Multi-step wizard body.
  - Current step indicator.
  - Step-specific field groups.
- Footer Actions:
  - Back.
  - Save or continue.
  - Final confirm action.
- Dialog Framing:
  - Close control when allowed.
  - Guarded dismissal behavior when onboarding is mandatory.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Workspace purpose and learning mode fields.<br>• Domain or subject-related fields inferred from the learner input.<br>• Knowledge input describing current background.<br>• Strengths and weaknesses used for personalization.<br>• Roadmap configuration fields such as pacing, structure, or preferred coverage.<br>• Mock-test-related profile fields that influence later assessment generation. |
| 2 | Validation Rules | • Each wizard step must meet its own required fields before the user can continue.<br>• The dialog must not confirm a profile if required learning-context fields are still missing.<br>• Server-side validation determines whether the flow can advance to the next step.<br>• The UI must preserve entered data when the user navigates backward. |
| 3 | Business Rules | • Profile confirmation is the milestone that unlocks the rest of the workspace experience.<br>• A partially saved profile may still leave some studio functions disabled.<br>• Profile updates can be guarded if downstream content already exists and changing the setup would invalidate prior materials or roadmap assumptions.<br>• The dialog supports both first-time setup and later editing. |
| 4 | Normal Case | • The user opens the profile configuration dialog.<br>• The user completes the basic learning-context step.<br>• The user proceeds through personal information and roadmap-related setup.<br>• The user confirms the final profile.<br>• The workspace updates and the previously gated features become available. |
| 5 | Abnormal Cases | • Saving an intermediate step fails.<br>• Final confirmation fails due to server-side validation.<br>• The user attempts to close the dialog while mandatory setup is still incomplete.<br>• The profile becomes locked because the workspace already contains dependent learning assets. |
Source of Truth:
- Dialog: [IndividualWorkspaceProfileConfigDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog.jsx:1)
- Wizard Steps: [WorkspaceProfileWizard](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/WorkspaceProfileWizard)
- API: [WorkspaceAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/WorkspaceAPI.js:1)

## IND-03 Workspace Profile Overview Dialog

Function Trigger:
- UI Trigger: The user opens the profile summary from the workspace shell.
- Review Trigger: The dialog is opened after onboarding or before a protected update flow.

Function Description:
- Actor: USER.
- Purpose: To present the current workspace profile in a read-focused summary so the user can review what has already been configured.
- Interface: A read-only modal dialog with grouped information cards and an optional entry point to edit the profile.
- Data Processing:
  - Uses normalized profile state already loaded by the workspace shell.

Screen Layout:
- Summary Header:
  - Workspace profile title.
  - Close action.
- Summary Sections:
  - Learning purpose.
  - Domain and knowledge background.
  - Strengths and weaknesses.
  - Roadmap and assessment preferences.
- Optional Footer:
  - Edit action when editing is permitted.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Learning goal and workspace purpose.<br>• Knowledge domain or inferred domain.<br>• Learner strengths and weaknesses.<br>• Roadmap-related settings.<br>• Mock-test-related profile data.<br>• Completion and readiness indicators. |
| 2 | Validation Rules | • The dialog must not open without a loaded workspace profile object.<br>• Fields displayed in the summary should tolerate missing optional values without breaking layout. |
| 3 | Business Rules | • This screen is review-oriented and should not mutate profile data directly.<br>• The edit action should route back into the configuration wizard rather than editing inline.<br>• If the workspace has become update-locked, the dialog can still show data while hiding edit capability. |
| 4 | Normal Case | • The user opens the profile overview.<br>• The dialog shows the saved profile sections.<br>• The user verifies the current learning setup.<br>• If needed, the user launches the edit flow from the dialog. |
| 5 | Abnormal Cases | • Profile state is not yet loaded.<br>• Some fields are absent because onboarding was only partially completed.<br>• Edit capability is unavailable due to a workspace lock or dependency rule. |
Source of Truth:
- Dialog: [IndividualWorkspaceProfileOverviewDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileOverviewDialog.jsx:1)
- Page State: [WorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/WorkspacePage.jsx:1)

## IND-04 Sources List

Function Trigger:
- Sidebar Trigger: The user selects `Sources` from the workspace sidebar.
- Fallback Trigger: When the workspace cannot resolve a more specific study view, it can return the user to the sources area.
- Empty-State Trigger: A first-time workspace may land here and immediately invite the user to upload material.

Function Description:
- Actor: USER.
- Purpose: To manage the learning materials that power all downstream workspace functions such as roadmap, quiz, flashcard, mock test, and post-learning generation.
- Interface: A document-management panel with list rendering, selection behavior, upload entry points, and source-specific actions.
- Data Processing:
  - Fetch List: `getMaterialsByWorkspace`
  - Upload: `uploadMaterial`
  - Delete: `deleteMaterial`

Screen Layout:
- Utility Area:
  - Add or upload source action.
  - Multi-select context actions when applicable.
- Source List:
  - Material cards or rows with status and metadata.
  - Selection state.
  - Open detail action.
- Empty State:
  - No-material message.
  - Primary upload call-to-action.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Material title or file name.<br>• Material type or extension.<br>• Material processing or moderation status.<br>• Selected material identifiers used by downstream generation flows.<br>• Upload and processing progress when recently added items are still being prepared. |
| 2 | Validation Rules | • Material actions require a valid `workspaceId`.<br>• Delete and selection actions require a valid material identifier.<br>• Materials still in processing state should not be treated as ready input for every downstream feature. |
| 3 | Business Rules | • The source list is the foundational inventory for the entire workspace.<br>• Selected materials are reused by quiz, flashcard, roadmap, mock-test, and post-learning generation flows.<br>• Successful uploads should refresh the list so new materials become immediately visible.<br>• The UI must preserve selection state whenever practical while the user moves between related study actions. |
| 4 | Normal Case | • The user opens the sources panel.<br>• The app fetches the workspace material list.<br>• Existing materials render with their current status.<br>• The user selects one or more materials for later study generation.<br>• The user opens a material or uploads a new one. |
| 5 | Abnormal Cases | • The workspace has no materials yet.<br>• Upload fails.<br>• Delete fails.<br>• Material fetch fails.<br>• A material remains stuck in a processing state longer than expected. |
Source of Truth:
- Component: [SourcesPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/SourcesPanel.jsx:1)
- API: [MaterialAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/MaterialAPI.js:1)

## IND-05 Source Detail

Function Trigger:
- UI Trigger: The user opens a specific source from the sources list.
- Review Trigger: The user wants to inspect extracted content, moderation output, or readiness state for a material.

Function Description:
- Actor: USER.
- Purpose: To inspect one material in detail before using it in downstream study functions.
- Interface: A detail view inside the workspace flow with metadata, extracted-information summary, moderation insight, and navigation back to the list.
- Data Processing:
  - Uses source-level data already loaded through the material flow.
  - Can surface moderation or review payload returned with the material object.

Screen Layout:
- Header:
  - Back to sources action.
  - Source title.
- Metadata Section:
  - File information.
  - Processing status.
- Content Section:
  - Extracted summary or parsed result.
- Review Section:
  - Moderation status, warning reason, or readiness note.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Source title and file metadata.<br>• Processing or moderation status.<br>• Extracted summary or parsed content snippet.<br>• Moderation reason, recommendation, or topic classification when available.<br>• Review readiness or warning indicators. |
| 2 | Validation Rules | • The detail view requires a valid selected source payload.<br>• Optional moderation fields must be displayed defensively because not every source returns the same review structure. |
| 3 | Business Rules | • The detail screen should not detach the user from workspace context.<br>• Returning to the list must preserve the current sources session as much as possible.<br>• Moderation or warning states should be visible so the user understands why a source may be limited. |
| 4 | Normal Case | • The user selects a source from the list.<br>• The detail screen opens.<br>• The user reviews metadata and extracted information.<br>• The user returns to the source list or continues to another study action. |
| 5 | Abnormal Cases | • The selected source payload is missing.<br>• Moderation data is incomplete or stale.<br>• The app cannot render extracted information because the source is still processing. |
Source of Truth:
- Component: [SourceDetailView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/SourceDetailView.jsx:1)
- Source Flow: [SourcesPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/SourcesPanel.jsx:1)

## IND-06 Upload Source Dialog

Function Trigger:
- UI Trigger: The user clicks the upload or add-source action from the sources area or from another workflow that needs materials.
- Empty-State Trigger: A brand-new workspace can open this dialog immediately after detecting that no materials exist.

Function Description:
- Actor: USER.
- Purpose: To add new learning materials into the workspace so they can be processed and reused throughout the study experience.
- Interface: A modal upload dialog with file selection, validation messaging, progress state, and submit controls.
- Data Processing:
  - Upload: `uploadMaterial`

Screen Layout:
- Upload Area:
  - File picker or drag-and-drop target.
  - Accepted file guidance.
- Selected Files Area:
  - Chosen files list.
  - Remove-before-upload control.
- Footer:
  - Submit.
  - Cancel.
  - Progress and result feedback.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Selected file list.<br>• File names, sizes, and extensions.<br>• Upload progress indicators.<br>• `workspaceId` used as the upload target. |
| 2 | Validation Rules | • File type and file size must satisfy frontend and backend upload rules.<br>• The user must select at least one file before submission.<br>• The dialog should reject unsupported files before attempting the upload. |
| 3 | Business Rules | • A successful upload should feed back into the workspace sources list immediately.<br>• Newly uploaded items can appear in processing state before they become fully usable.<br>• The dialog may be reopened from multiple workspace entry points, but the result always belongs to the current workspace. |
| 4 | Normal Case | • The user opens the upload dialog.<br>• The user selects one or more valid files.<br>• The app uploads the files.<br>• Upload progress is shown.<br>• The dialog closes or updates, and the sources list refreshes with the new items. |
| 5 | Abnormal Cases | • Unsupported file extension.<br>• File too large.<br>• Network interruption during upload.<br>• Backend upload failure. |
Source of Truth:
- Dialog: [UploadSourceDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/UploadSourceDialog.jsx:1)
- API: [MaterialAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/MaterialAPI.js:1)

## IND-07 Roadmap Canvas

Function Trigger:
- Sidebar Trigger: The user selects `Roadmap`.
- Deep-Link Trigger: The user opens a roadmap-specific URL such as `/workspaces/:workspaceId/roadmaps/:roadmapId/...`.
- Create Trigger: The user generates or refreshes roadmap content from within the workspace shell.

Function Description:
- Actor: USER.
- Purpose: To visualize and manage the personalized learning roadmap, including roadmap structure, phases, knowledge nodes, pre-learning actions, and roadmap-linked quizzes.
- Interface: A roadmap studio area that supports multiple canvas modes, a journey side panel, and roadmap-specific actions.
- Data Processing:
  - Fetch Structure: `getRoadmapStructureById`
  - Create Roadmap: `createRoadmapForWorkspace`
  - Update Config: `updateRoadmapConfig`
  - Delete Phase: `deleteRoadmapPhaseById`
  - Delete Knowledge: `deleteRoadmapKnowledgeById`

Screen Layout:
- Header:
  - Roadmap title.
  - Edit roadmap configuration action.
  - Canvas mode switcher.
- Main Canvas:
  - Overview or stage-based roadmap visualization.
  - Phase and knowledge nodes.
- Side Support Area:
  - Journey panel.
  - Roadmap review or guidance panels.
- Empty State:
  - Prompt to generate a roadmap when none exists.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `roadmapId`, `phaseId`, and `knowledgeId` from route or workspace state.<br>• Roadmap phases and knowledge units.<br>• Selected material identifiers used for roadmap generation.<br>• Canvas mode preference, including persisted view selection.<br>• Generation progress for roadmap phases, pre-learning, and linked quiz generation. |
| 2 | Validation Rules | • Deep-linked roadmap identifiers must map to real roadmap objects before the canvas can hydrate.<br>• Roadmap creation and update flows require valid selected materials and valid workspace context.<br>• Delete actions require valid phase or knowledge identifiers. |
| 3 | Business Rules | • The roadmap is a studio feature that depends on workspace profile readiness and, in some cases, plan entitlement.<br>• The selected roadmap view can be persisted so users return to the same canvas mode later.<br>• A roadmap-linked quiz detail screen must preserve a back target into the roadmap context.<br>• Empty-state generation and deep-linked roadmap navigation must both converge on the same roadmap data model. |
| 4 | Normal Case | • The user opens the roadmap section.<br>• The app loads the current roadmap structure.<br>• The user switches between roadmap views, inspects phases, and opens related knowledge items.<br>• The user triggers creation of a knowledge quiz or pre-learning content where applicable.<br>• The user returns to roadmap context without losing focus. |
| 5 | Abnormal Cases | • The workspace has no eligible materials for roadmap generation.<br>• The roadmap identifier in the URL is invalid.<br>• Phase or knowledge generation fails.<br>• Roadmap structure loading fails.<br>• Plan entitlement blocks roadmap creation or editing. |
Source of Truth:
- Page: [WorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/WorkspacePage.jsx:1)
- Main Canvas: [RoadmapCanvasView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/RoadmapCanvasView.jsx:1)
- Related Components: [RoadmapCanvasView2.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/RoadmapCanvasView2.jsx:1), [RoadmapCanvasViewOverview.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/RoadmapCanvasViewOverview.jsx:1), [RoadmapJourPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/RoadmapJourPanel.jsx:1)
- API: [RoadmapAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/RoadmapAPI.js:1)

## IND-08 Quiz List

Function Trigger:
- Sidebar Trigger: The user selects `Quiz`.
- Deep-Link Trigger: The user opens `/workspaces/:workspaceId/quizzes`.
- Return Trigger: The user finishes or exits a quiz-related sub-view and returns to the list.

Function Description:
- Actor: USER.
- Purpose: To show all quizzes created inside the current workspace and allow the user to review, open, edit, delete, or share them.
- Interface: A workspace-scoped quiz inventory view with list or card presentation, create action, and shortcuts into community exploration or quiz detail.
- Data Processing:
  - Fetch List: `getQuizzesByScope`
  - Delete Quiz: `deleteQuiz`
  - Share to Community: `shareQuizToCommunity`

Screen Layout:
- Header Area:
  - Quiz list title.
  - Create quiz action.
  - Optional community explorer entry point.
- Main List:
  - Quiz cards or rows with metadata and actions.
- Empty State:
  - No-quiz message.
  - Create-first-quiz call-to-action.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Quiz title.<br>• Quiz status such as draft, active, or completed where available.<br>• Difficulty level or derived study intensity label.<br>• Creation date and source context.<br>• Action state for open, edit, delete, or share. |
| 2 | Validation Rules | • The quiz list requires a valid workspace scope before loading.<br>• Delete and share actions require a valid quiz identifier.<br>• Create-quiz action should be disabled when the workspace lacks the prerequisites required by the form. |
| 3 | Business Rules | • This list is scoped to the current workspace only.<br>• From this list, the user can move into quiz detail, quiz edit, or community exploration without leaving the workspace shell.<br>• If quiz creation is blocked by missing materials or plan limitations, the list must still render and explain the restriction through disabled-state behavior.<br>• Quizzes reached from roadmap context may still appear in the same inventory list, but detail navigation should preserve roadmap back-navigation when appropriate. |
| 4 | Normal Case | • The user opens the quiz list.<br>• The app fetches quizzes for the current workspace.<br>• The quizzes render in the list.<br>• The user opens an existing quiz or starts creating a new one. |
| 5 | Abnormal Cases | • No quizzes exist yet.<br>• The quiz list request fails.<br>• Delete fails.<br>• Share-to-community fails.<br>• A previously selected quiz no longer exists. |
Source of Truth:
- Component: [QuizListView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/QuizListView.jsx:1)
- API: [QuizAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/QuizAPI.js:1)

## IND-09 Community Quiz Explorer

Function Trigger:
- UI Trigger: The user opens the community quiz explorer from the quiz area.
- Recommendation Trigger: The workspace surfaces community quiz discovery as a secondary path from the local quiz inventory.

Function Description:
- Actor: USER.
- Purpose: To help the user discover public or shared quizzes that are relevant to the current learning context.
- Interface: A browse-oriented explorer view nested under the quiz area, with a clear way to return to the local quiz list.
- Data Processing:
  - Community quiz lookup and recommendation logic from the quiz-related frontend flow.

Screen Layout:
- Header:
  - Explorer title.
  - Back-to-workspace-quiz action.
- Content Area:
  - Community quiz cards or recommendation list.
  - Contextual helper text.
- Empty State:
  - No recommendation message.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Community quiz title and summary metadata.<br>• Recommendation relevance or context hints when available.<br>• Source or author identity where exposed by the API. |
| 2 | Validation Rules | • The explorer must receive enough workspace context to request relevant quiz recommendations.<br>• Community items must have valid identifiers before open actions are enabled. |
| 3 | Business Rules | • This is not a top-level workspace route; it is a sub-view inside the quiz experience.<br>• The user must be able to exit back to the local workspace quiz inventory without losing workspace context.<br>• The explorer supplements, rather than replaces, locally created quizzes. |
| 4 | Normal Case | • The user opens the community explorer from the quiz list.<br>• The app loads relevant quiz suggestions.<br>• The user reviews community items.<br>• The user returns to the local quiz list or opens a specific community item if supported. |
| 5 | Abnormal Cases | • No community recommendations are available.<br>• Community recommendation retrieval fails.<br>• A recommended item becomes unavailable before it is opened. |
Source of Truth:
- Component: [CommunityQuizExplorerView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/CommunityQuizExplorerView.jsx:1)

## IND-10 Create Quiz Form

Function Trigger:
- Workspace Studio: From the Workspace page -> navigate to the Studio panel -> open the Quiz area -> click the create-quiz action from the quiz list.
- Inline Recommendation Trigger: From the workspace quiz panel -> expand an AI recommendation card -> trigger quiz generation with prefilled title and prompt data.
- Personalization Trigger: From a personalization task or recommendation handoff -> the form opens with prefilled values passed through `location.state`.
- View Switch: The center workspace panel dynamically switches to `CreateQuizForm` while the workspace shell and sidebar remain visible.

Function Description:
- Actor: USER (Workspace Owner).
- Purpose: To create a new AI-generated workspace quiz based on uploaded learning materials, prompt instructions, and a configurable quiz-distribution model.
- Interface: A high-fidelity, AI-first, multi-section form embedded directly inside the Workspace shell.
- Configuration Sections:
  - General Information: quiz name.
  - Source Materials: material selection with bulk select and clear actions.
  - Settings: total question count, timed mode or sequential-by-difficulty mode, and duration inputs.
  - Difficulty Builder: preset or custom difficulty distribution with lockable buckets and a live preview bar.
  - Question Type Matrix: selectable question types with percent/count allocation and per-item locking.
  - Bloom Taxonomy Matrix: selectable Bloom skills with percent/count allocation and per-item locking.
  - Prompt and Structure: custom prompt input plus an optional AI-generated detailed structure preview that can be edited before submit.
- Data Processing:
  - Metadata Bootstrap: Loads question types, difficulty definitions, and Bloom-skill definitions through `getQuestionTypes()`, `getDifficultyDefinitions()`, and `getBloomSkills()`.
  - Structure Preview: When the user clicks `Detailed configuration`, the form can call `previewAIQuizStructure(...)` to build a previewable `structureJson` payload.
  - Final Generation: Calls `generateAIQuiz(payload)` with `workspaceId`, `materialIds`, `title`, `quizIntent`, `totalQuestion`, timer settings, difficulty ratios, question-type ratios, Bloom ratios, prompt, and optional structure JSON.
  - Completion Flow: On success, `onCreateQuiz(...)` returns control to `WorkspacePage`, which switches back to the Quiz list and starts tracking generation progress when the backend responds asynchronously.

Screen Layout:
- Screenshot Placeholder 1: Full `Create Quiz` screen inside the Workspace Studio.
- Description:
  - Top header bar with back button and `Create Quiz` title.
  - Inline recommendation cards and top-level error or insufficient-credit banner.
  - Scrollable form body divided into configuration sections.
- Screenshot Placeholder 2: Difficulty, Question Type, and Bloom configuration area.
- Description:
  - Difficulty section with preset/custom distribution and live preview bar.
  - Question-type allocation panel with select-all, ratio inputs, and lock icons.
  - Bloom allocation panel with select-all, ratio inputs, lock icons, and Bloom taxonomy helper image.
- Screenshot Placeholder 3: Detailed structure configuration area.
- Description:
  - `Detailed configuration` action for AI structure preview.
  - Editable structure items with difficulty, question type, Bloom skill, quantity, and drag-and-drop reordering.
- Footer Area:
  - Back action.
  - Generate action.
  - Submission loading state.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Metadata: `aiName` (quiz title), `quizIntent` (`REVIEW`), `totalQuestion`, `timerMode`, `durationInMinute`, `easyDurationInSeconds`, `mediumDurationInSeconds`, `hardDurationInSeconds`, `outputLanguage`.<br>• Context: `workspaceId`, `materialIds`.<br>• Difficulty Model: preset or custom distribution, `easyRatio`, `mediumRatio`, `hardRatio`, `lockedDifficultyLevel`.<br>• Question Type Model: `questionTypes[]` with `questionTypeId`, `ratio`, `isLocked`; supports count mode or percentage mode.<br>• Bloom Model: `bloomSkills[]` with `bloomId`, `ratio`, `isLocked`; supports count mode or percentage mode.<br>• Prompt And Structure: `aiPrompt`, optional `structureJson`, and structure items with `difficulty`, `questionType`, `bloomSkill`, `quantity`.<br>• UI State: inline recommendation data, metadata loading state, structure preview state, submission state, and error state. |
| 2 | Validation | • Identity: Quiz name is required and must respect the configured maximum title length.<br>• Input Source: The user must provide at least one selected material or a non-empty custom prompt.<br>• Question Volume: `totalQuestion` must be between `10` and `100`.<br>• Time Logic: In timed mode, total duration is required and must satisfy the internal rule of at least `30` seconds per question. In sequential mode, `easy`, `medium`, and `hard` durations are all required and must follow `Hard > Medium > Easy`.<br>• Allocation Totals: Difficulty, question-type, and Bloom allocation must total `100%` in percentage mode or match `totalQuestion` in count mode.<br>• Plan Gate: Advanced question types are blocked when `hasAdvanceQuizConfig` is not available.<br>• Submission Safety: When validation fails, the form scrolls to the first invalid section instead of submitting. |
| 3 | Distribution And Structure Engine | • Difficulty Engine: The user can select a preset difficulty definition or switch to a custom distribution. In custom mode, each difficulty bucket can be adjusted directly, and the lock icon preserves one bucket while the remaining budget is redistributed across unlocked buckets.<br>• Question Type Engine: The user can switch between percentage mode and count mode. Each selected question type receives a ratio or count value, and the lock icon preserves a specific question-type allocation while the remaining total is redistributed.<br>• Bloom Engine: The user can switch between percentage mode and count mode for Bloom skills. Each selected Bloom skill receives a ratio or count value, and the lock icon preserves a specific Bloom allocation while the remaining total is redistributed.<br>• Redistribution Logic: Target total is `100` in percentage mode or `totalQuestion` in count mode. Remaining budget is computed as `Remaining = TargetTotal - Sum(LockedValues)`. The internal distribution helper recalculates unlocked items so the final total remains valid.<br>• Structure Preview: The user can request `Detailed configuration` from AI. The returned structure can be edited before submit, reordered with drag-and-drop, and adjusted per line item. |
| 4 | Business Rules | • This is the primary AI-based quiz-creation experience currently exposed in the individual workspace FE.<br>• The screen is rendered inside the Workspace shell, not as a separate full-page route.<br>• Selected materials are synchronized with workspace material-selection logic so the user can build a quiz from the current working set.<br>• Inline recommendations and personalization tasks can prefill the form to shorten quiz setup.<br>• Advanced question types are gated by plan entitlement.<br>• On successful submit, the UI returns to the Quiz list and generation progress may continue asynchronously in the background. |
| 5 | Normal Case | 1. The user opens the Quiz area and enters the `Create Quiz` form.<br>2. The user selects source materials or keeps the current preselected materials.<br>3. The user enters a quiz title, chooses question volume, and sets time behavior.<br>4. The user adjusts difficulty, question-type, and Bloom allocations.<br>5. The user optionally reviews `Detailed configuration` and fine-tunes structure items.<br>6. The user clicks generate.<br>7. The UI returns to the Workspace Quiz list and begins tracking quiz-generation progress. |
| 6 | Abnormal Cases | • Metadata Load Failure: Question types, difficulty definitions, or Bloom skills fail to load. The form shows a metadata error and blocks reliable configuration.<br>• Incomplete Input: The user provides neither materials nor prompt. The form scrolls to the invalid section and displays validation messages.<br>• Allocation Mismatch: Difficulty, question-type, or Bloom totals do not match the required target. Submission is blocked until the totals are corrected.<br>• Plan Restriction: The user selects an advanced question type without the required plan entitlement. The UI keeps those types in a gated state and prevents invalid submission.<br>• Credit Failure: The backend detects insufficient workspace credit during generation. The UI shows a highlighted insufficient-credit banner with links to credits and wallet pages.<br>• Generation Failure: `generateAIQuiz(...)` fails. The form remains open so the user can adjust input and retry. |
Source of Truth:
- Entry Component: [CreateQuizForm.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/CreateQuizForm.jsx:1)
- Container: [CreateQuizFormContainer.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/CreateQuizFormContainer.jsx:1)
- Form Content: [CreateQuizAiFormContent.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/CreateQuizAiFormContent.jsx:1)
- Form Logic: [useCreateQuizAiForm.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/useCreateQuizAiForm.js:1)
- APIs: [AIAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/AIAPI.js), [QuizAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/QuizAPI.js:1)

## IND-11 Quiz Detail

Function Trigger:
- UI Trigger: The user opens a quiz from the quiz list.
- Deep-Link Trigger: The user opens a quiz-specific workspace URL.
- Roadmap Trigger: The user opens a quiz attached to a roadmap phase or knowledge node.

Function Description:
- Actor: USER.
- Purpose: To review the content and metadata of one quiz and continue into quiz-related actions such as practice, exam, question discussion, review, or editing.
- Interface: A quiz detail view embedded in the workspace shell, with context-aware back navigation, conditional discussion overlays, and a confirmation dialog before exam-mode launch.
- Data Processing:
  - Quiz Detail Load: `getQuizFull`, `getSectionsByQuiz`, `getQuestionsBySection`, `getAnswersByQuestion`
  - Thread Counts: `getThreadCounts`
  - History And Review State: `getQuizHistory`, `recordQuizReviewView`

Screen Layout:
- Header:
  - Quiz title.
  - Back action.
  - Edit action when available.
- Summary Area:
  - Quiz metadata.
  - Section and question preview.
- Action Area:
  - Practice, exam, review, or related follow-up actions.
- Conditional Dialogs:
  - Per-question discussion popup.
  - Exam start confirmation dialog.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Quiz identity: `quizId`, title, status, scope metadata, and summary statistics.<br>• Content model: section list, question list, answer options, and per-question flags such as starred state.<br>• Navigation context: return-to path, roadmap-origin context, and workspace shell state.<br>• Review context: history records, current active tab, and recorded review-view state.<br>• Discussion context: `discussionOpenQId`, per-question thread counts, selected question payload, and derived section label.<br>• Attempt context: personal history snapshot, practice-availability status, and `examStartOpen` confirmation state. |
| 2 | Validation Rules | • The detail screen requires a valid quiz identifier or a resolvable selected quiz payload before full hydration can begin.<br>• Section, question, and answer panels must wait until the corresponding quiz-detail payload is available.<br>• If the quiz was opened through roadmap deep-linking, the return-path state must be normalized before back-navigation controls are shown.<br>• The discussion dialog can only open when a concrete question has been selected.<br>• Exam-mode navigation should only proceed after the user confirms through the exam-start dialog. |
| 3 | Business Rules | • The quiz detail screen can be reached from quiz list, roadmap, and other workspace contexts, and it must preserve the correct return target.<br>• If the user came from roadmap context, the primary back action should restore the roadmap view instead of sending the user to the generic quiz list.<br>• The same detail experience can branch into practice or exam runtime while preserving enough state to return to quiz detail later.<br>• Per-question discussion is handled inline through a popup dialog so the user does not leave the current quiz-review context.<br>• Edit access depends on the normal workspace quiz-editing rules.<br>• In code, the shared quiz-detail component also carries some conditional group-style publication hooks; these remain contextual and do not always appear in the normal personal workspace flow. |
| 4 | Normal Case | • The user opens a quiz from the list or roadmap.<br>• The detail view loads quiz metadata, sections, and questions.<br>• The user reviews question content, opens discussion on a specific question if needed, and inspects history or review tabs.<br>• The user starts practice or confirms exam mode from the same detail screen.<br>• The user returns to the previous workspace context after finishing review. |
| 5 | Abnormal Cases | • The quiz identifier is invalid.<br>• The selected quiz no longer exists.<br>• Quiz sections or answer payload fail to load.<br>• The back-target mapping is missing or stale for a roadmap-linked quiz.<br>• Discussion thread counts fail, leaving comment badges incomplete while the main quiz detail still renders. |
Source of Truth:
- Component: [QuizDetailView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/QuizDetailView.jsx:1)
- View Routing: [viewRouting.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/utils/viewRouting.js:1)

## IND-12 Edit Quiz Form

Function Trigger:
- UI Trigger: The user clicks edit from quiz detail.
- Deep-Link Trigger: The user opens `/workspaces/:workspaceId/quizzes/:quizId/edit` or a roadmap-based edit URL.

Function Description:
- Actor: USER.
- Purpose: To modify an existing workspace quiz without leaving the workspace shell.
- Interface: A pre-filled quiz-editing form with save and back controls.
- Data Processing:
  - Quiz update flow through the quiz API layer.

Screen Layout:
- Form Header:
  - Edit title.
  - Back action.
- Editable Area:
  - Existing quiz settings.
  - Editable question or generation-related fields.
- Footer:
  - Save action.
  - Validation feedback.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Existing quiz payload.<br>• Editable quiz configuration.<br>• Back-target context for returning to quiz detail or roadmap.<br>• Save loading state and mutation status. |
| 2 | Validation Rules | • A valid target quiz must be loaded before edit mode can render.<br>• Updated values must satisfy the same core constraints required for quiz persistence.<br>• The form must block save while the mutation is in flight. |
| 3 | Business Rules | • Edit mode is a child of quiz detail, not a separate workspace domain.<br>• Save success should return the user to the updated quiz detail view.<br>• If the user entered from roadmap context, the detail and back-navigation chain must remain intact after the edit completes. |
| 4 | Normal Case | • The user opens edit mode from a quiz.<br>• The form loads the current quiz values.<br>• The user updates the allowed fields.<br>• The user saves the quiz.<br>• The workspace returns to the refreshed quiz detail view. |
| 5 | Abnormal Cases | • The target quiz cannot be resolved.<br>• Save fails.<br>• The user no longer has edit access. |
Source of Truth:
- Component: [EditQuizForm.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/EditQuizForm.jsx:1)
- View Routing: [viewRouting.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/utils/viewRouting.js:1)

## IND-13 Flashcard List

Function Trigger:
- Sidebar Trigger: The user selects `Flashcard`.
- Return Trigger: The user exits flashcard detail or flashcard creation and comes back to the inventory.

Function Description:
- Actor: USER.
- Purpose: To list all flashcard sets created within the current workspace and allow the user to open, create, or delete them.
- Interface: A list-oriented study inventory with empty state and create entry point.
- Data Processing:
  - Fetch List: `getFlashcardsByScope`
  - Delete Set: `deleteFlashcardSet`

Screen Layout:
- Header:
  - Flashcard list title.
  - Create flashcard action.
- Main List:
  - Flashcard set rows or cards.
- Empty State:
  - No-flashcard message.
  - Create-first-set action.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Flashcard set title.<br>• Card count or item count.<br>• Creation metadata.<br>• Action availability for open and delete. |
| 2 | Validation Rules | • The list requires valid workspace scope information.<br>• Delete actions require a valid flashcard-set identifier. |
| 3 | Business Rules | • Flashcard sets belong to the current workspace scope only.<br>• Create action depends on having valid study materials available.<br>• Returning from detail should restore the flashcard inventory context. |
| 4 | Normal Case | • The user opens the flashcard list.<br>• The app fetches existing sets.<br>• The user opens one set or starts creating a new set. |
| 5 | Abnormal Cases | • No flashcard sets exist.<br>• List loading fails.<br>• Delete fails. |
Source of Truth:
- Component: [FlashcardListView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/FlashcardListView.jsx:1)
- API: [FlashcardAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/FlashcardAPI.js:1)

## IND-14 Create Flashcard Form

Function Trigger:
- UI Trigger: The user clicks the create-flashcard action from the flashcard list or another permitted workspace entry point.

Function Description:
- Actor: USER.
- Purpose: To generate a new flashcard set from selected workspace materials.
- Interface: A form-based generation flow with material selection and submission controls.
- Data Processing:
  - Flashcard generation and creation flow through the flashcard API layer.

Screen Layout:
- Header:
  - Create flashcard title.
  - Back action.
- Form Area:
  - Flashcard configuration fields.
  - Material selection state.
- Footer:
  - Submit.
  - Cancel or back.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Selected material identifiers.<br>• Flashcard generation settings.<br>• Form state and submit status. |
| 2 | Validation Rules | • The user must provide a valid study material set before submitting.<br>• Required creation fields must be complete and valid. |
| 3 | Business Rules | • Flashcard generation is workspace-scoped.<br>• Successful creation should return a new flashcard asset into the current workspace flow.<br>• The user should be returned to a safe flashcard view after success or cancellation. |
| 4 | Normal Case | • The user opens the create form.<br>• The user selects materials and configures the set.<br>• The user submits the form.<br>• A new flashcard set is created and shown in the workspace flow. |
| 5 | Abnormal Cases | • No eligible materials are available.<br>• Validation fails.<br>• Flashcard generation fails. |
Source of Truth:
- Component: [CreateFlashcardForm.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/CreateFlashcardForm.jsx:1)

## IND-15 Flashcard Detail

Function Trigger:
- UI Trigger: The user opens a flashcard set from the flashcard list.

Function Description:
- Actor: USER.
- Purpose: To review and study a single flashcard set inside the workspace.
- Interface: A focused flashcard viewer with set summary, card navigation, and back navigation.
- Data Processing:
  - Uses the selected flashcard payload handed off by the flashcard list flow.

Screen Layout:
- Header:
  - Set title.
  - Back action.
- Study Area:
  - Current card.
  - Flip behavior.
  - Previous and next controls.
- Summary Area:
  - Card count and set metadata.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Flashcard set metadata.<br>• Current card index.<br>• Front and back card content.<br>• Flip state and total card count. |
| 2 | Validation Rules | • A valid selected flashcard set must exist before detail rendering starts.<br>• The card viewer must guard against missing or malformed card entries. |
| 3 | Business Rules | • The user should be able to return to the flashcard list without losing workspace context.<br>• This detail view is study-focused and should not behave like a standalone route detached from the shell. |
| 4 | Normal Case | • The user opens a flashcard set.<br>• The detail viewer loads the set.<br>• The user flips and navigates through cards.<br>• The user returns to the list when finished. |
| 5 | Abnormal Cases | • The selected set is missing.<br>• Card content is malformed.<br>• The viewer cannot render because the selected set is stale. |
Source of Truth:
- Component: [FlashcardDetailView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/FlashcardDetailView.jsx:1)

## IND-16 Mock Test List

Function Trigger:
- Sidebar Trigger: The user selects `Mock Test`.
- Return Trigger: The user comes back from mock-test detail or mock-test creation.

Function Description:
- Actor: USER.
- Purpose: To list all mock tests available in the workspace and provide the entry point for creating new ones.
- Interface: A mock-test inventory with create action, item open action, and shell-level progress awareness.
- Data Processing:
  - Mock-test list retrieval through the workspace mock-test flow.
  - Generation progress may also be reflected by shell-level banners.

Screen Layout:
- Header:
  - Mock-test list title.
  - Create mock-test action.
- Main List:
  - Mock-test cards or rows with metadata.
- Empty State:
  - No-mock-test message.
  - Create action.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Mock-test title.<br>• Status and generation progress.<br>• Question count, time configuration, or other summary metadata where available.<br>• Action state for open and edit-related flows. |
| 2 | Validation Rules | • The list requires valid workspace scope.<br>• Creation may depend on workspace profile readiness and feature availability. |
| 3 | Business Rules | • Mock-test generation may continue in the background and surface status through shell banners even when the user is not inside the create form.<br>• The list remains available even if mock-test creation is temporarily blocked by a prerequisite.<br>• Mock-test inventory stays within the current workspace context. |
| 4 | Normal Case | • The user opens the mock-test list.<br>• Existing mock tests render.<br>• The user opens one mock test or creates a new one. |
| 5 | Abnormal Cases | • No mock tests exist yet.<br>• List loading fails.<br>• Creation is blocked by profile or plan prerequisites.<br>• Background generation ends in failure. |
Source of Truth:
- Component: [MockTestListView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/MockTestListView.jsx:1)
- Page State: [WorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/WorkspacePage.jsx:1)

## IND-17 Create Mock Test Form

Function Trigger:
- UI Trigger: The user clicks the create-mock-test action from the mock-test list.

Function Description:
- Actor: USER.
- Purpose: To generate a new mock test based on workspace materials and the learner profile.
- Interface: A generation form with configuration inputs, material selection, and submit handling.
- Data Processing:
  - Mock-test generation through the workspace mock-test flow and related API calls.

Screen Layout:
- Header:
  - Create mock-test title.
  - Back action.
- Configuration Area:
  - Mock-test structure and setup fields.
- Material Area:
  - Selected materials.
  - Toggle controls.
- Footer:
  - Submit.
  - Validation state.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Mock-test configuration values.<br>• Selected material identifiers.<br>• Profile-derived defaults or constraints.<br>• Generation state and progress information. |
| 2 | Validation Rules | • The user must have the required prerequisites, including valid materials and any required profile data.<br>• Required mock-test settings must be valid before submission. |
| 3 | Business Rules | • Some mock-test behavior depends on prior profile setup.<br>• Successful submission may start an asynchronous generation job rather than producing an immediate finished asset.<br>• The shell can reflect long-running progress outside the form itself. |
| 4 | Normal Case | • The user opens the create-mock-test form.<br>• The user confirms materials and settings.<br>• The user submits the form.<br>• Generation starts and later produces a new mock test in the workspace. |
| 5 | Abnormal Cases | • Validation fails.<br>• Prerequisite profile data is missing.<br>• Generation fails.<br>• The workspace plan or setup blocks creation. |
Source of Truth:
- Component: [CreateMockTestForm.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/CreateMockTestForm.jsx:1)
- Hook: [useWorkspaceMockTestGeneration.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/hooks/useWorkspaceMockTestGeneration.js:1)

## IND-18 Mock Test Detail

Function Trigger:
- UI Trigger: The user opens a mock test from the mock-test list.
- Deep-Link Trigger: The user opens `/workspaces/:workspaceId/mock-tests/:mockTestId`.

Function Description:
- Actor: USER.
- Purpose: To inspect a specific mock test before entering the runtime or edit flow.
- Interface: A detail screen embedded in the workspace shell with summary, back navigation, and follow-up actions.
- Data Processing:
  - Uses selected mock-test payload or deep-linked mock-test identifier resolution.

Screen Layout:
- Header:
  - Mock-test title.
  - Back action.
- Summary Section:
  - Configuration and readiness information.
- Action Section:
  - Continue or edit actions when available.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Mock-test identifier and title.<br>• Summary metadata such as number of questions, time expectations, or study purpose.<br>• Runtime handoff or edit availability. |
| 2 | Validation Rules | • `mockTestId` must be valid when the user arrives through deep-linking.<br>• The screen must guard against missing selected mock-test payload when the workspace state is not fully hydrated yet. |
| 3 | Business Rules | • The detail screen belongs to the workspace shell and must preserve a clean return path to the mock-test list.<br>• If the mock-test was generated asynchronously, the detail view should tolerate a lag between creation and final readiness. |
| 4 | Normal Case | • The user opens a mock test.<br>• The detail screen renders its summary.<br>• The user returns to the list or continues to the next relevant action. |
| 5 | Abnormal Cases | • Invalid mock-test identifier.<br>• Detail loading fails.<br>• The selected mock test is stale or missing. |
Source of Truth:
- Component: [MockTestDetailView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/MockTestDetailView.jsx:1)
- View Routing: [viewRouting.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/utils/viewRouting.js:1)

## IND-19 Edit Mock Test Form

Function Trigger:
- UI Trigger: The user enters edit mode from mock-test detail.

Function Description:
- Actor: USER.
- Purpose: To modify an existing mock test configuration from inside the workspace.
- Interface: A pre-filled edit form that returns to mock-test detail on successful save.
- Data Processing:
  - Mock-test update flow through the related mock-test form logic.

Screen Layout:
- Header:
  - Edit title.
  - Back action.
- Editable Form:
  - Existing mock-test settings.
- Footer:
  - Save action.
  - Validation and loading feedback.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Existing mock-test payload.<br>• Editable configuration fields.<br>• Save state and back navigation state. |
| 2 | Validation Rules | • The selected mock test must exist before edit mode can render.<br>• Updated values must satisfy the same rules as valid mock-test configuration. |
| 3 | Business Rules | • Save success returns the user to the updated detail view.<br>• Edit mode should stay inside the workspace shell rather than opening a detached page. |
| 4 | Normal Case | • The user opens edit mode.<br>• The existing configuration is shown.<br>• The user updates the fields.<br>• The user saves and returns to mock-test detail. |
| 5 | Abnormal Cases | • The selected mock test is missing.<br>• Save fails.<br>• The user attempts to edit a mock test that is no longer valid. |
Source of Truth:
- Component: [EditMockTestForm.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/EditMockTestForm.jsx:1)

## IND-20 Post-Learning List

Function Trigger:
- Sidebar or Studio Trigger: The workspace routes the user into the post-learning list view.
- Return Trigger: The user exits post-learning creation and comes back to the inventory.

Function Description:
- Actor: USER.
- Purpose: To list post-learning outputs generated inside the workspace and provide a create entry point.
- Interface: A list view for post-learning items rendered within the workspace shell.
- Data Processing:
  - Post-learning list and selected-output state from the post-learning workspace flow.

Screen Layout:
- Header:
  - Post-learning list title.
  - Create post-learning action.
- Main List:
  - Existing post-learning items.
- Empty State:
  - No-output message.
  - Create action.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Post-learning item title or label.<br>• Creation metadata.<br>• Open and create action state. |
| 2 | Validation Rules | • The workspace context must be valid before list retrieval or item navigation can occur. |
| 3 | Business Rules | • Post-learning is a workspace study artifact similar to quiz and flashcard, but it remains its own sub-view inside the shell.<br>• The user should be able to return to the inventory cleanly after creating or opening an item. |
| 4 | Normal Case | • The user opens the post-learning list.<br>• Existing outputs render.<br>• The user creates a new post-learning output or opens one that already exists. |
| 5 | Abnormal Cases | • No post-learning outputs exist.<br>• List retrieval fails.<br>• The selected output is stale or missing. |
Source of Truth:
- Component: [PostLearningListView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/PostLearningListView.jsx:1)

## IND-21 Create Post-Learning Form

Function Trigger:
- UI Trigger: The user clicks the create-post-learning action from the post-learning list or another supported workflow.

Function Description:
- Actor: USER.
- Purpose: To create a new post-learning output using selected workspace materials.
- Interface: A generation form rendered inside the workspace shell.
- Data Processing:
  - Post-learning generation flow through the related workspace creation logic.

Screen Layout:
- Header:
  - Create post-learning title.
  - Back action.
- Form Area:
  - Configuration inputs.
  - Material selection summary.
- Footer:
  - Submit and cancel actions.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Selected material identifiers.<br>• Post-learning configuration or content-generation options.<br>• Submit state and generation feedback. |
| 2 | Validation Rules | • The user must select valid materials before submission.<br>• Required post-learning creation inputs must be complete and valid. |
| 3 | Business Rules | • Post-learning output is generated within the current workspace scope.<br>• After success, the workspace should return the user to a meaningful post-learning state, such as the updated list or the newly created output. |
| 4 | Normal Case | • The user opens the create form.<br>• The user selects materials and configures the request.<br>• The user submits the form.<br>• A new post-learning artifact is created and becomes available in the workspace. |
| 5 | Abnormal Cases | • No eligible materials are available.<br>• Validation fails.<br>• Content generation fails. |
Source of Truth:
- Component: [CreatePostLearningForm.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/CreatePostLearningForm.jsx:1)

## IND-22 Question Stats

Function Trigger:
- Sidebar Trigger: The user selects `Question Stats`.
- Analytics Trigger: The shell enables this item only when the current plan includes workspace analytics.

Function Description:
- Actor: USER.
- Purpose: To show question-level and workspace-level learning analytics that help the user identify strengths, weaknesses, and areas requiring review.
- Interface: A read-only analytics dashboard rendered inside the workspace shell.
- Data Processing:
  - Uses workspace analytics and question-statistics API flows.

Screen Layout:
- Summary Area:
  - High-level performance cards.
- Analytics Area:
  - Question or category breakdown.
  - Trend or accuracy information.
- Empty or Gated State:
  - No-data message.
  - Plan limitation explanation when analytics are not enabled.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Accuracy metrics.<br>• Attempt counts.<br>• Question categories or classification buckets.<br>• Performance summaries and filters where exposed. |
| 2 | Validation Rules | • The analytics screen requires both valid workspace context and the corresponding entitlement.<br>• The view must tolerate legitimate no-data states without failing to render. |
| 3 | Business Rules | • This is a read-only screen.<br>• Sidebar availability is controlled by the `hasWorkspaceAnalytics` entitlement.<br>• The user may see an empty analytics state even when access is allowed, for example before enough study activity exists. |
| 4 | Normal Case | • The user opens the analytics view.<br>• The app loads the available performance data.<br>• The user reviews overall accuracy and question-level insights.<br>• The user uses the results to decide what to revisit next in the workspace. |
| 5 | Abnormal Cases | • The plan does not include analytics.<br>• No analytics data exists yet.<br>• Analytics loading fails. |
Source of Truth:
- Component: [QuestionStatsView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/QuestionStatsView.jsx:1)
- Entitlement Use: [WorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/WorkspacePage.jsx:1)

## IND-23 Workspace Onboarding Update Guard Dialog

Function Trigger:
- Update Trigger: The user requests to edit workspace onboarding or profile data after the workspace already contains documents.
- Risk Trigger: If the workspace also contains quizzes, flashcards, or roadmap data, the dialog escalates into a second confirmation step before deletion.

Function Description:
- Actor: USER.
- Purpose: To prevent accidental onboarding/profile updates that would invalidate the current workspace data model and require destructive cleanup first.
- Interface: A two-step warning dialog with contextual messaging, deletion confirmation, and automatic handoff back into the profile-configuration flow after cleanup succeeds.
- Data Processing:
  - Workspace-risk inspection based on current material count and learning-data presence.
  - Destructive reset flow through `handleDeleteMaterialsForProfileUpdate`.
  - Follow-up reopening of the profile-configuration dialog.

Screen Layout:
- Step 1:
  - Warning icon and title.
  - Explanation that existing documents block onboarding updates.
  - `Delete documents` CTA.
- Step 2:
  - Elevated data-loss warning when learning artifacts also exist.
  - `Back`, `Cancel`, and `Confirm delete` actions.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `materialCount`: Number of current documents in the workspace.<br>• `hasLearningData`: Boolean flag indicating whether quizzes, flashcards, or roadmap data also exist and would be lost.<br>• `step`: Internal dialog step, either `materials` or `data-loss`.<br>• `deleting`: Loading state while destructive cleanup is running.<br>• `currentLang` and `isDarkMode`: Presentation and localized-copy controls. |
| 2 | Validation Rules | • The dialog is meaningful only when the workspace already has at least one material blocking onboarding updates.<br>• The destructive action must stay disabled while the reset flow is already running.<br>• If `hasLearningData=true`, the flow must pass through the second confirmation step before deletion can proceed.<br>• The dialog should not close through normal dismiss actions while the deletion request is in progress. |
| 3 | Business Rules | • Updating onboarding is blocked when the workspace already contains documents, because those documents drive downstream personalization and generation state.<br>• If the workspace also has quizzes, flashcards, or roadmap content, the user must explicitly acknowledge that all current learning data will be lost.<br>• Confirming deletion removes quizzes, flashcards, roadmap structure, and materials, then reopens the onboarding/profile configuration flow automatically.<br>• The dialog is a protective guard; it does not itself edit onboarding values. |
| 4 | Normal Case | • The user requests a profile or onboarding update.<br>• The workspace detects existing documents and opens the guard dialog.<br>• The user confirms document deletion and, if needed, confirms the second data-loss warning.<br>• The app deletes the current learning assets, closes the guard, and reopens the onboarding dialog in update mode. |
| 5 | Abnormal Cases | • Cleanup fails while deleting one or more quiz, flashcard, roadmap, or material records.<br>• The user cancels at step 1 or step 2.<br>• Workspace data becomes inconsistent during reset and the onboarding dialog cannot be reopened automatically. |
Source of Truth:
- Shared Dialog: [WorkspaceOnboardingUpdateGuardDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Components/workspace/WorkspaceOnboardingUpdateGuardDialog.jsx)
- Reset Flow: [WorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/WorkspacePage.jsx:1570)

## IND-24 Roadmap Config Edit Dialog

Function Trigger:
- UI Trigger: The user clicks the roadmap configuration edit action from the roadmap workspace view.
- Setup Trigger: The workspace can open this dialog when roadmap configuration must be completed before downstream roadmap operations continue.

Function Description:
- Actor: USER.
- Purpose: To create or update the roadmap configuration that drives roadmap pacing, scope, and daily-study recommendations for the personal workspace.
- Interface: A large dialog with roadmap configuration fields, validation feedback, optional AI suggestion controls, and a save-confirmation sub-dialog.
- Data Processing:
  - Loads normalized initial values from the workspace profile or roadmap config.
  - Validates values through `validateRoadmapConfigValues(...)`.
  - Persists updates through `updateRoadmapConfig(roadmapId, values)`.
  - Resets the existing roadmap structure after config changes so roadmap phases can be regenerated from the new setup.

Screen Layout:
- Main Dialog:
  - Dialog title and close action.
  - Roadmap configuration form fields.
  - Save action.
- Confirmation Layer:
  - Confirmation title and warning text.
  - Cancel or confirm-save actions.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `knowledgeLoad`: Coverage level such as `BASIC`, `INTERMEDIATE`, or `ADVANCED`.<br>• `adaptationMode`: Adaptation strategy value, for example balanced or flexible behavior.<br>• `roadmapSpeedMode`: Speed setting such as `SLOW`, `STANDARD`, or `FAST`.<br>• `estimatedTotalDays`: Planned total study duration in days.<br>• `recommendedMinutesPerDay`: Suggested daily study time in minutes.<br>• `preLearningRequired`: Optional flag preserved when present.<br>• UI state: `saving`, field-level `errors`, dialog-level `saveError`, and confirmation state. |
| 2 | Validation Rules | • `knowledgeLoad` is required.<br>• `adaptationMode` is required.<br>• `roadmapSpeedMode` is required.<br>• `estimatedTotalDays` must be a number greater than `0`.<br>• `recommendedMinutesPerDay` must be a number greater than `0`.<br>• The dialog cannot proceed to the confirm-save step until validation passes. |
| 3 | Business Rules | • Editing roadmap configuration updates the roadmap-planning contract for the workspace and therefore invalidates the existing roadmap structure.<br>• After a successful save, the workspace resets the existing roadmap phases, reloads profile state, and refreshes roadmap data so the new config becomes authoritative.<br>• The personal workspace version of this dialog currently focuses on edit/update mode and does not expose the group-only AI suggestion entry point.<br>• The form recalculates dependent roadmap values as the user changes key fields, keeping roadmap pacing internally consistent. |
| 4 | Normal Case | • The user opens the roadmap config dialog from the roadmap view.<br>• The dialog loads the current roadmap values.<br>• The user adjusts knowledge amount, adaptation mode, speed, total days, and minutes per day.<br>• The user confirms save.<br>• The app updates roadmap config, resets outdated roadmap structure, reloads profile data, and returns the user to the roadmap view. |
| 5 | Abnormal Cases | • The workspace has no current roadmap identifier, so save cannot proceed.<br>• Field validation fails and the dialog stays open with inline errors.<br>• Saving fails and the dialog displays a recoverable error state.<br>• The roadmap structure reset fails after the config update, leaving roadmap data temporarily stale until reload. |
Source of Truth:
- Shared Dialog: [RoadmapConfigEditDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Components/workspace/RoadmapConfigEditDialog.jsx)
- Save Flow: [WorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/WorkspacePage.jsx:1547)
- Utilities: [roadmapConfigUtils.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Components/workspace/roadmapConfigUtils.js)

## IND-25 Roadmap Phase Generate Dialog

Function Trigger:
- Roadmap Trigger: The user clicks the roadmap action that generates phases from selected materials.
- Context Trigger: The roadmap canvas can open this dialog with preselected material IDs based on the current roadmap working set.

Function Description:
- Actor: USER.
- Purpose: To upload additional materials if needed, choose eligible existing materials, and start AI generation for roadmap phases inside the personal workspace.
- Interface: A dialog with drag-and-drop upload, selected-file preview, existing-material multi-select, and a submit action that starts roadmap-phase generation.
- Data Processing:
  - Optional upload of newly added files through `uploadMaterial(...)`.
  - Refresh of workspace materials through `fetchSources()`.
  - Phase-generation request through `generateRoadmapPhases({ roadmapId, materialIds })` inside `useWorkspaceRoadmapManager`.

Screen Layout:
- Upload Zone:
  - Drag-and-drop area.
  - File-picker entry point.
- Selected Files Panel:
  - Pending upload file list.
  - Remove-file action.
- Existing Materials Panel:
  - Active and inactive material list with status badges.
  - Multi-select and `Select all` controls.
- Footer:
  - Selection counter.
  - Cancel and `Create phase` actions.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `selectedFiles`: Files newly attached for upload in the dialog.<br>• `materials`: Existing workspace materials with status metadata.<br>• `selectedMaterialIds`: Deduplicated IDs of the currently selected existing materials.<br>• `defaultSelectedMaterialIds`: Parent-provided initial selection.<br>• `submitting`: Submission/loading state while uploads or generation requests are running.<br>• Material status model: only `ACTIVE` materials are eligible for selection and phase generation. |
| 2 | Validation Rules | • The user must provide at least one uploaded file or one selected existing material before submission is enabled.<br>• After upload, roadmap generation still requires at least one `ACTIVE` material in the refreshed material list.<br>• Only valid positive integer material IDs can be submitted to the generation API.<br>• If the workspace profile or roadmap identifier cannot be resolved, the flow must redirect the user back into profile setup rather than submitting invalid generation requests. |
| 3 | Business Rules | • The dialog supports a combined flow: upload new documents first, then start roadmap-phase generation from the refreshed eligible material set.<br>• Material statuses are important: non-`ACTIVE` materials remain visible but cannot be selected for generation.<br>• Successful submission closes the dialog, clears the selected roadmap phase focus, and returns the user to the roadmap canvas while background generation progress begins.<br>• The personal workspace implementation keeps progress state in `useWorkspaceRoadmapManager` so the roadmap canvas can continue tracking generation after the dialog closes. |
| 4 | Normal Case | • The user opens the roadmap phase dialog.<br>• The user selects one or more existing `ACTIVE` materials or uploads new files.<br>• The app refreshes the sources if uploads were added.<br>• The user clicks `Create phase`.<br>• The workspace starts roadmap-phase generation, closes the dialog, and returns to the roadmap view with generation progress visible. |
| 5 | Abnormal Cases | • No material is selected.<br>• Uploaded files never become `ACTIVE`, so generation is blocked.<br>• The workspace cannot resolve a roadmap identifier and reopens onboarding/profile setup instead.<br>• Upload or phase-generation API calls fail and the dialog remains available for retry. |
Source of Truth:
- Dialog: [RoadmapPhaseGenerateDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/RoadmapPhaseGenerateDialog.jsx)
- Orchestration Hook: [useWorkspaceRoadmapManager.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/hooks/useWorkspaceRoadmapManager.js:695)
- Page Mount: [WorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/WorkspacePage.jsx:2793)
