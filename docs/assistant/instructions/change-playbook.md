# Change Playbook

## Muc dich

Checklist ngan de xu ly mot task FE tu luc tiep nhan den luc chot session.

## 1. Truoc khi sua

- Doc `docs/assistant/README.md` truoc.
- Doc `instructions/project-context.md` va `instructions/change-playbook.md`.
- Xac dinh page, component, hook, API wrapper, test lien quan.
- Doc session gan nhat neu task lien tiep mot thay doi vua lam.
- Kiem tra xem `skills/` da co pattern phu hop chua.

## 2. Trong luc sua

- Sua o muc nho nhat co the.
- Neu file co dau hieu phinh ra, tach luon cung luc thay vi de lai technical debt.
- Neu thay doi can nhieu file, giu mot luong di duong thang de de review.
- Neu task dong vao screen lon, xac dinh truoc muc do toi uu hoa can ap dung: level 0, 1, hay 2.
- Neu co refactor, ghi ro refactor de giai quyet van de gi.

## 3. Sau khi sua

- Chay lint hoac test lien quan neu co the.
- Cap nhat session file trong `sessions/`.
- Neu da lap lai mot cach lam moi co gia tri, bo sung hoac cap nhat file trong `skills/`.
- Neu thay doi anh huong loading, ghi ro da eager-load, lazy-load, preload, hay cache cai gi.

## 4. Khi tao session summary

Session summary nen tra loi duoc 5 cau hoi:

- Nguoi dung yeu cau gi?
- Da sua file nao?
- Thay doi chinh la gi?
- Rui ro con lai la gi?
- Can verify them bang cach nao?

## 5. Khi tao skill moi

Chi tao skill moi neu no thuc su co the tai su dung. Neu chi la ghi chu cho 1 task duy nhat, dat vao session summary la du.
