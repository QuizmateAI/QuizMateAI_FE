import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './Pages/Route/protectedRoute';
import { ToastProvider } from '@/context/ToastContext';
import { NavigationLoadingProvider } from '@/context/NavigationLoadingContext';
import { UserProfileProvider } from '@/context/UserProfileContext';
import LoadingSpinner from '@/Components/ui/LoadingSpinner';
import './i18n';
import './App.css';

// ── Lazy-loaded route components (code splitting) ──
const LandingPage = lazy(() => import('./Pages/LandingPage/LandingPage'));
const LoginPage = lazy(() => import('./Pages/Authentication/LoginPage'));
const RegisterPage = lazy(() => import('./Pages/Authentication/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./Pages/Authentication/ForgotPasswordPage'));
const HomePage = lazy(() => import('./Pages/Users/Home/HomePage'));
const ProfilePage = lazy(() => import('./Pages/Users/Profile/ProfilePage'));
const PlanPage = lazy(() => import('./Pages/Users/Plan/PlanPage'));
const WalletPage = lazy(() => import('./Pages/Users/Credit/WalletPage'));
const WorkspacePage = lazy(() => import('./Pages/Users/Individual/Workspace/WorkspacePage'));
const GroupWorkspacePage = lazy(() => import('./Pages/Users/Group/GroupWorkspacePage'));
const GroupManagementPage = lazy(() => import('./Pages/Users/Group/Group_leader/GroupManagementPage'));

// Admin
const AdminLayout = lazy(() => import('./Pages/Admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./Pages/Admin/AdminDashboard'));
const UserManagement = lazy(() => import('./Pages/Admin/UserManagement'));
const GroupManagement = lazy(() => import('./Pages/Admin/GroupManagement'));
const PlanManagement = lazy(() => import('./Pages/Admin/PlanManagement'));
const CreditPackageManagement = lazy(() => import('./Pages/Admin/CreditPackageManagement'));

// Quiz
const PracticeQuizPage = lazy(() => import('./Pages/Users/Quiz/PracticeQuizPage'));
const ExamQuizPage = lazy(() => import('./Pages/Users/Quiz/ExamQuizPage'));
const QuizResultPage = lazy(() => import('./Pages/Users/Quiz/QuizResultPage'));

// Payment
const PaymentPage = lazy(() => import('./Pages/Payment/PaymentPage'));
const PaymentResultPage = lazy(() => import('./Pages/Payment/PaymentResultPage'));
const VnPayReturnRedirect = lazy(() => import('./Pages/Payment/VnPayReturnRedirect'));

// Super Admin
const SuperAdminLayout = lazy(() => import('./Pages/SuperAdmin/SuperAdminLayout'));
const SuperAdminDashboard = lazy(() => import('./Pages/SuperAdmin/SuperAdminDashboard'));
const AdminManagement = lazy(() => import('./Pages/SuperAdmin/AdminManagement'));
const UserDetailPage = lazy(() => import('./Pages/SuperAdmin/UserDetailPage'));
const GroupDetailPage = lazy(() => import('./Pages/SuperAdmin/GroupDetailPage'));

function App() {
  return (
    <ToastProvider>
    <Router>
      <NavigationLoadingProvider>
      <UserProfileProvider>
      <Suspense fallback={<LoadingSpinner />}>
      <Routes>

        {/* Route cho khách (Chưa đăng nhập) - Đã đăng nhập sẽ bị đẩy về Home
        page của role đó */}
        {/* VNPay return: nếu request trúng frontend thay vì backend thì redirect sang backend */}
        <Route path="/api/vnpay/return" element={<VnPayReturnRedirect />} />

        <Route element={<PublicRoute />}>
        <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Route cần đăng nhập (User) - Super Admin, Admin không được vào */}
        <Route element={<ProtectedRoute allowedRoles={['USER']} />}>
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/payment/result" element={<PaymentResultPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/workspace/:workspaceId" element={<WorkspacePage />} />
          <Route path="/workspace/:workspaceId/*" element={<WorkspacePage />} />
          <Route path="/group-workspace/:groupId" element={<GroupWorkspacePage />} />
          <Route path="/group-workspace/:groupId/*" element={<GroupWorkspacePage />} />
          <Route path="/group-manage/:groupId" element={<GroupManagementPage />} />
          <Route path="/quiz/practice/:quizId" element={<PracticeQuizPage />} />
          <Route path="/quiz/exam/:quizId" element={<ExamQuizPage />} />
          <Route path="/quiz/result/:attemptId" element={<QuizResultPage />} />
        </Route>

         {/* Route dành riêng cho Super Admin */}
         <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
          <Route path="/super-admin" element={<SuperAdminLayout />} >
            <Route index element={<SuperAdminDashboard />} />
            <Route path="admins" element={<AdminManagement />} />
            <Route path="users/:userId" element={<UserDetailPage />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="groups/:groupId" element={<GroupDetailPage />} />
            <Route path="groups" element={<GroupManagement />} />
              <Route path="plan" element={<PlanManagement />} />
            <Route path="credit" element={<CreditPackageManagement />} />
          </Route>
        </Route>

        {/* Route dành riêng cho Admin - Super Admin không được vào */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />} >
            <Route index element={<AdminDashboard />} />
            <Route path="users/:userId" element={<UserDetailPage />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="groups/:groupId" element={<GroupDetailPage />} />
            <Route path="groups" element={<GroupManagement />} />
              <Route path="plan" element={<PlanManagement />} />
            <Route path="credit" element={<CreditPackageManagement />} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
      </UserProfileProvider>
      </NavigationLoadingProvider>
    </Router>
    </ToastProvider>
  )
}

export default App
