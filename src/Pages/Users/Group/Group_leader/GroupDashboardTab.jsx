import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  PenLine,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useGroup } from '@/hooks/useGroup';
import { formatGroupLogDescription } from '@/lib/groupWorkspaceLogDisplay';
import { Button } from '@/Components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';
import { getUserDisplayLabel } from '@/Utils/userProfile';
import UserDisplayName from '@/Components/users/UserDisplayName';

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

const startOfDayMs = (value) => {
  const date = toSafeDate(value);
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() : null;
};

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
  if (String(action).startsWith('QUIZ_')) return { icon: PenLine, tone: isDarkMode ? 'bg-rose-400/10 text-rose-100' : 'bg-rose-50 text-rose-700' };
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
    QUIZ_CREATED_IN_GROUP: lang === 'en' ? 'Quiz created' : 'Tao quiz',
    QUIZ_PUBLISHED_IN_GROUP: lang === 'en' ? 'Quiz published' : 'Xuat ban quiz',
    QUIZ_AUDIENCE_UPDATED_IN_GROUP: lang === 'en' ? 'Quiz assignment' : 'Giao quiz',
    QUIZ_SUBMITTED_IN_GROUP: lang === 'en' ? 'Quiz submitted' : 'Nop quiz',
  };
  return labels[action] || (lang === 'en' ? 'Activity' : 'Hoat dong');
}

function classificationLabel(code, lang) {
  const c = String(code || '').toUpperCase();
  const map = {
    STRONG: lang === 'en' ? 'Strong' : 'Tốt',
    AVERAGE: lang === 'en' ? 'Average' : 'Trung bình',
    WEAK: lang === 'en' ? 'Needs support' : 'Cần hỗ trợ',
    AT_RISK: lang === 'en' ? 'At risk' : 'Rủi ro',
  };
  return map[c] || c || '—';
}

function formatPctRatio(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${Math.round(Number(n) * 1000) / 10}%`;
}

const PIE_CLASSIFICATION_COLORS = ['#22d3ee', '#a78bfa', '#fbbf24', '#fb7185'];

const MEMBER_CARD_PAGE_SIZE = 8;

function GroupDashboardTab({
  isDarkMode,
  group,
  members = [],
  membersLoading,
  isLeader = false,
  compactMode = false,
  currentUserId,
  hasWorkspaceAnalytics = false,
  onRequestAnalyticsUpgrade,
}) {
  const { t, i18n } = useTranslation();
  const {
    fetchPendingInvitations,
    fetchGroupLogs,
    fetchGroupDashboardSummary,
    fetchMemberDashboardCards,
    fetchMemberDashboardDetail,
  } = useGroup({ enabled: false });
  const lang = i18n.language;
  const fontClass = lang === 'en' ? 'font-poppins' : 'font-sans';
  const workspaceId = group?.workspaceId;
  const dashboardTitle = group?.groupName || group?.displayTitle || group?.name || 'Group';

  const { data: pending = { count: 0, invitations: [] }, isLoading: pendingLoading } = useQuery({
    queryKey: ['group-pending-invitations', workspaceId],
    queryFn: () => fetchPendingInvitations(workspaceId),
    enabled: Boolean(isLeader && workspaceId),
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['group-activity-logs', workspaceId],
    queryFn: () => fetchGroupLogs(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const [detailUserId, setDetailUserId] = useState(null);
  const [detailAttemptMode, setDetailAttemptMode] = useState('ALL');
  const [memberCardPage, setMemberCardPage] = useState(0);

  const analyticsEnabled = Boolean(isLeader && workspaceId && hasWorkspaceAnalytics);

  const { data: learningSummary, isLoading: summaryLoading, isError: summaryError } = useQuery({
    queryKey: ['group-dashboard-summary', workspaceId],
    queryFn: () => fetchGroupDashboardSummary(workspaceId),
    enabled: analyticsEnabled,
  });

  const { data: memberCardsPage, isLoading: cardsLoading } = useQuery({
    queryKey: ['group-dashboard-member-cards', workspaceId, memberCardPage, MEMBER_CARD_PAGE_SIZE],
    queryFn: () => fetchMemberDashboardCards(workspaceId, memberCardPage, MEMBER_CARD_PAGE_SIZE),
    enabled: analyticsEnabled,
  });

  const { data: memberDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['group-member-dashboard-detail', workspaceId, detailUserId, detailAttemptMode],
    queryFn: () => fetchMemberDashboardDetail(workspaceId, detailUserId, detailAttemptMode),
    enabled: Boolean(analyticsEnabled && detailUserId != null),
  });

  const memberLearningCards = useMemo(() => {
    const raw = memberCardsPage?.content;
    return Array.isArray(raw) ? raw : [];
  }, [memberCardsPage]);

  const scoreLeaderboard = useMemo(() => {
    return [...memberLearningCards]
      .filter((m) => (m.quizCompletedCount || 0) > 0 && m.averageScore != null)
      .sort((a, b) => (Number(b.averageScore) || 0) - (Number(a.averageScore) || 0))
      .slice(0, 10)
      .map((m) => {
        const raw = getUserDisplayLabel(m, '?');
        const label = raw.length > 12 ? `${raw.slice(0, 12)}…` : raw;
        return {
          userId: m.userId,
          label,
          score: Math.round(Number(m.averageScore) * 10) / 10,
        };
      });
  }, [memberLearningCards]);

  const classificationPieData = useMemo(() => {
    const src = learningSummary?.aiClassificationCounts;
    if (!src || typeof src !== 'object') return [];
    return Object.entries(src).map(([key, value]) => ({
      name: classificationLabel(key, lang),
      value: Number(value) || 0,
      key,
    })).filter((d) => d.value > 0);
  }, [learningSummary, lang]);

  const roster = members.map((member) => ({ ...member, joinedDate: toSafeDate(member.joinedAt) }))
    .sort((a, b) => (b.joinedDate?.getTime() ?? 0) - (a.joinedDate?.getTime() ?? 0));

  const totalMembers = roster.length;
  const leaders = roster.filter((member) => member.role === 'LEADER').length;
  const contributors = roster.filter((member) => member.role === 'CONTRIBUTOR').length;
  const canUpload = roster.filter((member) => member.canUpload).length;
  const newThisWeek = roster.filter((member) => withinDays(member.joinedAt, RECENT_MEMBER_DAYS)).length;
  const onboardingMembers = roster.filter((member) => member.role === 'MEMBER' && withinDays(member.joinedAt, ONBOARDING_WINDOW_DAYS));
  const contributorNoUpload = roster.filter((member) => member.role === 'CONTRIBUTOR' && !member.canUpload);
  const openInvitations = isLeader ? (Number(pending.count) || 0) : 0;
  const expiringSoon = pending.invitations.filter((item) => daysUntil(item.expiredDate) <= INVITATION_ALERT_DAYS);
  const activityThisWeek = logs.filter((log) => withinDays(log.logTime, RECENT_MEMBER_DAYS)).length;
  const uploadCoverage = totalMembers ? Math.round((canUpload / totalMembers) * 100) : 0;
  const coordinatorCoverage = totalMembers ? Math.round(((leaders + contributors) / totalMembers) * 100) : 0;
  const latestActivityMs = logs.reduce((latest, log) => {
    const logDate = toSafeDate(log.logTime);
    return logDate ? Math.max(latest, logDate.getTime()) : latest;
  }, 0);

  const attentionItems = [];
  if (isLeader && openInvitations > 0) attentionItems.push({
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
    title: lang === 'en' ? `${getUserDisplayLabel(member, 'Member')} needs upload review` : `${getUserDisplayLabel(member, 'Thành viên')} can xem quyen upload`,
    note: lang === 'en' ? 'Contributor lane is set but source upload is still blocked.' : 'Da o lane contributor nhung van chua them duoc tai lieu.',
  }));
  onboardingMembers.slice(0, 2).forEach((member) => attentionItems.push({
    id: `onboarding-${member.groupMemberId ?? member.userId}`,
    icon: UserPlus,
    tone: isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700',
    title: lang === 'en' ? `${getUserDisplayLabel(member, 'Member')} just joined` : `${getUserDisplayLabel(member, 'Thành viên')} vua vao nhom`,
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

  const activityChartData = latestActivityMs
    ? Array.from({ length: 7 }).map((_, index) => {
      const offset = 6 - index;
      const day = new Date(latestActivityMs - offset * DAY_MS);
      const dayStart = startOfDayMs(day);
      const dayEnd = dayStart + DAY_MS;
      const count = logs.filter((log) => {
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
    })
    : [];

  const maxActivityCount = Math.max(1, ...activityChartData.map((item) => item.count));

  const chartTooltipBox = {
    contentStyle: {
      borderRadius: 12,
      border: 'none',
      background: isDarkMode ? '#0f172a' : '#ffffff',
      color: isDarkMode ? '#e2e8f0' : '#0f172a',
      boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
    },
  };
  const axisMuted = isDarkMode ? '#64748b' : '#94a3b8';

  if (compactMode) {
    const learningKpis = [
      {
        label: lang === 'en' ? 'Quiz attempts' : 'Lượt làm quiz',
        value: summaryLoading ? '…' : String(learningSummary?.totalQuizAttempts ?? 0),
        note: lang === 'en' ? 'all members' : 'toàn nhóm',
        icon: BarChart3,
        tone: isDarkMode ? 'bg-cyan-400/15 text-cyan-200' : 'bg-cyan-50 text-cyan-700',
      },
      {
        label: lang === 'en' ? 'Completed' : 'Đã hoàn thành',
        value: summaryLoading ? '…' : String(learningSummary?.totalQuizCompleted ?? 0),
        note: lang === 'en' ? 'submitted sets' : 'bài đã nộp',
        icon: CheckCircle2,
        tone: isDarkMode ? 'bg-emerald-400/15 text-emerald-200' : 'bg-emerald-50 text-emerald-700',
      },
      {
        label: lang === 'en' ? 'Avg score' : 'Điểm TB',
        value: summaryLoading ? '…' : `${Math.round((Number(learningSummary?.groupAverageScore) || 0) * 10) / 10}`,
        note: lang === 'en' ? 'per member w/ completions' : 'theo TV có quiz xong',
        icon: TrendingUp,
        tone: isDarkMode ? 'bg-violet-400/15 text-violet-200' : 'bg-violet-50 text-violet-700',
      },
      {
        label: lang === 'en' ? 'Avg accuracy' : 'Độ chính xác TB',
        value: summaryLoading ? '…' : formatPctRatio(learningSummary?.groupAverageAccuracy),
        note: lang === 'en' ? 'graded answers' : 'câu đã chấm',
        icon: Target,
        tone: isDarkMode ? 'bg-amber-400/15 text-amber-200' : 'bg-amber-50 text-amber-700',
      },
    ];

    const memberCardTotalPages = Number(memberCardsPage?.totalPages) || 0;
    const memberCardTotalElements = Number(memberCardsPage?.totalElements) || 0;
    const showMemberCardPagination = memberCardTotalPages > 1;

    return (
      <div className={`space-y-4 animate-in fade-in duration-300 ${fontClass}`}>
        <section className={`${cardClass} p-5`}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${eyebrowClass}`}>{lang === 'en' ? 'System dashboard' : 'Dashboard hệ thống'}</p>
          <h2 className={`mt-2 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{dashboardTitle}</h2>
          <p className={`mt-2 text-sm ${subtleTextClass}`}>{lang === 'en' ? 'High-level health and activity signals for the group.' : 'Tổng quan sức khỏe và tín hiệu hoạt động của nhóm.'}</p>
        </section>

        {isLeader && workspaceId && hasWorkspaceAnalytics ? (
          <section
            className={cn(
              cardClass,
              'overflow-hidden p-0 ring-1',
              isDarkMode ? 'ring-cyan-400/25' : 'ring-cyan-500/20',
            )}
          >
            <div
              className={cn(
                'relative overflow-hidden px-5 py-4',
                isDarkMode
                  ? 'bg-gradient-to-r from-cyan-950/90 via-slate-950/50 to-slate-950/30'
                  : 'bg-gradient-to-r from-cyan-50 via-white to-slate-50/80',
              )}
            >
              <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-cyan-400/25 blur-3xl" aria-hidden="true" />
              <div className="relative flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-2xl',
                    isDarkMode ? 'bg-cyan-400/15 text-cyan-200' : 'bg-cyan-100 text-cyan-700',
                  )}
                >
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${eyebrowClass}`}>
                    {lang === 'en' ? 'Learning intelligence' : 'Trí tuệ học tập'}
                  </p>
                  <p className={`mt-1 text-sm leading-relaxed ${subtleTextClass}`}>
                    {lang === 'en'
                      ? 'Live aggregates from quiz attempts, scores, and AI classification — tap any card to inspect a member.'
                      : 'Số liệu real-time từ quiz, điểm và phân loại AI — chạm thẻ để xem chi tiết thành viên.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {summaryError ? (
                <p className={`rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? 'border-rose-400/30 bg-rose-400/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                  {lang === 'en' ? 'Could not load learning summary. Try again later.' : 'Không tải được thống kê học tập. Thử lại sau.'}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {learningKpis.map((k) => {
                  const Icon = k.icon;
                  return (
                    <div key={k.label} className={cn('rounded-[22px] border p-4', innerCardClass)}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', k.tone)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${eyebrowClass}`}>
                          {lang === 'en' ? 'live' : 'thời gian thực'}
                        </span>
                      </div>
                      <p className={cn('mt-3 text-2xl font-black tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>{k.value}</p>
                      <p className={cn('mt-1 text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-slate-800')}>{k.label}</p>
                      <p className={cn('mt-2 text-xs leading-relaxed', subtleTextClass)}>{k.note}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className={cn('rounded-[22px] border p-4', innerCardClass)}>
                  <div className="mb-1 flex items-center gap-2">
                    <TrendingUp className={cn('h-4 w-4', isDarkMode ? 'text-cyan-300' : 'text-cyan-600')} />
                    <h3 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {lang === 'en' ? 'Score spotlight' : 'Điểm nổi bật'}
                    </h3>
                  </div>
                  <p className={`text-xs ${subtleTextClass}`}>
                    {lang === 'en'
                      ? `On this page (${MEMBER_CARD_PAGE_SIZE} members / page) — ranked by score.`
                      : `Trên trang hiện tại (${MEMBER_CARD_PAGE_SIZE} TV/trang) — xếp theo điểm.`}
                  </p>
                  <div className="mt-4 h-52 w-full min-h-[13rem]">
                    {cardsLoading ? (
                      <div className={`flex h-full items-center justify-center text-sm ${subtleTextClass}`}>…</div>
                    ) : scoreLeaderboard.length === 0 ? (
                      <div className={`flex h-full items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm ${subtleTextClass}`}>
                        {lang === 'en' ? 'No completed quiz data yet.' : 'Chưa có dữ liệu quiz hoàn thành.'}
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={scoreLeaderboard} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1e293b' : '#e2e8f0'} vertical={false} />
                          <XAxis dataKey="label" tick={{ fill: axisMuted, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={48} />
                          <YAxis tick={{ fill: axisMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                          <Tooltip cursor={{ fill: isDarkMode ? 'rgba(34,211,238,0.08)' : 'rgba(6,182,212,0.12)' }} contentStyle={chartTooltipBox.contentStyle} />
                          <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={28}>
                            {scoreLeaderboard.map((_, i) => (
                              <Cell key={`cell-bar-${i}`} fill={isDarkMode ? '#22d3ee' : '#0891b2'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className={cn('rounded-[22px] border p-4', innerCardClass)}>
                  <div className="mb-1 flex items-center gap-2">
                    <Brain className={cn('h-4 w-4', isDarkMode ? 'text-violet-300' : 'text-violet-600')} />
                    <h3 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {lang === 'en' ? 'AI classification mix' : 'Phân loại AI'}
                    </h3>
                  </div>
                  <p className={`text-xs ${subtleTextClass}`}>
                    {lang === 'en' ? 'From member learning profiles when available.' : 'Theo hồ sơ học tập khi đã có dữ liệu.'}
                  </p>
                  <div className="mt-4 flex h-52 items-center justify-center">
                    {summaryLoading ? (
                      <span className={`text-sm ${subtleTextClass}`}>…</span>
                    ) : classificationPieData.length === 0 ? (
                      <div className={`rounded-xl border border-dashed px-4 py-6 text-center text-sm ${subtleTextClass}`}>
                        {lang === 'en' ? 'No AI labels yet.' : 'Chưa có nhãn AI.'}
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={classificationPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={44}
                            outerRadius={72}
                            paddingAngle={3}
                          >
                            {classificationPieData.map((entry, index) => (
                              <Cell key={entry.key} fill={PIE_CLASSIFICATION_COLORS[index % PIE_CLASSIFICATION_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={chartTooltipBox.contentStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className={`mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] ${eyebrowClass}`}>
                  {lang === 'en' ? 'Member intelligence cards' : 'Thẻ thông minh thành viên'}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {cardsLoading ? (
                    <div className={`col-span-full rounded-[22px] border px-4 py-8 text-center text-sm ${innerCardClass} ${subtleTextClass}`}>…</div>
                  ) : memberLearningCards.length === 0 ? (
                    <div className={`col-span-full rounded-[22px] border px-4 py-8 text-center text-sm ${innerCardClass} ${subtleTextClass}`}>
                      {lang === 'en' ? 'No active members to analyze.' : 'Không có thành viên hoạt động.'}
                    </div>
                  ) : (
                    memberLearningCards.map((m) => (
                      <button
                        key={m.userId ?? m.workspaceMemberId}
                        type="button"
                        onClick={() => {
                          setDetailAttemptMode('ALL');
                          setDetailUserId(m.userId);
                        }}
                        className={cn(
                          'rounded-[22px] border p-4 text-left transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60',
                          innerCardClass,
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold',
                              isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-800',
                            )}
                          >
                            {(m.fullName || m.username || '?').trim().slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={cn('truncate font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                              <UserDisplayName user={m} fallback={lang === 'en' ? 'Member' : 'Thành viên'} isDarkMode={isDarkMode} />
                            </p>
                            <p className={`mt-0.5 text-xs ${eyebrowClass}`}>{m.email || (m.username ? `@${m.username}` : '')}</p>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                              <div className={cn('rounded-xl border px-1 py-2', isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200/80 bg-white/60')}>
                                <p className={cn('text-sm font-bold', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>{m.quizCompletedCount ?? 0}</p>
                                <p className={`text-[10px] uppercase tracking-wide ${subtleTextClass}`}>{lang === 'en' ? 'done' : 'xong'}</p>
                              </div>
                              <div className={cn('rounded-xl border px-1 py-2', isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200/80 bg-white/60')}>
                                <p className={cn('text-sm font-bold', isDarkMode ? 'text-violet-200' : 'text-violet-700')}>
                                  {m.averageScore != null ? Math.round(Number(m.averageScore) * 10) / 10 : '—'}
                                </p>
                                <p className={`text-[10px] uppercase tracking-wide ${subtleTextClass}`}>{lang === 'en' ? 'avg' : 'TB'}</p>
                              </div>
                              <div className={cn('rounded-xl border px-1 py-2', isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200/80 bg-white/60')}>
                                <p className={cn('text-sm font-bold', isDarkMode ? 'text-amber-200' : 'text-amber-700')}>{formatPctRatio(m.accuracy)}</p>
                                <p className={`text-[10px] uppercase tracking-wide ${subtleTextClass}`}>{lang === 'en' ? 'acc' : 'đúng'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {showMemberCardPagination ? (
                  <div
                    className={cn(
                      'mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4',
                      isDarkMode ? 'border-white/10' : 'border-slate-200',
                    )}
                  >
                    <p className={`text-xs ${subtleTextClass}`}>
                      {lang === 'en'
                        ? `Page ${memberCardPage + 1} of ${memberCardTotalPages} · ${memberCardTotalElements} members`
                        : `Trang ${memberCardPage + 1} / ${memberCardTotalPages} · ${memberCardTotalElements} thành viên`}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-full px-3"
                        disabled={cardsLoading || memberCardPage <= 0 || memberCardsPage?.first === true}
                        onClick={() => setMemberCardPage((p) => Math.max(0, p - 1))}
                        aria-label={lang === 'en' ? 'Previous page' : 'Trang trước'}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-full px-3"
                        disabled={cardsLoading || memberCardsPage?.last === true}
                        onClick={() => setMemberCardPage((p) => p + 1)}
                        aria-label={lang === 'en' ? 'Next page' : 'Trang sau'}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : isLeader && workspaceId ? (
          <section className={`${cardClass} p-6`}>
            <div className="flex flex-wrap items-start gap-4">
              <span
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                  isDarkMode ? 'bg-cyan-400/15 text-cyan-200' : 'bg-cyan-100 text-cyan-700',
                )}
              >
                <BarChart3 className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className={cn('text-lg font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                  {lang === 'en' ? 'Workspace analytics' : 'Thống kê workspace'}
                </h3>
                <p className={`mt-2 text-sm leading-relaxed ${subtleTextClass}`}>
                  {lang === 'en'
                    ? 'Group learning dashboards use the same Workspace analytics entitlement as individual stats. Upgrade your plan to unlock member cards, charts, and drill-down views.'
                    : 'Dashboard học tập nhóm dùng cùng quyền Thống kê workspace như workspace cá nhân. Nâng gói để mở thẻ thành viên, biểu đồ và xem chi tiết.'}
                </p>
                {typeof onRequestAnalyticsUpgrade === 'function' ? (
                  <Button
                    type="button"
                    className={cn('mt-4 rounded-full font-semibold', isDarkMode ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : '')}
                    onClick={onRequestAnalyticsUpgrade}
                  >
                    {lang === 'en' ? 'View plans' : 'Xem gói'}
                  </Button>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`${cardClass} p-4`}>
                <div className="flex items-center justify-between">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.tone}`}><Icon className="h-4 w-4" /></span>
                  <span className={`text-[10px] uppercase tracking-[0.14em] ${eyebrowClass}`}>{lang === 'en' ? 'metric' : 'chỉ số'}</span>
                </div>
                <p className={`mt-3 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{membersLoading ? '...' : stat.value}</p>
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
            {activityChartData.length === 0 ? (
              <div className={`mt-3 rounded-[20px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>
                {lang === 'en' ? 'No activity log data yet.' : 'Chua co du lieu activity log.'}
              </div>
            ) : (
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
            )}
          </section>
        </div>

        <Dialog
          open={Boolean(analyticsEnabled && detailUserId != null)}
          onOpenChange={(open) => {
            if (!open) {
              setDetailUserId(null);
              setDetailAttemptMode('ALL');
            }
          }}
        >
          <DialogContent
            className={cn(
              'max-h-[min(640px,92vh)] w-[min(100vw-1.5rem,560px)] max-w-none overflow-y-auto rounded-[26px] border p-0 shadow-2xl sm:max-w-2xl',
              isDarkMode ? 'border-white/10 bg-[#070f14]' : 'border-slate-200/80 bg-white',
            )}
          >
            <DialogHeader className={cn('space-y-1 border-b px-6 pb-4 pt-6 text-left sm:px-7', isDarkMode ? 'border-white/10' : 'border-slate-200')}>
              <DialogTitle className={cn('text-xl font-black tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {detailLoading && !memberDetail
                  ? (lang === 'en' ? 'Loading member…' : 'Đang tải thành viên…')
                  : (
                    <UserDisplayName
                      user={memberDetail}
                      fallback={lang === 'en' ? 'Member' : 'Thành viên'}
                      isDarkMode={isDarkMode}
                    />
                  )}
              </DialogTitle>
              <DialogDescription className={cn('text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                {memberDetail?.username ? `@${memberDetail.username}` : null}
                {memberDetail?.role
                  ? ` · ${memberDetail.role === 'LEADER' ? t('home.group.leader') : memberDetail.role === 'CONTRIBUTOR' ? t('home.group.contributor') : t('home.group.member')}`
                  : null}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-6 py-5 sm:px-7">
              <div className="flex flex-wrap gap-2">
                {['ALL', 'OFFICIAL', 'PRACTICE'].map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={detailAttemptMode === mode ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'rounded-full text-xs font-semibold',
                      detailAttemptMode === mode && (isDarkMode ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : ''),
                    )}
                    onClick={() => setDetailAttemptMode(mode)}
                  >
                    {mode === 'ALL'
                      ? (lang === 'en' ? 'All attempts' : 'Tất cả')
                      : mode === 'OFFICIAL'
                        ? (lang === 'en' ? 'Official' : 'Chính thức')
                        : (lang === 'en' ? 'Practice' : 'Luyện tập')}
                  </Button>
                ))}
              </div>

              {detailLoading && !memberDetail ? (
                <p className={`text-sm ${subtleTextClass}`}>{lang === 'en' ? 'Fetching learning signals…' : 'Đang lấy dữ liệu học…'}</p>
              ) : memberDetail ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { k: 'materialUploadCount', label: lang === 'en' ? 'Uploads' : 'Tài liệu' },
                      { k: 'quizAttemptCount', label: lang === 'en' ? 'Attempts' : 'Lượt làm' },
                      { k: 'quizCompletedCount', label: lang === 'en' ? 'Completed' : 'Hoàn thành' },
                    ].map(({ k, label }) => (
                      <div key={k} className={cn('rounded-2xl border px-3 py-3', innerCardClass)}>
                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${eyebrowClass}`}>{label}</p>
                        <p className={cn('mt-1 text-lg font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>{memberDetail[k] ?? 0}</p>
                      </div>
                    ))}
                    <div className={cn('rounded-2xl border px-3 py-3', innerCardClass)}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wide ${eyebrowClass}`}>{lang === 'en' ? 'Avg score' : 'Điểm TB'}</p>
                      <p className={cn('mt-1 text-lg font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        {memberDetail.averageScore != null ? Math.round(Number(memberDetail.averageScore) * 10) / 10 : '—'}
                      </p>
                    </div>
                    <div className={cn('rounded-2xl border px-3 py-3', innerCardClass)}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wide ${eyebrowClass}`}>{lang === 'en' ? 'Accuracy' : 'Chính xác'}</p>
                      <p className={cn('mt-1 text-lg font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>{formatPctRatio(memberDetail.accuracy)}</p>
                    </div>
                  </div>

                  {memberDetail.aiSummary ? (
                    <div className={cn('rounded-2xl border px-4 py-3 text-sm leading-relaxed', innerCardClass, subtleTextClass)}>
                      {memberDetail.aiSummary}
                    </div>
                  ) : null}

                  {(memberDetail.weakAreas?.length > 0 || memberDetail.strongAreas?.length > 0) ? (
                    <div className="space-y-3">
                      {memberDetail.strongAreas?.length > 0 ? (
                        <div>
                          <p className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${eyebrowClass}`}>{lang === 'en' ? 'Strong' : 'Điểm mạnh'}</p>
                          <div className="flex flex-wrap gap-2">
                            {memberDetail.strongAreas.map((a) => (
                              <span key={a} className={cn('rounded-full px-3 py-1 text-xs font-medium', isDarkMode ? 'bg-emerald-400/15 text-emerald-100' : 'bg-emerald-50 text-emerald-800')}>{a}</span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {memberDetail.weakAreas?.length > 0 ? (
                        <div>
                          <p className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${eyebrowClass}`}>{lang === 'en' ? 'Growth areas' : 'Cần cải thiện'}</p>
                          <div className="flex flex-wrap gap-2">
                            {memberDetail.weakAreas.map((a) => (
                              <span key={a} className={cn('rounded-full px-3 py-1 text-xs font-medium', isDarkMode ? 'bg-amber-400/15 text-amber-100' : 'bg-amber-50 text-amber-900')}>{a}</span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {memberDetail.recentActivities?.length > 0 ? (
                    <div>
                      <p className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${eyebrowClass}`}>{lang === 'en' ? 'Recent moves' : 'Hoạt động gần đây'}</p>
                      <ul className="space-y-2">
                        {memberDetail.recentActivities.slice(0, 5).map((log) => (
                          <li key={`${log.logId}-${log.logTime}`} className={cn('rounded-xl border px-3 py-2 text-sm', innerCardClass)}>
                            <span className={cn('font-medium', isDarkMode ? 'text-slate-100' : 'text-slate-800')}>{logLabel(log.action, lang)}</span>
                            <p className={`mt-1 text-xs ${subtleTextClass}`}>{formatGroupLogDescription(log, currentUserId, lang)}</p>
                            <p className={`mt-1 text-[10px] ${eyebrowClass}`}>{formatDateTime(log.logTime, lang, true)}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className={`text-sm ${subtleTextClass}`}>{lang === 'en' ? 'No data.' : 'Không có dữ liệu.'}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className={`space-y-6 animate-in fade-in duration-300 ${fontClass}`}>
      <section className={`${cardClass} p-6 lg:p-7`}>
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${eyebrowClass}`}>{lang === 'en' ? 'Group dashboard' : 'Bang theo doi nhom'}</p>
            <h2 className={`mt-2 truncate text-2xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{dashboardTitle}</h2>
            <p className={`mt-3 max-w-3xl text-sm leading-6 ${subtleTextClass}`}>{lang === 'en' ? 'Focus on who needs follow-up, which invitations are still open, and what changed most recently.' : 'Tap trung vao ai can follow-up, loi moi nao dang mo, va nhom vua thay doi dieu gi.'}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`rounded-[22px] border px-4 py-4 ${innerCardClass}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>{lang === 'en' ? 'Invitation queue' : 'Hang doi loi moi'}</p>
              <p className={`mt-3 text-xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{!isLeader ? '—' : pendingLoading ? '...' : openInvitations}</p>
              <p className={`mt-2 text-sm ${subtleTextClass}`}>{!isLeader ? (lang === 'en' ? 'leaders only' : 'chi leader xem') : expiringSoon.length > 0 ? `${expiringSoon.length} ${lang === 'en' ? 'expiring soon' : 'sap het han'}` : (lang === 'en' ? 'currently open' : 'dang mo')}</p>
            </div>
            <div className={`rounded-[22px] border px-4 py-4 ${innerCardClass}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>{lang === 'en' ? 'Activity this week' : 'Hoat dong tuan nay'}</p>
              <p className={`mt-3 text-xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{logsLoading ? '...' : activityThisWeek}</p>
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
              <p className={`text-3xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{membersLoading ? '...' : stat.value}</p>
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
          {activityChartData.length === 0 ? (
            <div className={`mt-5 rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>
              {lang === 'en' ? 'No activity log data yet.' : 'Chua co du lieu activity log.'}
            </div>
          ) : (
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
          )}
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
            {!isLeader ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{lang === 'en' ? 'Only leaders can review this queue.' : 'Chi leader moi can theo doi hang doi nay.'}</div>
            ) : pendingLoading ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{lang === 'en' ? 'Loading invitations...' : 'Dang tai loi moi...'}</div>
            ) : pending.invitations.length === 0 ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{lang === 'en' ? 'No invitations waiting right now.' : 'Hien chua co loi moi nao dang cho.'}</div>
            ) : pending.invitations.slice(0, 5).map((item) => {
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
            {membersLoading ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{lang === 'en' ? 'Preparing watchlist...' : 'Dang chuan bi watchlist...'}</div>
            ) : watchlist.length === 0 ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{lang === 'en' ? 'No members to watch yet.' : 'Chua co thanh vien de theo doi.'}</div>
            ) : watchlist.map((member) => {
              const status = watchStatus(member);
              return (
                <div key={member.groupMemberId ?? member.userId ?? member.username} className={`grid gap-3 rounded-[24px] border px-4 py-4 md:grid-cols-[minmax(0,1.1fr)_auto_auto] md:items-center ${innerCardClass}`}>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      <UserDisplayName user={member} fallback={lang === 'en' ? 'Member' : 'Thành viên'} isDarkMode={isDarkMode} />
                    </p>
                    <p className={`mt-1 text-xs ${eyebrowClass}`}>{member.email || (member.username ? `@${member.username}` : 'unknown')} · {joinLabel(member.joinedAt, lang)}</p>
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
            {logsLoading ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{lang === 'en' ? 'Loading activity log...' : 'Dang tai activity log...'}</div>
            ) : logs.length === 0 ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{lang === 'en' ? 'No group activity recorded yet.' : 'Chua co hoat dong nao duoc ghi lai.'}</div>
            ) : logs.slice(0, 8).map((log) => {
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
                      <p className={`mt-2 text-sm font-semibold leading-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatGroupLogDescription(log, currentUserId, lang)}</p>
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
