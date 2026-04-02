# API Flow Alignment

## Muc dich

Sua feature co lien quan den API ma van giu luong FE de theo doi, de xu ly loi, va khong xung dot voi wrapper hien co.

## Khi nao dung

- Them request moi
- Sua mapping response
- Sua loading, error, retry, fallback quanh API

## Inputs can doc

- `src/api/`
- Page hoac hook dang goi API
- Test lien quan trong `src/test/`

## Cach thuc hien

1. Tim wrapper API gan nhat trong `src/api/` va sua o do truoc.
2. Kiem tra shape du lieu ma page dang ky vong.
3. Dat loading, success, error state o dung muc trach nhiem.
4. Neu co thong diep loi cho user, uu tien ro nghia va co tinh hanh dong.
5. Neu co fallback logic, ghi ro trong code va session summary.

## Verify

- Chay test domain lien quan neu co
- Check nhanh error path va empty path
- Kiem tra xem thay doi co anh huong den cac man hinh khac dung chung wrapper khong

## Dau hieu can dung lai

- Thuong xuyen gap bai map response, error handling, optimistic update, hoac fallback data
