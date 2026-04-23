import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './Pages/Route/protectedRoute';
import HomeTabRedirect from './Pages/Route/HomeTabRedirect';
import { ToastProvider } from '@/context/ToastContext';
import { NavigationLoadingProvider } from '@/context/NavigationLoadingContext';
import { UserProfileProvider } from '@/context/UserProfileContext';
import LoadingSpinner from '@/Components/ui/LoadingSpinner';
import RouteMetaManager from '@/Components/seo/RouteMetaManager';
import RuntimeRecoveryBoundary from '@/Components/system/RuntimeRecoveryBoundary';
import { launchConfig } from '@/lib/launchConfig';
import { hasRouteNamespacesLoaded, preloadRouteNamespaces } from '@/i18n';
import { useTranslation } from 'react-i18next';
import { loadGroupWorkspacePage, loadHomePage, loadWorkspacePage } from '@/lib/routeLoaders';

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
const HomePage = lazy(loadHomePage);
const ProfilePage = lazy(() => import('./Pages/Users/Profile/ProfilePage'));
const PlanPage = lazy(() => import('./Pages/Users/Plan/PlanPage'));
const WalletPage = lazy(() => import('./Pages/Users/Credit/WalletPage'));
const FeedbackSystemLayout = lazy(() => import('./Pages/Users/Feedback/FeedbackSystemLayout'));
const FeedbackCenterPage = lazy(() => import('./Pages/Users/Feedback/FeedbackCenterPage'));
const FeedbackProductPage = lazy(() => import('./Pages/Users/Feedback/FeedbackProductPage'));
const FeedbackSystemPage = lazy(() => import('./Pages/Users/Feedback/FeedbackSystemPage'));
const FeedbackSurveyPage = lazy(() => import('./Pages/Users/Feedback/FeedbackSurveyPage'));
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
const MyPermissionsPage = lazy(() => import('./Pages/Admin/MyPermissionsPage'));
const CommunityQuizManagement = lazy(() => import('./Pages/Admin/CommunityQuizManagement'));

// Quiz
const PracticeQuizPage = lazy(() => import('./Pages/Users/Quiz/PracticeQuizPage'));
const ExamQuizPage = lazy(() => import('./Pages/Users/Quiz/ExamQuizPage'));
const QuizResultPage = lazy(() => import('./Pages/Users/Quiz/QuizResultPage'));

// Payment
const PaymentPage = lazy(() => import('./Pages/Payment/PaymentPage'));
const CreditPaymentPage = lazy(() => import('./Pages/Payment/CreditPaymentPage'));
const PaymentResultPage = lazy(() => import('./Pages/Payment/PaymentResultPage'));
const MomoReturnRedirect = lazy(() => import('./Pages/Payment/MomoReturnRedirect'));
const VnPayReturnRedirect = lazy(() => import('./Pages/Payment/VnPayReturnRedirect'));
const StripeReturnRedirect = lazy(() => import('./Pages/Payment/StripeReturnRedirect'));

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
const FeedbackManagementLayout = lazy(() => import('./Pages/SuperAdmin/FeedbackManagementLayout'));
const FeedbackManagement = lazy(() => import('./Pages/SuperAdmin/FeedbackManagement'));
const FeedbackResponseActivityPage = lazy(() => import('./Pages/SuperAdmin/FeedbackResponseActivityPage'));
const PermissionRequestsPage = lazy(() => import('./Pages/SuperAdmin/PermissionRequestsPage'));

function MainRoutes() {
  return (
    <Routes>

      {/* Route cho khách (Chưa đăng nhập) - Đã đăng nhập sẽ bị đẩy về Home
      page của role đó */}
      {/* VNPay return: nếu request trúng frontend thay vì backend thì redirect sang backend */}
      <Route path="/api/momo/return" element={<MomoReturnRedirect />} />
      <Route path="/api/vnpay/return" element={<VnPayReturnRedirect />} />
      <Route path="/api/stripe/return" element={<StripeReturnRedirect />} />
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
        <Route path="/payment" element={<LegacyPathRedirect to="/payments" />} />
        <Route path="/payment/credits" element={<LegacyPathRedirect to="/payments/credits" />} />
        <Route path="/payment/result" element={<LegacyPathRedirect to="/payments/results" />} />
        <Route path="/payment/results" element={<LegacyPathRedirect to="/payments/results" />} />
        <Route path="/payments/result" element={<LegacyPathRedirect to="/payments/results" />} />
        <Route path="/plan" element={<LegacyPathRedirect to="/plans" />} />
        <Route path="/payments" element={<PaymentPage />} />
        <Route path="/payments/credits" element={<CreditPaymentPage />} />
        <Route path="/payments/results" element={<PaymentResultPage />} />
        <Route path="/profiles" element={<ProfilePage />} />
        <Route path="/plans" element={<PlanPage />} />
        <Route path="/wallets" element={<WalletPage />} />
        <Route path="/feedbacks" element={<FeedbackSystemLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<FeedbackCenterPage />} />
          <Route path="product" element={<FeedbackProductPage />} />
          <Route path="system" element={<FeedbackSystemPage />} />
          <Route path="surveys" element={<FeedbackSurveyPage />} />
        </Route>
        <Route path="/home" element={<HomePage />} />
        <Route path="/workspaces" element={<HomeTabRedirect tab="workspace" />} />
        <Route path="/group-workspaces" element={<HomeTabRedirect tab="group" />} />
        <Route path="/workspaces/:workspaceId" element={<WorkspacePage />} />
        <Route path="/workspaces/:workspaceId/*" element={<WorkspacePage />} />
        <Route path="/group-workspaces/:workspaceId" element={<GroupWorkspacePage />} />
        <Route path="/group-workspaces/:workspaceId/*" element={<GroupWorkspacePage />} />
        <Route path="/groups/:workspaceId/manage" element={<GroupManagementPage />} />
        <Route path="/quizzes/practice/:quizId" element={<PracticeQuizPage />} />
        <Route path="/quizzes/exams/:quizId" element={<ExamQuizPage />} />
        <Route path="/quizzes/results/:attemptId" element={<QuizResultPage />} />
      </Route>

       {/* Route dành riêng cho Super Admin */}
       <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
       <Route path="/super-admin" element={<SuperAdminLayout />} >
          <Route index element={<SuperAdminDashboard />} />
          <Route path="admins" element={<AdminManagement />} />
          <Route path="rbac" element={<RbacManagement />} />
          <Route path="permission-requests" element={<PermissionRequestsPage />} />
          <Route path="ai-providers" element={<AiProvidersOverview />} />
          <Route path="ai-models" element={<AiModelsManagement />} />
          <Route path="ai-costs" element={<AiCostManagement />} />
          <Route path="ai-audit" element={<AiAuditManagement />} />
          <Route path="users/:userId" element={<UserDetailPage />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="groups/:workspaceId" element={<GroupDetailPage />} />
          <Route path="groups" element={<GroupManagement />} />
          <Route path="community-quizzes" element={<CommunityQuizManagement />} />
            <Route path="plans" element={<PlanManagement />} />
          <Route path="credits" element={<CreditPackageManagement />} />
          <Route path="payments" element={<AdminPaymentManagement />} />
            <Route path="system-settings" element={<SystemSettingManagement />} />
            <Route path="ai-action-policies" element={<AiActionPolicyManagement />} />
            <Route path="feedbacks" element={<FeedbackManagementLayout />}>
              <Route index element={<Navigate to="forms" replace />} />
              <Route path="forms" element={<FeedbackManagement />} />
              <Route path="activity" element={<FeedbackResponseActivityPage />} />
            </Route>
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
          <Route path="community-quizzes" element={<CommunityQuizManagement />} />
            <Route path="plans" element={<PlanManagement />} />
          <Route path="credits" element={<CreditPackageManagement />} />
          <Route path="payments" element={<AdminPaymentManagement />} />
          <Route path="system-settings" element={<SystemSettingManagement />} />
          <Route path="my-permissions" element={<MyPermissionsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

function LegacyPathRedirect({ to }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}${location.hash}`} replace />;
}

function RouteNamespaceGate({ children }) {
  const location = useLocation();
  const { i18n } = useTranslation();
  const language = i18n.language?.startsWith('en') ? 'en' : 'vi';
  const routeKey = `${language}:${location.pathname}`;
  const [readyRouteKey, setReadyRouteKey] = useState(() => (
    hasRouteNamespacesLoaded(location.pathname, language) ? routeKey : null
  ));
  const isRouteReady = readyRouteKey === routeKey || hasRouteNamespacesLoaded(location.pathname, language);

  useEffect(() => {
    let cancelled = false;

    if (hasRouteNamespacesLoaded(location.pathname, language)) {
      return () => {
        cancelled = true;
      };
    }

    preloadRouteNamespaces(location.pathname, language)
      .then(() => {
        if (!cancelled) {
          setReadyRouteKey(routeKey);
        }
      })
      .catch((error) => {
        console.error('Failed to preload route namespaces:', error);
        if (!cancelled) {
          setReadyRouteKey(routeKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [language, location.pathname, routeKey]);

  if (!isRouteReady) {
    return <LoadingSpinner />;
  }

  return children;
}

function LaunchRoutes() {
  return (
    <Routes>
      <Route path="/api/momo/return" element={<MomoReturnRedirect />} />
      <Route path="/api/vnpay/return" element={<VnPayReturnRedirect />} />
      <Route path="/api/stripe/return" element={<StripeReturnRedirect />} />
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
          <RouteNamespaceGate>
            <MainRoutes />
          </RouteNamespaceGate>
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
      <RuntimeRecoveryBoundary>
        <Router>
          <RouteMetaManager />
          <PlanGuardListener />
          <AppContent />
        </Router>
      </RuntimeRecoveryBoundary>
    </ToastProvider>
  );
}

export default App
