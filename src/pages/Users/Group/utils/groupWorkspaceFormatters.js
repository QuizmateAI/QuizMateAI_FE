import i18nInstance from '@/i18n';

export function formatDateTime(value, lang = 'vi') {
  const t = i18nInstance.t.bind(i18nInstance);
  const lng = lang === 'en' ? 'en' : 'vi';
  if (!value) return t('groupWorkspacePage.time.noDate', 'No date', { lng });
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('groupWorkspacePage.time.noDate', 'No date', { lng });
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatLearningScore(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Math.round(Number(value) * 10) / 10;
}

export function formatLearningPassRate(snapshot) {
  const attempts = Number(snapshot?.totalQuizAttempts ?? 0);
  const passed = Number(snapshot?.totalQuizPassed ?? 0);
  if (attempts <= 0) return '—';
  return `${Math.round((passed / attempts) * 1000) / 10}%`;
}

export function formatRelativeTime(value, lang = 'vi') {
  const t = i18nInstance.t.bind(i18nInstance);
  const lng = lang === 'en' ? 'en' : 'vi';
  if (!value) return t('groupWorkspacePage.time.noRecentActivity', 'No recent activity', { lng });
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('groupWorkspacePage.time.noRecentActivity', 'No recent activity', { lng });

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffHours < 1) return t('groupWorkspacePage.time.justNow', 'Just now', { lng });
  if (diffHours < 24) return t('groupWorkspacePage.time.hoursAgo', '{{count}} hour(s) ago', { count: diffHours, lng });
  if (diffDays < 7) return t('groupWorkspacePage.time.daysAgo', '{{count}} day(s) ago', { count: diffDays, lng });
  return formatDateTime(value, lang);
}

export function getLogLabel(action, lang = 'vi') {
  const t = i18nInstance.t.bind(i18nInstance);
  const lng = lang === 'en' ? 'en' : 'vi';
  const labels = {
    GROUP_CREATED: t('groupWorkspacePage.log.groupCreated', 'Group created', { lng }),
    GROUP_PROFILE_UPDATED: t('groupWorkspacePage.log.groupProfileUpdated', 'Profile updated', { lng }),
    INVITATION_SENT: t('groupWorkspacePage.log.invitationSent', 'Invitation sent', { lng }),
    INVITATION_ACCEPTED: t('groupWorkspacePage.log.invitationAccepted', 'Invitation accepted', { lng }),
    MEMBER_JOINED: t('groupWorkspacePage.log.memberJoined', 'Member joined', { lng }),
    MEMBER_REMOVED: t('groupWorkspacePage.log.memberRemoved', 'Member removed', { lng }),
    MEMBER_ROLE_UPDATED: t('groupWorkspacePage.log.memberRoleUpdated', 'Role updated', { lng }),
    QUIZ_CREATED_IN_GROUP: t('groupWorkspacePage.log.quizCreated', 'Quiz created', { lng }),
    QUIZ_PUBLISHED_IN_GROUP: t('groupWorkspacePage.log.quizPublished', 'Quiz published', { lng }),
    QUIZ_AUDIENCE_UPDATED_IN_GROUP: t('groupWorkspacePage.log.quizAudienceUpdated', 'Quiz assignment', { lng }),
    QUIZ_SUBMITTED_IN_GROUP: t('groupWorkspacePage.log.quizSubmitted', 'Quiz submitted', { lng }),
  };

  return labels[action] || t('groupWorkspacePage.log.groupActivity', 'Group activity', { lng });
}
