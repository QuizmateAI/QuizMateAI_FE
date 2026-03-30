import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  CreditCard,
  FolderKanban,
  Hash,
  LayoutDashboard,
  ListChecks,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { useDarkMode } from '@/hooks/useDarkMode';
import ListSpinner from '@/Components/ui/ListSpinner';
import { cn } from '@/lib/utils';
import {
  getGroupDetail,
  getGroupSubscription,
  getGroupLogs,
} from '@/api/ManagementSystemAPI';
import { getRoadmapsByWorkspace } from '@/api/RoadmapAPI';

const GROUP_NAME_PLACEHOLDERS = ['group name null', 'name null', 'null', 'undefined'];
const GROUP_DESCRIPTION_PLACEHOLDERS = ['group description null', 'description null', 'null', 'undefined'];

const TABS = [
  { id: 'overview', labelKey: 'groupDetail.tabs.overview', icon: LayoutDashboard },
  { id: 'members', labelKey: 'groupDetail.tabs.members', icon: Users },
  { id: 'content', labelKey: 'groupDetail.tabs.content', icon: FolderKanban },
  { id: 'logs', labelKey: 'groupDetail.tabs.logs', icon: Activity },
  { id: 'subscription', labelKey: 'groupDetail.tabs.subscription', icon: CreditCard },
];

function normalizeText(value) {
  if (value == null) return '';

  const trimmed = String(value).trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed || normalized === 'null' || normalized === 'undefined') {
    return '';
  }

  return trimmed;
}

function formatEnumLabel(value) {
  const normalized = normalizeText(value);
  if (!normalized) return '-';

  return normalized
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveLocale(language) {
  return language === 'en' ? 'en-GB' : 'vi-VN';
}

function formatDateTime(value, locale) {
  const normalized = normalizeText(value);
  if (!normalized) return '-';

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function resolveGroupName(group, t) {
  const rawName = normalizeText(group?.groupName || group?.name);
  if (!rawName || GROUP_NAME_PLACEHOLDERS.includes(rawName.toLowerCase())) {
    return t('groupDetail.untitledGroup');
  }
  return rawName;
}

function resolveGroupDescription(group, t) {
  const rawDescription = normalizeText(group?.description);
  if (!rawDescription || GROUP_DESCRIPTION_PLACEHOLDERS.includes(rawDescription.toLowerCase())) {
    return t('groupDetail.noDescription');
  }
  return rawDescription;
}

function resolveMembers(group) {
  return Array.isArray(group?.members) ? group.members : [];
}

function resolveLeaderName(group, members, t) {
  const directLeader = normalizeText(group?.createdByFullName || group?.createdByUsername || group?.leaderName);
  if (directLeader) return directLeader;

  const leaderMember = members.find((member) => String(member?.role || '').toUpperCase() === 'LEADER');
  const leaderName = normalizeText(leaderMember?.fullName || leaderMember?.username);
  return leaderName || t('groupDetail.unknownLeader');
}

function resolveMemberRoleLabel(role, t) {
  const normalizedRole = normalizeText(role).toLowerCase();
  const translated = normalizedRole ? t(`groupDetail.memberRoles.${normalizedRole}`) : '';

  if (translated && translated !== `groupDetail.memberRoles.${normalizedRole}`) {
    return translated;
  }

  return formatEnumLabel(role || 'member');
}

function resolveRoleTone(role, isDarkMode) {
  const normalizedRole = String(role || '').toUpperCase();

  if (normalizedRole === 'LEADER') {
    return isDarkMode
      ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalizedRole === 'CONTRIBUTOR') {
    return isDarkMode
      ? 'border-sky-500/30 bg-sky-500/12 text-sky-200'
      : 'border-sky-200 bg-sky-50 text-sky-700';
  }

  return isDarkMode
    ? 'border-amber-500/30 bg-amber-500/12 text-amber-200'
    : 'border-amber-200 bg-amber-50 text-amber-700';
}

function resolveActionTone(action, isDarkMode) {
  const normalizedAction = String(action || '').toUpperCase();

  if (normalizedAction.includes('INVITATION') || normalizedAction.includes('ADD') || normalizedAction.includes('JOIN')) {
    return isDarkMode
      ? 'border-sky-500/25 bg-sky-500/12 text-sky-200'
      : 'border-sky-200 bg-sky-50 text-sky-700';
  }

  if (normalizedAction.includes('LEAVE') || normalizedAction.includes('REMOVE') || normalizedAction.includes('DELETE')) {
    return isDarkMode
      ? 'border-rose-500/25 bg-rose-500/12 text-rose-200'
      : 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (normalizedAction.includes('UPDATE') || normalizedAction.includes('EDIT')) {
    return isDarkMode
      ? 'border-violet-500/25 bg-violet-500/12 text-violet-200'
      : 'border-violet-200 bg-violet-50 text-violet-700';
  }

  return isDarkMode
    ? 'border-slate-600 bg-slate-800 text-slate-200'
    : 'border-slate-200 bg-slate-100 text-slate-700';
}

function resolveSubscriptionStatus(subscription, t) {
  return normalizeText(subscription?.status) || t('groupDetail.unknownStatus');
}

function LoadingState({ isDarkMode }) {
  return (
    <div className={cn('flex items-center gap-2 rounded-2xl border px-4 py-4 text-sm', isDarkMode ? 'border-slate-700 bg-slate-900/70 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600')}>
      <RefreshCw className="h-4 w-4 animate-spin" />
      <span>Loading...</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, isDarkMode }) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-dashed px-5 py-10 text-center',
        isDarkMode ? 'border-slate-700 bg-slate-950/30' : 'border-slate-200 bg-slate-50/80'
      )}
    >
      <div className={cn('mx-auto flex h-12 w-12 items-center justify-center rounded-2xl', isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600')}>
        <Icon className="h-5 w-5" />
      </div>
      <p className={cn('mt-4 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{title}</p>
      <p className={cn('mx-auto mt-2 max-w-md text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>{description}</p>
    </div>
  );
}

function SectionFrame({
  eyebrow,
  title,
  description,
  icon: Icon,
  isDarkMode,
  className,
  children,
}) {
  return (
    <section
      className={cn(
        'rounded-[30px] border p-5 sm:p-6',
        isDarkMode
          ? 'border-slate-800 bg-slate-900/85 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.82)]'
          : 'border-slate-200 bg-white shadow-[0_28px_70px_-48px_rgba(15,23,42,0.22)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'rounded-2xl p-3',
              isDarkMode ? 'bg-slate-800 text-sky-200' : 'bg-sky-50 text-sky-700'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            {eyebrow ? (
              <p className={cn('text-[11px] font-semibold uppercase tracking-[0.22em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                {eyebrow}
              </p>
            ) : null}
            <h2 className={cn('mt-1 text-lg font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{title}</h2>
            {description ? (
              <p className={cn('mt-1.5 max-w-2xl text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  meta,
  isDarkMode,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group rounded-[24px] border px-4 py-4 text-left transition-all duration-200',
        active
          ? isDarkMode
            ? 'border-sky-400/30 bg-sky-500/12 shadow-[0_24px_50px_-36px_rgba(14,165,233,0.45)]'
            : 'border-sky-200 bg-sky-50/90 shadow-[0_24px_50px_-36px_rgba(59,130,246,0.24)]'
          : isDarkMode
            ? 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900/85'
            : 'border-slate-200 bg-white/90 hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'rounded-2xl p-2.5 transition-colors',
              active
                ? isDarkMode
                  ? 'bg-sky-500/15 text-sky-200'
                  : 'bg-white text-sky-700'
                : isDarkMode
                  ? 'bg-slate-800 text-slate-300 group-hover:text-sky-200'
                  : 'bg-slate-100 text-slate-600 group-hover:text-sky-700'
            )}
          >
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className={cn('truncate text-sm font-semibold', active ? (isDarkMode ? 'text-white' : 'text-slate-900') : isDarkMode ? 'text-slate-200' : 'text-slate-800')}>
              {label}
            </p>
            <p className={cn('mt-1 truncate text-xs', active ? (isDarkMode ? 'text-sky-200/90' : 'text-sky-700') : isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
              {meta}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'h-2.5 w-2.5 shrink-0 rounded-full transition-colors',
            active
              ? isDarkMode
                ? 'bg-sky-300'
                : 'bg-sky-500'
              : isDarkMode
                ? 'bg-slate-700 group-hover:bg-slate-500'
                : 'bg-slate-200 group-hover:bg-slate-300'
          )}
        />
      </div>
    </button>
  );
}

function MemberCard({ member, isDarkMode, t, leaderName }) {
  const role = String(member?.role || '').toUpperCase();
  const displayName = normalizeText(member?.fullName || member?.username) || t('groupDetail.unknownLeader');
  const email = normalizeText(member?.email) || t('groupDetail.noEmail');
  const username = normalizeText(member?.username);
  const isLeader = role === 'LEADER' || displayName === leaderName;

  return (
    <article
      className={cn(
        'rounded-[24px] border p-4 transition-colors',
        isLeader
          ? isDarkMode
            ? 'border-emerald-500/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.10),rgba(15,23,42,0.88))]'
            : 'border-emerald-200 bg-[linear-gradient(180deg,#f6fffb,#ffffff)]'
          : isDarkMode
            ? 'border-slate-800 bg-slate-950/45 hover:border-slate-700'
            : 'border-slate-200 bg-slate-50/80 hover:border-slate-300'
      )}
    >
      <div className="flex items-start gap-3">
        {member?.avatar ? (
          <img src={member.avatar} alt="" className="h-12 w-12 rounded-2xl object-cover" />
        ) : (
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600')}>
            <User className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn('truncate text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {displayName}
              </p>
              <p className={cn('mt-1 truncate text-xs', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                {username ? `@${username}` : email}
              </p>
            </div>
            <Badge variant="outline" className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', resolveRoleTone(role, isDarkMode))}>
              {resolveMemberRoleLabel(role, t)}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className={cn('rounded-full border px-2.5 py-0.5 text-[11px]', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600')}>
              <Mail className="mr-1.5 h-3 w-3" />
              {email}
            </Badge>
            {member?.userId ? (
              <Badge variant="outline" className={cn('rounded-full border px-2.5 py-0.5 text-[11px]', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600')}>
                <Hash className="mr-1.5 h-3 w-3" />
                {member.userId}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function RoadmapCard({ roadmap, index, isDarkMode, locale }) {
  const title = normalizeText(roadmap?.title || roadmap?.roadmapName) || `Roadmap ${index + 1}`;
  const description = normalizeText(roadmap?.description || roadmap?.goal);
  const status = formatEnumLabel(roadmap?.status || 'ACTIVE');

  return (
    <article
      className={cn(
        'rounded-[24px] border p-5',
        isDarkMode
          ? 'border-slate-800 bg-slate-950/55'
          : 'border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)]'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold', isDarkMode ? 'bg-slate-800 text-sky-200' : 'bg-sky-50 text-sky-700')}>
            {String(index + 1).padStart(2, '0')}
          </div>
          <div className="min-w-0">
            <h3 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{title}</h3>
            {description ? (
              <p className={cn('mt-2 line-clamp-3 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <Badge variant="outline" className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', resolveActionTone(status, isDarkMode))}>
          {status}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {roadmap?.roadmapId ? (
          <Badge variant="outline" className={cn('rounded-full border px-2.5 py-0.5 text-[11px]', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600')}>
            <Hash className="mr-1.5 h-3 w-3" />
            {roadmap.roadmapId}
          </Badge>
        ) : null}
        {(roadmap?.updatedAt || roadmap?.createdAt) ? (
          <Badge variant="outline" className={cn('rounded-full border px-2.5 py-0.5 text-[11px]', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600')}>
            <Clock3 className="mr-1.5 h-3 w-3" />
            {formatDateTime(roadmap?.updatedAt || roadmap?.createdAt, locale)}
          </Badge>
        ) : null}
      </div>
    </article>
  );
}

function LogCard({ log, isDarkMode, locale }) {
  const action = formatEnumLabel(log?.action || log?.actionType || 'EVENT');
  const description = normalizeText(log?.description || log?.actorEmail || log?.resource) || '-';
  const resource = normalizeText(log?.resource);

  return (
    <article
      className={cn(
        'rounded-[24px] border p-4',
        isDarkMode ? 'border-slate-800 bg-slate-950/55' : 'border-slate-200 bg-slate-50/90'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Badge variant="outline" className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', resolveActionTone(action, isDarkMode))}>
          {action}
        </Badge>
        <p className={cn('shrink-0 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
          {formatDateTime(log?.logTime || log?.timestamp || log?.createdAt, locale)}
        </p>
      </div>
      <p className={cn('mt-3 text-sm leading-6', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
        {description}
      </p>
      {resource && resource !== description ? (
        <div className={cn('mt-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium', isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-500')}>
          <ChevronRight className="mr-1.5 h-3 w-3" />
          {resource}
        </div>
      ) : null}
    </article>
  );
}

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
  const [group, setGroup] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [panelLoading, setPanelLoading] = useState({
    subscription: false,
    roadmaps: false,
    logs: false,
  });

  const fetchGroup = async () => {
    try {
      const res = await getGroupDetail(workspaceId);
      const data = res?.data ?? res;
      setGroup(data || null);
      return data || null;
    } catch (err) {
      setError(err?.message || 'Không thể tải thông tin nhóm');
      setGroup(null);
      return null;
    }
  };

  const loadGroupIntel = async (targetWorkspaceId) => {
    if (!targetWorkspaceId) return;

    setPanelLoading({
      subscription: true,
      roadmaps: true,
      logs: true,
    });

    const [subscriptionResult, roadmapResult, logsResult] = await Promise.allSettled([
      getGroupSubscription(targetWorkspaceId),
      getRoadmapsByWorkspace(targetWorkspaceId, 0, 50),
      getGroupLogs(targetWorkspaceId),
    ]);

    if (subscriptionResult.status === 'fulfilled') {
      setSubscription(subscriptionResult.value?.data ?? subscriptionResult.value ?? null);
    } else {
      setSubscription(null);
    }

    if (roadmapResult.status === 'fulfilled') {
      const data = roadmapResult.value?.data ?? roadmapResult.value;
      setRoadmaps(data?.content ?? (Array.isArray(data) ? data : []));
    } else {
      setRoadmaps([]);
    }

    if (logsResult.status === 'fulfilled') {
      const data = logsResult.value?.data ?? logsResult.value;
      setLogs(Array.isArray(data) ? data : []);
    } else {
      setLogs([]);
    }

    setPanelLoading({
      subscription: false,
      roadmaps: false,
      logs: false,
    });
  };

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      setLoading(true);
      setError('');
      const nextGroup = await fetchGroup();
      if (cancelled) return;
      setLoading(false);

      if (nextGroup) {
        await loadGroupIntel(nextGroup.workspaceId ?? nextGroup.id ?? workspaceId);
      }
    };

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

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
    setLoading(true);
    setError('');
    const nextGroup = await fetchGroup();
    setLoading(false);

    if (nextGroup) {
      await loadGroupIntel(nextGroup.workspaceId ?? nextGroup.id ?? workspaceId);
    }
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
                variant="outline"
                onClick={handleRefresh}
                className={cn(
                  'rounded-2xl px-4',
                  isDarkMode ? 'border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800' : 'border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-50'
                )}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('groupPage.refresh')}
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
                      <Hash className="mr-1.5 h-3.5 w-3.5" />
                      {t('groupDetail.workspaceId')} #{group?.workspaceId ?? group?.id ?? workspaceId}
                    </Badge>
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
                <LoadingState isDarkMode={isDarkMode} />
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
                <LoadingState isDarkMode={isDarkMode} />
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
                <LoadingState isDarkMode={isDarkMode} />
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
                        <span className={cn('text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>{t('groupDetail.workspaceId')}</span>
                        <span className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>#{group?.workspaceId ?? group?.id ?? workspaceId}</span>
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
            <LoadingState isDarkMode={isDarkMode} />
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
            <LoadingState isDarkMode={isDarkMode} />
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
              <LoadingState isDarkMode={isDarkMode} />
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
                { label: t('groupDetail.workspaceId'), value: `#${group?.workspaceId ?? group?.id ?? workspaceId}` },
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
