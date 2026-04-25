import React from "react";
import { UploadCloud, BookOpen, Sparkles, Mic, Play, PenLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import ListSpinner from "@/Components/ui/ListSpinner";
import { getRoadmapReview } from "@/api/RoadmapAPI";
import RoadmapReviewPanel from "@/Components/features/Workspace/RoadmapReviewPanel";
import RoadmapGuideButton from "@/Components/features/Workspace/RoadmapGuideButton";
import RoadmapJourPanel from "./RoadmapJourPanel";
import CreateQuizForm from "./CreateQuizForm";

const LazyCreateFlashcardForm = React.lazy(() => import("./CreateFlashcardForm"));
const LazyRoadmapCanvasView = React.lazy(() => import("./RoadmapCanvasView"));
const LazyQuizListView = React.lazy(() => import("./QuizListView"));
const LazyQuizDetailView = React.lazy(() => import("@/Pages/Users/Group/Components/QuizDetailView"));
const LazyEditQuizForm = React.lazy(() => import("./EditQuizForm"));
const LazyFlashcardListView = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/FlashcardListView"));
const LazyFlashcardDetailView = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/FlashcardDetailView"));
const LazyManualFlashcardEditor = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/ManualFlashcardEditor"));
const LazyMockTestListView = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/MockTestListView"));
const LazyCreateGroupMockTestForm = React.lazy(() => import("./CreateGroupMockTestForm"));
const LazyGroupRankingTab = React.lazy(() => import("./GroupRankingTab"));
const LazyMockTestDetailView = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/MockTestDetailView"));
const LazyEditMockTestForm = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/EditMockTestForm"));
const LazyPostLearningListView = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/PostLearningListView"));
const LazyCreatePostLearningForm = React.lazy(() => import("@/Pages/Users/Individual/Workspace/Components/CreatePostLearningForm"));

function DeferredPanel({ children }) {
  return (
    <React.Suspense fallback={<ListSpinner variant="section" className="flex-1" />}>
      {children}
    </React.Suspense>
  );
}

// Panel chính hiển thị nội dung workspace: list views, create forms, trạng thái trống...
function ChatPanel({ isDarkMode = false, sources = [], selectedSourceIds = [], onToggleMaterialSelection, activeView = null, createdItems = [], onUploadClick, onChangeView, onCreateQuiz, onCreateFlashcard, onCreateRoadmap, onCreateRoadmapPhases, onRefreshRoadmapPhases, onCreateRoadmapPreLearning, onCreateMockTest, onCreatePostLearning, onBack, workspaceId = null, selectedQuiz = null, onViewQuiz, onEditQuiz, onSaveQuiz, selectedFlashcard = null, onViewFlashcard, onDeleteFlashcard, selectedMockTest = null, onViewMockTest, onEditMockTest, onSaveMockTest, selectedPostLearning = null, onViewPostLearning, readOnly = false, canCreateQuiz = true, canCreateFlashcard = true, canCreateMockTest = true, canCreateRoadmap = true, canPublishQuiz = true, canAssignQuizAudience = true, role = "MEMBER", planEntitlements = null, quizTitleMaxLength = null, currentPlanSummaryOverride = null, onViewRoadmapConfig, onEditRoadmapConfig, roadmapEmptyStateTitle = "", roadmapEmptyStateDescription = "", roadmapEmptyStateActionLabel = "", roadmapReloadToken = 0, quizListRefreshToken = 0, quizGenerationTaskByQuizId = null, quizGenerationProgressByQuizId = null, isGeneratingRoadmapPhases = false, isGeneratingRoadmapPreLearning = false, roadmapPhaseGenerationProgress = 0, selectedRoadmapPhaseId = null, selectedRoadmapKnowledgeId = null, roadmapCenterFocusToken = 0, roadmapSelectableMaterials = [], selectedRoadmapMaterialIds = [], onToggleRoadmapMaterial, onToggleAllRoadmapMaterials, onRoadmapPhaseFocus, isGroupLeader = false, groupWorkspaceCurrentUserId = null, onGroupQuizUpdated, challengeDraftQuizEditor = false, challengeDraftTargetQuizId = null, challengeSnapshotReviewMode = false, onRoadmapLoad, hasRoadmap = false }) {
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
  const documentsHubLabel = t("groupWorkspace.chatPanel.openDocumentsHub", "Open documents hub");
  const roadmapCanvasStorageKey = workspaceId ? `workspace_${workspaceId}_roadmap_canvas_view` : null;
  const [roadmapCanvasView, setRoadmapCanvasView] = React.useState(() => {
    if (!workspaceId) return "view2";
    const saved = localStorage.getItem(`workspace_${workspaceId}_roadmap_canvas_view`);
    return saved === "view1" || saved === "view2" || saved === "overview" ? saved : "view2";
  });
  const [isRoadmapJourCollapsed, setIsRoadmapJourCollapsed] = React.useState(false);
  const [isStageTopSectionCollapsed, setIsStageTopSectionCollapsed] = React.useState(true);

  React.useEffect(() => {
    if (!workspaceId) {
      setRoadmapCanvasView("view2");
      return;
    }

    const saved = localStorage.getItem(`workspace_${workspaceId}_roadmap_canvas_view`);
    setRoadmapCanvasView(saved === "view1" || saved === "view2" || saved === "overview" ? saved : "view2");
  }, [workspaceId]);

  const handleSwitchRoadmapView = React.useCallback((canvasView) => {
    if (canvasView !== "view1" && canvasView !== "view2" && canvasView !== "overview") return;
    setRoadmapCanvasView(canvasView);
    if (roadmapCanvasStorageKey) {
      localStorage.setItem(roadmapCanvasStorageKey, canvasView);
    }
  }, [roadmapCanvasStorageKey]);

  // Khi chưa có nguồn tài liệu — hiển thị lời chào và nút upload
  if (!hasSources && !activeView) {
    return (
      <section className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${
        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
      }`}>
        <div className={`px-4 py-3 border-b transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>{t("workspace.chat.title")}</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-blue-950/50" : "bg-blue-100"}`}>
            <BookOpen className={`w-8 h-8 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
          </div>
          <div>
            <p className={`text-lg font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
              {t("workspace.chat.emptyTitle")}
            </p>
            <p className={`text-sm mt-1.5 max-w-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
              {t("workspace.chat.emptyDesc")}
            </p>
          </div>
          {!readOnly && (
            <Button
              onClick={onUploadClick}
              className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-full px-6 h-10 flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span className={fontClass}>{documentsHubLabel}</span>
            </Button>
          )}
        </div>
      </section>
    );
  }

  // Khi đã có nguồn nhưng chưa chọn hoạt động — hiển thị gợi ý chọn từ Studio
  if (hasSources && !activeView) {
    return (
      <section className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${
        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
      }`}>
        <div className={`px-4 py-3 border-b transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>{t("workspace.chat.title")}</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-emerald-950/50" : "bg-emerald-100"}`}>
            <Sparkles className={`w-8 h-8 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
          </div>
          <div>
            <p className={`text-lg font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
              {t("workspace.chat.emptyTitle")}
            </p>
            <p className={`text-sm mt-1.5 max-w-md ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
              {t("workspace.chat.emptyDesc")}
            </p>
          </div>

          {/* Gợi ý nhanh 3 chế độ quiz */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
            {[
              { key: "manual", icon: PenLine, color: "text-blue-500" },
              { key: "companion", icon: Mic, color: "text-purple-500" },
              { key: "practice", icon: Play, color: "text-emerald-500" },
            ].map((mode) => (
                <div
                  key={mode.key}
                  className={`rounded-xl p-4 text-center border cursor-pointer transition-all ${
                    isDarkMode
                      ? "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                      : "bg-gray-50 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <mode.icon className={`w-5 h-5 mx-auto mb-2 ${mode.color}`} />
                  <p className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-gray-700"} ${fontClass}`}>
                    {t(`workspace.chat.quizMode.${mode.key}`)}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
                    {t(`workspace.chat.quizMode.${mode.key}Desc`)}
                  </p>
                </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Khi đang hiển thị list view — render danh sách tương ứng
  const renderListView = () => {
    // Lọc createdItems theo loại tương ứng
    const createdRoadmaps = createdItems.filter(i => i.type === "Roadmap");
    const createdQuizzes = createdItems.filter(i => i.type === "Quiz");
    const createdFlashcards = createdItems.filter(i => i.type === "Flashcard");

    switch (activeView) {
      case "roadmap":
        return <LazyRoadmapCanvasView isDarkMode={isDarkMode} onCreateRoadmap={onCreateRoadmap} onCreateRoadmapPhases={onCreateRoadmapPhases} onCreateRoadmapPreLearning={onCreateRoadmapPreLearning} onViewQuiz={onViewQuiz} createdItems={createdRoadmaps} workspaceId={workspaceId} disableCreate={!canCreateRoadmap} hideCreateButton={!canCreateRoadmap} onViewRoadmapConfig={onViewRoadmapConfig} onEditRoadmapConfig={canCreateRoadmap ? onEditRoadmapConfig : undefined} emptyStateTitle={roadmapEmptyStateTitle} emptyStateDescription={roadmapEmptyStateDescription} emptyStateActionLabel={roadmapEmptyStateActionLabel} reloadToken={roadmapReloadToken} isGeneratingRoadmapPhases={isGeneratingRoadmapPhases} isGeneratingRoadmapPreLearning={isGeneratingRoadmapPreLearning} roadmapPhaseGenerationProgress={roadmapPhaseGenerationProgress} selectedPhaseId={selectedRoadmapPhaseId} selectedKnowledgeId={selectedRoadmapKnowledgeId} roadmapCenterFocusToken={roadmapCenterFocusToken} forcedCanvasView={roadmapCanvasView} onCanvasViewChange={setRoadmapCanvasView} onRoadmapPhaseFocus={onRoadmapPhaseFocus} emptyStateMaterials={roadmapSelectableMaterials} selectedEmptyStateMaterialIds={selectedRoadmapMaterialIds} onToggleEmptyStateMaterial={onToggleRoadmapMaterial} onToggleAllEmptyStateMaterials={onToggleAllRoadmapMaterials} onRoadmapLoad={(roadmapId) => { setActiveRoadmapId(roadmapId); if (typeof onRoadmapLoad === "function") onRoadmapLoad(roadmapId); }} onStageTopSectionCollapsedChange={setIsStageTopSectionCollapsed} />;
      case "quiz":
        return (
          <LazyQuizListView
            isDarkMode={isDarkMode}
            onCreateQuiz={() => onChangeView?.("createQuiz")}
            onViewQuiz={onViewQuiz}
            contextType="GROUP"
            contextId={workspaceId}
            hideCreateButton={!canCreateQuiz}
            disableCreate={!canCreateQuiz}
            refreshToken={quizListRefreshToken}
            groupRole={role}
            groupCurrentUserId={groupWorkspaceCurrentUserId}
            quizGenerationTaskByQuizId={quizGenerationTaskByQuizId}
            quizGenerationProgressByQuizId={quizGenerationProgressByQuizId}
          />
        );
      case "flashcard":
        return <LazyFlashcardListView isDarkMode={isDarkMode} onCreateFlashcard={() => onChangeView?.("createFlashcard")} onCreateManualFlashcard={canCreateFlashcard ? () => onChangeView?.("createManualFlashcard") : undefined} onViewFlashcard={onViewFlashcard} onDeleteFlashcard={onDeleteFlashcard} contextType="GROUP" contextId={workspaceId} hideCreateButton={!canCreateFlashcard} disableCreate={!canCreateFlashcard} />;
      case "mockTest":
        return <LazyMockTestListView isDarkMode={isDarkMode} onCreateMockTest={() => onChangeView?.("createMockTest")} onViewMockTest={onViewMockTest} contextType="GROUP" contextId={workspaceId} hideCreateButton={!canCreateMockTest} disableCreate={!canCreateMockTest || !planEntitlements?.hasAdvanceQuizConfig} />;
      case "ranking":
        return <LazyGroupRankingTab workspaceId={workspaceId} isDarkMode={isDarkMode} />;
      case "postLearning":
        return <LazyPostLearningListView isDarkMode={isDarkMode} onCreatePostLearning={() => onChangeView?.("createPostLearning")} onViewPostLearning={onViewPostLearning} contextType="GROUP" contextId={workspaceId} hideCreateButton={readOnly} disableCreate={readOnly} />;
      default:
        return null;
    }
  };

  const listContent = renderListView();
  const shouldHideRoadmapJour = roadmapCanvasView === "overview"
    || (roadmapCanvasView === "view2" && !isStageTopSectionCollapsed);
  const shouldRenderRoadmapJour = !shouldHideRoadmapJour && (Boolean(hasRoadmap) || Boolean(isGeneratingRoadmapPhases));

  if (activeView === "roadmap" && listContent) {
    return (
      <section className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border transition-colors duration-300 ${
        isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
      }`}>
        <div className={`px-6 pb-5 pt-6 border-b flex flex-wrap items-center justify-between gap-3 ${isDarkMode ? "border-slate-700/80" : "border-slate-200"}`}>
          <p className={`text-2xl font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"} ${fontClass}`}>
            {t("workspace.roadmap.title", "Roadmap")}
          </p>
          <div className="flex items-center gap-2">
            {/* <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onRefreshRoadmapPhases?.()}
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
                <PenLine className="w-4 h-4 mr-1.5" />
                <span className={fontClass}>{t("workspace.roadmap.editConfigAction", "Edit")}</span>
              </Button>
            ) : null}

            <RoadmapGuideButton
              isDarkMode={isDarkMode}
              autoOpen={activeView === "roadmap"}
              variant="group"
              className={isDarkMode
                ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}
            />

            {/* <div className={`inline-flex items-center gap-1 rounded-full border p-1 ${isDarkMode ? "border-slate-700 bg-slate-900/70" : "border-gray-200 bg-white"}`}> */}
              {/* <Button
                type="button"
                size="sm"
                variant={roadmapCanvasView === "view2" ? "default" : "ghost"}
                onClick={() => handleSwitchRoadmapView("view2")}
                className={`h-8 rounded-full px-3 min-w-[86px] ${roadmapCanvasView === "view2" ? "bg-blue-600 hover:bg-blue-700 text-white" : isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Rows3 className="w-4 h-4 mr-1.5" />
                <span className={fontClass}>{t("workspace.roadmap.canvasView2Title")}</span>
              </Button> */}
              {/* <Button
                type="button"
                size="sm"
                variant={roadmapCanvasView === "overview" ? "default" : "ghost"}
                onClick={() => handleSwitchRoadmapView("overview")}
                className={`h-8 rounded-full px-3 min-w-[86px] ${roadmapCanvasView === "overview" ? "bg-blue-600 hover:bg-blue-700 text-white" : isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Map className="w-4 h-4 mr-1.5" />
                <span className={fontClass}>{t("workspace.roadmap.canvasOverviewTitle")}</span>
              </Button> */}
              {/* <Button
                type="button"
                size="sm"
                variant={roadmapCanvasView === "view1" ? "default" : "ghost"}
                onClick={() => handleSwitchRoadmapView("view1")}
                className={`h-8 rounded-full px-3 min-w-[86px] ${roadmapCanvasView === "view1" ? "bg-blue-600 hover:bg-blue-700 text-white" : isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Eye className="w-4 h-4 mr-1.5" />
                <span className={fontClass}>{t("workspace.roadmap.canvasView1Title")}</span>
              </Button> */}
            {/* </div> */}
          </div>
        </div>

        <RoadmapReviewPanel review={roadmapReview} isDarkMode={isDarkMode} />

        <div className="min-h-0 flex-1 flex gap-3 p-3 overflow-hidden">
          <div
            className={`min-h-0 min-w-0 flex-1 transition-all duration-500 ease-out ${roadmapCanvasView === "overview"
              ? "rounded-none border-0 bg-transparent overflow-visible"
              : "rounded-[24px] overflow-y-auto overflow-x-hidden border border-slate-200 dark:border-slate-800"
              }`}
          >
            <DeferredPanel>{listContent}</DeferredPanel>
          </div>

          {shouldRenderRoadmapJour ? (
            <div
              className={`hidden xl:flex min-h-0 overflow-hidden transition-all duration-500 ease-out ${isRoadmapJourCollapsed ? "w-[92px]" : "w-[clamp(280px,22vw,360px)]"} opacity-100 translate-x-0`}
              aria-hidden={false}
            >
              <RoadmapJourPanel
                isDarkMode={isDarkMode}
                workspaceId={workspaceId}
                isCollapsed={isRoadmapJourCollapsed}
                onToggleCollapse={() => setIsRoadmapJourCollapsed((prev) => !prev)}
                selectedPhaseId={selectedRoadmapPhaseId}
                selectedKnowledgeId={selectedRoadmapKnowledgeId}
                onSelectPhase={(phaseId, options) => {
                  if (roadmapCanvasView === "overview") {
                    handleSwitchRoadmapView("view2");
                  }
                  onRoadmapPhaseFocus?.(phaseId, options);
                }}
                reloadToken={roadmapReloadToken}
                isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
                roadmapPhaseGenerationProgress={roadmapPhaseGenerationProgress}
              />
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (listContent) {
    return (
      <section className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${
        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
      }`}>
        <DeferredPanel>{listContent}</DeferredPanel>
      </section>
    );
  }

  // Khi đang hiển thị form tạo nội dung — render inline thay vì popup
  const renderActiveContent = () => {
    // If readOnly is true, block "create/edit" paths, but allow viewing details
    const lacksCreatePermission = (
      (activeView === 'createQuiz' && !canCreateQuiz)
      || (activeView === 'editQuiz' && !canCreateQuiz)
      || (activeView === 'createFlashcard' && !canCreateFlashcard)
      || (activeView === 'createManualFlashcard' && !canCreateFlashcard)
      || (activeView === 'createMockTest' && !canCreateMockTest)
      || (activeView === 'editMockTest' && !canCreateMockTest)
    );
    if ((readOnly && ['createQuiz', 'createFlashcard', 'createManualFlashcard', 'editQuiz', 'createMockTest', 'createPostLearning', 'editMockTest'].includes(activeView)) || lacksCreatePermission) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-full">
          <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Không có quyền truy cập
          </h3>
          <p className={`text-sm max-w-md ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Bạn không có quyền tạo hoặc chỉnh sửa nội dung trong Group này.
          </p>
        </div>
      );
    }
    
    switch (activeView) {
      case "createQuiz": {
        const draftTargetId = challengeDraftQuizEditor
          ? (challengeDraftTargetQuizId ?? selectedQuiz?.quizId ?? null)
          : null;
        const seedTitle =
          challengeDraftQuizEditor && draftTargetId != null && selectedQuiz?.quizId === draftTargetId
            ? (selectedQuiz.title || '')
            : '';
        return (
          <CreateQuizForm
            isDarkMode={isDarkMode}
            onCreateQuiz={onCreateQuiz}
            onBack={onBack}
            contextId={workspaceId}
            selectedSourceIds={selectedSourceIds}
            sources={sources}
            planEntitlements={planEntitlements}
            showInlineRecommendations={false}
            onToggleMaterialSelection={onToggleMaterialSelection}
            readOnly={readOnly}
            existingQuizId={draftTargetId}
            seedQuizTitle={challengeDraftQuizEditor ? seedTitle : undefined}
            quizTitleMaxLength={quizTitleMaxLength}
            planUpgradeScope="GROUP"
            currentPlanSummaryOverride={currentPlanSummaryOverride}
            planUpgradeWorkspaceId={workspaceId}
          />
        );
      }
      case "createFlashcard":
        return <LazyCreateFlashcardForm isDarkMode={isDarkMode} onCreateFlashcard={onCreateFlashcard} onBack={onBack} contextType="GROUP" contextId={workspaceId} sources={sources} selectedSourceIds={selectedSourceIds} onToggleMaterialSelection={onToggleMaterialSelection} />;
      case "createManualFlashcard":
        return (
          <LazyManualFlashcardEditor
            isDarkMode={isDarkMode}
            workspaceId={workspaceId}
            contextType="GROUP"
            contextId={workspaceId}
            canActivate={Boolean(canCreateFlashcard)}
            onCreated={onCreateFlashcard}
            onActivated={(saved) => {
              // Sau khi kích hoạt → mở detail view để leader/member xem flip cards như AI flashcard.
              onViewFlashcard?.(saved);
            }}
            onBack={onBack}
          />
        );
      case "flashcardDetail": {
        if (!selectedFlashcard) return null;
        const fcStatus = String(selectedFlashcard?.status || "").toUpperCase();
        // Mọi DRAFT (AI/MANUAL) đều vào draft editor; ACTIVE dùng flip-card detail view.
        if (fcStatus === "DRAFT" && canCreateFlashcard && !readOnly) {
          return (
            <LazyManualFlashcardEditor
              isDarkMode={isDarkMode}
              workspaceId={workspaceId}
              contextType="GROUP"
              contextId={workspaceId}
              editingSetId={selectedFlashcard.flashcardSetId}
              canActivate={Boolean(canCreateFlashcard)}
              onSaved={onBack}
              onActivated={(saved) => {
                onViewFlashcard?.(saved);
              }}
              onBack={onBack}
            />
          );
        }
        return (
          <LazyFlashcardDetailView
            isDarkMode={isDarkMode}
            flashcard={selectedFlashcard}
            onBack={onBack}
            hideEditButton={!canCreateFlashcard}
            contextType="GROUP"
            contextId={workspaceId}
            isGroupLeader={isGroupLeader}
            groupAudiencePickerExcludeUserId={isGroupLeader ? groupWorkspaceCurrentUserId : null}
          />
        );
      }
      case "quizDetail":
        return selectedQuiz ? <LazyQuizDetailView isDarkMode={isDarkMode} quiz={selectedQuiz} onBack={onBack} onEdit={canCreateQuiz ? onEditQuiz : undefined} contextType="GROUP" contextId={workspaceId} hideEditButton={!canCreateQuiz} isGroupLeader={isGroupLeader} canEditQuiz={canCreateQuiz} canPublishQuiz={canPublishQuiz} canAssignQuizAudience={canAssignQuizAudience} groupAudiencePickerExcludeUserId={(canAssignQuizAudience || isGroupLeader) ? groupWorkspaceCurrentUserId : null} onGroupQuizUpdated={onGroupQuizUpdated} challengeSnapshotReviewMode={challengeSnapshotReviewMode} /> : null;
      case "editQuiz":
        return selectedQuiz ? (
          <LazyEditQuizForm
            isDarkMode={isDarkMode}
            quiz={selectedQuiz}
            onBack={onBack}
            onSave={onSaveQuiz}
            contextType="GROUP"
            contextId={workspaceId}
            presentationMode={challengeDraftQuizEditor ? "createAligned" : "default"}
            quizTitleMaxLength={quizTitleMaxLength}
          />
        ) : null;
      case "createMockTest":
        return !canCreateMockTest || !planEntitlements?.hasAdvanceQuizConfig
          ? <LazyMockTestListView isDarkMode={isDarkMode} onCreateMockTest={() => onChangeView?.("createMockTest")} onViewMockTest={onViewMockTest} contextType="GROUP" contextId={workspaceId} hideCreateButton={!canCreateMockTest} disableCreate />
          : <LazyCreateGroupMockTestForm isDarkMode={isDarkMode} onCreateMockTest={onCreateMockTest} onBack={onBack} contextType="GROUP" contextId={workspaceId} sources={sources} selectedSourceIds={selectedSourceIds} onToggleMaterialSelection={onToggleMaterialSelection} />;
      case "createPostLearning":
        return <LazyCreatePostLearningForm isDarkMode={isDarkMode} onCreatePostLearning={onCreatePostLearning} onBack={onBack} contextType="GROUP" contextId={workspaceId} sources={sources} selectedSourceIds={selectedSourceIds} onToggleMaterialSelection={onToggleMaterialSelection} />;
      case "mockTestDetail":
        return selectedMockTest ? <LazyMockTestDetailView isDarkMode={isDarkMode} quiz={selectedMockTest} onBack={onBack} hideEditButton contextType="GROUP" isGroupLeader={isGroupLeader} /> : null;
      case "editMockTest":
        return selectedMockTest ? <LazyEditMockTestForm isDarkMode={isDarkMode} quiz={selectedMockTest} onBack={onBack} onSave={onSaveMockTest} /> : null;
      default:
        return null;
    }
  };

  const activeContent = renderActiveContent();

  // Nếu có form đang hiển thị (createQuiz, createFlashcard, createRoadmap) — render inline
  if (activeContent) {
    return (
      <section className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${
        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
      }`}>
        <DeferredPanel>{activeContent}</DeferredPanel>
      </section>
    );
  }

  // Placeholder khi đang hiển thị nội dung cụ thể khác
  return (
    <section className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${
      isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
    }`}>
      <div className={`px-4 py-3 border-b transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>{t("workspace.chat.title")}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
          {t("workspace.chat.aiThinking")}
        </p>
      </div>
      <div className={`p-4 border-t transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className={`flex items-center gap-3 border rounded-2xl px-4 py-2 ${
          isDarkMode ? "border-slate-700 bg-slate-950" : "border-gray-200"
        }`}>
          <input
            className={`flex-1 bg-transparent outline-none text-sm ${isDarkMode ? "text-slate-300" : "text-gray-600"} ${fontClass}`}
            placeholder={t("workspace.chat.placeholder")}
          />
          <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
            {t("workspace.chat.sources", { count: sources.length })}
          </span>
        </div>
      </div>
    </section>
  );
}

export default ChatPanel;
