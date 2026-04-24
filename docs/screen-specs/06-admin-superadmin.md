# Admin And Super Admin Specifications

## ADM-01 Admin Dashboard

Function Trigger:
- Route Trigger: An authenticated ADMIN opens `/admin`.

Function Description:
- Actor: ADMIN.
- Purpose: To provide an operational overview of the platform for standard administrators.
- Interface: Admin layout with sidebar, top bar, and dashboard content cards.
- Data Processing:
  - Dashboard overview data from the management-system layer

Screen Layout:
- Admin sidebar
- Top navigation bar
- Dashboard metric cards
- Recent activity or summary blocks

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Overview counts and metrics.<br>• Recent activity items.<br>• Dashboard card data. |
| 2 | Validation Rules | • The route is protected and only accessible to the `ADMIN` role.<br>• Dashboard queries must resolve before metric cards show final values. |
| 3 | Business Rules | • The dashboard acts as the main entry point for Admin routes.<br>• Sidebar items shown to the user are filtered by permission rules where applicable.<br>• The layout remains consistent across all Admin sub-pages. |
| 4 | Normal Case | • The admin opens `/admin`.<br>• The layout loads.<br>• Dashboard metrics appear.<br>• The admin navigates to another management page from the sidebar. |
| 5 | Abnormal Cases | • Role mismatch causes redirect.<br>• Dashboard metrics fail to load.<br>• Permission filtering removes some menu items from view. |
Source of Truth:
- Layout: [AdminLayout.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/AdminLayout.jsx)
- Page: [AdminDashboard.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/AdminDashboard.jsx)

## ADM-02 User Management

Function Trigger:
- Route Trigger: An ADMIN opens `/admin/users`.

Function Description:
- Actor: ADMIN.
- Purpose: To view, filter, search, and navigate into user-level detail records.
- Interface: A management list or table screen inside the Admin layout.
- Data Processing:
  - User listing and filter APIs

Screen Layout:
- Filter and search area
- User list or data table
- Pagination controls

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • User rows.<br>• Search query.<br>• Filter values.<br>• Pagination state.<br>• Row actions. |
| 2 | Validation Rules | • Query and filter inputs must be valid before being sent to the backend.<br>• Detail navigation requires a valid `userId`. |
| 3 | Business Rules | • The page is intended as a directory and operational review screen.<br>• The admin can navigate from the list into the dedicated user-detail page. |
| 4 | Normal Case | • The admin opens the user list.<br>• The page loads user records.<br>• The admin filters or searches the list.<br>• The admin opens a specific user detail record. |
| 5 | Abnormal Cases | • Empty result set.<br>• Invalid `userId` navigation.<br>• List request failure. |
Source of Truth:
- Page: [UserManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/UserManagement.jsx)

## ADM-03 User Detail

Function Trigger:
- Route Trigger: An ADMIN opens `/admin/users/:userId`.

Function Description:
- Actor: ADMIN.
- Purpose: To inspect detailed information about a single user account.
- Interface: A detail page inside the Admin layout.
- Data Processing:
  - User detail APIs

Screen Layout:
- User summary block
- Related detail sections
- Return navigation

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `userId`<br>• User profile metadata<br>• Role and account state<br>• Related usage or linked information where available |
| 2 | Validation Rules | • The route must contain a valid `userId`.<br>• The page should not render final detail content until the user payload is loaded. |
| 3 | Business Rules | • This page is a shared component file across admin-level scopes, but the route context determines the layout and permissions around it. |
| 4 | Normal Case | • The admin opens a user from the user list.<br>• The detail page loads the selected user.<br>• The admin reviews the user information and returns to the list. |
| 5 | Abnormal Cases | • Invalid `userId`.<br>• Detail fetch failure.<br>• Permission-restricted data blocks. |
Source of Truth:
- Page: [UserDetailPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/UserDetailPage.jsx)

## ADM-04 Group Management

Function Trigger:
- Route Trigger: An ADMIN opens `/admin/groups`.

Function Description:
- Actor: ADMIN.
- Purpose: To list and inspect group workspaces managed within the platform.
- Interface: A management list or table screen inside the Admin layout.
- Data Processing:
  - Group listing and filter APIs

Screen Layout:
- Search and filter area
- Group list or table
- Pagination controls

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Group rows.<br>• Group owner or member summary.<br>• Filter values.<br>• Pagination state. |
| 2 | Validation Rules | • Group-detail navigation requires a valid `workspaceId`.<br>• Filters should only send supported query values. |
| 3 | Business Rules | • This page serves as the main entry point into group-level backoffice inspection.<br>• The admin can open a dedicated group-detail page from the list. |
| 4 | Normal Case | • The admin opens the group list.<br>• The admin filters or searches for a group.<br>• The admin opens the corresponding detail page. |
| 5 | Abnormal Cases | • Empty result set.<br>• Invalid `workspaceId`.<br>• Group list fetch failure. |
Source of Truth:
- Page: [GroupManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/GroupManagement.jsx)

## ADM-05 Group Detail

Function Trigger:
- Route Trigger: An ADMIN opens `/admin/groups/:workspaceId`.

Function Description:
- Actor: ADMIN.
- Purpose: To inspect a single group workspace in more detail.
- Interface: A detail page inside the Admin layout.
- Data Processing:
  - Group detail APIs

Screen Layout:
- Group summary block
- Related detail sections
- Return navigation

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `workspaceId`<br>• Group metadata<br>• Related user or membership information<br>• Supporting operational details |
| 2 | Validation Rules | • A valid `workspaceId` is required.<br>• The page must wait for the detail payload before showing final content. |
| 3 | Business Rules | • This page is shared with the super-admin scope at the component level.<br>• The route context determines how the user reached the page and which surrounding layout is rendered. |
| 4 | Normal Case | • The admin opens a group from the list.<br>• The group detail page loads successfully.<br>• The admin reviews the group information and returns to the list. |
| 5 | Abnormal Cases | • Invalid `workspaceId`.<br>• Group detail request failure. |
Source of Truth:
- Page: [GroupDetailPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/GroupDetailPage.jsx)

## ADM-06 Plan Management

Function Trigger:
- Route Trigger: An ADMIN opens `/admin/plans`.

Function Description:
- Actor: ADMIN.
- Purpose: To manage subscription plans and their related commercial configuration.
- Interface: A management page that may use a plan form wizard or editor.
- Data Processing:
  - Plan management APIs

Screen Layout:
- Plan list or table
- Create and edit actions
- Wizard or form area

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Plan name.<br>• Price.<br>• Status.<br>• Entitlement configuration. |
| 2 | Validation Rules | • Plan payloads must satisfy pricing and entitlement validation rules before save. |
| 3 | Business Rules | • Access depends on the admin permission model.<br>• The page may open a wizard flow for new plan creation or editing. |
| 4 | Normal Case | • The admin opens the plan page.<br>• Existing plans load.<br>• The admin creates or edits a plan and saves the changes. |
| 5 | Abnormal Cases | • Validation failure.<br>• Save failure.<br>• Permission restriction. |
Source of Truth:
- Page: [PlanManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/PlanManagement.jsx)
- Wizard: [PlanFormWizard.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/components/PlanFormWizard.jsx)

## ADM-07 Credit Package Management

Function Trigger:
- Route Trigger: An ADMIN opens `/admin/credits`.

Function Description:
- Actor: ADMIN.
- Purpose: To manage credit package offerings.
- Interface: A package-management page inside the Admin layout.
- Data Processing:
  - Credit package APIs

Screen Layout:
- Package list
- Create/edit controls

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Package name.<br>• Credit amount.<br>• Price.<br>• Status. |
| 2 | Validation Rules | • Credit package payloads must satisfy business rules before save. |
| 3 | Business Rules | • The screen controls a commerce object that is separate from plan subscriptions.<br>• Only users with the appropriate admin permissions should see or use this page. |
| 4 | Normal Case | • The admin opens the page.<br>• Existing packages load.<br>• The admin edits or creates a package and saves. |
| 5 | Abnormal Cases | • Save failure.<br>• Validation failure.<br>• List fetch failure. |
Source of Truth:
- Page: [CreditPackageManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/CreditPackageManagement.jsx)

## ADM-08 Payment Management

Function Trigger:
- Route Trigger: An ADMIN opens `/admin/payments`.

Function Description:
- Actor: ADMIN.
- Purpose: To inspect payment records and their states.
- Interface: A payment-management list screen.
- Data Processing:
  - Payment-list and filter APIs

Screen Layout:
- Filter area
- Payment list or table
- Status indicators

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Order identifiers.<br>• Payer information.<br>• Amounts.<br>• Payment status.<br>• Timestamps. |
| 2 | Validation Rules | • Filters must use supported values.<br>• Row-detail navigation must use valid payment context when applicable. |
| 3 | Business Rules | • This page is typically read-oriented and focused on monitoring or investigation.<br>• It belongs to the commerce section of the admin console. |
| 4 | Normal Case | • The admin opens the payment page.<br>• Payment rows load.<br>• The admin filters the list and reviews payment status. |
| 5 | Abnormal Cases | • Empty payment data.<br>• Filter misuse or unsupported values.<br>• Backend request failure. |
Source of Truth:
- Page: [AdminPaymentManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/AdminPaymentManagement.jsx)

## ADM-09 System Settings

Function Trigger:
- Route Trigger: An ADMIN opens `/admin/system-settings`.

Function Description:
- Actor: ADMIN.
- Purpose: To review and update configurable system settings within the admin scope.
- Interface: A settings-management page with grouped configuration sections.
- Data Processing:
  - System settings APIs

Screen Layout:
- Settings sections
- Editable controls
- Save actions

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Setting keys.<br>• Current values.<br>• Field descriptions.<br>• Save state. |
| 2 | Validation Rules | • Values must match the expected format or type before save. |
| 3 | Business Rules | • Not every admin may see or edit every setting depending on permission policy.<br>• The page should preserve clear distinction between read-only and editable configuration items. |
| 4 | Normal Case | • The admin opens the settings page.<br>• The page loads the current configuration.<br>• The admin updates a setting and saves the change. |
| 5 | Abnormal Cases | • Validation failure.<br>• Save failure.<br>• Settings payload fails to load. |
Source of Truth:
- Page: [SystemSettingManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/SystemSettingManagement.jsx)

## SADM-01 Super Admin Dashboard

Function Trigger:
- Route Trigger: A SUPER_ADMIN opens `/super-admin`.

Function Description:
- Actor: SUPER_ADMIN.
- Purpose: To provide a higher-level administrative overview that includes broader governance and platform-control entry points.
- Interface: Super Admin layout with its own sidebar grouping and top-bar connectivity indicator.
- Data Processing:
  - Dashboard overview APIs

Screen Layout:
- Super Admin sidebar
- Topbar with connectivity status
- Dashboard overview content

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Overview metrics.<br>• Operational summary cards.<br>• Online/offline connectivity indicator state. |
| 2 | Validation Rules | • The route is protected and only accessible to the `SUPER_ADMIN` role. |
| 3 | Business Rules | • The sidebar exposes additional areas not available to normal admins, such as AI governance, access control, and feedback management.<br>• Layout state remains shared across all super-admin routes. |
| 4 | Normal Case | • The super admin opens the dashboard.<br>• The page loads overview data.<br>• The super admin navigates to a deeper governance or management page. |
| 5 | Abnormal Cases | • Role mismatch.<br>• Overview fetch failure.<br>• Connectivity indicator mismatch or stale browser network status. |
Source of Truth:
- Layout: [SuperAdminLayout.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/SuperAdminLayout.jsx)
- Page: [SuperAdminDashboard.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/SuperAdminDashboard.jsx)

## SADM-02 Admin Management

Function Trigger:
- Route Trigger: A SUPER_ADMIN opens `/super-admin/admins`.

Function Description:
- Actor: SUPER_ADMIN.
- Purpose: To manage administrator accounts.
- Interface: A list and management screen inside the Super Admin layout.
- Data Processing:
  - Admin-account APIs

Screen Layout:
- Search and filter area
- Admin account list
- Create and edit actions

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Admin account rows.<br>• Status values.<br>• Role or scope information.<br>• Row actions. |
| 2 | Validation Rules | • Admin account creation or update requires valid role and identity payloads. |
| 3 | Business Rules | • This page exists only in the super-admin area.<br>• The page governs administrative access, so changes here have system-wide consequences. |
| 4 | Normal Case | • The super admin opens the page.<br>• Existing admin accounts load.<br>• The super admin creates, updates, or reviews admin accounts. |
| 5 | Abnormal Cases | • Invalid account payload.<br>• Save failure.<br>• List request failure. |
Source of Truth:
- Page: [AdminManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/AdminManagement.jsx)

## SADM-03 RBAC Management

Function Trigger:
- Route Trigger: A SUPER_ADMIN opens `/super-admin/rbac`.

Function Description:
- Actor: SUPER_ADMIN.
- Purpose: To configure role-based access control rules.
- Interface: A governance-oriented management page for roles and permissions.
- Data Processing:
  - RBAC APIs

Screen Layout:
- Role list
- Permission matrix or assignment editor
- Save actions

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Roles.<br>• Permission assignments.<br>• Pending change state. |
| 2 | Validation Rules | • Role and permission mappings must be valid before they are saved. |
| 3 | Business Rules | • This page can affect many other backoffice screens because permissions drive sidebar visibility and route capabilities.<br>• It is restricted to the super-admin scope. |
| 4 | Normal Case | • The super admin opens the RBAC page.<br>• Current mappings load.<br>• The super admin updates assignments and saves. |
| 5 | Abnormal Cases | • Mapping validation failure.<br>• Save failure.<br>• Partial permission data load failure. |
Source of Truth:
- Page: [RbacManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/RbacManagement.jsx)

## SADM-04 AI Providers Overview

Function Trigger:
- Route Trigger: A SUPER_ADMIN opens `/super-admin/ai-providers`.

Function Description:
- Actor: SUPER_ADMIN.
- Purpose: To review AI-provider configuration and platform-level provider visibility.
- Interface: A governance overview page.
- Data Processing:
  - AI provider APIs

Screen Layout:
- Provider cards or list
- Summary information blocks

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Provider names.<br>• Availability or status information.<br>• Provider-level summary metrics. |
| 2 | Validation Rules | • Provider overview data must be loaded before final summaries are displayed. |
| 3 | Business Rules | • This page is informative and governance-focused.<br>• It belongs to the AI governance section of the Super Admin console. |
| 4 | Normal Case | • The super admin opens the page.<br>• Provider summaries load.<br>• The super admin reviews provider availability and health information. |
| 5 | Abnormal Cases | • Provider data fails to load.<br>• Some provider summaries are missing or incomplete. |
Source of Truth:
- Page: [AiProvidersOverview.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/AiProvidersOverview.jsx)

## SADM-05 AI Models Management

Function Trigger:
- Route Trigger: A SUPER_ADMIN opens `/super-admin/ai-models`.

Function Description:
- Actor: SUPER_ADMIN.
- Purpose: To manage AI model entries and their operational configuration.
- Interface: A management page inside the AI governance section.
- Data Processing:
  - AI model APIs

Screen Layout:
- Model list
- Model configuration actions
- Save or status controls

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Model name.<br>• Provider association.<br>• Status.<br>• Model configuration summary. |
| 2 | Validation Rules | • Model configuration payloads must be valid before update. |
| 3 | Business Rules | • This page controls model-level governance and availability.<br>• It is only available in the super-admin context. |
| 4 | Normal Case | • The super admin opens the model page.<br>• Existing models load.<br>• The super admin updates a model configuration or status. |
| 5 | Abnormal Cases | • Load failure.<br>• Save failure.<br>• Invalid model configuration payload. |
Source of Truth:
- Page: [AiModelsManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/AiModelsManagement.jsx)

## SADM-06 AI Cost Management

Function Trigger:
- Route Trigger: A SUPER_ADMIN opens `/super-admin/ai-costs`.

Function Description:
- Actor: SUPER_ADMIN.
- Purpose: To review AI-related cost information and cost trends.
- Interface: A governance analytics page.
- Data Processing:
  - AI cost APIs

Screen Layout:
- Cost summary
- Filters
- Cost trend or list section

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Cost metrics.<br>• Date or range filters.<br>• Provider or model cost breakdowns. |
| 2 | Validation Rules | • Filters must use valid values before requesting updated data. |
| 3 | Business Rules | • This is primarily a read-oriented analysis screen.<br>• It supports cost governance rather than end-user transactions. |
| 4 | Normal Case | • The super admin opens the page.<br>• Cost metrics load.<br>• The super admin applies filters and reviews the data. |
| 5 | Abnormal Cases | • No data is available for the selected range.<br>• Filter request fails.<br>• Cost API request fails. |
Source of Truth:
- Page: [AiCostManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/AiCostManagement.jsx)

## SADM-07 AI Audit Management

Function Trigger:
- Route Trigger: A SUPER_ADMIN opens `/super-admin/ai-audit`.

Function Description:
- Actor: SUPER_ADMIN.
- Purpose: To inspect audit events related to AI usage or policy-sensitive AI actions.
- Interface: An audit log page with filtering and review capabilities.
- Data Processing:
  - AI audit APIs

Screen Layout:
- Audit filters
- Audit event list
- Detail or inspection state

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Audit event rows.<br>• Actor or source information.<br>• Provider or model references.<br>• Timestamps. |
| 2 | Validation Rules | • Audit filters must use supported values. |
| 3 | Business Rules | • This page supports governance and traceability requirements.<br>• It is restricted to the super-admin scope. |
| 4 | Normal Case | • The super admin opens the audit page.<br>• Audit entries load.<br>• The super admin filters and reviews relevant events. |
| 5 | Abnormal Cases | • No audit entries match the selected filters.<br>• The audit API fails. |
Source of Truth:
- Page: [AiAuditManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/AiAuditManagement.jsx)

## SADM-08 AI Action Policy Management

Function Trigger:
- Route Trigger: A SUPER_ADMIN opens `/super-admin/ai-action-policies`.

Function Description:
- Actor: SUPER_ADMIN.
- Purpose: To configure or review AI action policies that control system behavior.
- Interface: A policy-management page.
- Data Processing:
  - AI action policy APIs

Screen Layout:
- Policy list
- Policy editor
- Save actions

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Policy name.<br>• Scope.<br>• Rule definitions.<br>• Status. |
| 2 | Validation Rules | • Policy payloads must satisfy configuration rules before save. |
| 3 | Business Rules | • This page governs AI action behavior and is therefore sensitive from a platform-control standpoint.<br>• It is available only in the Super Admin console. |
| 4 | Normal Case | • The super admin opens the policy page.<br>• Existing policies load.<br>• The super admin updates or creates a policy and saves it. |
| 5 | Abnormal Cases | • Invalid rule configuration.<br>• Save failure.<br>• Policy list fetch failure. |
Source of Truth:
- Page: [AiActionPolicyManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/AiActionPolicyManagement.jsx)

## SADM-09 Shared Operational Pages In Super Admin Scope

Function Trigger:
- Route Trigger:
  - `/super-admin/users`
  - `/super-admin/users/:userId`
  - `/super-admin/groups`
  - `/super-admin/groups/:workspaceId`
  - `/super-admin/plans`
  - `/super-admin/credits`
  - `/super-admin/payments`
  - `/super-admin/system-settings`

Function Description:
- Actor: SUPER_ADMIN.
- Purpose: To reuse existing operational management pages inside the broader Super Admin layout and permission scope.
- Interface: Shared page implementations rendered inside a different parent layout.
- Data Processing:
  - Same underlying APIs as the corresponding Admin pages

Screen Layout:
- Super Admin sidebar and top bar
- Shared page content from the reused management module

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • The underlying fields are the same as the corresponding Admin pages.<br>• Layout context and navigation origin differ because the page is rendered inside the Super Admin console. |
| 2 | Validation Rules | • The same route parameter and filter validations apply as in the Admin versions. |
| 3 | Business Rules | • These pages reuse shared component files but live inside a distinct role scope.<br>• Access is protected by the `SUPER_ADMIN` route guard, not the `ADMIN` route guard. |
| 4 | Normal Case | • The super admin opens one of the shared operational pages.<br>• The page renders within the Super Admin shell.<br>• The super admin uses the page in the same way as the Admin version, but under a broader governance role. |
| 5 | Abnormal Cases | • Shared page fails to load in the new route scope.<br>• Permissions or layout assumptions differ unexpectedly between Admin and Super Admin paths. |
Source of Truth:
- Layout: [SuperAdminLayout.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/SuperAdminLayout.jsx)
- Shared Pages:
  - [UserManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/UserManagement.jsx)
  - [UserDetailPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/UserDetailPage.jsx)
  - [GroupManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/GroupManagement.jsx)
  - [GroupDetailPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/GroupDetailPage.jsx)
  - [PlanManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/PlanManagement.jsx)
  - [CreditPackageManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/CreditPackageManagement.jsx)
  - [AdminPaymentManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/AdminPaymentManagement.jsx)
  - [SystemSettingManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Admin/SystemSettingManagement.jsx)

## SADM-10 Feedback Forms

Function Trigger:
- Route Trigger: A SUPER_ADMIN opens `/super-admin/feedbacks/forms`.

Function Description:
- Actor: SUPER_ADMIN.
- Purpose: To manage feedback forms or form catalogs used by the product’s feedback system.
- Interface: A child route inside the Super Admin feedback-management shell.
- Data Processing:
  - Feedback form management APIs

Screen Layout:
- Feedback management shell
- Form list or catalog area
- Create or edit actions

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Feedback form records.<br>• Form status values.<br>• Category or channel information. |
| 2 | Validation Rules | • Form create and update payloads must satisfy the feedback-form rules before save. |
| 3 | Business Rules | • This route is nested under the feedback-management layout.<br>• It is distinct from ticket handling and response activity monitoring. |
| 4 | Normal Case | • The super admin opens the forms route.<br>• Existing forms load.<br>• The super admin reviews or updates forms. |
| 5 | Abnormal Cases | • Form list fails to load.<br>• Save failure. |
Source of Truth:
- Layout: [FeedbackManagementLayout.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/FeedbackManagementLayout.jsx)
- Page: [FeedbackManagement.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/FeedbackManagement.jsx)

## SADM-11 Feedback Tickets

Function Trigger:
- Route Trigger: A SUPER_ADMIN opens `/super-admin/feedbacks/tickets`.

Function Description:
- Actor: SUPER_ADMIN.
- Purpose: To review and process feedback tickets submitted by users.
- Interface: A child route inside the feedback-management shell with ticket-specific list and action behavior.
- Data Processing:
  - Ticket queue and ticket-detail APIs

Screen Layout:
- Ticket filters
- Ticket list
- Ticket action or detail area

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Ticket rows.<br>• Channel type.<br>• Resolution status.<br>• Timestamps.<br>• Related user or request identifiers. |
| 2 | Validation Rules | • Ticket filters must use valid values.<br>• Ticket actions require a valid ticket context. |
| 3 | Business Rules | • This page focuses on ticket operations rather than form configuration.<br>• It is nested under the feedback-management route structure. |
| 4 | Normal Case | • The super admin opens the tickets route.<br>• Ticket data loads.<br>• The super admin filters tickets and reviews or handles them. |
| 5 | Abnormal Cases | • Empty ticket queue.<br>• Ticket fetch failure.<br>• Ticket update failure. |
Source of Truth:
- Page: [FeedbackTicketManagementPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/FeedbackTicketManagementPage.jsx)

## SADM-12 Feedback Activity

Function Trigger:
- Route Trigger: A SUPER_ADMIN opens `/super-admin/feedbacks/activity`.

Function Description:
- Actor: SUPER_ADMIN.
- Purpose: To inspect response and activity history across the feedback system.
- Interface: A child route inside the feedback-management shell focused on activity logging.
- Data Processing:
  - Feedback activity APIs

Screen Layout:
- Activity filters
- Activity timeline or list
- Related context blocks

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Activity rows.<br>• Actor metadata.<br>• Timestamps.<br>• Related ticket or form context. |
| 2 | Validation Rules | • Activity filters must use supported values. |
| 3 | Business Rules | • This page is intended for monitoring and audit-style visibility rather than content creation.<br>• It complements the forms page and the ticket queue page inside the same feedback-management area. |
| 4 | Normal Case | • The super admin opens the activity route.<br>• Activity history loads.<br>• The super admin filters or scans activity records. |
| 5 | Abnormal Cases | • Activity data fails to load.<br>• No activity records exist for the selected filter range. |
Source of Truth:
- Page: [FeedbackResponseActivityPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/SuperAdmin/FeedbackResponseActivityPage.jsx)
