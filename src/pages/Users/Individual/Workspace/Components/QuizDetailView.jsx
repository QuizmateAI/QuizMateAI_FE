import React, { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BadgeCheck, Timer, BarChart3, Clock, Loader2, Star,
  ChevronDown, ChevronRight, Target, BookOpen, Hash, CheckCircle2, Play, ClipboardCheck, History, Info, List, Users, Sparkles,
  Share2, UserPlus, MessageSquare, Eye, Lock, Pencil, Copy,
} from "lucide-react";
import { getCurrentUser } from "@/api/Authentication";
import { logSwallowed } from "@/utils/logSwallowed";
import { resolveEditRule } from "./resolveEditRule";
import { duplicateQuiz, updateQuiz } from "@/api/QuizAPI";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getSectionsByQuiz, getQuestionsBySection, getAnswersByQuestion, toggleStarQuestion, QUESTION_TYPE_ID_MAP, getQuizFull, getQuizHistory,
  getGroupQuizHistory,
  publishGroupQuiz, setGroupQuizAudience,
} from "@/api/QuizAPI";
import { recordQuizReviewView } from "@/api/ChallengeAPI";
import { getGroupMembers } from "@/api/GroupAPI";
import { unwrapApiData } from "@/utils/apiResponse";
import { getUserDisplayLabel } from "@/utils/userProfile";
import UserDisplayName from "@/components/features/users/UserDisplayName";
import GroupQuizReviewPanel from "@/pages/Users/Group/Components/GroupQuizReviewPanel";
import GroupDiscussionPanel from "@/pages/Users/Group/Components/GroupDiscussionPanel";
import QuestionDiscussionDialog from "@/pages/Users/Group/Components/QuestionDiscussionDialog";
import { getThreadCounts } from "@/api/GroupDiscussionAPI";
import MixedMathText from "@/components/math/MixedMathText";
import { hasQuizCompleted } from "@/utils/quizAttemptTracker";
import {
  buildQuizAttemptPath,
  buildQuizResultPath,
  isWorkspaceRoadmapsPath,
} from "@/lib/routePaths";
import CommunityQuizSignals from "@/pages/Users/Quiz/components/CommunityQuizSignals";

const QUIZ_DETAIL_CACHE_TTL_MS = 15000;
const quizDetailCache = new Map();

function HistoryMemberAvatar({ src, name, isDarkMode, sizeClass = "w-6 h-6", textClass = "text-[10px]" }) {
  const [failed, setFailed] = useState(false);
  const avatarSrc = typeof src === "string" ? src.trim() : "";
  const showImage = avatarSrc && !failed;
  const initial = String(name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={cn(
      "rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden",
      sizeClass,
      textClass,
      showImage ? "bg-transparent" : isDarkMode ? "bg-blue-600" : "bg-blue-500",
    )}>
      {showImage ? (
        <img
          src={avatarSrc}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
}
const quizDetailInFlight = new Map();

// Cấu hình màu badge trạng thái quiz
const STATUS_STYLES = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
  COMPLETED: { light: "bg-blue-100 text-blue-700", dark: "bg-blue-950/50 text-blue-400" },
  INACTIVE: { light: "bg-slate-100 text-slate-500", dark: "bg-slate-800 text-slate-400" },
  PENDING_LEADER: { light: "bg-violet-100 text-violet-700", dark: "bg-violet-950/50 text-violet-400" },
};

const INTENT_STYLES = {
  PRE_LEARNING: { light: "bg-purple-100 text-purple-700", dark: "bg-purple-950/50 text-purple-400" },
  POST_LEARNING: { light: "bg-cyan-100 text-cyan-700", dark: "bg-cyan-950/50 text-cyan-400" },
  PRACTICE: { light: "bg-orange-100 text-orange-700", dark: "bg-orange-950/50 text-orange-400" },
};

// Hàm format ngày giờ
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getAttemptHistoryDate(attempt) {
  return formatDate(attempt?.startedAt || attempt?.completedAt || attempt?.updatedAt || attempt?.createdAt);
}

function sortAttemptHistory(attempts) {
  return attempts.slice().sort((left, right) => {
    const leftTime = new Date(left?.startedAt || left?.completedAt || left?.updatedAt || left?.createdAt || 0).getTime();
    const rightTime = new Date(right?.startedAt || right?.completedAt || right?.updatedAt || right?.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
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

function isTruthyQuizFlag(value) {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
}

function hasCompletedAttemptRecord(attempt) {
  if (!attempt || typeof attempt !== "object") return false;

  const status = String(attempt.status || attempt.attemptStatus || attempt.state || "").toUpperCase();
  if (["COMPLETED", "SUBMITTED", "GRADED", "PASSED", "FAILED"].includes(status)) {
    return true;
  }

  return Boolean(
    attempt.completedAt
    || attempt.submittedAt
    || attempt.finishedAt
    || attempt.endedAt
    || attempt.score != null
    || attempt.totalScore != null
    || attempt.correctCount != null,
  );
}

function hasCompletedAttemptHistory(history) {
  return Array.isArray(history) && history.some(hasCompletedAttemptRecord);
}

// Component hiển thị chi tiết quiz — bao gồm sessions, questions, answers
function QuizDetailView({
  isDarkMode,
  quiz,
  onBack,
  onEdit,
  onCreateSimilar,
  contextType: _contextType = "WORKSPACE",
  contextId: _contextId,
  hideEditButton = false,
  isGroupLeader = false,
  /** Leader: ẩn chính mình khỏi danh sách giao quiz riêng */
  groupAudiencePickerExcludeUserId = null,
  onGroupQuizUpdated,
  /** Group: mở từ challenge (snapshot) — chỉ xem/sửa đề, không phân phối / không làm bài từ màn này */
  challengeSnapshotReviewMode = false,
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [questionsMap, setQuestionsMap] = useState({}); // sectionId -> questions[]
  const [answersMap, setAnswersMap] = useState({}); // questionId -> answers[]
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [starringId, setStarringId] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(quiz?.status || "DRAFT");
  const [quizMeta, setQuizMeta] = useState(null);
  
  // Tab states
  const [activeTab, setActiveTab] = useState("overview"); // overview, review (group), questions, history
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // Personal history (bản thân) — dùng để gate chế độ luyện tập: null = đang tải
  const [personalHistory, setPersonalHistory] = useState(null);
  const [examStartOpen, setExamStartOpen] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activating, setActivating] = useState(false);
  // Leader participation dialog (xuất bản → hỏi ranking)
  const [leaderParticipationOpen, setLeaderParticipationOpen] = useState(false);
  // Per-question discussion popup
  const [discussionOpenQId, setDiscussionOpenQId] = useState(null);
  const [qCommentCounts, setQCommentCounts] = useState({});
  const [audienceSaving, setAudienceSaving] = useState(false);
  const [audienceMode, setAudienceMode] = useState("ALL_MEMBERS");
  const [selectedAudienceUserIds, setSelectedAudienceUserIds] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [communityDetailOpen, setCommunityDetailOpen] = useState(false);
  const [communityFeedbackOpen, setCommunityFeedbackOpen] = useState(false);
  const detailRequestRunRef = React.useRef(0);
  const attemptHistoryProbeKeyRef = React.useRef(null);
  const [confirmDuplicateOpen, setConfirmDuplicateOpen] = useState(false);
  const [metadataEditOpen, setMetadataEditOpen] = useState(false);

  const currentUserId = React.useMemo(() => {
    const currentUser = getCurrentUser();
    return Number(currentUser?.userId ?? currentUser?.userID ?? currentUser?.id ?? 0);
  }, []);

  const localQuizCompleted = hasQuizCompleted(quiz?.quizId);
  const hasQuizPayloadAttempted =
    isTruthyQuizFlag(quiz?.myAttempted)
    || isTruthyQuizFlag(quizMeta?.myAttempted)
    || isTruthyQuizFlag(quiz?.myPassed)
    || isTruthyQuizFlag(quizMeta?.myPassed);
  const hasHistoryCompleted = hasCompletedAttemptHistory(history);
  const hasCurrentUserCompletedQuiz = localQuizCompleted || hasQuizPayloadAttempted || hasHistoryCompleted;

  /** Fair play: leader tham gia thi + quiz ACTIVE → không xem trước đáp án/tab Kiểm tra. */
  const fairPlayRestricts = Boolean(quiz?.challengeFairPlayRestrictsViewer);

  /**
   * Creator luôn xem được đáp án quiz do mình tạo.
   * Individual workspace (contextType="WORKSPACE"): viewer luôn là owner — dùng currentUserId > 0
   * vì BE không nhất quán trả về creatorId trong quiz response.
   * Các scope khác: match theo creatorId hoặc quizMeta (từ getQuizFull).
   */
  const isCreator = currentUserId > 0 && (
    _contextType === "WORKSPACE"
    || Number(quiz?.creatorId || 0) === currentUserId
    || Number(quizMeta?.creatorId || 0) === currentUserId
  );

  /** Cá nhân: chỉ xem đáp án sau khi làm xong (hoặc quiz nháp). Nhóm: leader / xem từ challenge cần đủ phương án cho tab Kiểm tra. */
  const canViewAnswers =
    isCreator
    || hasCurrentUserCompletedQuiz
    || currentStatus === "DRAFT"
    || (_contextType === "GROUP" && isGroupLeader && !fairPlayRestricts)
    || (challengeSnapshotReviewMode && !fairPlayRestricts);

  useEffect(() => {
    setCurrentStatus(quizMeta?.status || quiz?.status || "DRAFT");
  }, [quizMeta?.status, quiz?.status]);

  useEffect(() => {
    setHistory([]);
    attemptHistoryProbeKeyRef.current = null;
  }, [quiz?.quizId]);

  /** Reviewer challenge: ghi nhận đã mở xem snapshot (phục vụ nhắc mail & nghiệp vụ gỡ reviewer). */
  useEffect(() => {
    if (!challengeSnapshotReviewMode || _contextType !== "GROUP" || !_contextId || !quiz?.quizId) return;
    const ws = Number(_contextId);
    const qid = Number(quiz.quizId);
    if (!Number.isFinite(ws) || !Number.isFinite(qid)) return;
    void (async () => {
      try {
        await recordQuizReviewView(ws, qid);
        queryClient.invalidateQueries({ queryKey: ["challenge-detail", ws] });
      } catch {
        /* Chỉ reviewer mới thành công; lỗi khác không chặn xem đề */
      }
    })();
  }, [challengeSnapshotReviewMode, _contextType, _contextId, quiz?.quizId, queryClient]);

  // Lấy toàn bộ dữ liệu quiz chi tiết: sections → questions → answers
  const fetchFullDetail = useCallback(async () => {
    if (!quiz?.quizId) return;

    const cacheKey = `${quiz.quizId}:${canViewAnswers ? "withAnswers" : "withoutAnswers"}`;
    const cachedEntry = quizDetailCache.get(cacheKey);
    const now = Date.now();

    if (cachedEntry && (now - cachedEntry.at) < QUIZ_DETAIL_CACHE_TTL_MS) {
      setQuizMeta(cachedEntry.data.quizMeta);
      setCurrentStatus(cachedEntry.data.currentStatus);
      setSections(cachedEntry.data.sections);
      setExpandedSections(cachedEntry.data.expandedSections);
      setQuestionsMap(cachedEntry.data.questionsMap);
      setAnswersMap(cachedEntry.data.answersMap);
      setLoading(false);
      return;
    }

    const runId = detailRequestRunRef.current + 1;
    detailRequestRunRef.current = runId;
    setLoading(true);

    const inFlightPromise = quizDetailInFlight.get(cacheKey);
    if (inFlightPromise) {
      try {
        const payload = await inFlightPromise;
        if (detailRequestRunRef.current !== runId) return;
        setQuizMeta(payload.quizMeta);
        setCurrentStatus(payload.currentStatus);
        setSections(payload.sections);
        setExpandedSections(payload.expandedSections);
        setQuestionsMap(payload.questionsMap);
        setAnswersMap(payload.answersMap);
      } catch (err) {
        console.error("Lỗi khi tải chi tiết quiz (dedupe):", err);
      } finally {
        if (detailRequestRunRef.current === runId) {
          setLoading(false);
        }
      }
      return;
    }

    const requestPromise = (async () => {
      let nextQuizMeta = null;
      let nextStatus = quiz?.status || "DRAFT";
      let nextSections = [];
      let nextExpandedSections = {};
      let nextQuestionsMap = {};
      let nextAnswersMap = {};

      // Luôn đồng bộ metadata/status mới nhất để tránh giữ trạng thái cũ từ prop.
      try {
        const fullRes = await getQuizFull(quiz.quizId);
        if (fullRes?.data) {
          nextQuizMeta = fullRes.data;
          nextStatus = fullRes.data.status || nextStatus;
        }
      } catch (fullErr) {
        console.error("Lỗi khi tải metadata quiz:", fullErr);
      }

      // Bước 1: Lấy sections
      const sectRes = await getSectionsByQuiz(quiz.quizId);
      const sectionList = sectRes.data || [];
      nextSections = sectionList;

      // Tự động mở rộng section đầu tiên
      if (sectionList.length > 0) {
        nextExpandedSections = { [sectionList[0].sectionId]: true };
      }

      // Bước 2: Lấy questions cho mỗi section
      const sectionQuestionEntries = await Promise.all(
        sectionList.map(async (section) => {
          try {
            const qRes = await getQuestionsBySection(section.sectionId);
            return [section.sectionId, qRes.data || []];
          } catch (questionErr) {
            console.error("Lỗi khi tải câu hỏi của section:", section.sectionId, questionErr);
            return [section.sectionId, []];
          }
        })
      );

      sectionQuestionEntries.forEach(([sectionId, questions]) => {
        nextQuestionsMap[sectionId] = questions;
      });

      // Chỉ lấy đáp án sau khi user đã hoàn thành bài để tránh lộ đáp án sớm.
      if (canViewAnswers) {
        const allQuestions = sectionQuestionEntries.flatMap(([, questions]) => questions || []);
        const answerEntries = await Promise.all(
          allQuestions.map(async (question) => {
            try {
              const aRes = await getAnswersByQuestion(question.questionId);
              return [question.questionId, aRes.data || []];
            } catch (answerErr) {
              console.error("Lỗi khi tải đáp án của câu hỏi:", question.questionId, answerErr);
              return [question.questionId, []];
            }
          })
        );

        answerEntries.forEach(([questionId, answers]) => {
          nextAnswersMap[questionId] = answers;
        });
      }

      return {
        quizMeta: nextQuizMeta,
        currentStatus: nextStatus,
        sections: nextSections,
        expandedSections: nextExpandedSections,
        questionsMap: nextQuestionsMap,
        answersMap: nextAnswersMap,
      };
    })();

    quizDetailInFlight.set(cacheKey, requestPromise);
    try {
      const payload = await requestPromise;
      if (detailRequestRunRef.current !== runId) return;

      quizDetailCache.set(cacheKey, {
        at: Date.now(),
        data: payload,
      });

      setQuizMeta(payload.quizMeta);
      setCurrentStatus(payload.currentStatus);
      setSections(payload.sections);
      setExpandedSections(payload.expandedSections);
      setQuestionsMap(payload.questionsMap);
      setAnswersMap(payload.answersMap);
    } catch (err) {
      console.error("Lỗi khi tải chi tiết quiz:", err);
    } finally {
      quizDetailInFlight.delete(cacheKey);
      if (detailRequestRunRef.current === runId) {
        setLoading(false);
      }
    }
  }, [quiz?.quizId, canViewAnswers]);

  useEffect(() => {
    fetchFullDetail();
  }, [fetchFullDetail]);

  const fetchHistoryData = useCallback(async () => {
    if (!quiz?.quizId) return;
    setLoadingHistory(true);
    try {
      let res;
      if (_contextType === "GROUP" && isGroupLeader && _contextId) {
        // Leader: lấy lịch sử của tất cả members
        res = await getGroupQuizHistory(_contextId, quiz.quizId);
      } else {
        // Member: chỉ lấy lịch sử của bản thân
        res = await getQuizHistory(quiz.quizId);
      }
      setHistory(res?.data || []);
    } catch (err) {
      console.error("Lỗi khi tải lịch sử quiz:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [quiz?.quizId, _contextType, isGroupLeader, _contextId]);

  useEffect(() => {
    if (activeTab === "history" && history.length === 0) {
      fetchHistoryData();
    }
  }, [activeTab, fetchHistoryData, history.length]);

  useEffect(() => {
    if (!quiz?.quizId || isGroupLeader) {
      setPersonalHistory(null);
      return;
    }

    const probeKey = `${_contextType}:${_contextId || ""}:${quiz.quizId}`;
    if (attemptHistoryProbeKeyRef.current === probeKey) return;
    attemptHistoryProbeKeyRef.current = probeKey;

    let cancelled = false;
    void (async () => {
      try {
        const res = await getQuizHistory(quiz.quizId);
        if (cancelled) return;
        const nextHistory = Array.isArray(res?.data) ? res.data : [];
        setPersonalHistory(nextHistory);
        setHistory((prev) => (prev.length === 0 ? nextHistory : prev));
      } catch (err) {
        console.error("Lỗi khi kiểm tra lịch sử cá nhân:", err);
        if (!cancelled) setPersonalHistory([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [quiz?.quizId, _contextType, _contextId, isGroupLeader]);

  // Toggle mở rộng/thu gọn section
  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Toggle mở rộng/thu gọn câu hỏi (hiển thị answers)
  const toggleQuestion = (questionId) => {
    setExpandedQuestions((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  // Đánh dấu/bỏ dấu sao câu hỏi
  const handleToggleStar = async (questionId, sectionId) => {
    if (starringId) return;
    setStarringId(questionId);
    try {
      const res = await toggleStarQuestion(questionId);
      // Lấy giá trị isStarred mới từ API response, fallback sang đảo ngược nếu không có
      const newStarValue = res?.data?.isStarred;
      setQuestionsMap((prev) => ({
        ...prev,
        [sectionId]: prev[sectionId]?.map((q) => {
          if (q.questionId !== questionId) return q;
          return { ...q, isStarred: newStarValue !== undefined ? newStarValue : !q.isStarred };
        }),
      }));
    } catch (err) {
      console.error("Lỗi toggle star:", err);
    } finally {
      setStarringId(null);
    }
  };

  const effectiveQuiz = quizMeta || quiz;
  const communitySourceQuizId = Number(effectiveQuiz?.communitySourceQuizId);
  const isCommunityClone = Number.isInteger(communitySourceQuizId) && communitySourceQuizId > 0;
  const showCommunitySignals = effectiveQuiz?.communityShared === true || isCommunityClone;
  const effectiveContextType = String(effectiveQuiz?.contextType || "").toUpperCase();
  const isRoadmapRouteSource = isWorkspaceRoadmapsPath(location.pathname);
  const isRoadmapQuizByData = ["ROADMAP", "PHASE", "KNOWLEDGE"].includes(effectiveContextType)
    || Number(effectiveQuiz?.roadmapId) > 0
    || Number(effectiveQuiz?.phaseId) > 0
    || Number(effectiveQuiz?.knowledgeId) > 0;
  const isRoadmapQuizSource = isRoadmapQuizByData || isRoadmapRouteSource;
  const normalizedIntent = String(effectiveQuiz?.quizIntent || "").toUpperCase();
  const shouldHideRoadmapIntentBadge = isRoadmapQuizSource
    && ["PRE_LEARNING", "PRACTICE", "REVIEW"].includes(normalizedIntent);
  const shouldHideRoadmapActiveStatusBadge = isRoadmapQuizSource && String(currentStatus || "").toUpperCase() === "ACTIVE";
  const resultSourceState = {
    sourceView: isRoadmapQuizSource ? "roadmap" : "quiz-panel",
    sourceWorkspaceId: Number(effectiveQuiz?.workspaceId) || null,
    sourcePhaseId: Number(effectiveQuiz?.phaseId) || null,
    sourceKnowledgeId: Number(effectiveQuiz?.knowledgeId) || null,
    sourceRoadmapId: Number(effectiveQuiz?.roadmapId) || null,
  };
  const handleStartQuiz = useCallback((mode) => {
    if (!mode || !quiz?.quizId) return;

    navigate(buildQuizAttemptPath(mode, quiz.quizId), {
      state: {
        returnToQuizPath: `${location.pathname}${location.search || ""}`,
        ...(mode === 'practice' ? { autoStart: true } : {}),
        ...resultSourceState,
      },
    });
  }, [location.pathname, location.search, navigate, quiz?.quizId, resultSourceState]);
  const handleConfirmExamStart = useCallback(() => {
    if (!quiz?.quizId) return;

    navigate(buildQuizAttemptPath("exam", quiz.quizId), {
      state: {
        returnToQuizPath: `${location.pathname}${location.search || ""}`,
        autoStart: true,
        ...resultSourceState,
      },
    });
    setExamStartOpen(false);
  }, [location.pathname, location.search, navigate, quiz?.quizId, resultSourceState]);

  const openAudienceDialog = useCallback(() => {
    const eq = quizMeta || quiz;
    const excludeUid = Number(groupAudiencePickerExcludeUserId);
    setAudienceMode(eq?.groupAudienceMode === "SELECTED_MEMBERS" ? "SELECTED_MEMBERS" : "ALL_MEMBERS");
    const rawIds = Array.isArray(eq?.assignedUserIds)
      ? eq.assignedUserIds.map((id) => Number(id)).filter((n) => Number.isInteger(n) && n > 0)
      : [];
    setSelectedAudienceUserIds(
      Number.isInteger(excludeUid) && excludeUid > 0
        ? rawIds.filter((id) => id !== excludeUid)
        : rawIds,
    );
    setAudienceOpen(true);
  }, [quiz, quizMeta, groupAudiencePickerExcludeUserId]);

  useEffect(() => {
    if (!audienceOpen || !_contextId) return undefined;
    let cancelled = false;
    (async () => {
      setMembersLoading(true);
      try {
        const res = await getGroupMembers(_contextId, 0, 200);
        const raw = unwrapApiData(res);
        const list = raw?.content || raw?.data || (Array.isArray(raw) ? raw : []);
        const excludeUid = Number(groupAudiencePickerExcludeUserId);
        const filtered = Array.isArray(list)
          ? list.filter((m) => {
              if (!Number.isInteger(excludeUid) || excludeUid <= 0) return true;
              const mid = Number(m.userId ?? m.id ?? m.groupMemberId);
              return !Number.isInteger(mid) || mid !== excludeUid;
            })
          : [];
        if (!cancelled) setGroupMembers(filtered);
      } catch (e) {
        console.error(e);
        if (!cancelled) setGroupMembers([]);
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audienceOpen, _contextId, groupAudiencePickerExcludeUserId]);

  const handlePublishGroupQuiz = useCallback(async () => {
    if (!quiz?.quizId) return;
    setPublishing(true);
    try {
      const res = await publishGroupQuiz(quiz.quizId);
      const next = unwrapApiData(res);
      if (next?.status) setCurrentStatus(next.status);
      setQuizMeta((m) => ({ ...(m || {}), ...next }));
      onGroupQuizUpdated?.(next);
      quizDetailCache.clear();
      await fetchFullDetail();
    } catch (err) {
      console.error(err);
      window.alert(err?.message || t("workspace.quiz.detail.publishFailed", "Could not publish quiz."));
    } finally {
      setPublishing(false);
    }
  }, [quiz?.quizId, fetchFullDetail, onGroupQuizUpdated, t]);

  const handleSaveAudience = useCallback(async () => {
    if (!quiz?.quizId) return;
    if (audienceMode === "SELECTED_MEMBERS" && selectedAudienceUserIds.length === 0) {
      window.alert(t("workspace.quiz.audience.selectMemberRequired", "Select at least one member."));
      return;
    }
    setAudienceSaving(true);
    try {
      const body = audienceMode === "ALL_MEMBERS"
        ? { mode: "ALL_MEMBERS" }
        : { mode: "SELECTED_MEMBERS", assigneeUserIds: selectedAudienceUserIds };
      const res = await setGroupQuizAudience(quiz.quizId, body);
      const next = unwrapApiData(res);
      setQuizMeta((m) => ({ ...(m || {}), ...next }));
      onGroupQuizUpdated?.(next);
      quizDetailCache.clear();
      await fetchFullDetail();
      setAudienceOpen(false);
    } catch (err) {
      console.error(err);
      window.alert(err?.message || t("workspace.quiz.audience.saveFailed", "Could not save distribution."));
    } finally {
      setAudienceSaving(false);
    }
  }, [quiz?.quizId, audienceMode, selectedAudienceUserIds, fetchFullDetail, onGroupQuizUpdated, t]);

  const handleActivateWorkspaceQuiz = useCallback(async () => {
    const quizId = effectiveQuiz?.quizId;
    if (!quizId) return;

    setActivating(true);
    try {
      const res = await updateQuiz(quizId, { status: "ACTIVE" });
      const next = unwrapApiData(res) || {};
      const nextStatus = next?.status || "ACTIVE";
      setCurrentStatus(nextStatus);
      setQuizMeta((prev) => ({ ...(prev || effectiveQuiz), ...next, status: nextStatus }));
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      quizDetailCache.clear();
      await fetchFullDetail();
    } catch (err) {
      console.error("[QuizDetailView] activate workspace quiz failed", err);
      console.error("[QuizDetailView] activate workspace quiz failed response", err?.response?.data || err);
      window.alert(
        err?.response?.data?.message
        || err?.message
        || t("workspace.quiz.detail.activateFailed", "Không thể kích hoạt quiz."),
      );
    } finally {
      setActivating(false);
    }
  }, [effectiveQuiz, fetchFullDetail, queryClient, t]);

  const toggleAudienceMember = useCallback((userId) => {
    setSelectedAudienceUserIds((prev) => (
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    ));
  }, []);

  const isActiveQuiz = currentStatus === "ACTIVE";
  const normalizedQuizIntent = String(effectiveQuiz?.quizIntent || "").toUpperCase();

  const editRule = React.useMemo(
    () => resolveEditRule(effectiveQuiz, hasHistoryCompleted),
    [effectiveQuiz, hasHistoryCompleted],
  );

  const isManualQuiz = ["MANUAL", "MANUAL_FROM_AI"].includes(
    String(effectiveQuiz?.createVia || "").toUpperCase(),
  );

  const canShowEditButton =
    isCreator
    && _contextType === "WORKSPACE"
    && !hideEditButton
    && !challengeSnapshotReviewMode
    && currentStatus !== "PROCESSING"
    && normalizedQuizIntent === "REVIEW";
  const canShowDuplicateButton =
    _contextType === "WORKSPACE"
    && isCreator
    && !hideEditButton
    && !challengeSnapshotReviewMode
    && currentStatus !== "PROCESSING"
    && (isManualQuiz || hasCurrentUserCompletedQuiz)
    && typeof onCreateSimilar === "function";
  const canActivateManualDraftQuiz =
    _contextType === "WORKSPACE"
    && isManualQuiz
    && isCreator
    && String(currentStatus || "").toUpperCase() === "DRAFT"
    && !challengeSnapshotReviewMode;
  useCallback(async () => {
    const quizId = effectiveQuiz?.quizId;
    if (!quizId) return;
    const res = await duplicateQuiz(quizId);
    const newQuiz = res?.data;
    if (!newQuiz) return;
    queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    setConfirmDuplicateOpen(false);
    onEdit?.(newQuiz);
  }, [effectiveQuiz?.quizId, queryClient, onEdit]);
  const handleEditClick = useCallback(() => {
    if (editRule === "EDIT_IN_PLACE") {
      onEdit?.(effectiveQuiz);
    } else if (editRule === "REQUIRES_DUPLICATE") {
      setConfirmDuplicateOpen(true);
    }
    // LOCKED_UNTIL_FIRST_ATTEMPT: button is disabled, no action
  }, [editRule, effectiveQuiz, onEdit]);

  const handleMetadataSaved = useCallback((updatedFields) => {
    setQuizMeta((prev) => ({ ...(prev || effectiveQuiz), ...updatedFields }));
  }, [effectiveQuiz]);

  // Gate luyện tập: chỉ hiện sau khi user hoàn thành ít nhất 1 lần kiểm tra chính thức
  const hasCompletedOfficialAttempt = personalHistory !== null &&
    personalHistory.some(a => a.isPracticeMode === false && Boolean(a.completedAt));
  const ss = STATUS_STYLES[currentStatus] || STATUS_STYLES.DRAFT;

  // ── Flat question list + lookup map — used by Discussion tab
  const allQuestionsFlat = React.useMemo(() => {
    let globalIdx = 0;
    return sections.flatMap((s) =>
      (questionsMap[s.sectionId] || []).map((q) => ({
        ...q,
        index: ++globalIdx,
        sectionId: s.sectionId,
      })),
    );
  }, [sections, questionsMap]);

  const questionsById = React.useMemo(
    () => Object.fromEntries(allQuestionsFlat.map((q) => [String(q.questionId), q])),
    [allQuestionsFlat],
  );

  // Load per-question comment counts for badge display
  useEffect(() => {
    if (!_contextId || !quiz?.quizId || !allQuestionsFlat.length || _contextType !== "GROUP") return;
    const qIds = allQuestionsFlat.map((q) => q.questionId);
    getThreadCounts(_contextId, quiz.quizId, qIds)
      .then(({ questions }) => setQCommentCounts(questions))
      .catch(logSwallowed('QuizDetailView.Individual.threadCounts'));
  }, [_contextId, quiz?.quizId, allQuestionsFlat, _contextType]);

  /** Navigate from Discussion tab to a specific question in the Questions tab. */
  const handleNavigateToQuestion = React.useCallback((questionId) => {
    const q = questionsById[String(questionId)];
    if (!q) return;
    setActiveTab("questions");
    setExpandedSections((prev) => ({ ...prev, [q.sectionId]: true }));
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-question-id="${questionId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [questionsById]);
  const handleQuestionMessageCountChange = React.useCallback((questionId, nextCount) => {
    const questionKey = String(questionId);
    setQCommentCounts((prev) => {
      if ((prev?.[questionKey] ?? 0) === nextCount) {
        return prev;
      }
      return {
        ...prev,
        [questionKey]: nextCount,
      };
    });
  }, []);
  const is = INTENT_STYLES[effectiveQuiz?.quizIntent] || {};
  const durationInMinutes = getDurationInMinutes(effectiveQuiz);
  const sourceTypeLabel = String(effectiveQuiz?.createVia || "").toUpperCase() === "AI"
    ? t("workspace.quiz.cardAiLabel", "QUIZMATE AI")
    : t("workspace.quiz.cardManualLabel", "Manual Quiz");
  const overviewIntentLabel = effectiveQuiz?.quizIntent
    ? t(`workspace.quiz.intentLabels.${effectiveQuiz.quizIntent}`, effectiveQuiz.quizIntent)
    : t("quizDetailView.overview.notAvailable", "N/A");
  const overviewTimerModeLabel = typeof effectiveQuiz?.timerMode === "boolean"
    ? (
      effectiveQuiz.timerMode
        ? t("workspace.quiz.examModeType1Short", "Timed total")
        : t("workspace.quiz.examModeType2Short", "Per question")
    )
    : t("quizDetailView.overview.notAvailable", "N/A");
  const attemptedLabel = hasCurrentUserCompletedQuiz
    ? (effectiveQuiz?.myPassed === true
      ? t("workspace.quiz.myPassedTrue", "Passed")
      : effectiveQuiz?.myPassed === false
        ? t("workspace.quiz.myPassedFalse", "Not passed")
        : t("workspace.quiz.myAttemptedTrue", "Attempted"))
    : t("workspace.quiz.myAttemptedFalse", "Not attempted");
  const overviewAudienceLabel = _contextType === "GROUP"
    ? (
      String(effectiveQuiz?.groupAudienceMode || "").toUpperCase() === "SELECTED_MEMBERS"
        ? t("workspace.quiz.groupAudience.assignedMembers", "Assigned only")
        : t("workspace.quiz.groupAudience.wholeGroup", "Whole group")
    )
    : (
      effectiveQuiz?.communityShared === true
        ? t("workspace.quiz.communityPublic", "Public")
        : t("workspace.quiz.privateShort", "Private")
    );
  /** Nhóm + leader: tab Kiểm tra. Snapshot challenge (mở từ «Xem quiz»): cả reviewer (member) cũng cần tab Kiểm tra để xem đủ đáp án. */
  // "Kiểm tra" tab: leader sees it only while quiz is DRAFT (to review before publishing).
  // Snapshot-reviewers (contributors invited to check) always see it regardless of status.
  const showGroupReviewTab =
    _contextType === "GROUP"
    && !fairPlayRestricts
    && (
      (isGroupLeader && currentStatus === "DRAFT")
      || challengeSnapshotReviewMode
    );
  const isChallengeSnapshotReview = _contextType === "GROUP" && challengeSnapshotReviewMode && !fairPlayRestricts;
  const groupMemberCanOpenQuestions = _contextType !== "GROUP" || isGroupLeader || hasCurrentUserCompletedQuiz;
  const showQuestionsTab = !fairPlayRestricts && !isChallengeSnapshotReview && groupMemberCanOpenQuestions;

  const snapshotReviewPreferCheckTabRef = React.useRef(false);
  useEffect(() => {
    if (snapshotReviewPreferCheckTabRef.current) return;
    if (
      !challengeSnapshotReviewMode
      || !showGroupReviewTab
      || fairPlayRestricts
      || isGroupLeader
    ) {
      return;
    }
    snapshotReviewPreferCheckTabRef.current = true;
    setActiveTab("review");
  }, [challengeSnapshotReviewMode, showGroupReviewTab, fairPlayRestricts, isGroupLeader]);

  useEffect(() => {
    // Only redirect away from "questions" for snapshot-reviewers who can't see that tab
    if (!showQuestionsTab && activeTab === "questions") {
      setActiveTab("overview");
    }
    if (!showGroupReviewTab && activeTab === "review") {
      setActiveTab("overview");
    }
    if (fairPlayRestricts && (activeTab === "history" || activeTab === "discussion")) {
      setActiveTab("overview");
    }
    if (activeTab === "ranking") {
      setActiveTab("overview");
    }
  }, [showQuestionsTab, showGroupReviewTab, fairPlayRestricts, activeTab]);

  useEffect(() => {
    if (isChallengeSnapshotReview && activeTab === "history") {
      setActiveTab("overview");
    }
  }, [isChallengeSnapshotReview, activeTab]);

  return (
    <div className={`h-full flex flex-col ${fontClass}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={`p-1.5 rounded-lg transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-blue-500" />
            <p className={`text-base font-medium truncate max-w-[300px] ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>{effectiveQuiz?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Nút Edit — chỉ hiển thị cho creator, scope cá nhân */}
          {canShowEditButton
            && String(effectiveQuiz?.createVia || "").toUpperCase() !== "AI"
            && String(currentStatus || "").toUpperCase() !== "ACTIVE" && (
            <div className="relative group/edit">
              <Button
                variant="outline"
                disabled={editRule === "LOCKED_UNTIL_FIRST_ATTEMPT"}
                onClick={handleEditClick}
                className={cn(
                  "rounded-full h-9 px-4 flex items-center gap-2",
                  isDarkMode
                    ? "border-slate-600 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                    : "text-slate-700 hover:bg-slate-100 disabled:opacity-40",
                )}
              >
                <Pencil className="w-4 h-4" />
                <span className="text-sm">{t("workspace.quiz.detail.edit", "Chỉnh sửa")}</span>
              </Button>
              {editRule === "LOCKED_UNTIL_FIRST_ATTEMPT" && (
                <div className={cn(
                  "pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium opacity-0 group-hover/edit:opacity-100 transition-opacity z-50",
                  isDarkMode ? "bg-slate-700 text-slate-200" : "bg-slate-800 text-white",
                )}>
                  {t("workspace.quiz.detail.editLockedHint", "Hãy làm quiz lần đầu trước khi sửa")}
                </div>
              )}
            </div>
          )}
          {/* Nút sao chép để chỉnh sửa: ẩn ở DRAFT để tránh dư action, chỉ dùng khi quiz đã active / có lịch sử phù hợp */}
          {canShowDuplicateButton && String(currentStatus || "").toUpperCase() !== "DRAFT" && (
            <Button
              variant="outline"
              onClick={() => onCreateSimilar(effectiveQuiz)}
              className={cn(
                "rounded-full h-9 px-4 flex items-center gap-2",
                isDarkMode
                  ? "border-slate-600 text-slate-200 hover:bg-slate-700"
                  : "text-slate-700 hover:bg-slate-100",
              )}
              >
                <Copy className="w-4 h-4" />
                <span className="text-sm">{t("workspace.quiz.detail.duplicate.button", "Sao chép để chỉnh sửa")}</span>
            </Button>
          )}
          {canActivateManualDraftQuiz && (
            <Button
              disabled={activating || String(currentStatus || "").toUpperCase() === "PROCESSING"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-9 px-4 flex items-center gap-2"
              onClick={handleActivateWorkspaceQuiz}
            >
              {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span className="text-sm">{t("workspace.quiz.detail.confirmActivateQuiz", "Xác nhận & kích hoạt")}</span>
            </Button>
          )}
          {_contextType === "GROUP" && isGroupLeader && String(currentStatus || "").toUpperCase() === "DRAFT" && (
            <Button
              disabled={publishing || String(currentStatus || "").toUpperCase() === "PROCESSING"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-9 px-4 flex items-center gap-2"
              onClick={handlePublishGroupQuiz}
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
              <span className="text-sm">{t("workspace.quiz.publish", "Publish")}</span>
            </Button>
          )}
          {_contextType === "GROUP" && isGroupLeader && String(currentStatus || "").toUpperCase() === "ACTIVE" && !challengeSnapshotReviewMode && !fairPlayRestricts && (
            <Button
              variant="outline"
              className={`rounded-full h-9 px-4 flex items-center gap-2 ${isDarkMode ? "border-slate-600 text-slate-100" : ""}`}
              onClick={openAudienceDialog}
            >
              <Users className="w-4 h-4" />
              <span className="text-sm">{t("workspace.quiz.distribution", "Distribution")}</span>
            </Button>
          )}
        </div>
      </div>

      {_contextType === "GROUP" && String(currentStatus || "").toUpperCase() === "DRAFT" && (
        <div className="px-4 pb-3 pt-1">
          <div
            className={`relative overflow-hidden rounded-2xl border shadow-sm ${
              isDarkMode
                ? "border-slate-700/80 bg-gradient-to-br from-slate-900/95 via-slate-900 to-blue-950/35"
                : "border-slate-200/90 bg-gradient-to-br from-white via-slate-50/90 to-blue-50/70"
            }`}
          >
            <div
              className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${
                isDarkMode ? "bg-gradient-to-b from-blue-400/90 to-indigo-500/80" : "bg-gradient-to-b from-blue-500 to-indigo-500"
              }`}
              aria-hidden
            />
            <div className="flex gap-3.5 pl-5 pr-4 py-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  isDarkMode ? "bg-blue-500/12 text-blue-300 ring-1 ring-blue-400/20" : "bg-blue-100 text-blue-600 ring-1 ring-blue-200/80"
                }`}
              >
                <Sparkles className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className={`text-[13px] font-semibold tracking-tight ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                  {isChallengeSnapshotReview
                    ? t("groupWorkspace.challenge.quizSnapshotReviewDraftTitle", "Challenge exam (review & edit only)")
                    : t("workspace.quiz.detail.readyToPublish", "Ready to publish?")}
                </p>
                <p className={`text-[13px] leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  {isChallengeSnapshotReview ? (
                    t("groupWorkspace.challenge.quizSnapshotReviewDraftBody", "This exam belongs to a challenge, not the shared group quiz list. Members only take it when the challenge starts. Use the Check tab to review content, edit via Compose, then Publish when ready — there is no group-wide distribution like normal group quizzes."
                    )
                  ) : (
                    t(
                      "workspace.quiz.detail.readyToPublishBody",
                      "Open the Check tab to verify questions, settings, and answers. Then publish and set who can access the quiz.",
                    )
                  )}
                </p>
                <div className={`flex flex-wrap gap-2 pt-0.5 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      isDarkMode ? "bg-slate-800/80 text-slate-300 ring-1 ring-slate-700" : "bg-white text-slate-600 ring-1 ring-slate-200 shadow-sm"
                    }`}
                  >
                    {t("workspace.quiz.detail.stepCheck", "1 · Check")}
                  </span>
                  <span className={`text-[11px] ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>→</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      isDarkMode ? "bg-slate-800/80 text-slate-300 ring-1 ring-slate-700" : "bg-white text-slate-600 ring-1 ring-slate-200 shadow-sm"
                    }`}
                  >
                    {t("workspace.quiz.detail.stepPublish", "2 · Publish")}
                  </span>
                  {!isChallengeSnapshotReview && (
                    <>
                      <span className={`text-[11px] ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>→</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          isDarkMode ? "bg-slate-800/80 text-slate-300 ring-1 ring-slate-700" : "bg-white text-slate-600 ring-1 ring-slate-200 shadow-sm"
                        }`}
                      >
                        {t("workspace.quiz.detail.stepDistribute", "3 · Distribute")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={`px-4 pt-3 flex items-center gap-4 border-b ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "overview"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <Info className="w-4 h-4" /> {t("workspace.quiz.tabs.overview", "Tổng quan")}
        </button>
        {showGroupReviewTab && (
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "review"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            {t("workspace.quiz.tabs.review", "Check")}
          </button>
        )}
        {showQuestionsTab && (
          <button
            type="button"
            onClick={() => setActiveTab("questions")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "questions"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <List className="w-4 h-4" /> {t("workspace.quiz.tabs.questions", "Câu hỏi")}
          </button>
        )}
        {!isChallengeSnapshotReview && !fairPlayRestricts && (
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "history"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <History className="w-4 h-4" /> {t("workspace.quiz.tabs.history", "Lịch sử làm bài")}
          </button>
        )}
        {_contextType === "GROUP" && !isChallengeSnapshotReview && !fairPlayRestricts && String(currentStatus || "").toUpperCase() === "ACTIVE" && (
          <button
            type="button"
            onClick={() => setActiveTab("discussion")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "discussion"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <MessageSquare className="w-4 h-4" /> {t("quizDetailView.tabs.discussion", "Discussion")}
          </button>
        )}
      </div>

      {/* Tab Thảo luận — full-height, không padding wrapper */}
      {activeTab === "discussion" && _contextType === "GROUP" && (
        <div className="flex-1 min-h-0 overflow-hidden px-2 py-2">
          <GroupDiscussionPanel
            isDarkMode={isDarkMode}
            workspaceId={_contextId}
            quizId={quiz?.quizId}
            isLeader={isGroupLeader}
            hasAttempted={hasCurrentUserCompletedQuiz}
            allQuestions={allQuestionsFlat}
            questionsById={questionsById}
            onNavigateToQuestion={handleNavigateToQuestion}
          />
        </div>
      )}

      {/* Nội dung chi tiết (các tab khác) */}
      {activeTab !== "discussion" && (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Group — tab Kiểm tra: câu hỏi + đáp án + config */}
        {activeTab === "review" && showGroupReviewTab && (
          <GroupQuizReviewPanel
            isDarkMode={isDarkMode}
            sections={sections}
            questionsMap={questionsMap}
            answersMap={answersMap}
            loading={loading}
            quizId={quiz?.quizId}
            workspaceId={_contextId}
            isLeader={isGroupLeader}
            isReviewer={challengeSnapshotReviewMode && !isGroupLeader}
            onQuestionDeleted={fetchFullDetail}
          />
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Thông tin tổng quan quiz */}
            <div className={`rounded-xl p-4 border ${isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-start justify-between mb-3">
                <h3 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{effectiveQuiz?.title}</h3>
                <div className="flex items-center gap-2">
                  {effectiveQuiz?.quizIntent && !shouldHideRoadmapIntentBadge && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDarkMode ? is.dark || "" : is.light || ""}`}>
                      {t(`workspace.quiz.intentLabels.${effectiveQuiz.quizIntent}`)}
                    </span>
                  )}
                  {!shouldHideRoadmapActiveStatusBadge ? (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDarkMode ? ss.dark : ss.light}`}>
                      {t(`workspace.quiz.statusLabels.${currentStatus}`)}
                    </span>
                  ) : null}
                  {typeof effectiveQuiz?.timerMode === "boolean" && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${effectiveQuiz.timerMode
                      ? (isDarkMode ? "bg-blue-950/40 text-blue-300" : "bg-blue-100 text-blue-700")
                      : (isDarkMode ? "bg-emerald-950/40 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                    }`}>
                      {effectiveQuiz.timerMode
                        ? t("workspace.quiz.examModeType1", "Timed Test")
                        : t("workspace.quiz.examModeType2", "Sequential Timed Test")}
                    </span>
                  )}
                </div>
              </div>

              {effectiveQuiz?.description && (
                <p className={`text-sm mb-4 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                  {effectiveQuiz.description}
                </p>
              )}

              {/* Thẻ thông tin dạng grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 mb-4">
                <InfoChip icon={Sparkles} label={t("quizDetailView.overview.sourceLabel", "Source") } value={sourceTypeLabel} isDarkMode={isDarkMode} />
                <InfoChip icon={Users} label={t("workspace.quiz.groupAudience.filterLabelShort", "Group") } value={overviewAudienceLabel} isDarkMode={isDarkMode} />
                <InfoChip icon={BadgeCheck} label={t("quizDetailView.overview.intentLabel", "Intent") } value={overviewIntentLabel} isDarkMode={isDarkMode} />
                <InfoChip icon={Clock} label={t("quizDetailView.overview.timerModeLabel", "Timer mode") } value={overviewTimerModeLabel} isDarkMode={isDarkMode} />
                {durationInMinutes > 0 && (
                  <InfoChip icon={Timer} label={t("workspace.quiz.timeDuration")} value={`${durationInMinutes} ${t("workspace.quiz.minutes")}`} isDarkMode={isDarkMode} />
                )}
                {effectiveQuiz?.overallDifficulty && (
                  <InfoChip icon={BarChart3} label={t("workspace.quiz.overallDifficulty")} value={t(`workspace.quiz.difficultyLevels.${effectiveQuiz.overallDifficulty.toLowerCase()}`)} isDarkMode={isDarkMode} />
                )}
                {effectiveQuiz?.passScore != null && (
                  <InfoChip icon={Target} label={t("workspace.quiz.passingScore")} value={effectiveQuiz.passScore} isDarkMode={isDarkMode} />
                )}
                {effectiveQuiz?.maxAttempt != null && (
                  <InfoChip icon={Hash} label={t("workspace.quiz.maxAttempt")} value={effectiveQuiz.maxAttempt} isDarkMode={isDarkMode} />
                )}
                <InfoChip icon={CheckCircle2} label={t("quizDetailView.overview.resultLabel", "Result") } value={attemptedLabel} isDarkMode={isDarkMode} />
                {sections.length > 0 && (
                  <InfoChip icon={BookOpen} label={t("workspace.quiz.tabs.questions", "Questions")} value={sections.reduce((acc, s) => acc + (questionsMap[s.sectionId]?.length || 0), 0)} isDarkMode={isDarkMode} />
                )}
              </div>

              {showCommunitySignals ? (
                <div className={`mb-4 rounded-3xl border px-4 py-4 ${
                  isDarkMode ? "border-slate-800 bg-slate-900/70" : "border-slate-200 bg-blue-50/60"
                }`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                        {t("workspace.quiz.communityDetail.summaryTitle", "Community signals")}
                      </p>
                      <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        {effectiveQuiz?.communityShared === true
                          ? t("workspace.quiz.communityDetail.ownerSummary", "Theo dõi feedback và discussion công khai của quiz bạn đã chia sẻ.")
                          : t("workspace.quiz.communityDetail.cloneSummary", "Xem rating và discussion gốc của community quiz này, rồi gửi feedback sau khi làm xong bản clone của bạn.")}
                      </p>
                    </div>
                    <CommunityQuizSignals
                      cloneCount={effectiveQuiz?.communityCloneCount}
                      averageRating={effectiveQuiz?.communityAverageRating}
                      ratingCount={effectiveQuiz?.communityRatingCount}
                      commentCount={effectiveQuiz?.communityCommentCount}
                      isDarkMode={isDarkMode}
                      t={t}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setCommunityDetailOpen(true)}>
                      <MessageSquare className="h-4 w-4" />
                      <span>{t("workspace.quiz.communityDetail.openCommunity", "Open community detail")}</span>
                    </Button>
                    {isCommunityClone && hasCurrentUserCompletedQuiz ? (
                      <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setCommunityFeedbackOpen(true)}>
                        <Star className="h-4 w-4" />
                        <span>
                          {effectiveQuiz?.communityFeedbackSubmitted
                            ? t("workspace.quiz.communityDetail.updateFeedback", "Update community feedback")
                            : t("workspace.quiz.communityDetail.leaveFeedback", "Leave community feedback")}
                        </span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Action Buttons in Overview — quiz challenge snapshot: không làm bài từ đây */}
              {isActiveQuiz && !isChallengeSnapshotReview && !fairPlayRestricts && (
                <div className={`mt-4 pt-4 border-t flex flex-row items-center gap-3 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
                  {!isRoadmapQuizSource && (
                    <div className="flex flex-1 flex-col gap-1">
                      <Button
                        onClick={hasCompletedOfficialAttempt ? () => handleStartQuiz('practice') : undefined}
                        disabled={!hasCompletedOfficialAttempt}
                        variant="outline"
                        className={`h-10 w-full px-4 flex items-center justify-center gap-2 rounded-xl transition-all active:scale-95 ${
                          hasCompletedOfficialAttempt
                            ? (isDarkMode ? "border-blue-800/60 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40" : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100")
                            : (isDarkMode ? "border-slate-700/50 bg-slate-800/30 text-slate-500 cursor-not-allowed" : "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed")
                        }`}
                      >
                        <Play className="w-4 h-4" />
                        <span className="font-medium">{t("workspace.quiz.practice", "Practice")}</span>
                      </Button>
                      {!hasCompletedOfficialAttempt && (
                        <p className={`text-center text-[11px] leading-snug ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                          {t("quizDetailView.overview.practiceRequiresAttempt", "Complete 1 test attempt to unlock")}
                        </p>
                      )}
                    </div>
                  )}
                  <Button onClick={() => setExamStartOpen(true)} className="flex-1 h-10 px-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 shadow-sm">
                    <ClipboardCheck className="w-4 h-4" />
                    <span className="font-medium">{t("workspace.quiz.exam", "Exam mode")}</span>
                  </Button>
                </div>
              )}
              {isActiveQuiz && isChallengeSnapshotReview && (
                <p className={`mt-4 pt-4 border-t text-sm leading-relaxed ${isDarkMode ? "border-slate-800 text-slate-400" : "border-gray-200 text-gray-600"}`}>
                  {t("groupWorkspace.challenge.quizSnapshotReviewNoTakeHint", "This exam only opens when the challenge starts (on schedule or when the leader runs it). Rankings are per challenge — you cannot start the exam from this screen."
                  )}
                </p>
              )}

              {/* Ngày tạo */}
              <div className={`flex items-center gap-2 mt-3 text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                <Clock className="w-3 h-3" />
                <span>{t("workspace.quiz.detail.createdAt", "Created")}: {formatDate(effectiveQuiz?.createdAt)}</span>
                {effectiveQuiz?.updatedAt && (
                  <>
                    <span>•</span>
                    <span>{t("workspace.quiz.detail.updatedAt", "Updated")}: {formatDate(effectiveQuiz.updatedAt)}</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Questions Tab */}
        {activeTab === "questions" && (
          <div className="space-y-4">
            {/* Danh sách sections + questions */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className={`w-8 h-8 animate-spin mb-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.detail.loadingDetail", "Loading quiz details...")}</p>
              </div>
            ) : sections.length === 0 ? (
              <div className={`text-center py-8 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {t("workspace.quiz.detail.noSections", "No sections found.")}
              </div>
            ) : (
              sections.map((section, sIdx) => {
            const isSingleSection = sections.length === 1;
            const isExpanded = isSingleSection || expandedSections[section.sectionId];
            const questions = questionsMap[section.sectionId] || [];

            return (
              <div key={section.sectionId} className={`rounded-xl border overflow-hidden ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                {/* Section header — ẩn khi chỉ có 1 section */}
                {!isSingleSection && (
                  <button
                    onClick={() => toggleSection(section.sectionId)}
                    className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${isDarkMode ? "bg-slate-800/30 hover:bg-slate-800/60" : "bg-slate-100/50 hover:bg-slate-100"}`}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <BookOpen className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`} />
                      <span className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>
                        {t("workspace.quiz.detail.section", "Section")} {sIdx + 1}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-700 text-slate-400" : "bg-gray-200 text-gray-500"}`}>
                        {questions.length} {t("workspace.quiz.detail.questions")}
                      </span>
                    </div>
                  </button>
                )}

                {/* Danh sách câu hỏi của section */}
                {isExpanded && (
                  <div className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-slate-200"}`}>
                    {questions.length === 0 ? (
                      <div className={`px-4 py-6 text-center text-sm ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                        {t("workspace.quiz.detail.noQuestions")}
                      </div>
                    ) : (
                      questions.map((question, qIdx) => {
                        const answers = answersMap[question.questionId] || [];
                        const correctTextAnswers = answers
                          .filter((ans) => ans?.isCorrect)
                          .map((ans) => (typeof ans?.content === "string" ? ans.content.trim() : ""))
                          .filter(Boolean);
                        const fallbackTextAnswers = answers
                          .map((ans) => (typeof ans?.content === "string" ? ans.content.trim() : ""))
                          .filter(Boolean);
                        const textAnswersToDisplay = correctTextAnswers.length > 0
                          ? correctTextAnswers
                          : fallbackTextAnswers;
                        const isQExpanded = expandedQuestions[question.questionId];
                        const typeName = QUESTION_TYPE_ID_MAP[question.questionTypeId] || "multipleChoice";

                        return (
                          <div key={question.questionId} data-question-id={question.questionId} className={`px-4 py-3 ${isDarkMode ? "bg-slate-900/50" : "bg-white"}`}>
                            {/* Question header */}
                            <div className="flex items-start gap-3">
                              <span className={`text-xs font-bold mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isDarkMode ? "bg-blue-950/50 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                                {qIdx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={`text-sm font-medium whitespace-pre-wrap ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                                    <MixedMathText>{question.content}</MixedMathText>
                                  </p>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => toggleQuestion(question.questionId)}
                                      className={`p-1 rounded transition-all ${isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-400 hover:text-gray-600"}`}
                                    >
                                      {isQExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>

                                {/* Meta info: type, difficulty, bloom, duration */}
                                <div className={`flex items-center gap-2 mt-1.5 flex-wrap text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                                  <span className={`px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                                    {t(`workspace.quiz.types.${typeName}`)}
                                  </span>
                                  {question.difficulty && (
                                    <span className={`px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                                      {t(`workspace.quiz.difficultyLevels.${question.difficulty.toLowerCase()}`)}
                                    </span>
                                  )}
                                  {question.bloomId && (
                                    <span className={`px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                                      {t(`workspace.quiz.bloomLevels.${["remember","understand","apply","analyze","evaluate"][question.bloomId - 1] || "remember"}`)}
                                    </span>
                                  )}
                                  {question.duration > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Timer className="w-3 h-3" />{question.duration}s
                                    </span>
                                  )}
                                </div>

                                {/* Answers — hiển thị khi mở rộng */}
                                {isQExpanded && (
                                  <div className="mt-3 space-y-1.5">
                                    {!canViewAnswers ? (
                                      <div className={`px-3 py-2 rounded-lg text-xs ${isDarkMode ? "bg-slate-800/60 text-slate-400" : "bg-gray-100 text-gray-600"}`}>
                                        {t("workspace.quiz.answerLocked", "Finish the quiz to view answers and explanations.")}
                                      </div>
                                    ) : (
                                      <>
                                        {(typeName === "shortAnswer" || typeName === "fillBlank") ? (
                                          <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                                            isDarkMode ? "bg-emerald-950/30 border border-emerald-800/50" : "bg-emerald-50 border border-emerald-200"
                                          }`}>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                                              isDarkMode ? "bg-emerald-800 text-emerald-300" : "bg-emerald-200 text-emerald-700"
                                            }`}>
                                              {t("workspace.quiz.correctAnswerLabel", "Correct answer")}
                                            </span>
                                            <span className={`flex-1 ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>
                                              {textAnswersToDisplay.length ? (
                                                <MixedMathText>{textAnswersToDisplay.join(" / ")}</MixedMathText>
                                              ) : (
                                                "-"
                                              )}
                                            </span>
                                            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                                          </div>
                                        ) : typeName === "matching" ? (
                                          (() => {
                                            const correctAns = answers.find((a) => a.isCorrect);
                                            let pairs = [];
                                            if (correctAns?.content) {
                                              try { pairs = JSON.parse(correctAns.content); } catch { pairs = []; }
                                            }
                                            if (!Array.isArray(pairs) || pairs.length === 0) {
                                              return (
                                                <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                                                  {t("workspace.quiz.detail.matchingNoData", "No matching data available")}
                                                </span>
                                              );
                                            }
                                            return (
                                              <div className="space-y-1.5">
                                                {pairs.map((pair, pIdx) => (
                                                  <div key={pIdx} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                                    isDarkMode ? "bg-emerald-950/30 border border-emerald-800/50" : "bg-emerald-50 border border-emerald-200"
                                                  }`}>
                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                      isDarkMode ? "bg-emerald-800 text-emerald-300" : "bg-emerald-200 text-emerald-700"
                                                    }`}>{pIdx + 1}</span>
                                                    <span className={`font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>
                                                      <MixedMathText>{pair.leftKey}</MixedMathText>
                                                    </span>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${isDarkMode ? "text-emerald-600" : "text-emerald-400"}`}>
                                                      <path d="M5 12h14M13 6l6 6-6 6" />
                                                    </svg>
                                                    <span className={isDarkMode ? "text-emerald-300" : "text-emerald-700"}>
                                                      <MixedMathText>{pair.rightKey}</MixedMathText>
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                          })()
                                        ) : (
                                          answers.map((ans, aIdx) => (
                                            <div key={ans.answerId} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                              ans.isCorrect
                                                ? isDarkMode ? "bg-emerald-950/30 border border-emerald-800/50" : "bg-emerald-50 border border-emerald-200"
                                                : isDarkMode ? "bg-slate-800/50" : "bg-gray-50"
                                            }`}>
                                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                ans.isCorrect
                                                  ? isDarkMode ? "bg-emerald-800 text-emerald-300" : "bg-emerald-200 text-emerald-700"
                                                  : isDarkMode ? "bg-slate-700 text-slate-400" : "bg-gray-200 text-gray-500"
                                              }`}>
                                                {typeName === "trueFalse" ? ans.content.slice(0, 1).toUpperCase() : String.fromCharCode(65 + aIdx)}
                                              </span>
                                              <span className={`flex-1 ${
                                                ans.isCorrect
                                                  ? isDarkMode ? "text-emerald-300" : "text-emerald-700"
                                                  : isDarkMode ? "text-slate-300" : "text-gray-700"
                                              }`}>
                                                <MixedMathText>{ans.content}</MixedMathText>
                                              </span>
                                              {ans.isCorrect && <CheckCircle2 className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />}
                                            </div>
                                          ))
                                        )}

                                        {/* Giải thích */}
                                        {question.explanation && (
                                          <div className={`mt-2 px-3 py-2 rounded-lg text-xs italic ${isDarkMode ? "bg-amber-950/20 text-amber-400 border border-amber-900/30" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                            <span className="font-semibold not-italic">{t("workspace.quiz.explanation")}:</span>{" "}
                                            <MixedMathText className="not-italic">{question.explanation}</MixedMathText>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}

                                {_contextType === "GROUP" && isActiveQuiz && !isChallengeSnapshotReview && (
                                  <div
                                    className={cn(
                                      "mt-4 -ml-1 inline-flex w-fit max-w-full flex-wrap items-center gap-2 rounded-[20px] border px-2 py-2",
                                      isDarkMode ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-slate-50/80",
                                    )}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleQuestion(question.questionId)}
                                      className={cn(
                                        "inline-flex min-w-[110px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors",
                                        isDarkMode
                                          ? "bg-slate-900 text-slate-200 hover:bg-slate-800"
                                          : "bg-white text-slate-700 hover:bg-slate-100",
                                      )}
                                    >
                                      {canViewAnswers ? <Eye className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                                      <span>{isQExpanded ? t("quizDetailView.actions.hideAnswer", "Hide answer") : canViewAnswers ? t("quizDetailView.actions.showAnswer", "Answer") : t("quizDetailView.actions.answerLocked", "Answer locked")}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setDiscussionOpenQId(question.questionId)}
                                      className={cn(
                                        "inline-flex min-w-[110px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors",
                                        isDarkMode
                                          ? "bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
                                          : "bg-blue-600 text-white hover:bg-blue-700",
                                      )}
                                    >
                                      <MessageSquare className="h-3.5 w-3.5" />
                                      <span>{t("quizDetailView.actions.chatQuestion", "Chat câu hỏi")}</span>
                                      {(qCommentCounts[String(question.questionId)] ?? 0) > 0 && (
                                        <span
                                          className={cn(
                                            "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                                            isDarkMode ? "bg-blue-950 text-blue-300" : "bg-white/20 text-white",
                                          )}
                                        >
                                          {qCommentCounts[String(question.questionId)]}
                                        </span>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleToggleStar(question.questionId, section.sectionId)}
                                      disabled={starringId === question.questionId}
                                      className={cn(
                                        "inline-flex min-w-[96px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60",
                                        question.isStarred
                                          ? isDarkMode
                                            ? "bg-amber-500/15 text-amber-300"
                                            : "bg-amber-100 text-amber-700"
                                          : isDarkMode
                                            ? "bg-slate-900 text-slate-300 hover:bg-slate-800"
                                            : "bg-white text-slate-700 hover:bg-slate-100",
                                      )}
                                    >
                                      <Star className={`h-3.5 w-3.5 ${question.isStarred ? "fill-current" : ""}`} />
                                      <span>{question.isStarred ? t("quizDetailView.actions.saved", "Saved") : t("quizDetailView.actions.save", "Save")}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className={`w-8 h-8 animate-spin mb-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.history.loading", "Loading history...")}</p>
              </div>
            ) : history.length === 0 ? (
              <div className={`text-center py-12 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                {t("workspace.quiz.history.empty", "No attempt history yet.")}
              </div>
            ) : (
              <div className="grid gap-4">
                {/* Leader: group attempts by member */}
                {_contextType === "GROUP" && isGroupLeader ? (() => {
                  // Group by memberId
                  const byMember = {};
                  history.forEach((attempt) => {
                    const key = String(attempt.userId ?? attempt.memberId ?? attempt.attemptId);
                    if (!byMember[key]) {
                      byMember[key] = {
                        user: {
                          fullName: attempt.memberName ?? attempt.userFullName,
                          username: attempt.userName,
                        },
                        name: getUserDisplayLabel({
                          fullName: attempt.memberName ?? attempt.userFullName,
                          username: attempt.userName,
                        }, `User ${key}`),
                        avatar: attempt.avatar ?? attempt.authorAvatar ?? attempt.avatarUrl ?? "",
                        attempts: [],
                      };
                    } else if (!byMember[key].avatar) {
                      byMember[key].avatar = attempt.avatar ?? attempt.authorAvatar ?? attempt.avatarUrl ?? "";
                    }
                    byMember[key].attempts.push(attempt);
                  });
                  return Object.entries(byMember).map(([memberId, { name, user, avatar, attempts: memberAttempts }]) => {
                    const sortedMemberAttempts = sortAttemptHistory(memberAttempts);
                    const latestAttempt = sortedMemberAttempts[0];
                    const shouldUseAttemptDropdown = sortedMemberAttempts.length >= 3;

                    return (
                      <div key={memberId} className={`rounded-xl border overflow-hidden ${isDarkMode ? "border-slate-700 bg-slate-800/30" : "border-slate-200 bg-white"}`}>
                        {/* Member header */}
                        <div className={`px-4 py-2.5 flex items-center gap-2 border-b ${isDarkMode ? "bg-slate-800/60 border-slate-700/60" : "bg-slate-50 border-slate-100"}`}>
                          <HistoryMemberAvatar src={avatar} name={name} isDarkMode={isDarkMode} />
                          <span className={`min-w-0 text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                            <UserDisplayName
                              user={user}
                              fallback={name}
                              isDarkMode={isDarkMode}
                              showUsernameSuffix={false}
                            />
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                            {t("quizDetailView.history.attemptCount", "{{count}} attempts", { count: sortedMemberAttempts.length })}
                          </span>
                          {shouldUseAttemptDropdown ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={`ml-auto h-8 rounded-full px-3 text-xs ${
                                    isDarkMode
                                      ? "border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                                  }`}
                                >
                                  {t("workspace.quiz.history.viewAttempts", "Xem {{count}} lần làm", { count: sortedMemberAttempts.length })}
                                  <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className={`w-72 ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
                              >
                                {sortedMemberAttempts.map((attempt) => (
                                  <DropdownMenuItem
                                    key={attempt.attemptId}
                                    className="flex items-center justify-between gap-3 py-2"
                                    onSelect={() => navigate(buildQuizResultPath(attempt.attemptId), {
                                      state: {
                                        quizId: effectiveQuiz?.quizId,
                                        returnToQuizPath: `${location.pathname}${location.search || ""}`,
                                        ...resultSourceState,
                                      },
                                    })}
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-medium">
                                        {getAttemptHistoryDate(attempt)}
                                      </p>
                                      <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                        {attempt.isPracticeMode ? t("workspace.quiz.practice", "Practice") : t("workspace.quiz.exam", "Exam")}
                                      </p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${
                                      isDarkMode ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-100 text-emerald-700"
                                    }`}>
                                      {t("workspace.quiz.review", "Kiểm tra")}
                                    </span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                        {shouldUseAttemptDropdown ? (
                          latestAttempt ? (
                            <div
                              className={`px-4 py-3 flex items-center justify-between transition-colors cursor-pointer ${isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}`}
                              onClick={() => navigate(buildQuizResultPath(latestAttempt.attemptId), {
                                state: {
                                  quizId: effectiveQuiz?.quizId,
                                  returnToQuizPath: `${location.pathname}${location.search || ""}`,
                                  ...resultSourceState,
                                },
                              })}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg ${latestAttempt.status === 'COMPLETED' ? (isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-600") : (isDarkMode ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-600")}`}>
                                  {latestAttempt.status === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                </div>
                                <div>
                                  <p className={`text-xs font-medium ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                                    {getAttemptHistoryDate(latestAttempt)}
                                  </p>
                                  <p className={`text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                                    {t("workspace.quiz.history.latestAttempt", "Lần gần nhất")}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-md ${latestAttempt.isPracticeMode ? (isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-700") : (isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-700")}`}>
                                {latestAttempt.isPracticeMode ? t("workspace.quiz.practice", "Practice") : t("workspace.quiz.exam", "Exam")}
                              </span>
                            </div>
                          ) : null
                        ) : (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {sortedMemberAttempts.map((attempt) => (
                              <div
                                key={attempt.attemptId}
                                className={`px-4 py-3 flex items-center justify-between transition-colors cursor-pointer ${isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}`}
                                onClick={() => navigate(buildQuizResultPath(attempt.attemptId), {
                                  state: {
                                    quizId: effectiveQuiz?.quizId,
                                    returnToQuizPath: `${location.pathname}${location.search || ""}`,
                                    ...resultSourceState,
                                  },
                                })}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-1.5 rounded-lg ${attempt.status === 'COMPLETED' ? (isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-600") : (isDarkMode ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-600")}`}>
                                    {attempt.status === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <p className={`text-xs font-medium ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                                      {getAttemptHistoryDate(attempt)}
                                    </p>
                                  </div>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-md ${attempt.isPracticeMode ? (isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-700") : (isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-700")}`}>
                                  {attempt.isPracticeMode ? t("workspace.quiz.practice", "Practice") : t("workspace.quiz.exam", "Exam")}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })() : (
                  /* Member: own attempts */
                  history.map((attempt) => (
                    <div key={attempt.attemptId} className={`rounded-xl p-4 border transition-colors cursor-pointer ${
                      isDarkMode ? "bg-slate-800/50 border-slate-800 hover:bg-slate-800/80" : "bg-white border-slate-200 hover:bg-slate-50"
                    }`} onClick={() => navigate(buildQuizResultPath(attempt.attemptId), { state: { quizId: effectiveQuiz?.quizId, returnToQuizPath: `${location.pathname}${location.search || ""}`, ...resultSourceState } })}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${attempt.status === 'COMPLETED' ? (isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-600") : (isDarkMode ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-600")}`}>
                            {attempt.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                              {getAttemptHistoryDate(attempt)}
                            </h4>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md ${
                            attempt.isPracticeMode
                              ? (isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-700")
                              : (isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-700")
                          }`}>
                            {attempt.isPracticeMode ? t("workspace.quiz.practice", "Practice") : t("workspace.quiz.exam", "Exam")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Per-question discussion popup */}
      {discussionOpenQId != null && (
        <QuestionDiscussionDialog
          open
          onOpenChange={(open) => {
            if (!open) setDiscussionOpenQId(null);
          }}
          isDarkMode={isDarkMode}
          workspaceId={_contextId}
          quizId={quiz?.quizId}
          question={questionsById[String(discussionOpenQId)]}
          questionIndex={questionsById[String(discussionOpenQId)]?.index ?? 1}
          answers={answersMap[discussionOpenQId] || []}
          isLeader={isGroupLeader}
          hasAttempted={hasCurrentUserCompletedQuiz}
          canViewAnswers={canViewAnswers}
          commentCount={qCommentCounts[String(discussionOpenQId)] ?? 0}
          onMessageCountChange={(nextCount) => handleQuestionMessageCountChange(discussionOpenQId, nextCount)}
          sectionLabel={
            questionsById[String(discussionOpenQId)]?.sectionId
              ? `${t("workspace.quiz.detail.section", "Section")} ${sections.findIndex((section) => section.sectionId === questionsById[String(discussionOpenQId)]?.sectionId) + 1}`
              : ""
          }
        />
      )}

      <Dialog open={audienceOpen} onOpenChange={setAudienceOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col gap-0 rounded-2xl border-0 p-0 shadow-2xl shadow-slate-900/15">
          <div
            className={cn(
              "relative overflow-hidden px-6 pb-5 pt-6 pr-14",
              isDarkMode
                ? "bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/80"
                : "bg-gradient-to-br from-blue-50 via-white to-indigo-50/90",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl",
                isDarkMode ? "bg-blue-500/20" : "bg-blue-400/25",
              )}
              aria-hidden
            />
            <DialogHeader className="relative space-y-0 text-left">
              <div className="flex items-start gap-3.5">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg",
                    isDarkMode
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-900/40"
                      : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-600/30",
                  )}
                >
                  <Share2 className="h-6 w-6" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <DialogTitle className={cn("text-lg font-semibold tracking-tight", isDarkMode ? "text-slate-50" : "text-slate-900")}>
                    {t("workspace.quiz.audience.title", "Quiz distribution")}
                  </DialogTitle>
                  <DialogDescription className={cn("mt-2 text-sm leading-relaxed", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                    {t(
                      "workspace.quiz.audience.description",
                      "Choose whether all members see this quiz or only selected members.",
                    )}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
            <p className={cn("text-xs font-semibold uppercase tracking-wide", isDarkMode ? "text-slate-500" : "text-slate-500")}>
              {t("workspace.quiz.audience.visibility", "Visibility")}
            </p>
            <div className="grid gap-3 sm:grid-cols-1">
              <button
                type="button"
                onClick={() => setAudienceMode("ALL_MEMBERS")}
                className={cn(
                  "group relative flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200",
                  audienceMode === "ALL_MEMBERS"
                    ? isDarkMode
                      ? "border-blue-500/80 bg-blue-950/40 ring-2 ring-blue-500/30"
                      : "border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-md shadow-blue-500/10"
                    : isDarkMode
                      ? "border-slate-700/80 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80",
                )}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                    audienceMode === "ALL_MEMBERS"
                      ? isDarkMode
                        ? "bg-blue-500/25 text-blue-300"
                        : "bg-blue-100 text-blue-700"
                      : isDarkMode
                        ? "bg-slate-800 text-slate-400 group-hover:text-slate-300"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200",
                  )}
                >
                  <Users className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                    {t("workspace.quiz.audience.allMembersTitle", "All members")}
                  </p>
                  <p className={cn("mt-0.5 text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    {t("workspace.quiz.audience.allMembersDescription", "Everyone in the group can open this quiz.")}
                  </p>
                </div>
                {audienceMode === "ALL_MEMBERS" && (
                  <CheckCircle2 className={cn("h-5 w-5 shrink-0", isDarkMode ? "text-blue-400" : "text-blue-600")} />
                )}
              </button>

              <button
                type="button"
                onClick={() => setAudienceMode("SELECTED_MEMBERS")}
                className={cn(
                  "group relative flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200",
                  audienceMode === "SELECTED_MEMBERS"
                    ? isDarkMode
                      ? "border-violet-500/80 bg-violet-950/35 ring-2 ring-violet-500/30"
                      : "border-violet-500 bg-violet-50/90 ring-2 ring-violet-500/20 shadow-md shadow-violet-500/10"
                    : isDarkMode
                      ? "border-slate-700/80 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80",
                )}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                    audienceMode === "SELECTED_MEMBERS"
                      ? isDarkMode
                        ? "bg-violet-500/25 text-violet-300"
                        : "bg-violet-100 text-violet-700"
                      : isDarkMode
                        ? "bg-slate-800 text-slate-400 group-hover:text-slate-300"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200",
                  )}
                >
                  <UserPlus className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                    {t("workspace.quiz.audience.selectedMembersTitle", "Specific members only")}
                  </p>
                  <p className={cn("mt-0.5 text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    {t("workspace.quiz.audience.selectedMembersDescription", "Pick who should see the quiz below.")}
                  </p>
                </div>
                {audienceMode === "SELECTED_MEMBERS" && (
                  <CheckCircle2 className={cn("h-5 w-5 shrink-0", isDarkMode ? "text-violet-400" : "text-violet-600")} />
                )}
              </button>
            </div>

            {audienceMode === "SELECTED_MEMBERS" && (
              <div className="space-y-2 pt-1">
                <p className={cn("text-xs font-semibold uppercase tracking-wide", isDarkMode ? "text-slate-500" : "text-slate-500")}>
                  {t("workspace.quiz.audience.members", "Members")}
                </p>
                <div
                  className={cn(
                    "max-h-56 overflow-y-auto rounded-2xl border p-2 space-y-1",
                    isDarkMode ? "border-slate-700/90 bg-slate-950/40" : "border-slate-200/90 bg-slate-50/80",
                  )}
                >
                  {membersLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10">
                      <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                      <span className={cn("text-xs", isDarkMode ? "text-slate-500" : "text-slate-500")}>
                        {t("workspace.quiz.audience.loadingMembers", "Loading members...")}
                      </span>
                    </div>
                  ) : groupMembers.length === 0 ? (
                    <p className={cn("py-6 text-center text-sm", isDarkMode ? "text-slate-500" : "text-slate-500")}>
                      {t("workspace.quiz.audience.noMembers", "No members found.")}
                    </p>
                  ) : (
                    groupMembers.map((m) => {
                      const uid = Number(m.userId ?? m.id);
                      if (!Number.isInteger(uid) || uid <= 0) return null;
                      const label = getUserDisplayLabel(m, t("workspace.quiz.audience.memberFallback", { id: uid }));
                      const checked = selectedAudienceUserIds.includes(uid);
                      return (
                        <label
                          key={uid}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 transition-colors",
                            checked
                              ? isDarkMode
                                ? "bg-blue-950/50 ring-1 ring-blue-800/60"
                                : "bg-white ring-1 ring-blue-200 shadow-sm"
                              : isDarkMode
                                ? "hover:bg-slate-800/60"
                                : "hover:bg-white",
                            )}
                          >
                          <HistoryMemberAvatar
                            src={m.avatar ?? m.avatarUrl}
                            name={label}
                            isDarkMode={isDarkMode}
                            sizeClass="h-9 w-9"
                            textClass="text-xs"
                          />
                          <span className={cn("min-w-0 flex-1 text-sm font-medium", isDarkMode ? "text-slate-100" : "text-slate-800")}>
                            <UserDisplayName
                              user={m}
                              fallback={t("workspace.quiz.audience.memberFallback", { id: uid })}
                              isDarkMode={isDarkMode}
                            />
                          </span>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleAudienceMember(uid)}
                            className="shrink-0"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter
            className={cn(
              "gap-2 border-t px-6 py-4 sm:justify-end",
              isDarkMode ? "border-slate-800 bg-slate-950/50" : "border-slate-100 bg-slate-50/50",
            )}
          >
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setAudienceOpen(false)}>
              {t("workspace.quiz.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-white shadow-md shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700"
              onClick={handleSaveAudience}
              disabled={audienceSaving}
            >
              {audienceSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("workspace.quiz.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={examStartOpen} onOpenChange={setExamStartOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("workspace.quiz.exam", "Exam")}</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block text-base font-semibold text-slate-900 dark:text-slate-100">
                {effectiveQuiz?.title}
              </span>
              <span className="block">
                {t("workspace.quiz.startExamPrompt", "Start test mode for this quiz?")}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExamStartOpen(false)}>
              {t("workspace.quiz.close", "Close")}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConfirmExamStart}>
              {t("workspace.quiz.header.confirm", "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component chip thông tin dùng lại
function InfoChip({ icon: Icon, label, value, isDarkMode }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDarkMode ? "bg-slate-900/50" : "bg-white"}`}>
      <Icon className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
      <div>
        <p className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{label}</p>
        <p className={`text-xs font-medium ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>{value}</p>
      </div>
    </div>
  );
}

export default QuizDetailView;
