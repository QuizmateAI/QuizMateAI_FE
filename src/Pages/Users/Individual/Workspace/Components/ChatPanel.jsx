import React from "react";
import { Eye, Map, Pencil, Rows3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import ListSpinner from "@/Components/ui/ListSpinner";
import { workspaceSurface } from "./workspaceShellTheme";
import SourcesPanel from "./SourcesPanel";
import CreateQuizForm from "./CreateQuizForm";

const LazyCreateFlashcardForm = React.lazy(() => import("./CreateFlashcardForm"));
const LazyRoadmapCanvasView = React.lazy(() => import("./RoadmapCanvasView"));
const LazyRoadmapJourPanel = React.lazy(() => import("./RoadmapJourPanel"));
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

function PanelShell({
  fullBleed = false,
  frameless = false,
  children,
}) {
  if (frameless) {
    return (
      <section
        className="flex h-full min-h-0 flex-col"
        style={{ contentVisibility: "auto" }}
      >
        <DeferredPanel>{children}</DeferredPanel>
      </section>
    );
  }

  return (
    <section
      className={workspaceSurface(
        `flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] transition-colors duration-300 ${
          fullBleed ? "" : "p-0"
        }`,
      )}
      style={{ contentVisibility: "auto" }}
    >
      <DeferredPanel>{children}</DeferredPanel>
    </section>
  );
}

function ChatPanel({
  isDarkMode = false,
  sources = [],
  accessHistory = [],
  activeView = "sources",
  onUploadClick,
  onChangeView,
  onCreateQuiz,
  onCreateFlashcard,
  onCreateRoadmap,
  onCreateMockTest,
  onCreatePostLearning,
  onNavigateHome,
  onBack,
  workspaceId = null,
  workspaceTitle = "",
  workspacePurpose = "",
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
  onAddSource,
  onRemoveSource,
  onRemoveMultiple,
  onShareSource,
  onSourceUpdated,
  selectedSourceIds = [],
  onSelectedSourceIdsChange,
  selectedRoadmapPhaseId = null,
  selectedRoadmapKnowledgeId = null,
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
  shouldDisableCreateQuiz = false,
  shouldDisableCreateFlashcard = false,
  progressTracking = null,
  roadmapHasPhases = false,
  completedQuizCount = 0,
  quizGenerationTaskByQuizId = null,
  quizGenerationProgressByQuizId = null,
  onShareQuiz,
  onShareRoadmap,
  onEditRoadmapConfig,
  onCreateRoadmapPhases,
  isSubmittingRoadmapPhaseGeneration = false,
  roadmapConfigSummary = null,
  activeSourceCount = 0,
  planEntitlements = null,
  onToggleMaterialSelection,
  onRoadmapCanvasViewChange,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const resolvedView = activeView || "sources";
  const roadmapCanvasStorageKey = workspaceId ? `workspace_${workspaceId}_roadmap_canvas_view` : null;
  const [roadmapCanvasView, setRoadmapCanvasView] = React.useState("view2");
  const [isRoadmapJourCollapsed, setIsRoadmapJourCollapsed] = React.useState(false);

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

  React.useEffect(() => {
    if (resolvedView !== "roadmap") return;
    onRoadmapCanvasViewChange?.(roadmapCanvasView);
  }, [resolvedView, onRoadmapCanvasViewChange, roadmapCanvasView]);

  const renderContent = () => {
    switch (resolvedView) {
      case "sources":
        return (
          <SourcesPanel
            isDarkMode={isDarkMode}
            sources={sources}
            onAddSource={onAddSource || onUploadClick}
            onRemoveSource={onRemoveSource}
            onRemoveMultiple={onRemoveMultiple}
            onShareSource={onShareSource}
            onSourceUpdated={onSourceUpdated}
            selectedIds={selectedSourceIds}
            onSelectionChange={onSelectedSourceIdsChange}
          />
        );
      case "roadmap":
        return (
          <LazyRoadmapCanvasView
            isDarkMode={isDarkMode}
            workspaceId={workspaceId}
            onCreateRoadmap={onCreateRoadmap}
            onRoadmapPhaseFocus={onRoadmapPhaseFocus}
            onCreatePhaseKnowledge={onCreatePhaseKnowledge}
            onCreateKnowledgeQuizForKnowledge={onCreateKnowledgeQuizForKnowledge}
            onCreatePhasePreLearning={onCreatePhasePreLearning}
            isStudyNewRoadmap={isStudyNewRoadmap}
            adaptationMode={adaptationMode}
            onViewQuiz={onViewQuiz}
            onEditQuiz={onEditQuiz}
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
            forcedCanvasView={roadmapCanvasView}
            onCanvasViewChange={setRoadmapCanvasView}
            selectedPhaseId={selectedRoadmapPhaseId}
            selectedKnowledgeId={selectedRoadmapKnowledgeId}
            progressTracking={progressTracking}
            onShareRoadmap={onShareRoadmap}
            onShareQuiz={onShareQuiz}
            onEditRoadmapConfig={onEditRoadmapConfig}
            onCreateRoadmapPhases={onCreateRoadmapPhases}
            isSubmittingRoadmapPhaseGeneration={isSubmittingRoadmapPhaseGeneration}
            roadmapConfigSummary={roadmapConfigSummary}
            sources={sources}
            selectedSourceIds={selectedSourceIds}
            onSelectedSourceIdsChange={onSelectedSourceIdsChange}
            activeSourceCount={activeSourceCount}
            disableCreate={shouldDisableRoadmap && !roadmapHasPhases}
          />
        );
      case "quiz":
        return (
          <LazyQuizListView
            isDarkMode={isDarkMode}
            onCreateQuiz={() => onChangeView?.("createQuiz")}
            onNavigateHome={onNavigateHome}
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
            onNavigateHome={onNavigateHome}
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
            onNavigateHome={onNavigateHome}
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
            onToggleMaterialSelection={onToggleMaterialSelection}
          />
        );
      case "flashcardDetail":
        return selectedFlashcard ? (
          <LazyFlashcardDetailView
            isDarkMode={isDarkMode}
            flashcard={selectedFlashcard}
            onBack={onBack}
          />
        ) : null;
      case "quizDetail":
        return selectedQuiz ? (
          <LazyQuizDetailView
            isDarkMode={isDarkMode}
            quiz={selectedQuiz}
            onBack={onBack}
            onEdit={onEditQuiz}
            contextType="WORKSPACE"
            contextId={workspaceId}
          />
        ) : null;
      case "editQuiz":
        return selectedQuiz ? (
          <LazyEditQuizForm
            isDarkMode={isDarkMode}
            quiz={selectedQuiz}
            onBack={onBack}
            onSave={onSaveQuiz}
            contextType="WORKSPACE"
            contextId={workspaceId}
          />
        ) : null;
      case "createMockTest":
        return (
          <LazyCreateMockTestForm
            isDarkMode={isDarkMode}
            onCreateMockTest={onCreateMockTest}
            onBack={onBack}
            contextType="WORKSPACE"
            contextId={workspaceId}
            selectedSourceIds={selectedSourceIds}
            sources={sources}
            onToggleMaterialSelection={onToggleMaterialSelection}
          />
        );
      case "createPostLearning":
        return (
          <LazyCreatePostLearningForm
            isDarkMode={isDarkMode}
            onCreatePostLearning={onCreatePostLearning}
            onBack={onBack}
            contextType="WORKSPACE"
            contextId={workspaceId}
            selectedSourceIds={selectedSourceIds}
            sources={sources}
            onToggleMaterialSelection={onToggleMaterialSelection}
          />
        );
      case "mockTestDetail":
        return selectedMockTest ? (
          <LazyMockTestDetailView
            isDarkMode={isDarkMode}
            quiz={selectedMockTest}
            onBack={onBack}
            onEdit={onEditMockTest}
          />
        ) : null;
      case "editMockTest":
        return selectedMockTest ? (
          <LazyEditMockTestForm
            isDarkMode={isDarkMode}
            quiz={selectedMockTest}
            onBack={onBack}
            onSave={onSaveMockTest}
          />
        ) : null;
      default:
        return (
          <div className="flex h-full items-center justify-center px-6">
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
              {t("workspace.shell.unknownView", "This section is not available.")}
            </p>
          </div>
        );
    }
  };

  const isFullBleed = resolvedView === "roadmap" || resolvedView === "sources";
  const isFrameless = [
    "roadmap",
    "quiz",
    "communityQuiz",
    "createQuiz",
    "editQuiz",
    "flashcard",
    "mockTest",
    "postLearning",
    "questionStats",
  ].includes(resolvedView);
  const shouldHideRoadmapJour = roadmapCanvasView === "overview";

  if (resolvedView === "roadmap") {
    return (
      <section
        className={workspaceSurface(
          "flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] transition-colors duration-300",
        )}
        style={{ contentVisibility: "auto" }}
      >
        <div className={`px-6 pb-5 pt-6 border-b flex flex-wrap items-center justify-between gap-3 transition-colors duration-200 ${isDarkMode ? "border-slate-700/80" : "border-slate-200"}`}>
          <div className="min-w-0 flex-1">
            <h2 className={`truncate text-2xl font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"} ${fontClass}`}>
              {t("workspace.roadmap.title", "Roadmap")}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onCreateRoadmapPhases?.()}
              title={t("workspace.roadmap.refreshPhasesTooltip", "Làm mới phase roadmap")}
              className={`h-8 rounded-full px-3 min-w-[110px] ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className={`text-xs ml-1 ${fontClass}`}>{t("common.refresh", "Làm mới")}</span>
            </Button>

            {typeof onEditRoadmapConfig === "function" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onEditRoadmapConfig}
                className={`h-8 rounded-full px-3 min-w-[110px] ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}
              >
                <Pencil className="w-4 h-4 mr-1.5" />
                <span className={fontClass}>{t("workspace.roadmap.editConfigAction", "Edit")}</span>
              </Button>
            ) : null}

            <div className={`inline-flex items-center gap-1 rounded-full border p-1 ${isDarkMode ? "border-slate-700 bg-slate-900/70" : "border-gray-200 bg-white"}`}>
              <Button
                type="button"
                size="sm"
                variant={roadmapCanvasView === "view2" ? "default" : "ghost"}
                onClick={() => setRoadmapCanvasView("view2")}
                className={`h-8 rounded-full px-3 min-w-[86px] ${roadmapCanvasView === "view2" ? "bg-blue-600 hover:bg-blue-700 text-white" : isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Rows3 className="w-4 h-4 mr-1.5" />
                <span className={fontClass}>{t("workspace.roadmap.canvasView2Title", "Chi tiết")}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={roadmapCanvasView === "overview" ? "default" : "ghost"}
                onClick={() => setRoadmapCanvasView("overview")}
                className={`h-8 rounded-full px-3 min-w-[86px] ${roadmapCanvasView === "overview" ? "bg-blue-600 hover:bg-blue-700 text-white" : isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Map className="w-4 h-4 mr-1.5" />
                <span className={fontClass}>{t("workspace.roadmap.canvasOverviewTitle", "Tổng quan")}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={roadmapCanvasView === "view1" ? "default" : "ghost"}
                onClick={() => setRoadmapCanvasView("view1")}
                className={`h-8 rounded-full px-3 min-w-[86px] ${roadmapCanvasView === "view1" ? "bg-blue-600 hover:bg-blue-700 text-white" : isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Eye className="w-4 h-4 mr-1.5" />
                <span className={fontClass}>{t("workspace.roadmap.canvasView1Title", "Kiểm thử")}</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 flex gap-3 p-3">
          <div className="min-h-0 min-w-0 flex-1 rounded-[24px] overflow-hidden border border-slate-200 dark:border-slate-800 transition-all duration-500 ease-out">
            <DeferredPanel>{renderContent()}</DeferredPanel>
          </div>

          <div
            className={`hidden xl:flex min-h-0 overflow-hidden transition-all duration-500 ease-out ${shouldHideRoadmapJour ? "w-0 opacity-0 translate-x-3 pointer-events-none" : `${isRoadmapJourCollapsed ? "w-[92px]" : "w-[clamp(280px,22vw,360px)]"} opacity-100 translate-x-0`}`}
            aria-hidden={shouldHideRoadmapJour}
          >
            <DeferredPanel>
              <LazyRoadmapJourPanel
                isDarkMode={isDarkMode}
                workspaceId={workspaceId}
                isStudyNewRoadmap={isStudyNewRoadmap}
                isCollapsed={isRoadmapJourCollapsed}
                onToggleCollapse={() => setIsRoadmapJourCollapsed((prev) => !prev)}
                selectedPhaseId={selectedRoadmapPhaseId}
                selectedKnowledgeId={selectedRoadmapKnowledgeId}
                onSelectPhase={onRoadmapPhaseFocus}
                reloadToken={roadmapReloadToken}
                isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
                roadmapPhaseGenerationProgress={roadmapPhaseGenerationProgress}
                progressTracking={progressTracking}
                generatingKnowledgePhaseIds={generatingKnowledgePhaseIds}
                generatingKnowledgeQuizPhaseIds={generatingKnowledgeQuizPhaseIds}
                generatingKnowledgeQuizKnowledgeKeys={generatingKnowledgeQuizKnowledgeKeys}
                generatingPreLearningPhaseIds={generatingPreLearningPhaseIds}
              />
            </DeferredPanel>
          </div>
        </div>
      </section>
    );
  }

  return (
    <PanelShell fullBleed={isFullBleed} frameless={isFrameless}>
      {renderContent()}
    </PanelShell>
  );
}

export default ChatPanel;
