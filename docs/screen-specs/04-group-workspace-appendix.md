# Group Workspace Specifications Appendix

Continuation of [04-group-workspace.md](04-group-workspace.md). Split to keep markdown instruction/spec files under 1000 lines.

## GRP-27 Group Profile Setup Gate / Config Dialog

Function Trigger:
- Guard Trigger: The group workspace detects that mandatory profile setup has not been completed.
- UI Trigger: A leader explicitly opens the profile setup or profile update flow.

Function Description:
- Actor: USER (Leader).
- Purpose: To collect and confirm the group-level learning profile required before protected study sections can be fully used.
- Interface: A gated setup experience composed of a blocking workspace state plus a configuration dialog.
- Data Processing:
  - Group workspace profile retrieval and normalization.
  - Roadmap-configuration suggestion and setup flows.

Screen Layout:
- Gate State:
  - Blocking message.
  - Explanation of why setup is required.
  - Open-setup call-to-action.
- Config Dialog:
  - Group learning configuration fields.
  - Save and confirm actions.
- Follow-up:
  - Return to the unlocked group section after completion.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Group profile summary fields.<br>• Suggested roadmap configuration values.<br>• Current setup or completion status.<br>• Lock or dependency indicators. |
| 2 | Validation Rules | • Required group profile fields must be complete before confirmation.<br>• The setup dialog must not confirm an incomplete profile state.<br>• Update operations should tolerate partially existing profile data when the leader is editing rather than creating from scratch. |
| 3 | Business Rules | • While profile setup is incomplete, some group sections remain blocked.<br>• Only leaders should be able to complete the setup that unlocks the workspace for the group.<br>• Profile changes may be restricted later if shared study content already depends on the current configuration.<br>• The gate must clearly separate first-time mandatory setup from later maintenance edits. |
| 4 | Normal Case | • The leader enters a group workspace that requires setup.<br>• The gate explains the requirement.<br>• The leader opens the configuration dialog.<br>• The leader completes and confirms the profile.<br>• The protected sections become available. |
| 5 | Abnormal Cases | • Profile retrieval fails.<br>• Suggested configuration fails to load.<br>• Save or confirm fails.<br>• The profile is update-locked because of existing dependent workspace state. |
Source of Truth:
- Page: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:1)
- Dialog: [GroupWorkspaceProfileConfigDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/GroupWorkspaceProfileConfigDialog.jsx:1)
- Related Mirror Panel: [GroupWorkspaceProfileConfigMirror.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/GroupWorkspaceProfileConfigMirror.jsx:1)



## GRP-28 Workspace Onboarding Update Guard Dialog

Function Trigger:
- Update Trigger: A leader requests to edit the group onboarding/profile setup after documents already exist in the workspace.
- Risk Trigger: If the group workspace also contains learning artifacts such as quizzes, flashcards, or roadmap data, the dialog adds a destructive confirmation step before reset.

Function Description:
- Actor: USER (Leader).
- Purpose: To protect the group workspace from accidental onboarding/profile changes that would invalidate the current shared documents and dependent learning content.
- Interface: A two-step destructive-warning dialog reused from the shared workspace layer, opened above the group workspace shell.
- Data Processing:
  - Learns `materialCount` and `groupHasLearningData` from the group workspace state.
  - Executes destructive cleanup through `handleDeleteMaterialsForGroupProfileUpdate`.
  - Reopens the group profile-configuration dialog after successful reset.

Screen Layout:
- Step 1:
  - Warning icon and explanation that current documents block onboarding updates.
  - `Delete documents` CTA.
- Step 2:
  - Elevated warning that shared learning data will also be deleted.
  - `Back`, `Cancel`, and `Confirm delete` actions.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `materialCount`: Number of current documents in the group workspace.<br>• `hasLearningData`: Boolean indicating whether quizzes, flashcards, or roadmap content would also be lost.<br>• `step`: Internal step state used by the shared guard dialog.<br>• `deleting`: Loading state while reset is executing.<br>• `currentLang` and `isDarkMode`: Localization and theming inputs. |
| 2 | Validation Rules | • The guard should only open when a real profile-update request collides with existing materials.<br>• The destructive action must stay disabled while reset is already in progress.<br>• If `hasLearningData=true`, the flow must pass through the second confirmation step before deletion can execute.<br>• Only leader-authorized flows should be able to reach the actual destructive reset path. |
| 3 | Business Rules | • Group onboarding/profile updates are blocked when current shared documents would invalidate the learning setup.<br>• Confirming deletion removes group quizzes, flashcards, roadmap structure, and current documents so the group profile can be updated cleanly.<br>• After reset succeeds, the guard closes and the group profile-configuration dialog reopens automatically.<br>• This dialog is a safety gate and does not itself edit profile values. |
| 4 | Normal Case | • A leader requests a group profile update.<br>• The workspace detects existing documents and opens the guard dialog.<br>• The leader confirms deletion and acknowledges data loss if the second step appears.<br>• The app resets the current shared learning assets and reopens the group setup dialog. |
| 5 | Abnormal Cases | • Reset fails while deleting quizzes, flashcards, roadmap data, or materials.<br>• The leader cancels at step 1 or step 2.<br>• The profile dialog cannot reopen after reset because group profile reload fails. |
Source of Truth:
- Shared Dialog: [WorkspaceOnboardingUpdateGuardDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Components/workspace/WorkspaceOnboardingUpdateGuardDialog.jsx)
- Reset Flow: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:3183)

## GRP-29 Group Workspace Credit Gate Modal

Function Trigger:
- Credit Trigger: The user attempts a group action that consumes workspace credits while the current group credit balance is insufficient.
- Branch Trigger: This modal appears specifically when a paid group plan exists but there is not enough workspace credit for the requested action.

Function Description:
- Actor: USER.
- Purpose: To explain that the group wallet balance is too low for the requested operation and guide the user into the group-wallet purchase flow.
- Interface: A compact modal with credit-warning copy, a primary wallet CTA, and a secondary dismiss action.
- Data Processing:
  - Receives open state, theme, language, and the wallet CTA callback from `GroupWorkspacePage`.
  - On primary action, routes the user into the group wallet or credit-purchase flow.

Screen Layout:
- Icon and warning title.
- Short explanation of the insufficient-credit state.
- `Open group wallet` primary action.
- `Later` secondary action.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `open`: Modal visibility state.<br>• `lang`: Language flag used to switch modal copy.<br>• `isDarkMode`: Theme variant for presentation.<br>• `onPrimary`: Callback that opens the next wallet or purchase step.<br>• Implicit credit-gate context from the parent flow that determined balance is insufficient. |
| 2 | Validation Rules | • The modal should only open after the parent flow has already confirmed that group credits are insufficient.<br>• The primary action should only be shown when a valid follow-up wallet path or callback exists.<br>• Dismiss actions must remain available even if the user cannot purchase immediately. |
| 3 | Business Rules | • This modal is different from a no-plan gate: it is used when a paid group plan exists but the current credit balance is too low.<br>• The modal itself does not calculate balance; it only communicates the gating result and routes the user forward.<br>• The primary CTA should take the user to a group financial-management flow rather than a generic personal wallet page. |
| 4 | Normal Case | • The user triggers a credit-consuming group action.<br>• The parent flow detects insufficient group credits and opens the modal.<br>• The user clicks `Open group wallet`.<br>• The app navigates to the wallet or credit-purchase flow. |
| 5 | Abnormal Cases | • The user dismisses the modal and abandons the action.<br>• The wallet callback fails to navigate.<br>• The parent flow opens the modal without enough context to continue into purchase, leaving it informational only. |
Source of Truth:
- Modal: [GroupWorkspaceCreditGateModal.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/GroupWorkspaceCreditGateModal.jsx)
- Parent Mount: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:4825)

## GRP-30 Roadmap Config Edit Dialog

Function Trigger:
- Setup Trigger: The leader opens roadmap setup because the group has not configured roadmap planning yet.
- Edit Trigger: The leader clicks the roadmap configuration edit action from the roadmap studio.

Function Description:
- Actor: USER (Leader or authorized creator).
- Purpose: To set up or update the group roadmap configuration that controls roadmap scope, pacing, and daily-study recommendations for the shared group roadmap.
- Interface: A large shared dialog with roadmap fields, validation feedback, a save-confirmation layer, and an optional AI suggestion panel.
- Data Processing:
  - Setup mode: `setupGroupRoadmapConfig(workspaceId, values)`
  - Edit mode: `updateGroupRoadmapConfig(roadmapId, values)`
  - AI suggestion: `suggestGroupRoadmapConfig(workspaceId)`
  - After save, the group roadmap structure is reset and group profile/config state is reloaded.

Screen Layout:
- Main Dialog:
  - Dialog title and close action.
  - AI suggestion card when supported.
  - Roadmap configuration form fields.
  - Save action.
- Confirmation Layer:
  - Setup or update warning message.
  - Cancel and confirm actions.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `knowledgeLoad`: Planned knowledge volume for the group roadmap.<br>• `adaptationMode`: Shared roadmap style or adaptation behavior.<br>• `roadmapSpeedMode`: Group roadmap speed mode.<br>• `estimatedTotalDays`: Total expected roadmap duration.<br>• `recommendedMinutesPerDay`: Recommended study minutes per day.<br>• `preLearningRequired`: Optional recommendation flag when present.<br>• Dialog mode: `setup` or `edit`.<br>• UI state: `saving`, field-level `errors`, `saveError`, `suggesting`, `suggestError`, and `suggestionMeta`. |
| 2 | Validation Rules | • `knowledgeLoad` is required.<br>• `adaptationMode` is required.<br>• `roadmapSpeedMode` is required.<br>• `estimatedTotalDays` must be greater than `0`.<br>• `recommendedMinutesPerDay` must be greater than `0`.<br>• The save-confirmation step cannot open while validation errors remain.<br>• Edit mode requires a valid current roadmap identifier before save can proceed. |
| 3 | Business Rules | • In `setup` mode, the dialog stores the first roadmap-planning contract for the group workspace.<br>• In `edit` mode, saving updates the roadmap config and then resets the current roadmap structure so future phases match the new settings.<br>• The group version exposes AI-assisted suggestions that can prefill roadmap values and recommendation notes before save.<br>• Only users with content-creation authority should be able to enter the save path.<br>• After a successful save, the workspace reloads group profile, roadmap config, and roadmap view state so the shared studio reflects the new configuration immediately. |
| 4 | Normal Case | • A leader opens roadmap setup or edit.<br>• The dialog loads current values or defaults.<br>• The leader optionally asks AI for a suggested configuration.<br>• The leader adjusts roadmap values and confirms save.<br>• The app persists the config, refreshes group roadmap state, and returns to the roadmap studio. |
| 5 | Abnormal Cases | • Validation fails and inline errors remain on the form.<br>• The group workspace has no valid `workspaceId` or `roadmapId` for the requested mode.<br>• AI suggestion fails and the dialog falls back to manual editing.<br>• Save succeeds but roadmap-structure reset or profile reload fails, leaving the studio temporarily stale until refresh. |
Source of Truth:
- Shared Dialog: [RoadmapConfigEditDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Components/workspace/RoadmapConfigEditDialog.jsx)
- Parent Save Flow: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:3743)
- Utilities: [roadmapConfigUtils.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Components/workspace/roadmapConfigUtils.js)

## GRP-31 Roadmap Config Summary Dialog

Function Trigger:
- View Trigger: The user clicks the roadmap configuration summary action from the group roadmap studio.

Function Description:
- Actor: USER.
- Purpose: To present the currently applied roadmap configuration for the group in a read-only summary before the user decides whether to edit it.
- Interface: A read-only dialog with compact summary cards for each core roadmap-planning dimension.
- Data Processing:
  - Receives normalized roadmap-config values from `GroupWorkspacePage`.
  - Derives display labels through `extractRoadmapConfigValues(...)` and i18n lookup.

Screen Layout:
- Dialog header with title and description.
- Summary-card grid:
  - Knowledge amount.
  - Adaptation mode.
  - Roadmap speed.
  - Estimated total days.
  - Suggested minutes per day.
- Footer with close action.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `knowledgeLoad`.<br>• `adaptationMode`.<br>• `roadmapSpeedMode`.<br>• `estimatedTotalDays`.<br>• `recommendedMinutesPerDay`.<br>• `open`, `isDarkMode`, and localization state used for presentation. |
| 2 | Validation Rules | • The dialog must tolerate partially configured or missing values by rendering `Not set` style placeholders.<br>• Display labels should be derived defensively so translation or normalization failures do not break the dialog layout. |
| 3 | Business Rules | • This dialog is read-only; it does not mutate roadmap configuration directly.<br>• It exists so users can quickly inspect the current roadmap contract without opening the full edit form.<br>• The values shown here should match the latest group roadmap config loaded into the parent workspace state. |
| 4 | Normal Case | • The user clicks the roadmap config summary action.<br>• The dialog opens and shows the current roadmap settings in card form.<br>• The user reviews the values and closes the dialog or decides to open the edit flow afterward. |
| 5 | Abnormal Cases | • Some roadmap-config values are missing and the dialog shows fallback placeholders.<br>• Parent state is stale, so the dialog briefly shows outdated values until the next refresh cycle. |
Source of Truth:
- Shared Dialog: [RoadmapConfigSummaryDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Components/workspace/RoadmapConfigSummaryDialog.jsx)
- Parent Mount: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:4856)

## GRP-32 Roadmap Phase Generate Dialog

Function Trigger:
- Roadmap Trigger: The user clicks the roadmap action that generates phases for the current group roadmap.
- Setup Trigger: If the group has not configured roadmap planning yet, the parent flow diverts first into roadmap setup before phase generation can continue.

Function Description:
- Actor: USER.
- Purpose: To upload extra source files if needed, select eligible existing group materials, and start AI generation for new roadmap phases in the shared roadmap studio.
- Interface: A dialog with drag-and-drop upload, selected-file preview, existing-material multi-select, and a submit action that starts roadmap-phase generation.
- Data Processing:
  - Optional upload of new files through the group upload flow.
  - Material refresh through the group workspace source-loading logic.
  - Phase-generation request through `generateRoadmap({ roadmapId, materialIds })`.

Screen Layout:
- Upload Zone:
  - Drag-and-drop target.
  - File-picker entry point.
- Selected Files Panel:
  - Pending upload list.
  - Remove-file action.
- Existing Materials Panel:
  - Current group materials with status labels.
  - Multi-select and `Select all` controls.
- Footer:
  - Selection counter.
  - Cancel and `Create phase` actions.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `selectedFiles`: New files attached in the dialog before upload.<br>• `materials`: Current group materials with status metadata.<br>• `selectedMaterialIds`: Deduplicated selection of existing group materials.<br>• `defaultSelectedMaterialIds`: Parent-provided starting selection.<br>• `submitting`: Loading state while uploads or roadmap-generation requests are executing.<br>• `currentRoadmapId` and group roadmap-config availability supplied by the parent workspace flow. |
| 2 | Validation Rules | • The user must provide at least one uploaded file or one selected existing material before submit is enabled.<br>• Only `ACTIVE` or otherwise review-approved materials may be selected for roadmap generation.<br>• If roadmap configuration has not been set up yet, submission must stop and reroute to roadmap setup rather than sending an invalid phase-generation request.<br>• Role checks must block members who do not have content-creation permission from entering the real generation path. |
| 3 | Business Rules | • The dialog supports a combined workflow: upload new files, refresh sources, then start phase generation from the selected eligible material set.<br>• The group implementation respects group role permissions before allowing roadmap-phase creation.<br>• Material status matters: the dialog shows all materials, but only valid reviewable items can drive generation.<br>• If generation starts successfully, the dialog closes and the group roadmap studio tracks progress in the background. |
| 4 | Normal Case | • A leader or authorized creator opens the roadmap phase dialog.<br>• The user selects existing group materials or uploads new files.<br>• The workspace refreshes the material inventory if uploads were added.<br>• The user clicks `Create phase`.<br>• The group roadmap generation starts, the dialog closes, and the roadmap studio begins showing progress. |
| 5 | Abnormal Cases | • A read-only member attempts to generate roadmap phases and is blocked.<br>• No eligible material is selected.<br>• Roadmap config has not been created yet, so the flow is redirected into setup.<br>• Upload or generation APIs fail and the dialog remains available for retry. |
Source of Truth:
- Dialog: [RoadmapPhaseGenerateDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/RoadmapPhaseGenerateDialog.jsx)
- Parent Flow: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:3654)
