import React, { useEffect, useState } from 'react';
import { Clock3, Globe, Moon, Sun } from 'lucide-react';
import i18n from '@/i18n';
import { cn } from '@/lib/utils';

function isPathActive(item, pathname) {
  if (pathname === item.path || pathname === item.alsoMatch) return true;
  if (item.matchPrefix && pathname.startsWith(`${item.path}/`)) return true;
  return false;
}

function getInitials(value) {
  if (!value) return 'QM';
  const words = String(value).trim().split(/\s+/).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() || '').join('') || 'QM';
}

function formatClockLabel(currentLang, timestamp = Date.now()) {
  return new Date(timestamp).toLocaleString(currentLang === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BackofficeShell({
  theme,
  title,
  description,
  roleLabel,
  profileLabel,
  titleFontFamily,
  sidebar,
  mobileNavSections = [],
  pathname,
  onNavigate,
  currentLang,
  onToggleLanguage,
  isDarkMode,
  onToggleDarkMode,
  statusNode,
  children,
}) {
  const [, setClockTick] = useState(0);
  const clockLabel = formatClockLabel(currentLang);
  const t = i18n.getFixedT(currentLang === 'en' ? 'en' : 'vi');

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setClockTick((tick) => tick + 1);
    }, 60000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const mobileNavItems = mobileNavSections.flatMap((section) => section.items);

  return (
    <div className={cn('relative h-screen overflow-hidden', theme.root)}>
      <div className={cn('pointer-events-none absolute inset-0 opacity-90', theme.canvas)} />
      <div className={cn('pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full blur-3xl', theme.orbPrimary)} />
      <div className={cn('pointer-events-none absolute right-[-7rem] top-20 h-[24rem] w-[24rem] rounded-full blur-3xl', theme.orbSecondary)} />
      <div className={cn('pointer-events-none absolute bottom-[-10rem] left-[18%] h-[22rem] w-[22rem] rounded-full blur-3xl', theme.orbTertiary)} />

      <div className="relative z-10 flex h-full gap-4 p-3 md:p-4">
        <div className="hidden shrink-0 self-start lg:block">
          <div className="sticky top-3">{sidebar}</div>
        </div>

        <div className="flex min-w-0 min-h-0 flex-1 flex-col gap-4">
          <header className={cn('sticky top-3 z-20 overflow-hidden rounded-[30px] border px-5 py-4 backdrop-blur-xl', theme.topbar)}>
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.1),transparent_55%)] opacity-70" />

            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]', theme.accentSoft)}>
                    {roleLabel}
                  </span>
                  <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em]', theme.control)}>
                    {t('backofficeShell.controlPlane', {
                      defaultValue: 'QuizMate control plane',
                    })}
                  </span>
                </div>

                <h1
                  className={cn('mt-3 text-2xl font-semibold tracking-tight md:text-[2rem]', theme.textPrimary)}
                  style={titleFontFamily ? { fontFamily: titleFontFamily } : undefined}
                >
                  {title}
                </h1>
                <p className={cn('mt-2 max-w-3xl text-sm leading-6 md:text-[15px]', theme.textMuted)}>
                  {description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {statusNode}

                <div className={cn('hidden items-center gap-2 rounded-2xl px-3 py-2 text-sm md:flex', theme.control)}>
                  <Clock3 className="h-4 w-4" />
                  <span>{clockLabel}</span>
                </div>

                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className={cn('inline-flex h-11 w-11 items-center justify-center rounded-2xl transition-all', theme.control)}
                  title={isDarkMode
                    ? t('common.lightMode', { defaultValue: 'Light mode' })
                    : t('common.darkMode', { defaultValue: 'Dark mode' })}
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={onToggleLanguage}
                  className={cn('inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-medium transition-all', theme.control)}
                  title={t('common.switchLanguage', { defaultValue: 'Switch language' })}
                >
                  <Globe className="h-4 w-4" />
                  <span>{currentLang === 'vi' ? 'VI' : 'EN'}</span>
                </button>

                <div className={cn('flex items-center gap-3 rounded-[22px] px-3 py-2', theme.profileCard)}>
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-[18px] bg-gradient-to-br font-black text-sm', theme.profileGradient)}>
                    {getInitials(profileLabel)}
                  </div>
                  <div className="hidden min-w-0 sm:block">
                    <p className={cn('truncate text-sm font-semibold', theme.textPrimary)}>{profileLabel}</p>
                    <p className={cn('truncate text-xs uppercase tracking-[0.18em]', theme.subtleText)}>
                      {roleLabel}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {mobileNavItems.length > 0 ? (
            <div className="lg:hidden">
              <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
                {mobileNavItems.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => onNavigate(item.path)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition-all',
                      isPathActive(item, pathname) ? theme.mobileItemActive : theme.mobileItem
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <main className="min-h-0 flex-1 overflow-y-auto pb-2">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default BackofficeShell;
