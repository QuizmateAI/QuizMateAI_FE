import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getAccessToken } from '@/utils/tokenStorage';
import { getCurrentUser } from '@/lib/currentUser';

const getUser = () => getCurrentUser();
const getToken = () => getAccessToken();

export const ProtectedRoute = ({ allowedRoles }) => {
    const token = getToken();
    const user = getUser();
    const location = useLocation();

    // 1. Chưa đăng nhập -> Chuyển hướng về trang Login
    if (!token || !user) {
        // Lưu lại trang đang muốn vào để redirect lại sau khi login xong (nếu cần xử lý thêm ở Login)
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Kiểm tra Role
    // Nếu có danh sách role cho phép và role của user không nằm trong đó
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Nếu user cố truy cập trang không được phép
        if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
        if (user.role === 'SUPER_ADMIN') return <Navigate to="/super-admin" replace />;
        return <Navigate to="/home" replace />;
    }

    // 3. Hợp lệ -> Render nested routes
    return <Outlet />;
};

export const PublicRoute = () => {
    const token = getToken();
    const user = getUser();

    // Nếu đã có token và thông tin user -> Đã login
    if (token && user) {
        if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
        if (user.role === 'SUPER_ADMIN') return <Navigate to="/super-admin" replace />;
        return <Navigate to="/home" replace />;
    }

    return <Outlet />;
};
