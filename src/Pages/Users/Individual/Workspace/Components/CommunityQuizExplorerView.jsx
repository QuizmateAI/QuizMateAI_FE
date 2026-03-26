import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BarChart3,
  Clock3,
  Download,
  Globe2,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import {
  getWorkspaceCommunityQuizzes,
  getWorkspaceQuizRecommendations,
  logWorkspaceQuizRecommendationEvents,
} from "@/api/WorkspaceAPI";
import { cloneCommunityQuizToWorkspace } from "@/api/QuizAPI";
import { useToast } from "@/context/ToastContext";

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

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDifficulty(value, t) {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  return t(`workspace.quiz.difficultyLevels.${normalized}`, normalized);
}

const BUCKET_META = {
  buildFoundation: {
    labelKey: "workspace.quiz.communityRecommendations.bucket.buildFoundation",
    defaultLabel: "Tiếp tục làm quen",
    badgeClassName: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300",
  },
  fixWeakAreas: {
    labelKey: "workspace.quiz.communityRecommendations.bucket.fixWeakAreas",
    defaultLabel: "Củng cố điểm yếu",
    badgeClassName: "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
  },
  continueLearningPath: {
    labelKey: "workspace.quiz.communityRecommendations.bucket.continueLearningPath",
    defaultLabel: "Đi tiếp lộ trình",
    badgeClassName: "bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300",
  },
  challengeYourself: {
    labelKey: "workspace.quiz.communityRecommendations.bucket.challengeYourself",
    defaultLabel: "Tăng độ khó",
    badgeClassName: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  },
};

function flattenRecommendations(data) {
  const merged = [
    ...(Array.isArray(data?.buildFoundation) ? data.buildFoundation.map((item) => ({ ...item, bucketKey: "buildFoundation" })) : []),
    ...(Array.isArray(data?.fixWeakAreas) ? data.fixWeakAreas.map((item) => ({ ...item, bucketKey: "fixWeakAreas" })) : []),
    ...(Array.isArray(data?.continueLearningPath) ? data.continueLearningPath.map((item) => ({ ...item, bucketKey: "continueLearningPath" })) : []),
    ...(Array.isArray(data?.challengeYourself) ? data.challengeYourself.map((item) => ({ ...item, bucketKey: "challengeYourself" })) : []),
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
    .sort((left, right) => Number(right?.recommendationScore || 0) - Number(left?.recommendationScore || 0))
    .map((item, index) => ({
      ...item,
      recommendationRank: index + 1,
    }));
}

function mergeCommunityQuizzes(recommendationData, communityQuizzes) {
  const recommendedItems = flattenRecommendations(recommendationData);
  const communityItems = Array.isArray(communityQuizzes) ? communityQuizzes : [];
  const communityById = new Map(
    communityItems
      .filter((item) => Number.isInteger(Number(item?.quizId)) && Number(item.quizId) > 0)
      .map((item) => [Number(item.quizId), item]),
  );

  const recommendedMerged = recommendedItems.map((item) => {
    const communityItem = communityById.get(Number(item.quizId));
    return {
      ...communityItem,
      ...item,
      quizId: Number(item.quizId),
      isRecommended: true,
      communityCloneCount: Number(item?.communityCloneCount ?? communityItem?.communityCloneCount ?? 0),
      createdAt: communityItem?.createdAt ?? null,
    };
  });

  const recommendedIds = new Set(recommendedMerged.map((item) => Number(item.quizId)));
  const remainingCommunityItems = communityItems
    .filter((item) => !recommendedIds.has(Number(item?.quizId)))
    .sort((left, right) => {
      const cloneDiff = Number(right?.communityCloneCount || 0) - Number(left?.communityCloneCount || 0);
      if (cloneDiff !== 0) return cloneDiff;
      return new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime();
    })
    .map((item) => ({
      ...item,
      quizId: Number(item.quizId),
      isRecommended: false,
      recommendationRank: null,
      bucketKey: null,
      recommendationScore: null,
      reasons: [],
      matchedTopics: [],
    }));

  return [...recommendedMerged, ...remainingCommunityItems];
}

function CommunityQuizCard({
  item,
  cloningQuizId,
  onClone,
  isDarkMode,
  fontClass,
  t,
}) {
  const duration = normalizeDurationMinutes(item?.duration);
  const difficultyLabel = formatDifficulty(item?.overallDifficulty, t);
  const cloneCount = Number(item?.communityCloneCount) || 0;
  const reasons = Array.isArray(item?.reasons) ? item.reasons.slice(0, 2) : [];
  const topics = Array.isArray(item?.matchedTopics) ? item.matchedTopics.slice(0, 3) : [];
  const meta = BUCKET_META[item?.bucketKey] || null;
  const isCloning = Number(cloningQuizId) === Number(item?.quizId);

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition-colors ${
        item?.isRecommended
          ? (isDarkMode ? "border-blue-800 bg-slate-900/90" : "border-blue-200 bg-blue-50/40")
          : (isDarkMode ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white")
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {item?.isRecommended ? (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isDarkMode ? "bg-blue-950/40 text-blue-300" : "bg-blue-100 text-blue-700"
              }`}>
                <Sparkles className="h-3.5 w-3.5" />
                {t("workspace.quiz.communityExplorer.topMatch", "Phù hợp nhất")}
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
              }`}>
                <Globe2 className="h-3.5 w-3.5" />
                {t("workspace.quiz.communityExplorer.publicQuiz", "Quiz công khai")}
              </span>
            )}
            {meta ? (
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.badgeClassName}`}>
                {t(meta.labelKey, meta.defaultLabel)}
              </span>
            ) : null}
            {cloneCount > 0 ? (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
              }`}>
                <Users className="h-3.5 w-3.5" />
                {t("workspace.quiz.communityRecommendations.cloneCount", "{{count}} lượt clone", { count: cloneCount })}
              </span>
            ) : null}
          </div>

          <p className={`mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100 ${fontClass}`}>
            {item?.title || t("workspace.quiz.communityRecommendations.defaultQuizTitle", "Quiz cộng đồng")}
          </p>

          <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
            {duration ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {t("workspace.quiz.communityRecommendations.durationMinutes", "{{count}} phút", { count: duration })}
              </span>
            ) : null}
            {difficultyLabel ? (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                isDarkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"
              }`}>
                <BarChart3 className="h-3.5 w-3.5" />
                {difficultyLabel}
              </span>
            ) : null}
            {item?.createdAt ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {formatShortDate(item.createdAt)}
              </span>
            ) : null}
          </div>

          {reasons.length > 0 ? (
            <div className="mt-3 space-y-2">
              {reasons.map((reason) => (
                <div key={reason} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"} ${fontClass}`}>
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
                    isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Target className="h-3.5 w-3.5" />
                  {topic}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => onClone(item)}
          disabled={isCloning}
          className="shrink-0 rounded-full bg-blue-600 px-4 text-white hover:bg-blue-700"
        >
          {isCloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span className={`ml-1 ${fontClass}`}>
            {t("workspace.quiz.communityRecommendations.cloneAction", "Clone về workspace này")}
          </span>
        </Button>
      </div>
    </article>
  );
}

export default function CommunityQuizExplorerView({
  workspaceId,
  isDarkMode = false,
  onBackToQuiz,
  onCloneSuccess,
}) {
  const { t, i18n } = useTranslation();
  const { showError, showSuccess } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [cloningQuizId, setCloningQuizId] = React.useState(null);
  const [recommendationData, setRecommendationData] = React.useState(null);
  const [communityQuizzes, setCommunityQuizzes] = React.useState([]);
  const [loggedImpressionRequestIds, setLoggedImpressionRequestIds] = React.useState(() => new Set());

  const loadCommunityData = React.useCallback(async () => {
    const normalizedWorkspaceId = Number(workspaceId);
    if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
      setRecommendationData(null);
      setCommunityQuizzes([]);
      return;
    }

    setLoading(true);
    try {
      const [recommendationResponse, communityResponse] = await Promise.all([
        getWorkspaceQuizRecommendations(normalizedWorkspaceId).catch(() => null),
        getWorkspaceCommunityQuizzes(normalizedWorkspaceId),
      ]);
      setRecommendationData(extractApiData(recommendationResponse));
      setCommunityQuizzes(extractApiData(communityResponse) || []);
    } catch (error) {
      showError(error?.message || t("workspace.quiz.communityExplorer.loadError", "Không tải được quiz cộng đồng."));
      setRecommendationData(null);
      setCommunityQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, [showError, t, workspaceId]);

  React.useEffect(() => {
    void loadCommunityData();
  }, [loadCommunityData]);

  const mergedItems = React.useMemo(
    () => mergeCommunityQuizzes(recommendationData, communityQuizzes),
    [communityQuizzes, recommendationData],
  );

  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return mergedItems;
    const query = searchQuery.trim().toLowerCase();
    return mergedItems.filter((item) => String(item?.title || "").toLowerCase().includes(query));
  }, [mergedItems, searchQuery]);

  const emitRecommendationEvents = React.useCallback(async (events) => {
    const normalizedWorkspaceId = Number(workspaceId);
    if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0 || !recommendationData?.requestId || !Array.isArray(events) || events.length === 0) {
      return;
    }

    try {
      await logWorkspaceQuizRecommendationEvents(normalizedWorkspaceId, {
        requestId: recommendationData.requestId,
        events,
      });
    } catch {
      // no-op
    }
  }, [recommendationData?.requestId, workspaceId]);

  React.useEffect(() => {
    const requestId = recommendationData?.requestId;
    const recommendedVisibleItems = filteredItems
      .filter((item) => item?.isRecommended && Number.isInteger(Number(item?.quizId)) && Number(item.quizId) > 0)
      .slice(0, 8);

    if (!requestId || recommendedVisibleItems.length === 0 || loggedImpressionRequestIds.has(requestId)) {
      return;
    }

    const nextLoggedRequestIds = new Set(loggedImpressionRequestIds);
    nextLoggedRequestIds.add(requestId);
    setLoggedImpressionRequestIds(nextLoggedRequestIds);

    void emitRecommendationEvents(recommendedVisibleItems.map((item) => ({
      eventType: "IMPRESSION",
      quizId: item.quizId,
      recommendationBucket: item.bucketKey,
      recommendationRank: item.recommendationRank,
      recommendationScore: item.recommendationScore,
    })));
  }, [emitRecommendationEvents, filteredItems, loggedImpressionRequestIds, recommendationData?.requestId]);

  const handleClone = React.useCallback(async (item) => {
    const quizId = Number(item?.quizId);
    const normalizedWorkspaceId = Number(workspaceId);
    if (!Number.isInteger(quizId) || quizId <= 0 || !Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
      return;
    }

    setCloningQuizId(quizId);
    try {
      if (item?.isRecommended) {
        await emitRecommendationEvents([{
          eventType: "CLONE_CLICK",
          quizId,
          recommendationBucket: item?.bucketKey,
          recommendationRank: item?.recommendationRank,
          recommendationScore: item?.recommendationScore,
        }]);
      }

      await cloneCommunityQuizToWorkspace(quizId, normalizedWorkspaceId, item?.isRecommended ? {
        recommendationRequestId: recommendationData?.requestId,
        recommendationBucket: item?.bucketKey,
        recommendationRank: item?.recommendationRank,
        recommendationScore: item?.recommendationScore,
      } : {});

      showSuccess(t("workspace.quiz.communityRecommendations.cloneSuccess", "Đã clone quiz vào workspace này."));
      await loadCommunityData();
      if (typeof onCloneSuccess === "function") {
        await onCloneSuccess(item);
      }
    } catch (error) {
      showError(error?.message || t("workspace.quiz.communityRecommendations.cloneError", "Clone quiz thất bại."));
    } finally {
      setCloningQuizId(null);
    }
  }, [emitRecommendationEvents, loadCommunityData, onCloneSuccess, recommendationData?.requestId, showError, showSuccess, t, workspaceId]);

  return (
    <div className="h-full flex flex-col">
      <div className={`px-4 py-3 border-b ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <p className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                {t("workspace.quiz.communityExplorer.title", "Community Quiz")}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                {mergedItems.length}
              </span>
            </div>
            <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"} ${fontClass}`}>
              {t(
                "workspace.quiz.communityExplorer.description",
                "Các quiz phù hợp nhất với workspace này sẽ được đưa lên đầu, sau đó là toàn bộ quiz công khai còn lại."
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onBackToQuiz?.()}
              className={`rounded-full h-9 px-4 ${isDarkMode ? "border-slate-700 text-slate-200" : ""}`}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="text-sm">{t("workspace.quiz.communityExplorer.backToQuiz", "Quay lại Quiz")}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => loadCommunityData()}
              disabled={loading}
              className={`rounded-full h-9 w-9 p-0 ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b flex flex-col gap-3">
        <div className="relative max-w-sm">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("workspace.quiz.communityExplorer.searchPlaceholder", "Tìm quiz công khai...")}
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none transition-colors ${
              isDarkMode
                ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
            }`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
            {t("workspace.quiz.communityExplorer.recommendedCount", "{{count}} quiz phù hợp ở đầu danh sách", {
              count: mergedItems.filter((item) => item?.isRecommended).length,
            })}
          </span>
          <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
            {t("workspace.quiz.communityExplorer.publicCount", "{{count}} quiz công khai khả dụng", {
              count: mergedItems.length,
            })}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className={`w-8 h-8 animate-spin mb-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {t("workspace.quiz.loading", "Đang tải quiz...")}
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Globe2 className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
              {mergedItems.length === 0
                ? t("workspace.quiz.communityExplorer.empty", "Chưa có quiz công khai nào phù hợp để hiển thị.")
                : t("workspace.listView.noResults", "Không tìm thấy kết quả phù hợp.")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {filteredItems.map((item) => (
              <CommunityQuizCard
                key={item.quizId}
                item={item}
                cloningQuizId={cloningQuizId}
                onClone={handleClone}
                isDarkMode={isDarkMode}
                fontClass={fontClass}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
