import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

// Panel hiển thị danh sách thành viên nhóm với quản lý role/upload
function GroupMembersPanel({
  isDarkMode = false,
  groupId,
  currentUserRole,
  fetchMembers,
  onGrantUpload,
  onRevokeUpload,
  onUpdateRole,
  onRemoveMember,
  onOpenInvite,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  const isLeader = currentUserRole === 'GROUP_LEADER';

  // Tải danh sách thành viên
  const loadMembers = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const data = await fetchMembers(groupId);
      setMembers(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách thành viên:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId, fetchMembers]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Lọc thành viên theo tìm kiếm
  const filteredMembers = members.filter((m) => {
    const name = (m.fullName || m.username || '').toLowerCase();
    const email = (m.email || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  // Xử lý cấp/thu hồi quyền upload
  const handleToggleUpload = async (member) => {
    try {
      if (member.canUpload) {
        await onRevokeUpload(groupId, member.userId);
      } else {
        await onGrantUpload(groupId, member.userId);
      }
      await loadMembers();
    } catch (err) {
      console.error('Lỗi khi cập nhật quyền upload:', err);
    }
    setOpenMenuId(null);
  };

  // Xử lý đổi vai trò
  const handleChangeRole = async (member, newRole) => {
    try {
      await onUpdateRole(groupId, member.userId, newRole);
      await loadMembers();
    } catch (err) {
      console.error('Lỗi khi đổi vai trò:', err);
    }
    setOpenMenuId(null);
  };

  // Xử lý xóa thành viên
  const handleRemove = async (member) => {
    try {
      await onRemoveMember(groupId, member.userId);
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
    } catch (err) {
      console.error('Lỗi khi xóa thành viên:', err);
    }
    setOpenMenuId(null);
  };

  // Hiển thị nhãn vai trò
  const getRoleLabel = (role) => {
    if (role === 'GROUP_LEADER') return t('home.group.leader');
    if (role === 'CONTRIBUTOR') return t('home.group.contributor');
    return t('home.group.member');
  };

  const getRoleIcon = (role) => {
    if (role === 'GROUP_LEADER') return <Crown className="w-3 h-3" />;
    if (role === 'CONTRIBUTOR') return <Shield className="w-3 h-3" />;
    return null;
  };

  const getRoleBadgeClass = (role) => {
    if (role === 'GROUP_LEADER') {
      return isDarkMode ? 'bg-amber-950/50 text-amber-400' : 'bg-amber-100 text-amber-700';
    }
    if (role === 'CONTRIBUTOR') {
      return isDarkMode ? 'bg-purple-950/50 text-purple-400' : 'bg-purple-100 text-purple-700';
    }
    return isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600';
  };

  return (
    <aside className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between transition-colors duration-300 ${
        isDarkMode ? 'border-slate-800' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <Users className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
          <p className={`text-base font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'} ${fontClass}`}>
            {t('home.group.membersPanel')}
          </p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
            {members.length}
          </span>
        </div>
        {isLeader && (
          <button
            onClick={onOpenInvite}
            className={`p-1.5 rounded-lg transition-all active:scale-95 ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-blue-400' : 'hover:bg-gray-100 text-gray-500 hover:text-blue-600'
            }`}
            title={t('home.group.invite')}
          >
            <UserPlus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Thanh tìm kiếm */}
      <div className="p-3">
        <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${
          isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <Search className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
          <input
            className={`bg-transparent outline-none text-sm w-full ${isDarkMode ? 'text-slate-200 placeholder:text-slate-500' : 'text-gray-700 placeholder:text-gray-400'} ${fontClass}`}
            placeholder={t('home.group.members') + '...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Danh sách thành viên */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className={`w-5 h-5 animate-spin ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-8">
            <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-gray-400'} ${fontClass}`}>
              {t('home.group.noMembers')}
            </p>
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member.userId}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors relative ${
                isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'
              }`}
            >
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${
                isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'
              }`}>
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  (member.fullName || member.username || '?').charAt(0).toUpperCase()
                )}
              </div>

              {/* Thông tin thành viên */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {member.fullName || member.username}
                  </p>
                  {member.isCurrentUser && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-blue-950/50 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                      {t('home.group.you')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${getRoleBadgeClass(member.role)}`}>
                    {getRoleIcon(member.role)}
                    {getRoleLabel(member.role)}
                  </span>
                  {member.canUpload && (
                    <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                      isDarkMode ? 'bg-green-950/50 text-green-400' : 'bg-green-50 text-green-600'
                    }`}>
                      <Upload className="w-2.5 h-2.5" />
                      {t('home.group.canUpload')}
                    </span>
                  )}
                </div>
              </div>

              {/* Menu thao tác (chỉ leader và không phải chính mình) */}
              {isLeader && !member.isCurrentUser && member.role !== 'GROUP_LEADER' && (
                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === member.userId ? null : member.userId)}
                    className={`p-1 rounded-lg transition-all ${
                      isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-400'
                    }`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {openMenuId === member.userId && (
                    <div className={`absolute right-0 top-8 z-20 w-48 rounded-xl border shadow-lg overflow-hidden ${
                      isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'
                    }`}>
                      {/* Cấp/thu hồi quyền upload */}
                      <button
                        onClick={() => handleToggleUpload(member)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                          isDarkMode ? 'text-slate-300 hover:bg-slate-900' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Upload className="w-4 h-4" />
                        {member.canUpload ? t('home.group.revokeUpload') : t('home.group.grantUpload')}
                      </button>

                      {/* Đổi vai trò */}
                      {member.role === 'MEMBER' && (
                        <button
                          onClick={() => handleChangeRole(member, 'CONTRIBUTOR')}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                            isDarkMode ? 'text-slate-300 hover:bg-slate-900' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Shield className="w-4 h-4" />
                          {t('home.group.changeRole')} → {t('home.group.contributor')}
                        </button>
                      )}
                      {member.role === 'CONTRIBUTOR' && (
                        <button
                          onClick={() => handleChangeRole(member, 'MEMBER')}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                            isDarkMode ? 'text-slate-300 hover:bg-slate-900' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Shield className="w-4 h-4" />
                          {t('home.group.changeRole')} → {t('home.group.member')}
                        </button>
                      )}

                      {/* Xóa thành viên */}
                      <button
                        onClick={() => handleRemove(member)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                          isDarkMode ? 'text-red-400 hover:bg-red-950/30' : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <UserMinus className="w-4 h-4" />
                        {t('home.group.removeMember')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Nút mời thành viên ở cuối panel */}
      {isLeader && (
        <div className={`px-3 py-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}>
          <button
            onClick={onOpenInvite}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-2.5 text-sm font-medium transition-all active:scale-95 cursor-pointer border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
          >
            <UserPlus className="w-4 h-4" />
            {t('home.group.invite')}
          </button>
        </div>
      )}
    </aside>
  );
}

export default GroupMembersPanel;
