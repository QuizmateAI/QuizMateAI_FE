import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import GroupWorkspaceHeader from './Components/GroupWorkspaceHeader';
import SourcesPanel from './Components/SourcesPanel';
import ChatPanel from './Components/ChatPanel';
import StudioPanel from './Components/StudioPanel';
import UploadSourceDialog from './Components/UploadSourceDialog';
import InviteMemberDialog from './Group_leader/InviteMemberDialog';
import { Globe, Moon, Settings, Sun, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useGroup } from '@/hooks/useGroup';
import { createRoadmap } from '@/api/RoadmapAPI';

// Trang workspace dành cho nhóm - bố cục 3 cột giống WorkspacePage
function GroupWorkspacePage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(true);
  const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);
  const [isStudioCollapsed, setIsStudioCollapsed] = useState(false);
  const [activeView, setActiveView] = useState(null);
  // State lưu quiz đang được xem chi tiết hoặc chỉnh sửa
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [sources, setSources] = useState([]);
  const [createdItems, setCreatedItems] = useState([]);
  const [accessHistory, setAccessHistory] = useState([]);
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(320);
  const [isLeftResizing, setIsLeftResizing] = useState(false);
  const [isRightResizing, setIsRightResizing] = useState(false);
  const settingsRef = useRef(null);

  // Hằng số kích thước panel
  const COLLAPSED_WIDTH = 56;
  const MIN_WIDTH = 240;
  const MAX_WIDTH = 500;

  const effectiveLeftWidth = isSourcesCollapsed ? COLLAPSED_WIDTH : leftWidth;
  const effectiveRightWidth = isStudioCollapsed ? COLLAPSED_WIDTH : rightWidth;

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

  // Xử lý hành động từ studio panel — hiển thị form inline trong ChatPanel
  const handleStudioAction = useCallback((actionKey) => {
    // Ghi lịch sử truy cập khi người dùng mở list view
    const viewTypeMap = { roadmap: 'Roadmap', quiz: 'Quiz', flashcard: 'Flashcard', mockTest: 'MockTest' };
    if (viewTypeMap[actionKey]) {
      addAccessHistory(viewTypeMap[actionKey], viewTypeMap[actionKey], actionKey);
    }
    setActiveView(actionKey);
  }, []);

  // Hàm thêm vào lịch sử truy cập — ghi nhận mỗi lần truy cập list view
  const addAccessHistory = useCallback((name, type, actionKey) => {
    setAccessHistory((prev) => {
      const filtered = prev.filter((item) => item.actionKey !== actionKey);
      return [{ name, type, actionKey, accessedAt: new Date().toISOString() }, ...filtered].slice(0, 20);
    });
  }, []);

  // Xử lý tạo quiz — callback khi CreateQuizForm hoàn tất API multi-step
  const handleCreateQuiz = useCallback(async (data) => {
    // Quiz đã được tạo xong từ CreateQuizForm → chuyển về list view
    setActiveView('quiz');
  }, []);

  // Xử lý xem chi tiết quiz — khi click vào quiz trong danh sách
  const handleViewQuiz = useCallback((quiz) => {
    setSelectedQuiz(quiz);
    setActiveView('quizDetail');
  }, []);

  // Xử lý chuyển sang chỉnh sửa quiz — từ detail view
  const handleEditQuiz = useCallback((quiz) => {
    setSelectedQuiz(quiz);
    setActiveView('editQuiz');
  }, []);

  // Xử lý lưu quiz sau khi chỉnh sửa — quay về detail view
  const handleSaveQuiz = useCallback((updatedQuiz) => {
    setSelectedQuiz((prev) => ({ ...prev, ...updatedQuiz }));
    setActiveView('quizDetail');
  }, []);

  // Xử lý tạo flashcard — gọi từ form inline trong ChatPanel
  const handleCreateFlashcard = useCallback(async (data) => {
    // TODO: Gọi API tạo flashcard cho group
    const deckName = data.deckName || 'Flashcard';
    const now = new Date().toISOString();
    setCreatedItems((prev) => [...prev, {
      id: `created-f-${Date.now()}`,
      name: deckName,
      type: 'Flashcard',
      belongTo: 'group',
      belongToName: 'Current Group',
      cardsCount: data.cards?.length || 0,
      createdAt: now,
      updatedAt: now,
    }]);
    setActiveView('flashcard');
  }, []);

  // Xử lý tạo roadmap — gọi API tạo roadmap cho group
  const handleCreateRoadmap = useCallback(async (data) => {
    try {
      const res = await createRoadmap({
        groupId,
        name: data.name || 'Roadmap',
        description: data.goal || data.description || '',
      });
      const created = res.data?.data || res.data;
      setCreatedItems((prev) => [...prev, {
        id: created.roadmapId || created.id || `created-rm-${Date.now()}`,
        name: created.title || data.name || 'Roadmap',
        type: 'Roadmap',
        status: created.status || 'INACTIVE',
        createVia: created.createVia || 'MANUAL',
        roadmapType: created.roadmapType || 'GENERAL',
        createdAt: created.createdAt || new Date().toISOString(),
      }]);
      setActiveView('roadmap');
    } catch (err) {
      // Lỗi tạo roadmap — log để debug
      console.error('Tạo roadmap thất bại:', err);
    }
  }, [groupId]);

  // Quay về list view tương ứng khi bấm nút Back trong form tạo
  const handleBackFromForm = useCallback(() => {
    const formToList = { createRoadmap: 'roadmap', createQuiz: 'quiz', createFlashcard: 'flashcard', quizDetail: 'quiz', editQuiz: 'quizDetail' };
    const nextView = formToList[activeView] || null;
    if (nextView !== 'quizDetail' && nextView !== 'editQuiz') {
      setSelectedQuiz(null);
    }
    setActiveView(nextView);
  }, [activeView]);

  // Kéo thả thay đổi kích thước panel trái (Sources)
  const handleLeftResize = useCallback((e) => {
    if (isSourcesCollapsed) return;
    e.preventDefault();
    setIsLeftResizing(true);
    const startX = e.clientX;
    const startW = leftWidth;
    const onMove = (ev) => {
      setLeftWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + ev.clientX - startX)));
    };
    const onUp = () => {
      setIsLeftResizing(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [leftWidth, isSourcesCollapsed]);

  // Kéo thả thay đổi kích thước panel phải (Studio)
  const handleRightResize = useCallback((e) => {
    if (isStudioCollapsed) return;
    e.preventDefault();
    setIsRightResizing(true);
    const startX = e.clientX;
    const startW = rightWidth;
    const onMove = (ev) => {
      setRightWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW - (ev.clientX - startX))));
    };
    const onUp = () => {
      setIsRightResizing(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [rightWidth, isStudioCollapsed]);

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
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-[#F7FBFF]'}`}>
      <GroupWorkspaceHeader 
        groupName={currentGroup?.groupName}
        settingsMenu={<div className="flex items-center gap-2">{manageGroupButton}{settingsMenu}</div>} 
        isDarkMode={isDarkMode}
        onOpenInvite={() => setInviteDialogOpen(true)}
      />
      <div className="flex-1 min-h-0">
        <div className="max-w-[1740px] mx-auto px-4 py-4 h-full">
          {/* Layout flex với resize handles — kéo thả để thay đổi kích thước */}
          <div className="flex h-full">
            {/* Panel nguồn tài liệu (trái) */}
            <div
              style={{ width: effectiveLeftWidth, minWidth: effectiveLeftWidth }}
              className={`shrink-0 h-full ${isLeftResizing ? '' : 'transition-[width,min-width] duration-300 ease-in-out'}`}
            >
              <SourcesPanel
                isDarkMode={isDarkMode}
                sources={sources}
                onAddSource={() => setUploadDialogOpen(true)}
                onRemoveSource={handleRemoveSource}
                isCollapsed={isSourcesCollapsed}
                onToggleCollapse={() => setIsSourcesCollapsed((prev) => !prev)}
              />
            </div>

            {/* Resize handle trái */}
            <div
              className={`shrink-0 flex items-center justify-center ${isLeftResizing ? '' : 'transition-all duration-300 ease-in-out'} ${isSourcesCollapsed ? 'w-2' : 'w-4 cursor-col-resize group'}`}
              onMouseDown={isSourcesCollapsed ? undefined : handleLeftResize}
            >
              {!isSourcesCollapsed && (
                <div className={`w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`} />
              )}
            </div>

            {/* Panel khu vực học tập (giữa) */}
            <div className="flex-1 min-w-0 h-full">
              <ChatPanel
                isDarkMode={isDarkMode}
                sources={sources}
                activeView={activeView}
                createdItems={createdItems}
                onUploadClick={() => setUploadDialogOpen(true)}
                onChangeView={handleStudioAction}
                onCreateQuiz={handleCreateQuiz}
                onCreateFlashcard={handleCreateFlashcard}
                onCreateRoadmap={handleCreateRoadmap}
                onBack={handleBackFromForm}
                groupId={groupId}
                selectedQuiz={selectedQuiz}
                onViewQuiz={handleViewQuiz}
                onEditQuiz={handleEditQuiz}
                onSaveQuiz={handleSaveQuiz}
              />
            </div>

            {/* Resize handle phải */}
            <div
              className={`shrink-0 flex items-center justify-center ${isRightResizing ? '' : 'transition-all duration-300 ease-in-out'} ${isStudioCollapsed ? 'w-2' : 'w-4 cursor-col-resize group'}`}
              onMouseDown={isStudioCollapsed ? undefined : handleRightResize}
            >
              {!isStudioCollapsed && (
                <div className={`w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`} />
              )}
            </div>

            {/* Panel Studio (phải) */}
            <div
              style={{ width: effectiveRightWidth, minWidth: effectiveRightWidth }}
              className={`shrink-0 h-full ${isRightResizing ? '' : 'transition-[width,min-width] duration-300 ease-in-out'}`}
            >
              <StudioPanel
                isDarkMode={isDarkMode}
                onAction={handleStudioAction}
                accessHistory={accessHistory}
                isCollapsed={isStudioCollapsed}
                onToggleCollapse={() => setIsStudioCollapsed((prev) => !prev)}
                activeView={activeView}
              />
            </div>
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
