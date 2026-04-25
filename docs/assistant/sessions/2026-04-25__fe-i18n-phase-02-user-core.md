# Session Summary

## Request

User yeu cau chia FE thanh tung phase de quet va cover toan bo i18n, sua cac trang chua import / chua dung i18n, recheck lai sau khi sua vi co the phat sinh loi font / dau tieng Viet, va sau moi phase phai ghi summary ra file `.md`.

## Scope

- Feature hoac khu vuc tac dong:
  - User core pages: home, profile, plan, wallet
  - Payment pages: payment, credit payment, payment result
  - Shared user shell / common alt / aria / fallback strings trong nhom tren
- Trong pham vi:
  - Chuyen text hard-code / alt / aria con thieu sang `t(...)`
  - Bo sung locale key cho `common.json` va `home.json`
  - Sua fallback string / mojibake con sot trong user core flow
  - Recheck build va locale parse sau khi sua
- Ngoai pham vi:
  - Workspace / group / quiz / mock test
  - Admin / super-admin

## Files changed

- `src/i18n/locales/en/common.json`
- `src/i18n/locales/vi/common.json`
- `src/i18n/locales/en/home.json`
- `src/i18n/locales/vi/home.json`
- `src/Pages/Users/Profile/Components/SubscriptionTab.jsx`
- `src/Pages/Users/Profile/ProfilePage.jsx`
- `src/Pages/Users/Plan/PlanPage.jsx`
- `src/Pages/Users/Home/HomePage.jsx`
- `src/Pages/Users/Credit/WalletPage.jsx`
- `src/Pages/Payment/PaymentResultPage.jsx`
- `src/Pages/Payment/PaymentPage.jsx`
- `src/Pages/Payment/CreditPaymentPage.jsx`

## Summary of changes

- Them `common.creditIconAlt` va bo sung mot nhom key mock data / profile cho `home.json`.
- Chuyen cac alt / aria / label hard-code tren wallet va payment pages sang `t(...)`, gom logo alt, credit icon alt, go-home action.
- Dong bo `SubscriptionTab` de dung locale key cho plan `Free` thay vi string hard-code.
- Chuyen cac gia tri mock / fallback o `ProfilePage` sang locale key, gom `128h`, recent activity title, time ago, va `+50 XP`.
- Sua chuoi fallback bi mojibake trong `HomePage` o flow create / join / delete group de tranh hien thi sai dau tieng Viet.
- Don dep loading placeholder bi loi ky tu va thay bang `"-"` o `HomePage` va `PlanPage`.

## Verification

- Da parse JSON lai cho `src/i18n/locales/en/common.json`, `src/i18n/locales/vi/common.json`, `src/i18n/locales/en/home.json`, `src/i18n/locales/vi/home.json`.
- Da grep recheck cac page user core de xac nhan alt / aria moi da di qua `t(...)`.
- Da chay `npm run build` trong `QuizMateAI_FE`: pass.
- Build van con warning cu cua Vite ve `src/api/ProfileAPI.js` vua dynamic import vua static import; khong phat sinh tu phase nay.

## Risks or follow-ups

- Workspace / group / quiz / mock test va admin routes van can quet o cac phase tiep theo.
- Recheck UI tay van co gia tri neu can bat loi typography / spacing chi xuat hien tren browser that.
