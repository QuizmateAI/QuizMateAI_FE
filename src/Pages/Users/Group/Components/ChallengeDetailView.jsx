import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import {
  ArrowLeft, Clock, Users, Calendar, Shield, Swords, Play,
  UserPlus, XCircle, CheckCircle, Loader2, PenLine, Eye, Pencil, UserMinus,
  Trophy, Lock,
} from 'lucide-react';
import { getDurationInMinutes } from '@/lib/quizDurationDisplay';
import {
  combineToBackendPayload,
  getScheduleValidationIssues,
  isoToDateTimeParts,
} from '@/lib/challengeSchedule';
import ChallengeScheduleFields from './ChallengeScheduleFields';
import {
  getChallengeDetail, registerForChallenge, acceptChallengeInvitation,
  startChallengeAttempt, cancelChallenge, updateChallenge,
  removeQuizReviewContributor, publishChallenge,
  batchInviteQuizReviewers, startChallenge,
  createChallengeRoundQuiz,
} from '../../../../api/ChallengeAPI';
import { getGroupMembers } from '../../../../api/GroupAPI';
import { buildGroupWorkspaceSectionPath, buildQuizAttemptPath } from '@/lib/routePaths';
import { getUserDisplayLabel } from '@/Utils/userProfile';
import UserDisplayName from '@/Components/users/UserDisplayName';
import ChallengeLeaderboard from './ChallengeLeaderboard';
import ChallengeTeamScoreboard from './ChallengeTeamScoreboard';
import ChallengeBracketView from './ChallengeBracketView';

/** Khớp giới hạn BE (QuizReviewContributorService.MAX_INVITED_REVIEWERS): 1 chính + 2 phụ */
const MAX_SNAPSHOT_REVIEW_INVITES = 3;
const CHALLENGE_PROGRESS_STEP = 3;
const CHALLENGE_PROGRESS_TICK_MS = 180;

const MATCH_MODE_LABELS = {
  FREE_FOR_ALL: 'Đua cá nhân',
  TEAM_BATTLE: 'Đấu đội',
  SOLO_BRACKET: 'Đấu cúp 1v1',
};

function formatDateTime(dt) {
  if (!dt) return '-';
  const d = new Date(dt);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function readPositiveNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function clampPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function getSeedDisplayedChallengeProgress(targetPercent) {
  const normalizedTarget = clampPercent(targetPercent);
  if (normalizedTarget <= 0) return 0;
  return Math.min(normalizedTarget, 8);
}

function getReviewerStatusCopy(reviewer, t) {
  if (reviewer?.reviewCompleteOkAt) {
    return t('challengeDetailView.reviewerPanel.confirmedShort', 'Đã xác nhận {{time}}', {
      time: formatDateTime(reviewer.reviewCompleteOkAt),
    });
  }

  if (reviewer?.lastViewedAt) {
    return t('challengeDetailView.reviewerPanel.openedPendingShort', 'Đã mở {{time}} • Chưa xác nhận', {
      time: formatDateTime(reviewer.lastViewedAt),
    });
  }

  return t('challengeDetailView.reviewerPanel.pendingShort', 'Chưa mở • Chưa xác nhận');
}

function resolveReviewMemberUserId(member) {
  return readPositiveNumber(
    member?.userId,
    member?.userID,
    member?.memberUserId,
    member?.user?.userId,
    member?.user?.userID,
  );
}

function getBracketRoundCount(detail) {
  const explicit = readPositiveNumber(detail?.roundCount, detail?.totalRounds, detail?.bracketRoundCount);
  if (explicit) return explicit;

  const roundRows = getRawBracketRoundRows(detail);
  if (roundRows.length > 0) {
    return roundRows.reduce((maxRound, row, index) => {
      const roundNumber = readPositiveNumber(row?.roundNumber, row?.round, Number(row?.roundIndex) + 1, index + 1);
      return Math.max(maxRound, roundNumber || 0);
    }, 0);
  }

  const bracketSize = readPositiveNumber(
    detail?.bracketSize,
    detail?.capacityLimit,
    detail?.participantLimit,
    detail?.maxParticipants,
  ) || 8;
  return Math.max(1, Math.ceil(Math.log2(bracketSize)));
}

function getRawBracketRoundRows(detail) {
  const candidates = [
    detail?.roundQuizzes,
    detail?.bracketRoundQuizzes,
    detail?.roundQuizPlans,
    detail?.roundQuizSnapshots,
    detail?.quizRounds,
    detail?.rounds,
  ];
  return candidates.find((value) => Array.isArray(value)) || [];
}

function getRoundFallbackLabel(roundNumber, totalRounds) {
  if (totalRounds <= 1 || roundNumber === totalRounds) return 'Chung kết';
  if (roundNumber === totalRounds - 1) return 'Bán kết';
  if (roundNumber === totalRounds - 2) return 'Tứ kết';
  return `Vòng ${roundNumber}`;
}

function normalizeRoundQuizRow(row, index, totalRounds) {
  const roundNumber = readPositiveNumber(row?.roundNumber, row?.round, Number(row?.roundIndex) + 1, index + 1) || index + 1;
  const quizId = readPositiveNumber(
    row?.quizId,
    row?.roundQuizId,
    row?.snapshotQuizId,
    row?.challengeQuizId,
  );
  const quizStatus = String(
    row?.quizStatus
    ?? row?.snapshotQuizStatus
    ?? row?.status
    ?? '',
  ).toUpperCase();
  const rawQuestionCount =
    row?.totalQuestion
    ?? row?.totalQuestions
    ?? row?.questionCount
    ?? row?.snapshotQuizTotalQuestion;
  const questionCount = rawQuestionCount == null ? null : Number(rawQuestionCount) || 0;
  const hasContent = questionCount == null
    ? Boolean(quizId && quizStatus === 'ACTIVE')
    : questionCount > 0;
  const reviewContributors = Array.isArray(row?.reviewContributors) ? row.reviewContributors : [];
  const reviewerConfirmed = reviewContributors.some(
    (reviewer) => Boolean(reviewer?.reviewCompleteOkAt),
  );
  const reviewReady = [
    row?.reviewReady,
    row?.primaryReviewerConfirmed,
    row?.reviewCompleteOk,
    row?.quizPublishReady,
    row?.challengePublishReady,
    reviewerConfirmed,
    String(row?.reviewStatus || '').toUpperCase() === 'APPROVED',
  ].some(Boolean);

  return {
    roundNumber,
    label: row?.roundLabel || row?.label || getRoundFallbackLabel(roundNumber, totalRounds),
    quizId,
    quizTitle: row?.quizTitle || row?.snapshotQuizTitle || row?.title || '',
    quizStatus,
    questionCount,
    duration: row?.duration ?? row?.snapshotQuizDuration ?? null,
    reviewContributors,
    reviewReady,
    myReviewContributor: [row?.myReviewContributor, row?.myReviewContributorForRound].some(Boolean),
    myPrimaryReviewer: [
      row?.myPrimaryReviewer,
      row?.myPrimaryReviewerForRound,
      row?.myReviewContributor?.primaryReviewer,
      row?.myReviewContributorForRound?.primaryReviewer,
    ].some(Boolean),
    hasContent,
    isReady: Boolean(quizId && hasContent && quizStatus === 'ACTIVE' && reviewReady),
  };
}

function buildBracketRoundQuizPlan(detail) {
  const totalRounds = getBracketRoundCount(detail);
  const rows = getRawBracketRoundRows(detail)
    .map((row, index) => normalizeRoundQuizRow(row, index, totalRounds));
  const byRound = new Map(rows.map((row) => [row.roundNumber, row]));

  return Array.from({ length: totalRounds }).map((_, index) => {
    const roundNumber = index + 1;
    return byRound.get(roundNumber) || normalizeRoundQuizRow({ roundNumber }, index, totalRounds);
  });
}

export default function ChallengeDetailView({
  workspaceId,
  eventId,
  isDarkMode,
  isLeader,
  currentUserId,
  onBack,
  quizGenerationTaskByQuizId = {},
  quizGenerationProgressByQuizId = {},
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editScheduleIssues, setEditScheduleIssues] = useState([]);
  const [reviewerPick, setReviewerPick] = useState('');
  const [displayedRealtimeChallengeQuizPercent, setDisplayedRealtimeChallengeQuizPercent] = useState(0);

  const { data: detail, isLoading, error: detailError } = useQuery({
    queryKey: ['challenge-detail', workspaceId, eventId],
    queryFn: async () => {
      const res = await getChallengeDetail(workspaceId, eventId);
      return res.data;
    },
    enabled: Boolean(workspaceId && eventId),
    refetchInterval: 10000,
  });

  const { data: reviewMembersRaw = [] } = useQuery({
    queryKey: ['group-members-review', workspaceId],
    queryFn: async () => {
      const res = await getGroupMembers(workspaceId, 0, 200);
      return res.data?.content || res.data || [];
    },
    enabled: Boolean(
      workspaceId && isLeader && detail?.status === 'SCHEDULED' && Number(detail?.snapshotQuizId) > 0,
    ),
  });

  const reviewerContributorIds = useMemo(() => {
    const list = detail?.reviewContributors;
    if (!Array.isArray(list)) return new Set();
    return new Set(list.map((c) => resolveReviewMemberUserId(c)).filter(Boolean));
  }, [detail?.reviewContributors]);

  const participantUserIds = useMemo(() => {
    const list = detail?.participants;
    if (!Array.isArray(list)) return new Set();
    return new Set(list.map((p) => resolveReviewMemberUserId(p)).filter(Boolean));
  }, [detail?.participants]);

  const addableReviewMembers = useMemo(() => {
    const selfId = Number(currentUserId);
    const leaderParticipates = Boolean(detail?.leaderParticipates);
    return reviewMembersRaw.filter((m) => {
      const id = resolveReviewMemberUserId(m);
      if (!id) return false;
      /* Leader CÓ tham gia challenge → loại leader khỏi danh sách reviewer. */
      if (leaderParticipates && Number.isInteger(selfId) && selfId > 0 && id === selfId) return false;
      if (reviewerContributorIds.has(id)) return false;
      if (participantUserIds.has(id)) return false;
      return true;
    });
  }, [reviewMembersRaw, reviewerContributorIds, participantUserIds, currentUserId, detail?.leaderParticipates]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['challenge-detail', workspaceId, eventId] });
    queryClient.invalidateQueries({ queryKey: ['challenges', workspaceId] });
    queryClient.invalidateQueries({ queryKey: ['challenge-leaderboard', workspaceId, eventId] });
    queryClient.invalidateQueries({ queryKey: ['challenge-teams', workspaceId, eventId] });
    queryClient.invalidateQueries({ queryKey: ['challenge-bracket', workspaceId, eventId] });
    queryClient.invalidateQueries({ queryKey: ['challenge-dashboard', workspaceId, eventId] });
  }, [queryClient, workspaceId, eventId]);

  const handleAction = useCallback(async (action, label) => {
    setActionLoading(label);
    setError('');
    try {
      await action();
      invalidate();
    } catch (err) {
      setError(getErrorMessage(t, err) || err?.message || t('challengeDetailView.errors.generic', 'Something went wrong'));
    } finally {
      setActionLoading(null);
    }
  }, [invalidate, t]);

  const handleRegister = () => handleAction(
    () => registerForChallenge(workspaceId, eventId), 'register');

  const handleAcceptInvite = () => handleAction(
    () => acceptChallengeInvitation(workspaceId, eventId), 'accept');

  const handleCancelConfirm = () => {
    setCancelDialogOpen(false);
    handleAction(() => cancelChallenge(workspaceId, eventId), 'cancel');
  };

  const handlePublishChallenge = () => handleAction(
    () => publishChallenge(workspaceId, eventId), 'publish');

  const handleStartChallenge = () => handleAction(
    () => startChallenge(workspaceId, eventId), 'manualStart');

  const openEditDialog = useCallback(() => {
    setEditTitle(detail?.title || '');
    setEditDescription(detail?.description || '');
    const s = isoToDateTimeParts(detail?.startTime);
    const e = isoToDateTimeParts(detail?.endTime);
    setEditStartDate(s.dateStr);
    setEditStartTime(s.timeStr);
    setEditEndDate(e.dateStr);
    setEditEndTime(e.timeStr);
    setEditScheduleIssues([]);
    setEditDialogOpen(true);
  }, [detail?.title, detail?.description, detail?.startTime, detail?.endTime]);

  const handleSaveChallengeEdit = useCallback(() => {
    const issues = getScheduleValidationIssues(editStartDate, editStartTime, editEndDate, editEndTime);
    setEditScheduleIssues(issues);
    if (issues.length > 0 || !editTitle.trim()) return;
    handleAction(async () => {
      await updateChallenge(workspaceId, eventId, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        startTime: combineToBackendPayload(editStartDate, editStartTime),
        endTime: combineToBackendPayload(editEndDate, editEndTime),
        registrationMode: detail?.registrationMode || 'PUBLIC_GROUP',
      });
      setEditDialogOpen(false);
    }, 'edit');
  }, [handleAction, workspaceId, eventId, editTitle, editDescription, editStartDate, editStartTime, editEndDate, editEndTime, detail?.registrationMode]);

  const handleStartAttempt = useCallback(async () => {
    setActionLoading('start');
    setError('');
    try {
      const res = await startChallengeAttempt(workspaceId, eventId);
      const attempt = res.data;
      const attemptPath = buildQuizAttemptPath('exam', attempt.quizId);
      if (!attemptPath) return;
      navigate(attemptPath, {
        state: {
          autoStart: true,
          challengeContext: { workspaceId, eventId, participantId: attempt.participantId },
          challengeAttempt: {
            attemptId: attempt.attemptId,
            startedAt: attempt.startedAt,
            timeoutAt: attempt.timeoutAt,
          },
          sourceWorkspaceId: workspaceId,
          sourceView: 'challenge',
        },
      });
    } catch (err) {
      setError(err?.message || t('challengeDetailView.errors.cannotStartAttempt', 'Cannot start the attempt'));
      setActionLoading(null);
    }
  }, [workspaceId, eventId, navigate, t]);

  const handleOpenDraftQuizEditor = useCallback(() => {
    const qid = detail?.snapshotQuizId;
    if (!qid) return;
    navigate(
      buildGroupWorkspaceSectionPath(workspaceId, 'quiz', {
        challengeDraftQuizId: qid,
        challengeDraft: 1,
        challengeEventId: eventId,
      }),
      { state: { restoreGroupWorkspace: { section: 'challenge', challengeEventId: eventId } } },
    );
  }, [navigate, workspaceId, detail?.snapshotQuizId, eventId]);

  const handleOpenRoundQuizEditor = useCallback((round) => {
    const qid = round?.quizId;
    if (!qid) return;
    navigate(
      buildGroupWorkspaceSectionPath(workspaceId, 'quiz', {
        challengeDraftQuizId: qid,
        challengeDraft: 1,
        challengeEventId: eventId,
        challengeRound: round.roundNumber,
      }),
      { state: { restoreGroupWorkspace: { section: 'challenge', challengeEventId: eventId } } },
    );
  }, [navigate, workspaceId, eventId]);

  const handleCreateRoundQuiz = useCallback((round) => {
    const roundNumber = Number(round?.roundNumber);
    if (!Number.isInteger(roundNumber) || roundNumber <= 0) return;

    handleAction(async () => {
      const res = await createChallengeRoundQuiz(workspaceId, eventId, roundNumber);
      const payload = res?.data?.data ?? res?.data ?? {};
      const qid = readPositiveNumber(
        payload,
        payload?.quizId,
        payload?.roundQuizId,
        payload?.snapshotQuizId,
        payload?.challengeQuizId,
      );
      if (!qid) {
        throw new Error('Không nhận được quiz của vòng đấu từ server.');
      }
      navigate(buildGroupWorkspaceSectionPath(workspaceId, 'quiz', {
        challengeDraftQuizId: qid,
        challengeDraft: 1,
        challengeEventId: eventId,
        challengeRound: roundNumber,
      }));
    }, `roundQuiz-${roundNumber}`);
  }, [handleAction, navigate, workspaceId, eventId]);

  const handleViewSnapshotQuiz = useCallback(() => {
    const qid = detail?.snapshotQuizId;
    if (!qid) return;
    navigate(
      buildGroupWorkspaceSectionPath(workspaceId, 'quiz', {
        viewQuizId: qid,
        challengeEventId: eventId,
      }),
      { state: { restoreGroupWorkspace: { section: 'challenge', challengeEventId: eventId } } },
    );
  }, [navigate, workspaceId, detail?.snapshotQuizId, eventId]);

  const handleViewRoundQuiz = useCallback((round) => {
    const qid = round?.quizId;
    if (!qid) return;
    navigate(
      buildGroupWorkspaceSectionPath(workspaceId, 'quiz', {
        viewQuizId: qid,
        challengeEventId: eventId,
        challengeRound: round.roundNumber,
      }),
      { state: { restoreGroupWorkspace: { section: 'challenge', challengeEventId: eventId } } },
    );
  }, [navigate, workspaceId, eventId]);

  const handleInviteReviewer = useCallback(() => {
    const id = Number(reviewerPick);
    const qid = detail?.snapshotQuizId;
    if (!Number.isInteger(id) || id <= 0 || !qid) return;
    const existingContributors = detail?.reviewContributors || [];
    if (existingContributors.length >= MAX_SNAPSHOT_REVIEW_INVITES) return;
    const hasExistingPrimary = existingContributors.some((c) => Boolean(c.primaryReviewer));
    handleAction(async () => {
      await batchInviteQuizReviewers(
        workspaceId,
        qid,
        [{
          userId: id,
          primaryReviewer: !hasExistingPrimary,
        }],
      );
      setReviewerPick('');
    }, 'addReviewer');
  }, [reviewerPick, detail?.snapshotQuizId, detail?.reviewContributors, handleAction, workspaceId]);

  const handleRemoveReviewer = useCallback((userId) => {
    const qid = detail?.snapshotQuizId;
    if (!qid || !userId) return;
    handleAction(
      () => removeQuizReviewContributor(workspaceId, qid, userId),
      `rev-${userId}`,
    );
  }, [handleAction, workspaceId, detail?.snapshotQuizId]);

  /** Must run before any early return — same hook order every render */
  const snapshotDurationMinutes = useMemo(() => {
    if (!detail || Number(detail.snapshotQuizId) <= 0) return 0;
    return getDurationInMinutes({
      duration: detail.snapshotQuizDuration,
      timerMode: true,
      createVia: detail.sourceMode === 'NEW_CHALLENGE_QUIZ' ? 'AI' : 'MANUAL',
    });
  }, [detail?.snapshotQuizId, detail?.snapshotQuizDuration, detail?.sourceMode]);

  const isBracketChallenge = detail?.matchMode === 'SOLO_BRACKET';
  const hasSnapshotQuiz = Number(detail?.snapshotQuizId) > 0;
  const snapshotQuizId = Number(detail?.snapshotQuizId) || 0;
  const snapshotStatusKeyRaw = String(detail?.snapshotQuizStatus || '').toUpperCase();
  const snapshotStatusOverridesRealtime = ['ACTIVE', 'ERROR'].includes(snapshotStatusKeyRaw);
  const realtimeChallengeQuizTaskId = snapshotQuizId > 0
    ? String(quizGenerationTaskByQuizId?.[snapshotQuizId] ?? '').trim()
    : '';
  const realtimeChallengeQuizPercent = snapshotQuizId > 0
    ? clampPercent(quizGenerationProgressByQuizId?.[snapshotQuizId] ?? 0)
    : 0;
  const hasRealtimeChallengeQuizProcessing = !snapshotStatusOverridesRealtime && snapshotQuizId > 0 && (
    (Boolean(realtimeChallengeQuizTaskId) && realtimeChallengeQuizPercent < 100)
    || (realtimeChallengeQuizPercent > 0 && realtimeChallengeQuizPercent < 100)
  );
  const showChallengeQuizCard = !isBracketChallenge
    && (hasSnapshotQuiz || detail?.sourceMode === 'NEW_CHALLENGE_QUIZ');
  const showChallengeQuizProcessingState = showChallengeQuizCard
    && (snapshotStatusKeyRaw === 'PROCESSING' || hasRealtimeChallengeQuizProcessing);

  useEffect(() => {
    if (!showChallengeQuizProcessingState) {
      setDisplayedRealtimeChallengeQuizPercent(0);
      return;
    }

    if (realtimeChallengeQuizPercent >= 100) {
      setDisplayedRealtimeChallengeQuizPercent(100);
      return;
    }

    if (realtimeChallengeQuizPercent <= 0) {
      setDisplayedRealtimeChallengeQuizPercent(0);
      return;
    }

    setDisplayedRealtimeChallengeQuizPercent((current) => {
      if (current > realtimeChallengeQuizPercent) {
        return realtimeChallengeQuizPercent;
      }
      if (current === 0) {
        return getSeedDisplayedChallengeProgress(realtimeChallengeQuizPercent);
      }
      return current;
    });
  }, [realtimeChallengeQuizPercent, showChallengeQuizProcessingState]);

  useEffect(() => {
    if (!showChallengeQuizProcessingState) return undefined;
    if (realtimeChallengeQuizPercent <= 0 || realtimeChallengeQuizPercent >= 100) return undefined;
    if (displayedRealtimeChallengeQuizPercent >= realtimeChallengeQuizPercent) return undefined;

    const timerId = globalThis.setTimeout(() => {
      setDisplayedRealtimeChallengeQuizPercent((current) => {
        if (current >= realtimeChallengeQuizPercent) return current;
        return Math.min(current + CHALLENGE_PROGRESS_STEP, realtimeChallengeQuizPercent);
      });
    }, CHALLENGE_PROGRESS_TICK_MS);

    return () => globalThis.clearTimeout(timerId);
  }, [
    displayedRealtimeChallengeQuizPercent,
    realtimeChallengeQuizPercent,
    showChallengeQuizProcessingState,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (detailError || !detail) {
    const detailErrorMessage = getErrorMessage(t, detailError) || t('challengeDetailView.errors.cannotLoadDetail', 'Cannot load challenge detail');
    return (
      <div className={`rounded-2xl border p-6 ${
        isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('challengeDetailView.cannotOpenTitle', 'Cannot open challenge')}
            </h3>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
              {detailErrorMessage}
            </p>
          </div>
          <div>
            <Button type="button" variant="outline" onClick={onBack}>
              {t('challengeDetailView.back', 'Back')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isChallengeCreator = Number(currentUserId) > 0 && Number(detail.creatorId) === Number(currentUserId);
  const isPublished = Boolean(detail.published);
  const reviewContributors = Array.isArray(detail.reviewContributors) ? detail.reviewContributors : [];
  const myPrimaryReviewer = reviewContributors.some(
    (c) => Boolean(c.primaryReviewer) && resolveReviewMemberUserId(c) === Number(currentUserId),
  );
  const hasAnyReviewer = reviewContributors.length > 0;
  const reviewerConfirmed = reviewContributors.some((c) => Boolean(c.reviewCompleteOkAt));

  const canRegister = detail.status === 'SCHEDULED'
    && isPublished
    && !detail.myParticipantStatus
    && !isChallengeCreator
    && !detail.myReviewContributorForSnapshot
    && (detail.registrationMode === 'PUBLIC_GROUP' || detail.myInvitationStatus === 'PENDING');

  const canAcceptInvite = detail.status === 'SCHEDULED'
    && isPublished
    && detail.myInvitationStatus === 'PENDING'
    && !detail.myParticipantStatus;

  const canStart = detail.status === 'LIVE'
    && detail.myParticipantStatus
    && detail.myParticipantStatus !== 'FINISHED';

  const canCancel = isLeader && detail.status === 'SCHEDULED';
  const minParticipantCount = detail.matchMode === 'FREE_FOR_ALL' ? 1 : 2;
  const bracketRoundQuizPlan = isBracketChallenge ? buildBracketRoundQuizPlan(detail) : [];
  const bracketRoundReadyCount = bracketRoundQuizPlan.filter((round) => round.isReady).length;
  const bracketRoundQuizReady =
    !isBracketChallenge
    || (bracketRoundQuizPlan.length > 0 && bracketRoundReadyCount === bracketRoundQuizPlan.length);

  const challengePublishReady = typeof detail.challengePublishReady === 'boolean'
    ? detail.challengePublishReady
    : (detail.sourceMode !== 'NEW_CHALLENGE_QUIZ'
      ? snapshotStatusKeyRaw === 'ACTIVE'
      : (Boolean(detail.leaderPublishBypass) || (hasAnyReviewer && reviewerConfirmed)));
  /** Quiz đã ACTIVE trên server nhưng chưa đủ xác nhận reviewer → không hiển thị «Sẵn sàng» */
  const snapshotAwaitingReviewerConfirm =
    detail.status === 'SCHEDULED'
    && detail.sourceMode === 'NEW_CHALLENGE_QUIZ'
    && snapshotStatusKeyRaw === 'ACTIVE'
    && !challengePublishReady;

  const snapshotStatusKey = snapshotAwaitingReviewerConfirm ? 'REVIEW_PENDING' : snapshotStatusKeyRaw;
  const snapshotStatusLabel = snapshotStatusKeyRaw
    ? (snapshotAwaitingReviewerConfirm
      ? t('challengeDetailView.waitingReviewerConfirm', 'Waiting for reviewer confirmation')
      : t(`groupWorkspace.challenge.quizStatus.${snapshotStatusKeyRaw}`, snapshotStatusKeyRaw))
    : null;

  const snapshotDisplayStatusKeyRaw = hasRealtimeChallengeQuizProcessing ? 'PROCESSING' : snapshotStatusKeyRaw;
  const hasSnapshotQuizContent = Number(detail.snapshotQuizTotalQuestion) > 0;
  const effectiveChallengePublishReady = isBracketChallenge ? bracketRoundQuizReady : challengePublishReady;
  /** Sau khi xuất bản (ACTIVE), chỉ leader có tham gia thi mới bị chặn xem trước đề — reviewer vẫn xem được để góp ý */
  const leaderFairPlayBlind = Boolean(detail.leaderParticipates)
    && snapshotStatusKeyRaw === 'ACTIVE'
    && !snapshotAwaitingReviewerConfirm
    && detail.status !== 'FINISHED'
    && detail.status !== 'CANCELLED'
    && isLeader;

  const showDraftQuizCta = isLeader
    && !isBracketChallenge
    && detail.status === 'SCHEDULED'
    && detail.sourceMode === 'NEW_CHALLENGE_QUIZ'
    && Number(detail.snapshotQuizId) > 0
    && snapshotStatusKeyRaw !== 'ACTIVE'
    && !hasRealtimeChallengeQuizProcessing
    && snapshotDisplayStatusKeyRaw !== 'PROCESSING'
    && !leaderFairPlayBlind;
  const canReviewerPreviewSnapshotQuiz = Boolean(detail.myReviewContributorForSnapshot)
    && detail.status === 'SCHEDULED'
    && hasSnapshotQuiz
    && !leaderFairPlayBlind;

  const canPreviewSnapshotQuiz = hasSnapshotQuiz
    && hasSnapshotQuizContent
    && !leaderFairPlayBlind
    && (isLeader || isChallengeCreator || canReviewerPreviewSnapshotQuiz);

  const showLeaderboard = detail.status === 'LIVE' || detail.status === 'FINISHED';

  const showReviewContributorPanel =
    !isBracketChallenge && isLeader && detail.status === 'SCHEDULED' && Number(detail.snapshotQuizId) > 0;

  const canEditChallengeSchedule =
    isLeader && detail.status === 'SCHEDULED'
    && new Date(detail.startTime).getTime() > Date.now() + 60 * 60 * 1000;
  const showPublishChallengeAction =
    isLeader && detail.status === 'SCHEDULED' && !isPublished && (isBracketChallenge || hasSnapshotQuiz);
  const canPublishChallenge =
    showPublishChallengeAction
    && (isBracketChallenge || snapshotStatusKeyRaw === 'ACTIVE')
    && effectiveChallengePublishReady
    && new Date(detail.startTime).getTime() > Date.now();
  const publishRequirementHint = !showPublishChallengeAction
    ? ''
    : isBracketChallenge && bracketRoundQuizPlan.length === 0
      ? 'Đấu cúp cần cấu hình quiz cho từng vòng trước khi publish challenge.'
      : isBracketChallenge && !bracketRoundQuizReady
        ? `Đấu cúp cần đủ quiz chính thức cho từng vòng. Hiện đã sẵn sàng ${bracketRoundReadyCount}/${bracketRoundQuizPlan.length} vòng.`
        : !hasSnapshotQuizContent
          ? t('challengeDetailView.publishHints.needDraftQuizContent', 'The leader must compose the quiz content first.')
          : snapshotStatusKeyRaw !== 'ACTIVE'
            ? t('challengeDetailView.publishHints.needActiveQuiz', 'The challenge quiz must be moved from draft to active before publishing the challenge.')
            : detail.sourceMode === 'NEW_CHALLENGE_QUIZ' && !hasAnyReviewer
              ? t('challengeDetailView.publishHints.needReviewer', 'At least one reviewer is required before publishing the challenge.')
              : detail.sourceMode === 'NEW_CHALLENGE_QUIZ' && !reviewerConfirmed && !detail.leaderPublishBypass
                ? t('challengeDetailView.publishHints.needReviewersConfirm', 'At least one reviewer must confirm the quiz is OK before the leader can publish the challenge.')
                : new Date(detail.startTime).getTime() <= Date.now()
                  ? t('challengeDetailView.publishHints.startTimePassed', 'The challenge has reached its start time, so it can no longer be published.')
                  : t('challengeDetailView.publishHints.afterPublishInfo', 'After publishing, members will see the challenge and be able to register.');
  const canManualStartChallenge =
    detail.status === 'SCHEDULED'
    && isPublished
    && (isLeader || myPrimaryReviewer)
    && Boolean(detail.challengeReviewReadyForLive || effectiveChallengePublishReady)
    && Number(detail.participantCount || 0) >= minParticipantCount;

  const cardCls = `rounded-2xl border p-6 ${
    isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-white'
  }`;

  const canManageBracketRoundQuiz =
    detail.status === 'SCHEDULED' && !isPublished && (isLeader || myPrimaryReviewer);
  const canPreviewRoundQuiz = (round) =>
    Boolean(round.quizId)
    && round.hasContent
    && (isLeader || isChallengeCreator || myPrimaryReviewer || round.myReviewContributor || detail.myReviewContributorForSnapshot);
  const roundStatusClass = (round) => {
    if (round.isReady) {
      return isDarkMode ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-800';
    }
    if (round.quizId && round.quizStatus === 'ACTIVE') {
      return isDarkMode ? 'bg-orange-500/25 text-orange-200' : 'bg-orange-100 text-orange-900';
    }
    if (round.quizId) {
      return isDarkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-900';
    }
    return isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700';
  };

  const renderBracketRoundQuizPanel = () => (
    <div className={`mt-4 rounded-xl border px-4 py-4 ${
      isDarkMode ? 'border-slate-600 bg-slate-700/40' : 'border-gray-100 bg-gray-50'
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            <Trophy className="h-3.5 w-3.5" />
            Quiz theo từng vòng đấu cúp
          </div>
          <p className={`mt-1 max-w-3xl text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Mỗi vòng dùng một bài quiz riêng để tất cả cặp đấu trong vòng đó làm cùng lúc. Leader hoặc reviewer chính tạo quiz cho từng vòng, reviewer duyệt xong mới tính là quiz chính thức.
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          bracketRoundQuizReady
            ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-800')
            : (isDarkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-900')
        }`}>
          {bracketRoundReadyCount}/{bracketRoundQuizPlan.length} vòng sẵn sàng
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {bracketRoundQuizPlan.map((round) => {
          const canPreview = canPreviewRoundQuiz(round);
          const canManageRoundQuiz = canManageBracketRoundQuiz || (detail.status === 'SCHEDULED' && !isPublished && round.myPrimaryReviewer);
          const loadingKey = `roundQuiz-${round.roundNumber}`;
          return (
            <div
              key={round.roundNumber}
              className={`rounded-xl border p-3 ${
                isDarkMode ? 'border-slate-700 bg-slate-900/35' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {round.label}
                  </div>
                  <div className={`mt-1 truncate text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {round.quizId
                      ? (canPreview ? (round.quizTitle || 'Quiz vòng đấu') : 'Quiz đã được gắn, member chỉ thấy khi đến lượt làm bài')
                      : 'Chưa có quiz cho vòng này'}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roundStatusClass(round)}`}>
                  {round.isReady
                    ? 'Sẵn sàng'
                    : round.quizId
                      ? (round.quizStatus === 'ACTIVE' ? 'Chờ duyệt' : (round.quizStatus || 'Bản nháp'))
                      : 'Thiếu quiz'}
                </span>
              </div>

              <div className={`mt-3 grid gap-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} sm:grid-cols-2`}>
                <div>
                  <span className="block opacity-70">Nội dung</span>
                  <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>
                    {round.questionCount == null ? 'Chưa rõ' : `${round.questionCount} câu hỏi`}
                  </span>
                </div>
                <div>
                  <span className="block opacity-70">Review chính</span>
                  <span className={round.reviewReady ? 'text-emerald-500' : (isDarkMode ? 'text-slate-200' : 'text-slate-700')}>
                    {round.reviewReady ? 'Đã duyệt' : 'Chưa duyệt'}
                  </span>
                </div>
              </div>

              {!canPreview && round.quizId && !isLeader && !myPrimaryReviewer && (
                <p className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                  isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-500'
                }`}>
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Quiz vòng này chỉ mở khi challenge đã publish và đến giờ làm bài.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {canPreview && (
                  <button
                    type="button"
                    onClick={() => handleViewRoundQuiz(round)}
                    className={`inline-flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:flex-none ${
                      isDarkMode
                        ? 'border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'
                        : 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Xem quiz
                  </button>
                )}
                {canManageRoundQuiz && (
                  <button
                    type="button"
                    onClick={() => (round.quizId ? handleOpenRoundQuizEditor(round) : handleCreateRoundQuiz(round))}
                    disabled={actionLoading === loadingKey}
                    className={`inline-flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 sm:flex-none ${
                      isDarkMode
                        ? 'bg-orange-500/20 text-orange-200 hover:bg-orange-500/30'
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                  >
                    {actionLoading === loadingKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
                    {round.quizId ? 'Soạn quiz vòng' : 'Tạo quiz vòng'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!bracketRoundQuizReady && (
        <p className={`mt-3 text-xs leading-relaxed ${isDarkMode ? 'text-amber-200/90' : 'text-amber-900'}`}>
          Đấu cúp chỉ được publish khi tất cả vòng có quiz ACTIVE và reviewer chính đã duyệt. Member hoặc người được mời riêng không thấy quiz trước khi publish và trước giờ làm bài.
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className={`rounded-xl p-2 transition-colors ${
              isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Swords className={`h-6 w-6 shrink-0 ${isDarkMode ? 'text-orange-300' : 'text-orange-500'}`} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {detail.title}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  detail.status === 'LIVE'
                    ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-800')
                    : detail.status === 'FINISHED'
                      ? (isDarkMode ? 'bg-slate-600 text-slate-200' : 'bg-gray-200 text-gray-800')
                      : detail.status === 'CANCELLED'
                        ? (isDarkMode ? 'bg-red-500/20 text-red-200' : 'bg-red-100 text-red-800')
                        : (isDarkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-900')
                }`}
              >
                {t(`groupWorkspace.challenge.phase.${detail.status}`, detail.status)}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                isDarkMode ? 'bg-teal-500/15 text-teal-200' : 'bg-teal-50 text-teal-700'
              }`}>
                {MATCH_MODE_LABELS[detail.matchMode] || detail.matchMode || 'Đua cá nhân'}
              </span>
              {!isPublished && (
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  isDarkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-900'
                }`}>
                  {t('challengeDetailView.notPublishedBadge', 'Not published')}
                </span>
              )}
            </div>
          </div>
        </div>
        {canEditChallengeSchedule && (
          <button
            type="button"
            onClick={openEditDialog}
            disabled={!!actionLoading}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
              isDarkMode
                ? 'border-slate-600 text-slate-200 hover:bg-slate-800'
                : 'border-gray-200 text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Pencil className="h-4 w-4" />
            {t('groupWorkspace.challenge.editSchedule')}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Info card */}
      <div className={cardCls}>
        {detail.description && (
          <p className={`mb-4 text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
            {detail.description}
          </p>
        )}

        <div className={`grid grid-cols-2 gap-4 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <div>
              <div className="text-xs opacity-60">{t('challengeDetailView.startLabel', 'Start')}</div>
              <div className={isDarkMode ? 'text-white' : 'text-slate-900'}>{formatDateTime(detail.startTime)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <div>
              <div className="text-xs opacity-60">{t('challengeDetailView.endLabel', 'End')}</div>
              <div className={isDarkMode ? 'text-white' : 'text-slate-900'}>{formatDateTime(detail.endTime)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>{t('challengeDetailView.participantCount', '{{count}} participants', { count: detail.participantCount })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span>{detail.registrationMode === 'INVITE_ONLY' ? t('challengeDetailView.registrationMode.inviteOnly', 'Invite only') : t('challengeDetailView.registrationMode.public', 'Public')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 flex-shrink-0" />
            <span>{MATCH_MODE_LABELS[detail.matchMode] || detail.matchMode || 'Đua cá nhân'}</span>
          </div>
        </div>

        {isBracketChallenge && renderBracketRoundQuizPanel()}

        {showChallengeQuizCard && (
          <div className={`mt-4 rounded-xl border px-4 py-3 ${
            isDarkMode ? 'border-slate-600 bg-slate-700/40' : 'border-gray-100 bg-gray-50'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={`text-xs font-medium uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('challengeDetailView.quizChallengeLabel', 'Challenge quiz')}
              </div>
              {(snapshotStatusLabel || snapshotDisplayStatusKeyRaw === 'PROCESSING') && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    (snapshotDisplayStatusKeyRaw === 'PROCESSING')
                      ? (isDarkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-900')
                      : snapshotStatusKey === 'REVIEW_PENDING'
                      ? (isDarkMode ? 'bg-orange-500/25 text-orange-200' : 'bg-orange-100 text-orange-900')
                      : snapshotStatusKey === 'ACTIVE'
                        ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-800')
                        : snapshotStatusKey === 'PROCESSING'
                          ? (isDarkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-900')
                          : snapshotStatusKey === 'ERROR'
                            ? (isDarkMode ? 'bg-red-500/20 text-red-200' : 'bg-red-100 text-red-800')
                            : (isDarkMode ? 'bg-slate-600 text-slate-200' : 'bg-gray-200 text-gray-800')
                  }`}
                >
                  {snapshotDisplayStatusKeyRaw === 'PROCESSING'
                    ? t('groupWorkspace.challenge.quizStatus.PROCESSING', 'Processing')
                    : snapshotStatusLabel}
                </span>
              )}
            </div>
            <div className={`mt-1 font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {detail.snapshotQuizTitle || t('groupWorkspace.challenge.snapshotQuizDefaultTitle')}
            </div>
            <div className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {snapshotDurationMinutes > 0 ? t('challengeDetailView.minutesShort', '{{count}} minutes', { count: snapshotDurationMinutes }) : '—'}
              {' · '}
              {Number(detail.snapshotQuizTotalQuestion) || 0} {t('challengeDetailView.questionsShort', 'questions')}
            </div>

            {showChallengeQuizProcessingState && (
              <div className={`mt-3 flex items-start gap-3 rounded-xl border px-3 py-3 ${
                isDarkMode ? 'border-sky-500/20 bg-sky-500/10 text-sky-100' : 'border-sky-200 bg-sky-50 text-sky-900'
              }`}>
                <Loader2 className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {t('challengeDetailView.processingQuizTitle', 'Challenge quiz is being generated')}
                  </p>
                  <p className={`mt-1 text-xs leading-relaxed ${isDarkMode ? 'text-sky-100/80' : 'text-sky-900/75'}`}>
                    {t('challengeDetailView.processingQuizHint', 'The system is still generating questions for this challenge. Return here in a moment to continue reviewing or editing the quiz.')}
                  </p>
                  {realtimeChallengeQuizPercent > 0 && realtimeChallengeQuizPercent < 100 && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold">
                        <span>{displayedRealtimeChallengeQuizPercent}%</span>
                      </div>
                      <div className={`h-2 overflow-hidden rounded-full ${isDarkMode ? 'bg-sky-950/60' : 'bg-sky-100'}`}>
                        <div
                          className={`h-full rounded-full transition-[width] duration-150 ease-linear ${isDarkMode ? 'bg-sky-300' : 'bg-sky-500'}`}
                          style={{ width: `${Math.max(8, displayedRealtimeChallengeQuizPercent)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(canPreviewSnapshotQuiz || showDraftQuizCta) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {canPreviewSnapshotQuiz && (
                  <button
                    type="button"
                    onClick={handleViewSnapshotQuiz}
                    className={`inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:flex-none ${
                      isDarkMode
                        ? 'border border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700/80'
                        : 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    {t('groupWorkspace.challenge.viewSnapshotQuiz')}
                  </button>
                )}
                {showDraftQuizCta && (
                  <button
                    type="button"
                    onClick={handleOpenDraftQuizEditor}
                    className={`inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:flex-none ${
                      isDarkMode
                        ? 'bg-orange-500/20 text-orange-200 hover:bg-orange-500/30'
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                  >
                    <PenLine className="h-4 w-4" />
                    {t('challengeDetailView.composeChallengeQuiz', 'Compose challenge quiz')}
                  </button>
                )}
              </div>
            )}
            {canPreviewSnapshotQuiz && (
              <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('groupWorkspace.challenge.snapshotQuizHint')}
              </p>
            )}
            {!canPreviewSnapshotQuiz && !showChallengeQuizProcessingState && showDraftQuizCta && (
              <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('challengeDetailView.draftQuizHint', 'Create the quiz content first, then you can preview the challenge quiz.')}
              </p>
            )}
            {Boolean(detail.leaderParticipates) && snapshotStatusKeyRaw !== 'ACTIVE' && (
              <p className={`mt-2 text-xs ${isDarkMode ? 'text-amber-200/90' : 'text-amber-800'}`}>
                {t('groupWorkspace.challenge.leaderFairPlayQuizHint')}
              </p>
            )}
          </div>
        )}

        {showReviewContributorPanel && (
          <div className={`mt-4 rounded-xl border px-4 py-3 ${
            isDarkMode ? 'border-slate-600 bg-slate-700/40' : 'border-gray-100 bg-gray-50'
          }`}>
            <div className={`text-xs font-medium uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('groupWorkspace.challenge.reviewContributorsTitle')}
            </div>
            <p className={`mt-1 text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('challengeDetailView.reviewerPanel.orderHint', 'The first person added becomes the primary reviewer. The second becomes the assistant reviewer.')}
            </p>
            {(detail.reviewContributors || []).length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {(detail.reviewContributors || []).map((c) => (
                  <li
                    key={c.userId}
                    className={`flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 ${
                      isDarkMode ? 'bg-slate-800/60' : 'bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {c.avatar ? (
                          <img src={c.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isDarkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-600'
                          }`}
                          >
                            {(c.fullName || c.username || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <span className={`truncate text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          <UserDisplayName user={c} fallback={`#${c.userId}`} isDarkMode={isDarkMode} />
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          c.primaryReviewer
                            ? (isDarkMode ? 'bg-orange-500/15 text-orange-200' : 'bg-orange-100 text-orange-800')
                            : (isDarkMode ? 'bg-cyan-500/15 text-cyan-200' : 'bg-cyan-100 text-cyan-800')
                        }`}>
                          {c.primaryReviewer ? t('challengeDetailView.reviewerPanel.primaryBadge', 'Primary reviewer') : t('challengeDetailView.reviewerPanel.assistantBadge', 'Assistant reviewer')}
                        </span>
                      </div>
                      <p className={`mt-1 pl-9 text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                        {getReviewerStatusCopy(c, t)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleRemoveReviewer(c.userId)}
                        disabled={!!actionLoading}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                          isDarkMode
                            ? 'text-red-300 hover:bg-red-500/20'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {actionLoading === `rev-${c.userId}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserMinus className="h-3.5 w-3.5" />
                        )}
                        {t('groupWorkspace.challenge.reviewContributorRemove')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1">
                <label className={`mb-1 block text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {t('groupWorkspace.challenge.reviewContributorPickLabel')}
                </label>
                <select
                  value={reviewerPick}
                  onChange={(e) => setReviewerPick(e.target.value)}
                  disabled={(detail.reviewContributors || []).length >= MAX_SNAPSHOT_REVIEW_INVITES}
                  className={`w-full rounded-xl border px-3 py-2 text-sm ${
                    isDarkMode
                      ? 'border-slate-600 bg-slate-800 text-white'
                      : 'border-gray-200 bg-white text-slate-900'
                  }`}
                >
                  <option value="">{t('groupWorkspace.challenge.reviewContributorPickPlaceholder')}</option>
                  {addableReviewMembers.map((m) => {
                    const id = String(resolveReviewMemberUserId(m));
                    const label = getUserDisplayLabel(m, m.email || id);
                    return (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
              <button
                type="button"
                onClick={handleInviteReviewer}
                disabled={
                  !reviewerPick
                  || !!actionLoading
                  || (detail.reviewContributors || []).length >= MAX_SNAPSHOT_REVIEW_INVITES
                }
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
              >
                {actionLoading === 'addReviewer' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {t('groupWorkspace.challenge.reviewContributorAdd')}
              </button>
            </div>
            {addableReviewMembers.length === 0 && (
              <p className={`mt-2 text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('challengeDetailView.reviewerPanel.noEligibleMembersHint', 'No eligible members are available to invite. Existing reviewers, registered participants, and the participating leader are filtered out here.')}
              </p>
            )}
            {detail.sourceMode === 'NEW_CHALLENGE_QUIZ' && (
              <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('challengeDetailView.reviewerPanel.needTwoReviewersHint', 'Only one primary reviewer is required. An assistant reviewer is optional if you want extra review before publishing the challenge.')}
              </p>
            )}
          </div>
        )}

        {!isBracketChallenge && detail.myReviewContributorForSnapshot && !isLeader && detail.status === 'SCHEDULED' && Number(detail.snapshotQuizId) > 0 && (
          <div
            className={`mt-3 rounded-xl border px-4 py-3 ${
              isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-950'
            }`}
          >
            <p className="text-sm leading-relaxed">
              {t('groupWorkspace.challenge.reviewInviteeNotice')}
            </p>
            <p className={`mt-2 text-xs ${isDarkMode ? 'text-cyan-200/90' : 'text-cyan-900/80'}`}>
              {t('groupWorkspace.challenge.reviewInviteeShortHint', 'Click “View quiz” in the Quiz challenge block above, then open the “Check” tab.',
              )}
            </p>
            {!canPreviewSnapshotQuiz && (
              <p className={`mt-2 text-xs ${isDarkMode ? 'text-amber-200/90' : 'text-amber-900'}`}>
                {t('groupWorkspace.challenge.reviewQuizNotReadyHint', 'The exam is not ready to preview yet (for example still generating). Please try again later.',
                )}
              </p>
            )}
          </div>
        )}

        {!isBracketChallenge && detail.myReviewContributorForSnapshot && !isLeader && detail.status === 'SCHEDULED' && !detail.myParticipantStatus && (
          <p className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
          >
            {t('groupWorkspace.challenge.reviewContributorCannotRegister')}
          </p>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2">
          {showPublishChallengeAction && (
            <button
              type="button"
              onClick={handlePublishChallenge}
              disabled={!canPublishChallenge || !!actionLoading}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isDarkMode
                  ? 'bg-orange-500/20 text-orange-200 hover:bg-orange-500/30'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {actionLoading === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {t('challengeDetailView.actions.publish', 'Publish challenge')}
            </button>
          )}

          {canManualStartChallenge && (
            <button
              type="button"
              onClick={handleStartChallenge}
              disabled={!!actionLoading}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                isDarkMode
                  ? 'bg-teal-500/20 text-teal-100 hover:bg-teal-500/30'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {actionLoading === 'manualStart' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Bắt đầu challenge
            </button>
          )}

          {canRegister && !canAcceptInvite && (
            <button
              onClick={handleRegister}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {actionLoading === 'register' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {t('challengeDetailView.actions.register', 'Register')}
            </button>
          )}

          {canAcceptInvite && (
            <button
              onClick={handleAcceptInvite}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {actionLoading === 'accept' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {t('challengeDetailView.actions.acceptInvite', 'Accept invitation')}
            </button>
          )}

          {canStart && (
            <button
              onClick={handleStartAttempt}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
            >
              {actionLoading === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {detail.myParticipantStatus === 'PLAYING'
                ? t('challengeDetailView.actions.continueAttempt', 'Continue attempt')
                : t('challengeDetailView.actions.startAttempt', 'Start attempt')}
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={() => setCancelDialogOpen(true)}
              disabled={!!actionLoading}
              className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                isDarkMode
                  ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                  : 'border-red-200 text-red-600 hover:bg-red-50'
              }`}
            >
              {actionLoading === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              {t('challengeDetailView.actions.cancel', 'Cancel challenge')}
            </button>
          )}
        </div>
        {showPublishChallengeAction && publishRequirementHint && (
          <p className={`mt-3 text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            {publishRequirementHint}
          </p>
        )}
      </div>

      {showLeaderboard && detail.matchMode === 'TEAM_BATTLE' && (
        <div>
          <h3 className={`mb-3 flex items-center gap-2 text-base font-semibold ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Đấu đội
          </h3>
          <ChallengeTeamScoreboard workspaceId={workspaceId} eventId={eventId} isDarkMode={isDarkMode} />
        </div>
      )}

      {detail.matchMode === 'SOLO_BRACKET' && (
        <div>
          <h3 className={`mb-3 flex items-center gap-2 text-base font-semibold ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Sơ đồ slot đấu cúp
          </h3>
          <ChallengeBracketView
            workspaceId={workspaceId}
            eventId={eventId}
            isDarkMode={isDarkMode}
            participants={detail.participants || []}
            bracketSize={detail.bracketSize || detail.capacityLimit || detail.participantLimit || detail.maxParticipants}
            challengeStatus={detail.status}
            published={isPublished}
          />
        </div>
      )}

      {/* Leaderboard — chỉ sau khi challenge bắt đầu (LIVE) hoặc đã kết thúc */}
      {showLeaderboard && (
        <div>
          <h3 className={`mb-3 flex items-center gap-2 text-base font-semibold ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            {t('groupWorkspace.challenge.leaderboardTitle')}
          </h3>
          <ChallengeLeaderboard workspaceId={workspaceId} eventId={eventId} isDarkMode={isDarkMode} />
        </div>
      )}

      {/* Participants */}
      {detail.participants && detail.participants.length > 0 && (
        <div className={cardCls}>
          <h3 className={`mb-3 text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('challengeDetailView.participantsTitle', 'Participants ({{count}})', { count: detail.participants.length })}
          </h3>
          <div className="flex flex-col gap-2">
            {detail.participants.map((p) => (
              <div
                key={p.userId}
                className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                  isDarkMode ? 'bg-slate-700/30' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {p.avatar ? (
                    <img src={p.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isDarkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {(p.fullName || p.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <UserDisplayName user={p} fallback={t('challengeDetailView.memberFallback', 'Member')} isDarkMode={isDarkMode} />
                  </span>
                </div>
                <span className={`text-xs ${
                  p.status === 'FINISHED' ? 'text-green-500' : p.status === 'PLAYING' ? 'text-blue-500' : (isDarkMode ? 'text-slate-500' : 'text-gray-400')
                }`}>
                  {p.status === 'FINISHED'
                    ? t('challengeDetailView.participantStatus.finished', 'Finished')
                    : p.status === 'PLAYING'
                      ? t('challengeDetailView.participantStatus.playing', 'In progress')
                      : t('challengeDetailView.participantStatus.waiting', 'Waiting')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent
          hideClose={false}
          className={
            isDarkMode
              ? 'border-slate-700 bg-slate-900 text-slate-100 sm:max-w-lg'
              : 'sm:max-w-lg'
          }
        >
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : undefined}>
              {t('groupWorkspace.challenge.editDialogTitle')}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : undefined}>
              {t('groupWorkspace.challenge.editDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className={`mb-1 block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('groupWorkspace.challenge.editTitleLabel')}
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  isDarkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-gray-200 bg-white'
                }`}
                maxLength={200}
              />
            </div>
            <div>
              <label className={`mb-1 block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('groupWorkspace.challenge.editDescriptionLabel')}
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  isDarkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-gray-200 bg-white'
                }`}
              />
            </div>
            <ChallengeScheduleFields
              isDarkMode={isDarkMode}
              startDate={editStartDate}
              startTime={editStartTime}
              endDate={editEndDate}
              endTime={editEndTime}
              onStartDateChange={setEditStartDate}
              onStartTimeChange={setEditStartTime}
              onEndDateChange={setEditEndDate}
              onEndTimeChange={setEditEndTime}
              validationIssues={editScheduleIssues}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className={isDarkMode ? 'border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800' : ''}
              onClick={() => setEditDialogOpen(false)}
            >
              {t('groupWorkspace.challenge.cancelDialogBack')}
            </Button>
            <Button
              type="button"
              onClick={handleSaveChallengeEdit}
              disabled={
                !!actionLoading
                || !editTitle.trim()
                || getScheduleValidationIssues(editStartDate, editStartTime, editEndDate, editEndTime).length > 0
              }
            >
              {actionLoading === 'edit' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('groupWorkspace.challenge.editSave')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent
          hideClose={false}
          className={
            isDarkMode
              ? 'border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md'
              : 'sm:max-w-md'
          }
        >
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : undefined}>
              {t('groupWorkspace.challenge.cancelDialogTitle')}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : undefined}>
              {t('groupWorkspace.challenge.cancelDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className={isDarkMode ? 'border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800' : ''}
              onClick={() => setCancelDialogOpen(false)}
            >
              {t('groupWorkspace.challenge.cancelDialogBack')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={!!actionLoading}
            >
              {actionLoading === 'cancel' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('groupWorkspace.challenge.cancelDialogConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
