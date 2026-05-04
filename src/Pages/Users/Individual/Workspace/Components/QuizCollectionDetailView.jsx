import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  Clock,
  FileQuestion,
  Import,
  Layers3,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getQuizzesByScope, getWorkspaceQuestionsCatalog } from "@/api/QuizAPI";
import {
  deleteQuizCollection,
  deleteQuizCollectionQuestion,
  getQuizCollectionById,
  getQuizCollectionPracticeFull,
  getQuizCollectionQuestions,
  importQuestionsToCollection,
  importQuizzesToCollection,
  startQuizCollectionPractice,
  startQuizCollectionRandomPractice,
  updateQuizCollection,
} from "@/api/QuizCollectionAPI";
import { unwrapApiData, unwrapApiList } from "@/utils/apiResponse";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { buildQuizAttemptPath } from "@/lib/routePaths";
import { cn } from "@/lib/utils";

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function resolveQuestionTypeLabel(question, t) {
  const raw = String(question?.questionType || question?.questionTypeName || "").trim();
  if (raw) return raw;
  const questionTypeId = Number(question?.questionTypeId);
  if (questionTypeId === 1) return t("workspace.quizCollection.questionTypes.single", "Single choice");
  if (questionTypeId === 2) return t("workspace.quizCollection.questionTypes.multi", "Multiple choice");
  if (questionTypeId === 3) return t("workspace.quizCollection.questionTypes.short", "Short answer");
  if (questionTypeId === 4) return t("workspace.quizCollection.questionTypes.trueFalse", "True/False");
  if (questionTypeId === 5) return t("workspace.quizCollection.questionTypes.fillBlank", "Fill blank");
  return t("quizListView.cards.notAvailable", "N/A");
}

function getQuestionCatalogId(question) {
  return Number(question?.questionId ?? question?.id);
}

function QuizCollectionDetailView({
  isDarkMode = false,
  workspaceId,
  collection,
  onBack,
  onUpdated,
  onDeleted,
}) {
  const { t, i18n } = useTranslation();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const normalizedWorkspaceId = Number(workspaceId) || 0;
  const collectionId = Number(collection?.collectionId);
  const [activeTab, setActiveTab] = useState("questions");
  const [quizSearch, setQuizSearch] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");
  const deferredQuizSearch = useDeferredValue(quizSearch.trim().toLowerCase());
  const deferredQuestionSearch = useDeferredValue(questionSearch.trim().toLowerCase());
  const [selectedQuizIds, setSelectedQuizIds] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(collection?.title || "");
  const [editDescription, setEditDescription] = useState(collection?.description || "");
  const [savingMeta, setSavingMeta] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importingQuiz, setImportingQuiz] = useState(false);
  const [importingQuestion, setImportingQuestion] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);
  const [startingAll, setStartingAll] = useState(false);
  const [startingRandom, setStartingRandom] = useState(false);
  const [randomCount, setRandomCount] = useState("10");

  const {
    data: currentCollection = collection,
    isLoading: loadingCollection,
    refetch: refetchCollection,
  } = useQuery({
    queryKey: ["quiz-collection", collectionId],
    enabled: Number.isInteger(collectionId) && collectionId > 0,
    queryFn: async () => unwrapApiData(await getQuizCollectionById(collectionId)),
    initialData: collection,
  });

  const {
    data: questions = [],
    isLoading: loadingQuestions,
    refetch: refetchQuestions,
  } = useQuery({
    queryKey: ["quiz-collection-questions", collectionId],
    enabled: Number.isInteger(collectionId) && collectionId > 0,
    queryFn: async () => unwrapApiList(await getQuizCollectionQuestions(collectionId)),
  });

  const {
    data: practiceFull = null,
    refetch: refetchPracticeFull,
  } = useQuery({
    queryKey: ["quiz-collection-practice-full", collectionId],
    enabled: Number.isInteger(collectionId) && collectionId > 0,
    queryFn: async () => unwrapApiData(await getQuizCollectionPracticeFull(collectionId)),
  });

  const {
    data: workspaceQuizzes = [],
    isLoading: loadingWorkspaceQuizzes,
    refetch: refetchWorkspaceQuizzes,
  } = useQuery({
    queryKey: ["workspace-quizzes-for-collection-import", normalizedWorkspaceId],
    enabled: normalizedWorkspaceId > 0,
    queryFn: async () => unwrapApiList(await getQuizzesByScope("WORKSPACE", normalizedWorkspaceId)),
  });

  const {
    data: questionCatalog = [],
    isLoading: loadingQuestionCatalog,
    refetch: refetchQuestionCatalog,
  } = useQuery({
    queryKey: ["workspace-question-catalog-for-collection", normalizedWorkspaceId],
    enabled: normalizedWorkspaceId > 0,
    queryFn: async () => unwrapApiList(await getWorkspaceQuestionsCatalog(normalizedWorkspaceId)),
  });

  const loadedQuestionCount = Array.isArray(questions) ? questions.length : 0;
  const totalQuestion = loadedQuestionCount || (Number(currentCollection?.totalQuestion ?? 0) || 0);
  const practiceQuizId = Number(currentCollection?.practiceQuizId);
  const maxScore = Number(currentCollection?.maxScore ?? practiceFull?.maxScore ?? 0) || 0;
  const derivedSourceQuizCount = useMemo(() => {
    if (!Array.isArray(questions) || questions.length === 0) return 0;
    const ids = new Set();
    questions.forEach((question) => {
      const sourceQuizId = Number(question?.quizId ?? question?.sourceQuizId);
      if (!Number.isInteger(sourceQuizId) || sourceQuizId <= 0) return;
      if (sourceQuizId === practiceQuizId) return;
      ids.add(sourceQuizId);
    });
    return ids.size;
  }, [practiceQuizId, questions]);
  const sourceQuizCount =
    Number(currentCollection?.sourceQuizCount ?? 0) || derivedSourceQuizCount;
  const returnToQuizPath = `${location.pathname}${location.search || ""}`;
  const mutedTextClass = isDarkMode ? "text-slate-400" : "text-slate-500";

  const maxRandomCount = Math.max(totalQuestion, 0);
  const randomCountNumber = Number(randomCount);
  const randomCountIsInteger = Number.isInteger(randomCountNumber);
  const randomCountOutOfRange =
    maxRandomCount > 0 &&
    randomCountIsInteger &&
    (randomCountNumber < 1 || randomCountNumber > maxRandomCount);

  useEffect(() => {
    if (maxRandomCount <= 0) return;
    setRandomCount((prev) => {
      const prevNumber = Number(prev);
      if (!Number.isInteger(prevNumber) || prevNumber <= 0) {
        return String(Math.min(10, maxRandomCount));
      }
      if (prevNumber > maxRandomCount) return String(maxRandomCount);
      return prev;
    });
  }, [maxRandomCount]);

  const importableQuizzes = useMemo(() => {
    return workspaceQuizzes.filter((quiz) => {
      const quizId = Number(quiz?.quizId ?? quiz?.id);
      if (!Number.isInteger(quizId) || quizId <= 0) return false;
      if (quizId === practiceQuizId) return false;
      if (quiz?.collectionBacking === true) return false;
      if (Number(quiz?.roadmapId) > 0 || Number(quiz?.phaseId) > 0 || Number(quiz?.knowledgeId) > 0) return false;
      if (deferredQuizSearch) {
        return [quiz?.title, quiz?.description].some((value) => String(value || "").toLowerCase().includes(deferredQuizSearch));
      }
      return true;
    });
  }, [deferredQuizSearch, practiceQuizId, workspaceQuizzes]);

  const importableQuestions = useMemo(() => {
    const currentQuestionIds = new Set(questions.map((question) => Number(question?.questionId)).filter(Boolean));
    return questionCatalog.filter((question) => {
      const questionId = getQuestionCatalogId(question);
      if (!Number.isInteger(questionId) || questionId <= 0) return false;
      if (currentQuestionIds.has(questionId)) return false;
      const sourceQuizId = Number(question?.quizId ?? question?.sourceQuizId);
      if (sourceQuizId === practiceQuizId) return false;
      if (deferredQuestionSearch) {
        return [
          question?.content,
          question?.quizTitle,
          question?.sectionTitle,
          question?.questionType,
        ].some((value) => String(value || "").toLowerCase().includes(deferredQuestionSearch));
      }
      return true;
    });
  }, [deferredQuestionSearch, practiceQuizId, questionCatalog, questions]);

  const refreshAll = async () => {
    await Promise.all([
      refetchCollection(),
      refetchQuestions(),
      refetchPracticeFull(),
      refetchWorkspaceQuizzes(),
      refetchQuestionCatalog(),
    ]);
    if (normalizedWorkspaceId > 0) {
      queryClient.invalidateQueries({
        queryKey: ["workspace-quiz-collections", normalizedWorkspaceId],
      });
    }
  };

  const handleOpenEdit = () => {
    setEditTitle(currentCollection?.title || "");
    setEditDescription(currentCollection?.description || "");
    setEditOpen(true);
  };

  const handleSaveMeta = async () => {
    if (!editTitle.trim() || savingMeta) return;
    setSavingMeta(true);
    try {
      const response = await updateQuizCollection(collectionId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        status: currentCollection?.status || "ACTIVE",
      });
      const updated = unwrapApiData(response);
      showSuccess(t("workspace.quizCollection.updateSuccess", "Đã cập nhật bộ sưu tập."));
      setEditOpen(false);
      onUpdated?.(updated);
      await refetchCollection();
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setSavingMeta(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteQuizCollection(collectionId);
      showSuccess(t("workspace.quizCollection.deleteSuccess", "Đã xóa bộ sưu tập."));
      setDeleteOpen(false);
      onDeleted?.(currentCollection);
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setDeleting(false);
    }
  };

  const handleImportQuizzes = async () => {
    if (selectedQuizIds.length === 0 || importingQuiz) return;
    setImportingQuiz(true);
    try {
      const response = await importQuizzesToCollection(collectionId, selectedQuizIds);
      const updated = unwrapApiData(response);
      showSuccess(t("workspace.quizCollection.importQuizSuccess", "Đã import quiz vào bộ sưu tập."));
      setSelectedQuizIds([]);
      onUpdated?.(updated);
      await refreshAll();
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setImportingQuiz(false);
    }
  };

  const handleImportQuestions = async () => {
    if (selectedQuestionIds.length === 0 || importingQuestion) return;
    setImportingQuestion(true);
    try {
      const response = await importQuestionsToCollection(collectionId, selectedQuestionIds);
      const updated = unwrapApiData(response);
      showSuccess(t("workspace.quizCollection.importQuestionSuccess", "Đã import câu hỏi vào bộ sưu tập."));
      setSelectedQuestionIds([]);
      onUpdated?.(updated || currentCollection);
      await refreshAll();
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setImportingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    const normalizedQuestionId = Number(questionId);
    if (!Number.isInteger(normalizedQuestionId) || normalizedQuestionId <= 0 || deletingQuestionId) return;
    setDeletingQuestionId(normalizedQuestionId);
    try {
      await deleteQuizCollectionQuestion(collectionId, normalizedQuestionId);
      showSuccess(t("workspace.quizCollection.deleteQuestionSuccess", "Đã xóa câu hỏi khỏi bộ sưu tập."));
      await refreshAll();
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const navigateToPractice = (attempt, fallbackQuizId) => {
    const nextQuizId = Number(attempt?.quizId ?? fallbackQuizId);
    if (!Number.isInteger(nextQuizId) || nextQuizId <= 0) {
      throw new Error(t("workspace.quizCollection.startMissingQuiz", "Không xác định được quiz luyện tập."));
    }
    navigate(buildQuizAttemptPath("practice", nextQuizId), {
      state: {
        autoStart: true,
        returnToQuizPath,
        sourceView: "quiz-collection",
        sourceWorkspaceId: normalizedWorkspaceId,
      },
    });
  };

  const handleStartAll = async () => {
    if (startingAll || totalQuestion <= 0) return;
    setStartingAll(true);
    try {
      const response = await startQuizCollectionPractice(collectionId, { isPracticeMode: true });
      const attempt = unwrapApiData(response);
      navigateToPractice(attempt, practiceQuizId);
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setStartingAll(false);
    }
  };

  const handleStartRandom = async () => {
    const count = Number(randomCount);
    if (startingRandom || totalQuestion <= 0) return;
    if (!Number.isInteger(count) || count <= 0) {
      showError(
        t(
          "workspace.quizCollection.randomCountInvalid",
          "Số câu ngẫu nhiên phải là số nguyên dương.",
        ),
      );
      return;
    }
    if (count > totalQuestion) {
      showError(
        t(
          "workspace.quizCollection.randomCountTooLarge",
          "Không được nhập quá số câu hỏi đã import.",
        ),
      );
      setRandomCount(String(totalQuestion));
      return;
    }
    setStartingRandom(true);
    try {
      const response = await startQuizCollectionRandomPractice(collectionId, Math.min(count, totalQuestion), { isPracticeMode: true });
      const attempt = unwrapApiData(response);
      navigateToPractice(attempt, attempt?.quizId);
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setStartingRandom(false);
    }
  };

  const toggleSelectedQuiz = (quizId) => {
    setSelectedQuizIds((current) =>
      current.includes(quizId)
        ? current.filter((id) => id !== quizId)
        : [...current, quizId],
    );
  };

  const toggleSelectedQuestion = (questionId) => {
    setSelectedQuestionIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  };

  if (loadingCollection && !currentCollection) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", fontClass)}>
      <div className={cn("border-b px-4 py-3", isDarkMode ? "border-slate-800" : "border-gray-200")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className={cn("rounded-lg p-1.5 transition-all active:scale-95", isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-600 hover:bg-gray-100")}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h2 className={cn("truncate text-xl font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                {currentCollection?.title || t("workspace.quizCollection.fallbackTitle", "Bộ sưu tập")}
              </h2>
              <p className={cn("mt-0.5 line-clamp-1 text-sm", mutedTextClass)}>
                {currentCollection?.description || t("workspace.quizCollection.detailHint", "Gom quiz và câu hỏi để luyện tập lại theo nhu cầu.")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-9 rounded-full px-3" onClick={refreshAll}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" className="h-9 rounded-full px-3" onClick={handleOpenEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              <span>{t("workspace.quiz.detail.edit", "Chỉnh sửa")}</span>
            </Button>
            <Button type="button" variant="outline" className="h-9 rounded-full px-3 text-red-600" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span>{t("workspace.quizCollection.delete", "Xóa bộ sưu tập")}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { icon: FileQuestion, label: t("quizListView.cards.questions", "Questions"), value: totalQuestion },
            { icon: Layers3, label: t("workspace.quizCollection.sourceQuizCount", "Quiz nguồn"), value: sourceQuizCount },
            { icon: BookOpenCheck, label: t("workspace.quizCollection.maxScore", "Tổng điểm"), value: maxScore || "-" },
            { icon: Clock, label: t("workspace.quizCollection.updatedAt", "Cập nhật"), value: formatShortDate(currentCollection?.updatedAt || currentCollection?.createdAt) || "-" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={cn("rounded-2xl border px-4 py-3", isDarkMode ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-white")}>
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", isDarkMode ? "text-blue-300" : "text-blue-600")} />
                  <span className={cn("text-xs font-semibold uppercase tracking-[0.12em]", mutedTextClass)}>{item.label}</span>
                </div>
                <p className={cn("mt-2 text-xl font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900")}>{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className={cn("mt-4 rounded-2xl border p-4", isDarkMode ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-white")}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className={cn("text-base font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                {t("workspace.quizCollection.practiceTitle", "Luyện tập bộ sưu tập")}
              </h3>
              <p className={cn("mt-1 text-sm", mutedTextClass)}>
                {t("workspace.quizCollection.practiceHint", "Làm toàn bộ bộ sưu tập hoặc tạo phiên ngẫu nhiên theo số câu mong muốn.")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={handleStartAll} disabled={startingAll || totalQuestion <= 0} className="h-10 rounded-full bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-50">
                {startingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {t("workspace.quizCollection.practiceAll", "Luyện tập tất cả")}
              </Button>
              <div className={cn("flex items-center gap-2 rounded-full border px-2 py-1", isDarkMode ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-50")}>
                <input
                  type="number"
                  min="1"
                  max={Math.max(totalQuestion, 1)}
                  value={randomCount}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (nextValue === "") {
                      setRandomCount("");
                      return;
                    }
                    const nextNumber = Number(nextValue);
                    if (!Number.isFinite(nextNumber)) return;
                    if (totalQuestion > 0 && nextNumber > totalQuestion) {
                      setRandomCount(String(totalQuestion));
                      return;
                    }
                    setRandomCount(String(Math.max(1, Math.trunc(nextNumber))));
                  }}
                  onBlur={() => {
                    if (!totalQuestion) return;
                    const value = Number(randomCount);
                    if (!Number.isInteger(value) || value <= 0) {
                      setRandomCount(String(Math.min(10, totalQuestion)));
                      return;
                    }
                    if (value > totalQuestion) setRandomCount(String(totalQuestion));
                  }}
                  className={cn("h-8 w-16 rounded-full border px-2 text-center text-sm outline-none", isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900")}
                />
                <Button type="button" variant="outline" onClick={handleStartRandom} disabled={startingRandom || totalQuestion <= 0} className="h-8 rounded-full px-3">
                  {startingRandom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shuffle className="mr-2 h-4 w-4" />}
                  {t("workspace.quizCollection.practiceRandom", "Ngẫu nhiên")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className={cn("mt-4 flex flex-wrap items-center gap-4 border-b", isDarkMode ? "border-slate-800" : "border-slate-200")}>
          {[
            { key: "questions", label: t("workspace.quizCollection.tabs.questions", "Câu hỏi") },
            { key: "importQuiz", label: t("workspace.quizCollection.tabs.importQuiz", "Import quiz") },
            { key: "importQuestion", label: t("workspace.quizCollection.tabs.importQuestion", "Import câu hỏi") },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "border-b-2 pb-3 text-sm font-semibold transition-colors",
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : isDarkMode
                    ? "border-transparent text-slate-400 hover:text-slate-200"
                    : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "questions" ? (
          <div className="pt-4">
            {loadingQuestions ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
              </div>
            ) : questions.length === 0 ? (
              <div className={cn("flex min-h-[240px] flex-col items-center justify-center rounded-2xl border px-6 text-center", isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white")}>
                <Import className={cn("mb-3 h-10 w-10", isDarkMode ? "text-slate-600" : "text-slate-300")} />
                <p className={cn("text-sm", mutedTextClass)}>
                  {t("workspace.quizCollection.noQuestions", "Bộ sưu tập chưa có câu hỏi. Hãy import quiz hoặc import câu hỏi để bắt đầu.")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <div key={question.questionId} className={cn("rounded-2xl border p-4", isDarkMode ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-white")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700")}>
                            #{index + 1}
                          </span>
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", isDarkMode ? "bg-blue-950/50 text-blue-300" : "bg-blue-50 text-blue-700")}>
                            {resolveQuestionTypeLabel(question, t)}
                          </span>
                          {question?.difficulty ? (
                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", isDarkMode ? "bg-amber-950/50 text-amber-300" : "bg-amber-50 text-amber-700")}>
                              {question.difficulty}
                            </span>
                          ) : null}
                        </div>
                        <p className={cn("line-clamp-3 text-sm leading-6", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                          {question?.content || t("workspace.quizCollection.emptyQuestionContent", "Câu hỏi chưa có nội dung")}
                        </p>
                        <p className={cn("mt-2 text-xs", mutedTextClass)}>
                          {t("workspace.quizCollection.answerCount", "{{count}} đáp án", { count: Number(question?.answerCount ?? 0) || 0 })}
                          {" · "}
                          {t("workspace.quizCollection.score", "{{score}} điểm", { score: Number(question?.score ?? 0) || 0 })}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteQuestion(question.questionId)}
                        disabled={deletingQuestionId === question.questionId}
                        className="shrink-0 rounded-full text-red-600"
                      >
                        {deletingQuestionId === question.questionId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "importQuiz" ? (
          <div className="pt-4">
            <ImportToolbar
              isDarkMode={isDarkMode}
              searchValue={quizSearch}
              onSearchChange={(value) => startTransition(() => setQuizSearch(value))}
              selectedCount={selectedQuizIds.length}
              onImport={handleImportQuizzes}
              importing={importingQuiz}
              importLabel={t("workspace.quizCollection.importSelectedQuiz", "Import quiz đã chọn")}
              placeholder={t("workspace.quizCollection.searchQuizPlaceholder", "Tìm quiz để import...")}
            />
            <div className="mt-3 space-y-2">
              {loadingWorkspaceQuizzes ? (
                <div className="flex min-h-[220px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-slate-400" /></div>
              ) : importableQuizzes.length === 0 ? (
                <EmptyImportState isDarkMode={isDarkMode} text={t("workspace.quizCollection.noImportableQuiz", "Không có quiz phù hợp để import.")} />
              ) : importableQuizzes.map((quiz) => {
                const quizId = Number(quiz?.quizId ?? quiz?.id);
                const checked = selectedQuizIds.includes(quizId);
                return (
                  <button
                    key={quizId}
                    type="button"
                    onClick={() => toggleSelectedQuiz(quizId)}
                    className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors", checked ? "border-blue-400 bg-blue-50 text-blue-900" : isDarkMode ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50")}
                  >
                    <SelectionBox checked={checked} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{quiz?.title || t("quizListView.cards.noTitle", "-")}</p>
                      <p className={cn("mt-1 text-xs", checked ? "text-blue-700" : mutedTextClass)}>
                        {Number(quiz?.totalQuestion ?? quiz?.questionCount ?? 0) || 0} {t("quizListView.cards.questions", "Questions")}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {activeTab === "importQuestion" ? (
          <div className="pt-4">
            <ImportToolbar
              isDarkMode={isDarkMode}
              searchValue={questionSearch}
              onSearchChange={(value) => startTransition(() => setQuestionSearch(value))}
              selectedCount={selectedQuestionIds.length}
              onImport={handleImportQuestions}
              importing={importingQuestion}
              importLabel={t("workspace.quizCollection.importSelectedQuestion", "Import câu hỏi đã chọn")}
              placeholder={t("workspace.quizCollection.searchQuestionPlaceholder", "Tìm nội dung câu hỏi...")}
            />
            <div className="mt-3 space-y-2">
              {loadingQuestionCatalog ? (
                <div className="flex min-h-[220px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-slate-400" /></div>
              ) : importableQuestions.length === 0 ? (
                <EmptyImportState isDarkMode={isDarkMode} text={t("workspace.quizCollection.noImportableQuestion", "Không có câu hỏi phù hợp để import.")} />
              ) : importableQuestions.slice(0, 80).map((question) => {
                const questionId = getQuestionCatalogId(question);
                const checked = selectedQuestionIds.includes(questionId);
                return (
                  <button
                    key={questionId}
                    type="button"
                    onClick={() => toggleSelectedQuestion(questionId)}
                    className={cn("flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors", checked ? "border-blue-400 bg-blue-50 text-blue-900" : isDarkMode ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50")}
                  >
                    <SelectionBox checked={checked} />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold">{question?.content || t("workspace.quizCollection.emptyQuestionContent", "Câu hỏi chưa có nội dung")}</p>
                      <p className={cn("mt-1 text-xs", checked ? "text-blue-700" : mutedTextClass)}>
                        {question?.quizTitle || question?.sourceQuizTitle || t("workspace.quizCollection.unknownSourceQuiz", "Quiz nguồn")}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("workspace.quizCollection.edit", "Chỉnh sửa bộ sưu tập")}</DialogTitle>
            <DialogDescription>{t("workspace.quizCollection.editDescription", "Cập nhật tên và mô tả hiển thị.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400"
              placeholder={t("workspace.quizCollection.title", "Tên bộ sưu tập")}
            />
            <textarea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              className="min-h-[92px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder={t("workspace.quizCollection.description", "Mô tả")}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={savingMeta}>{t("common.cancel", "Cancel")}</Button>
            <Button type="button" onClick={handleSaveMeta} disabled={savingMeta || !editTitle.trim()} className="bg-blue-600 text-white hover:bg-blue-700">
              {savingMeta ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("workspace.quizCollection.delete", "Xóa bộ sưu tập")}</DialogTitle>
            <DialogDescription>{t("workspace.quizCollection.deleteConfirm", "Bộ sưu tập và quiz luyện tập phía sau sẽ được xóa khỏi danh sách.")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>{t("workspace.quiz.close", "Close")}</Button>
            <Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={handleDeleteCollection} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("workspace.quiz.actionButtons.delete", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SelectionBox({ checked }) {
  return (
    <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", checked ? "border-blue-500 bg-blue-600 text-white" : "border-slate-300 bg-white text-transparent")}>
      <Check className="h-3.5 w-3.5" />
    </span>
  );
}

function ImportToolbar({
  isDarkMode,
  searchValue,
  onSearchChange,
  selectedCount,
  onImport,
  importing,
  importLabel,
  placeholder,
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="relative min-w-[220px] flex-1 md:max-w-[520px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          className={cn("h-10 w-full rounded-full border py-2 pl-10 pr-10 text-sm outline-none", isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900")}
        />
        {searchValue ? (
          <button type="button" onClick={() => onSearchChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <Button type="button" onClick={onImport} disabled={selectedCount === 0 || importing} className="h-10 rounded-full bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-50">
        {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Import className="mr-2 h-4 w-4" />}
        {importLabel} ({selectedCount})
      </Button>
    </div>
  );
}

function EmptyImportState({ isDarkMode, text }) {
  return (
    <div className={cn("flex min-h-[220px] items-center justify-center rounded-2xl border px-6 text-center text-sm", isDarkMode ? "border-slate-800 bg-slate-900/50 text-slate-400" : "border-slate-200 bg-white text-slate-500")}>
      {text}
    </div>
  );
}

export default QuizCollectionDetailView;
