import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  ClipboardList,
  FolderOpen,
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
  Home,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import VietnamFlag from '@/assets/Viet_nam.png';
import EnglishFlag from '@/assets/UK_flag.svg';

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'personalDashboard', icon: LayoutDashboard },
  { id: 'documents', icon: FolderOpen },
  { id: 'roadmap', icon: Map },
  { id: 'quiz', icon: PenLine },
  { id: 'flashcard', icon: BookOpen },
  { id: 'mockTest', icon: ClipboardList },
  { id: 'challenge', icon: Swords },
  { id: 'ranking', icon: BarChart3 },
  { id: 'notifications', icon: Bell },
  { id: 'members', icon: Users },
  { id: 'memberStats', icon: Brain },
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
  collapsed = false,
  onToggleCollapsed,
  isMobile = false,
  mobileOpen = false,
  onCloseMobile,
  onToggleLanguage,
  onToggleDarkMode,
  currentLang = 'vi',
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const isMember = String(role || '').toUpperCase() === 'MEMBER';
  const isCollapsed = !isMobile && collapsed;
  const displayGroupName = groupName || t('groupWorkspace.shell.defaultGroupName');
  const resolvedActiveSection = isMember && activeSection === 'dashboard'
    ? 'personalDashboard'
    : activeSection;

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.id === 'dashboard') return !isMember;
    if (item.id === 'personalDashboard') return isMember;
    if (item.id === 'memberStats') return !isMember;
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
    cn(
      'z-40 flex h-full shrink-0 flex-col border-r transition-[width,transform,background-color,border-color,color] duration-300 ease-out',
      isCollapsed ? 'w-[76px]' : 'w-[236px]',
      isDarkMode ? 'border-slate-700/80 bg-slate-900 text-slate-100' : 'border-slate-200/80 bg-white text-slate-900',
    ),
    isMobile
      ? cn(
          isDarkMode
            ? 'fixed inset-y-0 left-0 shadow-[0_28px_80px_rgba(2,6,23,0.5)]'
            : 'fixed inset-y-0 left-0 shadow-[0_28px_80px_rgba(15,23,42,0.14)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )
      : 'relative',
  );

  const handleGoHome = () => {
    navigate('/home', { state: { from: location.pathname } });
    if (isMobile) {
      onCloseMobile?.();
    }
  };

  return (
    <>
      {isMobile && mobileOpen ? (
        <button
          type="button"
          aria-label={t('groupWorkspace.shell.closeSidebar', 'Close sidebar')}
          className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-[2px]"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside className={asideClassName}>
        <div className={cn('border-b px-3 py-3', isDarkMode ? 'border-slate-700/80' : 'border-slate-200/80', isCollapsed && 'px-2')}>
          <div className={cn(isCollapsed ? 'flex flex-col items-center gap-2' : 'grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2')}>
            <button
              type="button"
              onClick={handleGoHome}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-200 ease-out',
                isDarkMode
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900',
              )}
              aria-label={t('common.home', 'Home')}
              title={t('common.home', 'Home')}
            >
              <Home className="h-4 w-4" />
            </button>

            {!isCollapsed ? (
              <div className="min-w-0 text-center">
                <p className={cn('truncate text-[16px] font-semibold leading-tight', isDarkMode ? 'text-slate-100' : 'text-slate-950', fontClass)}>
                  {displayGroupName}
                </p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className={cn('inline-flex h-2 w-2 rounded-full', wsConnected ? 'bg-emerald-500' : 'bg-amber-400')} />
                  <p className={cn('truncate text-xs', isDarkMode ? 'text-slate-400' : 'text-slate-500', fontClass)}>
                    {t('groupWorkspace.shell.memberCount', { count: Number(memberCount) || 0 })}
                  </p>
                </div>
              </div>
            ) : null}

            {isMobile ? (
              <button
                type="button"
                onClick={onCloseMobile}
                className={cn(
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200 ease-out',
                  isDarkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                )}
                aria-label={t('groupWorkspace.shell.closeSidebar', 'Close sidebar')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleCollapsed}
                className={cn(
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200 ease-out',
                  isDarkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                )}
                aria-label={isCollapsed ? t('groupWorkspace.shell.expandSidebar', 'Expand sidebar') : t('groupWorkspace.shell.collapseSidebar', 'Collapse sidebar')}
                title={isCollapsed ? t('groupWorkspace.shell.expandSidebar', 'Expand sidebar') : t('groupWorkspace.shell.collapseSidebar', 'Collapse sidebar')}
              >
                {isCollapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>

        <div className={cn('min-h-0 flex-1 overflow-y-auto pb-3 pt-2', isCollapsed ? 'px-2' : 'px-3.5')}>
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
                  title={isCollapsed ? t(`groupWorkspace.shell.nav.${item.id}`) : undefined}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-[16px] border py-2 text-left transition-[background-color,border-color,color,box-shadow] duration-200 ease-out',
                    isCollapsed ? 'justify-center px-1.5' : 'px-2.5',
                    isDisabled
                      ? isDarkMode
                        ? 'cursor-not-allowed border-slate-700 bg-slate-800/70 text-slate-500'
                        : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300'
                      : isActive
                        ? 'border-blue-600 bg-blue-600 text-white shadow-[0_18px_36px_-24px_rgba(37,99,235,0.55)]'
                        : isDarkMode
                          ? 'border-transparent bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white'
                          : 'border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200 ease-out',
                      isActive
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : isDarkMode
                          ? 'border-slate-700 bg-slate-800 text-slate-300'
                          : 'border-slate-200 bg-white text-slate-600',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  {!isCollapsed ? (
                  <span className={cn('min-w-0 flex-1 truncate text-[14px] font-semibold', fontClass)}>
                    {t(`groupWorkspace.shell.nav.${item.id}`)}
                  </span>
                  ) : null}

                  {badgeValue && !isCollapsed ? (
                    <span
                      className={cn(
                        'inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors duration-200 ease-out',
                        isActive ? 'bg-white text-blue-700' : isDarkMode ? 'bg-slate-200 text-slate-900' : 'bg-slate-900 text-white',
                      )}
                    >
                      {badgeValue}
                    </span>
                  ) : badgeValue && isCollapsed ? (
                    <span
                      className={cn(
                        'absolute ml-7 mt-[-22px] h-2 w-2 rounded-full',
                        isActive ? 'bg-white' : isDarkMode ? 'bg-slate-200' : 'bg-slate-900',
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className={cn('border-t pb-3 pt-2.5', isDarkMode ? 'border-slate-700/80' : 'border-slate-200/80', isCollapsed ? 'px-2' : 'px-3.5')}>
          <div className={cn('flex items-center gap-1.5', isCollapsed && 'flex-col')}>
            <button
              type="button"
              onClick={onToggleLanguage}
              className={cn(
                'flex h-12 min-w-0 items-center justify-center gap-2 rounded-2xl border transition-colors duration-200 ease-out',
                isCollapsed ? 'w-full px-2' : 'flex-1 px-3',
                isDarkMode
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {currentLang === 'vi' ? (
                <img
                  src={VietnamFlag}
                  alt="Tiếng Việt"
                  className="h-4 w-4 rounded-sm object-cover"
                />
              ) : (
                <img
                  src={EnglishFlag}
                  alt="English"
                  className="h-4 w-4 rounded-sm object-cover"
                />
              )}
              <span className={cn('text-[13px] font-semibold uppercase', fontClass)}>
                {currentLang === 'vi' ? 'VI' : 'EN'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleDarkMode}
              className={cn(
                'flex h-12 min-w-0 items-center justify-center gap-2 rounded-2xl border transition-colors duration-200 ease-out',
                isCollapsed ? 'w-full px-2' : 'flex-1 px-3',
                isDarkMode
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
              aria-label={isDarkMode ? t('common.dark', 'Dark') : t('common.light', 'Light')}
            >
              {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {!isCollapsed ? (
              <span className={cn('text-[12px] font-semibold', fontClass)}>
                {isDarkMode ? t('common.dark', 'Dark') : t('common.light', 'Light')}
              </span>
              ) : null}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default GroupSidebar;
