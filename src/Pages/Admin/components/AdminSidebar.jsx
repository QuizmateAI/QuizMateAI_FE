import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, ShieldAlert, 
  Cpu, CreditCard, Settings, LogOut,
  PanelLeftClose
} from 'lucide-react';
import { cn } from "@/lib/utils";
import LogoDark from "@/assets/DarkMode_Logo.png";
import { useTranslation } from 'react-i18next';

// Menu items với key để lấy translation
const menuItems = [
  { icon: LayoutDashboard, labelKey: 'sidebar.dashboard', path: '/admin' },
  { icon: Users, labelKey: 'sidebar.users', path: '/admin/users' },
  { icon: ShieldAlert, labelKey: 'sidebar.moderation', path: '/admin/moderation' },
  { icon: Cpu, labelKey: 'sidebar.aiSettings', path: '/admin/ai-settings' },
  { icon: CreditCard, labelKey: 'sidebar.billing', path: '/admin/billing' },
  { icon: Settings, labelKey: 'sidebar.settings', path: '/admin/settings' },
];

function AdminSidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <div className={cn(
      "bg-[#204D87] border-r h-screen flex flex-col transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      {/* Header: Logo + Toggle Icon */}
      <div className={cn(
        "flex items-center border-b border-white/10",
        collapsed ? "flex-col p-3 gap-2" : "justify-between p-4"
      )}>
        {/* Logo - khi collapsed thì hover để mở rộng */}
        <div 
          className={cn(
            "transition-all duration-300",
            collapsed && "cursor-pointer group"
          )}
          onClick={collapsed ? onToggle : undefined}
          title={collapsed ? "Mở rộng sidebar" : undefined}
        >
          <img 
            src={LogoDark} 
            alt="Logo" 
            className={cn(
              "transition-all duration-300",
              collapsed 
                ? "w-12 h-12 group-hover:scale-110 group-hover:brightness-125" 
                : "w-[120px] h-[120px]"
            )} 
          />
        </div>

        {/* Icon đóng sidebar - chỉ hiện khi mở */}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Thu gọn sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className={cn("flex-1 space-y-2 py-4", collapsed ? "px-2" : "px-4")}>
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            title={collapsed ? t(item.labelKey) : undefined}
            className={cn(
              "w-full flex items-center gap-3 py-3 rounded-lg text-sm font-medium transition-colors",
              collapsed ? "px-0 justify-center" : "px-4",
              location.pathname === item.path 
                ? "bg-[#c0d3fc] text-black font-semibold" 
                : "text-[#f1ebeb] hover:bg-[#e5ecf4] hover:text-black"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{t(item.labelKey)}</span>}
          </button>
        ))}
      </nav>

      <div className={cn("mt-auto border-t border-white/10", collapsed ? "p-2" : "p-4")}>
        <button 
          title={collapsed ? t('logout') : undefined}
          className={cn(
            "w-full flex items-center gap-3 py-3",
            "bg-red-500/10 hover:bg-red-500/20",
            "text-white hover:text-red-300",
            "border border-red-500/20 hover:border-red-500/40",
            "rounded-xl text-sm font-semibold transition-all duration-300",
            collapsed ? "px-0 justify-center" : "px-4 justify-start"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>{t('logout')}</span>}
        </button>
      </div>
    </div>
  );
}

export default AdminSidebar;