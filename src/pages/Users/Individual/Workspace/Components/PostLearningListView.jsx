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
  FolderOpen,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Search,
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
import { deleteQuiz, getQuizzesByScope } from "@/api/QuizAPI";
import {
  getPhasesByRoadmap,
  getRoadmapsByWorkspace,
} from "@/api/RoadmapAPI";
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

async function loadPostLearnings({ contextId, t }) {
  if (!contextId) {
    return { items: [], phaseIds: [] };
  }

  const roadmapResponse = await getRoadmapsByWorkspace(contextId, 0, 100);
  const rawRoadmaps = roadmapResponse?.data?.content ?? roadmapResponse?.data;
  const roadmaps = Array.isArray(rawRoadmaps) ? rawRoadmaps : [];

  const phaseResults = await Promise.all(
    roadmaps.map(async (roadmap) => {
      const roadmapId = Number(roadmap?.roadmapId ?? roadmap?.id);
      if (!Number.isInteger(roadmapId) || roadmapId <= 0) return [];

      try {
        const response = await getPhasesByRoadmap(roadmapId, 0, 100);
        const rawPhases =
          response?.data?.data?.content
          ?? response?.data?.content
          ?? response?.data;
        const phases = Array.isArray(rawPhases) ? rawPhases : [];

        return phases.map((phase) => ({
          phaseId: Number(phase?.phaseId ?? phase?.id),
          phaseName:
            phase?.title
            || phase?.name
            || t("workspace.phase.fallbackName", {
              id: Number(phase?.phaseId ?? phase?.id),
              defaultValue: `Phase ${Number(phase?.phaseId ?? phase?.id)}`,
            }),
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

  const phases = phaseResults.flat().filter((phase) =>
    Number.isInteger(phase.phaseId) && phase.phaseId > 0,
  );

  const quizResults = await Promise.all(
    phases.map(async (phase) => {
      try {
        const response = await getQuizzesByScope("PHASE", phase.phaseId);
        const rawQuizzes = response?.data ?? [];
        const quizzes = Array.isArray(rawQuizzes) ? rawQuizzes : [];

        return quizzes.map((quiz) => ({
          ...quiz,
          phaseId: phase.phaseId,
          phaseName: phase.phaseName,
          roadmapId: phase.roadmapId,
          roadmapName: phase.roadmapName,
        }));
      } catch {
        return [];
      }
    }),
  );

  return {
    items: quizResults.flat(),
    phaseIds: phases.map((phase) => phase.phaseId),
  };
}

function PostLearningListView({
  onCreatePostLearning,
  onViewPostLearning,
  contextType = "WORKSPACE",
  contextId,
  isDarkMode = false,
}) {
  const { t, i18n } = useTranslation();
  const { showError } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const mutedTextClass = isDarkMode ? "text-slate-400" : "text-slate-500";
  const normalizedContextId = Number(contextId) || 0;
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTargetQuiz, setDeleteTargetQuiz] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const {
    data: postLearningPayload = { items: [], phaseIds: [] },
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["workspace-post-learning", String(contextType || "").toUpperCase(), normalizedContextId],
    enabled: normalizedContextId > 0,
    queryFn: () => loadPostLearnings({ contextId: normalizedContextId, t }),
  });

  const postLearnings = postLearningPayload.items || [];
  const phaseIds = postLearningPayload.phaseIds || [];

  const allPhasesCovered = useMemo(() => {
    if (phaseIds.length === 0) return false;
    const coveredIds = new Set(
      postLearnings
        .map((item) => Number(item?.phaseId ?? item?.contextId))
        .filter((phaseId) => Number.isInteger(phaseId) && phaseId > 0),
    );
    return phaseIds.every((phaseId) => coveredIds.has(phaseId));
  }, [phaseIds, postLearnings]);

  const filteredPostLearnings = useMemo(
    () =>
      postLearnings.filter((item) => {
        if (!deferredSearchQuery) return true;

        return [item?.title, item?.phaseName, item?.roadmapName].some((value) =>
          String(value || "").toLowerCase().includes(deferredSearchQuery),
        );
      }),
    [deferredSearchQuery, postLearnings],
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
      console.error("Failed to delete post-learning:", error);
      showError(error?.message || t("workspace.quiz.deleteFail"));
    } finally {
      setDeletingId(null);
    }
  }, [deleteTargetQuiz, deletingId, refetch, showError, t]);

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-5 sm:px-5 lg:px-6">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className={`truncate text-lg font-semibold text-slate-950 ${fontClass}`}>
              {t("workspace.studio.actions.postLearning")}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {postLearnings.length}
          </span>
        </div>

        <div className="relative min-w-[220px] flex-1 sm:max-w-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) =>
              startTransition(() => setSearchQuery(event.target.value))
            }
            placeholder={t("workspace.listView.searchPlaceholder")}
            className="h-12 w-full rounded-full border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-amber-400"
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

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-12 rounded-full border-slate-200 px-4"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          {onCreatePostLearning ? (
            <Button
              type="button"
              onClick={onCreatePostLearning}
              disabled={allPhasesCovered}
              className="h-12 rounded-full bg-amber-500 px-5 text-white hover:bg-amber-600 disabled:opacity-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("workspace.listView.create")}
            </Button>
          ) : null}
        </div>
      </div>

      {allPhasesCovered ? (
        <div className="mt-3 inline-flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t("workspace.postLearning.allPhasesCovered")}</span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : postLearnings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
            <GraduationCap className={`mb-4 h-12 w-12 ${isDarkMode ? "text-slate-600" : "text-slate-300"}`} />
            <p className={`text-sm ${mutedTextClass}`}>{t("workspace.postLearning.noItems")}</p>
            {onCreatePostLearning ? (
              <Button
                type="button"
                onClick={onCreatePostLearning}
                disabled={allPhasesCovered}
                className="mt-4 rounded-full bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("workspace.listView.create")}
              </Button>
            ) : null}
          </div>
        ) : filteredPostLearnings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
            <FolderOpen className={`mb-4 h-10 w-10 ${isDarkMode ? "text-slate-600" : "text-slate-300"}`} />
            <p className={`text-sm ${mutedTextClass}`}>{t("workspace.listView.noResults")}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredPostLearnings.map((postLearning) => {
              const resolvedQuizId = Number(postLearning?.quizId ?? postLearning?.id);

              return (
                <article
                  key={resolvedQuizId || postLearning?.title}
                  onClick={() => onViewPostLearning?.(postLearning)}
                  className="group flex cursor-pointer items-start gap-4 px-1 py-4 transition-colors hover:bg-slate-50/70"
                  style={{ contentVisibility: "auto" }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold text-slate-900 ${fontClass}`}>
                      {postLearning?.title || "—"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {postLearning?.createdAt ? <span>{formatShortDate(postLearning.createdAt)}</span> : null}
                      {postLearning?.phaseName ? <span>{postLearning.phaseName}</span> : null}
                      {postLearning?.roadmapName ? <span>{postLearning.roadmapName}</span> : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (deletingId) return;
                      setDeleteTargetQuiz(postLearning);
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

export default PostLearningListView;
