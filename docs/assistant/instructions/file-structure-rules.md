# File Structure Rules

## Muc dich

Quy dinh cach sap xep file trong FE de de tim, de review, va de refactor.

## Nguyen tac tong quat

- Dat code o noi co muc do gan nhat voi trach nhiem cua no.
- Khong tao file helper chung chung neu no chi phuc vu 1 feature.
- Khong dua business logic vao primitive UI component.
- Khong de page-level file tro thanh noi chua tat ca moi thu.

## Quy uoc theo thu muc

- `src/Pages/`: page entry, route destination, page orchestration.
- `src/Components/features/`: UI va interaction theo feature.
- `src/Components/ui/`: primitive UI, wrapper UI tai su dung rong.
- `src/hooks/`: custom hooks co logic lap lai hoac stateful orchestration.
- `src/api/`: request wrapper va mapping lien quan den HTTP layer.
- `src/context/`: app-wide shared state.
- `src/lib/`: helper co tinh he thong, preloader, config, route support.
- `src/Utils/`: utility nho, stateless, khong phu thuoc React.
- `src/test/`: test theo domain gan voi feature.

## Quy tac tao file moi

- Tao file moi khi no lam ro trach nhiem hon, khong chi de cat nho co hoc.
- Neu mot phan UI co title, action, state va layout rieng, no xung dang thanh component rieng.
- Neu mot doan logic duoc dung tu 2 noi tro len, can xem xet tach ra hook hoac utility.
- Neu data-fetching phuc tap lap lai, uu tien dua ve hook hoac wrapper API thay vi nhan ban trong page.

## Quy tac page

- Page chi nen lo:
  - route params
  - page-level composition
  - quyen truy cap
  - ket noi giua hook, feature component, va navigation
- Page khong nen lo toan bo chi tiet render cho tung panel nho.

## Quy tac feature component

- Feature component co the lo:
  - layout cua feature
  - local UI state
  - event handler cua feature
  - render loading, empty, error, success state
- Neu feature component qua lon, tach tiep theo section hoac mode.

## Quy tac hook va utility

- Hook cho logic co state, effect, data flow, cache, navigation coordination.
- Utility cho transform data, normalize input, map value, validate nho.
- Khong dua JSX vao utility.
- Khong dat side effect dang ke trong utility stateless.

## Naming

- Page: `SomethingPage.jsx`
- Dialog: `SomethingDialog.jsx`
- Hook: `useSomething.js` hoac `useSomething.jsx`
- Utility: dong tu hoac cu phap ro nghia, vi du `normalizeHomeTab.js` neu tach rieng

## Dau hieu can sap xep lai

- 1 file co qua nhieu import tu nhieu tang khac nhau.
- 1 feature trai dai qua nhieu thu muc khong theo mot quy uoc.
- Muon tim logic ma phai nhay qua qua nhieu file ten mo ho.
