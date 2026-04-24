import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Clock3, Download, Eye, Loader2, Sparkles, Target } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { getWorkspaceQuizRecommendations, logWorkspaceQuizRecommendationEvents } from '@/api/WorkspaceAPI';
import { cloneCommunityQuizToWorkspace } from '@/api/QuizAPI';
import { useToast } from '@/context/ToastContext';
import CommunityQuizSignals from '@/Pages/Users/Quiz/components/CommunityQuizSignals';
import CommunityQuizDetailDialog from '@/Pages/Users/Quiz/components/CommunityQuizDetailDialog';

function extractApiData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function normalizeDurationMinutes(rawDuration) {
  const duration = Number(rawDuration);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  if (duration >= 600) {
    return Math.max(1, Math.round(duration / 60));
  }
  return duration;
}

function formatDifficulty(value, t) {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  return t(`workspace.quiz.difficultyLevels.${normalized}`, normalized);
}

const BUCKET_META = {
  buildFoundation: {
    labelKey: 'workspace.quiz.communityRecommendations.bucket.buildFoundation',
    defaultLabel: 'Tiếp tục làm quen',
    badgeClassName: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300',
  },
  fixWeakAreas: {
    labelKey: 'workspace.quiz.communityRecommendations.bucket.fixWeakAreas',
    defaultLabel: 'Củng cố điểm yếu',
    badgeClassName: 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300',
  },
  continueLearningPath: {
    labelKey: 'workspace.quiz.communityRecommendations.bucket.continueLearningPath',
    defaultLabel: 'Đi tiếp lộ trình',
    badgeClassName: 'bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300',
  },
  challengeYourself: {
    labelKey: 'workspace.quiz.communityRecommendations.bucket.challengeYourself',
    defaultLabel: 'Tăng độ khó',
    badgeClassName: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  },
};

function flattenRecommendations(data) {
  const merged = [
    ...(Array.isArray(data?.buildFoundation) ? data.buildFoundation.map((item) => ({ ...item, bucketKey: 'buildFoundation' })) : []),
    ...(Array.isArray(data?.fixWeakAreas) ? data.fixWeakAreas.map((item) => ({ ...item, bucketKey: 'fixWeakAreas' })) : []),
    ...(Array.isArray(data?.continueLearningPath) ? data.continueLearningPath.map((item) => ({ ...item, bucketKey: 'continueLearningPath' })) : []),
    ...(Array.isArray(data?.challengeYourself) ? data.challengeYourself.map((item) => ({ ...item, bucketKey: 'challengeYourself' })) : []),
  ];

  const deduped = new Map();
  merged.forEach((item) => {
    const quizId = Number(item?.quizId);
    if (!Number.isInteger(quizId) || quizId <= 0) return;

    const existing = deduped.get(quizId);
    if (!existing || Number(item?.recommendationScore || 0) > Number(existing?.recommendationScore || 0)) {
      deduped.set(quizId, item);
    }
  });

  return Array.from(deduped.values())
    .sort((left, right) => Number(right?.recommendationScore || 0) - Number(left?.recommendationScore || 0));
}

function RecommendationCard({
  item,
  cloningQuizId,
  onClone,
  onPreview,
  fontClass,
  isDarkMode,
  t,
}) {
  const duration = normalizeDurationMinutes(item?.duration);
  const difficultyLabel = formatDifficulty(item?.overallDifficulty, t);
  const cloneCount = Number(item?.communityCloneCount) || 0;
  const reasons = Array.isArray(item?.reasons) ? item.reasons.slice(0, 2) : [];
  const topics = Array.isArray(item?.matchedTopics) ? item.matchedTopics.slice(0, 2) : [];
  const meta = BUCKET_META[item?.bucketKey] || BUCKET_META.fixWeakAreas;
  const isCloning = Number(cloningQuizId) === Number(item?.quizId);

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition-colors ${
        isDarkMode
          ? 'border-slate-700 bg-slate-900/80'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.badgeClassName}`}>
              {t(meta.labelKey, meta.defaultLabel)}
            </span>
          </div>

          <p className={`mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100 ${fontClass}`}>
            {item?.title || t('workspace.quiz.communityRecommendations.defaultQuizTitle', 'Community quiz')}
          </p>

          <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {duration ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {t('workspace.quiz.communityRecommendations.durationMinutes', '{{count}} min', { count: duration })}
              </span>
            ) : null}
            {difficultyLabel ? (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
              }`}>
                <BarChart3 className="h-3.5 w-3.5" />
                {difficultyLabel}
              </span>
            ) : null}
          </div>

          {reasons.length > 0 ? (
            <div className="mt-3 space-y-2">
              {reasons.map((reason) => (
                <div key={reason} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} ${fontClass}`}>
                    {reason}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {topics.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {topics.map((topic) => (
                <span
                  key={topic}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Target className="h-3.5 w-3.5" />
                  {topic}
                </span>
              ))}
            </div>
          ) : null}

          <CommunityQuizSignals
            cloneCount={cloneCount}
            averageRating={item?.communityAverageRating}
            ratingCount={item?.communityRatingCount}
            commentCount={item?.communityCommentCount}
            isDarkMode={isDarkMode}
            t={t}
            className="mt-4"
          />
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onPreview(item)}
            className={`rounded-full px-4 ${isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900' : ''}`}
          >
            <Eye className="h-4 w-4" />
            <span className={`ml-1 ${fontClass}`}>
              {t('workspace.quiz.communityDetail.previewAction', 'Preview')}
            </span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onClone(item)}
            disabled={isCloning}
            className="rounded-full bg-blue-600 px-4 text-white hover:bg-blue-700"
          >
            {isCloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className={`ml-1 ${fontClass}`}>
              {t('workspace.quiz.communityRecommendations.cloneAction', 'Clone to this workspace')}
            </span>
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function CommunityQuizRecommendationsPanel({
  workspaceId,
  fontClass = '',
  isDarkMode = false,
  onCloneSuccess,
  onAnalyticsChanged,
  className = '',
}) {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState('');
  const [cloningQuizId, setCloningQuizId] = React.useState(null);
  const [selectedQuizItem, setSelectedQuizItem] = React.useState(null);
  const loggedImpressionRequestIdsRef = React.useRef(new Set());

  const loadRecommendations = React.useCallback(async () => {
    const normalizedWorkspaceId = Number(workspaceId);
    if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
      setData(null);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await getWorkspaceQuizRecommendations(normalizedWorkspaceId);
      setData(extractApiData(response));
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load quiz recommendations.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  React.useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  const recommendations = React.useMemo(
    () => flattenRecommendations(data)
      .slice(0, 3)
      .map((item, index) => ({
        ...item,
        recommendationRank: index + 1,
      })),
    [data]
  );

  const emitRecommendationEvents = React.useCallback(async (events) => {
    const normalizedWorkspaceId = Number(workspaceId);
    if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0 || !data?.requestId || !Array.isArray(events) || events.length === 0) {
      return;
    }

    try {
      await logWorkspaceQuizRecommendationEvents(normalizedWorkspaceId, {
        requestId: data.requestId,
        events,
      });
    } catch {
      // Analytics failures should never block quiz recommendation UX.
    }
  }, [data?.requestId, workspaceId]);

  React.useEffect(() => {
    if (!data?.requestId || recommendations.length === 0) {
      return;
    }
    if (loggedImpressionRequestIdsRef.current.has(data.requestId)) {
      return;
    }
    loggedImpressionRequestIdsRef.current.add(data.requestId);

    void (async () => {
      await emitRecommendationEvents(recommendations.map((item) => ({
        eventType: 'IMPRESSION',
        quizId: item.quizId,
        recommendationBucket: item.bucketKey,
        recommendationRank: item.recommendationRank,
        recommendationScore: item.recommendationScore,
      })));
      if (typeof onAnalyticsChanged === 'function') {
        onAnalyticsChanged();
      }
    })();
  }, [data?.requestId, emitRecommendationEvents, onAnalyticsChanged, recommendations]);

  const handleClone = React.useCallback(async (item) => {
    const quizId = Number(item?.quizId);
    const normalizedWorkspaceId = Number(workspaceId);
    if (!Number.isInteger(quizId) || quizId <= 0 || !Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
      return;
    }

    setCloningQuizId(quizId);
    try {
      await emitRecommendationEvents([{
        eventType: 'CLONE_CLICK',
        quizId,
        recommendationBucket: item?.bucketKey,
        recommendationRank: item?.recommendationRank,
        recommendationScore: item?.recommendationScore,
      }]);
      await cloneCommunityQuizToWorkspace(quizId, normalizedWorkspaceId, {
        recommendationRequestId: data?.requestId,
        recommendationBucket: item?.bucketKey,
        recommendationRank: item?.recommendationRank,
        recommendationScore: item?.recommendationScore,
      });
      showSuccess(t('workspace.quiz.communityRecommendations.cloneSuccess', 'Quiz cloned into this workspace.'));
      setSelectedQuizItem(null);
      await loadRecommendations();
      if (typeof onAnalyticsChanged === 'function') {
        onAnalyticsChanged();
      }
      if (typeof onCloneSuccess === 'function') {
        await onCloneSuccess(item);
      }
    } catch (cloneError) {
      showError(cloneError?.message || t('workspace.quiz.communityRecommendations.cloneError', 'Unable to clone this quiz right now.'));
    } finally {
      setCloningQuizId(null);
    }
  }, [data?.requestId, emitRecommendationEvents, loadRecommendations, onAnalyticsChanged, onCloneSuccess, showError, showSuccess, t, workspaceId]);

  if (loading || error || !data?.behaviorReady || recommendations.length === 0) {
    return null;
  }

  const remainingCount = Math.max(0, flattenRecommendations(data).length - recommendations.length);

  return (
    <section
      className={`rounded-2xl border p-4 shadow-sm ${
        isDarkMode
          ? 'border-slate-700 bg-slate-950/70'
          : 'border-blue-200 bg-blue-50/60'
      } ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              isDarkMode ? 'bg-blue-950/40 text-blue-300' : 'bg-blue-100 text-blue-700'
            }`}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-base font-semibold text-slate-900 dark:text-slate-100 ${fontClass}`}>
                {t('workspace.quiz.communityRecommendations.title', 'Matching quizzes for this workspace')}
              </p>
              <p className={`mt-1 text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} ${fontClass}`}>
                {t('workspace.quiz.communityRecommendations.description', 'Quizmate AI found a few community quizzes that fit the current learning behavior here. If one looks right, you can clone it straight into this workspace.'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700'
          }`}>
            {t('workspace.quiz.communityRecommendations.recommendationCount', '{{count}} matching quizzes', {
              count: flattenRecommendations(data).length,
            })}
          </span>
          {remainingCount > 0 ? (
            <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700'
            }`}>
              {t('workspace.quiz.communityRecommendations.moreCount', '+{{count}} more suggestions', { count: remainingCount })}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
        {recommendations.map((item) => (
          <RecommendationCard
            key={item.quizId}
            item={item}
            cloningQuizId={cloningQuizId}
            onClone={handleClone}
            onPreview={setSelectedQuizItem}
            fontClass={fontClass}
            isDarkMode={isDarkMode}
            t={t}
          />
        ))}
      </div>

      <CommunityQuizDetailDialog
        open={Boolean(selectedQuizItem)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedQuizItem(null);
          }
        }}
        quizId={selectedQuizItem?.quizId}
        isDarkMode={isDarkMode}
        fontClass={fontClass}
        title={selectedQuizItem?.title}
        description={t('workspace.quiz.communityDetail.previewDescription', 'Preview questions, community rating and public comments before cloning.')}
        onClone={selectedQuizItem ? () => handleClone(selectedQuizItem) : undefined}
        cloneLoading={Number(cloningQuizId) === Number(selectedQuizItem?.quizId)}
        showCloneAction
        cloneActionLabel={t('workspace.quiz.communityRecommendations.cloneAction', 'Clone to this workspace')}
      />
    </section>
  );
}
