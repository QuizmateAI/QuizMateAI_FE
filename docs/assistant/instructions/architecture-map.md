# Architecture Map

## Muc dich

Chi ra FE dang duoc to chuc nhu the nao de agent biet nen sua o dau va tranh dat sai logic.

## Thu muc chinh

- `src/main.jsx`: Entry point.
- `src/App.jsx`: App shell cap cao.
- `src/Pages/`: Cac page-level screen va route destination.
- `src/Components/`: Thanh phan tai su dung va feature component.
- `src/api/`: Cac wrapper goi API.
- `src/hooks/`: Custom hooks cho state va logic dung lai.
- `src/context/`: Context cap app.
- `src/lib/`: Helper co tinh he thong hoac config.
- `src/Utils/`: Utility functions nho.
- `src/i18n/`: Cau hinh ngon ngu va locale.
- `src/test/`: Unit test, integration test va manual test notes.

## Quy uoc dat logic

- Page-level orchestration dat trong `src/Pages/`.
- Feature-specific UI dat trong `src/Components/features/`.
- Primitive UI dat trong `src/Components/ui/`.
- Goi HTTP dat trong `src/api/`.
- Logic tach duoc khoi UI thi dua vao `src/hooks/`, `src/lib/`, hoac `src/Utils/` tuy muc do reuse.

## Khu vuc de tac dong nhieu

- Routing va auth gate:
  - `src/Pages/Route/route.js`
  - `src/Pages/Route/protectedRoute.jsx`
- Query client:
  - `src/queryClient.js`
- Toast va UX phan hoi:
  - `src/context/ToastContext.jsx`
  - `src/Components/ToastNotification.jsx`
- WebSocket:
  - `src/hooks/useWebSocket.js`
  - `src/lib/authOtpSocket.js`
  - `src/lib/websocketUrl.js`

## Dau hieu can tach file

- File vua lo UI, vua lo fetch, vua lo mapping data, vua lo validation.
- File page qua dai va bat dau co nhieu section tuong doi doc lap.
- Co logic co the dung lai giua nhieu page hoac nhieu feature.

## Lien he giua code va test

- Test tu dong nam trong `src/test/` va da chia theo domain nhu `auth`, `payment`, `quiz`, `workspace`, `group`, `admin`.
- Manual reports dang nam trong `src/test/manual/`.
- Khi sua mot feature, nen tim test cung domain truoc de thay pham vi anh huong.
