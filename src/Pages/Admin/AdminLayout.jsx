import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Globe } from 'lucide-react';
import AdminSidebar from './components/AdminSidebar';
import { useLanguage } from '@/hooks/useLanguage';

function AdminLayout() {
  const { language, toggleLanguage, t, fontClass } = useLanguage();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`flex bg-[#F8FAFC] min-h-screen ${fontClass}`}>
      <AdminSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar đơn giản */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
          <h2 className="text-lg font-semibold text-[#313131]">{t('systemTitle')}</h2>
          <div className="flex items-center gap-4">
            {/* Nút đổi ngôn ngữ */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
            >
              <Globe className="w-4 h-4" />
              <span>{language === 'vi' ? 'VI' : 'EN'}</span>
            </button>
            <div className="text-right hidden sm:block">
                <p className="text-sm font-bold font-poppins text-[#313131] leading-none">Admin QuizMate</p>
              </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 border flex items-center justify-center text-blue-600 font-bold font-poppins">
              AD
            </div>
          </div>
        </header>

        {/* Vùng hiển thị nội dung trang (Dashboard, User management...) */}
        <main className="flex-1 overflow-y-auto p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
export default AdminLayout;