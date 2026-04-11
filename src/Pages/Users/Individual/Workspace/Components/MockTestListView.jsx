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
  AlertTriangle,
  ClipboardList,
  Clock,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Search,
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
import { deleteQuiz, getQuizzesByScope } from "@/api/QuizAPI";
import { getRoadmapsByWorkspace } from "@/api/RoadmapAPI";
import { useToast } from "@/context/ToastContext";

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

async function loadMockTests({ contextType, contextId, t }) {
  if (!contextId) {
    return { items: [], roadmapIds: [] };
  }

  if (String(contextType || "").toUpperCase() === "WORKSPACE") {
    const response = await getQuizzesByScope("WORKSPACE", contextId);
    const rawQuizzes = response?.data ?? [];
    const quizzes = Array.isArray(rawQuizzes) ? rawQuizzes : [];

    return {
      items: quizzes.map((item) => ({
        ...item,
        roadmapName:
          item?.roadmapName
          || item?.roadmap?.title
          || item?.roadmap?.name
          || t("workspace.mockTest.workspaceLabel", "Workspace"),
      })),
      roadmapIds: [],
    };
  }

  const roadmapResponse = await getRoadmapsByWorkspace(contextId, 0, 100);
  const rawRoadmaps = roadmapResponse?.data?.content ?? roadmapResponse?.data;
  const roadmaps = Array.isArray(rawRoadmaps) ? rawRoadmaps : [];
  const roadmapIds = roadmaps
    .map((roadmap) => Number(roadmap?.roadmapId ?? roadmap?.id))
    .filter((roadmapId) => Number.isInteger(roadmapId) && roadmapId > 0);

  const quizResults = await Promise.all(
    roadmaps.map(async (roadmap) => {
      const roadmapId = Number(roadmap?.roadmapId ?? roadmap?.id);
      if (!Number.isInteger(roadmapId) || roadmapId <= 0) return [];

      try {
        const response = await getQuizzesByScope("ROADMAP", roadmapId);
        const rawQuizzes = response?.data ?? [];
        const quizzes = Array.isArray(rawQuizzes) ? rawQuizzes : [];

        return quizzes.map((quiz) => ({
          ...quiz,
          roadmapId,
          roadmapName:
            roadmap?.title
            || roadmap?.name
            || t("workspace.roadmap.fallbackName", {
              id: roadmapId,
              defaultValue: `Roadmap ${roadmapId}`,
            }),
        }));
      } catch {
        return [];
      }
    }),
  );

  return {
    items: quizResults.flat(),
    roadmapIds,
  };
}

function MockTestListView({
  onCreateMockTest,
  onNavigateHome,
  onViewMockTest,
  contextType = "WORKSPACE",
  contextId,
}) {
  const { t, i18n } = useTranslation();
  const { showError } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const normalizedContextId = Number(contextId) || 0;
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTargetQuiz, setDeleteTargetQuiz] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const {
    data: mockTestPayload = { items: [], roadmapIds: [] },
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["workspace-mock-tests", String(contextType || "").toUpperCase(), normalizedContextId],
    enabled: normalizedContextId > 0,
    queryFn: () =>
      loadMockTests({
        contextType,
        contextId: normalizedContextId,
        t,
      }),
  });

  const mockTests = mockTestPayload.items || [];
  const roadmapIds = mockTestPayload.roadmapIds || [];

  const allRoadmapsCovered = useMemo(() => {
    if (String(contextType || "").toUpperCase() === "WORKSPACE") return false;
    if (roadmapIds.length === 0) return false;
    const coveredIds = new Set(
      mockTests
        .map((item) => Number(item?.roadmapId))
        .filter((roadmapId) => Number.isInteger(roadmapId) && roadmapId > 0),
    );
    return roadmapIds.every((roadmapId) => coveredIds.has(roadmapId));
  }, [contextType, mockTests, roadmapIds]);

  const filteredMockTests = useMemo(
    () =>
      mockTests.filter((item) => {
        if (!deferredSearchQuery) return true;

        return [item?.title, item?.roadmapName, item?.description].some((value) =>
          String(value || "").toLowerCase().includes(deferredSearchQuery),
        );
      }),
    [deferredSearchQuery, mockTests],
  );

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
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {typeof onNavigateHome === "function" ? (
            <HomeButton onClick={onNavigateHome} />
          ) : null}
          <div className="relative min-w-[220px] flex-1 sm:max-w-[420px] md:max-w-[460px] lg:max-w-[520px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                startTransition(() => setSearchQuery(event.target.value))
              }
              placeholder={t("workspace.listView.searchPlaceholder")}
              className="h-11 w-full rounded-full border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-orange-400"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
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
          {onCreateMockTest ? (
            <Button
              type="button"
              onClick={onCreateMockTest}
              disabled={allRoadmapsCovered}
              className="h-11 rounded-full bg-orange-500 px-5 text-white hover:bg-orange-600 disabled:opacity-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("workspace.listView.create")}
            </Button>
          ) : null}
        </div>
      </div>

      {allRoadmapsCovered ? (
        <div className="mt-3 inline-flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t("workspace.mockTest.allRoadmapsCovered")}</span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : mockTests.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
            <ClipboardList className="mb-4 h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-500">{t("workspace.mockTest.noItems")}</p>
            {onCreateMockTest ? (
              <Button
                type="button"
                onClick={onCreateMockTest}
                disabled={allRoadmapsCovered}
                className="mt-4 rounded-full bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("workspace.listView.create")}
              </Button>
            ) : null}
          </div>
        ) : filteredMockTests.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
            <FolderOpen className="mb-4 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">{t("workspace.listView.noResults")}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredMockTests.map((mockTest) => {
              const resolvedQuizId = Number(mockTest?.quizId ?? mockTest?.id);

              return (
                <article
                  key={resolvedQuizId || mockTest?.title}
                  onClick={() => onViewMockTest?.(mockTest)}
                  className="group flex cursor-pointer items-start gap-4 px-1 py-4 transition-colors hover:bg-slate-50/70"
                  style={{ contentVisibility: "auto" }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold text-slate-900 ${fontClass}`}>
                      {mockTest?.title || "—"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {mockTest?.duration > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {mockTest.duration} {t("workspace.quiz.minutes")}
                        </span>
                      ) : null}
                      {mockTest?.createdAt ? <span>{formatShortDate(mockTest.createdAt)}</span> : null}
                      {mockTest?.roadmapName ? <span>{mockTest.roadmapName}</span> : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (deletingId) return;
                      setDeleteTargetQuiz(mockTest);
                    }}
                    className="rounded-xl p-2 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                    title={t("workspace.quiz.deleteQuiz")}
                  >
                    {deletingId === resolvedQuizId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </article>
              );
            })}
          </div>
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
