import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import GroupWorkspaceHeader from './Components/GroupWorkspaceHeader';
import SourcesPanel from '@/Pages/Users/Individual/Workspace/Components/SourcesPanel';
import ChatPanel from '@/Pages/Users/Individual/Workspace/Components/ChatPanel';
import StudioPanel from '@/Pages/Users/Individual/Workspace/Components/StudioPanel';
import InviteMemberDialog from './Components/InviteMemberDialog';
import { Globe, Moon, Settings, Sun, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useGroup } from '@/hooks/useGroup';

// Trang workspace dành cho nhóm - bố cục 3 cột giống WorkspacePage
function GroupWorkspacePage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const settingsRef = useRef(null);

  const { groups, inviteMember } = useGroup();

  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  // Tìm thông tin nhóm hiện tại từ danh sách
  const currentGroup = groups.find((g) => String(g.groupId) === String(groupId));

  // Xử lý mời thành viên
  const handleInvite = useCallback(async (email) => {
    await inviteMember(groupId, email);
  }, [groupId, inviteMember]);

  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  // Đóng menu settings khi click ra ngoài
  useEffect(() => {
    if (!isSettingsOpen) return;

    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  // Menu cài đặt (tái sử dụng pattern từ WorkspacePage)
  const settingsMenu = (
    <div ref={settingsRef} className="relative">
      <Button
        variant="outline"
        type="button"
        onClick={() => setIsSettingsOpen((prev) => !prev)}
        className={`rounded-full h-9 px-4 flex items-center gap-2 ${
          isDarkMode
            ? 'border-slate-700 text-slate-200 hover:bg-slate-900'
            : 'border-gray-200'
        }`}
        aria-expanded={isSettingsOpen}
        aria-haspopup="menu"
      >
        <Settings className="w-4 h-4" />
        <span className={fontClass}>{t('common.settings')}</span>
      </Button>

      {isSettingsOpen ? (
        <div
          role="menu"
          className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-lg overflow-hidden transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-800'
          }`}
        >
          <button
            type="button"
            onClick={toggleLanguage}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
              isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-50'
            }`}
          >
            <span className={`flex items-center gap-2 ${fontClass}`}>
              <Globe className="w-4 h-4" />
              {t('common.language')}
            </span>
            <span className={`text-xs font-semibold ${fontClass}`}>
              {currentLang === 'vi' ? 'VI' : 'EN'}
            </span>
          </button>
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
              isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-50'
            }`}
          >
            <span className={`flex items-center gap-2 ${fontClass}`}>
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {t('common.theme')}
            </span>
            <span className={`text-xs font-semibold ${fontClass}`}>
              {isDarkMode ? t('common.dark') : t('common.light')}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );

  // Nút quản lý nhóm thêm vào settingsMenu
  const manageGroupButton = (
    <Button
      variant="outline"
      type="button"
      onClick={() => navigate(`/group-manage/${groupId}`)}
      className={`rounded-full h-9 px-4 flex items-center gap-2 ${
        isDarkMode
          ? 'border-slate-700 text-slate-200 hover:bg-slate-900'
          : 'border-gray-200'
      }`}
    >
      <Users className="w-4 h-4" />
      <span className={fontClass}>{t('groupManage.title')}</span>
    </Button>
  );

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-[#F7FBFF]'}`}>
      <GroupWorkspaceHeader 
        groupName={currentGroup?.groupName}
        settingsMenu={<div className="flex items-center gap-2">{manageGroupButton}{settingsMenu}</div>} 
        isDarkMode={isDarkMode}
        onOpenInvite={() => setInviteDialogOpen(true)}
      />
      <div className="flex-1 min-h-[calc(100vh-64px)]">
        <div className="max-w-[1740px] mx-auto px-4 py-4 h-full">
          <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_320px] gap-4 h-[calc(100vh-64px-32px)]">
            {/* Panel trái: Sources (giống WorkspacePage cá nhân) */}
            <SourcesPanel isDarkMode={isDarkMode} />
            {/* Panel giữa: Chat (tái sử dụng) */}
            <ChatPanel isDarkMode={isDarkMode} />
            {/* Panel phải: Studio (tái sử dụng) */}
            <StudioPanel isDarkMode={isDarkMode} />
          </div>
        </div>
      </div>

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

export default GroupWorkspacePage;
