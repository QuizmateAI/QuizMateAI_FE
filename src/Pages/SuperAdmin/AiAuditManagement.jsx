import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {
  Activity,
  Bot,
  Braces,
  CalendarClock,
  KeyRound,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {
  Dialog,
  DialogContent,
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
import ListSpinner from '@/Components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { getAiAuditLogs } from '@/api/ManagementSystemAPI';
import AdminPagination from '@/Pages/Admin/components/AdminPagination';
import { getWebSocketUrl } from '@/lib/websocketUrl';

const PROVIDER_OPTIONS = ['', 'OPENAI', 'GEMINI'];
const STATUS_OPTIONS = ['', 'PROCESSING', 'SUCCESS', 'ERROR'];

const FEATURE_LABEL_KEYS = {
  GENERATE_FLASHCARDS: 'aiAudit.features.GENERATE_FLASHCARDS',
  GENERATE_QUIZ: 'aiAudit.features.GENERATE_QUIZ',
  EVALUATE_SHORT_ANSWER: 'aiAudit.features.EVALUATE_SHORT_ANSWER',
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
  PHASE_PROGRESS_REVIEW: 'aiAudit.features.PHASE_PROGRESS_REVIEW',
  RAG_ASK: 'aiAudit.features.RAG_ASK',
  CONTENT_MODERATION: 'aiAudit.features.CONTENT_MODERATION',
  GEMINI_VISION_OCR: 'aiAudit.features.GEMINI_VISION_OCR',
  GEMINI_PDF_FILE_OCR: 'aiAudit.features.GEMINI_PDF_FILE_OCR',
  GEMINI_VIDEO_FILE_ANALYSIS: 'aiAudit.features.GEMINI_VIDEO_FILE_ANALYSIS',
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
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      localStorage.getItem('jwt_token')
    );
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

function AiAuditManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const [searchParams] = useSearchParams();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';

  const [filters, setFilters] = useState({
    provider: '',
    featureKey: '',
    actorUserId: '',
    taskId: '',
    status: '',
    from: '',
    to: '',
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [auditLogs, setAuditLogs] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    totalElements: 0,
    totalPages: 0,
    page: 0,
    size: 20,
  });
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const stompClientRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);
  const filtersRef = useRef(filters);

  const fetchAuditLogs = async (
    nextPage = pageRef.current,
    nextPageSize = pageSizeRef.current,
    activeFilters = filtersRef.current
  ) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getAiAuditLogs({
        provider: activeFilters.provider || undefined,
        featureKey: activeFilters.featureKey || undefined,
        actorUserId: activeFilters.actorUserId || undefined,
        taskId: activeFilters.taskId || undefined,
        status: activeFilters.status || undefined,
        from: activeFilters.from ? new Date(activeFilters.from).toISOString() : undefined,
        to: activeFilters.to ? new Date(activeFilters.to).toISOString() : undefined,
        page: nextPage,
        size: nextPageSize,
      });

      const pageData = response?.data ?? response ?? {};
      const content = Array.isArray(pageData?.content) ? pageData.content : [];
      setAuditLogs(content);
      setPageInfo({
        totalElements: Number(pageData?.totalElements || 0),
        totalPages: Number(pageData?.totalPages || 0),
        page: Number(pageData?.page || 0),
        size: Number(pageData?.size || nextPageSize),
      });
      setSelectedAuditId((currentSelectedId) => {
        if (!currentSelectedId) return null;
        if (content.some((entry) => entry.auditId === currentSelectedId)) {
          return currentSelectedId;
        }
        return null;
      });
    } catch (err) {
      setAuditLogs([]);
      setPageInfo({
        totalElements: 0,
        totalPages: 0,
        page: 0,
        size: nextPageSize,
      });
      setError(err?.message || t('aiAudit.errors.loadLogs', 'Unable to load AI audit logs'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const taskId = String(searchParams.get('taskId') || '').trim();
    if (!taskId || taskId === filtersRef.current.taskId) {
      return;
    }

    const nextFilters = {
      ...filtersRef.current,
      taskId,
    };

    filtersRef.current = nextFilters;
    setFilters(nextFilters);
    setPage(0);
    fetchAuditLogs(0, pageSizeRef.current, nextFilters);
  }, [searchParams]);

  useEffect(() => {
    fetchAuditLogs(page, pageSize, filters);
  }, [page, pageSize]);

  useEffect(() => {
    const websocketUrl = getWebSocketUrl();
    if (!websocketUrl) {
      return undefined;
    }

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
            fetchAuditLogs(pageRef.current, pageSizeRef.current, filtersRef.current);
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
  }, []);

  const selectedAudit = useMemo(
    () => auditLogs.find((entry) => entry.auditId === selectedAuditId) || null,
    [auditLogs, selectedAuditId]
  );

  const visibleTokenTotal = useMemo(
    () => auditLogs.reduce((sum, entry) => sum + Number(entry?.totalTokens || 0), 0),
    [auditLogs]
  );
  const visiblePromptTotal = useMemo(
    () => auditLogs.reduce((sum, entry) => sum + Number(entry?.promptTokens || 0), 0),
    [auditLogs]
  );
  const visibleCompletionTotal = useMemo(
    () => auditLogs.reduce((sum, entry) => sum + Number(entry?.completionTokens || 0), 0),
    [auditLogs]
  );
  const visibleThoughtTotal = useMemo(
    () => auditLogs.reduce((sum, entry) => sum + Number(entry?.thoughtTokens || 0), 0),
    [auditLogs]
  );
  const visibleErrorCount = useMemo(
    () => auditLogs.filter((entry) => String(entry?.status || '').toUpperCase() === 'ERROR').length,
    [auditLogs]
  );
  const visibleAverageTokens = auditLogs.length > 0 ? Math.round(visibleTokenTotal / auditLogs.length) : 0;

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    setPage(0);
    fetchAuditLogs(0, pageSize, filters);
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
  };

  const openAuditDetail = (auditId) => {
    setSelectedAuditId(auditId);
    setIsDetailOpen(true);
  };

  const selectedFeatureLabel = selectedAudit
    ? getFeatureLabel(t, selectedAudit.featureKey)
    : '-';

  return (
    <div className={`space-y-6 p-6 animate-in fade-in duration-500 ${fontClass}`}>
      <div>
        <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {t('aiAudit.title', 'AI Audit')}
        </h1>
        <p className={`mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          {t(
            'aiAudit.description',
            'Track AI requests, token usage, models, statuses, and open detailed traces when needed.'
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={Activity}
          label={t('aiAudit.metrics.totalRequests', 'Total requests')}
          value={formatTokenValue(pageInfo.totalElements, locale)}
          tone="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          isDarkMode={isDarkMode}
          subtext={t('aiAudit.metrics.totalRequestsHint', 'Based on the current filters')}
        />
        <MetricCard
          icon={Sparkles}
          label={t('aiAudit.metrics.pageTokens', 'Tokens on this page')}
          value={formatTokenValue(visibleTokenTotal, locale)}
          tone="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
          isDarkMode={isDarkMode}
          subtext={t('aiAudit.metrics.pageTokensBreakdown', {
            prompt: formatTokenValue(visiblePromptTotal, locale),
            thought: formatTokenValue(visibleThoughtTotal, locale),
            output: formatTokenValue(visibleCompletionTotal, locale),
            defaultValue: 'Prompt {{prompt}} | Thought {{thought}} | Output {{output}}',
          })}
        />
        <MetricCard
          icon={Bot}
          label={t('aiAudit.metrics.averageTokens', 'Avg tokens / request')}
          value={formatTokenValue(visibleAverageTokens, locale)}
          tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          isDarkMode={isDarkMode}
          subtext={t('aiAudit.metrics.averageTokensHint', 'Calculated from the visible logs')}
        />
        <MetricCard
          icon={ShieldAlert}
          label={t('aiAudit.metrics.errors', 'Errors')}
          value={formatTokenValue(visibleErrorCount, locale)}
          tone="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
          isDarkMode={isDarkMode}
          subtext={t('aiAudit.metrics.errorsHint', 'Errored requests on the current page')}
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
                onClick={() => fetchAuditLogs(page, pageSize, filters)}
                disabled={isLoading}
                className="rounded-xl"
                aria-label={t('common.refresh')}
                title={t('common.refresh')}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-100 px-4 py-3 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
          {error}
        </div>
      ) : null}

      <Card className={`border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-lg ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {t('aiAudit.table.title', 'AI request list')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader className={isDarkMode ? 'bg-slate-950/40' : 'bg-slate-50/60'}>
                <TableRow className="border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="w-[220px]">{t('aiAudit.table.actor', 'Actor')}</TableHead>
                  <TableHead className="w-[180px]">{t('aiAudit.table.feature', 'Feature')}</TableHead>
                  <TableHead className="w-[120px]">{t('aiAudit.table.tokens', 'Tokens')}</TableHead>
                  <TableHead className="w-[140px]">{t('aiAudit.table.model', 'Model')}</TableHead>
                  <TableHead className="w-[120px]">{t('aiAudit.table.provider', 'Provider')}</TableHead>
                  <TableHead className="w-[140px]">{t('aiAudit.table.status', 'Request status')}</TableHead>
                  <TableHead className="w-[180px]">{t('aiAudit.table.createdAt', 'Created')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {auditLogs.map((entry) => {
                    const actorName = entry.actorFullName || entry.actorUsername || entry.actorEmail || t('aiAudit.table.systemUser', 'System user');
                  return (
                    <TableRow
                      key={entry.auditId}
                      onClick={() => openAuditDetail(entry.auditId)}
                      className={`cursor-pointer border-b border-slate-100 transition-colors dark:border-slate-800 ${
                        isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-blue-50/60'
                      }`}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            {actorName}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {entry.actorEmail || t('aiAudit.table.noEmail', 'No email')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                            {getFeatureLabel(t, entry.featureKey)}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {entry.featureKey}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        {formatTokenValue(entry.totalTokens, locale)}
                      </TableCell>
                      <TableCell className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {entry.modelName || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`border-none ${getProviderBadgeClass(entry.provider)}`}>
                          {entry.provider || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`border-none ${getStatusBadgeClass(entry.status)}`}>
                          {getStatusLabel(t, entry.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDateTime(entry.createdAt, locale)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-slate-400">
                      {t('aiAudit.table.empty', 'No AI audit logs match the current filters.')}
                    </TableCell>
                  </TableRow>
                ) : null}
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center">
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

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
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
                    {selectedFeatureLabel}
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
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4 text-rose-500" />
                  {t('aiAudit.detail.tokens', 'Tokens')}
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

              {selectedAudit.errorMessage ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-100 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                  <p className="font-semibold">{t('aiAudit.detail.error', 'Error')}</p>
                  <p className="mt-2 whitespace-pre-wrap break-words">{selectedAudit.errorMessage}</p>
                </div>
              ) : null}

              <div className="space-y-4">
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
                    {prettifyPreview(selectedAudit.requestPreview, t('aiAudit.detail.noPreview', 'No data available'))}
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
                    {prettifyPreview(selectedAudit.responsePreview, t('aiAudit.detail.noPreview', 'No data available'))}
                  </pre>
                </div>
              </div>
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
    </div>
  );
}

export default AiAuditManagement;
