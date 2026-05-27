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
  HelpCircle,
  KeyRound,
  Layers,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { getAiAuditLogs, getUsdVndExchangeRate } from '@/api/ManagementSystemAPI';
import TokenBreakdownCell from './Components/TokenBreakdownCell';
import DateRangeChips from './Components/DateRangeChips';
import TopFeaturesByCostCard from './Components/TopFeaturesByCostCard';
import AdminPagination from '@/pages/Admin/components/AdminPagination';
import { getWebSocketUrl } from '@/lib/websocketUrl';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
} from './Components/SuperAdminSurface';

const AUDIT_METRICS_PAGE_SIZE = 200;
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
  SYNTHESIZE_MOCKTEST_TEMPLATE_FROM_MATERIALS: 'aiAudit.features.SYNTHESIZE_MOCKTEST_TEMPLATE_FROM_MATERIALS',
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

function buildAuditMetricsFromEntries(entries = []) {
  return entries.reduce((accumulator, entry) => {
    const providerCost = toMetricNumber(entry?.providerCostVnd);
    accumulator.requestCount += 1;
    accumulator.totalTokens += toMetricNumber(entry?.totalTokens);
    accumulator.promptTokens += toMetricNumber(entry?.promptTokens);
    accumulator.completionTokens += toMetricNumber(entry?.completionTokens);
    accumulator.thoughtTokens += toMetricNumber(entry?.thoughtTokens);
    accumulator.totalProviderCostVnd += providerCost;

    if (String(entry?.category || '').toUpperCase() === 'PLAN_BASED') {
      accumulator.planCostVnd += providerCost;
    } else {
      accumulator.systemCostVnd += providerCost;
    }

    return accumulator;
  }, { ...EMPTY_AUDIT_METRICS });
}

function bucketKeyFromTimestamp(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildAuditAggregatesFromEntries(entries = []) {
  const totals = buildAuditMetricsFromEntries(entries);
  const dailyMap = new Map();
  const featureMap = new Map();

  entries.forEach((entry) => {
    const providerCost = toMetricNumber(entry?.providerCostVnd);
    const totalTokens = toMetricNumber(entry?.totalTokens);
    const isPlanBased = String(entry?.category || '').toUpperCase() === 'PLAN_BASED';

    const bucket = bucketKeyFromTimestamp(entry?.createdAt);
    if (bucket) {
      const existing = dailyMap.get(bucket) || {
        bucket,
        requestCount: 0,
        totalTokens: 0,
        systemCostVnd: 0,
        planCostVnd: 0,
      };
      existing.requestCount += 1;
      existing.totalTokens += totalTokens;
      if (isPlanBased) {
        existing.planCostVnd += providerCost;
      } else {
        existing.systemCostVnd += providerCost;
      }
      dailyMap.set(bucket, existing);
    }

    const feature = entry?.featureKey || 'UNKNOWN';
    const fExisting = featureMap.get(feature) || {
      featureKey: feature,
      providerCostVnd: 0,
      requestCount: 0,
    };
    fExisting.providerCostVnd += providerCost;
    fExisting.requestCount += 1;
    featureMap.set(feature, fExisting);
  });

  const dailyBuckets = [...dailyMap.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));
  const topFeatures = [...featureMap.values()]
    .filter((f) => f.providerCostVnd > 0)
    .sort((a, b) => b.providerCostVnd - a.providerCostVnd)
    .slice(0, 8);

  return { ...totals, dailyBuckets, topFeatures };
}

function normalizeAuditMetrics(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const requestCount = payload.requestCount ?? payload.totalRequests ?? payload.totalElements ?? payload.count;
  const totalTokens = payload.totalTokens ?? payload.totalTokenCount;
  const promptTokens = payload.promptTokens ?? payload.totalPromptTokens ?? payload.inputTokens;
  const completionTokens = payload.completionTokens ?? payload.totalCompletionTokens ?? payload.outputTokens;
  const thoughtTokens = payload.thoughtTokens ?? payload.totalThoughtTokens;
  const systemCostVnd = payload.systemCostVnd ?? payload.totalSystemCostVnd;
  const planCostVnd = payload.planCostVnd ?? payload.totalPlanCostVnd;
  const totalProviderCostVnd = payload.totalProviderCostVnd ?? payload.providerCostVnd;

  if (
    totalTokens === undefined
    && promptTokens === undefined
    && completionTokens === undefined
    && thoughtTokens === undefined
    && systemCostVnd === undefined
    && planCostVnd === undefined
    && totalProviderCostVnd === undefined
  ) {
    return null;
  }

  return {
    requestCount: toMetricNumber(requestCount),
    totalTokens: toMetricNumber(totalTokens),
    promptTokens: toMetricNumber(promptTokens),
    completionTokens: toMetricNumber(completionTokens),
    thoughtTokens: toMetricNumber(thoughtTokens),
    systemCostVnd: toMetricNumber(systemCostVnd),
    planCostVnd: toMetricNumber(planCostVnd),
    totalProviderCostVnd: toMetricNumber(totalProviderCostVnd),
  };
}

function extractAuditMetrics(pageData) {
  return (
    normalizeAuditMetrics(pageData?.summary)
    || normalizeAuditMetrics(pageData?.metrics)
    || normalizeAuditMetrics(pageData?.totals)
    || normalizeAuditMetrics(pageData)
  );
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

function MetricCard({ icon: Icon, label, value, tone, isDarkMode, subtext, helpText, sparklinePoints, sparklineKey, sparklineColor, onClick, active }) {
  const hasSparkline = Array.isArray(sparklinePoints) && sparklinePoints.length > 1 && sparklineKey;
  const sparklineId = `mc-spark-${String(label || 'kpi').replace(/\s+/g, '-')}`;
  const interactive = typeof onClick === 'function';
  const baseClass = `rounded-xl border shadow-sm transition-all ${
    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
  }`;
  const interactiveClass = interactive
    ? ` cursor-pointer ${isDarkMode ? 'hover:border-slate-600 hover:shadow-md' : 'hover:border-slate-300 hover:shadow-md'}`
    : '';
  const activeClass = active ? ' ring-2 ring-[#0455BF] border-[#0455BF]' : '';
  return (
    <Card
      className={`${baseClass}${interactiveClass}${activeClass}`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      aria-pressed={interactive ? Boolean(active) : undefined}
    >
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className={`flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            <span className="truncate">{label}</span>
            {helpText ? (
              <span
                tabIndex={0}
                aria-label={helpText}
                title={helpText}
                className={`group/help relative inline-flex shrink-0 cursor-help items-center justify-center rounded-full outline-none ${
                  isDarkMode ? 'text-slate-500 hover:text-slate-300 focus-visible:text-slate-300' : 'text-slate-400 hover:text-slate-600 focus-visible:text-slate-600'
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span
                  role="tooltip"
                  className={`pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 w-56 -translate-x-1/2 rounded-lg border px-3 py-2 text-[11px] font-normal normal-case leading-snug tracking-normal opacity-0 shadow-lg transition-opacity duration-150 group-hover/help:opacity-100 group-focus-visible/help:opacity-100 ${
                    isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-200' : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {helpText}
                </span>
              </span>
            ) : null}
          </p>
          <div className={`shrink-0 rounded-lg p-1.5 ${tone}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={`truncate text-lg font-black tabular-nums tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {value}
            </p>
            {subtext ? (
              <p className={`mt-0.5 line-clamp-2 text-[11px] leading-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {subtext}
              </p>
            ) : null}
          </div>
          {hasSparkline ? (
            <div className="h-10 w-20 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklinePoints} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={sparklineId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={sparklineColor || '#0ea5e9'} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={sparklineColor || '#0ea5e9'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey={sparklineKey}
                    stroke={sparklineColor || '#0ea5e9'}
                    strokeWidth={1.5}
                    fill={`url(#${sparklineId})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
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

  const [filters, setFilters] = useState(createEmptyAuditFilters);
  // Draft filters for the advanced filter dialog. User edits draft, click Apply → commit to filters.
  // Pattern same as AiCostManagement để giữ UX nhất quán.
  const [draftFilters, setDraftFilters] = useState(createEmptyAuditFilters);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false);
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
  const auditLogs = useMemo(() => auditLogsQuery.data?.auditLogs ?? [], [auditLogsQuery.data?.auditLogs]);
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
      if (directMetrics) return { ...directMetrics, dailyBuckets: [], topFeatures: [] };

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
      return buildAuditAggregatesFromEntries(allEntries);
    },
  });
  const metrics = metricsQuery.data ?? EMPTY_AUDIT_METRICS;
  const dailyBuckets = metrics.dailyBuckets ?? [];
  const topFeatures = metrics.topFeatures ?? [];

  const invalidateAuditData = () => {
    queryClient.invalidateQueries({ queryKey: AI_AUDIT_LOGS_KEY });
    queryClient.invalidateQueries({ queryKey: AI_AUDIT_METRICS_KEY });
  };

  const fetchExchangeRate = async () => {
    setExchangeRateLoading(true);
    try {
      setExchangeRate(extractData(await getUsdVndExchangeRate()));
    } finally {
      setExchangeRateLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRate();
  }, []);

  // Drop selectedAuditId if no longer in current page
  useEffect(() => {
    if (!selectedAuditId) return;
    if (!auditLogs.some((entry) => entry.auditId === selectedAuditId)) {
      setSelectedAuditId(null);
    }
  }, [auditLogs, selectedAuditId]);

  // Apply ?taskId= from URL
  useEffect(() => {
    const taskId = String(searchParams.get('taskId') || '').trim();
    setFilters((prev) => {
      if (taskId === String(prev.taskId || '').trim()) return prev;
      return { ...prev, taskId };
    });
  }, [searchParams]);

  useEffect(() => {
    setPage(0);
  }, [filters.taskId]);

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
  const handleDateRangeChipChange = ({ from, to }) => {
    setFilters((prev) => ({ ...prev, from, to }));
    setPage(0);
  };

  // Click KPI card "Chi phí hệ thống" / "Chi phí theo gói" → toggle category filter.
  // Click lại lần 2 vào cùng card đang active → bỏ filter.
  const handleCategoryToggle = (nextCategory) => {
    setFilters((prev) => ({
      ...prev,
      category: prev.category === nextCategory ? '' : nextCategory,
    }));
    setPage(0);
  };

  // Filter Dialog handlers — sync draft với filters khi mở dialog, commit về filters khi Apply.
  const handleOpenFilterDialog = () => {
    setDraftFilters({ ...filters });
    setIsFilterDialogOpen(true);
  };
  const handleDraftFilterChange = (field, value) => {
    setDraftFilters((prev) => ({ ...prev, [field]: value }));
  };
  const handleApplyFilters = () => {
    setFilters({ ...draftFilters });
    setPage(0);
    setIsFilterDialogOpen(false);
  };
  const handleResetFilters = () => {
    const cleared = createEmptyAuditFilters();
    setDraftFilters(cleared);
    setFilters(cleared);
    setPage(0);
  };

  // Đếm số filter đang active (trừ from/to vì DateRangeChips quản lý riêng).
  const activeFilterCount = useMemo(() => {
    const exclude = new Set(['from', 'to']);
    return Object.entries(filters).filter(([k, v]) => !exclude.has(k) && v !== '' && v != null).length;
  }, [filters]);

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
    <SuperAdminPage className={`gap-6 animate-in fade-in duration-500 ${fontClass}`}>
      <SuperAdminPageHeader
        eyebrow={t('sidebarSections.aiUsageCommerce', 'Chi phí & nhật ký AI')}
        title={t('aiAudit.title.v2', { defaultValue: 'Nhật ký AI hệ thống' })}
        actions={(
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              invalidateAuditData();
              fetchExchangeRate();
            }}
            disabled={isLoading || exchangeRateLoading}
            className="h-10 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={t('common.refresh')}
            title={t('common.refresh')}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={Activity}
          label={t('aiAudit.metrics.totalRequests', 'Total requests')}
          value={formatTokenValue(totalRequestsForDisplay, locale)}
          tone="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          isDarkMode={isDarkMode}
          helpText={t(
            'aiAudit.metrics.totalRequestsHelp',
            'Tổng số lượt gọi AI thành công, bao gồm tính năng hệ thống và các tính năng có trong gói trả phí.',
          )}
          sparklinePoints={dailyBuckets}
          sparklineKey="requestCount"
          sparklineColor="#3b82f6"
        />
        <MetricCard
          icon={Sparkles}
          label={t('aiAudit.metrics.totalTokens', 'Total tokens')}
          value={formatTokenValue(metrics.totalTokens, locale)}
          tone="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
          isDarkMode={isDarkMode}
          helpText={t(
            'aiAudit.metrics.totalTokensHelp',
            'Tổng token tiêu thụ: Prompt là token đầu vào, Thought là token suy luận nội bộ của model, Output là token trả về.',
          )}
          sparklinePoints={dailyBuckets}
          sparklineKey="totalTokens"
          sparklineColor="#8b5cf6"
        />
        <MetricCard
          icon={Coins}
          label={t('aiAudit.metrics.systemCost', 'System cost')}
          value={formatVndValue(metrics.systemCostVnd, locale)}
          tone="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          isDarkMode={isDarkMode}
          helpText={t(
            'aiAudit.metrics.systemCostHelp',
            'Chi phí provider của các tính năng AI hệ thống — phần này QuizMate trả, người dùng không bị tính phí. Click để lọc request thuộc nhóm này.',
          )}
          sparklinePoints={dailyBuckets}
          sparklineKey="systemCostVnd"
          sparklineColor="#f59e0b"
          onClick={() => handleCategoryToggle('SYSTEM')}
          active={filters.category === 'SYSTEM'}
        />
        <MetricCard
          icon={Wallet}
          label={t('aiAudit.metrics.planCost', 'Plan cost')}
          value={formatVndValue(metrics.planCostVnd, locale)}
          tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          isDarkMode={isDarkMode}
          helpText={t(
            'aiAudit.metrics.planCostHelp',
            'Chi phí provider của các tính năng AI nằm trong gói trả phí — đối ứng với doanh thu thu được từ người dùng. Click để lọc request thuộc nhóm này.',
          )}
          sparklinePoints={dailyBuckets}
          sparklineKey="planCostVnd"
          sparklineColor="#10b981"
          onClick={() => handleCategoryToggle('PLAN_BASED')}
          active={filters.category === 'PLAN_BASED'}
        />
      </div>

      <TopFeaturesByCostCard
        topFeatures={topFeatures}
        isDarkMode={isDarkMode}
        title={t('aiAudit.topFeatures.title', 'Top tính năng theo AI cost')}
        subtitle={t('aiAudit.topFeatures.subtitle', 'Xếp hạng 8 tính năng tiêu tốn nhiều provider cost nhất trong khoảng đã chọn.')}
        emptyText={t('aiAudit.topFeatures.empty', 'Không có dữ liệu cho khoảng này.')}
        scopeRange={{ from: filters.from, to: filters.to }}
        defaultScopeLabel={{
          day: t('aiAudit.topFeatures.dayUnit', 'ngày'),
          feature: t('aiAudit.topFeatures.featureCount', 'tính năng'),
          all: t('aiAudit.topFeatures.allRange', 'Tất cả'),
        }}
        legendTopLabel={t('aiAudit.topFeatures.legendTop', 'Top tính năng')}
        legendOtherLabel={t('aiAudit.topFeatures.legendOther', 'Còn lại')}
        legendUnitLabel={t('aiAudit.topFeatures.legendUnit', 'Đơn vị: VND')}
        totalLabel={t('aiAudit.topFeatures.total', 'Tổng AI cost')}
        featureColumnLabel={t('aiAudit.topFeatures.columnFeature', 'Tính năng')}
        costColumnLabel={t('aiAudit.topFeatures.columnCost', 'AI cost')}
        shareColumnLabel={t('aiAudit.topFeatures.columnShare', 'Tỷ lệ')}
        requestSuffixLabel={t('aiAudit.topFeatures.requests', 'request')}
        formatVnd={(value) => formatVndValue(value, locale)}
        formatInteger={(value) => formatTokenValue(value, locale)}
        getFeatureLabel={(featureKey) => getFeatureLabel(t, featureKey)}
      />

      <div className={`flex flex-col gap-5 rounded-3xl border p-6 lg:flex-row lg:items-center lg:justify-between ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200/80 bg-white shadow-sm'}`}>
        <div className="min-w-0">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiCosts.exchangeRate.title', 'Tỷ giá USD/VND hiện tại')}</p>
          <p className={`mt-3 text-[1.85rem] font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatExchangeRate(exchangeRate?.rate)}</p>
          <p className={`mt-2 text-xs leading-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {(exchangeRate?.source || t('aiCosts.exchangeRate.unknown', 'Không rõ nguồn'))}
            {exchangeRate?.fetchedAt ? ` • ${formatDateTime(exchangeRate.fetchedAt, locale)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
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
              <span className={`ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                isDarkMode ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      {/* Advanced filter dialog — pattern giống AiCostManagement */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className={`sm:max-w-4xl ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : 'text-slate-900'}>
              {t('aiAudit.filters.dialogTitle', 'Lọc nhật ký AI')}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
              {t('aiAudit.filters.dialogDescription', 'Lọc theo người dùng, provider, status, category, feature key, task ID hoặc khoảng thời gian.')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 lg:grid-cols-3">
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.taskId', 'Task ID')}</Label>
              <Input
                value={draftFilters.taskId}
                onChange={(e) => handleDraftFilterChange('taskId', e.target.value)}
                className={`mt-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500' : ''}`}
                placeholder="task-..."
              />
            </div>
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.email', 'Email người dùng')}</Label>
              <Input
                value={draftFilters.actorEmail}
                onChange={(e) => handleDraftFilterChange('actorEmail', e.target.value)}
                className={`mt-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500' : ''}`}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.featureKey', 'Feature key')}</Label>
              <Input
                value={draftFilters.featureKey}
                onChange={(e) => handleDraftFilterChange('featureKey', e.target.value)}
                className={`mt-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500' : ''}`}
                placeholder="QUIZ_GENERATE..."
              />
            </div>
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.provider', 'Provider')}</Label>
              <select
                value={draftFilters.provider}
                onChange={(e) => handleDraftFilterChange('provider', e.target.value)}
                className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
              >
                <option value="">{t('aiAudit.filters.allProviders', 'Tất cả provider')}</option>
                <option value="OPENAI">OPENAI</option>
                <option value="GEMINI">GEMINI</option>
              </select>
            </div>
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.status', 'Trạng thái')}</Label>
              <select
                value={draftFilters.status}
                onChange={(e) => handleDraftFilterChange('status', e.target.value)}
                className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
              >
                <option value="">{t('aiAudit.filters.allStatuses', 'Tất cả trạng thái')}</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
                <option value="TIMEOUT">TIMEOUT</option>
              </select>
            </div>
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.category', 'Phân loại')}</Label>
              <select
                value={draftFilters.category}
                onChange={(e) => handleDraftFilterChange('category', e.target.value)}
                className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
              >
                <option value="">{t('aiAudit.filters.allCategories', 'Tất cả')}</option>
                <option value="SYSTEM">SYSTEM</option>
                <option value="PLAN_BASED">PLAN_BASED</option>
              </select>
            </div>
            <div className="lg:col-span-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.from', 'Từ')}</Label>
                <Input
                  type="datetime-local"
                  value={draftFilters.from}
                  onChange={(e) => handleDraftFilterChange('from', e.target.value)}
                  className={`mt-1.5 w-full ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : ''}`}
                />
              </div>
              <div>
                <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiAudit.filters.to', 'Đến')}</Label>
                <Input
                  type="datetime-local"
                  value={draftFilters.to}
                  onChange={(e) => handleDraftFilterChange('to', e.target.value)}
                  className={`mt-1.5 w-full ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : ''}`}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleResetFilters}>
              {t('aiAudit.filters.clear', 'Xóa lọc')}
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

      <Card className={`rounded-3xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
        <CardHeader className="px-6 pt-6 pb-5">
          <CardTitle className={`text-lg font-bold tracking-[-0.02em] ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {t('aiAudit.table.title', 'AI request list')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1460px]">
              <TableHeader className={isDarkMode ? 'bg-slate-950/40' : 'bg-slate-50/70'}>
                <TableRow className={`border-b ${tableStroke}`}>
                  <TableHead className={`w-[220px] px-6 py-4 border-r ${tableStroke} text-[13px] font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>{t('aiAudit.table.actor', 'Actor')}</TableHead>
                  <TableHead className={`w-[180px] px-4 py-4 border-r ${tableStroke} text-[13px] font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>{t('aiAudit.table.feature', 'Feature')}</TableHead>
                  <TableHead className={`w-[260px] px-4 py-4 border-r ${tableStroke} text-center text-[13px] font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>{t('aiAudit.table.tokens', 'Tokens')}</TableHead>
                  <TableHead className={`w-[150px] px-4 py-4 border-r ${tableStroke} text-[13px] font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>{t('aiAudit.table.systemCost', 'System cost')}</TableHead>
                  <TableHead className={`w-[140px] px-4 py-4 border-r ${tableStroke} text-[13px] font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>{t('aiAudit.table.model', 'Model')}</TableHead>
                  <TableHead className={`w-[130px] px-4 py-4 border-r ${tableStroke} text-[13px] font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>{t('aiAudit.table.provider', 'Provider')}</TableHead>
                  <TableHead className={`w-[160px] px-4 py-4 border-r ${tableStroke} text-[13px] font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>{t('aiAudit.table.status', 'Request status')}</TableHead>
                  <TableHead className={`w-[200px] px-6 py-4 text-[13px] font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>{t('aiAudit.table.createdAt', 'Created')}</TableHead>
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
                      <TableCell className={`px-6 py-5 align-middle border-r ${tableStroke}`}>
                        <div className="space-y-1">
                          <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            {actorName}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {entry.actorEmail || t('aiAudit.table.noEmail', 'No email')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className={`px-4 py-5 align-middle border-r ${tableStroke}`}>
                        <div className="space-y-1">
                          <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                            {getFeatureLabel(t, entry.featureKey)}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {entry.featureKey}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className={`px-4 py-5 text-center align-middle border-r ${tableStroke}`}>
                        <TokenBreakdownCell row={entry} isDarkMode={isDarkMode} />
                      </TableCell>
                      <TableCell className={`px-4 py-5 align-middle border-r text-sm whitespace-nowrap ${tableStroke} ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {formatVndValue(entry.providerCostVnd, locale)}
                      </TableCell>
                      <TableCell className={`px-4 py-5 align-middle border-r text-sm whitespace-nowrap ${tableStroke} ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {entry.modelName || '-'}
                      </TableCell>
                      <TableCell className={`px-4 py-5 align-middle border-r whitespace-nowrap ${tableStroke}`}>
                        <Badge className={`border-none whitespace-nowrap ${getProviderBadgeClass(entry.provider)}`}>
                          {entry.provider || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`px-4 py-5 align-middle border-r whitespace-nowrap ${tableStroke}`}>
                        <Badge className={`border-none whitespace-nowrap ${getStatusBadgeClass(entry.status)}`}>
                          {getStatusLabel(t, entry.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className={`px-6 py-5 align-middle text-sm whitespace-nowrap ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDateTime(entry.createdAt, locale)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-20 text-center text-sm text-slate-400">
                      {t('aiAudit.table.empty', 'No AI audit logs match the current filters.')}
                    </TableCell>
                  </TableRow>
                ) : null}
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 text-center">
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
