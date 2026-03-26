import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/Components/ui/button';
import SourcesPanel from '@/Pages/Users/Individual/Workspace/Components/SourcesPanel';
import UploadSourceDialog from './Components/UploadSourceDialog';
import InviteMemberDialog from './Group_leader/InviteMemberDialog';
import GroupWorkspaceProfileConfigDialog from './Components/GroupWorkspaceProfileConfigDialog';
import GroupDashboardTab from './Group_leader/GroupDashboardTab';
import GroupMembersTab from './Group_leader/GroupMembersTab';
import GroupSettingsTab from './Group_leader/GroupSettingsTab';
import GroupNotificationsTab from './Components/GroupNotificationsTab';
import ChatPanel from './Components/ChatPanel';
import UserProfilePopover from '@/Components/features/Users/UserProfilePopover';
import { Globe, Loader2, Settings, Users, UserPlus, Sparkles, Swords, BookOpen, ClipboardList, FolderOpen, PenLine, Map, Bell } from 'lucide-react';
import WorkspaceHeader from '@/Pages/Users/Individual/Workspace/Components/WorkspaceHeader';
import StudioPanel from '@/Pages/Users/Individual/Workspace/Components/StudioPanel';
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
  const [studioCollapsed, setStudioCollapsed] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(null);

  // Section navigation via URL
  const validSections = ['dashboard', 'personalDashboard', 'members', 'notifications', 'flashcard', 'quiz', 'roadmap', 'mockTest', 'challenge', 'settings'];
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
  const [notifications, setNotifications] = useState([]);
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
  const [mockRole, setMockRole] = useState(null);
  const actualRoleKey = String(currentGroupWorkspace?.memberRole || currentGroupFromGroups?.memberRole || 'MEMBER').toUpperCase();
  const currentRoleKey = mockRole || actualRoleKey;
  const isLeader = currentRoleKey === 'LEADER';
  const isContributor = currentRoleKey === 'CONTRIBUTOR';
  const isMember = currentRoleKey === 'MEMBER';
  const canCreateContent = isLeader || isContributor;
  const canUploadSource = isLeader || isContributor;
  const canManageMembers = isLeader;

  const resolvedWorkspaceId = currentGroupWorkspace?.workspaceId
    ?? (isCreating ? null : workspaceId);
  const canManageGroup = Boolean(resolvedWorkspaceId && workspaceId !== 'new');
  const pageShellClass = isDarkMode
    ? 'bg-[#06131a] text-white'
    : 'bg-[linear-gradient(180deg,#fffaf0_0%,#f4fbf7_46%,#eef6ff_100%)] text-slate-900';

  useEffect(() => {
    if (notifications.length > 0) return;
    const now = Date.now();
    setNotifications([
      {
        id: 1,
        title: t('groupManage.notifications.seed.roadmapTitle'),
        content: t('groupManage.notifications.seed.roadmapContent'),
        status: 'PUBLISHED',
        authorRole: 'LEADER',
        publisherRole: 'LEADER',
        publishedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        title: t('groupManage.notifications.seed.quizTitle'),
        content: t('groupManage.notifications.seed.quizContent'),
        status: 'PENDING',
        authorRole: 'CONTRIBUTOR',
        publisherRole: null,
        publishedAt: null,
        createdAt: new Date(now - 30 * 60 * 1000).toISOString(),
      },
    ]);
  }, [notifications.length, t]);

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
    if (!canUploadSource) {
      showError(currentLang === 'en' ? 'You do not have permission to upload materials.' : 'Bạn không có quyền tải tài liệu.');
      return;
    }
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
  }, [workspaceId, isCreating, showError, showInfo, canUploadSource, currentLang]);

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

  const handleSelectAllSources = useCallback((selectAll, currentSourceIds) => {
    if (selectAll) {
      setSelectedSourceIds(currentSourceIds);
    } else {
      setSelectedSourceIds([]);
    }
  }, []);

  const handleSelectOneSource = useCallback((sourceId, isSelected) => {
    if (isSelected) {
      setSelectedSourceIds((prev) => [...prev, sourceId]);
    } else {
      setSelectedSourceIds((prev) => prev.filter((id) => id !== sourceId));
    }
  }, []);

  // Content action handlers — quiz, flashcard, mocktest, roadmap
  const handleStudioAction = useCallback((actionKey) => {
    const disabledActionsByRole = {
      MEMBER: new Set(['dashboard', 'members', 'settings']),
      CONTRIBUTOR: new Set(['dashboard', 'settings']),
      LEADER: new Set([]),
    };
    if (disabledActionsByRole[currentRoleKey]?.has(actionKey)) {
      showInfo(currentLang === 'en' ? 'This feature is not available for your role.' : 'Tính năng này chưa khả dụng cho vai trò của bạn.');
      return;
    }

    setSearchParams({ section: actionKey }, { replace: true });
    setSelectedQuiz(null);
    setSelectedFlashcard(null);
    setSelectedMockTest(null);
    setActiveView(actionKey);
    setMobilePanel(null);
  }, [setSearchParams, currentRoleKey, showInfo, currentLang]);

  const handleCreateNotification = useCallback(({ title, content, roleKey }) => {
    if (!(roleKey === 'LEADER' || roleKey === 'CONTRIBUTOR')) return;
    const publishImmediately = roleKey === 'LEADER';
    setNotifications((prev) => [
      {
        id: Date.now(),
        title,
        content,
        status: publishImmediately ? 'PUBLISHED' : 'PENDING',
        authorRole: roleKey,
        publisherRole: publishImmediately ? roleKey : null,
        publishedAt: publishImmediately ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    if (publishImmediately) {
      showInfo(t('groupManage.notifications.toast.published'));
      return;
    }
    showInfo(t('groupManage.notifications.toast.submitted'));
  }, [showInfo, t]);

  const handleApproveNotification = useCallback((notificationId) => {
    if (!isLeader) return;
    setNotifications((prev) => prev.map((item) => (
      item.id === notificationId
        ? { ...item, status: 'PUBLISHED', publisherRole: 'LEADER', publishedAt: new Date().toISOString() }
        : item
    )));
    showInfo(t('groupManage.notifications.toast.approved'));
  }, [isLeader, showInfo, t]);

  const handleCreateQuiz = useCallback(async () => {
    if (!canCreateContent) {
      showInfo(currentLang === 'en' ? 'Member cannot create quizzes.' : 'Member không có quyền tạo quiz.');
      return;
    }
    setActiveView('quiz');
  }, [canCreateContent, currentLang, showInfo]);
  const handleViewQuiz = useCallback((quiz) => { setSelectedQuiz(quiz); setActiveView('quizDetail'); }, []);
  const handleEditQuiz = useCallback((quiz) => { setSelectedQuiz(quiz); setActiveView('editQuiz'); }, []);
  const handleSaveQuiz = useCallback((updatedQuiz) => { setSelectedQuiz((p) => ({ ...p, ...updatedQuiz })); setActiveView('quizDetail'); }, []);

  const handleCreateFlashcard = useCallback(async () => {
    if (!canCreateContent) {
      showInfo(currentLang === 'en' ? 'Member cannot create flashcards.' : 'Member không có quyền tạo flashcard.');
      return;
    }
    setActiveView('flashcard');
  }, [canCreateContent, currentLang, showInfo]);
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
    if (!canCreateContent) {
      showInfo(currentLang === 'en' ? 'Member cannot create roadmap.' : 'Member không có quyền tạo roadmap.');
      return;
    }
    try {
      await createRoadmap({ workspaceId, ...data, mode: 'ai', name: data.name || 'Roadmap', goal: data.goal || data.description || '', description: data.goal || data.description || '' });
      setActiveView('roadmap');
    } catch (err) {
      console.error('Tạo roadmap thất bại:', err);
      throw err;
    }
  }, [workspaceId, canCreateContent, currentLang, showInfo]);

  const handleCreateMockTest = useCallback(async () => {
    if (!canCreateContent) {
      showInfo(currentLang === 'en' ? 'Member cannot create mock tests.' : 'Member không có quyền tạo mock test.');
      return;
    }
    setActiveView('mockTest');
  }, [canCreateContent, currentLang, showInfo]);
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
    notifications: { vi: 'Thông báo', en: 'Notifications', icon: Bell },
    challenge: { vi: 'Challenge', en: 'Challenge', icon: Swords },
    settings: { vi: 'Cài đặt', en: 'Settings', icon: Settings },
  };

  const groupStudioActions = [
    ...(isLeader ? [{ key: 'dashboard', icon: Globe, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-500/20', label: currentLang === 'en' ? 'System dashboard' : 'Dashboard hệ thống', disabled: false }] : [{ key: 'personalDashboard', icon: Globe, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-500/20', label: currentLang === 'en' ? 'Personal dashboard' : 'Dashboard cá nhân', disabled: false }]),
    { key: 'roadmap', icon: Map, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-500/20', label: sectionTitles?.roadmap?.[currentLang] || 'Roadmap' },
    { key: 'quiz', icon: PenLine, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-500/20', label: sectionTitles?.quiz?.[currentLang] || 'Quiz' },
    { key: 'flashcard', icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-500/20', label: sectionTitles?.flashcard?.[currentLang] || 'Flashcard' },
    { key: 'mockTest', icon: ClipboardList, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-500/20', label: sectionTitles?.mockTest?.[currentLang] || 'Mock Test' },
    { key: 'notifications', icon: Bell, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-500/20', label: sectionTitles?.notifications?.[currentLang] || 'Notifications', disabled: false },
    { key: 'members', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-500/20', label: isLeader ? (currentLang === 'en' ? 'Member management' : 'Quản lý thành viên') : (currentLang === 'en' ? 'Members status' : 'Tình trạng thành viên'), disabled: isMember },
    { key: 'settings', icon: Settings, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-500/20', label: sectionTitles?.settings?.[currentLang] || 'Settings', disabled: !isLeader || !canManageGroup }
  ];

  const renderPersonalDashboard = () => {
    const currentMember = members.find((member) => member.isCurrentUser) || members[0] || null;
    const completedItems = createdItems.filter((item) => ['Quiz', 'Flashcard', 'Roadmap'].includes(item.type)).length;
    const safeMemberName = currentMember?.fullName || currentMember?.username || (currentLang === 'en' ? 'Member' : 'Thành viên');
    const isMockMode = import.meta.env.DEV;

    const assignedQuizMock = [
      { id: 1, title: currentLang === 'en' ? 'Vocabulary Sprint - Unit 3' : 'Vocabulary Sprint - Unit 3', due: currentLang === 'en' ? 'Due in 1 day' : 'Hạn sau 1 ngày', status: currentLang === 'en' ? 'Pending' : 'Chờ làm' },
      { id: 2, title: currentLang === 'en' ? 'Reading Comprehension Drill' : 'Reading Comprehension Drill', due: currentLang === 'en' ? 'Due in 3 days' : 'Hạn sau 3 ngày', status: currentLang === 'en' ? 'In progress' : 'Đang làm' },
    ];

    const notificationsMock = [
      { id: 1, text: currentLang === 'en' ? 'Leader assigned a new quiz for your lane.' : 'Leader vừa giao một quiz mới cho lane của bạn.' },
      { id: 2, text: currentLang === 'en' ? 'Roadmap checkpoint is ready for pre-learning.' : 'Checkpoint roadmap đã sẵn sàng cho pre-learning.' },
      { id: 3, text: currentLang === 'en' ? 'Flashcard set updated by contributor.' : 'Bộ flashcard vừa được contributor cập nhật.' },
    ];

    const learningProgressMock = {
      quiz: isMockMode ? 68 : 0,
      roadmap: isMockMode ? 52 : 0,
      flashcard: isMockMode ? 79 : 0,
    };

    const weeklyStudyTrendMock = [
      { label: 'Mon', value: isMockMode ? 25 : 0 },
      { label: 'Tue', value: isMockMode ? 40 : 0 },
      { label: 'Wed', value: isMockMode ? 35 : 0 },
      { label: 'Thu', value: isMockMode ? 55 : 0 },
      { label: 'Fri', value: isMockMode ? 72 : 0 },
      { label: 'Sat', value: isMockMode ? 65 : 0 },
      { label: 'Sun', value: isMockMode ? 48 : 0 },
    ];

    const maxTrendValue = Math.max(1, ...weeklyStudyTrendMock.map((item) => item.value));

    return (
      <div className="space-y-4">
        <section className={`rounded-2xl border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {currentLang === 'en' ? 'Personal dashboard' : 'Dashboard cá nhân'}
          </h3>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {currentLang === 'en' ? `Welcome back, ${safeMemberName}. Keep track of your learning flow in this group.` : `Chào mừng quay lại, ${safeMemberName}. Theo dõi tiến độ học tập của bạn trong nhóm tại đây.`}
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
            <p className={`text-xs uppercase tracking-[0.12em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{currentLang === 'en' ? 'Quiz history' : 'Lịch sử quiz'}</p>
            <p className={`mt-2 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedQuiz ? 1 : 0}</p>
          </div>
          <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
            <p className={`text-xs uppercase tracking-[0.12em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{currentLang === 'en' ? 'Active roadmap' : 'Roadmap đang học'}</p>
            <p className={`mt-2 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeSection === 'roadmap' ? 1 : 0}</p>
          </div>
          <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
            <p className={`text-xs uppercase tracking-[0.12em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{currentLang === 'en' ? 'Created outputs' : 'Nội dung đã tạo'}</p>
            <p className={`mt-2 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{isMockMode && completedItems === 0 ? 6 : completedItems}</p>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
            <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {currentLang === 'en' ? 'Assigned quizzes' : 'Quiz được giao'}
            </h4>
            <div className="mt-3 space-y-2">
              {(isMockMode ? assignedQuizMock : []).map((quiz) => (
                <div key={quiz.id} className={`rounded-lg border p-3 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/60'}`}>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{quiz.title}</p>
                  <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{quiz.due} • {quiz.status}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
            <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {currentLang === 'en' ? 'Recent notifications' : 'Thông báo gần đây'}
            </h4>
            <ul className={`mt-3 space-y-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {(isMockMode ? notificationsMock : []).map((note) => (
                <li key={note.id} className={`rounded-lg border p-3 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/60'}`}>
                  {note.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
          <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {currentLang === 'en' ? 'Recommended next actions' : 'Gợi ý bước tiếp theo'}
          </h4>
          <ul className={`mt-2 space-y-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            <li>{currentLang === 'en' ? 'Review assigned quizzes and submit feedback.' : 'Xem lại quiz được giao và gửi phản hồi.'}</li>
            <li>{currentLang === 'en' ? 'Continue roadmap pre-learning checkpoints.' : 'Tiếp tục các checkpoint pre-learning trong roadmap.'}</li>
            <li>{currentLang === 'en' ? 'Practice flashcards and mock tests weekly.' : 'Luyện flashcard và mock test theo tuần.'}</li>
          </ul>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
            <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {currentLang === 'en' ? 'Learning progress chart' : 'Biểu đồ tiến độ học tập'}
            </h4>
            <div className="mt-3 space-y-3">
              {Object.entries(learningProgressMock).map(([key, value]) => (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{key.toUpperCase()}</span>
                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{value}%</span>
                  </div>
                  <div className={`h-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div className={`h-2 rounded-full ${key === 'quiz' ? 'bg-rose-500' : key === 'roadmap' ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${Math.max(6, value)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
            <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {currentLang === 'en' ? '7-day study trend' : 'Xu hướng học 7 ngày'}
            </h4>
            <div className="mt-3 flex items-end gap-2 h-28">
              {weeklyStudyTrendMock.map((item) => (
                <div key={item.label} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div className={`w-full rounded-t ${isDarkMode ? 'bg-cyan-400/80' : 'bg-cyan-500/80'}`} style={{ height: `${Math.max(6, Math.round((item.value / maxTrendValue) * 100))}%` }} />
                  <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderStudioPanel = (defaultView) => (
    <div className={`rounded-[28px] border overflow-hidden ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-white/80 bg-white/82'}`} style={{ minHeight: 500 }}>
      <ChatPanel
        isDarkMode={isDarkMode}
        sources={sources}
        selectedSourceIds={selectedSourceIds}
        activeView={activeView || defaultView}
        readOnly={!canCreateContent}
        role={currentRoleKey}
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
        if (!isLeader) {
          return renderPersonalDashboard();
        }
        return (
          <GroupDashboardTab
            isDarkMode={isDarkMode}
            group={currentGroupFromGroups || currentGroupWorkspace}
            members={members}
            membersLoading={membersLoading}
            isLeader={isLeader}
            compactMode
          />
        );

      case 'personalDashboard':
        return renderPersonalDashboard();

      case 'members':
        if (isMember) {
          return renderPersonalDashboard();
        }
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

      case 'notifications':
        return (
          <GroupNotificationsTab
            isDarkMode={isDarkMode}
            roleKey={currentRoleKey}
            notifications={notifications}
            onCreateNotification={handleCreateNotification}
            onApproveNotification={handleApproveNotification}
          />
        );

      case 'flashcard':
        return <div className="h-full p-2 md:p-3">{renderStudioPanel('flashcard')}</div>;

      case 'quiz':
        return <div className="h-full p-2 md:p-3">{renderStudioPanel('quiz')}</div>;

      case 'roadmap':
        return <div className="h-full p-2 md:p-3">{renderStudioPanel('roadmap')}</div>;

      case 'mockTest':
        return <div className="h-full p-2 md:p-3">{renderStudioPanel('mockTest')}</div>;

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
            compactMode
          />
        );

      default:
        return null;
    }
  };

  // ——— TOP BAR ———
  

  const handleProfileConfigChange = useCallback((open) => {
    setProfileConfigOpen(open);
    if (!open && location.state?.openProfileConfig) {
      navigate(`${location.pathname}${location.search}`, { replace: true });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  const settingsMenu = (
    <div ref={settingsRef} className="relative z-[140]">
        <Button
            variant="outline"
            type="button"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className={`rounded-full h-9 px-4 flex items-center gap-2 ${isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-900" : "border-gray-200"}`}
        >
            <Settings className="w-4 h-4" />
            <span className={fontClass}>{t("workspace.header.settings")}</span>
        </Button>

        {isSettingsOpen && (
            <div className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-xl ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"} py-2`}>
                <button
                    type="button"
                    onClick={() => { setActiveSection("dashboard"); setIsSettingsOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-50 text-gray-700"}`}
                >
                    <span className={`flex items-center gap-2 ${fontClass}`}>
                        <Globe className="w-4 h-4" />
                        {sectionTitles?.dashboard?.[currentLang] || t("Dashboard", "Dashboard")}
                    </span>
                </button>
                {isLeader && (
                <button
                    type="button"
                    onClick={() => { setActiveSection("members"); setIsSettingsOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-50 text-gray-700"}`}
                >
                    <span className={`flex items-center gap-2 ${fontClass}`}>
                        <Users className="w-4 h-4" />
                        {sectionTitles?.members?.[currentLang] || t("Members", "Members")}
                    </span>
                </button>
                )}
                {canCreateContent && (
                    <button
                        type="button"
                        onClick={() => { setInviteDialogOpen(true); setIsSettingsOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-50 text-gray-700"}`}
                    >
                        <span className={`flex items-center gap-2 ${fontClass}`}>
                            <UserPlus className="w-4 h-4" />
                            {t("workspace.header.invite", "Invite Member")}
                        </span>
                    </button>
                )}
                <div className={`my-1 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}></div>
                <button
                    type="button"
                    onClick={() => { setActiveSection("settings"); setIsSettingsOpen(false); }}
                  disabled={!isLeader}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-50 text-gray-700"}`}
                >
                    <span className={`flex items-center gap-2 ${fontClass}`}>
                        <Settings className="w-4 h-4" />
                        {t("workspaceSettings")}
                    </span>
                </button>
            </div>
        )}
    </div>
  );

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
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${pageShellClass}`}>
      {/* Header */}
      <WorkspaceHeader
          workspaceTitle={currentGroupName}
          workspaceName={currentGroupName}
          settingsMenu={settingsMenu}
          userProfileComponent={<UserProfilePopover align="end" />}
          wsConnected={wsConnected}
          isDarkMode={isDarkMode}
      />

      {/* Main Workspace Area - 3 Column Layout */}
      <div className="flex flex-1 min-h-0 w-full px-0 py-2 gap-2">
        {/* Left Panel: Sources */}
        {!isLeader && !isContributor ? null : (
        <div className={`${sidebarCollapsed ? 'w-[84px]' : 'w-[300px]'} hidden xl:flex flex-shrink-0 flex-col hide-scrollbar transition-all duration-300`}>
            <SourcesPanel
                isOpen={!sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                onAddSource={() => setUploadDialogOpen(true)}
                sources={sources}
                selectedIds={selectedSourceIds}
                onSelectAll={handleSelectAllSources}
                onSelectOne={handleSelectOneSource}
                onRemove={handleRemoveSource}
                onRemoveMultiple={handleRemoveMultipleSources}
                disabled={isCreating}
            />
        </div>
            )}

        {/* Center Content Area */}
        <main className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto w-full hide-scrollbar">
            <div className="xl:hidden sticky top-0 z-20 p-2 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex items-center gap-2">
              {!isMember && (
                <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => setMobilePanel('sources')}>
                  {currentLang === 'en' ? 'Sources' : 'Nguồn'}
                </Button>
              )}
              <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => setMobilePanel('studio')}>
                {currentLang === 'en' ? 'Studio' : 'Studio'}
              </Button>
              <span className={`ml-auto text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{currentRoleKey}</span>
            </div>
            <div className="p-4 md:p-5 lg:p-6">
              {renderContent()}
            </div>
          </div>
        </main>

        {/* Right Panel: Studio Tools */}
        <div className={`${studioCollapsed ? 'w-[84px]' : 'w-[260px]'} hidden xl:flex flex-shrink-0 flex-col h-full transition-all duration-300`}>
            <StudioPanel
                customActions={groupStudioActions}
                activeView={activeSection}
                onAction={handleStudioAction}
                shouldDisableQuiz={isCreating}
                shouldDisableFlashcard={isCreating}
                shouldDisableRoadmap={isCreating}
            isCollapsed={studioCollapsed}
            onToggleCollapse={() => setStudioCollapsed((prev) => !prev)}
                isDarkMode={isDarkMode}
                hideAccessHistory={true}
            />
        </div>
      </div>

      {mobilePanel === 'sources' && !isMember && (
        <div className="xl:hidden fixed inset-0 z-[150] bg-black/45 backdrop-blur-sm" onClick={() => setMobilePanel(null)}>
          <div className="absolute left-0 top-0 h-full w-[88%] max-w-[360px] p-2" onClick={(event) => event.stopPropagation()}>
            <SourcesPanel
              isOpen={true}
              onToggle={() => setMobilePanel(null)}
              onAddSource={() => setUploadDialogOpen(true)}
              sources={sources}
              selectedIds={selectedSourceIds}
              onSelectAll={handleSelectAllSources}
              onSelectOne={handleSelectOneSource}
              onRemove={handleRemoveSource}
              onRemoveMultiple={handleRemoveMultipleSources}
              disabled={isCreating || !canUploadSource}
            />
          </div>
        </div>
      )}

      {mobilePanel === 'studio' && (
        <div className="xl:hidden fixed inset-0 z-[150] bg-black/45 backdrop-blur-sm" onClick={() => setMobilePanel(null)}>
          <div className="absolute right-0 top-0 h-full w-[88%] max-w-[340px] p-2" onClick={(event) => event.stopPropagation()}>
            <StudioPanel
              customActions={groupStudioActions}
              activeView={activeSection}
              onAction={handleStudioAction}
              shouldDisableQuiz={isCreating}
              shouldDisableFlashcard={isCreating}
              shouldDisableRoadmap={isCreating}
              isCollapsed={false}
              onToggleCollapse={() => setMobilePanel(null)}
              isDarkMode={isDarkMode}
              hideAccessHistory={true}
            />
          </div>
        </div>
      )}

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
      
      {/* --- FLOATING UI MOCK ROLE: CHỈ HIỂN THỊ KHI DEVELOP --- */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.2)] border border-blue-200 dark:border-blue-900">
        <span className="text-xs font-semibold px-2 text-slate-800 dark:text-slate-200">Test Role</span>
        <button
          onClick={() => setMockRole('LEADER')}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${currentRoleKey === 'LEADER' ? 'bg-rose-500 text-white shadow-md scale-105' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
        >
          LEADER
        </button>
        <button
          onClick={() => setMockRole('CONTRIBUTOR')}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${currentRoleKey === 'CONTRIBUTOR' ? 'bg-sky-500 text-white shadow-md scale-105' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
        >
          CONTRIB
        </button>
        <button
          onClick={() => setMockRole('MEMBER')}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${currentRoleKey === 'MEMBER' ? 'bg-slate-500 text-white shadow-md scale-105' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
        >
          MEMBER
        </button>
        <button
          onClick={() => setMockRole(null)}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-all bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600`}
        >
          Reset
        </button>
      </div>

    </div>
  );
}

export default GroupWorkspacePage;
