import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, X, Plus, BadgeCheck, FolderOpen, Clock, RefreshCw, Trash2, Loader2, Timer, BarChart3, Play, ClipboardCheck, Globe, Lock, MoreVertical, Users, UserPlus, ChevronDown, ChevronLeft, ChevronRight, Check, Eye, MessageSquareText } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import DirectFeedbackButton from "@/Components/feedback/DirectFeedbackButton";
import FeedbackSubmitDialog from "@/Components/feedback/FeedbackSubmitDialog";
import { getQuizzesByScope, deleteQuiz, getQuizById, updateQuiz, setGroupQuizAudience } from "@/api/QuizAPI";
import { getGroupMembers } from "@/api/GroupAPI";
import { unwrapApiData } from "@/Utils/apiResponse";
import { getFeedbackTargetStatuses } from "@/api/FeedbackAPI";
import { useToast } from "@/context/ToastContext";
import { getDurationInMinutes } from "@/lib/quizDurationDisplay";
import { cn } from "@/lib/utils";
import UserDisplayName from "@/Components/users/UserDisplayName";
import { getUserDisplayLabel } from "@/Utils/userProfile";
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

// Bộ lọc theo trạng thái
const STATUS_FILTER_OPTIONS = ["all", "ACTIVE", "DRAFT", "COMPLETED"];
const GROUP_FILTER_OPTIONS = ["all", "ALL_MEMBERS", "SELECTED_MEMBERS"];
const QUIZ_PAGE_SIZE = 8;

function toggleMultiFilterOption(currentOptions, option) {
  const normalized = String(option || "");
  const currentSet = new Set((currentOptions || []).map((value) => String(value || "")));

  if (normalized === "all") {
    return ["all"];
  }

  if (currentSet.has(normalized)) {
    currentSet.delete(normalized);
  } else {
    currentSet.add(normalized);
  }
  currentSet.delete("all");

  const next = Array.from(currentSet);
  return next.length > 0 ? next : ["all"];
}

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
  return getUserDisplayLabel(m, `User ${uid}`);
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

function GroupMemberAvatar({ member, fallback, isDarkMode, sizeClass = "h-7 w-7", textClass = "text-[10px]" }) {
  const avatarSrc = member?.avatar || member?.avatarUrl || "";
  const initial = String(fallback || member?.fullName || member?.username || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
        sizeClass,
        textClass,
        avatarSrc
          ? "bg-transparent"
          : isDarkMode
            ? "bg-slate-800 text-slate-200"
            : "bg-slate-100 text-slate-700",
      )}
    >
      {avatarSrc ? (
        <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
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
  onShareQuiz,
  onOpenCommunityQuiz,
  progressTracking = null,
  quizGenerationTaskByQuizId = null,
  quizGenerationProgressByQuizId = null,
  legacyRoadmapUI = false,
  groupRole = "MEMBER",
  groupCurrentUserId = null,
}) {
  const { t, i18n } = useTranslation();
  const { showError } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedStatusFilters, setAppliedStatusFilters] = useState(["all"]);
  const [pendingStatusFilters, setPendingStatusFilters] = useState(["all"]);
  const [statusFilterMenuOpen, setStatusFilterMenuOpen] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTargetQuiz, setDeleteTargetQuiz] = useState(null);
  const [sharingQuizId, setSharingQuizId] = useState(null);
  const [examStartQuiz, setExamStartQuiz] = useState(null);
  const [feedbackStatusByQuizId, setFeedbackStatusByQuizId] = useState({});
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [selectedQuizIds, setSelectedQuizIds] = useState([]);
  const [bulkActionDialog, setBulkActionDialog] = useState(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState("DRAFT");
  const [bulkAssignMode, setBulkAssignMode] = useState("ALL_MEMBERS");
  const [bulkAssignMemberUserId, setBulkAssignMemberUserId] = useState(null);
  const [appliedGroupFilters, setAppliedGroupFilters] = useState(["all"]);
  const [pendingGroupFilters, setPendingGroupFilters] = useState(["all"]);
  const [groupFilterMenuOpen, setGroupFilterMenuOpen] = useState(false);
  const [groupMemberUserId, setGroupMemberUserId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [feedbackDialogQuizId, setFeedbackDialogQuizId] = useState(null);
  const fetchGuardRef = useRef({
    inFlight: false,
    lastKey: "",
    lastFetchedAt: 0,
  });
  const fetchQuizzesRef = useRef(null);

  const resolvedReturnToPath = useMemo(() => {
    if (returnToPath) return returnToPath;
    if (contextType === "PHASE") {
      return resolveWorkspaceRoadmapReturnPath(location.pathname, contextId);
    }
    return `${location.pathname}${location.search || ""}`;
  }, [contextId, contextType, location.pathname, location.search, returnToPath]);

  const isGroupQuizList = String(contextType || "").toUpperCase() === "GROUP";
  const normalizedGroupRole = String(groupRole || "").toUpperCase();
  const canFilterGroupAssignees = normalizedGroupRole === "LEADER" || normalizedGroupRole === "CONTRIBUTOR";
  const isLeaderGroupQuizList = isGroupQuizList && normalizedGroupRole === "LEADER";
  const showResultColumn = !isLeaderGroupQuizList;
  const currentGroupUserId = Number(groupCurrentUserId);

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

  const hasAppliedSelectedMembersFilter = useMemo(
    () => appliedGroupFilters.includes("SELECTED_MEMBERS") && !appliedGroupFilters.includes("all"),
    [appliedGroupFilters],
  );

  useEffect(() => {
    if (!hasAppliedSelectedMembersFilter || !canFilterGroupAssignees) {
      setGroupMemberUserId(null);
    }
  }, [hasAppliedSelectedMembersFilter, canFilterGroupAssignees]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, appliedStatusFilters, appliedGroupFilters, groupMemberUserId]);

  const selectedGroupAudienceMember = useMemo(() => {
    if (groupMemberUserId == null) return null;
    return resolveGroupMember(groupMemberUserId, groupMembers);
  }, [groupMemberUserId, groupMembers]);

  const selectedQuizIdSet = useMemo(() => new Set(selectedQuizIds), [selectedQuizIds]);

  useEffect(() => {
    setSelectedQuizIds((current) => {
      if (!current.length) return current;
      const existing = new Set(
        quizzes
          .map((quiz) => Number(resolveQuizNavigationId(quiz)))
          .filter((id) => Number.isInteger(id) && id > 0),
      );
      const next = current.filter((id) => existing.has(id));
      return next.length === current.length ? current : next;
    });
  }, [quizzes]);

  useEffect(() => {
    if (!isLeaderGroupQuizList) {
      setSelectedQuizIds([]);
      setBulkActionDialog(null);
    }
  }, [isLeaderGroupQuizList]);

  const toggleQuizSelection = useCallback((quizId, checked) => {
    if (!isLeaderGroupQuizList) return;
    const normalized = Number(quizId);
    if (!Number.isInteger(normalized) || normalized <= 0) return;
    setSelectedQuizIds((current) => {
      if (checked) {
        if (current.includes(normalized)) return current;
        return [...current, normalized];
      }
      return current.filter((id) => id !== normalized);
    });
  }, [isLeaderGroupQuizList]);

  const openBulkActionDialog = useCallback((mode) => {
    if (!isLeaderGroupQuizList || selectedQuizIds.length === 0) return;
    setBulkActionDialog(mode);
  }, [isLeaderGroupQuizList, selectedQuizIds.length]);

  const handleBulkAssign = useCallback(async () => {
    if (!selectedQuizIds.length) return;
    if (bulkAssignMode === "SELECTED_MEMBERS") {
      const memberId = Number(bulkAssignMemberUserId);
      if (!Number.isInteger(memberId) || memberId <= 0) {
        showError(t("workspace.quiz.bulk.memberRequired", "Vui lòng chọn thành viên để giao quiz."));
        return;
      }
    }

    const payload = bulkAssignMode === "ALL_MEMBERS"
      ? { mode: "ALL_MEMBERS" }
      : { mode: "SELECTED_MEMBERS", assigneeUserIds: [Number(bulkAssignMemberUserId)] };

    setBulkActionLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedQuizIds.map((quizId) => setGroupQuizAudience(quizId, payload)),
      );
      const successCount = results.filter((result) => result.status === "fulfilled").length;
      if (successCount !== selectedQuizIds.length) {
        showError(
          t("workspace.quiz.bulk.failed", { success: successCount, total: selectedQuizIds.length }),
        );
      }
      if (fetchQuizzesRef.current) {
        await fetchQuizzesRef.current({ silent: true });
      }
      setSelectedQuizIds([]);
      setBulkActionDialog(null);
    } finally {
      setBulkActionLoading(false);
    }
  }, [bulkAssignMemberUserId, bulkAssignMode, selectedQuizIds, showError, t]);

  const handleBulkStatusChange = useCallback(async () => {
    if (!selectedQuizIds.length) return;
    setBulkActionLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedQuizIds.map((quizId) => updateQuiz(quizId, { status: bulkStatusValue })),
      );
      const successCount = results.filter((result) => result.status === "fulfilled").length;
      if (successCount !== selectedQuizIds.length) {
        showError(
          t("workspace.quiz.bulk.failed", { success: successCount, total: selectedQuizIds.length }),
        );
      }
      if (fetchQuizzesRef.current) {
        await fetchQuizzesRef.current({ silent: true });
      }
      setSelectedQuizIds([]);
      setBulkActionDialog(null);
    } finally {
      setBulkActionLoading(false);
    }
  }, [bulkStatusValue, selectedQuizIds, showError, t]);

  const handleBulkDelete = useCallback(async () => {
    if (!selectedQuizIds.length) return;
    setBulkActionLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedQuizIds.map((quizId) => deleteQuiz(quizId)),
      );
      const successCount = results.filter((result) => result.status === "fulfilled").length;
      if (successCount !== selectedQuizIds.length) {
        showError(
          t("workspace.quiz.bulk.failed", { success: successCount, total: selectedQuizIds.length }),
        );
      }
      if (fetchQuizzesRef.current) {
        await fetchQuizzesRef.current({ silent: true });
      }
      setSelectedQuizIds([]);
      setBulkActionDialog(null);
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedQuizIds, showError, t]);

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

  fetchQuizzesRef.current = fetchQuizzes;

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
    const activeStatusFilters = appliedStatusFilters.includes("all")
      ? []
      : appliedStatusFilters.filter((value) => value !== "all");
    if (activeStatusFilters.length > 0) {
      items = items.filter((q) => activeStatusFilters.some((statusKey) => {
        if (statusKey === "COMPLETED") {
          return q?.myAttempted === true || q?.status === "COMPLETED";
        }
        return q?.status === statusKey;
      }));
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((q) => q.title?.toLowerCase().includes(query));
    }
    if (isGroupQuizList) {
      const activeGroupFilters = appliedGroupFilters.includes("all")
        ? []
        : appliedGroupFilters.filter((value) => value !== "all");
      if (activeGroupFilters.length > 0) {
        const allowAllMembers = activeGroupFilters.includes("ALL_MEMBERS");
        const allowSelectedMembers = activeGroupFilters.includes("SELECTED_MEMBERS");
        const enforcedMemberUserId = allowSelectedMembers
          ? (
            canFilterGroupAssignees
              ? groupMemberUserId
              : Number.isInteger(currentGroupUserId) && currentGroupUserId > 0
                ? currentGroupUserId
                : null
          )
          : null;

        items = items.filter((q) => {
          const mode = normalizeGroupAudienceMode(q);
          if (mode === "ALL_MEMBERS") {
            return allowAllMembers;
          }
          if (!allowSelectedMembers) {
            return false;
          }
          if (enforcedMemberUserId != null && Number.isInteger(Number(enforcedMemberUserId))) {
            const uid = Number(enforcedMemberUserId);
            return getQuizAssignedUserIds(q).includes(uid);
          }
          return true;
        });
      }
    }
    return items;
  }, [
    quizzes,
    searchQuery,
    appliedStatusFilters,
    isGroupQuizList,
    appliedGroupFilters,
    groupMemberUserId,
    canFilterGroupAssignees,
    currentGroupUserId,
  ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / QUIZ_PAGE_SIZE)),
    [filtered.length],
  );

  useEffect(() => {
    setCurrentPage((previous) => (previous > totalPages ? totalPages : previous));
  }, [totalPages]);

  const paginatedFiltered = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * QUIZ_PAGE_SIZE;
    return filtered.slice(startIndex, startIndex + QUIZ_PAGE_SIZE);
  }, [filtered, currentPage, totalPages]);

  const paginationStartIndex = filtered.length === 0
    ? 0
    : ((Math.min(currentPage, totalPages) - 1) * QUIZ_PAGE_SIZE) + 1;
  const paginationEndIndex = Math.min(filtered.length, Math.min(currentPage, totalPages) * QUIZ_PAGE_SIZE);

  const visibleFilteredQuizIds = useMemo(
    () => paginatedFiltered
      .map((quiz) => Number(resolveQuizNavigationId(quiz)))
      .filter((id) => Number.isInteger(id) && id > 0),
    [paginatedFiltered],
  );
  const allVisibleSelected = visibleFilteredQuizIds.length > 0
    && visibleFilteredQuizIds.every((id) => selectedQuizIdSet.has(id));
  const desktopGridColumns = isLeaderGroupQuizList
    ? "grid-cols-[44px_minmax(180px,2.2fr)_120px_minmax(190px,1.7fr)_110px_100px_64px]"
    : "grid-cols-[minmax(180px,2.2fr)_120px_minmax(190px,1.7fr)_110px_100px_120px_64px]";
  const useLegacyRoadmapCards = legacyRoadmapUI;

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
    <div className={`${embedded ? "" : "h-full flex flex-col"} ${fontClass}`}>
      {/* Header */}
      {!embedded ? (
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-blue-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>{title || t("workspace.studio.actions.quiz")}</p>
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

      {/* Tìm kiếm + bộ lọc */}
      {!embedded ? (
      <div className="px-4 py-2">
        <div
          className={`rounded-2xl border p-2.5 shadow-sm transition-all ${
            isLeaderGroupQuizList && selectedQuizIds.length > 0
              ? (isDarkMode
                ? "border-blue-700/60 bg-blue-950/20 ring-1 ring-blue-500/30"
                : "border-blue-200 bg-blue-50/80 ring-1 ring-blue-200")
              : (isDarkMode ? "border-slate-700/90 bg-slate-900/45" : "border-slate-200/90 bg-slate-50/90")
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className={`pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("workspace.listView.searchPlaceholder")}
                className={`h-9 w-full rounded-xl border py-1.5 pl-10 pr-9 text-sm outline-none transition-colors ${
                  isDarkMode
                    ? "border-slate-700 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
                    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                }`}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 ${isDarkMode ? "text-slate-500 hover:bg-slate-800 hover:text-slate-300" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2 sm:shrink-0">
              <DropdownMenu open={statusFilterMenuOpen} onOpenChange={(open) => {
                setStatusFilterMenuOpen(open);
                if (open) setPendingStatusFilters(appliedStatusFilters);
              }}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-medium",
                      isDarkMode
                        ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <span>{t("workspace.quiz.filterBar.statusSection", "Trạng thái")}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                      {pendingStatusFilters.includes("all") ? t("workspace.quiz.statusFilter.all", "Tất cả") : pendingStatusFilters.length}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={`w-56 p-2 ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                    {t("workspace.quiz.filterBar.statusSection", "Trạng thái")}
                  </p>
                  <div className="space-y-1">
                    {STATUS_FILTER_OPTIONS.map((opt) => {
                      const checked = pendingStatusFilters.includes(opt);
                      return (
                        <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100/10">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setPendingStatusFilters((current) => toggleMultiFilterOption(current, opt))}
                          />
                          <span>{t(`workspace.quiz.statusFilter.${opt}`)}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-2 border-t pt-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setPendingStatusFilters(["all"])}>
                      {t("workspace.quiz.bulk.clear", "Bỏ chọn")}
                    </Button>
                    <Button type="button" size="sm" onClick={() => {
                      setAppliedStatusFilters(pendingStatusFilters);
                      setStatusFilterMenuOpen(false);
                    }}>
                      {t("workspace.quiz.bulk.apply", "Áp dụng")}
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {isGroupQuizList ? (
                <DropdownMenu open={groupFilterMenuOpen} onOpenChange={(open) => {
                  setGroupFilterMenuOpen(open);
                  if (open) setPendingGroupFilters(appliedGroupFilters);
                }}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-medium",
                        isDarkMode
                          ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      <span>{t("workspace.quiz.filterBar.groupSection", "Nhóm")}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                        {pendingGroupFilters.includes("all") ? t("workspace.quiz.groupAudience.all", "Tất cả") : pendingGroupFilters.length}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={`w-64 p-2 ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                      {t("workspace.quiz.filterBar.groupSection", "Nhóm")}
                    </p>
                    <div className="space-y-1">
                      {GROUP_FILTER_OPTIONS.map((opt) => {
                        const checked = pendingGroupFilters.includes(opt);
                        const label = opt === "all"
                          ? t("workspace.quiz.groupAudience.all", "Tất cả")
                          : opt === "ALL_MEMBERS"
                            ? t("workspace.quiz.groupAudience.wholeGroup", "Chung cả nhóm")
                            : (canFilterGroupAssignees
                              ? t("workspace.quiz.groupAudience.assignedMembers", "Giao riêng")
                              : t("workspace.quiz.groupAudience.assignedToMe", "Được giao"));
                        return (
                          <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100/10">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setPendingGroupFilters((current) => toggleMultiFilterOption(current, opt))}
                            />
                            <span>{label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-2 border-t pt-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setPendingGroupFilters(["all"])}>
                        {t("workspace.quiz.bulk.clear", "Bỏ chọn")}
                      </Button>
                      <Button type="button" size="sm" onClick={() => {
                        setAppliedGroupFilters(pendingGroupFilters);
                        setGroupFilterMenuOpen(false);
                      }}>
                        {t("workspace.quiz.bulk.apply", "Áp dụng")}
                      </Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>

          {isLeaderGroupQuizList && !useLegacyRoadmapCards ? (
            <div className={`mt-2 flex flex-col gap-2 border-t pt-2 sm:flex-row sm:items-center sm:justify-between ${isDarkMode ? "border-slate-700/80" : "border-slate-200/90"}`}>
              <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                {t("workspace.quiz.bulk.selectedCount", { count: selectedQuizIds.length })}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={selectedQuizIds.length === 0}
                  onClick={() => openBulkActionDialog("assign")}
                  className={`h-8 rounded-full px-3 text-sm transition-all ${
                    isDarkMode
                      ? "border-blue-700/70 bg-blue-900/30 text-blue-200 hover:bg-blue-900/45"
                      : "border-blue-200 bg-blue-100/80 text-blue-700 hover:bg-blue-200/80"
                  }`}
                >
                  {t("workspace.quiz.bulk.assign", "Giao")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={selectedQuizIds.length === 0}
                  onClick={() => openBulkActionDialog("status")}
                  className={`h-8 rounded-full px-3 text-sm transition-all ${
                    isDarkMode
                      ? "border-amber-700/70 bg-amber-900/25 text-amber-200 hover:bg-amber-900/40"
                      : "border-amber-200 bg-amber-100/80 text-amber-700 hover:bg-amber-200/80"
                  }`}
                >
                  {t("workspace.quiz.bulk.changeStatus", "Đổi trạng thái")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={selectedQuizIds.length === 0}
                  onClick={() => openBulkActionDialog("delete")}
                  className={`h-8 rounded-full px-3 text-sm transition-all ${
                    isDarkMode
                      ? "border-rose-700/70 bg-rose-900/25 text-rose-200 hover:bg-rose-900/40"
                      : "border-rose-200 bg-rose-100/80 text-rose-700 hover:bg-rose-200/80"
                  }`}
                >
                  {t("workspace.quiz.bulk.delete", "Xóa")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={selectedQuizIds.length === 0}
                  onClick={() => setSelectedQuizIds([])}
                  className={`h-8 rounded-full px-2 text-sm ${isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-white"}`}
                >
                  {t("workspace.quiz.bulk.clear", "Bỏ chọn")}
                </Button>
              </div>
            </div>
          ) : null}

          {isGroupQuizList && hasAppliedSelectedMembersFilter && canFilterGroupAssignees ? (
            <div className={`mt-2 border-t pt-2 ${isDarkMode ? "border-slate-700/80" : "border-slate-200/90"}`}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={groupMembersLoading}
                    title={t("workspace.quiz.groupAudience.pickMemberHint", "Chọn tên để chỉ xem quiz được giao cho người đó")}
                    className={cn(
                      "inline-flex min-w-[220px] max-w-full items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left text-[12px] outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      isDarkMode
                        ? "border-slate-600 bg-slate-950/60 text-slate-100 hover:bg-slate-900"
                        : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                    )}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      {selectedGroupAudienceMember ? (
                        <>
                          <GroupMemberAvatar
                            member={selectedGroupAudienceMember}
                            fallback={resolveMemberDisplayName(groupMemberUserId, groupMembers)}
                            isDarkMode={isDarkMode}
                            sizeClass="h-6 w-6"
                            textClass="text-[10px]"
                          />
                          <UserDisplayName
                            user={selectedGroupAudienceMember}
                            fallback={t("workspace.quiz.groupAudience.memberFallback", { id: groupMemberUserId })}
                            isDarkMode={isDarkMode}
                            className="min-w-0"
                          />
                        </>
                      ) : (
                        <span className={cn("truncate", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                          {groupMembersLoading
                            ? t("workspace.quiz.audience.loadingMembers", "Loading members...")
                            : t("workspace.quiz.groupAudience.pickMemberPlaceholder", "Tất cả quiz giao riêng")}
                        </span>
                      )}
                    </span>
                    <ChevronDown className={cn("h-3.5 w-3.5 shrink-0", isDarkMode ? "text-slate-500" : "text-slate-400")} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className={cn(
                    "max-h-72 w-72 overflow-y-auto p-1",
                    isDarkMode ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-900",
                  )}
                >
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs"
                    onSelect={() => setGroupMemberUserId(null)}
                  >
                    <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")}>
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <span className="min-w-0 flex-1 truncate">
                      {t("workspace.quiz.groupAudience.pickMemberPlaceholder", "Tất cả quiz giao riêng")}
                    </span>
                    {groupMemberUserId == null ? <Check className="h-3.5 w-3.5 shrink-0 text-violet-500" /> : null}
                  </DropdownMenuItem>
                  {groupMembers.map((m) => {
                    const uid = Number(m.userId ?? m.id);
                    if (!Number.isInteger(uid) || uid <= 0) return null;
                    const selected = Number(groupMemberUserId) === uid;
                    return (
                      <DropdownMenuItem
                        key={uid}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs"
                        onSelect={() => setGroupMemberUserId(uid)}
                      >
                        <GroupMemberAvatar
                          member={m}
                          fallback={resolveMemberDisplayName(uid, groupMembers)}
                          isDarkMode={isDarkMode}
                          sizeClass="h-7 w-7"
                          textClass="text-[10px]"
                        />
                        <UserDisplayName
                          user={m}
                          fallback={t("workspace.quiz.groupAudience.memberFallback", { id: uid })}
                          isDarkMode={isDarkMode}
                          className="min-w-0 flex-1"
                        />
                        {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-violet-500" /> : null}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
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
          <>
            <div className={useLegacyRoadmapCards ? "space-y-2" : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60"}>
            {!useLegacyRoadmapCards ? (
              <div
                className={`hidden min-h-11 ${desktopGridColumns} items-center gap-3 border-b px-4 text-xs font-semibold uppercase tracking-wide md:grid ${
                  isDarkMode ? "border-slate-700 bg-slate-900 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {isLeaderGroupQuizList ? (
                  <label className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer rounded border-slate-300"
                      checked={allVisibleSelected}
                      onChange={(event) => {
                        const { checked } = event.target;
                        setSelectedQuizIds((current) => {
                          if (!checked) {
                            return current.filter((id) => !visibleFilteredQuizIds.includes(id));
                          }
                          const next = new Set(current);
                          visibleFilteredQuizIds.forEach((id) => next.add(id));
                          return Array.from(next);
                        });
                      }}
                    />
                  </label>
                ) : null}
                <span>{t("workspace.quiz.list.columns.quiz", "Quiz")}</span>
                <span>{t("workspace.quiz.list.columns.status", "Trạng thái")}</span>
                <span>{t("workspace.quiz.list.columns.details", "Thông tin làm bài")}</span>
                <span>{t("workspace.quiz.list.columns.difficulty", "Độ khó")}</span>
                <span>{t("workspace.quiz.list.columns.duration", "Thời lượng")}</span>
                {showResultColumn ? <span>{t("workspace.quiz.list.columns.result", "Kết quả")}</span> : null}
                <span className="text-right">{t("workspace.quiz.list.columns.actions", "Thao tác")}</span>
              </div>
            ) : null}

            {paginatedFiltered.map((quiz) => {
              if (useLegacyRoadmapCards) {
                return renderLegacyRoadmapCard(quiz);
              }

              const resolvedQuizId = resolveQuizNavigationId(quiz);
              const resolvedQuizIdNumber = Number(resolvedQuizId);
              const rowKey = resolvedQuizId ?? `${quiz?.title || "quiz"}-${quiz?.createdAt || ""}`;
              const isCommunityShared = quiz?.communityShared === true;
              const isRoadmapContextQuiz = isRoadmapQuiz(quiz);
              const shouldHideRoadmapVisibility = isRoadmapContextQuiz;
              const durationInMinutes = getDurationInMinutes(quiz);
              const normalizedStatus = String(quiz?.status || "").toUpperCase();
              const isProcessing = normalizedStatus === "PROCESSING";
              const statusMeta = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.DRAFT;
              const statusLabel = t(`workspace.quiz.statusLabels.${normalizedStatus}`, normalizedStatus || "DRAFT");
              const processingPercent = resolveQuizProcessingPercent(
                quiz,
                progressTracking,
                quizGenerationTaskByQuizId,
                quizGenerationProgressByQuizId,
              );
              const processingBarWidth = processingPercent > 0 ? Math.max(8, processingPercent) : 8;
              const difficultyKey = String(quiz?.overallDifficulty || "").toUpperCase();
              const difficultyMeta = DIFFICULTY_STYLES[difficultyKey] || DIFFICULTY_STYLES.CUSTOM;
              const updatedLabel = formatShortDate(quiz.updatedAt || quiz.createdAt);
              const myAttempted = quiz?.myAttempted === true;
              const myPassed = quiz?.myPassed === true;
              const hasSubmittedFeedback = feedbackStatusByQuizId[resolvedQuizId]?.submitted === true;
              const intentValue = quiz?.quizIntent
                ? t(`workspace.quiz.intentLabels.${quiz.quizIntent}`, quiz.quizIntent)
                : t("workspace.quiz.list.labels.notAvailable", "Chưa có");
              const timerValue = typeof quiz.timerMode === "boolean"
                ? (quiz.timerMode
                  ? t("workspace.quiz.examModeType1Short", "Giới hạn thời gian tổng")
                  : t("workspace.quiz.examModeType2Short", "Theo từng câu"))
                : t("workspace.quiz.list.labels.notAvailable", "Chưa có");
              const showPracticeAction = normalizedStatus === "ACTIVE" && !isRoadmapContextQuiz;
              const showExamAction = normalizedStatus === "ACTIVE";
              const showFeedbackAction = myAttempted && !hasSubmittedFeedback && resolvedQuizId != null && resolvedQuizId !== "";
              const showShareAction = onShareQuiz && !shouldHideRoadmapVisibility && !isProcessing;
              const resultLabel = myAttempted
                ? (myPassed ? t("workspace.quiz.myPassedTrue", "Đã đậu") : t("workspace.quiz.myPassedFalse", "Chưa đậu"))
                : t("workspace.quiz.myAttemptedFalse", "Chưa làm");
              const groupAudienceMode = isGroupQuizList ? normalizeGroupAudienceMode(quiz) : null;
              const assignedNames = isGroupQuizList ? formatAssignedNames(quiz, groupMembers) : "";
              const audienceText = isGroupQuizList
                ? (
                  groupAudienceMode === "ALL_MEMBERS"
                    ? t("workspace.quiz.groupAudience.badgeWholeGroup", "Chung nhóm")
                    : `${t("workspace.quiz.groupAudience.badgeAssigned", "Giao riêng")}${assignedNames ? `: ${assignedNames}` : ""}`
                )
                : (
                  isCommunityShared
                    ? t("workspace.quiz.communityPublic", "Công khai")
                    : t("workspace.quiz.privateShort", "Riêng tư")
                );
              const VisibilityIcon = isCommunityShared ? Globe : Lock;
              const isRowSelected = isLeaderGroupQuizList && selectedQuizIdSet.has(resolvedQuizIdNumber);
              const canSelectRow = isLeaderGroupQuizList && Number.isInteger(resolvedQuizIdNumber) && resolvedQuizIdNumber > 0;

              const renderActionMenu = () => (
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
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className={cn(
                      "w-56 p-1.5",
                      isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900",
                    )}
                  >
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e?.stopPropagation?.();
                        onViewQuiz?.(quiz);
                      }}
                      className={cn(
                        "cursor-pointer rounded-md px-2.5 py-2 text-[13px] font-medium",
                        isDarkMode ? "text-sky-200 focus:bg-sky-950/40 focus:text-sky-100" : "text-sky-700 focus:bg-sky-50 focus:text-sky-700",
                      )}
                    >
                      <Eye className="h-4 w-4 text-sky-500" />
                      <span>{t("workspace.quiz.list.actions.open", "Xem chi tiết")}</span>
                    </DropdownMenuItem>
                    {showPracticeAction ? (
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e?.stopPropagation?.();
                          handleStartQuiz('practice', quiz.quizId);
                        }}
                        className={cn(
                          "cursor-pointer rounded-md px-2.5 py-2 text-[13px] font-medium",
                          isDarkMode ? "text-blue-200 focus:bg-blue-950/35 focus:text-blue-100" : "text-blue-700 focus:bg-blue-50 focus:text-blue-700",
                        )}
                      >
                        <Play className="h-4 w-4 text-blue-500" />
                        <span>{t("workspace.quiz.practice", "Luyện tập")}</span>
                      </DropdownMenuItem>
                    ) : null}
                    {showExamAction ? (
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e?.stopPropagation?.();
                          setExamStartQuiz(quiz);
                        }}
                        className={cn(
                          "cursor-pointer rounded-md px-2.5 py-2 text-[13px] font-medium",
                          isDarkMode ? "text-emerald-200 focus:bg-emerald-950/35 focus:text-emerald-100" : "text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700",
                        )}
                      >
                        <ClipboardCheck className="h-4 w-4 text-emerald-500" />
                        <span>{t("workspace.quiz.exam", "Kiểm tra")}</span>
                      </DropdownMenuItem>
                    ) : null}
                    {showFeedbackAction ? (
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e?.stopPropagation?.();
                          const normalizedQuizId = Number(resolvedQuizId);
                          if (Number.isInteger(normalizedQuizId) && normalizedQuizId > 0) {
                            setFeedbackDialogQuizId(normalizedQuizId);
                          }
                        }}
                        className={cn(
                          "cursor-pointer rounded-md px-2.5 py-2 text-[13px] font-medium",
                          isDarkMode ? "text-violet-200 focus:bg-violet-950/35 focus:text-violet-100" : "text-violet-700 focus:bg-violet-50 focus:text-violet-700",
                        )}
                      >
                        <MessageSquareText className="h-4 w-4 text-violet-500" />
                        <span>{t("feedback", "Feedback")}</span>
                      </DropdownMenuItem>
                    ) : null}
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
                        className={cn(
                          "cursor-pointer rounded-md px-2.5 py-2 text-[13px] font-medium",
                          isDarkMode ? "text-cyan-200 focus:bg-cyan-950/35 focus:text-cyan-100" : "text-cyan-700 focus:bg-cyan-50 focus:text-cyan-700",
                        )}
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
                      className={cn(
                        "cursor-pointer rounded-md px-2.5 py-2 text-[13px] font-medium",
                        isDarkMode ? "text-rose-300 focus:bg-rose-950/35 focus:text-rose-200" : "text-rose-600 focus:bg-rose-50 focus:text-rose-600",
                      )}
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
              );

              return (
                <article
                  key={rowKey}
                  onClick={() => onViewQuiz?.(quiz)}
                  className={`cursor-pointer border-t transition-colors first:border-t-0 ${
                    isRowSelected
                      ? (isDarkMode ? "border-blue-800/70 bg-blue-950/20" : "border-blue-200 bg-blue-50/70")
                      : (isDarkMode
                        ? "border-slate-700 hover:bg-slate-800/35"
                        : "border-slate-200 hover:bg-slate-50")
                  }`}
                >
                  <div className={`hidden ${desktopGridColumns} items-center gap-3 px-4 py-3 md:grid`}>
                    {isLeaderGroupQuizList ? (
                      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-slate-300"
                          checked={canSelectRow ? selectedQuizIdSet.has(resolvedQuizIdNumber) : false}
                          disabled={!canSelectRow}
                          onChange={(event) => toggleQuizSelection(resolvedQuizIdNumber, event.target.checked)}
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                        {quiz.title || "-"}
                      </p>
                      <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {isGroupQuizList ? (
                          <span className="inline-flex items-center gap-1">
                            {groupAudienceMode === "ALL_MEMBERS" ? <Users className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                            <span className="truncate">{audienceText}</span>
                          </span>
                        ) : (
                          shouldHideRoadmapVisibility ? null : (
                            <span className="inline-flex items-center gap-1">
                              <VisibilityIcon className="h-3.5 w-3.5" />
                              {audienceText}
                            </span>
                          )
                        )}
                      </div>
                      <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                        {t("workspace.quiz.list.labels.updatedAt", "Cập nhật")}: {updatedLabel || "-"}
                      </p>
                    </div>

                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isDarkMode ? statusMeta.dark : statusMeta.light}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className={`space-y-1 text-xs ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                      <p><span className="font-semibold">{t("workspace.quiz.list.labels.intent", "Mục đích")}:</span> {intentValue}</p>
                      <p><span className="font-semibold">{t("workspace.quiz.list.labels.timerMode", "Kiểu thời gian")}:</span> {timerValue}</p>
                      {isProcessing ? (
                        <div className="pt-1">
                          <div className={`h-1.5 overflow-hidden rounded-full ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`}>
                            <div className="h-full rounded-full bg-sky-500" style={{ width: `${processingBarWidth}%` }} />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <span className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-semibold leading-none ${isDarkMode ? difficultyMeta.dark : difficultyMeta.light}`}>
                        <BarChart3 className="h-3.5 w-3.5" />
                        <span>
                          {difficultyKey === "CUSTOM"
                            ? t("workspace.quiz.difficultyLevels.custom", "Tùy chỉnh")
                            : t(`workspace.quiz.difficultyLevels.${String(quiz?.overallDifficulty || "medium").toLowerCase()}`)}
                        </span>
                      </span>
                    </div>

                    <div className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                      {durationInMinutes > 0 ? `${durationInMinutes} ${t("workspace.quiz.minutes", "phút")}` : "-"}
                    </div>

                    {showResultColumn ? (
                      <div className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                        {resultLabel}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                      {renderActionMenu()}
                    </div>
                  </div>

                  <div className="space-y-3 px-4 py-3 md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`line-clamp-2 text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                          {quiz.title || "-"}
                        </p>
                        <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {isGroupQuizList ? (
                            <span className="inline-flex items-center gap-1">
                              {groupAudienceMode === "ALL_MEMBERS" ? <Users className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                              <span className="truncate">{audienceText}</span>
                            </span>
                          ) : (
                            shouldHideRoadmapVisibility ? null : (
                              <span className="inline-flex items-center gap-1">
                                <VisibilityIcon className="h-3.5 w-3.5" />
                                {audienceText}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {isLeaderGroupQuizList ? (
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer rounded border-slate-300"
                            checked={canSelectRow ? selectedQuizIdSet.has(resolvedQuizIdNumber) : false}
                            disabled={!canSelectRow}
                            onChange={(event) => toggleQuizSelection(resolvedQuizIdNumber, event.target.checked)}
                          />
                        ) : null}
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDarkMode ? statusMeta.dark : statusMeta.light}`}>
                          {statusLabel}
                        </span>
                        {renderActionMenu()}
                      </div>
                    </div>

                    <div className={`grid grid-cols-2 gap-2 rounded-xl border p-3 text-xs ${isDarkMode ? "border-slate-700 bg-slate-800/40 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                      <p><span className="font-semibold">{t("workspace.quiz.list.labels.intent", "Mục đích")}:</span> {intentValue}</p>
                      <p><span className="font-semibold">{t("workspace.quiz.list.labels.timerMode", "Kiểu thời gian")}:</span> {timerValue}</p>
                      <p><span className="font-semibold">{t("workspace.quiz.list.labels.difficulty", "Độ khó")}:</span> {difficultyKey === "CUSTOM" ? t("workspace.quiz.difficultyLevels.custom", "Tùy chỉnh") : t(`workspace.quiz.difficultyLevels.${String(quiz?.overallDifficulty || "medium").toLowerCase()}`)}</p>
                      <p><span className="font-semibold">{t("workspace.quiz.list.labels.duration", "Thời lượng")}:</span> {durationInMinutes > 0 ? `${durationInMinutes} ${t("workspace.quiz.minutes", "phút")}` : "-"}</p>
                      {showResultColumn ? <p><span className="font-semibold">{t("workspace.quiz.list.labels.result", "Kết quả")}:</span> {resultLabel}</p> : null}
                      <p><span className="font-semibold">{t("workspace.quiz.list.labels.updatedAt", "Cập nhật")}:</span> {updatedLabel || "-"}</p>
                    </div>

                    {isProcessing ? (
                      <div className={`rounded-xl border px-3 py-3 ${isDarkMode ? "border-sky-900/60 bg-sky-950/20" : "border-sky-200 bg-sky-50/80"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-xs font-semibold ${isDarkMode ? "text-sky-200" : "text-sky-700"}`}>{t("workspace.quiz.processingProgressLabel", "Đang tạo quiz")}</span>
                          <span className={`text-xs font-semibold tabular-nums ${isDarkMode ? "text-sky-200" : "text-sky-700"}`}>{processingPercent}%</span>
                        </div>
                        <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${isDarkMode ? "bg-slate-800" : "bg-white"}`}>
                          <div className="h-full rounded-full bg-sky-500" style={{ width: `${processingBarWidth}%` }} />
                        </div>
                      </div>
                    ) : null}

                  </div>
                </article>
              );
            })}
          </div>

          {filtered.length > QUIZ_PAGE_SIZE ? (
            <div className={cn(
              "mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2",
              isDarkMode ? "border-slate-700 bg-slate-900/60 text-slate-300" : "border-slate-200 bg-white text-slate-600",
            )}>
              <span className="text-xs font-medium">
                {t("workspace.quiz.list.pagination.showing", {
                  from: paginationStartIndex,
                  to: paginationEndIndex,
                  total: filtered.length,
                })}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="h-8 gap-1 rounded-full px-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>{t("workspace.pagination.prev", "Trang trước")}</span>
                </Button>

                <span className="text-xs font-semibold tabular-nums">
                  {t("workspace.pagination.page", "Trang")} {Math.min(currentPage, totalPages)}/{totalPages}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className="h-8 gap-1 rounded-full px-2"
                >
                  <span>{t("workspace.pagination.next", "Trang tiếp")}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
          </>
        )}
      </div>

      <FeedbackSubmitDialog
        open={feedbackDialogQuizId != null}
        onOpenChange={(open) => {
          if (!open) {
            setFeedbackDialogQuizId(null);
          }
        }}
        targetType="QUIZ"
        targetId={feedbackDialogQuizId}
        isDarkMode={isDarkMode}
        onSubmitted={() => {
          if (feedbackDialogQuizId != null) {
            handleQuizFeedbackSubmitted(feedbackDialogQuizId);
          }
        }}
        title={t("feedback", "Feedback")}
      />

      <Dialog
        open={bulkActionDialog === "assign"}
        onOpenChange={(open) => {
          if (!open && !bulkActionLoading) setBulkActionDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("workspace.quiz.bulk.confirmAssignTitle", "Giao quiz đã chọn")}</DialogTitle>
            <DialogDescription>
              {t("workspace.quiz.bulk.confirmAssignDescription", { count: selectedQuizIds.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="bulk-assign-mode"
                value="ALL_MEMBERS"
                checked={bulkAssignMode === "ALL_MEMBERS"}
                onChange={() => setBulkAssignMode("ALL_MEMBERS")}
              />
              <span>{t("workspace.quiz.bulk.assignModeAll", "Chung cả nhóm")}</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="bulk-assign-mode"
                value="SELECTED_MEMBERS"
                checked={bulkAssignMode === "SELECTED_MEMBERS"}
                onChange={() => setBulkAssignMode("SELECTED_MEMBERS")}
              />
              <span>{t("workspace.quiz.bulk.assignModeMember", "Giao cho thành viên cụ thể")}</span>
            </label>
            {bulkAssignMode === "SELECTED_MEMBERS" ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">{t("workspace.quiz.bulk.pickMember", "Chọn thành viên")}</p>
                <select
                  value={bulkAssignMemberUserId ?? ""}
                  onChange={(event) => setBulkAssignMemberUserId(Number(event.target.value) || null)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
                >
                  <option value="">{t("workspace.quiz.bulk.pickMemberPlaceholder", "Chọn thành viên")}</option>
                  {groupMembers.map((member) => {
                    const memberUserId = Number(member.userId ?? member.id);
                    if (!Number.isInteger(memberUserId) || memberUserId <= 0) return null;
                    return (
                      <option key={memberUserId} value={memberUserId}>
                        {getUserDisplayLabel(member, `User ${memberUserId}`)}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={bulkActionLoading} onClick={() => setBulkActionDialog(null)}>
              {t("workspace.quiz.bulk.cancel", "Hủy")}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={bulkActionLoading} onClick={handleBulkAssign}>
              {bulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("workspace.quiz.bulk.apply", "Áp dụng")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkActionDialog === "status"}
        onOpenChange={(open) => {
          if (!open && !bulkActionLoading) setBulkActionDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("workspace.quiz.bulk.confirmStatusTitle", "Đổi trạng thái quiz")}</DialogTitle>
            <DialogDescription>
              {t("workspace.quiz.bulk.confirmStatusDescription", { count: selectedQuizIds.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {[
              { value: "DRAFT", label: t("workspace.quiz.bulk.statusDraft", "Bản nháp") },
              { value: "ACTIVE", label: t("workspace.quiz.bulk.statusActive", "Đang hoạt động") },
              { value: "INACTIVE", label: t("workspace.quiz.bulk.statusInactive", "Không hoạt động") },
            ].map((statusItem) => (
              <label key={statusItem.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="bulk-status"
                  value={statusItem.value}
                  checked={bulkStatusValue === statusItem.value}
                  onChange={() => setBulkStatusValue(statusItem.value)}
                />
                <span>{statusItem.label}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={bulkActionLoading} onClick={() => setBulkActionDialog(null)}>
              {t("workspace.quiz.bulk.cancel", "Hủy")}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={bulkActionLoading} onClick={handleBulkStatusChange}>
              {bulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("workspace.quiz.bulk.apply", "Áp dụng")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkActionDialog === "delete"}
        onOpenChange={(open) => {
          if (!open && !bulkActionLoading) setBulkActionDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("workspace.quiz.bulk.confirmDeleteTitle", "Xóa quiz đã chọn")}</DialogTitle>
            <DialogDescription>
              {t("workspace.quiz.bulk.confirmDeleteDescription", { count: selectedQuizIds.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={bulkActionLoading} onClick={() => setBulkActionDialog(null)}>
              {t("workspace.quiz.bulk.cancel", "Hủy")}
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={bulkActionLoading} onClick={handleBulkDelete}>
              {bulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("workspace.quiz.bulk.delete", "Xóa")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
