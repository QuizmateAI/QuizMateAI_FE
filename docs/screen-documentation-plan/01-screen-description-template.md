# Screen Description Template

Mau nay duoc thiet ke de giong voi format nguoi dung yeu cau: co anh chup o dau, sau do la phan mo ta chi tiet.

## Mau markdown

```md
# 3.5.4 View Quiz List

![View Quiz List](../images/individual-workspace/IND-08__quiz-list__desktop.png)

Function Trigger:
- Workspace Studio: From the Workspace page -> Navigate to the Studio Panel -> Click the "Quiz" action button.
- Automatic View: If the current route deep-links to `/workspaces/:workspaceId/quizzes`, the page opens directly in quiz list mode.

Function Description:
- Actor: USER (Workspace Owner).
- Purpose: To provide a management interface where users can review, search, open, and maintain quizzes inside one workspace.
- Interface: Card/list dashboard with utility actions such as create, search, filter, refresh, and open detail.
- Data Processing:
  - Fetch: `GET ...` via `src/api/QuizAPI.js`
  - Mutation: `DELETE ...`, `POST ...`, `PUT ...` neu co

Screen Layout:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | Liet ke cac field chinh, badge, metadata, CTA |
| 2 | Validation | Liet ke rule validation, live filter, disable state |
| 3 | Business Rules | Liet ke route rule, permission, hover action, status badge |
| 4 | Normal Case | Liet ke luong su dung chinh theo tung buoc |
| 5 | Abnormal Cases | Empty, loading, API fail, unauthorized, plan gate |

Source of Truth:
- Route: `/workspaces/:workspaceId/quizzes`
- Page: `src/Pages/Users/Individual/Workspace/WorkspacePage.jsx`
- Component: `src/Pages/Users/Individual/Workspace/Components/QuizListView.jsx`
- API: `src/api/QuizAPI.js`
```

## Checklist cho moi file spec

- Co anh chup o dau file
- Co screen ID va ten screen ro rang
- Co route hoac duong trigger ro rang
- Co file nguon su that:
  - route
  - page
  - component
  - API
- Co `Normal Case`
- Co `Abnormal Cases`
- Co it nhat 1 business rule khong hien nhien neu screen co logic nghiep vu

## Cach ghi anh neu la dialog

Neu man hinh la dialog:

- chup full viewport de thay screen cha
- dat ten screen theo dialog
- trong `Function Trigger` ghi ro tu page nao mo dialog

Vi du:

```md
# HOME-03 Edit Workspace Dialog

![Edit Workspace Dialog](../images/user-core/HOME-03__edit-workspace-dialog__desktop.png)
```

## Cach ghi neu la screen dung chung cho nhieu role

Neu cung 1 component duoc dung cho Admin va Super Admin:

- neu UI giong nhau: co the tai su dung mot anh, nhung phai ghi ro da verify role nao
- neu action hien thi khac nhau theo permission: tao 2 file tach rieng
