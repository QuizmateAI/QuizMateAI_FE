import React from "react";
import { UploadCloud, Sparkles, Route, BadgeCheck, Layers, Map, Rows3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import CreateQuizForm from "./CreateQuizForm";
import CreateFlashcardForm from "./CreateFlashcardForm";
import RoadmapCanvasView from "./RoadmapCanvasView";
import QuizListView from "./QuizListView";
import QuizDetailView from "./QuizDetailView";
import EditQuizForm from "./EditQuizForm";
import FlashcardListView from "./FlashcardListView";
import FlashcardDetailView from "./FlashcardDetailView";
import MockTestListView from "./MockTestListView";
import CreateMockTestForm from "./CreateMockTestForm";
import MockTestDetailView from "./MockTestDetailView";
import EditMockTestForm from "./EditMockTestForm";
import PostLearningListView from "./PostLearningListView";
import CreatePostLearningForm from "./CreatePostLearningForm";

// Panel chính hiển thị nội dung workspace: list views, create forms, trạng thái trống...
function ChatPanel({ isDarkMode = false, sources = [], activeView = null, createdItems = [], onUploadClick, onChangeView, onCreateQuiz, onCreateFlashcard, onCreateRoadmap, onCreateMockTest, onCreatePostLearning, onBack, workspaceId = null, selectedQuiz = null, onViewQuiz, onEditQuiz, onSaveQuiz, selectedFlashcard = null, onViewFlashcard, onDeleteFlashcard, selectedMockTest = null, onViewMockTest, onEditMockTest, onSaveMockTest, selectedPostLearning = null, onViewPostLearning, selectedSourceIds = [], selectedRoadmapPhaseId = null, onCreateRoadmapPhases, onCreatePhaseKnowledge, onCreatePhasePreLearning, isStudyNewRoadmap = false, isGeneratingRoadmapPhases = false, generatingKnowledgePhaseIds = [], generatingKnowledgeQuizPhaseIds = [], generatingPreLearningPhaseIds = [], roadmapReloadToken = 0, shouldDisableQuiz = false, shouldDisableFlashcard = false, shouldDisableRoadmap = false, shouldDisableCreateQuiz = false, shouldDisableCreateFlashcard = false }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const hasSources = sources.length > 0;
  const getIsActionDisabled = React.useCallback((actionKey) => {
    if (actionKey === "quiz") return shouldDisableQuiz;
    if (actionKey === "flashcard") return shouldDisableFlashcard;
    if (actionKey === "roadmap") return shouldDisableRoadmap;
    return false;
  }, [shouldDisableFlashcard, shouldDisableQuiz, shouldDisableRoadmap]);
  const areAllQuickActionsDisabled = getIsActionDisabled("roadmap")
    && getIsActionDisabled("quiz")
    && getIsActionDisabled("flashcard");
  const roadmapCanvasStorageKey = workspaceId ? `workspace_${workspaceId}_roadmap_canvas_view` : null;
  const [roadmapCanvasView, setRoadmapCanvasView] = React.useState(() => {
    if (!workspaceId) return null;
    const saved = localStorage.getItem(`workspace_${workspaceId}_roadmap_canvas_view`);
    return saved === "view1" || saved === "view2" ? saved : null;
  });

  React.useEffect(() => {
    if (!workspaceId) {
      setRoadmapCanvasView(null);
      return;
    }

    const saved = localStorage.getItem(`workspace_${workspaceId}_roadmap_canvas_view`);
    setRoadmapCanvasView(saved === "view1" || saved === "view2" ? saved : null);
  }, [workspaceId]);

  React.useEffect(() => {
    if (!roadmapCanvasStorageKey || !roadmapCanvasView) return;
    localStorage.setItem(roadmapCanvasStorageKey, roadmapCanvasView);
  }, [roadmapCanvasStorageKey, roadmapCanvasView]);

  const handleSwitchRoadmapView = React.useCallback((view) => {
    if (view !== "view1" && view !== "view2") return;
    setRoadmapCanvasView(view);
  }, []);

  const renderListView = () => {
    // Lọc createdItems theo loại tương ứng
    const createdRoadmaps = createdItems.filter(i => i.type === "Roadmap");
    const createdQuizzes = createdItems.filter(i => i.type === "Quiz");
    const createdFlashcards = createdItems.filter(i => i.type === "Flashcard");

    switch (activeView) {
      case "roadmap":
        return (
          <RoadmapCanvasView
            isDarkMode={isDarkMode}
            onCreateRoadmap={onCreateRoadmap}
            onCreateRoadmapPhases={onCreateRoadmapPhases}
            onCreatePhaseKnowledge={onCreatePhaseKnowledge}
            onCreatePhasePreLearning={onCreatePhasePreLearning}
            isStudyNewRoadmap={isStudyNewRoadmap}
            onViewQuiz={onViewQuiz}
            isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
            generatingKnowledgePhaseIds={generatingKnowledgePhaseIds}
            generatingKnowledgeQuizPhaseIds={generatingKnowledgeQuizPhaseIds}
            generatingPreLearningPhaseIds={generatingPreLearningPhaseIds}
            reloadToken={roadmapReloadToken}
            createdItems={createdRoadmaps}
            workspaceId={workspaceId}
            forcedCanvasView={roadmapCanvasView}
            onCanvasViewChange={setRoadmapCanvasView}
            selectedPhaseId={selectedRoadmapPhaseId}
          />
        );
      case "quiz":
        return <QuizListView isDarkMode={isDarkMode} onCreateQuiz={() => onChangeView?.("createQuiz")} onViewQuiz={onViewQuiz} contextType="WORKSPACE" contextId={workspaceId} disableCreate={shouldDisableCreateQuiz} />;
      case "flashcard":
        return <FlashcardListView isDarkMode={isDarkMode} onCreateFlashcard={() => onChangeView?.("createFlashcard")} onViewFlashcard={onViewFlashcard} onDeleteFlashcard={onDeleteFlashcard} contextType="WORKSPACE" contextId={workspaceId} disableCreate={shouldDisableCreateFlashcard} />;
      case "mockTest":
        return <MockTestListView isDarkMode={isDarkMode} onCreateMockTest={() => onChangeView?.("createMockTest")} onViewMockTest={onViewMockTest} contextType="WORKSPACE" contextId={workspaceId} />;
      case "postLearning":
        return <PostLearningListView isDarkMode={isDarkMode} onCreatePostLearning={() => onChangeView?.("createPostLearning")} onViewPostLearning={onViewPostLearning} contextType="WORKSPACE" contextId={workspaceId} />;
      case "createQuiz":
        return <CreateQuizForm isDarkMode={isDarkMode} onCreateQuiz={onCreateQuiz} onBack={onBack} contextType="WORKSPACE" contextId={workspaceId} selectedSourceIds={selectedSourceIds} sources={sources} />;
      case "createFlashcard":
        return <CreateFlashcardForm isDarkMode={isDarkMode} onCreateFlashcard={onCreateFlashcard} onBack={onBack} contextType="WORKSPACE" contextId={workspaceId} selectedSourceIds={selectedSourceIds} sources={sources} />;
      case "flashcardDetail":
        return selectedFlashcard ? <FlashcardDetailView isDarkMode={isDarkMode} flashcard={selectedFlashcard} onBack={onBack} /> : null;
      case "quizDetail":
        return selectedQuiz ? <QuizDetailView isDarkMode={isDarkMode} quiz={selectedQuiz} onBack={onBack} onEdit={onEditQuiz} contextType="WORKSPACE" contextId={workspaceId} /> : null;
      case "editQuiz":
        return selectedQuiz ? <EditQuizForm isDarkMode={isDarkMode} quiz={selectedQuiz} onBack={onBack} onSave={onSaveQuiz} contextType="WORKSPACE" contextId={workspaceId} /> : null;
      case "createMockTest":
        return <CreateMockTestForm isDarkMode={isDarkMode} onCreateMockTest={onCreateMockTest} onBack={onBack} contextType="WORKSPACE" contextId={workspaceId} />;
      case "createPostLearning":
        return <CreatePostLearningForm isDarkMode={isDarkMode} onCreatePostLearning={onCreatePostLearning} onBack={onBack} contextType="WORKSPACE" contextId={workspaceId} />;
      case "mockTestDetail":
        return selectedMockTest ? <MockTestDetailView isDarkMode={isDarkMode} quiz={selectedMockTest} onBack={onBack} onEdit={onEditMockTest} /> : null;
      case "editMockTest":
        return selectedMockTest ? <EditMockTestForm isDarkMode={isDarkMode} quiz={selectedMockTest} onBack={onBack} onSave={onSaveMockTest} /> : null;
      default:
        return null;
    }
  };

  const listContent = renderListView();
  if (listContent) {
    return (
      <section className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${
        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
      }`}>
        {activeView === "roadmap" ? (
          <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${isDarkMode ? "border-slate-800 bg-slate-950/50" : "border-gray-200 bg-slate-50"}`}>
            <p className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
              {t("workspace.roadmap.title", "Roadmap")}
            </p>
            <div className="inline-flex items-center gap-1 rounded-full border p-1">
              <Button
                type="button"
                size="sm"
                variant={roadmapCanvasView === "view1" ? "default" : "ghost"}
                onClick={() => handleSwitchRoadmapView("view1")}
                className={`h-8 rounded-full px-3 min-w-[86px] ${roadmapCanvasView === "view1" ? "bg-blue-600 hover:bg-blue-700 text-white" : isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Rows3 className="w-4 h-4 mr-1.5" />
                <span className={fontClass}>View 1</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={roadmapCanvasView === "view2" ? "default" : "ghost"}
                onClick={() => handleSwitchRoadmapView("view2")}
                className={`h-8 rounded-full px-3 min-w-[86px] ${roadmapCanvasView === "view2" ? "bg-blue-600 hover:bg-blue-700 text-white" : isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Map className="w-4 h-4 mr-1.5" />
                <span className={fontClass}>View 2</span>
              </Button>
            </div>
          </div>
        ) : null}
        {listContent}
      </section>
    );
  }

  // Khi đang hiển thị form tạo nội dung — render inline thay vì popup
  // Render form phù hợp dựa vào activeView
  const renderActiveContent = () => {
    switch (activeView) {
      case "createQuiz":
        return <CreateQuizForm isDarkMode={isDarkMode} onCreateQuiz={onCreateQuiz} onBack={onBack} contextType="WORKSPACE" contextId={workspaceId} selectedSourceIds={selectedSourceIds} sources={sources} />;
      case "createFlashcard":
        return <CreateFlashcardForm isDarkMode={isDarkMode} onCreateFlashcard={onCreateFlashcard} onBack={onBack} contextType="WORKSPACE" contextId={workspaceId} selectedSourceIds={selectedSourceIds} sources={sources} />;
      case "flashcardDetail":
        return selectedFlashcard ? <FlashcardDetailView isDarkMode={isDarkMode} flashcard={selectedFlashcard} onBack={onBack} /> : null;
      case "quizDetail":
        return selectedQuiz ? <QuizDetailView isDarkMode={isDarkMode} quiz={selectedQuiz} onBack={onBack} onEdit={onEditQuiz} contextType="WORKSPACE" contextId={workspaceId} /> : null;
      case "editQuiz":
        return selectedQuiz ? <EditQuizForm isDarkMode={isDarkMode} quiz={selectedQuiz} onBack={onBack} onSave={onSaveQuiz} contextType="WORKSPACE" contextId={workspaceId} /> : null;
      case "createMockTest":
        return <CreateMockTestForm isDarkMode={isDarkMode} onCreateMockTest={onCreateMockTest} onBack={onBack} contextType="WORKSPACE" contextId={workspaceId} />;
      case "createPostLearning":
        return <CreatePostLearningForm isDarkMode={isDarkMode} onCreatePostLearning={onCreatePostLearning} onBack={onBack} contextType="WORKSPACE" contextId={workspaceId} />;
      case "mockTestDetail":
        return selectedMockTest ? <MockTestDetailView isDarkMode={isDarkMode} quiz={selectedMockTest} onBack={onBack} onEdit={onEditMockTest} /> : null;
      case "editMockTest":
        return selectedMockTest ? <EditMockTestForm isDarkMode={isDarkMode} quiz={selectedMockTest} onBack={onBack} onSave={onSaveMockTest} /> : null;
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
        {activeContent}
      </section>
    );
  }

  // Fallback: Nếu không có nội dung nào được hiển thị, hiển thị màn hình chào mừng
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
            {t("workspace.chat.emptyTitle", "Chào mừng đến với Workspace")}
          </p>
          <p className={`text-sm mt-1.5 max-w-md ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            {t("workspace.chat.emptyDesc", "Chọn một chức năng bên dưới để bắt đầu")}
          </p>
        </div>

        {areAllQuickActionsDisabled && (
          <div className={`flex flex-col items-center gap-3 p-4 rounded-xl border w-full max-w-lg ${isDarkMode ? "bg-amber-950/20 border-amber-900/30" : "bg-amber-50 border-amber-200"}`}>
            <p className={`text-sm text-center ${isDarkMode ? "text-amber-400" : "text-amber-700"} ${fontClass}`}>
              {t("workspace.chat.requireUpload", "Vui lòng tải tài liệu lên để có thể sử dụng các chức năng này.")}
            </p>
            <Button
              onClick={onUploadClick}
              className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-full px-6 h-9 flex items-center gap-2 transition-all active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span className={fontClass}>{t("workspace.chat.upload", "Tải tài liệu lên")}</span>
            </Button>
          </div>
        )}

        {/* Lối tắt nhanh đến 3 chức năng chính */}
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
            const isDisabled = getIsActionDisabled(mode.key);
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
          )})}
        </div>
      </div>
    </section>
  );
}

export default ChatPanel;
