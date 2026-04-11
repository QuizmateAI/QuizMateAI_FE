import React from "react";
import { UploadCloud, Sparkles, Route, BadgeCheck, Layers, Rows3, Map, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import ListSpinner from "@/Components/ui/ListSpinner";
import { getRoadmapReview } from "@/api/RoadmapAPI";
import RoadmapReviewPanel from "@/Components/workspace/RoadmapReviewPanel";
import CreateQuizForm from "./CreateQuizForm";

const LazyCreateFlashcardForm = React.lazy(() => import("./CreateFlashcardForm"));
const LazyRoadmapCanvasView = React.lazy(() => import("./RoadmapCanvasView"));
const LazyQuizListView = React.lazy(() => import("./QuizListView"));
const LazyCommunityQuizExplorerView = React.lazy(() => import("./CommunityQuizExplorerView"));
const LazyQuizDetailView = React.lazy(() => import("./QuizDetailView"));
const LazyEditQuizForm = React.lazy(() => import("./EditQuizForm"));
const LazyFlashcardListView = React.lazy(() => import("./FlashcardListView"));
const LazyFlashcardDetailView = React.lazy(() => import("./FlashcardDetailView"));
const LazyMockTestListView = React.lazy(() => import("./MockTestListView"));
const LazyCreateMockTestForm = React.lazy(() => import("./CreateMockTestForm"));
const LazyMockTestDetailView = React.lazy(() => import("./MockTestDetailView"));
const LazyEditMockTestForm = React.lazy(() => import("./EditMockTestForm"));
const LazyPostLearningListView = React.lazy(() => import("./PostLearningListView"));
const LazyCreatePostLearningForm = React.lazy(() => import("./CreatePostLearningForm"));
const LazyQuestionStatsView = React.lazy(() => import("./QuestionStatsView"));

function DeferredPanel({ children }) {
  return (
    <React.Suspense fallback={<ListSpinner variant="section" className="flex-1" />}>
      {children}
    </React.Suspense>
  );
}

function ChatPanel({
  isDarkMode = false,
  sources = [],
  activeView = null,
  onUploadClick,
  onChangeView,
  onCreateQuiz,
  onCreateFlashcard,
  onCreateRoadmap,
  onCreateMockTest,
  onCreatePostLearning,
  onBack,
  workspaceId = null,
  selectedQuiz = null,
  onViewQuiz,
  onEditQuiz,
  onSaveQuiz,
  selectedFlashcard = null,
  onViewFlashcard,
  onDeleteFlashcard,
  selectedMockTest = null,
  onViewMockTest,
  onEditMockTest,
  onSaveMockTest,
  onViewPostLearning,
  selectedSourceIds = [],
  selectedRoadmapPhaseId = null,
  selectedRoadmapKnowledgeId = null,
  onCreateRoadmapPhases,
  onRoadmapPhaseFocus,
  onCreatePhaseKnowledge,
  onCreateKnowledgeQuizForKnowledge,
  onCreatePhasePreLearning,
  isStudyNewRoadmap = false,
  adaptationMode = "",
  isGeneratingRoadmapPhases = false,
  roadmapPhaseGenerationProgress = 0,
  generatingKnowledgePhaseIds = [],
  generatingKnowledgeQuizPhaseIds = [],
  generatingKnowledgeQuizKnowledgeKeys = [],
  knowledgeQuizRefreshByKey = {},
  generatingPreLearningPhaseIds = [],
  skipPreLearningPhaseIds = [],
  roadmapReloadToken = 0,
  onReloadRoadmap,
  shouldDisableQuiz = false,
  shouldDisableFlashcard = false,
  shouldDisableRoadmap = false,
  showRoadmapAction = true,
  shouldDisableCreateQuiz = false,
  shouldDisableCreateFlashcard = false,
  progressTracking = null,
  quizGenerationTaskByQuizId = null,
  quizGenerationProgressByQuizId = null,
  onShareQuiz,
  onShareRoadmap,
  onEditRoadmapConfig,
  planEntitlements = null,
  onToggleMaterialSelection,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const hasSources = sources.length > 0;
  const [activeRoadmapId, setActiveRoadmapId] = React.useState(null);
  const [roadmapReview, setRoadmapReview] = React.useState(null);

  React.useEffect(() => {
    if (!activeRoadmapId) return;
    let cancelled = false;
    getRoadmapReview(activeRoadmapId)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data?.data ?? res?.data ?? null;
        setRoadmapReview(data && data.assessmentId ? data : null);
      })
      .catch(() => {
        if (!cancelled) setRoadmapReview(null);
      });
    return () => { cancelled = true; };
  }, [activeRoadmapId]);

  const getIsActionDisabled = React.useCallback((actionKey) => {
    if (actionKey === "quiz") return shouldDisableQuiz;
    if (actionKey === "flashcard") return shouldDisableFlashcard;
    if (actionKey === "roadmap") return shouldDisableRoadmap;
    return false;
  }, [shouldDisableFlashcard, shouldDisableQuiz, shouldDisableRoadmap]);

  const isRoadmapQuickActionDisabled = !showRoadmapAction || getIsActionDisabled("roadmap");
  const areAllQuickActionsDisabled = isRoadmapQuickActionDisabled
    && getIsActionDisabled("quiz")
    && getIsActionDisabled("flashcard");
  const roadmapCanvasStorageKey = workspaceId ? `workspace_${workspaceId}_roadmap_canvas_view` : null;
  const [roadmapCanvasView, setRoadmapCanvasView] = React.useState("view2");

  React.useEffect(() => {
    if (!workspaceId) {
      setRoadmapCanvasView("view2");
      return;
    }

    const savedView = localStorage.getItem(`workspace_${workspaceId}_roadmap_canvas_view`);
    const normalizedView = ["view1", "view2", "overview"].includes(savedView) ? savedView : "view2";
    setRoadmapCanvasView(normalizedView);
  }, [workspaceId]);

  React.useEffect(() => {
    if (!roadmapCanvasStorageKey || !roadmapCanvasView) return;
    localStorage.setItem(roadmapCanvasStorageKey, roadmapCanvasView);
  }, [roadmapCanvasStorageKey, roadmapCanvasView]);

  const renderContent = () => {
    switch (activeView) {
      case "roadmap":
        return (
          <LazyRoadmapCanvasView
            isDarkMode={isDarkMode}
            onCreateRoadmap={onCreateRoadmap}
            onCreateRoadmapPhases={onCreateRoadmapPhases}
            onRoadmapPhaseFocus={onRoadmapPhaseFocus}
            onCreatePhaseKnowledge={onCreatePhaseKnowledge}
            onCreateKnowledgeQuizForKnowledge={onCreateKnowledgeQuizForKnowledge}
            onCreatePhasePreLearning={onCreatePhasePreLearning}
            isStudyNewRoadmap={isStudyNewRoadmap}
            adaptationMode={adaptationMode}
            onViewQuiz={onViewQuiz}
            isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
            roadmapPhaseGenerationProgress={roadmapPhaseGenerationProgress}
            generatingKnowledgePhaseIds={generatingKnowledgePhaseIds}
            generatingKnowledgeQuizPhaseIds={generatingKnowledgeQuizPhaseIds}
            generatingKnowledgeQuizKnowledgeKeys={generatingKnowledgeQuizKnowledgeKeys}
            knowledgeQuizRefreshByKey={knowledgeQuizRefreshByKey}
            generatingPreLearningPhaseIds={generatingPreLearningPhaseIds}
            skipPreLearningPhaseIds={skipPreLearningPhaseIds}
            reloadToken={roadmapReloadToken}
            onReloadRoadmap={onReloadRoadmap}
            workspaceId={workspaceId}
            forcedCanvasView={roadmapCanvasView}
            onCanvasViewChange={setRoadmapCanvasView}
            selectedPhaseId={selectedRoadmapPhaseId}
            selectedKnowledgeId={selectedRoadmapKnowledgeId}
            progressTracking={progressTracking}
            onShareRoadmap={onShareRoadmap}
            onShareQuiz={onShareQuiz}
            onEditRoadmapConfig={onEditRoadmapConfig}
            onRoadmapLoad={setActiveRoadmapId}
          />
        );
      case "quiz":
        return (
          <LazyQuizListView
            isDarkMode={isDarkMode}
            onCreateQuiz={() => onChangeView?.("createQuiz")}
            onViewQuiz={onViewQuiz}
            contextType="WORKSPACE"
            contextId={workspaceId}
            disableCreate={shouldDisableCreateQuiz}
            onShareQuiz={onShareQuiz}
            onOpenCommunityQuiz={() => onChangeView?.("communityQuiz")}
            progressTracking={progressTracking}
            quizGenerationTaskByQuizId={quizGenerationTaskByQuizId}
            quizGenerationProgressByQuizId={quizGenerationProgressByQuizId}
          />
        );
      case "communityQuiz":
        return (
          <LazyCommunityQuizExplorerView
            isDarkMode={isDarkMode}
            workspaceId={workspaceId}
            onBackToQuiz={() => onChangeView?.("quiz")}
          />
        );
      case "flashcard":
        return (
          <LazyFlashcardListView
            isDarkMode={isDarkMode}
            onCreateFlashcard={() => onChangeView?.("createFlashcard")}
            onViewFlashcard={onViewFlashcard}
            onDeleteFlashcard={onDeleteFlashcard}
            contextType="WORKSPACE"
            contextId={workspaceId}
            disableCreate={shouldDisableCreateFlashcard}
          />
        );
      case "mockTest":
        return (
          <LazyMockTestListView
            isDarkMode={isDarkMode}
            onCreateMockTest={() => onChangeView?.("createMockTest")}
            onViewMockTest={onViewMockTest}
            contextType="WORKSPACE"
            contextId={workspaceId}
          />
        );
      case "postLearning":
        return (
          <LazyPostLearningListView
            isDarkMode={isDarkMode}
            onCreatePostLearning={() => onChangeView?.("createPostLearning")}
            onViewPostLearning={onViewPostLearning}
            contextType="WORKSPACE"
            contextId={workspaceId}
          />
        );
      case "questionStats":
        return <LazyQuestionStatsView workspaceId={workspaceId} isDarkMode={isDarkMode} />;
      case "createQuiz":
        return (
          <CreateQuizForm
            isDarkMode={isDarkMode}
            onCreateQuiz={onCreateQuiz}
            onBack={onBack}
            contextType="WORKSPACE"
            contextId={workspaceId}
            selectedSourceIds={selectedSourceIds}
            sources={sources}
            planEntitlements={planEntitlements}
            onToggleMaterialSelection={onToggleMaterialSelection}
          />
        );
      case "createFlashcard":
        return (
          <LazyCreateFlashcardForm
            isDarkMode={isDarkMode}
            onCreateFlashcard={onCreateFlashcard}
            onBack={onBack}
            contextType="WORKSPACE"
            contextId={workspaceId}
            selectedSourceIds={selectedSourceIds}
            sources={sources}
          />
        );
      case "flashcardDetail":
        return selectedFlashcard ? <LazyFlashcardDetailView isDarkMode={isDarkMode} flashcard={selectedFlashcard} onBack={onBack} /> : null;
      case "quizDetail":
        return selectedQuiz ? <LazyQuizDetailView isDarkMode={isDarkMode} quiz={selectedQuiz} onBack={onBack} onEdit={onEditQuiz} contextType="WORKSPACE" contextId={workspaceId} /> : null;
      case "editQuiz":
        return selectedQuiz ? <LazyEditQuizForm isDarkMode={isDarkMode} quiz={selectedQuiz} onBack={onBack} onSave={onSaveQuiz} contextType="WORKSPACE" contextId={workspaceId} /> : null;
      case "createMockTest":
        return <LazyCreateMockTestForm isDarkMode={isDarkMode} onCreateMockTest={onCreateMockTest} onBack={onBack} contextType="WORKSPACE" contextId={workspaceId} />;
      case "createPostLearning":
        return <LazyCreatePostLearningForm isDarkMode={isDarkMode} onCreatePostLearning={onCreatePostLearning} onBack={onBack} contextType="WORKSPACE" contextId={workspaceId} />;
      case "mockTestDetail":
        return selectedMockTest ? <LazyMockTestDetailView isDarkMode={isDarkMode} quiz={selectedMockTest} onBack={onBack} onEdit={onEditMockTest} /> : null;
      case "editMockTest":
        return selectedMockTest ? <LazyEditMockTestForm isDarkMode={isDarkMode} quiz={selectedMockTest} onBack={onBack} onSave={onSaveMockTest} /> : null;
      default:
        return null;
    }
  };

  const content = renderContent();

  if (content) {
    return (
      <section className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${
        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
      }`}>
        {activeView === "roadmap" ? (
          <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${isDarkMode ? "border-slate-800 bg-slate-950/50" : "border-gray-200 bg-slate-50"}`}>
            <p className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
              {t("workspace.roadmap.title", "Roadmap")}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => onCreateRoadmapPhases?.()}
                title={t("workspace.roadmap.refreshPhasesTooltip")}
                className={`h-8 rounded-full px-3 ${isDarkMode ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700" : "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"} border`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className={`text-xs ml-1 ${fontClass}`}>{t("common.refresh")}</span>
              </Button>
              <div className="inline-flex items-center gap-1 rounded-full border p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={roadmapCanvasView === "view2" ? "default" : "ghost"}
                  onClick={() => setRoadmapCanvasView("view2")}
                  className={`h-8 rounded-full px-3 min-w-[86px] ${roadmapCanvasView === "view2" ? "bg-blue-600 hover:bg-blue-700 text-white" : isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  <Rows3 className="w-4 h-4 mr-1.5" />
                  <span className={fontClass}>{t("workspace.roadmap.canvasView2Title")}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={roadmapCanvasView === "overview" ? "default" : "ghost"}
                  onClick={() => setRoadmapCanvasView("overview")}
                  className={`h-8 rounded-full px-3 min-w-[86px] ${roadmapCanvasView === "overview" ? "bg-blue-600 hover:bg-blue-700 text-white" : isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  <Map className="w-4 h-4 mr-1.5" />
                  <span className={fontClass}>{t("workspace.roadmap.canvasOverviewTitle")}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={roadmapCanvasView === "view1" ? "default" : "ghost"}
                  onClick={() => setRoadmapCanvasView("view1")}
                  className={`h-8 rounded-full px-3 min-w-[86px] ${roadmapCanvasView === "view1" ? "bg-blue-600 hover:bg-blue-700 text-white" : isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  <span className={fontClass}>{t("workspace.roadmap.canvasView1Title")}</span>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        {activeView === "roadmap" ? (
          <RoadmapReviewPanel review={roadmapReview} isDarkMode={isDarkMode} />
        ) : null}
        <DeferredPanel>{content}</DeferredPanel>
      </section>
    );
  }

  return (
    <section className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${
      isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
    }`}>
      <div className={`px-4 py-3 border-b transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
          {t("workspace.chat.title", "Workspace Area")}
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-emerald-950/50" : "bg-emerald-100"}`}>
          <Sparkles className={`w-8 h-8 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
        </div>
        <div>
          <p className={`text-lg font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
            {t("workspace.chat.emptyTitle", "Welcome to your workspace")}
          </p>
          <p className={`text-sm mt-1.5 max-w-md ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            {t("workspace.chat.emptyDesc", "Choose one of the actions below to get started.")}
          </p>
        </div>

        {areAllQuickActionsDisabled && !hasSources && (
          <div className={`flex flex-col items-center gap-3 p-4 rounded-xl border w-full max-w-lg ${isDarkMode ? "bg-amber-950/20 border-amber-900/30" : "bg-amber-50 border-amber-200"}`}>
            <p className={`text-sm text-center ${isDarkMode ? "text-amber-400" : "text-amber-700"} ${fontClass}`}>
              {t("workspace.chat.requireUpload", "Upload materials first to unlock these actions.")}
            </p>
            <Button
              onClick={onUploadClick}
              className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-full px-6 h-9 flex items-center gap-2 transition-all active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span className={fontClass}>{t("workspace.chat.uploadBtn", "Upload documents")}</span>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
          {[
            {
              key: "roadmap",
              icon: Route,
              color: "text-blue-500",
              label: t("workspace.studio.actions.roadmap"),
              description: t("workspace.studio.actions.createRoadmap"),
            },
            {
              key: "quiz",
              icon: BadgeCheck,
              color: "text-emerald-500",
              label: t("workspace.studio.actions.quiz"),
              description: t("workspace.studio.actions.createQuiz"),
            },
            {
              key: "flashcard",
              icon: Layers,
              color: "text-amber-500",
              label: t("workspace.studio.actions.flashcard"),
              description: t("workspace.studio.actions.createFlashcard"),
            },
          ].map((mode) => {
            const isDisabled = mode.key === "roadmap"
              ? isRoadmapQuickActionDisabled
              : getIsActionDisabled(mode.key);

            return (
              <Button
                key={mode.key}
                type="button"
                disabled={isDisabled}
                onClick={() => onChangeView?.(mode.key)}
                className={`rounded-xl p-4 h-auto text-center border transition-all flex flex-col items-center justify-center ${
                  isDisabled
                    ? (isDarkMode ? "opacity-50 cursor-not-allowed bg-slate-800/30 border-slate-800" : "opacity-50 cursor-not-allowed bg-gray-50/50 border-gray-200")
                    : (isDarkMode
                      ? "bg-slate-800/50 border-slate-700 hover:border-slate-600 text-slate-200 hover:bg-slate-800 cursor-pointer"
                      : "bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-800 hover:bg-gray-100 cursor-pointer")
                }`}
                variant="outline"
              >
                <mode.icon className={`w-5 h-5 mb-2 ${isDisabled ? "text-gray-400 dark:text-slate-500" : mode.color}`} />
                <p className={`text-xs font-medium ${isDisabled ? (isDarkMode ? "text-slate-400" : "text-gray-500") : (isDarkMode ? "text-slate-200" : "text-gray-800")} ${fontClass}`}>
                  {mode.label}
                </p>
                <p className={`text-[10px] mt-0.5 whitespace-normal leading-tight ${isDarkMode ? "text-slate-500" : "text-gray-500"} ${fontClass}`}>
                  {mode.description}
                </p>
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ChatPanel;
