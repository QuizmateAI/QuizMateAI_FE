import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/Components/ui/button';
import GroupSidebar from './Components/GroupSidebar';
import SourcesPanel from './Components/SourcesPanel';
import UploadSourceDialog from './Components/UploadSourceDialog';
import InviteMemberDialog from './Group_leader/InviteMemberDialog';
import GroupWorkspaceProfileConfigDialog from './Components/GroupWorkspaceProfileConfigDialog';
import GroupDashboardTab from './Group_leader/GroupDashboardTab';
import GroupMembersTab from './Group_leader/GroupMembersTab';
import GroupSettingsTab from './Group_leader/GroupSettingsTab';
import ChatPanel from './Components/ChatPanel';
import UserProfilePopover from '@/Components/features/Users/UserProfilePopover';
import WebSocketStatus from '@/Components/features/WebSocketStatus';
import { Globe, Loader2, Moon, Settings, Sun, Users, UserPlus, ArrowLeft, Sparkles, Swords, BookOpen, ClipboardList, FolderOpen, Upload, PenLine, Map } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useGroup } from '@/hooks/useGroup';
import { useWebSocket } from '@/hooks/useWebSocket';
import { createRoadmap } from '@/api/RoadmapAPI';
import { useNavigateWithLoading } from '@/hooks/useNavigateWithLoading';
import { getMaterialsByWorkspace, deleteMaterial, uploadMaterial } from '@/api/MaterialAPI';
import { useToast } from '@/context/ToastContext';

function GroupWorkspacePage() {
  const { workspaceId } = useParams();
  const location = useLocation();
  const navigate = useNavigateWithLoading();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { showError, showInfo } = useToast();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Section navigation via URL
  const validSections = ['dashboard', 'members', 'documents', 'flashcard', 'quiz', 'roadmap', 'mockTest', 'challenge', 'settings'];
  const legacySectionMap = { flashcardQuiz: 'quiz' };
  const sectionFromUrl = searchParams.get('section');
  const resolvedSection = legacySectionMap[sectionFromUrl] || sectionFromUrl;
  const activeSection = validSections.includes(resolvedSection) ? resolvedSection : 'dashboard';

  const setActiveSection = (section) => {
    setSearchParams({ section }, { replace: true });
    // Reset sub-views when changing sections
    setActiveView(null);
    setSelectedQuiz(null);
    setSelectedFlashcard(null);
    setSelectedMockTest(null);
  };

  // Create mode
  const isCreating = workspaceId === 'new';
  const openProfileConfig = Boolean(location.state?.openProfileConfig);
  const [profileConfigOpen, setProfileConfigOpen] = useState(false);
  const [createdGroupWorkspaceId, setCreatedGroupWorkspaceId] = useState(null);
  const [isBootstrappingGroup, setIsBootstrappingGroup] = useState(isCreating);
  const autoCreateTriggeredRef = useRef(false);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [hasCheckedInitialSources, setHasCheckedInitialSources] = useState(false);
  // Sub-views for content sections
  const [activeView, setActiveView] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [selectedFlashcard, setSelectedFlashcard] = useState(null);
  const [selectedMockTest, setSelectedMockTest] = useState(null);
  const [sources, setSources] = useState([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  const [createdItems, setCreatedItems] = useState([]);
  const settingsRef = useRef(null);

  // Members state
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  const {
    workspaces,
    currentWorkspace,
    fetchWorkspaceDetail,
    createGroupWorkspace,
  } = useWorkspace({ enabled: !isCreating });

  const {
    groups,
    fetchGroups,
    fetchMembers,
    grantUpload,
    revokeUpload,
    updateMemberRole,
    inviteMember: inviteMemberHook,
    removeMember,
  } = useGroup();

  const currentWorkspaceFromList = isCreating
    ? null
    : workspaces.find((workspace) => String(workspace.workspaceId) === String(workspaceId));

  const currentGroupWorkspace = (() => {
    if (currentWorkspaceFromList) return currentWorkspaceFromList;
    if (String(currentWorkspace?.workspaceId) === String(workspaceId)) return currentWorkspace;
    return null;
  })();

  const currentGroupFromGroups = groups.find((g) => String(g.workspaceId) === String(workspaceId));

  const currentGroupName = currentGroupWorkspace?.displayTitle
    || currentGroupWorkspace?.title
    || currentGroupWorkspace?.name
    || currentGroupFromGroups?.groupName
    || '';
  const currentRoleKey = String(currentGroupWorkspace?.memberRole || currentGroupFromGroups?.memberRole || 'MEMBER').toUpperCase();
  const isLeader = currentRoleKey === 'LEADER';

  const resolvedWorkspaceId = currentGroupWorkspace?.workspaceId
    ?? (isCreating ? null : workspaceId);
  const canManageGroup = Boolean(resolvedWorkspaceId && workspaceId !== 'new');
  const pageShellClass = isDarkMode
    ? 'bg-[#06131a] text-white'
    : 'bg-[linear-gradient(180deg,#fffaf0_0%,#f4fbf7_46%,#eef6ff_100%)] text-slate-900';

  useEffect(() => {
    if (isCreating || !workspaceId || workspaceId === 'new') return;
    if (currentWorkspaceFromList?.workspaceId || String(currentWorkspace?.workspaceId) === String(workspaceId)) return;
    fetchWorkspaceDetail(workspaceId).catch((err) => {
      console.error('Failed to fetch group workspace detail:', err);
    });
  }, [currentWorkspace?.workspaceId, currentWorkspaceFromList?.workspaceId, fetchWorkspaceDetail, isCreating, workspaceId]);

  // WebSocket
  const { isConnected: wsConnected } = useWebSocket({
    workspaceId: !isCreating ? workspaceId : null,
    enabled: !isCreating && !!workspaceId && workspaceId !== 'new',
    onMaterialUploaded: () => fetchSources(),
    onMaterialDeleted: () => fetchSources(),
    onMaterialUpdated: () => fetchSources(),
  });

  // Fetch materials
  const fetchSources = useCallback(async () => {
    if (!workspaceId || isCreating) return [];
    try {
      const data = await getMaterialsByWorkspace(workspaceId);
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
  }, [workspaceId, isCreating]);

  useEffect(() => {
    if (isCreating || hasCheckedInitialSources) return;
    if (!workspaceId || workspaceId === 'new') return;
    const timer = setTimeout(() => {
      fetchSources();
      setHasCheckedInitialSources(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [workspaceId, isCreating, hasCheckedInitialSources, fetchSources]);

  // Fetch members
  const loadMembers = useCallback(async () => {
    if (!workspaceId || isCreating) return;
    setMembersLoading(true);
    try {
      const data = await fetchMembers(workspaceId);
      setMembers(data);
    } catch (err) {
      console.error('Error loading members:', err);
    } finally {
      setMembersLoading(false);
    }
  }, [workspaceId, isCreating, fetchMembers]);

  useEffect(() => {
    if (!isCreating && workspaceId && workspaceId !== 'new') {
      loadMembers();
    }
  }, [loadMembers, isCreating, workspaceId]);

  useEffect(() => {
    if (!isCreating) {
      setIsBootstrappingGroup(false);
      return;
    }
    if (autoCreateTriggeredRef.current) return;

    autoCreateTriggeredRef.current = true;
    setIsBootstrappingGroup(true);

    const bootstrapGroupWorkspace = async () => {
      try {
        showInfo(currentLang === 'en' ? 'Creating group workspace...' : 'Dang tao group workspace...');
        const newGroupWorkspace = await createGroupWorkspace({ title: null });
        const newWorkspaceId = newGroupWorkspace?.workspaceId;

        if (!newWorkspaceId) {
          throw new Error(currentLang === 'en' ? 'Unable to create the group workspace.' : 'Khong the tao group workspace.');
        }

        setCreatedGroupWorkspaceId(newWorkspaceId);
        setProfileConfigOpen(true);
        navigate(`/group-workspace/${newWorkspaceId}`, {
          replace: true,
          state: { openProfileConfig: true },
        });
      } catch (error) {
        showError(error?.message || (currentLang === 'en' ? 'Unable to create the group workspace.' : 'Khong the tao group workspace.'));
        navigate('/home', { replace: true });
      } finally {
        setIsBootstrappingGroup(false);
      }
    };

    bootstrapGroupWorkspace();
  }, [createGroupWorkspace, currentLang, isCreating, navigate, showError, showInfo]);

  useEffect(() => {
    if (openProfileConfig && !isCreating) {
      setProfileConfigOpen(true);
    }
  }, [isCreating, openProfileConfig]);

  // Invite handler
  const handleInvite = useCallback(async (email) => {
    if (!canManageGroup) {
      throw new Error('Tính năng mời thành viên chưa sẵn sàng.');
    }
    await inviteMemberHook(resolvedWorkspaceId, email);
    showInfo('Gửi lời mời thành công!');
    await loadMembers();
  }, [resolvedWorkspaceId, canManageGroup, inviteMemberHook, showInfo, loadMembers]);

  // Upload files
  const handleUploadFiles = useCallback(async (files) => {
    if (!workspaceId || isCreating) {
      showError('Không thể upload: workspaceId không hợp lệ');
      return;
    }
    try {
      const uploadPromises = files.map((file) =>
        uploadMaterial(file, workspaceId)
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
  }, [workspaceId, isCreating, showError, showInfo]);

  // Remove source
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

  const handleRemoveMultipleSources = useCallback(async (sourceIds) => {
    try {
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

  // Content action handlers — quiz, flashcard, mocktest, roadmap
  const handleStudioAction = useCallback((actionKey) => {
    setActiveView(actionKey);
  }, []);

  const handleCreateQuiz = useCallback(async () => { setActiveView('quiz'); }, []);
  const handleViewQuiz = useCallback((quiz) => { setSelectedQuiz(quiz); setActiveView('quizDetail'); }, []);
  const handleEditQuiz = useCallback((quiz) => { setSelectedQuiz(quiz); setActiveView('editQuiz'); }, []);
  const handleSaveQuiz = useCallback((updatedQuiz) => { setSelectedQuiz((p) => ({ ...p, ...updatedQuiz })); setActiveView('quizDetail'); }, []);

  const handleCreateFlashcard = useCallback(async () => { setActiveView('flashcard'); }, []);
  const handleViewFlashcard = useCallback((fc) => { setSelectedFlashcard(fc); setActiveView('flashcardDetail'); }, []);
  const handleDeleteFlashcard = useCallback(async (fc) => {
    if (!window.confirm('Bạn có chắc muốn xóa bộ flashcard này?')) return;
    try {
      const { deleteFlashcardSet } = await import('@/api/FlashcardAPI');
      await deleteFlashcardSet(fc.flashcardSetId);
      setActiveView('flashcard');
    } catch (err) {
      console.error('Xóa flashcard thất bại:', err);
    }
  }, []);

  const handleCreateRoadmap = useCallback(async (data) => {
    try {
      await createRoadmap({ workspaceId, ...data, mode: 'ai', name: data.name || 'Roadmap', goal: data.goal || data.description || '', description: data.goal || data.description || '' });
      setActiveView('roadmap');
    } catch (err) {
      console.error('Tạo roadmap thất bại:', err);
      throw err;
    }
  }, [workspaceId]);

  const handleCreateMockTest = useCallback(async () => { setActiveView('mockTest'); }, []);
  const handleViewMockTest = useCallback((mt) => { setSelectedMockTest(mt); setActiveView('mockTestDetail'); }, []);
  const handleEditMockTest = useCallback((mt) => { setSelectedMockTest(mt); setActiveView('editMockTest'); }, []);
  const handleSaveMockTest = useCallback((updatedMt) => { setSelectedMockTest((p) => ({ ...p, ...updatedMt })); setActiveView('mockTestDetail'); }, []);

  const handleBackFromForm = useCallback(() => {
    const formToList = { createRoadmap: 'roadmap', createQuiz: 'quiz', createFlashcard: 'flashcard', quizDetail: 'quiz', editQuiz: 'quizDetail', flashcardDetail: 'flashcard', createMockTest: 'mockTest', mockTestDetail: 'mockTest', editMockTest: 'mockTestDetail' };
    const nextView = formToList[activeView] || null;
    if (nextView !== 'quizDetail' && nextView !== 'editQuiz') setSelectedQuiz(null);
    if (nextView !== 'flashcardDetail') setSelectedFlashcard(null);
    if (nextView !== 'mockTestDetail' && nextView !== 'editMockTest') setSelectedMockTest(null);
    setActiveView(nextView);
  }, [activeView]);

  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  // Close settings dropdown
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

  // ——— Section titles ———
  const sectionTitles = {
    dashboard: { vi: 'Dashboard', en: 'Dashboard', icon: null },
    members: { vi: 'Quản lý thành viên', en: 'Member Management', icon: Users },
    documents: { vi: 'Quản lý tài liệu', en: 'Document Management', icon: FolderOpen },
    flashcard: { vi: 'Flashcard', en: 'Flashcard', icon: BookOpen },
    quiz: { vi: 'Quiz', en: 'Quiz', icon: PenLine },
    roadmap: { vi: 'Roadmap', en: 'Roadmap', icon: Map },
    mockTest: { vi: 'Mock Test', en: 'Mock Test', icon: ClipboardList },
    challenge: { vi: 'Challenge', en: 'Challenge', icon: Swords },
    settings: { vi: 'Cài đặt', en: 'Settings', icon: Settings },
  };

  const renderStudioPanel = (defaultView) => (
    <div className={`rounded-[28px] border overflow-hidden ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-white/80 bg-white/82'}`} style={{ minHeight: 500 }}>
      <ChatPanel
        isDarkMode={isDarkMode}
        sources={sources}
        selectedSourceIds={selectedSourceIds}
        activeView={activeView || defaultView}
        createdItems={createdItems}
        onUploadClick={() => setUploadDialogOpen(true)}
        onChangeView={handleStudioAction}
        onCreateQuiz={handleCreateQuiz}
        onCreateFlashcard={handleCreateFlashcard}
        onCreateRoadmap={handleCreateRoadmap}
        onCreateMockTest={handleCreateMockTest}
        onBack={handleBackFromForm}
        workspaceId={workspaceId}
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
  );

  // ——— RENDER MAIN CONTENT ———
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <GroupDashboardTab
            isDarkMode={isDarkMode}
            group={currentGroupFromGroups || currentGroupWorkspace}
            members={members}
            membersLoading={membersLoading}
            isLeader={isLeader}
          />
        );

      case 'members':
        return (
          <GroupMembersTab
            isDarkMode={isDarkMode}
            workspaceId={workspaceId}
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
        );

      case 'documents':
        return (
          <div className="space-y-5">
            {/* Upload button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentLang === 'en' ? 'Source Materials' : 'Nguồn tài liệu'}
                </h3>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {currentLang === 'en'
                    ? `${sources.length} document(s) in this workspace`
                    : `${sources.length} tài liệu trong không gian này`}
                </p>
              </div>
              <Button
                onClick={() => setUploadDialogOpen(true)}
                className="rounded-full bg-cyan-600 px-5 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20 hover:bg-cyan-700"
              >
                <Upload className="mr-2 h-4 w-4" />
                {currentLang === 'en' ? 'Upload' : 'Tải lên'}
              </Button>
            </div>
            {/* Sources panel full-width */}
            <div className={`rounded-[28px] border overflow-hidden ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-white/80 bg-white/82'}`} style={{ minHeight: 400 }}>
              <SourcesPanel
                isDarkMode={isDarkMode}
                sources={sources}
                onAddSource={() => setUploadDialogOpen(true)}
                onRemoveSource={handleRemoveSource}
                onRemoveMultiple={handleRemoveMultipleSources}
                selectedIds={selectedSourceIds}
                onSelectionChange={setSelectedSourceIds}
                onSourceUpdated={(updatedSource) => {
                  setSources((prev) => prev.map((item) => item.id === updatedSource.id ? { ...item, ...updatedSource } : item));
                }}
                isCollapsed={false}
                onToggleCollapse={() => {}}
              />
            </div>
          </div>
        );

      case 'flashcard':
        return renderStudioPanel('flashcard');

      case 'quiz':
        return renderStudioPanel('quiz');

      case 'roadmap':
        return renderStudioPanel('roadmap');

      case 'mockTest':
        return renderStudioPanel('mockTest');

      case 'challenge':
        return (
          <div className={`relative overflow-hidden rounded-[32px] border p-10 text-center ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-white/80 bg-white/82'}`}>
            <div className={`pointer-events-none absolute inset-0 ${
              isDarkMode
                ? 'bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.12),transparent_50%)]'
                : 'bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.08),transparent_50%)]'
            }`} />
            <div className="relative">
              <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl ${isDarkMode ? 'bg-orange-400/10' : 'bg-orange-50'}`}>
                <Swords className={`h-10 w-10 ${isDarkMode ? 'text-orange-300' : 'text-orange-500'}`} />
              </div>
              <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {currentLang === 'en' ? 'Challenge Arena' : 'Đấu trường Challenge'}
              </h3>
              <p className={`mx-auto mt-3 max-w-md text-sm leading-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {currentLang === 'en'
                  ? 'Compete with your group members in real-time quizzes and challenges. This feature is coming soon!'
                  : 'Thi đấu cùng các thành viên trong nhóm qua các bài quiz và challenge theo thời gian thực. Tính năng sắp ra mắt!'}
              </p>
              <div className={`mx-auto mt-6 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold ${
                isDarkMode ? 'border-orange-400/20 bg-orange-400/10 text-orange-200' : 'border-orange-200 bg-orange-50 text-orange-700'
              }`}>
                <Sparkles className="h-4 w-4" />
                {currentLang === 'en' ? 'Coming Soon' : 'Sắp ra mắt'}
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <GroupSettingsTab
            isDarkMode={isDarkMode}
            group={currentGroupFromGroups || currentGroupWorkspace}
            isLeader={isLeader}
            onGroupUpdated={fetchGroups}
          />
        );

      default:
        return null;
    }
  };

  // ——— TOP BAR ———
  const topBar = (
    <header className={`relative z-[60] flex items-center justify-between gap-4 rounded-[22px] border px-5 py-3 backdrop-blur ${
      isDarkMode ? 'border-white/10 bg-[#0a1620]/90' : 'border-white/60 bg-white/80'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => navigate('/home')}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
            isDarkMode ? 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.10]' : 'border-white/80 bg-white/80 text-slate-700 hover:bg-white'
          }`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {currentLang === 'en' ? 'Home' : 'Trang chủ'}
        </button>
        <div className={`h-5 w-px ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
        <h1 className={`truncate text-base font-bold ${fontClass}`}>
          {sectionTitles[activeSection]?.[currentLang] || 'Dashboard'}
        </h1>
        <WebSocketStatus isConnected={wsConnected} isDarkMode={isDarkMode} compact />
      </div>

      <div className="flex items-center gap-2">
        {canManageGroup && (
          <Button
            onClick={() => setInviteDialogOpen(true)}
            variant="outline"
            className={`h-9 rounded-full border px-4 text-xs font-semibold shadow-none ${
              isDarkMode ? 'border-emerald-400/30 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/20' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            {t('workspace.header.invite')}
          </Button>
        )}

        {/* Settings dropdown */}
        <div ref={settingsRef} className="relative">
          <button
            type="button"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
              isDarkMode ? 'border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.10]' : 'border-white/80 bg-white/80 text-slate-600 hover:bg-white'
            }`}
          >
            <Settings className="h-4 w-4" />
          </button>
          {isSettingsOpen && (
            <div className={`absolute right-0 mt-2 w-48 rounded-xl border shadow-lg overflow-hidden z-[70] ${
              isDarkMode ? 'bg-[#09131a] border-white/10 text-slate-100' : 'bg-white/95 border-white text-gray-800'
            }`}>
              <button
                type="button"
                onClick={toggleLanguage}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-50'}`}
              >
                <span className="flex items-center gap-2"><Globe className="w-4 h-4" />{t('common.language')}</span>
                <span className="text-xs font-semibold">{currentLang === 'vi' ? 'VI' : 'EN'}</span>
              </button>
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-50'}`}
              >
                <span className="flex items-center gap-2">
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {t('common.theme')}
                </span>
                <span className="text-xs font-semibold">{isDarkMode ? t('common.dark') : t('common.light')}</span>
              </button>
            </div>
          )}
        </div>

        <UserProfilePopover isDarkMode={isDarkMode} />
      </div>
    </header>
  );

  const handleProfileConfigChange = useCallback((open) => {
    setProfileConfigOpen(open);
    if (!open && location.state?.openProfileConfig) {
      navigate(`${location.pathname}${location.search}`, { replace: true });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  if (isCreating && isBootstrappingGroup) {
    return (
      <div className={`relative flex h-screen items-center justify-center overflow-hidden transition-colors duration-300 ${pageShellClass}`}>
        <div className={`pointer-events-none absolute inset-0 ${
          isDarkMode
            ? 'bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_26%),radial-gradient(circle_at_85%_10%,rgba(245,158,11,0.14),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(56,189,248,0.12),transparent_28%)]'
            : 'bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(249,115,22,0.12),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.10),transparent_30%)]'
        }`} />
        <div className={`relative flex min-w-[320px] flex-col items-center gap-4 rounded-[28px] border px-8 py-10 shadow-2xl ${
          isDarkMode ? 'border-white/10 bg-[#09131a]/92 text-white' : 'border-white/80 bg-white/92 text-slate-900'
        }`}>
          <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
          <div className="text-center">
            <p className="text-lg font-semibold">{currentLang === 'en' ? 'Preparing your group workspace' : 'Dang khoi tao group workspace'}</p>
            <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {currentLang === 'en'
                ? 'The setup wizard will open as soon as the draft workspace is ready.'
                : 'Wizard setup se mo ngay khi workspace nhap duoc tao xong.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-screen flex flex-col overflow-hidden transition-colors duration-300 ${pageShellClass}`}>
      {/* BG gradients */}
      <div className={`pointer-events-none absolute inset-0 ${
        isDarkMode
          ? 'bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_26%),radial-gradient(circle_at_85%_10%,rgba(245,158,11,0.14),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(56,189,248,0.12),transparent_28%)]'
          : 'bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(249,115,22,0.12),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.10),transparent_30%)]'
      }`} />

      {/* Main layout: sidebar + content */}
      <div className="relative flex flex-1 min-h-0 gap-4 p-4">
        {/* Sidebar */}
        <GroupSidebar
          isDarkMode={isDarkMode}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          groupName={currentGroupName}
          wsConnected={wsConnected}
          memberCount={Number(currentGroupWorkspace?.memberCount || currentGroupFromGroups?.memberCount) || members.length || 0}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        {/* Content area */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {topBar}
          <main className="relative z-0 flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="pb-4">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      {/* Dialogs */}
      <UploadSourceDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        isDarkMode={isDarkMode}
        onUploadFiles={handleUploadFiles}
        workspaceId={resolvedWorkspaceId || (workspaceId && workspaceId !== 'new' ? workspaceId : null)}
        onSuggestedImported={fetchSources}
      />

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleInvite}
        isDarkMode={isDarkMode}
      />

      <GroupWorkspaceProfileConfigDialog
        open={profileConfigOpen}
        onOpenChange={handleProfileConfigChange}
        isDarkMode={isDarkMode}
        workspaceId={createdGroupWorkspaceId || (!isCreating ? workspaceId : null)}
        onComplete={() => {
          showInfo(t('home.group.setupComplete', 'Cấu hình nhóm hoàn tất!'));
        }}
      />
    </div>
  );
}

export default GroupWorkspacePage;
