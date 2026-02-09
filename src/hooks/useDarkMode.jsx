import React, { createContext, useContext, useState, useEffect } from 'react';

// Tạo Context để quản lý trạng thái Dark Mode
const DarkModeContext = createContext();

export function DarkModeProvider({ children }) {
  // Khởi tạo state từ localStorage hoặc mặc định là light mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('quizmate_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });

  // Lưu trạng thái vào localStorage khi thay đổi
  useEffect(() => {
    localStorage.setItem('quizmate_dark_mode', JSON.stringify(isDarkMode));
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
