import React from "react";
import { UploadCloud, BookOpen, Sparkles, Mic, Play, PenLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import CreateQuizForm from "./CreateQuizForm";
import CreateFlashcardForm from "./CreateFlashcardForm";
import RoadmapCanvasView from "@/Pages/Users/Individual/Workspace/Components/RoadmapCanvasView";
import QuizListView from "@/Pages/Users/Individual/Workspace/Components/QuizListView";
import QuizDetailView from "@/Pages/Users/Individual/Workspace/Components/QuizDetailView";
import EditQuizForm from "./EditQuizForm";
import FlashcardListView from "@/Pages/Users/Individual/Workspace/Components/FlashcardListView";
import FlashcardDetailView from "@/Pages/Users/Individual/Workspace/Components/FlashcardDetailView";
import MockTestListView from "@/Pages/Users/Individual/Workspace/Components/MockTestListView";
import CreateMockTestForm from "@/Pages/Users/Individual/Workspace/Components/CreateMockTestForm";
import MockTestDetailView from "@/Pages/Users/Individual/Workspace/Components/MockTestDetailView";
import EditMockTestForm from "@/Pages/Users/Individual/Workspace/Components/EditMockTestForm";
import PostLearningListView from "@/Pages/Users/Individual/Workspace/Components/PostLearningListView";
import CreatePostLearningForm from "@/Pages/Users/Individual/Workspace/Components/CreatePostLearningForm";

// Panel chính hiển thị nội dung workspace: list views, create forms, trạng thái trống...
function ChatPanel({ isDarkMode = false, sources = [], activeView = null, createdItems = [], onUploadClick, onChangeView, onCreateQuiz, onCreateFlashcard, onCreateRoadmap, onCreateMockTest, onCreatePostLearning, onBack, groupId = null, selectedQuiz = null, onViewQuiz, onEditQuiz, onSaveQuiz, selectedFlashcard = null, onViewFlashcard, onDeleteFlashcard, selectedMockTest = null, onViewMockTest, onEditMockTest, onSaveMockTest, selectedPostLearning = null, onViewPostLearning }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const hasSources = sources.length > 0;

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
          <Button
            onClick={onUploadClick}
            className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-full px-6 h-10 flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span className={fontClass}>{t("workspace.chat.upload")}</span>
          </Button>
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
        return <RoadmapCanvasView isDarkMode={isDarkMode} onCreateRoadmap={onCreateRoadmap} createdItems={createdRoadmaps} groupId={groupId} />;
      case "quiz":
        return <QuizListView isDarkMode={isDarkMode} onCreateQuiz={() => onChangeView?.("createQuiz")} onViewQuiz={onViewQuiz} contextType="GROUP" contextId={groupId} />;
      case "flashcard":
        return <FlashcardListView isDarkMode={isDarkMode} onCreateFlashcard={() => onChangeView?.("createFlashcard")} onViewFlashcard={onViewFlashcard} onDeleteFlashcard={onDeleteFlashcard} contextType="GROUP" contextId={groupId} />;
      case "mockTest":
        return <MockTestListView isDarkMode={isDarkMode} onCreateMockTest={() => onChangeView?.("createMockTest")} onViewMockTest={onViewMockTest} contextType="GROUP" contextId={groupId} />;
      case "postLearning":
        return <PostLearningListView isDarkMode={isDarkMode} onCreatePostLearning={() => onChangeView?.("createPostLearning")} onViewPostLearning={onViewPostLearning} contextType="GROUP" contextId={groupId} />;
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
        {listContent}
      </section>
    );
  }

  // Khi đang hiển thị form tạo nội dung — render inline thay vì popup
  const renderActiveContent = () => {
    switch (activeView) {
      case "createQuiz":
        return <CreateQuizForm isDarkMode={isDarkMode} onCreateQuiz={onCreateQuiz} onBack={onBack} contextType="GROUP" contextId={groupId} />;
      case "createFlashcard":
        return <CreateFlashcardForm isDarkMode={isDarkMode} onCreateFlashcard={onCreateFlashcard} onBack={onBack} contextType="GROUP" contextId={groupId} />;
      case "flashcardDetail":
        return selectedFlashcard ? <FlashcardDetailView isDarkMode={isDarkMode} flashcard={selectedFlashcard} onBack={onBack} /> : null;
      case "quizDetail":
        return selectedQuiz ? <QuizDetailView isDarkMode={isDarkMode} quiz={selectedQuiz} onBack={onBack} onEdit={onEditQuiz} contextType="GROUP" contextId={groupId} /> : null;
      case "editQuiz":
        return selectedQuiz ? <EditQuizForm isDarkMode={isDarkMode} quiz={selectedQuiz} onBack={onBack} onSave={onSaveQuiz} contextType="GROUP" contextId={groupId} /> : null;
      case "createMockTest":
        return <CreateMockTestForm isDarkMode={isDarkMode} onCreateMockTest={onCreateMockTest} onBack={onBack} contextType="GROUP" contextId={groupId} />;
      case "createPostLearning":
        return <CreatePostLearningForm isDarkMode={isDarkMode} onCreatePostLearning={onCreatePostLearning} onBack={onBack} contextType="GROUP" contextId={groupId} />;
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