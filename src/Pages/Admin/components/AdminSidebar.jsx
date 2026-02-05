import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, ShieldAlert, 
  Cpu, CreditCard, Settings, LogOut 
} from 'lucide-react';
import { cn } from "@/lib/utils";
import LogoLight from "@/assets/DarkMode_Logo.png";

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Người dùng', path: '/admin/users' },
  { icon: ShieldAlert, label: 'Kiểm duyệt', path: '/admin/moderation' },
  { icon: Cpu, label: 'Cấu hình AI', path: '/admin/ai-settings' },
  { icon: CreditCard, label: 'Doanh thu', path: '/admin/billing' },
  { icon: Settings, label: 'Cài đặt', path: '/admin/settings' },
];

function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="w-64 bg-[#204D87] border-r h-screen flex flex-col transition-all">
      <div className="p-6 items-center gap-3">
        <img src={LogoLight} alt="Logo" className="w-[120px] h-[120px] mx-auto" />
        
      </div>

      <nav className="flex-1 px-4 space-y-2 py-4">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
              location.pathname === item.path 
                ? "bg-[#c0d3fc] text-black font-semibold" 
                : "text-[#f1ebeb] hover:bg-[#e5ecf4]"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-white/10">
  <button 
    className="w-full flex items-start justify-start gap-3 px-4 py-3 
               bg-red-500/10 hover:bg-red-500/20 
               text-white hover:text-red-300
               border border-red-500/20 hover:border-red-500/40
               rounded-xl text-sm font-semibold transition-all duration-300"
  >
    <LogOut className="w-4 h-4" />
    <span>Đăng xuất</span>
  </button>
</div>
    </div>
  );
}

export default AdminSidebar;