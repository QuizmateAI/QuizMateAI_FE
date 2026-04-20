# Phase 6 - Admin va Super Admin

## Muc tieu phase

Hoan thanh plan cho backoffice. O phase nay, route da ro rang hon, nhung can phan biet:

- page dung chung file giua Admin va Super Admin
- screen nao khac action theo permission
- screen nao chi Super Admin moi co

## Thu tu doc code

1. `src/App.jsx`
2. `src/Pages/Admin/AdminLayout.jsx`
3. `src/Pages/Admin/components/AdminSidebar.jsx`
4. `src/Pages/SuperAdmin/SuperAdminLayout.jsx`
5. `src/Pages/SuperAdmin/Components/SuperAdminSidebar.jsx`
6. Nhom page dung chung:
   - `UserManagement.jsx`
   - `GroupManagement.jsx`
   - `PlanManagement.jsx`
   - `CreditPackageManagement.jsx`
   - `AdminPaymentManagement.jsx`
   - `SystemSettingManagement.jsx`
   - `UserDetailPage.jsx`
   - `GroupDetailPage.jsx`
7. Nhom chi Super Admin:
   - `AdminManagement.jsx`
   - `RbacManagement.jsx`
   - `AiProvidersOverview.jsx`
   - `AiModelsManagement.jsx`
   - `AiCostManagement.jsx`
   - `AiAuditManagement.jsx`
   - `AiActionPolicyManagement.jsx`
   - `FeedbackManagementLayout.jsx`
   - `FeedbackManagement.jsx`
   - `FeedbackTicketManagementPage.jsx`
   - `FeedbackResponseActivityPage.jsx`
8. API wrappers lien quan theo tung domain:
   - `ManagementSystemAPI.js`
   - `SystemConfigAPI.js`
   - `FeedbackAPI.js`
   - va cac wrapper domain tu page thuc te

## Nguyen tac chup cho backoffice

- Chup 1 lan o role Admin va 1 lan o role Super Admin neu:
  - action button khac nhau
  - sidebar/nav khac nhau
  - permission hien thi block khac nhau
- Neu cung mot component va UI giong nhau 100%:
  - co the dung 1 bo anh chinh
  - nhung phai note role da verify

## Screen can chup va mo ta

### Admin

#### ADM-01 Admin Dashboard

- Route: `/admin`
- Chup:
  - overview cards/charts
  - loading state neu co

#### ADM-02 User Management

- Route: `/admin/users`
- Chup:
  - list state
  - search/filter state
  - empty state
- Mo ta:
  - open user detail
  - pagination/sort neu co

#### ADM-03 User Detail

- Route: `/admin/users/:userId`
- Chup:
  - profile/tong quan user
  - tab chi tiet neu co

#### ADM-04 Group Management

- Route: `/admin/groups`
- Chup:
  - list state
  - filter/search

#### ADM-05 Group Detail

- Route: `/admin/groups/:workspaceId`
- Chup:
  - group summary
  - workspace explorer neu co

#### ADM-06 Plan Management

- Route: `/admin/plans`
- Chup:
  - list state
  - create/edit modal hoac wizard neu co
- Mo ta:
  - `PlanFormWizard` neu dung tren screen nay

#### ADM-07 Credit Package Management

- Route: `/admin/credits`
- Chup:
  - package list
  - create/edit state neu co

#### ADM-08 Payment Management

- Route: `/admin/payments`
- Chup:
  - payment list
  - status filter

#### ADM-09 System Settings

- Route: `/admin/system-settings`
- Chup:
  - setting sections
  - save/update state neu co

### Super Admin

#### SADM-01 Super Admin Dashboard

- Route: `/super-admin`
- Chup:
  - overview state
  - websocket/online indicator tren layout neu can

#### SADM-02 Admin Management

- Route: `/super-admin/admins`
- Chup:
  - admin account list
  - create/edit state neu co

#### SADM-03 RBAC Management

- Route: `/super-admin/rbac`
- Chup:
  - role/permission matrix
  - edit permission state neu co

#### SADM-04 AI Providers Overview

- Route: `/super-admin/ai-providers`
- Chup:
  - provider list/status

#### SADM-05 AI Models Management

- Route: `/super-admin/ai-models`
- Chup:
  - model list
  - enable/disable/edit state neu co

#### SADM-06 AI Cost Management

- Route: `/super-admin/ai-costs`
- Chup:
  - cost summary
  - filter range neu co

#### SADM-07 AI Audit Management

- Route: `/super-admin/ai-audit`
- Chup:
  - audit list
  - detail/filter state neu co

#### SADM-08 AI Action Policy Management

- Route: `/super-admin/ai-action-policies`
- Chup:
  - policy list
  - create/edit state neu co

#### SADM-09 -> SADM-16 Shared Management Pages

- Route:
  - `/super-admin/users`
  - `/super-admin/users/:userId`
  - `/super-admin/groups`
  - `/super-admin/groups/:workspaceId`
  - `/super-admin/plans`
  - `/super-admin/credits`
  - `/super-admin/payments`
  - `/super-admin/system-settings`
- Thuc hien:
  - doi chieu voi spec `ADM-*`
  - neu khac permission/action, tach spec rieng

#### SADM-17 Feedback Forms

- Route: `/super-admin/feedbacks/forms`
- Chup:
  - form catalog/list
  - create/edit state neu co

#### SADM-18 Feedback Tickets

- Route: `/super-admin/feedbacks/tickets`
- Chup:
  - ticket queue
  - status filter
  - detail/response state neu co

#### SADM-19 Feedback Activity

- Route: `/super-admin/feedbacks/activity`
- Chup:
  - activity timeline/list
  - filter state neu co

## Checklist verify sau phase nay

- Da doc layout va sidebar truoc page detail
- Da danh dau page dung chung giua 2 role
- Da note ro page nao chi co o Super Admin
- Da note ro page nao can chup them state permission
