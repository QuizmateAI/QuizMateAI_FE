import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getAccessToken } from '@/utils/tokenStorage';
import {
  Activity,
  Bot,
  Braces,
  CalendarClock,
  ChevronDown,
  Coins,
  KeyRound,
  Layers,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { getAiAuditLogs, getAiAuditSummary, getAllPlans, getUsdVndExchangeRate } from '@/api/ManagementSystemAPI';
import { mergeCompanionFeatureKeys } from '@/lib/aiModelCatalog';
import { useAiFeatureCatalog } from '@/hooks/useAiFeatureCatalog';
import TokenBreakdownCell from './Components/TokenBreakdownCell';
import DateRangeChips from './Components/DateRangeChips';
import AdminPagination from '@/pages/Admin/components/AdminPagination';
import { getWebSocketUrl } from '@/lib/websocketUrl';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
} from './Components/SuperAdminSurface';

const PROVIDER_OPTIONS = ['', 'OPENAI', 'GEMINI'];
const STATUS_OPTIONS = ['', 'PROCESSING', 'SUCCESS', 'ERROR'];
const CATEGORY_OPTIONS = ['', 'SYSTEM', 'PLAN_BASED'];
const EMPTY_AUDIT_METRICS = {
  requestCount: 0,
  totalTokens: 0,
  promptTokens: 0,
  completionTokens: 0,
  thoughtTokens: 0,
  systemCostVnd: 0,
  planCostVnd: 0,
  totalProviderCostVnd: 0,
};

const FEATURE_LABEL_KEYS = {
  GENERATE_FLASHCARDS: 'aiAudit.features.GENERATE_FLASHCARDS',
  GENERATE_QUIZ: 'aiAudit.features.GENERATE_QUIZ',
  EVALUATE_SHORT_ANSWER: 'aiAudit.features.EVALUATE_SHORT_ANSWER',
  COMPANION_: 'aiAudit.features.COMPANION_GROUP',
  COMPANION_INTERPRET: 'aiAudit.features.COMPANION_INTERPRET',
  COMPANION_TRANSCRIBE: 'aiAudit.features.COMPANION_TRANSCRIBE',
  COMPANION_TTS: 'aiAudit.features.COMPANION_TTS',
  GENERATE_ROADMAP: 'aiAudit.features.GENERATE_ROADMAP',
  GENERATE_ROADMAP_PHASES: 'aiAudit.features.GENERATE_ROADMAP_PHASES',
  GENERATE_ROADMAP_PHASE_CONTENT: 'aiAudit.features.GENERATE_ROADMAP_PHASE_CONTENT',
  CHECK_MATERIAL_COVERAGE: 'aiAudit.features.CHECK_MATERIAL_COVERAGE',
  WORKSPACE_QUIZ_ASSESSMENT: 'aiAudit.features.WORKSPACE_QUIZ_ASSESSMENT',
  PHASE_PRE_LEARNING_ASSESSMENT: 'aiAudit.features.PHASE_PRE_LEARNING_ASSESSMENT',
  PHASE_POST_LEARNING_ASSESSMENT: 'aiAudit.features.PHASE_POST_LEARNING_ASSESSMENT',
  RAG_ASK: 'aiAudit.features.RAG_ASK',
  CONTENT_MODERATION: 'aiAudit.features.CONTENT_MODERATION',
  GEMINI_VISION_OCR: 'aiAudit.features.GEMINI_VISION_OCR',
  GEMINI_PDF_FILE_OCR: 'aiAudit.features.GEMINI_PDF_FILE_OCR',
  GEMINI_VIDEO_FILE_ANALYSIS: 'aiAudit.features.GEMINI_VIDEO_FILE_ANALYSIS',
  MATERIAL_TOPIC_EXTRACTION: 'aiAudit.features.MATERIAL_TOPIC_EXTRACTION',
  ANALYZE_STUDY_PROFILE_KNOWLEDGE: 'aiAudit.features.ANALYZE_STUDY_PROFILE_KNOWLEDGE',
  SUGGEST_STUDY_PROFILE_FIELDS: 'aiAudit.features.SUGGEST_STUDY_PROFILE_FIELDS',
  SUGGEST_WORKSPACE_NAME: 'aiAudit.features.SUGGEST_WORKSPACE_NAME',
  VALIDATE_STUDY_PROFILE_CONSISTENCY: 'aiAudit.features.VALIDATE_STUDY_PROFILE_CONSISTENCY',
  PREVIEW_QUIZ_STRUCTURE: 'aiAudit.features.PREVIEW_QUIZ_STRUCTURE',
  SUGGEST_MOCK_TEST_STRUCTURE: 'aiAudit.features.SUGGEST_MOCK_TEST_STRUCTURE',
  ROADMAP_REVIEW: 'aiAudit.features.ROADMAP_REVIEW',
};

function formatDateTime(value, locale) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatTokenValue(value, locale) {
  return Number(value || 0).toLocaleString(locale);
}

function formatOptionalTokenValue(value, locale) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toLocaleString(locale);
}

function toMetricNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatVndValue(value, locale) {
  return `${Number(value || 0).toLocaleString(locale, { maximumFractionDigits: 0 })} VND`;
}

function formatExchangeRate(value) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 6 });
}

function extractData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function createEmptyAuditFilters() {
  return {
    provider: '',
    featureKey: '',
    actorEmail: '',
    planCatalogId: '',
    taskId: '',
    status: '',
    from: '',
    to: '',
    category: '',
  };
}

function getCategoryBadgeClass(category) {
  const normalized = String(category || '').toUpperCase();
  if (normalized === 'SYSTEM') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  }
  if (normalized === 'PLAN_BASED') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  }
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
}

function prettifyPreview(value, emptyText) {
  if (!value) return emptyText;
  if (typeof value !== 'string') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function getFeatureLabel(t, featureKey) {
  const key = FEATURE_LABEL_KEYS[featureKey];
  if (!key) return featureKey || '-';
  return t(key, featureKey);
}

function getStatusLabel(t, status) {
  const normalized = String(status || '').toUpperCase();
  if (!normalized) return '-';
  return t(`aiAudit.status.${normalized}`, normalized);
}

function getStatusBadgeClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PROCESSING') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  }
  if (normalized === 'SUCCESS') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  }
  if (normalized === 'ERROR') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
  }
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
}

function getProviderBadgeClass(provider) {
  const normalized = String(provider || '').toUpperCase();
  if (normalized === 'OPENAI') {
    return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400';
  }
  if (normalized === 'GEMINI') {
    return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
  }
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
}

function getAuthToken() {
  try {
    return getAccessToken() || null;
  } catch {
    return null;
  }
}

function MetricCard({ icon: Icon, label, value, tone, isDarkMode, subtext }) {
  return (
    <Card className={`border transition-colors ${
      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
    }`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {label}
            </p>
            <p className={`mt-2 text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {value}
            </p>
            {subtext ? (
              <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {subtext}
              </p>
            ) : null}
          </div>
          <div className={`rounded-2xl p-3 ${tone}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const AI_AUDIT_LOGS_KEY = ['superAdmin', 'aiAuditLogs'];
const AI_AUDIT_METRICS_KEY = ['superAdmin', 'aiAuditMetrics'];

function AiAuditManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const tableStroke = isDarkMode ? 'border-slate-700' : 'border-slate-300';

  const { catalog: featureCatalog } = useAiFeatureCatalog();
  const systemFeatureKeys = useMemo(
    () => featureCatalog.system,
    [featureCatalog.system],
  );
  const planBasedFeatureKeys = useMemo(
    () => mergeCompanionFeatureKeys(featureCatalog.planBased),
    [featureCatalog.planBased],
  );

  const [filters, setFilters] = useState(createEmptyAuditFilters);
  const [draftFilters, setDraftFilters] = useState(createEmptyAuditFilters);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState([]);
  const [expandedSelectedIndex, setExpandedSelectedIndex] = useState(-1);
  const [isExpanding, setIsExpanding] = useState(false);
  const stompClientRef = useRef(null);
  const refreshTimeoutRef = useRef(null);

  const buildAuditQuery = (activeFilters) => ({
    provider: activeFilters.provider || undefined,
    featureKey: activeFilters.featureKey || undefined,
    actorEmail: activeFilters.actorEmail || undefined,
    planCatalogId: activeFilters.planCatalogId || undefined,
    taskId: activeFilters.taskId || undefined,
    status: activeFilters.status || undefined,
    from: activeFilters.from ? new Date(activeFilters.from).toISOString() : undefined,
    to: activeFilters.to ? new Date(activeFilters.to).toISOString() : undefined,
    category: activeFilters.category || undefined,
  });

  const auditLogsQuery = useQuery({
    queryKey: [...AI_AUDIT_LOGS_KEY, page, pageSize, filters],
    queryFn: async () => {
      const response = await getAiAuditLogs({
        ...buildAuditQuery(filters),
        page,
        size: pageSize,
      });
      const pageData = response?.data ?? response ?? {};
      const content = Array.isArray(pageData?.content) ? pageData.content : [];
      return {
        auditLogs: content,
        pageInfo: {
          totalElements: Number(pageData?.totalElements || 0),
          totalPages: Number(pageData?.totalPages || 0),
          page: Number(pageData?.page || 0),
          size: Number(pageData?.size || pageSize),
        },
      };
    },
    placeholderData: (previous) => previous,
  });
  const auditLogs = auditLogsQuery.data?.auditLogs ?? [];
  const pageInfo = auditLogsQuery.data?.pageInfo ?? { totalElements: 0, totalPages: 0, page: 0, size: pageSize };
  const isLoading = auditLogsQuery.isLoading;
  const error = auditLogsQuery.error
    ? (auditLogsQuery.error?.message || t('aiAudit.errors.loadLogs', 'Unable to load AI audit logs'))
    : '';

  const metricsQuery = useQuery({
    queryKey: [...AI_AUDIT_METRICS_KEY, filters],
    queryFn: async () => {
      const firstResponse = await getAiAuditLogs({
        ...buildAuditQuery(filters),
        page: 0,
        size: AUDIT_METRICS_PAGE_SIZE,
      });
      const firstPage = firstResponse?.data ?? firstResponse ?? {};
      const directMetrics = extractAuditMetrics(firstPage);
      if (directMetrics) return directMetrics;

      const allEntries = Array.isArray(firstPage?.content) ? [...firstPage.content] : [];
      const totalPages = Number(firstPage?.totalPages || 0);
      if (totalPages > 1) {
        const remainingResponses = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) => getAiAuditLogs({
            ...buildAuditQuery(filters),
            page: index + 1,
            size: AUDIT_METRICS_PAGE_SIZE,
          })),
        );
        remainingResponses.forEach((response) => {
          const pageData = response?.data ?? response ?? {};
          const content = Array.isArray(pageData?.content) ? pageData.content : [];
          allEntries.push(...content);
        });
      }
      return buildAuditMetricsFromEntries(allEntries);
    },
  });
  const metrics = metricsQuery.data ?? EMPTY_AUDIT_METRICS;

  // Drop selectedAuditId if no longer in current page
  useEffect(() => {
    if (!selectedAuditId) return;
    if (!auditLogs.some((entry) => entry.auditId === selectedAuditId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync derived selection with current page
      setSelectedAuditId(null);
    }
  }, [auditLogs, selectedAuditId]);

  // Apply ?taskId= from URL
  useEffect(() => {
    const taskId = String(searchParams.get('taskId') || '').trim();
    if (!taskId || taskId === filters.taskId) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync URL param into filter state
    setFilters((prev) => ({ ...prev, taskId }));
    setPage(0);
    fetchAuditLogs(0, pageSizeRef.current, nextFilters);
    fetchAuditMetrics(nextFilters);
  }, [searchParams]);

  useEffect(() => {
    fetchAuditLogs(page, pageSize, filters);
  }, [page, pageSize]);

  useEffect(() => {
    fetchAuditMetrics(filtersRef.current);
  }, []);

  useEffect(() => {
    const websocketUrl = getWebSocketUrl();
    if (!websocketUrl) return undefined;

    const token = getAuthToken();
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(websocketUrl),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        stompClient.subscribe('/topic/admin/ai-audit', () => {
          if (refreshTimeoutRef.current) {
            window.clearTimeout(refreshTimeoutRef.current);
          }
          refreshTimeoutRef.current = window.setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: AI_AUDIT_LOGS_KEY });
            queryClient.invalidateQueries({ queryKey: AI_AUDIT_METRICS_KEY });
          }, 350);
        });
      },
      onDisconnect: () => {},
      onStompError: () => {},
      onWebSocketClose: () => {},
      onWebSocketError: () => {},
    });

    stompClientRef.current = stompClient;
    stompClient.activate();

    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [queryClient]);

  const selectedAudit = useMemo(
    () => auditLogs.find((entry) => entry.auditId === selectedAuditId) || null,
    [auditLogs, selectedAuditId]
  );

  const totalRequestsForDisplay = metrics.requestCount || pageInfo.totalElements || 0;
  const totalAverageTokens = totalRequestsForDisplay > 0
    ? Math.round(metrics.totalTokens / totalRequestsForDisplay)
    : 0;

  const activeFilterCount = Object.values(filters).filter((value) => String(value ?? '').trim() !== '').length;

  const handleDraftFilterChange = (field, value) => {
    setDraftFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenFilterDialog = () => {
    setDraftFilters({ ...filters });
    setIsFilterDialogOpen(true);
  };

  const handleApplyFilters = () => {
    const next = { ...draftFilters };
    setFilters(next);
    setPage(0);
    fetchAuditLogs(0, pageSize, filters);
    fetchAuditMetrics(filters);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      provider: '',
      featureKey: '',
      actorUserId: '',
      taskId: '',
      status: '',
      from: '',
      to: '',
    };
    setFilters(resetFilters);
    setPage(0);
    fetchAuditLogs(0, pageSize, resetFilters);
    fetchAuditMetrics(resetFilters);
  };

  const openAuditDetail = async (auditId) => {
    setSelectedAuditId(auditId);
    setIsDetailOpen(true);
    setExpandedRows([]);
    setExpandedSelectedIndex(-1);

    const entry = auditLogs.find((row) => row.auditId === auditId);
    const callCount = Number(entry?.callCount || 1);
    if (!entry || callCount <= 1 || !entry.taskId) {
      return;
    }

    setIsExpanding(true);
    try {
      const response = await getAiAuditLogs({
        taskId: entry.taskId,
        expand: true,
        page: 0,
        size: Math.max(callCount, 50),
      });
      const pageData = response?.data ?? response ?? {};
      const rows = Array.isArray(pageData?.content) ? pageData.content : [];
      setExpandedRows(rows);
      setExpandedSelectedIndex(-1);
    } catch {
      setExpandedRows([]);
    } finally {
      setIsExpanding(false);
    }
  };

  const closeAuditDetail = (open) => {
    setIsDetailOpen(open);
    if (!open) {
      setExpandedRows([]);
      setExpandedSelectedIndex(-1);
    }
  };

  const selectedSubRow = (
    expandedRows.length > 0
    && expandedSelectedIndex >= 0
    && expandedSelectedIndex < expandedRows.length
  )
    ? expandedRows[expandedSelectedIndex]
    : null;


  return (
    <SuperAdminPage className={`animate-in fade-in duration-500 ${fontClass}`}>
      <SuperAdminPageHeader
        eyebrow="AI Governance"
        title={t('aiAudit.title', 'AI Audit')}
        description={t(
          'aiAudit.description',
          'Track AI requests, token usage, models, statuses, and open detailed traces when needed.'
        )}
        actions={(
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => { fetchAuditLogs(page, pageSize, filters); fetchAuditMetrics(filters); fetchExchangeRate(); }}
            disabled={isLoading || exchangeRateLoading}
            className="h-10 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={t('common.refresh')}
            title={t('common.refresh')}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={Activity}
          label={t('aiAudit.metrics.totalRequests', 'Total requests')}
          value={formatTokenValue(totalRequestsForDisplay, locale)}
          tone="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          isDarkMode={isDarkMode}
          subtext={t('aiAudit.metrics.totalRequestsHint', 'System + plan-based features only')}
        />
        <MetricCard
          icon={Sparkles}
          label={t('aiAudit.metrics.totalTokens', 'Total tokens')}
          value={formatTokenValue(metrics.totalTokens, locale)}
          tone="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
          isDarkMode={isDarkMode}
          subtext={t('aiAudit.metrics.totalTokensBreakdown', {
            prompt: formatTokenValue(metrics.promptTokens, locale),
            thought: formatTokenValue(metrics.thoughtTokens, locale),
            output: formatTokenValue(metrics.completionTokens, locale),
            defaultValue: 'Prompt {{prompt}} | Thought {{thought}} | Output {{output}}',
          })}
        />
        <MetricCard
          icon={Coins}
          label={t('aiAudit.metrics.systemCost', 'System cost')}
          value={formatVndValue(metrics.systemCostVnd, locale)}
          tone="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          isDarkMode={isDarkMode}
          subtext={t('aiAudit.metrics.systemCostHint', 'Provider cost of system features')}
        />
        <MetricCard
          icon={Wallet}
          label={t('aiAudit.metrics.planCost', 'Plan cost')}
          value={formatVndValue(metrics.planCostVnd, locale)}
          tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          isDarkMode={isDarkMode}
          subtext={t('aiAudit.metrics.planCostHint', 'Provider cost of plan-based features. Avg {{avg}} tokens/request', {
            avg: formatTokenValue(totalAverageTokens, locale),
          })}
        />
      </div>

      <Card className={`border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <CardHeader className="pb-4">
          <CardTitle className={`text-lg ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {t('aiAudit.filters.title', 'AI audit filters')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="audit-filter-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <select
              value={filters.provider}
              onChange={(event) => handleFilterChange('provider', event.target.value)}
              className={`h-11 w-full min-w-0 rounded-xl border px-3 text-sm ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <option value="">{t('aiAudit.filters.allProviders', 'All providers')}</option>
              {PROVIDER_OPTIONS.filter(Boolean).map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
              className={`h-11 w-full min-w-0 rounded-xl border px-3 text-sm ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <option value="">{t('aiAudit.filters.allStatuses', 'All statuses')}</option>
              {STATUS_OPTIONS.filter(Boolean).map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(t, status)}
                </option>
              ))}
            </select>
            <Input
              value={filters.featureKey}
              onChange={(event) => handleFilterChange('featureKey', event.target.value)}
              placeholder={t('aiAudit.filters.featureKeyPlaceholder', 'Feature key')}
              className={`h-11 w-full min-w-0 rounded-xl ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
            />
            <Input
              value={filters.actorUserId}
              onChange={(event) => handleFilterChange('actorUserId', event.target.value)}
              placeholder={t('aiAudit.filters.userIdPlaceholder', 'User ID')}
              className={`h-11 w-full min-w-0 rounded-xl ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
            />
          </div>

          <div className="audit-filter-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Input
              value={filters.taskId}
              onChange={(event) => handleFilterChange('taskId', event.target.value)}
              placeholder={t('aiAudit.filters.taskIdPlaceholder', 'Task ID')}
              className={`h-11 w-full min-w-0 rounded-xl ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
            />
            <Input
              type="datetime-local"
              value={filters.from}
              onChange={(event) => handleFilterChange('from', event.target.value)}
              className={`h-11 w-full min-w-0 rounded-xl ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
            />
            <Input
              type="datetime-local"
              value={filters.to}
              onChange={(event) => handleFilterChange('to', event.target.value)}
              className={`h-11 w-full min-w-0 rounded-xl ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
            />
            <div className="flex min-h-11 min-w-0 flex-wrap items-center justify-end gap-2 sm:justify-start xl:justify-end">
              <Button variant="outline" onClick={handleResetFilters} className="rounded-xl">
                {t('aiAudit.filters.reset', 'Reset filters')}
              </Button>
              <Button onClick={handleApplyFilters} className="rounded-xl bg-blue-600 hover:bg-blue-700">
                <Search className="mr-2 h-4 w-4" />
                {t('aiAudit.filters.apply', 'Apply filters')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: AI_AUDIT_LOGS_KEY });
                  queryClient.invalidateQueries({ queryKey: AI_AUDIT_METRICS_KEY });
                }}
                disabled={auditLogsQuery.isFetching}
                className="rounded-xl"
                aria-label={t('common.refresh')}
                title={t('common.refresh')}
              >
                <RefreshCw className={`h-4 w-4 ${auditLogsQuery.isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
      <div className={`flex flex-col gap-4 rounded-2xl border p-5 lg:flex-row lg:items-center lg:justify-between ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'}`}>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiCosts.exchangeRate.title', 'Tỷ giá USD/VND hiện tại')}</p>
          <p className={`mt-1 text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatExchangeRate(exchangeRate?.rate)}</p>
          <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {(exchangeRate?.source || t('aiCosts.exchangeRate.unknown', 'Không rõ nguồn'))}
            {exchangeRate?.fetchedAt ? ` • ${formatDateTime(exchangeRate.fetchedAt, locale)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fetchExchangeRate()}
            disabled={exchangeRateLoading}
            className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
            aria-label={t('aiCosts.exchangeRate.refresh', 'Làm mới tỷ giá')}
            title={t('aiCosts.exchangeRate.refresh', 'Làm mới tỷ giá')}
          >
            <RefreshCw className={`h-4 w-4 ${exchangeRateLoading ? 'animate-spin' : ''}`} />
          </Button>
          <DateRangeChips
            value={{ from: filters.from, to: filters.to }}
            onChange={handleDateRangeChipChange}
            isDarkMode={isDarkMode}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenFilterDialog}
            className={`rounded-xl ${isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}`}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            {t('aiAudit.filters.open', 'Bộ lọc')}
            {activeFilterCount > 0 ? (
              <span className={`ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className={`sm:max-w-5xl ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : 'text-slate-900'}>
              {t('aiAudit.filters.dialogTitle', 'Lọc AI audit')}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
              {t('aiAudit.filters.dialogDescription', 'Chọn các điều kiện để thu gọn danh sách AI audit log.')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 lg:grid-cols-4">
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.provider', 'Provider')}</Label>
              <select
                value={draftFilters.provider}
                onChange={(event) => handleDraftFilterChange('provider', event.target.value)}
                className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
              >
                <option value="">{t('aiAudit.filters.allProviders', 'Tất cả provider')}</option>
                {PROVIDER_OPTIONS.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.category', 'Nhóm tính năng')}</Label>
              <select
                value={draftFilters.category}
                onChange={(event) => handleDraftFilterChange('category', event.target.value)}
                className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
              >
                <option value="">{t('aiAudit.filters.allCategories', 'Tất cả nhóm')}</option>
                {CATEGORY_OPTIONS.filter(Boolean).map((option) => (
                  <option key={option} value={option}>{t(`aiAudit.category.${option}`, option)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.plan', { defaultValue: 'Gói' })}</Label>
              <select
                value={draftFilters.planCatalogId}
                onChange={(event) => handleDraftFilterChange('planCatalogId', event.target.value)}
                className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
              >
                <option value="">{t('aiAudit.filters.allPlans', { defaultValue: 'Tất cả gói' })}</option>
                {plans.map((plan) => (
                  <option key={plan.planCatalogId} value={plan.planCatalogId}>{plan.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.status', 'Trạng thái')}</Label>
              <select
                value={draftFilters.status}
                onChange={(event) => handleDraftFilterChange('status', event.target.value)}
                className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
              >
                <option value="">{t('aiAudit.filters.allStatuses', 'Tất cả trạng thái')}</option>
                {STATUS_OPTIONS.filter(Boolean).map((option) => (
                  <option key={option} value={option}>{getStatusLabel(t, option)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.featureKeyPlaceholder', 'Feature key')}</Label>
              <select
                value={draftFilters.featureKey}
                onChange={(event) => handleDraftFilterChange('featureKey', event.target.value)}
                className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
              >
                <option value="">{t('aiAudit.filters.allFeatureKeys', 'Tất cả feature key')}</option>
                <optgroup label={t('aiAudit.category.SYSTEM', 'Hệ thống')}>
                  {systemFeatureKeys.map((featureKey) => (
                    <option key={featureKey} value={featureKey}>{getFeatureLabel(t, featureKey)}</option>
                  ))}
                </optgroup>
                <optgroup label={t('aiAudit.category.PLAN_BASED', 'Theo gói')}>
                  {planBasedFeatureKeys.map((featureKey) => (
                    <option key={featureKey} value={featureKey}>{getFeatureLabel(t, featureKey)}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.actorEmail', { defaultValue: 'Email người dùng' })}</Label>
              <Input
                type="email"
                value={draftFilters.actorEmail}
                onChange={(event) => handleDraftFilterChange('actorEmail', event.target.value)}
                className={`mt-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500' : ''}`}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.taskIdPlaceholder', 'Task ID')}</Label>
              <Input
                value={draftFilters.taskId}
                onChange={(event) => handleDraftFilterChange('taskId', event.target.value)}
                className={`mt-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500' : ''}`}
                placeholder="task-..."
              />
            </div>
            <div className="lg:col-span-2">
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.from', 'Từ thời điểm')}</Label>
              <Input
                type="datetime-local"
                value={draftFilters.from}
                onChange={(event) => handleDraftFilterChange('from', event.target.value)}
                className={`mt-1.5 w-full ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : ''}`}
              />
            </div>
            <div className="lg:col-span-2">
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.to', 'Đến thời điểm')}</Label>
              <Input
                type="datetime-local"
                value={draftFilters.to}
                onChange={(event) => handleDraftFilterChange('to', event.target.value)}
                className={`mt-1.5 w-full ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : ''}`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleResetFilters}>
              {t('aiAudit.filters.reset', 'Xóa lọc')}
            </Button>
            <Button onClick={handleApplyFilters}>
              <Search className="mr-2 h-4 w-4" />
              {t('aiAudit.filters.apply', 'Áp dụng')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-100 px-4 py-3 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
          {error}
        </div>
      ) : null}

      <Card className={`border-2 overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-lg ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {t('aiAudit.table.title', 'AI request list')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1420px]">
              <TableHeader className={isDarkMode ? 'bg-slate-950/40' : 'bg-slate-50/60'}>
                <TableRow className={`border-b-2 ${tableStroke}`}>
                  <TableHead className={`w-[220px] border-r font-semibold ${tableStroke} ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{t('aiAudit.table.actor', 'Actor')}</TableHead>
                  <TableHead className={`w-[180px] border-r font-semibold ${tableStroke} ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{t('aiAudit.table.feature', 'Feature')}</TableHead>
                  <TableHead className={`w-[120px] border-r font-semibold ${tableStroke} ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{t('aiAudit.table.category', 'Category')}</TableHead>
                  <TableHead className={`w-[140px] border-r font-semibold ${tableStroke} ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{t('aiAudit.table.plan', { defaultValue: 'Gói' })}</TableHead>
                  <TableHead className={`w-[260px] border-r text-center font-semibold ${tableStroke} ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{t('aiAudit.table.tokens', 'Tokens')}</TableHead>
                  <TableHead className={`w-[140px] border-r font-semibold ${tableStroke} ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{t('aiAudit.table.systemCost', 'System cost')}</TableHead>
                  <TableHead className={`w-[140px] border-r font-semibold ${tableStroke} ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{t('aiAudit.table.model', 'Model')}</TableHead>
                  <TableHead className={`w-[120px] border-r font-semibold ${tableStroke} ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{t('aiAudit.table.provider', 'Provider')}</TableHead>
                  <TableHead className={`w-[140px] border-r font-semibold ${tableStroke} ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{t('aiAudit.table.status', 'Request status')}</TableHead>
                  <TableHead className={`w-[180px] font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{t('aiAudit.table.createdAt', 'Created')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {auditLogs.map((entry) => {
                    const actorName = entry.actorFullName || entry.actorUsername || entry.actorEmail || t('aiAudit.table.systemUser', 'System user');
                  return (
                    <TableRow
                      key={entry.auditId}
                      onClick={() => openAuditDetail(entry.auditId)}
                      className={`cursor-pointer border-b transition-colors ${tableStroke} ${
                        isDarkMode ? 'bg-slate-900 hover:bg-slate-800/60' : 'bg-white hover:bg-blue-50/60'
                      }`}
                    >
                      <TableCell className={`py-4 align-middle border-r ${tableStroke}`}>
                        <div className="space-y-1">
                          <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            {actorName}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {entry.actorEmail || t('aiAudit.table.noEmail', 'No email')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className={`py-4 align-middle border-r ${tableStroke}`}>
                        <div className="space-y-1">
                          <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                            {getFeatureLabel(t, entry.featureKey)}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {entry.featureKey}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className={`py-4 align-middle border-r ${tableStroke}`}>
                        {entry.category ? (
                          <Badge className={`border-none ${getCategoryBadgeClass(entry.category)}`}>
                            {t(`aiAudit.category.${entry.category}`, entry.category)}
                          </Badge>
                        ) : (
                          <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
                        )}
                      </TableCell>
                      <TableCell className={`py-4 align-middle border-r text-sm ${tableStroke} ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {entry.planDisplayName || (
                          <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>—</span>
                        )}
                      </TableCell>
                      <TableCell className={`py-4 text-center align-middle border-r ${tableStroke}`}>
                        <TokenBreakdownCell row={entry} isDarkMode={isDarkMode} />
                      </TableCell>
                      <TableCell className={`py-4 align-middle border-r text-sm ${tableStroke} ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {formatVndValue(entry.providerCostVnd, locale)}
                      </TableCell>
                      <TableCell className={`py-4 align-middle border-r text-sm ${tableStroke} ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {entry.modelName || '-'}
                      </TableCell>
                      <TableCell className={`py-4 align-middle border-r ${tableStroke}`}>
                        <Badge className={`border-none ${getProviderBadgeClass(entry.provider)}`}>
                          {entry.provider || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`py-4 align-middle border-r ${tableStroke}`}>
                        <Badge className={`border-none ${getStatusBadgeClass(entry.status)}`}>
                          {getStatusLabel(t, entry.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className={`py-4 align-middle text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDateTime(entry.createdAt, locale)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-16 text-center text-slate-400">
                      {t('aiAudit.table.empty', 'No AI audit logs match the current filters.')}
                    </TableCell>
                  </TableRow>
                ) : null}
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center">
                      <ListSpinner variant="table" />
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <AdminPagination
            currentPage={pageInfo.page}
            totalPages={pageInfo.totalPages}
            totalElements={pageInfo.totalElements}
            pageSize={pageInfo.size}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPage(0);
              setPageSize(nextSize);
            }}
            isDarkMode={isDarkMode}
          />
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={closeAuditDetail}>
        <DialogContent
          className={`max-w-5xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white'}`}
        >
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : 'text-slate-900'}>
              {t('aiAudit.detail.title', 'AI request details')}
            </DialogTitle>
          </DialogHeader>

          {selectedAudit ? (
            <div className="space-y-5">
              {isExpanding ? (
                <div className="flex items-center justify-center py-3">
                  <ListSpinner variant="table" />
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <UserRound className="h-4 w-4 text-blue-500" />
                    {t('aiAudit.detail.user', 'User')}
                  </div>
                  <p className={`mt-3 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {selectedAudit.actorFullName || selectedAudit.actorUsername || '-'}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {selectedAudit.actorEmail || t('aiAudit.table.noEmail', 'No email')}
                  </p>
                </div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarClock className="h-4 w-4 text-amber-500" />
                    {t('aiAudit.detail.requestStatus', 'Request status')}
                  </div>
                  <p className={`mt-3 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {getStatusLabel(t, selectedAudit.status)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Badge className={`border-none ${getStatusBadgeClass(selectedAudit.status)}`}>
                      {getStatusLabel(t, selectedAudit.status)}
                    </Badge>
                    <Badge className={`border-none ${getProviderBadgeClass(selectedAudit.provider)}`}>
                      {selectedAudit.provider}
                    </Badge>
                  </div>
                  <p className={`mt-3 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {formatDateTime(selectedAudit.createdAt, locale)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Bot className="h-4 w-4 text-violet-500" />
                    {t('aiAudit.detail.featureAndModel', 'Feature and model')}
                  </div>
                  <p className={`mt-3 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {getFeatureLabel(t, selectedAudit.featureKey)}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {selectedAudit.featureKey}
                  </p>
                  <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t('aiAudit.detail.modelLabel', 'Model:')} <span className="font-semibold">{selectedAudit.modelName || '-'}</span>
                  </p>
                </div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <KeyRound className="h-4 w-4 text-emerald-500" />
                    {t('aiAudit.detail.apiKeyLabel', 'API key label')}
                  </div>
                  <p className={`mt-3 font-semibold break-all ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {selectedAudit.apiKeyLabel || '-'}
                  </p>
                  <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('aiAudit.detail.apiKeyHint', 'The key is masked so the real secret is not exposed.')}
                  </p>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-rose-500" />
                    {Number(selectedAudit.callCount || 1) > 1
                      ? t('aiAudit.detail.tokensTotal', 'Total tokens (whole session)')
                      : t('aiAudit.detail.tokens', 'Tokens')}
                  </span>
                  {Number(selectedAudit.callCount || 1) > 1 ? (
                    <Badge className="border-none bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      <Layers className="mr-1 h-3 w-3" />
                      {t('aiAudit.table.callCount', '{{count}} calls', { count: Number(selectedAudit.callCount || 1) })}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>{t('aiAudit.detail.inputTokens', 'Input')}</p>
                    <p className={`mt-1 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {formatTokenValue(selectedAudit.promptTokens, locale)}
                    </p>
                  </div>
                  <div>
                    <p className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>{t('aiAudit.detail.thoughtTokens', 'Thought')}</p>
                    <p className={`mt-1 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {formatOptionalTokenValue(selectedAudit.thoughtTokens, locale)}
                    </p>
                  </div>
                  <div>
                    <p className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>{t('aiAudit.detail.outputTokens', 'Output')}</p>
                    <p className={`mt-1 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {formatTokenValue(selectedAudit.completionTokens, locale)}
                    </p>
                  </div>
                  <div>
                    <p className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>{t('aiAudit.detail.totalTokens', 'Total')}</p>
                    <p className={`mt-1 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {formatTokenValue(selectedAudit.totalTokens, locale)}
                    </p>
                  </div>
                </div>
                <div className={`mt-3 flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                  isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
                }`}>
                  <span className={`flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Coins className="h-4 w-4 text-amber-500" />
                    {t('aiAudit.detail.systemCost', 'System cost (provider)')}
                  </span>
                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {formatVndValue(selectedAudit.providerCostVnd, locale)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{t('aiAudit.detail.operation', 'Operation')}</p>
                  <div className={`mt-3 space-y-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <p>{t('aiAudit.detail.operationLabel', 'Operation:')} <span className="font-medium">{selectedAudit.operationName || '-'}</span></p>
                    <p>{t('aiAudit.detail.endpointLabel', 'Endpoint:')} <span className="font-medium break-all">{selectedAudit.endpointPath || '-'}</span></p>
                  </div>
                </div>
              </div>

              {expandedRows.length > 0 ? (
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Layers className="h-4 w-4 text-indigo-500" />
                      {t('aiAudit.detail.callsHeader', '{{count}} AI calls in this session', {
                        count: expandedRows.length,
                      })}
                    </div>
                    <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {t('aiAudit.detail.callsHint', 'Click a call to view its input / output')}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
                    {expandedRows.map((row, idx) => {
                      const isActive = idx === expandedSelectedIndex;
                      return (
                        <button
                          key={row.auditId}
                          type="button"
                          onClick={() => setExpandedSelectedIndex(isActive ? -1 : idx)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                            isActive
                              ? (isDarkMode ? 'border-indigo-500 bg-indigo-900/30' : 'border-indigo-300 bg-indigo-50')
                              : (isDarkMode ? 'border-slate-800 hover:bg-slate-800/60' : 'border-slate-200 hover:bg-slate-100')
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-xs opacity-80">#{idx + 1}</span>
                            <span className="font-medium">{formatDateTime(row.createdAt, locale)}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <Badge className={`border-none ${getStatusBadgeClass(row.status)}`}>
                              {getStatusLabel(t, row.status)}
                            </Badge>
                            <span className="text-xs opacity-70">
                              {formatTokenValue(row.totalTokens, locale)} {t('aiAudit.detail.tokensSuffix', 'tokens')}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {(() => {
                const isMultiCall = expandedRows.length > 0;
                const callForDetail = selectedSubRow ?? (isMultiCall ? null : selectedAudit);
                if (!callForDetail) {
                  return (
                    <div className={`rounded-2xl border-2 border-dashed p-10 text-center text-sm ${
                      isDarkMode ? 'border-slate-700 text-slate-400 bg-slate-950/30' : 'border-slate-300 text-slate-500 bg-slate-50/60'
                    }`}>
                      <Layers className="mx-auto mb-2 h-6 w-6 opacity-60" />
                      {t('aiAudit.detail.selectCallHint', 'Click a call above to view its input, output, and per-call tokens.')}
                    </div>
                  );
                }
                return (
                  <div className="space-y-4">
                    {selectedSubRow != null ? (
                      <div className={`rounded-2xl border p-4 ${
                        isDarkMode ? 'border-indigo-700/60 bg-indigo-950/30' : 'border-indigo-300 bg-indigo-50/60'
                      }`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <ChevronDown className="h-4 w-4 text-indigo-500" />
                            <span className={isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}>
                              {t('aiAudit.detail.callDetailHeader', 'Detail of call #{{index}}', { index: expandedSelectedIndex + 1 })}
                            </span>
                            <Badge className={`border-none ${getStatusBadgeClass(callForDetail.status)}`}>
                              {getStatusLabel(t, callForDetail.status)}
                            </Badge>
                          </div>
                          <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatDateTime(callForDetail.createdAt, locale)}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>{t('aiAudit.detail.inputTokens', 'Input')}</p>
                            <p className={`mt-1 text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {formatTokenValue(callForDetail.promptTokens, locale)}
                            </p>
                          </div>
                          <div>
                            <p className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>{t('aiAudit.detail.thoughtTokens', 'Thought')}</p>
                            <p className={`mt-1 text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {formatOptionalTokenValue(callForDetail.thoughtTokens, locale)}
                            </p>
                          </div>
                          <div>
                            <p className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>{t('aiAudit.detail.outputTokens', 'Output')}</p>
                            <p className={`mt-1 text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {formatTokenValue(callForDetail.completionTokens, locale)}
                            </p>
                          </div>
                          <div>
                            <p className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>{t('aiAudit.detail.totalTokens', 'Total')}</p>
                            <p className={`mt-1 text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {formatTokenValue(callForDetail.totalTokens, locale)}
                            </p>
                          </div>
                        </div>
                        <div className={`mt-3 flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                          isDarkMode ? 'border-indigo-700/40 bg-indigo-950/40' : 'border-indigo-200 bg-white'
                        }`}>
                          <span className={`flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Coins className="h-4 w-4 text-amber-500" />
                            {t('aiAudit.detail.systemCost', 'System cost (provider)')}
                          </span>
                          <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {formatVndValue(callForDetail.providerCostVnd, locale)}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {callForDetail.errorMessage ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-100 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                        <p className="font-semibold">{t('aiAudit.detail.error', 'Error')}</p>
                        <p className="mt-2 whitespace-pre-wrap break-words">{callForDetail.errorMessage}</p>
                      </div>
                    ) : null}

                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Braces className="h-4 w-4 text-blue-500" />
                        {t('aiAudit.detail.requestPreview', 'Input')}
                      </div>
                      <pre className={`max-h-[320px] overflow-auto rounded-2xl border p-4 text-xs leading-6 whitespace-pre-wrap break-words ${
                        isDarkMode
                          ? 'border-slate-800 bg-slate-950 text-slate-200'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}>
                        {prettifyPreview(callForDetail.requestPreview, t('aiAudit.detail.noPreview', 'No data available'))}
                      </pre>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Braces className="h-4 w-4 text-emerald-500" />
                        {t('aiAudit.detail.responsePreview', 'Output')}
                      </div>
                      <pre className={`max-h-[320px] overflow-auto rounded-2xl border p-4 text-xs leading-6 whitespace-pre-wrap break-words ${
                        isDarkMode
                          ? 'border-slate-800 bg-slate-950 text-slate-200'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}>
                        {prettifyPreview(callForDetail.responsePreview, t('aiAudit.detail.noPreview', 'No data available'))}
                      </pre>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className={`rounded-2xl border border-dashed p-10 text-center ${
              isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'
            }`}>
              {t(
                'aiAudit.detail.missing',
                'This request is no longer present in the current list. Close the dialog and refresh the list if needed.'
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}

export default AiAuditManagement;
