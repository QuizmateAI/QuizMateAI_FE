import React from 'react';
import { MessageSquare, Star, Users } from 'lucide-react';

function formatRatingValue(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }
  return numericValue.toFixed(numericValue >= 4.95 ? 0 : 1);
}

function SignalPill({ icon: Icon, label, isDarkMode }) {
  if (!label) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${
        isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </span>
  );
}

export default function CommunityQuizSignals({
  cloneCount = 0,
  averageRating = 0,
  ratingCount = 0,
  commentCount = 0,
  isDarkMode = false,
  t,
  className = '',
}) {
  const resolvedRating = formatRatingValue(averageRating);
  const normalizedRatingCount = Number(ratingCount) || 0;
  const normalizedCommentCount = Number(commentCount) || 0;
  const normalizedCloneCount = Number(cloneCount) || 0;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <SignalPill
        icon={Star}
        isDarkMode={isDarkMode}
        label={normalizedRatingCount > 0 && resolvedRating
          ? t('workspace.quiz.communitySignals.rating', '{{rating}}★ · {{count}} reviews', {
            rating: resolvedRating,
            count: normalizedRatingCount,
          })
          : t('workspace.quiz.communitySignals.noRating', 'No reviews yet')}
      />
      <SignalPill
        icon={MessageSquare}
        isDarkMode={isDarkMode}
        label={t('workspace.quiz.communitySignals.comments', '{{count}} comments', {
          count: normalizedCommentCount,
        })}
      />
      {normalizedCloneCount > 0 ? (
        <SignalPill
          icon={Users}
          isDarkMode={isDarkMode}
          label={t('workspace.quiz.communitySignals.clones', '{{count}} clones', {
            count: normalizedCloneCount,
          })}
        />
      ) : null}
    </div>
  );
}
