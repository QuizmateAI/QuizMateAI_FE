import { startTransition } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import LogoDark from '@/assets/DarkMode_Logo.webp';
import { logout } from '@/api/Authentication';
import {
  SUPER_ADMIN_MENU_SECTIONS,
  isSuperAdminItemActive,
} from './superAdminNavigation';

function SuperAdminSidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const brandName = 'QuizMateAI';

  // Wrap tab navigation in a transition so React 19 keeps the previous tab's
  // rendered output visible while the new chunk/data loads, instead of
  // unmounting to a Suspense fallback (the visible 1-2s "khựng").
  const goTo = (to) => {
    startTransition(() => navigate(to));
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true, state: { fromLogout: true } });
  };

  return (
    <aside
      className={cn(
        'sticky top-0 z-30 flex h-screen shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white/86 shadow-[24px_0_80px_-56px_rgba(15,23,42,0.55)] backdrop-blur-2xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-950/82',
        collapsed ? 'w-[92px]' : 'w-[292px]',
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-4 dark:border-slate-800/70">
        <div
          className={cn(
            'flex min-w-0 items-center gap-3',
            collapsed && 'justify-center',
          )}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0455BF] shadow-[0_20px_30px_-18px_rgba(4,85,191,0.75)]">
            <img
              src={LogoDark}
              alt={t('common.brandLogoAlt', { brandName })}
              className="h-8 w-8 object-contain"
            />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {brandName}
              </p>
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {t('superAdminSidebar.roleLabel', 'Super Admin')}
              </p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
          title={collapsed ? t('common.expandSidebar', 'Expand sidebar') : t('common.collapseSidebar', 'Collapse sidebar')}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {SUPER_ADMIN_MENU_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-2">
            {!collapsed ? (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                {t(section.labelKey, section.defaultLabel)}
              </p>
            ) : null}

            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isSuperAdminItemActive(item, location.pathname);
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(item.to)}
                    title={collapsed ? t(item.labelKey, item.defaultLabel) : undefined}
                    className={cn(
                      'group relative flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-left text-sm font-medium transition-all',
                      collapsed ? 'justify-center' : 'justify-start',
                      active
                        ? 'bg-[#EEF4FF] text-[#0455BF] shadow-[0_18px_32px_-24px_rgba(4,85,191,0.55)] ring-1 ring-[#B9D4FF] dark:bg-[#0B1731] dark:text-sky-300 dark:ring-[#1E3A8A]'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
                    )}
                  >
                    {active && !collapsed ? (
                      <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#0455BF] dark:bg-sky-300" />
                    ) : null}
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors',
                        active
                          ? 'bg-white text-[#0455BF] dark:bg-slate-950 dark:text-sky-300'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-950 dark:group-hover:text-white',
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    {!collapsed ? (
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{t(item.labelKey, item.defaultLabel)}</p>
                        <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                          {t(section.labelKey, section.defaultLabel)}
                        </p>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200/70 p-3 dark:border-slate-800/70">
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-[20px] border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15',
            collapsed && 'justify-center',
          )}
          title={collapsed ? t('sidebar.logout') : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed ? <span>{t('sidebar.logout')}</span> : null}
        </button>
      </div>
    </aside>
  );
}

export default SuperAdminSidebar;
