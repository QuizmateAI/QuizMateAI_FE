# Session: Thống nhất giao diện empty state cho các list view

**Ngày:** 2026-04-14

## 1. Người dùng yêu cầu gì?

Thống nhất giao diện các trang danh sách (quiz, flashcard, mock test, post-learning, challenge):
- Một cách hiển thị nhất quán khi danh sách trống
- Chỉnh đẹp hơn một chút, không thay đổi hoàn toàn UI
- Thêm nút tạo ở empty state nếu trang đó hỗ trợ tạo
- Phân quyền: role không thể tạo thì không hiện nút

## 2. Đã sửa file nào?

- `src/Pages/Users/Individual/Workspace/Components/FlashcardListView.jsx`
- `src/Pages/Users/Individual/Workspace/Components/MockTestListView.jsx`
- `src/Pages/Users/Individual/Workspace/Components/PostLearningListView.jsx`
- `src/Pages/Users/Group/Components/ChallengeListView.jsx`
- `src/Pages/Users/Group/Components/ChallengeTab.jsx`
- `src/i18n/locales/vi/group.json`
- `src/i18n/locales/en/group.json`

## 3. Thay đổi chính là gì?

**Pattern chuẩn hóa cho empty state:**
```jsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className={`mb-4 h-12 w-12 ${isDarkMode ? "text-slate-600" : "text-slate-300"}`} />
  <p className={`text-sm ${mutedTextClass}`}>{t("...")}</p>
  {canCreate && <Button>Tạo</Button>}
</div>
```

**No-results pattern:**
```jsx
<div className="flex flex-col items-center justify-center px-6 py-16 text-center">
  <FolderOpen className={`mb-4 h-10 w-10 ${isDarkMode ? "text-slate-600" : "text-slate-300"}`} />
  <p className={`text-sm ${mutedTextClass}`}>{t("workspace.listView.noResults")}</p>
</div>
```

**Cụ thể từng file:**
- FlashcardListView, MockTestListView: icon trong empty + no-results state từ hardcoded `text-slate-300` → dark mode aware (`text-slate-600` dark / `text-slate-300` light); py-12 → py-16
- PostLearningListView: thêm `isDarkMode = false` vào props (đã được ChatPanel truyền nhưng bị bỏ qua), thêm `mutedTextClass`, fix icon + text trong empty + no-results
- ChallengeListView: thêm `useTranslation` + `Button` + `Plus`; replace hardcoded "Chưa có challenge nào" bằng i18n; remove border/bg wrapper khỏi empty state → dùng clean centered layout; thêm optional `onCreateChallenge` prop để hiển thị nút tạo
- ChallengeTab: truyền `onCreateChallenge={isLeader ? () => setShowCreateWizard(true) : undefined}` → chỉ leader mới thấy nút tạo trong empty state
- i18n: thêm `noItems`, `createChallenge` vào section `groupWorkspace.challenge` (vi + en)

## 4. Rủi ro còn lại là gì?

- QuizListView (individual) không thay đổi vì đã chuẩn nhất (có dark mode, có create check)
- Group/QuizListView, FlashcardListView, MockTestListView là wrapper/re-export → tự nhận fix từ Individual
- RoadmapCanvasView và SourcesPanel không nằm trong scope của task này

## 5. Cần verify thêm bằng cách nào?

- Mở từng tab (Flashcard, MockTest, PostLearning, Challenge) ở trạng thái trống, kiểm tra icon màu đúng ở dark/light mode
- Kiểm tra ChallengeTab: với leader trống → thấy nút "Tạo Challenge"; với member trống → không có nút
- Kiểm tra no-results state (có search query không khớp) cho đúng màu dark mode
