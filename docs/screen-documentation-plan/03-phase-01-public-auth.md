# Phase 1 - Public va Authentication

## Muc tieu phase

Chot toan bo screen khach va auth truoc, vi day la nhom de vao he thong va la no moi de doc nhat theo route.

## Thu tu doc code

1. `src/App.jsx`
2. `src/lib/launchConfig.js`
3. `src/Pages/LaunchingPage/LaunchingPage.jsx`
4. `src/Pages/LandingPage/LandingPage.jsx`
5. `src/Pages/Pricing/PricingGuidePage.jsx`
6. `src/Pages/Authentication/LoginPage.jsx`
7. `src/Pages/Authentication/RegisterPage.jsx`
8. `src/Pages/Authentication/ForgotPasswordPage.jsx`
9. `src/Pages/Users/Group/AcceptInvitationPage.jsx`
10. `src/api/Authentication.js`
11. `src/api/GroupAPI.js` neu invite flow can goi API group

## Screen can chup va mo ta

### PUB-01 Launching Page

- Trigger:
  - app mo o launch mode
- Can chup:
  - default state
  - countdown/CTA neu co
- Mo ta can neu:
  - launch gate hoat dong o cap app, khong phai route rieng
  - cach user di tiep sau launch

### PUB-02 Landing Page

- Route: `/`
- Can chup:
  - hero section day du
  - pricing/feature section neu nam tren cung 1 page
  - mobile state
- Mo ta can neu:
  - CTA chinh dan toi login/register/pricing
  - section nao la thong tin, section nao la conversion

### PUB-03 Pricing Guide Page

- Route: `/pricing`
- Can chup:
  - bang goi/danh sach goi
  - state CTA di den plan/payment neu co
- Mo ta can neu:
  - phan nay la public pricing, khac voi `/plans` sau login

### AUTH-01 Login Page

- Route: `/login`
- Can chup:
  - default form
  - invalid credential state
  - loading submit
- Mo ta can neu:
  - redirect sau login theo role
  - Google auth entry neu co
  - user da dang nhap bi `PublicRoute` day di dau

### AUTH-02 Register Page

- Route: `/register`
- Can chup:
  - default form
  - validation state
  - success/next-step state neu co OTP hoac verify
- Mo ta can neu:
  - field bat buoc
  - password rule
  - dieu kien tiep tuc sau submit

### AUTH-03 Forgot Password Page

- Route: `/forgot-password`
- Can chup:
  - default form
  - success state sau gui request
  - invalid email / API fail
- Mo ta can neu:
  - reset flow o FE dung message gi
  - co chuyen sang man hinh khac hay chi thong bao

### PUB-04 Accept Invitation Page

- Route: `/accept-invite`
- Can chup:
  - token hop le
  - token het han/khong hop le
  - chua login va duoc dan qua auth
- Mo ta can neu:
  - redirect logic cho user da dang nhap
  - route dich sau khi accept thanh cong
  - state khi tham gia vao group workspace

## Dau ra mong doi sau phase nay

- Hoan thanh spec cho cac screen `PUB-*` va `AUTH-*`
- Chot duoc:
  - auth redirect rule
  - launch gate rule
  - invite acceptance rule

## Rui ro de y

- Launch mode co the che toan bo route khac neu env dang bat.
- Invite flow phu thuoc token thuc te, nen can 1 token hop le va 1 token loi de chup du state.
