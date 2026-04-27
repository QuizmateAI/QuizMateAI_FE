import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronRight, Globe, KeyRound, Moon, Sun } from 'lucide-react';
import SuperAdminSidebar from './Components/SuperAdminSidebar';
import SuperAdminChangePasswordDialog from './Components/SuperAdminChangePasswordDialog';
import { useDarkMode } from '@/hooks/useDarkMode';
import { AdminPermissionsProvider } from '@/hooks/useAdminPermissions';
import { getSuperAdminPageMeta } from './Components/superAdminNavigation';

function SuperAdminLayoutContent() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const meta = getSuperAdminPageMeta(location.pathname, t);

  const toggleLanguage = () => {
    i18n.changeLanguage(currentLang === 'vi' ? 'en' : 'vi');
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div
      className={`super-admin-theme flex h-screen overflow-hidden transition-colors duration-300 ${fontClass}`}
    >
      <SuperAdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200/70 bg-white/72 px-6 py-3 backdrop-blur-2xl dark:border-slate-800/70 dark:bg-slate-950/72">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-slate-400 dark:text-slate-500">
                {meta.breadcrumbs.map((crumb, index) => (
                  <div key={`${crumb}-${index}`} className="flex items-center gap-2">
                    {index > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
                    <span className={index === meta.breadcrumbs.length - 1 ? 'text-slate-600 dark:text-slate-300' : ''}>
                      {crumb}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="sa-pill">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]' : 'bg-amber-500'
                  }`}
                />
                <span>{isOnline ? t('common.operational', 'Operational') : t('common.offline', 'Offline')}</span>
              </div>

              <button
                type="button"
                className="sa-pill h-10 w-10 justify-center p-0 transition-colors hover:border-slate-300 hover:text-slate-900 dark:hover:border-slate-600 dark:hover:text-white"
                title={t('common.notifications', 'Notifications')}
                aria-label={t('common.notifications', 'Notifications')}
              >
                <Bell className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={toggleLanguage}
                className="sa-pill h-10 w-10 justify-center p-0 transition-colors hover:border-slate-300 hover:text-slate-900 dark:hover:border-slate-600 dark:hover:text-white"
                title={t('common.changeLanguage', 'Change language')}
                aria-label={t('common.changeLanguage', 'Change language')}
              >
                <Globe className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={toggleDarkMode}
                className="sa-pill h-10 w-10 justify-center p-0 transition-colors hover:border-slate-300 hover:text-slate-900 dark:hover:border-slate-600 dark:hover:text-white"
                title={isDarkMode ? t('common.lightMode', 'Light mode') : t('common.darkMode', 'Dark mode')}
                aria-label={isDarkMode ? t('common.lightMode', 'Light mode') : t('common.darkMode', 'Dark mode')}
              >
                {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-500" />}
              </button>

              <button
                type="button"
                onClick={() => setChangePasswordOpen(true)}
                className="sa-pill h-10 w-10 justify-center p-0 transition-colors hover:border-slate-300 hover:text-slate-900 dark:hover:border-slate-600 dark:hover:text-white"
                title={t('superAdminLayout.changePassword.trigger')}
                aria-label={t('superAdminLayout.changePassword.trigger')}
              >
                <KeyRound className="h-4 w-4" />
              </button>

              <div className="hidden h-6 w-px bg-slate-200 md:block dark:bg-slate-800" />

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0455BF] text-xs font-bold text-white shadow-[0_12px_24px_-16px_rgba(4,85,191,0.72)]">
                SA
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <SuperAdminChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
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
