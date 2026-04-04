import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './Pages/Route/protectedRoute';
import { ToastProvider } from '@/context/ToastContext';
import { NavigationLoadingProvider } from '@/context/NavigationLoadingContext';
import { UserProfileProvider } from '@/context/UserProfileContext';
import LoadingSpinner from '@/Components/ui/LoadingSpinner';
import RouteMetaManager from '@/Components/seo/RouteMetaManager';
import { launchConfig } from '@/lib/launchConfig';
import { loadGroupWorkspacePage, loadWorkspacePage } from '@/lib/routeLoaders';
import PlanUpgradeModal from '@/Components/plan/PlanUpgradeModal';
import './i18n';
import './App.css';

// ── Lazy-loaded route components (code splitting) ──
const LaunchingPage = lazy(() => import('./Pages/LaunchingPage/LaunchingPage'));
const LandingPage = lazy(() => import('./Pages/LandingPage/LandingPage'));
const PricingGuidePage = lazy(() => import('./Pages/Pricing/PricingGuidePage'));
const LoginPage = lazy(() => import('./Pages/Authentication/LoginPage'));
const RegisterPage = lazy(() => import('./Pages/Authentication/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./Pages/Authentication/ForgotPasswordPage'));
const HomePage = lazy(() => import('./Pages/Users/Home/HomePage'));
const ProfilePage = lazy(() => import('./Pages/Users/Profile/ProfilePage'));
const PlanPage = lazy(() => import('./Pages/Users/Plan/PlanPage'));
const WalletPage = lazy(() => import('./Pages/Users/Credit/WalletPage'));
const WorkspacePage = lazy(loadWorkspacePage);
const GroupWorkspacePage = lazy(loadGroupWorkspacePage);
const GroupManagementPage = lazy(() => import('./Pages/Users/Group/Group_leader/GroupManagementPage'));
const AcceptInvitationPage = lazy(() => import('./Pages/Users/Group/AcceptInvitationPage'));

// Admin
const AdminLayout = lazy(() => import('./Pages/Admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./Pages/Admin/AdminDashboard'));
const UserManagement = lazy(() => import('./Pages/Admin/UserManagement'));
const GroupManagement = lazy(() => import('./Pages/Admin/GroupManagement'));
const PlanManagement = lazy(() => import('./Pages/Admin/PlanManagement'));
const CreditPackageManagement = lazy(() => import('./Pages/Admin/CreditPackageManagement'));
const AdminPaymentManagement = lazy(() => import('./Pages/Admin/AdminPaymentManagement'));
const SystemSettingManagement = lazy(() => import('./Pages/Admin/SystemSettingManagement'));
const AiActionPolicyManagement = lazy(() => import('./Pages/Admin/AiActionPolicyManagement'));

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
const RbacManagement = lazy(() => import('./Pages/SuperAdmin/RbacManagement'));
const AiAuditManagement = lazy(() => import('./Pages/SuperAdmin/AiAuditManagement'));
const AiProvidersOverview = lazy(() => import('./Pages/SuperAdmin/AiProvidersOverview'));
const AiModelsManagement = lazy(() => import('./Pages/SuperAdmin/AiModelsManagement'));
const AiCostManagement = lazy(() => import('./Pages/SuperAdmin/AiCostManagement'));
const UserDetailPage = lazy(() => import('./Pages/SuperAdmin/UserDetailPage'));
const GroupDetailPage = lazy(() => import('./Pages/SuperAdmin/GroupDetailPage'));

function MainRoutes() {
  return (
    <Routes>

      {/* Route cho khách (Chưa đăng nhập) - Đã đăng nhập sẽ bị đẩy về Home
      page của role đó */}
      {/* VNPay return: nếu request trúng frontend thay vì backend thì redirect sang backend */}
      <Route path="/api/vnpay/return" element={<VnPayReturnRedirect />} />
      <Route path="/accept-invite" element={<AcceptInvitationPage />} />
      <Route path="/pricing" element={<PricingGuidePage />} />

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
        <Route path="/group-workspace/:workspaceId" element={<GroupWorkspacePage />} />
        <Route path="/group-workspace/:workspaceId/*" element={<GroupWorkspacePage />} />
        <Route path="/group-manage/:workspaceId" element={<GroupManagementPage />} />
        <Route path="/quiz/practice/:quizId" element={<PracticeQuizPage />} />
        <Route path="/quiz/exam/:quizId" element={<ExamQuizPage />} />
        <Route path="/quiz/result/:attemptId" element={<QuizResultPage />} />
      </Route>

       {/* Route dành riêng cho Super Admin */}
       <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
       <Route path="/super-admin" element={<SuperAdminLayout />} >
          <Route index element={<SuperAdminDashboard />} />
          <Route path="admins" element={<AdminManagement />} />
          <Route path="rbac" element={<RbacManagement />} />
          <Route path="ai-providers" element={<AiProvidersOverview />} />
          <Route path="ai-models" element={<AiModelsManagement />} />
          <Route path="ai-costs" element={<AiCostManagement />} />
          <Route path="ai-audit" element={<AiAuditManagement />} />
          <Route path="users/:userId" element={<UserDetailPage />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="groups/:workspaceId" element={<GroupDetailPage />} />
          <Route path="groups" element={<GroupManagement />} />
            <Route path="plan" element={<PlanManagement />} />
          <Route path="credit" element={<CreditPackageManagement />} />
          <Route path="payments" element={<AdminPaymentManagement />} />
            <Route path="system-settings" element={<SystemSettingManagement />} />
            <Route path="ai-action-policies" element={<AiActionPolicyManagement />} />
        </Route>
      </Route>

      {/* Route dành riêng cho Admin - Super Admin không được vào */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin" element={<AdminLayout />} >
          <Route index element={<AdminDashboard />} />
          <Route path="users/:userId" element={<UserDetailPage />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="groups/:workspaceId" element={<GroupDetailPage />} />
          <Route path="groups" element={<GroupManagement />} />
            <Route path="plan" element={<PlanManagement />} />
          <Route path="credit" element={<CreditPackageManagement />} />
          <Route path="payments" element={<AdminPaymentManagement />} />
          <Route path="system-settings" element={<SystemSettingManagement />} />
        </Route>
      </Route>
    </Routes>
  );
}

function LaunchRoutes() {
  return (
    <Routes>
      <Route path="/api/vnpay/return" element={<VnPayReturnRedirect />} />
      <Route path="*" element={<LaunchingPage />} />
    </Routes>
  );
}

function PlanGuardListener() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('planUpgradeRequired', handler);
    return () => window.removeEventListener('planUpgradeRequired', handler);
  }, []);

  return <PlanUpgradeModal open={open} onOpenChange={setOpen} />;
}

function AppContent() {
  if (launchConfig.enabled) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <LaunchRoutes />
      </Suspense>
    );
  }

  return (
    <NavigationLoadingProvider>
      <UserProfileProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <MainRoutes />
        </Suspense>
      </UserProfileProvider>
    </NavigationLoadingProvider>
  );
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <RouteMetaManager />
        <PlanGuardListener />
        <AppContent />
      </Router>
    </ToastProvider>
  );
}

export default App
