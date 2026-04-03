# Project Context

## Muc dich

Tom tat nhanh boi canh cua frontend `QuizMateAI_FE` de agent hieu minh dang sua cai gi va uu tien dieu gi.

## Pham vi

- Chi ap dung cho frontend React.
- Khong ghi rule backend, database, hay Python service vao file nay.

## Tech stack hien tai

- React 19
- Vite 7
- React Router DOM 7
- TailwindCSS 3
- Radix UI
- Vitest + Testing Library
- Axios
- i18next
- STOMP/SockJS cho mot so luong thoi gian thuc

## Muc tieu san pham FE

Frontend phuc vu cac nhom chuc nang chinh:

- Xac thuc va tai khoan: login, register, forgot password, Google auth.
- User learning flow: workspace, roadmap, quiz, profile, group, credit, plan.
- Public pages: landing, pricing, launching.
- Payment flow: thanh toan va trang ket qua.
- Admin va super admin: dashboard, quan tri he thong, RBAC, audit, topic, group, user.

## Uu tien khi sua FE

- Giu luong nguoi dung ro rang, de theo doi.
- Han che lam vo route, auth, payment, workspace va quiz.
- Uu tien code de doc, de test, de ban giao.
- Neu co noi dung hien thi cho end-user, uu tien thong diep tieng Viet ro nghia.

## Cac diem can nho

- Source structure dang tach theo `Pages`, `Components`, `api`, `hooks`, `context`, `lib`, `test`.
- Repo da co ca Tailwind va mot vai file `.css` cu. Tinh than la uu tien Tailwind cho thay doi moi, khong mo rong CSS roi rac neu khong can thiet.
- Tai lieu `copilot-instructions.md` la nguon tham khao cu, nhung khong nen tiep tuc nhồi them noi dung vao do.

## Doc file nao truoc khi bat dau

- Sua luong tong quan: `src/Pages/Route/route.js`
- Sua auth: `src/api/Authentication.js`, `src/Pages/Authentication/`, `src/Pages/Route/`
- Sua workspace hoac quiz: `src/Pages/Users/`, `src/Components/features/Workspace/`, `src/api/WorkspaceAPI.js`, `src/api/QuizAPI.js`
- Sua thanh toan: `src/Pages/Payment/`, `src/api/PaymentAPI.js`
- Sua admin: `src/Pages/Admin/`, `src/Pages/SuperAdmin/`
- Sua test: `src/test/`
