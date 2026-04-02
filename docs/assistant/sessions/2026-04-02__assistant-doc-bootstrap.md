# Session Summary

## Request

Tao mot cau truc Markdown chi cho FE de agent lam viec tot hon, dong thoi bo sung:

- Mot folder tong hop session chat va summary thay doi theo tung phien
- Mot folder chua cac file mo ta skill da ap dung

## Scope

- Feature hoac khu vuc tac dong: `QuizMateAI_FE/docs/assistant/`
- Trong pham vi: scaffold tai lieu FE, session summary, skill cards
- Ngoai pham vi: BE, Python service, thay doi logic ung dung

## Files changed

- `docs/assistant/README.md`
- `docs/assistant/instructions/project-context.md`
- `docs/assistant/instructions/architecture-map.md`
- `docs/assistant/instructions/coding-rules.md`
- `docs/assistant/instructions/change-playbook.md`
- `docs/assistant/sessions/README.md`
- `docs/assistant/sessions/_index.md`
- `docs/assistant/sessions/_session-template.md`
- `docs/assistant/sessions/2026-04-02__assistant-doc-bootstrap.md`
- `docs/assistant/skills/README.md`
- `docs/assistant/skills/_skill-template.md`
- `docs/assistant/skills/ui-tailwind-shadcn.md`
- `docs/assistant/skills/feature-splitting.md`
- `docs/assistant/skills/api-flow-alignment.md`
- `docs/assistant/skills/regression-check.md`

## Summary of changes

- Tao 1 knowledge hub rieng cho frontend trong `docs/assistant/`
- Tach tai lieu thanh 3 nhom ro nghia: `instructions`, `sessions`, `skills`
- Tao san template de cac session sau co the ghi nhanh va dong nhat
- Tao 1 session summary dau tien de lam mau su dung

## Verification

- Lenh da chay: tao thu muc bang PowerShell
- Test da chay: chua can, vi chi thay doi tai lieu
- Chua verify duoc: chua review cung team ve quy uoc dat ten session va skill

## Risks or follow-ups

- `copilot-instructions.md` hien van la nguon cu, nen tach dan noi dung sang bo docs moi
- Co the can them skill card cho payment, auth, workspace neu tan suat sua doi cao
