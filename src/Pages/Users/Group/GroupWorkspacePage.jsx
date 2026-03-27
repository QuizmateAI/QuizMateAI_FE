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
import ChatPanel from './Components/ChatPanel';
import UserProfilePopover from '@/Components/features/Users/UserProfilePopover';
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderOpen,
  Globe,
  Loader2,
  Map,
  PenLine,
  Settings,
  ShieldCheck,
  Sparkles,
  Swords,
  UserPlus,
  Users,
} from 'lucide-react';
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
import { getGroupWorkspaceProfile, normalizeGroupWorkspaceProfile } from '@/api/WorkspaceAPI';
import { unwrapApiData } from '@/Utils/apiResponse';
import { useToast } from '@/context/ToastContext';
import { formatGroupLearningMode, formatGroupRole } from './utils/groupDisplay';

const GROUP_WELCOME_STORAGE_PREFIX = 'group-invite-welcome';

function readCurrentUser() {
  try {
    const rawUser = window.localStorage.getItem('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    console.error('Unable to read current user from storage:', error);
    return null;
  }
}

function getWelcomeStorageKey(workspaceId) {
  return `${GROUP_WELCOME_STORAGE_PREFIX}:${workspaceId}`;
}

function formatDateTime(value, lang = 'vi') {
  if (!value) return lang === 'en' ? 'No date' : 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return lang === 'en' ? 'No date' : 'Chưa cập nhật';
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRelativeTime(value, lang = 'vi') {
  if (!value) return lang === 'en' ? 'No recent activity' : 'Chưa có hoạt động';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return lang === 'en' ? 'No recent activity' : 'Chưa có hoạt động';

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffHours < 1) return lang === 'en' ? 'Just now' : 'Vừa xong';
  if (diffHours < 24) return lang === 'en' ? `${diffHours} hour(s) ago` : `${diffHours} giờ trước`;
  if (diffDays < 7) return lang === 'en' ? `${diffDays} day(s) ago` : `${diffDays} ngày trước`;
  return formatDateTime(value, lang);
}

function getLogLabel(action, lang = 'vi') {
  const labels = {
    GROUP_CREATED: lang === 'en' ? 'Group created' : 'Tạo nhóm',
    GROUP_PROFILE_UPDATED: lang === 'en' ? 'Profile updated' : 'Cập nhật cấu hình',
    INVITATION_SENT: lang === 'en' ? 'Invitation sent' : 'Gửi lời mời',
    INVITATION_ACCEPTED: lang === 'en' ? 'Invitation accepted' : 'Đã xác nhận lời mời',
    MEMBER_JOINED: lang === 'en' ? 'Member joined' : 'Thành viên vào nhóm',
    MEMBER_REMOVED: lang === 'en' ? 'Member removed' : 'Xóa thành viên',
    MEMBER_ROLE_UPDATED: lang === 'en' ? 'Role updated' : 'Cập nhật vai trò',
  };

  return labels[action] || (lang === 'en' ? 'Group activity' : 'Hoạt động nhóm');
}

function GroupWorkspacePage() {
  const { workspaceId } = useParams();
  const location = useLocation();
  const navigate = useNavigateWithLoading();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
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
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('section', section);
    setSearchParams(nextParams, { replace: true });
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
  const [groupProfile, setGroupProfile] = useState(null);
  const [groupProfileLoading, setGroupProfileLoading] = useState(false);
  const [groupLogs, setGroupLogs] = useState([]);
  const [groupLogsLoading, setGroupLogsLoading] = useState(false);
  const [welcomePayload, setWelcomePayload] = useState(null);
  const settingsRef = useRef(null);

  // Members state
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';
  const currentUser = readCurrentUser();

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
    fetchGroupLogs,
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

  const currentGroupName = groupProfile?.groupName
    || currentGroupWorkspace?.displayTitle
    || currentGroupWorkspace?.title
    || currentGroupWorkspace?.name
    || currentGroupFromGroups?.groupName
    || '';
  const actualRoleKey = String(currentGroupWorkspace?.memberRole || currentGroupFromGroups?.memberRole || 'MEMBER').toUpperCase();
  const currentRoleKey = actualRoleKey;
  const isLeader = currentRoleKey === 'LEADER';
  const isContributor = currentRoleKey === 'CONTRIBUTOR';
  const isMember = currentRoleKey === 'MEMBER';
  const canCreateContent = isLeader || isContributor;
  const canUploadSource = isLeader || isContributor;
  const canManageMembers = isLeader;

  const resolvedWorkspaceId = currentGroupWorkspace?.workspaceId
    ?? (isCreating ? null : workspaceId);
  const canManageGroup = Boolean(resolvedWorkspaceId && workspaceId !== 'new');
  const groupDescription = groupProfile?.groupLearningGoal
    || currentGroupWorkspace?.description
    || currentGroupFromGroups?.description
    || welcomePayload?.groupDescription
    || '';
  const hasMaterialsFromProfile = Boolean(groupProfile?.hasMaterials);
  const hasUploadedMaterials = hasCheckedInitialSources
    ? sources.length > 0
    : (hasMaterialsFromProfile || sources.length > 0);
  const hasCompletedGroupProfile = Boolean(groupProfile?.onboardingCompleted);
  const isCheckingMandatoryProfile = Boolean(
    isLeader
    && canManageGroup
    && !isCreating
    && !hasCompletedGroupProfile
    && groupProfileLoading
  );
  const isProfileSetupIncomplete = Boolean(
    isLeader
    && canManageGroup
    && !isCreating
    && groupProfile
    && !hasCompletedGroupProfile
  );
  const shouldForceProfileSetup = Boolean(
    isCheckingMandatoryProfile
    || isProfileSetupIncomplete
    || (isLeader && canManageGroup && !isCreating && !groupProfile && !hasCompletedGroupProfile)
    || (openProfileConfig && !hasCompletedGroupProfile)
  );
  const profileEditLocked = hasUploadedMaterials && hasCompletedGroupProfile;
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

  const loadGroupProfile = useCallback(async () => {
    if (!resolvedWorkspaceId || isCreating) return;
    setGroupProfileLoading(true);
    try {
      const response = await getGroupWorkspaceProfile(resolvedWorkspaceId);
      setGroupProfile(normalizeGroupWorkspaceProfile(unwrapApiData(response)));
    } catch (error) {
      console.error('Failed to load group profile:', error);
    } finally {
      setGroupProfileLoading(false);
    }
  }, [resolvedWorkspaceId, isCreating]);

  const loadGroupLogs = useCallback(async () => {
    if (!resolvedWorkspaceId || isCreating) return;
    setGroupLogsLoading(true);
    try {
      const data = await fetchGroupLogs(resolvedWorkspaceId);
      setGroupLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load group logs:', error);
      setGroupLogs([]);
    } finally {
      setGroupLogsLoading(false);
    }
  }, [resolvedWorkspaceId, isCreating, fetchGroupLogs]);

  useEffect(() => {
    if (!isCreating && resolvedWorkspaceId) {
      loadGroupProfile();
      loadGroupLogs();
    }
  }, [isCreating, loadGroupLogs, loadGroupProfile, resolvedWorkspaceId]);

  useEffect(() => {
    if (!resolvedWorkspaceId) {
      setWelcomePayload(null);
      return;
    }

    try {
      const rawWelcome = window.sessionStorage.getItem(getWelcomeStorageKey(resolvedWorkspaceId));
      setWelcomePayload(rawWelcome ? JSON.parse(rawWelcome) : null);
    } catch (error) {
      console.error('Failed to parse welcome payload:', error);
      setWelcomePayload(null);
    }
  }, [resolvedWorkspaceId]);

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
    if (openProfileConfig && !isCreating && !profileEditLocked) {
      setProfileConfigOpen(true);
    }
  }, [isCreating, openProfileConfig, profileEditLocked]);

  useEffect(() => {
    if (!isCreating && shouldForceProfileSetup) {
      setProfileConfigOpen(true);
    }
  }, [isCreating, shouldForceProfileSetup]);

  // Invite handler
  const handleInvite = useCallback(async (email) => {
    if (!canManageGroup || !canManageMembers) {
      throw new Error('Chỉ leader mới có thể mời thành viên vào nhóm.');
    }
    await inviteMemberHook(resolvedWorkspaceId, email);
    showInfo('Gửi lời mời thành công!');
    await loadMembers();
    await loadGroupLogs();
  }, [resolvedWorkspaceId, canManageGroup, canManageMembers, inviteMemberHook, showInfo, loadMembers, loadGroupLogs]);

  // Upload files
  const handleUploadFiles = useCallback(async (files) => {
    if (shouldForceProfileSetup) {
      showError(currentLang === 'en' ? 'Complete the group profile before uploading materials.' : 'Hoàn thành profile nhóm trước khi tải tài liệu.');
      setProfileConfigOpen(true);
      return;
    }
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
  }, [workspaceId, isCreating, showError, showInfo, canUploadSource, currentLang, shouldForceProfileSetup]);

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
    if (shouldForceProfileSetup) {
      showInfo(currentLang === 'en' ? 'Complete the group profile before using studio tabs.' : 'Hoàn thành profile nhóm trước khi dùng các tab studio.');
      setProfileConfigOpen(true);
      return;
    }

    const disabledActionsByRole = {
      MEMBER: new Set(['dashboard', 'members', 'settings']),
      CONTRIBUTOR: new Set(['dashboard', 'settings']),
      LEADER: new Set([]),
    };
    if (disabledActionsByRole[currentRoleKey]?.has(actionKey)) {
      showInfo(currentLang === 'en' ? 'This feature is not available for your role.' : 'Tính năng này chưa khả dụng cho vai trò của bạn.');
      return;
    }

    setActiveSection(actionKey);
    setActiveView(actionKey);
    setMobilePanel(null);
  }, [setActiveSection, currentRoleKey, showInfo, currentLang, shouldForceProfileSetup]);

  const handleDismissWelcome = useCallback(() => {
    if (!resolvedWorkspaceId) return;

    window.sessionStorage.removeItem(getWelcomeStorageKey(resolvedWorkspaceId));
    setWelcomePayload(null);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('welcome');
    setSearchParams(nextParams, { replace: true });
  }, [resolvedWorkspaceId, searchParams, setSearchParams]);

  const handleGroupUpdated = useCallback(async () => {
    await fetchGroups();
    if (resolvedWorkspaceId) {
      await fetchWorkspaceDetail(resolvedWorkspaceId).catch((error) => {
        console.error('Failed to refresh group workspace detail:', error);
      });
      await loadGroupProfile();
    }
  }, [fetchGroups, fetchWorkspaceDetail, loadGroupProfile, resolvedWorkspaceId]);

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
    notifications: { vi: 'Hoạt động nhóm', en: 'Group Activity', icon: Bell },
    challenge: { vi: 'Challenge', en: 'Challenge', icon: Swords },
    settings: { vi: 'Cài đặt', en: 'Settings', icon: Settings },
  };

  const resolvedGroupData = {
    ...(currentGroupWorkspace || {}),
    ...(currentGroupFromGroups || {}),
    workspaceId: resolvedWorkspaceId,
    groupName:
      groupProfile?.groupName
      || currentGroupFromGroups?.groupName
      || currentGroupWorkspace?.displayTitle
      || currentGroupWorkspace?.name
      || welcomePayload?.groupName
      || '',
    displayTitle:
      groupProfile?.groupName
      || currentGroupFromGroups?.groupName
      || currentGroupWorkspace?.displayTitle
      || currentGroupWorkspace?.name
      || welcomePayload?.groupName
      || '',
    name:
      groupProfile?.groupName
      || currentGroupFromGroups?.groupName
      || currentGroupWorkspace?.displayTitle
      || currentGroupWorkspace?.name
      || welcomePayload?.groupName
      || '',
    description: groupDescription,
    domain: groupProfile?.domain || welcomePayload?.domain || null,
    knowledge: groupProfile?.knowledge || welcomePayload?.knowledge || null,
    learningMode: groupProfile?.learningMode || welcomePayload?.learningMode || null,
    groupLearningGoal: groupProfile?.groupLearningGoal || welcomePayload?.groupLearningGoal || null,
    examName: groupProfile?.examName || welcomePayload?.examName || null,
    rules: groupProfile?.rules || welcomePayload?.rules || null,
    defaultRoleOnJoin: groupProfile?.defaultRoleOnJoin || null,
    roadmapEnabled: groupProfile?.roadmapEnabled ?? null,
    maxMemberOverride: groupProfile?.maxMemberOverride ?? null,
    currentStep: groupProfile?.currentStep ?? null,
    totalSteps: groupProfile?.totalSteps ?? null,
    onboardingCompleted: groupProfile?.onboardingCompleted ?? null,
    hasMaterials: groupProfile?.hasMaterials ?? null,
    materialCount: groupProfile?.materialCount ?? null,
    preLearningRequired:
      groupProfile?.preLearningRequired
      ?? welcomePayload?.preLearningRequired
      ?? null,
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

  const renderActivityFeed = (compact = false) => (
    <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-2">
        <Activity className={`h-5 w-5 ${isDarkMode ? 'text-cyan-200' : 'text-cyan-600'}`} />
        <div>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {currentLang === 'en' ? 'Recent group activity' : 'Hoạt động nhóm gần đây'}
          </h3>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {currentLang === 'en' ? 'Real events from the group workspace log.' : 'Dữ liệu thật từ activity log của nhóm.'}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {groupLogsLoading ? (
          <div className={`rounded-[22px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'}`}>
            {currentLang === 'en' ? 'Loading activity...' : 'Đang tải hoạt động...'}
          </div>
        ) : groupLogs.length === 0 ? (
          <div className={`rounded-[22px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'}`}>
            {currentLang === 'en' ? 'No activity has been recorded yet.' : 'Chưa có hoạt động nào được ghi nhận.'}
          </div>
        ) : (
          groupLogs.slice(0, compact ? 10 : 6).map((log) => (
            <article
              key={`${log.logId || 'log'}-${log.action}-${log.logTime}`}
              className={`rounded-[22px] border px-4 py-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-white text-slate-700'}`}>
                    {getLogLabel(log.action, currentLang)}
                  </p>
                  <p className={`mt-3 text-sm font-semibold leading-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {log.description || (currentLang === 'en' ? 'Group activity updated' : 'Nhóm vừa có cập nhật mới')}
                  </p>
                  <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {(log.actorEmail || (currentLang === 'en' ? 'System' : 'Hệ thống'))} • {formatDateTime(log.logTime, currentLang)}
                  </p>
                </div>
                <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {formatRelativeTime(log.logTime, currentLang)}
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );

  const renderPersonalDashboard = () => {
    const currentMember = members.find((member) => member.isCurrentUser)
      || members.find((member) => String(member.userId) === String(currentUser?.userID))
      || members[0]
      || null;
    const safeMemberName = currentMember?.fullName || currentMember?.username || (currentLang === 'en' ? 'Member' : 'Thành viên');
    const joinedAt = currentMember?.joinedAt || welcomePayload?.joinedAt || null;
    const currentRoleLabel = formatGroupRole(currentRoleKey, currentLang);
    const learningModeLabel = formatGroupLearningMode(resolvedGroupData.learningMode, currentLang);
    const stats = [
      {
        label: currentLang === 'en' ? 'Current role' : 'Vai trò hiện tại',
        value: currentRoleLabel,
        icon: ShieldCheck,
      },
      {
        label: currentLang === 'en' ? 'Team members' : 'Thành viên trong nhóm',
        value: membersLoading ? '...' : String(members.length),
        icon: Users,
      },
      {
        label: currentLang === 'en' ? 'Shared sources' : 'Tài liệu dùng chung',
        value: String(sources.length),
        icon: FolderOpen,
      },
      {
        label: currentLang === 'en' ? 'Joined at' : 'Tham gia từ',
        value: joinedAt ? formatDateTime(joinedAt, currentLang) : (currentLang === 'en' ? 'Pending confirmation' : 'Mới xác nhận'),
        icon: CalendarDays,
      },
    ];

    return (
      <div className="space-y-5">
        <section className={`rounded-[32px] border p-6 lg:p-7 ${isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-white/80 bg-white/90'}`}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700'}`}>
                  {welcomePayload
                    ? (currentLang === 'en' ? 'Welcome aboard' : 'Chào mừng')
                    : (currentLang === 'en' ? 'Member space' : 'Không gian thành viên')}
                </span>
                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                  {currentRoleLabel}
                </span>
              </div>

              <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {welcomePayload
                  ? `${currentLang === 'en' ? 'Welcome to' : 'Chào mừng bạn đến với'} ${resolvedGroupData.groupName || currentGroupName || 'group'}`
                  : `${currentLang === 'en' ? 'Hello,' : 'Xin chào,'} ${safeMemberName}`}
              </h2>

              <p className={`mt-3 max-w-3xl text-sm leading-7 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {groupDescription
                  || (currentLang === 'en'
                    ? 'You can review the group profile, see who is in the room, and follow the newest activity here.'
                    : 'Bạn có thể đọc thông tin nhóm, xem thành viên và theo dõi các cập nhật mới nhất ngay tại đây.')}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSection('roadmap')}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
                >
                  <Map className="h-4 w-4" />
                  {currentLang === 'en' ? 'Open roadmap' : 'Mở roadmap'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('notifications')}
                  className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  <Activity className="h-4 w-4" />
                  {currentLang === 'en' ? 'View activity' : 'Xem hoạt động nhóm'}
                </button>
                {welcomePayload ? (
                  <button
                    type="button"
                    onClick={handleDismissWelcome}
                    className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {currentLang === 'en' ? 'Hide welcome' : 'Ẩn màn hình chào mừng'}
                  </button>
                ) : null}
              </div>
            </div>

            <div className={`rounded-[26px] border p-5 xl:w-[320px] ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50/80'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {currentLang === 'en' ? 'Group quick read' : 'Đọc nhanh thông tin nhóm'}
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{currentLang === 'en' ? 'Domain' : 'Lĩnh vực'}</p>
                  <p className={`mt-1 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{resolvedGroupData.domain || '—'}</p>
                </div>
                <div>
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{currentLang === 'en' ? 'Learning mode' : 'Chế độ học'}</p>
                  <p className={`mt-1 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{learningModeLabel || '—'}</p>
                </div>
                <div>
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{currentLang === 'en' ? 'Exam / target' : 'Kỳ thi / mục tiêu'}</p>
                  <p className={`mt-1 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{resolvedGroupData.examName || resolvedGroupData.groupLearningGoal || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-[24px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-white/[0.06] text-cyan-200' : 'bg-cyan-50 text-cyan-700'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    {currentLang === 'en' ? 'Live' : 'Live'}
                  </span>
                </div>
                <p className={`mt-4 text-lg font-bold leading-7 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.value}</p>
                <p className={`mt-2 text-xs uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-2">
              <FileText className={`h-5 w-5 ${isDarkMode ? 'text-amber-200' : 'text-amber-600'}`} />
              <div>
                <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentLang === 'en' ? 'Group profile for members' : 'Thông tin nhóm dành cho thành viên'}
                </h3>
                <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {groupProfileLoading
                    ? (currentLang === 'en' ? 'Refreshing group profile...' : 'Đang tải cấu hình nhóm...')
                    : (currentLang === 'en' ? 'Everything below is loaded from the real workspace profile.' : 'Tất cả thông tin bên dưới được lấy từ profile thật của nhóm.')}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {currentLang === 'en' ? 'Knowledge focus' : 'Kiến thức trọng tâm'}
                </p>
                <p className={`mt-2 text-sm leading-7 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  {resolvedGroupData.knowledge || '—'}
                </p>
              </div>

              <div className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {currentLang === 'en' ? 'Rules and norms' : 'Nội quy và cách vận hành'}
                </p>
                <p className={`mt-2 text-sm leading-7 whitespace-pre-line ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  {resolvedGroupData.rules || (currentLang === 'en' ? 'No additional rules yet.' : 'Chưa có nội quy bổ sung.')}
                </p>
              </div>

              <div className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {currentLang === 'en' ? 'Group learning goal' : 'Mục tiêu học tập của nhóm'}
                </p>
                <p className={`mt-2 text-sm leading-7 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  {resolvedGroupData.groupLearningGoal || groupDescription || '—'}
                </p>
              </div>

              <div className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {currentLang === 'en' ? 'Pre-learning requirement' : 'Yêu cầu pre-learning'}
                </p>
                <p className={`mt-2 text-sm leading-7 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  {resolvedGroupData.preLearningRequired == null
                    ? '—'
                    : resolvedGroupData.preLearningRequired
                      ? (currentLang === 'en' ? 'Required before starting shared work.' : 'Cần hoàn thành trước khi vào lộ trình học chung.')
                      : (currentLang === 'en' ? 'Optional, depending on your current level.' : 'Không bắt buộc, tùy theo mức độ hiện tại của bạn.')}
                </p>
              </div>
            </div>
          </section>

          {renderActivityFeed(false)}
        </div>

        <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-2">
            <Users className={`h-5 w-5 ${isDarkMode ? 'text-emerald-200' : 'text-emerald-600'}`} />
            <div>
                <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentLang === 'en' ? 'People in this group' : 'Những người trong nhóm này'}
                </h3>
                <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {currentLang === 'en' ? 'A quick snapshot so members know who they are studying with.' : 'Một cái nhìn nhanh để thành viên biết mình đang học cùng ai.'}
                </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {membersLoading ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'}`}>
                {currentLang === 'en' ? 'Loading members...' : 'Đang tải danh sách thành viên...'}
              </div>
            ) : members.length === 0 ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'}`}>
                {currentLang === 'en' ? 'No member data yet.' : 'Chưa có dữ liệu thành viên.'}
              </div>
            ) : (
              members.slice(0, 6).map((member) => (
                <div key={member.groupMemberId || member.userId} className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${isDarkMode ? 'bg-white/[0.07] text-white' : 'bg-white text-slate-700'}`}>
                      {(member.fullName || member.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {member.fullName || member.username}
                      </p>
                      <p className={`truncate text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {member.email || `@${member.username}`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${member.role === 'LEADER' ? (isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700') : member.role === 'CONTRIBUTOR' ? (isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700') : (isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700')}`}>
                      {formatGroupRole(member.role, currentLang)}
                    </span>
                    {member.isCurrentUser ? (
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'bg-white/[0.07] text-slate-200' : 'bg-white text-slate-700'}`}>
                        {currentLang === 'en' ? 'You' : 'Bạn'}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
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

  const renderProfileSetupGate = () => (
    <div className={`relative overflow-hidden rounded-[32px] border p-8 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
      <div className={`pointer-events-none absolute inset-0 ${
        isDarkMode
          ? 'bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_22%),radial-gradient(circle_at_85%_10%,rgba(6,182,212,0.12),transparent_24%)]'
          : 'bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.08),transparent_22%),radial-gradient(circle_at_85%_10%,rgba(6,182,212,0.08),transparent_24%)]'
      }`} />
      <div className="relative mx-auto max-w-3xl text-center">
        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] ${isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700'}`}>
          {isCheckingMandatoryProfile ? <Loader2 className="h-10 w-10 animate-spin" /> : <ShieldCheck className="h-10 w-10" />}
        </div>
        <h2 className={`mt-6 text-3xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {isCheckingMandatoryProfile
            ? (currentLang === 'en' ? 'Checking the group profile...' : 'Đang kiểm tra profile nhóm...')
            : (currentLang === 'en' ? 'Complete the group profile before continuing' : 'Hoàn thành profile nhóm trước khi dùng workspace')}
        </h2>
        <p className={`mx-auto mt-4 max-w-2xl text-sm leading-7 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {isCheckingMandatoryProfile
            ? (currentLang === 'en'
              ? 'QuizMate AI is loading the current setup state for this group.'
              : 'QuizMate AI đang tải trạng thái setup hiện tại của nhóm này.')
            : (currentLang === 'en'
              ? 'The leader must finish the shared group profile first. Until then, inviting members, uploading materials, and using studio tabs stay locked.'
              : 'Leader cần hoàn tất profile dùng chung của nhóm trước. Trước khi xong, việc mời thành viên, tải tài liệu và dùng các tab studio sẽ bị khóa.')}
        </p>
        {!isCheckingMandatoryProfile ? (
          <button
            type="button"
            onClick={() => setProfileConfigOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            <Sparkles className="h-4 w-4" />
            {currentLang === 'en' ? 'Continue setup' : 'Tiếp tục điền form setup'}
          </button>
        ) : null}
      </div>
    </div>
  );

  // ——— RENDER MAIN CONTENT ———
  const renderContent = () => {
    if (shouldForceProfileSetup) {
      return renderProfileSetupGate();
    }

    switch (activeSection) {
      case 'dashboard':
        if (!isLeader) {
          return renderPersonalDashboard();
        }
        return (
          <GroupDashboardTab
            isDarkMode={isDarkMode}
            group={resolvedGroupData}
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
        return renderActivityFeed(true);

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
            group={resolvedGroupData}
            isLeader={isLeader}
            onGroupUpdated={handleGroupUpdated}
            compactMode
            onOpenProfileConfig={() => setProfileConfigOpen(true)}
            profileEditLocked={profileEditLocked}
          />
        );

      default:
        return null;
    }
  };

  // ——— TOP BAR ———
  

  const handleProfileConfigChange = useCallback((open) => {
    if (!open && shouldForceProfileSetup) {
      return;
    }
    setProfileConfigOpen(open);
    if (!open && location.state?.openProfileConfig) {
      navigate(`${location.pathname}${location.search}`, { replace: true });
    }
  }, [location.pathname, location.search, location.state, navigate, shouldForceProfileSetup]);

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
                {canManageMembers && (
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
          settingsMenu={<></>}
          userProfileComponent={<UserProfilePopover align="end" />}
          wsConnected={wsConnected}
          isDarkMode={isDarkMode}
      />

      {/* Main Workspace Area - 3 Column Layout */}
      <div className="flex flex-1 min-h-0 w-full px-0 py-2 gap-2">
        {/* Left Panel: Sources */}
        {!isLeader && !isContributor || shouldForceProfileSetup ? null : (
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
            {!shouldForceProfileSetup ? (
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
            ) : null}
            <div className="p-4 md:p-5 lg:p-6">
              {renderContent()}
            </div>
          </div>
        </main>

        {/* Right Panel: Studio Tools */}
        {shouldForceProfileSetup ? null : (
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
        )}
      </div>

      {mobilePanel === 'sources' && !isMember && !shouldForceProfileSetup && (
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

      {mobilePanel === 'studio' && !shouldForceProfileSetup && (
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
        canClose={!shouldForceProfileSetup}
        onComplete={async () => {
          try {
            await handleGroupUpdated();
          } catch (error) {
            console.error('Failed to refresh group workspace after profile setup:', error);
          }
          setProfileConfigOpen(false);
          if (location.state?.openProfileConfig) {
            navigate(`${location.pathname}${location.search}`, { replace: true });
          }
          showInfo(t('home.group.setupComplete', 'Cấu hình nhóm hoàn tất!'));
        }}
      />

    </div>
  );
}

export default GroupWorkspacePage;
