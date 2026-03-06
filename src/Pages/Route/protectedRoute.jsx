import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * Lấy thông tin user từ localStorage
 */
const getUser = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
};

const getToken = () => localStorage.getItem('accessToken');

/**
 * Component bảo vệ route theo role
 * @param {Array} allowedRoles - Danh sách các role được phép truy cập (VD: ['ADMIN', 'USER'])
 */
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

/**
 * Component xử lý các route công khai (Login, Register...)
 * Nếu user đã đăng nhập mà cố vào các trang này -> Đẩy về trang chủ
 */
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
