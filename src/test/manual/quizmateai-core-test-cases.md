# QuizMate AI Core Test Cases

This document converts the provided test matrix into an execution checklist for QA/UAT.

## Scope
- Module 1: Authentication
- Module 2: Home and Individual Workspace
- Module 3: Group Workspace
- Module 4: Quiz Execution
- Module 5: Payment and Credit
- Module 6: Admin and SuperAdmin

## Environment
- FE app running with API environment configured
- Test users available: regular user, member, leader, admin, super admin
- At least 2 accounts online for websocket chat test
- Payment sandbox account available (VNPay/MoMo)

## Core Test Cases

### Authentication

#### TC_AUTH_01
- Module: Authentication
- Type: Functional
- Priority: High
- Preconditions: Valid account exists
- Steps:
1. Open Login page.
2. Enter valid username and password.
3. Submit login form.
- Expected Result: Redirect to /home (or role route), success notification appears, auth token is persisted.

#### TC_AUTH_02
- Module: Authentication
- Type: Negative
- Priority: High
- Preconditions: Account exists
- Steps:
1. Open Login page.
2. Enter invalid credentials.
3. Submit login form.
- Expected Result: Stay on login page and show error message.

#### TC_AUTH_03
- Module: Authentication
- Type: Functional
- Priority: High
- Preconditions: New email and username not used
- Steps:
1. Open Register page.
2. Fill valid required fields.
3. Submit form.
- Expected Result: Loading appears, OTP/register flow proceeds, success message appears.

#### TC_AUTH_04
- Module: Authentication
- Type: Validation
- Priority: High
- Preconditions: None
- Steps:
1. Open Register page.
2. Leave required fields empty or enter weak password.
3. Submit form.
- Expected Result: Form is blocked and field-level validation messages are shown.

#### TC_AUTH_05
- Module: Authentication
- Type: Functional
- Priority: Medium
- Preconditions: Registered email exists
- Steps:
1. Open Forgot Password page.
2. Enter registered email.
3. Submit request.
- Expected Result: Reset/OTP request is sent and success message appears.

### Home And Individual Workspace

#### TC_IND_01
- Module: Individual Workspace
- Type: Functional
- Priority: High
- Preconditions: Logged in user
- Steps:
1. Open Home.
2. Open CreateWorkspaceDialog.
3. Enter name, description, and topic.
4. Create workspace.
- Expected Result: New workspace appears without full page reload.

#### TC_IND_02
- Module: Individual Workspace
- Type: Functional
- Priority: High
- Preconditions: Workspace exists
- Steps:
1. Open SourcesPanel.
2. Open UploadSourceDialog.
3. Upload valid PDF or DOCX.
- Expected Result: Upload progress is shown and source appears in list after completion.

#### TC_IND_03
- Module: Individual Workspace
- Type: Functional
- Priority: High
- Preconditions: Source uploaded
- Steps:
1. Open CreateQuizForm.
2. Select source, question count, and difficulty.
3. Create quiz.
- Expected Result: AI API is called, loading is shown, generated quiz list is displayed.

#### TC_IND_04
- Module: Individual Workspace
- Type: UI Behavior
- Priority: Medium
- Preconditions: Flashcard set exists
- Steps:
1. Open Flashcard list.
2. Open one flashcard set.
3. Click card to flip.
- Expected Result: Flip animation works and back content is correct.

### Group Workspace

#### TC_GRP_01
- Module: Group Workspace
- Type: Functional
- Priority: High
- Preconditions: Logged in user
- Steps:
1. Open Home.
2. Open CreateGroupDialog.
3. Fill group information.
4. Create group.
- Expected Result: User becomes group leader and enters group workspace.

#### TC_GRP_02
- Module: Group Workspace
- Type: Functional
- Priority: High
- Preconditions: Group leader account
- Steps:
1. Open GroupMembersTab.
2. Open InviteMemberDialog.
3. Enter email and send invite.
- Expected Result: Success notice appears and member list shows pending status.

#### TC_GRP_03
- Module: Group Workspace
- Type: Realtime
- Priority: High
- Preconditions: Two accounts online in the same group
- Steps:
1. Account 1 sends message in ChatPanel.
2. Account 2 observes chat in real time.
- Expected Result: Message appears on both screens without refresh.

#### TC_GRP_04
- Module: Group Workspace
- Type: Authorization
- Priority: High
- Preconditions: Member role account
- Steps:
1. Login as member.
2. Open group workspace.
3. Try deleting source or quiz.
- Expected Result: Delete action is hidden/disabled, forced API call returns 403.

### Quiz Execution

#### TC_QZ_01
- Module: Quiz Execution
- Type: Functional
- Priority: High
- Preconditions: Quiz available
- Steps:
1. Open PracticeQuizPage.
2. Choose answer.
3. Click check.
- Expected Result: Immediate correct/incorrect feedback and explanation (if any).

#### TC_QZ_02
- Module: Quiz Execution
- Type: Functional
- Priority: High
- Preconditions: Exam quiz available
- Steps:
1. Open ExamQuizPage.
2. Choose answer.
3. Move via QuestionNavPanel.
- Expected Result: No immediate correctness feedback, answered state marked, timer runs.

#### TC_QZ_03
- Module: Quiz Execution
- Type: Resilience
- Priority: High
- Preconditions: Exam in progress with selected answers
- Steps:
1. Select some answers.
2. Refresh or close tab.
3. Re-open the same exam.
- Expected Result: Auto-save restores answers and timer continuation.

#### TC_QZ_04
- Module: Quiz Execution
- Type: Functional
- Priority: High
- Preconditions: Exam completed
- Steps:
1. Submit exam.
2. Confirm submit in dialog.
- Expected Result: Redirect to result page with score, total time, and accuracy.

### Payment And Credit

#### TC_PAY_01
- Module: Payment and Credit
- Type: Functional
- Priority: High
- Preconditions: Logged in user
- Steps:
1. Open Plan page or Subscription tab.
- Expected Result: Free/Pro/Premium plans display correct pricing and benefits.

#### TC_PAY_02
- Module: Payment and Credit
- Type: Integration
- Priority: High
- Preconditions: Upgrade option available
- Steps:
1. Select upgrade plan.
2. Choose VNPay.
3. Proceed to payment.
- Expected Result: Redirect to sandbox payment gateway with correct order amount.

#### TC_PAY_03
- Module: Payment and Credit
- Type: Integration
- Priority: High
- Preconditions: Payment session started
- Steps:
1. Complete or cancel payment in gateway.
2. Return to app.
- Expected Result: PaymentResult page reflects status and wallet/plan updates on success.

### Admin And SuperAdmin

#### TC_SADM_01
- Module: Admin and SuperAdmin
- Type: Security
- Priority: High
- Preconditions: Normal user account
- Steps:
1. Enter /superadmin/dashboard directly.
- Expected Result: Route guard redirects to /home or /403.

#### TC_SADM_02
- Module: Admin and SuperAdmin
- Type: Functional
- Priority: High
- Preconditions: Super admin account
- Steps:
1. Open user management.
2. Ban one user.
- Expected Result: User becomes inactive and cannot continue/restart session.

## Suggested Automation Coverage
- Automate first: TC_AUTH_01 to TC_AUTH_05, TC_SADM_01, TC_QZ_03, TC_GRP_04
- Automate with API mocking: TC_IND_03, TC_PAY_03
- Keep manual/exploratory: animation quality and payment gateway visual checks

## Role-based Navigation Test Cases

#### TC_NAV_ROLE_01
- Scenario: User tries to access SuperAdmin dashboard
- Preconditions: Logged in as USER
- Steps:
1. Enter URL /superadmin/dashboard directly.
- Expected Result: Redirect to /home or /403. Protected page is not rendered.

#### TC_NAV_ROLE_02
- Scenario: User tries to access Admin dashboard
- Preconditions: Logged in as USER
- Steps:
1. Enter URL /admin/dashboard directly.
- Expected Result: Redirect to /home or /403. Protected page is not rendered.

#### TC_NAV_ROLE_03
- Scenario: Admin tries to access SuperAdmin pages
- Preconditions: Logged in as ADMIN
- Steps:
1. Open /superadmin/dashboard.
2. Open /superadmin/users.
- Expected Result: Redirect to admin-allowed route or /403. No SuperAdmin data loaded.

#### TC_NAV_ROLE_04
- Scenario: Member tries Group Leader-only screen
- Preconditions: Logged in as GROUP_MEMBER
- Steps:
1. Open leader-only route in group workspace.
- Expected Result: Member is blocked by UI guard and server returns 403 if API call is forced.

#### TC_NAV_ROLE_05
- Scenario: Unauthenticated user opens protected route
- Preconditions: No token in storage
- Steps:
1. Enter /home.
2. Enter /admin/dashboard.
3. Enter /superadmin/dashboard.
- Expected Result: Redirect to /login and protected content is never shown.

#### TC_NAV_ROLE_06
- Scenario: Expired token while navigating protected route
- Preconditions: Logged in but token expired/invalid
- Steps:
1. Refresh page at protected route.
- Expected Result: Session is cleared, user is redirected to /login, and auth-expired message is shown if implemented.

#### TC_NAV_ROLE_07
- Scenario: Tampered localStorage role escalation
- Preconditions: Logged in as USER, manually change localStorage role to SUPER_ADMIN
- Steps:
1. Refresh app.
2. Open /superadmin/dashboard.
- Expected Result: Front-end guard plus backend authorization deny access. Sensitive endpoint returns 401/403.

#### TC_NAV_ROLE_08
- Scenario: Browser back to unauthorized page after logout
- Preconditions: User logged out from protected page
- Steps:
1. Click browser Back.
- Expected Result: App blocks protected content and routes to /login or public page.

#### TC_NAV_ROLE_09
- Scenario: Deep-link to nested unauthorized route
- Preconditions: Logged in as USER
- Steps:
1. Open nested admin route, for example /admin/users/123/details.
- Expected Result: Redirect/fallback works for nested routes, not only top-level routes.

#### TC_NAV_ROLE_10
- Scenario: Unknown role from backend login payload
- Preconditions: Mock role not in known role list
- Steps:
1. Login and navigate.
- Expected Result: App uses safe default route, no crash, and no privileged page access.

## Notes For Automation
- Best first candidates: TC_NAV_ROLE_01, TC_NAV_ROLE_02, TC_NAV_ROLE_05, TC_NAV_ROLE_07, TC_NAV_ROLE_09.
- For automation, mock router location and auth state separately to validate both guard logic and redirect target.
- Assert both UI result and side effects: blocked component tree, redirect URL, and API 401/403 behavior.

## Admin And SuperAdmin Friendly Error Toast Test Cases

#### TC_ADMIN_TOAST_01
- Type: Function/UI
- Description: Admin Subscription hiển thị lỗi BE đã map thân thiện
- Preconditions: Đăng nhập ADMIN, vào Subscription Management
- Steps:
1. Trigger API lỗi khi tải danh sách gói.
2. Quan sát toast lỗi.
- Expected Result: Toast hiển thị message thân thiện theo mapping i18n/getErrorMessage, không hiển thị raw BE message khó hiểu.

#### TC_ADMIN_TOAST_02
- Type: Function/UI
- Description: Admin Subscription fallback đúng khi không có mapping
- Preconditions: Đăng nhập ADMIN
- Steps:
1. Trigger một lỗi BE không có code mapping.
2. Quan sát toast lỗi.
- Expected Result: Toast hiển thị fallback hợp lý theo key của màn (ví dụ subscription.fetchError/subscription.submitError), không bị rỗng.

#### TC_SADMIN_TOAST_01
- Type: Function/UI
- Description: SuperAdmin AdminManagement hiển thị lỗi thân thiện khi tạo admin thất bại
- Preconditions: Đăng nhập SUPER_ADMIN, vào Admin Management
- Steps:
1. Submit form tạo admin với dữ liệu gây lỗi BE.
2. Quan sát toast lỗi.
- Expected Result: Toast hiển thị message thân thiện theo mapping hoặc fallback key adminManagement.form.error.

#### TC_SADMIN_TOAST_02
- Type: Function/UI
- Description: SuperAdmin TopicManagement hiển thị lỗi thân thiện khi tạo topic/field thất bại
- Preconditions: Đăng nhập SUPER_ADMIN, vào Topic Management
- Steps:
1. Tạo topic hoặc field để BE trả lỗi.
2. Quan sát toast lỗi.
- Expected Result: Toast hiển thị message dễ hiểu theo mapping/fallback key topicManagement.topicCreateError hoặc topicManagement.fieldCreateError.

#### TC_SADMIN_TOAST_03
- Type: Function/UI
- Description: SuperAdmin RBAC hiển thị lỗi thân thiện khi sync quyền thất bại
- Preconditions: Đăng nhập SUPER_ADMIN, vào RBAC Management
- Steps:
1. Thực hiện sync permissions gây lỗi.
2. Quan sát toast lỗi.
- Expected Result: Toast hiển thị message thân thiện theo mapping/fallback key rbac.syncError.

#### TC_SADMIN_TOAST_04
- Type: Regression
- Description: Không làm mất hành vi toast thành công ở Admin/SuperAdmin
- Preconditions: Có thao tác thành công ở các màn quản trị
- Steps:
1. Thực hiện một thao tác thành công (create/update/sync).
2. Quan sát toast.
- Expected Result: Toast success vẫn hiển thị bình thường, chỉ thay đổi luồng lỗi BE sang message thân thiện.

## Toast Test Cases

#### TC_TOAST_01
- Type: UI/Function
- Description: Hiển thị Toast thành công (Success)
- Steps:
1. Thực hiện tác vụ thành công, ví dụ tạo workspace hoặc đăng nhập đúng.
2. Quan sát màn hình.
- Expected Result: Hiển thị Toast success với style thành công và nội dung đúng theo tác vụ.

#### TC_TOAST_02
- Type: UI/Function
- Description: Hiển thị Toast lỗi (Error)
- Steps:
1. Thực hiện tác vụ thất bại, ví dụ sai mật khẩu hoặc lỗi API.
2. Quan sát màn hình.
- Expected Result: Hiển thị Toast error với style lỗi và thông báo map đúng theo logic getErrorMessage khi luồng gọi có dùng util này.

#### TC_TOAST_03
- Type: UI/Function
- Description: Hiển thị Toast cảnh báo hoặc thông tin (Warning/Info)
- Steps:
1. Kích hoạt trạng thái warning hoặc info, ví dụ hết hạn phiên hoặc chuẩn bị redirect.
- Expected Result: Hiển thị Toast warning/info với màu và icon tương ứng.

#### TC_TOAST_04
- Type: Function
- Description: Tự động đóng (Auto-dismiss / Timeout)
- Steps:
1. Kích hoạt một Toast bất kỳ.
2. Không thao tác thêm và chờ hết timeout.
- Expected Result: Toast tự biến mất sau đúng thời gian cấu hình trong ToastContext.

#### TC_TOAST_05
- Type: Function
- Description: Đóng thủ công (Manual Close)
- Steps:
1. Kích hoạt một Toast.
2. Click nút đóng X trên Toast.
- Expected Result: Toast đóng ngay, không cần chờ timeout.

#### TC_TOAST_06
- Type: Edge Case
- Description: Hiển thị nhiều Toast cùng lúc (Stacking/Queue)
- Steps:
1. Kích hoạt liên tiếp 3-4 Toast trong thời gian ngắn.
- Expected Result: Toast xếp chồng theo thứ tự, không đè nội dung.

#### TC_TOAST_07
- Type: UI/Z-index
- Description: Toast hiển thị đè lên Dialog/Modal
- Steps:
1. Mở Dialog hoặc Modal.
2. Trigger Toast từ trong Dialog.
- Expected Result: Toast nằm trên cùng, không bị backdrop hoặc modal che khuất.

#### TC_TOAST_08
- Type: Edge Case
- Description: Giữ Toast khi hover (Pause on Hover)
- Steps:
1. Kích hoạt Toast.
2. Hover vào Toast và giữ chuột.
3. Rời chuột khỏi Toast.
- Expected Result: Khi hover thì dừng countdown, khi rời chuột thì tiếp tục countdown.

#### TC_TOAST_09
- Type: Responsive
- Description: Hiển thị Toast trên mobile
- Steps:
1. Mở app ở viewport mobile nhỏ hơn 768px.
2. Kích hoạt Toast.
- Expected Result: Toast không tràn màn hình, text hiển thị hợp lý trên mobile.

#### TC_TOAST_10
- Type: Unmount
- Description: Toast không gây memory leak khi chuyển trang nhanh
- Steps:
1. Trigger Toast.
2. Chuyển trang ngay sau khi trigger.
- Expected Result: Toast hiển thị đúng hoặc cleanup đúng, không có warning state update on unmounted component.
