import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import CircularProgressLoader from "@/Components/ui/CircularProgressLoader";
import QuizListView from "./QuizListView";
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

function RoadmapCanvasView2({
  roadmap,
  isDarkMode = false,
  fontClass = "font-sans",
  selectedPhaseId = null,
  onCreatePhaseKnowledge,
  onCreatePhasePreLearning,
  isStudyNewRoadmap = false,
  onViewQuiz,
  generatingKnowledgePhaseIds = [],
  generatingKnowledgeQuizPhaseIds = [],
  generatingPreLearningPhaseIds = [],
  quizRefreshToken = 0,
  progressTracking = null,
}) {
  const { t } = useTranslation();
  const [openPhaseId, setOpenPhaseId] = useState(null);
  const getDefaultOpenKnowledgeMap = (phaseList = []) => {
    return (phaseList || []).reduce((accumulator, phase) => {
      const phaseId = Number(phase?.phaseId);
      if (!Number.isInteger(phaseId) || phaseId <= 0) return accumulator;

      (phase?.knowledges || []).forEach((knowledge) => {
        const knowledgeId = Number(knowledge?.knowledgeId);
        if (!Number.isInteger(knowledgeId) || knowledgeId <= 0) return;
        accumulator[`${phaseId}:${knowledgeId}`] = true;
      });

      return accumulator;
    }, {});
  };
  const knowledgeDropdownStorageKey = useMemo(() => {
    const normalizedWorkspaceId = Number(roadmap?.workspaceId);
    const normalizedRoadmapId = Number(roadmap?.roadmapId);

    if (Number.isInteger(normalizedWorkspaceId) && normalizedWorkspaceId > 0
      && Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0) {
      return `workspace_${normalizedWorkspaceId}_roadmap_${normalizedRoadmapId}_knowledge_dropdown`;
    }

    return null;
  }, [roadmap?.roadmapId, roadmap?.workspaceId]);

  const phases = useMemo(() => {
    const rawPhases = roadmap?.phases ?? [];
    return [...rawPhases].sort((a, b) => Number(a?.phaseIndex ?? 0) - Number(b?.phaseIndex ?? 0));
  }, [roadmap?.phases]);

  const getPersistedKnowledgeMap = (storageKey) => {
    if (!storageKey || typeof window === "undefined") {
      return {};
    }

    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }

      return Object.entries(parsed).reduce((accumulator, [key, value]) => {
        if (typeof value === "boolean") {
          accumulator[key] = value;
        }
        return accumulator;
      }, {});
    } catch (error) {
      console.error("Không thể khôi phục trạng thái dropdown knowledge:", error);
      return {};
    }
  };

  const defaultOpenKnowledgeMap = useMemo(() => getDefaultOpenKnowledgeMap(phases), [phases]);
  const [persistedKnowledgeState, setPersistedKnowledgeState] = useState(() => ({
    key: knowledgeDropdownStorageKey,
    map: getPersistedKnowledgeMap(knowledgeDropdownStorageKey),
  }));
  const persistedKnowledgeMap = useMemo(() => {
    if (persistedKnowledgeState.key === knowledgeDropdownStorageKey) {
      return persistedKnowledgeState.map;
    }

    return getPersistedKnowledgeMap(knowledgeDropdownStorageKey);
  }, [knowledgeDropdownStorageKey, persistedKnowledgeState]);
  const openKnowledgeMap = useMemo(
    () => ({
      ...defaultOpenKnowledgeMap,
      ...persistedKnowledgeMap,
    }),
    [defaultOpenKnowledgeMap, persistedKnowledgeMap]
  );

  const fallbackPhaseId = phases[0]?.phaseId ?? null;
  const hasSelectedPhaseFromSidebar = phases.some((phase) => phase.phaseId === selectedPhaseId);
  const effectiveOpenPhaseId = hasSelectedPhaseFromSidebar
    ? selectedPhaseId
    : phases.some((phase) => phase.phaseId === openPhaseId)
    ? openPhaseId
    : fallbackPhaseId;
  const activePhase = phases.find((phase) => phase.phaseId === effectiveOpenPhaseId) || null;

  const togglePhase = (phaseId) => {
    setOpenPhaseId((current) => (current === phaseId ? null : phaseId));
  };

  const toggleKnowledge = (phaseId, knowledgeId) => {
    const key = `${phaseId}:${knowledgeId}`;
    const nextKnowledgeMap = {
      ...openKnowledgeMap,
      [key]: !openKnowledgeMap[key],
    };

    if (knowledgeDropdownStorageKey && typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(knowledgeDropdownStorageKey, JSON.stringify(nextKnowledgeMap));
      } catch (error) {
        console.error("Không thể lưu trạng thái dropdown knowledge:", error);
      }
    }

    setPersistedKnowledgeState({
      key: knowledgeDropdownStorageKey,
      map: nextKnowledgeMap,
    });
  };

  const renderLoadingPlaceholder = (message, compact = false, percent = 0, color = "blue") => {
    const displayPercent = Math.max(0, Math.min(100, Number(percent) || 0));
    return (
      <div
        className={`flex items-center gap-3 rounded-lg border ${compact ? "px-3 py-2" : "px-4 py-3"} ${
          isDarkMode ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"
        }`}
      >
        <CircularProgressLoader
          percent={displayPercent}
          size={compact ? "sm" : "md"}
          color={color}
          className="shrink-0"
        />
        <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-gray-700"} ${fontClass}`}>
          {message}
        </p>
      </div>
    );
  };

  const renderQuizItem = (quiz) => {
    const status = String(quiz?.status || "DRAFT").toUpperCase();
    const questionCount = Number(quiz?.questionCount ?? 0);
    const isCompleted = status === "COMPLETED";

    return (
      <div
        key={quiz?.quizId || quiz?.id || `${quiz?.title}-quiz`}
        className={`flex items-start gap-3 py-2.5 ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}
      >
        {isCompleted ? (
          <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${isDarkMode ? "text-green-500" : "text-green-600"}`} />
        ) : (
          <div className={`w-4 h-4 mt-0.5 shrink-0 rounded border-2 ${isDarkMode ? "border-slate-500" : "border-slate-300"}`} />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>{quiz?.title}</p>
          <div className={`flex items-center gap-2 mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            <span className="flex items-center gap-1"><BookOpenCheck className="w-3 h-3" />{questionCount} {t("workspace.roadmap.canvas.questions")}</span>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 shrink-0 font-medium ${
          isCompleted 
            ? isDarkMode 
              ? "bg-green-950/50 text-green-300 border border-green-500/30" 
              : "bg-green-100 text-green-800 border border-green-200" 
            : isDarkMode 
              ? "bg-slate-800/50 text-slate-300 border border-slate-700/50" 
              : "bg-slate-100 text-slate-700 border border-slate-200"
        }`}>
          {status}
        </div>
      </div>
    );
  };

  const renderFlashcardItem = (flashcard) => {
    const status = String(flashcard?.status || "DRAFT").toUpperCase();
    const count = Number(flashcard?.cardCount ?? flashcard?.itemCount ?? 0);
    const isCompleted = status === "COMPLETED";

    return (
      <div
        key={flashcard?.flashcardSetId || flashcard?.id || `${flashcard?.title}-flashcard`}
        className={`flex items-start gap-3 py-2.5 ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}
      >
        {isCompleted ? (
          <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${isDarkMode ? "text-green-500" : "text-green-600"}`} />
        ) : (
          <div className={`w-4 h-4 mt-0.5 shrink-0 rounded border-2 ${isDarkMode ? "border-slate-500" : "border-slate-300"}`} />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
            {flashcard?.title || flashcard?.flashcardSetName}
          </p>
          <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            {count} {t("workspace.roadmap.canvas.cards")}
          </p>
        </div>
        <div className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 shrink-0 font-medium ${
          isCompleted 
            ? isDarkMode 
              ? "bg-green-950/50 text-green-300 border border-green-500/30" 
              : "bg-green-100 text-green-800 border border-green-200" 
            : isDarkMode 
              ? "bg-slate-800/50 text-slate-300 border border-slate-700/50" 
              : "bg-slate-100 text-slate-700 border border-slate-200"
        }`}>
          {status}
        </div>
      </div>
    );
  };

  const renderKnowledgeContent = (phase, knowledge) => {
    const normalizedPhaseId = Number(phase?.phaseId);
    const isGeneratingKnowledgeQuiz = generatingKnowledgeQuizPhaseIds.includes(normalizedPhaseId);
    const quizzes = knowledge?.quizzes || [];
    const hasQuizzes = quizzes.length > 0;
    const flashcards = knowledge?.flashcards || [];
    const hasFlashcards = flashcards.length > 0;

    // Luôn hiển thị quiz section khi đang generate, ngay cả khi không có quiz hiện tại
    if (!hasQuizzes && !hasFlashcards && !isGeneratingKnowledgeQuiz) {
      return (
        <p className={`px-4 py-3 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
          {t("workspace.roadmap.noQuizYet", "Chưa có quiz")}
        </p>
      );
    }

    return (
      <div className={`border-t pt-2 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
        {hasQuizzes || isGeneratingKnowledgeQuiz ? (
          <div className={`${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
            <h5 className={`text-xs font-semibold px-4 py-2 uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {t("workspace.roadmap.canvas.quiz", "Quiz")}
            </h5>
            <div className="px-4 pb-2">
              {isGeneratingKnowledgeQuiz && !hasQuizzes ? (
                renderLoadingPlaceholder(
                  t("workspace.roadmap.generatingKnowledgeQuiz", "AI đang tạo quiz cho knowledge..."),
                  true,
                  progressTracking?.getKnowledgeProgress(normalizedPhaseId) ?? 0
                )
              ) : (
                <>
                  {isGeneratingKnowledgeQuiz ? (
                    <div className="mb-2">
                      {renderLoadingPlaceholder(
                        t("workspace.roadmap.generatingKnowledgeQuiz", "AI đang tạo quiz cho knowledge..."),
                        true,
                        progressTracking?.getKnowledgeProgress(normalizedPhaseId) ?? 0
                      )}
                    </div>
                  ) : null}
                  <QuizListView
                    isDarkMode={isDarkMode}
                    contextType="KNOWLEDGE"
                    contextId={knowledge.knowledgeId}
                    onCreateQuiz={() => onCreatePhaseKnowledge?.(phase.phaseId)}
                    onViewQuiz={(quiz) => onViewQuiz?.(quiz, { backTarget: { view: "roadmap", phaseId: Number(phase.phaseId) } })}
                    embedded
                    hideCreateButton
                    title={t("workspace.roadmap.canvas.quiz", "Quiz")}
                    refreshToken={quizRefreshToken}
                    returnToPath={roadmap?.workspaceId ? `/workspace/${roadmap.workspaceId}/roadmap?phaseId=${phase.phaseId}` : null}
                  />
                </>
              )}
            </div>
          </div>
        ) : null}

        {hasFlashcards && (
          <div className={`${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
            <h5 className={`text-xs font-semibold px-4 py-2 uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {t("workspace.roadmap.canvas.flashcard", "Flashcard")}
            </h5>
            <div className={`px-4 space-y-0.5`}>
              {flashcards.map(renderFlashcardItem)}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!roadmap) {
    return (
      <div className={`h-full flex items-center justify-center ${isDarkMode ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-600"}`}>
        <p className={fontClass}>{t("workspace.roadmap.noRoadmapYet", "Chưa có roadmap")}</p>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto p-4 ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
      <div className="space-y-3">
        {activePhase ? [activePhase].map((phase) => {
          const isOpen = effectiveOpenPhaseId === phase.phaseId;
          const normalizedPhaseId = Number(phase.phaseId);
          const normalizedPhaseStatus = String(phase?.status || "").toUpperCase();
          const isCompletedPhase = normalizedPhaseStatus === "COMPLETED";
          const isProcessingPhase = normalizedPhaseStatus === "PROCESSING";
          const phaseStatusLabel = isCompletedPhase
            ? t("workspace.quiz.statusLabels.COMPLETED", "Completed")
            : isProcessingPhase
            ? t("workspace.quiz.statusLabels.PROCESSING", "Processing")
            : t("workspace.quiz.statusLabels.ACTIVE", "Active");
          const isGeneratingPhaseContent = generatingKnowledgePhaseIds.includes(Number(phase.phaseId));
          const isGeneratingKnowledgeQuiz = generatingKnowledgeQuizPhaseIds.includes(Number(phase.phaseId));
          const isGeneratingKnowledge = isGeneratingPhaseContent || isGeneratingKnowledgeQuiz;
          const isGeneratingPreLearning = generatingPreLearningPhaseIds.includes(normalizedPhaseId);
          const phaseKnowledgePercent = progressTracking?.getKnowledgeProgress(normalizedPhaseId) ?? 0;
          const phasePreLearningPercent = progressTracking?.getPreLearningProgress(normalizedPhaseId) ?? 0;
          const phasePostLearningPercent = progressTracking?.getPostLearningProgress(normalizedPhaseId) ?? 0;
          const phaseProcessingPercent = Math.max(phaseKnowledgePercent, phasePreLearningPercent, phasePostLearningPercent, 0);
          const hasKnowledge = (phase.knowledges || []).length > 0;
          const hasPreLearning = (phase.preLearningQuizzes || []).length > 0;
          const hasPostLearning = (phase.postLearningQuizzes || []).length > 0;
          const shouldShowPreLearningDecision = isStudyNewRoadmap && !hasPreLearning && !hasKnowledge;
          const shouldShowKnowledgePlaceholder = !hasKnowledge && isGeneratingPhaseContent;
          const shouldShowPreLearningPlaceholder = !hasPreLearning
            && isGeneratingPreLearning
            && !shouldShowPreLearningDecision;
          const shouldShowPostLearningPlaceholder = !hasPostLearning && isGeneratingPhaseContent;
          const totalKnowledgeCount = (phase.knowledges || []).length;
          const passedKnowledgeCount = (phase.knowledges || []).reduce((count, knowledge) => {
            const reviewQuizzes = (knowledge?.quizzes || []).filter(
              (quiz) => String(quiz?.quizIntent || "").toUpperCase() === "REVIEW"
            );

            const hasPassedReviewQuiz = reviewQuizzes.some((quiz) => {
              return quiz?.myPassed === true;
            });

            return hasPassedReviewQuiz ? count + 1 : count;
          }, 0);
          const allKnowledgeSatisfiedForPostLearning = (phase.knowledges || []).every((knowledge) => {
            const reviewQuizzes = (knowledge?.quizzes || []).filter(
              (quiz) => String(quiz?.quizIntent || "").toUpperCase() === "REVIEW"
            );

            if (reviewQuizzes.length === 0) return false;

            return reviewQuizzes.some((quiz) => {
              return quiz?.myPassed === true;
            });
          });
          const shouldLockPostLearning = hasPostLearning && !allKnowledgeSatisfiedForPostLearning;
          return (
            <div key={phase.phaseId} className={`rounded-lg border ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white"}`}>
              <button
                type="button"
                onClick={() => togglePhase(phase.phaseId)}
                className={`w-full px-4 py-4 flex items-start justify-between gap-4 text-left hover:bg-slate-50`}
              >
                <div className="min-w-0">
                  <p className={`text-xs uppercase tracking-[0.15em] ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
                    {t("workspace.roadmap.canvas.phase", "Phase")} {Number(phase?.phaseIndex ?? 0) + 1}
                  </p>
                  <h3 className={`mt-1 text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>{phase.title}</h3>
                  <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>{phase.description}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 ${
                    isCompletedPhase
                      ? (isDarkMode ? "bg-emerald-950/60 text-emerald-300" : "bg-green-100 text-green-800")
                      : isProcessingPhase
                      ? (isDarkMode ? "bg-amber-950/60 text-amber-300" : "bg-amber-100 text-amber-800")
                      : (isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700")
                  }`}>
                    {isCompletedPhase ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isProcessingPhase ? (
                      <CircularProgressLoader
                        percent={phaseProcessingPercent}
                        size="sm"
                        color="amber"
                        className="scale-[0.55] -my-2 -mx-1"
                      />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-current" />
                    )}
                    {phaseStatusLabel}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : "rotate-0"} ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
                </div>
              </button>

              {isOpen ? (
                <div className={`border-t ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                  <div className="px-4 py-3 space-y-4">
                    {hasPreLearning ? (
                    <div>
                      <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                        {t("workspace.roadmap.canvas.preLearning", "Pre-learning")}
                      </h4>
                      <p className={`text-xs mb-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                        {t("workspace.roadmap.preLearningHelper", "Vui lòng làm bài pre-learning để AI tạo lộ trình đúng với trình độ của bạn.")}
                      </p>
                      <QuizListView
                        isDarkMode={isDarkMode}
                        contextType="PHASE"
                        contextId={phase.phaseId}
                        onCreateQuiz={() => onCreatePhasePreLearning?.(phase.phaseId, { skipPreLearning: false })}
                        onViewQuiz={(quiz) => onViewQuiz?.(quiz, { backTarget: { view: "roadmap", phaseId: Number(phase.phaseId) } })}
                        embedded
                        hideCreateButton
                        title={t("workspace.roadmap.canvas.preLearning", "Pre-learning")}
                        intentFilter={["PRE_LEARNING"]}
                        refreshToken={quizRefreshToken}
                        returnToPath={roadmap?.workspaceId ? `/workspace/${roadmap.workspaceId}/roadmap?phaseId=${phase.phaseId}` : null}
                      />
                    </div>
                    ) : shouldShowPreLearningPlaceholder ? (
                      <div>
                        <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                          {t("workspace.roadmap.canvas.preLearning", "Pre-learning")}
                        </h4>
                        {renderLoadingPlaceholder(
                          t("workspace.roadmap.generatingPreLearning", "AI đang tạo pre-learning cho phase này..."),
                          false,
                          progressTracking?.getPreLearningProgress(Number(phase?.phaseId)) ?? 0
                        )}
                      </div>
                    ) : null}

                  </div>

                  {/* Knowledge Items */}
                  {hasKnowledge && (
                    <div className={`border-t mt-2 pt-2 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <div className="space-y-1">
                        {(phase.knowledges || []).map((knowledge) => {
                          const knowledgeKey = `${phase.phaseId}:${knowledge.knowledgeId}`;
                          const isKnowledgeOpen = Boolean(openKnowledgeMap[knowledgeKey]);
                          return (
                            <div key={knowledge.knowledgeId} className={`rounded-lg border ${isDarkMode ? "border-slate-800 bg-slate-950/30 hover:bg-slate-900/40" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition-colors"}`}>
                              <button
                                type="button"
                                onClick={() => toggleKnowledge(phase.phaseId, knowledge.knowledgeId)}
                                className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>{knowledge.title}</p>
                                </div>
                                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isKnowledgeOpen ? "rotate-180" : "rotate-0"} ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
                              </button>

                              {isKnowledgeOpen ? (
                                <div className="px-4 pb-2">
                                  {renderKnowledgeContent(phase, knowledge)}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {shouldShowKnowledgePlaceholder && !shouldShowPreLearningDecision ? (
                    <div className={`border-t mt-2 pt-3 px-4 pb-2 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                        {t("workspace.roadmap.canvas.knowledge", "Knowledge")}
                      </h4>
                      {renderLoadingPlaceholder(
                        t("workspace.roadmap.generatingKnowledge", "Vui lòng đợi AI tạo knowledge cho phase này..."),
                        false,
                        progressTracking?.getKnowledgeProgress(Number(phase?.phaseId)) ?? 0
                      )}
                    </div>
                  ) : null}

                  {hasPostLearning ? (
                    <div className={`mt-2 px-4 py-3 border-t ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <div>
                        <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                          {t("workspace.roadmap.canvas.postLearning", "Post-learning")}
                        </h4>
                        <p className={`text-xs mb-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                          {t("workspace.roadmap.postLearningHelper", "Hoàn thành post-learning để đánh giá mức độ nắm vững kiến thức sau khi học phase này.")}
                        </p>
                        <p className={`text-xs mb-2 ${isDarkMode ? "text-blue-300" : "text-blue-700"} ${fontClass}`}>
                          {t("workspace.roadmap.postLearningProgress", "Tiến độ mở khóa: {{passed}}/{{total}} knowledge đã đạt điều kiện.", {
                            passed: passedKnowledgeCount,
                            total: totalKnowledgeCount,
                          })}
                        </p>
                        {shouldLockPostLearning ? (
                          <p className={`text-xs mb-2 ${isDarkMode ? "text-amber-300" : "text-amber-700"} ${fontClass}`}>
                            {t("workspace.roadmap.postLearningLocked", "Mỗi knowledge cần đạt điểm qua ở ít nhất 1 quiz ôn tập để mở post-learning.")}
                          </p>
                        ) : null}
                        <div className={shouldLockPostLearning ? "opacity-50 pointer-events-none select-none" : ""}>
                          <QuizListView
                            isDarkMode={isDarkMode}
                            contextType="PHASE"
                            contextId={phase.phaseId}
                            onCreateQuiz={() => onCreatePhaseKnowledge?.(phase.phaseId)}
                            onViewQuiz={(quiz) => onViewQuiz?.(quiz, { backTarget: { view: "roadmap", phaseId: Number(phase.phaseId) } })}
                            embedded
                            hideCreateButton
                            title={t("workspace.roadmap.canvas.postLearning", "Post-learning")}
                            intentFilter={["POST_LEARNING"]}
                            refreshToken={quizRefreshToken}
                            returnToPath={roadmap?.workspaceId ? `/workspace/${roadmap.workspaceId}/roadmap?phaseId=${phase.phaseId}` : null}
                          />
                        </div>
                      </div>
                    </div>
                  ) : shouldShowPostLearningPlaceholder ? (
                    <div className={`mt-2 px-4 py-3 border-t ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                        {t("workspace.roadmap.canvas.postLearning", "Post-learning")}
                      </h4>
                      {renderLoadingPlaceholder(
                        t("workspace.roadmap.generatingPostLearning", "AI đang tạo post-learning cho phase này..."),
                        false,
                        progressTracking?.getPostLearningProgress(Number(phase?.phaseId)) ?? 0
                      )}
                    </div>
                  ) : null}

                  {shouldShowPreLearningDecision && (
                    <div className={`border-t mt-2 pt-4 px-4 pb-4 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <div className={`rounded-lg border p-4 ${isDarkMode ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
                        {isGeneratingKnowledge ? (
                          <div className="space-y-2">
                            {isGeneratingPhaseContent ? renderLoadingPlaceholder(
                              t("workspace.roadmap.generatingKnowledge", "Vui lòng đợi AI tạo knowledge cho phase này..."),
                              true,
                              phaseKnowledgePercent
                            ) : null}
                            {isGeneratingKnowledgeQuiz ? renderLoadingPlaceholder(
                              t("workspace.roadmap.generatingKnowledgeQuiz", "AI đang tạo quiz cho knowledge..."),
                              true,
                              phaseKnowledgePercent
                            ) : null}
                          </div>
                        ) : isGeneratingPreLearning ? (
                          renderLoadingPlaceholder(
                            t("workspace.roadmap.generatingPreLearning", "AI đang tạo pre-learning cho phase này..."),
                            true,
                            phasePreLearningPercent
                          )
                        ) : (
                          <div className="flex flex-col gap-3">
                            <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-gray-700"} ${fontClass}`}>
                              {t("workspace.roadmap.preLearningPrompt", "Bạn muốn bắt đầu phase này theo cách nào?")}
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => onCreatePhasePreLearning?.(phase.phaseId, { skipPreLearning: false })}
                                className={`${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                              >
                                {t("workspace.roadmap.studyNew.hasFoundation", "Tôi đã có nền tảng của giai đoạn này")}
                              </Button>
                              <Button
                                type="button"
                                onClick={() => onCreatePhaseKnowledge?.(phase.phaseId, { skipPreLearning: true })}
                                className="bg-[#2563EB] hover:bg-blue-700 text-white"
                              >
                                {t("workspace.roadmap.studyNew.noBackground", "Tôi chưa biết gì về giai đoạn này")}
                              </Button>
                            </div>
                            <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-500"} ${fontClass}`}>
                              {t("workspace.roadmap.studyNew.preLearningNote", "Nếu đạt từ 90% ở pre-learning, bạn có thể được bỏ qua phase này.")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!hasKnowledge && hasPreLearning && isGeneratingKnowledge && (
                    <div className={`border-t mt-2 pt-4 px-4 pb-4 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <div className={`rounded-lg border p-4 ${isDarkMode ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
                        <div className="space-y-2">
                          {isGeneratingPhaseContent ? renderLoadingPlaceholder(
                            t("workspace.roadmap.generatingKnowledge", "Vui lòng đợi AI tạo knowledge cho phase này..."),
                            true,
                            phaseKnowledgePercent
                          ) : null}
                          {isGeneratingKnowledgeQuiz ? renderLoadingPlaceholder(
                            t("workspace.roadmap.generatingKnowledgeQuiz", "AI đang tạo quiz cho knowledge..."),
                            true,
                            phaseKnowledgePercent
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}

                  {isGeneratingKnowledge && hasKnowledge && (
                    <div className={`border-t px-4 py-3 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <div className="space-y-1">
                        {isGeneratingPhaseContent ? renderLoadingPlaceholder(
                          t("workspace.roadmap.generatingKnowledge", "Vui lòng đợi AI tạo knowledge cho phase này..."),
                          true,
                          phaseKnowledgePercent
                        ) : null}
                        {isGeneratingKnowledgeQuiz ? renderLoadingPlaceholder(
                          t("workspace.roadmap.generatingKnowledgeQuiz", "AI đang tạo quiz cho knowledge..."),
                          true,
                          phaseKnowledgePercent
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        }) : null}
      </div>
    </div>
  );
}

export default RoadmapCanvasView2;
