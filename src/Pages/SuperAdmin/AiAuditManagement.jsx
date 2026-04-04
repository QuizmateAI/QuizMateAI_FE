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

const FEATURE_LABELS = {
  GENERATE_FLASHCARDS: 'Tạo flashcards',
  GENERATE_QUIZ: 'Tạo quiz',
  EVALUATE_SHORT_ANSWER: 'Chấm câu trả lời ngắn',
  COMPANION_INTERPRET: 'Companion trả lời',
  COMPANION_TRANSCRIBE: 'Companion speech-to-text',
  COMPANION_TTS: 'Companion text-to-speech',
  GENERATE_ROADMAP: 'Tạo roadmap',
  GENERATE_ROADMAP_PHASES: 'Tạo phase roadmap',
  GENERATE_ROADMAP_PHASE_CONTENT: 'Tạo nội dung phase',
  CHECK_MATERIAL_COVERAGE: 'Kiểm tra độ phủ tài liệu',
  WORKSPACE_QUIZ_ASSESSMENT: 'Assessment workspace',
  PHASE_PRE_LEARNING_ASSESSMENT: 'Pre-learning assessment',
  PHASE_POST_LEARNING_ASSESSMENT: 'Post-learning assessment',
  PHASE_PROGRESS_REVIEW: 'Progress review',
  RAG_ASK: 'RAG hỏi đáp',
  CONTENT_MODERATION: 'Moderation',
  GEMINI_VISION_OCR: 'OCR ảnh',
  GEMINI_PDF_FILE_OCR: 'OCR PDF',
  GEMINI_VIDEO_FILE_ANALYSIS: 'Phân tích video',
};

function formatDateTime(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatTokenValue(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function formatOptionalTokenValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toLocaleString('vi-VN');
}

function prettifyPreview(value) {
  if (!value) return 'Không có dữ liệu';
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
  const { i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const [searchParams] = useSearchParams();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

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
      setError(err?.message || 'Không thể tải AI audit logs');
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
    ? FEATURE_LABELS[selectedAudit.featureKey] || selectedAudit.featureKey
    : '-';

  return (
    <div className={`space-y-6 p-6 animate-in fade-in duration-500 ${fontClass}`}>
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            AI Audit
          </h1>
          <p className={`mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Theo dõi AI request, token tiêu hao, model, trạng thái và mở chi tiết khi cần.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleResetFilters} className="rounded-xl">
            Xoá lọc
          </Button>
          <Button onClick={handleApplyFilters} className="rounded-xl bg-blue-600 hover:bg-blue-700">
            <Search className="mr-2 h-4 w-4" />
            Áp dụng lọc
          </Button>
          <Button
            variant="outline"
            onClick={() => fetchAuditLogs(page, pageSize, filters)}
            disabled={isLoading}
            className="rounded-xl"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={Activity}
          label="Tổng request"
          value={formatTokenValue(pageInfo.totalElements)}
          tone="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          isDarkMode={isDarkMode}
          subtext="Theo bộ lọc hiện tại"
        />
        <MetricCard
          icon={Sparkles}
          label="Token trang hiện tại"
          value={formatTokenValue(visibleTokenTotal)}
          tone="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
          isDarkMode={isDarkMode}
          subtext={`Prompt ${formatTokenValue(visiblePromptTotal)} | Thought ${formatTokenValue(visibleThoughtTotal)} | Output ${formatTokenValue(visibleCompletionTotal)}`}
        />
        <MetricCard
          icon={Bot}
          label="Avg token/request"
          value={formatTokenValue(visibleAverageTokens)}
          tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          isDarkMode={isDarkMode}
          subtext="Tính trên các log đang hiển thị"
        />
        <MetricCard
          icon={ShieldAlert}
          label="Lỗi"
          value={formatTokenValue(visibleErrorCount)}
          tone="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
          isDarkMode={isDarkMode}
          subtext="Số request lỗi trong trang hiện tại"
        />
      </div>

      <Card className={`border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <CardHeader className="pb-4">
          <CardTitle className={`text-lg ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            Bộ lọc AI audit
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <select
            value={filters.provider}
            onChange={(event) => handleFilterChange('provider', event.target.value)}
            className={`h-11 rounded-xl border px-3 text-sm ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <option value="">Tất cả provider</option>
            {PROVIDER_OPTIONS.filter(Boolean).map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(event) => handleFilterChange('status', event.target.value)}
            className={`h-11 rounded-xl border px-3 text-sm ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.filter(Boolean).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <Input
            value={filters.featureKey}
            onChange={(event) => handleFilterChange('featureKey', event.target.value)}
            placeholder="Feature key"
            className={`h-11 rounded-xl ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
          />
          <Input
            value={filters.actorUserId}
            onChange={(event) => handleFilterChange('actorUserId', event.target.value)}
            placeholder="User ID"
            className={`h-11 rounded-xl ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
          />
          <Input
            value={filters.taskId}
            onChange={(event) => handleFilterChange('taskId', event.target.value)}
            placeholder="Task ID"
            className={`h-11 rounded-xl ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
          />
          <Input
            type="datetime-local"
            value={filters.from}
            onChange={(event) => handleFilterChange('from', event.target.value)}
            className={`h-11 rounded-xl ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
          />
          <Input
            type="datetime-local"
            value={filters.to}
            onChange={(event) => handleFilterChange('to', event.target.value)}
            className={`h-11 rounded-xl ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : ''}`}
          />
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
            Danh sách AI request
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader className={isDarkMode ? 'bg-slate-950/40' : 'bg-slate-50/60'}>
                <TableRow className="border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="w-[220px]">Ai sử dụng</TableHead>
                  <TableHead className="w-[180px]">Chức năng</TableHead>
                  <TableHead className="w-[120px]">Tokens</TableHead>
                  <TableHead className="w-[140px]">Model</TableHead>
                  <TableHead className="w-[120px]">Provider</TableHead>
                  <TableHead className="w-[140px]">Request Status</TableHead>
                  <TableHead className="w-[180px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((entry) => {
                  const actorName = entry.actorFullName || entry.actorUsername || `User #${entry.actorUserId ?? '-'}`;
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
                            {entry.actorEmail || 'Không có email'} {entry.actorUserId ? `• ID ${entry.actorUserId}` : ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                            {FEATURE_LABELS[entry.featureKey] || entry.featureKey}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {entry.featureKey}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        {formatTokenValue(entry.totalTokens)}
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
                          {entry.status || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDateTime(entry.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-slate-400">
                      Chưa có AI audit log nào theo bộ lọc hiện tại.
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
              Chi tiết AI request
            </DialogTitle>
          </DialogHeader>

          {selectedAudit ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <UserRound className="h-4 w-4 text-blue-500" />
                    Người dùng
                  </div>
                  <p className={`mt-3 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {selectedAudit.actorFullName || selectedAudit.actorUsername || '-'}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {selectedAudit.actorEmail || 'Không có email'}
                  </p>
                  <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    User ID: {selectedAudit.actorUserId ?? '-'}
                  </p>
                </div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarClock className="h-4 w-4 text-amber-500" />
                    Trạng thái request
                  </div>
                  <p className={`mt-3 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {selectedAudit.status || '-'}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Badge className={`border-none ${getStatusBadgeClass(selectedAudit.status)}`}>
                      {selectedAudit.status}
                    </Badge>
                    <Badge className={`border-none ${getProviderBadgeClass(selectedAudit.provider)}`}>
                      {selectedAudit.provider}
                    </Badge>
                  </div>
                  <p className={`mt-3 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {formatDateTime(selectedAudit.createdAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Bot className="h-4 w-4 text-violet-500" />
                    Chức năng và model
                  </div>
                  <p className={`mt-3 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {selectedFeatureLabel}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {selectedAudit.featureKey}
                  </p>
                  <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Model: <span className="font-semibold">{selectedAudit.modelName || '-'}</span>
                  </p>
                </div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <KeyRound className="h-4 w-4 text-emerald-500" />
                    API key label
                  </div>
                  <p className={`mt-3 font-semibold break-all ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {selectedAudit.apiKeyLabel || '-'}
                  </p>
                  <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Key được mask để không lộ secret thật.
                  </p>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4 text-rose-500" />
                  Tokens
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>Input</p>
                    <p className={`mt-1 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {formatTokenValue(selectedAudit.promptTokens)}
                    </p>
                  </div>
                  <div>
                    <p className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>Thought</p>
                    <p className={`mt-1 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {formatOptionalTokenValue(selectedAudit.thoughtTokens)}
                    </p>
                  </div>
                  <div>
                    <p className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>Output</p>
                    <p className={`mt-1 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {formatTokenValue(selectedAudit.completionTokens)}
                    </p>
                  </div>
                  <div>
                    <p className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>Total</p>
                    <p className={`mt-1 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {formatTokenValue(selectedAudit.totalTokens)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Request metadata</p>
                  <div className={`mt-3 space-y-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <p>Request ID: <span className="font-medium">{selectedAudit.requestId || '-'}</span></p>
                    <p>Task ID: <span className="font-medium">{selectedAudit.taskId || '-'}</span></p>
                    <p>Workspace ID: <span className="font-medium">{selectedAudit.workspaceId ?? '-'}</span></p>
                    <p>Material ID: <span className="font-medium">{selectedAudit.materialId ?? '-'}</span></p>
                  </div>
                </div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/70'}`}>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Operation</p>
                  <div className={`mt-3 space-y-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <p>Operation: <span className="font-medium">{selectedAudit.operationName || '-'}</span></p>
                    <p>Endpoint: <span className="font-medium break-all">{selectedAudit.endpointPath || '-'}</span></p>
                  </div>
                </div>
              </div>

              {selectedAudit.errorMessage ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-100 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                  <p className="font-semibold">Error</p>
                  <p className="mt-2 whitespace-pre-wrap break-words">{selectedAudit.errorMessage}</p>
                </div>
              ) : null}

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Braces className="h-4 w-4 text-blue-500" />
                    Input
                  </div>
                  <pre className={`max-h-[320px] overflow-auto rounded-2xl border p-4 text-xs leading-6 whitespace-pre-wrap break-words ${
                    isDarkMode
                      ? 'border-slate-800 bg-slate-950 text-slate-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}>
                    {prettifyPreview(selectedAudit.requestPreview)}
                  </pre>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Braces className="h-4 w-4 text-emerald-500" />
                    Output
                  </div>
                  <pre className={`max-h-[320px] overflow-auto rounded-2xl border p-4 text-xs leading-6 whitespace-pre-wrap break-words ${
                    isDarkMode
                      ? 'border-slate-800 bg-slate-950 text-slate-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}>
                    {prettifyPreview(selectedAudit.responsePreview)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className={`rounded-2xl border border-dashed p-10 text-center ${
              isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'
            }`}>
              Request này không còn nằm trong danh sách hiện tại. Hãy đóng popup và tải lại danh sách nếu cần.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AiAuditManagement;
