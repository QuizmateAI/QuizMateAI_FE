# Session Summary

## Request

- Chuan hoa URL dieu huong FE theo quy tac dat ten so nhieu.
- Lam ro ly do vi sao trong route config co ca ban so it va so nhieu.

## Scope

- In scope:
  - Route path trong FE (`src/App.jsx`) cho user, admin, super admin.
  - Cac dieu huong noi bo (`navigate`, `Link`) de uu tien URL moi.
  - Tai lieu rule route trong docs.
- Out of scope:
  - API endpoint backend (`src/api/*`).
  - Route callback dac thu `/api/vnpay/return`.

## Files Changed

- `src/App.jsx`
- `src/Pages/Users/Profile/ProfilePage.jsx`
- `src/Pages/Users/Credit/WalletPage.jsx`
- `src/Pages/Users/Plan/PlanPage.jsx`
- `src/Pages/Pricing/PricingGuidePage.jsx`
- `src/Pages/Users/Individual/Workspace/Components/WorkspaceHeader.jsx`
- `src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/CreateQuizFormContainer.jsx`
- `src/Components/plan/PlanUpgradeModal.jsx`
- `src/Components/features/Users/UserProfilePopover.jsx`
- `docs/assistant/instructions/coding-rules.md`

## Summary of Navigation Changes

- Ban chuan moi (so nhieu) duoc dung de render man hinh:
  - `/payments`, `/payments/credits`, `/payments/results`
  - `/profiles`, `/plans`, `/wallets`, `/feedbacks`
  - `/workspaces/:workspaceId`, `/group-workspaces/:workspaceId`
  - `/quizzes/practice/:quizId`, `/quizzes/exams/:quizId`, `/quizzes/results/:attemptId`
- Admin/SuperAdmin child routes cung chuyen sang so nhieu:
  - `plans`, `credits`, `feedbacks`

## Vi sao co ca ban so it va so nhieu

- Ban so it duoc giu lai voi vai tro **legacy redirect** de tranh gay link cu da duoc luu/bookmark/chia se.
- Khi vao URL cu (vi du `/plan`), app `Navigate` sang URL moi (`/plans`) voi `replace`.
- Voi route dong co tham so, dung `LegacyPathRedirect` de map param sang path moi tuong ung.
- Ket qua: nguoi dung cu van vao duoc, nhung URL chuan tren trinh duyet la ban so nhieu.

## API Clarification

- Khong doi API endpoint backend.
- Cac file trong `src/api/` khong bi migrate theo quy tac URL FE.
- Route callback dac thu `/api/vnpay/return` duoc giu nguyen.

## Docs Update

- Bo sung rule dat ten route theo so nhieu trong:
  - `docs/assistant/instructions/coding-rules.md`

## Verification

- Da chay `npm run lint` trong `QuizMateAI_FE` sau khi doi route va dieu huong.
- Lint pass.
