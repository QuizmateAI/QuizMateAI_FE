import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Loader2,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronLeft,
  Eye,
  ListChecks,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAnswersByQuestion,
  getQuestionById,
  getQuizzesByScope,
  getWorkspaceQuestionsCatalog,
} from "@/api/QuizAPI";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { parseMatchingPairs, serializeMatchingPairs } from "./AnswerEditor";
import { unwrapApiData, unwrapApiList } from "@/Utils/apiResponse";

const QUESTION_TYPE_VALUE_MAP = {
  SINGLE_CHOICE: "multipleChoice",
  MULTIPLE_CHOICE: "multipleSelect",
  MULTIPLE_SELECT: "multipleSelect",
  IMAGED_BASED: "imageBased",
  TRUE_FALSE: "trueFalse",
  SHORT_ANSWER: "shortAnswer",
  FILL_IN_BLANK: "fillBlank",
  MATCHING: "matching",
};

const getQuizId = (quiz) => Number(quiz?.quizId ?? quiz?.id ?? 0);
const getQuizTitle = (quiz, fallbackTitle) => String(quiz?.title || quiz?.quizTitle || fallbackTitle || "").trim();
const getQuizQuestionCount = (quiz) => Number(quiz?.questionCount ?? quiz?.totalQuestion ?? quiz?.totalQuestions ?? 0) || 0;

const buildImportedAnswers = (questionType, answers = []) => {
  if (questionType === "MATCHING") {
    const pairs = parseMatchingPairs(answers[0]?.matchingPairs || answers[0]?.content);
    return [{
      matchingPairs: pairs,
      content: serializeMatchingPairs(pairs),
      isCorrect: true,
    }];
  }

  return (answers || []).map((answer) => ({
    content: answer?.content || "",
    isCorrect: Boolean(answer?.isCorrect),
  }));
};

function ImportQuestionsPanel({ open, onClose, workspaceId, excludeQuizId, onImport, isDarkMode = false }) {
  const { t } = useTranslation();
  const [view, setView] = useState("quizzes");
  const [reviewReturnView, setReviewReturnView] = useState("quizzes");
  const [quizzes, setQuizzes] = useState([]);
  const [questionCatalog, setQuestionCatalog] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [wholeQuizSelections, setWholeQuizSelections] = useState({});
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizSearch, setQuizSearch] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [wholeQuizLoadingId, setWholeQuizLoadingId] = useState(null);
  const [importing, setImporting] = useState(false);

  const typeLabels = useMemo(() => ({
    SINGLE_CHOICE: t("workspace.quiz.manualWizard.importPanel.typeLabels.SINGLE_CHOICE", "Trắc nghiệm 1 đáp án"),
    MULTIPLE_CHOICE: t("workspace.quiz.manualWizard.importPanel.typeLabels.MULTIPLE_CHOICE", "Nhiều đáp án"),
    MULTIPLE_SELECT: t("workspace.quiz.manualWizard.importPanel.typeLabels.MULTIPLE_SELECT", "Nhiều đáp án"),
    IMAGED_BASED: t("workspace.quiz.manualWizard.importPanel.typeLabels.IMAGED_BASED", "Câu hỏi kèm ảnh"),
    TRUE_FALSE: t("workspace.quiz.manualWizard.importPanel.typeLabels.TRUE_FALSE", "Đúng/Sai"),
    SHORT_ANSWER: t("workspace.quiz.manualWizard.importPanel.typeLabels.SHORT_ANSWER", "Trả lời ngắn"),
    FILL_IN_BLANK: t("workspace.quiz.manualWizard.importPanel.typeLabels.FILL_IN_BLANK", "Điền vào chỗ trống"),
    MATCHING: t("workspace.quiz.manualWizard.importPanel.typeLabels.MATCHING", "Ghép đôi"),
  }), [t]);

  const isBusy = quizzesLoading || questionsLoading || importing || wholeQuizLoadingId !== null;

  const resetPanelState = useCallback(() => {
    setView("quizzes");
    setReviewReturnView("quizzes");
    setQuizzes([]);
    setQuestionCatalog([]);
    setSelectedQuestions([]);
    setWholeQuizSelections({});
    setActiveQuiz(null);
    setQuizSearch("");
    setQuestionSearch("");
    setFilterType("");
    setQuizzesLoading(false);
    setQuestionsLoading(false);
    setWholeQuizLoadingId(null);
    setImporting(false);
  }, []);

  const mergeSelectedQuestions = useCallback((items) => {
    setSelectedQuestions((prev) => {
      const next = new Map(prev.map((item) => [Number(item.questionId), item]));
      (items || []).forEach((item) => {
        next.set(Number(item.questionId), item);
      });
      return Array.from(next.values()).sort((left, right) => {
        const quizDiff = getQuizId(left) - getQuizId(right);
        if (quizDiff !== 0) return quizDiff;
        return Number(left.questionId) - Number(right.questionId);
      });
    });
  }, []);

  const removeSelectedQuestion = useCallback((questionId) => {
    setSelectedQuestions((prev) => prev.filter((item) => Number(item.questionId) !== Number(questionId)));
  }, []);

  const loadQuizList = useCallback(async () => {
    if (!workspaceId) return;
    setQuizzesLoading(true);
    try {
      const response = await getQuizzesByScope("WORKSPACE", Number(workspaceId));
      const incoming = unwrapApiList(response)
        .filter((quiz) => getQuizId(quiz) !== Number(excludeQuizId || 0))
        .map((quiz) => {
          const { overallDifficulty, ...restQuiz } = quiz || {};
          return restQuiz;
        });
      setQuizzes(incoming);
    } catch {
      setQuizzes([]);
    } finally {
      setQuizzesLoading(false);
    }
  }, [workspaceId, excludeQuizId]);

  const loadQuestionsForQuiz = useCallback(async (quiz, overrides = {}) => {
    const resolvedQuiz = quiz || activeQuiz;
    const quizId = getQuizId(resolvedQuiz);
    if (!workspaceId || !quizId) return;

    setQuestionsLoading(true);
    try {
      const searchValue = overrides.search !== undefined ? overrides.search : questionSearch;
      const typeValue = overrides.filterType !== undefined ? overrides.filterType : filterType;

      const response = await getWorkspaceQuestionsCatalog(workspaceId, {
        excludeQuizId,
        quizId,
        search: searchValue || undefined,
        questionType: typeValue || undefined,
      });
      setQuestionCatalog(unwrapApiList(response));
    } catch {
      setQuestionCatalog([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, [workspaceId, excludeQuizId, activeQuiz, questionSearch, filterType]);

  const loadWholeQuizQuestions = useCallback(async (quiz) => {
    const quizId = getQuizId(quiz);
    if (!workspaceId || !quizId) return [];

    const response = await getWorkspaceQuestionsCatalog(workspaceId, {
      excludeQuizId,
      quizId,
    });
    return unwrapApiList(response).map((item) => ({
      ...item,
      quizId,
      quizTitle: item.quizTitle || getQuizTitle(quiz, t("workspace.quiz.manualWizard.importPanel.noQuizTitle", "Quiz chưa đặt tên")),
    }));
  }, [workspaceId, excludeQuizId, t]);

  useEffect(() => {
    if (!open) return;
    resetPanelState();
    loadQuizList();
  }, [open, loadQuizList, resetPanelState]);

  const visibleQuizzes = useMemo(() => {
    const keyword = String(quizSearch || "").trim().toLowerCase();
    if (!keyword) return quizzes;
    return quizzes.filter((quiz) => {
      const haystack = `${quiz?.title || ""} ${quiz?.description || ""}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [quizzes, quizSearch]);

  const selectedIds = useMemo(
    () => new Set(selectedQuestions.map((item) => Number(item.questionId))),
    [selectedQuestions],
  );

  const selectedCountInQuiz = useCallback((quizId) => (
    selectedQuestions.filter((item) => Number(item.quizId) === Number(quizId)).length
  ), [selectedQuestions]);

  const getWholeQuizSelectionState = useCallback((quizId) => {
    const selectedCount = selectedCountInQuiz(quizId);
    const cachedCount = Array.isArray(wholeQuizSelections[quizId]) ? wholeQuizSelections[quizId].length : 0;

    if (cachedCount > 0) {
      if (selectedCount === 0) return "none";
      if (selectedCount >= cachedCount) return "all";
      return "partial";
    }

    return selectedCount > 0 ? "partial" : "none";
  }, [selectedCountInQuiz, wholeQuizSelections]);

  const openQuizQuestions = async (quiz) => {
    setActiveQuiz(quiz);
    setQuestionSearch("");
    setFilterType("");
    setView("questions");
    await loadQuestionsForQuiz(quiz, { search: "", filterType: "" });
  };

  const handleSelectWholeQuiz = useCallback(async (quiz) => {
    const quizId = getQuizId(quiz);
    if (!quizId) return;

    const selectionState = getWholeQuizSelectionState(quizId);
    if (selectionState === "all") {
      setSelectedQuestions((prev) => prev.filter((item) => Number(item.quizId) !== quizId));
      return;
    }

    setWholeQuizLoadingId(quizId);
    try {
      const wholeQuizQuestions = await loadWholeQuizQuestions(quiz);
      setWholeQuizSelections((prev) => ({ ...prev, [quizId]: wholeQuizQuestions }));
      mergeSelectedQuestions(wholeQuizQuestions);
    } finally {
      setWholeQuizLoadingId(null);
    }
  }, [getWholeQuizSelectionState, loadWholeQuizQuestions, mergeSelectedQuestions]);

  const toggleQuestion = (question) => {
    const questionId = Number(question.questionId);
    if (selectedIds.has(questionId)) {
      removeSelectedQuestion(questionId);
      return;
    }

    mergeSelectedQuestions([{
      ...question,
      quizId: question.quizId ?? getQuizId(activeQuiz),
      quizTitle: question.quizTitle || getQuizTitle(activeQuiz, t("workspace.quiz.manualWizard.importPanel.noQuizTitle", "Quiz chưa đặt tên")),
    }]);
  };

  const toggleVisibleQuestions = () => {
    const visibleIds = questionCatalog.map((item) => Number(item.questionId));
    const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

    if (isAllVisibleSelected) {
      setSelectedQuestions((prev) => prev.filter((item) => !visibleIds.includes(Number(item.questionId))));
      return;
    }

    mergeSelectedQuestions(questionCatalog.map((item) => ({
      ...item,
      quizId: item.quizId ?? getQuizId(activeQuiz),
      quizTitle: item.quizTitle || getQuizTitle(activeQuiz, t("workspace.quiz.manualWizard.importPanel.noQuizTitle", "Quiz chưa đặt tên")),
    })));
  };

  const openReview = (returnView = view) => {
    setReviewReturnView(returnView);
    setView("review");
  };

  const handleImport = async () => {
    if (selectedQuestions.length === 0) return;
    setImporting(true);
    try {
      const importedQuestions = await Promise.all(
        selectedQuestions.map(async (question) => {
          const [questionResponse, answersResponse] = await Promise.all([
            getQuestionById(question.questionId),
            getAnswersByQuestion(question.questionId),
          ]);

          const sourceQuestion = unwrapApiData(questionResponse);
          const answers = unwrapApiList(answersResponse);

          return {
            id: `imported-${question.questionId}-${Date.now()}`,
            questionTypeId: Number(sourceQuestion?.questionTypeId) || null,
            questionType: QUESTION_TYPE_VALUE_MAP[question.questionType] || "multipleChoice",
            content: question.content || "",
            duration: question.duration ?? 60,
            timeLocked: false,
            explanation: "",
            answers: buildImportedAnswers(question.questionType, answers),
            importedFromQuestionId: question.questionId,
            importedFromQuizId: question.quizId,
            importedFromQuizTitle: question.quizTitle,
          };
        }),
      );

      onImport?.(importedQuestions);
      onClose?.();
    } catch {
      // keep dialog open for retry
    } finally {
      setImporting(false);
    }
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    isDarkMode
      ? "border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500"
      : "border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 focus:border-blue-400"
  }`;

  const footerActions = (
    <DialogFooter className="shrink-0 pt-3 gap-2">
      {view === "review" ? (
        <Button
          variant="outline"
          onClick={() => setView(reviewReturnView || "quizzes")}
          className="rounded-full"
        >
          {reviewReturnView === "questions"
            ? t("workspace.quiz.manualWizard.importPanel.backToQuestions", "Quay lại câu hỏi")
            : t("workspace.quiz.manualWizard.importPanel.backToQuizzes", "Quay lại quiz")}
        </Button>
      ) : (
        <Button variant="outline" onClick={onClose} className="rounded-full">
          {t("workspace.quiz.manualWizard.importPanel.cancel", "Hủy")}
        </Button>
      )}

      {view !== "review" && selectedQuestions.length > 0 && (
        <Button
          variant="outline"
          onClick={() => openReview(view)}
          className="rounded-full"
        >
          <Eye className="w-4 h-4 mr-2" />
          {t("workspace.quiz.manualWizard.importPanel.viewSelectedCount", {
            count: selectedQuestions.length,
            defaultValue: `Xem đã chọn (${selectedQuestions.length})`,
          })}
        </Button>
      )}

      <Button
        disabled={selectedQuestions.length === 0 || isBusy}
        onClick={handleImport}
        className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {selectedQuestions.length > 0
          ? t("workspace.quiz.manualWizard.importPanel.importButtonCount", {
              count: selectedQuestions.length,
              defaultValue: `Nhập ${selectedQuestions.length} câu`,
            })
          : t("workspace.quiz.manualWizard.importPanel.importButton", "Nhập câu")}
      </Button>
    </DialogFooter>
  );

  return (
    <Dialog open={open} onOpenChange={(value) => !isBusy && !value && onClose?.()}>
      <DialogContent className={cn(
        "max-w-3xl h-[88vh] max-h-[88vh] overflow-hidden flex flex-col rounded-2xl",
        isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white",
      )}>
        <DialogHeader className="shrink-0 gap-1">
          <div className="flex items-center gap-2">
            {view !== "quizzes" && (
              <button
                type="button"
                onClick={() => setView(view === "review" ? reviewReturnView || "quizzes" : "quizzes")}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600",
                )}
                aria-label={t("workspace.quiz.manualWizard.importPanel.backToQuizzes", "Quay lại quiz")}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <div className="min-w-0">
              <DialogTitle>
                {view === "review"
                  ? t("workspace.quiz.manualWizard.importPanel.reviewTitle", "Danh sách câu đã chọn")
                  : view === "questions"
                    ? getQuizTitle(activeQuiz, t("workspace.quiz.manualWizard.importPanel.noQuizTitle", "Quiz chưa đặt tên"))
                    : t("workspace.quiz.manualWizard.importPanel.title", "Nhập câu hỏi từ quiz khác")}
              </DialogTitle>
              <p className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-gray-500")}>
                {view === "review"
                  ? t("workspace.quiz.manualWizard.importPanel.reviewSubtitle", "Rà lại danh sách câu đã chọn trước khi import.")
                  : view === "questions"
                    ? t("workspace.quiz.manualWizard.importPanel.questionSubtitle", "Chọn những câu bạn muốn import từ quiz này.")
                    : t("workspace.quiz.manualWizard.importPanel.quizSubtitle", "Tick ô checkbox bên trái để chọn toàn bộ quiz, hoặc mở quiz để chọn từng câu.")}
              </p>
            </div>
          </div>
        </DialogHeader>

        {view === "quizzes" && (
          <>
            <div className="shrink-0 flex items-center gap-2 py-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className={cn(inputCls, "pl-9")}
                  placeholder={t("workspace.quiz.manualWizard.importPanel.quizSearchPlaceholder", "Tìm quiz để import...")}
                  aria-label={t("workspace.quiz.manualWizard.importPanel.quizSearchPlaceholder", "Tìm quiz để import...")}
                  value={quizSearch}
                  onChange={(event) => setQuizSearch(event.target.value)}
                />
              </div>

              {selectedQuestions.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => openReview("quizzes")}
                  className="rounded-full shrink-0"
                >
                  <ListChecks className="w-4 h-4 mr-2" />
                  {t("workspace.quiz.manualWizard.importPanel.viewSelectedCount", {
                    count: selectedQuestions.length,
                    defaultValue: `Xem đã chọn (${selectedQuestions.length})`,
                  })}
                </Button>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
              {quizzesLoading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              )}

              {!quizzesLoading && visibleQuizzes.length === 0 && (
                <p className={cn("text-center py-10 text-sm", isDarkMode ? "text-slate-400" : "text-gray-400")}>
                  {t("workspace.quiz.manualWizard.importPanel.quizListEmpty", "Không tìm thấy quiz nào để import.")}
                </p>
              )}

              {!quizzesLoading && visibleQuizzes.map((quiz) => {
                const quizId = getQuizId(quiz);
                const questionCount = getQuizQuestionCount(quiz);
                const selectedInQuiz = selectedCountInQuiz(quizId);
                const statusLabel = t(`quizListView.status.${String(quiz?.status || "").toUpperCase()}`, quiz?.status || "DRAFT");
                const wholeQuizLoading = wholeQuizLoadingId === quizId;
                const wholeQuizSelectionState = getWholeQuizSelectionState(quizId);

                return (
                  <div
                    key={quizId}
                    className={cn(
                      "rounded-2xl border p-4 transition-all",
                      isDarkMode ? "border-slate-700 bg-slate-950/40" : "border-gray-200 bg-white",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelectWholeQuiz(quiz)}
                        disabled={wholeQuizLoading}
                        role="checkbox"
                        aria-checked={wholeQuizSelectionState === "all" ? true : wholeQuizSelectionState === "partial" ? "mixed" : false}
                        className={cn(
                          "shrink-0 mt-0.5 rounded-md transition-colors",
                          isDarkMode ? "text-slate-300 hover:text-slate-100" : "text-gray-500 hover:text-gray-800",
                          wholeQuizLoading ? "opacity-60" : "",
                        )}
                        aria-label={t("workspace.quiz.manualWizard.importPanel.importWholeQuiz", "Chọn toàn bộ quiz")}
                        title={t("workspace.quiz.manualWizard.importPanel.importWholeQuiz", "Chọn toàn bộ quiz")}
                      >
                        {wholeQuizLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        ) : wholeQuizSelectionState === "all" ? (
                          <CheckSquare className="w-5 h-5 text-blue-500" />
                        ) : wholeQuizSelectionState === "partial" ? (
                          <MinusSquare className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => openQuizQuestions(quiz)}
                        className={cn(
                          "min-w-0 flex-1 text-left rounded-xl transition-colors",
                          isDarkMode ? "hover:bg-slate-900/60" : "hover:bg-gray-50",
                        )}
                      >
                        <p className={cn("text-sm font-semibold truncate", isDarkMode ? "text-slate-100" : "text-gray-900")}>
                          {getQuizTitle(quiz, t("workspace.quiz.manualWizard.importPanel.noQuizTitle", "Quiz chưa đặt tên"))}
                        </p>
                        {quiz?.description && (
                          <p className={cn("mt-1 text-xs line-clamp-2", isDarkMode ? "text-slate-400" : "text-gray-500")}>
                            {quiz.description}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            isDarkMode ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-600",
                          )}>
                            {statusLabel}
                          </span>
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            isDarkMode ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-600",
                          )}>
                            {t("workspace.quiz.manualWizard.importPanel.questionCount", {
                              count: questionCount,
                              defaultValue: `${questionCount} câu`,
                            })}
                          </span>
                          {selectedInQuiz > 0 && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                              {t("workspace.quiz.manualWizard.importPanel.selectedInQuiz", {
                                count: selectedInQuiz,
                                defaultValue: `Đã chọn ${selectedInQuiz} câu`,
                              })}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === "questions" && (
          <>
            <div className="shrink-0 flex flex-wrap gap-2 py-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className={cn(inputCls, "pl-9")}
                  placeholder={t("workspace.quiz.manualWizard.importPanel.questionSearchPlaceholder", "Tìm câu hỏi trong quiz...")}
                  aria-label={t("workspace.quiz.manualWizard.importPanel.questionSearchPlaceholder", "Tìm câu hỏi trong quiz...")}
                  value={questionSearch}
                  onChange={(event) => setQuestionSearch(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && loadQuestionsForQuiz(activeQuiz)}
                />
              </div>

              <select
                value={filterType}
                onChange={(event) => setFilterType(event.target.value)}
                aria-label={t("workspace.quiz.manualWizard.importPanel.allTypes", "Tất cả loại")}
                className={cn(inputCls, "w-36 shrink-0")}
              >
                <option value="">{t("workspace.quiz.manualWizard.importPanel.allTypes", "Tất cả loại")}</option>
                {Object.entries(typeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <Button variant="outline" size="sm" onClick={() => loadQuestionsForQuiz(activeQuiz)} className="shrink-0 rounded-lg">
                {t("workspace.quiz.manualWizard.importPanel.searchButton", "Tìm")}
              </Button>
            </div>

            {questionCatalog.length > 0 && (
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
                <button
                  type="button"
                  onClick={toggleVisibleQuestions}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-medium",
                    isDarkMode ? "text-slate-300" : "text-slate-600",
                  )}
                >
                  {questionCatalog.every((item) => selectedIds.has(Number(item.questionId)))
                    ? <CheckSquare className="w-4 h-4 text-blue-500" />
                    : <Square className="w-4 h-4" />}
                  {questionCatalog.every((item) => selectedIds.has(Number(item.questionId)))
                    ? t("workspace.quiz.manualWizard.importPanel.deselectAll", "Bỏ chọn tất cả")
                    : t("workspace.quiz.manualWizard.importPanel.selectAll", "Chọn tất cả")}
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-gray-400")}>
                    {t("workspace.quiz.manualWizard.importPanel.selectedCount", {
                      selected: questionCatalog.filter((item) => selectedIds.has(Number(item.questionId))).length,
                      total: questionCatalog.length,
                      defaultValue: `Đã chọn ${questionCatalog.filter((item) => selectedIds.has(Number(item.questionId))).length}/${questionCatalog.length}`,
                    })}
                  </span>

                  {selectedQuestions.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openReview("questions")}
                      className="rounded-full"
                    >
                      <ListChecks className="w-4 h-4 mr-2" />
                      {t("workspace.quiz.manualWizard.importPanel.viewSelectedCount", {
                        count: selectedQuestions.length,
                        defaultValue: `Xem đã chọn (${selectedQuestions.length})`,
                      })}
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {questionsLoading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              )}

              {!questionsLoading && questionCatalog.length === 0 && (
                <p className={cn("text-center py-10 text-sm", isDarkMode ? "text-slate-400" : "text-gray-400")}>
                  {t("workspace.quiz.manualWizard.importPanel.questionsEmpty", "Quiz này chưa có câu hỏi phù hợp.")}
                </p>
              )}

              {!questionsLoading && questionCatalog.map((question) => {
                const isSelected = selectedIds.has(Number(question.questionId));
                return (
                  <button
                    key={question.questionId}
                    type="button"
                    onClick={() => toggleQuestion(question)}
                    className={cn(
                      "w-full text-left rounded-xl border-2 p-3 transition-all",
                      isSelected
                        ? isDarkMode
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-blue-500 bg-blue-50"
                        : isDarkMode
                          ? "border-slate-700 hover:border-slate-600"
                          : "border-gray-200 hover:border-gray-300",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                        isSelected ? "border-blue-500 bg-blue-500" : isDarkMode ? "border-slate-500" : "border-gray-300",
                      )}>
                        {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm line-clamp-2", isDarkMode ? "text-slate-200" : "text-gray-800")}>
                          {question.content}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-1.5">
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            isDarkMode ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600",
                          )}>
                            {typeLabels[question.questionType] || question.questionType}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {view === "review" && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
            {selectedQuestions.length === 0 && (
              <p className={cn("text-center py-10 text-sm", isDarkMode ? "text-slate-400" : "text-gray-400")}>
                {t("workspace.quiz.manualWizard.importPanel.reviewEmpty", "Bạn chưa chọn câu hỏi nào để import.")}
              </p>
            )}

            {selectedQuestions.map((question) => (
              <div
                key={question.questionId}
                className={cn(
                  "rounded-xl border p-3 flex items-start gap-3",
                  isDarkMode ? "border-slate-700 bg-slate-950/40" : "border-gray-200 bg-white",
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm line-clamp-2", isDarkMode ? "text-slate-100" : "text-gray-900")}>
                    {question.content}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                      isDarkMode ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-600",
                    )}>
                      {typeLabels[question.questionType] || question.questionType}
                    </span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500",
                    )}>
                      {t("workspace.quiz.manualWizard.importPanel.sourceQuiz", {
                        title: question.quizTitle || t("workspace.quiz.manualWizard.importPanel.noQuizTitle", "Quiz chưa đặt tên"),
                        defaultValue: `Từ: ${question.quizTitle || "Quiz chưa đặt tên"}`,
                      })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeSelectedQuestion(question.questionId)}
                  title={t("workspace.quiz.manualWizard.importPanel.removeSelected", "Bỏ câu này")}
                  aria-label={t("workspace.quiz.manualWizard.importPanel.removeSelected", "Bỏ câu này")}
                  className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {footerActions}
      </DialogContent>
    </Dialog>
  );
}

export default ImportQuestionsPanel;
