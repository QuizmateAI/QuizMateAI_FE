# FE Assistant Docs

Bo tai lieu nay la diem vao duy nhat de cung cap context cho agent khi lam viec voi `QuizMateAI_FE`.

## Muc tieu

- Giu instruction FE o mot noi de doc nhanh.
- Luu vet moi session chat thanh cac ban tom tat ngan.
- Mo ta cac skill va pattern da ap dung de tai su dung nhat quan.

## Cau truc

- `instructions/`: Quy tac on dinh, boi canh san pham, so do source code, workflow sua doi.
- `sessions/`: Moi session chat co 1 file tong ket rieng.
- `skills/`: Moi skill la 1 file mo ta cach ap dung, dau hieu nen dung, va checklist verify.

## Bat buoc truoc moi prompt

- Doc file nay truoc de xac dinh luong docs hien tai.
- Doc `instructions/project-context.md` va `instructions/change-playbook.md`.
- Doc them instruction, skill, va session gan nhat lien quan truc tiep den task.
- Khong bat dau sua code hoac tra loi ket luan khi chua doc qua `QuizMateAI_FE/docs/assistant/`.

## Thu tu doc de xuat

1. `instructions/project-context.md`
2. `instructions/architecture-map.md`
3. `instructions/coding-rules.md`
4. `instructions/file-structure-rules.md`
5. `instructions/refactor-rules.md`
6. `instructions/performance-levels.md`
7. `instructions/change-playbook.md`
8. Cac file lien quan trong `skills/`
9. Session gan nhat trong `sessions/` neu can boi canh thay doi moi

## Nguon su that hien co

- `copilot-instructions.md`: Tai lieu cu, van con gia tri, can duoc tach dan sang bo docs nay.
- `package.json`: Stack, scripts, dependencies.
- `src/`: Nguon thuc te cua FE.
- `src/test/`: Nguon su that cho regression va cach verify.

## Quy tac cap nhat

- Moi session chat co thay doi dang ke thi tao 1 file moi trong `sessions/`.
- Moi pattern lam viec lap lai tu 2 lan tro len thi nen dua thanh 1 file trong `skills/`.
- Khong dua secret, token, password, key that vao bat ky file nao trong thu muc nay.
- Khi rule da cu hoac xung dot voi code hien tai, uu tien cap nhat file trong `instructions/` thay vi bo sung ghi chu roi rac.

## Naming conventions

- Session file: `YYYY-MM-DD__chu-de-ngan.md`
- Skill file: `ten-skill-ngan.md`

## Ghi chu

Bo docs nay chi phuc vu FE. Khong dat rule BE hoac Python service vao day.
