import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  UserPlus,
  MoreVertical,
  Shield,
  Upload,
  UserMinus,
  Crown,
  Loader2,
  Users,
  Mail,
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

// Tab Thành viên: Danh sách đầy đủ + quản lý quyền + mời/xóa
function GroupMembersTab({
  isDarkMode,
  groupId,
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

  // Lọc thành viên
  const filteredMembers = members.filter((m) => {
    const name = (m.fullName || m.username || '').toLowerCase();
    const email = (m.email || '').toLowerCase();
    const matchSearch = name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
    const matchRole = filterRole === 'all' || m.role === filterRole;
    return matchSearch && matchRole;
  });

  const [reloading, setReloading] = useState(false);

  // Nút reload danh sách thành viên
  const handleReload = useCallback(async () => {
    setReloading(true);
    try {
      await onReload();
    } finally {
      setReloading(false);
    }
  }, [onReload]);

  // Xử lý cấp/thu hồi upload (dùng groupMemberId theo API)
  const handleToggleUpload = useCallback(async (member) => {
    try {
      if (member.canUpload) {
        await onRevokeUpload(groupId, member.groupMemberId);
      } else {
        await onGrantUpload(groupId, member.groupMemberId);
      }
      await onReload();
    } catch (err) {
      console.error('Lỗi cập nhật quyền upload:', err);
    }
  }, [groupId, onGrantUpload, onRevokeUpload, onReload]);

  // Xử lý đổi vai trò (dùng groupMemberId theo API)
  const handleChangeRole = useCallback(async (member, newRole) => {
    try {
      await onUpdateRole(groupId, member.groupMemberId, newRole);
      await onReload();
    } catch (err) {
      console.error('Lỗi đổi vai trò:', err);
    }
  }, [groupId, onUpdateRole, onReload]);

  // Xử lý xóa thành viên (dùng groupMemberId theo API)
  const handleRemoveMember = useCallback(async (member) => {
    try {
      await onRemoveMember(groupId, member.groupMemberId);
      await onReload();
    } catch (err) {
      console.error('Lỗi xóa thành viên:', err);
    }
    setConfirmRemove(null);
  }, [groupId, onRemoveMember, onReload]);

  // Hiển thị vai trò
  const getRoleLabel = (role) => {
    if (role === 'LEADER') return t('home.group.leader');
    if (role === 'CONTRIBUTOR') return t('home.group.contributor');
    return t('home.group.member');
  };

  const getRoleIcon = (role) => {
    if (role === 'LEADER') return <Crown className="w-3.5 h-3.5" />;
    if (role === 'CONTRIBUTOR') return <Shield className="w-3.5 h-3.5" />;
    return null;
  };

  const getRoleBadgeClass = (role) => {
    if (role === 'LEADER') {
      return isDarkMode ? 'bg-amber-950/50 text-amber-400 border-amber-800/50' : 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (role === 'CONTRIBUTOR') {
      return isDarkMode ? 'bg-purple-950/50 text-purple-400 border-purple-800/50' : 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const cardClass = `rounded-2xl border transition-colors duration-300 ${
    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
  }`;

  // Filter chip
  const filterOptions = [
    { value: 'all', label: t('groupManage.members.all') },
    { value: 'LEADER', label: t('home.group.leader') },
    { value: 'CONTRIBUTOR', label: t('home.group.contributor') },
    { value: 'MEMBER', label: t('home.group.member') },
  ];

  return (
    <div className={`space-y-5 animate-in fade-in duration-300 ${fontClass}`}>
      {/* Header: Tìm kiếm + Bộ lọc + Nút mời */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Thanh tìm kiếm */}
        <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 flex-1 w-full sm:max-w-sm transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
        }`}>
          <Search className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
          <input
            className={`bg-transparent outline-none text-sm w-full ${
              isDarkMode ? 'text-slate-200 placeholder:text-slate-500' : 'text-gray-700 placeholder:text-gray-400'
            }`}
            placeholder={t('groupManage.members.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Bộ lọc vai trò */}
        <div className="flex items-center gap-2 flex-wrap">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterRole(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all active:scale-95 border ${
                filterRole === opt.value
                  ? isDarkMode
                    ? 'bg-blue-600/20 text-blue-400 border-blue-600/30'
                    : 'bg-blue-50 text-blue-600 border-blue-200'
                  : isDarkMode
                    ? 'text-slate-400 border-slate-700 hover:bg-slate-800'
                    : 'text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Nút reload + mời */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleReload}
            disabled={reloading || membersLoading}
            title={t('groupManage.members.reload')}
            className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
              isDarkMode
                ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40'
                : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${reloading ? 'animate-spin' : ''}`} />
          </button>
          {isLeader && (
            <button
              onClick={onOpenInvite}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
            >
              <UserPlus className="w-4 h-4" />
              {t('home.group.invite')}
            </button>
          )}
        </div>
      </div>

      {/* Bảng thành viên */}
      <div className={cardClass}>
        {/* Header bảng */}
        <div className={`grid grid-cols-[minmax(200px,2fr)_minmax(180px,1.5fr)_minmax(120px,1fr)_minmax(80px,0.5fr)_60px] gap-4 px-5 py-3.5 text-xs font-semibold border-b ${
          isDarkMode ? 'text-slate-500 border-slate-800 bg-slate-900/50' : 'text-gray-400 border-gray-100 bg-gray-50/50'
        }`}>
          <span>{t('groupManage.members.name')}</span>
          <span>{t('groupManage.members.email')}</span>
          <span>{t('groupManage.members.role')}</span>
          <span>{t('groupManage.members.upload')}</span>
          <span />
        </div>

        {/* Loading */}
        {membersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className={`w-6 h-6 animate-spin ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <Users className={`w-10 h-10 mx-auto mb-2 ${isDarkMode ? 'text-slate-700' : 'text-gray-300'}`} />
            <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {t('home.group.noMembers')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className={`divide-y ${isDarkMode ? 'divide-slate-800/50' : 'divide-gray-100'}`}>
              {filteredMembers.map((member) => (
                <div
                  key={member.userId}
                  className={`grid grid-cols-[minmax(200px,2fr)_minmax(180px,1.5fr)_minmax(120px,1fr)_minmax(80px,0.5fr)_60px] gap-4 px-5 py-3.5 items-center text-sm transition-colors ${
                    isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50/50'
                  }`}
                >
                {/* Tên + Avatar */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${
                    isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {member.avatar ? (
                      <img src={member.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      (member.fullName || member.username || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {member.fullName || member.username}
                      </p>
                      {member.isCurrentUser && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                          isDarkMode ? 'bg-blue-950/50 text-blue-400' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {t('home.group.you')}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      @{member.username}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className={`w-3.5 h-3.5 flex-shrink-0 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
                  <span className={`text-sm truncate ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {member.email || '—'}
                  </span>
                </div>

                {/* Vai trò Badge */}
                <div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${getRoleBadgeClass(member.role)}`}>
                    {getRoleIcon(member.role)}
                    {getRoleLabel(member.role)}
                  </span>
                </div>

                {/* Upload status */}
                <div>
                  {member.canUpload ? (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
                      isDarkMode ? 'bg-green-950/40 text-green-400' : 'bg-green-50 text-green-600'
                    }`}>
                      <Upload className="w-3 h-3" />
                      {t('groupManage.members.yes')}
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
                      isDarkMode ? 'bg-red-950/30 text-red-400' : 'bg-red-50 text-red-500'
                    }`}>
                      <XCircle className="w-3 h-3" />
                      {t('groupManage.members.no')}
                    </span>
                  )}
                </div>

                {/* Menu hành động */}
                <div className="flex justify-end">
                  {isLeader && !member.isCurrentUser && member.role !== 'LEADER' ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={`p-1.5 rounded-lg transition-all active:scale-95 focus:outline-none ${
                            isDarkMode
                              ? 'hover:bg-slate-700 text-slate-400 data-[state=open]:bg-slate-700 data-[state=open]:text-slate-200'
                              : 'hover:bg-gray-200 text-gray-400 data-[state=open]:bg-gray-200 data-[state=open]:text-gray-700'
                          }`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className={`w-56 p-1 rounded-xl shadow-xl ${
                          isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-300'
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        {/* Cấp/thu hồi upload */}
                        <DropdownMenuItem
                          onClick={() => handleToggleUpload(member)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer rounded-lg ${
                            isDarkMode ? 'focus:bg-slate-900 focus:text-slate-200' : 'focus:bg-gray-50 focus:text-gray-900'
                          }`}
                        >
                          <Upload className="w-4 h-4" />
                          {member.canUpload
                            ? t('home.group.revokeUpload')
                            : t('home.group.grantUpload')}
                        </DropdownMenuItem>

                        {/* Đổi vai trò */}
                        {member.role === 'MEMBER' && (
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member, 'CONTRIBUTOR')}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer rounded-lg ${
                              isDarkMode ? 'focus:bg-slate-900 focus:text-slate-200' : 'focus:bg-gray-50 focus:text-gray-900'
                            }`}
                          >
                            <Shield className="w-4 h-4" />
                            {t('home.group.changeRole')} → {t('home.group.contributor')}
                          </DropdownMenuItem>
                        )}
                        {member.role === 'CONTRIBUTOR' && (
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member, 'MEMBER')}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer rounded-lg ${
                              isDarkMode ? 'focus:bg-slate-900 focus:text-slate-200' : 'focus:bg-gray-50 focus:text-gray-900'
                            }`}
                          >
                            <Shield className="w-4 h-4" />
                            {t('home.group.changeRole')} → {t('home.group.member')}
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator className={isDarkMode ? 'bg-slate-800 my-1' : 'bg-gray-100 my-1'} />

                        {/* Xóa thành viên */}
                        <DropdownMenuItem
                          onClick={() => setConfirmRemove(member)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer rounded-lg ${
                            isDarkMode
                              ? 'text-red-400 focus:bg-red-950/30 focus:text-red-300'
                              : 'text-red-600 focus:bg-red-50 focus:text-red-700'
                          }`}
                        >
                          <UserMinus className="w-4 h-4" />
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
      </div>

      {/* Tổng số thành viên */}
      <p className={`text-xs text-center ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`}>
        {t('groupManage.members.showing', { count: filteredMembers.length, total: members.length })}
      </p>

      {/* Dialog xác nhận xóa */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${
            isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('home.group.removeMember')}
            </h3>
            <p className={`text-sm mb-5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('home.group.removeConfirm')} <strong>{confirmRemove.fullName || confirmRemove.username}</strong>?
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmRemove(null)}
                className={`px-4 py-2 text-sm rounded-xl border transition-all active:scale-95 ${
                  isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t('home.group.cancel')}
              </button>
              <button
                onClick={() => handleRemoveMember(confirmRemove)}
                className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20"
              >
                {t('home.group.removeMember')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupMembersTab;
