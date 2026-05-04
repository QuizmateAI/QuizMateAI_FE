import { Eye, Loader2, Lock, UserPlus } from 'lucide-react';

/**
 * Banner cho phép leader đổi giữa "tham gia thi" và "tự review challenge".
 *
 * Điều kiện hiển thị:
 *  - Chỉ leader, status SCHEDULED, chưa publish.
 *  - Khi leader đang tham gia thi: hiện CTA "Tôi sẽ tự review" nếu có ít nhất
 *    1 reviewer được mời đã DECLINE. Trước đó ẩn để khỏi rối.
 *  - Khi leader đang là reviewer: hiện CTA "Quay lại tham gia thi", khoá
 *    không cho bấm khi leader đã từng xem đề (lastViewedAt hoặc reviewCompleteOkAt).
 */
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
  const declinedCount = reviewers.filter((c) => (c.decisionStatus || c.status) === 'DECLINED').length;
  const leaderHasViewedSnapshot = Boolean(
    myReviewContributor?.lastViewedAt || myReviewContributor?.reviewCompleteOkAt,
  );
  const switchToReviewerLoading = actionLoading === 'leaderSelfReview';
  const switchToParticipantLoading = actionLoading === 'leaderRejoin';

  if (detail.leaderParticipates) {
    if (declinedCount === 0) return null;
    return (
      <div className={`mt-3 rounded-xl border px-4 py-3 ${
        isDarkMode ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-200 bg-amber-50/70'
      }`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className={`text-sm font-semibold ${isDarkMode ? 'text-amber-100' : 'text-amber-900'}`}>
              {t('challengeDetailView.leaderRole.declinedTitle', 'Reviewer được mời đã từ chối')}
            </div>
            <p className={`mt-1 text-xs leading-relaxed ${isDarkMode ? 'text-amber-100/85' : 'text-amber-900/80'}`}>
              {t(
                'challengeDetailView.leaderRole.switchToReviewerHint',
                'Bạn có thể chuyển sang tự review challenge thay vì tham gia thi. Sau khi chuyển, bạn sẽ thấy đề và không thể quay lại tham gia thi.',
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSwitchLeaderToReviewer}
            disabled={!!actionLoading}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
              isDarkMode
                ? 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/40 hover:bg-amber-500/30'
                : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
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
