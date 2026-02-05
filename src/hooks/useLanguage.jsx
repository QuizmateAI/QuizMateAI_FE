import React, { createContext, useContext, useState, useEffect } from 'react';

// Tạo Context để quản lý ngôn ngữ toàn cục
const LanguageContext = createContext();

// Translations cho Admin Module
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
