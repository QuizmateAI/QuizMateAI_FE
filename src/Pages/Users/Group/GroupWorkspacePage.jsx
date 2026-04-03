import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/Components/ui/button';
import UploadSourceDialog from './Components/UploadSourceDialog';
import GroupDocumentsTab from './Components/GroupDocumentsTab';
import InviteMemberDialog from './Group_leader/InviteMemberDialog';
import GroupWorkspaceProfileConfigDialog from './Components/GroupWorkspaceProfileConfigDialog';
import GroupDashboardTab from './Group_leader/GroupDashboardTab';
import GroupMembersTab from './Group_leader/GroupMembersTab';
import GroupSettingsTab from './Group_leader/GroupSettingsTab';
import ChatPanel from './Components/ChatPanel';
import UserProfilePopover from '@/Components/features/Users/UserProfilePopover';
import WorkspaceOnboardingUpdateGuardDialog from '@/Components/workspace/WorkspaceOnboardingUpdateGuardDialog';
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
  Map as MapIcon,
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
import { useActiveTaskFallback } from '@/hooks/useActiveTaskFallback';
import { createRoadmap } from '@/api/RoadmapAPI';
import { useNavigateWithLoading } from '@/hooks/useNavigateWithLoading';
import {
  deleteMaterial,
  getMaterialsByWorkspace,
  getPendingGroupMaterials as getPendingGroupMaterialsAPI,
  reviewGroupMaterial as reviewGroupMaterialAPI,
  uploadGroupPendingMaterial,
} from '@/api/MaterialAPI';
import { getGroupWorkspaceProfile, normalizeGroupWorkspaceProfile } from '@/api/WorkspaceAPI';
import { getQuizzesByScope, deleteQuiz } from '@/api/QuizAPI';
import { unwrapApiData } from '@/Utils/apiResponse';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import { useToast } from '@/context/ToastContext';
import { useSequentialProgressMap } from '@/hooks/useSequentialProgressMap';
import { normalizeRuntimeTaskSignal } from '@/lib/runtimeTaskSignal';
import { formatGroupLearningMode, formatGroupRole } from './utils/groupDisplay';

const GROUP_WELCOME_STORAGE_PREFIX = 'group-invite-welcome';
const GROUP_UPLOAD_ACCEPTED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
  '.mp3',
  '.mp4',
]);

function clampPercent(percent) {
  return Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
}

function normalizeMaterialStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'WARNED') return 'WARN';
  if (normalized === 'REJECTED') return 'REJECT';
  return normalized;
}

function isProcessingMaterialStatus(status) {
  return ['UPLOADING', 'PROCESSING', 'PENDING', 'QUEUED'].includes(normalizeMaterialStatus(status));
}

function isReviewableMaterialStatus(status) {
  return ['ACTIVE', 'WARN'].includes(normalizeMaterialStatus(status));
}

function isTerminalMaterialStatus(status) {
  return ['ACTIVE', 'WARN', 'ERROR', 'REJECT', 'DELETED'].includes(normalizeMaterialStatus(status));
}

function getPendingMaterialRenderKey(item, prefix = 'pending', fallbackIndex = 0) {
  const materialId = Number(item?.materialId ?? item?.id ?? 0);
  if (Number.isInteger(materialId) && materialId > 0) {
    return `${prefix}:material:${materialId}`;
  }

  const taskId = String(item?.taskId ?? item?.websocketTaskId ?? item?.progressKey ?? item?.key ?? '').trim();
  if (taskId) {
    return `${prefix}:task:${taskId}`;
  }

  const uploadedAt = String(item?.uploadedAt ?? '').trim();
  const title = String(item?.title ?? item?.name ?? 'untitled').trim() || 'untitled';
  return `${prefix}:fallback:${title}:${uploadedAt}:${fallbackIndex}`;
}

function renderInlineSpinner(className = 'h-10 w-10', borderClassName = 'border-2') {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent ${borderClassName} ${className}`}
    />
  );
}

function inferMaterialType(file) {
  if (file?.type) return file.type;
  const fileName = String(file?.name || '').toLowerCase();
  if (fileName.endsWith('.pdf')) return 'application/pdf';
  if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'application/msword';
  if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) return 'application/vnd.ms-powerpoint';
  if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return 'application/vnd.ms-excel';
  if (fileName.endsWith('.txt')) return 'text/plain';
  if (fileName.endsWith('.mp3')) return 'audio/mpeg';
  if (fileName.endsWith('.mp4')) return 'video/mp4';
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function getFileExtension(fileName) {
  const normalized = String(fileName || '').trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');
  return dotIndex >= 0 ? normalized.slice(dotIndex) : '';
}

function isSupportedGroupUploadFile(file) {
  return GROUP_UPLOAD_ACCEPTED_EXTENSIONS.has(getFileExtension(file?.name));
}

function mapTransportProgressToDisplay(percent) {
  const normalized = clampPercent(percent);
  return Math.max(1, Math.min(24, Math.round((normalized / 100) * 24)));
}

function mapProcessingProgressToDisplay(percent) {
  const normalized = clampPercent(percent);
  return Math.max(25, Math.min(99, 25 + Math.round((normalized / 100) * 74)));
}

function createUploadSessionKey(file) {
  return `upload:${Date.now()}:${Math.random().toString(36).slice(2, 8)}:${String(file?.name || 'file')}`;
}

function getRealtimeMaterialId(payload, fallbackTaskId = null, uploads = []) {
  const directId = Number(
    payload?.materialId
    ?? payload?.material_id
    ?? payload?.data?.materialId
    ?? payload?.data?.material_id
    ?? 0
  );
  if (Number.isInteger(directId) && directId > 0) return directId;

  if (!fallbackTaskId) return null;
  const matchedUpload = (uploads || []).find((item) => String(item?.taskId || '') === String(fallbackTaskId));
  const matchedId = Number(matchedUpload?.materialId ?? 0);
  return Number.isInteger(matchedId) && matchedId > 0 ? matchedId : null;
}

function buildPendingQueueMessage(status, currentLang, isLeader = false) {
  const normalized = normalizeMaterialStatus(status);

  if (normalized === 'UPLOADING') {
    return currentLang === 'en'
      ? 'Uploading the file to the server.'
      : 'Đang tải tệp lên máy chủ.';
  }

  if (normalized === 'PROCESSING' || normalized === 'PENDING' || normalized === 'QUEUED') {
    return currentLang === 'en'
      ? 'AI is checking this material against the group profile.'
      : 'AI đang đối chiếu tài liệu này với profile nhóm.';
  }

  if (normalized === 'ACTIVE') {
    return isLeader
      ? (currentLang === 'en'
        ? 'AI finished processing. You can approve it for the shared source list now.'
        : 'AI đã xử lý xong. Bạn có thể duyệt ngay để đưa vào nguồn học chung.')
      : (currentLang === 'en'
        ? 'AI finished processing. This material is waiting for leader approval.'
        : 'AI đã xử lý xong. Tài liệu đang chờ leader phê duyệt.');
  }

  if (normalized === 'WARN') {
    return isLeader
      ? (currentLang === 'en'
        ? 'AI found a warning. Review carefully before approving.'
        : 'AI đã gắn warning. Cần xem lại kỹ trước khi duyệt.')
      : (currentLang === 'en'
        ? 'AI flagged this material. It is waiting for leader review.'
        : 'AI đã gắn warning cho tài liệu này. Tài liệu đang chờ leader xem lại.');
  }

  if (normalized === 'ERROR') {
    return currentLang === 'en'
      ? 'The system could not finish processing this material.'
      : 'Hệ thống không thể xử lý xong tài liệu này.';
  }

  if (normalized === 'REJECT') {
    return currentLang === 'en'
      ? 'The material was rejected for this group workspace.'
      : 'Tài liệu đã bị loại khỏi group workspace này.';
  }

  return currentLang === 'en'
    ? 'This material is waiting for an update.'
    : 'Tài liệu này đang chờ cập nhật mới.';
}

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
  const { showError, showInfo, showSuccess, showWarning } = useToast();
  const materialProgress = useSequentialProgressMap({ stepDelayMs: 22 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [studioCollapsed, setStudioCollapsed] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(null);

  // Section navigation via URL
  const validSections = ['dashboard', 'personalDashboard', 'documents', 'members', 'notifications', 'flashcard', 'quiz', 'roadmap', 'mockTest', 'challenge', 'settings'];
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
  const [profileUpdateGuardOpen, setProfileUpdateGuardOpen] = useState(false);
  const [isResettingWorkspaceForProfileUpdate, setIsResettingWorkspaceForProfileUpdate] = useState(false);
  const [groupHasLearningData, setGroupHasLearningData] = useState(false);
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
  const [hasLoadedGroupProfile, setHasLoadedGroupProfile] = useState(isCreating);
  const [groupLogs, setGroupLogs] = useState([]);
  const [groupLogsLoading, setGroupLogsLoading] = useState(false);
  const [welcomePayload, setWelcomePayload] = useState(null);
  const [pendingReviewMaterials, setPendingReviewMaterials] = useState([]);
  const [pendingReviewLoading, setPendingReviewLoading] = useState(false);
  const [reviewingPendingMaterialId, setReviewingPendingMaterialId] = useState(null);
  const [sessionUploadQueue, setSessionUploadQueue] = useState([]);
  const settingsRef = useRef(null);
  const refreshPendingMaterialTimersRef = useRef({});
  const uploadNotificationsRef = useRef(new Set());

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
    && !hasLoadedGroupProfile
  );
  const isProfileSetupIncomplete = Boolean(
    isLeader
    && canManageGroup
    && !isCreating
    && hasLoadedGroupProfile
    && groupProfile
    && !hasCompletedGroupProfile
  );
  const shouldForceProfileSetup = Boolean(
    isProfileSetupIncomplete
    || (isLeader && canManageGroup && !isCreating && hasLoadedGroupProfile && !groupProfile && !hasCompletedGroupProfile)
    || (hasLoadedGroupProfile && openProfileConfig && !hasCompletedGroupProfile)
  );
  const profileEditLocked = hasUploadedMaterials && hasCompletedGroupProfile;
  // Tính toán xem workspace có dữ liệu học tập chưa hoàn thành không (quiz/roadmap)
  // Sẽ được cập nhật khi fetch quiz và roadmap từ API trong quá trình xóa
  const materialCountForGroupProfile = sources.length;
  const pageShellClass = isDarkMode
    ? 'bg-[#06131a] text-white'
    : 'bg-[linear-gradient(180deg,#fffaf0_0%,#f4fbf7_46%,#eef6ff_100%)] text-slate-900';
  const resolveUiErrorMessage = useCallback((error) => getErrorMessage(t, error), [t]);

  const patchSessionUpload = useCallback((matcher, patch) => {
    setSessionUploadQueue((current) => current.map((item) => {
      if (!matcher(item)) return item;
      const nextPatch = typeof patch === 'function' ? patch(item) : patch;
      return {
        ...item,
        ...(nextPatch || {}),
      };
    }));
  }, []);

  const removeSessionUpload = useCallback((matcher) => {
    setSessionUploadQueue((current) => current.filter((item) => !matcher(item)));
  }, []);

  const clearPendingMaterialRefreshTimer = useCallback((materialId) => {
    const key = String(materialId || '');
    if (!key || !refreshPendingMaterialTimersRef.current[key]) return;
    globalThis.clearTimeout(refreshPendingMaterialTimersRef.current[key]);
    delete refreshPendingMaterialTimersRef.current[key];
  }, []);

  useEffect(() => {
    if (isCreating || !workspaceId || workspaceId === 'new') return;
    if (currentWorkspaceFromList?.workspaceId || String(currentWorkspace?.workspaceId) === String(workspaceId)) return;
    fetchWorkspaceDetail(workspaceId).catch((err) => {
      console.error('Failed to fetch group workspace detail:', err);
    });
  }, [currentWorkspace?.workspaceId, currentWorkspaceFromList?.workspaceId, fetchWorkspaceDetail, isCreating, workspaceId]);

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
        })).filter((item) => String(item?.status || '').toUpperCase() !== 'DELETED')
        : [];
      setSources(mappedSources);
      return mappedSources;
    } catch (err) {
      console.error("❌ [fetchSources] Failed to fetch materials:", err);
      return [];
    }
  }, [workspaceId, isCreating]);

  const loadPendingReviewMaterials = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!resolvedWorkspaceId || isCreating || !isLeader) {
      setPendingReviewMaterials([]);
      return [];
    }

    setPendingReviewLoading(true);
    try {
      const data = await getPendingGroupMaterialsAPI(resolvedWorkspaceId);
      const materials = Array.isArray(data)
        ? data.map((item) => ({
          id: item.materialId,
          materialId: item.materialId,
          title: item.title,
          name: item.title,
          type: item.materialType,
          status: item.status,
          uploadedAt: item.uploadedAt,
          needReview: item.needReview !== false,
          ...item,
        })).filter((item) => normalizeMaterialStatus(item?.status) !== 'DELETED')
        : [];
      setPendingReviewMaterials(materials);
      return materials;
    } catch (error) {
      if (!silent) {
        showError(resolveUiErrorMessage(error));
      }
      console.error('Failed to load pending review materials:', error);
      setPendingReviewMaterials([]);
      return [];
    } finally {
      setPendingReviewLoading(false);
    }
  }, [isCreating, isLeader, resolvedWorkspaceId, resolveUiErrorMessage, showError]);

  const refreshGroupMaterialViews = useCallback(async (options = {}) => {
    const { silent = true } = options;
    await fetchSources();
    if (isLeader) {
      await loadPendingReviewMaterials({ silent });
    }
  }, [fetchSources, isLeader, loadPendingReviewMaterials]);

  const scheduleMaterialViewRefresh = useCallback((materialId) => {
    const key = String(materialId || '');
    if (!key) {
      void refreshGroupMaterialViews({ silent: true });
      return;
    }

    clearPendingMaterialRefreshTimer(key);
    const currentProgress = materialProgress.getProgress(key);
    const delayMs = Math.max(240, (100 - currentProgress) * 18 + 160);

    refreshPendingMaterialTimersRef.current[key] = globalThis.setTimeout(() => {
      clearPendingMaterialRefreshTimer(key);
      void refreshGroupMaterialViews({ silent: true });
    }, delayMs);
  }, [clearPendingMaterialRefreshTimer, materialProgress, refreshGroupMaterialViews]);

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
      setHasLoadedGroupProfile(true);
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
      setHasLoadedGroupProfile(false);
      loadGroupProfile();
      loadGroupLogs();
      if (isLeader) {
        loadPendingReviewMaterials({ silent: true });
      } else {
        setPendingReviewMaterials([]);
      }
    }
  }, [isCreating, isLeader, loadGroupLogs, loadGroupProfile, loadPendingReviewMaterials, resolvedWorkspaceId]);

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

  useEffect(() => () => {
    Object.values(refreshPendingMaterialTimersRef.current).forEach((timerId) => {
      globalThis.clearTimeout(timerId);
    });
    refreshPendingMaterialTimersRef.current = {};
  }, []);

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

  // Kiểm tra dữ liệu học tập khi guard dialog mở
  useEffect(() => {
    if (!profileUpdateGuardOpen || !workspaceId || isCreating) return;

    let cancelled = false;

    const checkLearningData = async () => {
      try {
        const quizResponse = await getQuizzesByScope('WORKSPACE', Number(workspaceId));
        const quizzes = Array.isArray(quizResponse?.data) ? quizResponse.data : [];
        if (cancelled) return;
        if (quizzes.length > 0) {
          setGroupHasLearningData(true);
          return;
        }
        try {
          const { getFlashcardsByScope } = await import('@/api/FlashcardAPI');
          const fcResponse = await getFlashcardsByScope('WORKSPACE', Number(workspaceId));
          const flashcards = Array.isArray(fcResponse?.data) ? fcResponse.data : [];
          if (cancelled) return;
          setGroupHasLearningData(flashcards.length > 0);
        } catch {
          if (!cancelled) setGroupHasLearningData(false);
        }
      } catch {
        if (!cancelled) setGroupHasLearningData(false);
      }
    };

    setGroupHasLearningData(false);
    checkLearningData();

    return () => { cancelled = true; };
  }, [profileUpdateGuardOpen, workspaceId, isCreating]);

  const announceRealtimeMaterialStatus = useCallback((materialId, title, status) => {
    const normalizedMaterialId = Number(materialId);
    const normalizedStatus = normalizeMaterialStatus(status);
    if (!Number.isInteger(normalizedMaterialId) || normalizedMaterialId <= 0 || !normalizedStatus) return;

    const notificationKey = `${normalizedMaterialId}:${normalizedStatus}`;
    if (uploadNotificationsRef.current.has(notificationKey)) return;
    uploadNotificationsRef.current.add(notificationKey);

    const materialTitle = title || (currentLang === 'en' ? 'Material' : 'Tài liệu');

    if (normalizedStatus === 'ACTIVE') {
      showInfo(
        currentLang === 'en'
          ? `"${materialTitle}" passed AI checks and is waiting for leader approval.`
          : `"${materialTitle}" đã qua bước AI và đang chờ leader duyệt.`,
      );
      return;
    }

    if (normalizedStatus === 'WARN') {
      showWarning(
        currentLang === 'en'
          ? `"${materialTitle}" has a warning and needs leader review.`
          : `"${materialTitle}" có warning và cần leader xem lại.`,
      );
      return;
    }

    if (normalizedStatus === 'ERROR') {
      showError(
        currentLang === 'en'
          ? `The system could not finish processing "${materialTitle}".`
          : `Hệ thống không thể xử lý xong "${materialTitle}".`,
      );
      return;
    }

    if (normalizedStatus === 'REJECT') {
      showError(
        currentLang === 'en'
          ? `"${materialTitle}" was rejected for this group workspace.`
          : `"${materialTitle}" đã bị loại khỏi group workspace này.`,
      );
    }
  }, [currentLang, showError, showInfo, showWarning]);

  const handleRealtimeProgress = useCallback((progressPayload) => {
    const signal = normalizeRuntimeTaskSignal(progressPayload, { source: 'websocket' });
    const taskId = String(signal.taskId || '');
    const status = normalizeMaterialStatus(signal.status ?? progressPayload?.final_status);
    const rawPercent = clampPercent(
      signal.percent
      ?? progressPayload?.percent
      ?? progressPayload?.progressPercent,
    );
    const normalizedMaterialId = Number(signal.materialId ?? 0);
    const materialId = getRealtimeMaterialId(
      {
        ...progressPayload,
        ...(Number.isInteger(normalizedMaterialId) && normalizedMaterialId > 0
          ? {
            materialId: normalizedMaterialId,
            material_id: normalizedMaterialId,
          }
          : {}),
      },
      taskId,
      sessionUploadQueue,
    );

    if (!materialId && !taskId) return;

    const progressKey = String(materialId || taskId);
    const nextDisplayPercent = rawPercent > 0 ? mapProcessingProgressToDisplay(rawPercent) : 28;
    materialProgress.setProgress(progressKey, nextDisplayPercent);

    if (materialId && progressKey !== String(materialId)) {
      materialProgress.setProgress(String(materialId), Math.max(materialProgress.getProgress(progressKey), nextDisplayPercent), { instant: true });
      materialProgress.clearProgress(progressKey);
    }

    patchSessionUpload(
      (item) => String(item?.progressKey || item?.key) === progressKey || Number(item?.materialId) === Number(materialId),
      (item) => ({
        materialId: materialId ?? item.materialId,
        progressKey: String(materialId || item.progressKey || item.key),
        taskId: taskId || item.taskId,
        status: status || item.status || 'PROCESSING',
        message: buildPendingQueueMessage(status || item.status || 'PROCESSING', currentLang, isLeader),
      }),
    );

    if (materialId && isTerminalMaterialStatus(status)) {
      materialProgress.setProgress(String(materialId), 100);
      announceRealtimeMaterialStatus(materialId, progressPayload?.title ?? progressPayload?.data?.title, status);
      scheduleMaterialViewRefresh(materialId);
    }
  }, [
    announceRealtimeMaterialStatus,
    currentLang,
    isLeader,
    materialProgress,
    patchSessionUpload,
    scheduleMaterialViewRefresh,
    sessionUploadQueue,
  ]);

  const handleRealtimeMaterialUpdate = useCallback((materialPayload) => {
    const signal = normalizeRuntimeTaskSignal(materialPayload, { source: 'websocket' });
    const taskId = String(signal.taskId || '');
    const status = normalizeMaterialStatus(signal.status ?? materialPayload?.final_status);
    const normalizedMaterialId = Number(signal.materialId ?? 0);
    const materialId = getRealtimeMaterialId(
      {
        ...materialPayload,
        ...(Number.isInteger(normalizedMaterialId) && normalizedMaterialId > 0
          ? {
            materialId: normalizedMaterialId,
            material_id: normalizedMaterialId,
          }
          : {}),
      },
      taskId,
      sessionUploadQueue,
    );

    if (!materialId) {
      void refreshGroupMaterialViews({ silent: true });
      return;
    }

    const materialTitle = materialPayload?.title ?? materialPayload?.name ?? null;
    materialProgress.setProgress(String(materialId), isTerminalMaterialStatus(status) ? 100 : 28);

    patchSessionUpload(
      (item) => Number(item?.materialId) === Number(materialId) || String(item?.taskId || '') === taskId,
      (item) => ({
        materialId,
        progressKey: String(materialId),
        taskId: taskId || item.taskId,
        status: status || item.status || 'PROCESSING',
        name: materialTitle ?? item.name,
        title: materialTitle ?? item.title,
        uploadedAt: materialPayload?.uploadedAt ?? item.uploadedAt,
        needReview: materialPayload?.needReview ?? item.needReview ?? true,
        message: buildPendingQueueMessage(status || item.status || 'PROCESSING', currentLang, isLeader),
      }),
    );

    if (status === 'DELETED') {
      removeSessionUpload((item) => Number(item?.materialId) === Number(materialId));
      materialProgress.clearProgress(String(materialId));
      void refreshGroupMaterialViews({ silent: true });
      return;
    }

    if (isTerminalMaterialStatus(status)) {
      announceRealtimeMaterialStatus(materialId, materialTitle, status);
      scheduleMaterialViewRefresh(materialId);
      return;
    }

    void refreshGroupMaterialViews({ silent: true });
  }, [
    announceRealtimeMaterialStatus,
    currentLang,
    isLeader,
    materialProgress,
    patchSessionUpload,
    refreshGroupMaterialViews,
    removeSessionUpload,
    scheduleMaterialViewRefresh,
    sessionUploadQueue,
  ]);

  const handleReviewPendingMaterial = useCallback(async (item, isApproved) => {
    const materialId = Number(item?.materialId ?? item?.id ?? 0);
    if (!Number.isInteger(materialId) || materialId <= 0) return;

    setReviewingPendingMaterialId(materialId);
    try {
      await reviewGroupMaterialAPI(materialId, isApproved);
      removeSessionUpload((entry) => Number(entry?.materialId) === materialId);
      materialProgress.clearProgress(String(materialId));
      await refreshGroupMaterialViews({ silent: true });
      showSuccess(
        isApproved
          ? (currentLang === 'en' ? 'Material approved for the group.' : 'Đã duyệt tài liệu vào group.')
          : (currentLang === 'en' ? 'Material rejected from the group.' : 'Đã từ chối tài liệu khỏi group.'),
      );
    } catch (error) {
      showError(resolveUiErrorMessage(error));
    } finally {
      setReviewingPendingMaterialId(null);
    }
  }, [
    currentLang,
    materialProgress,
    refreshGroupMaterialViews,
    removeSessionUpload,
    resolveUiErrorMessage,
    showError,
    showSuccess,
  ]);

  // WebSocket
  const applyRecoveredGroupActiveTaskSnapshot = useCallback((snapshot) => {
    const hasActiveTask = Boolean(snapshot?.hasActiveTask);
    const tasks = Array.isArray(snapshot?.activeTasks) ? snapshot.activeTasks : [];

    if (!hasActiveTask || tasks.length === 0) {
      setSessionUploadQueue((current) => current.filter((item) => !isProcessingMaterialStatus(item?.status)));
      void refreshGroupMaterialViews({ silent: true });
      return;
    }

    tasks.forEach((task) => {
      const signal = normalizeRuntimeTaskSignal(task, { source: 'active-task' });
      if (!signal.taskId && !signal.materialId) return;

      handleRealtimeProgress({
        ...task,
        ...signal,
        websocketTaskId: signal.taskId,
        taskId: signal.taskId,
        percent: signal.percent,
        progressPercent: signal.percent,
        ...(signal.processingObject && typeof signal.processingObject === 'object' ? signal.processingObject : {}),
      });
    });
  }, [handleRealtimeProgress, refreshGroupMaterialViews]);

  const { isConnected: wsConnected, lastMessage: wsLastMessage } = useWebSocket({
    workspaceId: !isCreating ? workspaceId : null,
    enabled: !isCreating && !!workspaceId && workspaceId !== 'new',
    onMaterialUploaded: handleRealtimeMaterialUpdate,
    onMaterialDeleted: () => {
      void refreshGroupMaterialViews({ silent: true });
    },
    onMaterialUpdated: handleRealtimeMaterialUpdate,
    onProgress: handleRealtimeProgress,
  });

  const { refreshActiveTaskSnapshot } = useActiveTaskFallback({
    enabled: !isCreating && !!workspaceId && workspaceId !== 'new',
    lastWebSocketMessage: wsLastMessage,
    onSnapshot: (snapshot) => {
      applyRecoveredGroupActiveTaskSnapshot(snapshot);
    },
    silenceThresholdMs: 15000,
    pollIntervalMs: 15000,
  });

  useEffect(() => {
    if (isCreating || !workspaceId || workspaceId === 'new') return;
    void refreshActiveTaskSnapshot('page-reload');
  }, [isCreating, refreshActiveTaskSnapshot, workspaceId]);

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
    const candidateFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    if (candidateFiles.length === 0) {
      showError(currentLang === 'en' ? 'Please choose at least one file.' : 'Vui lòng chọn ít nhất một tệp.');
      return;
    }

    const invalidFiles = candidateFiles.filter((file) => {
      if (!file || Number(file.size) <= 0) return true;
      return !isSupportedGroupUploadFile(file);
    });
    const validFiles = candidateFiles.filter((file) => !invalidFiles.includes(file));

    if (invalidFiles.length > 0) {
      showError(
        currentLang === 'en'
          ? `Unsupported or empty files: ${invalidFiles.map((file) => file?.name || 'unknown').join(', ')}.`
          : `Các tệp không hợp lệ hoặc rỗng: ${invalidFiles.map((file) => file?.name || 'không rõ').join(', ')}.`,
      );
    }

    if (validFiles.length === 0) {
      throw new Error(currentLang === 'en' ? 'No valid file remains for upload.' : 'Không còn tệp hợp lệ để tải lên.');
    }

    const uploadDrafts = validFiles.map((file) => {
      const key = createUploadSessionKey(file);
      return {
        key,
        progressKey: key,
        materialId: null,
        taskId: null,
        name: file.name,
        title: file.name,
        type: inferMaterialType(file),
        status: 'UPLOADING',
        needReview: true,
        uploadedAt: new Date().toISOString(),
        source: 'local',
        message: buildPendingQueueMessage('UPLOADING', currentLang, isLeader),
      };
    });

    setSessionUploadQueue((current) => [...uploadDrafts, ...current]);
    uploadDrafts.forEach((item) => {
      materialProgress.setProgress(item.progressKey, 1, { instant: true });
    });

    const settledUploads = await Promise.allSettled(uploadDrafts.map((draft, index) => {
      const file = validFiles[index];
      return uploadGroupPendingMaterial(file, workspaceId, {
        onUploadProgress: (event) => {
          const totalBytes = Number(event?.total || 0);
          const loadedBytes = Number(event?.loaded || 0);
          const rawPercent = totalBytes > 0 ? (loadedBytes / totalBytes) * 100 : 0;
          materialProgress.setProgress(draft.progressKey, mapTransportProgressToDisplay(rawPercent));
        },
      }).then((response) => {
        const materialId = Number(response?.materialId ?? 0);
        if (!Number.isInteger(materialId) || materialId <= 0) {
          throw new Error(currentLang === 'en' ? 'The server did not return a material id.' : 'Server không trả về materialId hợp lệ.');
        }

        const normalizedStatus = normalizeMaterialStatus(response?.status || 'PROCESSING');
        const currentProgress = materialProgress.getProgress(draft.progressKey);
        materialProgress.setProgress(String(materialId), Math.max(25, currentProgress), { instant: true });
        materialProgress.clearProgress(draft.progressKey);

        patchSessionUpload(
          (item) => item.key === draft.key,
          {
            key: `material:${materialId}`,
            progressKey: String(materialId),
            materialId,
            taskId: response?.websocketTaskId ?? response?.taskId ?? null,
            status: normalizedStatus,
            message: response?.message || buildPendingQueueMessage(normalizedStatus, currentLang, isLeader),
          },
        );

        if (isLeader) {
          void loadPendingReviewMaterials({ silent: true });
        }

        return {
          materialId,
          title: file.name,
          status: normalizedStatus,
        };
      }).catch((error) => {
        const message = resolveUiErrorMessage(error);
        materialProgress.clearProgress(draft.progressKey);
        patchSessionUpload(
          (item) => item.key === draft.key,
          {
            status: 'ERROR',
            message,
          },
        );
        throw new Error(`${file.name}: ${message}`);
      });
    }));

    const successfulUploads = settledUploads
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);
    const failedUploads = settledUploads
      .filter((result) => result.status === 'rejected')
      .map((result) => String(result.reason?.message || result.reason || '').trim())
      .filter(Boolean);

    if (successfulUploads.length > 0) {
      showInfo(
        currentLang === 'en'
          ? `Submitted ${successfulUploads.length} file(s) to the group review queue.`
          : `Đã gửi ${successfulUploads.length} tệp vào hàng chờ duyệt của group.`,
      );
      showWarning(
        isLeader
          ? (currentLang === 'en'
            ? 'New materials will appear in the shared source list only after you approve them.'
            : 'Tài liệu mới chỉ xuất hiện trong nguồn học chung sau khi leader duyệt.')
          : (currentLang === 'en'
            ? 'Your upload is waiting for leader approval before the whole group can use it.'
            : 'Tài liệu bạn vừa gửi đang chờ leader duyệt trước khi cả nhóm dùng được.'),
      );
    }

    if (failedUploads.length > 0) {
      showError(
        currentLang === 'en'
          ? `Some files failed: ${failedUploads.slice(0, 3).join(' | ')}${failedUploads.length > 3 ? ' ...' : ''}`
          : `Một số tệp tải lên thất bại: ${failedUploads.slice(0, 3).join(' | ')}${failedUploads.length > 3 ? ' ...' : ''}`,
      );
    }

    if (successfulUploads.length === 0) {
      throw new Error(currentLang === 'en' ? 'All uploads failed.' : 'Toàn bộ upload đều thất bại.');
    }
  }, [
    canUploadSource,
    currentLang,
    isCreating,
    isLeader,
    loadPendingReviewMaterials,
    materialProgress,
    patchSessionUpload,
    resolveUiErrorMessage,
    shouldForceProfileSetup,
    showError,
    showInfo,
    showWarning,
    workspaceId,
  ]);

  // Remove source
  const handleRemoveSource = useCallback(async (sourceId) => {
    try {
      await deleteMaterial(sourceId);
      setSources((prev) => prev.filter((source) => source.id !== sourceId));
      showInfo(currentLang === 'en' ? 'Material deleted.' : 'Đã xóa tài liệu.');
    } catch (error) {
      console.error('Delete failed:', error);
      showError(resolveUiErrorMessage(error));
    }
  }, [currentLang, resolveUiErrorMessage, showError, showInfo]);

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
      showInfo(
        currentLang === 'en'
          ? `Deleted ${sourceIds.length} material(s).`
          : `Đã xóa ${sourceIds.length} tài liệu.`,
      );
    } catch (error) {
      console.error('Bulk delete error:', error);
      showError(resolveUiErrorMessage(error));
    }
  }, [currentLang, resolveUiErrorMessage, showError, showInfo]);

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

  const pendingReviewDisplayItems = useMemo(() => {
    const serverItemsByMaterialId = new Map();
    const serverItemsWithoutMaterialId = [];

    (isLeader ? pendingReviewMaterials : []).forEach((item, index) => {
      const materialId = Number(item?.materialId ?? item?.id ?? 0);
      const hasMaterialId = Number.isInteger(materialId) && materialId > 0;
      const materialIdKey = hasMaterialId ? String(materialId) : null;
      const progressKey = String(
        materialIdKey
        || item?.taskId
        || item?.websocketTaskId
        || item?.progressKey
        || getPendingMaterialRenderKey(item, 'server-progress', index),
      );
      const normalizedItem = {
        ...item,
        key: getPendingMaterialRenderKey(item, 'server', index),
        renderKey: getPendingMaterialRenderKey(item, 'server', index),
        materialId: hasMaterialId ? materialId : null,
        progress: materialProgress.getProgress(progressKey),
        source: 'server',
        ownerLabel: currentLang === 'en' ? 'Official group review queue' : 'Hàng chờ duyệt chính thức của group',
        message: buildPendingQueueMessage(item?.status, currentLang, true),
        canApprove: isReviewableMaterialStatus(item?.status),
        canReject: !isProcessingMaterialStatus(item?.status) && normalizeMaterialStatus(item?.status) !== 'ERROR',
      };

      if (materialIdKey) {
        serverItemsByMaterialId.set(materialIdKey, normalizedItem);
        return;
      }

      serverItemsWithoutMaterialId.push(normalizedItem);
    });

    const localOnlyItems = [];
    sessionUploadQueue.forEach((item, index) => {
      const materialId = Number(item?.materialId ?? 0);
      const materialIdKey = Number.isInteger(materialId) && materialId > 0 ? String(materialId) : null;
      const progressKey = String(item?.progressKey || materialIdKey || item?.key || '');
      const localProgress = materialProgress.getProgress(progressKey);
      const localItem = {
        ...item,
        key: item?.key || progressKey || getPendingMaterialRenderKey(item, 'local', index),
        renderKey: getPendingMaterialRenderKey(item, 'local', index),
        materialId: materialId > 0 ? materialId : null,
        progress: localProgress,
        source: item?.source || 'local',
        ownerLabel: currentLang === 'en' ? 'Submitted from this session' : 'Được gửi từ phiên hiện tại',
        message: item?.message || buildPendingQueueMessage(item?.status, currentLang, isLeader),
        canApprove: false,
        canReject: false,
      };

      if (materialIdKey && serverItemsByMaterialId.has(materialIdKey)) {
        const mergedServerItem = serverItemsByMaterialId.get(materialIdKey);
        serverItemsByMaterialId.set(materialIdKey, {
          ...localItem,
          ...mergedServerItem,
          progress: Math.max(localProgress, mergedServerItem?.progress || 0),
          message: mergedServerItem?.message || localItem.message,
        });
        return;
      }

      localOnlyItems.push(localItem);
    });

    const allItems = [
      ...Array.from(serverItemsByMaterialId.values()),
      ...serverItemsWithoutMaterialId,
      ...localOnlyItems,
    ];

    return allItems.sort((left, right) => {
      const leftProcessing = isProcessingMaterialStatus(left?.status) ? 1 : 0;
      const rightProcessing = isProcessingMaterialStatus(right?.status) ? 1 : 0;
      if (leftProcessing !== rightProcessing) return rightProcessing - leftProcessing;

      const leftReviewable = isReviewableMaterialStatus(left?.status) ? 1 : 0;
      const rightReviewable = isReviewableMaterialStatus(right?.status) ? 1 : 0;
      if (leftReviewable !== rightReviewable) return rightReviewable - leftReviewable;

      const leftTime = new Date(left?.uploadedAt || 0).getTime();
      const rightTime = new Date(right?.uploadedAt || 0).getTime();
      return rightTime - leftTime;
    });
  }, [currentLang, isLeader, materialProgress, pendingReviewMaterials, sessionUploadQueue]);

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
      await refreshGroupMaterialViews({ silent: true });
    }
  }, [fetchGroups, fetchWorkspaceDetail, loadGroupProfile, refreshGroupMaterialViews, resolvedWorkspaceId]);

  // Xử lý yêu cầu cập nhật onboarding — kiểm tra guard
  const handleRequestGroupProfileUpdate = useCallback(() => {
    setIsSettingsOpen(false);
    if (profileEditLocked) {
      setProfileUpdateGuardOpen(true);
      return;
    }
    setProfileConfigOpen(true);
  }, [profileEditLocked]);

  // Xóa toàn bộ dữ liệu workspace để cho phép cập nhật onboarding
  const handleDeleteMaterialsForGroupProfileUpdate = useCallback(async () => {
    if (!workspaceId || isResettingWorkspaceForProfileUpdate) return;

    setIsResettingWorkspaceForProfileUpdate(true);

    try {
      // 1. Xóa quiz
      const quizResponse = await getQuizzesByScope('WORKSPACE', Number(workspaceId));
      const workspaceQuizzes = Array.isArray(quizResponse?.data) ? quizResponse.data : [];
      await Promise.all(workspaceQuizzes.map((quiz) => {
        const quizId = Number(quiz?.quizId);
        if (!Number.isInteger(quizId) || quizId <= 0) return Promise.resolve();
        return deleteQuiz(quizId);
      }));

      // 2. Xóa flashcard (dynamic import theo pattern hiện tại)
      try {
        const { getFlashcardsByScope, deleteFlashcardSet } = await import('@/api/FlashcardAPI');
        const flashcardResponse = await getFlashcardsByScope('WORKSPACE', Number(workspaceId));
        const workspaceFlashcards = Array.isArray(flashcardResponse?.data) ? flashcardResponse.data : [];
        await Promise.all(workspaceFlashcards.map((fc) => {
          const fcId = Number(fc?.flashcardSetId ?? fc?.id);
          if (!Number.isInteger(fcId) || fcId <= 0) return Promise.resolve();
          return deleteFlashcardSet(fcId);
        }));
      } catch (fcError) {
        console.error('Failed to delete flashcards during group profile reset:', fcError);
      }

      // 3. Xóa roadmap structure nếu có
      try {
        const roadmapId = groupProfile?.roadmapId
          || groupProfile?.data?.roadmapId
          || null;
        if (roadmapId) {
          const { getRoadmapStructureById, deleteRoadmapKnowledgeById, deleteRoadmapPhaseById } = await import('@/api/RoadmapAPI');
          const roadmapResponse = await getRoadmapStructureById(roadmapId);
          const roadmapData = roadmapResponse?.data?.data || roadmapResponse?.data || roadmapResponse || null;
          const phases = Array.isArray(roadmapData?.phases) ? roadmapData.phases : [];
          for (const phase of phases) {
            const knowledges = Array.isArray(phase?.knowledges) ? phase.knowledges : [];
            for (const knowledge of knowledges) {
              const knowledgeId = Number(knowledge?.knowledgeId);
              const phaseId = Number(phase?.phaseId);
              if (!Number.isInteger(knowledgeId) || knowledgeId <= 0 || !Number.isInteger(phaseId) || phaseId <= 0) continue;
              await deleteRoadmapKnowledgeById(knowledgeId, phaseId);
            }
          }
          for (const phase of phases) {
            const phaseId = Number(phase?.phaseId);
            if (!Number.isInteger(phaseId) || phaseId <= 0) continue;
            await deleteRoadmapPhaseById(phaseId, roadmapId);
          }
        }
      } catch (roadmapError) {
        const status = Number(roadmapError?.response?.status);
        if (status !== 404) {
          console.error('Failed to reset roadmap structure for group profile update:', roadmapError);
        }
      }

      // 4. Xóa tài liệu
      const materialIds = sources
        .map((source) => Number(source?.id))
        .filter((id) => Number.isInteger(id) && id > 0);
      await Promise.all(materialIds.map((materialId) => deleteMaterial(materialId)));

      setSources([]);
      setSelectedSourceIds([]);

      await fetchWorkspaceDetail(workspaceId).catch(() => {});
      await loadGroupProfile();

      setProfileUpdateGuardOpen(false);
      setProfileConfigOpen(true);
      showSuccess(
        currentLang === 'en'
          ? 'Documents deleted. You can now update the group onboarding.'
          : 'Đã xóa tài liệu. Bạn có thể cập nhật onboarding nhóm ngay bây giờ.'
      );
    } catch (error) {
      console.error('Failed to reset group workspace for profile update:', error);
      showError(
        error?.message || (currentLang === 'en'
          ? 'Unable to delete workspace data. Please try again.'
          : 'Không thể xóa dữ liệu workspace. Vui lòng thử lại.')
      );
    } finally {
      setIsResettingWorkspaceForProfileUpdate(false);
    }
  }, [
    workspaceId,
    isResettingWorkspaceForProfileUpdate,
    groupProfile,
    sources,
    fetchWorkspaceDetail,
    loadGroupProfile,
    showSuccess,
    showError,
    currentLang,
  ]);

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
      showInfo(currentLang === 'en' ? 'Member cannot create flashcards.' : 'Member không có quyền tạo thẻ ghi nhớ.');
      return;
    }
    setActiveView('flashcard');
  }, [canCreateContent, currentLang, showInfo]);
  const handleViewFlashcard = useCallback((fc) => { setSelectedFlashcard(fc); setActiveView('flashcardDetail'); }, []);
  const handleDeleteFlashcard = useCallback(async (fc) => {
    if (!window.confirm(t('workspace.confirmDeleteFlashcard'))) return;
    try {
      const { deleteFlashcardSet } = await import('@/api/FlashcardAPI');
      await deleteFlashcardSet(fc.flashcardSetId);
      setActiveView('flashcard');
    } catch (err) {
      console.error('Xóa flashcard thất bại:', err);
    }
  }, [t]);

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
    flashcard: { vi: 'Thẻ ghi nhớ', en: 'Flashcard', icon: BookOpen },
    quiz: { vi: 'Quiz', en: 'Quiz', icon: PenLine },
    roadmap: { vi: 'Roadmap', en: 'Roadmap', icon: MapIcon },
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
    { key: 'documents', icon: FolderOpen, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-500/20', label: sectionTitles?.documents?.[currentLang] || 'Documents' },
    { key: 'roadmap', icon: MapIcon, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-500/20', label: sectionTitles?.roadmap?.[currentLang] || 'Roadmap' },
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
                  <MapIcon className="h-4 w-4" />
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
        onUploadClick={() => handleStudioAction('documents')}
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
          {isCheckingMandatoryProfile ? renderInlineSpinner('h-10 w-10') : <ShieldCheck className="h-10 w-10" />}
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
          <div className="space-y-5">
            <GroupDashboardTab
              isDarkMode={isDarkMode}
              group={resolvedGroupData}
              members={members}
              membersLoading={membersLoading}
              isLeader={isLeader}
              compactMode
            />
          </div>
        );

      case 'personalDashboard':
        return renderPersonalDashboard();

      case 'documents':
        return (
          <GroupDocumentsTab
            isDarkMode={isDarkMode}
            currentLang={currentLang}
            isLeader={isLeader}
            canUploadSource={canUploadSource}
            sources={sources}
            pendingItems={pendingReviewDisplayItems}
            pendingLoading={isLeader ? pendingReviewLoading : false}
            reviewingMaterialId={reviewingPendingMaterialId}
            onOpenUpload={() => setUploadDialogOpen(true)}
            onRefresh={() => refreshGroupMaterialViews({ silent: false })}
            onApprove={(item) => handleReviewPendingMaterial(item, true)}
            onReject={(item) => handleReviewPendingMaterial(item, false)}
            onDeleteSource={handleRemoveSource}
          />
        );

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
            onOpenProfileConfig={handleRequestGroupProfileUpdate}
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
          {renderInlineSpinner('h-10 w-10 text-cyan-500')}
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

      {/* Main Workspace Area */}
      <div className="flex flex-1 min-h-0 w-full px-0 py-2 gap-2">
        {/* Center Content Area */}
        <main className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto w-full hide-scrollbar">
            {!shouldForceProfileSetup ? (
            <div className="xl:hidden sticky top-0 z-20 p-2 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex items-center gap-2">
              <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => handleStudioAction('documents')}>
                {currentLang === 'en' ? 'Documents' : 'Tài liệu'}
              </Button>
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
        onSuggestedImported={() => refreshGroupMaterialViews({ silent: true })}
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

      <WorkspaceOnboardingUpdateGuardDialog
        open={profileUpdateGuardOpen}
        onOpenChange={setProfileUpdateGuardOpen}
        isDarkMode={isDarkMode}
        currentLang={currentLang?.startsWith('en') ? 'en' : 'vi'}
        materialCount={materialCountForGroupProfile}
        hasLearningData={groupHasLearningData}
        onDeleteAndContinue={handleDeleteMaterialsForGroupProfileUpdate}
        deleting={isResettingWorkspaceForProfileUpdate}
      />

    </div>
  );
}

export default GroupWorkspacePage;
