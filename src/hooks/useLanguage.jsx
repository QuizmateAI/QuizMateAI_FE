import React, { createContext, useContext, useState, useEffect } from 'react';

// Tạo Context để quản lý ngôn ngữ toàn cục
const LanguageContext = createContext();

// Translations cho toàn bộ ứng dụng
export const translations = {
  en: {
    // Sidebar
    dashboard: 'Dashboard',
    users: 'Users',
    moderation: 'Moderation',
    aiSettings: 'AI Settings',
    billing: 'Billing',
    settings: 'Settings',
    logout: 'Logout',

    // Dashboard
    systemOverview: 'System Overview',
    welcomeBack: 'Welcome back, here is what is happening today.',
    totalUsers: 'Total Users',
    monthlyRevenue: 'Monthly Revenue',
    aiTokensUsed: 'AI Tokens Used',
    violationReports: 'Violation Reports',
    comparedToLastMonth: '+12% compared to last month',
    userGrowthChart: '[User Growth Chart - Shadcn Chart]',
    newUsersList: '[Newly Registered Users List]',

    // Header
    systemTitle: 'QuizMate AI System',
    version: 'Version 2026.1.0',

    // Authentication - Login
    login: 'Login',
    loginSubtitle: 'Login to access your QuizMate account',
    email: 'Email',
    password: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot Password',
    loginButton: 'Login',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    orLoginWith: 'Or login with',
    backToHome: 'Back to Home',

    // Authentication - Register
    signUpTitle: 'Sign up',
    signUpSubtitle: "Let's get you all set up so you can access your personal account.",
    firstName: 'First Name',
    lastName: 'Last Name',
    confirmPassword: 'Confirm Password',
    agreeToTerms: 'I agree to all the',
    terms: 'Terms',
    and: 'and',
    privacyPolicies: 'Privacy Policies',
    createAccount: 'Create account',
    alreadyHaveAccount: 'Already have an account?',
    orRegisterWith: 'Or register with',
    cancel: 'Cancel',

    // Authentication - Forgot Password
    forgotPasswordTitle: 'Forgot your password?',
    forgotPasswordSubtitle: "Don't worry, happens to all of us. Enter your email below to recover your password",
    backToLogin: 'Back to login',
    submit: 'Submit',
    processing: 'Processing...',
  },
  vi: {
    // Sidebar
    dashboard: 'Dashboard',
    users: 'Người dùng',
    moderation: 'Kiểm duyệt',
    aiSettings: 'Cấu hình AI',
    billing: 'Doanh thu',
    settings: 'Cài đặt',
    logout: 'Đăng xuất',

    // Dashboard
    systemOverview: 'Tổng quan hệ thống',
    welcomeBack: 'Chào mừng trở lại, đây là những gì đang diễn ra hôm nay.',
    totalUsers: 'Tổng người dùng',
    monthlyRevenue: 'Doanh thu tháng',
    aiTokensUsed: 'AI Tokens đã dùng',
    violationReports: 'Báo cáo vi phạm',
    comparedToLastMonth: '+12% so với tháng trước',
    userGrowthChart: '[Biểu đồ tăng trưởng người dùng - Shadcn Chart]',
    newUsersList: '[Danh sách người dùng mới đăng ký]',

    // Header
    systemTitle: 'Hệ thống QuizMate AI',
    version: 'Phiên bản 2026.1.0',

    // Authentication - Login
    login: 'Đăng nhập',
    loginSubtitle: 'Đăng nhập để truy cập tài khoản QuizMate của bạn',
    email: 'Email',
    password: 'Mật khẩu',
    rememberMe: 'Ghi nhớ đăng nhập',
    forgotPassword: 'Quên mật khẩu',
    loginButton: 'Đăng nhập',
    noAccount: 'Chưa có tài khoản?',
    signUp: 'Đăng ký',
    orLoginWith: 'Hoặc đăng nhập với',
    backToHome: 'Về trang chủ',

    // Authentication - Register
    signUpTitle: 'Đăng ký',
    signUpSubtitle: 'Hãy thiết lập để bạn có thể truy cập tài khoản cá nhân của mình.',
    firstName: 'Tên',
    lastName: 'Họ',
    confirmPassword: 'Xác nhận mật khẩu',
    agreeToTerms: 'Tôi đồng ý với tất cả',
    terms: 'Điều khoản',
    and: 'và',
    privacyPolicies: 'Chính sách bảo mật',
    createAccount: 'Tạo tài khoản',
    alreadyHaveAccount: 'Đã có tài khoản?',
    orRegisterWith: 'Hoặc đăng ký với',
    cancel: 'Hủy',

    // Authentication - Forgot Password
    forgotPasswordTitle: 'Quên mật khẩu?',
    forgotPasswordSubtitle: 'Đừng lo, ai cũng có lúc quên. Nhập email của bạn để khôi phục mật khẩu',
    backToLogin: 'Quay lại đăng nhập',
    submit: 'Gửi',
    processing: 'Đang xử lý...',
  }
};

export function LanguageProvider({ children }) {
  // Lấy ngôn ngữ từ localStorage hoặc mặc định là tiếng Việt
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('app_language') || 'vi';
  });

  // Lưu ngôn ngữ vào localStorage khi thay đổi
  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  // Hàm chuyển đổi ngôn ngữ
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'vi' ? 'en' : 'vi');
  };

  // Hàm lấy text theo key
  const t = (key) => {
    return translations[language][key] || key;
  };

  // Class font dựa trên ngôn ngữ (Poppins cho EN, sans cho VI)
  const fontClass = language === 'en' ? 'font-poppins' : 'font-sans';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, fontClass }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook để sử dụng Language Context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
