import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BookOpen,
  ClipboardList,
  FolderOpen,
  Globe,
  LayoutDashboard,
  Map,
  Moon,
  PenLine,
  Settings,
  Sun,
  Swords,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'personalDashboard', icon: LayoutDashboard },
  { id: 'documents', icon: FolderOpen },
  { id: 'roadmap', icon: Map },
  { id: 'quiz', icon: PenLine },
  { id: 'flashcard', icon: BookOpen },
  { id: 'mockTest', icon: ClipboardList },
  { id: 'challenge', icon: Swords },
  { id: 'notifications', icon: Bell },
  { id: 'members', icon: Users },
  { id: 'wallet', icon: Wallet },
  { id: 'settings', icon: Settings },
];

function GroupSidebar({
  role = 'MEMBER',
  isDarkMode = false,
  activeSection = 'dashboard',
  onSectionChange,
  groupName = '',
  wsConnected = false,
  memberCount = 0,
  disabledMap = {},
  badgeMap = {},
  isMobile = false,
  mobileOpen = false,
  onCloseMobile,
  onToggleLanguage,
  onToggleDarkMode,
  currentLang = 'vi',
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const isMember = String(role || '').toUpperCase() === 'MEMBER';
  const resolvedActiveSection = isMember && activeSection === 'dashboard'
    ? 'personalDashboard'
    : activeSection;

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.id === 'dashboard') return !isMember;
    if (item.id === 'personalDashboard') return isMember;
    return true;
  });

  const handleNavigate = (section) => {
    if (disabledMap?.[section]) return;
    onSectionChange?.(section);
    if (isMobile) {
      onCloseMobile?.();
    }
  };

  const asideClassName = cn(
    'z-40 flex h-full w-[236px] shrink-0 flex-col border-r border-slate-200/80 bg-white transition-transform duration-300',
    isMobile
      ? cn(
          'fixed inset-y-0 left-0 shadow-[0_28px_80px_rgba(15,23,42,0.14)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )
      : 'relative',
  );

  return (
    <>
      {isMobile && mobileOpen ? (
        <button
          type="button"
          aria-label={t('groupWorkspace.shell.closeSidebar', 'Đóng sidebar')}
          className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-[2px]"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside className={asideClassName}>
        <div className="border-b border-slate-200/80 px-4 pb-3.5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn('truncate text-[18px] font-semibold leading-tight text-slate-950', fontClass)}>
                {groupName || t('groupWorkspace.shell.defaultGroupName')}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className={cn('inline-flex h-2 w-2 rounded-full', wsConnected ? 'bg-emerald-500' : 'bg-amber-400')} />
                <p className={cn('text-xs text-slate-500', fontClass)}>
                  {t('groupWorkspace.shell.memberCount', { count: Number(memberCount) || 0 })}
                </p>
              </div>
            </div>

            {isMobile ? (
              <button
                type="button"
                onClick={onCloseMobile}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                aria-label={t('groupWorkspace.shell.closeSidebar', 'Đóng sidebar')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-3">
          <div className="space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = resolvedActiveSection === item.id;
              const isDisabled = Boolean(disabledMap?.[item.id]);
              const badgeValue = badgeMap?.[item.id];

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  disabled={isDisabled}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-[16px] border px-2.5 py-2 text-left transition-all',
                    isDisabled
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300'
                      : isActive
                        ? 'border-blue-600 bg-blue-600 text-white shadow-[0_18px_36px_-24px_rgba(37,99,235,0.55)]'
                        : 'border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
                      isActive
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-slate-200 bg-white text-slate-600',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className={cn('min-w-0 flex-1 truncate text-[14px] font-semibold', fontClass)}>
                    {t(`groupWorkspace.shell.nav.${item.id}`)}
                  </span>

                  {badgeValue ? (
                    <span
                      className={cn(
                        'inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                        isActive ? 'bg-white text-blue-700' : 'bg-slate-900 text-white',
                      )}
                    >
                      {badgeValue}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-200/80 px-3.5 pb-3 pt-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleLanguage}
              className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Globe className="h-4 w-4" />
              <span className={cn('text-[13px] font-semibold uppercase', fontClass)}>
                {currentLang === 'vi' ? 'VI' : 'EN'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleDarkMode}
              className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-slate-600 transition-colors hover:bg-slate-50"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className={cn('text-[12px] font-semibold', fontClass)}>
                {isDarkMode ? t('common.dark') : t('common.light')}
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default GroupSidebar;
