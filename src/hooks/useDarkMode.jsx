import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// Tạo Context để quản lý trạng thái Dark Mode
const DarkModeContext = createContext();

export function DarkModeProvider({ children }) {
  // Khởi tạo state từ localStorage hoặc mặc định là light mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('quizmate_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });

  // Tránh gọi PUT BE cho lần render đầu (chỉ đồng bộ, chưa phải user action)
  const hasHydrated = useRef(false);

  // Lưu trạng thái vào localStorage + áp class, PUT lên BE khi user toggle
  useEffect(() => {
    localStorage.setItem('quizmate_dark_mode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }

    // Persist lên BE nếu đã đăng nhập. Lazy import tránh vòng phụ thuộc.
    const hasToken = !!(localStorage.getItem('accessToken') || localStorage.getItem('jwt_token'));
    if (hasToken) {
      import('@/api/ProfileAPI')
        .then(({ updateUserThemeMode }) => updateUserThemeMode(isDarkMode ? 'dark' : 'light'))
        .catch(() => {});
    }
  }, [isDarkMode]);

  // Hàm toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

// Custom hook để sử dụng dark mode
export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}
