import { useMemo, useState } from 'react';
import { ChevronDown, DollarSign, Filter, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const EMPTY_FILTERS = {
  provider: '',
  modelGroup: '',
  status: '',
  search: '',
};

function countActiveFilters(filters) {
  return Object.entries(EMPTY_FILTERS).filter(([key, emptyValue]) => filters[key] !== emptyValue).length;
}

export default function AiModelsFilterPanel({
  filters,
  setFilters,
  providerOptions,
  groupOptions,
  statusOptions,
  exchangeRate,
  exchangeRateLoading,
  onRefreshExchangeRate,
  formatExchangeRate,
  formatDateTime,
  locale,
  isDarkMode,
  t,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const labelClass = isDarkMode ? 'text-slate-300' : 'text-slate-600';
  const fieldClass = isDarkMode
    ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500'
    : 'border-slate-200 bg-white text-slate-900';
  const cardClass = isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm';
  const dialogClass = isDarkMode
    ? 'border-slate-800 bg-slate-950 text-white'
    : 'border-slate-200 bg-white text-slate-950';
  const rateMeta = [
    exchangeRate?.source || t('aiModels.exchangeRate.unknown'),
    exchangeRate?.fetchedAt ? formatDateTime(exchangeRate.fetchedAt, locale) : null,
  ].filter(Boolean).join(' - ');

  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (open) {
      setDraftFilters(filters);
    }
  };

  const updateDraftFilter = (name, value) => {
    setDraftFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setFilters(draftFilters);
    setIsOpen(false);
  };

  const resetDraftFilters = () => {
    setDraftFilters({ ...EMPTY_FILTERS });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <div className={cn('rounded-2xl border p-5', cardClass)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className={cn('rounded-2xl p-3', isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50')}>
              <DollarSign className={cn('h-5 w-5', isDarkMode ? 'text-emerald-300' : 'text-emerald-600')} />
            </div>
            <div className="min-w-0">
              <p className={cn(
                'text-xs font-semibold uppercase tracking-[0.18em]',
                isDarkMode ? 'text-slate-500' : 'text-slate-400',
              )}>
                {t('aiModels.exchangeRate.title')}
              </p>
              <p className={cn('mt-1 truncate text-2xl font-black tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {formatExchangeRate(exchangeRate?.rate)}
              </p>
              <p className={cn('mt-1 truncate text-xs', isDarkMode ? 'text-slate-400' : 'text-slate-500')} title={rateMeta}>
                {rateMeta}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onRefreshExchangeRate}
              disabled={exchangeRateLoading}
              className={cn(
                'h-10 w-10 rounded-xl',
                isDarkMode
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
              aria-label={t('aiModels.exchangeRate.refresh')}
              title={t('aiModels.exchangeRate.refresh')}
            >
              <RefreshCw className={cn('h-4 w-4', exchangeRateLoading ? 'animate-spin' : '')} />
            </Button>

            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'h-10 min-w-[150px] justify-between rounded-xl px-3 text-sm font-semibold',
                  isDarkMode
                    ? 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
              >
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {t('aiModels.filters.open', 'Filters')}
                  {activeFilterCount > 0 ? (
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      isDarkMode ? 'bg-sky-500/15 text-sky-200' : 'bg-sky-50 text-sky-700',
                    )}>
                      {activeFilterCount}
                    </span>
                  ) : null}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </div>
        </div>
      </div>

      <DialogContent className={cn('max-w-3xl gap-5 rounded-2xl p-0', dialogClass)}>
        <DialogHeader className={cn('border-b px-6 py-5', isDarkMode ? 'border-slate-800' : 'border-slate-100')}>
          <DialogTitle>{t('aiModels.filters.dialogTitle', 'Filter AI models')}</DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
            {t('aiModels.filters.dialogDescription', 'Search and filter the AI model list.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={applyFilters} className="space-y-5 px-6 pb-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label className={labelClass}>{t('aiModels.filters.search')}</Label>
              <Input
                value={draftFilters.search}
                onChange={(event) => updateDraftFilter('search', event.target.value)}
                placeholder={t('aiModels.filters.searchPlaceholder')}
                className={cn('mt-1.5', fieldClass)}
              />
            </div>

            <div>
              <Label className={labelClass}>{t('aiModels.filters.provider')}</Label>
              <select
                value={draftFilters.provider}
                onChange={(event) => updateDraftFilter('provider', event.target.value)}
                className={cn('mt-1.5 h-10 w-full rounded-lg border px-3 text-sm', fieldClass)}
              >
                <option value="">{t('aiModels.filters.allProviders')}</option>
                {providerOptions.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>

            <div>
              <Label className={labelClass}>{t('aiModels.filters.group')}</Label>
              <select
                value={draftFilters.modelGroup}
                onChange={(event) => updateDraftFilter('modelGroup', event.target.value)}
                className={cn('mt-1.5 h-10 w-full rounded-lg border px-3 text-sm', fieldClass)}
              >
                <option value="">{t('aiModels.filters.allGroups')}</option>
                {groupOptions.map((option) => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}
              </select>
            </div>

            <div>
              <Label className={labelClass}>{t('aiModels.filters.status')}</Label>
              <select
                value={draftFilters.status}
                onChange={(event) => updateDraftFilter('status', event.target.value)}
                className={cn('mt-1.5 h-10 w-full rounded-lg border px-3 text-sm', fieldClass)}
              >
                <option value="">{t('aiModels.filters.allStatuses')}</option>
                {statusOptions.map((option) => <option key={option} value={option}>{t(`aiModels.status.${option}`)}</option>)}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={resetDraftFilters}
              className={cn(
                'rounded-xl',
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : '',
              )}
            >
              <X className="mr-2 h-4 w-4" />
              {t('aiModels.filters.reset', 'Reset')}
            </Button>
            <Button type="submit" className="rounded-xl bg-[#0455BF] px-4 text-white hover:bg-[#03449a]">
              <Search className="mr-2 h-4 w-4" />
              {t('aiModels.filters.searchAction', 'Search')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
