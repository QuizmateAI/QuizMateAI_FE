# Session Summary

## Request

Them rule ve refactor code, cau truc file, va cach dat muc do toi uu hoa FE de tranh load qua nhieu thu trong mot lan.

## Scope

- Feature hoac khu vuc tac dong: `QuizMateAI_FE/docs/assistant/`
- Trong pham vi: instruction va skill card cho refactor, file structure, progressive loading
- Ngoai pham vi: thay doi code runtime cua ung dung

## Files changed

- `docs/assistant/README.md`
- `docs/assistant/instructions/coding-rules.md`
- `docs/assistant/instructions/change-playbook.md`
- `docs/assistant/instructions/file-structure-rules.md`
- `docs/assistant/instructions/refactor-rules.md`
- `docs/assistant/instructions/performance-levels.md`
- `docs/assistant/skills/README.md`
- `docs/assistant/skills/progressive-loading.md`
- `docs/assistant/sessions/_index.md`
- `docs/assistant/sessions/2026-04-02__refactor-structure-performance-rules.md`

## Summary of changes

- Bo sung rule rieng cho sap xep file va dat code dung tang trach nhiem
- Bo sung rule refactor an toan, co muc tieu, va co checklist
- Bo sung he thong `performance levels` de quyet dinh khi nao can lazy-load, preload, cache, va tranh eager-load qua muc
- Them skill card `progressive-loading` de tai su dung trong cac task FE nhay cam ve loading

## Verification

- Lenh da chay: doc cac file thuc te `src/App.jsx`, `src/lib/routeLoaders.js`, `src/queryClient.js`, `vite.config.js`
- Test da chay: chua can, vi chi thay doi tai lieu
- Chua verify duoc: chua review cung team xem co muon siet hon rule fetch theo tab an hay khong

## Risks or follow-ups

- Hien tai mot so screen co the van preload hoac fetch som de toi uu UX; can ap dung `performance levels` theo context, khong may moc
- Co the bo sung them skill card rieng cho `auth-flow`, `payment-flow`, `workspace-heavy-screen` neu cac khu vuc nay duoc sua thuong xuyen
