import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  Bot,
  Coins,
  Cpu,
  DollarSign,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Switch } from '@/Components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import ListSpinner from '@/Components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';
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
  getAiModelGroupLabel,
  getAiModelGroupMeta,
} from '@/lib/aiModelCatalog';
import { cn } from '@/lib/utils';

const PROVIDER_OPTIONS = ['', 'OPENAI', 'GEMINI', 'ANTHROPIC'];

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

function formatDateTime(value, locale = 'vi-VN') {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(locale, {
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
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(locale, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTimeParts(value, locale = 'vi-VN') {
  if (!value) return { time: '-', date: null };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { time: value, date: null };
  return {
    time: parsed.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }),
    date: parsed.toLocaleDateString(locale, {
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

  const canWrite = !permLoading && permissions.has('system-settings:write');
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ provider: '', modelGroup: '', status: '', search: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [pricingModel, setPricingModel] = useState(null);
  const [priceForm, setPriceForm] = useState({ ...EMPTY_PRICE_FORM });
  const [exchangeRate, setExchangeRate] = useState(null);
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false);
  const [officialPricing, setOfficialPricing] = useState(null);
  const [officialPricingLoading, setOfficialPricingLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await getAiModels({
        provider: filters.provider || undefined,
        modelGroup: filters.modelGroup || undefined,
        status: filters.status || undefined,
      });
      const data = extractData(response);
      const nextModels = Array.isArray(data) ? data : [];
      setModels(nextModels);
      return nextModels;
    } catch (error) {
      setModels([]);
      showError(getErrorMessage(t, error));
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [filters.provider, filters.modelGroup, filters.status]);

  const fetchExchangeRate = async ({ silent = false } = {}) => {
    if (!silent) setExchangeRateLoading(true);
    try {
      const response = await getUsdVndExchangeRate();
      setExchangeRate(extractData(response));
    } catch (error) {
      setExchangeRate(null);
      if (!silent) showError(getErrorMessage(t, error));
    } finally {
      if (!silent) setExchangeRateLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRate({ silent: true });
  }, []);

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
        showError(data?.notes || t('aiModels.pricing.officialUnsupported', 'Model này chưa hỗ trợ lấy giá tự động.'));
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
    fetchExchangeRate();
    fetchOfficialPricing(model.aiModelId, { silent: true, applyToForm: true });
  };

  const submitModelForm = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        provider: String(formData.provider || '').trim().toUpperCase(),
        modelCode: String(formData.modelCode || '').trim(),
        displayName: String(formData.displayName || '').trim(),
        modelGroup: formData.modelGroup,
        description: String(formData.description || '').trim() || null,
        systemDefault: Boolean(formData.systemDefault),
      };

      if (editingModel) {
        await updateAiModel(editingModel.aiModelId, payload);
        showSuccess(t('aiModels.messages.updateSuccess'));
      } else {
        await createAiModel(payload);
        showSuccess(t('aiModels.messages.createSuccess'));
      }

      setIsFormOpen(false);
      await fetchModels();
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setSubmitting(false);
    }
  };

  const submitPriceVersion = async (event) => {
    event.preventDefault();
    if (!pricingModel) return;
    setSubmitting(true);
    try {
      await addAiModelPriceVersion(pricingModel.aiModelId, {
        inputPriceUsdPer1M: Number(priceForm.inputPriceUsdPer1M || 0),
        outputPriceUsdPer1M: Number(priceForm.outputPriceUsdPer1M || 0),
      });
      showSuccess(t('aiModels.messages.priceSuccess'));
      setPriceForm({ ...EMPTY_PRICE_FORM });
      const nextModels = await fetchModels();
      setPricingModel(nextModels.find((item) => item.aiModelId === pricingModel.aiModelId) ?? pricingModel);
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (model) => {
    const nextStatus = model.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setSubmitting(true);
    try {
      await updateAiModelStatus(model.aiModelId, nextStatus);
      showSuccess(t('aiModels.messages.statusSuccess'));
      await fetchModels();
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setSubmitting(false);
    }
  };

  const archiveModel = async (model) => {
    setSubmitting(true);
    try {
      await updateAiModelStatus(model.aiModelId, 'ARCHIVED');
      showSuccess(t('aiModels.messages.statusSuccess'));
      await fetchModels();
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteAiModel(deleteTarget.aiModelId);
      showSuccess(t('aiModels.messages.deleteSuccess'));
      setDeleteTarget(null);
      await fetchModels();
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`space-y-6 p-6 ${fontClass}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className={`rounded-2xl p-3 ${isDarkMode ? 'bg-sky-500/10' : 'bg-sky-50'}`}>
            <Cpu className={`h-6 w-6 ${isDarkMode ? 'text-sky-300' : 'text-sky-600'}`} />
          </div>
          <div>
            <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t('aiModels.title')}</h1>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('aiModels.subtitle')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={fetchModels} disabled={loading} className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('aiModels.refresh')}
          </Button>
          {canWrite ? (
            <Button onClick={openCreateForm} className="bg-gradient-to-r from-sky-600 to-blue-600 text-white hover:from-sky-700 hover:to-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              {t('aiModels.add')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t('aiModels.stats.total')} value={models.length} icon={Bot} tone="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" isDarkMode={isDarkMode} subtext={t('aiModels.stats.totalHint')} />
        <MetricCard label={t('aiModels.stats.active')} value={activeCount} icon={Power} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" isDarkMode={isDarkMode} subtext={t('aiModels.stats.activeHint')} />
        <MetricCard label={t('aiModels.stats.assigned')} value={assignedCount} icon={ShieldCheck} tone="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" isDarkMode={isDarkMode} subtext={t('aiModels.stats.assignedHint')} />
        <MetricCard label={t('aiModels.stats.archived')} value={archivedCount} icon={Archive} tone="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" isDarkMode={isDarkMode} subtext={t('aiModels.stats.archivedHint')} />
      </div>

      <div className={`flex flex-col gap-3 rounded-2xl border p-5 lg:flex-row lg:items-center lg:justify-between ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'}`}>
        <div className="flex items-start gap-3">
          <div className={`rounded-2xl p-3 ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
            <DollarSign className={`h-5 w-5 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`} />
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.exchangeRate.title', 'Ty gia USD/VND')}</p>
            <p className={`mt-1 text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatExchangeRate(exchangeRate?.rate)}</p>
            <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {(exchangeRate?.source || t('aiModels.exchangeRate.unknown', 'Khong ro nguon'))}
              {exchangeRate?.fetchedAt ? ` • ${formatDateTime(exchangeRate.fetchedAt, i18n.language === 'vi' ? 'vi-VN' : 'en-US')}` : ''}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => fetchExchangeRate()} disabled={exchangeRateLoading} className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}>
          <RefreshCw className={`mr-2 h-4 w-4 ${exchangeRateLoading ? 'animate-spin' : ''}`} />
          {t('aiModels.exchangeRate.refresh', 'Lam moi ty gia')}
        </Button>
      </div>

      <div className={`rounded-2xl border p-5 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'}`}>
        <div className="grid gap-3 lg:grid-cols-4">
          <div>
            <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiModels.filters.search')}</Label>
            <Input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder={t('aiModels.filters.searchPlaceholder')} className={`mt-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500' : ''}`} />
          </div>
          <div>
            <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiModels.filters.provider')}</Label>
            <select value={filters.provider} onChange={(event) => setFilters((prev) => ({ ...prev, provider: event.target.value }))} className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="">{t('aiModels.filters.allProviders')}</option>
              {PROVIDER_OPTIONS.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiModels.filters.group')}</Label>
            <select value={filters.modelGroup} onChange={(event) => setFilters((prev) => ({ ...prev, modelGroup: event.target.value }))} className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="">{t('aiModels.filters.allGroups')}</option>
              {AI_MODEL_GROUP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}
            </select>
          </div>
          <div>
            <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiModels.filters.status')}</Label>
            <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="">{t('aiModels.filters.allStatuses')}</option>
              {AI_MODEL_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{t(`aiModels.status.${option}`)}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'}`}>
        <Table className="table-fixed min-w-[1180px]">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[18%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[15%]" />
            <col className="w-[9%]" />
            {canWrite ? <col className="w-[6%]" /> : null}
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
              {canWrite ? <TableHead className="text-left align-middle font-semibold">{t('aiModels.table.actions')}</TableHead> : null}
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
                    <TableCell className="py-5 align-middle text-left">
                      <div className="flex items-start gap-3 text-left">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${groupMeta.softTone}`}>
                          <GroupIcon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{model.displayName}</p>
                            {model.systemDefault ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isDarkMode ? 'bg-sky-500/10 text-sky-300' : 'bg-sky-50 text-sky-700'}`}>{t('aiModels.systemDefault')}</span> : null}
                          </div>
                          <p className={`mt-1 font-mono text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{model.provider} / {model.modelCode}</p>
                          <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{model.description || t('aiModels.noDescription')}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 align-middle text-left">
                      <div className="flex items-start gap-2 text-left">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${groupMeta.softTone}`}>
                          <GroupIcon className="h-4 w-4" />
                        </div>
                        <p className={`text-sm font-semibold leading-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{getAiModelGroupLabel(model.modelGroup, t)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 align-middle text-left">
                      {activePriceVersion ? (
                        <div className="space-y-1 text-left">
                          <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatUsd(activePriceVersion.inputPriceUsdPer1M)}</p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{formatMoney(activePriceVersion.inputPriceVndPer1M)}</p>
                        </div>
                      ) : <span className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.none')}</span>}
                    </TableCell>
                    <TableCell className="py-5 align-middle text-left">
                      {activePriceVersion ? (
                        <div className="space-y-1 text-left">
                          <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatUsd(activePriceVersion.outputPriceUsdPer1M)}</p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{formatMoney(activePriceVersion.outputPriceVndPer1M)}</p>
                        </div>
                      ) : <span className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.none')}</span>}
                    </TableCell>
                    <TableCell className="py-5 align-middle text-left">
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(model.assignedPlanCodes) && model.assignedPlanCodes.length > 0 ? (
                          model.assignedPlanCodes.map((planCode) => <span key={planCode} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{planCode}</span>)
                        ) : <span className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.unassigned')}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="py-5 align-middle text-left">
                      <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(model.status, isDarkMode)}`}>{t(`aiModels.status.${model.status}`, model.status)}</span>
                    </TableCell>
                    {canWrite ? (
                      <TableCell className="py-5 align-middle text-left">
                        <div className="flex justify-start">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}
                                aria-label={t('aiModels.actions.menu', 'Mở menu thao tác')}
                                title={t('aiModels.actions.menu', 'Mở menu thao tác')}
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
                          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.exchangeRate.title', 'Tỷ giá USD/VND')}</p>
                          <p className={`mt-2 font-mono text-[32px] font-black leading-none tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatExchangeRate(exchangeRate?.rate)}</p>
                          <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {(exchangeRate?.source || t('aiModels.exchangeRate.unknown', 'Không rõ nguồn'))}
                            {exchangeRate?.fetchedAt ? ` • ${formatDateTime(exchangeRate.fetchedAt, locale)}` : ''}
                          </p>
                        </div>
                        <Button type="button" variant="outline" onClick={() => fetchExchangeRate()} disabled={exchangeRateLoading} className={`shrink-0 ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}`}>
                          <RefreshCw className={`mr-2 h-4 w-4 ${exchangeRateLoading ? 'animate-spin' : ''}`} />
                          {t('aiModels.exchangeRate.refresh', 'Làm mới')}
                        </Button>
                      </div>
                    </div>

                    <div className={`rounded-3xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.officialTitle', 'Giá chính thức')}</p>
                          <p className={`max-w-[420px] text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{t('aiModels.pricing.officialDescription', 'Tự động lấy giá input và output từ trang chính thức của OpenAI hoặc Gemini khi model được hỗ trợ.')}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fetchOfficialPricing(pricingModel?.aiModelId, { applyToForm: true })}
                          disabled={officialPricingLoading || !pricingModel?.aiModelId}
                          className={`shrink-0 ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}`}
                        >
                          <RefreshCw className={`mr-2 h-4 w-4 ${officialPricingLoading ? 'animate-spin' : ''}`} />
                          {t('aiModels.pricing.officialSync', 'Lấy giá chính thức')}
                        </Button>
                      </div>

                      {officialPricing ? (
                        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-700'}`}>
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.source', 'Nguồn')}</span>
                              <span className="font-semibold">{officialPricing.sourceLabel || '-'}</span>
                              {officialPricing.pricingTier ? (
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isDarkMode ? 'bg-sky-500/10 text-sky-300' : 'bg-sky-50 text-sky-700'}`}>
                                  {t('aiModels.pricing.officialTier', 'Tier')}: {officialPricing.pricingTier}
                                </span>
                              ) : null}
                            </div>
                            <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {officialPricing.fetchedAt ? `${t('aiModels.pricing.updatedAt', 'Cập nhật')}: ${formatDateTime(officialPricing.fetchedAt, locale)}` : null}
                              {officialPricing.notes ? ` • ${officialPricing.notes}` : ''}
                            </div>
                            {officialPricing.sourceUrl ? (
                              <a
                                href={officialPricing.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`text-xs font-medium underline underline-offset-4 ${isDarkMode ? 'text-sky-300' : 'text-sky-700'}`}
                              >
                                {t('aiModels.pricing.officialSource', 'Mở nguồn chính thức')}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className={`mt-4 rounded-2xl border border-dashed px-4 py-5 text-sm ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                          {t('aiModels.pricing.officialDescription', 'Tự động lấy giá input và output từ trang chính thức của OpenAI hoặc Gemini khi model được hỗ trợ.')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <form onSubmit={submitPriceVersion} className={`rounded-3xl border p-4 sm:p-5 ${isDarkMode ? 'border-slate-800 bg-white/5' : 'border-slate-200 bg-white shadow-sm'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className={`text-sm font-bold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('aiModels.pricing.addVersion')}</h3>
                      <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('aiModels.pricing.formDescription', 'Giá official sẽ tự điền vào 2 ô này. Super admin có thể chỉnh lại ngay trước khi lưu.')}</p>
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
                        {t('aiModels.pricing.previewVnd', 'Quy đổi')}: <span className="font-semibold">{inputPreviewVnd !== null ? formatMoney(inputPreviewVnd) : '-'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('aiModels.pricing.outputUsd', 'Giá output (USD / 1M token)')}</Label>
                      <Input required type="number" min="0" step="0.000001" value={priceForm.outputPriceUsdPer1M} onChange={(event) => setPriceForm((prev) => ({ ...prev, outputPriceUsdPer1M: event.target.value }))} className={isDarkMode ? 'border-slate-700 bg-slate-900 text-white' : 'bg-white'} />
                      <div className={`rounded-xl border px-3 py-2 text-xs ${isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        {t('aiModels.pricing.previewVnd', 'Quy đổi')}: <span className="font-semibold">{outputPreviewVnd !== null ? formatMoney(outputPreviewVnd) : '-'}</span>
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
                      <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.historyTitle', 'Lịch sử version giá')}</p>
                      <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('aiModels.pricing.historyDescription', 'Theo dõi version đang áp dụng và các mốc giá đã lưu của model này.')}</p>
                    </div>
                    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
                      {t('aiModels.pricing.totalVersions', 'Số version')}: {pricingVersions.length}
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
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.source', 'Nguồn')}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('aiModels.pricing.sourceHint', 'Tỷ giá / provider')}</p>
                    </div>
                    <div>
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiModels.pricing.updatedAt', 'Cập nhật')}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('aiModels.pricing.historyHint', 'Mốc đã lưu')}</p>
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
    </div>
  );
}

export default AiModelsManagement;
