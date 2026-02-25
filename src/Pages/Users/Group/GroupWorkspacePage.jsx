import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import GroupWorkspaceHeader from './Components/GroupWorkspaceHeader';
import SourcesPanel from './Components/SourcesPanel';
import ChatPanel from './Components/ChatPanel';
import StudioPanel from './Components/StudioPanel';
import UploadSourceDialog from './Components/UploadSourceDialog';
import CreateQuizDialog from './Components/CreateQuizDialog';
import CreateFlashcardDialog from './Components/CreateFlashcardDialog';
import CreateRoadmapDialog from './Components/CreateRoadmapDialog';
import InviteMemberDialog from './Group_leader/InviteMemberDialog';
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
  const [uploadDialogOpen, setUploadDialogOpen] = useState(true);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [flashcardDialogOpen, setFlashcardDialogOpen] = useState(false);
  const [roadmapDialogOpen, setRoadmapDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState(null);
  const [sources, setSources] = useState([]);
  const [outputs, setOutputs] = useState([]);
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

  // Xử lý upload file tài liệu
  const handleUploadFiles = useCallback(async (files) => {
    // TODO: Gọi API upload thật cho workspace nhóm
    const newSources = files.map((file, index) => ({
      id: `src-${Date.now()}-${index}`,
      name: file.name,
      type: file.type?.includes('pdf') ? 'pdf' : file.type?.includes('image') ? 'image' : file.type?.includes('video') ? 'video' : 'file',
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
    }));
    setSources((prev) => [...prev, ...newSources]);
  }, []);

  // Xử lý thêm URL tài liệu
  const handleAddUrl = useCallback(async (url) => {
    // TODO: Gọi API thêm URL cho workspace nhóm
    setSources((prev) => [
      ...prev,
      {
        id: `src-${Date.now()}`,
        name: url,
        type: 'url',
        size: '',
      },
    ]);
  }, []);

  // Xóa tài liệu khỏi workspace nhóm
  const handleRemoveSource = useCallback((sourceId) => {
    setSources((prev) => prev.filter((source) => source.id !== sourceId));
  }, []);

  // Xử lý hành động từ studio panel
  const handleStudioAction = useCallback((actionKey) => {
    switch (actionKey) {
      case 'createRoadmap':
        setRoadmapDialogOpen(true);
        break;
      case 'createQuiz':
        setQuizDialogOpen(true);
        break;
      case 'createFlashcard':
        setFlashcardDialogOpen(true);
        break;
      case 'mockTest':
        setActiveView('mockTest');
        break;
      case 'prelearning':
        setActiveView('prelearning');
        break;
      default:
        break;
    }
  }, []);

  // Xử lý tạo quiz
  const handleCreateQuiz = useCallback(async (data) => {
    // TODO: Gọi API tạo quiz cho group
    setOutputs((prev) => [...prev, { name: data.name || 'Quiz', type: 'Quiz' }]);
    setActiveView('quiz');
  }, []);

  // Xử lý tạo flashcard
  const handleCreateFlashcard = useCallback(async (data) => {
    // TODO: Gọi API tạo flashcard cho group
    setOutputs((prev) => [...prev, { name: data.deckName || 'Flashcard', type: 'Flashcard' }]);
    setActiveView('flashcard');
  }, []);

  // Xử lý tạo roadmap
  const handleCreateRoadmap = useCallback(async (data) => {
    // TODO: Gọi API tạo roadmap cho group
    setOutputs((prev) => [...prev, { name: data.name || 'Roadmap', type: 'Roadmap' }]);
    setActiveView('roadmap');
  }, []);

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
            <SourcesPanel
              isDarkMode={isDarkMode}
              sources={sources}
              onAddSource={() => setUploadDialogOpen(true)}
              onRemoveSource={handleRemoveSource}
            />
            <ChatPanel
              isDarkMode={isDarkMode}
              sources={sources}
              activeView={activeView}
              onUploadClick={() => setUploadDialogOpen(true)}
            />
            <StudioPanel
              isDarkMode={isDarkMode}
              onAction={handleStudioAction}
              outputs={outputs}
            />
          </div>
        </div>
      </div>

      <UploadSourceDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        isDarkMode={isDarkMode}
        onUploadFiles={handleUploadFiles}
        onAddUrl={handleAddUrl}
      />

      <CreateQuizDialog
        open={quizDialogOpen}
        onOpenChange={setQuizDialogOpen}
        isDarkMode={isDarkMode}
        onCreateQuiz={handleCreateQuiz}
      />

      <CreateFlashcardDialog
        open={flashcardDialogOpen}
        onOpenChange={setFlashcardDialogOpen}
        isDarkMode={isDarkMode}
        onCreateFlashcard={handleCreateFlashcard}
      />

      <CreateRoadmapDialog
        open={roadmapDialogOpen}
        onOpenChange={setRoadmapDialogOpen}
        isDarkMode={isDarkMode}
        onCreateRoadmap={handleCreateRoadmap}
      />

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
