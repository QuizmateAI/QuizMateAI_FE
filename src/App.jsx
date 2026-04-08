import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './Pages/Route/protectedRoute';
import { ToastProvider } from '@/context/ToastContext';
import { NavigationLoadingProvider } from '@/context/NavigationLoadingContext';
import { UserProfileProvider } from '@/context/UserProfileContext';
import LoadingSpinner from '@/Components/ui/LoadingSpinner';
import RouteMetaManager from '@/Components/seo/RouteMetaManager';
import { launchConfig } from '@/lib/launchConfig';
import { loadGroupWorkspacePage, loadWorkspacePage } from '@/lib/routeLoaders';

const FeedbackAutoPrompt = lazy(() => import('@/Components/feedback/FeedbackAutoPrompt'));
const PlanUpgradeModal = lazy(() => import('@/Components/plan/PlanUpgradeModal'));
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
const FeedbackCenterPage = lazy(() => import('./Pages/Users/Feedback/FeedbackCenterPage'));
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
const CreditPaymentPage = lazy(() => import('./Pages/Payment/CreditPaymentPage'));
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
const FeedbackManagement = lazy(() => import('./Pages/SuperAdmin/FeedbackManagement'));

function LegacyPathRedirect({ toBuilder }) {
  const params = useParams();
  return <Navigate to={toBuilder(params)} replace />;
}

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
        <Route path="/payments" element={<PaymentPage />} />
        <Route path="/payments/credits" element={<CreditPaymentPage />} />
        <Route path="/payments/results" element={<PaymentResultPage />} />
        <Route path="/profiles" element={<ProfilePage />} />
        <Route path="/plans" element={<PlanPage />} />
        <Route path="/wallets" element={<WalletPage />} />
        <Route path="/feedbacks" element={<FeedbackCenterPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/workspaces/:workspaceId" element={<WorkspacePage />} />
        <Route path="/workspaces/:workspaceId/*" element={<WorkspacePage />} />
        <Route path="/group-workspaces/:workspaceId" element={<GroupWorkspacePage />} />
        <Route path="/group-workspaces/:workspaceId/*" element={<GroupWorkspacePage />} />
        <Route path="/groups/:workspaceId/manage" element={<GroupManagementPage />} />
        <Route path="/quizzes/practice/:quizId" element={<PracticeQuizPage />} />
        <Route path="/quizzes/exams/:quizId" element={<ExamQuizPage />} />
        <Route path="/quizzes/results/:attemptId" element={<QuizResultPage />} />

        {/* Legacy singular URLs - redirect to plural URLs */}
        <Route path="/payment" element={<Navigate to="/payments" replace />} />
        <Route path="/payment/credit" element={<Navigate to="/payments/credits" replace />} />
        <Route path="/payment/result" element={<Navigate to="/payments/results" replace />} />
        <Route path="/profile" element={<Navigate to="/profiles" replace />} />
        <Route path="/plan" element={<Navigate to="/plans" replace />} />
        <Route path="/wallet" element={<Navigate to="/wallets" replace />} />
        <Route path="/feedback" element={<Navigate to="/feedbacks" replace />} />
        <Route
          path="/workspace/:workspaceId"
          element={<LegacyPathRedirect toBuilder={({ workspaceId }) => `/workspaces/${workspaceId}`} />}
        />
        <Route
          path="/workspace/:workspaceId/*"
          element={<LegacyPathRedirect toBuilder={({ workspaceId, '*': splat }) => `/workspaces/${workspaceId}${splat ? `/${splat}` : ''}`} />}
        />
        <Route
          path="/group-workspace/:workspaceId"
          element={<LegacyPathRedirect toBuilder={({ workspaceId }) => `/group-workspaces/${workspaceId}`} />}
        />
        <Route
          path="/group-workspace/:workspaceId/*"
          element={<LegacyPathRedirect toBuilder={({ workspaceId, '*': splat }) => `/group-workspaces/${workspaceId}${splat ? `/${splat}` : ''}`} />}
        />
        <Route
          path="/group-manage/:workspaceId"
          element={<LegacyPathRedirect toBuilder={({ workspaceId }) => `/groups/${workspaceId}/manage`} />}
        />
        <Route
          path="/quiz/practice/:quizId"
          element={<LegacyPathRedirect toBuilder={({ quizId }) => `/quizzes/practice/${quizId}`} />}
        />
        <Route
          path="/quiz/exam/:quizId"
          element={<LegacyPathRedirect toBuilder={({ quizId }) => `/quizzes/exams/${quizId}`} />}
        />
        <Route
          path="/quiz/result/:attemptId"
          element={<LegacyPathRedirect toBuilder={({ attemptId }) => `/quizzes/results/${attemptId}`} />}
        />
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
            <Route path="plans" element={<PlanManagement />} />
          <Route path="credits" element={<CreditPackageManagement />} />
          <Route path="payments" element={<AdminPaymentManagement />} />
            <Route path="system-settings" element={<SystemSettingManagement />} />
            <Route path="ai-action-policies" element={<AiActionPolicyManagement />} />
            <Route path="feedbacks" element={<FeedbackManagement />} />
            <Route path="plan" element={<Navigate to="plans" replace />} />
            <Route path="credit" element={<Navigate to="credits" replace />} />
            <Route path="feedback" element={<Navigate to="feedbacks" replace />} />
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
            <Route path="plans" element={<PlanManagement />} />
          <Route path="credits" element={<CreditPackageManagement />} />
          <Route path="payments" element={<AdminPaymentManagement />} />
          <Route path="system-settings" element={<SystemSettingManagement />} />
          <Route path="plan" element={<Navigate to="plans" replace />} />
          <Route path="credit" element={<Navigate to="credits" replace />} />
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

  return (
    <Suspense fallback={null}>
      <PlanUpgradeModal open={open} onOpenChange={setOpen} />
    </Suspense>
  );
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
        <Suspense fallback={null}>
          <FeedbackAutoPrompt />
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
