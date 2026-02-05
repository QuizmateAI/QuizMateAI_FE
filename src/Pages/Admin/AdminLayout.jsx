import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './components/AdminSidebar';

function AdminLayout() {
  return (
    <div className="flex bg-[#F8FAFC] min-h-screen">
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar đơn giản */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-0">
          <h2 className="text-lg font-semibold text-[#313131]">Hệ thống QuizMate AI</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 italic">Phiên bản 2026.1.0</span>
            <div className="w-10 h-10 rounded-full bg-blue-100 border flex items-center justify-center text-blue-600 font-bold">
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