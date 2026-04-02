# Progressive Loading

## Muc dich

Giam initial load bang cach chia viec tai code, data, va asset theo route, theo intent, va theo state dang hien.

## Khi nao dung

- Them route moi
- Them tab moi, panel moi, dialog moi
- Man hinh co nhieu khu vuc va API
- Co dau hieu load cham vi dang tai qua nhieu thu trong lan vao dau tien

## Inputs can doc

- `src/App.jsx`
- `src/lib/routeLoaders.js`
- `src/queryClient.js`
- `vite.config.js`
- File man hinh dang sua

## Cach thuc hien

1. Liet ke nhung gi dang duoc tai o lan dau tien: route chunk, API, image, dialog, panel.
2. Tach nhung gi khong can cho first action sang lazy-load, on-demand load, hoac intent prefetch.
3. Neu man hinh co nhieu tab hoac mode, chi fetch theo tab dang active tru khi payload rat nho va co ly do ro.
4. Tan dung pattern preload san co neu user sap dieu huong sang man hinh nang.
5. Kiem tra lai xem thay doi co day them dependency nang vao initial bundle khong.

## Verify

- So luong API call khi vao man hinh co giam hoac it nhat khong tang vo ly
- Dialog an khong bi import san neu chua can
- Route va panel van mo nhanh khi nguoi dung thuc su truy cap
- Bundle strategy khong bi pha vo ro rang

## Dau hieu can dung lai

- Bat ky task nao lien quan den lazy loading, prefetch, cache, chunking, hoac giam initial render cost
