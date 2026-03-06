import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Sun, Moon } from 'lucide-react';
import SuperAdminSidebar from './Components/SuperAdminSidebar';
import { useDarkMode } from '@/hooks/useDarkMode';
import { AdminPermissionsProvider } from '@/hooks/useAdminPermissions';

function SuperAdminLayoutContent() {
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const toggleLanguage = () => {
    i18n.changeLanguage(currentLang === 'vi' ? 'en' : 'vi');
  };

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${fontClass} ${
      isDarkMode ? 'bg-slate-950' : 'bg-[#F8FAFC]'
    }`}>
      <SuperAdminSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className={`h-16 border-b flex items-center justify-between px-6 transition-colors duration-300 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h2 className={`text-lg font-semibold ${
            isDarkMode ? 'text-white' : 'text-[#313131]'
          }`}>{t('header.systemTitle')}</h2>
          <div className="flex items-center gap-3">
            {/* Nút đổi Dark Mode */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg border transition-colors ${
                isDarkMode 
                  ? 'border-slate-700 hover:bg-slate-800 text-yellow-400' 
                  : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {/* Nút đổi ngôn ngữ */}
            <button
              onClick={toggleLanguage}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-sm font-medium ${
                isDarkMode 
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300' 
                  : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>{currentLang === 'vi' ? 'VI' : 'EN'}</span>
            </button>
            <div className="text-right hidden sm:block">
                <p className={`text-sm font-bold font-poppins leading-none ${
                  isDarkMode ? 'text-white' : 'text-[#313131]'
                }`}>Super Admin</p>
              </div>
            <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold font-poppins ${
              isDarkMode ? 'bg-indigo-900 border-indigo-700 text-indigo-300' : 'bg-indigo-100 border-indigo-200 text-indigo-700'
            }`}>
              SA
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SuperAdminLayout() {
  return (
    <AdminPermissionsProvider>
      <SuperAdminLayoutContent />
    </AdminPermissionsProvider>
  );
}
export default SuperAdminLayout;
