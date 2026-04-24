import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock,
  FolderOpen,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Timer,
  BarChart3,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import HomeButton from "@/Components/ui/HomeButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/Components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { deleteQuiz, getQuizzesByScope } from "@/api/QuizAPI";
import { useToast } from "@/context/ToastContext";
import { getDurationInMinutes } from "@/lib/quizDurationDisplay";

const ITEMS_PER_PAGE = 12;

const STATUS_STYLES = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
  COMPLETED: { light: "bg-blue-100 text-blue-700", dark: "bg-blue-950/50 text-blue-400" },
  INACTIVE: { light: "bg-slate-100 text-slate-500", dark: "bg-slate-800 text-slate-400" },
  PROCESSING: { light: "bg-sky-100 text-sky-700", dark: "bg-sky-950/50 text-sky-300" },
  ERROR: { light: "bg-rose-100 text-rose-700", dark: "bg-rose-950/50 text-rose-300" },
};

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function resolveMockQuestionCount(mockTest) {
  return Number(mockTest?.questionCount ?? mockTest?.totalQuestion ?? mockTest?.totalQuestions ?? 0) || 0;
}

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

async function loadMockTests({ contextId }) {
  if (!contextId) {
    return { items: [] };
  }
  const response = await getQuizzesByScope("WORKSPACE", contextId, { quizIntent: "MOCK_TEST" });
  const rawQuizzes = response?.data ?? [];
  const quizzes = Array.isArray(rawQuizzes) ? rawQuizzes : [];
  // Mock test giờ là đề thử độc lập ở workspace level, không link roadmap.
  return { items: quizzes };
}

function MockTestListView({
  isDarkMode = false,
  onCreateMockTest,
  onNavigateHome,
  onViewMockTest,
  contextType = "WORKSPACE",
  contextId,
  disableCreate = false,
  hideCreateButton = false,
}) {
  const { t, i18n } = useTranslation();
  const { showError } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const normalizedContextId = Number(contextId) || 0;
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTargetQuiz, setDeleteTargetQuiz] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const {
    data: mockTestPayload = { items: [] },
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["workspace-mock-tests", String(contextType || "").toUpperCase(), normalizedContextId],
    enabled: normalizedContextId > 0,
    queryFn: () => loadMockTests({ contextId: normalizedContextId }),
  });

  const mockTests = mockTestPayload.items || [];

  const filteredMockTests = useMemo(
    () =>
      mockTests.filter((item) => {
        if (!deferredSearchQuery) return true;

        return [item?.title, item?.description].some((value) =>
          String(value || "").toLowerCase().includes(deferredSearchQuery),
        );
      }),
    [deferredSearchQuery, mockTests],
  );

  const totalPages = Math.max(1, Math.ceil(filteredMockTests.length / ITEMS_PER_PAGE));
  const effectivePage = Math.min(page, totalPages);

  const pagedMockTests = useMemo(() => {
    const start = (effectivePage - 1) * ITEMS_PER_PAGE;
    return filteredMockTests.slice(start, start + ITEMS_PER_PAGE);
  }, [effectivePage, filteredMockTests]);

  const showPagination = filteredMockTests.length > ITEMS_PER_PAGE;
  const mutedTextClass = isDarkMode ? "text-slate-400" : "text-slate-500";

  const handleConfirmDelete = useCallback(async () => {
    const quizId = Number(deleteTargetQuiz?.quizId ?? deleteTargetQuiz?.id);
    if (!Number.isInteger(quizId) || quizId <= 0 || deletingId) return;

    setDeletingId(quizId);
    try {
      await deleteQuiz(quizId);
      setDeleteTargetQuiz(null);
      await refetch();
    } catch (error) {
      console.error("Failed to delete mock test:", error);
      showError(error?.message || t("workspace.quiz.deleteFail"));
    } finally {
      setDeletingId(null);
    }
  }, [deleteTargetQuiz, deletingId, refetch, showError, t]);

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-5 sm:px-5 lg:px-6">
      <div
        className={`flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:gap-3 ${
          isDarkMode ? "border-slate-700" : "border-slate-200"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {typeof onNavigateHome === "function" ? (
            <HomeButton onClick={onNavigateHome} />
          ) : null}
          <div className="relative min-w-[220px] flex-1 sm:max-w-[420px] md:max-w-[460px] lg:max-w-[520px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                const { value } = event.target;
                startTransition(() => {
                  setSearchQuery(value);
                  setPage(1);
                });
              }}
              placeholder={t("workspace.listView.searchPlaceholder")}
              className={`h-11 w-full rounded-full border py-3 pl-10 pr-10 text-sm outline-none transition-colors ${
                isDarkMode
                  ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-orange-400"
                  : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-orange-400"
              }`}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 md:ml-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-11 rounded-full border-slate-200 px-4"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          {onCreateMockTest && !hideCreateButton ? (
            <Button
              type="button"
              onClick={onCreateMockTest}
              disabled={disableCreate}
              className="h-11 rounded-full bg-orange-500 px-5 text-white hover:bg-orange-600 disabled:opacity-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("workspace.listView.create")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : mockTests.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
            <ClipboardList className={`mb-3 h-12 w-12 ${isDarkMode ? "text-slate-600" : "text-slate-300"}`} />
            <p className={`text-sm ${mutedTextClass}`}>{t("workspace.mockTest.noItems")}</p>
            {onCreateMockTest && !hideCreateButton ? (
              <Button
                type="button"
                onClick={onCreateMockTest}
                disabled={disableCreate}
                className="mt-4 h-10 rounded-full bg-orange-500 px-4 text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="text-sm">{t("workspace.listView.create")}</span>
              </Button>
            ) : null}
          </div>
        ) : filteredMockTests.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
            <FolderOpen className={`mb-3 h-10 w-10 ${isDarkMode ? "text-slate-600" : "text-slate-300"}`} />
            <p className={`text-sm ${mutedTextClass}`}>{t("workspace.listView.noResults")}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pagedMockTests.map((mockTest) => {
                const resolvedQuizId = Number(mockTest?.quizId ?? mockTest?.id);
                const normalizedStatus = String(mockTest?.status || "").toUpperCase();
                const isProcessing = normalizedStatus === "PROCESSING";
                const isErrored = normalizedStatus === "ERROR";
                const isViewDisabled = isProcessing || isErrored;
                const statusStyles = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.DRAFT;
                const statusLabel = t(`quizListView.status.${normalizedStatus}`, normalizedStatus || "DRAFT");
                const difficultyKey = String(mockTest?.overallDifficulty || "").toUpperCase();
                const difficultyLabel = difficultyKey
                  ? (
                    difficultyKey === "CUSTOM"
                      ? t("quizListView.difficulty.custom", "Custom")
                      : t(`quizListView.difficulty.${String(mockTest?.overallDifficulty || "medium").toLowerCase()}`)
                  )
                  : t("quizListView.cards.notAvailable", "N/A");
                const difficultyTextClassName = difficultyKey === "HARD"
                  ? (isDarkMode ? "text-rose-300" : "text-rose-600")
                  : difficultyKey === "MEDIUM"
                    ? (isDarkMode ? "text-amber-300" : "text-amber-600")
                    : difficultyKey === "EASY"
                      ? (isDarkMode ? "text-emerald-300" : "text-emerald-600")
                      : (isDarkMode ? "text-slate-300" : "text-slate-600");
                const questionCount = resolveMockQuestionCount(mockTest);
                const durationInMinutes = getDurationInMinutes(mockTest);
                const durationLabel = durationInMinutes > 0
                  ? `${durationInMinutes} ${t("quizListView.cards.minutesShort", "min")}`
                  : null;
                const createdAtLabel = formatShortDate(mockTest?.createdAt || mockTest?.updatedAt);
                const processingPercent = clampPercent(
                  mockTest?.percent
                  ?? mockTest?.progressPercent
                  ?? mockTest?.processingPercent
                  ?? mockTest?.generationProgressPercent
                  ?? mockTest?.progress?.percent
                  ?? mockTest?.progress?.progressPercent
                  ?? 0,
                );
                const processingBarWidth = processingPercent > 0 ? Math.max(8, processingPercent) : 8;

                return (
                  <article
                    key={resolvedQuizId || mockTest?.title}
                    role={isViewDisabled ? undefined : "button"}
                    tabIndex={isViewDisabled ? -1 : 0}
                    onClick={() => {
                      if (isViewDisabled) return;
                      onViewMockTest?.(mockTest);
                    }}
                    onKeyDown={(event) => {
                      if (isViewDisabled) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onViewMockTest?.(mockTest);
                      }
                    }}
                    aria-disabled={isViewDisabled || undefined}
                    className={`group flex h-[204px] flex-col rounded-[24px] border px-5 py-4 transition-all duration-200 ${
                      isViewDisabled
                        ? (
                          isDarkMode
                            ? "cursor-not-allowed border-slate-800 bg-slate-900/70 opacity-80"
                            : "cursor-not-allowed border-slate-200 bg-slate-100/70 opacity-90"
                        )
                        : (
                          isDarkMode
                            ? "cursor-pointer border-slate-800 bg-slate-900/80 shadow-[0_28px_72px_-34px_rgba(2,6,23,0.7)] hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-[0_34px_86px_-34px_rgba(59,130,246,0.28)]"
                            : "cursor-pointer border-slate-300/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_28px_72px_-34px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_36px_90px_-36px_rgba(37,99,235,0.28)]"
                        )
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className={`line-clamp-2 min-h-[3.5rem] text-[21px] font-semibold leading-snug tracking-[-0.02em] ${isDarkMode ? "text-slate-100" : "text-slate-950"}`}>
                          {mockTest?.title || t("quizListView.cards.noTitle", "—")}
                        </h3>
                      </div>

                      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(event) => event.stopPropagation()}
                              className={`h-8 w-8 rounded-full ${
                                isDarkMode
                                  ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                                  : "text-slate-500 hover:bg-white hover:text-slate-900"
                              }`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className={`w-48 ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : ""}`}
                          >
                            <DropdownMenuItem
                              disabled={deletingId === resolvedQuizId}
                              onSelect={() => {
                                if (deletingId) return;
                                setDeleteTargetQuiz(mockTest);
                              }}
                              className={`cursor-pointer ${isDarkMode ? "text-red-300 focus:text-red-200" : "text-red-600 focus:text-red-600"}`}
                            >
                              {deletingId === resolvedQuizId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              <span>{t("workspace.quiz.deleteQuiz")}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {isProcessing ? (
                      <div className="mt-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className={`text-sm font-semibold ${isDarkMode ? "text-sky-200" : "text-sky-700"}`}>
                            {t("quizListView.cards.processing", "Generating quiz")}
                          </p>
                          <span className={`text-sm font-semibold ${isDarkMode ? "text-sky-200" : "text-sky-700"}`}>
                            {processingPercent}%
                          </span>
                        </div>
                        <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`}>
                          <div className="h-full rounded-full bg-sky-500" style={{ width: `${processingBarWidth}%` }} />
                        </div>
                      </div>
                    ) : null}

                    {isErrored ? (
                      <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${isDarkMode ? "bg-rose-950/40 text-rose-300" : "bg-rose-50 text-rose-700"}`}>
                        <CircleAlert className="h-4 w-4" />
                        <span>{statusLabel}</span>
                      </div>
                    ) : null}

                    <div className={`mt-4 flex items-center justify-between gap-3 text-[13px] ${isDarkMode ? "text-slate-300" : "text-slate-800"}`}>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{t("quizListView.cards.questions", "Questions")}</span>
                        <span className="font-semibold">{questionCount > 0 ? questionCount : "-"}</span>
                      </div>
                      <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDarkMode ? statusStyles.dark : statusStyles.light}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className={`mt-auto flex items-end justify-between gap-3 border-t pt-3 ${isDarkMode ? "mt-4 border-slate-800" : "mt-4 border-slate-200/80"}`}>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${difficultyTextClassName}`}>
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span>{difficultyLabel}</span>
                        </div>
                        {durationLabel ? (
                          <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                            <Timer className="h-3.5 w-3.5" />
                            <span>{durationLabel}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className={`flex flex-wrap items-center justify-end gap-2 text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isDarkMode ? "border-slate-700 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                          <ClipboardList className="h-3.5 w-3.5" />
                          <span>{t("workspace.shell.nav.mockTest", "Mock Test")}</span>
                        </span>
                        {createdAtLabel ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{createdAtLabel}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {showPagination ? (
              <div
                className={`mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${
                  isDarkMode ? "border-slate-700" : "border-slate-200"
                }`}
              >
                <p className={`text-xs ${mutedTextClass}`}>
                  {t("workspace.listView.pagination.pageInfo", {
                    page: effectivePage,
                    totalPages,
                    count: filteredMockTests.length,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full px-3"
                    disabled={effectivePage <= 1}
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    aria-label={t("workspace.listView.pagination.prev")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className={`text-xs font-medium ${mutedTextClass}`}>
                    {t("workspace.quiz.pagination.page")} {effectivePage}/{totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full px-3"
                    disabled={effectivePage >= totalPages}
                    onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                    aria-label={t("workspace.listView.pagination.next")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <Dialog
        open={Boolean(deleteTargetQuiz)}
        onOpenChange={(open) => {
          if (!open && !deletingId) setDeleteTargetQuiz(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("workspace.quiz.deleteQuiz")}</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block text-base font-semibold text-slate-900">
                {deleteTargetQuiz?.title}
              </span>
              <span className="block">{t("workspace.quiz.deleteConfirm")}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTargetQuiz(null)}
              disabled={Boolean(deletingId)}
            >
              {t("workspace.quiz.close")}
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleConfirmDelete}
              disabled={Boolean(deletingId)}
            >
              {deletingId
                ? t("workspace.quiz.actionButtons.deleting")
                : t("workspace.quiz.actionButtons.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MockTestListView;
