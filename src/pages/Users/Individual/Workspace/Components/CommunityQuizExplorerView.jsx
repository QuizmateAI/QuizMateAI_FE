import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BarChart3,
  Clock3,
  Compass,
  Download,
  Eye,
  Globe2,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getWorkspaceQuizRecommendations,
  logWorkspaceQuizRecommendationEvents,
} from "@/api/WorkspaceAPI";
import { cloneCommunityQuizToWorkspace } from "@/api/QuizAPI";
import { useToast } from "@/context/ToastContext";
import CommunityQuizSignals from "@/pages/Users/Quiz/components/CommunityQuizSignals";
import CommunityQuizDetailDialog from "@/pages/Users/Quiz/components/CommunityQuizDetailDialog";

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

const TIER_ORDER = ["TOP_MATCH", "RELATED", "EXPLORE"];

const TIER_META = {
  TOP_MATCH: {
    labelKey: "workspace.quiz.communityExplorer.tier.topMatch",
    defaultLabel: "Khớp nhất với workspace",
    description: "Trùng domain, roadmap hoặc điểm yếu đang học",
    icon: Sparkles,
    badgeClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
    cardAccent: "border-emerald-300 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/10",
  },
  RELATED: {
    labelKey: "workspace.quiz.communityExplorer.tier.related",
    defaultLabel: "Liên quan",
    description: "Có chung topic / bloom / độ khó với thói quen học",
    icon: Target,
    badgeClassName: "bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300",
    cardAccent: "border-sky-200 bg-sky-50/30 dark:border-sky-800/70 dark:bg-sky-950/10",
  },
  EXPLORE: {
    labelKey: "workspace.quiz.communityExplorer.tier.explore",
    defaultLabel: "Khám phá thêm",
    description: "Gần về ngữ nghĩa, thử nếu bạn muốn mở rộng",
    icon: Compass,
    badgeClassName: "bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300",
    cardAccent: "border-violet-200 bg-violet-50/30 dark:border-violet-800/70 dark:bg-violet-950/10",
  },
};

function groupItemsByTier(items) {
  const groups = {
    TOP_MATCH: [],
    RELATED: [],
    EXPLORE: [],
  };
  items.forEach((item, index) => {
    const tier = TIER_META[item?.relevanceTier] ? item.relevanceTier : "EXPLORE";
    groups[tier].push({ ...item, recommendationRank: index + 1 });
  });
  return groups;
}

function CommunityQuizCard({
  item,
  cloningQuizId,
  onClone,
  onPreview,
  isDarkMode,
  fontClass,
  t,
}) {
  const duration = normalizeDurationMinutes(item?.duration);
  const difficultyLabel = formatDifficulty(item?.overallDifficulty, t);
  const cloneCount = Number(item?.communityCloneCount) || 0;
  const reasons = Array.isArray(item?.reasons) ? item.reasons.slice(0, 2) : [];
  const topics = Array.isArray(item?.matchedTopics) ? item.matchedTopics.slice(0, 3) : [];
  const tierMeta = TIER_META[item?.relevanceTier] || TIER_META.EXPLORE;
  const TierIcon = tierMeta.icon;
  const isCloning = Number(cloningQuizId) === Number(item?.quizId);

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition-colors ${
        isDarkMode ? "border-slate-800 bg-slate-900/80" : tierMeta.cardAccent || "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tierMeta.badgeClassName}`}>
              <TierIcon className="h-3.5 w-3.5" />
              {t(tierMeta.labelKey, tierMeta.defaultLabel)}
            </span>
            {Number.isFinite(Number(item?.recommendationScore)) ? (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
              }`}>
                {Math.round(Number(item.recommendationScore))} pts
              </span>
            ) : null}
          </div>

          <p className={`mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100 ${fontClass}`}>
            {item?.title || t("workspace.quiz.communityRecommendations.defaultQuizTitle", "Community quiz")}
          </p>

          <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
            {Number.isFinite(Number(item?.totalQuestion)) && Number(item.totalQuestion) > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                {t("workspace.quiz.communityRecommendations.totalQuestions", "{{count}} câu", {
                  count: Number(item.totalQuestion),
                })}
              </span>
            ) : null}
            {duration ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {t("workspace.quiz.communityRecommendations.durationMinutes", "{{count}} min", { count: duration })}
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
            {item?.creatorName ? (
              <span className="inline-flex items-center gap-1 italic">
                @{item.creatorName}
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
            className={`rounded-full px-4 ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900" : ""}`}
          >
            <Eye className="h-4 w-4" />
            <span className={`ml-1 ${fontClass}`}>
              {t("workspace.quiz.communityDetail.previewAction", "Preview")}
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
              {t("workspace.quiz.communityRecommendations.cloneAction", "Clone to this workspace")}
            </span>
          </Button>
        </div>
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
  const [loggedImpressionRequestIds, setLoggedImpressionRequestIds] = React.useState(() => new Set());
  const [selectedQuizItem, setSelectedQuizItem] = React.useState(null);

  const loadCommunityData = React.useCallback(async () => {
    const normalizedWorkspaceId = Number(workspaceId);
    if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
      setRecommendationData(null);
      return;
    }

    setLoading(true);
    try {
      const response = await getWorkspaceQuizRecommendations(normalizedWorkspaceId);
      setRecommendationData(extractApiData(response));
    } catch (error) {
      showError(error?.message || t("workspace.quiz.communityExplorer.loadError", "Load Error"));
      setRecommendationData(null);
    } finally {
      setLoading(false);
    }
  }, [showError, t, workspaceId]);

  React.useEffect(() => {
    void loadCommunityData();
  }, [loadCommunityData]);

  const allItems = React.useMemo(() => {
    const raw = Array.isArray(recommendationData?.items) ? recommendationData.items : [];
    return raw
      .filter((item) => Number.isInteger(Number(item?.quizId)) && Number(item.quizId) > 0)
      .map((item) => ({ ...item, quizId: Number(item.quizId) }));
  }, [recommendationData]);

  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return allItems;
    const query = searchQuery.trim().toLowerCase();
    return allItems.filter((item) => String(item?.title || "").toLowerCase().includes(query));
  }, [allItems, searchQuery]);

  const groupedItems = React.useMemo(() => groupItemsByTier(filteredItems), [filteredItems]);
  const communityHidden = Boolean(recommendationData?.communityHidden);

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
    const visibleItems = filteredItems.slice(0, 8);
    if (!requestId || visibleItems.length === 0 || loggedImpressionRequestIds.has(requestId)) {
      return;
    }

    const nextLoggedRequestIds = new Set(loggedImpressionRequestIds);
    nextLoggedRequestIds.add(requestId);
    setLoggedImpressionRequestIds(nextLoggedRequestIds);

    void emitRecommendationEvents(visibleItems.map((item, index) => ({
      eventType: "IMPRESSION",
      quizId: item.quizId,
      recommendationBucket: item.relevanceTier,
      recommendationRank: index + 1,
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
      await emitRecommendationEvents([{
        eventType: "CLONE_CLICK",
        quizId,
        recommendationBucket: item?.relevanceTier,
        recommendationRank: item?.recommendationRank,
        recommendationScore: item?.recommendationScore,
      }]);

      await cloneCommunityQuizToWorkspace(quizId, normalizedWorkspaceId, {
        recommendationRequestId: recommendationData?.requestId,
        recommendationBucket: item?.relevanceTier,
        recommendationRank: item?.recommendationRank,
        recommendationScore: item?.recommendationScore,
      });

      showSuccess(t("workspace.quiz.communityRecommendations.cloneSuccess", "Quiz cloned into this workspace."));
      setSelectedQuizItem(null);
      await loadCommunityData();
      if (typeof onCloneSuccess === "function") {
        await onCloneSuccess(item);
      }
    } catch (error) {
      showError(error?.message || t("workspace.quiz.communityRecommendations.cloneError", "Unable to clone this quiz right now."));
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
                {allItems.length}
              </span>
            </div>
            <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"} ${fontClass}`}>
              {t("workspace.quiz.communityExplorer.description", "Quiz công khai được gợi ý dựa trên domain, roadmap và thói quen học của workspace này.")}
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
              <span className="text-sm">{t("workspace.quiz.communityExplorer.backToQuiz", "Back To Quiz")}</span>
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

      {communityHidden ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <Globe2 className={`w-12 h-12 mb-3 ${isDarkMode ? "text-slate-600" : "text-slate-300"}`} />
          <p className={`text-base font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"} ${fontClass}`}>
            {t("workspace.quiz.communityExplorer.hiddenTitle", "Workspace chưa đủ dữ liệu để gợi ý community quiz")}
          </p>
          <p className={`mt-2 max-w-md text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"} ${fontClass}`}>
            {recommendationData?.emptyReason
              || t(
                "workspace.quiz.communityExplorer.hiddenDescription",
                "Hãy hoàn thành profile workspace (domain, mục tiêu học) hoặc làm vài quiz trước để Quizmate hiểu và gợi ý đúng nội dung.",
              )}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => onBackToQuiz?.()}
            className={`mt-4 rounded-full px-5 ${isDarkMode ? "border-slate-700 text-slate-200" : ""}`}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t("workspace.quiz.communityExplorer.backToQuiz", "Back To Quiz")}
          </Button>
        </div>
      ) : (
        <>
          <div className="px-4 py-3 border-b flex flex-col gap-3">
            <div className="relative max-w-sm">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("workspace.quiz.communityExplorer.searchPlaceholder", "Search Placeholder")}
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none transition-colors ${
                  isDarkMode
                    ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
                }`}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {TIER_ORDER.map((tierKey) => {
                const count = groupedItems[tierKey]?.length || 0;
                const meta = TIER_META[tierKey];
                if (count === 0) return null;
                return (
                  <span
                    key={tierKey}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${meta.badgeClassName}`}
                  >
                    {t(meta.labelKey, meta.defaultLabel)}: {count}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className={`w-8 h-8 animate-spin mb-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  {t("workspace.quiz.loading", "Loading quizzes...")}
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Globe2 className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                  {allItems.length === 0
                    ? recommendationData?.emptyReason || t("workspace.quiz.communityExplorer.empty", "Empty")
                    : t("workspace.listView.noResults", "No results found")}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {TIER_ORDER.map((tierKey) => {
                  const items = groupedItems[tierKey] || [];
                  if (items.length === 0) return null;
                  const meta = TIER_META[tierKey];
                  const TierIcon = meta.icon;
                  return (
                    <section key={tierKey}>
                      <div className="mb-3 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badgeClassName}`}>
                          <TierIcon className="h-3.5 w-3.5" />
                          {t(meta.labelKey, meta.defaultLabel)}
                        </span>
                        <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {meta.description}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        {items.map((item) => (
                          <CommunityQuizCard
                            key={item.quizId}
                            item={item}
                            cloningQuizId={cloningQuizId}
                            onClone={handleClone}
                            onPreview={setSelectedQuizItem}
                            isDarkMode={isDarkMode}
                            fontClass={fontClass}
                            t={t}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

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
        description={t("workspace.quiz.communityDetail.previewDescription", "Preview questions, community rating and public comments before cloning.")}
        onClone={selectedQuizItem ? () => handleClone(selectedQuizItem) : undefined}
        cloneLoading={Number(cloningQuizId) === Number(selectedQuizItem?.quizId)}
        showCloneAction
        cloneActionLabel={t("workspace.quiz.communityRecommendations.cloneAction", "Clone to this workspace")}
      />
    </div>
  );
}
