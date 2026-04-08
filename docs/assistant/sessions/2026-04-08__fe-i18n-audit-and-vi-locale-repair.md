# Session Summary

## Request

User yeu cau:

- Sua text hard-code trong `MatchingDragDrop.jsx` sang i18n.
- Quet toan bo FE de tim cac cho chua define i18n cho dang hoang, dac biet la form tao quiz va trang xem dap an.
- Check them khu admin va super admin.
- Sua `vi.json` vi co nhieu chu bi vo dau.
- Ghi lai tom tat session va skill lien quan vao `docs/`.

## Scope

- Feature hoac khu vuc tac dong:
  - User quiz flow va workspace quiz detail / review / result / distribution
  - Create quiz AI form, mock test detail, flashcard fallback labels
  - Admin va super admin layouts, sidebars, pagination, plan wizard, RBAC, AI audit, admin management, group detail
  - Locale files `en.json` va `vi.json`
  - Assistant docs cho FE
- Trong pham vi:
  - Chuyen text hien thi sang `t(...)`
  - Them key locale con thieu
  - Sua text tieng Viet bi mojibake trong `vi.json`
  - Ghi docs session va skill
- Ngoai pham vi:
  - Full FE build
  - Refactor logic khong lien quan i18n
  - Backend va BE locale

## Files changed

- `src/Pages/Users/Quiz/components/MatchingDragDrop.jsx`
- `src/Pages/Users/Quiz/components/QuestionCard.jsx`
- `src/Pages/Users/Group/Components/GroupQuizReviewPanel.jsx`
- `src/Pages/Users/Individual/Workspace/Components/QuizDetailView.jsx`
- `src/Pages/Users/Individual/Workspace/Components/MockTestDetailView.jsx`
- `src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/CreateQuizAiFormContent.jsx`
- `src/Pages/Users/Individual/Workspace/Components/CreateFlashcardForm.jsx`
- `src/Pages/Admin/AdminLayout.jsx`
- `src/Pages/Admin/PlanManagement.jsx`
- `src/Pages/Admin/components/AdminPagination.jsx`
- `src/Pages/Admin/components/AdminSidebar.jsx`
- `src/Pages/Admin/components/PlanFormWizard.jsx`
- `src/Pages/SuperAdmin/AdminManagement.jsx`
- `src/Pages/SuperAdmin/AiAuditManagement.jsx`
- `src/Pages/SuperAdmin/AiProvidersOverview.jsx`
- `src/Pages/SuperAdmin/Components/SuperAdminSidebar.jsx`
- `src/Pages/SuperAdmin/GroupDetailPage.jsx`
- `src/Pages/SuperAdmin/RbacManagement.jsx`
- `src/Pages/SuperAdmin/SuperAdminLayout.jsx`
- `src/i18n/locales/en.json`
- `src/i18n/locales/vi.json`
- `docs/README.md`
- `docs/assistant/README.md`
- `docs/assistant/instructions/change-playbook.md`
- `docs/assistant/skills/README.md`
- `docs/assistant/skills/i18n-locale-audit.md`
- `docs/assistant/sessions/_index.md`

## Summary of changes

- Chuyen cac text hien thi dang hard-code trong user quiz flow sang `t(...)`, bao gom matching, review card, publish / distribution, result va mot so fallback labels trong workspace.
- Quet va bo sung i18n cho khu admin / super admin, gom plan management, plan wizard, RBAC, AI audit, admin management, layouts, sidebars, pagination, group detail.
- Bo sung i18n cho man hinh AI providers, bao gom title, subtitle, metric, table, trang thai health, trang thai model, va nhan Yes/No.
- Dieu chinh man hinh AI providers tu grid nhieu provider card sang tab theo provider, de phan model goc gon hon va de scan nhanh hon.
- Them va can chinh key locale trong `en.json` va `vi.json` de phu du cac key moi vua dung.
- Sua lai cac cum text tieng Viet bi vo dau trong `vi.json`, tap trung o `common`, `adminManagement`, `rbac`, `subscription`, `groupDetail`, `aiAudit`, `workspace.quiz`.
- Ghi them 1 skill card moi cho workflow audit i18n / locale va cap nhat docs de agent doc `docs/assistant/` truoc khi thuc hien task.

## Skills applied

- Codex platform skills: khong co skill ngoai nao duoc invoke trong session nay.
- Repo skill / pattern duoc rut ra tu session:
  - `docs/assistant/skills/i18n-locale-audit.md`
- Docs da duoc doc va follow trong session:
  - `docs/assistant/README.md`
  - `docs/assistant/instructions/project-context.md`
  - `docs/assistant/instructions/change-playbook.md`

## Verification

- Lenh da chay:
  - `npm exec eslint -- ...` tren cac file FE da sua
  - Parse `src/i18n/locales/en.json`
  - Parse `src/i18n/locales/vi.json`
  - Script check missing key cho cac file admin / super admin da sua
  - Script quet heuristic `vi.json` de tim chuoi vo dau / mojibake
- Test da chay:
  - Lint targeted pass
  - JSON locale parse pass
  - Quet heuristic sau khi fix locale khong con pattern loi nhu `Ch?a`, `T?o`, `Kh?ng`, `??ng`, `?ang`
- Chua verify duoc:
  - Chua chay full `vite build`
  - Chua spot-check UI tay tren tat ca man hinh da dong vao

## Risks or follow-ups

- Van co the con text chua dua vao i18n o nhung khu FE chua duoc user nhac den trong dot nay.
- Nen chay full FE build va spot-check giao dien `vi` cho cac man hinh quiz / admin / super admin.
- Neu dot i18n tiep theo tiep tuc lap lai workflow nay, tiep tuc cap nhat `i18n-locale-audit.md` thay vi de note roi rac.
