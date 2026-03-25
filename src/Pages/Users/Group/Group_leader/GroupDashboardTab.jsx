import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Activity, AlertCircle, CheckCircle2, Clock3, Mail, Shield, Upload, UserPlus, Users } from 'lucide-react';
import { useGroup } from '@/hooks/useGroup';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_MEMBER_DAYS = 7;
const ONBOARDING_WINDOW_DAYS = 14;
const INVITATION_ALERT_DAYS = 2;

const toSafeDate = (value) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const daysAgo = (value) => {
  const date = toSafeDate(value);
  return date ? Math.max(0, Math.floor((Date.now() - date.getTime()) / DAY_MS)) : Number.POSITIVE_INFINITY;
};

const daysUntil = (value) => {
  const date = toSafeDate(value);
  return date ? Math.max(0, Math.ceil((date.getTime() - Date.now()) / DAY_MS)) : Number.POSITIVE_INFINITY;
};

const withinDays = (value, days) => daysAgo(value) <= days;

const shortWeekdayLabel = (date, lang) => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'vi-VN', { weekday: 'short' }).format(date);

function createMockMembers(now) {
  return [
    { groupMemberId: 101, userId: 101, username: 'thanh.lead', fullName: 'Thanh Nguyen', role: 'LEADER', canUpload: true, joinedAt: new Date(now - 45 * DAY_MS).toISOString() },
    { groupMemberId: 102, userId: 102, username: 'linh.content', fullName: 'Linh Tran', role: 'CONTRIBUTOR', canUpload: true, joinedAt: new Date(now - 16 * DAY_MS).toISOString() },
    { groupMemberId: 103, userId: 103, username: 'minh.docs', fullName: 'Minh Pham', role: 'CONTRIBUTOR', canUpload: false, joinedAt: new Date(now - 12 * DAY_MS).toISOString() },
    { groupMemberId: 104, userId: 104, username: 'an.newbie', fullName: 'An Vo', role: 'MEMBER', canUpload: false, joinedAt: new Date(now - 2 * DAY_MS).toISOString() },
    { groupMemberId: 105, userId: 105, username: 'khanh.quiz', fullName: 'Khanh Le', role: 'MEMBER', canUpload: false, joinedAt: new Date(now - 5 * DAY_MS).toISOString() },
    { groupMemberId: 106, userId: 106, username: 'ha.review', fullName: 'Ha Do', role: 'MEMBER', canUpload: false, joinedAt: new Date(now - 21 * DAY_MS).toISOString() },
  ];
}

function createMockInvitations(now) {
  return [
    {
      invitationId: 9001,
      invitedEmail: 'study.partner1@gmail.com',
      invitedByUsername: 'thanh.lead',
      invitedByFullName: 'Thanh Nguyen',
      invitedDate: new Date(now - 1 * DAY_MS).toISOString(),
      expiredDate: new Date(now + 1 * DAY_MS).toISOString(),
    },
    {
      invitationId: 9002,
      invitedEmail: 'speaker.club2@gmail.com',
      invitedByUsername: 'thanh.lead',
      invitedByFullName: 'Thanh Nguyen',
      invitedDate: new Date(now - 2 * DAY_MS).toISOString(),
      expiredDate: new Date(now + 3 * DAY_MS).toISOString(),
    },
    {
      invitationId: 9003,
      invitedEmail: 'mentor.reader3@gmail.com',
      invitedByUsername: 'linh.content',
      invitedByFullName: 'Linh Tran',
      invitedDate: new Date(now - 4 * DAY_MS).toISOString(),
      expiredDate: new Date(now + 2 * DAY_MS).toISOString(),
    },
  ];
}

function createMockLogs(now) {
  return [
    { logId: 5001, actorEmail: 'thanh.lead@gmail.com', action: 'INVITATION_SENT', description: 'Invitation sent to study.partner1@gmail.com', logTime: new Date(now - 8 * 60 * 60 * 1000).toISOString() },
    { logId: 5002, actorEmail: 'an.newbie@gmail.com', action: 'MEMBER_JOINED', description: 'an.newbie@gmail.com joined the group', logTime: new Date(now - 1 * DAY_MS).toISOString() },
    { logId: 5003, actorEmail: 'thanh.lead@gmail.com', action: 'INVITATION_SENT', description: 'Invitation sent to speaker.club2@gmail.com', logTime: new Date(now - 2 * DAY_MS).toISOString() },
    { logId: 5004, actorEmail: 'linh.content@gmail.com', action: 'INVITATION_SENT', description: 'Invitation sent to mentor.reader3@gmail.com', logTime: new Date(now - 4 * DAY_MS).toISOString() },
    { logId: 5005, actorEmail: 'thanh.lead@gmail.com', action: 'GROUP_CREATED', description: 'Group workspace created', logTime: new Date(now - 45 * DAY_MS).toISOString() },
  ];
}

function formatDateTime(value, lang, withTime = false) {
  const date = toSafeDate(value);
  if (!date) return lang === 'en' ? 'No date' : 'Chua co ngay';
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function relTime(value, lang) {
  const diff = daysAgo(value);
  if (!Number.isFinite(diff)) return lang === 'en' ? 'Unknown time' : 'Khong ro thoi gian';
  if (diff === 0) return lang === 'en' ? 'Today' : 'Hom nay';
  if (diff === 1) return lang === 'en' ? '1 day ago' : '1 ngay truoc';
  if (diff < 7) return lang === 'en' ? `${diff} days ago` : `${diff} ngay truoc`;
  return lang === 'en' ? `On ${formatDateTime(value, lang)}` : `Vao ${formatDateTime(value, lang)}`;
}

function joinLabel(value, lang) {
  const diff = daysAgo(value);
  if (!Number.isFinite(diff)) return lang === 'en' ? 'Missing join date' : 'Thieu ngay vao nhom';
  if (diff === 0) return lang === 'en' ? 'Joined today' : 'Vao nhom hom nay';
  if (diff === 1) return lang === 'en' ? 'Joined 1 day ago' : 'Vao nhom 1 ngay truoc';
  if (diff < 7) return lang === 'en' ? `Joined ${diff} days ago` : `Vao nhom ${diff} ngay truoc`;
  return lang === 'en' ? `Joined on ${formatDateTime(value, lang)}` : `Vao nhom ngay ${formatDateTime(value, lang)}`;
}

function invitationExpiry(value, lang) {
  const diff = daysUntil(value);
  if (!Number.isFinite(diff)) return lang === 'en' ? 'No expiry' : 'Khong ro han';
  if (diff === 0) return lang === 'en' ? 'Expires today' : 'Het han hom nay';
  if (diff === 1) return lang === 'en' ? 'Expires in 1 day' : 'Het han sau 1 ngay';
  return lang === 'en' ? `Expires in ${diff} days` : `Het han sau ${diff} ngay`;
}

function logMeta(action, isDarkMode) {
  if (action === 'GROUP_CREATED') return { icon: Users, tone: isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700' };
  if (String(action).startsWith('INVITATION_')) return { icon: Mail, tone: isDarkMode ? 'bg-violet-400/10 text-violet-100' : 'bg-violet-50 text-violet-700' };
  if (action === 'MEMBER_JOINED') return { icon: UserPlus, tone: isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700' };
  return { icon: Activity, tone: isDarkMode ? 'bg-white/[0.08] text-slate-200' : 'bg-slate-100 text-slate-700' };
}

function logLabel(action, lang) {
  const labels = {
    GROUP_CREATED: lang === 'en' ? 'Group created' : 'Tao nhom',
    INVITATION_SENT: lang === 'en' ? 'Invitation sent' : 'Gui loi moi',
    INVITATION_PENDING: lang === 'en' ? 'Invitation active' : 'Loi moi dang mo',
    INVITATION_ACCEPTED: lang === 'en' ? 'Invitation accepted' : 'Loi moi da nhan',
    INVITATION_EXPIRED: lang === 'en' ? 'Invitation expired' : 'Loi moi het han',
    MEMBER_JOINED: lang === 'en' ? 'Member joined' : 'Thanh vien vao nhom',
  };
  return labels[action] || (lang === 'en' ? 'Activity' : 'Hoat dong');
}

function GroupDashboardTab({ isDarkMode, group, members = [], membersLoading, isLeader = false, compactMode = false }) {
  const { t, i18n } = useTranslation();
  const { fetchPendingInvitations, fetchGroupLogs } = useGroup({ enabled: false });
  const lang = i18n.language;
  const fontClass = lang === 'en' ? 'font-poppins' : 'font-sans';
  const workspaceId = group?.workspaceId;
  const canPreviewMock = import.meta.env.DEV;
  const [useMockPreview, setUseMockPreview] = React.useState(canPreviewMock);
  const [previewNow] = React.useState(() => Date.now());

  const { data: pending = { count: 0, invitations: [] }, isLoading: pendingLoading } = useQuery({
    queryKey: ['group-pending-invitations', workspaceId],
    queryFn: () => fetchPendingInvitations(workspaceId),
    enabled: Boolean(isLeader && workspaceId && !useMockPreview),
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['group-activity-logs', workspaceId],
    queryFn: () => fetchGroupLogs(workspaceId),
    enabled: Boolean(workspaceId && !useMockPreview),
  });

  const previewMembers = createMockMembers(previewNow);
  const previewInvitations = createMockInvitations(previewNow);
  const previewLogs = createMockLogs(previewNow);
  const dashboardGroup = useMockPreview
    ? {
      ...group,
      groupName: group?.groupName || group?.displayTitle || group?.name || 'IELTS Sprint Team',
      displayTitle: group?.displayTitle || group?.groupName || group?.name || 'IELTS Sprint Team',
      name: group?.name || group?.groupName || group?.displayTitle || 'IELTS Sprint Team',
    }
    : group;
  const dashboardIsLeader = useMockPreview ? true : isLeader;
  const rosterSource = useMockPreview ? previewMembers : members;
  const pendingSource = useMockPreview ? { count: previewInvitations.length, invitations: previewInvitations } : pending;
  const logsSource = useMockPreview ? previewLogs : logs;
  const membersLoadingState = useMockPreview ? false : membersLoading;
  const pendingLoadingState = useMockPreview ? false : pendingLoading;
  const logsLoadingState = useMockPreview ? false : logsLoading;

  const roster = rosterSource.map((member) => ({ ...member, joinedDate: toSafeDate(member.joinedAt) }))
    .sort((a, b) => (b.joinedDate?.getTime() ?? 0) - (a.joinedDate?.getTime() ?? 0));

  const totalMembers = roster.length;
  const leaders = roster.filter((member) => member.role === 'LEADER').length;
  const contributors = roster.filter((member) => member.role === 'CONTRIBUTOR').length;
  const canUpload = roster.filter((member) => member.canUpload).length;
  const newThisWeek = roster.filter((member) => withinDays(member.joinedAt, RECENT_MEMBER_DAYS)).length;
  const onboardingMembers = roster.filter((member) => member.role === 'MEMBER' && withinDays(member.joinedAt, ONBOARDING_WINDOW_DAYS));
  const contributorNoUpload = roster.filter((member) => member.role === 'CONTRIBUTOR' && !member.canUpload);
  const openInvitations = dashboardIsLeader ? (Number(pendingSource.count) || 0) : 0;
  const expiringSoon = pendingSource.invitations.filter((item) => daysUntil(item.expiredDate) <= INVITATION_ALERT_DAYS);
  const activityThisWeek = logsSource.filter((log) => withinDays(log.logTime, RECENT_MEMBER_DAYS)).length;
  const uploadCoverage = totalMembers ? Math.round((canUpload / totalMembers) * 100) : 0;
  const coordinatorCoverage = totalMembers ? Math.round(((leaders + contributors) / totalMembers) * 100) : 0;

  const attentionItems = [];
  if (dashboardIsLeader && openInvitations > 0) attentionItems.push({
    id: 'open-invitations',
    icon: Mail,
    tone: isDarkMode ? 'bg-violet-400/10 text-violet-100' : 'bg-violet-50 text-violet-700',
    title: lang === 'en' ? `${openInvitations} invitation(s) still open` : `${openInvitations} loi moi dang mo`,
    note: expiringSoon.length > 0
      ? (lang === 'en' ? `${expiringSoon.length} invitation(s) expire soon.` : `${expiringSoon.length} loi moi sap het han.`)
      : (lang === 'en' ? 'Keep the queue short and current.' : 'Nen giu hang doi loi moi gon va moi.'),
  });
  if (totalMembers > 1 && contributors === 0) attentionItems.push({
    id: 'missing-contributor',
    icon: AlertCircle,
    tone: isDarkMode ? 'bg-rose-400/10 text-rose-100' : 'bg-rose-50 text-rose-700',
    title: lang === 'en' ? 'No contributor assigned' : 'Chua co contributor',
    note: lang === 'en' ? 'Add at least one contributor to share content ownership.' : 'Nen co it nhat 1 contributor de chia lane noi dung.',
  });
  contributorNoUpload.slice(0, 2).forEach((member) => attentionItems.push({
    id: `upload-${member.groupMemberId ?? member.userId}`,
    icon: Upload,
    tone: isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700',
    title: lang === 'en' ? `${member.fullName || member.username} needs upload review` : `${member.fullName || member.username} can xem quyen upload`,
    note: lang === 'en' ? 'Contributor lane is set but source upload is still blocked.' : 'Da o lane contributor nhung van chua them duoc tai lieu.',
  }));
  onboardingMembers.slice(0, 2).forEach((member) => attentionItems.push({
    id: `onboarding-${member.groupMemberId ?? member.userId}`,
    icon: UserPlus,
    tone: isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700',
    title: lang === 'en' ? `${member.fullName || member.username} just joined` : `${member.fullName || member.username} vua vao nhom`,
    note: lang === 'en' ? 'Assign a first task early.' : 'Nen giao nhiem vu dau tien som.',
  }));

  const watchlist = [];
  const seen = new Set();
  [...onboardingMembers, ...contributorNoUpload, ...roster].forEach((member) => {
    const key = String(member.groupMemberId ?? member.userId ?? member.username);
    if (!key || seen.has(key) || watchlist.length >= 6) return;
    seen.add(key);
    watchlist.push(member);
  });

  const cardClass = `rounded-[28px] border ${isDarkMode ? 'border-white/10 bg-[#08131a]/92' : 'border-white/80 bg-white/82'}`;
  const innerCardClass = isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-white/80 bg-white/78';
  const subtleTextClass = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const eyebrowClass = 'text-slate-500';

  const roleBadgeClass = (role) => {
    if (role === 'LEADER') return isDarkMode ? 'border-amber-400/20 bg-amber-400/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-700';
    if (role === 'CONTRIBUTOR') return isDarkMode ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-700';
    return isDarkMode ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  };

  const watchStatus = (member) => {
    if (member.role === 'CONTRIBUTOR' && !member.canUpload) return { label: lang === 'en' ? 'Needs upload review' : 'Can xem quyen upload', className: isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700' };
    if (member.canUpload) return { label: lang === 'en' ? 'Ready to contribute' : 'San sang dong gop', className: isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700' };
    if (withinDays(member.joinedAt, ONBOARDING_WINDOW_DAYS)) return { label: lang === 'en' ? 'Onboarding window' : 'Dang onboarding', className: isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700' };
    return { label: lang === 'en' ? 'Observe participation' : 'Theo doi tham gia', className: isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700' };
  };

  const stats = [
    { label: lang === 'en' ? 'Total members' : 'Tong thanh vien', value: totalMembers, note: lang === 'en' ? 'full roster' : 'toan bo roster', icon: Users, tone: isDarkMode ? 'bg-cyan-400/10 text-cyan-200' : 'bg-cyan-50 text-cyan-700' },
    { label: lang === 'en' ? 'New this week' : 'Moi tuan nay', value: newThisWeek, note: lang === 'en' ? 'recent joiners' : 'thanh vien moi', icon: UserPlus, tone: isDarkMode ? 'bg-emerald-400/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700' },
    { label: lang === 'en' ? 'Coordination lanes' : 'Lane dieu phoi', value: leaders + contributors, note: `${coordinatorCoverage}% ${lang === 'en' ? 'of roster' : 'roster'}`, icon: Shield, tone: isDarkMode ? 'bg-violet-400/10 text-violet-200' : 'bg-violet-50 text-violet-700' },
    { label: lang === 'en' ? 'Upload ready' : 'San sang upload', value: canUpload, note: `${uploadCoverage}% ${lang === 'en' ? 'can add sources' : 'co the them tai lieu'}`, icon: Upload, tone: isDarkMode ? 'bg-amber-400/10 text-amber-200' : 'bg-amber-50 text-amber-700' },
  ];

  const roleChartData = [
    { key: 'leader', label: lang === 'en' ? 'Leader' : 'Leader', value: leaders, color: 'bg-amber-500' },
    { key: 'contributor', label: lang === 'en' ? 'Contributor' : 'Contributor', value: contributors, color: 'bg-cyan-500' },
    { key: 'member', label: lang === 'en' ? 'Member' : 'Member', value: Math.max(0, totalMembers - leaders - contributors), color: 'bg-emerald-500' },
  ];

  const maxRoleCount = Math.max(1, ...roleChartData.map((item) => item.value));

  const activityChartData = Array.from({ length: 7 }).map((_, index) => {
    const offset = 6 - index;
    const day = new Date(previewNow - offset * DAY_MS);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const dayEnd = dayStart + DAY_MS;
    const count = logsSource.filter((log) => {
      const logDate = toSafeDate(log.logTime);
      if (!logDate) return false;
      const value = logDate.getTime();
      return value >= dayStart && value < dayEnd;
    }).length;

    return {
      key: `${dayStart}`,
      label: shortWeekdayLabel(day, lang),
      count,
    };
  });

  const maxActivityCount = Math.max(1, ...activityChartData.map((item) => item.count));

  if (compactMode) {
    return (
      <div className={`space-y-4 animate-in fade-in duration-300 ${fontClass}`}>
        <section className={`${cardClass} p-5`}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${eyebrowClass}`}>{lang === 'en' ? 'System dashboard' : 'Dashboard hệ thống'}</p>
          <h2 className={`mt-2 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{dashboardGroup?.groupName || dashboardGroup?.displayTitle || dashboardGroup?.name || 'Group'}</h2>
          <p className={`mt-2 text-sm ${subtleTextClass}`}>{lang === 'en' ? 'High-level health and activity signals for the group.' : 'Tổng quan sức khỏe và tín hiệu hoạt động của nhóm.'}</p>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`${cardClass} p-4`}>
                <div className="flex items-center justify-between">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.tone}`}><Icon className="h-4 w-4" /></span>
                  <span className={`text-[10px] uppercase tracking-[0.14em] ${eyebrowClass}`}>{lang === 'en' ? 'metric' : 'chỉ số'}</span>
                </div>
                <p className={`mt-3 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{membersLoadingState ? '...' : stat.value}</p>
                <p className={`mt-1 text-sm ${subtleTextClass}`}>{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <section className={`${cardClass} p-4`}>
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {lang === 'en' ? 'Role distribution' : 'Phân bố vai trò'}
            </h3>
            <div className="mt-3 space-y-3">
              {roleChartData.map((item) => (
                <div key={item.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{item.label}</span>
                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{item.value}</span>
                  </div>
                  <div className={`h-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${Math.max(6, Math.round((item.value / maxRoleCount) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${cardClass} p-4`}>
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {lang === 'en' ? '7-day activity trend' : 'Xu hướng hoạt động 7 ngày'}
            </h3>
            <div className="mt-3 flex items-end gap-2 h-28">
              {activityChartData.map((item) => (
                <div key={item.key} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div
                    className={`w-full rounded-t ${isDarkMode ? 'bg-cyan-400/80' : 'bg-cyan-500/80'}`}
                    style={{ height: `${Math.max(6, Math.round((item.count / maxActivityCount) * 100))}%` }}
                    title={`${item.label}: ${item.count}`}
                  />
                  <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 animate-in fade-in duration-300 ${fontClass}`}>
      <section className={`${cardClass} p-6 lg:p-7`}>
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${eyebrowClass}`}>{lang === 'en' ? 'Group dashboard' : 'Bang theo doi nhom'}</p>
            <h2 className={`mt-2 truncate text-2xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{dashboardGroup?.groupName || dashboardGroup?.displayTitle || dashboardGroup?.name || 'Group'}</h2>
            <p className={`mt-3 max-w-3xl text-sm leading-6 ${subtleTextClass}`}>{lang === 'en' ? 'Focus on who needs follow-up, which invitations are still open, and what changed most recently.' : 'Tap trung vao ai can follow-up, loi moi nao dang mo, va nhom vua thay doi dieu gi.'}</p>
            {canPreviewMock ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${useMockPreview ? (isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700') : (isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700')}`}>
                  {useMockPreview
                    ? (lang === 'en' ? 'Mock preview active' : 'Dang xem mock preview')
                    : (lang === 'en' ? 'Real data mode' : 'Dang xem du lieu that')}
                </span>
                <button
                  type="button"
                  onClick={() => setUseMockPreview((prev) => !prev)}
                  className={`inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all active:scale-95 ${
                    isDarkMode
                      ? 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.10]'
                      : 'border-white/80 bg-white text-slate-700 hover:bg-white'
                  }`}
                >
                  {useMockPreview
                    ? (lang === 'en' ? 'Show real data' : 'Xem du lieu that')
                    : (lang === 'en' ? 'Show mock data' : 'Xem mock data')}
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`rounded-[22px] border px-4 py-4 ${innerCardClass}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>{lang === 'en' ? 'Invitation queue' : 'Hang doi loi moi'}</p>
              <p className={`mt-3 text-xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{!dashboardIsLeader ? '—' : pendingLoadingState ? '...' : openInvitations}</p>
              <p className={`mt-2 text-sm ${subtleTextClass}`}>{!dashboardIsLeader ? (lang === 'en' ? 'leaders only' : 'chi leader xem') : expiringSoon.length > 0 ? `${expiringSoon.length} ${lang === 'en' ? 'expiring soon' : 'sap het han'}` : (lang === 'en' ? 'currently open' : 'dang mo')}</p>
            </div>
            <div className={`rounded-[22px] border px-4 py-4 ${innerCardClass}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>{lang === 'en' ? 'Activity this week' : 'Hoat dong tuan nay'}</p>
              <p className={`mt-3 text-xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{logsLoadingState ? '...' : activityThisWeek}</p>
              <p className={`mt-2 text-sm ${subtleTextClass}`}>{lang === 'en' ? 'recent events on log' : 'su kien moi trong log'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${cardClass} p-5`}>
              <div className="mb-4 flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.tone}`}><Icon className="h-5 w-5" /></div>
                <span className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>{lang === 'en' ? 'Tracking' : 'Theo doi'}</span>
              </div>
              <p className={`text-3xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{membersLoadingState ? '...' : stat.value}</p>
              <p className={`mt-2 text-sm ${subtleTextClass}`}>{stat.label}</p>
              <p className={`mt-4 text-xs leading-5 ${eyebrowClass}`}>{stat.note}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={`${cardClass} p-6`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {lang === 'en' ? 'Role distribution chart' : 'Biểu đồ phân bố vai trò'}
          </h3>
          <p className={`mt-1 text-sm ${subtleTextClass}`}>
            {lang === 'en' ? 'Compare role load across leader, contributor, and member lanes.' : 'So sánh tải vai trò giữa leader, contributor và member.'}
          </p>
          <div className="mt-5 space-y-4">
            {roleChartData.map((item) => (
              <div key={item.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{item.label}</span>
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{item.value}</span>
                </div>
                <div className={`h-3 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div
                    className={`h-3 rounded-full ${item.color}`}
                    style={{ width: `${Math.max(8, Math.round((item.value / maxRoleCount) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`${cardClass} p-6`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {lang === 'en' ? 'Weekly activity chart' : 'Biểu đồ hoạt động theo tuần'}
          </h3>
          <p className={`mt-1 text-sm ${subtleTextClass}`}>
            {lang === 'en' ? 'Track event volume from activity logs by day.' : 'Theo dõi số lượng sự kiện theo từng ngày từ activity log.'}
          </p>
          <div className="mt-5 flex items-end gap-3 h-44">
            {activityChartData.map((item) => (
              <div key={item.key} className="flex-1 flex flex-col items-center justify-end gap-2">
                <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.count}</span>
                <div
                  className={`w-full rounded-t-md ${isDarkMode ? 'bg-cyan-400/80' : 'bg-cyan-500/80'}`}
                  style={{ height: `${Math.max(8, Math.round((item.count / maxActivityCount) * 100))}%` }}
                  title={`${item.label}: ${item.count}`}
                />
                <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className={`${cardClass} p-6`}>
          <div className="flex items-center gap-2">
            <Clock3 className={`h-5 w-5 ${isDarkMode ? 'text-cyan-200' : 'text-cyan-600'}`} />
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{lang === 'en' ? 'What needs attention' : 'Dieu can chu y'}</h3>
          </div>
          <div className="mt-5 space-y-3">
            {attentionItems.length === 0 ? (
              <div className={`rounded-[22px] border px-4 py-5 ${innerCardClass}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-emerald-400/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700'}`}><CheckCircle2 className="h-4 w-4" /></div>
                  <div><p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{lang === 'en' ? 'No urgent gap right now' : 'Hien chua co diem nghen khan cap'}</p><p className={`mt-1 text-sm leading-6 ${subtleTextClass}`}>{lang === 'en' ? 'The roster looks stable. Keep watching the log and invitation queue.' : 'Roster dang on. Tiep tuc nhin log va hang doi loi moi.'}</p></div>
                </div>
              </div>
            ) : attentionItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className={`rounded-[22px] border px-4 py-4 ${innerCardClass}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.tone}`}><Icon className="h-4 w-4" /></div>
                    <div><p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</p><p className={`mt-1 text-sm leading-6 ${subtleTextClass}`}>{item.note}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`${cardClass} p-6`}>
          <div className="flex items-center gap-2">
            <Mail className={`h-5 w-5 ${isDarkMode ? 'text-violet-200' : 'text-violet-600'}`} />
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{lang === 'en' ? 'Current invitations' : 'Loi moi hien co'}</h3>
          </div>
          <p className={`mt-2 text-sm leading-6 ${subtleTextClass}`}>{lang === 'en' ? 'See who was invited, when the invitation was sent, and which requests are close to expiry.' : 'Xem ai da duoc moi, gui luc nao, va loi moi nao sap het han.'}</p>
          <div className="mt-5 space-y-3">
            {!dashboardIsLeader ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{lang === 'en' ? 'Only leaders can review this queue.' : 'Chi leader moi can theo doi hang doi nay.'}</div>
            ) : pendingLoadingState ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{lang === 'en' ? 'Loading invitations...' : 'Dang tai loi moi...'}</div>
            ) : pendingSource.invitations.length === 0 ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{lang === 'en' ? 'No invitations waiting right now.' : 'Hien chua co loi moi nao dang cho.'}</div>
            ) : pendingSource.invitations.slice(0, 5).map((item) => {
              const expiring = daysUntil(item.expiredDate) <= INVITATION_ALERT_DAYS;
              const badgeClass = expiring ? (isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700') : (isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700');
              return (
                <div key={item.invitationId ?? item.invitedEmail} className={`rounded-[22px] border px-4 py-4 ${innerCardClass}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`break-all text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.invitedEmail}</p>
                      <p className={`mt-1 text-xs ${eyebrowClass}`}>{lang === 'en' ? 'Invited by' : 'Nguoi moi'} {item.invitedByFullName || item.invitedByUsername || 'Leader'}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>{invitationExpiry(item.expiredDate, lang)}</span>
                  </div>
                  <div className={`mt-3 flex flex-wrap items-center gap-3 text-xs ${subtleTextClass}`}>
                    <span>{lang === 'en' ? 'Sent' : 'Gui'} {formatDateTime(item.invitedDate, lang, true)}</span>
                    <span>{lang === 'en' ? 'Status: pending' : 'Trang thai: dang cho'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className={`${cardClass} p-6`}>
          <div className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${isDarkMode ? 'text-cyan-200' : 'text-cyan-600'}`} />
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{lang === 'en' ? 'Member watchlist' : 'Danh sach theo doi thanh vien'}</h3>
          </div>
          <div className="mt-5 grid gap-3">
            {membersLoadingState ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{lang === 'en' ? 'Preparing watchlist...' : 'Dang chuan bi watchlist...'}</div>
            ) : watchlist.length === 0 ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{lang === 'en' ? 'No members to watch yet.' : 'Chua co thanh vien de theo doi.'}</div>
            ) : watchlist.map((member) => {
              const status = watchStatus(member);
              return (
                <div key={member.groupMemberId ?? member.userId ?? member.username} className={`grid gap-3 rounded-[24px] border px-4 py-4 md:grid-cols-[minmax(0,1.1fr)_auto_auto] md:items-center ${innerCardClass}`}>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{member.fullName || member.username}</p>
                    <p className={`mt-1 text-xs ${eyebrowClass}`}>@{member.username || 'unknown'} · {joinLabel(member.joinedAt, lang)}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${roleBadgeClass(member.role)}`}>{member.role === 'LEADER' ? t('home.group.leader') : member.role === 'CONTRIBUTOR' ? t('home.group.contributor') : t('home.group.member')}</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`${cardClass} p-6`}>
          <div className="flex items-center gap-2">
            <Activity className={`h-5 w-5 ${isDarkMode ? 'text-emerald-200' : 'text-emerald-600'}`} />
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{lang === 'en' ? 'Group activity log' : 'Activity log cua nhom'}</h3>
          </div>
          <p className={`mt-2 text-sm leading-6 ${subtleTextClass}`}>{lang === 'en' ? 'A compact timeline of the most recent changes in the group.' : 'Timeline gon cua cac thay doi gan nhat trong nhom.'}</p>
          <div className="mt-5 space-y-3">
            {logsLoadingState ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{lang === 'en' ? 'Loading activity log...' : 'Dang tai activity log...'}</div>
            ) : logsSource.length === 0 ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{lang === 'en' ? 'No group activity recorded yet.' : 'Chua co hoat dong nao duoc ghi lai.'}</div>
            ) : logsSource.slice(0, 8).map((log) => {
              const { icon: Icon, tone } = logMeta(log.action, isDarkMode);
              return (
                <div key={`${log.logId ?? 'synthetic'}-${log.action}-${log.logTime}-${log.actorEmail ?? 'system'}`} className={`rounded-[22px] border px-4 py-4 ${innerCardClass}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700'}`}>{logLabel(log.action, lang)}</span>
                        <span className={`text-xs ${eyebrowClass}`}>{relTime(log.logTime, lang)}</span>
                      </div>
                      <p className={`mt-2 text-sm font-semibold leading-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{log.description || (lang === 'en' ? 'Group activity updated' : 'Hoat dong nhom duoc cap nhat')}</p>
                      <p className={`mt-1 text-xs leading-5 ${subtleTextClass}`}>{log.actorEmail || (lang === 'en' ? 'System' : 'He thong')} · {formatDateTime(log.logTime, lang, true)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default GroupDashboardTab;
