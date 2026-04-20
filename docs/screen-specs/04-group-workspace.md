# Group Workspace Specifications

## GRP-01 Group Dashboard

Function Trigger:
- Route Trigger: The user opens `/group-workspaces/:workspaceId` with the section resolved to `dashboard`.
- Role Trigger: Leader users land here as the primary management-oriented dashboard.

Function Description:
- Actor: USER (Leader view).
- Purpose: To provide a high-level operational summary of the group workspace, including member activity, analytics, and quick access to other management sections.
- Interface: A dashboard tab rendered inside the group workspace shell with summary cards, compact analytics, and navigation shortcuts.
- Data Processing:
  - Group summary data loaded through the group workspace page.
  - Member and analytics data used by `GroupDashboardTab`.

Screen Layout:
- Summary Area:
  - Workspace overview cards.
  - Member and participation indicators.
- Analytics Area:
  - Compact charts or metric blocks.
- Action Area:
  - Quick links to member statistics and related management sections.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Group name and high-level metadata.<br>• Member count and member status snapshots.<br>• Analytics cards such as participation, activity, or performance summaries.<br>• Group-level activity highlights. |
| 2 | Validation Rules | • The active section must resolve to a valid group dashboard state.<br>• Dashboard analytics should not render as authoritative until group context and member data are loaded. |
| 3 | Business Rules | • This dashboard is intended for leaders, not regular members.<br>• If a non-leader reaches the dashboard route, the app must redirect or fall back to a role-safe personal view.<br>• The dashboard acts as a management landing page rather than a study-content editor. |
| 4 | Normal Case | • A leader opens the group workspace.<br>• The app resolves the dashboard section.<br>• Summary cards and analytics render.<br>• The leader uses dashboard shortcuts to navigate deeper into member or content management. |
| 5 | Abnormal Cases | • Dashboard analytics fail to load.<br>• Member data is incomplete.<br>• A non-leader attempts to open the dashboard section. |
Source of Truth:
- Page: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:1)
- Component: [GroupDashboardTab.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Group_leader/GroupDashboardTab.jsx:1)

## GRP-02 Personal Dashboard

Function Trigger:
- Route Trigger: The group workspace resolves to `personalDashboard`.
- Role Trigger: Members are routed here instead of the leader dashboard.

Function Description:
- Actor: USER.
- Purpose: To show the current learner's own snapshot and recent activity inside the group workspace.
- Interface: A role-safe dashboard view focused on the current user rather than the whole group.
- Data Processing:
  - Personal learning snapshot.
  - Current-user activity and progress data.

Screen Layout:
- Personal Summary:
  - Progress indicators.
  - Performance metrics.
- Activity Area:
  - Recent group-related learning events for the current user.
- Secondary Actions:
  - Links into quiz or study areas where relevant.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Current-user attempts and participation counts.<br>• Personal score, pass rate, or learning streak indicators where available.<br>• Recent activity items tied to the group workspace. |
| 2 | Validation Rules | • The group workspace must resolve a valid current user before rendering personalized metrics.<br>• Personal metrics must tolerate no-data states for new members. |
| 3 | Business Rules | • This is the default safe landing area for regular members.<br>• Members should not gain access to leader-only dashboard controls from this view.<br>• The personal dashboard emphasizes self-progress inside the group rather than global team administration. |
| 4 | Normal Case | • A member opens the group workspace.<br>• The app routes the member to the personal dashboard.<br>• Personal progress and recent activity render.<br>• The member navigates onward into study content from there. |
| 5 | Abnormal Cases | • Personal snapshot data is unavailable.<br>• The group context loads but the personal metrics request fails.<br>• A new member has no study data yet. |
Source of Truth:
- Page: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:1)

## GRP-03 Group Documents Tab

Function Trigger:
- Sidebar Trigger: The user selects `Documents`.
- Role Trigger: Both leaders and members can access this section, but leader actions are richer.

Function Description:
- Actor: USER.
- Purpose: To manage shared group materials, review pending uploads, and keep the group's study document inventory up to date.
- Interface: A document-management tab with approved documents, pending review items, and upload controls.
- Data Processing:
  - Approved Materials: `getMaterialsByWorkspace`
  - Pending Review: `getPendingGroupMaterials`
  - Review Action: `reviewGroupMaterial`
  - Delete Action: `deleteMaterial`

Screen Layout:
- Approved Documents Area:
  - Active material list.
- Pending Review Area:
  - Review queue for leader approval or rejection.
- Utility Area:
  - Upload action.
  - Refresh action.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Approved material metadata.<br>• Pending review item metadata.<br>• Review status and moderation status.<br>• Upload permission state and role context. |
| 2 | Validation Rules | • Review actions require a valid material identifier and a role with review authority.<br>• Delete actions require a valid material identifier.<br>• Upload entry points must respect role and workspace-permission checks. |
| 3 | Business Rules | • Leaders can review pending material and decide whether it becomes part of the shared group material set.<br>• Members may see a more limited version of the tab depending on permission and role.<br>• Newly approved materials become available to downstream study tools such as roadmap, quiz, flashcard, and mock test.<br>• Uploading a file does not automatically mean it is ready for shared study use; it may first enter a pending or processing queue. |
| 4 | Normal Case | • The user opens the documents tab.<br>• Approved materials render.<br>• If the user is a leader, pending review items also appear.<br>• The leader approves or rejects pending items, or the user uploads additional files. |
| 5 | Abnormal Cases | • No approved documents exist.<br>• No pending items exist.<br>• Review action fails.<br>• Delete action fails.<br>• Material loading fails. |
Source of Truth:
- Component: [GroupDocumentsTab.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/GroupDocumentsTab.jsx:1)
- Pending Review Support: [GroupPendingReviewPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Group_leader/GroupPendingReviewPanel.jsx:1)
- API: [MaterialAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/MaterialAPI.js:1)

## GRP-04 Group Source Detail

Function Trigger:
- UI Trigger: The user opens a document from the group documents tab.

Function Description:
- Actor: USER.
- Purpose: To inspect a single group material in detail, including moderation state, readiness, and any review-related information.
- Interface: A detail view within the group document flow with metadata, review insight, and back navigation.
- Data Processing:
  - Uses source-level material data from the group document flow.

Screen Layout:
- Header:
  - Back action.
  - Document title.
- Metadata Section:
  - File information and status.
- Review Section:
  - Moderation detail.
  - Leader action hints when relevant.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Source title and file metadata.<br>• Material status and moderation outcome.<br>• Review notes or warning state.<br>• Group-specific access or plan gate hints where relevant. |
| 2 | Validation Rules | • The detail screen requires a valid selected material payload.<br>• Optional review or moderation fields must not break the layout when absent. |
| 3 | Business Rules | • Leaders may have additional review-related actions or context.<br>• Members should still be able to read the approved material detail appropriate to their permissions.<br>• Returning from detail should preserve the broader document-flow context. |
| 4 | Normal Case | • The user selects a document from the list.<br>• The detail screen opens.<br>• The user reviews metadata and status.<br>• The user returns to the documents tab. |
| 5 | Abnormal Cases | • The selected document payload is missing.<br>• Moderation or review data is incomplete.<br>• The source status is stale relative to the latest group review result. |
Source of Truth:
- Component: [SourceDetailView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/SourceDetailView.jsx:1)
- Documents Flow: [GroupDocumentsTab.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/GroupDocumentsTab.jsx:1)

## GRP-05 Upload Source Dialog

Function Trigger:
- UI Trigger: The user clicks the upload action from the documents tab or another source-related group flow.

Function Description:
- Actor: USER.
- Purpose: To add new files into the group workspace, usually for shared study content after review or processing.
- Interface: A modal upload dialog with file selection, accepted file guidance, progress feedback, and submit controls.
- Data Processing:
  - Upload Pending Group Material: `uploadGroupPendingMaterial`

Screen Layout:
- Upload Area:
  - File picker or drag-and-drop target.
  - Accepted extension guidance.
- Selected Files Area:
  - Selected file list.
  - Remove-before-submit controls.
- Footer:
  - Upload.
  - Cancel.
  - Progress and result feedback.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Selected file list.<br>• File names, extensions, and sizes.<br>• Upload progress and failure details.<br>• `workspaceId` identifying the group workspace target.<br>• Permission state for the current user. |
| 2 | Validation Rules | • File extensions must belong to the accepted group-upload allowlist.<br>• The user must have permission to upload into the group workspace.<br>• At least one valid file must be selected before upload can start. |
| 3 | Business Rules | • Uploaded files can enter a pending-review flow before becoming approved group materials.<br>• Upload capability can depend on role, contributor rights, or group settings.<br>• Workspace credit or plan conditions can block uploads and must surface a readable error. |
| 4 | Normal Case | • The user opens the upload dialog.<br>• The user selects valid files.<br>• The upload is submitted.<br>• The app shows progress.<br>• The document inventory refreshes and the newly uploaded item appears in the appropriate queue. |
| 5 | Abnormal Cases | • Unsupported extension.<br>• No upload permission.<br>• Insufficient workspace credits.<br>• Network interruption.<br>• Backend upload failure. |
Source of Truth:
- Dialog: [UploadSourceDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/UploadSourceDialog.jsx:1)
- Page Flow: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:1)

## GRP-06 Members Tab

Function Trigger:
- Sidebar Trigger: A leader selects `Members`.

Function Description:
- Actor: USER (Leader).
- Purpose: To manage the membership of the group workspace, including invitations, upload permissions, role changes, and member removal.
- Interface: A management table with member rows, invitation summaries, and invite controls.
- Data Processing:
  - Group member loading and mutation flows.
  - Invite, remove, update-role, grant-upload, and revoke-upload actions.

Screen Layout:
- Member Table:
  - Member identity.
  - Role.
  - Upload permission.
  - Actions.
- Invitation Area:
  - Pending invitations.
  - Resend and cancel controls.
- Utility Area:
  - Invite member button.
  - Seat usage summary.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Member identity and profile display fields.<br>• Group role.<br>• Upload permission state.<br>• Pending invitation summary.<br>• Seat limit, used seats, and remaining seats. |
| 2 | Validation Rules | • Member-management actions require valid member identifiers.<br>• Role and permission mutations require leader authority.<br>• Invitation-related actions require valid invitation state. |
| 3 | Business Rules | • Only leaders should see this tab.<br>• Role changes and upload-permission changes are group-governance actions and must respect the backend's authorization rules.<br>• Seat limits affect whether the group can invite additional members.<br>• Pending invitations are part of the membership lifecycle and should remain visible until accepted, resent, or canceled. |
| 4 | Normal Case | • A leader opens the members tab.<br>• The app loads accepted members and pending invitations.<br>• The leader adjusts roles or upload permissions.<br>• The leader invites another member if seats remain. |
| 5 | Abnormal Cases | • Member loading fails.<br>• Seat limit is reached.<br>• An invitation action fails.<br>• A member action is rejected by the server. |
Source of Truth:
- Component: [GroupMembersTab.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Group_leader/GroupMembersTab.jsx:1)
- Page Flow: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:1)

## GRP-07 Invite Member Dialog

Function Trigger:
- UI Trigger: The leader clicks the invite action from the members tab.

Function Description:
- Actor: USER (Leader).
- Purpose: To send a new invitation into the group workspace.
- Interface: A focused invite dialog with email input, seat guidance, and submit handling.
- Data Processing:
  - Invite action.
  - Resend and cancel flows are handled in the surrounding members flow.

Screen Layout:
- Dialog Body:
  - Invitee email field.
  - Seat availability hint.
- Footer:
  - Send invite.
  - Cancel.
- Optional Status Area:
  - Validation and server feedback.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Invitee email.<br>• Current seat usage summary.<br>• Pending-invitation conflict state when applicable. |
| 2 | Validation Rules | • Email must be valid before submit.<br>• The group must still have available seats before a new invite can be sent.<br>• The dialog should reject duplicate or obviously invalid requests before creating unnecessary server calls. |
| 3 | Business Rules | • Only leaders can issue invitations.<br>• A successful invite should appear in the pending invitation list immediately or after refresh.<br>• Invite flow must integrate with member seat limits and current invitation state. |
| 4 | Normal Case | • The leader opens the invite dialog.<br>• The leader enters a valid email.<br>• The invite is sent successfully.<br>• The pending invitation list updates in the members tab. |
| 5 | Abnormal Cases | • Invalid email format.<br>• Seat limit reached.<br>• Invitation already exists.<br>• Server-side invite failure. |
Source of Truth:
- Dialog: [InviteMemberDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Group_leader/InviteMemberDialog.jsx:1)
- Members Flow: [GroupMembersTab.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Group_leader/GroupMembersTab.jsx:1)

## GRP-08 Member Stats Tab

Function Trigger:
- Sidebar Trigger: A leader selects `Member Stats`.
- Dashboard Shortcut Trigger: The leader opens this section from the dashboard.

Function Description:
- Actor: USER (Leader or authorized contributor view).
- Purpose: To analyze the learning performance of individual members within the group.
- Interface: A statistics tab with member-specific summaries and navigation into relevant study content such as quizzes.
- Data Processing:
  - Member snapshot and analytics data.
  - Group-to-quiz navigation hooks.

Screen Layout:
- Selector Area:
  - Member context or current learner focus.
- Metrics Area:
  - Performance cards.
  - Participation or score summaries.
- Action Area:
  - Open related quiz section.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Member-specific performance snapshot.<br>• Accuracy, score, attempt, or completion metrics.<br>• Current selected member context.<br>• Action state for opening related content areas. |
| 2 | Validation Rules | • The member stats view requires valid group and member data.<br>• If a selected member no longer exists in the current workspace context, the screen should reset gracefully. |
| 3 | Business Rules | • This tab is not intended for ordinary members.<br>• The tab is investigative and read-oriented, helping leaders identify who needs support or where engagement is strongest.<br>• Navigation from stats into quiz sections must preserve the overall group workspace context. |
| 4 | Normal Case | • The leader opens member statistics.<br>• The app loads learner-focused metrics.<br>• The leader reviews a specific member's performance.<br>• The leader opens the quiz section for further follow-up if needed. |
| 5 | Abnormal Cases | • Member metrics fail to load.<br>• No members are available for analysis.<br>• A member loses eligibility or is removed while selected. |
Source of Truth:
- Component: [GroupMemberStatsTab.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Group_leader/GroupMemberStatsTab.jsx:1)
- Page Flow: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:1)

## GRP-09 Notifications / Activity Feed

Function Trigger:
- Sidebar Trigger: The user selects `Notifications`.

Function Description:
- Actor: USER.
- Purpose: To show the historical activity stream for the current group workspace.
- Interface: A feed-style screen with chronological entries, timestamps, and group-action descriptions.
- Data Processing:
  - Group activity log retrieval and formatting.

Screen Layout:
- Feed Header:
  - Notifications or activity title.
- Feed Body:
  - Chronological entries.
  - Relative or absolute timestamps.
- Empty State:
  - No activity message.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Activity actor or user label.<br>• Event description.<br>• Timestamp or relative-time label.<br>• Optional activity categorization. |
| 2 | Validation Rules | • Activity feed rendering requires valid group workspace context.<br>• Missing actor details should fall back to safe display labels rather than breaking the feed. |
| 3 | Business Rules | • A compact activity feed can be reused in dashboard contexts, but this screen provides the fuller activity history.<br>• The feed is informational and read-only.<br>• The same activity system should make sense for leaders and ordinary members, though the visible events may vary by permission. |
| 4 | Normal Case | • The user opens notifications.<br>• The app loads group activity entries.<br>• The feed renders in chronological order.<br>• The user reviews recent workspace events. |
| 5 | Abnormal Cases | • No activity data exists.<br>• Feed retrieval fails.<br>• Actor formatting data is incomplete. |
Source of Truth:
- Page: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:1)

## GRP-10 Roadmap Studio

Function Trigger:
- Sidebar Trigger: The user selects `Roadmap`.
- Deep-Link Trigger: The user opens a roadmap-specific group workspace URL.
- Generation Trigger: The user creates or updates roadmap structure from within the group workspace.

Function Description:
- Actor: USER.
- Purpose: To visualize and manage the shared group learning roadmap, including roadmap phases, knowledge nodes, and roadmap-linked quiz or pre-learning actions.
- Interface: A roadmap studio rendered inside the group shell and the shared study panel, with multiple canvas modes and roadmap side content.
- Data Processing:
  - Create Roadmap: `createRoadmap`
  - Setup Config: `setupGroupRoadmapConfig`
  - Update Config: `updateGroupRoadmapConfig`
  - Fetch Structure: `getRoadmapStructureById`
  - Delete Phase: `deleteRoadmapPhaseById`
  - Delete Knowledge: `deleteRoadmapKnowledgeById`

Screen Layout:
- Header:
  - Roadmap title.
  - Configuration summary or edit actions.
  - View switcher.
- Main Canvas:
  - Roadmap graph or stage view.
- Side Area:
  - Roadmap journey panel.
  - Review or support panels.
- Empty State:
  - Generate roadmap call-to-action when no roadmap exists.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Active roadmap identifiers from the group route state.<br>• Roadmap phases and knowledge nodes.<br>• Selected group materials used for roadmap generation.<br>• Current canvas mode.<br>• Generation state for roadmap phases, pre-learning, and related quiz content. |
| 2 | Validation Rules | • The group route must resolve to a valid roadmap state before canvas hydration.<br>• Generation and update actions require valid group context and valid selected materials.<br>• Phase and knowledge deletion require valid target identifiers. |
| 3 | Business Rules | • The roadmap is shared group content rather than personal-only content.<br>• Role restrictions may apply to who can create or update the roadmap.<br>• The roadmap studio must keep its state aligned with deep-linked roadmap URLs.<br>• Roadmap-linked quiz navigation must preserve the return path into the roadmap when possible. |
| 4 | Normal Case | • The user opens the roadmap section.<br>• The app loads or creates the roadmap structure.<br>• The user reviews roadmap phases and knowledge nodes.<br>• The user opens related roadmap actions such as quiz creation or pre-learning generation. |
| 5 | Abnormal Cases | • The group has no eligible documents for roadmap generation.<br>• Config setup fails.<br>• Roadmap structure retrieval fails.<br>• Deep-linked roadmap identifiers are invalid.<br>• The user's role does not allow the attempted roadmap mutation. |
Source of Truth:
- Page: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:1)
- Studio Panel: [ChatPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChatPanel.jsx:1)
- Canvas Components: [RoadmapCanvasView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/RoadmapCanvasView.jsx:1), [RoadmapJourPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/RoadmapJourPanel.jsx:1)
- API: [RoadmapAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/RoadmapAPI.js:1)

## GRP-11 Quiz List

Function Trigger:
- Sidebar Trigger: The user selects `Quiz` inside the group workspace.
- Return Trigger: The user returns from quiz detail or quiz creation into the group quiz inventory.

Function Description:
- Actor: USER.
- Purpose: To list all quizzes created in the group workspace and allow eligible users to open or create quiz content.
- Interface: A study inventory view inside the group studio panel.
- Data Processing:
  - Fetch List: `getQuizzesByScope`
  - Delete Quiz: `deleteQuiz`

Screen Layout:
- Header:
  - Group quiz list title.
  - Create quiz action when allowed.
- Main List:
  - Quiz cards or rows with metadata and status.
- Empty State:
  - No-quiz message.
  - Create action for eligible roles.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Quiz title and identity.<br>• Quiz status or generation state.<br>• Ownership or audience context where relevant.<br>• Open and management action states. |
| 2 | Validation Rules | • The group workspace scope must be valid before list retrieval.<br>• Management actions require valid quiz identifiers.<br>• Create action must respect role-based and read-only restrictions. |
| 3 | Business Rules | • Leaders and authorized contributors may have broader quiz-management permissions than ordinary members.<br>• The list is scoped to the current group workspace.<br>• Background generation progress can be surfaced in the list for quizzes that are still being produced. |
| 4 | Normal Case | • The user opens the quiz section.<br>• The app loads group quizzes.<br>• The user opens an existing quiz or creates a new one if allowed. |
| 5 | Abnormal Cases | • No group quizzes exist yet.<br>• Quiz loading fails.<br>• A permission-restricted user attempts a management action.<br>• A previously selected quiz has been deleted. |
Source of Truth:
- Studio Panel: [ChatPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChatPanel.jsx:1)
- Component: [QuizListView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/QuizListView.jsx:1)
- API: [QuizAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/QuizAPI.js:1)

## GRP-12 Create Quiz Form

Function Trigger:
- Group Studio: From the Group Workspace page -> open the Quiz section inside the studio area -> click the create-quiz action from the quiz list.
- Challenge Draft Trigger: The same form can be reused from challenge-related quiz-draft flows when the group workspace enters challenge composition mode.
- View Switch: The center group workspace panel dynamically switches to `CreateQuizForm`, while the group shell and sidebar remain active.

Function Description:
- Actor: USER (Leader or Contributor with Create Permission).
- Purpose: To create a new shared group quiz from approved group materials using the same AI configuration engine that powers the individual workspace, while respecting group roles, plan gates, and challenge-draft context.
- Interface: A group-aware, AI-first, multi-section form embedded inside the group workspace shell.
- Configuration Sections:
  - General Information: quiz name.
  - Source Materials: group document selection with bulk select and clear actions.
  - Settings: total question count, timed mode or sequential-by-difficulty mode, and duration inputs.
  - Difficulty Builder: preset or custom difficulty distribution with lockable buckets and a live preview bar.
  - Question Type Matrix: selectable question types with percent/count allocation and per-item locking.
  - Bloom Taxonomy Matrix: selectable Bloom skills with percent/count allocation and per-item locking.
  - Prompt and Structure: custom prompt input plus optional AI-generated detailed structure preview and edit mode.
- Data Processing:
  - Group Material Bootstrap: Loads workspace materials through `getMaterialsByWorkspace(contextId)` in the group wrapper component.
  - Metadata Bootstrap: Loads question types, difficulty definitions, and Bloom-skill definitions from the AI metadata APIs reused by the base form.
  - Structure Preview: When the user requests `Detailed configuration`, the form can call `previewAIQuizStructure(...)` to produce a previewable `structureJson`.
  - Final Generation: Calls `generateAIQuiz(payload)` with the group workspace context, selected material identifiers, title, timer settings, difficulty ratios, question-type ratios, Bloom ratios, prompt, and optional structure JSON.
  - Completion Flow: `GroupWorkspacePage` inspects the returned payload. If the backend returns a realtime-processing payload, the UI redirects to the group Quiz list and shows progress there. If a concrete quiz payload is returned immediately, the UI opens Group Quiz Detail.

Screen Layout:
- Screenshot Placeholder 1: Full `Create Quiz` screen inside the Group Workspace studio.
- Description:
  - Top header bar with back button and create title.
  - Shared group shell around the form.
  - Error banner or insufficient-credit warning when applicable.
- Screenshot Placeholder 2: Configuration core.
- Description:
  - Source-material selection panel tied to group documents.
  - Difficulty, question-type, and Bloom allocation controls.
  - Prompt input and detailed structure preview area.
- Screenshot Placeholder 3: Challenge-draft or advanced configuration state.
- Description:
  - Same form reused in special group flows such as challenge composition.
  - Role- and plan-aware restrictions remain visible.
- Footer Area:
  - Back action.
  - Generate action.
  - Submission loading state.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Metadata: `aiName` (quiz title), `quizIntent` (`REVIEW`), `totalQuestion`, `timerMode`, `durationInMinute`, `easyDurationInSeconds`, `mediumDurationInSeconds`, `hardDurationInSeconds`, `outputLanguage`.<br>• Group Context: `contextId`, `materialIds`, and optional challenge-draft context when the same form is reused by a challenge editor.<br>• Difficulty Model: preset or custom distribution, `easyRatio`, `mediumRatio`, `hardRatio`, `lockedDifficultyLevel`.<br>• Question Type Model: `questionTypes[]` with `questionTypeId`, `ratio`, `isLocked`; supports count mode or percentage mode.<br>• Bloom Model: `bloomSkills[]` with `bloomId`, `ratio`, `isLocked`; supports count mode or percentage mode.<br>• Prompt And Structure: `aiPrompt`, optional `structureJson`, and structure items with `difficulty`, `questionType`, `bloomSkill`, `quantity`.<br>• UI State: material-loading state, metadata-loading state, structure preview state, submit state, error state, and progress state. |
| 2 | Validation | • Permission: The current user must have permission to create quizzes in the group workspace. Read-only members must not be able to submit the form.<br>• Identity: Quiz name is required and must stay within the configured maximum title length.<br>• Input Source: At least one selected material or a non-empty prompt is required.<br>• Question Volume: `totalQuestion` must be between `10` and `100`.<br>• Time Logic: Timed mode requires total duration and must satisfy the minimum `30` seconds per question rule. Sequential mode requires all `easy`, `medium`, and `hard` durations and must follow `Hard > Medium > Easy`.<br>• Allocation Totals: Difficulty, question-type, and Bloom allocation must total `100%` or `totalQuestion`, depending on unit mode.<br>• Plan Gate: Advanced question types remain gated when `hasAdvanceQuizConfig` is not available. |
| 3 | Distribution And Structure Engine | • Difficulty Engine: Supports preset difficulty definitions and custom distribution. A locked difficulty bucket remains fixed while the rest of the budget is redistributed.<br>• Question Type Engine: Supports count mode and percentage mode. Each selected question type can be locked independently while the remaining budget is redistributed across unlocked items.<br>• Bloom Engine: Supports count mode and percentage mode. Each selected Bloom skill can be locked independently while the remaining budget is redistributed across unlocked items.<br>• Redistribution Logic: Target total is `100` in percentage mode or `totalQuestion` in count mode. Remaining budget is computed as `Remaining = TargetTotal - Sum(LockedValues)`. The helper engine recalculates all unlocked items to maintain a valid total before submit.<br>• Structure Preview: The user can request a detailed structure preview from AI. The preview can then be edited, reordered, and refined before final generation. |
| 4 | Business Rules | • The created quiz belongs to the current group workspace, not a personal workspace.<br>• The screen reuses the same core AI quiz engine as the individual workspace but wraps it with group-specific permission and result handling.<br>• Read-only members can be blocked from entering or submitting the create flow.<br>• Advanced question types remain plan gated even when the user otherwise has content-creation permission.<br>• Challenge-related flows can reuse the same form so the group does not maintain a separate quiz-composition UI.<br>• On success, the result may resolve in one of two ways: immediate quiz payload -> open Group Quiz Detail; realtime processing payload -> return to Group Quiz List and track generation progress there. |
| 5 | Normal Case | 1. A leader or eligible contributor opens the Quiz section and enters `Create Quiz`.<br>2. The user selects approved group materials.<br>3. The user enters a title and configures question volume and time behavior.<br>4. The user adjusts difficulty, question types, and Bloom allocation.<br>5. The user optionally reviews and edits `Detailed configuration`.<br>6. The user submits the AI generation request.<br>7. The UI either opens the newly created group quiz or returns to the group Quiz list to track background generation. |
| 6 | Abnormal Cases | • Permission Failure: A read-only member attempts to create a quiz. The UI blocks the action or redirects to a safe group view.<br>• Missing Input: The user provides neither materials nor prompt. Submission is blocked and validation errors are shown.<br>• Allocation Mismatch: Difficulty, question-type, or Bloom totals do not meet the required target. Submission is blocked until the totals are corrected.<br>• Plan Restriction: The user tries to use advanced question types without the required plan entitlement. The gated types remain locked and the invalid configuration cannot be submitted.<br>• Credit Failure: The backend returns insufficient-credit information. The UI shows a high-visibility warning and keeps the form state intact.<br>• Generation Failure: `generateAIQuiz(...)` fails. The form remains open so the user can retry without rebuilding the configuration from scratch. |
Source of Truth:
- Studio Panel: [ChatPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChatPanel.jsx:1)
- Group Wrapper: [CreateQuizForm.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/CreateQuizForm.jsx:1)
- Base Form: [CreateQuizForm.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/CreateQuizForm.jsx:1)
- Form Content: [CreateQuizAiFormContent.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/CreateQuizAiFormContent.jsx:1)
- Form Logic: [useCreateQuizAiForm.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/useCreateQuizAiForm.js:1)
- Page Result Handling: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:1)
- APIs: [AIAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/AIAPI.js), [MaterialAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/MaterialAPI.js:1)

## GRP-13 Quiz Detail

Function Trigger:
- UI Trigger: The user opens a quiz from the group quiz list.
- Roadmap Trigger: The user opens a roadmap-linked group quiz.
- Challenge Trigger: The user reaches quiz detail from a challenge-related flow.

Function Description:
- Actor: USER.
- Purpose: To inspect a group quiz and access related group-specific panels such as review, ranking, audience distribution, question discussion, and publish/exam actions.
- Interface: A detail view inside the group study panel with role-aware actions, group extensions, and several conditional dialogs for distribution and launch control.
- Data Processing:
  - Quiz Detail Load: `getQuizFull`, `getSectionsByQuiz`, `getQuestionsBySection`, `getAnswersByQuestion`
  - History: `getQuizHistory`, `getGroupQuizHistory`
  - Discussion Metrics: `getThreadCounts`
  - Audience Management: `getGroupMembers`, `setGroupQuizAudience`
  - Publish Flow: `publishGroupQuiz`

Screen Layout:
- Header:
  - Quiz title.
  - Back action.
  - Edit action when allowed.
- Detail Area:
  - Quiz summary, sections, and content preview.
- Extension Panels:
  - Review panel.
  - Ranking panel.
  - Group-specific follow-up actions.
- Conditional Dialogs:
  - Per-question discussion popup.
  - Audience-distribution dialog.
  - Leader-participation dialog.
  - Exam start confirmation dialog.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Quiz identity and metadata, including status, title, type, section count, and question count.<br>• Review context: review panel state, quiz history, and per-user performance history.<br>• Ranking context: ranking panel data and challenge snapshot context where applicable.<br>• Audience context: `groupAudienceMode`, assigned user IDs, selected audience member IDs, member-loading state, and dialog-open state.<br>• Publish context: `publishing`, `leaderParticipationOpen`, and current status transitions when publishing a group quiz.<br>• Discussion context: `discussionOpenQId`, per-question thread counts, selected question payload, and derived section labels.<br>• Runtime-entry context: `examStartOpen`, return path, and quiz-attempt navigation state. |
| 2 | Validation Rules | • The detail view requires a valid selected quiz payload or a resolvable quiz identifier before loading extension panels.<br>• Audience distribution can only be saved when the quiz has a valid `quizId` and the selected audience model is internally consistent.<br>• Group-specific extension panels must handle no-data or restricted-data states safely.<br>• Publish actions must respect role and quiz-status rules before the leader-participation dialog can proceed.<br>• Exam-mode navigation should only continue after the user confirms through the start dialog. |
| 3 | Business Rules | • Quiz detail permissions vary by group role.<br>• The detail screen can be reached from normal group study flow, roadmap flow, or challenge flow and must preserve enough context to return correctly.<br>• Group review and ranking are additive capabilities on top of the base quiz detail experience.<br>• Audience distribution is configured inline through a dialog that can switch between `ALL_MEMBERS` and selected-member targeting.<br>• Publishing a group quiz can branch into two outcomes: direct publish without ranking participation, or publish-plus-immediate-leader-attempt when the leader chooses to join the ranking.<br>• Per-question discussion is handled as a popup so the user can collaborate without leaving quiz detail. |
| 4 | Normal Case | • The user opens a group quiz.<br>• Quiz detail loads sections, questions, review data, and ranking context.<br>• The user reviews the quiz, opens question discussion if needed, and optionally adjusts audience distribution.<br>• A leader can publish the quiz, decide whether to join the ranking, or start exam mode from the same detail screen.<br>• The user returns to the prior group context or continues into runtime/review flows. |
| 5 | Abnormal Cases | • The selected quiz is missing.<br>• Review data fails.<br>• Ranking data fails.<br>• Group-member loading fails while the audience dialog is open.<br>• Publishing fails or audience-save fails, leaving the dialog open with an error path.<br>• The user's role does not allow a requested follow-up action. |
Source of Truth:
- Studio Panel: [ChatPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChatPanel.jsx:1)
- Detail Component: [QuizDetailView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/QuizDetailView.jsx:1)
- Extensions: [GroupQuizReviewPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/GroupQuizReviewPanel.jsx:1), [GroupQuizRankingPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/GroupQuizRankingPanel.jsx:1)

## GRP-14 Edit Quiz Form

Function Trigger:
- UI Trigger: The user clicks the edit action from group quiz detail.

Function Description:
- Actor: USER.
- Purpose: To modify an existing group quiz while staying inside the group study panel.
- Interface: A pre-filled group-aware edit form.
- Data Processing:
  - Quiz update flow.

Screen Layout:
- Header:
  - Edit title.
  - Back action.
- Edit Area:
  - Existing quiz configuration fields.
- Footer:
  - Save action.
  - Validation feedback.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Existing quiz payload.<br>• Editable quiz settings.<br>• Group presentation or challenge-draft context when relevant.<br>• Save mutation state. |
| 2 | Validation Rules | • A valid target quiz must be loaded before edit mode appears.<br>• Updated values must satisfy the same persistence rules as a newly valid quiz.<br>• Users without edit permission must not enter editable mode. |
| 3 | Business Rules | • Edit mode is available only to eligible roles.<br>• Save success should return the user to the refreshed detail view.<br>• If the quiz was opened from a specialized context such as challenge drafting, that context should remain coherent after save. |
| 4 | Normal Case | • An eligible user opens quiz edit mode.<br>• The current quiz configuration is shown.<br>• The user updates allowed fields.<br>• The user saves and returns to detail. |
| 5 | Abnormal Cases | • The selected quiz is missing.<br>• Save fails.<br>• The user's role no longer has edit permission. |
Source of Truth:
- Studio Panel: [ChatPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChatPanel.jsx:1)
- Component: [EditQuizForm.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/EditQuizForm.jsx:1)

## GRP-15 Flashcard List

Function Trigger:
- Sidebar Trigger: The user selects `Flashcard`.
- Return Trigger: The user returns from flashcard detail or flashcard creation.

Function Description:
- Actor: USER.
- Purpose: To display all flashcard sets available inside the current group workspace and allow eligible users to create more.
- Interface: A flashcard inventory view rendered inside the group study panel.
- Data Processing:
  - Group-scoped flashcard list loading through the shared flashcard list component.

Screen Layout:
- Header:
  - Flashcard title.
  - Create action when permitted.
- Main List:
  - Flashcard set cards or rows.
- Empty State:
  - No-flashcard message.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Flashcard set title.<br>• Card count.<br>• Creation metadata.<br>• Role-sensitive action state. |
| 2 | Validation Rules | • The group workspace context must be valid.<br>• Create and delete behavior must respect role restrictions. |
| 3 | Business Rules | • The group workspace reuses a shared flashcard list implementation but applies group role rules on top.<br>• Read-only members may be allowed to open flashcards but not create or manage them.<br>• The list remains scoped to the current group workspace. |
| 4 | Normal Case | • The user opens the flashcard section.<br>• Existing group flashcard sets render.<br>• The user opens a set or creates a new one if allowed. |
| 5 | Abnormal Cases | • No flashcard sets exist.<br>• Flashcard loading fails.<br>• The user attempts a create action without permission. |
Source of Truth:
- Studio Panel: [ChatPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChatPanel.jsx:1)
- Shared Component: [FlashcardListView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/FlashcardListView.jsx:1)

## GRP-16 Flashcard Detail

Function Trigger:
- UI Trigger: The user opens a flashcard set from the group flashcard list.

Function Description:
- Actor: USER.
- Purpose: To review and study one flashcard set within the group workspace context.
- Interface: A flashcard viewer embedded in the group study panel.
- Data Processing:
  - Uses selected flashcard payload passed through the group studio flow.

Screen Layout:
- Header:
  - Set title.
  - Back action.
- Card Viewer:
  - Current card.
  - Flip and navigation controls.
- Summary Area:
  - Set metadata.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Flashcard set metadata.<br>• Current card index and total cards.<br>• Card front and back content.<br>• Role-sensitive edit visibility. |
| 2 | Validation Rules | • A valid selected flashcard payload must exist.<br>• Card rendering must tolerate malformed or incomplete flashcard entries. |
| 3 | Business Rules | • The group workspace currently reuses the shared flashcard detail implementation.<br>• Read-only members may still study the set while edit-related affordances remain hidden.<br>• Back navigation must return to the group flashcard inventory rather than a detached route. |
| 4 | Normal Case | • The user opens a flashcard set.<br>• The viewer renders the set.<br>• The user studies the cards.<br>• The user returns to the flashcard list. |
| 5 | Abnormal Cases | • The selected set is missing.<br>• Flashcard content is malformed.<br>• The current selection is stale after a list refresh. |
Source of Truth:
- Studio Panel: [ChatPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChatPanel.jsx:1)
- Shared Component: [FlashcardDetailView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/FlashcardDetailView.jsx:1)

## GRP-17 Create Flashcard Form

Function Trigger:
- UI Trigger: The user clicks the create-flashcard action from the group flashcard list.

Function Description:
- Actor: USER.
- Purpose: To generate a new flashcard set from approved group materials.
- Interface: A create form rendered in the group study panel with material selection and submit controls.
- Data Processing:
  - Flashcard creation and generation through the group flashcard flow.

Screen Layout:
- Header:
  - Create flashcard title.
  - Back action.
- Form Area:
  - Flashcard configuration.
  - Material selection state.
- Footer:
  - Submit.
  - Validation feedback.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Selected source identifiers.<br>• Flashcard generation settings.<br>• Submit state and loading feedback. |
| 2 | Validation Rules | • The user must have permission to create flashcards.<br>• Required materials and required fields must be valid before submission. |
| 3 | Business Rules | • The created flashcard set belongs to the current group workspace.<br>• Read-only members must not be able to submit creation requests.<br>• Successful creation should return the user to a meaningful group flashcard state. |
| 4 | Normal Case | • An eligible user opens the create-flashcard form.<br>• The user selects materials and configures the set.<br>• The user submits the form.<br>• The new flashcard set becomes available in the group workspace. |
| 5 | Abnormal Cases | • No eligible materials exist.<br>• Validation fails.<br>• The user's role blocks creation.<br>• Generation fails. |
Source of Truth:
- Studio Panel: [ChatPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChatPanel.jsx:1)
- Component: [CreateFlashcardForm.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/CreateFlashcardForm.jsx:1)

## GRP-18 Mock Test List

Function Trigger:
- Sidebar Trigger: The user selects `Mock Test`.
- Return Trigger: The user returns from mock-test detail or creation.

Function Description:
- Actor: USER.
- Purpose: To list all group mock tests and allow eligible users to create new group-level mock assessments.
- Interface: A mock-test inventory view rendered inside the group study panel.
- Data Processing:
  - Group-scoped mock-test list retrieval using the shared mock-test list component.

Screen Layout:
- Header:
  - Mock-test title.
  - Create action when allowed.
- Main List:
  - Mock-test cards or rows.
- Empty State:
  - No-mock-test message.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Mock-test title and identifier.<br>• Mock-test summary information.<br>• Read-only and entitlement state.<br>• Open-action availability. |
| 2 | Validation Rules | • The group workspace context must be valid.<br>• Create action must satisfy both role checks and plan entitlement checks. |
| 3 | Business Rules | • The group workspace reuses the shared mock-test list implementation, but group role and plan gating are applied on top.<br>• Users without advanced mock-test entitlement should see a disabled or unavailable create path.<br>• Read-only members may be able to review existing items while creation remains blocked. |
| 4 | Normal Case | • The user opens the mock-test section.<br>• Existing group mock tests render.<br>• An eligible user creates a new mock test or opens an existing one. |
| 5 | Abnormal Cases | • No mock tests exist.<br>• The required entitlement is missing.<br>• A read-only role attempts to create content.<br>• Mock-test loading fails. |
Source of Truth:
- Studio Panel: [ChatPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChatPanel.jsx:1)
- Shared Component: [MockTestListView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/MockTestListView.jsx:1)

## GRP-19 Create Mock Test Form

Function Trigger:
- UI Trigger: The user clicks the create-mock-test action from the group mock-test list.

Function Description:
- Actor: USER.
- Purpose: To create a new group-scoped mock test using shared materials and group study settings.
- Interface: A group-specific mock-test creation form.
- Data Processing:
  - Group mock-test creation and generation flow.

Screen Layout:
- Header:
  - Create mock-test title.
  - Back action.
- Form Area:
  - Mock-test configuration.
  - Material selection summary.
- Footer:
  - Submit.
  - Validation and loading feedback.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Selected source identifiers.<br>• Mock-test configuration values.<br>• Current entitlement state.<br>• Submit and generation state. |
| 2 | Validation Rules | • The user must have permission to create mock tests.<br>• The current plan must allow the advanced configuration required by this feature.<br>• Materials and configuration fields must be valid before submit. |
| 3 | Business Rules | • The created mock test belongs to the current group workspace.<br>• Read-only members cannot submit this form.<br>• Plan gating is enforced before or during access to the create state. |
| 4 | Normal Case | • An eligible user opens the create-mock-test form.<br>• The user configures the assessment and selects materials.<br>• The user submits the form.<br>• A new group mock test is created and later appears in the group inventory. |
| 5 | Abnormal Cases | • Missing entitlement.<br>• Missing permission.<br>• Validation fails.<br>• Mock-test generation fails. |
Source of Truth:
- Studio Panel: [ChatPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChatPanel.jsx:1)
- Component: [CreateGroupMockTestForm.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/CreateGroupMockTestForm.jsx:1)

## GRP-20 Mock Test Detail / Edit

Function Trigger:
- UI Trigger: The user opens a mock test from the group mock-test list.
- Secondary Trigger: The user enters edit mode from mock-test detail when permitted.

Function Description:
- Actor: USER.
- Purpose: To inspect a group mock test and, for eligible roles, update its configuration.
- Interface: A detail-and-edit flow rendered within the group study panel.
- Data Processing:
  - Selected mock-test payload passed through the group studio flow.
  - Save logic delegated to the edit form.

Screen Layout:
- Detail State:
  - Mock-test summary.
  - Back action.
- Edit State:
  - Pre-filled configuration form.
  - Save action.
- Shared Navigation:
  - Return to mock-test inventory.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Mock-test metadata.<br>• Current selected mock-test payload.<br>• Editability state based on role.<br>• Save mutation state when in edit mode. |
| 2 | Validation Rules | • A valid selected mock test must exist before detail or edit can render.<br>• Editable values must remain valid before save is allowed. |
| 3 | Business Rules | • The group workspace currently reuses shared mock-test detail and edit components inside the group panel.<br>• Some group roles can inspect the mock test but not edit it.<br>• Save success should bring the user back to the updated detail state rather than leaving them in an ambiguous route. |
| 4 | Normal Case | • The user opens a mock test.<br>• The detail state renders.<br>• If permitted, the user enters edit mode and saves changes.<br>• The flow returns to detail or the mock-test list. |
| 5 | Abnormal Cases | • The selected mock test is missing.<br>• Save fails.<br>• The user's role does not permit editing. |
Source of Truth:
- Studio Panel: [ChatPanel.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChatPanel.jsx:1)
- Shared Detail: [MockTestDetailView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/MockTestDetailView.jsx:1)
- Shared Edit: [EditMockTestForm.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/Components/EditMockTestForm.jsx:1)

## GRP-21 Challenge Hub

Function Trigger:
- Sidebar Trigger: The user selects `Challenge`.

Function Description:
- Actor: USER.
- Purpose: To serve as the main entry point for challenge events in the group workspace, including event browsing, challenge creation, and challenge-specific study flow.
- Interface: A challenge tab with list states, sub-views, and create-entry actions.
- Data Processing:
  - Challenge event list and challenge-management flows.

Screen Layout:
- Header:
  - Challenge title.
  - Create challenge action when allowed.
- Main Content:
  - Challenge list or mode tabs.
  - Selected challenge preview area where applicable.
- Empty State:
  - No challenge message.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Challenge event list.<br>• Current sub-view or challenge mode.<br>• Selected challenge identifier.<br>• Role-sensitive create state. |
| 2 | Validation Rules | • Challenge detail links require valid challenge identifiers.<br>• Creation actions require role eligibility. |
| 3 | Business Rules | • The challenge hub is a group-specific collaboration feature, not an individual study artifact.<br>• Leaders or other eligible roles can create challenge events.<br>• Challenge flows may connect back to group quizzes, rankings, and related study content. |
| 4 | Normal Case | • The user opens the challenge hub.<br>• Existing challenge events render.<br>• The user opens a challenge detail or creates a new challenge if allowed. |
| 5 | Abnormal Cases | • No challenge events exist.<br>• Challenge list retrieval fails.<br>• The user attempts a restricted challenge action. |
Source of Truth:
- Component: [ChallengeTab.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChallengeTab.jsx:1)
- Page Flow: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:1)

## GRP-22 Create Challenge Wizard

Function Trigger:
- UI Trigger: The user clicks the create-challenge action from the challenge hub.

Function Description:
- Actor: USER.
- Purpose: To create a new challenge event for the group using a guided multi-step flow.
- Interface: A step-based wizard with quiz selection, schedule setup, and final submission.
- Data Processing:
  - Challenge creation flow.
  - Related quiz lookup and validation.

Screen Layout:
- Stepper:
  - Current step indicator.
- Wizard Body:
  - Challenge metadata step.
  - Quiz-selection step.
  - Schedule or rule-configuration step.
- Footer:
  - Back.
  - Continue.
  - Submit.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Challenge name and metadata.<br>• Selected quiz or challenge content source.<br>• Schedule fields.<br>• Mode or participant configuration.<br>• Wizard state and current step. |
| 2 | Validation Rules | • Each wizard step must be valid before the user can continue.<br>• A valid quiz selection is required when the chosen challenge type depends on a quiz.<br>• Final submission requires a complete, coherent challenge payload. |
| 3 | Business Rules | • Only eligible group roles can create challenge events.<br>• Challenges depend on existing group learning assets, especially quizzes.<br>• The wizard must support moving backward without losing already-entered data. |
| 4 | Normal Case | • An eligible user opens the challenge wizard.<br>• The user completes the challenge setup step by step.<br>• The user submits the challenge.<br>• The new challenge event appears in the challenge hub. |
| 5 | Abnormal Cases | • No valid quiz is available for the selected challenge type.<br>• Validation fails on one of the steps.<br>• Challenge creation fails.<br>• The user loses eligibility during the flow. |
Source of Truth:
- Component: [CreateChallengeWizard.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/CreateChallengeWizard.jsx:1)

## GRP-23 Challenge Detail

Function Trigger:
- UI Trigger: The user opens a specific challenge from the challenge hub.

Function Description:
- Actor: USER.
- Purpose: To show the structure, participants, standings, and related quiz context of one challenge event.
- Interface: A challenge detail screen with challenge metadata, leaderboard, bracket, and related quiz actions.
- Data Processing:
  - Challenge detail retrieval.
  - Leaderboard and bracket data.

Screen Layout:
- Header:
  - Challenge title.
  - Back action.
- Summary Area:
  - Challenge metadata and schedule.
- Competition Area:
  - Leaderboard.
  - Bracket or matchup view.
- Related Action Area:
  - Linked quiz access where applicable.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Challenge event metadata.<br>• Participant list or team summary.<br>• Leaderboard entries.<br>• Bracket or matchup structure.<br>• Related quiz context. |
| 2 | Validation Rules | • The selected challenge identifier must be valid.<br>• Competition sub-panels must handle partial data states without failing the entire screen. |
| 3 | Business Rules | • Challenge detail can route the user into quiz-related flows while preserving challenge context.<br>• Depending on challenge state, some sub-panels may be informational while others are actionable.<br>• Challenge standing data is shared group information and should render consistently for all authorized viewers. |
| 4 | Normal Case | • The user opens a challenge.<br>• Challenge summary, leaderboard, and bracket render.<br>• The user inspects standings and opens related quiz context if needed. |
| 5 | Abnormal Cases | • The challenge no longer exists.<br>• Leaderboard retrieval fails.<br>• Bracket retrieval fails.<br>• Related quiz context is stale or missing. |
Source of Truth:
- Detail Component: [ChallengeDetailView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChallengeDetailView.jsx:1)
- Related Panels: [ChallengeLeaderboard.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChallengeLeaderboard.jsx:1), [ChallengeBracketView.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/ChallengeBracketView.jsx:1)

## GRP-24 Ranking

Function Trigger:
- Sidebar Trigger: The user selects `Ranking`.

Function Description:
- Actor: USER.
- Purpose: To show the ranking board for the group workspace, including member or team ordering based on scores or activity.
- Interface: A read-only ranking tab.
- Data Processing:
  - Group ranking retrieval.

Screen Layout:
- Header:
  - Ranking title.
- Ranking Area:
  - Ordered leaderboard or table.
- Optional Summary Area:
  - Aggregate ranking context.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Rank order.<br>• Member or team display name.<br>• Score or performance summary.<br>• Position delta or change indicator where available. |
| 2 | Validation Rules | • The group workspace context must be valid before ranking data loads.<br>• Ranking rows must tolerate partial profile data by falling back to safe display labels. |
| 3 | Business Rules | • This section is read-only.<br>• The ranking view can be reached directly from the sidebar or conceptually from dashboard and challenge flows.<br>• Ranking reflects shared group results rather than personal-only progress. |
| 4 | Normal Case | • The user opens the ranking section.<br>• The app loads the ranking data.<br>• The ranking table renders and the user reviews the standings. |
| 5 | Abnormal Cases | • No ranking data exists yet.<br>• Ranking retrieval fails.<br>• Some member display metadata is incomplete. |
Source of Truth:
- Component: [GroupRankingTab.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Components/GroupRankingTab.jsx:1)

## GRP-25 Group Wallet

Function Trigger:
- Sidebar Trigger: A leader selects `Wallet`.

Function Description:
- Actor: USER (Leader).
- Purpose: To inspect and manage the group's plan, wallet balance, and credit-related purchasing capabilities.
- Interface: A wallet and subscription management tab.
- Data Processing:
  - Group plan summary.
  - Group wallet and balance state.

Screen Layout:
- Balance Area:
  - Credit or wallet summary.
- Plan Area:
  - Current subscription information.
- Action Area:
  - Purchase or upgrade entry points when permitted.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Group credit balance.<br>• Current plan metadata.<br>• Credit breakdown or billing-related summary.<br>• Manage-action availability. |
| 2 | Validation Rules | • Wallet actions require valid group context.<br>• Purchase or management actions must be restricted to users with management authority. |
| 3 | Business Rules | • This is a leader-focused financial management area.<br>• Wallet state influences access to some shared content actions, such as uploads or advanced generation.<br>• The screen should remain readable even when the user can inspect the wallet but not perform every management action. |
| 4 | Normal Case | • A leader opens the wallet section.<br>• The app loads balance and plan data.<br>• The leader reviews current resources and starts an upgrade or purchase flow if needed. |
| 5 | Abnormal Cases | • Wallet retrieval fails.<br>• Plan data is stale or incomplete.<br>• The current user lacks the authority to manage billing. |
Source of Truth:
- Component: [GroupWalletTab.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Group_leader/GroupWalletTab.jsx:1)
- Page Flow: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:1)

## GRP-26 Group Settings

Function Trigger:
- Sidebar Trigger: A leader selects `Settings`.

Function Description:
- Actor: USER (Leader).
- Purpose: To manage group metadata and administrative configuration from one settings screen.
- Interface: A settings tab with editable forms and additional profile-configuration entry points.
- Data Processing:
  - Group update flows.
  - Profile-update handoff into the group profile configuration dialog.

Screen Layout:
- Metadata Area:
  - Group name and descriptive fields.
- Settings Area:
  - Administrative options.
- Action Area:
  - Save.
  - Open profile configuration update flow.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Group name.<br>• Group description and related metadata.<br>• Additional settings fields exposed by the current implementation.<br>• Profile-config entry action. |
| 2 | Validation Rules | • Editable fields must satisfy the form constraints before save.<br>• Only users with settings authority can submit changes. |
| 3 | Business Rules | • This is a leader-only management screen.<br>• Profile update requests can be subject to an onboarding update guard if changing the profile would affect downstream shared content.<br>• Saving group metadata should not break the user's current section context inside the group shell. |
| 4 | Normal Case | • A leader opens settings.<br>• The current group values render.<br>• The leader updates metadata.<br>• The leader saves changes or opens the profile-update flow. |
| 5 | Abnormal Cases | • Save fails.<br>• The current user lacks permission.<br>• The profile update is blocked by an update guard. |
Source of Truth:
- Component: [GroupSettingsTab.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Group_leader/GroupSettingsTab.jsx:1)
- Page Flow: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:1)

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
