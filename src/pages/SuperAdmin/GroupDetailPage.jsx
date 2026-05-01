import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDarkMode } from '@/hooks/useDarkMode';
import ListSpinner from '@/components/ui/ListSpinner';
import { cn } from '@/lib/utils';
import {
  getGroupDetail,
  getGroupSubscription,
  getGroupLogs,
} from '@/api/ManagementSystemAPI';
import { getRoadmapsByWorkspace } from '@/api/RoadmapAPI';
import {
  EmptyState,
  LoadingState,
  LogCard,
  MemberCard,
  RoadmapCard,
  SectionFrame,
  TabButton,
  formatDateTime,
  formatEnumLabel,
  normalizeText,
  resolveActionTone,
  resolveGroupDescription,
  resolveGroupName,
  resolveLeaderName,
  resolveLocale,
  resolveMembers,
  resolveSubscriptionStatus,
} from './Components/GroupDetailParts';

const TABS = [
  { id: 'overview', labelKey: 'groupDetail.tabs.overview', icon: LayoutDashboard },
  { id: 'members', labelKey: 'groupDetail.tabs.members', icon: Users },
  { id: 'content', labelKey: 'groupDetail.tabs.content', icon: FolderKanban },
  { id: 'logs', labelKey: 'groupDetail.tabs.logs', icon: Activity },
  { id: 'subscription', labelKey: 'groupDetail.tabs.subscription', icon: CreditCard },
];

function GroupDetailPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.includes('super-admin') ? '/super-admin' : '/admin';
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const locale = resolveLocale(i18n.language);

  const [activeTab, setActiveTab] = useState('overview');

  // Top-level fetches → React Query so revisiting this group (or backing in)
  // serves from cache and revalidates in the background, instead of refetching
  // four endpoints on every mount.
  const groupQuery = useQuery({
    queryKey: ['superAdmin', 'group', workspaceId],
    queryFn: async () => {
      const res = await getGroupDetail(workspaceId);
      return res?.data ?? res ?? null;
    },
    enabled: Boolean(workspaceId),
  });
  const group = groupQuery.data ?? null;
  const loading = groupQuery.isLoading;
  const error = groupQuery.error
    ? (groupQuery.error?.message || 'Không thể tải thông tin nhóm')
    : '';

  // Prefer the workspaceId echoed by the loaded group; fall back to the URL param.
  const intelWorkspaceId = group?.workspaceId ?? group?.id ?? workspaceId;
  const intelEnabled = Boolean(group) && Boolean(intelWorkspaceId);

  const subscriptionQuery = useQuery({
    queryKey: ['superAdmin', 'group', intelWorkspaceId, 'subscription'],
    queryFn: async () => {
      const res = await getGroupSubscription(intelWorkspaceId);
      return res?.data ?? res ?? null;
    },
    enabled: intelEnabled,
  });
  const subscription = subscriptionQuery.data ?? null;

  const roadmapsQuery = useQuery({
    queryKey: ['superAdmin', 'group', intelWorkspaceId, 'roadmaps'],
    queryFn: async () => {
      const res = await getRoadmapsByWorkspace(intelWorkspaceId, 0, 50);
      const data = res?.data ?? res;
      return data?.content ?? (Array.isArray(data) ? data : []);
    },
    enabled: intelEnabled,
  });
  const roadmaps = roadmapsQuery.data ?? [];

  const logsQuery = useQuery({
    queryKey: ['superAdmin', 'group', intelWorkspaceId, 'logs'],
    queryFn: async () => {
      const res = await getGroupLogs(intelWorkspaceId);
      const data = res?.data ?? res;
      return Array.isArray(data) ? data : [];
    },
    enabled: intelEnabled,
  });
  const logs = logsQuery.data ?? [];

  const panelLoading = {
    subscription: subscriptionQuery.isLoading,
    roadmaps: roadmapsQuery.isLoading,
    logs: logsQuery.isLoading,
  };

  const members = resolveMembers(group);
  const groupName = resolveGroupName(group, t);
  const groupDescription = resolveGroupDescription(group, t);
  const leaderName = resolveLeaderName(group, members, t);
  const memberCount = Number(group?.memberCount);
  const resolvedMemberCount = Number.isFinite(memberCount) && memberCount >= 0 ? memberCount : members.length;
  const sortedLogs = [...logs].sort((left, right) => {
    const leftDate = new Date(left?.logTime || left?.timestamp || left?.createdAt || 0).getTime();
    const rightDate = new Date(right?.logTime || right?.timestamp || right?.createdAt || 0).getTime();
    return rightDate - leftDate;
  });
  const latestLog = sortedLogs[0] || null;
  const recentLogs = sortedLogs.slice(0, 5);
  const leaderCount = members.filter((member) => String(member?.role || '').toUpperCase() === 'LEADER').length;
  const contributorCount = members.filter((member) => String(member?.role || '').toUpperCase() === 'CONTRIBUTOR').length;
  const collaboratorCount = Math.max(members.length - leaderCount - contributorCount, 0);
  const subscriptionPlanName = normalizeText(subscription?.plan?.displayName || subscription?.plan?.planName) || t('groupDetail.noPlan');
  const subscriptionStatus = resolveSubscriptionStatus(subscription, t);
  const planPrice = Number(subscription?.plan?.price);
  const hasPlanPrice = Number.isFinite(planPrice);
  const tabMeta = {
    overview: `${resolvedMemberCount} / ${roadmaps.length} / ${sortedLogs.length}`,
    members: String(resolvedMemberCount),
    content: String(roadmaps.length),
    logs: String(sortedLogs.length),
    subscription: subscription ? formatEnumLabel(subscriptionStatus) : t('groupDetail.noPlan'),
  };
  const heroHighlights = [
    {
      label: t('groupDetail.membersCount'),
      value: resolvedMemberCount,
      helper: `${leaderCount} ${t('groupDetail.memberRoles.leader')}`,
      icon: Users,
      tone: isDarkMode ? 'bg-sky-500/12 text-sky-200' : 'bg-sky-50 text-sky-700',
    },
    {
      label: t('groupDetail.roadmapsCount'),
      value: roadmaps.length,
      helper: sortedLogs.length > 0 ? `${sortedLogs.length} ${t('groupDetail.tabs.logs').toLowerCase()}` : t('groupDetail.noLogs'),
      icon: ListChecks,
      tone: isDarkMode ? 'bg-violet-500/12 text-violet-200' : 'bg-violet-50 text-violet-700',
    },
    {
      label: t('groupDetail.subscription'),
      value: subscriptionPlanName,
      helper: subscription ? formatEnumLabel(subscriptionStatus) : t('groupDetail.noSubscription'),
      icon: CreditCard,
      tone: isDarkMode ? 'bg-amber-500/12 text-amber-200' : 'bg-amber-50 text-amber-700',
    },
  ];
  const pulseMetrics = [
    {
      label: t('groupDetail.membersCount'),
      value: resolvedMemberCount,
      icon: Users,
      tone: isDarkMode ? 'bg-sky-500/12 text-sky-200' : 'bg-sky-50 text-sky-700',
    },
    {
      label: t('groupDetail.roadmapsCount'),
      value: roadmaps.length,
      icon: ListChecks,
      tone: isDarkMode ? 'bg-violet-500/12 text-violet-200' : 'bg-violet-50 text-violet-700',
    },
    {
      label: t('groupDetail.lastEvent'),
      value: latestLog ? formatDateTime(latestLog?.logTime || latestLog?.timestamp || latestLog?.createdAt, locale) : '-',
      icon: Activity,
      tone: isDarkMode ? 'bg-emerald-500/12 text-emerald-200' : 'bg-emerald-50 text-emerald-700',
    },
    {
      label: t('groupDetail.subscription'),
      value: subscriptionPlanName,
      icon: CreditCard,
      tone: isDarkMode ? 'bg-amber-500/12 text-amber-200' : 'bg-amber-50 text-amber-700',
    },
  ];
  const roleMix = [
    { label: t('groupDetail.memberRoles.leader'), value: leaderCount, tone: isDarkMode ? 'bg-emerald-400' : 'bg-emerald-500' },
    { label: t('groupDetail.memberRoles.contributor'), value: contributorCount, tone: isDarkMode ? 'bg-sky-400' : 'bg-sky-500' },
    { label: t('groupDetail.memberRoles.member'), value: collaboratorCount, tone: isDarkMode ? 'bg-amber-400' : 'bg-amber-500' },
  ];

  const handleRefresh = async () => {
    await Promise.all([
      groupQuery.refetch(),
      subscriptionQuery.refetch(),
      roadmapsQuery.refetch(),
      logsQuery.refetch(),
    ]);
  };

  if (loading) {
    return (
      <div className={`min-h-[420px] ${fontClass}`}>
        <ListSpinner variant="section" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className={`space-y-4 p-6 ${fontClass}`}>
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
            {error}
          </div>
        ) : null}
        <Button variant="outline" className="rounded-xl" onClick={() => navigate(`${basePath}/groups`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 p-6 animate-in fade-in duration-500 ${fontClass}`}>
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="grid items-start gap-5 2xl:grid-cols-12">
        <section
          className={cn(
            'relative overflow-hidden rounded-[34px] border px-5 py-5 sm:px-6 sm:py-6 2xl:col-span-7',
            isDarkMode
              ? 'border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.12),transparent_28%),linear-gradient(145deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92))]'
              : 'border-sky-100 bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.72),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(167,243,208,0.42),transparent_28%),linear-gradient(145deg,#fbfdff,#f4f9ff_48%,#ffffff)] shadow-[0_34px_90px_-56px_rgba(37,99,235,0.28)]'
          )}
        >
          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate(`${basePath}/groups`)}
                  className={cn('rounded-2xl border-none shadow-none', isDarkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-100')}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.26em]', isDarkMode ? 'text-slate-500' : 'text-sky-700/70')}>
                    {t('groupDetail.commandCenter')}
                  </p>
                  <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                    {t('groupDetail.commandCenterDesc')}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                className={cn(
                  'rounded-2xl',
                  isDarkMode ? 'border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800' : 'border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-50'
                )}
                aria-label={t('groupPage.refresh')}
                title={t('groupPage.refresh')}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px]',
                    isDarkMode ? 'bg-slate-800/90 text-sky-200' : 'bg-white text-sky-700 shadow-[0_18px_50px_-35px_rgba(37,99,235,0.30)]'
                  )}
                >
                  <UsersRound className="h-8 w-8" />
                </div>
                <div className="min-w-0">
                  <h1 className={cn('text-2xl font-black tracking-tight sm:text-[2rem]', isDarkMode ? 'text-white' : 'text-slate-950')}>
                    {groupName}
                  </h1>
                  <p className={cn('mt-2 max-w-3xl text-sm leading-6 sm:text-[15px]', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
                    {groupDescription}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <Badge variant="outline" className={cn('rounded-full border px-3 py-1 text-xs font-semibold', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-700')}>
                      <Users className="mr-1.5 h-3.5 w-3.5" />
                      {resolvedMemberCount} {t('groupDetail.members')}
                    </Badge>
                    <Badge variant="outline" className={cn('rounded-full border px-3 py-1 text-xs font-semibold', isDarkMode ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
                      <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                      {t('groupDetail.leader')}: {leaderName}
                    </Badge>
                    <Badge variant="outline" className={cn('rounded-full border px-3 py-1 text-xs font-semibold', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-700')}>
                      <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                      {formatDateTime(group?.createdAt, locale)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {heroHighlights.map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        'rounded-[24px] border px-4 py-4',
                        isDarkMode ? 'border-slate-800 bg-slate-950/55' : 'border-white/80 bg-white/88'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                          {item.label}
                        </p>
                        <div className={cn('rounded-full p-2', item.tone)}>
                          <item.icon className="h-4 w-4" />
                        </div>
                      </div>
                      <p className={cn('mt-3 text-base font-semibold leading-6', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        {item.value}
                      </p>
                      <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                        {item.helper}
                      </p>
                    </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside
          className={cn(
            'rounded-[34px] border p-5 sm:p-6 2xl:col-span-5',
            isDarkMode
              ? 'border-slate-800 bg-slate-900/92 shadow-[0_28px_60px_-45px_rgba(15,23,42,0.82)]'
              : 'border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fcff)] shadow-[0_26px_60px_-45px_rgba(15,23,42,0.18)]'
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={cn('text-[11px] font-semibold uppercase tracking-[0.26em]', isDarkMode ? 'text-slate-500' : 'text-sky-700/70')}>
                {t('groupDetail.groupPulse')}
              </p>
              <h2 className={cn('mt-2 text-xl font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {t('groupDetail.groupPulseDesc')}
              </h2>
            </div>
            <div className={cn('rounded-2xl p-3', isDarkMode ? 'bg-slate-800 text-sky-200' : 'bg-sky-50 text-sky-700')}>
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {pulseMetrics.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    'rounded-[22px] border p-4',
                    isDarkMode ? 'border-slate-800 bg-slate-950/55' : 'border-slate-200 bg-white'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                      {item.label}
                    </p>
                    <div className={cn('rounded-full p-2', item.tone)}>
                      <item.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className={cn('mt-3 text-sm font-semibold leading-6', isDarkMode ? 'text-white' : 'text-slate-900')}>
                    {item.value}
                  </p>
                </div>
            ))}
          </div>

          <div className={cn('mt-5 rounded-[24px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-950/55' : 'border-slate-200 bg-white')}>
            <div className="flex items-center gap-2">
              <Sparkles className={cn('h-4 w-4', isDarkMode ? 'text-sky-200' : 'text-sky-700')} />
              <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {t('groupDetail.memberMix')}
              </p>
            </div>

            <div className="mt-4 space-y-3.5">
              {roleMix.map((item) => {
                const ratio = resolvedMemberCount > 0 ? Math.max((item.value / resolvedMemberCount) * 100, item.value > 0 ? 12 : 0) : 0;

                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn('text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>{item.label}</span>
                      <span className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{item.value}</span>
                    </div>
                    <div className={cn('h-2.5 overflow-hidden rounded-full', isDarkMode ? 'bg-slate-800' : 'bg-slate-100')}>
                      <div className={cn('h-full rounded-full transition-[width]', item.tone)} style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      <section
        className={cn(
          'rounded-[30px] border p-3',
          isDarkMode
            ? 'border-slate-800 bg-slate-900/88'
            : 'border-slate-200 bg-white shadow-[0_22px_50px_-40px_rgba(15,23,42,0.12)]'
        )}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              icon={tab.icon}
              label={t(tab.labelKey)}
              meta={tabMeta[tab.id]}
              isDarkMode={isDarkMode}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </section>

      {activeTab === 'overview' ? (
        <div className="grid items-start gap-5 2xl:grid-cols-12">
          <div className="space-y-5 2xl:col-span-7">
            <SectionFrame
              eyebrow={t('groupDetail.memberRoster')}
              title={t('groupDetail.memberRoster')}
              description={t('groupDetail.memberRosterDesc')}
              icon={UsersRound}
              isDarkMode={isDarkMode}
              className="min-h-[260px]"
            >
              {members.length > 0 ? (
                <div className={cn('grid gap-4', members.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1')}>
                  {members.slice(0, 4).map((member) => (
                    <MemberCard
                      key={member?.groupMemberId ?? member?.userId ?? member?.username}
                      member={member}
                      isDarkMode={isDarkMode}
                      t={t}
                      leaderName={leaderName}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title={t('groupDetail.noMembers')}
                  description={t('groupDetail.memberRosterDesc')}
                  isDarkMode={isDarkMode}
                />
              )}
            </SectionFrame>

            <SectionFrame
              eyebrow={t('groupDetail.contentBoard')}
              title={t('groupDetail.contentBoard')}
              description={t('groupDetail.contentBoardDesc')}
              icon={FolderKanban}
              isDarkMode={isDarkMode}
              className="min-h-[280px]"
            >
              {panelLoading.roadmaps ? (
                <LoadingState isDarkMode={isDarkMode} t={t} />
              ) : roadmaps.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {roadmaps.slice(0, 4).map((roadmap, index) => (
                    <RoadmapCard
                      key={roadmap?.roadmapId ?? `${roadmap?.title}-${index}`}
                      roadmap={roadmap}
                      index={index}
                      isDarkMode={isDarkMode}
                      locale={locale}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={ListChecks}
                  title={t('groupDetail.noRoadmaps')}
                  description={t('groupDetail.emptyRoadmapsDesc')}
                  isDarkMode={isDarkMode}
                />
              )}
            </SectionFrame>
          </div>

          <div className="space-y-5 2xl:col-span-5">
            <SectionFrame
              eyebrow={t('groupDetail.activityStream')}
              title={t('groupDetail.activityStream')}
              description={t('groupDetail.activityStreamDesc')}
              icon={Activity}
              isDarkMode={isDarkMode}
              className="min-h-[300px]"
            >
              {panelLoading.logs ? (
                <LoadingState isDarkMode={isDarkMode} t={t} />
              ) : recentLogs.length > 0 ? (
                <div className="space-y-3">
                  {recentLogs.map((log, index) => (
                    <LogCard
                      key={log?.logId ?? `${log?.action}-${index}`}
                      log={log}
                      isDarkMode={isDarkMode}
                      locale={locale}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Activity}
                  title={t('groupDetail.noLogs')}
                  description={t('groupDetail.emptyLogsDesc')}
                  isDarkMode={isDarkMode}
                />
              )}
            </SectionFrame>

            <SectionFrame
              eyebrow={t('groupDetail.governance')}
              title={t('groupDetail.governance')}
              description={t('groupDetail.governanceDesc')}
              icon={ShieldCheck}
              isDarkMode={isDarkMode}
              className="min-h-[280px]"
            >
              {panelLoading.subscription ? (
                <LoadingState isDarkMode={isDarkMode} t={t} />
              ) : (
                <div className="space-y-4">
                  <div className={cn('rounded-[24px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-950/55' : 'border-slate-200 bg-slate-50')}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={cn('text-[11px] font-semibold uppercase tracking-[0.2em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                          {t('groupDetail.subscription')}
                        </p>
                        <p className={cn('mt-2 text-lg font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                          {subscriptionPlanName}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', resolveActionTone(subscriptionStatus, isDarkMode))}>
                        {formatEnumLabel(subscriptionStatus)}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className={cn('text-xs uppercase tracking-[0.16em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                          {t('groupDetail.createdAt')}
                        </p>
                        <p className={cn('mt-1 text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-slate-800')}>
                          {formatDateTime(group?.createdAt, locale)}
                        </p>
                      </div>
                      <div>
                        <p className={cn('text-xs uppercase tracking-[0.16em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                          {t('groupDetail.endDate')}
                        </p>
                        <p className={cn('mt-1 text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-slate-800')}>
                          {subscription ? formatDateTime(subscription?.endDate, locale) : t('groupDetail.noExpiry')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={cn('rounded-[24px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-950/55' : 'border-slate-200 bg-slate-50')}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className={cn('text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>{t('groupDetail.leader')}</span>
                        <span className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{leaderName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className={cn('text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>{t('groupDetail.price')}</span>
                        <span className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                          {hasPlanPrice ? `${planPrice.toLocaleString(locale === 'vi-VN' ? 'vi-VN' : 'en-US')} VNĐ` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </SectionFrame>
          </div>
        </div>
      ) : null}

      {activeTab === 'members' ? (
        <SectionFrame
          eyebrow={t('groupDetail.memberRoster')}
          title={t('groupDetail.memberRoster')}
          description={t('groupDetail.memberRosterDesc')}
          icon={UsersRound}
          isDarkMode={isDarkMode}
        >
          <div className="mb-5 flex flex-wrap gap-2.5">
            {[
              { label: t('groupDetail.memberRoles.leader'), value: leaderCount },
              { label: t('groupDetail.memberRoles.contributor'), value: contributorCount },
              { label: t('groupDetail.memberRoles.member'), value: collaboratorCount },
            ].map((item) => (
              <Badge
                key={item.label}
                variant="outline"
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold',
                  isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                )}
              >
                {item.label}: {item.value}
              </Badge>
            ))}
          </div>

          {members.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {members.map((member) => (
                <MemberCard
                  key={member?.groupMemberId ?? member?.userId ?? member?.username}
                  member={member}
                  isDarkMode={isDarkMode}
                  t={t}
                  leaderName={leaderName}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title={t('groupDetail.noMembers')}
              description={t('groupDetail.memberRosterDesc')}
              isDarkMode={isDarkMode}
            />
          )}
        </SectionFrame>
      ) : null}

      {activeTab === 'content' ? (
        <SectionFrame
          eyebrow={t('groupDetail.contentBoard')}
          title={t('groupDetail.contentBoard')}
          description={t('groupDetail.contentBoardDesc')}
          icon={FolderKanban}
          isDarkMode={isDarkMode}
        >
          {panelLoading.roadmaps ? (
            <LoadingState isDarkMode={isDarkMode} t={t} />
          ) : roadmaps.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {roadmaps.map((roadmap, index) => (
                <RoadmapCard
                  key={roadmap?.roadmapId ?? `${roadmap?.title}-${index}`}
                  roadmap={roadmap}
                  index={index}
                  isDarkMode={isDarkMode}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ListChecks}
              title={t('groupDetail.noRoadmaps')}
              description={t('groupDetail.emptyRoadmapsDesc')}
              isDarkMode={isDarkMode}
            />
          )}
        </SectionFrame>
      ) : null}

      {activeTab === 'logs' ? (
        <SectionFrame
          eyebrow={t('groupDetail.activityStream')}
          title={t('groupDetail.activityStream')}
          description={t('groupDetail.activityStreamDesc')}
          icon={Activity}
          isDarkMode={isDarkMode}
        >
          {panelLoading.logs ? (
            <LoadingState isDarkMode={isDarkMode} t={t} />
          ) : sortedLogs.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {sortedLogs.map((log, index) => (
                <LogCard
                  key={log?.logId ?? `${log?.action}-${index}`}
                  log={log}
                  isDarkMode={isDarkMode}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title={t('groupDetail.noLogs')}
              description={t('groupDetail.emptyLogsDesc')}
              isDarkMode={isDarkMode}
            />
          )}
        </SectionFrame>
      ) : null}

      {activeTab === 'subscription' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <SectionFrame
            eyebrow={t('groupDetail.governance')}
            title={t('groupDetail.subscription')}
            description={t('groupDetail.governanceDesc')}
            icon={CreditCard}
            isDarkMode={isDarkMode}
          >
            {panelLoading.subscription ? (
              <LoadingState isDarkMode={isDarkMode} t={t} />
            ) : subscription ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
                <div
                  className={cn(
                    'rounded-[26px] border p-5',
                    isDarkMode
                      ? 'border-slate-800 bg-[linear-gradient(155deg,rgba(56,189,248,0.12),rgba(15,23,42,0.92))]'
                      : 'border-sky-200 bg-[linear-gradient(155deg,#eff6ff,#ffffff)]'
                  )}
                >
                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.22em]', isDarkMode ? 'text-slate-400' : 'text-sky-700/70')}>
                    {t('groupDetail.subscription')}
                  </p>
                  <h2 className={cn('mt-3 text-2xl font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                    {subscriptionPlanName}
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline" className={cn('rounded-full border px-3 py-1 text-xs font-semibold', resolveActionTone(subscriptionStatus, isDarkMode))}>
                      {formatEnumLabel(subscriptionStatus)}
                    </Badge>
                    {subscription?.plan?.planScope ? (
                      <Badge variant="outline" className={cn('rounded-full border px-3 py-1 text-xs font-semibold', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-white bg-white text-slate-700')}>
                        {formatEnumLabel(subscription.plan.planScope)}
                      </Badge>
                    ) : null}
                    {subscription?.plan?.planLevel ? (
                      <Badge variant="outline" className={cn('rounded-full border px-3 py-1 text-xs font-semibold', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-white bg-white text-slate-700')}>
                        {formatEnumLabel(subscription.plan.planLevel)}
                      </Badge>
                    ) : null}
                  </div>

                  {normalizeText(subscription?.plan?.description) ? (
                    <p className={cn('mt-4 text-sm leading-6', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
                      {subscription.plan.description}
                    </p>
                  ) : null}
                </div>

                <div className={cn('rounded-[26px] border p-5', isDarkMode ? 'border-slate-800 bg-slate-950/55' : 'border-slate-200 bg-slate-50')}>
                  <div className="space-y-4">
                    <div>
                      <p className={cn('text-xs uppercase tracking-[0.18em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                        {t('groupDetail.price')}
                      </p>
                      <p className={cn('mt-1 text-lg font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        {hasPlanPrice ? `${planPrice.toLocaleString(locale === 'vi-VN' ? 'vi-VN' : 'en-US')} VNĐ` : '-'}
                      </p>
                    </div>
                    <div>
                      <p className={cn('text-xs uppercase tracking-[0.18em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                        {t('groupDetail.endDate')}
                      </p>
                      <p className={cn('mt-1 text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-slate-800')}>
                        {formatDateTime(subscription?.endDate, locale)}
                      </p>
                    </div>
                    <div>
                      <p className={cn('text-xs uppercase tracking-[0.18em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                        {t('groupDetail.createdAt')}
                      </p>
                      <p className={cn('mt-1 text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-slate-800')}>
                        {formatDateTime(group?.createdAt, locale)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={CreditCard}
                title={t('groupDetail.noSubscription')}
                description={t('groupDetail.emptySubscriptionDesc')}
                isDarkMode={isDarkMode}
              />
            )}
          </SectionFrame>

          <SectionFrame
            eyebrow={t('groupDetail.governance')}
            title={t('groupDetail.governance')}
            description={t('groupDetail.governanceDesc')}
            icon={ShieldCheck}
            isDarkMode={isDarkMode}
          >
            <div className="space-y-4">
              {[
                { label: t('groupDetail.leader'), value: leaderName },
                { label: t('groupDetail.membersCount'), value: resolvedMemberCount },
                { label: t('groupDetail.roadmapsCount'), value: roadmaps.length },
                { label: t('groupDetail.lastEvent'), value: latestLog ? formatDateTime(latestLog?.logTime || latestLog?.timestamp || latestLog?.createdAt, locale) : '-' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    'flex items-center justify-between gap-4 rounded-[20px] border px-4 py-3',
                    isDarkMode ? 'border-slate-800 bg-slate-950/55' : 'border-slate-200 bg-slate-50'
                  )}
                >
                  <span className={cn('text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>{item.label}</span>
                  <span className={cn('text-sm font-semibold text-right', isDarkMode ? 'text-white' : 'text-slate-900')}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </SectionFrame>
        </div>
      ) : null}
    </div>
  );
}

export default GroupDetailPage;
