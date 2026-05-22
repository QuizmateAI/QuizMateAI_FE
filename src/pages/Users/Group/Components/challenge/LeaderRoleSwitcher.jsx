import { Eye, Loader2, Lock, UserPlus } from 'lucide-react';

export default function LeaderRoleSwitcher({
  detail,
  isLeader,
  isPublished,
  isDarkMode,
  myReviewContributor,
  actionLoading,
  handleSwitchLeaderToReviewer,
  handleSwitchLeaderToParticipant,
  t,
}) {
  if (!isLeader) return null;
  if (!detail || detail.status !== 'SCHEDULED' || isPublished) return null;

  const reviewers = detail.reviewContributors || [];
  const getStatus = (c) => c.decisionStatus || c.status;
  const declinedCount = reviewers.filter((c) => getStatus(c) === 'DECLINED').length;
  const acceptedCount = reviewers.filter((c) => getStatus(c) === 'ACCEPTED').length;
  const pendingCount = reviewers.filter((c) => getStatus(c) === 'PENDING').length;
  const confirmedCount = reviewers.filter((c) => Boolean(c.reviewCompleteOkAt)).length;
  const hasAnyActiveReviewer = acceptedCount > 0 || pendingCount > 0;
  const leaderHasViewedSnapshot = Boolean(
    myReviewContributor?.lastViewedAt || myReviewContributor?.reviewCompleteOkAt,
  );
  const switchToReviewerLoading = actionLoading === 'leaderSelfReview';
  const switchToParticipantLoading = actionLoading === 'leaderRejoin';

  if (detail.leaderParticipates) {
    // Critical: chưa có reviewer accepted/pending → buộc phải chuyển để có thể publish.
    const isCritical = !hasAnyActiveReviewer && confirmedCount === 0;
    let title;
    let hint;
    if (confirmedCount > 0) {
      title = t('challengeDetailView.leaderRole.canSelfReviewTitle', 'Bạn vẫn có thể tự review');
      hint = t(
        'challengeDetailView.leaderRole.canSelfReviewHint',
        'Đã có reviewer xác nhận đề. Nếu muốn, bạn có thể chuyển sang tự review thay vì tham gia thi.',
      );
    } else if (hasAnyActiveReviewer) {
      title = t('challengeDetailView.leaderRole.waitingReviewerTitle', 'Reviewer chưa xác nhận xong');
      hint = t(
        'challengeDetailView.leaderRole.waitingReviewerHint',
        'Nếu reviewer chậm, bạn có thể chuyển sang tự review để publish được ngay.',
      );
    } else if (declinedCount > 0) {
      title = t('challengeDetailView.leaderRole.declinedTitle', 'Reviewer được mời đã từ chối');
      hint = t(
        'challengeDetailView.leaderRole.switchToReviewerHint',
        'Bạn có thể chuyển sang tự review challenge thay vì tham gia thi. Sau khi chuyển, bạn sẽ thấy đề và không thể quay lại tham gia thi.',
      );
    } else {
      title = t('challengeDetailView.leaderRole.noReviewerTitle', 'Chưa có ai review challenge');
      hint = t(
        'challengeDetailView.leaderRole.noReviewerHint',
        'Hãy mời reviewer hoặc chuyển sang tự review. Challenge cần có người review xong thì mới publish được.',
      );
    }
    const wrapperCls = isCritical
      ? (isDarkMode ? 'border-rose-500/30 bg-rose-500/10' : 'border-rose-200 bg-rose-50/70')
      : (isDarkMode ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-200 bg-amber-50/70');
    const titleCls = isCritical
      ? (isDarkMode ? 'text-rose-100' : 'text-rose-900')
      : (isDarkMode ? 'text-amber-100' : 'text-amber-900');
    const hintCls = isCritical
      ? (isDarkMode ? 'text-rose-100/85' : 'text-rose-900/80')
      : (isDarkMode ? 'text-amber-100/85' : 'text-amber-900/80');
    const btnCls = isCritical
      ? (isDarkMode
          ? 'bg-rose-500/20 text-rose-100 ring-1 ring-rose-500/40 hover:bg-rose-500/30'
          : 'bg-rose-500 text-white hover:bg-rose-600')
      : (isDarkMode
          ? 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/40 hover:bg-amber-500/30'
          : 'bg-amber-500 text-white hover:bg-amber-600');

    return (
      <div className={`mt-3 rounded-xl border px-4 py-3 ${wrapperCls}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className={`text-sm font-semibold ${titleCls}`}>{title}</div>
            <p className={`mt-1 text-xs leading-relaxed ${hintCls}`}>{hint}</p>
          </div>
          <button
            type="button"
            onClick={handleSwitchLeaderToReviewer}
            disabled={!!actionLoading}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${btnCls}`}
          >
            {switchToReviewerLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            {t('challengeDetailView.leaderRole.switchToReviewer', 'Tôi sẽ tự review')}
          </button>
        </div>
      </div>
    );
  }

  // leader đang ở vai trò reviewer (leaderParticipates = false)
  return (
    <div className={`mt-3 rounded-xl border px-4 py-3 ${
      isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50/70'
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-semibold ${isDarkMode ? 'text-cyan-100' : 'text-cyan-900'}`}>
            {t('challengeDetailView.leaderRole.reviewerTitle', 'Bạn đang ở vai trò reviewer')}
          </div>
          <p className={`mt-1 text-xs leading-relaxed ${isDarkMode ? 'text-cyan-100/85' : 'text-cyan-900/80'}`}>
            {leaderHasViewedSnapshot
              ? t(
                  'challengeDetailView.leaderRole.cannotRejoinHint',
                  'Bạn đã xem đề rồi nên không thể quay lại tham gia thi (sẽ không công bằng).',
                )
              : t(
                  'challengeDetailView.leaderRole.canRejoinHint',
                  'Nếu chưa xem đề, bạn có thể quay lại tham gia thi như một thí sinh.',
                )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSwitchLeaderToParticipant}
          disabled={!!actionLoading || leaderHasViewedSnapshot}
          title={leaderHasViewedSnapshot
            ? t('challengeDetailView.leaderRole.lockedTitle', 'Bạn đã xem đề rồi')
            : undefined}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            isDarkMode
              ? 'bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-500/40 hover:bg-cyan-500/30'
              : 'bg-cyan-500 text-white hover:bg-cyan-600'
          }`}
        >
          {switchToParticipantLoading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : leaderHasViewedSnapshot
              ? <Lock className="h-3.5 w-3.5" />
              : <UserPlus className="h-3.5 w-3.5" />}
          {leaderHasViewedSnapshot
            ? t('challengeDetailView.leaderRole.lockedAction', 'Đã khoá')
            : t('challengeDetailView.leaderRole.switchToParticipant', 'Quay lại tham gia thi')}
        </button>
      </div>
    </div>
  );
}
