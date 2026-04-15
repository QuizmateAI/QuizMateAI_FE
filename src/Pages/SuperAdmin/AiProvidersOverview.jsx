import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, RefreshCw } from 'lucide-react';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Components/ui/table';
import ListSpinner from '@/Components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import { getAiCostSummary, getAiModels, getAiProviderHealth } from '@/api/ManagementSystemAPI';
import { AI_PROVIDER_OPTIONS, filterSupportedAiModels, getAiModelGroupLabel } from '@/lib/aiModelCatalog';

function extractData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '0 VND';
  return `${Number(value).toLocaleString('vi-VN')} VND`;
}

function getHealthBadgeClass(status, isDarkMode) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'HEALTHY') {
    return isDarkMode
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (normalized === 'UNREACHABLE') {
    return isDarkMode
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      : 'border-rose-200 bg-rose-50 text-rose-700';
  }
  return isDarkMode
    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    : 'border-amber-200 bg-amber-50 text-amber-700';
}

function getModelStatusBadgeClass(status, isDarkMode) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'ACTIVE') {
    return isDarkMode
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (normalized === 'ARCHIVED') {
    return isDarkMode
      ? 'border-slate-700 bg-slate-800 text-slate-300'
      : 'border-slate-200 bg-slate-100 text-slate-700';
  }
  return isDarkMode
    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    : 'border-amber-200 bg-amber-50 text-amber-700';
}

function getProviderHealthLabel(status, t) {
  const normalized = String(status || '').toUpperCase();
  return t(`aiProviders.providerStatus.${normalized}`, {
    defaultValue: normalized || '-',
  });
}

function getModelStatusLabel(status, t) {
  const normalized = String(status || '').toUpperCase();
  return t(`aiProviders.modelStatus.${normalized}`, {
    defaultValue: normalized || '-',
  });
}

function TabsList({ children, className = '', isDarkMode }) {
  return (
    <div className={`flex gap-1 rounded-2xl p-1 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'} ${className}`}>
      {children}
    </div>
  );
}

function TabsTrigger({ active, onClick, children, className = '', isDarkMode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
        active
          ? isDarkMode
            ? 'bg-slate-950 text-white shadow-sm'
            : 'bg-white text-slate-900 shadow-sm'
          : isDarkMode
          ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
          : 'text-slate-500 hover:bg-white/70 hover:text-slate-900'
      } ${className}`}
    >
      {children}
    </button>
  );
}

function TabsContent({ active, children, className = '' }) {
  if (!active) {
    return null;
  }
  return <div className={`animate-in fade-in-50 duration-300 ${className}`}>{children}</div>;
}

function MetricPill({ icon: Icon, label, value, isDarkMode }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2 ${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-600'}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
          <p className={`mt-1 text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function AiProvidersOverview() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showError } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [models, setModels] = useState([]);
  const [healthMap, setHealthMap] = useState({});
  const [costSummaryMap, setCostSummaryMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState(AI_PROVIDER_OPTIONS[0] ?? '');

  const loadData = async () => {
    setLoading(true);
    try {
      const modelsResponse = await getAiModels();
      const rawModels = Array.isArray(extractData(modelsResponse)) ? extractData(modelsResponse) : [];
      const nextModels = filterSupportedAiModels(rawModels);
      setModels(nextModels);

      const providerList = [...AI_PROVIDER_OPTIONS];

      const [healthResponse, ...summaryResponses] = await Promise.all([
        getAiProviderHealth().catch(() => null),
        ...providerList.map((provider) => getAiCostSummary({ provider }).catch(() => null)),
      ]);

      const healthPayload = extractData(healthResponse);
      const healthEntries = Array.isArray(healthPayload?.providers) ? healthPayload.providers : [];
      setHealthMap(
        healthEntries.reduce((acc, item) => {
          acc[String(item.provider || '').toUpperCase()] = item;
          return acc;
        }, {}),
      );

      setCostSummaryMap(
        providerList.reduce((acc, provider, index) => {
          acc[provider] = extractData(summaryResponses[index]) || null;
          return acc;
        }, {}),
      );
    } catch (error) {
      setModels([]);
      setHealthMap({});
      setCostSummaryMap({});
      showError(getErrorMessage(t, error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const providerCards = useMemo(() => {
    return AI_PROVIDER_OPTIONS.map((provider) => {
      const providerModels = models.filter((model) => String(model.provider || '').toUpperCase() === provider);
      const activeCount = providerModels.filter((model) => String(model.status || '').toUpperCase() === 'ACTIVE').length;
      const archivedCount = providerModels.filter((model) => String(model.status || '').toUpperCase() === 'ARCHIVED').length;
      const health = healthMap[provider] ?? {
        provider,
        status: providerModels.length > 0 ? 'UNREACHABLE' : 'UNCONFIGURED',
        configured: false,
        reachable: false,
        keyCount: 0,
      };
      return {
        provider,
        models: providerModels,
        activeCount,
        archivedCount,
        health,
        summary: costSummaryMap[provider] ?? null,
      };
    });
  }, [costSummaryMap, healthMap, models]);

  useEffect(() => {
    if (!providerCards.length) {
      return;
    }
    if (!providerCards.some((provider) => provider.provider === activeProvider)) {
      setActiveProvider(providerCards[0].provider);
    }
  }, [activeProvider, providerCards]);

  const activeProviderCard = useMemo(() => {
    return providerCards.find((provider) => provider.provider === activeProvider) ?? providerCards[0] ?? null;
  }, [activeProvider, providerCards]);

  return (
    <div className={`space-y-6 p-6 ${fontClass}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('aiProviders.title', { defaultValue: 'AI Providers' })}
          </h1>
          <p className={`mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('aiProviders.subtitle', { defaultValue: 'Overview of provider catalogs, health status, and models grouped by provider.' })}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={loadData}
          disabled={loading}
          className={`rounded-xl cursor-pointer ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800' : ''}`}
          aria-label={t('common.refresh')}
          title={t('common.refresh')}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="space-y-5">
        {loading ? (
          <div className={`rounded-3xl border p-10 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <ListSpinner />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto pb-1">
              <TabsList isDarkMode={isDarkMode} className="inline-flex min-w-full sm:min-w-max">
                {providerCards.map((provider) => (
                  <TabsTrigger
                    key={provider.provider}
                    active={provider.provider === activeProviderCard?.provider}
                    onClick={() => setActiveProvider(provider.provider)}
                    isDarkMode={isDarkMode}
                    className="min-w-[150px] gap-2"
                  >
                    <span>{provider.provider}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${provider.provider === activeProviderCard?.provider
                      ? isDarkMode
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-slate-100 text-slate-700'
                      : isDarkMode
                      ? 'bg-slate-800/80 text-slate-400'
                      : 'bg-white/80 text-slate-500'
                    }`}>
                      {provider.models.length}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent active={Boolean(activeProviderCard)}>
              {activeProviderCard && (
                <section
                  className={`overflow-hidden rounded-3xl border ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'}`}
                >
                  <div className={`border-b p-5 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeProviderCard.provider}</h2>
                          <Badge className={`border ${getHealthBadgeClass(activeProviderCard.health.status, isDarkMode)}`}>
                            {getProviderHealthLabel(activeProviderCard.health.status, t)}
                          </Badge>
                        </div>
                        <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {t('aiProviders.providerHint', {
                            defaultValue: '{{count}} models in catalog, {{active}} active and {{archived}} archived.',
                            count: activeProviderCard.models.length,
                            active: activeProviderCard.activeCount,
                            archived: activeProviderCard.archivedCount,
                          })}
                        </p>
                      </div>
                      <div className={`rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        <p>{t('aiProviders.health.configured', { defaultValue: 'Configured' })}: <span className="font-semibold">{activeProviderCard.health.configured ? t('aiProviders.health.yes', { defaultValue: 'Yes' }) : t('aiProviders.health.no', { defaultValue: 'No' })}</span></p>
                        <p>{t('aiProviders.health.reachable', { defaultValue: 'Reachable' })}: <span className="font-semibold">{activeProviderCard.health.reachable ? t('aiProviders.health.yes', { defaultValue: 'Yes' }) : t('aiProviders.health.no', { defaultValue: 'No' })}</span></p>
                        <p>{t('aiProviders.health.keyCount', { defaultValue: 'Keys' })}: <span className="font-semibold">{activeProviderCard.health.keyCount ?? 0}</span></p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MetricPill
                        icon={Coins}
                        label={t('aiProviders.metrics.providerCost', { defaultValue: 'Provider cost' })}
                        value={formatMoney(activeProviderCard.summary?.totalProviderCostVnd ?? 0)}
                        isDarkMode={isDarkMode}
                      />
                      <MetricPill
                        icon={Coins}
                        label={t('aiProviders.metrics.profit', { defaultValue: 'Profit' })}
                        value={formatMoney(activeProviderCard.summary?.totalProfitVnd ?? 0)}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className={isDarkMode ? 'border-slate-800' : 'border-slate-100'}>
                          <TableHead>{t('aiProviders.table.modelCode', { defaultValue: 'Model code' })}</TableHead>
                          <TableHead>{t('aiProviders.table.modelGroup', { defaultValue: 'Capability' })}</TableHead>
                          <TableHead>{t('aiProviders.table.systemDefault', { defaultValue: 'System default' })}</TableHead>
                          <TableHead>{t('aiProviders.table.status', { defaultValue: 'Status' })}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeProviderCard.models.length > 0 ? activeProviderCard.models.map((model) => (
                          <TableRow key={model.aiModelId} className={isDarkMode ? 'border-slate-800/70' : 'border-slate-100'}>
                            <TableCell>
                              <div>
                                <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{model.modelCode}</p>
                                <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{model.displayName}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getAiModelGroupLabel(model.modelGroup, t)}</TableCell>
                            <TableCell>
                              <Badge className={`border ${model.systemDefault ? getHealthBadgeClass('HEALTHY', isDarkMode) : isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                                {model.systemDefault
                                  ? t('aiProviders.systemDefault', { defaultValue: 'System default' })
                                  : t('aiProviders.notDefault', { defaultValue: 'Custom' })}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`border ${getModelStatusBadgeClass(model.status, isDarkMode)}`}>
                                {getModelStatusLabel(model.status, t)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={4} className={`py-10 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {t('aiProviders.emptyModels', { defaultValue: 'No models registered for this provider yet.' })}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              )}
            </TabsContent>
          </>
        )}
      </div>
    </div>
  );
}

export default AiProvidersOverview;
