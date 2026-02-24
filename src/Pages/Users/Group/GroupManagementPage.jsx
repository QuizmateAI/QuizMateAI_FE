import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useGroup } from '@/hooks/useGroup';
import { ArrowLeft, LayoutDashboard, Users, Settings } from 'lucide-react';
import GroupDashboardTab from './Components/GroupDashboardTab';
import GroupMembersTab from './Components/GroupMembersTab';
import GroupSettingsTab from './Components/GroupSettingsTab';
import InviteMemberDialog from './Components/InviteMemberDialog';

// Trang quản lý nhóm: Dashboard + Thành viên + Cài đặt
function GroupManagementPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const {
    groups,
    fetchGroups,
    fetchMembers,
    grantUpload,
    revokeUpload,
    updateMemberRole,
    inviteMember,
    removeMember,
  } = useGroup();

  // Tìm thông tin nhóm hiện tại
  const currentGroup = groups.find((g) => String(g.groupId) === String(groupId));
  const currentUserRole = currentGroup?.memberRole || 'MEMBER';
  const isLeader = currentUserRole === 'LEADER';

  // Tải danh sách thành viên
  const loadMembers = useCallback(async () => {
    if (!groupId) return;
    setMembersLoading(true);
    try {
      const data = await fetchMembers(groupId);
      setMembers(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách thành viên:', err);
    } finally {
      setMembersLoading(false);
    }
  }, [groupId, fetchMembers]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Xử lý mời thành viên
  const handleInvite = useCallback(async (email) => {
    await inviteMember(groupId, email);
    await loadMembers();
  }, [groupId, inviteMember, loadMembers]);

  // Danh sách tab
  const tabs = [
    { id: 'dashboard', label: t('groupManage.tabs.dashboard'), icon: LayoutDashboard },
    { id: 'members', label: t('groupManage.tabs.members'), icon: Users },
    { id: 'settings', label: t('groupManage.tabs.settings'), icon: Settings },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-[#F7FBFF]'} ${fontClass}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Trái: Nút quay lại + Tên nhóm */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/group-workspace/${groupId}`)}
              className={`p-2 rounded-xl transition-all active:scale-95 ${
                isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentGroup?.groupName || t('groupManage.title')}
              </h1>
              <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                {t('groupManage.subtitle')}
              </p>
            </div>
          </div>

          {/* Phải: Tabs */}
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                    isActive
                      ? isDarkMode
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'bg-blue-50 text-blue-600'
                      : isDarkMode
                        ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Nội dung tab */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {activeTab === 'dashboard' && (
          <GroupDashboardTab
            isDarkMode={isDarkMode}
            group={currentGroup}
            members={members}
            membersLoading={membersLoading}
          />
        )}

        {activeTab === 'members' && (
          <GroupMembersTab
            isDarkMode={isDarkMode}
            groupId={groupId}
            members={members}
            membersLoading={membersLoading}
            isLeader={isLeader}
            onReload={loadMembers}
            onGrantUpload={grantUpload}
            onRevokeUpload={revokeUpload}
            onUpdateRole={updateMemberRole}
            onRemoveMember={removeMember}
            onOpenInvite={() => setInviteDialogOpen(true)}
          />
        )}

        {activeTab === 'settings' && (
          <GroupSettingsTab
            isDarkMode={isDarkMode}
            group={currentGroup}
            isLeader={isLeader}
            onGroupUpdated={fetchGroups}
          />
        )}
      </main>

      {/* Dialog mời thành viên */}
      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleInvite}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

export default GroupManagementPage;
