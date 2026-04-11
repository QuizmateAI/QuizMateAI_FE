import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ListSpinner from '@/Components/ui/ListSpinner';
import {
  Search,
  UserPlus,
  MoreVertical,
  Shield,
  Upload,
  UserMinus,
  Crown,
  Users,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/Components/ui/dropdown-menu';

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
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [reloading, setReloading] = useState(false);

  const filteredMembers = members.filter((member) => {
    const name = (member.fullName || member.username || '').toLowerCase();
    const email = (member.email || '').toLowerCase();
    const matchSearch = name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
    const matchRole = filterRole === 'all' || member.role === filterRole;
    return matchSearch && matchRole;
  });

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

  const getRoleLabel = (role) => {
    if (role === 'LEADER') return t('home.group.leader');
    if (role === 'CONTRIBUTOR') return t('home.group.contributor');
    return t('home.group.member');
  };

  const getRoleIcon = (role) => {
    if (role === 'LEADER') return <Crown className="h-3.5 w-3.5" />;
    if (role === 'CONTRIBUTOR') return <Shield className="h-3.5 w-3.5" />;
    return <Users className="h-3.5 w-3.5" />;
  };

  const getRoleBadgeClass = (role) => {
    if (role === 'LEADER') {
      return isDarkMode ? 'border-amber-400/20 bg-amber-400/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-700';
    }
    if (role === 'CONTRIBUTOR') {
      return isDarkMode ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-700';
    }
    return isDarkMode ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  };

  const getCardAccentClass = (role) => {
    if (role === 'LEADER') {
      return isDarkMode ? 'from-amber-400/18 via-transparent to-transparent' : 'from-amber-100 via-white to-white/55';
    }
    if (role === 'CONTRIBUTOR') {
      return isDarkMode ? 'from-cyan-400/18 via-transparent to-transparent' : 'from-cyan-100 via-white to-white/55';
    }
    return isDarkMode ? 'from-emerald-400/18 via-transparent to-transparent' : 'from-emerald-100 via-white to-white/55';
  };

  const shellClass = isDarkMode
    ? 'border-white/10 bg-[#08131a]/92'
    : 'border-white/80 bg-white/82';
  const secondaryCardClass = isDarkMode
    ? 'border-white/10 bg-white/[0.04]'
    : 'border-white/80 bg-white/78';
  const eyebrowClass = isDarkMode ? 'text-slate-500' : 'text-slate-500';
  const subtleTextClass = isDarkMode ? 'text-slate-400' : 'text-slate-600';

  const filterOptions = [
    { value: 'all', label: t('groupManage.members.all') },
    { value: 'LEADER', label: t('home.group.leader') },
    { value: 'CONTRIBUTOR', label: t('home.group.contributor') },
    { value: 'MEMBER', label: t('home.group.member') },
  ];

  return (
    <div className={`space-y-6 animate-in fade-in duration-300 ${fontClass}`}>
      <section className={`rounded-[30px] border p-5 ${shellClass}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>
              {t('groupManage.members.headingEyebrow')}
            </p>
            <h2 className={`mt-3 text-2xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('groupManage.members.headingTitle')}
            </h2>
            <p className={`mt-2 max-w-3xl text-sm leading-6 ${subtleTextClass}`}>
              {t('groupManage.members.headingDescription')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleReload}
              disabled={reloading || membersLoading}
              title={t('groupManage.members.reload')}
              className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all active:scale-95 ${
                isDarkMode
                  ? 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.10] disabled:opacity-40'
                  : 'border-white/80 bg-white text-slate-700 hover:bg-white disabled:opacity-40'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${reloading ? 'animate-spin' : ''}`} />
              {t('groupManage.members.refresh')}
            </button>
            {isLeader ? (
              <button
                onClick={onOpenInvite}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-cyan-600 px-5 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20 transition-all hover:bg-cyan-700 active:scale-95"
              >
                <UserPlus className="h-4 w-4" />
                {t('home.group.invite')}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_auto]">
          <div className={`flex items-center gap-2 rounded-[22px] border px-4 py-3 ${secondaryCardClass}`}>
            <Search className={`h-4 w-4 flex-shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              className={`w-full bg-transparent text-sm outline-none ${isDarkMode ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-700 placeholder:text-slate-400'}`}
              placeholder={t('groupManage.members.searchPlaceholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterRole(option.value)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all active:scale-95 ${
                  filterRole === option.value
                    ? (isDarkMode ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-700')
                    : (isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]' : 'border-white/80 bg-white text-slate-600 hover:bg-white')
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

      </section>

      {membersLoading ? (
        <div className={`${shellClass} rounded-[30px] border p-6`}>
          <ListSpinner variant="section" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className={`${shellClass} rounded-[30px] border p-10 text-center`}>
          <Users className={`mx-auto mb-3 h-10 w-10 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
          <p className={`text-sm ${subtleTextClass}`}>
            {t('home.group.noMembers')}
          </p>
        </div>
      ) : (
        <div className={`rounded-[24px] border overflow-hidden ${shellClass}`}>
          <div className={`grid grid-cols-[minmax(220px,1.2fr)_minmax(180px,1fr)_minmax(180px,1fr)_64px] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? 'text-slate-400 bg-white/[0.03] border-b border-white/10' : 'text-slate-500 bg-slate-50 border-b border-slate-200'}`}>
            <div>{t('groupManage.members.columns.member')}</div>
            <div>{t('groupManage.members.columns.role')}</div>
            <div>{t('groupManage.members.columns.uploadAccess')}</div>
            <div className="text-right">{t('groupManage.members.columns.actions')}</div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredMembers.map((member) => (
              <div key={member.groupMemberId ?? member.userId} className="grid grid-cols-[minmax(220px,1.2fr)_minmax(180px,1fr)_minmax(180px,1fr)_64px] items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex items-center gap-3">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold ${isDarkMode ? 'bg-white/[0.08] text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                    {member.avatar ? (
                      <img src={member.avatar} alt="" className="h-10 w-10 object-cover" />
                    ) : (
                      (member.fullName || member.username || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {member.fullName || member.username}
                    </p>
                    <p className={`truncate text-xs ${eyebrowClass}`}>{member.email || `@${member.username}`}</p>
                  </div>
                </div>

                <div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(member.role)}`}>
                    {getRoleIcon(member.role)}
                    {getRoleLabel(member.role)}
                  </span>
                </div>

                <div>
                  {member.canUpload ? (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700'}`}>
                      <Upload className="h-3 w-3" />
                      {t('groupManage.members.uploadGranted')}
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? 'bg-rose-400/10 text-rose-100' : 'bg-rose-50 text-rose-700'}`}>
                      <XCircle className="h-3 w-3" />
                      {t('groupManage.members.uploadLimited')}
                    </span>
                  )}
                </div>

                <div className="flex justify-end">
                  {isLeader && !member.isCurrentUser && member.role !== 'LEADER' ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={`rounded-full border p-2 transition-all active:scale-95 ${isDarkMode ? 'border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.10]' : 'border-white bg-white/90 text-slate-600 hover:bg-white'}`}>
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={`w-56 rounded-2xl p-1 shadow-xl ${isDarkMode ? 'border-white/10 bg-[#09131a] text-slate-300' : 'border-white bg-white text-slate-700'}`}>
                        <DropdownMenuItem onClick={() => handleToggleUpload(member)} className={`cursor-pointer rounded-xl px-3 py-2.5 text-sm ${isDarkMode ? 'focus:bg-white/[0.06] focus:text-slate-100' : 'focus:bg-slate-50 focus:text-slate-900'}`}>
                          <Upload className="mr-2 h-4 w-4" />
                          {member.canUpload ? t('home.group.revokeUpload') : t('home.group.grantUpload')}
                        </DropdownMenuItem>

                        {member.role === 'MEMBER' ? (
                          <DropdownMenuItem onClick={() => handleChangeRole(member, 'CONTRIBUTOR')} className={`cursor-pointer rounded-xl px-3 py-2.5 text-sm ${isDarkMode ? 'focus:bg-white/[0.06] focus:text-slate-100' : 'focus:bg-slate-50 focus:text-slate-900'}`}>
                            <Shield className="mr-2 h-4 w-4" />
                            {t('home.group.changeRole')} → {t('home.group.contributor')}
                          </DropdownMenuItem>
                        ) : null}

                        {member.role === 'CONTRIBUTOR' ? (
                          <DropdownMenuItem onClick={() => handleChangeRole(member, 'MEMBER')} className={`cursor-pointer rounded-xl px-3 py-2.5 text-sm ${isDarkMode ? 'focus:bg-white/[0.06] focus:text-slate-100' : 'focus:bg-slate-50 focus:text-slate-900'}`}>
                            <Shield className="mr-2 h-4 w-4" />
                            {t('home.group.changeRole')} → {t('home.group.member')}
                          </DropdownMenuItem>
                        ) : null}

                        <DropdownMenuSeparator className={isDarkMode ? 'my-1 bg-white/10' : 'my-1 bg-slate-100'} />

                        <DropdownMenuItem onClick={() => setConfirmRemove(member)} className={`cursor-pointer rounded-xl px-3 py-2.5 text-sm ${isDarkMode ? 'text-red-300 focus:bg-red-500/10 focus:text-red-200' : 'text-red-600 focus:bg-red-50 focus:text-red-700'}`}>
                          <UserMinus className="mr-2 h-4 w-4" />
                          {t('home.group.removeMember')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className={`text-center text-xs ${eyebrowClass}`}>
        {t('groupManage.members.showing', { count: filteredMembers.length, total: members.length })}
      </p>

      {confirmRemove ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-[28px] border p-6 shadow-2xl ${
            isDarkMode ? 'border-white/10 bg-[#09131a] text-white' : 'border-white bg-white text-slate-900'
          }`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>
              {t('groupManage.members.removeConfirmEyebrow')}
            </p>
            <h3 className="mt-3 text-xl font-bold">
              {t('home.group.removeMember')}
            </h3>
            <p className={`mt-3 text-sm leading-6 ${subtleTextClass}`}>
              {t('home.group.removeConfirm')} <strong>{confirmRemove.fullName || confirmRemove.username}</strong>?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                  isDarkMode ? 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.10]' : 'border-white bg-slate-50 text-slate-700 hover:bg-white'
                }`}
              >
                {t('home.group.cancel')}
              </button>
              <button
                onClick={() => handleRemoveMember(confirmRemove)}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 active:scale-95"
              >
                {t('home.group.removeMember')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default GroupMembersTab;
