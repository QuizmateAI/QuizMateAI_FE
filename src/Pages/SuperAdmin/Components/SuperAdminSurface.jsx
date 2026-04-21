import { Search } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { cn } from '@/lib/utils';

const METRIC_TONE_CLASS = {
  blue: {
    light: 'bg-[#EEF4FF] text-[#0455BF]',
    dark: 'bg-[#0B1731] text-sky-300',
  },
  emerald: {
    light: 'bg-emerald-50 text-emerald-700',
    dark: 'bg-emerald-500/10 text-emerald-300',
  },
  amber: {
    light: 'bg-amber-50 text-amber-700',
    dark: 'bg-amber-500/10 text-amber-300',
  },
  rose: {
    light: 'bg-rose-50 text-rose-700',
    dark: 'bg-rose-500/10 text-rose-300',
  },
  slate: {
    light: 'bg-slate-100 text-slate-700',
    dark: 'bg-slate-800 text-slate-200',
  },
};

export function SuperAdminPage({ className = '', children }) {
  return (
    <div
      data-sa-page
      className={cn(
        'mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-6 pb-8 pt-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SuperAdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = '',
}) {
  return (
    <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className={cn(
          'font-black tracking-[-0.05em] text-slate-950 dark:text-white',
          eyebrow ? 'mt-1.5 text-[1.85rem]' : 'text-[1.7rem]',
        )}>
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SuperAdminPanel({
  title,
  description,
  action,
  className = '',
  contentClassName = '',
  children,
}) {
  return (
    <section
      data-sa-panel
      className={cn(
        'overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.32)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/88',
        className,
      )}
    >
      {(title || description || action) ? (
        <div className="flex flex-col gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-800/90 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-[1.05rem] font-bold tracking-[-0.03em] text-slate-950 dark:text-white">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn('px-6 py-5', contentClassName)}>{children}</div>
    </section>
  );
}

export function SuperAdminMetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'blue',
  isDarkMode = false,
  className = '',
}) {
  const toneClass = METRIC_TONE_CLASS[tone] || METRIC_TONE_CLASS.blue;

  return (
    <div
      data-sa-metric
      className={cn(
        'rounded-[26px] border border-slate-200/80 bg-white/94 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950/90',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-[1.9rem] font-black tracking-[-0.05em] text-slate-950 dark:text-white">
            {value}
          </p>
          {helper ? (
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{helper}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              'rounded-2xl p-3 shadow-inner',
              isDarkMode ? toneClass.dark : toneClass.light,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SuperAdminToolbar({ children, className = '' }) {
  return (
    <div
      data-sa-toolbar
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-[24px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/88',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SuperAdminSearchField({ className = '', ...props }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        {...props}
        className={cn(
          'h-11 rounded-2xl border-slate-200 bg-white pl-10 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:ring-[#0455BF] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500',
          props.className,
        )}
      />
    </div>
  );
}

export function SuperAdminSelectButton({ label, value, className = '' }) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'h-10 rounded-2xl border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
        className,
      )}
    >
      <span className="text-slate-400 dark:text-slate-500">{label}</span>
      <span className="ml-2 font-semibold text-slate-900 dark:text-white">{value}</span>
    </Button>
  );
}

export function SuperAdminTabs({ tabs, active, onChange, className = '' }) {
  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-[20px] border border-slate-200/80 bg-white/92 p-1 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/88',
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors',
            active === tab.id
              ? 'bg-[#0455BF] text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function SuperAdminEmptyState({ title, description, className = '' }) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900/60',
        className,
      )}
    >
      <p className="text-base font-semibold text-slate-800 dark:text-slate-200">{title}</p>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}

export function getSuperAdminStatusBadgeClass(status, isDarkMode) {
  const normalized = String(status || '').toUpperCase();

  if (['ACTIVE', 'ONLINE', 'HEALTHY', 'SUCCESS', 'COMPLETED'].includes(normalized)) {
    return isDarkMode
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (['PENDING', 'PROCESSING', 'DEGRADED', 'DRAFT'].includes(normalized)) {
    return isDarkMode
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      : 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (['FAILED', 'ERROR', 'SUSPENDED', 'BANNED', 'UNREACHABLE'].includes(normalized)) {
    return isDarkMode
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      : 'border-rose-200 bg-rose-50 text-rose-700';
  }

  return isDarkMode
    ? 'border-slate-700 bg-slate-800 text-slate-300'
    : 'border-slate-200 bg-slate-100 text-slate-700';
}
