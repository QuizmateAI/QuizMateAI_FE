import { useState, useCallback, useMemo } from 'react';
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
  addQuizReviewContributor, removeQuizReviewContributor, publishChallenge,
} from '../../../../api/ChallengeAPI';
import { getGroupMembers } from '../../../../api/GroupAPI';
import { buildGroupWorkspaceSectionPath, buildQuizAttemptPath } from '@/lib/routePaths';
import { getUserDisplayLabel } from '@/Utils/userProfile';
import UserDisplayName from '@/Components/users/UserDisplayName';
import ChallengeLeaderboard from './ChallengeLeaderboard';

/** Khớp giới hạn BE (QuizReviewContributorService.MAX_INVITED_REVIEWERS) */
const MAX_SNAPSHOT_REVIEW_INVITES = 2;

function formatDateTime(dt) {
  if (!dt) return '-';
  const d = new Date(dt);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChallengeDetailView({ workspaceId, eventId, isDarkMode, isLeader, currentUserId, onBack }) {
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
    return new Set(list.map((c) => Number(c.userId)).filter((id) => Number.isInteger(id) && id > 0));
  }, [detail?.reviewContributors]);

  const participantUserIds = useMemo(() => {
    const list = detail?.participants;
    if (!Array.isArray(list)) return new Set();
    return new Set(list.map((p) => Number(p.userId)).filter((id) => Number.isInteger(id) && id > 0));
  }, [detail?.participants]);

  const addableReviewMembers = useMemo(() => {
    const selfId = Number(currentUserId);
    return reviewMembersRaw.filter((m) => {
      const id = Number(m.userId ?? m.groupMemberId);
      if (!Number.isInteger(id) || id <= 0) return false;
      if (Number.isInteger(selfId) && selfId > 0 && id === selfId) return false;
      if (reviewerContributorIds.has(id)) return false;
      if (participantUserIds.has(id)) return false;
      return true;
    });
  }, [reviewMembersRaw, reviewerContributorIds, participantUserIds, currentUserId]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['challenge-detail', workspaceId, eventId] });
    queryClient.invalidateQueries({ queryKey: ['challenges', workspaceId] });
    queryClient.invalidateQueries({ queryKey: ['challenge-leaderboard', workspaceId, eventId] });
  }, [queryClient, workspaceId, eventId]);

  const handleAction = useCallback(async (action, label) => {
    setActionLoading(label);
    setError('');
    try {
      await action();
      invalidate();
    } catch (err) {
      setError(getErrorMessage(t, err) || err?.message || 'Có lỗi xảy ra');
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
      setError(err?.message || 'Không thể bắt đầu làm bài');
      setActionLoading(null);
    }
  }, [workspaceId, eventId, navigate]);

  const handleOpenDraftQuizEditor = useCallback(() => {
    const qid = detail?.snapshotQuizId;
    if (!qid) return;
    navigate(buildGroupWorkspaceSectionPath(workspaceId, 'quiz', {
      challengeDraftQuizId: qid,
      challengeDraft: 1,
    }));
  }, [navigate, workspaceId, detail?.snapshotQuizId]);

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

  const handleAddReviewer = useCallback(() => {
    const qid = detail?.snapshotQuizId;
    const id = Number(reviewerPick);
    if (!qid || !Number.isInteger(id) || id <= 0) return;
    const hasPrimaryReviewer = (detail?.reviewContributors || []).some((c) => Boolean(c.primaryReviewer));
    handleAction(async () => {
      await addQuizReviewContributor(workspaceId, qid, {
        userId: id,
        primaryReviewer: !hasPrimaryReviewer,
      });
      setReviewerPick('');
    }, 'addReviewer');
  }, [handleAction, workspaceId, detail?.snapshotQuizId, detail?.reviewContributors, reviewerPick]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (detailError || !detail) {
    const detailErrorMessage = getErrorMessage(t, detailError) || 'Không thể tải chi tiết challenge';
    return (
      <div className={`rounded-2xl border p-6 ${
        isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Không mở được challenge
            </h3>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
              {detailErrorMessage}
            </p>
          </div>
          <div>
            <Button type="button" variant="outline" onClick={onBack}>
              Quay lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isChallengeCreator = Number(currentUserId) > 0 && Number(detail.creatorId) === Number(currentUserId);
  const isPublished = Boolean(detail.published);
  const reviewContributors = Array.isArray(detail.reviewContributors) ? detail.reviewContributors : [];
  const hasAssignedReviewers = reviewContributors.length > 0;
  const hasPrimaryReviewer = reviewContributors.some((c) => Boolean(c.primaryReviewer));
  const hasAssistantReviewer = reviewContributors.some((c) => !c.primaryReviewer);
  const everyoneConfirmedReviewOk = hasAssignedReviewers
    && reviewContributors.every((c) => Boolean(c.reviewCompleteOkAt));

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

  const snapshotStatusKeyRaw = String(detail.snapshotQuizStatus || '').toUpperCase();
  const challengePublishReady = typeof detail.challengePublishReady === 'boolean'
    ? detail.challengePublishReady
    : (detail.sourceMode !== 'NEW_CHALLENGE_QUIZ'
      ? snapshotStatusKeyRaw === 'ACTIVE'
      : (Boolean(detail.leaderPublishBypass) || (
        reviewContributors.length === MAX_SNAPSHOT_REVIEW_INVITES
        && hasPrimaryReviewer
        && hasAssistantReviewer
        && everyoneConfirmedReviewOk
      )));
  /** Quiz đã ACTIVE trên server nhưng chưa đủ xác nhận reviewer → không hiển thị «Sẵn sàng» */
  const snapshotAwaitingReviewerConfirm =
    detail.status === 'SCHEDULED'
    && detail.sourceMode === 'NEW_CHALLENGE_QUIZ'
    && snapshotStatusKeyRaw === 'ACTIVE'
    && !challengePublishReady;

  const snapshotStatusKey = snapshotAwaitingReviewerConfirm ? 'REVIEW_PENDING' : snapshotStatusKeyRaw;
  const snapshotStatusLabel = snapshotStatusKeyRaw
    ? (snapshotAwaitingReviewerConfirm
      ? 'Chờ reviewer xác nhận'
      : t(`groupWorkspace.challenge.quizStatus.${snapshotStatusKeyRaw}`, snapshotStatusKeyRaw))
    : null;

  const hasSnapshotQuiz = Number(detail.snapshotQuizId) > 0;
  const hasSnapshotQuizContent = Number(detail.snapshotQuizTotalQuestion) > 0;
  /** Sau khi xuất bản (ACTIVE), chỉ leader có tham gia thi mới bị chặn xem trước đề — reviewer vẫn xem được để góp ý */
  const leaderFairPlayBlind = Boolean(detail.leaderParticipates)
    && snapshotStatusKeyRaw === 'ACTIVE'
    && !snapshotAwaitingReviewerConfirm
    && isLeader;

  const showDraftQuizCta = isLeader
    && detail.status === 'SCHEDULED'
    && detail.sourceMode === 'NEW_CHALLENGE_QUIZ'
    && Number(detail.snapshotQuizId) > 0
    && snapshotStatusKeyRaw !== 'ACTIVE'
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
    isLeader && detail.status === 'SCHEDULED' && Number(detail.snapshotQuizId) > 0;

  const canEditChallengeSchedule =
    isLeader && detail.status === 'SCHEDULED'
    && new Date(detail.startTime).getTime() > Date.now() + 60 * 60 * 1000;
  const showPublishChallengeAction =
    isLeader && detail.status === 'SCHEDULED' && hasSnapshotQuiz && !isPublished;
  const canPublishChallenge =
    showPublishChallengeAction
    && snapshotStatusKeyRaw === 'ACTIVE'
    && challengePublishReady
    && new Date(detail.startTime).getTime() > Date.now();
  const publishRequirementHint = !showPublishChallengeAction
    ? ''
    : !hasSnapshotQuizContent
      ? 'Leader phải soạn nội dung quiz trước.'
      : snapshotStatusKeyRaw !== 'ACTIVE'
        ? 'Quiz challenge phải được chuyển từ draft sang active trước khi xuất bản challenge.'
        : detail.sourceMode === 'NEW_CHALLENGE_QUIZ' && reviewContributors.length < MAX_SNAPSHOT_REVIEW_INVITES
          ? 'Cần đủ reviewer chính và reviewer phụ trước khi xuất bản challenge.'
          : detail.sourceMode === 'NEW_CHALLENGE_QUIZ' && !hasPrimaryReviewer
            ? 'Cần có reviewer chính cho quiz challenge trước khi xuất bản.'
            : detail.sourceMode === 'NEW_CHALLENGE_QUIZ' && !hasAssistantReviewer
              ? 'Cần có reviewer phụ cho quiz challenge trước khi xuất bản.'
              : detail.sourceMode === 'NEW_CHALLENGE_QUIZ' && !everyoneConfirmedReviewOk && !detail.leaderPublishBypass
                ? 'Reviewer chính/phụ phải xác nhận đề ổn trước khi leader xuất bản challenge.'
                : new Date(detail.startTime).getTime() <= Date.now()
                  ? 'Challenge đã tới giờ bắt đầu nên không thể xuất bản.'
                  : 'Sau khi xuất bản, member mới thấy challenge và được đăng ký tham gia.';

  const cardCls = `rounded-2xl border p-6 ${
    isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-white'
  }`;

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
              {!isPublished && (
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  isDarkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-900'
                }`}>
                  Chưa publish
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
              <div className="text-xs opacity-60">Bắt đầu</div>
              <div className={isDarkMode ? 'text-white' : 'text-slate-900'}>{formatDateTime(detail.startTime)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <div>
              <div className="text-xs opacity-60">Kết thúc</div>
              <div className={isDarkMode ? 'text-white' : 'text-slate-900'}>{formatDateTime(detail.endTime)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>{detail.participantCount} người tham gia</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span>{detail.registrationMode === 'INVITE_ONLY' ? 'Mời riêng' : 'Công khai'}</span>
          </div>
        </div>

        {hasSnapshotQuiz && (
          <div className={`mt-4 rounded-xl border px-4 py-3 ${
            isDarkMode ? 'border-slate-600 bg-slate-700/40' : 'border-gray-100 bg-gray-50'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={`text-xs font-medium uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Quiz challenge
              </div>
              {snapshotStatusLabel && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    snapshotStatusKey === 'REVIEW_PENDING'
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
                  {snapshotStatusLabel}
                </span>
              )}
            </div>
            <div className={`mt-1 font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {detail.snapshotQuizTitle || t('groupWorkspace.challenge.snapshotQuizDefaultTitle')}
            </div>
            <div className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {snapshotDurationMinutes > 0 ? `${snapshotDurationMinutes} phút` : '—'}
              {' · '}
              {Number(detail.snapshotQuizTotalQuestion) || 0} câu hỏi
            </div>

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
                    Soạn đề challenge
                  </button>
                )}
              </div>
            )}
            {canPreviewSnapshotQuiz && (
              <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('groupWorkspace.challenge.snapshotQuizHint')}
              </p>
            )}
            {!canPreviewSnapshotQuiz && showDraftQuizCta && (
              <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Tạo nội dung quiz trước, sau đó mới xem lại được đề challenge.
              </p>
            )}
            {Boolean(detail.leaderParticipates) && snapshotStatusKeyRaw !== 'ACTIVE' && (
              <p className={`mt-2 text-xs ${isDarkMode ? 'text-amber-200/90' : 'text-amber-800'}`}>
                {t('groupWorkspace.challenge.leaderFairPlayQuizHint')}
              </p>
            )}
            {isLeader && !isPublished && detail.sourceMode === 'NEW_CHALLENGE_QUIZ' && (
              <p className={`mt-2 text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                Flow challenge: leader tạo challenge và soạn quiz, reviewer chính/phụ kiểm tra đề,
                khi đề ổn thì chuyển quiz sang ACTIVE, sau đó leader mới xuất bản challenge.
                Chỉ sau khi xuất bản thì member mới thấy challenge và đăng ký tham gia.
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
              {t('groupWorkspace.challenge.reviewContributorsHint')}
            </p>
            <p className={`mt-1 text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Người đầu tiên được thêm sẽ là reviewer chính. Người thứ hai là reviewer phụ.
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
                          {c.primaryReviewer ? 'Reviewer chính' : 'Reviewer phụ'}
                        </span>
                      </div>
                      <p className={`mt-1 pl-9 text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                        {c.lastViewedAt ? `Đã mở xem đề: ${formatDateTime(c.lastViewedAt)}` : 'Chưa ghi nhận mở xem đề'}
                      </p>
                      <p className={`mt-1 pl-9 text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                        {c.reviewCompleteOkAt ? `Đã xác nhận đề ổn: ${formatDateTime(c.reviewCompleteOkAt)}` : 'Chưa xác nhận đề ổn'}
                      </p>
                    </div>
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
                    const id = String(m.userId ?? m.groupMemberId);
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
                onClick={handleAddReviewer}
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
            {detail.sourceMode === 'NEW_CHALLENGE_QUIZ' && (
              <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Cần đủ 2 reviewer để leader có thể xuất bản challenge sau khi quiz đã ACTIVE.
              </p>
            )}
          </div>
        )}

        {detail.myReviewContributorForSnapshot && !isLeader && detail.status === 'SCHEDULED' && Number(detail.snapshotQuizId) > 0 && (
          <div
            className={`mt-3 rounded-xl border px-4 py-3 ${
              isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-950'
            }`}
          >
            <p className="text-sm leading-relaxed">
              {t('groupWorkspace.challenge.reviewInviteeNotice')}
            </p>
            <p className={`mt-2 text-xs ${isDarkMode ? 'text-cyan-200/90' : 'text-cyan-900/80'}`}>
              {t(
                'groupWorkspace.challenge.reviewInviteeShortHint',
                'Chỉ cần bấm «Xem quiz» ở khối Quiz challenge phía trên, rồi mở tab «Kiểm tra».',
              )}
            </p>
            {!canPreviewSnapshotQuiz && (
              <p className={`mt-2 text-xs ${isDarkMode ? 'text-amber-200/90' : 'text-amber-900'}`}>
                {t(
                  'groupWorkspace.challenge.reviewQuizNotReadyHint',
                  'Đề chưa sẵn sàng để xem (ví dụ đang tạo hoặc đang xử lý). Thử lại sau.',
                )}
              </p>
            )}
          </div>
        )}

        {detail.myReviewContributorForSnapshot && detail.status === 'SCHEDULED' && !detail.myParticipantStatus && (
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
              Xuất bản challenge
            </button>
          )}

          {canRegister && !canAcceptInvite && (
            <button
              onClick={handleRegister}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {actionLoading === 'register' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Đăng ký
            </button>
          )}

          {canAcceptInvite && (
            <button
              onClick={handleAcceptInvite}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {actionLoading === 'accept' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Chấp nhận lời mời
            </button>
          )}

          {canStart && (
            <button
              onClick={handleStartAttempt}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
            >
              {actionLoading === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {detail.myParticipantStatus === 'PLAYING' ? 'Tiếp tục làm bài' : 'Bắt đầu làm bài'}
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
              Huỷ challenge
            </button>
          )}
        </div>
        {showPublishChallengeAction && publishRequirementHint && (
          <p className={`mt-3 text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            {publishRequirementHint}
          </p>
        )}
      </div>

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
            Người tham gia ({detail.participants.length})
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
                    <UserDisplayName user={p} fallback="Thành viên" isDarkMode={isDarkMode} />
                  </span>
                </div>
                <span className={`text-xs ${
                  p.status === 'FINISHED' ? 'text-green-500' : p.status === 'PLAYING' ? 'text-blue-500' : (isDarkMode ? 'text-slate-500' : 'text-gray-400')
                }`}>
                  {p.status === 'FINISHED' ? 'Hoàn thành' : p.status === 'PLAYING' ? 'Đang làm' : 'Chờ'}
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
