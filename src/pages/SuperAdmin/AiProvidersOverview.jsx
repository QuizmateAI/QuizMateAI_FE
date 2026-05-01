import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Coins, History, PlugZap, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import ListSpinner from '@/components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  getAiCostSummary,
  getAiModels,
  getAiProviderHealth,
  getAiProviderHealthHistory,
  testAiProviderConnection,
} from '@/api/ManagementSystemAPI';
import { AI_PROVIDER_OPTIONS, filterSupportedAiModels, getAiModelGroupLabel } from '@/lib/aiModelCatalog';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
  SuperAdminPanel,
} from './Components/SuperAdminSurface';

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

function getKeyStatusLabel(status, t) {
  const normalized = String(status || '').toUpperCase();
  return t(`aiProviders.keyStatus.${normalized}`, {
    defaultValue: normalized || '-',
  });
}

function getKeyStatusBadgeClass(status, isDarkMode) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'VALID') {
    return isDarkMode
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (normalized === 'INVALID' || normalized === 'UNREACHABLE') {
    return isDarkMode
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      : 'border-rose-200 bg-rose-50 text-rose-700';
  }
  if (normalized === 'RATE_LIMITED') {
    return isDarkMode
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      : 'border-amber-200 bg-amber-50 text-amber-700';
  }
  return isDarkMode
    ? 'border-slate-700 bg-slate-800 text-slate-300'
    : 'border-slate-200 bg-slate-100 text-slate-700';
}

function formatCheckedAt(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('vi-VN');
  } catch {
    return String(value);
  }
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
    <div className={`rounded-2xl border px-3.5 py-2.5 ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-center gap-2.5">
        <div className={`rounded-xl p-1.5 ${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-600'}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
          <p className={`mt-0.5 text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function getDetailToneClass(tone, isDarkMode) {
  if (tone === 'success') {
    return isDarkMode
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (tone === 'danger') {
    return isDarkMode
      ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
      : 'border-rose-200 bg-rose-50 text-rose-700';
  }
  return isDarkMode
    ? 'border-slate-700 bg-slate-900 text-slate-200'
    : 'border-slate-200 bg-slate-50 text-slate-700';
}

function HealthDetailPill({ label, value, tone = 'neutral', isDarkMode }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${getDetailToneClass(tone, isDarkMode)}`}>
      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

const AI_PROVIDERS_QUERY_KEY = ['superAdmin', 'aiProviders'];

function AiProvidersOverview() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [activeProvider, setActiveProvider] = useState(AI_PROVIDER_OPTIONS[0] ?? '');
  const [testResult, setTestResult] = useState(null);
  const [testProvider, setTestProvider] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyHours, setHistoryHours] = useState(24);
  const [historyLoading, setHistoryLoading] = useState(false);

  const {
    data,
    isLoading: loading,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey: AI_PROVIDERS_QUERY_KEY,
    queryFn: async () => {
      const modelsResponse = await getAiModels();
      const rawModels = Array.isArray(extractData(modelsResponse)) ? extractData(modelsResponse) : [];
      const nextModels = filterSupportedAiModels(rawModels);

      const providerList = [...AI_PROVIDER_OPTIONS];
      const [healthResponse, ...summaryResponses] = await Promise.all([
        getAiProviderHealth().catch(() => null),
        ...providerList.map((provider) => getAiCostSummary({ provider }).catch(() => null)),
      ]);

      const healthPayload = extractData(healthResponse);
      const healthEntries = Array.isArray(healthPayload?.providers) ? healthPayload.providers : [];
      const healthMap = healthEntries.reduce((acc, item) => {
        acc[String(item.provider || '').toUpperCase()] = item;
        return acc;
      }, {});

      const costSummaryMap = providerList.reduce((acc, provider, index) => {
        acc[provider] = extractData(summaryResponses[index]) || null;
        return acc;
      }, {});

      return { models: nextModels, healthMap, costSummaryMap };
    },
  });

  const models = useMemo(() => data?.models ?? [], [data?.models]);
  const healthMap = useMemo(() => data?.healthMap ?? {}, [data?.healthMap]);
  const costSummaryMap = useMemo(() => data?.costSummaryMap ?? {}, [data?.costSummaryMap]);

  useEffect(() => {
    if (queryError) {
      showError(getErrorMessage(t, queryError));
    }
  }, [queryError, t, showError]);

  const refetchProviders = () =>
    queryClient.invalidateQueries({ queryKey: AI_PROVIDERS_QUERY_KEY });

  const testMutation = useMutation({
    mutationFn: async (provider) => {
      const response = await testAiProviderConnection(provider);
      return { provider, data: extractData(response) };
    },
    onMutate: (provider) => {
      setTestProvider(provider);
      setTestResult(null);
    },
    onSuccess: ({ provider, data: testData }) => {
      setTestResult(testData);
      const valid = testData?.validKeyCount ?? 0;
      const total = testData?.keyCount ?? 0;
      showSuccess(t('aiProviders.testConnection.successToast', {
        defaultValue: 'Tested {{provider}}: {{valid}}/{{total}} keys healthy.',
        provider,
        valid,
        total,
      }));
      const nextHealth = {
        provider,
        status: testData?.status ?? 'UNREACHABLE',
        configured: Boolean(testData?.configured),
        reachable: (testData?.validKeyCount ?? 0) > 0,
        keyCount: testData?.keyCount ?? 0,
      };
      queryClient.setQueryData(AI_PROVIDERS_QUERY_KEY, (current) => {
        if (!current) return current;
        return {
          ...current,
          healthMap: { ...current.healthMap, [provider]: nextHealth },
        };
      });
    },
    onError: (error) => {
      const status = error?.response?.status;
      if (status === 429) {
        showError(t('aiProviders.testConnection.rateLimitHit', {
          defaultValue: 'Rate limit hit (10/min). Try again in 1 minute.',
        }));
      } else {
        showError(getErrorMessage(t, error));
      }
    },
  });
  const testing = testMutation.isPending;

  const handleTestConnection = (provider) => {
    if (!provider || testing) return;
    testMutation.mutate(provider);
  };

  const handleOpenHistory = async (provider, hours = historyHours) => {
    if (!provider) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryHours(hours);
    try {
      const response = await getAiProviderHealthHistory({ provider, hours });
      const historyData = extractData(response);
      setHistoryEntries(Array.isArray(historyData) ? historyData : []);
    } catch (error) {
      setHistoryEntries([]);
      showError(getErrorMessage(t, error));
    } finally {
      setHistoryLoading(false);
    }
  };

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
    <SuperAdminPage className={fontClass}>
      <SuperAdminPageHeader
        eyebrow="AI Governance"
        title={t('aiProviders.title', { defaultValue: 'AI Providers' })}
        description={t('aiProviders.subtitle', { defaultValue: 'Overview of provider catalogs, health status, and models grouped by provider.' })}
        actions={(
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={refetchProviders}
            disabled={isFetching}
            className="h-10 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={t('common.refresh')}
            title={t('common.refresh')}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        )}
      />

      <div className="space-y-5">
        {loading ? (
          <div className={`rounded-[28px] border p-10 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.25)] ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white/92 backdrop-blur-xl'}`}>
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
                <SuperAdminPanel
                  className={isDarkMode ? '' : 'bg-white/94'}
                  title={activeProviderCard.provider}
                  description={t('aiProviders.providerHint', {
                    defaultValue: '{{count}} models in catalog, {{active}} active and {{archived}} archived.',
                    count: activeProviderCard.models.length,
                    active: activeProviderCard.activeCount,
                    archived: activeProviderCard.archivedCount,
                  })}
                  action={(
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`border ${getHealthBadgeClass(activeProviderCard.health.status, isDarkMode)}`}>
                        {getProviderHealthLabel(activeProviderCard.health.status, t)}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestConnection(activeProviderCard.provider)}
                        disabled={testing}
                        className="h-9 gap-1.5 rounded-2xl"
                      >
                        <PlugZap className={`h-4 w-4 ${testing && testProvider === activeProviderCard.provider ? 'animate-pulse' : ''}`} />
                        {testing && testProvider === activeProviderCard.provider
                          ? t('aiProviders.testConnection.running', { defaultValue: 'Testing...' })
                          : t('aiProviders.testConnection.button', { defaultValue: 'Test connection' })}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenHistory(activeProviderCard.provider, historyHours)}
                        className="h-9 gap-1.5 rounded-2xl"
                      >
                        <History className="h-4 w-4" />
                        {t('aiProviders.testConnection.viewHistory', { defaultValue: 'View history' })}
                      </Button>
                    </div>
                  )}
                  contentClassName="p-0"
                >
                  <div className={`border-b px-5 py-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`sa-pill ${isDarkMode ? '' : 'border-slate-200'}`}>
                          {activeProviderCard.provider}
                        </span>
                        <HealthDetailPill
                          label={t('aiProviders.health.configured', { defaultValue: 'Configured' })}
                          value={activeProviderCard.health.configured
                            ? t('aiProviders.health.yes', { defaultValue: 'Yes' })
                            : t('aiProviders.health.no', { defaultValue: 'No' })}
                          tone={activeProviderCard.health.configured ? 'success' : 'neutral'}
                          isDarkMode={isDarkMode}
                        />
                        <HealthDetailPill
                          label={t('aiProviders.health.reachable', { defaultValue: 'Reachable' })}
                          value={activeProviderCard.health.reachable
                            ? t('aiProviders.health.yes', { defaultValue: 'Yes' })
                            : t('aiProviders.health.no', { defaultValue: 'No' })}
                          tone={activeProviderCard.health.reachable ? 'success' : 'danger'}
                          isDarkMode={isDarkMode}
                        />
                        <HealthDetailPill
                          label={t('aiProviders.health.keyCount', { defaultValue: 'Keys' })}
                          value={activeProviderCard.health.keyCount ?? 0}
                          tone={(activeProviderCard.health.keyCount ?? 0) > 0 ? 'success' : 'neutral'}
                          isDarkMode={isDarkMode}
                        />
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[340px]">
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
                </SuperAdminPanel>
              )}
            </TabsContent>
          </>
        )}
      </div>

      <Dialog open={Boolean(testResult)} onOpenChange={(open) => { if (!open) setTestResult(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {t('aiProviders.testConnection.title', { defaultValue: 'API key test results' })} — {testResult?.provider}
            </DialogTitle>
            <DialogDescription>
              {t('aiProviders.testConnection.description', {
                defaultValue: 'Direct auth-light check against each {{provider}} API key (no tokens consumed).',
                provider: testResult?.provider ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          {testResult && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`border ${getHealthBadgeClass(testResult.status, isDarkMode)}`}>
                  {getProviderHealthLabel(testResult.status, t)}
                </Badge>
                <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('aiProviders.testConnection.summary', {
                    defaultValue: '{{valid}}/{{total}} keys valid • took {{duration}}ms',
                    valid: testResult.validKeyCount ?? 0,
                    total: testResult.keyCount ?? 0,
                    duration: testResult.checkDurationMs ?? 0,
                  })}
                </span>
              </div>
              {(testResult.keys?.length ?? 0) === 0 ? (
                <p className={`rounded-2xl border px-4 py-6 text-center text-sm ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                  {t('aiProviders.testConnection.noKeys', {
                    defaultValue: 'No API keys are configured for this provider yet.',
                  })}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('aiProviders.keys.index', { defaultValue: '#' })}</TableHead>
                        <TableHead>{t('aiProviders.keys.key', { defaultValue: 'API Key' })}</TableHead>
                        <TableHead>{t('aiProviders.keys.status', { defaultValue: 'Status' })}</TableHead>
                        <TableHead>{t('aiProviders.keys.latency', { defaultValue: 'Latency' })}</TableHead>
                        <TableHead>{t('aiProviders.keys.error', { defaultValue: 'Error' })}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testResult.keys.map((key) => (
                        <TableRow key={`${testResult.provider}-${key.keyIndex}`}>
                          <TableCell>{(key.keyIndex ?? 0) + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{key.maskedKey ?? '-'}</TableCell>
                          <TableCell>
                            <Badge className={`border ${getKeyStatusBadgeClass(key.status, isDarkMode)}`}>
                              {getKeyStatusLabel(key.status, t)}
                            </Badge>
                          </TableCell>
                          <TableCell>{key.latencyMs != null ? `${key.latencyMs} ms` : '-'}</TableCell>
                          <TableCell className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{key.errorMessage ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {t('aiProviders.history.title', {
                defaultValue: '{{provider}} test history (last {{hours}}h)',
                provider: activeProviderCard?.provider ?? '',
                hours: historyHours,
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 pb-2">
            <label htmlFor="history-hours" className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('aiProviders.history.rangeHours', { defaultValue: 'Window (hours)' })}
            </label>
            <select
              id="history-hours"
              value={historyHours}
              onChange={(event) => handleOpenHistory(activeProviderCard?.provider, Number(event.target.value))}
              className={`h-9 rounded-xl border px-2 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}
            >
              {[1, 6, 24, 72, 168].map((value) => (
                <option key={value} value={value}>{value}h</option>
              ))}
            </select>
          </div>
          {historyLoading ? (
            <ListSpinner />
          ) : historyEntries.length === 0 ? (
            <p className={`rounded-2xl border px-4 py-6 text-center text-sm ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
              {t('aiProviders.history.noData', { defaultValue: 'No test history in this time window.' })}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('aiProviders.history.checkedAt', { defaultValue: 'Time' })}</TableHead>
                    <TableHead>{t('aiProviders.keys.key', { defaultValue: 'API Key' })}</TableHead>
                    <TableHead>{t('aiProviders.keys.status', { defaultValue: 'Status' })}</TableHead>
                    <TableHead>{t('aiProviders.keys.latency', { defaultValue: 'Latency' })}</TableHead>
                    <TableHead>{t('aiProviders.history.checkedBy', { defaultValue: 'Tested by' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyEntries.map((entry) => (
                    <TableRow key={entry.healthCheckId}>
                      <TableCell className="text-xs">{formatCheckedAt(entry.checkedAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.maskedKey ?? '-'}</TableCell>
                      <TableCell>
                        <Badge className={`border ${getKeyStatusBadgeClass(entry.status, isDarkMode)}`}>
                          {getKeyStatusLabel(entry.status, t)}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.latencyMs != null ? `${entry.latencyMs} ms` : '-'}</TableCell>
                      <TableCell className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{entry.checkedByEmail ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}

export default AiProvidersOverview;
