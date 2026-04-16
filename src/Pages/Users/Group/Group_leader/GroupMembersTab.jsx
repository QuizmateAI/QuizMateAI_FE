import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ListSpinner from '@/Components/ui/ListSpinner';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Mail,
  MoreVertical,
  RefreshCw,
  Search,
  Send,
  Shield,
  Trash2,
  Upload,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/Components/ui/dropdown-menu';
import { getUserDisplayLabel } from '@/Utils/userProfile';
import UserDisplayName from '@/Components/users/UserDisplayName';

const normalizeRole = (role) => String(role || 'MEMBER').toUpperCase();

const ACTIVE_STATUS_VALUES = new Set(['ACTIVE', 'ONLINE', 'PRESENT', 'CONNECTED']);
const AWAY_STATUS_VALUES = new Set(['AWAY', 'IDLE', 'BUSY']);
const OFFLINE_STATUS_VALUES = new Set(['OFFLINE', 'INACTIVE', 'DISCONNECTED']);
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;
const AWAY_WINDOW_MS = 5 * 60 * 1000;
const PRESENCE_TICK_MS = 30 * 1000;

const resolveMemberPresenceKey = (member = {}, now = Date.now()) => {
  const lastActiveAt = resolveMemberLastActiveAt(member);

  if (lastActiveAt) {
    const timestamp = new Date(lastActiveAt).getTime();
    if (Number.isFinite(timestamp)) {
      const inactiveMs = Math.max(0, now - timestamp);
      if (inactiveMs <= ACTIVE_WINDOW_MS) return 'active';
      if (inactiveMs <= AWAY_WINDOW_MS) return 'away';
      return 'offline';
    }
  }

  if (member.isCurrentUser) return 'active';

  const explicitBoolean = member.isOnline ?? member.online;
  if (typeof explicitBoolean === 'boolean') {
    return explicitBoolean ? 'active' : 'offline';
  }

  // Only presence-specific fields are treated as online status. Generic
  // status/memberStatus usually means membership state (for example ACTIVE).
  const rawStatus = member.onlineStatus
    ?? member.presenceStatus
    ?? member.activityStatus
    ?? member.connectionStatus;
  const normalized = String(rawStatus || '').trim().toUpperCase();

  if (!normalized) return 'offline';

  if (ACTIVE_STATUS_VALUES.has(normalized)) return 'active';
  if (AWAY_STATUS_VALUES.has(normalized)) return 'away';
  if (OFFLINE_STATUS_VALUES.has(normalized)) return 'offline';
  return 'unknown';
};

const resolveMemberLastActiveAt = (member = {}) => (
  member.lastActiveAt
  || member.lastActivityAt
  || member.lastSeenAt
  || member.lastSeen
  || member.lastLoginAt
  || member.lastOnlineAt
  || null
);

function GroupMembersTab({
  isDarkMode,
  workspaceId,
  members = [],
  membersLoading,
  isLeader,
  onReload,
  onGrantUpload,
  onRevokeUpload,
  onUpdateRole,
  onRemoveMember,
  onOpenInvite,
  onInvite,
  fetchPendingInvitations,
  onCancelInvitation,
  onResendInvitation,
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [reloading, setReloading] = useState(false);
  const [presenceNow, setPresenceNow] = useState(() => Date.now());
  const [invitePanelOpen, setInvitePanelOpen] = useState(false);
  const [pendingInviteData, setPendingInviteData] = useState({ count: null, invitations: [] });
  const [pendingInviteLoading, setPendingInviteLoading] = useState(false);
  const [pendingInviteError, setPendingInviteError] = useState('');
  const [resendingInviteKey, setResendingInviteKey] = useState('');
  const [cancelingInviteKey, setCancelingInviteKey] = useState('');

  useEffect(() => {
    const timerId = globalThis.setInterval(() => {
      setPresenceNow(Date.now());
    }, PRESENCE_TICK_MS);

    return () => globalThis.clearInterval(timerId);
  }, []);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return members.filter((member) => {
      const name = (member.fullName || member.username || '').toLowerCase();
      const email = (member.email || '').toLowerCase();
      const matchesSearch = !query || name.includes(query) || email.includes(query);
      const matchesRole = filterRole === 'all' || normalizeRole(member.role) === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, filterRole]);

  const totalMembers = members.length;
  const fallbackPendingInvitations = members.filter((member) => !member.canUpload && normalizeRole(member.role) !== 'LEADER').length;
  const pendingInvitationItems = Array.isArray(pendingInviteData?.invitations) ? pendingInviteData.invitations : [];
  const pendingInvitations = pendingInviteData?.count != null && Number.isFinite(Number(pendingInviteData.count))
    ? Number(pendingInviteData.count)
    : fallbackPendingInvitations;
  const onlineMembers = members.filter((member) => resolveMemberPresenceKey(member, presenceNow) === 'active').length;
  const uploadReadyMembers = members.filter((member) => member.canUpload).length;

  const loadPendingInvitations = useCallback(async () => {
    if (!workspaceId || !fetchPendingInvitations) return;

    setPendingInviteLoading(true);
    setPendingInviteError('');
    try {
      const payload = await fetchPendingInvitations(workspaceId);
      setPendingInviteData({
        count: Number(payload?.count) || 0,
        invitations: Array.isArray(payload?.invitations) ? payload.invitations : [],
      });
    } catch (error) {
      setPendingInviteError(error?.message || t('groupManage.members.invitations.loadFailed', { defaultValue: 'Không tải được danh sách lời mời.' }));
    } finally {
      setPendingInviteLoading(false);
    }
  }, [fetchPendingInvitations, t, workspaceId]);

  useEffect(() => {
    if (isLeader && workspaceId && fetchPendingInvitations) {
      void loadPendingInvitations();
    }
  }, [fetchPendingInvitations, isLeader, loadPendingInvitations, workspaceId]);

  const handleReload = useCallback(async () => {
    setReloading(true);
    try {
      await onReload();
    } finally {
      setReloading(false);
    }
  }, [onReload]);

  const handleToggleUpload = useCallback(async (member) => {
    try {
      const targetUserId = member.userId;
      if (!targetUserId) return;

      if (member.canUpload) {
        await onRevokeUpload(workspaceId, targetUserId);
      } else {
        await onGrantUpload(workspaceId, targetUserId);
      }

      await onReload();
    } catch (err) {
      console.error('Lỗi cập nhật quyền upload:', err);
    }
  }, [workspaceId, onGrantUpload, onRevokeUpload, onReload]);

  const handleChangeRole = useCallback(async (member, newRole) => {
    try {
      if (!member.userId) return;
      await onUpdateRole(workspaceId, member.userId, newRole);
      await onReload();
    } catch (err) {
      console.error('Lỗi đổi vai trò:', err);
    }
  }, [workspaceId, onUpdateRole, onReload]);

  const handleRemoveMember = useCallback(async (member) => {
    try {
      if (!member.userId) return;
      await onRemoveMember(workspaceId, member.userId);
      await onReload();
    } catch (err) {
      console.error('Lỗi xóa thành viên:', err);
    }

    setConfirmRemove(null);
  }, [workspaceId, onRemoveMember, onReload]);

  const getInviteEmail = (invitation) => (
    invitation?.invitedEmail
    || invitation?.email
    || invitation?.recipientEmail
    || invitation?.targetEmail
    || ''
  );

  const getInviteKey = (invitation) => String(
    invitation?.invitationId
    || invitation?.id
    || invitation?.token
    || getInviteEmail(invitation)
  );

  const getInviteId = (invitation) => (
    invitation?.invitationId
    ?? invitation?.id
    ?? invitation?.inviteId
    ?? invitation?.token
    ?? null
  );

  const formatInviteDate = (value) => {
    if (!value) return t('groupManage.members.invitations.noDate', { defaultValue: 'Chưa cập nhật' });
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t('groupManage.members.invitations.noDate', { defaultValue: 'Chưa cập nhật' });
    return date.toLocaleString(currentLang === 'en' ? 'en-US' : 'vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInviteStatusLabel = (invitation) => {
    const status = String(invitation?.status || invitation?.invitationStatus || 'PENDING').toUpperCase();
    if (status === 'ACCEPTED') return t('groupManage.members.invitations.status.accepted', { defaultValue: 'Đã nhận' });
    if (status === 'EXPIRED') return t('groupManage.members.invitations.status.expired', { defaultValue: 'Hết hạn' });
    if (status === 'CANCELLED' || status === 'CANCELED') return t('groupManage.members.invitations.status.cancelled', { defaultValue: 'Đã huỷ' });
    return t('groupManage.members.invitations.status.pending', { defaultValue: 'Đang chờ' });
  };

  const handleCopyInviteEmail = useCallback(async (email) => {
    if (!email) return;
    try {
      await navigator.clipboard?.writeText(email);
    } catch {
      // Clipboard may be unavailable in some browser contexts.
    }
  }, []);

  const handleResendInvite = useCallback(async (invitation) => {
    const email = getInviteEmail(invitation);
    const invitationId = getInviteId(invitation);
    if (!email && invitationId == null) return;

    const key = getInviteKey(invitation);
    setResendingInviteKey(key);
    setPendingInviteError('');
    try {
      if (onResendInvitation) {
        await onResendInvitation(workspaceId, invitationId, email);
      } else if (onInvite && email) {
        await onInvite(email);
      }
      await loadPendingInvitations();
    } catch (error) {
      setPendingInviteError(error?.message || t('groupManage.members.invitations.resendFailed', { defaultValue: 'Không gửi lại được lời mời.' }));
    } finally {
      setResendingInviteKey('');
    }
  }, [loadPendingInvitations, onInvite, onResendInvitation, t, workspaceId]);

  const handleCancelInvite = useCallback(async (invitation) => {
    const invitationId = getInviteId(invitation);
    if (invitationId == null || !onCancelInvitation) return;

    const key = getInviteKey(invitation);
    setCancelingInviteKey(key);
    setPendingInviteError('');
    try {
      await onCancelInvitation(workspaceId, invitationId);
      await loadPendingInvitations();
    } catch (error) {
      setPendingInviteError(error?.message || t('groupManage.members.invitations.cancelFailed', { defaultValue: 'Không hủy được lời mời.' }));
    } finally {
      setCancelingInviteKey('');
    }
  }, [loadPendingInvitations, onCancelInvitation, t, workspaceId]);

  const getRoleLabel = (role) => {
    const normalizedRole = normalizeRole(role);
    if (normalizedRole === 'LEADER') return t('home.group.leader', { defaultValue: 'Admin' });
    if (normalizedRole === 'CONTRIBUTOR') return t('home.group.contributor', { defaultValue: 'Developer' });
    return t('home.group.member', { defaultValue: 'Designer' });
  };

  const getRoleBadgeClass = (role) => {
    const normalizedRole = normalizeRole(role);
    if (normalizedRole === 'LEADER') return isDarkMode ? 'border border-indigo-300/20 bg-indigo-400/15 text-indigo-100' : 'border border-indigo-100 bg-indigo-50 text-indigo-700';
    if (normalizedRole === 'CONTRIBUTOR') return isDarkMode ? 'border border-cyan-300/20 bg-cyan-400/15 text-cyan-100' : 'border border-cyan-100 bg-cyan-50 text-cyan-700';
    return isDarkMode ? 'border border-emerald-300/20 bg-emerald-400/15 text-emerald-100' : 'border border-emerald-100 bg-emerald-50 text-emerald-700';
  };

  const getStatus = (member) => {
    const statusKey = resolveMemberPresenceKey(member, presenceNow);

    if (statusKey === 'active') {
      return {
        label: t('groupManage.members.status.active', { defaultValue: 'Active' }),
        dotClass: 'bg-[#20c997]',
        badgeClass: isDarkMode ? 'bg-emerald-400/12 text-emerald-100' : 'bg-emerald-50 text-emerald-700',
      };
    }

    if (statusKey === 'away') {
      return {
        label: t('groupManage.members.status.away', { defaultValue: 'Away' }),
        dotClass: 'bg-[#ffc542]',
        badgeClass: isDarkMode ? 'bg-amber-400/12 text-amber-100' : 'bg-amber-50 text-amber-700',
      };
    }

    if (statusKey === 'offline') {
      return {
        label: t('groupManage.members.status.offline', { defaultValue: 'Offline' }),
        dotClass: 'bg-slate-400',
        badgeClass: isDarkMode ? 'bg-slate-300/10 text-slate-300' : 'bg-slate-100 text-slate-600',
      };
    }

    return {
      label: t('groupManage.members.status.unknown', { defaultValue: 'Unknown' }),
      dotClass: 'bg-slate-300',
      badgeClass: isDarkMode ? 'bg-slate-300/10 text-slate-300' : 'bg-slate-100 text-slate-500',
    };
  };

  const getAvatarUrl = (member) => (
    member.avatarUrl
    || member.avatar
    || member.profilePicture
    || member.photoURL
    || member.picture
    || ''
  );

  const getMemberInitial = (member) => (
    member.fullName || member.username || member.email || '?'
  ).charAt(0).toUpperCase();

  const filterOptions = [
    { value: 'all', label: t('groupManage.members.all', { defaultValue: 'Tất cả' }) },
    { value: 'LEADER', label: t('home.group.leader', { defaultValue: 'Trưởng nhóm' }) },
    { value: 'CONTRIBUTOR', label: t('home.group.contributor', { defaultValue: 'Cộng tác viên' }) },
    { value: 'MEMBER', label: t('home.group.member', { defaultValue: 'Thành viên' }) },
  ];

  const shellClass = isDarkMode
    ? 'border-white/10 bg-slate-950/60 text-slate-100'
    : 'border-slate-200 bg-white text-slate-900';
  const topBarClass = isDarkMode ? 'border-white/10 bg-slate-950/35' : 'border-slate-100 bg-white';
  const inputClass = isDarkMode ? 'bg-white/[0.06] text-slate-100 placeholder:text-slate-400' : 'bg-slate-100/80 text-slate-700 placeholder:text-slate-400';
  const pillClass = isDarkMode ? 'border-white/10 bg-white/[0.04] shadow-black/20' : 'border-slate-200 bg-white shadow-slate-200/60';
  const tableClass = isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white';
  const headingClass = isDarkMode ? 'text-slate-50' : 'text-[#31417e]';
  const bodyTextClass = isDarkMode ? 'text-slate-300' : 'text-slate-600';
  const mutedTextClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`animate-in fade-in duration-300 ${fontClass}`}>
      <section className={`relative overflow-hidden rounded-lg border shadow-xl ${shellClass}`}>
        <div className="relative">
          <div className={`flex min-h-16 items-center gap-4 border-b px-4 sm:px-6 ${topBarClass}`}>
            <label className={`flex h-11 w-full max-w-[320px] items-center gap-3 rounded-lg px-4 ${inputClass}`}>
              <Search className={`h-4 w-4 flex-shrink-0 ${mutedTextClass}`} />
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder={t('groupManage.members.searchPlaceholder', { defaultValue: 'Search members...' })}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={handleReload}
                disabled={reloading || membersLoading}
                className={`hidden h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 sm:inline-flex ${bodyTextClass}`}
              >
                <RefreshCw className={`h-4 w-4 ${reloading ? 'animate-spin' : ''}`} />
                {t('groupManage.members.refresh', { defaultValue: 'Làm mới' })}
              </button>
              {isLeader ? (
                <button
                  type="button"
                  onClick={onOpenInvite}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#4d43e5] px-5 text-sm font-semibold text-white shadow-lg shadow-[#4d43e5]/25 transition-all hover:bg-[#4038c7] active:scale-95"
                >
                  <UserPlus className="h-4 w-4" />
                  {t('home.group.invite', { defaultValue: 'Invite User' })}
                </button>
              ) : null}
            </div>
          </div>

          <div className="px-4 py-8 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h2 className={`text-4xl font-black ${headingClass}`}>
                  {t('groupManage.members.headingTitle', { defaultValue: 'Team Directory' })}
                </h2>
                <p className={`mt-2 max-w-3xl text-sm leading-6 ${bodyTextClass}`}>
                  {t('groupManage.members.headingDescription', {
                    count: totalMembers,
                    defaultValue: `Manage access rights and monitor workspace activity across ${totalMembers.toLocaleString(currentLang)} members.`,
                  })}
                </p>
              </div>

              <div className={`inline-flex w-fit items-center gap-2 rounded-lg border px-5 py-3 text-sm font-bold backdrop-blur-xl ${pillClass}`}>
                <span className="h-2 w-2 rounded-full bg-[#20c997]" />
                {t('groupManage.members.onlineNow', { count: onlineMembers, defaultValue: `${onlineMembers} Online` })}
              </div>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <div className={`rounded-lg border-l-4 border-l-[#4d43e5] px-5 py-5 backdrop-blur-xl ${pillClass}`}>
                <p className={`text-xs font-black uppercase ${mutedTextClass}`}>{t('groupManage.members.totalUsers', { defaultValue: 'Total users' })}</p>
                <div className="mt-2 flex items-end gap-3">
                  <span className={`text-3xl font-black ${headingClass}`}>{totalMembers.toLocaleString(currentLang)}</span>
                  <span className="pb-1 text-xs font-black text-[#21a66f]">+2%</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInvitePanelOpen((open) => !open)}
                className={`rounded-lg border-l-4 border-l-[#f5b84b] px-5 py-5 text-left backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg ${pillClass}`}
              >
                <p className={`text-xs font-black uppercase ${mutedTextClass}`}>{t('groupManage.members.pendingInvitations', { defaultValue: 'Pending invitations' })}</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className={`text-3xl font-black ${headingClass}`}>{pendingInvitations.toLocaleString(currentLang)}</p>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    {t('groupManage.members.invitations.manage', { defaultValue: 'Quản lý' })}
                  </span>
                </div>
              </button>

              <div className={`rounded-lg border-l-4 border-l-[#20c997] px-5 py-5 backdrop-blur-xl ${pillClass}`}>
                <p className={`text-xs font-black uppercase ${mutedTextClass}`}>{t('groupManage.members.onlineMetric', { defaultValue: 'Online now' })}</p>
                <p className={`mt-2 text-3xl font-black ${headingClass}`}>{onlineMembers.toLocaleString(currentLang)}</p>
              </div>

              <div className={`rounded-lg border-l-4 border-l-[#38bdf8] px-5 py-5 backdrop-blur-xl ${pillClass}`}>
                <p className={`text-xs font-black uppercase ${mutedTextClass}`}>{t('groupManage.members.uploadReadyMetric', { defaultValue: 'Upload ready' })}</p>
                <p className={`mt-2 text-3xl font-black ${headingClass}`}>{uploadReadyMembers.toLocaleString(currentLang)}</p>
              </div>
            </div>

            {invitePanelOpen ? (
              <section className={`mt-5 rounded-2xl border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-amber-100 bg-amber-50/40'}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className={`text-base font-black ${headingClass}`}>
                      {t('groupManage.members.invitations.title', { defaultValue: 'Quản lý lời mời' })}
                    </h3>
                    <p className={`mt-1 text-sm ${bodyTextClass}`}>
                      {t('groupManage.members.invitations.description', { defaultValue: 'Theo dõi các email đã được mời và gửi lại lời mời khi cần.' })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadPendingInvitations}
                    disabled={pendingInviteLoading}
                    title={t('groupManage.members.invitations.refresh', { defaultValue: 'Làm mới lời mời' })}
                    aria-label={t('groupManage.members.invitations.refresh', { defaultValue: 'Làm mới lời mời' })}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-amber-200 bg-white text-amber-800 hover:bg-amber-50'}`}
                  >
                    <RefreshCw className={`h-4 w-4 ${pendingInviteLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {pendingInviteError ? (
                  <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    {pendingInviteError}
                  </p>
                ) : null}

                <div className="mt-5">
                  {pendingInviteLoading ? (
                    <div className={`rounded-xl border px-4 py-6 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-amber-100 bg-white'}`}>
                      <ListSpinner variant="section" />
                    </div>
                  ) : pendingInvitationItems.length === 0 ? (
                    <div className={`rounded-xl border px-4 py-6 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-amber-100 bg-white text-slate-600'}`}>
                      {t('groupManage.members.invitations.empty', { defaultValue: 'Chưa có lời mời nào đang chờ.' })}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {pendingInvitationItems.map((invitation) => {
                        const email = getInviteEmail(invitation);
                        const key = getInviteKey(invitation);
                        const invitedBy = invitation.invitedByFullName || invitation.invitedByUsername || invitation.createdByName || '';
                        const sentAt = invitation.invitedDate || invitation.createdAt || invitation.sentAt;
                        const expiresAt = invitation.expiredDate || invitation.expiresAt;
                        const resending = resendingInviteKey === key;
                        const canceling = cancelingInviteKey === key;
                        const canCancel = Boolean(onCancelInvitation && getInviteId(invitation) != null);

                        return (
                          <div
                            key={key}
                            className={`grid gap-4 rounded-xl border p-4 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto] lg:items-center ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-amber-100 bg-white'}`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-amber-500" />
                                <p className={`truncate text-sm font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{email || t('groupManage.members.invitations.emailFallback', { defaultValue: 'Không rõ email' })}</p>
                              </div>
                              {invitedBy ? (
                                <p className={`mt-1 text-xs ${mutedTextClass}`}>
                                  {t('groupManage.members.invitations.invitedBy', { defaultValue: 'Người mời' })}: {invitedBy}
                                </p>
                              ) : null}
                            </div>

                            <div>
                              <p className={`text-[11px] font-black uppercase ${mutedTextClass}`}>{t('groupManage.members.invitations.sentAt', { defaultValue: 'Đã gửi' })}</p>
                              <p className={`mt-1 text-sm font-semibold ${bodyTextClass}`}>{formatInviteDate(sentAt)}</p>
                            </div>

                            <div>
                              <p className={`text-[11px] font-black uppercase ${mutedTextClass}`}>{t('groupManage.members.invitations.expiresAt', { defaultValue: 'Hết hạn' })}</p>
                              <p className={`mt-1 text-sm font-semibold ${bodyTextClass}`}>{formatInviteDate(expiresAt)}</p>
                            </div>

                            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                {getInviteStatusLabel(invitation)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyInviteEmail(email)}
                                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold ${isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                              >
                                <Copy className="h-3.5 w-3.5" />
                                {t('groupManage.members.invitations.copy', { defaultValue: 'Copy' })}
                              </button>
                              {onResendInvitation || onInvite ? (
                                <button
                                  type="button"
                                  onClick={() => handleResendInvite(invitation)}
                                  disabled={resending}
                                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#4d43e5] px-3 text-xs font-semibold text-white transition-all hover:bg-[#4038c7] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Send className={`h-3.5 w-3.5 ${resending ? 'animate-pulse' : ''}`} />
                                  {resending
                                    ? t('groupManage.members.invitations.resending', { defaultValue: 'Đang gửi...' })
                                    : t('groupManage.members.invitations.resend', { defaultValue: 'Gửi lại' })}
                                </button>
                              ) : null}
                              {canCancel ? (
                                <button
                                  type="button"
                                  onClick={() => handleCancelInvite(invitation)}
                                  disabled={canceling}
                                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-semibold text-red-700 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Trash2 className={`h-3.5 w-3.5 ${canceling ? 'animate-pulse' : ''}`} />
                                  {canceling
                                    ? t('groupManage.members.invitations.cancelling', { defaultValue: 'Đang hủy...' })
                                    : t('groupManage.members.invitations.cancel', { defaultValue: 'Hủy' })}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilterRole(option.value)}
                  className={`rounded-lg border px-4 py-2 text-xs font-black uppercase transition-all active:scale-95 ${
                    filterRole === option.value
                      ? 'border-indigo-300 bg-indigo-50 text-[#39358c]'
                      : (isDarkMode ? 'border-transparent text-slate-300 hover:bg-white/[0.06]' : 'border-transparent text-slate-700 hover:bg-slate-100')
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-8">
              {membersLoading ? (
                <div className={`rounded-lg border p-6 backdrop-blur-xl ${tableClass}`}>
                  <ListSpinner variant="section" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className={`rounded-lg border p-10 text-center backdrop-blur-xl ${tableClass}`}>
                  <Users className={`mx-auto mb-3 h-10 w-10 ${mutedTextClass}`} />
                  <p className={`text-sm ${bodyTextClass}`}>{t('home.group.noMembers', { defaultValue: 'No members found.' })}</p>
                </div>
              ) : (
                <div className={`overflow-hidden rounded-[28px] border backdrop-blur-xl ${tableClass}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] table-fixed border-collapse">
                      <colgroup>
                        <col className="w-[40%]" />
                        <col className="w-[22%]" />
                        <col className="w-[24%]" />
                        <col className="w-[14%]" />
                      </colgroup>
                      <thead>
                        <tr className={`h-[54px] text-xs font-black uppercase ${isDarkMode ? 'border-b border-white/10 bg-white/[0.04] text-slate-300' : 'border-b border-slate-200 bg-slate-50 text-slate-600'}`}>
                          <th className="px-7 text-left">{t('groupManage.members.columns.member', { defaultValue: 'Member' })}</th>
                          <th className="px-4 text-left">{t('groupManage.members.columns.role', { defaultValue: 'Role' })}</th>
                          <th className="px-4 text-left">{t('groupManage.members.columns.status', { defaultValue: 'Status' })}</th>
                          <th className="px-7 text-right">{t('groupManage.members.columns.actions', { defaultValue: 'Action' })}</th>
                        </tr>
                      </thead>
                      <tbody className={isDarkMode ? 'divide-y divide-white/10' : 'divide-y divide-white/38'}>
                        {filteredMembers.map((member) => {
                          const memberRole = normalizeRole(member.role);
                          const avatarUrl = getAvatarUrl(member);
                          const status = getStatus(member);

                          return (
                            <tr key={member.groupMemberId ?? member.userId} className={`h-[86px] transition-colors ${isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}>
                              <td className="px-7">
                                <div className="flex min-w-0 items-center gap-4">
                                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-black shadow-sm ${isDarkMode ? 'bg-white/[0.08] text-slate-50' : 'bg-[#2e3e45] text-white'}`}>
                                    {avatarUrl ? (
                                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      getMemberInitial(member)
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className={`truncate text-sm font-black ${isDarkMode ? 'text-slate-50' : 'text-[#314044]'}`}>
                                      <UserDisplayName user={member} fallback={currentLang === 'en' ? 'Member' : 'Thành viên'} isDarkMode={isDarkMode} />
                                    </p>
                                    <p className={`mt-1 truncate text-xs ${mutedTextClass}`}>
                                      {member.email || (member.username ? `@${member.username}` : 'member')}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4">
                                <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold ${getRoleBadgeClass(memberRole)}`}>
                                  {getRoleLabel(memberRole)}
                                </span>
                              </td>
                              <td className="px-4 text-sm">
                                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${status.badgeClass}`}>
                                  <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-7 text-right">
                                {isLeader && !member.isCurrentUser && memberRole !== 'LEADER' ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        className={`inline-flex rounded-lg p-2 transition-all active:scale-95 ${isDarkMode ? 'text-emerald-50/65 hover:bg-white/[0.10]' : 'text-[#6e7d76] hover:bg-white/36'}`}
                                        aria-label="Action"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className={`w-56 rounded-lg p-1 shadow-xl ${isDarkMode ? 'border-white/10 bg-[#09170f] text-emerald-50' : 'border-white bg-white text-[#2f3d66]'}`}>
                                      <DropdownMenuItem onClick={() => handleToggleUpload(member)} className="cursor-pointer rounded-lg px-3 py-2.5 text-sm">
                                        <Upload className="mr-2 h-4 w-4" />
                                        {member.canUpload ? t('home.group.revokeUpload', { defaultValue: 'Revoke upload' }) : t('home.group.grantUpload', { defaultValue: 'Grant upload' })}
                                      </DropdownMenuItem>

                                      {memberRole === 'MEMBER' ? (
                                        <DropdownMenuItem onClick={() => handleChangeRole(member, 'CONTRIBUTOR')} className="cursor-pointer rounded-lg px-3 py-2.5 text-sm">
                                          <Shield className="mr-2 h-4 w-4" />
                                          {t('home.group.changeRole', { defaultValue: 'Change role' })} - {t('home.group.contributor', { defaultValue: 'Contributor' })}
                                        </DropdownMenuItem>
                                      ) : null}

                                      {memberRole === 'CONTRIBUTOR' ? (
                                        <DropdownMenuItem onClick={() => handleChangeRole(member, 'MEMBER')} className="cursor-pointer rounded-lg px-3 py-2.5 text-sm">
                                          <Shield className="mr-2 h-4 w-4" />
                                          {t('home.group.changeRole', { defaultValue: 'Change role' })} - {t('home.group.member', { defaultValue: 'Member' })}
                                        </DropdownMenuItem>
                                      ) : null}

                                      <DropdownMenuSeparator className={isDarkMode ? 'my-1 bg-white/10' : 'my-1 bg-slate-100'} />

                                      <DropdownMenuItem onClick={() => setConfirmRemove(member)} className="cursor-pointer rounded-lg px-3 py-2.5 text-sm text-red-600">
                                        <UserMinus className="mr-2 h-4 w-4" />
                                        {t('home.group.removeMember', { defaultValue: 'Remove member' })}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <span className={mutedTextClass}>--</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className={`flex flex-col gap-3 px-7 py-5 text-sm sm:flex-row sm:items-center sm:justify-between ${isDarkMode ? 'border-t border-white/10 text-emerald-50/60' : 'border-t border-white/38 text-[#5f6d5e]'}`}>
                    <span>
                      {t('groupManage.members.showing', {
                        count: filteredMembers.length,
                        total: members.length,
                        defaultValue: `Showing 1 to ${filteredMembers.length} of ${members.length} members`,
                      })}
                    </span>
                    <div className="flex items-center gap-2" aria-hidden="true">
                      <button type="button" disabled className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${isDarkMode ? 'bg-white/[0.05]' : 'bg-white/44'}`}>
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#4d43e5] px-3 font-bold text-white">1</span>
                      <button type="button" disabled className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${isDarkMode ? 'bg-white/[0.05]' : 'bg-white/44'}`}>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </section>

      {confirmRemove ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-lg border p-6 shadow-2xl ${isDarkMode ? 'border-white/10 bg-[#09170f] text-white' : 'border-white bg-white text-slate-900'}`}>
            <p className={`text-xs font-bold uppercase ${mutedTextClass}`}>Confirm action</p>
            <h3 className="mt-3 text-xl font-bold">{t('home.group.removeMember', { defaultValue: 'Remove member' })}</h3>
            <p className={`mt-3 text-sm leading-6 ${bodyTextClass}`}>
              {t('home.group.removeConfirm', { defaultValue: 'Remove' })} <strong>{getUserDisplayLabel(confirmRemove, currentLang === 'en' ? 'Member' : 'Thành viên')}</strong>?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${isDarkMode ? 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.10]' : 'border-white bg-slate-50 text-slate-700 hover:bg-white'}`}
              >
                {t('home.group.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                onClick={() => handleRemoveMember(confirmRemove)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 active:scale-95"
              >
                {t('home.group.removeMember', { defaultValue: 'Remove member' })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default GroupMembersTab;
