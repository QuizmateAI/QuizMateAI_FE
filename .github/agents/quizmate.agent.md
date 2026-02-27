
# 📑 QuizMate AI - Project Guidelines & Instructions

## 1. Tổng quan dự án (Project Overview)

QuizMate AI là nền tảng học tập hiện đại hỗ trợ bởi AI, giúp chuyển hóa tài liệu (PDF, Video, URL) thành lộ trình học tập (**AI Roadmap**) và bộ câu hỏi (**Smart Quiz**).

* **Tech Stack**: React 19, Vite 7, TailwindCSS v3.4, Shadcn UI, Lucide React.
* **Mục tiêu**: Tối ưu hóa việc tự học thông qua trí tuệ nhân tạo và tương tác giọng nói (AI Companion).

---

## 2. Quy tắc thiết kế Dual-Theme (Sáng & Tối) - **QUAN TRỌNG**

Mọi thành phần giao diện khi thiết kế **BẮT BUỘC** phải hỗ trợ song song hai chế độ màu bằng tiền tố `dark:` của Tailwind.

### 🎨 Hệ thống bảng màu chuẩn (Global Palette)

| Thành phần | Light Mode (Sáng) | Dark Mode (Tối) |
| --- | --- | --- |
| **Nền chính (Main BG)** | `bg-white` hoặc `bg-slate-50` | `bg-slate-950` |
| **Nền phụ (Section BG)** | `bg-[#FAFAFA]` hoặc `bg-slate-100` | `bg-slate-900` |
| **Chữ chính (Primary)** | `text-[#12141D]` hoặc `text-slate-900` | `text-white` |
| **Chữ phụ (Secondary)** | `text-gray-500` | `text-slate-400` |
| **Màu nhấn (Accent)** | `bg-[#2563EB]` | `bg-blue-600` |
| **Đường viền (Border)** | `border-slate-200` | `border-slate-800` |

### ✨ Quy tắc thẩm mỹ & Chống "hòa tan" nền

* **Độ tương phản (Contrast)**: Trong Light Mode, các khối Placeholder/Card không được dùng màu trắng thuần để tránh bị hòa tan vào nền. Bắt buộc dùng `bg-slate-100/200` kết hợp `border-slate-300`.
* **Hiệu ứng lớp kính (Glassmorphism)**:
* **Light**: `bg-white/70 backdrop-blur-xl border-white/60`.
* **Dark**: `bg-slate-900/50 backdrop-blur-xl border-slate-700/50`.


* **Đổ bóng (Shadows)**:
* **Light**: Sử dụng bóng đổ xám nhẹ có chiều sâu: `shadow-2xl shadow-slate-900/10`.
* **Dark**: Sử dụng bóng đổ có sắc xanh đậm để tạo độ sâu: `shadow-2xl shadow-blue-900/50`.



---

## 3. Quy tắc Đa ngôn ngữ & Font chữ (Critical)

* **Cấu trúc**: Sử dụng `i18next` và hook `useTranslation`.
* **Phông chữ theo ngôn ngữ**:
* **Tiếng Anh (EN)**: Sử dụng font **Poppins**. Class: `font-poppins`.
* **Tiếng Việt (VI)**: Sử dụng font **Sans-serif** hệ thống. Class: `font-sans`.


* **Thực thi**: Tính toán `fontClass` ở component cha và áp dụng vào thẻ bọc ngoài cùng:
`const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';`.

---

## 4. Bố cục & Tương tác (UI/UX Standards)

* **Navbar cố định**:
* Luôn có `sticky top-0 z-[100]` kết hợp `backdrop-blur`.
* **Kích thước nút cố định**: Nút Login (`min-w-[120px]`) và Sign up (`min-w-[140px]`) phải có chiều rộng tối thiểu để tránh làm nhảy vị trí các icon khác khi đổi ngôn ngữ.


* **Cuộn mượt mà (Smooth Scroll)**:
* Kích hoạt `scroll-behavior: smooth` trong CSS toàn cục.
* Các section mục tiêu phải có `scroll-mt-20` (khớp với chiều cao Navbar) để không bị che tiêu đề khi cuộn.


* **Back to Top**: Sử dụng nút bấm `fixed bottom-8 right-8 z-[60]` xuất hiện khi cuộn quá 300px.

---

## 5. Cấu trúc thư mục & Code Conventions

* **Tách Component**:
* Một file không vượt quá **150 dòng**. Nếu vượt quá, tách sub-components vào thư mục `features/` tương ứng.
* Logic nghiệp vụ phức tạp phải nằm trong **Custom Hooks**.


* **Styling**:
* Chỉ sử dụng **TailwindCSS** (Utility classes). Tuyệt đối **KHÔNG** tạo file `.css` lẻ.
* Các hiệu ứng Hover/Active: Phải có `transition-all` và `active:scale-95` cho mọi nút bấm.


* **Đặt tên & Ngôn ngữ**:
* Tên biến/hàm: Tiếng Anh.
* Comment giải thích logic & Thông báo lỗi (Error handling): **Tiếng Việt**.



---

## 6. Luồng xác thực (Authentication Flow)

* **JWT**: Lưu trữ trong `localStorage.getItem("jwt_token")`.
* **Điều hướng**: Sử dụng `Maps('/login', { state: { view: 'register' } })` để chuyển đổi giữa form Đăng nhập và Đăng ký từ Navbar.
* **LoginPage**: Phải khởi tạo `view` state từ `location.state?.view` để hiển thị đúng form khi người dùng nhấn nút từ Landing Page.

---

### ✅ Checklist khi tạo Component mới:

1. [ ] Đã có đủ `dark:` classes cho mọi yếu tố màu sắc chưa?
2. [ ] Đã áp dụng `fontClass` (Poppins/Sans) chưa?
3. [ ] Các nút bấm đã có `min-w` để chống giật layout khi đổi ngôn ngữ chưa?
4. [ ] Nếu là Section, đã có `id` và `scroll-mt-20` phục vụ Navbar chưa?
5. [ ] Code có ngắn gọn và dễ hiểu theo quy tắc "Keep It Simple" chưa?

---

*Bản hướng dẫn này là tiêu chuẩn bắt buộc cho mọi thành viên khi đóng góp code vào dự án QuizMate AI.*