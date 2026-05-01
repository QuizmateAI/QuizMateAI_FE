import {
  Activity,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderOpen,
  Map as MapIcon,
  ShieldCheck,
  Users,
} from 'lucide-react';
import UserDisplayName from '@/components/features/users/UserDisplayName';
import { getUserDisplayLabel } from '@/utils/userProfile';
import { formatGroupLogDescription } from '@/lib/groupWorkspaceLogDisplay';
import { formatGroupLearningMode, formatGroupRole } from '../utils/groupDisplay';
import {
  formatDateTime,
  formatLearningScore,
  formatLearningPassRate,
  formatRelativeTime,
  getLogLabel,
} from '../utils/groupWorkspaceFormatters';

export function GroupActivityFeedPanel({
  compact = false,
  isDarkMode,
  groupLogs,
  groupLogsLoading,
  currentUserId,
  currentLang,
  t,
}) {
  return (
    <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-2">
        <Activity className={`h-5 w-5 ${isDarkMode ? 'text-cyan-200' : 'text-cyan-600'}`} />
        <div>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('groupWorkspacePage.activity.title', 'Recent group activity')}
          </h3>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {t('groupWorkspacePage.activity.description', 'Real events from the group workspace log.')}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {groupLogsLoading ? (
          <div className={`rounded-[22px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'}`}>
            {t('groupWorkspacePage.activity.loading', 'Loading activity...')}
          </div>
        ) : groupLogs.length === 0 ? (
          <div className={`rounded-[22px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'}`}>
            {t('groupWorkspacePage.activity.empty', 'No activity has been recorded yet.')}
          </div>
        ) : (
          groupLogs.slice(0, compact ? 10 : 6).map((log) => (
            <article
              key={`${log.logId || 'log'}-${log.action}-${log.logTime}`}
              className={`rounded-[22px] border px-4 py-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-white text-slate-700'}`}>
                    {getLogLabel(log.action, currentLang)}
                  </p>
                  <p className={`mt-3 text-sm font-semibold leading-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {formatGroupLogDescription(log, currentUserId, currentLang)}
                  </p>
                  <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {(log.actorEmail || t('groupWorkspacePage.log.system', 'System'))} • {formatDateTime(log.logTime, currentLang)}
                  </p>
                </div>
                <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {formatRelativeTime(log.logTime, currentLang)}
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function GroupPersonalDashboardPanel({
  isDarkMode,
  members,
  membersLoading,
  currentUser,
  welcomePayload,
  currentRoleKey,
  currentLang,
  resolvedGroupData,
  sources,
  groupDescription,
  currentGroupName,
  groupProfileLoading,
  planEntitlements,
  personalLearningSnapshot,
  personalLearningSnapshotLoading,
  groupLogs,
  groupLogsLoading,
  t,
  onOpenRoadmap,
  onViewActivity,
  onDismissWelcome,
}) {
  const currentMember = members.find((member) => member.isCurrentUser)
    || members.find((member) => String(member.userId) === String(currentUser?.userID))
    || members[0]
    || null;
  const safeMemberName = getUserDisplayLabel(currentMember, t('groupWorkspacePage.personalDashboard.memberFallback', 'Member'));
  const joinedAt = currentMember?.joinedAt || welcomePayload?.joinedAt || null;
  const currentRoleLabel = formatGroupRole(currentRoleKey, currentLang);
  const learningModeLabel = formatGroupLearningMode(resolvedGroupData.learningMode, currentLang);
  const stats = [
    {
      label: t('groupWorkspacePage.personalDashboard.roleLabel', 'Current role'),
      value: currentRoleLabel,
      icon: ShieldCheck,
    },
    {
      label: t('groupWorkspacePage.personalDashboard.teamMembers', 'Team members'),
      value: membersLoading ? '...' : String(members.length),
      icon: Users,
    },
    {
      label: t('groupWorkspacePage.personalDashboard.sharedSources', 'Shared sources'),
      value: String(sources.length),
      icon: FolderOpen,
    },
    {
      label: t('groupWorkspacePage.personalDashboard.joinedAt', 'Joined at'),
      value: joinedAt ? formatDateTime(joinedAt, currentLang) : t('groupWorkspacePage.personalDashboard.pendingConfirmation', 'Pending confirmation'),
      icon: CalendarDays,
    },
  ];

  return (
    <div className="space-y-5">
      <section className={`rounded-[32px] border p-6 lg:p-7 ${isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-white/80 bg-white/90'}`}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700'}`}>
                {welcomePayload
                  ? t('groupWorkspacePage.personalDashboard.welcomeBadge', 'Welcome aboard')
                  : t('groupWorkspacePage.personalDashboard.memberSpaceBadge', 'Member space')}
              </span>
              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                {currentRoleLabel}
              </span>
            </div>

            <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {welcomePayload
                ? `${t('groupWorkspacePage.personalDashboard.welcomeTo', 'Welcome to')} ${resolvedGroupData.groupName || currentGroupName || 'group'}`
                : `${t('groupWorkspacePage.personalDashboard.hello', 'Hello,')} ${safeMemberName}`}
            </h2>

            <p className={`mt-3 max-w-3xl text-sm leading-7 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {groupDescription
                || t('groupWorkspacePage.personalDashboard.descriptionFallback', 'You can review the group profile, see who is in the room, and follow the newest activity here.')}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpenRoadmap}
                className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
              >
                <MapIcon className="h-4 w-4" />
                {t('groupWorkspacePage.personalDashboard.openRoadmap', 'Open roadmap')}
              </button>
              <button
                type="button"
                onClick={onViewActivity}
                className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                <Activity className="h-4 w-4" />
                {t('groupWorkspacePage.personalDashboard.viewActivity', 'View activity')}
              </button>
              {welcomePayload ? (
                <button
                  type="button"
                  onClick={onDismissWelcome}
                  className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t('groupWorkspacePage.personalDashboard.hideWelcome', 'Hide welcome')}
                </button>
              ) : null}
            </div>
          </div>

          <div className={`rounded-[26px] border p-5 xl:w-[320px] ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50/80'}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              {t('groupWorkspacePage.personalDashboard.quickRead', 'Group quick read')}
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('groupWorkspacePage.personalDashboard.domain', 'Domain')}</p>
                <p className={`mt-1 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{resolvedGroupData.domain || '—'}</p>
              </div>
              <div>
                <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('groupWorkspacePage.personalDashboard.learningMode', 'Learning mode')}</p>
                <p className={`mt-1 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{learningModeLabel || '—'}</p>
              </div>
              <div>
                <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('groupWorkspacePage.personalDashboard.examTarget', 'Exam / target')}</p>
                <p className={`mt-1 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{resolvedGroupData.examName || resolvedGroupData.groupLearningGoal || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`rounded-[24px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-white/[0.06] text-cyan-200' : 'bg-cyan-50 text-cyan-700'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</p>
              </div>
              <p className={`mt-4 text-lg font-bold leading-7 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.value}</p>
            </div>
          );
        })}
      </div>

      {planEntitlements.hasWorkspaceAnalytics ? (
        <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {t('groupWorkspacePage.personalDashboard.learningSnapshotEyebrow', 'Learning snapshot')}
              </p>
              <h3 className={`mt-2 text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {t('groupWorkspacePage.personalDashboard.learningSnapshotTitle', 'Your latest daily snapshot')}
              </h3>
            </div>
            {personalLearningSnapshot?.snapshotDate ? (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700'}`}>
                {formatDateTime(personalLearningSnapshot.snapshotDate, currentLang)}
              </span>
            ) : null}
          </div>

          {personalLearningSnapshotLoading ? (
            <div className={`mt-4 rounded-[20px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              {t('groupWorkspacePage.personalDashboard.learningSnapshotLoading', 'Loading your learning snapshot...')}
            </div>
          ) : personalLearningSnapshot ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[
                { key: 'attempts', label: t('groupWorkspacePage.personalDashboard.snapshotAttempts', 'Attempts'), value: personalLearningSnapshot.totalQuizAttempts ?? 0 },
                { key: 'passed', label: t('groupWorkspacePage.personalDashboard.snapshotPassed', 'Passed'), value: personalLearningSnapshot.totalQuizPassed ?? 0 },
                { key: 'score', label: t('groupWorkspacePage.personalDashboard.snapshotScore', 'Avg score'), value: formatLearningScore(personalLearningSnapshot.averageScore) },
                { key: 'passRate', label: t('groupWorkspacePage.personalDashboard.snapshotPassRate', 'Pass rate'), value: formatLearningPassRate(personalLearningSnapshot) },
                { key: 'minutes', label: t('groupWorkspacePage.personalDashboard.snapshotMinutes', 'Minutes'), value: personalLearningSnapshot.totalMinutesSpent ?? 0 },
                { key: 'class', label: t('groupWorkspacePage.personalDashboard.snapshotClass', 'AI class'), value: personalLearningSnapshot.aiClassification || '—' },
              ].map((metric) => (
                <div key={metric.key} className={`rounded-[18px] border px-3 py-3 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50/70'}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{metric.label}</p>
                  <p className={`mt-2 text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{metric.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className={`mt-4 rounded-[20px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              {t('groupWorkspacePage.personalDashboard.learningSnapshotEmpty', 'No learning snapshot has been generated for you yet.')}
            </div>
          )}
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-2">
            <FileText className={`h-5 w-5 ${isDarkMode ? 'text-amber-200' : 'text-amber-600'}`} />
            <div>
              <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {t('groupWorkspacePage.personalDashboard.profileTitle', 'Group profile for members')}
              </h3>
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {groupProfileLoading
                  ? t('groupWorkspacePage.personalDashboard.profileRefreshing', 'Refreshing group profile...')
                  : t('groupWorkspacePage.personalDashboard.profileLoaded', 'Everything below is loaded from the real workspace profile.')}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {t('groupWorkspacePage.personalDashboard.knowledgeFocus', 'Knowledge focus')}
              </p>
              <p className={`mt-2 text-sm leading-7 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                {resolvedGroupData.knowledge || '—'}
              </p>
            </div>

            <div className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {t('groupWorkspacePage.personalDashboard.rulesAndNorms', 'Rules and norms')}
              </p>
              <p className={`mt-2 text-sm leading-7 whitespace-pre-line ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                {resolvedGroupData.rules || t('groupWorkspace.profile.noRules')}
              </p>
            </div>

            <div className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {t('groupWorkspacePage.personalDashboard.groupLearningGoal', 'Group learning goal')}
              </p>
              <p className={`mt-2 text-sm leading-7 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                {resolvedGroupData.groupLearningGoal || groupDescription || '—'}
              </p>
            </div>

            <div className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {t('groupWorkspacePage.personalDashboard.preLearningRequirement', 'Pre-learning requirement')}
              </p>
              <p className={`mt-2 text-sm leading-7 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                {resolvedGroupData.preLearningRequired == null
                  ? '—'
                  : resolvedGroupData.preLearningRequired
                    ? t('groupWorkspacePage.personalDashboard.preLearningRequired', 'Required before starting shared work.')
                    : t('groupWorkspacePage.personalDashboard.preLearningOptional', 'Optional, depending on your current level.')}
              </p>
            </div>
          </div>
        </section>

        <GroupActivityFeedPanel
          compact={false}
          isDarkMode={isDarkMode}
          groupLogs={groupLogs}
          groupLogsLoading={groupLogsLoading}
          currentUserId={currentUser?.userID}
          currentLang={currentLang}
          t={t}
        />
      </div>

      <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-2">
          <Users className={`h-5 w-5 ${isDarkMode ? 'text-emerald-200' : 'text-emerald-600'}`} />
          <div>
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('groupWorkspacePage.personalDashboard.peopleTitle', 'People in this group')}
            </h3>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {t('groupWorkspacePage.personalDashboard.peopleDescription', 'A quick snapshot so members know who they are studying with.')}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {membersLoading ? (
            <div className={`rounded-[22px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'}`}>
              {t('groupWorkspace.members.loading')}
            </div>
          ) : members.length === 0 ? (
            <div className={`rounded-[22px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'}`}>
              {t('groupWorkspace.members.empty')}
            </div>
          ) : (
            members.slice(0, 6).map((member) => (
              <div key={member.groupMemberId || member.userId} className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${isDarkMode ? 'bg-white/[0.07] text-white' : 'bg-white text-slate-700'}`}>
                    {(member.fullName || member.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      <UserDisplayName user={member} fallback={t('groupWorkspacePage.personalDashboard.memberFallback', 'Member')} isDarkMode={isDarkMode} />
                    </p>
                    <p className={`truncate text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {member.email || `@${member.username}`}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${member.role === 'LEADER' ? (isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700') : member.role === 'CONTRIBUTOR' ? (isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700') : (isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700')}`}>
                    {formatGroupRole(member.role, currentLang)}
                  </span>
                  {member.isCurrentUser ? (
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'bg-white/[0.07] text-slate-200' : 'bg-white text-slate-700'}`}>
                      {t('groupWorkspacePage.personalDashboard.youBadge', 'You')}
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
