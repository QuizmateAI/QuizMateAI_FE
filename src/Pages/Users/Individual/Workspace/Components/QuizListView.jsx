import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, X, Plus, BadgeCheck, FolderOpen, Clock, RefreshCw, Trash2, Loader2, Timer, BarChart3, Play, ClipboardCheck } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/Components/ui/dialog";
import { getQuizzesByScope, deleteQuiz } from "@/api/QuizAPI";
import { useToast } from "@/context/ToastContext";
import { hasQuizCompleted } from "@/Utils/quizAttemptTracker";

function resolveWorkspaceRoadmapReturnPath(pathname, phaseId) {
  const match = pathname.match(/^\/workspace\/(\d+)/);
  if (!match || !phaseId) return null;
  return `/workspace/${match[1]}/roadmap?phaseId=${phaseId}`;
}

function extractWorkspaceIdFromPath(path) {
  if (!path) return null;
  const match = String(path).match(/^\/workspace\/(\d+)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function extractPhaseIdFromPath(path) {
  if (!path) return null;
  const match = String(path).match(/[?&]phaseId=(\d+)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// Hàm format ngày giờ ngắn gọn
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

// Cấu hình màu badge trạng thái quiz
const STATUS_STYLES = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
  COMPLETED: { light: "bg-blue-100 text-blue-700", dark: "bg-blue-950/50 text-blue-400" },
  INACTIVE: { light: "bg-slate-100 text-slate-500", dark: "bg-slate-800 text-slate-400" },
};

// Cấu hình màu badge intent
const INTENT_STYLES = {
  PRE_LEARNING: { light: "bg-purple-100 text-purple-700", dark: "bg-purple-950/50 text-purple-400" },
  POST_LEARNING: { light: "bg-cyan-100 text-cyan-700", dark: "bg-cyan-950/50 text-cyan-400" },
  PRACTICE: { light: "bg-orange-100 text-orange-700", dark: "bg-orange-950/50 text-orange-400" },
};

// Bộ lọc theo trạng thái
const STATUS_FILTER_OPTIONS = ["all", "ACTIVE", "DRAFT", "COMPLETED"];

function hasQuizListChanged(prevList, nextList) {
  if (!Array.isArray(prevList) || !Array.isArray(nextList)) return true;
  if (prevList.length !== nextList.length) return true;

  for (let i = 0; i < prevList.length; i += 1) {
    const prev = prevList[i];
    const next = nextList[i];
    if (!prev || !next) return true;

    if (
      prev.quizId !== next.quizId
      || prev.status !== next.status
      || prev.updatedAt !== next.updatedAt
      || prev.title !== next.title
    ) {
      return true;
    }
  }

  return false;
}

function getDurationInMinutes(quiz) {
  const rawDuration = Number(quiz?.duration) || 0;
  if (!rawDuration) return 0;

  const createVia = String(quiz?.createVia || '').toUpperCase();
  const isAiQuiz = createVia === 'AI';

  const rawTimerMode = quiz?.timerMode;
  const isTotalTimerMode = rawTimerMode === true
    || rawTimerMode === "true"
    || rawTimerMode === 1
    || rawTimerMode === "1"
    || rawTimerMode === "TOTAL";

  if (isAiQuiz) {
    // AI quizzes store quiz.duration in seconds.
    // Legacy FE bug may have multiplied once more before BE conversion.
    const normalizedSeconds = rawDuration >= 36000
      ? Math.floor(rawDuration / 60)
      : rawDuration;
    return Math.max(1, Math.round(normalizedSeconds / 60));
  }

  // Legacy FE bug sent minutes as seconds into durationInMinute, and BE converted again.
  // Example: 15 -> FE sends 900 -> BE stores 54000 seconds.
  const normalizedDurationInSeconds = isTotalTimerMode && rawDuration >= 36000
    ? Math.floor(rawDuration / 60)
    : rawDuration;

  // Total-mode duration is stored as seconds by BE (e.g. 900 = 15 minutes).
  if (isTotalTimerMode) {
    return Math.max(1, Math.round(normalizedDurationInSeconds / 60));
  }

  return rawDuration;
}

function QuizListView({
  isDarkMode,
  onCreateQuiz,
  onViewQuiz,
  contextType = "WORKSPACE",
  contextId,
  intentFilter = null,
  embedded = false,
  hideCreateButton = false,
  returnToPath = null,
  refreshToken = 0,
  disableCreate = false,
  title = "Quiz",
}) {
  const { t, i18n } = useTranslation();
  const { showError } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, quizId: null, mode: null });

  const resolvedReturnToPath = useMemo(() => {
    if (returnToPath) return returnToPath;
    if (contextType === "PHASE") {
      return resolveWorkspaceRoadmapReturnPath(location.pathname, contextId);
    }
    return `${location.pathname}${location.search || ""}`;
  }, [contextId, contextType, location.pathname, location.search, returnToPath]);

  const quizNavigationSourceState = useMemo(() => {
    const normalizedContextType = String(contextType || "").toUpperCase();
    const normalizedContextId = Number(contextId);
    const workspaceIdFromReturnPath = extractWorkspaceIdFromPath(resolvedReturnToPath);
    const workspaceIdFromLocation = extractWorkspaceIdFromPath(location.pathname);
    const sourceWorkspaceId = workspaceIdFromReturnPath || workspaceIdFromLocation || null;

    const phaseIdFromContext = normalizedContextType === "PHASE" && Number.isInteger(normalizedContextId) && normalizedContextId > 0
      ? normalizedContextId
      : null;
    const phaseIdFromReturnPath = extractPhaseIdFromPath(resolvedReturnToPath);
    const sourcePhaseId = phaseIdFromContext || phaseIdFromReturnPath || null;

    const isRoadmapContextType = ["ROADMAP", "PHASE", "KNOWLEDGE"].includes(normalizedContextType);
    const isRoadmapPath = /\/workspace\/\d+\/roadmap(?:\/|$|\?)/.test(String(resolvedReturnToPath || ""))
      || /\/workspace\/\d+\/roadmap(?:\/|$)/.test(String(location.pathname || ""));

    return {
      sourceView: isRoadmapContextType || isRoadmapPath ? "roadmap" : "quiz-panel",
      sourceWorkspaceId,
      sourcePhaseId,
    };
  }, [contextId, contextType, location.pathname, resolvedReturnToPath]);

  // Lấy danh sách quiz từ API theo context hiện tại (workspace/roadmap/phase/knowledge)
  const fetchQuizzes = useCallback(async ({ silent = false, scopeId = contextId } = {}) => {
    if (!scopeId) {
      setQuizzes([]);
      return;
    }

    if (!silent) setLoading(true);
    try {
      const res = await getQuizzesByScope(contextType, scopeId);
      let incoming = res.data || [];
      
      // Studio filter: exclude roadmap-related quizzes when in WORKSPACE context
      if (contextType === 'WORKSPACE') {
        incoming = incoming.filter(quiz => {
          const qContext = String(quiz.contextType || '').toUpperCase();
          if (['ROADMAP', 'PHASE', 'KNOWLEDGE'].includes(qContext)) return false;
          if (Number(quiz.roadmapId) > 0 || Number(quiz.phaseId) > 0 || Number(quiz.knowledgeId) > 0) return false;
          return true;
        });
      }

      if (Array.isArray(intentFilter) && intentFilter.length > 0) {
        const normalizedIntents = intentFilter.map((intent) => String(intent).toUpperCase());
        incoming = incoming.filter((quiz) => normalizedIntents.includes(String(quiz?.quizIntent || "").toUpperCase()));
      }
      
      setQuizzes((prev) => (hasQuizListChanged(prev, incoming) ? incoming : prev));

    } catch (err) {
      console.error("Lỗi khi lấy danh sách quiz:", err);
      if (!silent) setQuizzes([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [contextId, contextType, intentFilter]);

  // Gọi API khi component mount hoặc context thay đổi
  useEffect(() => {
    fetchQuizzes({ scopeId: contextId });
  }, [contextId, fetchQuizzes]);

  // Refetch khi parent báo có cập nhật realtime (websocket/polling hoàn tất).
  useEffect(() => {
    if (!contextId) return;
    fetchQuizzes({ silent: true, scopeId: contextId });
  }, [contextId, fetchQuizzes, refreshToken]);

  // Chỉ polling khi còn quiz PROCESSING, và polling silent để tránh lag cả màn.
  useEffect(() => {
    const hasProcessingQuiz = quizzes.some((q) => String(q?.status || "").toUpperCase() === "PROCESSING");
    if (!hasProcessingQuiz) return undefined;

    const timer = setInterval(() => {
      fetchQuizzes({ silent: true });
    }, 4000);

    return () => clearInterval(timer);
  }, [quizzes, fetchQuizzes]);

  // Xử lý xóa quiz
  const handleDeleteQuiz = useCallback(async (e, quizId) => {
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(quizId);
    try {
      await deleteQuiz(quizId);
      // Cập nhật danh sách sau khi xóa thành công
      setQuizzes((prev) => prev.filter((q) => q.quizId !== quizId));
    } catch (err) {
      console.error("Lỗi khi xóa quiz:", err);
      showError(err?.message || t("workspace.quiz.deleteFail", "Xóa quiz thất bại"));
    } finally {
      setDeletingId(null);
    }
  }, [deletingId, showError, t]);

  // Lọc quiz theo trạng thái và tìm kiếm
  const filtered = useMemo(() => {
    let items = quizzes;
    if (filterStatus !== "all") items = items.filter((q) => q.status === filterStatus);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((q) => q.title?.toLowerCase().includes(query));
    }
    return items;
  }, [quizzes, searchQuery, filterStatus]);

  return (
    <div className={`${embedded ? "" : "h-full flex flex-col"} ${fontClass}`}>
      {/* Header */}
      {!embedded ? (
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-blue-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>{title}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
            {quizzes.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => fetchQuizzes({ scopeId: contextId })} disabled={loading}
            className={`rounded-full h-9 w-9 p-0 ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {!hideCreateButton ? (
          <Button disabled={disableCreate} onClick={onCreateQuiz} className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-full h-9 px-4 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2563EB]">
            <Plus className="w-4 h-4" /><span className="text-sm">{t("workspace.listView.create")}</span>
          </Button>
          ) : null}
        </div>
      </div>
      ) : null}

      {/* Tìm kiếm + Lọc theo trạng thái */}
      {!embedded ? (
      <div className="px-4 py-3 flex flex-col gap-3">
        <div className="relative max-w-sm">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("workspace.listView.searchPlaceholder")}
            className={`w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-colors ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500" : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"}`} />
          {searchQuery && <button onClick={() => setSearchQuery("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => setFilterStatus(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterStatus === opt
                ? isDarkMode ? "bg-blue-950/50 text-blue-400" : "bg-blue-100 text-blue-700"
                : isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-100"
              }`}>
              {t(`workspace.quiz.statusFilter.${opt}`)}
            </button>
          ))}
        </div>
      </div>
      ) : null}

      {/* Danh sách quiz */}
      <div className={`${embedded ? "px-0" : "flex-1 overflow-y-auto px-4 pb-4"}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className={`w-8 h-8 animate-spin mb-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.loading")}</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {t("workspace.roadmap.noQuizYet")}
            </p>
            {!hideCreateButton ? (
            <Button
              disabled={disableCreate}
              onClick={onCreateQuiz}
              className="mt-4 bg-[#2563EB] hover:bg-blue-700 text-white rounded-full h-9 px-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2563EB]"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">{t("workspace.studio.actions.createQuiz")}</span>
            </Button>
            ) : null}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderOpen className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.listView.noResults")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((quiz) => {
              const ss = STATUS_STYLES[quiz.status] || STATUS_STYLES.DRAFT;
              const is = INTENT_STYLES[quiz.quizIntent] || {};
              const completed = hasQuizCompleted(quiz.quizId);
              const durationInMinutes = getDurationInMinutes(quiz);
              return (
                <div
                  key={quiz.quizId}
                  onClick={() => onViewQuiz?.(quiz)}
                  className={`relative rounded-xl border overflow-hidden h-[104px] cursor-pointer shadow-[0_10px_20px_rgba(51,51,51,0.12)] transition-all duration-300 group ${
                    isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div
                    className="absolute inset-0 px-4 py-3 flex items-center gap-3 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.23,1,0.320,1)] group-hover:-translate-x-full"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? "bg-blue-950/40" : "bg-blue-100"}`}>
                      <BadgeCheck className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{quiz.title}</p>
                      <div className={`flex items-center gap-2 mt-1 text-xs ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                        {durationInMinutes > 0 && (
                          <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />{durationInMinutes} {t("workspace.quiz.minutes")}
                          </span>
                        )}
                        {quiz.overallDifficulty && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />{t(`workspace.quiz.difficultyLevels.${quiz.overallDifficulty.toLowerCase()}`)}
                          </span>
                        )}
                      </div>
                      <div className={`flex items-center gap-3 mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatShortDate(quiz.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`absolute inset-0 px-4 py-3 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.23,1,0.320,1)] translate-x-full group-hover:translate-x-0 ${
                      isDarkMode
                        ? "bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950/60"
                        : "bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100"
                    }`}
                  >
                    <div className="h-full flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        {quiz.quizIntent && (
                          <span className={`text-sm px-3 py-1.5 rounded-full font-semibold ${isDarkMode ? is.dark || "bg-slate-800 text-slate-400" : is.light || "bg-gray-100 text-gray-500"}`}>
                            {t(`workspace.quiz.intentLabels.${quiz.quizIntent}`)}
                          </span>
                        )}
                        <span className={`text-sm px-3.5 py-1.5 rounded-full font-semibold ${isDarkMode ? ss.dark : ss.light}`}>
                          {t(`workspace.quiz.statusLabels.${quiz.status}`)}
                        </span>
                        {typeof quiz.timerMode === "boolean" && (
                          <span className={`text-sm px-3 py-1.5 rounded-full font-semibold ${quiz.timerMode
                            ? (isDarkMode ? "bg-blue-950/40 text-blue-300" : "bg-blue-100 text-blue-700")
                            : (isDarkMode ? "bg-emerald-950/40 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                          }`}>
                            {quiz.timerMode
                              ? t("workspace.quiz.examModeType1", "Exam giới hạn thời gian tổng")
                              : t("workspace.quiz.examModeType2", "Exam theo từng câu")}
                          </span>
                        )}
                        {quiz.status !== "DRAFT" && quiz.status !== "PROCESSING" && (
                          <span className={`text-sm px-3 py-1.5 rounded-full font-semibold ${completed
                            ? (isDarkMode ? "bg-blue-950/50 text-blue-300" : "bg-blue-100 text-blue-700")
                            : (isDarkMode ? "bg-slate-700 text-slate-300" : "bg-gray-200 text-gray-600")
                          }`}>
                            {completed
                              ? t("workspace.quiz.completed", "Đã làm")
                              : t("workspace.quiz.notCompleted", "Chưa làm")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2.5">
                        {quiz.status === "ACTIVE" && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDialog({ open: true, quizId: quiz.quizId, mode: 'practice' }); }}
                              className={`px-3 py-2.5 rounded-xl transition-all inline-flex items-center gap-1.5 text-sm font-semibold ${isDarkMode ? "hover:bg-blue-950/40 text-blue-300" : "hover:bg-blue-100 text-blue-700"}`}
                              title={t("workspace.quiz.practice", "Practice")}
                            >
                              <Play className="w-5 h-5" />
                              <span>{t("workspace.quiz.actionButtons.practice", "Practice")}</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDialog({ open: true, quizId: quiz.quizId, mode: 'exam' }); }}
                              className={`px-3 py-2.5 rounded-xl transition-all inline-flex items-center gap-1.5 text-sm font-semibold ${isDarkMode ? "hover:bg-emerald-950/40 text-emerald-300" : "hover:bg-emerald-100 text-emerald-700"}`}
                              title={t("workspace.quiz.exam", "Exam")}
                            >
                              <ClipboardCheck className="w-5 h-5" />
                              <span>{t("workspace.quiz.actionButtons.exam", "Exam")}</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => handleDeleteQuiz(e, quiz.quizId)}
                          disabled={deletingId === quiz.quizId}
                          className={`px-3 py-2.5 rounded-xl transition-all inline-flex items-center gap-1.5 text-sm font-semibold ${isDarkMode ? "hover:bg-red-950/40 text-red-300" : "hover:bg-red-100 text-red-600"}`}
                          title={t("workspace.quiz.deleteQuiz")}
                        >
                          {deletingId === quiz.quizId ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                          <span>{deletingId === quiz.quizId ? t("workspace.quiz.actionButtons.deleting", "Deleting...") : t("workspace.quiz.actionButtons.delete", "Delete")}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, quizId: null, mode: null })}>
        <DialogContent className={isDarkMode ? "bg-slate-800 border-slate-700 text-white" : ""}>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.mode
                ? (confirmDialog.mode === 'practice' ? t("workspace.quiz.practice", "Practice") : t("workspace.quiz.exam", "Exam"))
                : t("workspace.quiz.chooseMode", "Choose quiz mode")}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? "text-slate-400" : ""}>
              {confirmDialog.mode
                ? (confirmDialog.mode === 'practice'
                    ? t("workspace.quiz.confirmPractice", "Are you sure you want to start this quiz in Practice mode? You can review answers as you go.")
                    : t("workspace.quiz.confirmExam", "Are you sure you want to start this quiz in Exam mode? Timer will begin immediately."))
                : t("workspace.quiz.chooseModeDescription", "Select Practice or Exam to start this quiz.")}
            </DialogDescription>
          </DialogHeader>
          {confirmDialog.mode ? (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setConfirmDialog({ open: false, quizId: null, mode: null })}>{t("common.cancel", "Cancel")}</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { navigate(`/quiz/${confirmDialog.mode}/${confirmDialog.quizId}`, { state: { returnToQuizPath: resolvedReturnToPath, ...quizNavigationSourceState } }); setConfirmDialog({ open: false, quizId: null, mode: null }); }}>
                {t("common.confirm", "Confirm")}
              </Button>
            </DialogFooter>
          ) : (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setConfirmDialog({ open: false, quizId: null, mode: null })}>{t("common.cancel", "Cancel")}</Button>
              <Button variant="outline" onClick={() => setConfirmDialog((prev) => ({ ...prev, mode: 'practice' }))}>{t("workspace.quiz.practice", "Practice")}</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setConfirmDialog((prev) => ({ ...prev, mode: 'exam' }))}>{t("workspace.quiz.exam", "Exam")}</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default QuizListView;
