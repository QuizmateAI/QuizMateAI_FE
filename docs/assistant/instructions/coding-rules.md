# Coding Rules

## Muc dich

Tong hop cac rule thuc dung de agent sua FE theo dung style cua repo.

## Rules bat buoc

- Uu tien sua trong dung khu vuc trach nhiem cua feature, khong dat tam logic o file khong lien quan.
- Ten bien, ten ham, ten component dung tieng Anh ro nghia.
- Comment business rule co the viet tieng Viet neu can lam ro ly do.
- User-facing message nen ro nghia, than thien, va uu tien tieng Viet neu flow dang huong toi nguoi dung Viet.
- Khi mot component bat dau qua to hoac qua nhieu trach nhiem, tach thanh sub-component hoac custom hook.
- Refactor nho, co muc tieu, va co the verify duoc luon tot hon refactor rong nhieu mat tran.
- Dung theo `file-structure-rules.md`, `refactor-rules.md`, va `performance-levels.md` khi task dong vao khu vuc lon.
- URL/route naming uu tien danh tu so nhieu cho resource route (vi du: `/plans`, `/wallets`, `/payments`, `/workspaces`, `/quizzes`); chi giu dang khac neu la endpoint dac thu nhu callback hoac auth flow.

## UI va styling

- Uu tien Tailwind utility classes cho thay doi moi.
- Co the ton tai CSS cu trong repo, nhung khong mo rong them file CSS moi neu Tailwind da giai quyet duoc.
- Neu sua component UI co san trong `src/Components/ui/`, can giu tinh tai su dung.
- Khong dua style business-specific vao primitive UI neu no chi phuc vu 1 page.
- Toan he thong su dung mot bo font chu thong nhat theo quy uoc i18n cua du an; khong dat font override rieng cho tung block UI (vi du `font-mono`) neu khong co ly do nghiep vu ro rang.

## Data va side effects

- Goi API thong qua `src/api/`.
- Logic chuan hoa response, error mapping, fallback nen dat o utility hoac layer phu hop thay vi lap lai trong JSX.
- Tai khu vuc da co pattern san, nen noi theo pattern do thay vi ep repo chuyen toan bo sang pattern moi.

## Component design

- Page lo orchestration, feature component lo phan man hinh, hook lo logic lap lai.
- Khong de 1 component vua quan ly qua nhieu modal, fetch, mutation, va derived state neu co the tach duoc.
- Props nen ro nghia, tranh truyen nhieu flag mo ho neu co the gom lai theo object co ten.
- Khong mount san nhieu panel nang, dialog nang, hoac view an neu nguoi dung chua can thay.

## An toan khi sua doi

- Tim test lien quan truoc khi doi code.
- Neu sua route, auth, payment, hoac workspace, phai verify can than hon cac khu vuc khac.
- Khong sua theo suy doan ve API contract. Uu tien doc wrapper trong `src/api/` va code su dung thuc te.
- Kiem tra xem thay doi co vo tinh tang initial load, fetch count, hoac import bundle cho screen do khong.

## Khong nen lam

- Khong dat logic goi API truc tiep rai rac trong qua nhieu JSX file moi.
- Khong dua them convention moi cho ca repo neu chi de giai quyet 1 case nho.
- Khong viet doc de xung dot voi code thuc te.
- Khong eager-load du lieu, component, va asset cho cac state an neu chua co ly do ro rang.
