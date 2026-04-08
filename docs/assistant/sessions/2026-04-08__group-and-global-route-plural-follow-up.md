# Session Summary

## Request

- Tiep tuc ra soat ben Group va cac file khac sau dot migrate route Individual.
- Ap dung tuong tu: chuan hoa FE route sang URL so nhieu va khong de redirect cho ban so it nua.

## Scope

- In scope:
  - Group workspace route tree, review shell, roadmap/challenge/quiz flow.
  - Home entry vao Group workspace.
  - Payment, plan, profile, admin, super-admin navigation con sot hardcode singular route.
  - Test payment/group/quiz routing lien quan.
- Out of scope:
  - Backend API endpoint trong `src/api/*`.
  - WebSocket topic `/topic/workspace/*`.

## Files Changed

- `src/App.jsx`
- `src/lib/routePaths.js`
- `src/Components/seo/RouteMetaManager.jsx`
- `src/Pages/Admin/AdminDashboard.jsx`
- `src/Pages/Admin/components/AdminSidebar.jsx`
- `src/Pages/SuperAdmin/Components/SuperAdminSidebar.jsx`
- `src/Pages/Users/Home/HomePage.jsx`
- `src/Pages/Users/Home/Components/UserGroup.jsx`
- `src/Pages/Users/Group/AcceptInvitationPage.jsx`
- `src/Pages/Users/Group/GroupWorkspacePage.jsx`
- `src/Pages/Users/Group/Group_leader/GroupManagementPage.jsx`
- `src/Pages/Users/Group/Components/QuizListView.jsx`
- `src/Pages/Users/Group/Components/RoadmapQuizListView.jsx`
- `src/Pages/Users/Group/Components/RoadmapCanvasView2.jsx`
- `src/Pages/Users/Group/Components/ChallengeDetailView.jsx`
- `src/Pages/Users/Group/review/GroupReviewWorkspaceShell.jsx`
- `src/Pages/Users/Quiz/QuizResultPage.jsx`
- `src/Pages/Payment/components/UpgradePlanDialog.jsx`
- `src/Pages/Payment/VnPayReturnRedirect.jsx`
- `src/Pages/Payment/PaymentPage.jsx`
- `src/Pages/Payment/CreditPaymentPage.jsx`
- `src/Pages/Payment/PaymentResultPage.jsx`
- `src/Pages/Users/Plan/PlanPage.jsx`
- `src/Pages/Users/Profile/Components/SubscriptionTab.jsx`
- `src/Pages/Users/Profile/ProfilePage.jsx`
- `src/test/group/AcceptInvitationPage.test.jsx`
- `src/test/payment/payment-flow.test.jsx`
- `src/test/payment/VnPayReturnRedirect.test.jsx`

## Main Changes

- Mo rong `src/lib/routePaths.js` de build va parse duong dan plural cho:
  - `payments`, `profiles`, `plans`, `wallets`, `feedbacks`
  - `group-workspaces`, `groups`, `quizzes`
- Xoa legacy redirect singular con sot trong `src/App.jsx` cho:
  - `/payment`, `/payment/credit`, `/payment/result`
  - `/profile`, `/plan`, `/wallet`, `/feedback`
  - `/group-workspace/:workspaceId`, `/group-workspace/:workspaceId/*`
  - `/group-manage/:workspaceId`
  - child route singular o admin/super-admin (`plan`, `credit`, `feedback`)
- Chuan hoa Group flow sang plural-only:
  - `/group-workspaces/:workspaceId`
  - `/groups/:workspaceId/manage`
  - back path/return path tu quiz, roadmap, challenge, review shell
- Chuan hoa cac entry point va follow-up flow ngoai Group:
  - Home vao group workspace
  - Payment / plan / profile / VNPay result
  - Admin / super-admin sidebar va dashboard quick actions
- Cap nhat test expectation cho payment va accept-invitation theo URL plural moi.

## Remaining Risks

- `src/test/quiz/QuizResultPage.test.jsx` van fail 2 assertion cu, khong do route migration.
- Repo van con nhieu string `/workspace` trong WebSocket topic va import path `@/Components/workspace/*`; day khong phai FE route nen duoc giu nguyen.

## Verification

- `npx eslint src/App.jsx src/lib/routePaths.js src/Components/seo/RouteMetaManager.jsx src/Pages/Admin/AdminDashboard.jsx src/Pages/Admin/components/AdminSidebar.jsx src/Pages/SuperAdmin/Components/SuperAdminSidebar.jsx src/Pages/Users/Home/HomePage.jsx src/Pages/Users/Home/Components/UserGroup.jsx src/Pages/Users/Group/AcceptInvitationPage.jsx src/Pages/Users/Group/GroupWorkspacePage.jsx src/Pages/Users/Group/Group_leader/GroupManagementPage.jsx src/Pages/Users/Group/Components/QuizListView.jsx src/Pages/Users/Group/Components/RoadmapQuizListView.jsx src/Pages/Users/Group/Components/RoadmapCanvasView2.jsx src/Pages/Users/Group/Components/ChallengeDetailView.jsx src/Pages/Users/Group/review/GroupReviewWorkspaceShell.jsx src/Pages/Users/Quiz/QuizResultPage.jsx src/Pages/Payment/components/UpgradePlanDialog.jsx src/Pages/Payment/VnPayReturnRedirect.jsx src/Pages/Payment/PaymentPage.jsx src/Pages/Payment/CreditPaymentPage.jsx src/Pages/Payment/PaymentResultPage.jsx src/Pages/Users/Plan/PlanPage.jsx src/Pages/Users/Profile/Components/SubscriptionTab.jsx src/Pages/Users/Profile/ProfilePage.jsx`
- `npx vitest run src/test/group/AcceptInvitationPage.test.jsx src/test/payment/payment-flow.test.jsx src/test/payment/VnPayReturnRedirect.test.jsx src/test/quiz/QuizResultPage.test.jsx src/test/quiz/PracticeQuizPage.test.jsx src/test/quiz/ExamQuizPage.test.jsx src/test/quiz/quizEntryNavigation.test.jsx src/test/workspace/viewRouting.test.js`
- Ket qua:
  - Eslint pass.
  - Pass cac test group/payment/quiz routing lien quan.
  - `src/test/quiz/QuizResultPage.test.jsx` con fail 2 test cu, khong lien quan path migration.
