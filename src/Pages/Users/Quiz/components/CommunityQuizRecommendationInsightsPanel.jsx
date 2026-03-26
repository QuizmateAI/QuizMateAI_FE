import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2, Download, Eye, PlayCircle, TrendingUp } from 'lucide-react';
import {
  getWorkspaceQuizRecommendationMetrics,
  getWorkspaceQuizRecommendationOfflineComparison,
  getWorkspaceQuizRecommendationSampleRequests,
} from '@/api/WorkspaceAPI';

function extractApiData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function formatRate(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '0%';
  return `${numeric.toFixed(numeric % 1 === 0 ? 0 : 1)}%`;
}

function formatDateTime(value, locale = 'vi-VN') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRankValue(value, fallbackLabel) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallbackLabel;
  return `#${numeric}`;
}

function formatScoreValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  return numeric.toFixed(numeric % 1 === 0 ? 0 : 1);
}

function buildMetricItems(t) {
  return [
    {
      key: 'impressionCount',
      label: t('workspace.quiz.communityRecommendations.metrics.impressions', 'Impression'),
      icon: Eye,
      lightClassName: 'bg-blue-100 text-blue-700',
      darkClassName: 'bg-blue-950/40 text-blue-300',
    },
    {
      key: 'cloneCount',
      label: t('workspace.quiz.communityRecommendations.metrics.clones', 'Clone'),
      icon: Download,
      lightClassName: 'bg-indigo-100 text-indigo-700',
      darkClassName: 'bg-indigo-950/40 text-indigo-300',
    },
    {
      key: 'startedCount',
      label: t('workspace.quiz.communityRecommendations.metrics.started', 'Bắt đầu làm'),
      icon: PlayCircle,
      lightClassName: 'bg-amber-100 text-amber-700',
      darkClassName: 'bg-amber-950/40 text-amber-300',
    },
    {
      key: 'passedCount',
      label: t('workspace.quiz.communityRecommendations.metrics.passed', 'Đã đậu'),
      icon: CheckCircle2,
      lightClassName: 'bg-emerald-100 text-emerald-700',
      darkClassName: 'bg-emerald-950/40 text-emerald-300',
    },
  ];
}

export default function CommunityQuizRecommendationInsightsPanel({
  workspaceId,
  refreshToken = 0,
  fontClass = '',
  isDarkMode = false,
  className = '',
}) {
  const { t, i18n } = useTranslation();
  const datetimeLocale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const [metrics, setMetrics] = React.useState(null);
  const [comparison, setComparison] = React.useState(null);
  const [sampleRequests, setSampleRequests] = React.useState(null);
  const [sampleFilter, setSampleFilter] = React.useState('all');

  React.useEffect(() => {
    const normalizedWorkspaceId = Number(workspaceId);
    if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
      setMetrics(null);
      setComparison(null);
      setSampleRequests(null);
      return;
    }

    let cancelled = false;
    const loadMetrics = async () => {
      try {
        const [metricsResponse, comparisonResponse, sampleRequestsResponse] = await Promise.all([
          getWorkspaceQuizRecommendationMetrics(normalizedWorkspaceId),
          getWorkspaceQuizRecommendationOfflineComparison(normalizedWorkspaceId),
          getWorkspaceQuizRecommendationSampleRequests(normalizedWorkspaceId),
        ]);
        if (!cancelled) {
          setMetrics(extractApiData(metricsResponse));
          setComparison(extractApiData(comparisonResponse));
          setSampleRequests(extractApiData(sampleRequestsResponse));
        }
      } catch {
        if (!cancelled) {
          setMetrics(null);
          setComparison(null);
          setSampleRequests(null);
        }
      }
    };

    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [refreshToken, workspaceId]);

  const totalSignals = Number(metrics?.impressionCount || 0)
    + Number(metrics?.cloneCount || 0)
    + Number(metrics?.startedCount || 0)
    + Number(metrics?.passedCount || 0);
  const comparisonSignals = Number(comparison?.hybridCloneCount || 0)
    + Number(comparison?.hybridStartedCount || 0)
    + Number(comparison?.hybridPassedCount || 0);
  const hasSampleRequests = Array.isArray(sampleRequests?.requests) && sampleRequests.requests.length > 0;

  if ((!metrics || totalSignals <= 0) && (!comparison || comparisonSignals <= 0) && !hasSampleRequests) {
    return null;
  }

  const metricItems = buildMetricItems(t);
  const rateItems = [
    {
      key: 'impressionToCloneRate',
      label: t('workspace.quiz.communityRecommendations.metrics.impressionToClone', 'Impression -> Clone'),
      value: metrics?.impressionToCloneRate,
    },
    {
      key: 'cloneToStartedRate',
      label: t('workspace.quiz.communityRecommendations.metrics.cloneToStarted', 'Clone -> Bắt đầu'),
      value: metrics?.cloneToStartedRate,
    },
    {
      key: 'startedToPassedRate',
      label: t('workspace.quiz.communityRecommendations.metrics.startedToPassed', 'Bắt đầu -> Đậu'),
      value: metrics?.startedToPassedRate,
    },
  ];
  const comparisonItems = [
    {
      key: 'clone',
      label: t('workspace.quiz.communityRecommendations.metrics.comparison.cloneLabel', 'Clone'),
      hybridValue: Number(comparison?.hybridCloneCount || 0),
      lexicalValue: Number(comparison?.lexicalShadowCloneCount || 0),
      rescuedValue: Number(comparison?.semanticRescuedCloneCount || 0),
      captureRate: comparison?.lexicalCloneCaptureRate,
    },
    {
      key: 'started',
      label: t('workspace.quiz.communityRecommendations.metrics.comparison.startedLabel', 'Bắt đầu'),
      hybridValue: Number(comparison?.hybridStartedCount || 0),
      lexicalValue: Number(comparison?.lexicalShadowStartedCount || 0),
      rescuedValue: Number(comparison?.semanticRescuedStartedCount || 0),
      captureRate: comparison?.lexicalStartedCaptureRate,
    },
    {
      key: 'passed',
      label: t('workspace.quiz.communityRecommendations.metrics.comparison.passedLabel', 'Đậu'),
      hybridValue: Number(comparison?.hybridPassedCount || 0),
      lexicalValue: Number(comparison?.lexicalShadowPassedCount || 0),
      rescuedValue: Number(comparison?.semanticRescuedPassedCount || 0),
      captureRate: comparison?.lexicalPassedCaptureRate,
    },
  ];
  const outcomeMeta = {
    NONE: {
      label: t('workspace.quiz.communityRecommendations.metrics.samples.outcome.none', 'Chưa convert'),
      className: isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600',
    },
    CLONED: {
      label: t('workspace.quiz.communityRecommendations.metrics.samples.outcome.cloned', 'Đã clone'),
      className: isDarkMode ? 'bg-indigo-950/40 text-indigo-300' : 'bg-indigo-100 text-indigo-700',
    },
    STARTED: {
      label: t('workspace.quiz.communityRecommendations.metrics.samples.outcome.started', 'Đã bắt đầu'),
      className: isDarkMode ? 'bg-amber-950/40 text-amber-300' : 'bg-amber-100 text-amber-700',
    },
    PASSED: {
      label: t('workspace.quiz.communityRecommendations.metrics.samples.outcome.passed', 'Đã đậu'),
      className: isDarkMode ? 'bg-emerald-950/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700',
    },
  };
  const sampleFilterOptions = [
    {
      key: 'all',
      label: t('workspace.quiz.communityRecommendations.metrics.samples.filters.all', 'Tất cả'),
    },
    {
      key: 'rescued',
      label: t('workspace.quiz.communityRecommendations.metrics.samples.filters.rescued', 'Semantic rescued only'),
    },
    {
      key: 'converted',
      label: t('workspace.quiz.communityRecommendations.metrics.samples.filters.converted', 'Converted only'),
    },
  ];
  const filteredSampleRequests = (sampleRequests?.requests || [])
    .map((requestSample) => {
      const candidates = (requestSample?.candidates || []).filter((candidate) => {
        if (sampleFilter === 'rescued') {
          return candidate?.rescuedBySemantic === true;
        }
        if (sampleFilter === 'converted') {
          return candidate?.outcomeStage && candidate.outcomeStage !== 'NONE';
        }
        return true;
      });

      return {
        ...requestSample,
        candidates,
      };
    })
    .filter((requestSample) => requestSample.candidates.length > 0);

  return (
    <section
      className={`rounded-2xl border p-4 shadow-sm ${
        isDarkMode ? 'border-slate-700 bg-slate-950/70' : 'border-slate-200 bg-white'
      } ${className}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}>
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className={`text-sm font-semibold text-slate-900 dark:text-slate-100 ${fontClass}`}>
                {t('workspace.quiz.communityRecommendations.metrics.title', 'Hiệu quả gợi ý quiz')}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} ${fontClass}`}>
                {t('workspace.quiz.communityRecommendations.metrics.description', 'Funnel 30 ngày gần đây của quiz được gợi ý trong workspace này.')}
              </p>
            </div>
          </div>
        </div>

        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
          isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
        }`}>
          {t('workspace.quiz.communityRecommendations.metrics.windowDays', '{{count}} ngày gần đây', {
            count: Number(metrics?.windowDays) || 30,
          })}
        </span>
      </div>

      {metrics && totalSignals > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {metricItems.map((item) => {
              const Icon = item.icon;
              const count = Number(metrics?.[item.key] || 0);
              return (
                <div
                  key={item.key}
                  className={`rounded-2xl border px-4 py-3 ${
                    isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.label}
                      </p>
                      <p className={`mt-2 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {count}
                      </p>
                    </div>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isDarkMode ? item.darkClassName : item.lightClassName
                    }`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {rateItems.map((item, index) => (
              <React.Fragment key={item.key}>
                {index > 0 ? (
                  <ArrowRight className={`h-4 w-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                ) : null}
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                  isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}>
                  <span>{item.label}</span>
                  <span className="font-semibold">{formatRate(item.value)}</span>
                </span>
              </React.Fragment>
            ))}
          </div>
        </>
      ) : null}

      {comparison && comparisonSignals > 0 ? (
        <div className={`mt-5 rounded-2xl border p-4 ${
          isDarkMode ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50/90'
        }`}>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'} ${fontClass}`}>
                {t('workspace.quiz.communityRecommendations.metrics.comparison.title', 'So sánh offline lexical vs semantic')}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} ${fontClass}`}>
                {t(
                  'workspace.quiz.communityRecommendations.metrics.comparison.description',
                  'Dựa trên request snapshot đã serve: lexical-only sẽ giữ lại được bao nhiêu positive outcome, và semantic đã cứu thêm bao nhiêu.'
                )}
              </p>
            </div>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700'
            }`}>
              {t('workspace.quiz.communityRecommendations.metrics.comparison.requests', '{{count}} request đã đo', {
                count: Number(comparison?.requestCount) || 0,
              })}
            </span>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {comparisonItems.map((item) => (
              <div
                key={item.key}
                className={`rounded-2xl border px-4 py-3 ${
                  isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white'
                }`}
              >
                <p className={`text-xs font-medium uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {item.label}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t('workspace.quiz.communityRecommendations.metrics.comparison.hybrid', 'Hybrid')}
                    </p>
                    <p className={`mt-1 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {item.hybridValue}
                    </p>
                  </div>
                  <div>
                    <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t('workspace.quiz.communityRecommendations.metrics.comparison.lexicalShadow', 'Lexical shadow')}
                    </p>
                    <p className={`mt-1 text-xl font-bold ${isDarkMode ? 'text-sky-300' : 'text-sky-700'}`}>
                      {item.lexicalValue}
                    </p>
                  </div>
                  <div>
                    <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t('workspace.quiz.communityRecommendations.metrics.comparison.semanticRescued', 'Semantic cứu thêm')}
                    </p>
                    <p className={`mt-1 text-xl font-bold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      {item.rescuedValue}
                    </p>
                  </div>
                </div>

                <div className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  <span>{t('workspace.quiz.communityRecommendations.metrics.comparison.captureRate', 'Lexical giữ lại')}</span>
                  <span className="font-semibold">{formatRate(item.captureRate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hasSampleRequests ? (
        <div className={`mt-5 rounded-2xl border p-4 ${
          isDarkMode ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50/90'
        }`}>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'} ${fontClass}`}>
                {t('workspace.quiz.communityRecommendations.metrics.samples.title', 'Sample requests gần đây')}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} ${fontClass}`}>
                {t(
                  'workspace.quiz.communityRecommendations.metrics.samples.description',
                  'Soi từng request cụ thể để xem quiz nào được semantic kéo lên, lexical rank bao nhiêu và conversion đi đến stage nào.'
                )}
              </p>
            </div>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700'
            }`}>
              {t('workspace.quiz.communityRecommendations.metrics.samples.requests', '{{count}} request gần đây', {
                count: Number(filteredSampleRequests.length) || 0,
              })}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {sampleFilterOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSampleFilter(option.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  sampleFilter === option.key
                    ? (isDarkMode ? 'bg-blue-950/50 text-blue-300' : 'bg-blue-100 text-blue-700')
                    : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100')
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {filteredSampleRequests.length > 0 ? filteredSampleRequests.map((requestSample) => {
              const requestId = String(requestSample?.requestId || '');
              const shortRequestId = requestId ? requestId.slice(0, 8) : 'request';
              const lexicalRankFallback = t('workspace.quiz.communityRecommendations.metrics.samples.lexicalOutsideTop', 'ngoài top lexical');
              return (
                <details
                  key={requestId || `request-${requestSample?.createdAt || shortRequestId}`}
                  className={`rounded-2xl border ${
                    isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white'
                  }`}
                >
                  <summary className="cursor-pointer list-none px-4 py-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {t('workspace.quiz.communityRecommendations.metrics.samples.requestLabel', 'Request')} #{shortRequestId}
                          </span>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {formatDateTime(requestSample?.createdAt, datetimeLocale)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            isDarkMode ? 'bg-blue-950/40 text-blue-300' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {t('workspace.quiz.communityRecommendations.metrics.samples.servedCount', '{{count}} quiz đã serve', {
                              count: Number(requestSample?.servedCandidateCount) || 0,
                            })}
                          </span>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            isDarkMode ? 'bg-indigo-950/40 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {t('workspace.quiz.communityRecommendations.metrics.samples.cloneCount', '{{count}} clone', {
                              count: Number(requestSample?.cloneCount) || 0,
                            })}
                          </span>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            isDarkMode ? 'bg-amber-950/40 text-amber-300' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {t('workspace.quiz.communityRecommendations.metrics.samples.startedCount', '{{count}} bắt đầu', {
                              count: Number(requestSample?.startedCount) || 0,
                            })}
                          </span>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            isDarkMode ? 'bg-emerald-950/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {t('workspace.quiz.communityRecommendations.metrics.samples.passedCount', '{{count}} đậu', {
                              count: Number(requestSample?.passedCount) || 0,
                            })}
                          </span>
                        </div>
                      </div>

                      <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('workspace.quiz.communityRecommendations.metrics.samples.expandHint', 'Mở để xem chi tiết')}
                      </span>
                    </div>
                  </summary>

                  <div className={`border-t px-4 py-3 ${
                    isDarkMode ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <div className="space-y-3">
                      {(requestSample?.candidates || []).map((candidate) => {
                        const outcome = outcomeMeta[candidate?.outcomeStage] || outcomeMeta.NONE;
                        const rescuedBySemantic = candidate?.rescuedBySemantic === true;
                        const lexicalRank = candidate?.lexicalRank;
                        const servedCount = Number(requestSample?.servedCandidateCount) || 0;
                        return (
                          <div
                            key={`${requestId}-${candidate?.sourceQuizId}`}
                            className={`rounded-2xl border px-4 py-3 ${
                              isDarkMode ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50/90'
                            }`}
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {candidate?.quizTitle || t('workspace.quiz.communityRecommendations.defaultQuizTitle', 'Quiz cộng đồng')}
                                  </span>
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                    rescuedBySemantic
                                      ? (isDarkMode ? 'bg-emerald-950/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                                      : (isDarkMode ? 'bg-sky-950/40 text-sky-300' : 'bg-sky-100 text-sky-700')
                                  }`}>
                                    {rescuedBySemantic
                                      ? t('workspace.quiz.communityRecommendations.metrics.samples.rescued', 'Semantic rescued')
                                      : t('workspace.quiz.communityRecommendations.metrics.samples.retained', 'Lexical cũng giữ lại')}
                                  </span>
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${outcome.className}`}>
                                    {outcome.label}
                                  </span>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                    isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600'
                                  }`}>
                                    {t('workspace.quiz.communityRecommendations.metrics.samples.servedRank', 'Served #{{count}}', {
                                      count: Number(candidate?.servedRank) || 0,
                                    })}
                                  </span>
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                    isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600'
                                  }`}>
                                    {t('workspace.quiz.communityRecommendations.metrics.samples.lexicalRank', 'Lexical {{rank}}', {
                                      rank: formatRankValue(lexicalRank, lexicalRankFallback),
                                    })}
                                  </span>
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                    isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600'
                                  }`}>
                                    {t('workspace.quiz.communityRecommendations.metrics.samples.semanticFit', 'Semantic fit {{value}}', {
                                      value: formatScoreValue(candidate?.semanticFit),
                                    })}
                                  </span>
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                    isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600'
                                  }`}>
                                    {t('workspace.quiz.communityRecommendations.metrics.samples.semanticSimilarity', 'Similarity {{value}}', {
                                      value: formatScoreValue(candidate?.semanticSimilarity),
                                    })}
                                  </span>
                                </div>

                                <p className={`mt-3 text-xs leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                  {rescuedBySemantic
                                    ? t(
                                      'workspace.quiz.communityRecommendations.metrics.samples.rescuedExplanation',
                                      'Quiz này được semantic kéo lên vì lexical rank {{lexicalRank}} sẽ nằm ngoài {{servedCount}} slot đã serve.',
                                      {
                                        lexicalRank: formatRankValue(lexicalRank, lexicalRankFallback),
                                        servedCount,
                                      }
                                    )
                                    : t(
                                      'workspace.quiz.communityRecommendations.metrics.samples.retainedExplanation',
                                      'Quiz này vẫn nằm trong top lexical ở rank {{lexicalRank}}, nên lexical-only cũng có thể hiển thị nó.',
                                      {
                                        lexicalRank: formatRankValue(lexicalRank, lexicalRankFallback),
                                      }
                                    )}
                                </p>

                                <p className={`mt-1 text-xs leading-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {candidate?.passed
                                    ? t('workspace.quiz.communityRecommendations.metrics.samples.convertPassed', 'Downstream outcome: đã clone, bắt đầu làm và đậu.')
                                    : candidate?.started
                                      ? t('workspace.quiz.communityRecommendations.metrics.samples.convertStarted', 'Downstream outcome: đã clone và bắt đầu làm, nhưng chưa có pass event.')
                                      : candidate?.cloned
                                        ? t('workspace.quiz.communityRecommendations.metrics.samples.convertCloned', 'Downstream outcome: đã clone, nhưng chưa có start event.')
                                        : t('workspace.quiz.communityRecommendations.metrics.samples.convertNone', 'Chưa ghi nhận downstream conversion cho quiz này.')
                                  }
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-2 lg:min-w-[180px]">
                                <div className={`rounded-xl px-3 py-2 ${
                                  isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'
                                }`}>
                                  <p className="text-[11px] uppercase tracking-[0.16em] opacity-70">
                                    {t('workspace.quiz.communityRecommendations.metrics.samples.hybridScore', 'Hybrid score')}
                                  </p>
                                  <p className="mt-1 text-sm font-semibold">{formatScoreValue(candidate?.recommendationScore)}</p>
                                </div>
                                <div className={`rounded-xl px-3 py-2 ${
                                  isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'
                                }`}>
                                  <p className="text-[11px] uppercase tracking-[0.16em] opacity-70">
                                    {t('workspace.quiz.communityRecommendations.metrics.samples.lexicalScore', 'Lexical score')}
                                  </p>
                                  <p className="mt-1 text-sm font-semibold">{formatScoreValue(candidate?.lexicalScore)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>
              );
            }) : (
              <div className={`rounded-2xl border px-4 py-5 text-sm ${
                isDarkMode ? 'border-slate-800 bg-slate-950/70 text-slate-300' : 'border-slate-200 bg-white text-slate-600'
              }`}>
                {sampleFilter === 'rescued'
                  ? t('workspace.quiz.communityRecommendations.metrics.samples.emptyRescued', 'Chưa có request nào có semantic rescued trong khoảng thời gian này.')
                  : t('workspace.quiz.communityRecommendations.metrics.samples.emptyConverted', 'Chưa có request nào có downstream conversion trong khoảng thời gian này.')}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
