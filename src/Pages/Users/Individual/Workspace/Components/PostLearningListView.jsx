import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Search, X, GraduationCap, FolderOpen, Clock, RefreshCw, Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { deleteQuiz, getQuizzesByScope } from "@/api/QuizAPI";
import { getRoadmapsByWorkspace, getPhasesByRoadmap } from "@/api/RoadmapAPI";
import { useToast } from "@/context/ToastContext";

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

const STATUS_STYLE = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
};

function PostLearningListView({ isDarkMode, onCreatePostLearning, onViewPostLearning, contextType = "WORKSPACE", contextId }) {
  const { t, i18n } = useTranslation();
  const { showError } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = useState("");
  const [postLearnings, setPostLearnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTargetQuiz, setDeleteTargetQuiz] = useState(null);
  const [allPhaseIds, setAllPhaseIds] = useState([]);

  const fetchPostLearnings = useCallback(async () => {
    if (!contextId) return;
    setLoading(true);
    try {
      const roadmapRes = await getRoadmapsByWorkspace(contextId, 0, 100);
      const roadmaps = roadmapRes.data?.content || roadmapRes.data || [];

      const allPhases = [];
      for (const rm of roadmaps) {
        const rmId = rm.roadmapId || rm.id;
        try {
          const phaseRes = await getPhasesByRoadmap(rmId, 0, 100);
          const phases = phaseRes?.data?.data?.content || phaseRes?.data?.content || [];
          phases.forEach((ph) => {
            allPhases.push({
              phaseId: ph.phaseId || ph.id,
              phaseName: ph.title || ph.name || `Phase #${ph.phaseId || ph.id}`,
              roadmapName: rm.title || rm.name || `Roadmap #${rmId}`,
              roadmapId: rmId,
            });
          });
        } catch {
          // Bỏ qua roadmap không có phase
        }
      }
      setAllPhaseIds(allPhases.map((p) => p.phaseId));

      const allPostLearnings = [];
      for (const ph of allPhases) {
        try {
          const quizRes = await getQuizzesByScope("PHASE", ph.phaseId);
          const quizzes = quizRes.data || [];
          quizzes.forEach((q) => {
            allPostLearnings.push({
              ...q,
              phaseName: ph.phaseName,
              phaseId: ph.phaseId,
              roadmapName: ph.roadmapName,
            });
          });
        } catch {
          // Bỏ qua phase không có quiz
        }
      }
      setPostLearnings(allPostLearnings);
    } catch (err) {
      console.error("Lỗi tải danh sách post-learning:", err);
      setPostLearnings([]);
    } finally {
      setLoading(false);
    }
  }, [contextId]);

  useEffect(() => {
    fetchPostLearnings();
  }, [fetchPostLearnings]);

  const allPhasesCovered = useMemo(() => {
    if (allPhaseIds.length === 0) return false;
    const coveredIds = new Set(postLearnings.map((pl) => pl.phaseId || pl.contextId));
    return allPhaseIds.every((id) => coveredIds.has(id));
  }, [allPhaseIds, postLearnings]);

  const handleRequestDelete = useCallback((e, quiz) => {
    e.stopPropagation();
    if (deletingId) return;
    setDeleteTargetQuiz(quiz);
  }, [deletingId]);

  const handleConfirmDelete = useCallback(async () => {
    const quizId = Number(deleteTargetQuiz?.quizId ?? deleteTargetQuiz?.id);
    if (!Number.isInteger(quizId) || quizId <= 0 || deletingId) return;

    setDeletingId(quizId);
    try {
      await deleteQuiz(quizId);
      setPostLearnings((prev) => prev.filter((q) => q.quizId !== quizId));
      setDeleteTargetQuiz(null);
    } catch (err) {
      console.error("Lỗi xóa post-learning:", err);
      showError(err?.message || t("workspace.quiz.deleteFail", "Xóa quiz thất bại"));
    } finally {
      setDeletingId(null);
    }
  }, [deleteTargetQuiz, deletingId, showError, t]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return postLearnings;
    const query = searchQuery.toLowerCase();
    return postLearnings.filter((pl) =>
      pl.title?.toLowerCase().includes(query)
      || pl.phaseName?.toLowerCase().includes(query)
      || pl.roadmapName?.toLowerCase().includes(query)
    );
  }, [postLearnings, searchQuery]);

  return (
    <div className={`h-full flex flex-col ${fontClass}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-orange-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>Post-learning</p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
            {postLearnings.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchPostLearnings}
            disabled={loading}
            className={`rounded-full h-9 w-9 p-0 ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {onCreatePostLearning && (
            <Button
              onClick={onCreatePostLearning}
              disabled={allPhasesCovered}
              className={`rounded-full h-9 px-4 flex items-center gap-2 transition-all active:scale-95 ${
                allPhasesCovered
                  ? "bg-gray-400 cursor-not-allowed opacity-60"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">{t("workspace.listView.create")}</span>
            </Button>
          )}
        </div>
      </div>

      {allPhasesCovered && !loading && (
        <div className={`mx-4 mt-3 px-3 py-2 rounded-lg flex items-center gap-2 text-xs ${isDarkMode ? "bg-amber-950/30 text-amber-400" : "bg-amber-50 text-amber-700"}`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {t("workspace.postLearning.allPhasesCovered")}
        </div>
      )}

      <div className="px-4 py-3">
        <div className="relative max-w-sm">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("workspace.listView.searchPlaceholder")}
            className={`w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-colors ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500" : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"}`}
          />
          {searchQuery && <button onClick={() => setSearchQuery("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}><X className="w-4 h-4" /></button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className={`w-6 h-6 animate-spin ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderOpen className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {searchQuery ? t("workspace.listView.noResults") : t("workspace.postLearning.noItems")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((pl) => {
              const statusStyle = STATUS_STYLE[pl.status] || STATUS_STYLE.DRAFT;
              const currentQuizId = pl.quizId ?? pl.id;

              return (
                <div
                  key={pl.quizId}
                  onClick={() => onViewPostLearning?.(pl)}
                  className={`rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-all ${isDarkMode ? "bg-slate-800/50 hover:bg-slate-800 border border-slate-800" : "bg-gray-50 hover:bg-gray-100 border border-gray-100"}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? "bg-orange-950/40" : "bg-orange-100"}`}>
                    <GraduationCap className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{pl.title}</p>
                    <p className={`text-xs mt-0.5 flex items-center gap-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      {pl.duration > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{pl.duration} {t("workspace.quiz.minutes")}</span>}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${isDarkMode ? statusStyle.dark : statusStyle.light}`}>
                        {t(`workspace.quiz.statusLabels.${pl.status}`)}
                      </span>
                    </p>
                    <div className={`flex items-center gap-3 mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t("workspace.listView.createdAt")}: {formatShortDate(pl.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDarkMode ? "bg-blue-950/50 text-blue-400" : "bg-blue-100 text-blue-700"}`}>
                      {pl.phaseName}
                    </span>
                    <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                      {pl.roadmapName}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleRequestDelete(e, pl)}
                    className={`p-1.5 rounded-lg transition-all active:scale-95 ${isDarkMode ? "hover:bg-red-950/30" : "hover:bg-red-50"}`}
                  >
                    {deletingId === currentQuizId ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                  </button>
                </div>
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
            <DialogTitle>{t("workspace.quiz.deleteQuiz", "Xóa quiz")}</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block text-base font-semibold text-slate-900 dark:text-slate-100">
                {deleteTargetQuiz?.title}
              </span>
              <span className="block">
                {t("workspace.quiz.deleteConfirm", "Bạn có chắc chắn không?")}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTargetQuiz(null)}
              disabled={Boolean(deletingId)}
            >
              {t("workspace.quiz.close", "Đóng")}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmDelete}
              disabled={Boolean(deletingId)}
            >
              {deletingId
                ? t("workspace.quiz.actionButtons.deleting", "Deleting...")
                : t("workspace.quiz.actionButtons.delete", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PostLearningListView;
