import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, X, Plus, BadgeCheck, FolderOpen, Clock, RefreshCw, Trash2, Loader2, Timer, BarChart3, Play, ClipboardCheck, Globe, Lock, MoreVertical } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { getQuizzesByScope, deleteQuiz, getQuizById } from "@/api/QuizAPI";
import { useToast } from "@/context/ToastContext";

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

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
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

function formatCardDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Cấu hình màu badge trạng thái quiz
const STATUS_STYLES = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
  COMPLETED: { light: "bg-blue-100 text-blue-700", dark: "bg-blue-950/50 text-blue-400" },
  INACTIVE: { light: "bg-slate-100 text-slate-500", dark: "bg-slate-800 text-slate-400" },
  PROCESSING: { light: "bg-sky-100 text-sky-700", dark: "bg-sky-950/50 text-sky-300" },
  ERROR: { light: "bg-rose-100 text-rose-700", dark: "bg-rose-950/50 text-rose-300" },
};

const DIFFICULTY_STYLES = {
  EASY: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-300" },
  MEDIUM: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-300" },
  HARD: { light: "bg-rose-100 text-rose-700", dark: "bg-rose-950/50 text-rose-300" },
  CUSTOM: { light: "bg-slate-100 text-slate-700", dark: "bg-slate-800 text-slate-300" },
};

const QUIZ_CARD_THEMES = {
  EASY: {
    banner: "bg-sky-50",
    iconWrap: "border-sky-100 bg-white",
    iconColor: "text-sky-700",
  },
  MEDIUM: {
    banner: "bg-amber-50",
    iconWrap: "border-amber-100 bg-white",
    iconColor: "text-amber-700",
  },
  HARD: {
    banner: "bg-rose-50",
    iconWrap: "border-rose-100 bg-white",
    iconColor: "text-rose-700",
  },
  CUSTOM: {
    banner: "bg-slate-50",
    iconWrap: "border-slate-200 bg-white",
    iconColor: "text-slate-700",
  },
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
      || prev.communityShared !== next.communityShared
      || prev.visibility !== next.visibility
      || prev.myAttempted !== next.myAttempted
      || prev.myPassed !== next.myPassed
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

function resolveQuizNavigationId(quiz) {
  return quiz?.quizId ?? quiz?.id ?? null;
}

function resolveQuizCardTheme(difficultyKey) {
  return QUIZ_CARD_THEMES[difficultyKey] || QUIZ_CARD_THEMES.CUSTOM;
}

function resolveQuizGenerationTaskId(quiz, quizGenerationTaskByQuizId) {
  const resolvedQuizId = Number(resolveQuizNavigationId(quiz));
  if (quiz?.websocketTaskId) return quiz.websocketTaskId;
  if (quiz?.taskId) return quiz.taskId;
  if (Number.isInteger(resolvedQuizId) && resolvedQuizId > 0) {
    return quizGenerationTaskByQuizId?.[resolvedQuizId] ?? null;
  }
  return null;
}

function resolveQuizProcessingPercent(quiz, progressTracking, quizGenerationTaskByQuizId, quizGenerationProgressByQuizId) {
  const resolvedQuizId = Number(resolveQuizNavigationId(quiz));
  const directPercent = clampPercent(
    quiz?.percent
    ?? quiz?.progressPercent
    ?? quiz?.processingPercent
    ?? quiz?.generationProgressPercent
    ?? quiz?.progress?.percent
    ?? quiz?.progress?.progressPercent
    ?? 0
  );
  const storedPercent = Number.isInteger(resolvedQuizId) && resolvedQuizId > 0
    ? clampPercent(quizGenerationProgressByQuizId?.[resolvedQuizId] ?? 0)
    : 0;
  const taskId = resolveQuizGenerationTaskId(quiz, quizGenerationTaskByQuizId);
  const trackedPercent = taskId
    ? clampPercent(
      progressTracking?.getTaskProgress?.(taskId)
      ?? progressTracking?.progressByTaskId?.[taskId]
      ?? 0
    )
    : 0;

  return Math.max(directPercent, storedPercent, trackedPercent);
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
  onShareQuiz,
  onOpenCommunityQuiz,
  progressTracking = null,
  quizGenerationTaskByQuizId = null,
  quizGenerationProgressByQuizId = null,
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
  const [deleteTargetQuiz, setDeleteTargetQuiz] = useState(null);
  const [sharingQuizId, setSharingQuizId] = useState(null);
  const [examStartQuiz, setExamStartQuiz] = useState(null);
  const fetchGuardRef = useRef({
    inFlight: false,
    lastKey: "",
    lastFetchedAt: 0,
  });

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
  const isRoadmapQuiz = useCallback((quiz) => {
    const normalizedContext = String(quiz?.contextType || "").toUpperCase();
    if (["ROADMAP", "PHASE", "KNOWLEDGE"].includes(normalizedContext)) return true;
    if (Number(quiz?.roadmapId) > 0) return true;
    if (Number(quiz?.phaseId) > 0) return true;
    if (Number(quiz?.knowledgeId) > 0) return true;
    return false;
  }, []);

  const handleStartQuiz = useCallback((mode, quizId) => {
    if (!mode || !quizId) return;

    navigate(`/quiz/${mode}/${quizId}`, {
      state: {
        returnToQuizPath: resolvedReturnToPath,
        ...(mode === 'practice' ? { autoStart: true } : {}),
        ...quizNavigationSourceState,
      },
    });
  }, [navigate, quizNavigationSourceState, resolvedReturnToPath]);

  const handleConfirmExamStart = useCallback(() => {
    const resolvedQuizId = resolveQuizNavigationId(examStartQuiz);
    if (!resolvedQuizId) return;

    navigate(`/quiz/exam/${resolvedQuizId}`, {
      state: {
        returnToQuizPath: resolvedReturnToPath,
        autoStart: true,
        ...quizNavigationSourceState,
      },
    });
    setExamStartQuiz(null);
  }, [examStartQuiz, navigate, quizNavigationSourceState, resolvedReturnToPath]);

  // Lấy danh sách quiz từ API theo context hiện tại (workspace/roadmap/phase/knowledge)
  const fetchQuizzes = useCallback(async ({ silent = false, scopeId = contextId } = {}) => {
    if (!scopeId) {
      setQuizzes([]);
      return;
    }

    const requestKey = `${String(contextType || "").toUpperCase()}:${Number(scopeId) || scopeId}:${Array.isArray(intentFilter) ? intentFilter.join(",") : "ALL"}`;
    const now = Date.now();
    const isDuplicateBurst = silent
      && fetchGuardRef.current.lastKey === requestKey
      && (now - fetchGuardRef.current.lastFetchedAt) < 800;

    if (fetchGuardRef.current.inFlight || isDuplicateBurst) {
      return;
    }

    fetchGuardRef.current.inFlight = true;
    fetchGuardRef.current.lastKey = requestKey;
    fetchGuardRef.current.lastFetchedAt = now;

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
      fetchGuardRef.current.inFlight = false;
      fetchGuardRef.current.lastFetchedAt = Date.now();
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

  // Chỉ polling quiz đang PROCESSING theo quizId để tránh gọi lại cả danh sách.
  useEffect(() => {
    const processingQuizIds = quizzes
      .filter((q) => String(q?.status || "").toUpperCase() === "PROCESSING")
      .map((q) => Number(q?.quizId))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (processingQuizIds.length === 0) return undefined;

    const timer = setInterval(() => {
      void (async () => {
        const responses = await Promise.all(
          processingQuizIds.map((quizId) => getQuizById(quizId).catch(() => null))
        );

        const updatesById = responses.reduce((acc, response) => {
          const payload = response?.data?.data || response?.data || null;
          const quizId = Number(payload?.quizId);
          if (Number.isInteger(quizId) && quizId > 0) {
            acc[quizId] = payload;
          }
          return acc;
        }, {});

        if (Object.keys(updatesById).length === 0) return;

        setQuizzes((current) => {
          let hasChange = false;
          const next = current.map((quiz) => {
            const quizId = Number(quiz?.quizId);
            const incoming = updatesById[quizId];
            if (!incoming) return quiz;

            if (
              incoming.status !== quiz.status
              || incoming.updatedAt !== quiz.updatedAt
              || incoming.title !== quiz.title
              || incoming.myAttempted !== quiz.myAttempted
              || incoming.myPassed !== quiz.myPassed
            ) {
              hasChange = true;
              return { ...quiz, ...incoming };
            }

            return quiz;
          });

          return hasChange ? next : current;
        });
      })();
    }, 4000);

    return () => clearInterval(timer);
  }, [quizzes]);

  // Xử lý xóa quiz
  const handleRequestDeleteQuiz = useCallback((e, quiz) => {
    e.stopPropagation();
    if (deletingId) return;
    setDeleteTargetQuiz(quiz);
  }, [deletingId]);

  const handleConfirmDeleteQuiz = useCallback(async () => {
    const quizId = Number(deleteTargetQuiz?.quizId ?? deleteTargetQuiz?.id);
    if (!Number.isInteger(quizId) || quizId <= 0 || deletingId) return;

    setDeletingId(quizId);
    try {
      await deleteQuiz(quizId);
      setQuizzes((prev) => prev.filter((q) => q.quizId !== quizId));
      setDeleteTargetQuiz(null);
    } catch (err) {
      console.error("Lỗi khi xóa quiz:", err);
      showError(err?.message || t("workspace.quiz.deleteFail", "Xóa quiz thất bại"));
    } finally {
      setDeletingId(null);
    }
  }, [deleteTargetQuiz, deletingId, showError, t]);

  // Lọc quiz theo trạng thái và tìm kiếm
  const filtered = useMemo(() => {
    let items = quizzes;
    if (filterStatus === "COMPLETED") {
      items = items.filter((q) => q?.myAttempted === true || q?.status === "COMPLETED");
    } else if (filterStatus !== "all") {
      items = items.filter((q) => q.status === filterStatus);
    }
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
          {String(contextType || "").toUpperCase() === "WORKSPACE" && typeof onOpenCommunityQuiz === "function" ? (
          <Button
            variant="outline"
            onClick={onOpenCommunityQuiz}
            className={`rounded-full h-9 px-4 flex items-center gap-2 ${isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-800" : ""}`}
          >
            <Globe className="w-4 h-4" />
            <span className="text-sm">{t("workspace.quiz.communityExplorer.title", "Community Quiz")}</span>
          </Button>
          ) : null}
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((quiz) => {
              const resolvedQuizId = resolveQuizNavigationId(quiz);
              const isCommunityShared = quiz?.communityShared === true;
              const isRoadmapContextQuiz = isRoadmapQuiz(quiz);
              const shouldHideRoadmapVisibility = isRoadmapContextQuiz;
              const durationInMinutes = getDurationInMinutes(quiz);
              const normalizedStatus = String(quiz?.status || "").toUpperCase();
              const isProcessing = normalizedStatus === "PROCESSING";
              const statusMeta = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.DRAFT;
              const VisibilityIcon = isCommunityShared ? Globe : Lock;
              const visibilityIconWrap = isCommunityShared
                ? (isDarkMode ? "border-emerald-900/60 bg-emerald-950/30" : "border-emerald-200 bg-emerald-50")
                : (isDarkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white");
              const visibilityIconColor = isCommunityShared
                ? (isDarkMode ? "text-emerald-300" : "text-emerald-600")
                : (isDarkMode ? "text-slate-300" : "text-slate-600");
              const processingPercent = resolveQuizProcessingPercent(
                quiz,
                progressTracking,
                quizGenerationTaskByQuizId,
                quizGenerationProgressByQuizId,
              );
              const processingBarWidth = processingPercent > 0 ? Math.max(10, processingPercent) : 10;
              const difficultyKey = String(quiz?.overallDifficulty || "").toUpperCase();
              const difficultyMeta = DIFFICULTY_STYLES[difficultyKey] || DIFFICULTY_STYLES.CUSTOM;
              const theme = resolveQuizCardTheme(difficultyKey);
              const intentLabel = quiz?.quizIntent && !isRoadmapContextQuiz
                ? t(`workspace.quiz.intentLabels.${quiz.quizIntent}`, quiz.quizIntent)
                : null;
              const timerLabel = typeof quiz.timerMode === "boolean"
                ? (
                  quiz.timerMode
                    ? t("workspace.quiz.examModeType1Short", "Giới hạn thời gian tổng")
                    : t("workspace.quiz.examModeType2Short", "Theo từng câu")
                )
                : null;
              const specialStatusLabel = ["PROCESSING", "DRAFT", "ERROR"].includes(normalizedStatus)
                ? t(`workspace.quiz.statusLabels.${normalizedStatus}`, normalizedStatus)
                : null;
              const showPracticeAction = normalizedStatus === "ACTIVE" && !isRoadmapContextQuiz;
              const showExamAction = normalizedStatus === "ACTIVE";
              const showShareAction = onShareQuiz && !shouldHideRoadmapVisibility && !isProcessing;
              const updatedLabel = formatCardDate(quiz.updatedAt || quiz.createdAt);

              return (
                <article
                  key={resolvedQuizId}
                  onClick={() => onViewQuiz?.(quiz)}
                  className={`overflow-hidden rounded-[28px] border cursor-pointer shadow-[0_20px_50px_rgba(15,23,42,0.08)] ${
                    isCommunityShared
                      ? (isDarkMode ? "border-emerald-900/60 bg-slate-900/60" : "border-emerald-200 bg-white")
                      : (isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white")
                  }`}
                >
                  <div className={`border-b px-4 py-4 ${isDarkMode ? "bg-slate-800/40 border-slate-700/50" : `${theme.banner} border-slate-100`}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${visibilityIconWrap}`}>
                          <VisibilityIcon className={`h-5 w-5 ${visibilityIconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <p className={`truncate text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                            {quiz?.createVia === "AI"
                              ? t("workspace.quiz.cardAiLabel", "QUIZMATE AI")
                              : t("workspace.quiz.cardManualLabel", "Quiz thủ công")}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {specialStatusLabel ? (
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDarkMode ? statusMeta.dark : statusMeta.light}`}>
                            {specialStatusLabel}
                          </span>
                        ) : null}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
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
                            className={`w-52 ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : ""}`}
                          >
                            {showShareAction ? (
                              <DropdownMenuItem
                                disabled={sharingQuizId === quiz.quizId}
                                onSelect={async (e) => {
                                  e?.stopPropagation?.();
                                  if (sharingQuizId === quiz.quizId) return;
                                  setSharingQuizId(quiz.quizId);
                                  try {
                                    await onShareQuiz(quiz);
                                    await fetchQuizzes({ silent: true });
                                  } catch (error) {
                                    showError(error?.message || t("home.actions.share", "Share"));
                                  } finally {
                                    setSharingQuizId(null);
                                  }
                                }}
                                className="cursor-pointer"
                              >
                                {sharingQuizId === quiz.quizId ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isCommunityShared ? (
                                  <Lock className="h-4 w-4" />
                                ) : (
                                  <Globe className="h-4 w-4" />
                                )}
                                <span>
                                  {isCommunityShared
                                    ? t("workspace.quiz.makePrivateShort", "Riêng tư")
                                    : t("workspace.quiz.makePublicShort", "Công khai")}
                                </span>
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              disabled={deletingId === quiz.quizId}
                              onSelect={() => handleRequestDeleteQuiz({ stopPropagation: () => {} }, quiz)}
                              className={`cursor-pointer ${isDarkMode ? "text-red-300 focus:text-red-200" : "text-red-600 focus:text-red-600"}`}
                            >
                              {deletingId === quiz.quizId ? (
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
                  </div>

                  <div className="space-y-4 p-4">
                    <div>
                      <h3 className={`line-clamp-2 min-h-12 break-words text-[18px] font-semibold leading-6 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                        {quiz.title}
                      </h3>
                      <div className={`mt-2 flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatShortDate(quiz.createdAt)}</span>
                      </div>
                    </div>

                    {isProcessing ? (
                      <div className={`rounded-[22px] border px-4 py-4 ${
                        isDarkMode
                          ? "border-sky-900/60 bg-sky-950/20"
                          : "border-sky-200 bg-sky-50/80"
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${isDarkMode ? "text-sky-200" : "text-sky-700"}`}>
                              {t("workspace.quiz.processingProgressLabel", "Đang tạo quiz")}
                            </p>
                            <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                              {t("workspace.quiz.processingProgressHint", "Hệ thống đang sinh câu hỏi và cấu hình bài kiểm tra.")}
                            </p>
                          </div>
                          <span className={`shrink-0 text-sm font-semibold tabular-nums ${isDarkMode ? "text-sky-200" : "text-sky-700"}`}>
                            {processingPercent}%
                          </span>
                        </div>
                        <div className={`mt-3 h-2 overflow-hidden rounded-full ${isDarkMode ? "bg-slate-800" : "bg-white"}`}>
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{ width: `${processingBarWidth}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className={`rounded-[20px] border px-3 py-3 ${isDarkMode ? "border-slate-700/50 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
                          <p className={`text-[11px] uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-400/80" : "text-slate-500"}`}>
                            {t("workspace.quiz.timeDuration", "Thời gian")}
                          </p>
                          <p className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                            <Timer className="h-3.5 w-3.5" />
                            <span>{durationInMinutes > 0 ? `${durationInMinutes} ${t("workspace.quiz.minutes", "phút")}` : "-"}</span>
                          </p>
                        </div>
                        <div className={`rounded-[20px] border px-3 py-3 ${isDarkMode ? "border-slate-700/50 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
                          <p className={`text-[11px] uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-400/80" : "text-slate-500"}`}>
                            {t("workspace.quiz.overallDifficulty", "Độ khó")}
                          </p>
                          <p className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${isDarkMode ? difficultyMeta.dark : difficultyMeta.light} w-fit rounded-full px-2.5 py-1`}>
                            <BarChart3 className="h-3.5 w-3.5" />
                            <span>
                              {difficultyKey === "CUSTOM"
                                ? t("workspace.quiz.difficultyLevels.custom", "Tùy chỉnh")
                                : t(`workspace.quiz.difficultyLevels.${String(quiz?.overallDifficulty || "medium").toLowerCase()}`)}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {intentLabel ? (
                          <span className={`inline-flex max-w-full items-center rounded-full px-3 py-1 text-[11px] font-semibold ${isDarkMode ? "bg-slate-700/60 text-slate-300" : "bg-slate-200/70 text-slate-700"}`}>
                            {intentLabel}
                          </span>
                        ) : null}
                        {timerLabel ? (
                          <span className={`inline-flex max-w-full items-center rounded-full px-3 py-1 text-[11px] font-semibold ${isDarkMode ? "bg-slate-700/60 text-slate-300" : "bg-slate-200/70 text-slate-700"}`}>
                            {timerLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {showPracticeAction || showExamAction ? (
                      <div className={`grid gap-2 ${showPracticeAction && showExamAction ? "grid-cols-2" : "grid-cols-1"}`}>
                        {showPracticeAction ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartQuiz('practice', quiz.quizId); }}
                            className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${isDarkMode ? "border-blue-900/50 bg-blue-950/20 text-blue-300 hover:bg-blue-900/30" : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
                            title={t("workspace.quiz.practice", "Luyện tập")}
                          >
                            <Play className="h-4.5 w-4.5" />
                            <span>{t("workspace.quiz.practice", "Luyện tập")}</span>
                          </button>
                        ) : null}
                        {showExamAction ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setExamStartQuiz(quiz); }}
                            className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${isDarkMode ? "border-emerald-900/50 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/30" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                            title={t("workspace.quiz.exam", "Thi")}
                          >
                            <ClipboardCheck className="h-4.5 w-4.5" />
                            <span>{t("workspace.quiz.exam", "Thi")}</span>
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={Boolean(examStartQuiz)} onOpenChange={(open) => { if (!open) setExamStartQuiz(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("workspace.quiz.exam", "Thi")}</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block text-base font-semibold text-slate-900 dark:text-slate-100">
                {examStartQuiz?.title}
              </span>
              <span className="block">
                {t("workspace.quiz.startExamPrompt", "Xác nhận bắt đầu ở chế độ thi?")}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExamStartQuiz(null)}>
              {t("workspace.quiz.close", "Đóng")}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConfirmExamStart}>
              {t("workspace.quiz.header.confirm", "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              onClick={handleConfirmDeleteQuiz}
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

export default QuizListView;
