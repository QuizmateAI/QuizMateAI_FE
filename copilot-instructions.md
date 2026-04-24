# Project Overview
QuizMate AI là một nền tảng học tập hiện đại hỗ trợ bởi AI, giúp người dùng chuyển hóa tài liệu (PDF, Video, URL) thành lộ trình học tập (Roadmap) và bộ câu hỏi (Quiz) thông minh. Hệ thống tích hợp chế độ AI Companion (tương tác giọng nói) và làm việc nhóm (Study Group). Built with React 19, Vite 7, TailwindCSS v3.4, and Shadcn UI.

# System Roles & Functionalities
1. Learner Functions (Individual User)
   a. Workspace & Roadmap Management
      - Tạo Workspace từ chủ đề hoặc tài liệu (PDF, Image, YouTube URL).
      - AI tự động trích xuất kiến thức và xây dựng Roadmap đa tầng (Phase -> Knowledge).
   b. Smart Quiz & AI Companion
      - Làm Quiz cá nhân hóa với độ khó tùy chỉnh.
      - Chế độ AI Companion: AI đọc câu hỏi và nghe phản hồi bằng giọng nói.
      - Hệ thống khóa/mở Phase: Phải vượt qua bài Post-learning mới được mở chặng tiếp theo.
   c. Analytics
      - Theo dõi tiến độ học tập và biểu đồ kỹ năng (Radar Chart).

2. Collaborative Functions (Study Group)
   a. Group Operations
      - Tạo nhóm, quản lý thành viên và thư viện tài liệu dùng chung.
      - Leaderboard thi đua giữa các thành viên.
   b. Challenges
      - Tổ chức các buổi làm Quiz nhóm thời gian thực.

3. Administrative Functions (Admin)
   a. Management
      - Quản lý người dùng, gói cước Premium và báo cáo vi phạm nội dung.
   b. System Health
      - Theo dõi tiêu thụ AI Token và thống kê doanh thu.

# Folder Structure (Critical Patterns)
/src/Pages/: Các component trang chính (Login, Dashboard, Workspace, Roadmap).
/src/Components/ui/: Chứa các UI components nguyên tử từ Shadcn UI.
/src/Components/features/: Chia nhỏ các chức năng của trang (ví dụ: /Login/SocialLogin.jsx, /Roadmap/PhaseNode.jsx).
/src/hooks/: Chứa các Custom Hooks xử lý logic (useAuth, useQuiz, useAI).
/src/api/: Centralized Axios configuration và các hàm gọi API.
/src/assets/: Chứa logo dự án và các hình ảnh tĩnh.

# Authentication Flow (Critical)
- JWT Storage: Token được lưu trữ trong `localStorage.getItem("jwt_token")`.
- Route Protection: Sử dụng `ProtectedRoute.jsx` để bảo vệ các trang yêu cầu đăng nhập và `PublicRoute.jsx` cho trang Login/Landing.
- Interceptors: Tự động đính kèm JWT vào Header và xử lý lỗi 401 để logout người dùng.

# Component Breakdown Rules (Critical)
- KHÔNG dồn tất cả chức năng vào một file.
- File source/test/docs không được vượt quá 1000 dòng.
- Khi một file vượt quá 800 dòng, phải ưu tiên tách component, hook, util hoặc service trước khi thêm logic đáng kể.
- Nếu file đã vượt quá 1000 dòng, không thêm logic mới trừ khi là hotfix tối thiểu; hãy split file trước.
- Logic phức tạp phải được tách ra Custom Hooks thay vì để trực tiếp trong Component.

# Styling Approach
- TailwindCSS Only: Luôn sử dụng utility classes trực tiếp trong JSX.
- NO .css Files: Tuyệt đối không tạo file .css riêng lẻ cho các trang/component mới.
- Colors: Primary Blue (#2563EB), Zinc Text (#313131), Amber Accent (#F59E0B) cho sự thông tuệ.
- Shadcn UI: Sử dụng hệ thống Token của Shadcn kết hợp với Tailwind để tùy chỉnh giao diện.

# Code Conventions
- Function Components: Sử dụng `function ComponentName()` thay vì arrow functions cho các Component chính.
- Comments: Viết giải thích logic nghiệp vụ (Business Logic) bằng Tiếng Việt.
- Naming: Đặt tên biến và hàm rõ ràng bằng tiếng Anh.
- Error Handling: Cung cấp thông báo lỗi thân thiện bằng Tiếng Việt cho người dùng.

# Code Simplicity Guidelines (Critical)
- Keep It Simple: Viết code đơn giản nhất có thể để các thành viên khác trong nhóm dễ hiểu.
- No Over-Engineering: Tránh sử dụng các pattern quá phức tạp hoặc các thư viện không cần thiết.
- Project Focus: Mọi dòng code phải phục vụ trực tiếp cho yêu cầu của QuizMate AI.

# Agent Review Rules (Critical)
- Nếu yêu cầu là review/kiểm tra/phân tích/audit, KHÔNG sửa code; chỉ report findings với file + line.
- Chỉ sửa code khi user yêu cầu rõ: fix, implement, sửa, làm code.
- Không sửa thư mục generated/dependency như `node_modules`, `dist`, `coverage`, `.claude/worktrees`.
- Luôn chạy targeted test/lint phù hợp; nếu không chạy được phải nói rõ lý do.

# Styling Rules for New Pages
- Inline Styling: Tất cả style phải nằm trong `className` của JSX.
- Responsive: Sử dụng prefixes của Tailwind (sm:, md:, lg:) để xử lý giao diện mobile/tablet.
- Shadcn + Tailwind: Kết hợp linh hoạt các UI component sẵn có với các class Tailwind để Layout không bị cứng nhắc.
