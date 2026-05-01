import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Bot,
  Coins,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ListSpinner from '@/components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  addAiModelPriceVersion,
  createAiModel,
  deleteAiModel,
  getAiModelOfficialPricing,
  getAiModels,
  getUsdVndExchangeRate,
  updateAiModel,
  updateAiModelStatus,
} from '@/api/ManagementSystemAPI';
import {
  AI_MODEL_GROUP_OPTIONS,
  AI_MODEL_STATUS_OPTIONS,
  filterSupportedAiModels,
  getAiModelGroupLabel,
  getAiModelGroupMeta,
} from '@/lib/aiModelCatalog';
import { cn } from '@/lib/utils';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
} from './Components/SuperAdminSurface';
import AiModelsFilterPanel from './Components/AiModelsFilterPanel';

const PROVIDER_OPTIONS = ['', 'OPENAI', 'GEMINI'];

const EMPTY_FORM = {
  provider: 'OPENAI',
  modelCode: '',
  displayName: '',
  modelGroup: 'TEXT_GENERATION',
  description: '',
  systemDefault: false,
};

const EMPTY_PRICE_FORM = {
  inputPriceUsdPer1M: '',
  outputPriceUsdPer1M: '',
};

function extractData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

/** BE LocalDateTime không offset = wall-clock VN — parse +07:00 khi thiếu zone (khớp Jackson). */
function parseApiDateTime(value) {
  if (value === null || value === undefined || value === '') return new Date(NaN);
  if (typeof value === 'number') return new Date(value);
  const s = String(value).trim();
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(s)
    && !/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)
  ) {
    return new Date(`${s}+07:00`);
  }
  return new Date(s);
}

/** Hiển thị theo giờ Việt Nam (ICT). */
function formatDateTime(value, locale = 'vi-VN') {
  if (!value) return '-';
  const parsed = parseApiDateTime(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(locale, {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '-';
  return `${Number(value).toLocaleString('vi-VN')} VND`;
}

function formatUsd(value) {
  if (value === null || value === undefined || value === '') return '-';
  return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 })}`;
}

function formatExchangeRate(value, maximumFractionDigits = 2) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toLocaleString('vi-VN', { maximumFractionDigits });
}

function formatCompactDateTime(value, locale = 'vi-VN') {
  if (!value) return '-';
  const parsed = parseApiDateTime(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(locale, {
    timeZone: 'Asia/Ho_Chi_Minh',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTimeParts(value, locale = 'vi-VN') {
  if (!value) return { time: '-', date: null };
  const parsed = parseApiDateTime(value);
  if (Number.isNaN(parsed.getTime())) return { time: value, date: null };
  const tz = { timeZone: 'Asia/Ho_Chi_Minh' };
  return {
    time: parsed.toLocaleTimeString(locale, {
      ...tz,
      hour: '2-digit',
      minute: '2-digit',
    }),
    date: parsed.toLocaleDateString(locale, {
      ...tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
  };
}

function convertUsdToVnd(usdValue, exchangeRate) {
  if (usdValue === null || usdValue === undefined || usdValue === '' || !exchangeRate) return null;
  return Number(usdValue) * Number(exchangeRate);
}

function getVersionTimestamp(version) {
  return version?.updatedAt || version?.createdAt || version?.effectiveFrom || version?.exchangeRateFetchedAt || null;
}

function getStatusBadgeClass(status, isDarkMode) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'ACTIVE') {
    return isDarkMode
      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (normalized === 'INACTIVE') {
    return isDarkMode
      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
      : 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return isDarkMode
    ? 'bg-slate-800 text-slate-300 border-slate-700'
    : 'bg-slate-100 text-slate-700 border-slate-200';
}

function getActivePriceVersion(model) {
  if (!Array.isArray(model?.priceVersions)) return null;
  return model.priceVersions.find((item) => item.activeNow) ?? model.priceVersions[0] ?? null;
}

function MetricCard({ label, value, icon: Icon, tone, isDarkMode, subtext }) {
  return (
    <div className={`rounded-2xl border p-5 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
          <p className={`mt-2 text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{value}</p>
          {subtext ? <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{subtext}</p> : null}
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function PricingSnapshotCard({ label, value, caption, isDarkMode }) {
  return (
    <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
      <p className={`mt-2 text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      {caption ? <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{caption}</p> : null}
    </div>
  );
}

function AiModelsManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { permissions, loading: permLoading } = useAdminPermissions();
  const { showSuccess, showError } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  const queryClient = useQueryClient();
  const canWrite = !permLoading && permissions.has('ai-model:write');
  const [filters, setFilters] = useState({ provider: '', modelGroup: '', status: '', search: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [pricingModel, setPricingModel] = useState(null);
  const [priceForm, setPriceForm] = useState({ ...EMPTY_PRICE_FORM });
  const [officialPricing, setOfficialPricing] = useState(null);
  const [officialPricingLoading, setOfficialPricingLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const AI_MODELS_QUERY_KEY = ['superAdmin', 'aiModels'];
  const AI_MODELS_RATE_KEY = ['superAdmin', 'aiModelsRate'];

  const modelsQuery = useQuery({
    queryKey: [...AI_MODELS_QUERY_KEY, filters.provider, filters.modelGroup, filters.status],
    queryFn: async () => {
      const response = await getAiModels({
        provider: filters.provider || undefined,
        modelGroup: filters.modelGroup || undefined,
        status: filters.status || undefined,
      });
      const responseData = extractData(response);
      return filterSupportedAiModels(Array.isArray(responseData) ? responseData : []);
    },
  });
  const models = modelsQuery.data ?? [];
  const loading = modelsQuery.isLoading;

  const exchangeRateQuery = useQuery({
    queryKey: AI_MODELS_RATE_KEY,
    queryFn: async () => extractData(await getUsdVndExchangeRate()),
  });
  const exchangeRate = exchangeRateQuery.data ?? null;
  const exchangeRateLoading = exchangeRateQuery.isFetching;

  const invalidateModels = () =>
    queryClient.invalidateQueries({ queryKey: AI_MODELS_QUERY_KEY });

  const filteredModels = models.filter((model) => {
    const term = filters.search.trim().toLowerCase();
    if (!term) return true;
    return [model.displayName, model.modelCode, model.provider, model.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  const activeCount = models.filter((item) => item.status === 'ACTIVE').length;
  const archivedCount = models.filter((item) => item.status === 'ARCHIVED').length;
  const assignedCount = models.filter((item) => Number(item.assignedPlanCount || 0) > 0).length;
  const pricingVersions = Array.isArray(pricingModel?.priceVersions) ? pricingModel.priceVersions : [];
  const activePricingVersion = getActivePriceVersion(pricingModel);
  const inputPreviewVnd = convertUsdToVnd(priceForm.inputPriceUsdPer1M || 0, exchangeRate?.rate);
  const outputPreviewVnd = convertUsdToVnd(priceForm.outputPriceUsdPer1M || 0, exchangeRate?.rate);

  const fetchOfficialPricing = async (modelId, { silent = false, applyToForm = false } = {}) => {
    if (!modelId) return null;
    setOfficialPricingLoading(true);
    try {
      const response = await getAiModelOfficialPricing(modelId);
      const data = extractData(response);
      setOfficialPricing(data);

      if (applyToForm && data?.supported) {
        setPriceForm((prev) => ({
          ...prev,
          inputPriceUsdPer1M: data.inputPriceUsdPer1M !== null && data.inputPriceUsdPer1M !== undefined ? String(data.inputPriceUsdPer1M) : prev.inputPriceUsdPer1M,
          outputPriceUsdPer1M: data.outputPriceUsdPer1M !== null && data.outputPriceUsdPer1M !== undefined ? String(data.outputPriceUsdPer1M) : prev.outputPriceUsdPer1M,
        }));
      }

      if (!silent && !data?.supported) {
        showError(data?.notes || t('aiModels.pricing.officialUnsupported', 'This model does not currently support official auto pricing.'));
      }

      return data;
    } catch (error) {
      setOfficialPricing(null);
      if (!silent) showError(getErrorMessage(t, error));
      return null;
    } finally {
      setOfficialPricingLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingModel(null);
    setFormData({ ...EMPTY_FORM });
    setIsFormOpen(true);
  };

  const openEditForm = (model) => {
    setEditingModel(model);
    setFormData({
      provider: model.provider || 'OPENAI',
      modelCode: model.modelCode || '',
      displayName: model.displayName || '',
      modelGroup: model.modelGroup || 'TEXT_GENERATION',
      description: model.description || '',
      systemDefault: Boolean(model.systemDefault),
    });
    setIsFormOpen(true);
  };

  const openPricingDialog = (model) => {
    setPricingModel(model);
    setPriceForm({ ...EMPTY_PRICE_FORM });
    setOfficialPricing(null);
    setIsPriceOpen(true);
    exchangeRateQuery.refetch();
    fetchOfficialPricing(model.aiModelId, { silent: true, applyToForm: true });
  };

  const saveModelMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      if (id != null) return updateAiModel(id, payload);
      return createAiModel(payload);
    },
    onSuccess: (_resp, { id }) => {
      showSuccess(id != null ? t('aiModels.messages.updateSuccess') : t('aiModels.messages.createSuccess'));
      setIsFormOpen(false);
      invalidateModels();
    },
    onError: (error) => showError(getErrorMessage(t, error)),
  });

  const priceVersionMutation = useMutation({
    mutationFn: ({ id, body }) => addAiModelPriceVersion(id, body),
    onSuccess: () => {
      showSuccess(t('aiModels.messages.priceSuccess'));
      setPriceForm({ ...EMPTY_PRICE_FORM });
      invalidateModels();
    },
    onError: (error) => showError(getErrorMessage(t, error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateAiModelStatus(id, status),
    onSuccess: () => {
      showSuccess(t('aiModels.messages.statusSuccess'));
      invalidateModels();
    },
    onError: (error) => showError(getErrorMessage(t, error)),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }) => deleteAiModel(id),
    onSuccess: () => {
      showSuccess(t('aiModels.messages.deleteSuccess'));
      setDeleteTarget(null);
      invalidateModels();
    },
    onError: (error) => showError(getErrorMessage(t, error)),
  });

  const submitting = saveModelMutation.isPending || priceVersionMutation.isPending
    || statusMutation.isPending || deleteMutation.isPending;

  const submitModelForm = (event) => {
    event.preventDefault();
    const payload = {
      provider: String(formData.provider || '').trim().toUpperCase(),
      modelCode: String(formData.modelCode || '').trim(),
      displayName: String(formData.displayName || '').trim(),
      modelGroup: formData.modelGroup,
      description: String(formData.description || '').trim() || null,
      systemDefault: Boolean(formData.systemDefault),
    };
    saveModelMutation.mutate({ id: editingModel?.aiModelId ?? null, payload });
  };

  const submitPriceVersion = (event) => {
    event.preventDefault();
    if (!pricingModel) return;
    priceVersionMutation.mutate({
      id: pricingModel.aiModelId,
      body: {
        inputPriceUsdPer1M: Number(priceForm.inputPriceUsdPer1M || 0),
        outputPriceUsdPer1M: Number(priceForm.outputPriceUsdPer1M || 0),
      },
    });
  };

  const toggleStatus = (model) => {
    const nextStatus = model.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    statusMutation.mutate({ id: model.aiModelId, status: nextStatus });
  };

  const archiveModel = (model) => {
    statusMutation.mutate({ id: model.aiModelId, status: 'ARCHIVED' });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.aiModelId });
  };

  return (
    <SuperAdminPage className={fontClass}>
      <SuperAdminPageHeader
        eyebrow="AI Governance"
        title={t('aiModels.title')}
        description={t('aiModels.subtitle')}
        actions={(
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={invalidateModels}
              disabled={modelsQuery.isFetching}
              className="h-10 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={t('aiModels.refresh')}
              title={t('aiModels.refresh')}
            >
              <RefreshCw className={`h-4 w-4 ${modelsQuery.isFetching ? 'animate-spin' : ''}`} />
            </Button>
            {canWrite ? (
              <Button onClick={openCreateForm} className="h-10 rounded-2xl bg-[#0455BF] px-4 text-white hover:bg-[#03449a]">
                <Plus className="mr-2 h-4 w-4" />
                {t('aiModels.add')}
              </Button>
            ) : null}
          </>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t('aiModels.stats.total')} value={models.length} icon={Bot} tone="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" isDarkMode={isDarkMode} subtext={t('aiModels.stats.totalHint')} />
        <MetricCard label={t('aiModels.stats.active')} value={activeCount} icon={Power} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" isDarkMode={isDarkMode} subtext={t('aiModels.stats.activeHint')} />
        <MetricCard label={t('aiModels.stats.assigned')} value={assignedCount} icon={ShieldCheck} tone="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" isDarkMode={isDarkMode} subtext={t('aiModels.stats.assignedHint')} />
        <MetricCard label={t('aiModels.stats.archived')} value={archivedCount} icon={Archive} tone="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" isDarkMode={isDarkMode} subtext={t('aiModels.stats.archivedHint')} />
      </div>

      <AiModelsFilterPanel
        filters={filters}
        setFilters={setFilters}
        providerOptions={PROVIDER_OPTIONS}
        groupOptions={AI_MODEL_GROUP_OPTIONS}
        statusOptions={AI_MODEL_STATUS_OPTIONS}
        exchangeRate={exchangeRate}
        exchangeRateLoading={exchangeRateLoading}
        onRefreshExchangeRate={() => exchangeRateQuery.refetch()}
        formatExchangeRate={formatExchangeRate}
        formatDateTime={formatDateTime}
        locale={locale}
        isDarkMode={isDarkMode}
        t={t}
      />

      <div className={`overflow-hidden rounded-2xl border ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'}`}>
        <Table className="table-fixed min-w-[1040px] xl:min-w-full">
          <colgroup>
            <col className={canWrite ? 'w-[24%]' : 'w-[30%]'} />
            <col className={canWrite ? 'w-[15%]' : 'w-[18%]'} />
            <col className={canWrite ? 'w-[12%]' : 'w-[13%]'} />
            <col className={canWrite ? 'w-[12%]' : 'w-[13%]'} />
            <col className={canWrite ? 'w-[17%]' : 'w-[16%]'} />
            <col className={canWrite ? 'w-[11%]' : 'w-[10%]'} />
            {canWrite ? <col className="w-[9%]" /> : null}
          </colgroup>
          <TableHeader>
            <TableRow className={cn(
              isDarkMode ? 'border-slate-800 bg-slate-800/50' : 'bg-slate-50',
              isDarkMode ? '[&>th+th]:border-slate-800' : '[&>th+th]:border-slate-200/80',
              '[&>th+th]:border-l',
            )}>
              <TableHead className="text-left align-middle font-semibold">{t('aiModels.table.model')}</TableHead>
              <TableHead className="text-left align-middle font-semibold">{t('aiModels.table.group')}</TableHead>
              <TableHead className="text-left align-middle font-semibold">{t('aiModels.table.input', 'Input')}</TableHead>
              <TableHead className="text-left align-middle font-semibold">{t('aiModels.table.output', 'Output')}</TableHead>
              <TableHead className="text-left align-middle font-semibold">{t('aiModels.table.assignedPlans')}</TableHead>
              <TableHead className="text-left align-middle font-semibold">{t('aiModels.table.status')}</TableHead>
              {canWrite ? <TableHead className="text-center align-middle font-semibold">{t('aiModels.table.actions')}</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={canWrite ? 7 : 6} className="py-12 text-center"><ListSpinner variant="table" /></TableCell></TableRow>
            ) : filteredModels.length === 0 ? (
              <TableRow><TableCell colSpan={canWrite ? 7 : 6} className={`py-16 text-center text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.empty')}</TableCell></TableRow>
            ) : (
              filteredModels.map((model) => {
                const groupMeta = getAiModelGroupMeta(model.modelGroup) ?? AI_MODEL_GROUP_OPTIONS[0];
                const GroupIcon = groupMeta.icon;
                const activePriceVersion = getActivePriceVersion(model);
                return (
                  <TableRow
                    key={model.aiModelId}
                    className={cn(
                      isDarkMode ? 'border-slate-800 hover:bg-slate-800/30' : 'hover:bg-slate-50',
                      isDarkMode ? '[&>td+td]:border-slate-800' : '[&>td+td]:border-slate-200/80',
                      '[&>td+td]:border-l',
                    )}
                  >
                    <TableCell className="py-4 align-middle text-left">
                      <div className="flex min-w-0 items-start gap-3 text-left">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${groupMeta.softTone}`}>
                          <GroupIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} title={model.displayName}>{model.displayName}</p>
                            {model.systemDefault ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${isDarkMode ? 'bg-sky-500/10 text-sky-300' : 'bg-sky-50 text-sky-700'}`}>{t('aiModels.systemDefault')}</span> : null}
                          </div>
                          <p className={`truncate font-mono text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} title={`${model.provider} / ${model.modelCode}`}>{model.provider} / {model.modelCode}</p>
                          <p className={`truncate text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} title={model.description || t('aiModels.noDescription')}>{model.description || t('aiModels.noDescription')}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 align-middle text-left">
                      <div className="flex min-w-0 items-center gap-2 text-left">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${groupMeta.softTone}`}>
                          <GroupIcon className="h-3.5 w-3.5" />
                        </div>
                        <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} title={getAiModelGroupLabel(model.modelGroup, t)}>{getAiModelGroupLabel(model.modelGroup, t)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 align-middle text-left">
                      {activePriceVersion ? (
                        <div className="space-y-1 text-left">
                          <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatUsd(activePriceVersion.inputPriceUsdPer1M)}</p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{formatMoney(activePriceVersion.inputPriceVndPer1M)}</p>
                        </div>
                      ) : <span className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.none')}</span>}
                    </TableCell>
                    <TableCell className="py-4 align-middle text-left">
                      {activePriceVersion ? (
                        <div className="space-y-1 text-left">
                          <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatUsd(activePriceVersion.outputPriceUsdPer1M)}</p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{formatMoney(activePriceVersion.outputPriceVndPer1M)}</p>
                        </div>
                      ) : <span className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.none')}</span>}
                    </TableCell>
                    <TableCell className="py-4 align-middle text-left">
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(model.assignedPlanCodes) && model.assignedPlanCodes.length > 0 ? (
                          model.assignedPlanCodes.map((planLabel) => <span key={planLabel} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{planLabel}</span>)
                        ) : <span className={`text-sm leading-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.unassigned')}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 align-middle text-left">
                      <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(model.status, isDarkMode)}`}>{t(`aiModels.status.${model.status}`, model.status)}</span>
                    </TableCell>
                    {canWrite ? (
                      <TableCell className="py-4 align-middle text-center">
                        <div className="flex justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`h-9 w-9 ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
                                aria-label={t('aiModels.actions.menu', 'Open action menu')}
                                title={t('aiModels.actions.menu', 'Open action menu')}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className={isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-100' : ''}
                            >
                              <DropdownMenuItem onSelect={() => openPricingDialog(model)} disabled={submitting}>
                                <Coins className="h-4 w-4 text-amber-500" />
                                {t('aiModels.actions.pricing')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => openEditForm(model)} disabled={submitting}>
                                <Pencil className="h-4 w-4 text-sky-500" />
                                {t('aiModels.actions.edit')}
                              </DropdownMenuItem>
                              {model.status !== 'ARCHIVED' ? (
                                <DropdownMenuItem onSelect={() => toggleStatus(model)} disabled={submitting}>
                                  <Power className="h-4 w-4 text-emerald-500" />
                                  {t('aiModels.actions.toggle')}
                                </DropdownMenuItem>
                              ) : null}
                              {model.status !== 'ARCHIVED' ? (
                                <DropdownMenuItem onSelect={() => archiveModel(model)} disabled={submitting}>
                                  <Archive className="h-4 w-4 text-violet-500" />
                                  {t('aiModels.actions.archive')}
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => setDeleteTarget(model)} disabled={submitting} className="text-rose-600 focus:text-rose-700 dark:text-rose-300 dark:focus:text-rose-200">
                                <Trash2 className="h-4 w-4" />
                                {t('aiModels.actions.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className={isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : ''}>
          <DialogHeader>
            <DialogTitle>{editingModel ? t('aiModels.dialogs.editTitle') : t('aiModels.dialogs.createTitle')}</DialogTitle>
            <DialogDescription>{editingModel ? t('aiModels.dialogs.editDescription') : t('aiModels.dialogs.createDescription')}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitModelForm}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>{t('aiModels.form.provider')}</Label>
                <select value={formData.provider} onChange={(event) => setFormData((prev) => ({ ...prev, provider: event.target.value }))} className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
                  {PROVIDER_OPTIONS.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <Label>{t('aiModels.form.group')}</Label>
                <select value={formData.modelGroup} onChange={(event) => setFormData((prev) => ({ ...prev, modelGroup: event.target.value }))} className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
                  {AI_MODEL_GROUP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>{t('aiModels.form.modelCode')}</Label>
                <Input required value={formData.modelCode} onChange={(event) => setFormData((prev) => ({ ...prev, modelCode: event.target.value }))} className={`mt-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-900 text-white' : ''}`} />
              </div>
              <div>
                <Label>{t('aiModels.form.displayName')}</Label>
                <Input required value={formData.displayName} onChange={(event) => setFormData((prev) => ({ ...prev, displayName: event.target.value }))} className={`mt-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-900 text-white' : ''}`} />
              </div>
            </div>
            <div>
              <Label>{t('aiModels.form.description')}</Label>
              <Input value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} className={`mt-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-900 text-white' : ''}`} />
            </div>
            <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
              <div>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t('aiModels.form.systemDefault')}</p>
                <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.form.systemDefaultHint')}</p>
              </div>
              <Switch checked={Boolean(formData.systemDefault)} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, systemDefault: checked }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>{t('aiModels.cancel')}</Button>
              <Button type="submit" disabled={submitting}>{submitting ? t('aiModels.saving') : t('aiModels.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPriceOpen} onOpenChange={setIsPriceOpen}>
        <DialogContent className={`grid h-[min(92vh,860px)] max-h-[92vh] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[min(1180px,calc(100vw-24px))] ${isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : ''}`}>
          <div className={`border-b px-6 py-5 sm:px-7 ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
            <DialogHeader className="pr-10">
              <DialogTitle className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t('aiModels.dialogs.pricingTitle')}</DialogTitle>
              <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                {pricingModel ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`text-base font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{pricingModel.displayName}</span>
                    <span className={`font-mono text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{pricingModel.provider} / {pricingModel.modelCode}</span>
                  </span>
                ) : t('aiModels.dialogs.pricingDescription')}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-5">
              <div className="space-y-4">
                <div className={`rounded-3xl border p-4 sm:p-5 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className={`text-sm font-bold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('aiModels.pricing.dataSources', 'Nguồn đồng bộ')}</h3>
                      <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('aiModels.pricing.dataSourcesDescription', 'Dùng tỷ giá live và nguồn official để nạp nhanh dữ liệu trước khi chỉnh tay.')}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <div className={`rounded-3xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.exchangeRate.title', 'Current USD/VND rate')}</p>
                          <p className={`mt-2 font-mono text-[32px] font-black leading-none tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatExchangeRate(exchangeRate?.rate)}</p>
                          <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {(exchangeRate?.source || t('aiModels.exchangeRate.unknown'))}
                            {exchangeRate?.fetchedAt ? ` • ${formatDateTime(exchangeRate.fetchedAt, locale)}` : ''}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => exchangeRateQuery.refetch()}
                          disabled={exchangeRateLoading}
                          className={`shrink-0 ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}`}
                          aria-label={t('aiModels.exchangeRate.refresh')}
                          title={t('aiModels.exchangeRate.refresh')}
                        >
                          <RefreshCw className={`h-4 w-4 ${exchangeRateLoading ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>

                    <div className={`rounded-3xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.officialTitle', 'Official pricing')}</p>
                          <p className={`max-w-[420px] text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{t('aiModels.pricing.officialDescription', 'Auto-fetch input and output pricing from official OpenAI or Gemini pages when the model is supported.')}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fetchOfficialPricing(pricingModel?.aiModelId, { applyToForm: true })}
                          disabled={officialPricingLoading || !pricingModel?.aiModelId}
                          className={`shrink-0 ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}`}
                        >
                          <RefreshCw className={`mr-2 h-4 w-4 ${officialPricingLoading ? 'animate-spin' : ''}`} />
                          {t('aiModels.pricing.officialSync', 'Fetch official pricing')}
                        </Button>
                      </div>

                      {officialPricing ? (
                        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-700'}`}>
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.source', 'Source')}</span>
                              <span className="font-semibold">{officialPricing.sourceLabel || '-'}</span>
                              {officialPricing.pricingTier ? (
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isDarkMode ? 'bg-sky-500/10 text-sky-300' : 'bg-sky-50 text-sky-700'}`}>
                                  {t('aiModels.pricing.officialTier', 'Tier')}: {officialPricing.pricingTier}
                                </span>
                              ) : null}
                            </div>
                            <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {officialPricing.fetchedAt ? `${t('aiModels.pricing.updatedAt', 'Updated')}: ${formatDateTime(officialPricing.fetchedAt, locale)}` : null}
                              {officialPricing.notes ? ` • ${officialPricing.notes}` : ''}
                            </div>
                            {officialPricing.sourceUrl ? (
                              <a
                                href={officialPricing.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`text-xs font-medium underline underline-offset-4 ${isDarkMode ? 'text-sky-300' : 'text-sky-700'}`}
                              >
                                {t('aiModels.pricing.officialSource', 'Open official source')}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className={`mt-4 rounded-2xl border border-dashed px-4 py-5 text-sm ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                          {t('aiModels.pricing.officialDescription', 'Auto-fetch input and output pricing from official OpenAI or Gemini pages when the model is supported.')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <form onSubmit={submitPriceVersion} className={`rounded-3xl border p-4 sm:p-5 ${isDarkMode ? 'border-slate-800 bg-white/5' : 'border-slate-200 bg-white shadow-sm'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className={`text-sm font-bold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('aiModels.pricing.addVersion')}</h3>
                      <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('aiModels.pricing.formDescription', 'Enter source pricing in USD or pull it from the official source, and the system will convert it to VND.')}</p>
                    </div>
                    {officialPricing?.supported ? (
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        {t('aiModels.pricing.officialReady', 'Đã nạp từ nguồn chính thức')}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px] lg:items-end">
                    <div className="space-y-2">
                      <Label>{t('aiModels.pricing.inputUsd', 'Giá input (USD / 1M token)')}</Label>
                      <Input required type="number" min="0" step="0.000001" value={priceForm.inputPriceUsdPer1M} onChange={(event) => setPriceForm((prev) => ({ ...prev, inputPriceUsdPer1M: event.target.value }))} className={isDarkMode ? 'border-slate-700 bg-slate-900 text-white' : 'bg-white'} />
                      <div className={`rounded-xl border px-3 py-2 text-xs ${isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        {t('aiModels.pricing.previewVnd', 'Converted')}: <span className="font-semibold">{inputPreviewVnd !== null ? formatMoney(inputPreviewVnd) : '-'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('aiModels.pricing.outputUsd', 'Giá output (USD / 1M token)')}</Label>
                      <Input required type="number" min="0" step="0.000001" value={priceForm.outputPriceUsdPer1M} onChange={(event) => setPriceForm((prev) => ({ ...prev, outputPriceUsdPer1M: event.target.value }))} className={isDarkMode ? 'border-slate-700 bg-slate-900 text-white' : 'bg-white'} />
                      <div className={`rounded-xl border px-3 py-2 text-xs ${isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        {t('aiModels.pricing.previewVnd', 'Converted')}: <span className="font-semibold">{outputPreviewVnd !== null ? formatMoney(outputPreviewVnd) : '-'}</span>
                      </div>
                    </div>
                    <div className="flex lg:justify-end">
                      <Button type="submit" disabled={submitting || exchangeRateLoading || !exchangeRate?.rate} className="h-11 w-full rounded-xl">
                        {submitting ? t('aiModels.saving') : t('aiModels.pricing.submit')}
                      </Button>
                    </div>
                  </div>

                  <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                    {officialPricing?.supported
                      ? t('aiModels.pricing.formAppliedHint', 'Giá official đã được nạp vào form. Bạn có thể sửa trực tiếp rồi lưu version mới.')
                      : t('aiModels.pricing.formEmptyHint', 'Nếu model được hỗ trợ, bấm "Lấy giá chính thức" để điền nhanh 2 ô này trước khi lưu.')}
                  </div>
                </form>
              </div>

              <div className={`overflow-hidden rounded-3xl border ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'}`}>
                <div className={`border-b px-4 py-3 sm:px-5 sm:py-4 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50/80'}`}>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.historyTitle', 'Pricing version history')}</p>
                      <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('aiModels.pricing.historyDescription', 'Track the active version and the pricing milestones stored for this model.')}</p>
                    </div>
                    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
                      {t('aiModels.pricing.totalVersions', 'Versions')}: {pricingVersions.length}
                    </div>
                  </div>
                  <div className="grid grid-cols-[1.1fr_1.1fr_0.8fr_1fr_0.9fr_0.8fr] gap-3">
                    <div>
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.input')}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>USD / VND</p>
                    </div>
                    <div>
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.output')}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>USD / VND</p>
                    </div>
                    <div>
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.rate', 'Tỷ giá')}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>USD/VND</p>
                    </div>
                    <div>
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.source', 'Source')}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('aiModels.pricing.sourceHint', 'Rate / provider')}</p>
                    </div>
                    <div>
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.updatedAt', 'Updated')}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('aiModels.pricing.historyHint', 'Saved point')}</p>
                    </div>
                    <div>
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.state')}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('aiModels.pricing.history')}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table className="table-fixed min-w-[860px] xl:min-w-0">
                    <colgroup>
                      <col className="w-[18%]" />
                      <col className="w-[18%]" />
                      <col className="w-[13%]" />
                      <col className="w-[18%]" />
                      <col className="w-[17%]" />
                      <col className="w-[16%]" />
                    </colgroup>
                    <TableBody>
                      {pricingVersions.length > 0 ? (
                        pricingVersions.map((version) => {
                          const updatedParts = formatDateTimeParts(getVersionTimestamp(version), locale);
                          return (
                            <TableRow key={version.priceVersionId} className={isDarkMode ? 'border-slate-800 hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                              <TableCell className="px-4 py-4 align-top sm:px-5">
                                <div className="space-y-1">
                                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatUsd(version.inputPriceUsdPer1M)}</p>
                                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{formatMoney(version.inputPriceVndPer1M)}</p>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-4 align-top sm:px-5">
                                <div className="space-y-1">
                                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatUsd(version.outputPriceUsdPer1M)}</p>
                                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{formatMoney(version.outputPriceVndPer1M)}</p>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-4 align-top sm:px-5">
                                <div className="space-y-1">
                                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatExchangeRate(version.usdToVndRate)}</p>
                                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>USD/VND</p>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-4 align-top sm:px-5">
                                <div className="space-y-1">
                                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{version.exchangeRateSource || '-'}</p>
                                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('aiModels.pricing.rate', 'Tỷ giá')}: {formatExchangeRate(version.usdToVndRate)}</p>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-4 align-top sm:px-5">
                                <div className="space-y-1">
                                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{updatedParts.time}</p>
                                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{updatedParts.date || '-'}</p>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-4 align-top sm:px-5">
                                <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${version.activeNow ? getStatusBadgeClass('ACTIVE', isDarkMode) : getStatusBadgeClass('INACTIVE', isDarkMode)}`}>
                                  {version.activeNow ? t('aiModels.pricing.activeNow') : t('aiModels.pricing.history')}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className={`px-5 py-12 text-center text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {t('aiModels.pricing.none')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className={isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : ''}>
          <DialogHeader>
            <DialogTitle>{t('aiModels.dialogs.deleteTitle')}</DialogTitle>
            <DialogDescription>{t('aiModels.dialogs.deleteDescription', { name: deleteTarget?.displayName || '-' })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>{t('aiModels.cancel')}</Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={submitting}>{submitting ? t('aiModels.deleting') : t('aiModels.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}

export default AiModelsManagement;
