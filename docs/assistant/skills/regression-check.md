# Regression Check

## Muc dich

Giam nguy co sua mot diem vo nhieu diem khac, dac biet o auth, payment, workspace, quiz va route.

## Khi nao dung

- Sua file route, auth gate, payment callback
- Sua component duoc dung lai o nhieu noi
- Refactor file lon

## Inputs can doc

- `src/test/`
- Session summary gan nhat
- File feature vua sua

## Cach thuc hien

1. Tim test cung domain truoc khi sua.
2. Sau khi sua, uu tien chay test co lien quan truc tiep.
3. Neu khong co test, ghi ro manual checks can lam.
4. Neu thay doi dong vao flow nhay cam, note lai rui ro con lai trong session summary.

## Verify

- Lint hoac test lien quan
- Manual smoke check cho loading, error, empty, success
- Kiem tra route transition neu task co lien quan den dieu huong

## Dau hieu can dung lai

- Bat ky task nao co xac suat gay vo flow rong hoac can sanity-check truoc khi merge
