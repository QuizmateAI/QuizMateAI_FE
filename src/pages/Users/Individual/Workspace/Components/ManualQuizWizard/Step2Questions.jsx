import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import QuestionCard, { getCardStatus } from "./QuestionCard";
import StickyQuestionBar from "./StickyQuestionBar";
import ImportQuestionsPanel from "./ImportQuestionsPanel";
import { useQuestionTimeBalancer } from "./useQuestionTimeBalancer";
import { useToast } from "@/context/ToastContext";

function Step2Questions({
  config,
  questions,
  setQuestions,
  workspaceId,
  contextType = "INDIVIDUAL",
  excludeQuizId,
  onBack,
  onSubmit,
  submitLabel = "Tạo Quiz",
  submittingLabel = "Đang tạo...",
  submitting = false,
  isDarkMode = false,
  surface = "quiz",
}) {
  const importEnabled = contextType !== "GROUP";
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [importOpen, setImportOpen] = useState(false);
  const scrollRef = useRef(null);
  const stickyBarRef = useRef(null);

  const totalBudgetSeconds = (config.duration || 0) * 60;

  const { toggleLock, setDuration, distributeEvenly } = useQuestionTimeBalancer({
    questions,
    setQuestions,
    totalBudgetSeconds,
  });

  const scrollQuestionIntoView = (questionId, behavior = "smooth") => {
    const element = document.getElementById(`question-${questionId}`);
    const container = scrollRef.current;

    if (!element || !container) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const stickyHeight = stickyBarRef.current?.getBoundingClientRect().height ?? 0;
    const targetTop = container.scrollTop + (elementRect.top - containerRect.top) - stickyHeight - 12;

    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior,
    });
  };

  const updateQuestion = (id, updatedQuestion) => {
    setQuestions((prev) => prev.map((question) => (question.id === id ? updatedQuestion : question)));
  };

  const deleteQuestion = (id) => {
    if (questions.length <= 1) return;
    const questionIndex = questions.findIndex((question) => question.id === id);
    const questionNumber = questionIndex >= 0 ? questionIndex + 1 : null;

    if (!window.confirm(t("workspace.quiz.manualWizard.confirm.deleteQuestion", {
      number: questionNumber,
      defaultValue: `Xóa câu ${questionNumber} khỏi bản nháp này?`,
    }))) {
      return;
    }

    setQuestions((prev) => prev.filter((question) => question.id !== id));
  };

  const addQuestion = () => {
    if (questions.length >= 100) return;
    const newQuestion = {
      id: `q-${Date.now()}`,
      questionType: "multipleChoice",
      content: "",
      duration: questions.length > 0
        ? Math.max(5, Math.floor(totalBudgetSeconds / (questions.length + 1)))
        : Math.max(5, Math.floor(totalBudgetSeconds)),
      timeLocked: false,
      explanation: "",
      answers: [],
    };

    setQuestions((prev) => [...prev, newQuestion]);

    setTimeout(() => {
      scrollQuestionIntoView(newQuestion.id);
    }, 50);
  };

  const handleImport = (importedQuestions) => {
    setQuestions((prev) => {
      const remainingSlots = Math.max(0, 100 - prev.length);
      const acceptedQuestions = importedQuestions.slice(0, remainingSlots);
      const skippedCount = Math.max(0, importedQuestions.length - acceptedQuestions.length);

      if (acceptedQuestions.length > 0) {
        addToast?.({
          type: skippedCount > 0 ? "warning" : "success",
          message: skippedCount > 0
            ? t("workspace.quiz.manualWizard.toasts.importPartial", {
                accepted: acceptedQuestions.length,
                skipped: skippedCount,
                defaultValue: `Đã nhập ${acceptedQuestions.length} câu. Bỏ qua ${skippedCount} câu vì đã đạt tối đa 100 câu hỏi.`,
              })
            : t("workspace.quiz.manualWizard.toasts.importSuccess", {
                count: acceptedQuestions.length,
                defaultValue: `Đã nhập ${acceptedQuestions.length} câu hỏi.`,
              }),
        });
        return [...prev, ...acceptedQuestions];
      }

      addToast?.({
        type: "warning",
        message: t("workspace.quiz.manualWizard.toasts.importMaxReached", "Quiz đã đạt tối đa 100 câu hỏi."),
      });
      return prev;
    });
  };

  const handleJumpTo = (questionId) => {
    scrollQuestionIntoView(questionId);
  };

  const handleDistributeEvenly = () => {
    if (config.timerMode) return;
    const result = distributeEvenly(totalBudgetSeconds);
    if (!result.ok) {
      addToast?.({
        type: "warning",
        message: t("workspace.quiz.manualWizard.toasts.distributeEvenlyError", {
          minShare: result.minShare,
          defaultValue: `Không đủ thời gian. Share còn ${result.minShare}s - mở khóa bớt câu hoặc tăng thời gian mỗi câu.`,
        }),
      });
      return;
    }

    addToast?.({
      type: "success",
      message: t("workspace.quiz.manualWizard.toasts.distributeEvenlySuccess", "Đã phân bổ thời gian đều."),
    });
  };

  const handleSubmit = () => {
    const firstInvalidIndex = questions.findIndex((question) => getCardStatus(question) !== "ok");

    if (firstInvalidIndex !== -1) {
      const invalidQuestion = questions[firstInvalidIndex];
      const invalidStatus = getCardStatus(invalidQuestion);
      handleJumpTo(invalidQuestion.id);

      const element = document.getElementById(`question-${invalidQuestion.id}`);
      element?.classList.add("ring-2", "ring-red-500", "ring-offset-2");
      setTimeout(() => element?.classList.remove("ring-2", "ring-red-500", "ring-offset-2"), 1800);

      addToast?.({
        type: "error",
        message: invalidStatus === "empty"
          ? t("workspace.quiz.manualWizard.toasts.questionEmpty", {
              number: firstInvalidIndex + 1,
              defaultValue: `Câu ${firstInvalidIndex + 1} còn trống.`,
            })
          : invalidStatus === "warning"
            ? t("workspace.quiz.manualWizard.toasts.questionWarning", {
                number: firstInvalidIndex + 1,
                defaultValue: `Câu ${firstInvalidIndex + 1} chưa hoàn chỉnh.`,
              })
            : t("workspace.quiz.manualWizard.toasts.questionError", {
                number: firstInvalidIndex + 1,
                defaultValue: `Câu ${firstInvalidIndex + 1} còn lỗi.`,
              }),
      });
      return;
    }

    onSubmit?.();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <StickyQuestionBar
          barRef={stickyBarRef}
          config={config}
          questions={questions}
          onBack={onBack}
          onSubmit={handleSubmit}
          submitLabel={submitLabel}
          submittingLabel={submittingLabel}
          submitting={submitting}
          onAddQuestion={addQuestion}
          onOpenImport={importEnabled ? () => setImportOpen(true) : undefined}
          onJumpTo={handleJumpTo}
          onDistributeEvenly={handleDistributeEvenly}
          isDarkMode={isDarkMode}
          surface={surface}
        />

        <div className="px-4 py-4 space-y-4">
          {questions.map((question, idx) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={idx + 1}
              onChange={(updatedQuestion) => updateQuestion(question.id, updatedQuestion)}
              onDelete={() => deleteQuestion(question.id)}
              canDelete={questions.length > 1}
              timerMode={config.timerMode}
              isDarkMode={isDarkMode}
              onToggleLock={toggleLock}
              onDurationChange={setDuration}
            />
          ))}

          <div className="flex justify-center pb-6">
            <button
              type="button"
              onClick={addQuestion}
              disabled={questions.length >= 100}
              aria-label={t("workspace.quiz.manualWizard.step2.addQuestion", "Thêm câu hỏi")}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 border-dashed px-6 py-3 text-sm font-medium transition-colors disabled:opacity-40",
                isDarkMode
                  ? surface === "challenge"
                    ? "border-slate-700 text-slate-500 hover:border-orange-500 hover:text-orange-300"
                    : "border-slate-700 text-slate-500 hover:border-blue-500 hover:text-blue-400"
                  : surface === "challenge"
                    ? "border-gray-200 text-gray-500 hover:border-orange-400 hover:text-orange-500"
                    : "border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-500",
              )}
            >
              + {t("workspace.quiz.manualWizard.step2.addQuestion", "Thêm câu hỏi")}
              {questions.length >= 100 && (
                <span className="text-xs text-red-400">
                  {t("workspace.quiz.manualWizard.step2.maxReached", "(đã đạt tối đa 100)")}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {importEnabled ? (
        <ImportQuestionsPanel
          open={importOpen}
          onClose={() => setImportOpen(false)}
          workspaceId={workspaceId}
          excludeQuizId={excludeQuizId}
          onImport={handleImport}
          isDarkMode={isDarkMode}
        />
      ) : null}
    </div>
  );
}

export default Step2Questions;
