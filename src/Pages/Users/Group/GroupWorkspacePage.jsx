import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/Components/ui/button';
import GroupWorkspaceHeader from './Components/GroupWorkspaceHeader';
import SourcesPanel from './Components/SourcesPanel';
import ChatPanel from './Components/ChatPanel';
import StudioPanel from './Components/StudioPanel';
import UploadSourceDialog from './Components/UploadSourceDialog';
import InviteMemberDialog from './Group_leader/InviteMemberDialog';
import CreateGroupInfoDialog from './Components/CreateGroupInfoDialog';
import { Globe, Moon, Settings, Sun, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useGroup } from '@/hooks/useGroup';
import { useTopicsForCreate } from '@/hooks/useTopicsForCreate';
import { useWebSocket } from '@/hooks/useWebSocket';
import { createRoadmap, createPhase, createKnowledge } from '@/api/RoadmapAPI';
import { useNavigateWithLoading } from '@/hooks/useNavigateWithLoading';
import { getMaterialsByWorkspace, deleteMaterial, uploadMaterial } from '@/api/MaterialAPI';
import { useToast } from '@/context/ToastContext';

// Trang workspace dành cho nhóm - bố cục 3 cột giống WorkspacePage
function GroupWorkspacePage() {
  const { groupId } = useParams();
  const navigate = useNavigateWithLoading();
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { showError, showInfo } = useToast();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Chế độ tạo mới: groupId === 'new'
  const isCreating = groupId === 'new';
  const [createDialogOpen, setCreateDialogOpen] = useState(isCreating);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [hasCheckedInitialSources, setHasCheckedInitialSources] = useState(false);
  const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);
  const [isStudioCollapsed, setIsStudioCollapsed] = useState(false);
  const [activeView, setActiveView] = useState(null);
  // State lưu quiz đang được xem chi tiết hoặc chỉnh sửa
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  // State lưu flashcard đang được xem chi tiết
  const [selectedFlashcard, setSelectedFlashcard] = useState(null);
  // State lưu mock test đang được xem chi tiết hoặc chỉnh sửa
  const [selectedMockTest, setSelectedMockTest] = useState(null);
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

  const { groups, inviteMember, createGroup } = useGroup();

  // Topics cho CreateGroupInfoDialog - chỉ fetch khi đang tạo mới
  const { topics, topicsLoading } = useTopicsForCreate(isCreating);

  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  // Tìm thông tin nhóm hiện tại từ danh sách
  const currentGroup = isCreating ? null : groups.find((g) => String(g.groupId) === String(groupId));

  // WebSocket để nhận realtime updates cho tài liệu
  const { isConnected: wsConnected } = useWebSocket({
    groupId: !isCreating ? groupId : null,
    enabled: !isCreating && !!groupId && groupId !== 'new',
    onMaterialUploaded: (data) => {
      console.log('📤 Realtime: Material uploaded', data);
      fetchSources();
    },
    onMaterialDeleted: (data) => {
      console.log('🗑️ Realtime: Material deleted', data);
      fetchSources();
    },
    onMaterialUpdated: (data) => {
      console.log('🔄 Realtime: Material updated', data);
      fetchSources();
    },
  });

  // Fetch materials list
  const fetchSources = useCallback(async () => {
    if (!groupId || isCreating) return [];
    try {
      const data = await getMaterialsByWorkspace(groupId);
      const mappedSources = Array.isArray(data)
        ? data.map((item) => ({
          id: item.materialId,
          name: item.title,
          type: item.materialType,
          status: item.status,
          uploadedAt: item.uploadedAt,
          ...item,
        }))
        : [];

      setSources(mappedSources);
      return mappedSources;
    } catch (err) {
      console.error("❌ [fetchSources] Failed to fetch materials:", err);
      return [];
    }
  }, [groupId, isCreating]);

  // Tự động mở popup upload CHỈ KHI group workspace chưa có tài liệu (lần đầu tiên)
  useEffect(() => {
    if (isCreating || hasCheckedInitialSources) return;
    
    // Chỉ check sau khi đã có groupId
    if (!groupId || groupId === 'new') return;
    
    // Đợi một chút để đảm bảo data đã load
    const timer = setTimeout(() => {
      fetchSources();
      setHasCheckedInitialSources(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [groupId, isCreating, hasCheckedInitialSources, fetchSources]);

  // Xử lý mời thành viên
  const handleInvite = useCallback(async (email) => {
    await inviteMember(groupId, email);
  }, [groupId, inviteMember]);

  // Xử lý tạo group mới từ dialog
  const handleCreateGroup = useCallback(async (data) => {
    const newGroup = await createGroup(data);
    const newGroupId = newGroup?.groupId;
    if (newGroupId) {
      setCreateDialogOpen(false);
      navigate(`/group-workspace/${newGroupId}`, { replace: true });
    }
  }, [createGroup, navigate]);

  // Khi đóng dialog tạo mà chưa submit → quay về trang chủ
  const handleCreateDialogChange = useCallback((open) => {
    setCreateDialogOpen(open);
    if (!open && isCreating) {
      navigate('/home');
    }
  }, [isCreating, navigate]);

  // Xử lý upload file tài liệu - song song
  const handleUploadFiles = useCallback(async (files) => {
    if (!groupId || isCreating) {
      showError('Không thể upload: groupId không hợp lệ');
      return;
    }

    try {
      // Upload all files in parallel
      const uploadPromises = files.map((file) =>
        uploadMaterial(file, groupId)
          .then((res) => {
            const material = res?.data?.data || res?.data || res;
            return {
              id: material.materialId,
              name: material.title,
              type: material.materialType,
              status: material.status || 'PROCESSING',
              uploadedAt: material.uploadedAt,
              ...material,
            };
          })
          .catch((err) => {
            console.error('Upload failed for', file.name, err);
            return null;
          })
      );

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((r) => r !== null);

      if (successfulUploads.length > 0) {
        setSources((prev) => [...prev, ...successfulUploads]);
        showInfo(`Uploaded ${successfulUploads.length} file(s) successfully`);
      } else {
        showError('All uploads failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showError('Upload failed: ' + (err?.message || 'Unknown error'));
    }
  }, [groupId, isCreating, showError, showInfo]);

  // Xóa tài liệu đơn lẻ khỏi workspace nhóm
  const handleRemoveSource = useCallback((sourceId) => {
    try {
      deleteMaterial(sourceId);
      setSources((prev) => prev.filter((source) => source.id !== sourceId));
      showInfo('Material deleted');
    } catch (err) {
      console.error('Delete failed:', err);
      showError('Delete failed: ' + (err?.message || 'Unknown error'));
    }
  }, [showError, showInfo]);

  // Xóa nhiều tài liệu cùng lúc - song song
  const handleRemoveMultipleSources = useCallback(async (sourceIds) => {
    try {
      // Delete all materials in parallel
      const deletePromises = sourceIds.map((id) =>
        deleteMaterial(id).catch((err) => {
          console.error('Delete failed for', id, err);
          return null;
        })
      );

      await Promise.all(deletePromises);
      setSources((prev) => prev.filter((source) => !sourceIds.includes(source.id)));
      showInfo(`Deleted ${sourceIds.length} material(s)`);
    } catch (err) {
      console.error('Bulk delete error:', err);
      showError('Delete failed: ' + (err?.message || 'Unknown error'));
    }
  }, [showError, showInfo]);

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

  // Xử lý tạo flashcard — callback từ CreateFlashcardForm (API đã gọi xong)
  const handleCreateFlashcard = useCallback(async () => {
    // Chuyển về list view để reload danh sách
    setActiveView('flashcard');
  }, []);

  // Xử lý xem chi tiết flashcard — khi click vào flashcard trong danh sách
  const handleViewFlashcard = useCallback((flashcard) => {
    setSelectedFlashcard(flashcard);
    setActiveView('flashcardDetail');
  }, []);

  // Xử lý xóa flashcard — gọi API xóa flashcard set
  const handleDeleteFlashcard = useCallback(async (flashcard) => {
    if (!window.confirm('Bạn có chắc muốn xóa bộ flashcard này?')) return;
    try {
      const { deleteFlashcardSet } = await import('@/api/FlashcardAPI');
      await deleteFlashcardSet(flashcard.flashcardSetId);
      // Quay về list view để reload danh sách
      setActiveView('flashcard');
    } catch (err) {
      console.error('Xóa flashcard thất bại:', err);
    }
  }, []);

  // Xử lý tạo roadmap — gọi API tạo roadmap cho group
  const handleCreateRoadmap = useCallback(async (data) => {
    try {
      const roadmapRes = await createRoadmap({
        groupId,
        name: data.name || 'Roadmap',
        description: data.goal || data.description || '',
      });

      const createdRoadmap = roadmapRes.data?.data || roadmapRes.data || {};
      const roadmapId = createdRoadmap.roadmapId || createdRoadmap.id;
      if (!roadmapId) {
        throw new Error('Không lấy được roadmapId sau khi tạo roadmap.');
      }

      const serverPhases = [];
      const formPhases = Array.isArray(data.phases) ? data.phases : [];

      for (let pIdx = 0; pIdx < formPhases.length; pIdx += 1) {
        const phase = formPhases[pIdx];
        const phaseRes = await createPhase(roadmapId, {
          name: phase?.name || `Phase ${pIdx + 1}`,
          description: phase?.description || '',
          studyDurationInDay: phase?.studyDurationInDay || 0,
        });

        const createdPhase = phaseRes.data?.data || phaseRes.data || {};
        const phaseId = createdPhase.phaseId || createdPhase.id;
        const phaseKnowledges = [];

        const knowledges = Array.isArray(phase?.knowledges) ? phase.knowledges : [];
        for (let kIdx = 0; kIdx < knowledges.length; kIdx += 1) {
          const knowledge = knowledges[kIdx];
          if (!phaseId) continue;

          const knowledgeRes = await createKnowledge(phaseId, {
            name: knowledge?.name || `Knowledge ${kIdx + 1}`,
            description: knowledge?.description || '',
          });

          const createdKnowledge = knowledgeRes.data?.data || knowledgeRes.data || {};
          phaseKnowledges.push({
            id: createdKnowledge.knowledgeId || createdKnowledge.id || `created-kn-${Date.now()}-${kIdx}`,
            name: createdKnowledge.title || knowledge?.name || `Knowledge ${kIdx + 1}`,
            quizCount: 0,
            flashcardCount: 0,
            createdAt: createdKnowledge.createdAt || new Date().toISOString(),
            updatedAt: createdKnowledge.updatedAt || new Date().toISOString(),
          });
        }

        serverPhases.push({
          id: phaseId || `created-ph-${Date.now()}-${pIdx}`,
          name: createdPhase.title || phase?.name || `Phase ${pIdx + 1}`,
          createdAt: createdPhase.createdAt || new Date().toISOString(),
          updatedAt: createdPhase.updatedAt || new Date().toISOString(),
          knowledges: phaseKnowledges,
        });
      }

      setCreatedItems((prev) => [...prev, {
        id: roadmapId,
        name: createdRoadmap.title || data.name || 'Roadmap',
        type: 'Roadmap',
        status: createdRoadmap.status || 'INACTIVE',
        createVia: createdRoadmap.createVia || (data.mode === 'ai' ? 'AI' : 'MANUAL'),
        roadmapType: createdRoadmap.roadmapType || 'GENERAL',
        phasesCount: serverPhases.length,
        phases: serverPhases,
        createdAt: createdRoadmap.createdAt || new Date().toISOString(),
        updatedAt: createdRoadmap.updatedAt || new Date().toISOString(),
      }]);
      setActiveView('roadmap');
    } catch (err) {
      // Lỗi tạo roadmap — log để debug
      console.error('Tạo roadmap thất bại:', err);
      throw err;
    }
  }, [groupId]);

  // Quay về list view tương ứng khi bấm nút Back trong form tạo
  const handleBackFromForm = useCallback(() => {
    const formToList = { createRoadmap: 'roadmap', createQuiz: 'quiz', createFlashcard: 'flashcard', quizDetail: 'quiz', editQuiz: 'quizDetail', flashcardDetail: 'flashcard', createMockTest: 'mockTest', mockTestDetail: 'mockTest', editMockTest: 'mockTestDetail' };
    const nextView = formToList[activeView] || null;
    if (nextView !== 'quizDetail' && nextView !== 'editQuiz') {
      setSelectedQuiz(null);
    }
    if (nextView !== 'flashcardDetail') {
      setSelectedFlashcard(null);
    }
    if (nextView !== 'mockTestDetail' && nextView !== 'editMockTest') {
      setSelectedMockTest(null);
    }
    setActiveView(nextView);
  }, [activeView]);

  // Xử lý tạo mock test — quay về list sau khi tạo thành công
  const handleCreateMockTest = useCallback(async () => {
    setActiveView('mockTest');
  }, []);

  // Xử lý xem chi tiết mock test
  const handleViewMockTest = useCallback((mt) => {
    setSelectedMockTest(mt);
    setActiveView('mockTestDetail');
  }, []);

  // Xử lý chỉnh sửa mock test
  const handleEditMockTest = useCallback((mt) => {
    setSelectedMockTest(mt);
    setActiveView('editMockTest');
  }, []);

  // Xử lý lưu mock test sau khi chỉnh sửa
  const handleSaveMockTest = useCallback((updatedMt) => {
    setSelectedMockTest((prev) => ({ ...prev, ...updatedMt }));
    setActiveView('mockTestDetail');
  }, []);

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
        groupId={groupId}
        groupName={currentGroup?.groupName}
        settingsMenu={<div className="flex items-center gap-2">{manageGroupButton}{settingsMenu}</div>} 
        isDarkMode={isDarkMode}
        onOpenInvite={() => setInviteDialogOpen(true)}
        wsConnected={wsConnected}
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
                onRemoveMultiple={handleRemoveMultipleSources}
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
                onCreateMockTest={handleCreateMockTest}
                onBack={handleBackFromForm}
                groupId={groupId}
                selectedQuiz={selectedQuiz}
                onViewQuiz={handleViewQuiz}
                onEditQuiz={handleEditQuiz}
                onSaveQuiz={handleSaveQuiz}
                selectedFlashcard={selectedFlashcard}
                onViewFlashcard={handleViewFlashcard}
                onDeleteFlashcard={handleDeleteFlashcard}
                selectedMockTest={selectedMockTest}
                onViewMockTest={handleViewMockTest}
                onEditMockTest={handleEditMockTest}
                onSaveMockTest={handleSaveMockTest}
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
      />

      {/* Dialog mời thành viên */}
      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleInvite}
        isDarkMode={isDarkMode}
      />

      {/* Dialog tạo group mới */}
      {isCreating && (
        <CreateGroupInfoDialog
          open={createDialogOpen}
          onOpenChange={handleCreateDialogChange}
          topics={topics}
          topicsLoading={topicsLoading}
          onCreate={handleCreateGroup}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}

export default GroupWorkspacePage;
