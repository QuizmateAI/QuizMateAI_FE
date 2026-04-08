# I18n Locale Audit

## Muc dich

Skill nay dung de quet FE cho text hien thi chua duoc dua vao i18n, dong bo key `en` / `vi`, va sua loi locale bi vo dau hoac mojibake.

## Khi nao dung

- User bao con hard-code text trong UI.
- Co branch tay theo `i18n.language` hoac `lang === "en"` de doi label.
- Vua them key moi vao locale va can check thieu key / sai key.
- `vi.json` co dau hieu chu bi vo dau nhu `Ch?a`, `T?o`, `Kh?ng`, `??ng`.

## Inputs can doc

- `docs/assistant/README.md`
- `docs/assistant/instructions/project-context.md`
- `docs/assistant/instructions/change-playbook.md`
- `src/i18n/locales/en.json`
- `src/i18n/locales/vi.json`
- Cac component/page dang bi user report

## Cach thuc hien

1. Quet component lien quan de tim text hard-code, branch tay theo ngon ngu, va fallback label hien thi cho end-user.
2. Chuyen text sang `t(...)`, uu tien tai su dung key theo namespace co san truoc khi tao key moi.
3. Bo sung key moi vao `en.json` va `vi.json` theo cung cau truc.
4. Neu `vi.json` co dau hieu vo dau, sua theo cum key hoac top-level section thay vi va tung dong roi rac.
5. Verify lai key coverage cho cac file da sua va parse JSON locale.
6. Quet heuristic sau cung cho locale tieng Viet de bat mojibake con sot.

## Verify

- Chay `eslint` tren cac file FE vua sua.
- Parse `en.json` va `vi.json`.
- Check key `t(...)` vua them da ton tai o ca `en` va `vi`.
- Quet `vi.json` cho cac pattern loi pho bien: `Ch?a`, `T?o`, `Kh?ng`, `??ng`, `?ang`, ky tu replacement.

## Dau hieu can dung lai

- Khi lai co dot audit i18n tren user flow, admin, hoac super admin.
- Khi locale `vi` vua duoc merge bulk va can check encoding / chat luong text.
