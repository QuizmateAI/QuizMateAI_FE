# FE i18n Full Repo Recheck Passlist

- Date: 2026-04-25
- Scope: full FE runtime recheck after the earlier 4 phase passes
- Goal: scan all runtime FE files honestly, fix high-signal i18n gaps, recheck locale-sensitive font surfaces, and record every checked file by folder

## Final status

- Full runtime missing-key scan: PASS at scan level across `370` runtime files under `src` excluding `src/test`, `src/i18n/locales`, and `src/assets`.
- Full UI direct-text heuristic scan: PASS with `UI_FILES_WITHOUT_I18N = 0` across `306` files under `src/Pages` and `src/Components`.
- Locale JSON parse recheck: PASS on the touched locale bundles.
- Production build: PASS.
- Residual Vite warning: existing warning on `src/api/ProfileAPI.js` being both dynamically and statically imported.

## What this means

- The repo no longer has any remaining UI file in `Pages + Components` that both renders likely user-facing text and completely misses i18n wiring.
- The remaining repo-wide gap is now concentrated in files that already use i18n but still reference missing keys.
- Current missing-key totals after this pass: `509` occurrences across `380` unique keys.

## Residual hotspots

These are the biggest remaining missing-key clusters after the latest scan:

- `43` - `src/Pages/SuperAdmin/Components/UserWorkspaceExplorer.jsx`
- `39` - `src/Pages/Admin/CommunityQuizManagement.jsx`
- `29` - `src/Pages/SuperAdmin/SuperAdminDashboard.jsx`
- `26` - `src/Pages/SuperAdmin/AdminManagement.jsx`
- `26` - `src/Pages/Users/Group/Components/RoadmapCanvasView2.jsx`
- `26` - `src/Pages/Users/Individual/Workspace/Components/RoadmapCanvasView2.jsx`
- `21` - `src/Pages/Users/Group/Components/RoadmapCanvasViewStage.jsx`
- `20` - `src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/CreateQuizAiFormContent.jsx`
- `20` - `src/Pages/Users/Individual/Workspace/Components/WorkspaceProfileWizard/mockProfileWizardData.js`
- `19` - `src/Pages/Users/Group/GroupWorkspacePage.jsx`

## Manual fixes completed in this pass

- Added shared i18n fallback labels to dialog, toast, and loading primitives.
- Localized payment return redirects on the route-safe `common` namespace.
- Localized the edit-choice dialog and welcome-back modal, then rechecked locale-driven font class behavior.
- Localized the remaining hardcoded challenge tab/list surface and added the supporting `group.json` keys.
- Added a localized default alt label to `CreditIconImage`.

## Checked file lists

### A. Full runtime source files checked by automated repo-wide scan

This list is the authoritative folder-structured inventory for the full-runtime scan that fed the final counts above.

### `src`

- `App.jsx`
- `main.jsx`
- `queryClient.js`

### `src/api`

- `AIAPI.js`
- `api.js`
- `Authentication.js`
- `ChallengeAPI.js`
- `FeedbackAPI.js`
- `FlashcardAPI.js`
- `GroupAPI.js`
- `GroupDiscussionAPI.js`
- `InactivityAPI.js`
- `ManagementSystemAPI.js`
- `MaterialAPI.js`
- `PaymentAPI.js`
- `ProfileAPI.js`
- `QuizAPI.js`
- `RoadmapAPI.js`
- `RoadmapPhaseAPI.js`
- `StudyProfileAPI.js`
- `SystemConfigAPI.js`
- `WorkspaceAPI.js`

### `src/Components`

- `Footer.jsx`
- `ToastNotification.jsx`

### `src/Components/admin`

- `AdminStatCard.jsx`

### `src/Components/features`

- `WebSocketStatus.jsx`

### `src/Components/features/Admin`

- `AdminLayout.jsx`
- `Navbar.jsx`

### `src/Components/features/backoffice`

- `BackofficeShell.jsx`
- `backofficeTheme.js`

### `src/Components/features/Contributors`

- `ContributorsLayout.jsx`

### `src/Components/features/Group_leader`

- `GroupLeaderLayout.jsx`

### `src/Components/features/Members`

- `MembersLayout.jsx`

### `src/Components/features/Users`

- `Header.jsx`
- `UserProfilePopover.jsx`
- `WelcomeBackModal.jsx`

### `src/Components/features/Workspace`

- `UploadSourceDialogBase.jsx`

### `src/Components/feedback`

- `DirectFeedbackButton.jsx`
- `FeedbackAutoPrompt.jsx`
- `FeedbackQuestionFields.jsx`
- `FeedbackSubmitDialog.jsx`
- `FeedbackTicketDialog.jsx`

### `src/Components/math`

- `heuristicMath.js`
- `MixedMathText.jsx`

### `src/Components/plan`

- `PlanGatedFeature.jsx`
- `PlanUpgradeModal.jsx`

### `src/Components/seo`

- `RouteMetaManager.jsx`

### `src/Components/system`

- `RuntimeRecoveryBoundary.jsx`

### `src/Components/ui`

- `AuthIllustration.jsx`
- `badge.jsx`
- `button.jsx`
- `card.jsx`
- `checkbox.jsx`
- `CircularProgressLoader.jsx`
- `CreditIconImage.jsx`
- `dialog.jsx`
- `dropdown-menu.jsx`
- `floating-input.jsx`
- `HomeButton.jsx`
- `HoverMarqueeText.jsx`
- `InlineSpinner.jsx`
- `input.jsx`
- `label.jsx`
- `ListSpinner.jsx`
- `LoadingSpinner.jsx`
- `LocalAvatar.jsx`
- `PayButton.jsx`
- `switch.jsx`
- `table.jsx`

### `src/Components/users`

- `UserDisplayName.jsx`

### `src/Components/workspace`

- `RoadmapConfigEditDialog.jsx`
- `RoadmapConfigSummaryDialog.jsx`
- `roadmapConfigUtils.js`
- `RoadmapGuideButton.jsx`
- `RoadmapReviewPanel.jsx`
- `WorkspaceOnboardingUpdateGuardDialog.jsx`

### `src/Constants`

- `errorCodes.js`

### `src/context`

- `NavigationLoadingContext.jsx`
- `ToastContext.jsx`
- `UserProfileContext.jsx`

### `src/hooks`

- `useActiveTaskFallback.js`
- `useAdminPermissions.jsx`
- `useCurrentSubscription.js`
- `useDarkMode.jsx`
- `useFormValidator.js`
- `useGroup.js`
- `useNavigateWithLoading.js`
- `usePlanEntitlements.js`
- `usePlanUpgradeInfo.js`
- `useProgressTracking.js`
- `useSequentialProgressMap.js`
- `useWallet.js`
- `useWebSocket.js`
- `useWorkspace.js`

### `src/lib`

- `aiModelCatalog.js`
- `authAvailabilityBloom.js`
- `authOtpSocket.js`
- `challengeSchedule.js`
- `feedback.js`
- `groupReviewMockState.js`
- `groupWorkspaceLogDisplay.js`
- `launchConfig.js`
- `learningConfigAdminFilters.js`
- `quizDurationDisplay.js`
- `quizQuestionTypes.js`
- `routeLoaders.js`
- `routePaths.js`
- `runtimeRecovery.js`
- `runtimeTaskSignal.js`
- `utils.js`
- `websocketUrl.js`

### `src/Pages/Admin`

- `AdminDashboard.jsx`
- `AdminLayout.jsx`
- `AdminPaymentManagement.jsx`
- `AiActionPolicyManagement.jsx`
- `CommunityQuizManagement.jsx`
- `CreditPackageManagement.jsx`
- `GroupManagement.jsx`
- `MyPermissionsPage.jsx`
- `PlanManagement.jsx`
- `SystemSettingManagement.jsx`
- `UserManagement.jsx`

### `src/Pages/Admin/components`

- `AdminPagination.jsx`
- `AdminSidebar.jsx`
- `PlanFormWizard.jsx`
- `RecentActivity.jsx`
- `StatCard.jsx`

### `src/Pages/Authentication`

- `AuthGoogleProvider.jsx`
- `DiagonalHeroPanel.jsx`
- `ForgotPassword.js`
- `ForgotPasswordPage.jsx`
- `Login.js`
- `LoginPage.jsx`
- `Register.js`
- `RegisterPage.jsx`

### `src/Pages/LandingPage`

- `LandingPage.jsx`

### `src/Pages/LandingPage/components`

- `FeaturesSection.jsx`
- `Footer.jsx`
- `HeroSection.jsx`
- `icons.jsx`
- `Navbar.jsx`
- `PricingSection.jsx`
- `TestimonialsSection.jsx`

### `src/Pages/LaunchingPage`

- `LaunchingPage.jsx`

### `src/Pages/NotFound`

- `NotFoundPage.jsx`

### `src/Pages/Payment`

- `CreditPaymentPage.jsx`
- `MomoReturnRedirect.jsx`
- `PaymentPage.jsx`
- `PaymentResultPage.jsx`
- `StripeReturnRedirect.jsx`
- `VnPayReturnRedirect.jsx`

### `src/Pages/Payment/components`

- `PaymentMethods.jsx`
- `PaymentSidebar.jsx`
- `PlanDetails.jsx`
- `PlanInfoCard.jsx`
- `UpgradePlanDialog.jsx`

### `src/Pages/Payment/hooks`

- `usePaymentCheckout.js`

### `src/Pages/Pricing`

- `PricingGuidePage.jsx`

### `src/Pages/Route`

- `HomeTabRedirect.jsx`
- `protectedRoute.jsx`
- `route.js`

### `src/Pages/SuperAdmin`

- `AdminManagement.jsx`
- `AiAuditManagement.jsx`
- `AiCostManagement.jsx`
- `AiModelsManagement.jsx`
- `AiProvidersOverview.jsx`
- `FeedbackManagement.jsx`
- `FeedbackManagementLayout.jsx`
- `FeedbackResponseActivityPage.jsx`
- `FeedbackTicketManagementPage.jsx`
- `GroupDetailPage.jsx`
- `PermissionRequestsPage.jsx`
- `RbacManagement.jsx`
- `SuperAdminDashboard.jsx`
- `SuperAdminLayout.jsx`
- `TopicManagement.jsx`
- `UserDetailPage.jsx`

### `src/Pages/SuperAdmin/Components`

- `FeedbackResponseActivityPanel.jsx`
- `FeedbackTicketManagementPanel.jsx`
- `superAdminNavigation.js`
- `SuperAdminSidebar.jsx`
- `SuperAdminSurface.jsx`
- `UserWorkspaceExplorer.jsx`

### `src/Pages/Users/Credit`

- `WalletPage.jsx`

### `src/Pages/Users/Feedback`

- `FeedbackCenterPage.jsx`
- `FeedbackProductPage.jsx`
- `FeedbackSurveyPage.jsx`
- `FeedbackSystemLayout.jsx`
- `FeedbackSystemPage.jsx`

### `src/Pages/Users/Feedback/components`

- `FeedbackSystemShared.jsx`

### `src/Pages/Users/Group`

- `AcceptInvitationPage.jsx`
- `GroupWorkspacePage.jsx`

### `src/Pages/Users/Group/Components`

- `ChallengeBracketView.jsx`
- `ChallengeDetailView.jsx`
- `ChallengeLeaderboard.jsx`
- `ChallengeListView.jsx`
- `ChallengeScheduleFields.jsx`
- `ChallengeTab.jsx`
- `ChallengeTeamScoreboard.jsx`
- `ChatPanel.jsx`
- `CreateChallengeWizard.jsx`
- `CreateFlashcardForm.jsx`
- `CreateGroupInfoDialog.jsx`
- `CreateGroupMockTestForm.jsx`
- `CreateQuizForm.jsx`
- `CreateRoadmapForm.jsx`
- `EditQuizForm.jsx`
- `FlashcardListView.jsx`
- `GroupDiscussionPanel.jsx`
- `groupDiscussionReplyUtils.js`
- `GroupDocumentsTab.jsx`
- `GroupMembersPanel.jsx`
- `GroupProfileOverviewPanel.jsx`
- `GroupQuizReviewPanel.jsx`
- `GroupRankingTab.jsx`
- `GroupSidebar.jsx`
- `GroupWorkspaceCreditGateModal.jsx`
- `GroupWorkspaceHeader.jsx`
- `GroupWorkspaceProfileConfigDialog.jsx`
- `GroupWorkspaceProfileConfigMirror.jsx`
- `MockTestListView.jsx`
- `QuestionDiscussionDialog.jsx`
- `QuestionInlineDiscussion.jsx`
- `QuizDetailView.jsx`
- `QuizListView.jsx`
- `RoadmapCanvasView.jsx`
- `RoadmapCanvasView2.jsx`
- `RoadmapCanvasViewOverview.jsx`
- `RoadmapCanvasViewStage.jsx`
- `RoadmapJourPanel.jsx`
- `RoadmapPhaseGenerateDialog.jsx`
- `SourceDetailView.jsx`
- `SourcesPanel.jsx`
- `StudioPanel.jsx`
- `UploadSourceDialog.jsx`

### `src/Pages/Users/Group/Components/CreateQuizFormParts`

- `aiConfigUtils.js`
- `AIQuizTab.jsx`

### `src/Pages/Users/Group/Contributors`

- `page.jsx`

### `src/Pages/Users/Group/Group_leader`

- `GroupDashboardTab.jsx`
- `GroupManagementPage.jsx`
- `GroupMembersTab.jsx`
- `GroupMemberStatsTab.jsx`
- `GroupPendingReviewPanel.jsx`
- `GroupSettingsTab.jsx`
- `GroupWalletTab.jsx`
- `InviteMemberDialog.jsx`
- `memberStatsInsights.js`
- `page.jsx`

### `src/Pages/Users/Group/hooks`

- `useRoadmapPreLearningDecision.js`

### `src/Pages/Users/Group/Members`

- `page.jsx`

### `src/Pages/Users/Group/review`

- `GroupReviewWorkspaceShell.jsx`

### `src/Pages/Users/Group/utils`

- `groupDisplay.js`
- `groupPermissionView.js`
- `groupQuizTitleLimit.js`
- `memberSeatLimit.js`

### `src/Pages/Users/Home`

- `HomePage.jsx`

### `src/Pages/Users/Home/Components`

- `CommunityGroupBoard.jsx`
- `CreateGroupDialog.jsx`
- `CreateNewDialog.jsx`
- `CreateWorkspaceDialog.jsx`
- `DeleteWorkspaceDialog.jsx`
- `EditWorkspaceDialog.jsx`
- `HomeContent.jsx`
- `Pagination.jsx`
- `UserGroup.jsx`
- `UserWorkspace.jsx`
- `workspaceData.js`

### `src/Pages/Users/Individual/Workspace`

- `WorkspacePage.jsx`

### `src/Pages/Users/Individual/Workspace/Components`

- `ChatPanel.jsx`
- `CommunityQuizExplorerView.jsx`
- `ConfirmDuplicateDialog.jsx`
- `CreateFlashcardForm.jsx`
- `CreateMockTestForm.jsx`
- `CreatePostLearningForm.jsx`
- `CreateQuizForm.jsx`
- `CreateRoadmapForm.jsx`
- `EditChoiceDialog.jsx`
- `EditMockTestForm.jsx`
- `EditQuizForm.jsx`
- `FlashcardDetailView.jsx`
- `FlashcardListView.jsx`
- `IndividualWorkspaceProfileConfigDialog.jsx`
- `IndividualWorkspaceProfileOverviewDialog.jsx`
- `ManualFlashcardEditor.jsx`
- `MockTestDetailView.jsx`
- `MockTestListView.jsx`
- `PersonalWorkspaceSidebar.jsx`
- `PostLearningListView.jsx`
- `QuestionStatsView.jsx`
- `QuickCreateDialog.jsx`
- `QuizDetailView.jsx`
- `QuizListView.jsx`
- `QuizMetadataEditModal.jsx`
- `quizTitleConfig.js`
- `resolveEditRule.js`
- `RoadmapCanvasView.jsx`
- `RoadmapCanvasView2.jsx`
- `RoadmapCanvasViewOverview.jsx`
- `RoadmapCanvasViewStage.jsx`
- `RoadmapJourPanel.jsx`
- `RoadmapPhaseGenerateDialog.jsx`
- `SourceDetailView.jsx`
- `SourcesPanel.jsx`
- `UploadSourceDialog.jsx`
- `useWorkspaceMaterialSelection.js`
- `WelcomePanel.jsx`
- `WorkspaceOverviewView.jsx`
- `workspaceShellTheme.js`

### `src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts`

- `CreateQuizAiFormContent.jsx`
- `CreateQuizAiRecommendationsPanel.jsx`
- `createQuizForm.constants.js`
- `createQuizForm.utils.js`
- `CreateQuizFormContainer.jsx`
- `useCreateQuizAiForm.js`
- `useInlineQuizRecommendations.js`

### `src/Pages/Users/Individual/Workspace/Components/ManualQuizWizard`

- `AnswerEditor.jsx`
- `ImportQuestionsPanel.jsx`
- `index.jsx`
- `QuestionCard.jsx`
- `QuestionNav.jsx`
- `Step1Config.jsx`
- `Step2Questions.jsx`
- `StickyQuestionBar.jsx`
- `useQuestionTimeBalancer.js`
- `wizardHelpers.js`

### `src/Pages/Users/Individual/Workspace/Components/WorkspaceProfileWizard`

- `mockProfileWizardData.js`
- `profileWizardBeginnerUtils.js`
- `useWorkspaceProfileWizard.js`
- `WorkspaceProfileStepOne.jsx`
- `WorkspaceProfileStepThree.jsx`
- `WorkspaceProfileStepTwo.jsx`
- `WorkspaceProfileStepUpload.jsx`

### `src/Pages/Users/Individual/Workspace/hooks`

- `useRoadmapPreLearningDecision.js`
- `useWorkspaceMockTestGeneration.js`
- `useWorkspaceRoadmapManager.js`

### `src/Pages/Users/Individual/Workspace/utils`

- `roadmapProcessing.js`
- `viewRouting.js`

### `src/Pages/Users/MockTest/components`

- `MockTestReviewExtensions.jsx`
- `MockTestStructureEditor.jsx`

### `src/Pages/Users/MockTest/hooks`

- `useMockTestStructureSuggestion.js`

### `src/Pages/Users/MockTest/utils`

- `mockTestRealtime.js`

### `src/Pages/Users/Plan`

- `PlanPage.jsx`

### `src/Pages/Users/Profile`

- `ProfilePage.jsx`

### `src/Pages/Users/Profile/Components`

- `PlanCard.jsx`
- `ProfileHeader.jsx`
- `SubscriptionTab.jsx`

### `src/Pages/Users/Quiz`

- `ExamQuizPage.jsx`
- `PracticeQuizPage.jsx`
- `QuizResultPage.jsx`

### `src/Pages/Users/Quiz/components`

- `CommunityQuizDetailDialog.jsx`
- `CommunityQuizFeedbackDialog.jsx`
- `CommunityQuizRecommendationInsightsPanel.jsx`
- `CommunityQuizRecommendationsPanel.jsx`
- `CommunityQuizSignals.jsx`
- `ExamPerQuestion.jsx`
- `HourglassLoader.jsx`
- `MatchingDragDrop.jsx`
- `QuestionCard.jsx`
- `QuestionNavPanel.jsx`
- `QuizHeader.jsx`

### `src/Pages/Users/Quiz/hooks`

- `useQuizAutoSave.js`
- `useQuizProgress.js`

### `src/Pages/Users/Quiz/utils`

- `quizTransform.js`

### `src/Utils`

- `apiResponse.js`
- `emailValidation.js`
- `getErrorMessage.js`
- `planPurchaseState.js`
- `quizAttemptTracker.js`
- `userCache.js`
- `userProfile.js`

### B. Files manually deep-reviewed and/or modified in the latest repo-wide recheck

### `src/Components`

- `ToastNotification.jsx`

### `src/Components/features/backoffice`

- `BackofficeShell.jsx`

### `src/Components/features/Users`

- `WelcomeBackModal.jsx`

### `src/Components/ui`

- `CreditIconImage.jsx`
- `dialog.jsx`
- `LoadingSpinner.jsx`

### `src/Components/workspace`

- `WorkspaceOnboardingUpdateGuardDialog.jsx`

### `src/i18n/locales/en`

- `admin.json`
- `common.json`
- `group.json`
- `home.json`
- `workspace.json`

### `src/i18n/locales/vi`

- `admin.json`
- `common.json`
- `group.json`
- `home.json`
- `workspace.json`

### `src/Pages/Payment`

- `MomoReturnRedirect.jsx`
- `StripeReturnRedirect.jsx`
- `VnPayReturnRedirect.jsx`

### `src/Pages/Users/Group/Components`

- `ChallengeListView.jsx`
- `ChallengeScheduleFields.jsx`
- `ChallengeTab.jsx`

### `src/Pages/Users/Individual/Workspace/Components`

- `ConfirmDuplicateDialog.jsx`
- `EditChoiceDialog.jsx`

### `src/test/payment`

- `VnPayReturnRedirect.test.jsx`

### `src/test/toast`

- `toast.test.jsx`

### C. i18n/docs files explicitly rechecked as references or validation targets

### `docs/assistant/sessions`

- `2026-04-25__fe-i18n-phase-01-public-auth.md`
- `2026-04-25__fe-i18n-phase-02-user-core.md`
- `2026-04-25__fe-i18n-phase-03-learning-workflow.md`
- `2026-04-25__fe-i18n-phase-04-admin-backoffice.md`
- `2026-04-25__fe-i18n-recheck-passlist.md`

### `src/i18n`

- `index.js`

### `src/i18n/locales/en`

- `admin.json`
- `common.json`
- `group.json`
- `home.json`
- `workspace.json`

### `src/i18n/locales/vi`

- `admin.json`
- `common.json`
- `group.json`
- `home.json`
- `workspace.json`

## Counting notes

- Runtime source total: `370`
- UI heuristic scan total: `306`
- `src/Pages`: `252` files
- `src/Components`: `54` files
- Remaining runtime files outside `Pages + Components`: `64` files

## Verification notes

- Locale parse check was rerun on: `en/vi common.json`, `home.json`, `workspace.json`, `group.json`, and `admin.json`.
- Font-sensitive recheck in this pass covered the newly touched locale-switching surfaces: `WelcomeBackModal.jsx`, `EditChoiceDialog.jsx`, and the earlier shared/admin surfaces already fixed in the same session.
- Browser click-through QA is still not included in this report. This report is based on source scan, locale parse, and production build verification.

## 2026-04-25 Vietnamese locale cleanup before remaining FE scan

- Updated Vietnamese locale files to remove broken strings such as `Ch? duy?t`, `Quy?n`, `?ang`, `Hu?`, and similar question-mark corruption in admin/group/home/workspace/common surfaces.
- Files updated in this cleanup step:
  - `src/i18n/locales/vi/admin.json`
  - `src/i18n/locales/vi/common.json`
  - `src/i18n/locales/vi/group.json`
  - `src/i18n/locales/vi/home.json`
  - `src/i18n/locales/vi/workspace.json`
- Fixed areas included:
  - admin permission request flows and user deletion labels
  - group member permission catalog and challenge reviewer invitation copy
  - payment extra-slot copy in home locale
  - roadmap/community detail labels in workspace locale
  - shared common save/edit wallet strings
- Verification for this cleanup step:
  - `JSON.parse` passed for all files under `src/i18n/locales/vi`
  - raw `?` grep on touched locale files only left legitimate question prompts or route/query-string documentation, not broken Vietnamese words
  - `npm run build` passed after the locale fixes
  - existing Vite warning about `src/api/ProfileAPI.js` dynamic + static import remains unchanged from earlier passes
