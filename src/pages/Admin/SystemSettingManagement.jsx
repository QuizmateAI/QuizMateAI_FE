import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  Edit2,
  Settings2,
  X,
  RefreshCcw,
  Search,
  Coins,
  LayoutGrid,
  CalendarDays,
  UserRound,
  SlidersHorizontal,
  Clock3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import ListSpinner from '@/components/ui/ListSpinner';
import SystemSettingEditDialog from './components/SystemSettingEditDialog';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { cn } from '@/lib/utils';
import {
  getAllSystemSettings,
  updateSystemSetting,
  resyncCreditPackagePrices,
} from '@/api/ManagementSystemAPI';

const FILTER_ORDER = ['all', 'pricing', 'workspace', 'plan', 'user', 'other'];
const CATEGORY_PRIORITY = {
  pricing: 0,
  workspace: 1,
  plan: 2,
  user: 3,
  other: 4,
};

const CATEGORY_META = {
  pricing: {
    icon: Coins,
    iconClass: 'text-amber-600 dark:text-amber-300',
    iconBg: 'bg-amber-100 dark:bg-amber-500/10',
    chipClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200',
  },
  workspace: {
    icon: LayoutGrid,
    iconClass: 'text-cyan-600 dark:text-cyan-300',
    iconBg: 'bg-cyan-100 dark:bg-cyan-500/10',
    chipClass: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200',
  },
  plan: {
    icon: CalendarDays,
    iconClass: 'text-emerald-600 dark:text-emerald-300',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/10',
    chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200',
  },
  user: {
    icon: UserRound,
    iconClass: 'text-rose-600 dark:text-rose-300',
    iconBg: 'bg-rose-100 dark:bg-rose-500/10',
    chipClass: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200',
  },
  other: {
    icon: SlidersHorizontal,
    iconClass: 'text-slate-600 dark:text-slate-300',
    iconBg: 'bg-slate-100 dark:bg-slate-500/10',
    chipClass: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
};

const FILTER_META = {
  all: {
    icon: Settings2,
    iconClass: 'text-slate-600 dark:text-slate-300',
  },
  ...CATEGORY_META,
};

const FILTER_ACTIVE_STYLES = {
  all: {
    light:
      'border-indigo-300/80 bg-gradient-to-br from-indigo-50 to-white text-indigo-950 shadow-md shadow-indigo-900/10 ring-1 ring-indigo-200/60',
    dark:
      'border-indigo-500/40 bg-indigo-500/15 text-indigo-50 shadow-md shadow-black/20 ring-1 ring-indigo-400/25',
  },
  pricing: {
    light: 'border-amber-300/80 bg-gradient-to-br from-amber-50 to-white text-amber-950 shadow-md shadow-amber-900/10 ring-1 ring-amber-200/60',
    dark: 'border-amber-500/40 bg-amber-500/15 text-amber-50 shadow-md shadow-black/20 ring-1 ring-amber-400/20',
  },
  workspace: {
    light: 'border-cyan-300/80 bg-gradient-to-br from-cyan-50 to-white text-cyan-950 shadow-md shadow-cyan-900/10 ring-1 ring-cyan-200/60',
    dark: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-50 shadow-md shadow-black/20 ring-1 ring-cyan-400/20',
  },
  plan: {
    light: 'border-emerald-300/80 bg-gradient-to-br from-emerald-50 to-white text-emerald-950 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-200/60',
    dark: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-50 shadow-md shadow-black/20 ring-1 ring-emerald-400/20',
  },
  user: {
    light: 'border-rose-300/80 bg-gradient-to-br from-rose-50 to-white text-rose-950 shadow-md shadow-rose-900/10 ring-1 ring-rose-200/60',
    dark: 'border-rose-500/40 bg-rose-500/15 text-rose-50 shadow-md shadow-black/20 ring-1 ring-rose-400/20',
  },
  other: {
    light: 'border-slate-300/80 bg-gradient-to-br from-slate-50 to-white text-slate-900 shadow-md shadow-slate-900/8 ring-1 ring-slate-200/80',
    dark: 'border-slate-500/40 bg-slate-800/80 text-slate-100 shadow-md shadow-black/20 ring-1 ring-slate-500/30',
  },
};

function extractData(response) {
  return response?.data?.data ?? response?.data ?? response ?? [];
}

function getValueFormat(key = '') {
  if (key.endsWith('_percent') || key.includes('.percent')) return 'percent';
  if (key.endsWith('_vnd') || key.includes('.vnd')) return 'vnd';
  return 'number';
}

const SYSTEM_SETTINGS_QUERY_KEY = ['admin', 'systemSettings'];

function getSettingCategory(key = '') {
  if (
    key.startsWith('credit.')
    || key.endsWith('_vnd')
    || key.includes('.price')
  ) {
    return 'pricing';
  }

  if (key.startsWith('user.')) {
    return 'user';
  }

  if (key.includes('.plan.') || key.includes('.duration')) {
    return 'plan';
  }

  if (key.startsWith('workspace.')) {
    return 'workspace';
  }

  return 'other';
}

function SystemSettingManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { permissions, loading: permLoading } = useAdminPermissions();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const dk = isDarkMode;
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  const canWrite = !permLoading && permissions.has('system-settings:write');
  const canResync = !permLoading && permissions.has('credit-package:write');

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const [editOpen, setEditOpen] = useState(false);
  const [editSetting, setEditSetting] = useState(null);
  const [editValue, setEditValue] = useState('');

  const [resyncOpen, setResyncOpen] = useState(false);

  const {
    data,
    isLoading: loading,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey: SYSTEM_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const response = await getAllSystemSettings();
      const list = extractData(response);
      return Array.isArray(list) ? list : [];
    },
  });

  const settings = useMemo(() => data ?? [], [data]);

  const error = queryError ? getErrorMessage(queryError) : '';

  const invalidateSettings = () =>
    queryClient.invalidateQueries({ queryKey: SYSTEM_SETTINGS_QUERY_KEY });

  const formatValue = useCallback((key, value) => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return value == null || value === '' ? '-' : String(value);
    }

    const valueFormat = getValueFormat(key);

    if (valueFormat === 'percent') {
      return `${numericValue.toLocaleString(locale)}%`;
    }

    if (valueFormat === 'vnd') {
      return `${numericValue.toLocaleString(locale)} VND`;
    }

    return numericValue.toLocaleString(locale);
  }, [locale]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';

    try {
      return new Date(dateStr).toLocaleString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getFormatLabel = (key) => {
    const valueFormat = getValueFormat(key);
    if (valueFormat === 'percent') return t('systemSettings.typePercent');
    if (valueFormat === 'vnd') return t('systemSettings.typeCurrency');
    return t('systemSettings.typeNumber');
  };

  const getInputHint = (key) => {
    const valueFormat = getValueFormat(key);
    if (valueFormat === 'percent') return t('systemSettings.editInputHintPercent');
    if (valueFormat === 'vnd') return t('systemSettings.editInputHintCurrency');
    return t('systemSettings.editInputHintNumber');
  };

  const normalizedSettings = useMemo(() => (
    [...settings]
      .map((setting) => ({
        ...setting,
        category: getSettingCategory(setting.key),
        valueFormat: getValueFormat(setting.key),
      }))
      .sort((left, right) => {
        const categoryDiff = (CATEGORY_PRIORITY[left.category] ?? 99) - (CATEGORY_PRIORITY[right.category] ?? 99);
        if (categoryDiff !== 0) return categoryDiff;
        return String(left.key || '').localeCompare(String(right.key || ''), locale);
      })
  ), [settings, locale]);

  const countsByCategory = useMemo(() => normalizedSettings.reduce((accumulator, setting) => {
    accumulator[setting.category] = (accumulator[setting.category] || 0) + 1;
    return accumulator;
  }, {}), [normalizedSettings]);

  const filteredSettings = useMemo(() => {
    const searchQuery = searchTerm.trim().toLowerCase();

    return normalizedSettings.filter((setting) => {
      const matchesFilter = activeFilter === 'all' || setting.category === activeFilter;

      if (!matchesFilter) return false;
      if (!searchQuery) return true;

      const haystack = [
        setting.key,
        setting.description,
        setting.value,
        formatValue(setting.key, setting.value),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(searchQuery);
    });
  }, [activeFilter, normalizedSettings, searchTerm, formatValue]);

  const latestUpdatedSetting = useMemo(() => normalizedSettings.reduce((latest, setting) => {
    const currentTime = new Date(setting.updatedAt || 0).getTime();
    if (!latest) return setting;
    const latestTime = new Date(latest.updatedAt || 0).getTime();
    return currentTime > latestTime ? setting : latest;
  }, null), [normalizedSettings]);

  const filterItems = FILTER_ORDER.map((filterKey) => ({
    key: filterKey,
    count: filterKey === 'all' ? normalizedSettings.length : countsByCategory[filterKey] || 0,
    label: t(`systemSettings.filters.${filterKey}`),
  }));

  const openEdit = (setting) => {
    setEditSetting(setting);
    setEditValue(setting.value == null ? '' : String(setting.value));
    setEditOpen(true);
  };

  const closeEdit = (open) => {
    setEditOpen(open);
    if (!open) {
      setEditSetting(null);
      setEditValue('');
    }
  };

  const saveMutation = useMutation({
    mutationFn: ({ key, value }) => updateSystemSetting(key, { value }),
    onSuccess: () => {
      showSuccess(t('systemSettings.updateSuccess'));
      closeEdit(false);
      invalidateSettings();
    },
    onError: (err) => {
      showError(getErrorMessage(err));
    },
  });

  const resyncMutation = useMutation({
    mutationFn: () => resyncCreditPackagePrices(),
    onSuccess: () => {
      showSuccess(t('systemSettings.resyncSuccess'));
      setResyncOpen(false);
    },
    onError: (err) => {
      showError(getErrorMessage(err));
    },
  });

  const saving = saveMutation.isPending;
  const resyncing = resyncMutation.isPending;

  const handleSave = () => {
    if (!editSetting) return;
    saveMutation.mutate({ key: editSetting.key, value: editValue });
  };

  const handleResync = () => {
    resyncMutation.mutate();
  };

  const panelClass = dk ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200 bg-white';
  const borderClass = dk ? 'border-slate-800' : 'border-slate-200';
  const subtlePanelClass = dk ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50/80';
  const mutedTextClass = dk ? 'text-slate-400' : 'text-slate-500';
  const strongTextClass = dk ? 'text-white' : 'text-slate-900';
  const activeFilterLabel = filterItems.find((item) => item.key === activeFilter)?.label ?? t('systemSettings.filters.all');

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1600px] space-y-8 p-4 sm:p-6',
        fontClass,
        dk ? '' : 'bg-gradient-to-b from-slate-50/90 via-white to-slate-50/40 sm:rounded-2xl'
      )}
    >
      <section className="space-y-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border',
                dk ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50'
              )}
              >
                <Settings2 className={cn('h-5 w-5', dk ? 'text-cyan-300' : 'text-cyan-700')} />
              </div>

              <div className="space-y-1">
                <h1 className={cn('text-3xl font-black tracking-tight', strongTextClass)}>
                  {t('systemSettings.title')}
                </h1>
                <p className={cn('text-sm leading-6', mutedTextClass)}>
                  {t('systemSettings.subtitle')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {latestUpdatedSetting && (
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    dk ? 'border-slate-700 bg-slate-950 text-slate-300' : 'border-slate-200 bg-white text-slate-600'
                  )}
                >
                  <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                  {t('systemSettings.latestUpdate', {
                    date: formatDate(latestUpdatedSetting.updatedAt),
                  })}
                </Badge>
              )}

              <Badge
                variant="outline"
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  dk ? 'border-slate-700 bg-slate-950 text-slate-300' : 'border-slate-200 bg-white text-slate-600'
                )}
              >
                {t('systemSettings.registrySubtitle', {
                  count: filteredSettings.length,
                  total: normalizedSettings.length,
                })}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canResync && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResyncOpen(true)}
                className={cn(
                  'h-9 rounded-lg px-3',
                  dk
                    ? 'border-amber-500/20 bg-slate-950 text-amber-300 hover:bg-amber-500/10'
                    : 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50'
                )}
              >
                <RefreshCcw className="h-4 w-4" />
                {t('systemSettings.resyncPrices')}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={invalidateSettings}
              disabled={isFetching}
              className={cn(
                'h-9 rounded-lg px-3',
                dk ? 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50'
              )}
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              {t('systemSettings.refresh')}
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <section
        className={cn(
          'overflow-hidden rounded-2xl border shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)]',
          panelClass
        )}
      >
        <div className={cn('border-b px-4 py-5 sm:px-6', borderClass)}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-1.5">
              <h2 className={cn('text-xl font-bold tracking-tight', strongTextClass)}>
                {t('systemSettings.registryTitle')}
              </h2>
              <p className={cn('text-sm leading-relaxed', mutedTextClass)}>
                {t('systemSettings.registrySubtitle', {
                  count: filteredSettings.length,
                  total: normalizedSettings.length,
                })}
              </p>
            </div>

            <div className="w-full xl:max-w-md">
              <div className="relative">
                <Search className={cn('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', mutedTextClass)} />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('systemSettings.searchPlaceholder')}
                  className={cn(
                    'h-11 rounded-xl border pl-10 shadow-sm transition-shadow focus-visible:ring-2',
                    dk
                      ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/30'
                      : 'border-slate-200/90 bg-white focus-visible:ring-slate-400/25'
                  )}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {filterItems.map((filter) => {
                const isActive = activeFilter === filter.key;
                const filterMeta = FILTER_META[filter.key] || FILTER_META.other;
                const FilterIcon = filterMeta.icon;
                const activeTone = FILTER_ACTIVE_STYLES[filter.key] || FILTER_ACTIVE_STYLES.other;

                return (
                  <button
                    key={filter.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveFilter(filter.key)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-all duration-200',
                      filter.count === 0 && !isActive && 'opacity-60',
                      isActive
                        ? (dk ? activeTone.dark : activeTone.light)
                        : dk
                          ? 'border-slate-700/90 bg-slate-950/80 text-slate-300 hover:border-slate-600 hover:bg-slate-900'
                          : 'border-slate-200/90 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <FilterIcon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isActive && filter.key === 'all'
                          ? (dk ? 'text-indigo-200' : 'text-indigo-700')
                          : filterMeta.iconClass
                      )}
                    />
                    <span>{filter.label}</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                        isActive
                          ? dk
                            ? 'bg-black/25 text-current'
                            : 'bg-black/[0.06] text-current'
                          : dk
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {filter.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <Badge
              variant="outline"
              className={cn(
                'w-fit rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm',
                dk ? 'border-slate-700 bg-slate-950 text-slate-300' : 'border-slate-200 bg-white text-slate-600'
              )}
            >
              {activeFilterLabel}
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <ListSpinner />
          </div>
        ) : normalizedSettings.length === 0 ? (
          <div className={cn('px-6 py-20 text-center text-sm', mutedTextClass)}>
            {t('systemSettings.empty')}
          </div>
        ) : filteredSettings.length === 0 ? (
          <div className={cn('px-6 py-20 text-center text-sm', mutedTextClass)}>
            {t('systemSettings.noMatches')}
          </div>
        ) : (
          <>
            <div className={cn('divide-y md:hidden', borderClass)}>
              {filteredSettings.map((setting) => {
                const categoryMeta = CATEGORY_META[setting.category] || CATEGORY_META.other;
                const CategoryIcon = categoryMeta.icon;
                const formatLabel = getFormatLabel(setting.key);

                return (
                  <article key={setting.key} className="space-y-4 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', categoryMeta.iconBg)}>
                          <CategoryIcon className={cn('h-5 w-5', categoryMeta.iconClass)} />
                        </div>

                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <code className={cn(
                              'inline-flex max-w-full rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold',
                              dk ? 'border-slate-700 bg-slate-950 text-cyan-200' : 'border-slate-200 bg-slate-50 text-cyan-700'
                            )}
                            >
                              {setting.key}
                            </code>
                            <Badge variant="outline" className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', categoryMeta.chipClass)}>
                              {t(`systemSettings.categories.${setting.category}`)}
                            </Badge>
                          </div>

                          <p className={cn('text-sm leading-6', mutedTextClass)}>
                            {setting.description || t('systemSettings.noDescription')}
                          </p>
                        </div>
                      </div>

                      {canWrite && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(setting)}
                          title={t('systemSettings.edit')}
                          aria-label={t('systemSettings.edit')}
                          className={cn(
                            'h-9 w-9 shrink-0 rounded-lg border shadow-none',
                            dk ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          )}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className={cn('rounded-lg border px-3 py-3', subtlePanelClass)}>
                        <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedTextClass)}>
                          {t('systemSettings.colType')}
                        </p>
                        <p className={cn('mt-2 text-sm font-medium', strongTextClass)}>
                          {formatLabel}
                        </p>
                      </div>

                      <div className={cn('rounded-lg border px-3 py-3', subtlePanelClass)}>
                        <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedTextClass)}>
                          {t('systemSettings.colValue')}
                        </p>
                        <p className={cn('mt-2 text-lg font-semibold tabular-nums', strongTextClass)}>
                          {formatValue(setting.key, setting.value)}
                        </p>
                      </div>
                    </div>

                    <div className={cn('rounded-lg border px-3 py-3', subtlePanelClass)}>
                      <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedTextClass)}>
                        {t('systemSettings.colUpdatedAt')}
                      </p>
                      <p className={cn('mt-2 text-sm', strongTextClass)}>
                        {formatDate(setting.updatedAt)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden md:block">
              <Table className="min-w-[980px] table-fixed">
                <colgroup>
                  <col style={{ width: canWrite ? '46%' : '50%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: canWrite ? '16%' : '18%' }} />
                  {canWrite && <col style={{ width: '6%' }} />}
                </colgroup>
                <TableHeader>
                  <TableRow className={cn(dk ? 'border-slate-800 bg-slate-800/60' : 'bg-slate-50')}>
                    <TableHead className={cn('h-11 font-semibold', dk ? 'text-slate-200' : 'text-slate-700')}>
                      {t('systemSettings.colSetting')}
                    </TableHead>
                    <TableHead className={cn('h-11 font-semibold', dk ? 'text-slate-200' : 'text-slate-700')}>
                      {t('systemSettings.colType')}
                    </TableHead>
                    <TableHead className={cn('h-11 text-right font-semibold', dk ? 'text-slate-200' : 'text-slate-700')}>
                      {t('systemSettings.colValue')}
                    </TableHead>
                    <TableHead className={cn('h-11 font-semibold', dk ? 'text-slate-200' : 'text-slate-700')}>
                      {t('systemSettings.colUpdatedAt')}
                    </TableHead>
                    {canWrite && (
                      <TableHead className={cn('h-11 text-center font-semibold', dk ? 'text-slate-200' : 'text-slate-700')}>
                        {t('systemSettings.colActions')}
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSettings.map((setting) => {
                    const categoryMeta = CATEGORY_META[setting.category] || CATEGORY_META.other;
                    const CategoryIcon = categoryMeta.icon;
                    const formatLabel = getFormatLabel(setting.key);

                    return (
                      <TableRow
                        key={setting.key}
                        className={cn(
                          'group',
                          dk ? 'border-slate-800/80 hover:bg-slate-800/40' : 'border-slate-200/80 hover:bg-slate-50/80'
                        )}
                      >
                        <TableCell className="py-5">
                          <div className="flex items-start gap-3">
                            <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', categoryMeta.iconBg)}>
                              <CategoryIcon className={cn('h-5 w-5', categoryMeta.iconClass)} />
                            </div>

                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <code className={cn(
                                  'inline-flex max-w-full rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold',
                                  dk ? 'border-slate-700 bg-slate-950 text-cyan-200' : 'border-slate-200 bg-slate-50 text-cyan-700'
                                )}
                                >
                                  {setting.key}
                                </code>
                                <Badge variant="outline" className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', categoryMeta.chipClass)}>
                                  {t(`systemSettings.categories.${setting.category}`)}
                                </Badge>
                              </div>

                              <p className={cn('max-w-2xl text-sm leading-6', mutedTextClass)}>
                                {setting.description || t('systemSettings.noDescription')}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-5">
                          <Badge
                            variant="outline"
                            className={cn(
                              'rounded-full border px-2.5 py-1 text-xs font-semibold',
                              dk ? 'border-slate-700 bg-slate-950 text-slate-200' : 'border-slate-200 bg-slate-100 text-slate-700'
                            )}
                          >
                            {formatLabel}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-5 text-right">
                          <p className={cn('text-lg font-semibold tabular-nums', strongTextClass)}>
                            {formatValue(setting.key, setting.value)}
                          </p>
                        </TableCell>

                        <TableCell className={cn('py-5 text-sm', mutedTextClass)}>
                          {formatDate(setting.updatedAt)}
                        </TableCell>

                        {canWrite && (
                          <TableCell className="py-5 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(setting)}
                              title={t('systemSettings.edit')}
                              aria-label={t('systemSettings.edit')}
                              className={cn(
                                'mx-auto h-9 w-9 rounded-lg border shadow-none',
                                dk ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              )}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <Dialog open={resyncOpen} onOpenChange={setResyncOpen}>
        <DialogContent className={cn('overflow-hidden rounded-xl border p-0 sm:max-w-lg', dk ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white')}>
          <div className="space-y-5 p-6">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="flex items-center gap-2">
                <RefreshCcw className="h-5 w-5 text-amber-500" />
                {t('systemSettings.resyncPrices')}
              </DialogTitle>
              <DialogDescription>
                {t('systemSettings.resyncDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className={cn('rounded-xl border px-4 py-4 text-sm leading-6', subtlePanelClass)}>
              {t('systemSettings.resyncDescription')}
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setResyncOpen(false)}
                disabled={resyncing}
                className={cn(
                  'rounded-lg',
                  dk ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <X className="h-4 w-4" />
                {t('systemSettings.cancel')}
              </Button>
              <Button
                onClick={handleResync}
                disabled={resyncing}
                className="rounded-lg bg-amber-500 text-white hover:bg-amber-600"
              >
                <RefreshCcw className={cn('h-4 w-4', resyncing && 'animate-spin')} />
                {resyncing ? t('systemSettings.resyncing') : t('systemSettings.resyncConfirm')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <SystemSettingEditDialog
        open={editOpen}
        onOpenChange={closeEdit}
        setting={editSetting}
        value={editValue}
        onValueChange={setEditValue}
        saving={saving}
        onSave={handleSave}
        onCancel={() => closeEdit(false)}
        isDarkMode={dk}
        t={t}
        formatValue={formatValue}
        getFormatLabel={getFormatLabel}
        getInputHint={getInputHint}
        getValueFormat={getValueFormat}
        categoryMeta={editSetting ? (CATEGORY_META[editSetting.category] || CATEGORY_META.other) : CATEGORY_META.other}
      />
    </div>
  );
}

export default SystemSettingManagement;
