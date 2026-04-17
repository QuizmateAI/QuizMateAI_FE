import React from "react";
import { ChevronDown, FileText, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import ListSpinner from "@/Components/ui/ListSpinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/Components/ui/dropdown-menu";
import RoadmapGuideButton from "@/Components/workspace/RoadmapGuideButton";
import { workspaceSurface } from "./workspaceShellTheme";
import SourcesPanel from "./SourcesPanel";
import CreateQuizForm from "./CreateQuizForm";
import WelcomePanel from "./WelcomePanel";

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
  isDarkMode = false,
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
      className={`workspace-surface flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] transition-colors duration-300 ${
        fullBleed ? "" : "p-0"
      } ${
        isDarkMode
          ? "bg-slate-900 border-slate-800"
          : "bg-white border-slate-200"
      }`}
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
  shouldDisableCreateMockTest = false,
  progressTracking = null,
  roadmapHasPhases = false,
  completedQuizCount = 0,
  quizGenerationTaskByQuizId = null,
  quizGenerationProgressByQuizId = null,
  onShareQuiz,
  onShareRoadmap,
  onEditRoadmapConfig,
  onCreateRoadmapPhases,
  onCreateRoadmapPhasesDirect,
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
  const [roadmapCanvasView, setRoadmapCanvasView] = React.useState("overview");
  const [isRoadmapJourCollapsed, setIsRoadmapJourCollapsed] = React.useState(false);
  const [isStageTopSectionCollapsed, setIsStageTopSectionCollapsed] = React.useState(true);
  const [roadmapMeta, setRoadmapMeta] = React.useState(null);
  const previousResolvedViewRef = React.useRef(null);

  const normalizeRoadmapCanvasView = React.useCallback(() => "overview", []);

  React.useEffect(() => {
    if (!workspaceId) {
      setRoadmapCanvasView("overview");
      return;
    }

    const savedView = localStorage.getItem(`workspace_${workspaceId}_roadmap_canvas_view`);
    const normalizedView = normalizeRoadmapCanvasView(savedView);
    setRoadmapCanvasView(normalizedView);
  }, [normalizeRoadmapCanvasView, workspaceId]);

  React.useEffect(() => {
    if (!roadmapCanvasStorageKey || !roadmapCanvasView) return;
    localStorage.setItem(roadmapCanvasStorageKey, roadmapCanvasView);
  }, [roadmapCanvasStorageKey, roadmapCanvasView]);

  React.useEffect(() => {
    const previousResolvedView = previousResolvedViewRef.current;
    const normalizedSelectedPhaseId = Number(selectedRoadmapPhaseId);
    const normalizedSelectedKnowledgeId = Number(selectedRoadmapKnowledgeId);
    const hasRoadmapSelection = (
      Number.isInteger(normalizedSelectedPhaseId) && normalizedSelectedPhaseId > 0
    ) || (
      Number.isInteger(normalizedSelectedKnowledgeId) && normalizedSelectedKnowledgeId > 0
    );

    if (
      resolvedView === "roadmap"
      && previousResolvedView !== "roadmap"
      && hasRoadmapSelection
    ) {
      setRoadmapCanvasView("overview");
    }

    previousResolvedViewRef.current = resolvedView;
  }, [resolvedView, selectedRoadmapKnowledgeId, selectedRoadmapPhaseId]);

  const handleRoadmapCanvasViewChange = React.useCallback((view) => {
    setRoadmapCanvasView(normalizeRoadmapCanvasView(view));
  }, [normalizeRoadmapCanvasView]);

  const handleRoadmapMetaChange = React.useCallback((nextMeta) => {
    if (!nextMeta || typeof nextMeta !== "object") {
      setRoadmapMeta(null);
      return;
    }

    const normalizedMeta = {
      roadmapId: Number(nextMeta?.roadmapId) || null,
      title: String(nextMeta?.title || "").trim(),
      description: String(nextMeta?.description || "").trim(),
      phaseCount: Number(nextMeta?.phaseCount ?? 0) || 0,
      knowledgeCount: Number(nextMeta?.knowledgeCount ?? 0) || 0,
      quizCount: Number(nextMeta?.quizCount ?? 0) || 0,
    };

    const hasVisibleContent = Boolean(
      normalizedMeta.title
      || normalizedMeta.description
      || normalizedMeta.phaseCount
      || normalizedMeta.knowledgeCount
      || normalizedMeta.quizCount,
    );

    setRoadmapMeta(hasVisibleContent ? normalizedMeta : null);
  }, []);

  React.useEffect(() => {
    if (resolvedView !== "roadmap") return;
    onRoadmapCanvasViewChange?.(roadmapCanvasView);
  }, [resolvedView, onRoadmapCanvasViewChange, roadmapCanvasView]);

  const roadmapSelectableMaterials = React.useMemo(
    () => sources.filter((source) => String(source?.status || "").toUpperCase() === "ACTIVE"),
    [sources],
  );
  const roadmapSelectableMaterialIdSet = React.useMemo(
    () => new Set(
      roadmapSelectableMaterials
        .map((source) => Number(source?.id ?? source?.materialId))
        .filter((materialId) => Number.isInteger(materialId) && materialId > 0),
    ),
    [roadmapSelectableMaterials],
  );
  const selectedRoadmapMaterialIds = React.useMemo(
    () => selectedSourceIds
      .map((sourceId) => Number(sourceId))
      .filter((sourceId) => roadmapSelectableMaterialIdSet.has(sourceId)),
    [roadmapSelectableMaterialIdSet, selectedSourceIds],
  );

  const handleToggleRoadmapMaterial = React.useCallback((materialId) => {
    const normalizedMaterialId = Number(materialId);
    if (!Number.isInteger(normalizedMaterialId) || normalizedMaterialId <= 0) return;
    if (!roadmapSelectableMaterialIdSet.has(normalizedMaterialId)) return;
    if (typeof onSelectedSourceIdsChange !== "function") return;

    const isSelected = selectedRoadmapMaterialIds.includes(normalizedMaterialId);
    const nextIds = isSelected
      ? selectedSourceIds.filter((sourceId) => Number(sourceId) !== normalizedMaterialId)
      : [...selectedSourceIds, normalizedMaterialId];
    onSelectedSourceIdsChange(nextIds);
  }, [onSelectedSourceIdsChange, roadmapSelectableMaterialIdSet, selectedRoadmapMaterialIds, selectedSourceIds]);

  const handleToggleAllRoadmapMaterials = React.useCallback((shouldSelectAll) => {
    if (typeof onSelectedSourceIdsChange !== "function") return;

    const selectableMaterialIds = [...roadmapSelectableMaterialIdSet];
    const nonSelectableSelectedIds = selectedSourceIds
      .map((sourceId) => Number(sourceId))
      .filter((sourceId) => Number.isInteger(sourceId) && sourceId > 0 && !roadmapSelectableMaterialIdSet.has(sourceId));

    const nextIds = shouldSelectAll
      ? [...new Set([...nonSelectableSelectedIds, ...selectableMaterialIds])]
      : nonSelectableSelectedIds;
    onSelectedSourceIdsChange(nextIds);
  }, [onSelectedSourceIdsChange, roadmapSelectableMaterialIdSet, selectedSourceIds]);

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
            progressTracking={progressTracking}
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
            onCanvasViewChange={handleRoadmapCanvasViewChange}
            selectedPhaseId={selectedRoadmapPhaseId}
            selectedKnowledgeId={selectedRoadmapKnowledgeId}
            progressTracking={progressTracking}
            onShareRoadmap={onShareRoadmap}
            onShareQuiz={onShareQuiz}
            onEditRoadmapConfig={onEditRoadmapConfig}
            onCreateRoadmapPhases={onCreateRoadmapPhases}
            onEmptyStateAction={() => onCreateRoadmapPhasesDirect?.(selectedRoadmapMaterialIds)}
            isSubmittingRoadmapPhaseGeneration={isSubmittingRoadmapPhaseGeneration}
            roadmapConfigSummary={roadmapConfigSummary}
            emptyStateMaterials={roadmapSelectableMaterials}
            selectedEmptyStateMaterialIds={selectedRoadmapMaterialIds}
            onToggleEmptyStateMaterial={handleToggleRoadmapMaterial}
            onToggleAllEmptyStateMaterials={handleToggleAllRoadmapMaterials}
            activeSourceCount={activeSourceCount}
            disableCreate={shouldDisableRoadmap && !roadmapHasPhases}
            onStageTopSectionCollapsedChange={setIsStageTopSectionCollapsed}
            onRoadmapMetaChange={handleRoadmapMetaChange}
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
            disableCreate={shouldDisableCreateMockTest}
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
        return shouldDisableCreateMockTest ? (
          <LazyMockTestListView
            isDarkMode={isDarkMode}
            onCreateMockTest={() => onChangeView?.("createMockTest")}
            onNavigateHome={onNavigateHome}
            onViewMockTest={onViewMockTest}
            contextType="WORKSPACE"
            contextId={workspaceId}
            disableCreate={shouldDisableCreateMockTest}
          />
        ) : (
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
            hideEditButton
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
        return <WelcomePanel isDarkMode={isDarkMode} fontClass={fontClass} />;
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
  const shouldHideRoadmapJour = roadmapCanvasView === "overview"
    || !roadmapHasPhases
    || (roadmapCanvasView === "view2" && !isStageTopSectionCollapsed)
    || (roadmapCanvasView === "view2" && Number(selectedRoadmapKnowledgeId) > 0);

  if (resolvedView === "roadmap") {
    const hasRoadmapSummary = Boolean(
      roadmapMeta?.title
      || roadmapMeta?.description
      || roadmapMeta?.phaseCount
      || roadmapMeta?.knowledgeCount
      || roadmapMeta?.quizCount,
    );
    const roadmapHeading = roadmapMeta?.title || t("workspace.roadmap.title", "Roadmap");

    return (
      <section
        className={workspaceSurface(
          `flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] transition-colors duration-300 ${
            isDarkMode
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-200"
          }`
        )}
        style={{ contentVisibility: "auto" }}
      >
        <div className={`px-6 pb-5 pt-6 border-b flex flex-wrap items-center justify-between gap-3 transition-colors duration-200 ${isDarkMode ? "border-slate-700/80" : "border-slate-200"}`}>
          <div className="min-w-0 flex-1">
            <h2 className={`truncate text-2xl font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"} ${fontClass}`}>
              {roadmapHeading}
            </h2>
            {hasRoadmapSummary ? (
              <div className="mt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`group mt-1 h-11 w-fit max-w-[260px] justify-start rounded-full border px-3 py-2 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        isDarkMode
                          ? "border-sky-500/30 bg-sky-500/10 text-slate-100 hover:border-sky-400/50 hover:bg-sky-500/14"
                          : "border-sky-200 bg-sky-50 text-slate-900 hover:border-sky-300 hover:bg-sky-100/80"
                      } ${fontClass}`}
                    >
                      <span
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          isDarkMode
                            ? "bg-sky-500/18 text-sky-200"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-5">
                          {t("workspace.roadmap.summaryDropdown", "Nội dung roadmap")}
                        </span>
                      </span>
                      <ChevronDown className={`ml-1 h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180 ${isDarkMode ? "text-sky-200" : "text-sky-700"}`} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={10}
                    className={`w-[min(460px,calc(100vw-3rem))] rounded-2xl border p-0 shadow-xl ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
                  >
                    <div className="space-y-4 p-4">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
                          {t("workspace.roadmap.summaryDropdown", "Nội dung roadmap")}
                        </p>
                        <h3 className={`mt-1 text-base font-semibold leading-6 ${isDarkMode ? "text-slate-100" : "text-slate-900"} ${fontClass}`}>
                          {roadmapHeading}
                        </h3>
                      </div>

                      {(roadmapMeta?.phaseCount || roadmapMeta?.knowledgeCount || roadmapMeta?.quizCount) ? (
                        <div className="flex flex-wrap gap-2">
                          {roadmapMeta?.phaseCount ? (
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                              {roadmapMeta.phaseCount} {t("workspace.roadmap.canvas.phases", "phases")}
                            </span>
                          ) : null}
                          {roadmapMeta?.knowledgeCount ? (
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                              {roadmapMeta.knowledgeCount} {t("workspace.roadmap.canvas.knowledges", "knowledges")}
                            </span>
                          ) : null}
                          {roadmapMeta?.quizCount ? (
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                              {roadmapMeta.quizCount} {t("workspace.roadmap.canvas.quizzes", "quizzes")}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      <p className={`text-sm leading-7 whitespace-pre-wrap ${isDarkMode ? "text-slate-300" : "text-slate-700"} ${fontClass}`}>
                        {roadmapMeta?.description || t("workspace.roadmap.summaryFallback", "Roadmap này chưa có phần mô tả tổng hợp.")}
                      </p>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {/* <Button
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
            </Button> */}

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

            <RoadmapGuideButton
              isDarkMode={isDarkMode}
              autoOpen={resolvedView === "roadmap"}
              variant="workspace"
              className={isDarkMode
                ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 flex gap-3 p-3">
          <div
            className={`min-h-0 min-w-0 flex-1 transition-all duration-500 ease-out ${roadmapCanvasView === "overview"
              ? "rounded-none border-0 bg-transparent overflow-visible"
              : "rounded-[24px] overflow-hidden border border-slate-200 dark:border-slate-800"
              }`}
          >
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
    <PanelShell
      fullBleed={isFullBleed}
      frameless={isFrameless}
      isDarkMode={isDarkMode}
    >
      {renderContent()}
    </PanelShell>
  );
}

export default ChatPanel;
