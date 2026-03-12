import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, UsersRound,
  CreditCard, LogOut, SlidersHorizontal,
  PanelLeftClose
} from 'lucide-react';
import { cn } from "@/lib/utils";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { logout } from '@/api/Authentication';

const ALL_MENU_ITEMS = [
  { icon: Users, labelKey: 'sidebar.users', path: '/admin/users', alsoMatch: '/admin', requiredPerm: 'user:read', matchPrefix: true },
  { icon: UsersRound, labelKey: 'sidebar.groups', path: '/admin/groups', requiredPerm: 'group:read_all', matchPrefix: true },
  { icon: CreditCard, labelKey: 'sidebar.subscriptions', path: '/admin/subscriptions', requiredPerm: 'subscription:read' },
  { icon: SlidersHorizontal, labelKey: 'sidebar.systemConfig', path: '/admin/system-config', requiredPerm: 'system-settings:read' },
];

const isActive = (item, pathname) => {
  if (pathname === item.path || pathname === item.alsoMatch) return true;
  if (item.matchPrefix && pathname.startsWith(item.path + '/')) return true;
  return false;
};

function AdminSidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { permissions, loading } = useAdminPermissions();

  const menuItems = ALL_MENU_ITEMS.filter(
    (item) => !item.requiredPerm || loading || permissions.has(item.requiredPerm)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={cn(
      "border-r h-screen flex flex-col transition-all duration-300",
      collapsed ? "w-20" : "w-64",
      isDarkMode ? "bg-slate-900 border-slate-800" : "bg-[#204D87]"
    )}>
      {/* Header: Logo + Toggle Icon */}
      <div className={cn(
        "flex items-center border-b",
        collapsed ? "flex-col p-3 gap-2" : "justify-between p-4",
        isDarkMode ? "border-slate-700" : "border-white/10"
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
              isActive(item, location.pathname) 
                ? isDarkMode 
                  ? "bg-slate-700 text-white font-semibold" 
                  : "bg-[#c0d3fc] text-black font-semibold"
                : isDarkMode
                  ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                  : "text-[#f1ebeb] hover:bg-[#e5ecf4] hover:text-black"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{t(item.labelKey)}</span>}
          </button>
        ))}
      </nav>

      <div className={cn(
        "mt-auto border-t", 
        collapsed ? "p-2" : "p-4",
        isDarkMode ? "border-slate-700" : "border-white/10"
      )}>
        <button 
          onClick={handleLogout}
          title={collapsed ? t('sidebar.logout') : undefined}
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
          {!collapsed && <span>{t('sidebar.logout')}</span>}
        </button>
      </div>
    </div>
  );
}

export default AdminSidebar;
