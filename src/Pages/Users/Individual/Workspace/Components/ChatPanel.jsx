import React from "react";
import { useTranslation } from "react-i18next";
import ListSpinner from "@/Components/ui/ListSpinner";
import { workspaceSurface } from "./workspaceShellTheme";
import SourcesPanel from "./SourcesPanel";
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
  onGenerateRoadmapPhases,
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
            selectedPhaseId={selectedRoadmapPhaseId}
            selectedKnowledgeId={selectedRoadmapKnowledgeId}
            progressTracking={progressTracking}
            onShareRoadmap={onShareRoadmap}
            onShareQuiz={onShareQuiz}
            onEditRoadmapConfig={onEditRoadmapConfig}
            onGenerateRoadmapPhases={onGenerateRoadmapPhases}
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

  return (
    <PanelShell fullBleed={isFullBleed} frameless={isFrameless}>
      {renderContent()}
    </PanelShell>
  );
}

export default ChatPanel;
