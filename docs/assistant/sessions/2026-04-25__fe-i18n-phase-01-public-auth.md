# Session Summary

## Request

User yeu cau chia FE thanh tung phase de quet va cover toan bo i18n, sua cac trang chua import / chua dung i18n, recheck lai sau khi sua vi co the phat sinh loi font / dau tieng Viet, va sau moi phase phai ghi summary ra file `.md`.

## Scope

- Feature hoac khu vuc tac dong:
  - Nen tang i18n route preload cho public home
  - Public / auth pages: landing, launching, not found, forgot password, pricing guide
  - Public landing components: navbar, hero, features, pricing, testimonials, footer
- Trong pham vi:
  - Chuyen text / aria / alt con hard-code sang `t(...)`
  - Them locale key con thieu trong split namespace `common.json`
  - Recheck font switching theo locale cho public pages
  - Recheck locale encoding / dau tieng Viet sau khi sua
- Ngoai pham vi:
  - Dashboard user routes
  - Workspace / quiz runtime / admin routes

## Files changed

- `src/i18n/index.js`
- `src/i18n/locales/en/common.json`
- `src/i18n/locales/vi/common.json`
- `src/Pages/LandingPage/LandingPage.jsx`
- `src/Pages/LandingPage/components/Navbar.jsx`
- `src/Pages/LandingPage/components/HeroSection.jsx`
- `src/Pages/LandingPage/components/FeaturesSection.jsx`
- `src/Pages/LandingPage/components/PricingSection.jsx`
- `src/Pages/LandingPage/components/TestimonialsSection.jsx`
- `src/Pages/LandingPage/components/Footer.jsx`
- `src/Pages/LaunchingPage/LaunchingPage.jsx`
- `src/Pages/NotFound/NotFoundPage.jsx`
- `src/Pages/Authentication/ForgotPasswordPage.jsx`
- `src/Pages/Pricing/PricingGuidePage.jsx`

## Summary of changes

- Them preload namespace `home` cho route `/` trong `src/i18n/index.js` de landing page doc duoc key pricing / home ngay tu dau.
- Chuyen cac label hard-code tren landing page va public/auth pages sang `t(...)`, gom button title, aria-label, alt text, countdown label, hero / launch copy, not-found copy va pricing guide unit label.
- Dong bo logo alt va cac action chung qua `common.brandLogoAlt`, `common.switchLanguage`, `common.scrollToTop`, `common.goHome`, `common.lightMode`, `common.darkMode`.
- Chuyen font switching tren cac public page / component sang rule theo locale (`en -> font-poppins`, `vi -> font-sans`) de giam rui ro loi font khi doi ngon ngu.
- Bo sung key locale moi trong `en/common.json` va `vi/common.json` cho landing avatars, launching page, not found page, pricing guide, va common controls.
- Sua lai cac key moi bi ghi thanh dau `?` trong `vi/common.json` va `launchingPage.footer.rights` cua `en/common.json`.

## Verification

- Da chay parse JSON cho `src/i18n/locales/en/common.json` va `src/i18n/locales/vi/common.json`.
- Da grep recheck public pages de xac nhan cac key moi da duoc goi qua `t(...)` va font class da theo locale.
- Da chay `npm run build` trong `QuizMateAI_FE`: pass.
- Build van con warning cu cua Vite ve `src/api/ProfileAPI.js` vua dynamic import vua static import; khong phat sinh tu phase nay.

## Risks or follow-ups

- Con nhieu route user / workspace / quiz / admin chua duoc quet trong dot nay, se duoc lam tiep theo phase.
- Recheck UI tay tren trang public van nen lam sau cung neu can bat cac loi typography / spacing chi xuat hien tren browser that.
