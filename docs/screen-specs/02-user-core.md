# User Core Specifications

## HOME-01 Home Workspace Tab

Function Trigger:
- Route Trigger: A signed-in USER opens `/home?tab=workspace`.
- Redirect Trigger: `/workspaces` resolves to the Home page with the workspace tab selected.

Function Description:
- Actor: USER.
- Purpose: To let the user view, search, sort, create, edit, delete, and open personal workspaces from a single entry page.
- Interface: A tab-based home dashboard with shared header utilities, a workspace listing area, and workspace management dialogs.
- Data Processing:
  - Workspace Listing and Mutations: `useWorkspace`
  - Wallet Summary: `getMyWallet`
  - Current Plan Summary: `useCurrentSubscription`

Screen Layout:
- Shared page header:
  - Theme toggle
  - Language toggle
  - Wallet summary
  - User profile popover
- Main tab switcher:
  - Workspace tab
  - Group tab
- Workspace controls:
  - Search
  - Sort
  - View switching where applicable
- Workspace listing area
- Edit and delete workspace dialogs

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `activeTab`: Determines whether the page shows personal workspaces or group workspaces.<br>• `workspaceSearchQuery`: Client-side search input for personal workspace results.<br>• `viewMode`: Presentation mode for the listing area.<br>• `pagination`: Current page and page-size control data.<br>• `sortMode`: The selected sort strategy for workspace ordering.<br>• `walletSummary`: Credit and plan-related wallet information shown in the header. |
| 2 | Validation Rules | • The `tab` query parameter is normalized so unsupported values fall back to `workspace`.<br>• Workspace actions require a valid `workspaceId`.<br>• Create, edit, and delete mutations only run when the underlying hook state is ready. |
| 3 | Business Rules | • Creating a new personal workspace immediately navigates into that workspace.<br>• A newly created personal workspace opens with onboarding/profile configuration state.<br>• The page preloads target workspace routes to reduce perceived transition time.<br>• Home is the central entry point for both personal and group learning flows. |
| 4 | Normal Case | • The user opens `/home?tab=workspace`.<br>• The page loads the user’s personal workspace list.<br>• The user filters or sorts the list if needed.<br>• The user opens an existing workspace or creates a new one.<br>• The app navigates into the selected workspace flow. |
| 5 | Abnormal Cases | • No personal workspaces exist, so the page must show a meaningful empty state.<br>• Workspace creation fails and a toast error is shown.<br>• Edit or delete actions fail and the list remains unchanged.<br>• Wallet summary fails to load and the page must degrade gracefully. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:117)
- Page: [HomePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Home/HomePage.jsx:1)

## HOME-02 Home Group Tab

Function Trigger:
- Route Trigger: A signed-in USER opens `/home?tab=group`.
- Redirect Trigger: `/group-workspaces` resolves to the Home page with the group tab selected.

Function Description:
- Actor: USER.
- Purpose: To let the user view and enter joined or owned group workspaces from the same home dashboard.
- Interface: The same Home page shell as the workspace tab, but with group-specific controls and listing content.
- Data Processing:
  - Group Listing: `useGroup`
  - Owned Group Merge Logic: `mergeGroupsWithOwnedWorkspaces`

Screen Layout:
- Shared home header
- Group tab selected
- Group search and filter controls
- Group listing area

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `groupSearchQuery`: Search text used for group filtering.<br>• `groups`: Group list returned from the group hook.<br>• `mergedGroups`: Combined list of joined groups and owned group workspaces.<br>• `groupsLoading`: Group-specific loading state. |
| 2 | Validation Rules | • The page only enables group fetching when the selected tab is `group`.<br>• Merged group data requires valid `workspaceId` values to be included in the final list. |
| 3 | Business Rules | • The group tab merges API-provided joined groups with owned group workspaces for a complete list.<br>• Newly created group workspaces navigate directly into the group workspace route.<br>• Group-related list ordering prioritizes most recently joined or created workspaces. |
| 4 | Normal Case | • The user opens `/home?tab=group`.<br>• The page loads joined groups and owned group workspaces.<br>• The merged group list is displayed.<br>• The user enters a group workspace or creates a new group workspace. |
| 5 | Abnormal Cases | • No groups are available and an empty state must be shown.<br>• Group creation fails and a toast error appears.<br>• The merge logic produces no valid group records because upstream data is incomplete. |
Source of Truth:
- Page: [HomePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Home/HomePage.jsx:1)

## HOME-03 Edit Workspace Dialog

Function Trigger:
- UI Trigger: The user clicks the edit action from a workspace card in the Home page listing.

Function Description:
- Actor: USER.
- Purpose: To update workspace metadata without leaving the Home page.
- Interface: A modal dialog opened from the Home page.
- Data Processing:
  - Update Mutation: `editWorkspace(workspaceId, data)`

Screen Layout:
- Dialog title and description
- Editable workspace fields
- Cancel action
- Save action

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `workspaceId`: The unique target workspace identifier.<br>• `name` or `title`: The editable display label for the workspace.<br>• `description`: Optional supporting workspace description. |
| 2 | Validation Rules | • The dialog requires a valid selected workspace before opening.<br>• Save should only proceed when required fields are valid. |
| 3 | Business Rules | • Save should update the Home page listing after a successful mutation.<br>• The dialog should close on success and preserve the rest of the page context. |
| 4 | Normal Case | • The user clicks edit.<br>• The dialog opens with the selected workspace context.<br>• The user updates the fields and saves.<br>• The Home page list reflects the updated workspace data. |
| 5 | Abnormal Cases | • The selected workspace is missing or invalid.<br>• The save request fails and the dialog remains open with an error state.<br>• The user cancels without saving. |
Source of Truth:
- Component: [EditWorkspaceDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Home/Components/EditWorkspaceDialog.jsx)

## HOME-04 Delete Workspace Dialog

Function Trigger:
- UI Trigger: The user clicks the delete action from a workspace card in the Home page listing.

Function Description:
- Actor: USER.
- Purpose: To confirm and complete workspace deletion from the Home page.
- Interface: A confirmation dialog for destructive action handling.
- Data Processing:
  - Delete Mutation: `removeWorkspace(workspaceId)`

Screen Layout:
- Warning or confirmation text
- Cancel action
- Delete action

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `workspaceId`: The workspace being targeted for deletion.<br>• `workspaceName`: The workspace label shown in the confirmation dialog where applicable. |
| 2 | Validation Rules | • The dialog requires a valid selected workspace before delete can be submitted.<br>• Delete should remain blocked while the mutation is already in progress. |
| 3 | Business Rules | • A successful delete removes the workspace from the Home page list.<br>• A success toast should be displayed after deletion.<br>• A failed delete should keep the dialog context intact and show a clear error state. |
| 4 | Normal Case | • The user clicks delete on a workspace card.<br>• The dialog opens and the user confirms deletion.<br>• The backend confirms the delete operation.<br>• The workspace disappears from the Home page listing. |
| 5 | Abnormal Cases | • The delete API fails.<br>• The workspace cannot be deleted because of a backend rule.<br>• The user cancels the dialog. |
Source of Truth:
- Component: [DeleteWorkspaceDialog.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Home/Components/DeleteWorkspaceDialog.jsx)

## PROFILE-01 Profile Overview

Function Trigger:
- Route Trigger: A USER opens `/profiles`.

Function Description:
- Actor: USER.
- Purpose: To provide a personal account center for profile information, account controls, wallet summary, and plan visibility.
- Interface: A tab-driven profile page with identity panels, summary cards, and account settings access.
- Data Processing:
  - Profile Context: `useUserProfile`
  - Wallet Summary: `getMyWallet`
  - Subscription Summary: `useCurrentSubscription`

Screen Layout:
- Profile header and identity area
- Overview tab content
- Settings dropdown
- Summary cards and profile metrics

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `fullName`<br>• `email`<br>• `username`<br>• `avatarUrl`<br>• `birthday`<br>• `walletSummary`<br>• `currentPlanSummary`<br>• `activeTab` |
| 2 | Validation Rules | • The profile page depends on authenticated user context.<br>• When context data is still loading, the page must render a loading state instead of incomplete profile data. |
| 3 | Business Rules | • The page serves as the user’s main account management destination.<br>• If an external state asks for the old subscription tab, the flow redirects to `/plans`.<br>• Wallet and plan summaries are surfaced directly in the profile experience. |
| 4 | Normal Case | • The user opens `/profiles`.<br>• The page loads profile context and wallet data.<br>• The user reviews profile information and account summaries.<br>• The user opens edit or password actions if needed. |
| 5 | Abnormal Cases | • Profile context fails to load.<br>• Wallet data fails to load.<br>• The page renders partial account information while non-critical auxiliary data is unavailable. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:107)
- Page: [ProfilePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Profile/ProfilePage.jsx:1)

## PROFILE-02 Profile Edit State

Function Trigger:
- UI Trigger: The user activates profile editing inside `ProfilePage`.

Function Description:
- Actor: USER.
- Purpose: To let the user update editable personal information and avatar content.
- Interface: An inline edit state within the profile page.
- Data Processing:
  - Profile Update: `updateUserProfile`
  - Avatar Upload: `uploadAvatar`

Screen Layout:
- Editable fields
- Avatar upload control
- Save and cancel actions

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `fullName`: Editable full name.<br>• `birthday`: Editable birth date.<br>• `avatarFile`: Selected image file for avatar upload.<br>• `saving`: State used for update submission feedback.<br>• `uploadingAvatar`: State used for avatar upload progress. |
| 2 | Validation Rules | • Editable fields must pass frontend validation before submission.<br>• Avatar upload requires a valid selected file. |
| 3 | Business Rules | • Successful edits should update the profile context, not only the local page state.<br>• Avatar changes and profile field updates may occur through separate API operations.<br>• The page should preserve the surrounding profile layout during editing. |
| 4 | Normal Case | • The user enters edit mode.<br>• The user updates name, birthday, or avatar.<br>• The app submits the update and refreshes the displayed profile data. |
| 5 | Abnormal Cases | • Profile update fails.<br>• Avatar upload fails.<br>• The user cancels editing before saving. |
Source of Truth:
- Page: [ProfilePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Profile/ProfilePage.jsx:1)
- API: [ProfileAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/ProfileAPI.js)

## PROFILE-03 Change Password Dialog

Function Trigger:
- UI Trigger: The user opens the change-password dialog from the profile page.

Function Description:
- Actor: USER.
- Purpose: To let an authenticated user change their current password.
- Interface: A modal dialog with old password, new password, and confirmation fields.
- Data Processing:
  - Password Change: `changePassword`

Screen Layout:
- Dialog header
- Old password field
- New password field
- Confirm password field
- Save and cancel actions

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `oldPassword`<br>• `newPassword`<br>• `confirmNewPassword`<br>• Password visibility toggles for each input |
| 2 | Validation Rules | • The old password is required.<br>• The new password must satisfy password-strength rules.<br>• The confirmation password must exactly match the new password. |
| 3 | Business Rules | • The dialog stays inside the profile page flow and does not navigate away.<br>• The user should receive clear success or failure feedback after submission. |
| 4 | Normal Case | • The user opens the dialog.<br>• The user enters valid password values.<br>• The app submits the request.<br>• The dialog closes or updates to a success state. |
| 5 | Abnormal Cases | • The old password is incorrect.<br>• The new password is too weak.<br>• The confirmation field does not match.<br>• The backend request fails. |
Source of Truth:
- Page: [ProfilePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Profile/ProfilePage.jsx:1)

## PLAN-01 Plan Page

Function Trigger:
- Route Trigger: A USER opens `/plans`.

Function Description:
- Actor: USER.
- Purpose: To compare user and group plans, review current subscription state, and begin plan purchase flows.
- Interface: A plan comparison and selection page with support for both personal and group scope.
- Data Processing:
  - `getActiveUserPlans`
  - `getActiveGroupPlan`
  - `getWorkspaceCurrentPlan`
  - `getMyWallet`

Screen Layout:
- Header and navigation block
- User plan section
- Group plan section
- Current subscription summary
- CTA actions that lead to payment

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Plan catalog entries<br>• Plan prices<br>• Entitlement summaries<br>• Current subscription summaries<br>• Wallet summary<br>• Optional workspace or group scope query context |
| 2 | Validation Rules | • Plan-selection logic must distinguish clearly between user-scope and group-scope plans.<br>• Group-scope routes or actions require a valid workspace context when applicable. |
| 3 | Business Rules | • The page is the authenticated pricing and entitlement page, distinct from the public `/pricing` route.<br>• Current-plan highlighting should be visible before the user starts a purchase flow.<br>• CTA actions route to the corresponding payment experience. |
| 4 | Normal Case | • The user opens `/plans`.<br>• The page loads available plans and the current subscription.<br>• The user compares plans and selects one.<br>• The app navigates to the appropriate payment page. |
| 5 | Abnormal Cases | • Plans fail to load.<br>• Group context is missing for a group plan.<br>• Current subscription data is stale or unavailable. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:108)
- Page: [PlanPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Plan/PlanPage.jsx:1)

## PLAN-02 Plan Upgrade Modal

Function Trigger:
- Guard Trigger: The user tries to open a feature that is not included in the current plan.
- Workspace Trigger: Personal and group workspace flows open this modal when entitlement checks fail for roadmap, analytics, or other gated features.

Function Description:
- Actor: USER.
- Purpose: To explain that the current plan does not include the requested feature and route the user into the correct upgrade flow.
- Interface: A lightweight confirmation modal with feature-specific messaging, an upgrade CTA, and a dismiss action.
- Data Processing:
  - Receives `featureName`, `upgradePath`, and optional router `upgradeState` from the caller.
  - Redirects to the plan or upgrade route when the user confirms.

Screen Layout:
- Hero icon area.
- Upgrade message block.
- Primary `Upgrade now` action.
- Secondary `Later` dismiss action.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `featureName`: Optional feature label interpolated into the upgrade message.<br>• `upgradePath`: Route target used by the CTA, defaulting to `/plans`.<br>• `upgradeState`: Optional router state passed into the upgrade navigation.<br>• `open`: Modal visibility state controlled by the parent screen.<br>• `isDarkMode`: Theme variant used for the dialog presentation. |
| 2 | Validation Rules | • The modal should only open when a real entitlement or plan gate has already been detected by the parent flow.<br>• `upgradePath` should resolve to a valid in-app route before navigation is attempted.<br>• If `featureName` is missing, the dialog must still render a generic upgrade explanation. |
| 3 | Business Rules | • This modal is a shared gating component reused by different workspace flows rather than a route page.<br>• The primary CTA closes the dialog first, then navigates to the upgrade destination.<br>• The upgrade destination can be the general plan page or a more specific group-plan path supplied by the caller.<br>• The modal is informational only; it does not itself perform purchase logic. |
| 4 | Normal Case | • The user clicks a plan-gated feature.<br>• The parent flow detects insufficient entitlement and opens the modal.<br>• The modal explains which feature is locked.<br>• The user clicks `Upgrade now` and is routed to the correct upgrade flow. |
| 5 | Abnormal Cases | • The user closes the modal without upgrading.<br>• The supplied upgrade path is invalid and navigation fails.<br>• The parent screen provides no `featureName`, so the modal falls back to generic copy. |
Source of Truth:
- Shared Modal: [PlanUpgradeModal.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Components/plan/PlanUpgradeModal.jsx)
- Personal Workspace Usage: [WorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Individual/Workspace/WorkspacePage.jsx:1)
- Group Workspace Usage: [GroupWorkspacePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/GroupWorkspacePage.jsx:1)

## PAY-01 Payment Plan Page

Function Trigger:
- Route Trigger: A USER opens `/payments?planId=...`.

Function Description:
- Actor: USER.
- Purpose: To review the selected plan, bind it to the correct scope, and proceed into checkout.
- Interface: A payment review page with plan details, settings utilities, and optional group selection flow.
- Data Processing:
  - Plan Fetch: `getPlanById(planId)`
  - Group Scope Support: `useGroup`

Screen Layout:
- Header with return-to-plans action
- Main plan information area
- Sidebar or action panel
- Group workspace selector for group plans

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `planId`<br>• `workspaceId`<br>• Selected group workspace<br>• Plan summary<br>• Current plan summary |
| 2 | Validation Rules | • `planId` is required to load the page correctly.<br>• Group plans require a valid selected workspace before the user can continue to a final purchase step. |
| 3 | Business Rules | • The page must distinguish individual and group plans.<br>• When no `planId` is present, the page should show an error-safe state instead of continuing.<br>• When the selected plan is group-scoped, the page prompts the user to choose an eligible group workspace first. |
| 4 | Normal Case | • The user lands on `/payments?planId=...`.<br>• The selected plan loads successfully.<br>• The user reviews plan details.<br>• If needed, the user selects a group workspace.<br>• The user proceeds to payment. |
| 5 | Abnormal Cases | • Missing `planId`.<br>• Invalid or unavailable plan.<br>• Group plan without a valid group workspace context.<br>• API failure while loading plan data. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:104)
- Page: [PaymentPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Payment/PaymentPage.jsx:1)
- API: [PaymentAPI.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/PaymentAPI.js)

## PAY-02 Credit Payment Page

Function Trigger:
- Route Trigger: A USER opens `/payments/credits`.

Function Description:
- Actor: USER.
- Purpose: To purchase a credit package for either the current user or a group workspace.
- Interface: A credit-package payment flow.
- Data Processing:
  - Credit package lookup and checkout preparation

Screen Layout:
- Credit package summary
- Scope information
- Payment action area

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `creditPackageId`<br>• `workspaceId`<br>• Purchase scope<br>• Package pricing and quantity |
| 2 | Validation Rules | • A valid package identifier is required.<br>• Group-scoped purchases require a valid group workspace context when applicable. |
| 3 | Business Rules | • This page is separate from plan purchase and is specifically for credits.<br>• The destination payment experience depends on the selected payment method and scope. |
| 4 | Normal Case | • The user selects a credit package.<br>• The payment page loads with the matching package.<br>• The user confirms the purchase and continues. |
| 5 | Abnormal Cases | • Missing package identifier.<br>• Invalid or unavailable package.<br>• API failure while loading package details. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:105)
- Page: [CreditPaymentPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Payment/CreditPaymentPage.jsx)

## PAY-03 Payment Result Page

Function Trigger:
- Route Trigger: A USER opens `/payments/results`.
- Redirect Trigger: The user returns from a payment gateway flow.

Function Description:
- Actor: USER.
- Purpose: To show the final or in-progress state of a payment and guide the user back into the app.
- Interface: A result page with success, processing, cancelled, or failed states.
- Data Processing:
  - Payment Lookup: `getPaymentByOrderId`
  - Cache Refresh: Subscription or wallet refresh logic where applicable

Screen Layout:
- Status summary hero
- Payment details block
- Follow-up CTA area

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `orderId`<br>• Payment status<br>• Amount<br>• Purchased entity summary<br>• Follow-up navigation target |
| 2 | Validation Rules | • The page requires enough payment context to resolve or poll the payment status.<br>• Missing or invalid payment context must result in a safe error state. |
| 3 | Business Rules | • Successful plan purchases should refresh subscription-related state.<br>• Successful credit purchases should refresh wallet-related state.<br>• In-progress states may continue polling or instruct the user to wait. |
| 4 | Normal Case | • The user returns from the payment provider.<br>• The page resolves the payment status.<br>• The user sees a clear result and uses the CTA to continue back into the product. |
| 5 | Abnormal Cases | • Payment lookup fails.<br>• The order reference is missing.<br>• The payment remains in an unresolved processing state longer than expected. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:106)
- Page: [PaymentResultPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Payment/PaymentResultPage.jsx)

## PAY-04 VNPay Return Redirect

Function Trigger:
- Route Trigger: A USER is redirected back to `/api/vnpay/return` from the VNPay gateway.
- Recovery Trigger: The SPA temporarily captures the return URL before handing control back to the backend payment-return endpoint.

Function Description:
- Actor: USER.
- Purpose: To safely forward the browser from the frontend route layer to the backend VNPay return handler and provide a fallback if automatic redirection fails.
- Interface: A transient redirect screen with a loading indicator, an optional manual fallback link, and a configuration-error state when proxy setup is incorrect.
- Data Processing:
  - Reads VNPay query parameters from `window.location.search`.
  - Resolves API origin through `getApiOrigin()`.
  - Redirects the browser to `${apiOrigin}/api/vnpay/return${search}`.
  - Builds a direct `/payments/results` fallback URL from VNPay response parameters when needed.

Screen Layout:
- Redirect state:
  - Loading spinner.
  - Redirect progress message.
  - Delayed manual fallback link.
- Error state:
  - Proxy or API-base warning message.
  - Direct link to the payment-result page.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `search`: Raw VNPay query string returned from the payment gateway.<br>• `vnp_ResponseCode`: Gateway response code used to infer `success` or `failed` status.<br>• `vnp_TxnRef`: Order reference forwarded into the fallback payment-result URL.<br>• `vnp_Amount`: VNPay amount value converted back to application currency units for fallback display.<br>• `apiOrigin`: Backend origin resolved by `getApiOrigin()`.<br>• `showFallback`: Local timer-driven state that reveals a manual link if automatic redirect takes too long.<br>• `error`: Configuration warning shown when the frontend and API origin collapse onto the same host unexpectedly. |
| 2 | Validation Rules | • The route can render without full VNPay parameters, but fallback result data may be partial.<br>• Automatic redirect should only run in the browser and only when no proxy-configuration error is detected.<br>• The fallback result URL builder must tolerate missing or malformed query values without throwing. |
| 3 | Business Rules | • This is a technical bridge screen, not a final payment-result screen.<br>• On the happy path, the page immediately hands off to the backend VNPay return handler so the server can validate and finalize payment state.<br>• If the redirect has not visibly completed after approximately 4 seconds, the UI reveals a manual fallback link.<br>• If proxy configuration is wrong, the page stops auto-forwarding and instead shows a diagnostic message plus a direct result-page link. |
| 4 | Normal Case | • The payment gateway redirects the user to `/api/vnpay/return`.<br>• The page reads the query parameters and resolves the backend API origin.<br>• The browser is automatically redirected to the backend VNPay return handler.<br>• The backend completes payment processing and sends the user to the normal result flow. |
| 5 | Abnormal Cases | • Frontend proxy or `VITE_API_BASE_URL` is misconfigured, so the page shows the configuration error state instead of redirecting.<br>• The automatic redirect stalls and the user must click the manual fallback link.<br>• VNPay response parameters are incomplete, so the fallback result page receives only partial context. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:86)
- Page: [VnPayReturnRedirect.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Payment/VnPayReturnRedirect.jsx)

## WALLET-01 Wallet Page

Function Trigger:
- Route Trigger: A USER opens `/wallets`.

Function Description:
- Actor: USER.
- Purpose: To show credit balances and wallet-related transaction history.
- Interface: A wallet summary page.
- Data Processing:
  - Wallet APIs and payment-history APIs in the management system layer

Screen Layout:
- Balance summary block
- Credit breakdown
- Transaction history list
- Purchase CTA

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `totalAvailableCredits`<br>• `regularCreditBalance`<br>• `planCreditBalance`<br>• `planCreditExpiresAt`<br>• Wallet transaction records |
| 2 | Validation Rules | • Wallet data must safely fall back to empty values when the request fails. |
| 3 | Business Rules | • Wallet summary should clearly distinguish user-owned credits and plan-bound credits.<br>• CTA actions should connect naturally to plan purchase or credit purchase flows. |
| 4 | Normal Case | • The user opens `/wallets`.<br>• The page loads wallet balances and history.<br>• The user reviews balances and optionally navigates to a purchase flow. |
| 5 | Abnormal Cases | • Wallet data fails to load.<br>• History is empty.<br>• Payment state is stale after a recent purchase. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:109)
- Page: [WalletPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Credit/WalletPage.jsx)

## FEEDBACK-01 Feedback Overview

Function Trigger:
- Route Trigger: A USER opens `/feedbacks/overview`.

Function Description:
- Actor: USER.
- Purpose: To provide a central feedback dashboard that summarizes requests, tickets, and available actions.
- Interface: A shared feedback shell with navigation tabs and overview content.
- Data Processing:
  - `getPendingFeedbackRequests`
  - `getMyFeedbackTickets`

Screen Layout:
- Feedback shell header
- Stats badges
- Request summary
- Ticket summary

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Pending feedback requests<br>• Product tickets<br>• System tickets<br>• Ticket statistics<br>• Loading state |
| 2 | Validation Rules | • The shared feedback layout must only route to supported child segments. |
| 3 | Business Rules | • Refresh reloads requests and tickets together.<br>• The overview is the entry point for the other feedback routes under `/feedbacks/*`. |
| 4 | Normal Case | • The user opens the overview.<br>• The page loads pending requests and ticket data.<br>• The user opens a request or ticket dialog from the overview. |
| 5 | Abnormal Cases | • Requests fail to load.<br>• Tickets fail to load.<br>• Both lists are empty and the page must show a meaningful zero state. |
Source of Truth:
- Layout: [FeedbackSystemLayout.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Feedback/FeedbackSystemLayout.jsx:1)
- Page: [FeedbackCenterPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Feedback/FeedbackCenterPage.jsx)

## FEEDBACK-02 Feedback Product

Function Trigger:
- Route Trigger: A USER opens `/feedbacks/product`.

Function Description:
- Actor: USER.
- Purpose: To submit and track product-related feedback tickets.
- Interface: A product-feedback route inside the shared feedback shell.
- Data Processing:
  - Product ticket data from the feedback service layer
  - Ticket submit flows from shared dialogs

Screen Layout:
- Product ticket content area
- Product ticket CTA
- Ticket list or empty state

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Product ticket list<br>• Ticket status<br>• Submission trigger |
| 2 | Validation Rules | • Ticket submission must validate required inputs before sending. |
| 3 | Business Rules | • Product tickets are filtered by the `PRODUCT` channel type.<br>• This view should remain consistent with the shared feedback shell navigation. |
| 4 | Normal Case | • The user opens the product route.<br>• The user reviews product tickets or creates a new one. |
| 5 | Abnormal Cases | • Submission fails.<br>• The product ticket list is empty.<br>• Product ticket data fails to load. |
Source of Truth:
- Page: [FeedbackProductPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Feedback/FeedbackProductPage.jsx)

## FEEDBACK-03 Feedback System

Function Trigger:
- Route Trigger: A USER opens `/feedbacks/system`.

Function Description:
- Actor: USER.
- Purpose: To submit and track system-related issues and tickets.
- Interface: A system-feedback route inside the shared feedback shell.
- Data Processing:
  - System ticket data from the feedback service layer
  - Ticket submit flows from shared dialogs

Screen Layout:
- System issue content area
- System ticket CTA
- Ticket list or empty state

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • System ticket list<br>• Ticket status<br>• Submission trigger |
| 2 | Validation Rules | • Ticket submission must validate required issue content before submit. |
| 3 | Business Rules | • System tickets are filtered by the `SYSTEM` channel type.<br>• This route remains part of the same shared feedback shell used by all feedback routes. |
| 4 | Normal Case | • The user opens the system route.<br>• The user reviews or creates a system-related feedback ticket. |
| 5 | Abnormal Cases | • The system ticket list is empty.<br>• Submission fails.<br>• System ticket data fails to load. |
Source of Truth:
- Page: [FeedbackSystemPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Feedback/FeedbackSystemPage.jsx)

## FEEDBACK-04 Feedback Surveys

Function Trigger:
- Route Trigger: A USER opens `/feedbacks/surveys`.

Function Description:
- Actor: USER.
- Purpose: To present pending survey requests and let the user respond to them.
- Interface: A survey-focused route within the shared feedback shell.
- Data Processing:
  - Pending request data from feedback APIs

Screen Layout:
- Survey request list
- Survey action area
- Empty state for no pending surveys

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Pending survey requests<br>• Request metadata<br>• Request completion state |
| 2 | Validation Rules | • Survey submission must satisfy the form rules of the selected request. |
| 3 | Business Rules | • Survey requests are conceptually separate from ticket channels.<br>• This route should reuse shared layout context for refresh and navigation behavior. |
| 4 | Normal Case | • The user opens the surveys route.<br>• The user sees pending surveys.<br>• The user opens one and submits a response. |
| 5 | Abnormal Cases | • No surveys are available.<br>• Survey submission fails.<br>• Request data fails to load. |
Source of Truth:
- Page: [FeedbackSurveyPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Feedback/FeedbackSurveyPage.jsx)
