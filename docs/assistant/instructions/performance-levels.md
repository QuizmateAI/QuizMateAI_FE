# Performance Levels

## Muc dich

Dat quy tac toi uu FE theo muc do, tranh viec load qua nhieu code, data, va asset trong mot lan khien trang cham.

## Nguyen tac nen nho

- Khong load tat ca chi vi co the.
- Uu tien load theo route, theo tab dang mo, theo y dinh nguoi dung, va theo viewport.
- Prefetch chi khi kha nang su dung cao va chi phi tai duoc kiem soat.
- Muc tieu la perceived performance tot, khong chi la them nhieu ky thuat toi uu.

## Hien trang repo dang co

- Route-level lazy loading trong `src/App.jsx`
- Route preloader trong `src/lib/routeLoaders.js`
- React Query cache trong `src/queryClient.js`
- Vite chunk splitting va compression trong `vite.config.js`
- Mot so image da dung `loading=\"lazy\"`

## Performance level 0

Ap dung cho:

- Sua text, style, state nho
- Dialog nho, component nho, page nhe

Yeu cau:

- Khong duoc tang fetch thua
- Khong import them thu vien nang neu khong can

## Performance level 1

Ap dung cho:

- Them page moi
- Them panel, dialog, tab, section lon
- Them API fetch moi tren mot screen da co

Yeu cau bat buoc:

- Lazy-load page-level component neu no la route moi
- Khong fetch du lieu cho tab an, modal dong, accordion chua mo, neu khong co ly do ro rang
- Uu tien tai du lieu cua man hinh hien tai truoc
- Dung cache co san hoac prefetch theo y dinh nguoi dung khi hop ly
- Image khong critical thi dung lazy loading

## Performance level 2

Ap dung cho:

- Workspace, group workspace, quiz, admin dashboard, payment result, man hinh co nhieu panel
- Feature co nhieu view qua lai, data nhieu, hoac import component nang

Yeu cau bat buoc:

- Tach lazy theo panel, dialog, hoac view mode, khong chi lazy theo route
- Tranh mount dong loat tat ca child component nang ngay lan dau
- Tranh goi song song qua nhieu API chi de phuc vu noi dung chua hien
- Uu tien fetch theo `activeTab`, `activeSection`, `selectedId`, hoac prefetch khi hover/focus/navigation intent
- Danh gia co can virtualize list, paginate, hoac incremental rendering khong
- Kiem tra chunk size va dependencies moi co lam man hinh dau tien nang len khong

## Khi nao duoc eager-load

- Du lieu rat nho, can ngay lap tuc cho first paint co y nghia
- Prefetch theo y dinh ro rang, vi du hover vao card workspace truoc khi dieu huong
- Cac provider cap app thuc su can cho da so route

## Khi nao khong duoc eager-load mac dinh

- Tab chua mo
- Dialog chua mo
- Section duoi fold khong anh huong action dau tien
- Asset nang, editor nang, chart nang, danh sach dai
- API phuc tap cho tinh nang phu

## Rule cu the cho data loading

- Khong mount screen roi fetch tat ca tab cung luc chi de "de san".
- Neu preload theo y dinh, uu tien dung preloader rieng nhu pattern trong `src/lib/routeLoaders.js`.
- Neu du lieu co the cache an toan, uu tien tan dung React Query thay vi refetch moi lan.
- Chi bat them fetch song song neu no cai thien ro first-use experience va da biet payload chap nhan duoc.

## Rule cu the cho code splitting

- Route moi: lazy load mac dinh.
- Dialog lon, form lon, panel lon: can xem xet lazy-load.
- Feature chi dung trong mot nhanh heo lach cua UX thi khong nen vao initial bundle.
- Giu nhat quan voi chunking strategy dang co trong `vite.config.js`.

## Rule cu the cho assets

- Anh khong nam trong viewport ban dau thi lazy-load.
- Uu tien asset da toi uu dinh dang nhu webp, avif neu repo da co.
- Khong nhung asset nang vao component duoc dung lai rong neu phan lon route khong can.

## Rule cu the cho refactor hieu nang

- Uu tien loai bo fetch thua truoc khi them ky thuat nho le.
- Tach render tree va loading boundary truoc khi toi uu vi mo.
- Khong them `memo`, `useMemo`, `useCallback` hang loat neu chua co dau hieu that.

## Quick checklist truoc khi merge

- Man hinh nay dang load gi o lan vao dau tien?
- Co thu gi dang fetch du ma nguoi dung chua thay khong?
- Co dialog, tab, panel nao dang import san du chua can khong?
- Cache hien co da duoc tan dung chua?
- Co the chuyen eager-load sang preload theo y dinh duoc khong?
