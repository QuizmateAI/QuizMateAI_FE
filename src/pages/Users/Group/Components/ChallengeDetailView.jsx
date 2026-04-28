import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getDurationInMinutes } from '@/lib/quizDurationDisplay';
import {
  combineToBackendPayload,
  getScheduleValidationIssues,
  isoToDateTimeParts,
} from '@/lib/challengeSchedule';
import {
  getChallengeDetail, registerForChallenge, acceptChallengeInvitation,
  startChallengeAttempt, cancelChallenge, updateChallenge, finishChallenge,
  removeQuizReviewContributor, publishChallenge,
  batchInviteQuizReviewers, startChallenge,
  acceptQuizReviewInvitation,
  declineQuizReviewInvitation,
} from '../../../../api/ChallengeAPI';
import { getGroupMembers } from '../../../../api/GroupAPI';
import { buildGroupWorkspaceSectionPath, buildQuizAttemptPath } from '@/lib/routePaths';
import ChallengeDetailContent from './ChallengeDetailContent';
import ChallengeManualMatchEditor from './ChallengeManualMatchEditor';
import { readChallengeDraftEditorMode } from './createChallengeWizardHelpers';

/** Khớp giới hạn BE (QuizReviewContributorService.MAX_INVITED_REVIEWERS): tối đa 2 reviewer. */
const MAX_SNAPSHOT_REVIEW_INVITES = 2;
const CHALLENGE_PROGRESS_STEP = 3;
const CHALLENGE_PROGRESS_TICK_MS = 180;


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

function isRequestTimeoutError(error) {
  return Number(error?.statusCode) === 408 || String(error?.code || '').toUpperCase() === 'REQUEST_TIMEOUT';
}

function getReviewerStatusCopy(reviewer, t) {
  const invitationStatus = String(reviewer?.invitationStatus || '').toUpperCase();
  if (invitationStatus === 'PENDING' || !invitationStatus) {
    return t('challengeDetailView.reviewerPanel.invitationPendingShort', 'Chưa đồng ý nhận review');
  }
  if (invitationStatus === 'DECLINED') {
    return t('challengeDetailView.reviewerPanel.invitationDeclinedShort', 'Đã từ chối lời mời review');
  }

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
  const { t, i18n } = useTranslation();
  const { showSuccess } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editScheduleIssues, setEditScheduleIssues] = useState([]);
  const [reviewerPick, setReviewerPick] = useState('');
  const [manualMatchEditor, setManualMatchEditor] = useState(null);
  const [displayedRealtimeChallengeQuizPercent, setDisplayedRealtimeChallengeQuizPercent] = useState(0);

  const {
    data: detail,
    isLoading,
    isFetching: isDetailFetching,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery({
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

  const handleCloseManualMatchEditor = useCallback(() => {
    setManualMatchEditor(null);
  }, []);

  const handleManualMatchSaved = useCallback(() => {
    setManualMatchEditor(null);
    invalidate();
  }, [invalidate]);

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

  const handleFinishConfirm = () => {
    setFinishDialogOpen(false);
    handleAction(() => finishChallenge(workspaceId, eventId), 'manualFinish');
  };

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
    const draftEditorMode = readChallengeDraftEditorMode(workspaceId, eventId) || 'manual';
    if (draftEditorMode === 'manual') {
      setManualMatchEditor({ quizId: qid, roundNumber: null });
      return;
    }
    navigate(
      buildGroupWorkspaceSectionPath(workspaceId, 'quiz', {
        challengeDraftQuizId: qid,
        challengeDraft: 1,
        challengeEventId: eventId,
        challengeDraftMode: draftEditorMode,
      }),
      { state: { restoreGroupWorkspace: { section: 'challenge', challengeEventId: eventId } } },
    );
  }, [navigate, workspaceId, detail?.snapshotQuizId, eventId]);

  const handleOpenRoundQuizEditor = useCallback((round) => {
    const qid = round?.quizId;
    if (!qid) return;
    const draftEditorMode = readChallengeDraftEditorMode(workspaceId, eventId) || 'manual';
    if (draftEditorMode === 'manual') {
      setManualMatchEditor({ quizId: qid, roundNumber: round?.roundNumber || null });
      return;
    }
    navigate(
      buildGroupWorkspaceSectionPath(workspaceId, 'quiz', {
        challengeDraftQuizId: qid,
        challengeDraft: 1,
        challengeEventId: eventId,
        challengeRound: round.roundNumber,
        challengeDraftMode: draftEditorMode,
      }),
      { state: { restoreGroupWorkspace: { section: 'challenge', challengeEventId: eventId } } },
    );
  }, [navigate, workspaceId, eventId]);

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
    const activeContributorCount = existingContributors.filter(
      (c) => String(c?.invitationStatus || '').toUpperCase() !== 'DECLINED',
    ).length;
    if (activeContributorCount >= MAX_SNAPSHOT_REVIEW_INVITES) return;
    handleAction(async () => {
      await batchInviteQuizReviewers(
        workspaceId,
        qid,
        [{
          userId: id,
        }],
      );
      setReviewerPick('');
      showSuccess(
        t(
          'challengeDetailView.reviewerPanel.inviteSentToast',
          'Đã gửi lời mời review. Hệ thống đã gửi email thông báo cho reviewer.',
        ),
      );
    }, 'addReviewer');
  }, [reviewerPick, detail?.snapshotQuizId, detail?.reviewContributors, handleAction, workspaceId, showSuccess, t]);

  const handleRemoveReviewer = useCallback((userId) => {
    const qid = detail?.snapshotQuizId;
    if (!qid || !userId) return;
    handleAction(
      () => removeQuizReviewContributor(workspaceId, qid, userId),
      `rev-${userId}`,
    );
  }, [handleAction, workspaceId, detail?.snapshotQuizId]);

  const handleAcceptReviewInvitation = useCallback(() => {
    const qid = detail?.snapshotQuizId;
    if (!qid) return;
    handleAction(() => acceptQuizReviewInvitation(workspaceId, qid), 'acceptReviewInvite');
  }, [detail?.snapshotQuizId, handleAction, workspaceId]);

  const handleDeclineReviewInvitation = useCallback(() => {
    const qid = detail?.snapshotQuizId;
    if (!qid) return;
    handleAction(() => declineQuizReviewInvitation(workspaceId, qid), 'declineReviewInvite');
  }, [detail?.snapshotQuizId, handleAction, workspaceId]);

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
  const realtimeChallengeQuizTaskId = snapshotQuizId > 0
    ? String(quizGenerationTaskByQuizId?.[snapshotQuizId] ?? '').trim()
    : '';
  const realtimeChallengeQuizPercent = snapshotQuizId > 0
    ? clampPercent(quizGenerationProgressByQuizId?.[snapshotQuizId] ?? 0)
    : 0;
  const hasRealtimeChallengeQuizActivity = snapshotQuizId > 0 && (
    (Boolean(realtimeChallengeQuizTaskId) && realtimeChallengeQuizPercent < 100)
    || (realtimeChallengeQuizPercent > 0 && realtimeChallengeQuizPercent < 100)
  );
  const snapshotStatusOverridesRealtime = snapshotStatusKeyRaw === 'ACTIVE'
    || (snapshotStatusKeyRaw === 'ERROR' && !hasRealtimeChallengeQuizActivity);
  const hasRealtimeChallengeQuizProcessing = !snapshotStatusOverridesRealtime && hasRealtimeChallengeQuizActivity;
  const showChallengeQuizCard = hasSnapshotQuiz || detail?.sourceMode === 'NEW_CHALLENGE_QUIZ';
  const showChallengeQuizProcessingState = showChallengeQuizCard
    && (snapshotStatusKeyRaw === 'PROCESSING' || hasRealtimeChallengeQuizProcessing);
  const detailTimedOut = isRequestTimeoutError(detailError);
  const isVietnameseLanguage = String(i18n?.language || '').toLowerCase().startsWith('vi');

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

  if (isLoading && !detail) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (detailTimedOut && !detail) {
    const openingTitle = t(
      'challengeDetailView.openingTitle',
      isVietnameseLanguage ? 'Đang mở challenge' : 'Opening challenge',
    );
    const openingHint = t(
      'challengeDetailView.openingTimeoutHint',
      isVietnameseLanguage
        ? 'Challenge đã được tạo, hệ thống đang đồng bộ dữ liệu. Vui lòng chờ thêm một chút rồi tải lại.'
        : 'The challenge was created and its data is still syncing. Please wait a moment, then refresh.',
    );

    return (
      <div className="flex items-center justify-center py-16">
        <div className={`w-full max-w-xl rounded-2xl border p-6 ${
          isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-orange-500" />
              <div>
                <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {openingTitle}
                </h3>
                <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  {openingHint}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => refetchDetail()} disabled={isDetailFetching}>
                {isDetailFetching && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('common.refresh', 'Làm mới')}
              </Button>
              <Button type="button" variant="outline" onClick={onBack}>
                {t('challengeDetailView.back', 'Back')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
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

  if (manualMatchEditor?.quizId) {
    return (
      <ChallengeManualMatchEditor
        workspaceId={workspaceId}
        quizId={manualMatchEditor.quizId}
        detail={detail}
        roundNumber={manualMatchEditor.roundNumber}
        isDarkMode={isDarkMode}
        onBack={handleCloseManualMatchEditor}
        onSaved={handleManualMatchSaved}
        formatDateTime={formatDateTime}
      />
    );
  }

  const isChallengeCreator = Number(currentUserId) > 0 && Number(detail.creatorId) === Number(currentUserId);
  const isPublished = Boolean(detail.published);
  const reviewContributors = Array.isArray(detail.reviewContributors) ? detail.reviewContributors : [];
  const activeReviewContributors = reviewContributors.filter(
    (c) => String(c?.invitationStatus || '').toUpperCase() !== 'DECLINED',
  );
  const reviewerInviteLimitReached = activeReviewContributors.length >= MAX_SNAPSHOT_REVIEW_INVITES;
  const myReviewContributor = Boolean(detail.myReviewContributorForSnapshot);
  const myReviewInvitationStatus = String(detail.myReviewInvitationStatus || '').toUpperCase();
  const myAcceptedReviewContributor = myReviewContributor && myReviewInvitationStatus === 'ACCEPTED';
  const myPendingReviewInvitation = myReviewContributor && (!myReviewInvitationStatus || myReviewInvitationStatus === 'PENDING');
  const hasAnyReviewer = activeReviewContributors.length > 0;
  const reviewerConfirmed = activeReviewContributors.some((c) => Boolean(c.reviewCompleteOkAt));

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
  const hasBackendRoundQuizPlan = isBracketChallenge && getRawBracketRoundRows(detail).length > 0;
  const bracketRoundQuizPlan = hasBackendRoundQuizPlan ? buildBracketRoundQuizPlan(detail) : [];
  const bracketRoundReadyCount = bracketRoundQuizPlan.filter((round) => round.isReady).length;
  const bracketRoundQuizReady =
    !isBracketChallenge
    || !hasBackendRoundQuizPlan
    || (bracketRoundReadyCount === bracketRoundQuizPlan.length);

  const challengePublishReady = typeof detail.challengePublishReady === 'boolean'
    ? detail.challengePublishReady
    : (detail.sourceMode !== 'NEW_CHALLENGE_QUIZ'
      ? snapshotStatusKeyRaw === 'ACTIVE'
      : (
        snapshotStatusKeyRaw === 'ACTIVE'
        && (
          !detail.leaderParticipates
          || detail.leaderPublishBypass
          || (hasAnyReviewer && reviewerConfirmed)
        )
      ));
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
  const effectiveChallengePublishReady = hasBackendRoundQuizPlan ? bracketRoundQuizReady : challengePublishReady;
  /** Sau khi xuất bản (ACTIVE), chỉ leader có tham gia thi mới bị chặn xem trước đề — reviewer vẫn xem được để góp ý */
  const leaderFairPlayBlind = Boolean(detail.leaderParticipates)
    && snapshotStatusKeyRaw === 'ACTIVE'
    && !snapshotAwaitingReviewerConfirm
    && detail.status !== 'FINISHED'
    && detail.status !== 'CANCELLED'
    && isLeader;

  const showDraftQuizCta = isLeader
    && detail.status === 'SCHEDULED'
    && detail.sourceMode === 'NEW_CHALLENGE_QUIZ'
    && Number(detail.snapshotQuizId) > 0
    && snapshotStatusKeyRaw !== 'ACTIVE'
    && !hasRealtimeChallengeQuizProcessing
    && snapshotDisplayStatusKeyRaw !== 'PROCESSING'
    && !leaderFairPlayBlind;
  const canReviewerPreviewSnapshotQuiz = myAcceptedReviewContributor
    && detail.status === 'SCHEDULED'
    && hasSnapshotQuiz
    && !leaderFairPlayBlind;
  const creatorMayPreviewSnapshotQuiz =
    (isLeader || isChallengeCreator) && !detail.leaderParticipates;

  const canPreviewSnapshotQuiz = hasSnapshotQuiz
    && hasSnapshotQuizContent
    && !leaderFairPlayBlind
    && (creatorMayPreviewSnapshotQuiz || canReviewerPreviewSnapshotQuiz);

  const showLeaderboard = detail.status === 'LIVE' || detail.status === 'FINISHED';

  const showReviewContributorPanel =
    isLeader && detail.status === 'SCHEDULED' && Number(detail.snapshotQuizId) > 0;

  const canEditChallengeSchedule =
    isLeader && detail.status === 'SCHEDULED'
    && new Date(detail.startTime).getTime() > Date.now() + 60 * 60 * 1000;
  const showPublishChallengeAction =
    isLeader && detail.status === 'SCHEDULED' && !isPublished && (isBracketChallenge || hasSnapshotQuiz);
  const canPublishChallenge =
    showPublishChallengeAction
    && snapshotStatusKeyRaw === 'ACTIVE'
    && effectiveChallengePublishReady
    && new Date(detail.startTime).getTime() > Date.now();
  const publishRequirementHint = !showPublishChallengeAction
    ? ''
    : hasBackendRoundQuizPlan && !bracketRoundQuizReady
        ? `Đấu cúp cần đủ đề chính thức cho từng vòng. Hiện đã sẵn sàng ${bracketRoundReadyCount}/${bracketRoundQuizPlan.length} vòng.`
            : !hasSnapshotQuizContent
              ? t('challengeDetailView.publishHints.needDraftQuizContent', 'The leader must compose the match content first.')
              : snapshotStatusKeyRaw !== 'ACTIVE'
                ? t('challengeDetailView.publishHints.needActiveQuiz', 'The challenge match must be moved from draft to active before publishing the challenge.')
                : detail.sourceMode === 'NEW_CHALLENGE_QUIZ' && Boolean(detail.leaderParticipates) && !hasAnyReviewer
                  ? t('challengeDetailView.publishHints.needReviewerWhenLeaderParticipates', 'Leader is participating, so invite 1 or 2 reviewers before publishing the challenge.')
                  : detail.sourceMode === 'NEW_CHALLENGE_QUIZ' && Boolean(detail.leaderParticipates) && !reviewerConfirmed && !detail.leaderPublishBypass
                    ? t('challengeDetailView.publishHints.needReviewersConfirm', 'At least one reviewer must confirm the match is OK before the leader can publish the challenge.')
                    : new Date(detail.startTime).getTime() <= Date.now()
                      ? t('challengeDetailView.publishHints.startTimePassed', 'The challenge has reached its start time, so it can no longer be published.')
                      : t('challengeDetailView.publishHints.afterPublishInfo', 'After publishing, members will see the challenge and be able to register.');
  const canManualStartChallenge =
    detail.status === 'SCHEDULED'
    && isPublished
    && (isLeader || myAcceptedReviewContributor)
    && Boolean(detail.challengeReviewReadyForLive || effectiveChallengePublishReady)
    && Number(detail.participantCount || 0) >= minParticipantCount;

  const showManualFinishChallenge =
    detail.status === 'LIVE'
    && (isLeader || myAcceptedReviewContributor);
  const participantList = Array.isArray(detail.participants) ? detail.participants : [];
  const hasParticipants = participantList.length > 0;
  const pendingParticipantCount = participantList.filter((p) => p?.status !== 'FINISHED').length;
  const canManualFinishChallenge =
    showManualFinishChallenge && hasParticipants && pendingParticipantCount === 0;
  const manualFinishBlockedReason = !showManualFinishChallenge
    ? ''
    : !hasParticipants
      ? t(
          'challengeDetailView.finishBlocked.noParticipants',
          'Chưa có người đăng ký nên chưa thể kết thúc challenge sớm.',
        )
      : pendingParticipantCount > 0
        ? t(
            'challengeDetailView.finishBlocked.pending',
            'Còn {{count}} người chưa hoàn thành bài. Chỉ được kết thúc sớm khi tất cả đã nộp.',
            { count: pendingParticipantCount },
          )
        : '';

  const cardCls = `rounded-2xl border p-6 ${
    isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-white'
  }`;

  const canManageBracketRoundQuiz =
    detail.status === 'SCHEDULED' && !isPublished && (isLeader || myAcceptedReviewContributor);
  const canPreviewRoundQuiz = (round) =>
    Boolean(round.quizId)
    && round.hasContent
    && (creatorMayPreviewSnapshotQuiz || myAcceptedReviewContributor || round.myReviewContributor);
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

  return (
    <ChallengeDetailContent
      actionLoading={actionLoading}
      addableReviewMembers={addableReviewMembers}
      bracketRoundQuizPlan={bracketRoundQuizPlan}
      bracketRoundQuizReady={bracketRoundQuizReady}
      bracketRoundReadyCount={bracketRoundReadyCount}
      canAcceptInvite={canAcceptInvite}
      canCancel={canCancel}
      canEditChallengeSchedule={canEditChallengeSchedule}
      canManageBracketRoundQuiz={canManageBracketRoundQuiz}
      canManualFinishChallenge={canManualFinishChallenge}
      canManualStartChallenge={canManualStartChallenge}
      canPreviewRoundQuiz={canPreviewRoundQuiz}
      canPreviewSnapshotQuiz={canPreviewSnapshotQuiz}
      canPublishChallenge={canPublishChallenge}
      canRegister={canRegister}
      canStart={canStart}
      cancelDialogOpen={cancelDialogOpen}
      cardCls={cardCls}
      detail={detail}
      displayedRealtimeChallengeQuizPercent={displayedRealtimeChallengeQuizPercent}
      editDescription={editDescription}
      editDialogOpen={editDialogOpen}
      editEndDate={editEndDate}
      editEndTime={editEndTime}
      editScheduleIssues={editScheduleIssues}
      editStartDate={editStartDate}
      editStartTime={editStartTime}
      editTitle={editTitle}
      error={error}
      eventId={eventId}
      finishDialogOpen={finishDialogOpen}
      formatDateTime={formatDateTime}
      getReviewerStatusCopy={getReviewerStatusCopy}
      handleAcceptInvite={handleAcceptInvite}
      handleAcceptReviewInvitation={handleAcceptReviewInvitation}
      handleCancelConfirm={handleCancelConfirm}
      handleDeclineReviewInvitation={handleDeclineReviewInvitation}
      handleFinishConfirm={handleFinishConfirm}
      handleInviteReviewer={handleInviteReviewer}
      handleOpenDraftQuizEditor={handleOpenDraftQuizEditor}
      handleOpenRoundQuizEditor={handleOpenRoundQuizEditor}
      handlePublishChallenge={handlePublishChallenge}
      handleRegister={handleRegister}
      handleRemoveReviewer={handleRemoveReviewer}
      handleSaveChallengeEdit={handleSaveChallengeEdit}
      handleStartAttempt={handleStartAttempt}
      handleStartChallenge={handleStartChallenge}
      handleViewRoundQuiz={handleViewRoundQuiz}
      handleViewSnapshotQuiz={handleViewSnapshotQuiz}
      isBracketChallenge={isBracketChallenge}
      isDarkMode={isDarkMode}
      isLeader={isLeader}
      isPublished={isPublished}
      manualFinishBlockedReason={manualFinishBlockedReason}
      myAcceptedReviewContributor={myAcceptedReviewContributor}
      myPendingReviewInvitation={myPendingReviewInvitation}
      myReviewContributor={myReviewContributor}
      onBack={onBack}
      openEditDialog={openEditDialog}
      publishRequirementHint={publishRequirementHint}
      realtimeChallengeQuizPercent={realtimeChallengeQuizPercent}
      resolveReviewMemberUserId={resolveReviewMemberUserId}
      reviewerInviteLimitReached={reviewerInviteLimitReached}
      reviewerPick={reviewerPick}
      roundStatusClass={roundStatusClass}
      setCancelDialogOpen={setCancelDialogOpen}
      setEditDescription={setEditDescription}
      setEditDialogOpen={setEditDialogOpen}
      setEditEndDate={setEditEndDate}
      setEditEndTime={setEditEndTime}
      setEditStartDate={setEditStartDate}
      setEditStartTime={setEditStartTime}
      setEditTitle={setEditTitle}
      setFinishDialogOpen={setFinishDialogOpen}
      setReviewerPick={setReviewerPick}
      showChallengeQuizCard={showChallengeQuizCard}
      showChallengeQuizProcessingState={showChallengeQuizProcessingState}
      showDraftQuizCta={showDraftQuizCta}
      showLeaderboard={showLeaderboard}
      showManualFinishChallenge={showManualFinishChallenge}
      showPublishChallengeAction={showPublishChallengeAction}
      showReviewContributorPanel={showReviewContributorPanel}
      snapshotDisplayStatusKeyRaw={snapshotDisplayStatusKeyRaw}
      snapshotDurationMinutes={snapshotDurationMinutes}
      snapshotStatusKey={snapshotStatusKey}
      snapshotStatusKeyRaw={snapshotStatusKeyRaw}
      snapshotStatusLabel={snapshotStatusLabel}
      t={t}
      workspaceId={workspaceId}
    />
  );
}
