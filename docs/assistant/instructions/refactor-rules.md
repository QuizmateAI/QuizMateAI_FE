# Refactor Rules

## Muc dich

Dat ra cac rule de refactor FE an toan, co muc tieu ro, va khong bien refactor thanh mot dot viet lai.

## Khi nao nen refactor

- File qua tai trach nhiem.
- Logic lap lai bat dau xuat hien o nhieu noi.
- Flow dang kho test, kho debug, kho them feature.
- Performance bi anh huong vi render, fetch, hoac import qua nang.

## Khi nao khong nen refactor lon

- Task chi can mot sua loi nho va dang nam trong khu vuc nhay cam nhu payment, auth callback.
- Khong co du context de xac dinh hanh vi dung.
- Refactor se mo rong scope vuot xa yeu cau cua task.

## Nguyen tac refactor

- Refactor de giai quyet mot van de cu the, khong refactor vi "cam thay xau".
- Giu nguyen external behavior tru khi yeu cau task doi hanh vi.
- Chia refactor thanh cac buoc nho co the verify.
- Uu tien "move and clarify" truoc "rewrite".

## Thu tu uu tien khi refactor

1. Lam ro ten bien, ten ham, ten component.
2. Tach utility va normalize data flow.
3. Tach sub-component theo block UI.
4. Tach custom hook cho logic state/effect lap lai.
5. Toi uu loading, lazy loading, prefetch, hoac cache neu co dau hieu nghen.

## Guardrails

- Khong vua refactor kien truc vua thay doi nghiep vu neu khong bat buoc.
- Khong di doi file hang loat neu loi ich khong ro.
- Khong thay doi API component tai su dung rong neu chua kiem tra noi dung phu thuoc.
- Voi auth, payment, workspace, quiz: refactor nho hon, test ky hon.

## Refactor checklist

- Van de cu the la gi?
- Sau refactor file co de doc hon khong?
- So trach nhiem trong moi file giam chua?
- Danh sach props va state co ro nghia hon khong?
- Da giu loading, empty, error, success state day du chua?
- Da note rui ro trong session summary chua?

## Muc tieu tot

- Moi file co mot vai tro ro.
- Logic co the test doc lap hon.
- Import graph gon hon.
- Flow render va fetch de suy luan hon.
