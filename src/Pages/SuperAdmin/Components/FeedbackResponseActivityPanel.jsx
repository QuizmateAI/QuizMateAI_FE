import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  MessageSquareText,
  RefreshCw,
  Search,
  Star,
  UserRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import LocalAvatar from '@/Components/ui/LocalAvatar';
import { getManagementFeedbackLogDetail, getManagementFeedbackLogs } from '@/api/FeedbackAPI';
import { useToast } from '@/context/ToastContext';
import {
  getFeedbackQuestionTypeLabel,
  getFeedbackRequestStatusBadgeClass,
  getFeedbackRequestStatusLabel,
  getFeedbackTargetLabel,
} from '@/lib/feedback';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import { unwrapApiData, unwrapApiList } from '@/Utils/apiResponse';

const PAGE_SIZE = 6;
const STATUS_FILTER_OPTIONS = ['ALL', 'PENDING', 'SUBMITTED', 'COMPLETED', 'EXPIRED'];

function normalizeText(value) {
  if (value == null) return '';
  const trimmed = String(value).trim();
  return trimmed && trimmed.toLowerCase() !== 'null' && trimmed.toLowerCase() !== 'undefined'
    ? trimmed
    : '';
}

function normalizeNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();
    if (['true', 'yes', '1', 'satisfied'].includes(normalizedValue)) return true;
    if (['false', 'no', '0', 'unsatisfied'].includes(normalizedValue)) return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null;
}

function formatDateTime(value, language) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString(language?.startsWith('en') ? 'en-US' : 'vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name, email) {
  const source = normalizeText(name) || normalizeText(email) || 'FB';
  const parts = source
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean);

  if (parts.length === 0) return 'FB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function getAvatarTone(status) {
  const normalizedStatus = String(status || '').toUpperCase();
  if (normalizedStatus === 'SUBMITTED' || normalizedStatus === 'COMPLETED') return 'emerald';
  if (normalizedStatus === 'PENDING') return 'amber';
  if (normalizedStatus === 'EXPIRED') return 'rose';
  return 'blue';
}

function extractCollectionMeta(response) {
  const payload = unwrapApiData(response);
  const fallbackCount = unwrapApiList(response).length;

  return {
    totalCount: Number(
      payload?.totalElements
      ?? payload?.totalCount
      ?? payload?.count
      ?? payload?.total
      ?? fallbackCount
    ) || fallbackCount,
    page: Number(payload?.number ?? payload?.page ?? payload?.pageIndex ?? 0) || 0,
    totalPages: Number(
      payload?.totalPages
      ?? payload?.pageCount
      ?? (fallbackCount > 0 ? 1 : 0)
    ) || (fallbackCount > 0 ? 1 : 0),
  };
}

function extractRawAnswers(record) {
  return record?.answers
    ?? record?.submittedAnswers
    ?? record?.responseAnswers
    ?? record?.answerDetails
    ?? record?.responses
    ?? [];
}

function normalizeRequestStatus(record) {
  const explicitStatus = String(
    record?.status
    ?? record?.requestStatus
    ?? record?.feedbackStatus
    ?? '',
  ).toUpperCase();

  if (explicitStatus === 'DONE') return 'COMPLETED';
  if (explicitStatus === 'OPEN' || explicitStatus === 'WAITING') return 'PENDING';
  if (explicitStatus) return explicitStatus;

  if (record?.submittedAt || record?.respondedAt || record?.completedAt) return 'SUBMITTED';
  if (record?.expiredAt) return 'EXPIRED';
  return 'PENDING';
}

function extractAnswerValue(answer) {
  if (answer == null) return null;

  const candidateKeys = [
    'answerValue',
    'responseValue',
    'value',
    'selectedValue',
    'textAnswer',
    'comment',
    'note',
    'rating',
    'starRating',
    'numericAnswer',
    'booleanAnswer',
    'boolValue',
  ];

  for (const key of candidateKeys) {
    if (answer[key] !== undefined && answer[key] !== null && answer[key] !== '') {
      return answer[key];
    }
  }

  if (Array.isArray(answer.selectedOptions)) return answer.selectedOptions;
  if (Array.isArray(answer.optionValues)) return answer.optionValues;
  if (Array.isArray(answer.values)) return answer.values;
  if (answer.answer !== undefined && answer.answer !== answer) return answer.answer;

  return null;
}

function formatAnswerValue(value, questionType, language) {
  if (Array.isArray(value)) {
    return value.map((item) => formatAnswerValue(item, questionType, language)).join(', ');
  }

  if (typeof value === 'boolean') {
    return language?.startsWith('en') ? (value ? 'Yes' : 'No') : (value ? 'Có' : 'Không');
  }

  if (value && typeof value === 'object') {
    const label = value.label ?? value.name ?? value.value ?? value.code;
    if (label != null) {
      return String(label);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  if (value == null || value === '') {
    return language?.startsWith('en') ? 'No answer' : 'Chưa có câu trả lời';
  }

  if (String(questionType || '').toUpperCase() === 'YES_NO') {
    const normalizedValue = normalizeBoolean(value);
    if (normalizedValue != null) {
      return language?.startsWith('en') ? (normalizedValue ? 'Yes' : 'No') : (normalizedValue ? 'Có' : 'Không');
    }
  }

  return String(value);
}

function normalizeFeedbackLogRecord(record, formsMap) {
  const linkedForm = record?.form
    ?? formsMap.get(String(record?.formId ?? record?.feedbackFormId ?? ''))
    ?? null;

  const user = record?.user ?? record?.respondent ?? record?.submittedBy ?? {};
  const target = record?.target ?? {};
  const rawAnswers = Array.isArray(extractRawAnswers(record)) ? extractRawAnswers(record) : [];
  const firstTextAnswer = rawAnswers.find((answer) => {
    const questionType = String(answer?.questionType || '').toUpperCase();
    return questionType === 'TEXT' || typeof extractAnswerValue(answer) === 'string';
  });

  return {
    raw: record,
    id: record?.requestId ?? record?.feedbackRequestId ?? record?.submissionId ?? record?.id ?? null,
    formId: record?.formId ?? record?.feedbackFormId ?? linkedForm?.formId ?? null,
    formCode: record?.formCode ?? record?.feedbackFormCode ?? linkedForm?.code ?? '-',
    formTitle: record?.formTitle ?? linkedForm?.title ?? linkedForm?.displayName ?? '-',
    targetType: record?.targetType ?? target?.targetType ?? linkedForm?.targetType ?? null,
    targetId: record?.targetId ?? target?.id ?? target?.targetId ?? null,
    targetTitle: normalizeText(record?.targetTitle ?? record?.targetName ?? record?.targetLabel ?? target?.title ?? target?.name),
    triggerType: record?.triggerType ?? linkedForm?.triggerType ?? null,
    status: normalizeRequestStatus(record),
    requestedAt: record?.requestedAt ?? record?.createdAt ?? record?.triggeredAt ?? record?.sentAt ?? null,
    submittedAt: record?.submittedAt ?? record?.respondedAt ?? record?.completedAt ?? record?.updatedAt ?? null,
    userId: record?.userId ?? record?.respondentId ?? user?.id ?? user?.userId ?? null,
    userName: normalizeText(record?.userName ?? record?.fullName ?? record?.respondentName ?? user?.fullName ?? user?.username ?? user?.name),
    userEmail: normalizeText(record?.userEmail ?? record?.email ?? record?.respondentEmail ?? user?.email),
    overallRating: normalizeNumber(record?.overallRating ?? record?.rating ?? record?.averageRating ?? record?.stars),
    satisfied: normalizeBoolean(record?.satisfied ?? record?.isSatisfied ?? record?.satisfaction),
    comment: normalizeText(record?.comment ?? record?.overallComment ?? record?.summary ?? (firstTextAnswer ? extractAnswerValue(firstTextAnswer) : '')),
    answers: rawAnswers,
    formQuestions: linkedForm?.questions ?? record?.form?.questions ?? [],
  };
}

function normalizeAnswerEntries(record, language) {
  const questionsById = new Map(
    (record?.formQuestions || []).map((question) => [String(question.questionId), question]),
  );

  return (record?.answers || []).map((answer, index) => {
    const questionId = answer?.questionId ?? answer?.id ?? `q-${index + 1}`;
    const linkedQuestion = questionsById.get(String(questionId));
    const questionType = answer?.questionType ?? linkedQuestion?.questionType ?? '';
    const answerValue = extractAnswerValue(answer);

    return {
      key: `${questionId}-${index}`,
      questionText: answer?.questionText ?? linkedQuestion?.questionText ?? `${language?.startsWith('en') ? 'Question' : 'Câu hỏi'} ${index + 1}`,
      questionType,
      valueText: formatAnswerValue(answerValue, questionType, language),
    };
  });
}

function getMetricClasses(accent, isDarkMode) {
  const palette = {
    blue: isDarkMode
      ? 'border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-slate-950 to-slate-950'
      : 'border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50',
    emerald: isDarkMode
      ? 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-950 to-slate-950'
      : 'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-slate-50',
    amber: isDarkMode
      ? 'border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-950 to-slate-950'
      : 'border-amber-100 bg-gradient-to-br from-amber-50 via-white to-slate-50',
    violet: isDarkMode
      ? 'border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-950 to-slate-950'
      : 'border-violet-100 bg-gradient-to-br from-violet-50 via-white to-slate-50',
  };

  return palette[accent] ?? palette.blue;
}

function getMetricIconClasses(accent, isDarkMode) {
  const palette = {
    blue: isDarkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-600 text-white',
    emerald: isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-600 text-white',
    amber: isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-500 text-white',
    violet: isDarkMode ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-600 text-white',
  };

  return palette[accent] ?? palette.blue;
}

function ResponseMetaChip({ children, className = '' }) {
  return (
    <div className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em]',
      className,
    )}
    >
      {children}
    </div>
  );
}

function DetailStatCard({ icon: Icon, label, value, isDarkMode }) {
  return (
    <div className={cn(
      'rounded-[22px] border px-4 py-4 shadow-[0_16px_35px_-32px_rgba(15,23,42,0.35)]',
      isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white',
    )}
    >
      <div className={cn(
        'flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]',
        isDarkMode ? 'text-slate-500' : 'text-slate-500',
      )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className={cn(
        'mt-3 text-sm font-semibold leading-6',
        isDarkMode ? 'text-slate-100' : 'text-slate-900',
      )}
      >
        {value}
      </p>
    </div>
  );
}

function buildTargetTitle(record, currentLang) {
  return record.targetTitle || `${getFeedbackTargetLabel(record.targetType, currentLang)}${record.targetId != null ? ` #${record.targetId}` : ''}`;
}

function ActivityMetric({ icon: Icon, label, value, helper, accent = 'blue', isDarkMode }) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-[26px] border p-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.25)]',
      getMetricClasses(accent, isDarkMode),
    )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn(
            'text-[11px] font-semibold uppercase tracking-[0.24em]',
            isDarkMode ? 'text-slate-500' : 'text-slate-500',
          )}
          >
            {label}
          </p>
          <p className={cn(
            'mt-3 text-3xl font-black tracking-[-0.06em]',
            isDarkMode ? 'text-white' : 'text-slate-950',
          )}
          >
            {value}
          </p>
          {helper ? <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>{helper}</p> : null}
        </div>
        <div className={cn('rounded-2xl p-3 shadow-sm', getMetricIconClasses(accent, isDarkMode))}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function FeedbackResponseActivityPanel({ forms = [], isDarkMode = false }) {
  const { i18n, t } = useTranslation();
  const { showError } = useToast();
  const currentLang = i18n.language || 'vi';
  const isEnglish = currentLang.startsWith('en');
  const [loading, setLoading] = useState(true);
  const [responsesSupported, setResponsesSupported] = useState(true);
  const [unsupportedHint, setUnsupportedHint] = useState('');
  const [records, setRecords] = useState([]);
  const [collectionMeta, setCollectionMeta] = useState({ totalCount: 0, page: 0, totalPages: 0 });
  const [selectedResponseId, setSelectedResponseId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailCache, setDetailCache] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formFilter, setFormFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const formsMap = useMemo(
    () => new Map(forms.map((form) => [String(form.formId), form])),
    [forms],
  );

  const normalizedResponses = useMemo(
    () => records
      .map((record) => normalizeFeedbackLogRecord(record, formsMap))
      .filter((record) => record.id != null),
    [records, formsMap],
  );

  const loadResponses = async () => {
    setLoading(true);
    try {
      const response = await getManagementFeedbackLogs({ page: 0, size: 120 });
      setRecords(unwrapApiList(response));
      setCollectionMeta(extractCollectionMeta(response));
      setResponsesSupported(true);
      setUnsupportedHint('');
    } catch (error) {
      if (error?.statusCode === 404) {
        setResponsesSupported(false);
        setUnsupportedHint(
          isEnglish
            ? 'No management feedback log endpoint was found. The UI is ready and will show submissions as soon as backend exposes the log API.'
            : 'Backend chưa mở endpoint log feedback cho quản trị. UI đã sẵn sàng và sẽ hiển thị ngay khi API log phản hồi được trả về.',
        );
        setRecords([]);
        setCollectionMeta({ totalCount: 0, page: 0, totalPages: 0 });
        return;
      }

      showError(getErrorMessage(t, error));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResponses();
  }, []);

  const filteredResponses = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return normalizedResponses.filter((record) => {
      if (formFilter !== 'ALL' && String(record.formId) !== formFilter) {
        return false;
      }

      if (statusFilter !== 'ALL' && record.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      const searchableFields = [
        record.userName,
        record.userEmail,
        record.formCode,
        record.formTitle,
        record.targetTitle,
        record.comment,
        record.targetId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableFields.includes(normalizedSearchTerm);
    });
  }, [formFilter, normalizedResponses, searchTerm, statusFilter]);

  const responseMetrics = useMemo(() => {
    const submittedResponses = normalizedResponses.filter((record) => record.status === 'SUBMITTED' || record.status === 'COMPLETED');
    const uniqueRespondents = new Set(
      submittedResponses.map((record) => String(record.userId ?? record.userEmail ?? record.userName)).filter(Boolean),
    ).size;
    const ratingValues = submittedResponses
      .map((record) => record.overallRating)
      .filter((value) => Number.isFinite(value));
    const averageRating = ratingValues.length > 0
      ? (ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length).toFixed(2)
      : '0.00';
    const satisfiedCount = submittedResponses.filter((record) => record.satisfied === true).length;
    const pendingCount = normalizedResponses.filter((record) => record.status === 'PENDING').length;

    return {
      totalLoaded: normalizedResponses.length,
      submittedCount: submittedResponses.length,
      uniqueRespondents,
      averageRating,
      satisfactionRate: submittedResponses.length > 0
        ? `${((satisfiedCount / submittedResponses.length) * 100).toFixed(2)}%`
        : '0.00%',
      pendingCount,
    };
  }, [normalizedResponses]);

  const totalPages = Math.max(1, Math.ceil(filteredResponses.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedResponses = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredResponses.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredResponses]);

  useEffect(() => {
    setPage(1);
  }, [formFilter, searchTerm, statusFilter]);

  useEffect(() => {
    if (filteredResponses.length === 0) {
      setSelectedResponseId(null);
      setDetailOpen(false);
      return;
    }

    if (selectedResponseId && !filteredResponses.some((record) => record.id === selectedResponseId)) {
      setSelectedResponseId(null);
      setDetailOpen(false);
    }
  }, [filteredResponses, selectedResponseId]);

  const selectedResponse = useMemo(
    () => pagedResponses.find((record) => record.id === selectedResponseId)
      ?? filteredResponses.find((record) => record.id === selectedResponseId)
      ?? null,
    [filteredResponses, pagedResponses, selectedResponseId],
  );

  useEffect(() => {
    if (!selectedResponseId || !responsesSupported) {
      return;
    }

    if (detailCache[selectedResponseId]) {
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const response = await getManagementFeedbackLogDetail(selectedResponseId);
        if (cancelled) return;

        const detailPayload = unwrapApiData(response);
        const normalizedDetail = normalizeFeedbackLogRecord(detailPayload, formsMap);
        setDetailCache((currentCache) => ({
          ...currentCache,
          [selectedResponseId]: normalizedDetail,
        }));
      } catch (error) {
        if (cancelled) return;

        if (error?.statusCode !== 404) {
          showError(getErrorMessage(t, error));
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [detailCache, formsMap, responsesSupported, selectedResponseId, showError, t]);

  const resolvedSelectedResponse = detailCache[selectedResponseId] ?? selectedResponse;
  const selectedAnswerEntries = useMemo(
    () => normalizeAnswerEntries(resolvedSelectedResponse, currentLang),
    [currentLang, resolvedSelectedResponse],
  );
  const detailTargetTitle = resolvedSelectedResponse
    ? buildTargetTitle(resolvedSelectedResponse, currentLang)
    : '';

  return (
    <section className={cn(
      'overflow-hidden rounded-[32px] border p-5 shadow-[0_28px_60px_-42px_rgba(15,23,42,0.28)]',
      isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white',
    )}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">
              {isEnglish ? 'Feedback observatory' : 'Trạm giám sát feedback'}
            </div>
            <h2 className={cn(
              'mt-3 text-[28px] font-black tracking-[-0.06em]',
              isDarkMode ? 'text-white' : 'text-slate-950',
            )}
            >
              {isEnglish ? 'Response activity' : 'Nhật ký phản hồi'}
            </h2>
            <p className={cn('mt-2 max-w-2xl text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
              {isEnglish
                ? 'Review who submitted feedback, where it came from, and what they actually said without digging through raw payloads.'
                : 'Xem nhanh ai đã gửi feedback, feedback đi từ form nào và nội dung người dùng thực sự đã trả lời mà không cần đọc payload thô.'}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={loadResponses}
            disabled={loading}
            className={cn(
              'h-11 w-11 rounded-2xl shadow-sm',
              isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-white',
            )}
            aria-label={t('common.refreshLog')}
            title={t('common.refreshLog')}
          >
            <RefreshCw className={cn('h-4 w-4', loading ? 'animate-spin' : '')} />
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActivityMetric
            icon={MessageSquareText}
            label={isEnglish ? 'Loaded records' : 'Bản ghi đã tải'}
            value={responsesSupported ? responseMetrics.totalLoaded : '--'}
            helper={responsesSupported
              ? `${collectionMeta.totalCount || responseMetrics.totalLoaded} ${isEnglish ? 'total from endpoint' : 'tổng bản ghi từ endpoint'}`
              : (isEnglish ? 'Waiting for backend log endpoint' : 'Đang chờ endpoint log từ backend')}
            accent="blue"
            isDarkMode={isDarkMode}
          />
          <ActivityMetric
            icon={CheckCheck}
            label={isEnglish ? 'Submitted' : 'Đã gửi'}
            value={responsesSupported ? responseMetrics.submittedCount : '--'}
            helper={responsesSupported ? `${responseMetrics.pendingCount} ${isEnglish ? 'still pending' : 'vẫn đang chờ'}` : null}
            accent="emerald"
            isDarkMode={isDarkMode}
          />
          <ActivityMetric
            icon={UserRound}
            label={isEnglish ? 'Respondents' : 'Người phản hồi'}
            value={responsesSupported ? responseMetrics.uniqueRespondents : '--'}
            helper={isEnglish ? 'Unique users with submitted feedback' : 'Số người dùng duy nhất đã gửi phản hồi'}
            accent="amber"
            isDarkMode={isDarkMode}
          />
          <ActivityMetric
            icon={Star}
            label={isEnglish ? 'Avg. score' : 'Điểm trung bình'}
            value={responsesSupported ? responseMetrics.averageRating : '--'}
            helper={responsesSupported ? responseMetrics.satisfactionRate : null}
            accent="violet"
            isDarkMode={isDarkMode}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-4">
            <div className={cn(
              'rounded-[28px] border p-4 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.18)]',
              isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50/70',
            )}
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                <div className="relative">
                  <Search className={cn('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', isDarkMode ? 'text-slate-500' : 'text-slate-400')} />
                  <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={isEnglish ? 'Search by user, email, form, target...' : 'Tìm theo user, email, form, target...'} className={cn('h-11 rounded-2xl pl-9', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500' : 'border-slate-200 bg-white')} />
                </div>
                <select value={formFilter} onChange={(event) => setFormFilter(event.target.value)} className={cn('h-11 rounded-2xl border px-3 text-sm outline-none transition-colors', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900')}>
                  <option value="ALL">{isEnglish ? 'All forms' : 'Tất cả form'}</option>
                  {forms.map((form) => <option key={form.formId} value={String(form.formId)}>{form.code}</option>)}
                </select>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={cn('h-11 rounded-2xl border px-3 text-sm outline-none transition-colors', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900')}>
                  {STATUS_FILTER_OPTIONS.map((status) => <option key={status} value={status}>{status === 'ALL' ? (isEnglish ? 'All statuses' : 'Tất cả trạng thái') : getFeedbackRequestStatusLabel(status, currentLang)}</option>)}
                </select>
              </div>
            </div>

            {!responsesSupported ? (
              <div className={cn('rounded-[28px] border border-dashed px-5 py-8 text-sm leading-6', isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600')}>
                {unsupportedHint}
              </div>
            ) : (
              <div className={cn(
                'overflow-hidden rounded-[28px] border shadow-[0_22px_55px_-40px_rgba(15,23,42,0.25)]',
                isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white',
              )}
              >
                <div className={cn('flex items-center justify-between border-b px-5 py-4', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50/80')}>
                  <div>
                    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.24em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                      {isEnglish ? 'Response queue' : 'Hàng đợi phản hồi'}
                    </p>
                    <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                      {loading
                        ? (isEnglish ? 'Loading feedback activity...' : 'Đang tải dữ liệu feedback...')
                        : `${filteredResponses.length} ${isEnglish ? 'records match the current view' : 'bản ghi khớp với bộ lọc hiện tại'}`}
                    </p>
                  </div>
                  <ResponseMetaChip className={cn(isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600')}>
                    {collectionMeta.totalCount || normalizedResponses.length} {isEnglish ? 'total' : 'tổng'}
                  </ResponseMetaChip>
                </div>

                {loading ? (
                  <div className="px-5 py-16 text-center text-sm text-slate-500">
                    {isEnglish ? 'Loading feedback log...' : 'Đang tải nhật ký phản hồi...'}
                  </div>
                ) : null}

                {!loading && pagedResponses.length === 0 ? (
                  <div className="px-5 py-16 text-center text-sm text-slate-500">
                    {isEnglish ? 'No feedback log matches the current filters.' : 'Không có phản hồi nào khớp với bộ lọc hiện tại.'}
                  </div>
                ) : null}

                {!loading && pagedResponses.length > 0 ? (
                  <div className="max-h-[740px] overflow-y-auto">
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {pagedResponses.map((record) => {
                        const isSelected = detailOpen && selectedResponseId === record.id;
                        const targetLabel = buildTargetTitle(record, currentLang);

                        return (
                          <button
                            key={record.id}
                            type="button"
                            onClick={() => {
                              setSelectedResponseId(record.id);
                              setDetailOpen(true);
                            }}
                            className={cn(
                              'group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors',
                              isDarkMode
                                ? 'hover:bg-slate-900/80'
                                : 'hover:bg-slate-50',
                              isSelected && (isDarkMode
                                ? 'bg-blue-500/10'
                                : 'bg-blue-50/80'),
                            )}
                          >
                            <LocalAvatar label={record.userName || record.userEmail || 'Feedback user'} initials={getInitials(record.userName, record.userEmail)} tone={getAvatarTone(record.status)} className="h-9 w-9 shrink-0" textClassName="text-xs" />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={cn('truncate text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                                  {record.userName || (isEnglish ? 'Unknown user' : 'Chưa rõ người dùng')}
                                </span>
                                <span className={cn('truncate text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                                  {record.userEmail || (record.userId != null ? `ID #${record.userId}` : '')}
                                </span>
                              </div>
                              <div className={cn('mt-0.5 flex items-center gap-2 text-xs', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                                <span className="truncate font-medium">{record.formCode}</span>
                                <span>·</span>
                                <span className="truncate">{targetLabel || '-'}</span>
                                {record.overallRating != null ? (
                                  <>
                                    <span>·</span>
                                    <span className="flex items-center gap-0.5">
                                      <Star className="h-3 w-3 text-amber-500" />
                                      {record.overallRating.toFixed(1)}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-3">
                              <span className={cn('text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                                {formatDateTime(record.submittedAt || record.requestedAt, currentLang)}
                              </span>
                              <Badge variant="outline" className={cn('rounded-full px-2.5 py-0.5 text-[11px]', getFeedbackRequestStatusBadgeClass(record.status, isDarkMode))}>
                                {getFeedbackRequestStatusLabel(record.status, currentLang)}
                              </Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className={cn('flex items-center justify-between border-t px-4 py-3 text-sm', isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600')}>
                  <span>{filteredResponses.length === 0 ? (isEnglish ? 'No records' : 'Không có bản ghi') : `${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, filteredResponses.length)} / ${filteredResponses.length}`}</span>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[54px] text-center">{currentPage}/{totalPages}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage === totalPages} className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className={cn(
              'max-h-[90vh] overflow-hidden p-0 sm:max-w-5xl',
              isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-white',
            )}
            >
              <DialogHeader className="sr-only">
                <DialogTitle>{isEnglish ? 'Feedback response detail' : 'Chi tiết feedback'}</DialogTitle>
                <DialogDescription>
                  {isEnglish
                    ? 'Inspect respondent identity, timing, rating, and submitted answers.'
                    : 'Xem chi tiết người phản hồi, thời gian, điểm số và câu trả lời đã gửi.'}
                </DialogDescription>
              </DialogHeader>
              <div className={cn(
                'overflow-y-auto p-5',
                isDarkMode ? 'bg-slate-950' : 'bg-gradient-to-b from-slate-50 via-white to-white',
              )}
              >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={cn('text-[11px] font-semibold uppercase tracking-[0.24em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                  {isEnglish ? 'Selected response' : 'Phản hồi đang chọn'}
                </p>
                <h3 className={cn('mt-2 text-xl font-black tracking-[-0.04em]', isDarkMode ? 'text-white' : 'text-slate-950')}>
                  {isEnglish ? 'Response profile' : 'Hồ sơ phản hồi'}
                </h3>
                <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {isEnglish
                    ? 'Inspect respondent identity, timing, rating, and every submitted answer in one place.'
                    : 'Tập trung xem danh tính người gửi, mốc thời gian, điểm đánh giá và từng câu trả lời trong cùng một khung.'}
                </p>
              </div>
              {detailLoading ? <RefreshCw className="h-4 w-4 animate-spin text-blue-500" /> : null}
            </div>

            {resolvedSelectedResponse ? (
              <div className="mt-5 space-y-4">
                <div className={cn('overflow-hidden rounded-[28px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white')}>
                  <div className="flex items-start gap-4">
                    <LocalAvatar label={resolvedSelectedResponse.userName || resolvedSelectedResponse.userEmail || 'Feedback user'} initials={getInitials(resolvedSelectedResponse.userName, resolvedSelectedResponse.userEmail)} tone={getAvatarTone(resolvedSelectedResponse.status)} className="h-14 w-14" textClassName="text-base" />
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-lg font-black tracking-[-0.04em]', isDarkMode ? 'text-white' : 'text-slate-950')}>
                        {resolvedSelectedResponse.userName || (isEnglish ? 'Unknown user' : 'Chưa rõ người dùng')}
                      </p>
                      <div className={cn('mt-1 flex items-center gap-2 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}><Mail className="h-4 w-4" /><span className="truncate">{resolvedSelectedResponse.userEmail || '-'}</span></div>
                      <div className={cn('mt-1 flex items-center gap-2 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}><UserRound className="h-4 w-4" /><span>{resolvedSelectedResponse.userId != null ? `ID #${resolvedSelectedResponse.userId}` : '-'}</span></div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">{resolvedSelectedResponse.formCode}</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">{getFeedbackTargetLabel(resolvedSelectedResponse.targetType, currentLang)}</Badge>
                    <Badge variant="outline" className={cn('rounded-full px-3 py-1', getFeedbackRequestStatusBadgeClass(resolvedSelectedResponse.status, isDarkMode))}>{getFeedbackRequestStatusLabel(resolvedSelectedResponse.status, currentLang)}</Badge>
                    {resolvedSelectedResponse.overallRating != null ? <Badge variant="outline" className={cn('rounded-full px-3 py-1', isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700')}><Star className="mr-1.5 h-3.5 w-3.5" />{resolvedSelectedResponse.overallRating.toFixed(2)}</Badge> : null}
                    {resolvedSelectedResponse.satisfied != null ? <Badge variant="outline" className={cn('rounded-full px-3 py-1', resolvedSelectedResponse.satisfied ? (isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700') : (isDarkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-rose-200 bg-rose-50 text-rose-700'))}>{resolvedSelectedResponse.satisfied ? (isEnglish ? 'Satisfied' : 'Hài lòng') : (isEnglish ? 'Unsatisfied' : 'Chưa hài lòng')}</Badge> : null}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <DetailStatCard icon={Clock3} label={isEnglish ? 'Requested' : 'Tạo yêu cầu'} value={formatDateTime(resolvedSelectedResponse.requestedAt, currentLang)} isDarkMode={isDarkMode} />
                  <DetailStatCard icon={CalendarClock} label={isEnglish ? 'Submitted' : 'Gửi phản hồi'} value={formatDateTime(resolvedSelectedResponse.submittedAt, currentLang)} isDarkMode={isDarkMode} />
                </div>

                <div className={cn('rounded-[24px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white')}>
                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.22em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>{isEnglish ? 'Target' : 'Target'}</p>
                  <p className={cn('mt-2 text-base font-bold leading-7', isDarkMode ? 'text-slate-100' : 'text-slate-900')}>{detailTargetTitle || '-'}</p>
                  <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>{resolvedSelectedResponse.targetId != null ? `${getFeedbackTargetLabel(resolvedSelectedResponse.targetType, currentLang)} #${resolvedSelectedResponse.targetId}` : getFeedbackTargetLabel(resolvedSelectedResponse.targetType, currentLang)}</p>
                </div>

                {resolvedSelectedResponse.comment ? <div className={cn('rounded-[24px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white')}><p className={cn('text-[11px] font-semibold uppercase tracking-[0.22em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>{isEnglish ? 'Comment highlight' : 'Nội dung nổi bật'}</p><p className={cn('mt-3 text-sm leading-7', isDarkMode ? 'text-slate-200' : 'text-slate-700')}>{resolvedSelectedResponse.comment}</p></div> : null}

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className={cn('text-base font-bold', isDarkMode ? 'text-white' : 'text-slate-950')}>{isEnglish ? 'Answer details' : 'Chi tiết câu trả lời'}</h4>
                      <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>{selectedAnswerEntries.length} {isEnglish ? 'answers returned from endpoint' : 'câu trả lời được trả về từ endpoint'}</p>
                    </div>
                  </div>

                  {selectedAnswerEntries.length === 0 ? (
                    <div className={cn('rounded-[24px] border border-dashed px-4 py-4 text-sm', isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-600')}>
                      {isEnglish ? 'No detailed answers were returned by the endpoint.' : 'Endpoint chưa trả về danh sách câu trả lời chi tiết.'}
                    </div>
                  ) : selectedAnswerEntries.map((answer) => (
                    <div key={answer.key} className={cn('rounded-[24px] border p-4 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.25)]', isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white')}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={cn('text-sm font-bold leading-6', isDarkMode ? 'text-slate-100' : 'text-slate-900')}>{answer.questionText}</p>
                          <p className={cn('mt-1 text-[11px] uppercase tracking-[0.22em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>{answer.questionType ? getFeedbackQuestionTypeLabel(answer.questionType, currentLang) : '-'}</p>
                        </div>
                      </div>
                      <div className={cn('mt-4 rounded-[18px] border px-3.5 py-3', isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700')}>
                        <p className="text-sm leading-7">{answer.valueText}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={cn('mt-5 rounded-[24px] border border-dashed px-4 py-8 text-sm', isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-600')}>
                {isEnglish ? 'Select a response from the left list to inspect it.' : 'Chọn một phản hồi ở danh sách bên trái để xem chi tiết.'}
              </div>
            )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
}

export default FeedbackResponseActivityPanel;
