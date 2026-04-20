# Phase 2 - User Core

## Muc tieu phase

Hoan thanh nhom screen ma user thuong thay ngay sau login: home, profile, plan, payment, wallet va feedback.

## Thu tu doc code

1. `src/App.jsx`
2. `src/Pages/Users/Home/HomePage.jsx`
3. `src/Pages/Users/Home/Components/*`
4. `src/Pages/Users/Profile/ProfilePage.jsx`
5. `src/Pages/Users/Plan/PlanPage.jsx`
6. `src/Pages/Payment/PaymentPage.jsx`
7. `src/Pages/Payment/CreditPaymentPage.jsx`
8. `src/Pages/Payment/PaymentResultPage.jsx`
9. `src/Pages/Users/Credit/WalletPage.jsx`
10. `src/Pages/Users/Feedback/FeedbackSystemLayout.jsx`
11. `src/Pages/Users/Feedback/*`
12. API wrappers:
    - `src/api/ManagementSystemAPI.js`
    - `src/api/ProfileAPI.js`
    - `src/api/PaymentAPI.js`
    - `src/api/FeedbackAPI.js`
    - `src/api/WorkspaceAPI.js`

## Screen can chup va mo ta

### HOME-01 Home Workspace Tab

- Route: `/home?tab=workspace`
- Can chup:
  - list workspace da co du lieu
  - zero state neu chua co workspace
  - grid/list view neu UI ho tro
  - search/sort/filter area
- Mo ta can neu:
  - create workspace flow
  - edit/delete/open workspace
  - preload/pre-navigation behavior neu co

### HOME-02 Home Group Tab

- Route: `/home?tab=group`
- Can chup:
  - list group user dang tham gia
  - zero state
  - search/filter area
- Mo ta can neu:
  - merge logic giua `groups` va owned group workspace
  - create group workspace flow

### HOME-03 Edit Workspace Dialog

- Trigger: tu card workspace
- Can chup:
  - dialog default
  - saving state
  - validation/error state neu co
- Mo ta can neu:
  - field cho phep sua
  - sau save co reload hay optimistic update

### HOME-04 Delete Workspace Dialog

- Trigger: tu card workspace
- Can chup:
  - confirm dialog
  - deleting state
- Mo ta can neu:
  - guard tranh xoa nham
  - sau delete list cap nhat the nao

### PROFILE-01 / 02 / 03 Profile

- Route: `/profiles`
- Tach thanh 3 spec:
  - overview
  - edit mode
  - change password dialog
- Can chup:
  - thong tin user + wallet/plan summary
  - avatar upload state neu co
  - dialog doi mat khau
- Mo ta can neu:
  - tab logic trong profile
  - logout entry
  - redirect sang `/plans` khi state yeu cau subscription

### PLAN-01 Plan Page

- Route: `/plans`
- Can chup:
  - danh sach plan user
  - group plan selection state
  - recommended/current plan highlight
  - empty/loading/error neu co
- Mo ta can neu:
  - su khac biet user plan va group plan
  - luong di den payment page

### PAY-01 Payment Detail

- Route: `/payments`
- Can chup:
  - co `planId`
  - thieu `planId`
  - group plan can chon workspace
  - loading/error
- Mo ta can neu:
  - query param rule
  - quay lai `/plans`
  - workspace selector cho group plan

### PAY-02 Credit Payment

- Route: `/payments/credits`
- Can chup:
  - chon package thanh toan credit
  - state workspace-linked neu mua cho group
- Mo ta can neu:
  - du lieu package, amount, phuong thuc thanh toan

### PAY-03 Payment Result

- Route: `/payments/results`
- Can chup:
  - thanh cong
  - that bai/bi huy
- Mo ta can neu:
  - doc query param hay state nao
  - wallet/plan cap nhat ra sao

### WALLET-01 Wallet Page

- Route: `/wallets`
- Can chup:
  - balance summary
  - lich su giao dich neu co
  - empty/loading
- Mo ta can neu:
  - phan biet regular credit va plan credit

### FEEDBACK-01 -> FEEDBACK-04

- Route:
  - `/feedbacks/overview`
  - `/feedbacks/product`
  - `/feedbacks/system`
  - `/feedbacks/surveys`
- Doc theo thu tu:
  - `FeedbackSystemLayout.jsx` truoc
  - sau do tung page con
- Can chup:
  - layout shell
  - moi tab con
  - submit dialog/ticket dialog neu la mot phan quan trong
- Mo ta can neu:
  - `pending requests`, `tickets`, `stats`
  - refresh behavior
  - ticket dialog va request dialog mo tu dau

## Dau ra mong doi sau phase nay

- Chot xong cac screen co route on dinh ngoai workspace.
- Chuan bi duoc data/test account can thiet truoc khi vao workspace.

## Ghi chu thuc thi

- `HomePage` la screen nen chup som, vi no la diem vao cua ca individual workspace va group workspace.
- `PlanPage`, `PaymentPage`, `WalletPage` lien quan nhau, nen chup trong cung 1 dot de de doi chieu navigation.
