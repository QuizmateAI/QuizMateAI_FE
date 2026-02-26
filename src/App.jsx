import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HeroSection from './Pages/LandingPage/LandingPage';
import LoginPage from './Pages/Authentication/LoginPage';
import RegisterPage from './Pages/Authentication/RegisterPage';
import ForgotPasswordPage from './Pages/Authentication/ForgotPasswordPage';
import HomePage from './Pages/Users/Home/HomePage';
import AdminLayout from './Pages/Admin/AdminLayout';
import UserManagement from './Pages/Admin/UserManagement';
import GroupManagement from './Pages/Admin/GroupManagement';
import SubscriptionManagement from './Pages/Admin/SubscriptionManagement';
import SuperAdminLayout from './Pages/SuperAdmin/SuperAdminLayout';
import AdminManagement from './Pages/SuperAdmin/AdminManagement';
import UserDetailPage from './Pages/SuperAdmin/UserDetailPage';
import GroupDetailPage from './Pages/SuperAdmin/GroupDetailPage';
import WorkspacePage from './Pages/Users/Individual/Workspace/WorkspacePage';
import GroupWorkspacePage from './Pages/Users/Group/GroupWorkspacePage';
import GroupManagementPage from './Pages/Users/Group/Group_leader/GroupManagementPage';
import ProfilePage from './Pages/Users/Individual/Profile/ProfilePage';
import { ProtectedRoute, PublicRoute } from './Pages/Route/protectedRoute'; // Import bảo vệ route
import { ToastProvider } from '@/context/ToastContext';
import './i18n'; // Import i18n configuration
import './App.css'

function App() {
  return (
    <ToastProvider>
    <Router>
      <Routes>

        {/* Route cho khách (Chưa đăng nhập) - Đã đăng nhập sẽ bị đẩy về Home
        page của role đó */}
        <Route element={<PublicRoute />}>
        <Route path="/" element={<HeroSection />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Route cần đăng nhập (User) - Super Admin, Admin không được vào */}
        <Route element={<ProtectedRoute allowedRoles={['USER']} />}>
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
    </Router>
    </ToastProvider>
  )
}

export default App
