# Public And Authentication Specifications

## PUB-01 Launching Page

Function Trigger:
- Application Trigger: The app enters launch mode when `VITE_LAUNCH_MODE=true`.
- Global Guard Trigger: When launch mode is enabled, almost all frontend routes render the launch screen instead of the normal route tree.

Function Description:
- Actor: Guest, USER, ADMIN, SUPER_ADMIN.
- Purpose: To temporarily gate the product before launch and present a branded waiting screen.
- Interface: A dedicated launch page that replaces the standard application routes.
- Data Processing:
  - Configuration Read: Reads `brandName`, `launchDate`, `supportEmail`, and `earlyAccessUrl` from `launchConfig`.
  - Route Handling: Uses `LaunchRoutes` instead of `MainRoutes`.

Screen Layout:
- Brand and launch identity block.
- Launch countdown or availability message.
- Optional support or early-access call-to-action.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `launchDate`: The configured launch timestamp used to determine launch messaging.<br>• `supportEmail`: Optional contact email shown for support or early access.<br>• `earlyAccessUrl`: Optional CTA target for waitlist or early access.<br>• `brandName`: The product name shown on the launch screen. |
| 2 | Validation Rules | • The launch date must be parseable as a valid date object.<br>• Missing or malformed launch environment values fall back to default values defined in `launchConfig.js`. |
| 3 | Business Rules | • Launch mode overrides the standard route tree for all users.<br>• `/api/vnpay/return` remains separately handled even in launch mode.<br>• This screen is a platform-level gate, not a normal feature page. |
| 4 | Normal Case | • A user opens the application while launch mode is active.<br>• The app renders `LaunchingPage`.<br>• The user sees launch status, branding, and any configured CTA. |
| 5 | Abnormal Cases | • Environment variables are missing or malformed.<br>• The page still renders using default configuration values instead of breaking the app. |
Source of Truth:
- Route Gate: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:225)
- Page: [LaunchingPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/LaunchingPage/LaunchingPage.jsx)
- Config: [launchConfig.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/lib/launchConfig.js:1)

## AUTH-01 Login

Function Trigger:
- Route Trigger: A guest user navigates to `/login`.
- UI Trigger: The user clicks a login action from a public page such as the landing page.
- Guard Trigger: `PublicRoute` prevents already-authenticated users from staying on the login screen.

Function Description:
- Actor: Guest.
- Purpose: To authenticate the user and route them into the correct product area based on role.
- Interface: A two-column authentication page with a standard login form, Google login entry point, dark mode toggle, language switch, and links to registration and password recovery.
- Data Processing:
  - Credential Login: `login({ username, password })`
  - Google Login: `googleLogin(idToken)`
  - Local Persistence: Stores `accessToken`, `refreshToken`, and `user` in local storage on success.

Screen Layout:
- Header:
  - Logo
  - Theme toggle
  - Language toggle
- Left Column:
  - Username field
  - Password field
  - Remember-me checkbox
  - Forgot-password link
  - Submit button
  - Register CTA
  - Google login section
- Right Column:
  - Authentication illustration

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `username`: Required login identifier. The UI labels it clearly as Username.<br>• `password`: Required password input with show/hide password support.<br>• `rememberMe`: A visible UI checkbox for login preference handling.<br>• `idToken`: Google-issued token passed to the Google authentication flow. |
| 2 | Validation Rules | • `username` is required before form submission.<br>• `password` is required before form submission.<br>• Field-level validation messages are displayed directly under the related input.<br>• Submit remains blocked when required fields are missing. |
| 3 | Business Rules | • Successful login persists auth state in local storage.<br>• Successful login also updates cached user and subscription context for faster navigation.<br>• Role-based redirect rules apply after login:<br>• `SUPER_ADMIN -> /super-admin`<br>• `ADMIN -> /admin`<br>• `USER -> /home` or the stored return path when present<br>• Google login follows the same redirect rules as credential login. |
| 4 | Normal Case | • The guest opens `/login`.<br>• The user enters a valid username and password.<br>• The app submits the login request.<br>• The backend returns a successful response with tokens and user metadata.<br>• The app stores auth data and redirects the user to the correct area. |
| 5 | Abnormal Cases | • Invalid username or password.<br>• Network or server timeout.<br>• Google login failure.<br>• The user is already authenticated and is redirected away by the public-route guard. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:91)
- Page: [LoginPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Authentication/LoginPage.jsx:1)
- Logic: [Login.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Authentication/Login.js)
- API: [Authentication.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/Authentication.js:1)

## AUTH-02 Register

Function Trigger:
- UI Trigger: The user clicks the sign-up action from the login screen.
- View Transition: The page switches from `login` mode to `register` mode inside the same authentication shell.

Function Description:
- Actor: Guest.
- Purpose: To create a new account using a registration form followed by email OTP verification.
- Interface: The same two-column authentication page layout, but the left panel switches into a two-step registration flow.
- Data Processing:
  - Availability Check: `checkUsername`, `checkEmail`
  - OTP Send: `sendOTP(email)`
  - OTP Verify: `verifyOTP(email, otp)`
  - Registration Submit: `register(userData)`

Screen Layout:
- Step 1 - Registration Form:
  - Full name
  - Username
  - Email
  - Password
  - Confirm password
  - Terms checkbox
- Step 2 - OTP Verification:
  - OTP field
  - Verify action
  - Resend OTP action

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `fullname`: The user’s display name for account creation.<br>• `username`: The unique account username used for login.<br>• `email`: The email used for verification and account ownership.<br>• `password`: The chosen account password.<br>• `confirmPassword`: Confirmation field that must match the password.<br>• `agreeToTerms`: UI-level agreement checkbox.<br>• `otp`: The one-time password used to complete email verification. |
| 2 | Validation Rules | • `fullname` is required.<br>• `username` must satisfy frontend and backend format rules.<br>• `email` must pass the shared email validation utility.<br>• `password` must be at least 8 characters and include both letters and numbers.<br>• `confirmPassword` must exactly match `password`.<br>• `otp` is required during the verification step. |
| 3 | Business Rules | • Username and email availability are checked before final registration.<br>• OTP verification is mandatory before the registration flow is completed.<br>• The view can move backward from the OTP step to the registration form without leaving the auth shell.<br>• Success and error banners remain visible within the same page experience. |
| 4 | Normal Case | • The user opens the register view.<br>• The user fills in valid account information.<br>• The app validates the form and sends the OTP.<br>• The user enters the correct OTP.<br>• The app completes account creation and returns the user to the login experience. |
| 5 | Abnormal Cases | • Username already exists.<br>• Email already exists.<br>• OTP is invalid or expired.<br>• Validation fails before submission.<br>• Network or server failure interrupts registration. |
Source of Truth:
- Page: [LoginPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Authentication/LoginPage.jsx:359)
- Logic: [Register.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Authentication/Register.js)
- API: [Authentication.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/Authentication.js:1)

## AUTH-03 Forgot Password Inline Flow

Function Trigger:
- UI Trigger: The user clicks the `Forgot Password?` link on the login view.
- View Transition: `LoginPage` changes from `login` mode to `forgot-password` mode without leaving the page.
- Flow Sequence: `Enter Email -> Verify OTP -> Set New Password`.

Function Description:
- Actor: Guest (Unauthenticated user).
- Purpose: To let a user recover account access through email-based OTP verification and password reset.
- Interface: Re-uses the same two-column login layout. The login form is replaced by three sequential recovery steps with a progress indicator.
- Data Processing:
  - Email Check: `GET /auth/check-email?email=...`
  - OTP Send: `POST /auth/send-otp?email=...`
  - OTP Verify: `POST /auth/verify-otp?email=...&otp=...`
  - Password Reset: `POST /auth/reset-password?email=...&newPassword=...`

Screen Layout:
- Shared Elements:
  - Back-to-login action
  - Error banner
  - Success banner
  - Step progress indicator
- Step 1 - Enter Email:
  - Email field
  - Send OTP button
- Step 2 - Verify OTP:
  - OTP field
  - Verify OTP button
  - Resend OTP action
- Step 3 - New Password:
  - New password field
  - Confirm new password field
  - Reset password button

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `email`: The recovery email entered in Step 1.<br>• `otp`: The 6-digit or backend-validated OTP entered in Step 2.<br>• `newPassword`: The new password entered in Step 3.<br>• `confirmNewPassword`: The confirmation field that must match `newPassword`.<br>• `forgotPasswordStep`: Internal state that determines which view is currently rendered.<br>• `error`: A shared error message shown across all recovery steps.<br>• `successMessage`: A shared success message used after OTP send, OTP verify, and password reset. |
| 2 | Validation Rules | • `email` is required and must pass the shared email validation rules.<br>• `email` must correspond to an existing registered account before the flow moves to the OTP step.<br>• `otp` is required before OTP verification can be submitted.<br>• `newPassword` must be at least 8 characters long.<br>• `newPassword` must contain at least one letter and at least one digit.<br>• `confirmNewPassword` must exactly match `newPassword`. |
| 3 | Business Rules | • The flow is strictly sequential. The UI only advances when the server confirms success for the current step.<br>• The email is trimmed before submission to reduce formatting issues.<br>• The user can go back to the email step from the OTP step to resend a verification code.<br>• Success after password reset returns the user to the login view after a short delay.<br>• Error handling remains in the same page context instead of navigating to a dedicated error page. |
| 4 | Normal Case | • The user clicks `Forgot Password?`.<br>• The user enters a valid registered email.<br>• The app checks whether the email exists and sends the OTP.<br>• The user enters a valid OTP.<br>• The app verifies the OTP and advances to the password step.<br>• The user enters a valid new password and confirmation.<br>• The app resets the password and returns the user to the login view. |
| 5 | Abnormal Cases | • The email does not belong to any existing account.<br>• The OTP is invalid or expired.<br>• The new password is too weak.<br>• The password confirmation does not match.<br>• The OTP or reset request fails due to network or backend issues. |
Source of Truth:
- Page: [LoginPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Authentication/LoginPage.jsx:218)
- Logic Hook: [ForgotPassword.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Authentication/ForgotPassword.js:1)
- API: [Authentication.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/api/Authentication.js:95)

## AUTH-04 Forgot Password Standalone Page

Function Trigger:
- Route Trigger: A guest navigates directly to `/forgot-password`.
- External Trigger: The route can be opened from a direct URL or deep link outside the inline auth shell.

Function Description:
- Actor: Guest.
- Purpose: To support a standalone password recovery page outside the inline login/register view-switching flow.
- Interface: A two-column page with a single email submission form, success and error messages, and a timed redirect back to login.
- Data Processing:
  - Client Validation: `validateForgotPasswordForm(email)`
  - Request Submit: `submitForgotPasswordRequest(email)`

Screen Layout:
- Header:
  - Logo
  - Language toggle
- Left Column:
  - Back-to-login action
  - Title and helper text
  - Email field
  - Submit button
  - Success and error banners
- Right Column:
  - Authentication illustration

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `email`: The email used to request password recovery.<br>• `errors`: Field-level validation object for the email input.<br>• `isLoading`: Submission state used to disable actions and show processing status.<br>• `successMessage`: Success response shown after a valid request.<br>• `errorMessage`: Failure message shown when the request fails. |
| 2 | Validation Rules | • `email` is required.<br>• `email` must pass the shared forgot-password email validator.<br>• Validation runs before the request is sent. |
| 3 | Business Rules | • On success, the page clears the email input and shows a success message.<br>• After success, the page redirects the user to `/login` after approximately 2 seconds.<br>• This flow is simpler than the inline three-step recovery flow and behaves as a standalone route page. |
| 4 | Normal Case | • The user opens `/forgot-password`.<br>• The user enters a valid email.<br>• The app validates the field and submits the request.<br>• The page shows a success message.<br>• The app returns the user to the login route. |
| 5 | Abnormal Cases | • The email is empty or malformed.<br>• The submission fails due to network or backend error.<br>• The page remains in place and shows an error message instead of redirecting. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:93)
- Page: [ForgotPasswordPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Authentication/ForgotPasswordPage.jsx:1)
- Helper: [ForgotPassword.js](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Authentication/ForgotPassword.js:199)

## PUB-02 Landing Page

Function Trigger:
- Route Trigger: A guest opens `/`.

Function Description:
- Actor: Guest.
- Purpose: To introduce the product and direct visitors toward authentication or pricing flows.
- Interface: A marketing landing page with multiple branded sections and CTA navigation.
- Data Processing:
  - Primarily client-side presentation and navigation actions.

Screen Layout:
- Navigation bar.
- Hero section.
- Features section.
- Testimonials section.
- Pricing section.
- Footer section.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Marketing copy.<br>• Feature cards.<br>• Testimonial content.<br>• CTA labels and route targets. |
| 2 | Validation Rules | • There are no critical form-validation requirements at the page level. |
| 3 | Business Rules | • Landing CTA buttons should route guests to login, register, or pricing.<br>• The page should remain accessible only as a public page for non-authenticated entry. |
| 4 | Normal Case | • The guest opens the landing page.<br>• The guest reads product messaging and scans available sections.<br>• The guest clicks a CTA and moves into the auth or pricing journey. |
| 5 | Abnormal Cases | • Asset or media content loads slowly or fails.<br>• The page should still allow primary CTA navigation even when decorative elements fail. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:90)
- Page: [LandingPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/LandingPage/LandingPage.jsx)

## PUB-03 Pricing Guide

Function Trigger:
- Route Trigger: A guest or authenticated user opens `/pricing`.

Function Description:
- Actor: Guest, USER.
- Purpose: To present pricing information in a public-facing context that is separate from the authenticated `/plans` page.
- Interface: A marketing-oriented pricing page.
- Data Processing:
  - Primarily presentation and CTA navigation.

Screen Layout:
- Pricing comparison content.
- Call-to-action buttons.
- Supporting plan or feature explanations.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • Public pricing content.<br>• Plan summaries.<br>• CTA routes. |
| 2 | Validation Rules | • This page does not rely on complex form validation. |
| 3 | Business Rules | • This page is public-facing and is not the same as the internal plan-management experience at `/plans`.<br>• CTA actions may lead guests into authentication before purchase. |
| 4 | Normal Case | • The user opens `/pricing`.<br>• The user reviews plan differences.<br>• The user proceeds to authentication or the next purchase-related action. |
| 5 | Abnormal Cases | • Decorative or non-critical content fails to load.<br>• Primary navigation must remain available. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:87)
- Page: [PricingGuidePage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Pricing/PricingGuidePage.jsx)

## PUB-04 Accept Invitation

Function Trigger:
- Route Trigger: The user opens `/accept-invite` with an invitation token.
- Email Trigger: The invitation link is opened from an email message.

Function Description:
- Actor: Guest or authenticated USER.
- Purpose: To preview and accept a group invitation and move the user into the appropriate group workspace.
- Interface: An invitation confirmation page that adapts to login state, token validity, and account-match conditions.
- Data Processing:
  - Invitation Preview: Loads invitation metadata from the token.
  - Invitation Accept: Accepts the invitation and resolves the target group workspace.
  - Redirect: Navigates to `/group-workspaces/:workspaceId?welcome=1` on success.

Screen Layout:
- Invitation summary card.
- Account-state guidance block.
- Accept action.
- Login/Register/Switch-account guidance.
- Invalid or expired invitation state.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `token`: The invitation token from the query string.<br>• Invitation metadata such as workspace name, invitee email, and invitation status.<br>• Current user account state when already logged in. |
| 2 | Validation Rules | • A valid token is required to preview or accept the invitation.<br>• Account state must align with invitation ownership rules before final acceptance. |
| 3 | Business Rules | • If the current authenticated account does not match the invited account, the screen must prompt account switching.<br>• If the invitation is already accepted or expired, the UI must show the corresponding state instead of a normal accept flow.<br>• On success, the user is redirected directly into the target group workspace. |
| 4 | Normal Case | • The user opens a valid invitation link.<br>• The page loads the invitation summary.<br>• The user signs in if necessary.<br>• The user accepts the invitation.<br>• The app redirects to the linked group workspace. |
| 5 | Abnormal Cases | • Missing token.<br>• Invalid token.<br>• Expired invitation.<br>• Invitation already used.<br>• Logged-in account mismatch. |
Source of Truth:
- Route: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:86)
- Page: [AcceptInvitationPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/AcceptInvitationPage.jsx:1)

## PUB-05 Route Guards And Legacy Redirect Behavior

Function Trigger:
- Navigation Trigger: Any route access may pass through `PublicRoute`, `ProtectedRoute`, or a legacy-path redirect.

Function Description:
- Actor: Guest, USER, ADMIN, SUPER_ADMIN.
- Purpose: To enforce access control, redirect users by role, and map old routes to current routes.
- Interface: No dedicated UI screen. This is a navigation-control function that affects which screen appears next.
- Data Processing:
  - Reads auth token and stored user metadata.
  - Validates allowed roles.
  - Resolves destination redirects.

Screen Layout:
- No standalone visual layout.
- This functionality should be documented as route behavior rather than page UI.

Function Details:

| # | Item | Detail |
| --- | --- | --- |
| 1 | Data Fields | • `allowedRoles`: The permitted role list for protected routes.<br>• `accessToken`: The stored auth token used to determine sign-in state.<br>• `user`: The stored local user metadata used to determine role.<br>• `to`: The redirect target for legacy path redirects. |
| 2 | Validation Rules | • A protected route requires a valid authenticated session.<br>• The resolved user role must be included in the allowed role list for the route. |
| 3 | Business Rules | • Public pages redirect authenticated users away based on role.<br>• Protected pages redirect unauthenticated users to `/login`.<br>• Legacy routes are normalized, for example:<br>• `/payment -> /payments`<br>• `/payment/credits -> /payments/credits`<br>• `/payment/result -> /payments/results`<br>• `/plan -> /plans`<br>• Home tab shortcuts redirect:<br>• `/workspaces -> /home?tab=workspace`<br>• `/group-workspaces -> /home?tab=group`<br>• Group management backward-compatibility redirect:<br>• `/groups/:workspaceId/manage -> /group-workspaces/:workspaceId?section=dashboard` |
| 4 | Normal Case | • A user opens a valid route with the correct auth state.<br>• The guard permits access or applies the expected redirect.<br>• The destination page loads normally. |
| 5 | Abnormal Cases | • Missing token.<br>• Wrong role for the target route.<br>• Authenticated user attempting to access public auth pages.<br>• User opening an outdated legacy path. |
Source of Truth:
- Router: [App.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/App.jsx:78)
- Guards: [protectedRoute.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Route/protectedRoute.jsx)
- Redirect Helper: [HomeTabRedirect.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Route/HomeTabRedirect.jsx)
- Legacy Redirect Page: [GroupManagementPage.jsx](/C:/Learning/SEP490/Proj/QuizMateAI_FE/src/Pages/Users/Group/Group_leader/GroupManagementPage.jsx)
