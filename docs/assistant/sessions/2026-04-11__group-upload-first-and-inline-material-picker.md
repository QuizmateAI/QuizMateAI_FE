# Session Summary

## Request

- Luôn đọc docs FE trước khi làm việc.
- Đồng bộ behavior Group theo hướng Individual: muốn dùng các tính năng học thì phải có tài liệu trước.
- Với các form tạo có chọn tài liệu ở Group, cần gọi API lấy danh sách tài liệu và hiển thị ngay trong form để chọn.
- Cập nhật ghi chú/hint tương ứng.

## Scope

- In scope:
  - Group workspace studio action guard khi chưa có tài liệu.
  - Group create forms (quiz, flashcard) tự fetch tài liệu trong form.
  - In-form document selection cho Group flashcard create flow.
  - Cập nhật i18n vi/en cho note mới.
- Out of scope:
  - Refactor lỗi lint cũ không liên quan trong GroupWorkspacePage imports.
  - Full regression test toàn FE.

## Files Changed

- `src/Pages/Users/Group/GroupWorkspacePage.jsx`
- `src/Pages/Users/Group/Components/ChatPanel.jsx`
- `src/Pages/Users/Group/Components/CreateQuizForm.jsx`
- `src/Pages/Users/Group/Components/CreateFlashcardForm.jsx`
- `src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/CreateQuizFormContainer.jsx`
- `src/Pages/Users/Individual/Workspace/Components/CreateQuizFormParts/CreateQuizAiFormContent.jsx`
- `src/Pages/Users/Individual/Workspace/Components/CreateFlashcardForm.jsx`
- `src/i18n/locales/en.json`
- `src/i18n/locales/vi.json`

## Summary Of Changes

- Group studio guard:
  - Thêm ràng buộc tại `handleStudioAction`: với `roadmap`, `quiz`, `flashcard`, `mockTest`, `challenge`, nếu chưa có tài liệu thì chặn mở tính năng.
  - Khi bị chặn sẽ hiện thông báo i18n mới và tự điều hướng sang tab Documents; nếu user có quyền upload thì mở luôn upload dialog.

- Follow-up hard lock (same day):
  - Khóa trạng thái action ngay trên Studio panel (disabled) cho các mục cần tài liệu: `roadmap`, `quiz`, `flashcard`, `mockTest`, `challenge` khi workspace chưa có tài liệu.
  - Thêm chặn theo URL section: nếu user mở trực tiếp `?section=` vào tab cần tài liệu mà workspace chưa có tài liệu thì tự chuyển về `documents` và không cho mở tab đó.
  - Nút CTA "Mở roadmap" trong personal dashboard được đổi sang gọi cùng handler guard để không bypass điều kiện tài liệu.

- Group create forms fetch tài liệu ngay trong form:
  - Thay re-export bằng wrapper thật cho:
    - `Group/Components/CreateQuizForm.jsx`
    - `Group/Components/CreateFlashcardForm.jsx`
  - Mỗi wrapper gọi `getMaterialsByWorkspace(contextId)`, chuẩn hóa danh sách, lọc `DELETED`, và truyền `sources` + `selectedSourceIds` cho form gốc.
  - Wrapper quản lý local selected ids và đồng bộ ngược qua `onToggleMaterialSelection` nếu có.

- In-form chọn tài liệu cho Group flashcard form:
  - Mở rộng `CreateFlashcardForm` để hỗ trợ checkbox picker ngay trong form khi có `onToggleMaterialSelection`.
  - Vẫn giữ tương thích ngược cho luồng Individual (không truyền callback thì behavior cũ giữ nguyên).
  - Nối `onToggleMaterialSelection` từ Group `ChatPanel` xuống create flashcard form.

- Cập nhật note i18n:
  - Thêm key mới cho `groupWorkspace.studio.requireUploadBeforeActions`.
  - Thêm nhóm key `groupWorkspace.forms.*` cho loading/error/empty/hint của danh sách tài liệu trong form.
  - Đảm bảo vi/en parity cho các key mới.

- Update note rỗng tài liệu theo ngữ cảnh Group:
  - `CreateQuizAiFormContent` hỗ trợ `workspaceMaterialsEmptyMessage` để Group wrapper truyền note riêng, không ép dùng câu "add from Sources panel".

## Verification

- `get_errors` trên toàn bộ file đã sửa: không có lỗi cú pháp.
- ESLint theo file đã sửa:
  - Pass cho các file mới chỉnh.
  - Còn fail ở `src/Pages/Users/Group/GroupWorkspacePage.jsx` do import dư pre-existing (không phát sinh từ thay đổi mới).

## Risks / Follow-ups

- GroupWorkspacePage đang có import dư lâu trước đó; lint scoped chứa file này sẽ fail cho tới khi dọn import.
- Chưa chạy full manual flow cho tất cả role trong group (LEADER/CONTRIBUTOR/MEMBER) sau khi thêm guard; nên smoke test nhanh các role nếu cần release ngay.
