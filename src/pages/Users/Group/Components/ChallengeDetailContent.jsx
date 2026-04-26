import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Flag,
  Loader2,
  Lock,
  PenLine,
  Pencil,
  Play,
  Shield,
  Swords,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { getUserDisplayLabel } from '@/utils/userProfile';
import UserDisplayName from '@/components/features/users/UserDisplayName';
import ChallengeDetailDialogs from './ChallengeDetailDialogs';
import ChallengeLeaderboard from './ChallengeLeaderboard';
import ChallengeTeamScoreboard from './ChallengeTeamScoreboard';
import ChallengeBracketView from './ChallengeBracketView';

const MATCH_MODE_LABELS = {
  FREE_FOR_ALL: 'Đua cá nhân',
  TEAM_BATTLE: 'Đấu đội',
  SOLO_BRACKET: 'Đấu cúp 1v1',
};

function ChallengeDetailContent({
  actionLoading,
  addableReviewMembers,
  bracketRoundQuizPlan,
  bracketRoundQuizReady,
  bracketRoundReadyCount,
  canAcceptInvite,
  canCancel,
  canEditChallengeSchedule,
  canManageBracketRoundQuiz,
  canManualFinishChallenge,
  canManualStartChallenge,
  canPreviewRoundQuiz,
  canPreviewSnapshotQuiz,
  canPublishChallenge,
  canRegister,
  canStart,
  cancelDialogOpen,
  cardCls,
  detail,
  displayedRealtimeChallengeQuizPercent,
  editDescription,
  editDialogOpen,
  editEndDate,
  editEndTime,
  editScheduleIssues,
  editStartDate,
  editStartTime,
  editTitle,
  error,
  eventId,
  finishDialogOpen,
  formatDateTime,
  getReviewerStatusCopy,
  handleAcceptInvite,
  handleAcceptReviewInvitation,
  handleCancelConfirm,
  handleDeclineReviewInvitation,
  handleFinishConfirm,
  handleInviteReviewer,
  handleOpenDraftQuizEditor,
  handleOpenRoundQuizEditor,
  handlePublishChallenge,
  handleRegister,
  handleRemoveReviewer,
  handleSaveChallengeEdit,
  handleStartAttempt,
  handleStartChallenge,
  handleViewRoundQuiz,
  handleViewSnapshotQuiz,
  isBracketChallenge,
  isDarkMode,
  isLeader,
  isPublished,
  manualFinishBlockedReason,
  myAcceptedReviewContributor,
  myPendingReviewInvitation,
  myReviewContributor,
  onBack,
  openEditDialog,
  publishRequirementHint,
  realtimeChallengeQuizPercent,
  resolveReviewMemberUserId,
  reviewerInviteLimitReached,
  reviewerPick,
  roundStatusClass,
  setCancelDialogOpen,
  setEditDescription,
  setEditDialogOpen,
  setEditEndDate,
  setEditEndTime,
  setEditStartDate,
  setEditStartTime,
  setEditTitle,
  setFinishDialogOpen,
  setReviewerPick,
  showChallengeQuizCard,
  showChallengeQuizProcessingState,
  showDraftQuizCta,
  showLeaderboard,
  showManualFinishChallenge,
  showPublishChallengeAction,
  showReviewContributorPanel,
  snapshotDisplayStatusKeyRaw,
  snapshotDurationMinutes,
  snapshotStatusKey,
  snapshotStatusKeyRaw,
  snapshotStatusLabel,
  t,
  workspaceId,
}) {
  const renderBracketRoundQuizPanel = () => (
    <div className={`mt-4 rounded-xl border px-4 py-4 ${
      isDarkMode ? 'border-slate-600 bg-slate-700/40' : 'border-gray-100 bg-gray-50'
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            <Trophy className="h-3.5 w-3.5" />
            Đề theo từng vòng đấu cúp
          </div>
          <p className={`mt-1 max-w-3xl text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Mỗi vòng dùng một đề riêng để tất cả cặp đấu trong vòng đó làm cùng lúc. Leader hoặc reviewer được mời có thể chuẩn bị đề cho từng vòng; khi đề đủ điều kiện review thì mới tính là đề chính thức.
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
          const canManageRoundQuiz = canManageBracketRoundQuiz || (detail.status === 'SCHEDULED' && !isPublished && round.myReviewContributor);
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
                      ? (canPreview ? (round.quizTitle || 'Đề vòng đấu') : 'Đề đã được gắn, member chỉ thấy khi đến lượt làm bài')
                      : 'Chưa có đề cho vòng này'}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roundStatusClass(round)}`}>
                  {round.isReady
                    ? 'Sẵn sàng'
                    : round.quizId
                      ? (round.quizStatus === 'ACTIVE' ? 'Chờ duyệt' : (round.quizStatus || 'Bản nháp'))
                      : 'Thiếu đề'}
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

              {!canPreview && round.quizId && !isLeader && !myReviewContributor && (
                <p className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                  isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-500'
                }`}>
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Đề vòng này chỉ mở khi challenge đã publish và đến giờ làm bài.
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
                    Xem đề
                  </button>
                )}
                {canManageRoundQuiz && round.quizId && (
                  <button
                    type="button"
                    onClick={() => handleOpenRoundQuizEditor(round)}
                    disabled={actionLoading === loadingKey}
                    className={`inline-flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 sm:flex-none ${
                      isDarkMode
                        ? 'bg-orange-500/20 text-orange-200 hover:bg-orange-500/30'
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                  >
                    {actionLoading === loadingKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
                    Soạn đề vòng
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!bracketRoundQuizReady && (
        <p className={`mt-3 text-xs leading-relaxed ${isDarkMode ? 'text-amber-200/90' : 'text-amber-900'}`}>
          Đấu cúp chỉ được publish khi tất cả vòng có đề ACTIVE và đủ reviewer xác nhận theo rule hiện tại. Member hoặc người được mời riêng không thấy đề trước khi publish và trước giờ làm bài.
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

        {isBracketChallenge && bracketRoundQuizPlan.length > 0 && renderBracketRoundQuizPanel()}

        {showChallengeQuizCard && (
          <div className={`mt-4 rounded-xl border px-4 py-3 ${
            isDarkMode ? 'border-slate-600 bg-slate-700/40' : 'border-gray-100 bg-gray-50'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={`text-xs font-medium uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('challengeDetailView.quizChallengeLabel', 'Challenge match')}
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
                    {t('challengeDetailView.processingQuizTitle', 'Challenge match is being generated')}
                  </p>
                  <p className={`mt-1 text-xs leading-relaxed ${isDarkMode ? 'text-sky-100/80' : 'text-sky-900/75'}`}>
                    {t('challengeDetailView.processingQuizHint', 'The system is still generating questions for this challenge. Return here in a moment to continue reviewing or editing the match.')}
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
                    {t('challengeDetailView.composeChallengeQuiz', 'Compose match')}
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
                {t('challengeDetailView.draftQuizHint', 'Create the match content first, then you can preview the challenge match.')}
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
              {detail.leaderParticipates
                ? t('challengeDetailView.reviewerPanel.participatingLeaderHint', 'Leader is joining the challenge, so invite 1 or 2 reviewers here. All reviewers have the same role.')
                : t('challengeDetailView.reviewerPanel.optionalHint', 'Invite up to 2 reviewers if you want another pair of eyes before publishing. All reviewers have the same role.')}
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
                          isDarkMode ? 'bg-cyan-500/15 text-cyan-200' : 'bg-cyan-100 text-cyan-800'
                        }`}>
                          {t('challengeDetailView.reviewerPanel.reviewerBadge', 'Reviewer')}
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
                  disabled={reviewerInviteLimitReached}
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
                  || reviewerInviteLimitReached
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
                {detail.leaderParticipates
                  ? t('challengeDetailView.reviewerPanel.needReviewerWhenLeaderParticipates', 'Leader is participating, so invite 1 reviewer at minimum. You can invite up to 2 reviewers.')
                  : t('challengeDetailView.reviewerPanel.optionalReviewersHint', 'Reviewers are optional here. If invited, they can help check and clean up the match before you publish it.')}
              </p>
            )}
          </div>
        )}

        {myPendingReviewInvitation && !isLeader && detail.status === 'SCHEDULED' && Number(detail.snapshotQuizId) > 0 && (
          <div
            className={`mt-3 rounded-xl border px-4 py-4 ${
              isDarkMode ? 'border-orange-500/30 bg-orange-500/10 text-orange-100' : 'border-orange-200 bg-orange-50 text-orange-950'
            }`}
          >
            <p className="text-sm font-semibold">
              {t('challengeDetailView.reviewInvitation.title', 'Bạn được mời review đề challenge này')}
            </p>
            <p className={`mt-2 text-xs leading-relaxed ${isDarkMode ? 'text-orange-100/85' : 'text-orange-900/80'}`}>
              {t(
                'challengeDetailView.reviewInvitation.body',
                'Leader đã chọn bạn làm reviewer. Nếu đồng ý, bạn sẽ được xem đề trước để kiểm tra và bạn sẽ không thể đăng ký tham gia challenge này như thí sinh.',
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAcceptReviewInvitation}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
              >
                {actionLoading === 'acceptReviewInvite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {t('challengeDetailView.reviewInvitation.accept', 'Đồng ý review')}
              </button>
              <button
                type="button"
                onClick={handleDeclineReviewInvitation}
                disabled={!!actionLoading}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  isDarkMode ? 'border-orange-300/40 text-orange-100 hover:bg-orange-500/10' : 'border-orange-200 text-orange-800 hover:bg-orange-100'
                }`}
              >
                {actionLoading === 'declineReviewInvite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                {t('challengeDetailView.reviewInvitation.decline', 'Từ chối')}
              </button>
            </div>
          </div>
        )}

        {myAcceptedReviewContributor && !isLeader && detail.status === 'SCHEDULED' && Number(detail.snapshotQuizId) > 0 && (
          <div
            className={`mt-3 rounded-xl border px-4 py-3 ${
              isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-950'
            }`}
          >
            <p className="text-sm leading-relaxed">
              {t('groupWorkspace.challenge.reviewInviteeNotice')}
            </p>
            <p className={`mt-2 text-xs ${isDarkMode ? 'text-cyan-200/90' : 'text-cyan-900/80'}`}>
              {t('groupWorkspace.challenge.reviewInviteeShortHint', 'Click “Open match” in the Challenge match block above, then open the “Check” tab.',
              )}
            </p>
            {!canPreviewSnapshotQuiz && (
              <p className={`mt-2 text-xs ${isDarkMode ? 'text-amber-200/90' : 'text-amber-900'}`}>
                {t('groupWorkspace.challenge.reviewQuizNotReadyHint', 'The match is not ready to preview yet (for example still generating). Please try again later.',
                )}
              </p>
            )}
          </div>
        )}

        {myAcceptedReviewContributor && !isLeader && detail.status === 'SCHEDULED' && !detail.myParticipantStatus && (
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
              {t('challengeDetailView.actions.start', 'Bắt đầu challenge')}
            </button>
          )}

          {showManualFinishChallenge && (
            <button
              type="button"
              onClick={() => setFinishDialogOpen(true)}
              disabled={!canManualFinishChallenge || !!actionLoading}
              title={manualFinishBlockedReason || undefined}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isDarkMode
                  ? 'bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {actionLoading === 'manualFinish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              {t('challengeDetailView.actions.finish', 'Kết thúc challenge')}
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
        {showManualFinishChallenge && manualFinishBlockedReason && (
          <p className={`mt-3 text-xs leading-relaxed ${isDarkMode ? 'text-amber-200/90' : 'text-amber-800'}`}>
            {manualFinishBlockedReason}
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

      <ChallengeDetailDialogs
        actionLoading={actionLoading}
        cancelDialogOpen={cancelDialogOpen}
        editDescription={editDescription}
        editDialogOpen={editDialogOpen}
        editEndDate={editEndDate}
        editEndTime={editEndTime}
        editScheduleIssues={editScheduleIssues}
        editStartDate={editStartDate}
        editStartTime={editStartTime}
        editTitle={editTitle}
        finishDialogOpen={finishDialogOpen}
        handleCancelConfirm={handleCancelConfirm}
        handleFinishConfirm={handleFinishConfirm}
        handleSaveChallengeEdit={handleSaveChallengeEdit}
        isDarkMode={isDarkMode}
        setCancelDialogOpen={setCancelDialogOpen}
        setEditDescription={setEditDescription}
        setEditDialogOpen={setEditDialogOpen}
        setEditEndDate={setEditEndDate}
        setEditEndTime={setEditEndTime}
        setEditStartDate={setEditStartDate}
        setEditStartTime={setEditStartTime}
        setEditTitle={setEditTitle}
        setFinishDialogOpen={setFinishDialogOpen}
        t={t}
      />
    </div>
  );
}

export default ChallengeDetailContent;
