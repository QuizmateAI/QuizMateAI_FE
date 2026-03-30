import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, X, Plus, BadgeCheck, FolderOpen, Clock, RefreshCw, Trash2, Loader2, Timer, BarChart3, Play, ClipboardCheck, Globe, Lock } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
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

const DIFFICULTY_STYLES = {
  EASY: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-300" },
  MEDIUM: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-300" },
  HARD: { light: "bg-rose-100 text-rose-700", dark: "bg-rose-950/50 text-rose-300" },
  CUSTOM: { light: "bg-slate-100 text-slate-700", dark: "bg-slate-800 text-slate-300" },
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

function resolveVisibilityMeta(isCommunityShared, isDarkMode, t) {
  if (isCommunityShared) {
    return {
      icon: Globe,
      shortLabel: t("workspace.quiz.communityPublic", "Đã public"),
      longLabel: t("workspace.quiz.communityPublicLong", "Đã public lên cộng đồng"),
      lightClassName: "bg-emerald-100 text-emerald-700",
      darkClassName: "bg-emerald-950/50 text-emerald-300",
    };
  }

  return {
    icon: Lock,
    shortLabel: t("workspace.quiz.privateShort", "Riêng tư"),
    longLabel: t("workspace.quiz.privateLong", "Đang ở chế độ private"),
    lightClassName: "bg-slate-100 text-slate-700",
    darkClassName: "bg-slate-800 text-slate-300",
  };
}

function resolveQuizNavigationId(quiz) {
  return quiz?.quizId ?? quiz?.id ?? null;
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
          <div className="space-y-2">
            {filtered.map((quiz) => {
              const ss = STATUS_STYLES[quiz.status] || STATUS_STYLES.DRAFT;
              const is = INTENT_STYLES[quiz.quizIntent] || {};
              const myAttempted = quiz?.myAttempted === true;
              const myPassed = quiz?.myPassed === true;
              const isCommunityShared = quiz?.communityShared === true;
              const visibilityMeta = resolveVisibilityMeta(isCommunityShared, isDarkMode, t);
              const VisibilityIcon = visibilityMeta.icon;
              const isRoadmapContextQuiz = isRoadmapQuiz(quiz);
              const normalizedIntent = String(quiz?.quizIntent || "").toUpperCase();
              const shouldHideRoadmapIntentBadge = isRoadmapContextQuiz
                && ["PRE_LEARNING", "PRACTICE", "REVIEW"].includes(normalizedIntent);
              const shouldHideActiveStatusBadge = isRoadmapContextQuiz && String(quiz?.status || "").toUpperCase() === "ACTIVE";
              const shouldHideAttemptedBadge = isRoadmapContextQuiz;
              const shouldHideRoadmapVisibility = isRoadmapContextQuiz;
              const durationInMinutes = getDurationInMinutes(quiz);
              const difficultyKey = String(quiz?.overallDifficulty || "").toUpperCase();
              const difficultyMeta = DIFFICULTY_STYLES[difficultyKey] || DIFFICULTY_STYLES.CUSTOM;
              return (
                <div
                  key={resolveQuizNavigationId(quiz)}
                  onClick={() => onViewQuiz?.(quiz)}
                  className={`relative rounded-xl border overflow-hidden min-h-[104px] cursor-pointer shadow-[0_10px_20px_rgba(51,51,51,0.12)] transition-all duration-300 group ${
                    isCommunityShared
                      ? (isDarkMode ? "border-emerald-800/70 bg-slate-900/50" : "border-emerald-200 bg-white")
                      : (isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-gray-200 bg-white")
                  }`}
                >
                  <div
                    className="absolute inset-0 px-4 py-3 flex items-center gap-3 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.23,1,0.320,1)] group-hover:-translate-x-full"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? "bg-blue-950/40" : "bg-blue-100"}`}>
                      <BadgeCheck className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className={`min-w-0 flex-1 text-sm font-semibold truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{quiz.title}</p>
                        </div>
                        <div className={`flex items-center gap-2 mt-1 text-xs flex-wrap ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                          {durationInMinutes > 0 && (
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" />{durationInMinutes} {t("workspace.quiz.minutes")}
                            </span>
                        )}
                        {quiz.overallDifficulty && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                            isDarkMode ? difficultyMeta.dark : difficultyMeta.light
                          }`}>
                            <BarChart3 className="w-3 h-3" />{t(`workspace.quiz.difficultyLevels.${quiz.overallDifficulty.toLowerCase()}`)}
                          </span>
                        )}
                        </div>
                        <div className={`flex items-center gap-3 mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatShortDate(quiz.createdAt)}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end justify-center gap-2.5 pr-1 py-1">
                        <div className="flex items-center justify-end gap-2.5 flex-wrap">
                          <span className={`self-center inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            myPassed
                              ? (isDarkMode ? "bg-emerald-950/40 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                              : (isDarkMode ? "bg-amber-950/40 text-amber-300" : "bg-amber-100 text-amber-700")
                          }`}>
                            {myPassed
                              ? t("workspace.quiz.myPassedTrue", "Đã đậu")
                              : t("workspace.quiz.myPassedFalse", "Chưa đậu")}
                          </span>
                          {!shouldHideRoadmapVisibility ? (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isDarkMode ? visibilityMeta.darkClassName : visibilityMeta.lightClassName
                            }`}>
                              <VisibilityIcon className="w-3 h-3" />
                              {visibilityMeta.shortLabel}
                            </span>
                          ) : null}
                        </div>

                        {typeof quiz.timerMode === "boolean" && (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            quiz.timerMode
                              ? (isDarkMode ? "bg-blue-950/40 text-blue-300" : "bg-blue-100 text-blue-700")
                              : (isDarkMode ? "bg-emerald-950/40 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                          }`}>
                            {quiz.timerMode
                              ? t("workspace.quiz.examModeType1Short", "Giới hạn thời gian tổng")
                              : t("workspace.quiz.examModeType2Short", "Theo từng câu")}
                          </span>
                        )}
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
                        {quiz.quizIntent && !shouldHideRoadmapIntentBadge && (
                          <span className={`text-sm px-3 py-1.5 rounded-full font-semibold ${isDarkMode ? is.dark || "bg-slate-800 text-slate-400" : is.light || "bg-gray-100 text-gray-500"}`}>
                            {t(`workspace.quiz.intentLabels.${quiz.quizIntent}`)}
                          </span>
                        )}
                        {!shouldHideActiveStatusBadge ? (
                          <span className={`text-sm px-3.5 py-1.5 rounded-full font-semibold ${isDarkMode ? ss.dark : ss.light}`}>
                            {t(`workspace.quiz.statusLabels.${quiz.status}`)}
                          </span>
                        ) : null}
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
                        {!shouldHideAttemptedBadge ? (
                          <span className={`text-sm px-3 py-1.5 rounded-full font-semibold ${myAttempted
                            ? (isDarkMode ? "bg-cyan-950/40 text-cyan-300" : "bg-cyan-100 text-cyan-700")
                            : (isDarkMode ? "bg-slate-700 text-slate-300" : "bg-gray-200 text-gray-600")
                          }`}>
                            {myAttempted
                              ? t("workspace.quiz.myAttemptedTrue", "Đã làm")
                              : t("workspace.quiz.myAttemptedFalse", "Chưa làm")}
                          </span>
                        ) : null}
                        <span className={`text-sm px-3 py-1.5 rounded-full font-semibold ${myPassed
                          ? (isDarkMode ? "bg-emerald-950/40 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                          : (isDarkMode ? "bg-amber-950/40 text-amber-300" : "bg-amber-100 text-amber-700")
                        }`}>
                          {myPassed
                            ? t("workspace.quiz.myPassedTrue", "Đã đậu")
                            : t("workspace.quiz.myPassedFalse", "Chưa đậu")}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2.5">
                        {quiz.status === "ACTIVE" && (
                          <>
                            {!isRoadmapQuiz(quiz) ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStartQuiz('practice', quiz.quizId); }}
                                className={`px-3 py-2.5 rounded-xl transition-all inline-flex items-center gap-1.5 text-sm font-semibold ${isDarkMode ? "hover:bg-blue-950/40 text-blue-300" : "hover:bg-blue-100 text-blue-700"}`}
                                title={t("workspace.quiz.practice", "Practice")}
                              >
                                <Play className="w-5 h-5" />
                                <span>{t("workspace.quiz.actionButtons.practice", "Practice")}</span>
                              </button>
                            ) : null}
                            <button
                              onClick={(e) => { e.stopPropagation(); setExamStartQuiz(quiz); }}
                              className={`px-3 py-2.5 rounded-xl transition-all inline-flex items-center gap-1.5 text-sm font-semibold ${isDarkMode ? "hover:bg-emerald-950/40 text-emerald-300" : "hover:bg-emerald-100 text-emerald-700"}`}
                              title={t("workspace.quiz.exam", "Exam")}
                            >
                              <ClipboardCheck className="w-5 h-5" />
                              <span>{t("workspace.quiz.actionButtons.exam", "Exam")}</span>
                            </button>
                          </>
                        )}
                        {onShareQuiz && !shouldHideRoadmapVisibility ? (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
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
                            disabled={sharingQuizId === quiz.quizId}
                            className={`px-3 py-2.5 rounded-xl transition-all inline-flex items-center gap-1.5 text-sm font-semibold ${
                              isCommunityShared
                                ? (isDarkMode ? "hover:bg-slate-800 text-slate-200 disabled:text-slate-500" : "hover:bg-slate-100 text-slate-700 disabled:text-slate-300")
                                : (isDarkMode ? "hover:bg-emerald-950/40 text-emerald-300 disabled:text-emerald-500" : "hover:bg-emerald-100 text-emerald-700 disabled:text-emerald-300")
                            }`}
                            title={isCommunityShared
                              ? t("workspace.quiz.makePrivate", "Chuyển quiz về private")
                              : t("workspace.quiz.makePublic", "Đưa quiz lên cộng đồng")}
                          >
                            {sharingQuizId === quiz.quizId ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isCommunityShared ? (
                              <Lock className="w-5 h-5" />
                            ) : (
                              <Globe className="w-5 h-5" />
                            )}
                            <span>{isCommunityShared
                              ? t("workspace.quiz.makePrivateShort", "Để private")
                              : t("workspace.quiz.makePublicShort", "Public")}
                            </span>
                          </button>
                        ) : null}
                        <button
                          onClick={(e) => handleRequestDeleteQuiz(e, quiz)}
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
