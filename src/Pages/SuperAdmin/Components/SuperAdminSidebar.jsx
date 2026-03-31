import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users, UsersRound,
  PanelLeftClose, LogOut, Shield, CreditCard, Coins, Banknote, Bot, ChevronDown, ChevronRight,
  Settings2,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { logout } from '@/api/Authentication';

const MENU_SECTIONS = [
  {
    labelKey: 'sidebarSections.overview',
    items: [
      {
        icon: LayoutDashboard,
        labelKey: 'sidebar.dashboard',
        path: '/super-admin',
        alsoMatch: '/super-admin',
        matchPrefix: false,
      },
    ],
  },
  {
    labelKey: 'sidebarSections.workspace',
    items: [
      {
        icon: Users,
        labelKey: 'sidebar.users',
        path: '/super-admin/users',
        alsoMatch: '/super-admin/users',
        matchPrefix: true,
      },
      {
        icon: UsersRound,
        labelKey: 'sidebar.groups',
        path: '/super-admin/groups',
        matchPrefix: true,
      },
    ],
  },
  {
    labelKey: 'sidebarSections.commerce',
    items: [
      {
        icon: CreditCard,
        labelKey: 'sidebar.subscriptions',
        path: '/super-admin/plan',
        matchPrefix: true,
      },
      {
        icon: Coins,
        labelKey: 'sidebar.creditPackages',
        path: '/super-admin/credit',
        matchPrefix: true,
      },
      {
        icon: Banknote,
        labelKey: 'sidebar.payments',
        path: '/super-admin/payments',
        matchPrefix: true,
      },
    ],
  },
  {
    labelKey: 'sidebarSections.system',
    items: [
      {
        icon: Shield,
        labelKey: 'sidebar.adminAccounts',
        path: '/super-admin/admins',
        matchPrefix: true,
      },
      {
        icon: Shield,
        labelKey: 'sidebar.rbac',
        path: '/super-admin/rbac',
        matchPrefix: true,
      },
      {
        icon: Bot,
        labelKey: 'sidebar.aiAudit',
        path: '/super-admin/ai-audit',
        matchPrefix: true,
      },
      {
        icon: Settings2,
        labelKey: 'sidebar.systemSettings',
        path: '/super-admin/system-settings',
        matchPrefix: true,
      },
    ],
  },
];

const isActive = (item, pathname) => {
  if (pathname === item.path || pathname === item.alsoMatch) return true;
  if (item.matchPrefix && pathname.startsWith(item.path + '/')) return true;
  return false;
};

function SuperAdminSidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const [sectionOverrides, setSectionOverrides] = useState({});

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSection = (section) => {
    const defaultOpen = section.items.some((item) => isActive(item, location.pathname));

    setSectionOverrides((prev) => ({
      ...prev,
      [section.labelKey]: !(prev[section.labelKey] ?? defaultOpen),
    }));
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
        {/* Logo */}
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

        {/* Icon đóng sidebar */}
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

      <nav className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2 space-y-3" : "px-3 space-y-4")}>
        {MENU_SECTIONS.map((section) => (
          (() => {
            const shouldUseDropdown = !collapsed && section.items.length > 1;
            const isSectionOpen = shouldUseDropdown
              ? (sectionOverrides[section.labelKey] ?? section.items.some((item) => isActive(item, location.pathname)))
              : true;

            return (
              <div
                key={section.labelKey}
                className={cn(
                  "rounded-2xl border",
                  collapsed ? "p-1.5" : "p-2",
                  isDarkMode
                    ? "border-slate-800/80 bg-slate-950/30"
                    : "border-white/10 bg-white/5"
                )}
              >
                {!collapsed && (
                  shouldUseDropdown ? (
                    <button
                      type="button"
                      onClick={() => toggleSection(section)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors",
                        isDarkMode ? "hover:bg-slate-800/80" : "hover:bg-white/10"
                      )}
                    >
                      <span
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-[0.22em]",
                          isDarkMode ? "text-slate-500" : "text-white/55"
                        )}
                      >
                        {t(section.labelKey)}
                      </span>
                      {isSectionOpen ? (
                        <ChevronDown className={cn("h-4 w-4", isDarkMode ? "text-slate-400" : "text-white/55")} />
                      ) : (
                        <ChevronRight className={cn("h-4 w-4", isDarkMode ? "text-slate-400" : "text-white/55")} />
                      )}
                    </button>
                  ) : (
                    <p className={cn(
                      "px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em]",
                      isDarkMode ? "text-slate-500" : "text-white/55"
                    )}>
                      {t(section.labelKey)}
                    </p>
                  )
                )}

                {isSectionOpen && (
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        title={collapsed ? t(item.labelKey) : undefined}
                        className={cn(
                          "w-full flex items-center gap-3 py-3 rounded-xl text-sm font-medium transition-colors",
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
                  </div>
                )}
              </div>
            );
          })()
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
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>{t('sidebar.logout')}</span>}
        </button>
      </div>
    </div>
  );
}

export default SuperAdminSidebar;
