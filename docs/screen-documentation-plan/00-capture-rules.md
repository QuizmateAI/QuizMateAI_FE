# Capture Rules

## 1. Moi truong can co

- FE chay duoc voi API environment hop le.
- Neu `VITE_LAUNCH_MODE=true`, chup `LaunchingPage` truoc, sau do tat launch mode de vao cac route con lai.
- San cac loai tai khoan:
  - guest
  - user moi, gan nhu khong co du lieu
  - user da co workspace ca nhan
  - group leader
  - group member
  - admin
  - super admin
- San cac bo du lieu:
  - 1 workspace ca nhan rong
  - 1 workspace ca nhan da co source, roadmap, quiz, flashcard, mock test
  - 1 group workspace co pending material, member, challenge
  - 1 practice quiz co the vao lam ngay
  - 1 exam quiz co auto-save
  - 1 payment session thanh cong va 1 payment session that bai/bi huy

## 2. Chuan chup anh

- Uu tien desktop truoc:
  - width khuyen nghi: 1440px
  - zoom: 100%
  - sidebar o trang thai mo rong neu screen co sidebar
- Chup them mobile cho cac screen nhay cam responsive:
  - Landing
  - Login/Register/Forgot Password
  - Home
  - Workspace shell
  - Group workspace shell
- Ngon ngu mac dinh de document:
  - chup ban `vi` truoc
  - neu screen co su khac biet lon theo locale, chup them `en`
- Theme:
  - chup light mode mac dinh
  - chi chup them dark mode neu screen co logic/theme khac biet can mo ta rieng

## 3. Moi screen toi thieu can chup cac state nao

- Default populated state
- Empty state
- Loading state neu co loading UI rieng
- Validation error hoac API error
- Success hoac post-action state
- Permission/plan gate neu co

Khong can chup tat ca cac state trong cung mot file spec neu state do khong tao khac biet chuc nang. Tuy nhien phai mo ta state do trong phan `Abnormal Cases` hoac `Business Rules`.

## 4. Cach dat ten file

- File markdown:
  - `<SCREEN-ID>__<slug>.md`
- Anh desktop:
  - `<SCREEN-ID>__<slug>__desktop.png`
- Anh mobile:
  - `<SCREEN-ID>__<slug>__mobile.png`

Vi du:

```text
IND-08__quiz-list.md
IND-08__quiz-list__desktop.png
IND-08__quiz-list__mobile.png
```

## 5. Cach dat ten screen ID

- `PUB-*`: public / launch / invite
- `AUTH-*`: authentication
- `HOME-*`: home va card/dialog lien quan
- `PROFILE-*`, `PLAN-*`, `PAY-*`, `WALLET-*`, `FEEDBACK-*`
- `IND-*`: individual workspace
- `GRP-*`: group workspace
- `QZ-*`: quiz runtime
- `ADM-*`: admin
- `SADM-*`: super admin

## 6. Rule ve noi dung screenshot

- Khong de lo token, email that, phone that, transaction id that neu khong can.
- Neu can hien du lieu nguoi dung, dung account test va du lieu gia lap.
- Neu screen co chat, thong bao, log, ranking, feedback:
  - su dung du lieu de doc duoc
  - tranh noi dung nhay cam

## 7. Thu tu doc code truoc khi chup

1. Route trong `src/App.jsx`
2. Page entry trong `src/Pages/...`
3. Component con de render man hinh
4. API wrapper trong `src/api/...`
5. Hook/context neu screen co state phuc tap

## 8. Rule ghi mo ta

- Luon neu ro `Function Trigger`
- Luon neu ro `Actor`, `Purpose`, `Interface`, `Data Processing`
- Luon tach `Normal Case` va `Abnormal Cases`
- Neu screen la dialog hoac sub-view, ghi ro no duoc mo tu screen nao
