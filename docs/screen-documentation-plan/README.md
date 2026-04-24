# Screen Documentation Plan

Bo tai lieu nay la ke hoach doc frontend theo phase de:

- liet ke day du cac screen can duoc chup
- xac dinh file code va API can doc truoc khi mo ta
- thong nhat cach dat ten file anh va file markdown
- tai su dung mot mau mo ta man hinh thong nhat

## Nguon context da dung

- `docs/assistant/README.md`
- `docs/assistant/instructions/project-context.md`
- `docs/assistant/instructions/change-playbook.md`
- `docs/assistant/instructions/architecture-map.md`
- `docs/assistant/instructions/coding-rules.md`
- `docs/assistant/instructions/file-structure-rules.md`
- `src/App.jsx`
- `src/lib/routePaths.js`
- `src/Pages/Users/Individual/Workspace/utils/viewRouting.js`
- `src/Pages/Users/Individual/Workspace/WorkspacePage.jsx`
- `src/Pages/Users/Group/GroupWorkspacePage.jsx`
- `src/test/manual/quizmateai-core-test-cases.md`

## Cach dung bo plan nay

1. Doc `00-capture-rules.md` de chuan hoa moi anh chup va bo test data.
2. Doc `01-screen-description-template.md` de dung cung mot format mo ta man hinh.
3. Doc `02-screen-inventory.md` de biet toan bo inventory screen cua FE.
4. Neu can bo `screen spec` da co san theo module, doc trong `docs/screen-specs/`.
5. Thuc hien lan luot theo cac file phase:
   - `03-phase-01-public-auth.md`
   - `04-phase-02-user-core.md`
   - `05-phase-03-individual-workspace.md`
   - `06-phase-04-group-workspace.md`
   - `07-phase-05-quiz-runtime.md`
   - `08-phase-06-admin-superadmin.md`

## Tong quan phase

- Phase 1: Public va Authentication
  - Muc tieu: chot cac route khach, auth, invite, launch gate.
- Phase 2: User Core
  - Muc tieu: home, profile, plan, payment, wallet, feedback.
- Phase 3: Individual Workspace
  - Muc tieu: onboarding, sources, roadmap, quiz, flashcard, mock test, post-learning, analytics.
- Phase 4: Group Workspace
  - Muc tieu: dashboard, documents, moderation, members, studio, challenge, ranking, wallet, settings.
- Phase 5: Quiz Runtime
  - Muc tieu: practice, exam, result va cac state trong qua trinh lam bai.
- Phase 6: Admin va Super Admin
  - Muc tieu: dashboard, CRUD pages, audit/governance, feedback backoffice.

## Dau ra nen tao o buoc document that

Plan nay chi la ke hoach. Khi bat dau viet tai lieu man hinh that, nen tao cau truc rieng nhu sau:

```text
docs/screen-specs/
  images/
    public-auth/
    user-core/
    individual-workspace/
    group-workspace/
    quiz-runtime/
    admin/
  public-auth/
  user-core/
  individual-workspace/
  group-workspace/
  quiz-runtime/
  admin/
```

## Rule quan trong

- Khong mo ta theo suy doan. Moi screen phai doi chieu route, page file, component va API wrapper.
- Voi workspace va group workspace, coi `route + active section/view + role` la 1 screen logic.
- Voi page dung chung giua Admin va Super Admin, chi duoc tai su dung anh/mo ta neu UI va permission thuc su giong nhau.
- Moi file spec man hinh phai co anh chup o dau file.
