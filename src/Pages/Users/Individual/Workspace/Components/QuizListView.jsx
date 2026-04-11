import React, { useState, useMemo, useEffect, useCallback, useRef, useDeferredValue, startTransition } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, X, Plus, BadgeCheck, FolderOpen, Clock, RefreshCw, Trash2, Loader2, Timer, BarChart3, ClipboardCheck, Globe, Lock, MoreVertical } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import DirectFeedbackButton from "@/Components/feedback/DirectFeedbackButton";
import HomeButton from "@/Components/ui/HomeButton";
import { getQuizzesByScope, deleteQuiz, getQuizById } from "@/api/QuizAPI";
import { getGroupMembers } from "@/api/GroupAPI";
import { unwrapApiData } from "@/Utils/apiResponse";
import { getFeedbackTargetStatuses } from "@/api/FeedbackAPI";
import { useToast } from "@/context/ToastContext";
import { getDurationInMinutes } from "@/lib/quizDurationDisplay";
import {
  buildQuizAttemptPath,
  buildWorkspaceRoadmapsPath,
  extractWorkspaceIdFromPath,
  isWorkspaceRoadmapsPath,
} from "@/lib/routePaths";

function resolveWorkspaceRoadmapReturnPath(pathname, phaseId) {
  const workspaceId = extractWorkspaceIdFromPath(pathname);
  if (!workspaceId || !phaseId) return null;
  return buildWorkspaceRoadmapsPath(workspaceId, phaseId);
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
      || String(prev.groupAudienceMode ?? "") !== String(next.groupAudienceMode ?? "")
      || JSON.stringify(prev.assignedUserIds ?? []) !== JSON.stringify(next.assignedUserIds ?? [])
    ) {
      return true;
    }
  }

  return false;
}

function hasFeedbackStatusMapChanged(currentMap, nextMap) {
  const currentKeys = Object.keys(currentMap || {});
  const nextKeys = Object.keys(nextMap || {});
  if (currentKeys.length !== nextKeys.length) return true;

  for (const key of nextKeys) {
    if (!Object.prototype.hasOwnProperty.call(currentMap, key)) {
      return true;
    }
    if (Boolean(currentMap[key]?.pending) !== Boolean(nextMap[key]?.pending)) {
      return true;
    }
    if (Boolean(currentMap[key]?.submitted) !== Boolean(nextMap[key]?.submitted)) {
      return true;
    }
  }

  return false;
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

/** Quiz nhóm: ALL_MEMBERS vs SELECTED_MEMBERS (mặc định chung nhóm nếu BE chưa gửi). */
function normalizeGroupAudienceMode(quiz) {
  const m = String(quiz?.groupAudienceMode ?? "").toUpperCase();
  if (m === "SELECTED_MEMBERS") return "SELECTED_MEMBERS";
  return "ALL_MEMBERS";
}

function getQuizAssignedUserIds(quiz) {
  const raw = quiz?.assignedUserIds;
  if (!Array.isArray(raw)) return [];
  return raw.map((id) => Number(id)).filter((n) => Number.isInteger(n) && n > 0);
}

function resolveMemberDisplayName(userId, groupMembers) {
  const uid = Number(userId);
  const m = (groupMembers || []).find((x) => Number(x.userId ?? x.id) === uid);
  return m?.fullName || m?.username || `User ${uid}`;
}

function resolveGroupMember(userId, groupMembers) {
  const uid = Number(userId);
  if (!Number.isInteger(uid) || uid <= 0) return null;
  return (groupMembers || []).find((x) => Number(x.userId ?? x.id) === uid) || null;
}

function formatAssignedNames(quiz, groupMembers, maxNames = 3) {
  const ids = getQuizAssignedUserIds(quiz);
  if (ids.length === 0) return "";
  const names = ids.map((id) => resolveMemberDisplayName(id, groupMembers));
  if (names.length <= maxNames) return names.join(", ");
  return `${names.slice(0, maxNames).join(", ")} +${names.length - maxNames}`;
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
  title = null,
  onNavigateHome,
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
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTargetQuiz, setDeleteTargetQuiz] = useState(null);
  const [sharingQuizId, setSharingQuizId] = useState(null);
  const [examStartQuiz, setExamStartQuiz] = useState(null);
  const [feedbackStatusByQuizId, setFeedbackStatusByQuizId] = useState({});
  const [hasResolvedInitialFetch, setHasResolvedInitialFetch] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  /** all | ALL_MEMBERS | SELECTED_MEMBERS */
  const [groupAudienceFilter, setGroupAudienceFilter] = useState("all");
  const [groupMemberUserId, setGroupMemberUserId] = useState(null);
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

  const isGroupQuizList = String(contextType || "").toUpperCase() === "GROUP";
  const intentFilterKey = useMemo(
    () =>
      Array.isArray(intentFilter) && intentFilter.length > 0
        ? intentFilter.join(",")
        : "ALL",
    [intentFilter],
  );

  useEffect(() => {
    setHasResolvedInitialFetch(false);
    setFetchError(null);
  }, [contextId, contextType, intentFilterKey]);

  useEffect(() => {
    if (!isGroupQuizList || !contextId) {
      setGroupMembers([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setGroupMembersLoading(true);
      try {
        const res = await getGroupMembers(contextId, 0, 400);
        const raw = unwrapApiData(res);
        const list = raw?.content || raw?.data || (Array.isArray(raw) ? raw : []);
        if (!cancelled) setGroupMembers(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setGroupMembers([]);
      } finally {
        if (!cancelled) setGroupMembersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isGroupQuizList, contextId]);

  useEffect(() => {
    if (groupAudienceFilter !== "SELECTED_MEMBERS") {
      setGroupMemberUserId(null);
    }
  }, [groupAudienceFilter]);

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
    const isRoadmapPath = isWorkspaceRoadmapsPath(resolvedReturnToPath)
      || isWorkspaceRoadmapsPath(location.pathname);

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

    navigate(buildQuizAttemptPath(mode, quizId), {
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

    navigate(buildQuizAttemptPath("exam", resolvedQuizId), {
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
      setFetchError(null);
      setHasResolvedInitialFetch(true);
      return;
    }

    const requestKey = `${String(contextType || "").toUpperCase()}:${Number(scopeId) || scopeId}:${intentFilterKey}`;
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
      setFetchError(null);

    } catch (err) {
      console.error("Lỗi khi lấy danh sách quiz:", err);
      if (!silent) {
        setFetchError(err);
      }
    } finally {
      fetchGuardRef.current.inFlight = false;
      fetchGuardRef.current.lastFetchedAt = Date.now();
      if (!silent) {
        setLoading(false);
        setHasResolvedInitialFetch(true);
      }
    }
  }, [contextId, contextType, intentFilter, intentFilterKey]);

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

  const syncQuizFeedbackStatuses = useCallback(async (quizList = quizzes) => {
    const attemptedQuizIds = (Array.isArray(quizList) ? quizList : [])
      .filter((quiz) => quiz?.myAttempted === true)
      .map((quiz) => Number(resolveQuizNavigationId(quiz)))
      .filter((quizId) => Number.isInteger(quizId) && quizId > 0);

    if (attemptedQuizIds.length === 0) {
      setFeedbackStatusByQuizId((currentStatuses) => (
        Object.keys(currentStatuses).length > 0 ? {} : currentStatuses
      ));
      return;
    }

    try {
      const response = await getFeedbackTargetStatuses("QUIZ", attemptedQuizIds);
      const rows = response?.data?.data ?? response?.data ?? response ?? [];
      const nextStatuses = attemptedQuizIds.reduce((accumulator, quizId) => {
        accumulator[quizId] = { pending: false, submitted: false };
        return accumulator;
      }, {});

      rows.forEach((item) => {
        const quizId = Number(item?.targetId);
        if (!Number.isInteger(quizId) || quizId <= 0) {
          return;
        }
        nextStatuses[quizId] = {
          pending: item?.pending === true,
          submitted: item?.submitted === true,
        };
      });

      setFeedbackStatusByQuizId((currentStatuses) => (
        hasFeedbackStatusMapChanged(currentStatuses, nextStatuses) ? nextStatuses : currentStatuses
      ));
    } catch (error) {
      console.error("Lỗi khi lấy trạng thái feedback quiz:", error);
    }
  }, [quizzes]);

  useEffect(() => {
    void syncQuizFeedbackStatuses(quizzes);
  }, [quizzes, syncQuizFeedbackStatuses]);

  useEffect(() => {
    const handleFeedbackUpdated = () => {
      void syncQuizFeedbackStatuses(quizzes);
    };

    window.addEventListener("feedbackUpdated", handleFeedbackUpdated);
    return () => {
      window.removeEventListener("feedbackUpdated", handleFeedbackUpdated);
    };
  }, [quizzes, syncQuizFeedbackStatuses]);

  const handleQuizFeedbackSubmitted = useCallback((quizId) => {
    const normalizedQuizId = Number(quizId);
    if (!Number.isInteger(normalizedQuizId) || normalizedQuizId <= 0) {
      return;
    }

    setFeedbackStatusByQuizId((currentStatuses) => {
      const currentStatus = currentStatuses[normalizedQuizId];
      if (currentStatus?.submitted === true && currentStatus?.pending === false) {
        return currentStatuses;
      }
      return {
        ...currentStatuses,
        [normalizedQuizId]: {
          pending: false,
          submitted: true,
        },
      };
    });
  }, []);

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
    if (deferredSearchQuery.trim()) {
      const query = deferredSearchQuery.toLowerCase();
      items = items.filter((q) => q.title?.toLowerCase().includes(query));
    }
    if (isGroupQuizList) {
      if (groupAudienceFilter === "ALL_MEMBERS") {
        items = items.filter((q) => normalizeGroupAudienceMode(q) === "ALL_MEMBERS");
      } else if (groupAudienceFilter === "SELECTED_MEMBERS") {
        items = items.filter((q) => normalizeGroupAudienceMode(q) === "SELECTED_MEMBERS");
        if (groupMemberUserId != null && Number.isInteger(Number(groupMemberUserId))) {
          const uid = Number(groupMemberUserId);
          items = items.filter((q) => getQuizAssignedUserIds(q).includes(uid));
        }
      }
    }
    return items;
  }, [quizzes, deferredSearchQuery, isGroupQuizList, groupAudienceFilter, groupMemberUserId]);
  const useLegacyRoadmapCards = false;

  const renderQuizFeedbackAction = (quizId, className = "") => (
    <div onClick={(e) => e.stopPropagation()}>
      <DirectFeedbackButton
        targetType="QUIZ"
        targetId={quizId}
        label={t("feedback", "Feedback")}
        title={t("feedback", "Feedback")}
        isDarkMode={isDarkMode}
        className={className}
        onSubmitted={() => handleQuizFeedbackSubmitted(quizId)}
      />
    </div>
  );

  const renderLegacyRoadmapCard = (quiz) => {
    const resolvedQuizId = resolveQuizNavigationId(quiz);
    const hasSubmittedFeedback = feedbackStatusByQuizId[resolvedQuizId]?.submitted === true;
    const isCommunityShared = quiz?.communityShared === true;
    const normalizedStatus = String(quiz?.status || "").toUpperCase();
    const isProcessing = normalizedStatus === "PROCESSING";
    const ss = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.DRAFT;
    const is = INTENT_STYLES[quiz.quizIntent] || {};
    const myAttempted = quiz?.myAttempted === true;
    const myPassed = quiz?.myPassed === true;
    const visibilityMeta = resolveVisibilityMeta(isCommunityShared, isDarkMode, t);
    const VisibilityIcon = visibilityMeta.icon;
    const isRoadmapContextQuiz = isRoadmapQuiz(quiz);
    const normalizedIntent = String(quiz?.quizIntent || "").toUpperCase();
    const shouldHideRoadmapIntentBadge = isRoadmapContextQuiz
      && ["PRE_LEARNING", "PRACTICE", "REVIEW"].includes(normalizedIntent);
    const shouldHideActiveStatusBadge = isRoadmapContextQuiz && normalizedStatus === "ACTIVE";
    const shouldHideRoadmapVisibility = isRoadmapContextQuiz;
    const durationInMinutes = getDurationInMinutes(quiz);
    const difficultyKey = String(quiz?.overallDifficulty || "").toUpperCase();
    const difficultyMeta = DIFFICULTY_STYLES[difficultyKey] || DIFFICULTY_STYLES.CUSTOM;
    const processingPercent = resolveQuizProcessingPercent(
      quiz,
      progressTracking,
      quizGenerationTaskByQuizId,
      quizGenerationProgressByQuizId,
    );
    const processingBarWidth = processingPercent > 0 ? Math.max(8, processingPercent) : 8;
    const statusLabel = t(`workspace.quiz.statusLabels.${normalizedStatus}`, normalizedStatus || "DRAFT");
    const questionCount = Number(quiz?.questionCount ?? quiz?.totalQuestion ?? quiz?.totalQuestions ?? 0) || 0;
    const maxAttempt = Number(quiz?.maxAttempt);
    const attemptCount = Number(quiz?.attemptCount ?? quiz?.attemptsCount ?? quiz?.myAttemptCount);
    const resolvedAttemptCount = Number.isFinite(attemptCount) && attemptCount >= 0
      ? attemptCount
      : (myAttempted ? 1 : null);
    const passScore = Number(quiz?.passScore);
    const maxScore = Number(quiz?.maxScore);
    const scoreValue = Number(quiz?.latestScore ?? quiz?.score ?? quiz?.myScore ?? quiz?.marksScored ?? quiz?.markScored);
    const resolvedScoreValue = Number.isFinite(scoreValue) && scoreValue >= 0 ? scoreValue : null;
    const updatedLabel = formatCardDate(quiz.updatedAt || quiz.createdAt);
    const overviewStats = [
      {
        label: t("workspace.quiz.roadmapOverview.questions", "Câu hỏi"),
        value: questionCount > 0 ? String(questionCount) : "-",
        hint: questionCount > 0 ? t("workspace.quiz.roadmapOverview.questionsHint", "câu") : null,
        icon: BadgeCheck,
      },
      {
        label: t("workspace.quiz.roadmapOverview.attempts", "Số lần làm"),
        value: maxAttempt > 0
          ? `${resolvedAttemptCount ?? "-"} / ${maxAttempt}`
          : (resolvedAttemptCount != null ? String(resolvedAttemptCount) : "-"),
        hint: null,
        icon: RefreshCw,
      },
      {
        label: t("workspace.quiz.roadmapOverview.duration", "Thời gian"),
        value: durationInMinutes > 0 ? String(durationInMinutes) : "-",
        hint: durationInMinutes > 0 ? t("workspace.quiz.minutesShort", "phút") : null,
        icon: Timer,
      },
      {
        label: resolvedScoreValue != null
          ? t("workspace.quiz.roadmapOverview.score", "Điểm")
          : t("workspace.quiz.roadmapOverview.passScore", "Ngưỡng đạt"),
        value: resolvedScoreValue != null
          ? (
            maxScore > 0
              ? `${resolvedScoreValue} / ${maxScore}`
              : String(resolvedScoreValue)
          )
          : (
            passScore > 0
              ? (
                maxScore > 0
                  ? `${passScore} / ${maxScore}`
                  : String(passScore)
              )
              : "-"
          ),
        hint: null,
        icon: BarChart3,
      },
    ];
    const resultLabel = myAttempted
      ? (
        myPassed
          ? t("workspace.quiz.myPassedTrue", "Đã đậu")
          : t("workspace.quiz.myPassedFalse", "Chưa đậu")
      )
      : t("workspace.quiz.myAttemptedFalse", "Chưa làm");
    const roadmapExamLabel = "Kiểm tra";
    const roadmapRetakeExamLabel = "Kiểm tra lại";

    return (
      <div
        key={resolvedQuizId}
        onClick={() => onViewQuiz?.(quiz)}
        className={`overflow-hidden rounded-[26px] border shadow-[0_18px_45px_rgba(15,23,42,0.08)] cursor-pointer ${
          isCommunityShared
            ? (isDarkMode ? "border-emerald-800/70 bg-slate-900/60" : "border-emerald-200 bg-white")
            : (isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white")
        }`}
      >
        <div className="p-4 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h3 className={`text-[18px] font-semibold leading-tight md:text-[20px] ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {quiz.title}
              </h3>
              <div className={`mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {questionCount > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4" />
                    {questionCount} {t("workspace.quiz.roadmapOverview.questionsHint", "câu")}
                  </span>
                ) : null}
                {updatedLabel ? (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {t("workspace.quiz.roadmapOverview.updatedOn", "Cập nhật")} {updatedLabel}
                  </span>
                ) : null}
                {quiz.overallDifficulty ? (
                  <span className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${isDarkMode ? difficultyMeta.dark : difficultyMeta.light}`}>
                    <BarChart3 className="h-3.5 w-3.5" />
                    {difficultyKey === "CUSTOM"
                      ? t("workspace.quiz.difficultyLevels.custom", "Tùy chỉnh")
                      : t(`workspace.quiz.difficultyLevels.${String(quiz.overallDifficulty).toLowerCase()}`)}
                  </span>
                ) : null}
              </div>
            </div>

            {!shouldHideRoadmapVisibility ? (
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${isDarkMode ? visibilityMeta.darkClassName : visibilityMeta.lightClassName}`}>
                <VisibilityIcon className="h-4 w-4" />
                {visibilityMeta.shortLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
            {overviewStats.map(({ label, value, hint, icon: StatIcon }) => (
              <div
                key={label}
                className={`rounded-2xl border p-4 ${
                  isDarkMode
                    ? "border-slate-700 bg-slate-900/70"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <StatIcon className={`h-4 w-4 shrink-0 ${isDarkMode ? "text-blue-300" : "text-blue-600"}`} />
                  <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {label}
                  </p>
                </div>
                <p className={`mt-2 text-base font-semibold md:text-[18px] ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  {value}
                  {hint ? (
                    <span className={`ml-1 text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      {hint}
                    </span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>

          <div className={`mt-4 flex flex-col gap-3 border-t pt-3 ${isDarkMode ? "border-slate-700/70" : "border-slate-100"} lg:flex-row lg:items-center lg:justify-between`}>
            <div className="flex flex-wrap items-center gap-2">
              {typeof quiz.timerMode === "boolean" ? (
                <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${
                  quiz.timerMode
                    ? (isDarkMode ? "bg-blue-950/40 text-blue-300" : "bg-blue-100 text-blue-700")
                    : (isDarkMode ? "bg-emerald-950/40 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                }`}>
                  {quiz.timerMode
                    ? t("workspace.quiz.examModeType1", "Exam giới hạn thời gian tổng")
                    : t("workspace.quiz.examModeType2", "Exam theo từng câu")}
                </span>
              ) : null}
              {quiz.quizIntent && !shouldHideRoadmapIntentBadge ? (
                <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${isDarkMode ? is.dark || "bg-slate-800 text-slate-400" : is.light || "bg-slate-100 text-slate-600"}`}>
                  {t(`workspace.quiz.intentLabels.${quiz.quizIntent}`, quiz.quizIntent)}
                </span>
              ) : null}
              {!shouldHideActiveStatusBadge ? (
                <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${isDarkMode ? ss.dark : ss.light}`}>
                  {statusLabel}
                </span>
              ) : null}
              <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${
                myPassed
                  ? (isDarkMode ? "bg-emerald-950/40 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                  : myAttempted
                    ? (isDarkMode ? "bg-amber-950/40 text-amber-300" : "bg-amber-100 text-amber-700")
                    : (isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")
              }`}>
                {resultLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {myAttempted && !hasSubmittedFeedback ? renderQuizFeedbackAction(
                resolvedQuizId,
                `inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${
                  isDarkMode
                    ? "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`,
              ) : null}
              {isProcessing ? (
                <div className={`min-w-[170px] rounded-2xl border px-4 py-3 ${isDarkMode ? "border-sky-900/60 bg-sky-950/20" : "border-sky-200 bg-sky-50/70"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-xs font-semibold ${isDarkMode ? "text-sky-200" : "text-sky-700"}`}>
                      {t("workspace.quiz.processingProgressLabel", "Đang tạo quiz")}
                    </span>
                    <span className={`text-xs font-semibold ${isDarkMode ? "text-sky-200" : "text-sky-700"}`}>
                      {processingPercent}%
                    </span>
                  </div>
                  <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`}>
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${processingBarWidth}%` }} />
                  </div>
                </div>
              ) : normalizedStatus === "ACTIVE" ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExamStartQuiz(quiz);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${
                    isDarkMode
                      ? "bg-emerald-900/60 text-emerald-200"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                  title={roadmapExamLabel}
                >
                  <ClipboardCheck className="h-4.5 w-4.5" />
                  <span>{myAttempted ? roadmapRetakeExamLabel : roadmapExamLabel}</span>
                </button>
              ) : (
                <span className={`inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold ${isDarkMode ? ss.dark : ss.light}`}>
                  {statusLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`${embedded ? "" : "flex h-full flex-col px-2 py-3 sm:px-3 sm:py-4"} ${fontClass}`}>
      {!embedded ? (
        <div className={`mb-4 border-b px-2 pb-4 ${isDarkMode ? "border-slate-800" : "border-slate-200/90"}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {typeof onNavigateHome === "function" ? (
                <HomeButton onClick={onNavigateHome} />
              ) : null}
              <div className="min-w-0 flex-1 sm:max-w-[420px] md:max-w-[460px] lg:max-w-[520px]">
              <div className="relative">
                <Search className={`pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
                  placeholder={t("workspace.listView.searchPlaceholder")}
                  className={`h-11 w-full rounded-full border py-2 pl-10 pr-10 text-sm outline-none transition-colors ${
                    isDarkMode
                      ? "border-slate-700 bg-slate-950/70 text-white placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
                      : "border-slate-200 bg-[#f8fafc] text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  }`}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 ${isDarkMode ? "text-slate-500 hover:bg-slate-800 hover:text-slate-300" : "text-slate-400 hover:bg-white hover:text-slate-600"}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 md:ml-auto">
              <Button
                variant="outline"
                onClick={() => fetchQuizzes({ silent: true, scopeId: contextId })}
                disabled={loading}
                className={`h-11 rounded-full border px-3 ${isDarkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              {String(contextType || "").toUpperCase() === "WORKSPACE" && typeof onOpenCommunityQuiz === "function" ? (
                <Button
                  variant="outline"
                  onClick={onOpenCommunityQuiz}
                  className={`h-11 rounded-full border px-4 ${isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  <Globe className="mr-2 h-4 w-4" />
                  <span className="text-sm">{t("workspace.quiz.communityExplorer.title", "Community Quiz")}</span>
                </Button>
              ) : null}
              {!hideCreateButton ? (
                <Button
                  disabled={disableCreate}
                  onClick={onCreateQuiz}
                  className="h-11 rounded-full bg-[#2563EB] px-4 text-white transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#2563EB]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="text-sm">{t("workspace.listView.create")}</span>
                </Button>
              ) : null}
            </div>
          </div>

          {isGroupQuizList ? (
            <div className={`mt-3 flex flex-wrap items-center gap-2 pt-1 ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
              {[
                { key: "all", label: t("workspace.quiz.groupAudience.all", "Tất cả") },
                { key: "ALL_MEMBERS", label: t("workspace.quiz.groupAudience.wholeGroup", "Chung cả nhóm") },
                { key: "SELECTED_MEMBERS", label: t("workspace.quiz.groupAudience.assignedMembers", "Giao riêng") },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGroupAudienceFilter(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    groupAudienceFilter === key
                      ? isDarkMode
                        ? "bg-violet-600/25 text-violet-200 ring-1 ring-violet-500/35"
                        : "bg-slate-900 text-white"
                      : isDarkMode
                        ? "bg-slate-900 text-slate-300 hover:bg-slate-800"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
              {groupAudienceFilter === "SELECTED_MEMBERS" ? (
                <select
                  value={groupMemberUserId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setGroupMemberUserId(v === "" ? null : Number(v));
                  }}
                  disabled={groupMembersLoading}
                  title={t("workspace.quiz.groupAudience.pickMemberHint", "Chọn tên để chỉ xem quiz được giao cho người đó")}
                  className={`h-9 max-w-[min(240px,100%)] rounded-full border px-3 text-xs outline-none transition-colors ${
                    isDarkMode
                      ? "border-slate-600 bg-slate-950/60 text-slate-100 disabled:opacity-50"
                      : "border-slate-200 bg-[#f8fafc] text-slate-900 disabled:opacity-50"
                  }`}
                >
                  <option value="">{t("workspace.quiz.groupAudience.pickMemberPlaceholder", "Tất cả quiz giao riêng")}</option>
                  {groupMembers.map((m) => {
                    const uid = Number(m.userId ?? m.id);
                    if (!Number.isInteger(uid) || uid <= 0) return null;
                    const optLabel = m.fullName || m.username || `User ${uid}`;
                    return <option key={uid} value={uid}>{optLabel}</option>;
                  })}
                </select>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Danh sách quiz */}
      <div className={`${embedded ? "px-0" : "min-h-0 flex-1 overflow-y-auto"}`}>
        {fetchError && quizzes.length > 0 ? (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
              isDarkMode
                ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {t(
              "workspace.quiz.loadErrorInline",
              "Không thể làm mới danh sách quiz lúc này. Nội dung cũ vẫn được giữ lại để tránh giật giao diện.",
            )}
          </div>
        ) : null}
        {loading && !hasResolvedInitialFetch && quizzes.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center py-16">
            <Loader2 className={`mb-2 h-8 w-8 animate-spin ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.loading")}</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
            <FolderOpen className={`mb-3 h-12 w-12 ${isDarkMode ? "text-slate-600" : "text-slate-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {fetchError
                ? t(
                    "workspace.quiz.loadErrorSoft",
                    "Không tải được danh sách quiz lúc này. Giao diện vẫn được giữ ổn định, hãy thử lại sau ít phút.",
                  )
                : t("workspace.roadmap.noQuizYet")}
            </p>
            {!hideCreateButton ? (
              <Button
                disabled={disableCreate}
                onClick={onCreateQuiz}
                className="mt-4 h-10 rounded-full bg-[#2563EB] px-4 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#2563EB]"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="text-sm">{t("workspace.studio.actions.createQuiz")}</span>
              </Button>
            ) : null}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16">
            <FolderOpen className={`mb-3 h-10 w-10 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.listView.noResults")}</p>
          </div>
        ) : (
          <div className={useLegacyRoadmapCards ? "space-y-2" : "mx-auto grid max-w-[1080px] grid-cols-1 gap-4 md:grid-cols-2"}>
            {filtered.map((quiz) => {
              if (useLegacyRoadmapCards) {
                return renderLegacyRoadmapCard(quiz);
              }

              const resolvedQuizId = resolveQuizNavigationId(quiz);
              const isCommunityShared = quiz?.communityShared === true;
              const isRoadmapContextQuiz = isRoadmapQuiz(quiz);
              const shouldHideRoadmapVisibility = isRoadmapContextQuiz;
              const durationInMinutes = getDurationInMinutes(quiz);
              const normalizedStatus = String(quiz?.status || "").toUpperCase();
              const isProcessing = normalizedStatus === "PROCESSING";
              const processingPercent = resolveQuizProcessingPercent(
                quiz,
                progressTracking,
                quizGenerationTaskByQuizId,
                quizGenerationProgressByQuizId,
              );
              const processingBarWidth = processingPercent > 0 ? Math.max(10, processingPercent) : 10;
              const difficultyKey = String(quiz?.overallDifficulty || "").toUpperCase();
              const difficultyMeta = DIFFICULTY_STYLES[difficultyKey] || DIFFICULTY_STYLES.CUSTOM;
              const myAttempted = quiz?.myAttempted === true;
              const myPassed = quiz?.myPassed === true;
              const hasSubmittedFeedback = feedbackStatusByQuizId[resolvedQuizId]?.submitted === true;
              const intentLabel = quiz?.quizIntent && !isRoadmapContextQuiz
                ? t(`workspace.quiz.intentLabels.${quiz.quizIntent}`, quiz.quizIntent)
                : null;
              const showShareAction = onShareQuiz && !shouldHideRoadmapVisibility && !isProcessing;
              const questionCount = Number(quiz?.questionCount ?? quiz?.totalQuestion ?? quiz?.totalQuestions ?? 0) || 0;
              const scoreValue = Number(quiz?.latestScore ?? quiz?.score ?? quiz?.myScore ?? quiz?.marksScored ?? quiz?.markScored);
              const resolvedScoreValue = Number.isFinite(scoreValue) && scoreValue >= 0 ? scoreValue : null;
              const maxScore = Number(quiz?.maxScore);
              const resultLabel = isProcessing
                ? t("workspace.quiz.processingProgressLabel", "Đang tạo quiz")
                : myAttempted
                  ? (myPassed ? t("workspace.quiz.myPassedTrue", "Đã đậu") : t("workspace.quiz.myPassedFalse", "Chưa đậu"))
                  : t("workspace.quiz.myAttemptedFalse", "Chưa làm");
              const resultToneClassName = isProcessing
                ? (isDarkMode ? "text-sky-300" : "text-sky-700")
                : myAttempted
                  ? (myPassed ? (isDarkMode ? "text-emerald-300" : "text-emerald-700") : (isDarkMode ? "text-amber-300" : "text-amber-700"))
                  : (isDarkMode ? "text-slate-300" : "text-slate-700");
              const difficultyLabel = difficultyKey === "CUSTOM"
                ? t("workspace.quiz.difficultyLevels.custom", "Tùy chỉnh")
                : t(`workspace.quiz.difficultyLevels.${String(quiz?.overallDifficulty || "medium").toLowerCase()}`);
              const resultDisplay = resolvedScoreValue != null
                ? (maxScore > 0 ? `${resolvedScoreValue}/${maxScore}` : `${resolvedScoreValue}`)
                : resultLabel;
              const durationLabel = durationInMinutes > 0
                ? `${durationInMinutes} ${t("workspace.quiz.minutesShort", "phút")}`
                : null;
              const createdAtLabel = formatShortDate(quiz.createdAt || quiz.updatedAt);
              const difficultyTextClassName = difficultyKey === "HARD"
                ? (isDarkMode ? "text-rose-300" : "text-rose-600")
                : difficultyKey === "MEDIUM"
                  ? (isDarkMode ? "text-amber-300" : "text-amber-600")
                  : difficultyKey === "EASY"
                    ? (isDarkMode ? "text-emerald-300" : "text-emerald-600")
                    : (isDarkMode ? "text-slate-300" : "text-slate-600");

              return (
                <article
                  key={resolvedQuizId}
                  role="button"
                  tabIndex={0}
                  onClick={() => onViewQuiz?.(quiz)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onViewQuiz?.(quiz);
                    }
                  }}
                  className={`h-full cursor-pointer rounded-[24px] border px-5 py-4 transition-all duration-200 ${
                    isDarkMode
                      ? "border-slate-800 bg-slate-900/80 shadow-[0_28px_72px_-34px_rgba(2,6,23,0.7)] hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-[0_34px_86px_-34px_rgba(59,130,246,0.28)]"
                      : "border-slate-300/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_28px_72px_-34px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_36px_90px_-36px_rgba(37,99,235,0.28)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className={`line-clamp-2 text-[21px] font-semibold leading-snug tracking-[-0.02em] ${isDarkMode ? "text-slate-100" : "text-slate-950"}`}>
                        {quiz.title || "—"}
                      </h3>
                    </div>

                    <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
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

                  {isProcessing ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className={`text-sm font-semibold ${isDarkMode ? "text-sky-200" : "text-sky-700"}`}>
                          {t("workspace.quiz.processingProgressLabel", "Đang tạo quiz")}
                        </p>
                        <span className={`text-sm font-semibold ${isDarkMode ? "text-sky-200" : "text-sky-700"}`}>{processingPercent}%</span>
                      </div>
                      <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`}>
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${processingBarWidth}%` }} />
                      </div>
                    </div>
                  ) : null}

                  <div className={`mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] ${isDarkMode ? "text-slate-300" : "text-slate-800"}`}>
                    {myAttempted ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Kết quả</span>
                        <span className={`font-semibold ${resultToneClassName}`}>{resultDisplay}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{t("workspace.quiz.roadmapOverview.questions", "Câu hỏi")}</span>
                      <span className="font-semibold">{questionCount > 0 ? questionCount : "-"}</span>
                    </div>
                  </div>

                  <div className={`mt-4 flex items-end justify-between gap-3 border-t pt-3 ${isDarkMode ? "border-slate-800" : "border-slate-200/80"}`}>
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
                      {!shouldHideRoadmapVisibility ? (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isDarkMode ? "border-slate-700 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                          {isCommunityShared ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          <span>{isCommunityShared ? t("workspace.quiz.communityPublic", "Công khai") : t("workspace.quiz.privateShort", "Riêng tư")}</span>
                        </span>
                      ) : null}
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
        )}
      </div>

      <Dialog open={Boolean(examStartQuiz)} onOpenChange={(open) => { if (!open) setExamStartQuiz(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("workspace.quiz.exam", "KIểm tra")}</DialogTitle>
            <DialogDescription>
              {t("workspace.quiz.startExamPrompt", "Xác nhận bắt đầu ở chế độ kiểm tra?")}
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
