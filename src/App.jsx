import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './Pages/Route/protectedRoute';
import { ToastProvider } from '@/context/ToastContext';
import './i18n';
import './App.css';

// ── Lazy-loaded route components (code splitting) ──
const LandingPage = lazy(() => import('./Pages/LandingPage/LandingPage'));
const LoginPage = lazy(() => import('./Pages/Authentication/LoginPage'));
const RegisterPage = lazy(() => import('./Pages/Authentication/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./Pages/Authentication/ForgotPasswordPage'));
const HomePage = lazy(() => import('./Pages/Users/Home/HomePage'));
const ProfilePage = lazy(() => import('./Pages/Users/Profile/ProfilePage'));
const WorkspacePage = lazy(() => import('./Pages/Users/Individual/Workspace/WorkspacePage'));
const GroupWorkspacePage = lazy(() => import('./Pages/Users/Group/GroupWorkspacePage'));
const GroupManagementPage = lazy(() => import('./Pages/Users/Group/Group_leader/GroupManagementPage'));

// Admin
const AdminLayout = lazy(() => import('./Pages/Admin/AdminLayout'));
const UserManagement = lazy(() => import('./Pages/Admin/UserManagement'));
const GroupManagement = lazy(() => import('./Pages/Admin/GroupManagement'));
const SubscriptionManagement = lazy(() => import('./Pages/Admin/SubscriptionManagement'));

// Payment
const PaymentPage = lazy(() => import('./Pages/Payment/PaymentPage'));
const PaymentResultPage = lazy(() => import('./Pages/Payment/PaymentResultPage'));

// Super Admin
const SuperAdminLayout = lazy(() => import('./Pages/SuperAdmin/SuperAdminLayout'));
const AdminManagement = lazy(() => import('./Pages/SuperAdmin/AdminManagement'));
const UserDetailPage = lazy(() => import('./Pages/SuperAdmin/UserDetailPage'));
const GroupDetailPage = lazy(() => import('./Pages/SuperAdmin/GroupDetailPage'));
const TopicManagement = lazy(() => import('./Pages/SuperAdmin/TopicManagement'));

// ── Loading fallback ──
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground font-medium">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <ToastProvider>
    <Router>
      <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* Route cho khách (Chưa đăng nhập) - Đã đăng nhập sẽ bị đẩy về Home
        page của role đó */}
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
          <Route path="/home" element={<HomePage />} />
          <Route path="/workspace/:workspaceId" element={<WorkspacePage />} />
          <Route path="/group-workspace/:groupId" element={<GroupWorkspacePage />} />
          <Route path="/group-manage/:groupId" element={<GroupManagementPage />} />
        </Route>

         {/* Route dành riêng cho Super Admin */}
         <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
          <Route path="/super-admin" element={<SuperAdminLayout />} >
            <Route index element={<UserManagement />} />
            <Route path="admins" element={<AdminManagement />} />
            <Route path="users/:userId" element={<UserDetailPage />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="groups/:groupId" element={<GroupDetailPage />} />
            <Route path="groups" element={<GroupManagement />} />
            <Route path="subscriptions" element={<SubscriptionManagement />} />
            <Route path="topics" element={<TopicManagement />} />
          </Route>
        </Route>

        {/* Route dành riêng cho Admin - Super Admin không được vào */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />} >
            <Route index element={<UserManagement />} />
            <Route path="users/:userId" element={<UserDetailPage />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="groups/:groupId" element={<GroupDetailPage />} />
            <Route path="groups" element={<GroupManagement />} />
            <Route path="subscriptions" element={<SubscriptionManagement />} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
    </Router>
    </ToastProvider>
  )
}

export default App
