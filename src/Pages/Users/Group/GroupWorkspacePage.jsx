import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/Components/ui/button';
import ListSpinner from '@/Components/ui/ListSpinner';
import GroupWalletTab from './Group_leader/GroupWalletTab';
import WorkspaceOnboardingUpdateGuardDialog from '@/Components/workspace/WorkspaceOnboardingUpdateGuardDialog';
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  FolderOpen,
  Globe,
  Map as MapIcon,
  Moon,
  PenLine,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { formatGroupLogDescription } from '@/lib/groupWorkspaceLogDisplay';
import WorkspaceHeader from '@/Pages/Users/Individual/Workspace/Components/WorkspaceHeader';
import StudioPanel from '@/Pages/Users/Individual/Workspace/Components/StudioPanel';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePlanEntitlements } from '@/hooks/usePlanEntitlements';
import PlanUpgradeModal from '@/Components/plan/PlanUpgradeModal';
import GroupWorkspaceCreditGateModal from './Components/GroupWorkspaceCreditGateModal';
import { useGroup } from '@/hooks/useGroup';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useActiveTaskFallback } from '@/hooks/useActiveTaskFallback';
import {
  createRoadmap,
  setupGroupRoadmapConfig,
  updateGroupRoadmapConfig,
  getRoadmapStructureById,
  deleteRoadmapKnowledgeById,
  deleteRoadmapPhaseById,
} from '@/api/RoadmapAPI';

const loadUploadSourceDialog = () => import("./Components/UploadSourceDialog");
const loadGroupDocumentsTab = () => import("./Components/GroupDocumentsTab");
const loadInviteMemberDialog = () => import("./Group_leader/InviteMemberDialog");
const loadGroupWorkspaceProfileConfigDialog = () => import("./Components/GroupWorkspaceProfileConfigDialog");
const loadGroupDashboardTab = () => import("./Group_leader/GroupDashboardTab");
const loadGroupMembersTab = () => import("./Group_leader/GroupMembersTab");
const loadGroupSettingsTab = () => import("./Group_leader/GroupSettingsTab");
const loadGroupChatPanel = () => import("./Components/ChatPanel");
const loadChallengeTab = () => import("./Components/ChallengeTab");
const loadWorkspaceOnboardingUpdateGuardDialog = () => import("@/Components/workspace/WorkspaceOnboardingUpdateGuardDialog");
const loadPlanUpgradeModal = () => import("@/Components/plan/PlanUpgradeModal");

const LazyUploadSourceDialog = React.lazy(loadUploadSourceDialog);
const LazyGroupDocumentsTab = React.lazy(loadGroupDocumentsTab);
const LazyInviteMemberDialog = React.lazy(loadInviteMemberDialog);
const LazyGroupWorkspaceProfileConfigDialog = React.lazy(loadGroupWorkspaceProfileConfigDialog);
const LazyGroupDashboardTab = React.lazy(loadGroupDashboardTab);
const LazyGroupMembersTab = React.lazy(loadGroupMembersTab);
const LazyGroupSettingsTab = React.lazy(loadGroupSettingsTab);
const LazyGroupChatPanel = React.lazy(loadGroupChatPanel);
const LazyChallengeTab = React.lazy(loadChallengeTab);
const LazyGroupRankingTab = React.lazy(() => import("./Components/GroupRankingTab"));
React.lazy(loadWorkspaceOnboardingUpdateGuardDialog);
React.lazy(loadPlanUpgradeModal);
const LazyRoadmapConfigEditDialog = React.lazy(() => import("@/Components/workspace/RoadmapConfigEditDialog"));
const LazyRoadmapConfigSummaryDialog = React.lazy(() => import("@/Components/workspace/RoadmapConfigSummaryDialog"));
const LazyRoadmapJourPanel = React.lazy(() => import("./Components/RoadmapJourPanel"));
import { useNavigateWithLoading } from '@/hooks/useNavigateWithLoading';
import {
  deleteMaterial,
  getMaterialsByWorkspace,
  getPendingGroupMaterials as getPendingGroupMaterialsAPI,
  reviewGroupMaterial as reviewGroupMaterialAPI,
  uploadGroupPendingMaterial,
} from '@/api/MaterialAPI';
import { getGroupWorkspaceProfile, getWorkspaceCurrentPlan, normalizeGroupWorkspaceProfile } from '@/api/WorkspaceAPI';
import { getQuizzesByScope, deleteQuiz } from '@/api/QuizAPI';
import { unwrapApiData } from '@/Utils/apiResponse';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import { useToast } from '@/context/ToastContext';
import { useSequentialProgressMap } from '@/hooks/useSequentialProgressMap';
import { buildGroupWorkspacePath, buildGroupWorkspaceSectionPath } from '@/lib/routePaths';
import { normalizeRuntimeTaskSignal } from '@/lib/runtimeTaskSignal';
import { formatGroupLearningMode, formatGroupRole } from './utils/groupDisplay';
import { generateRoadmap } from '@/api/AIAPI';
import { extractRoadmapConfigValues, hasMeaningfulRoadmapConfig } from '@/Components/workspace/roadmapConfigUtils';

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

function resolveNeedReviewFlag(...candidates) {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    return Boolean(candidate);
  }
  return true;
}

function compactToastFilename(name, maxLength = 44) {
  const safeName = String(name || '').trim();
  if (!safeName || safeName.length <= maxLength) return safeName;

  const extensionIndex = safeName.lastIndexOf('.');
  const hasExtension = extensionIndex > 0 && extensionIndex >= safeName.length - 8;
  const extension = hasExtension ? safeName.slice(extensionIndex) : '';
  const availableLength = Math.max(12, maxLength - extension.length - 3);
  return `${safeName.slice(0, availableLength)}...${extension}`;
}

function normalizeUploadFailureReason(message, lang = 'vi') {
  const rawMessage = String(message || '').replace(/\s+/g, ' ').trim();
  if (!rawMessage) {
    return lang === 'en' ? 'Upload failed.' : 'Tải lên thất bại.';
  }

  const qmcMatch = rawMessage.match(/(?:can|cần|need)\s*(\d+)\s*QMC.*?(?:hien co|hiện có|available|currently)\s*(\d+)\s*QMC/i);
  const workspaceCreditIssue = /credit workspace|workspace credit|QMC/i.test(rawMessage);
  if (qmcMatch && workspaceCreditIssue) {
    const needed = qmcMatch[1];
    const available = qmcMatch[2];
    return lang === 'en'
      ? `Not enough workspace credits: need ${needed} QMC, available ${available} QMC.`
      : `Không đủ credit workspace: cần ${needed} QMC, hiện có ${available} QMC.`;
  }

  return rawMessage.replace(/\.+$/, '');
}

function parseUploadFailureEntry(rawEntry, lang = 'vi') {
  const text = String(rawEntry || '').trim();
  if (!text) {
    return {
      label: lang === 'en' ? 'Unknown file' : 'Tệp không xác định',
      detail: lang === 'en' ? 'Upload failed.' : 'Tải lên thất bại.',
    };
  }

  const separatorIndex = text.indexOf(':');
  const hasSeparator = separatorIndex > 0 && separatorIndex < text.length - 1;
  const fileName = hasSeparator ? text.slice(0, separatorIndex).trim() : '';
  const reason = hasSeparator ? text.slice(separatorIndex + 1).trim() : text;

  return {
    label: compactToastFilename(fileName || (lang === 'en' ? 'Unknown file' : 'Tệp không xác định')),
    detail: normalizeUploadFailureReason(reason, lang),
  };
}

function buildUploadFailureToastMessage(failedUploads, lang = 'vi') {
  const safeEntries = Array.isArray(failedUploads) ? failedUploads.filter(Boolean) : [];
  const visibleItems = safeEntries.slice(0, 3).map((entry) => parseUploadFailureEntry(entry, lang));
  const remainingCount = Math.max(0, safeEntries.length - visibleItems.length);

  return {
    title: lang === 'en'
      ? `${safeEntries.length} file${safeEntries.length > 1 ? 's' : ''} could not be uploaded`
      : `${safeEntries.length} tệp chưa tải lên được`,
    description: lang === 'en'
      ? 'Please review the failed files below and try again.'
      : 'Xem nhanh các tệp lỗi bên dưới rồi thử lại.',
    items: visibleItems,
    meta: remainingCount > 0
      ? (lang === 'en'
        ? `+${remainingCount} more file${remainingCount > 1 ? 's' : ''}`
        : `+${remainingCount} tệp khác`)
      : '',
  };
}

function uploadFailuresIndicateWorkspaceCreditShortage(failedUploads) {
  const safeEntries = Array.isArray(failedUploads) ? failedUploads.filter(Boolean) : [];
  return safeEntries.some((entry) => {
    const text = String(entry || '');
    return /QMC|workspace credit|credit workspace|không đủ credit|insufficient.*credit|Số dư credit không đủ|Not enough workspace credits/i.test(text);
  });
}

/** Payload từ CreateQuizForm (manual / AI) — có thể lồng ApiResponse { data }. */
function extractGroupCreatedQuizPayload(payload) {
  if (payload == null || typeof payload !== 'object') return null;
  let cur = payload;
  for (let depth = 0; depth < 4; depth += 1) {
    const quizId = Number(cur.quizId ?? cur.id);
    if (Number.isInteger(quizId) && quizId > 0) {
      return {
        ...cur,
        quizId,
        title: cur.title ?? '',
      };
    }
    if (cur.data != null && typeof cur.data === 'object') {
      cur = cur.data;
    } else {
      break;
    }
  }
  return null;
}

/** Các tab studio / section hợp lệ trong URL `?section=` — không dùng cho sub-view (createQuiz, ...). */
const GROUP_WORKSPACE_VALID_SECTIONS = [
  'dashboard',
  'personalDashboard',
  'documents',
  'members',
  'notifications',
  'flashcard',
  'quiz',
  'roadmap',
  'mockTest',
  'challenge',
  'ranking',
  'wallet',
  'settings',
];

function shouldTrackInLeaderReviewQueue(status, needReview) {
  return isProcessingMaterialStatus(status) || Boolean(needReview);
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

function buildPendingQueueMessage(status, currentLang, isLeader = false, needReview = true) {
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
    if (isLeader && !needReview) {
      return currentLang === 'en'
        ? 'AI finished processing. This material is now in the shared source list.'
        : 'AI đã xử lý xong. Tài liệu đã vào danh sách tài liệu chung.';
    }

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
    QUIZ_CREATED_IN_GROUP: lang === 'en' ? 'Quiz created' : 'Tạo quiz',
    QUIZ_PUBLISHED_IN_GROUP: lang === 'en' ? 'Quiz published' : 'Xuất bản quiz',
    QUIZ_AUDIENCE_UPDATED_IN_GROUP: lang === 'en' ? 'Quiz assignment' : 'Giao quiz',
    QUIZ_SUBMITTED_IN_GROUP: lang === 'en' ? 'Quiz submitted' : 'Nộp quiz',
  };

  return labels[action] || (lang === 'en' ? 'Group activity' : 'Hoạt động nhóm');
}

function GroupWorkspacePage() {
  const queryClient = useQueryClient();
  const { workspaceId } = useParams();
  const location = useLocation();
  const navigate = useNavigateWithLoading();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const planEntitlements = usePlanEntitlements();
  const [planUpgradeModalOpen, setPlanUpgradeModalOpen] = useState(false);
  const [planUpgradeFeatureName, setPlanUpgradeFeatureName] = useState(undefined);
  const [roadmapConfigEditOpen, setRoadmapConfigEditOpen] = useState(false);
  const [roadmapConfigViewOpen, setRoadmapConfigViewOpen] = useState(false);
  const [roadmapConfigDialogMode, setRoadmapConfigDialogMode] = useState('setup');
  const [roadmapReloadToken, setRoadmapReloadToken] = useState(0);
  const [isGeneratingRoadmapPhases, setIsGeneratingRoadmapPhases] = useState(false);
  const [roadmapPhaseGenerationProgress, setRoadmapPhaseGenerationProgress] = useState(0);
  const [roadmapPhaseGenerationTaskId, setRoadmapPhaseGenerationTaskId] = useState(null);
  const { showError, showInfo, showSuccess, showWarning } = useToast();
  const materialProgress = useSequentialProgressMap({ stepDelayMs: 22 });
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [studioCollapsed, setStudioCollapsed] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(null);

  // Section navigation via URL
  const legacySectionMap = { flashcardQuiz: 'quiz' };
  const sectionFromUrl = searchParams.get('section');
  const resolvedSection = legacySectionMap[sectionFromUrl] || sectionFromUrl;
  const activeSection = GROUP_WORKSPACE_VALID_SECTIONS.includes(resolvedSection) ? resolvedSection : 'dashboard';
  const isRoadmapJourActive = activeSection === 'roadmap';

  const setActiveSection = (section) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('section', section);
    setSearchParams(nextParams, { replace: true });
    // Reset sub-views when changing sections
    setActiveView(null);
    setSelectedQuiz(null);
    setQuizDetailFromChallengeReview(false);
    setSelectedFlashcard(null);
    setSelectedMockTest(null);
  };

  const bumpRoadmapReloadToken = useCallback(() => {
    setRoadmapReloadToken((current) => current + 1);
  }, []);

  const [quizListRefreshToken, setQuizListRefreshToken] = useState(0);
  const bumpQuizListRefreshToken = useCallback(() => {
    setQuizListRefreshToken((n) => n + 1);
  }, []);

  // Create mode
  const isCreating = workspaceId === 'new';
  const studioPlanLockedActions = [
    ...(!planEntitlements.hasWorkspaceAnalytics ? ['questionStats'] : []),
  ];
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
  /** Mở từ challenge (viewQuizId): quiz snapshot chỉ để xem/sửa, không phân phối / không làm bài từ đây */
  const [quizDetailFromChallengeReview, setQuizDetailFromChallengeReview] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [selectedFlashcard, setSelectedFlashcard] = useState(null);
  const [selectedMockTest, setSelectedMockTest] = useState(null);
  const [selectedRoadmapPhaseId, setSelectedRoadmapPhaseId] = useState(null);
  const [isRoadmapJourCollapsed, setIsRoadmapJourCollapsed] = useState(false);
  const [hasTriggeredGroupRoadmap, setHasTriggeredGroupRoadmap] = useState(false);
  const [sources, setSources] = useState([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  const [selectedRoadmapSourceIds, setSelectedRoadmapSourceIds] = useState([]);
  const [createdItems, setCreatedItems] = useState([]);
  const [groupProfile, setGroupProfile] = useState(null);
  const [groupSubscription, setGroupSubscription] = useState(null);
  const [groupBuyCreditModalOpen, setGroupBuyCreditModalOpen] = useState(false);
  const [groupRoadmapConfig, setGroupRoadmapConfig] = useState(null);
  const [groupProfileLoading, setGroupProfileLoading] = useState(false);
  const [hasLoadedGroupProfile, setHasLoadedGroupProfile] = useState(isCreating);
  const [groupLogs, setGroupLogs] = useState([]);
  const [groupLogsLoading, setGroupLogsLoading] = useState(false);
  const [welcomePayload, setWelcomePayload] = useState(null);
  const [pendingReviewMaterials, setPendingReviewMaterials] = useState([]);
  const [pendingReviewLoading, setPendingReviewLoading] = useState(false);
  const [reviewingPendingMaterialId, setReviewingPendingMaterialId] = useState(null);
  const [sessionUploadQueue, setSessionUploadQueue] = useState([]);
  const refreshPendingMaterialTimersRef = useRef({});
  const uploadNotificationsRef = useRef(new Set());

  // Members state
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';
  const currentUser = readCurrentUser();

  const renderSectionFallback = useCallback((minHeight = 320) => (
    <div
      className={`flex items-center justify-center rounded-[28px] border ${
        isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
      }`}
      style={{ minHeight }}
    >
      <ListSpinner variant="section" className="h-full" />
    </div>
  ), [isDarkMode]);

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

  const currentRoadmapId = useMemo(() => {
    const candidates = [
      currentGroupWorkspace?.roadmapId,
      currentWorkspace?.roadmapId,
      currentWorkspaceFromList?.roadmapId,
      groupProfile?.roadmapId,
      groupProfile?.data?.roadmapId,
    ];

    for (const candidate of candidates) {
      const normalized = Number(candidate);
      if (Number.isInteger(normalized) && normalized > 0) {
        return normalized;
      }
    }

    return null;
  }, [
    currentGroupWorkspace?.roadmapId,
    currentWorkspace?.roadmapId,
    currentWorkspaceFromList?.roadmapId,
    groupProfile?.roadmapId,
    groupProfile?.data?.roadmapId,
  ]);

  const groupProfileRoadmapConfig = useMemo(
    () => extractRoadmapConfigValues(groupProfile || {}),
    [groupProfile]
  );

  const effectiveGroupRoadmapConfig = useMemo(() => {
    if (hasMeaningfulRoadmapConfig(groupRoadmapConfig || {})) {
      return extractRoadmapConfigValues(groupRoadmapConfig);
    }

    if (hasMeaningfulRoadmapConfig(groupProfileRoadmapConfig)) {
      return extractRoadmapConfigValues(groupProfileRoadmapConfig);
    }

    return {};
  }, [groupProfileRoadmapConfig, groupRoadmapConfig]);

  const hasGroupRoadmapConfig = useMemo(
    () => hasMeaningfulRoadmapConfig(effectiveGroupRoadmapConfig),
    [effectiveGroupRoadmapConfig]
  );

  useEffect(() => {
    if (Number.isInteger(Number(currentRoadmapId)) && Number(currentRoadmapId) > 0) {
      setHasTriggeredGroupRoadmap(true);
    }
  }, [currentRoadmapId]);

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

  useEffect(() => {
    if (activeSection === 'dashboard' && isLeader) {
      void loadGroupDashboardTab();
      return;
    }

    if (activeSection === 'documents') {
      void loadGroupDocumentsTab();
      return;
    }

    if (activeSection === 'members' && !isMember) {
      void loadGroupMembersTab();
      return;
    }

    if (activeSection === 'challenge') {
      void loadChallengeTab();
      return;
    }

    if (activeSection === 'settings') {
      void loadGroupSettingsTab();
      return;
    }

    if (['flashcard', 'quiz', 'roadmap', 'mockTest', 'challenge', 'ranking'].includes(activeSection)) {
      void loadGroupChatPanel();
    }
  }, [activeSection, isLeader, isMember]);

  useEffect(() => {
    if (uploadDialogOpen) {
      void loadUploadSourceDialog();
    }
  }, [uploadDialogOpen]);

  useEffect(() => {
    if (inviteDialogOpen) {
      void loadInviteMemberDialog();
    }
  }, [inviteDialogOpen]);

  useEffect(() => {
    if (profileUpdateGuardOpen) {
      void loadWorkspaceOnboardingUpdateGuardDialog();
    }
  }, [profileUpdateGuardOpen]);

  useEffect(() => {
    if (planUpgradeModalOpen) {
      void loadPlanUpgradeModal();
    }
  }, [planUpgradeModalOpen]);

  const resolvedWorkspaceId = currentGroupWorkspace?.workspaceId
    ?? (isCreating ? null : workspaceId);
  const groupPlanUpgradePath = resolvedWorkspaceId
    ? `/plans?planType=GROUP&workspaceId=${resolvedWorkspaceId}`
    : '/plans';
  const groupPlanUpgradeState = useMemo(
    () => ({ from: `${location.pathname}${location.search}` }),
    [location.pathname, location.search],
  );
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
  const currentGroupPlanName = String(groupSubscription?.plan?.displayName || groupSubscription?.plan?.code || '').trim();
  /** Subtitle tránh trùng với nút header đang hiển thị tên gói */
  const groupHeaderSubtitle = currentGroupPlanName
    ? ''
    : (currentLang === 'en' ? 'Group workspace' : 'Không gian nhóm');
  const profileEditLocked = hasUploadedMaterials && hasCompletedGroupProfile;
  // Tính toán xem workspace có dữ liệu học tập chưa hoàn thành không (quiz/roadmap)
  // Sẽ được cập nhật khi fetch quiz và roadmap từ API trong quá trình xóa
  const materialCountForGroupProfile = sources.length;
  const pageShellClass = isDarkMode
    ? 'bg-[#06131a] text-white'
    : 'bg-[linear-gradient(180deg,#fffaf0_0%,#f4fbf7_46%,#eef6ff_100%)] text-slate-900';
  const resolveUiErrorMessage = useCallback((error) => getErrorMessage(t, error), [t]);

  const handleGroupBuyCreditPrimary = useCallback(() => {
    setGroupBuyCreditModalOpen(false);
    const next = new URLSearchParams(searchParams);
    next.set('section', 'wallet');
    navigate(`${location.pathname}?${next.toString()}`);
  }, [location.pathname, navigate, searchParams]);

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

  const challengeDraftQuizIdParam = searchParams.get('challengeDraftQuizId');
  const challengeDraftUiActive = searchParams.get('challengeDraft') === '1';
  useEffect(() => {
    if (!challengeDraftQuizIdParam || isCreating || !resolvedWorkspaceId) return;
    const qid = Number(challengeDraftQuizIdParam);
    if (!Number.isInteger(qid) || qid <= 0) return;

    // Tránh giữ sub-view cũ (vd. quizDetail không có selectedQuiz) → ChatPanel rơi vào placeholder "AI đang xử lý".
    setActiveView('createQuiz');

    let cancelled = false;
    (async () => {
      try {
        const { getQuizById } = await import('@/api/QuizAPI');
        const res = await getQuizById(qid);
        const quiz = unwrapApiData(res);
        if (cancelled || !quiz?.quizId) return;
        setSelectedQuiz(quiz);
        const next = new URLSearchParams(searchParams);
        next.delete('challengeDraftQuizId');
        setSearchParams(next, { replace: true });
      } catch (e) {
        console.error('challengeDraftQuizId', e);
        if (!cancelled) {
          showError(
            currentLang === 'en'
              ? 'Could not open challenge draft quiz. Check permissions or try again.'
              : 'Không mở được bản nháp quiz challenge. Kiểm tra quyền hoặc thử lại.'
          );
          setActiveView('quiz');
          const next = new URLSearchParams(searchParams);
          next.delete('challengeDraftQuizId');
          next.delete('challengeDraft');
          setSearchParams(next, { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    challengeDraftQuizIdParam,
    resolvedWorkspaceId,
    isCreating,
    searchParams,
    setSearchParams,
    showError,
    currentLang,
  ]);

  const viewQuizIdParam = searchParams.get('viewQuizId');
  useEffect(() => {
    if (!viewQuizIdParam || isCreating || !resolvedWorkspaceId) return;
    const qid = Number(viewQuizIdParam);
    if (!Number.isInteger(qid) || qid <= 0) return;

    setActiveView('quizDetail');

    let cancelled = false;
    (async () => {
      try {
        const { getQuizById } = await import('@/api/QuizAPI');
        const res = await getQuizById(qid);
        const quiz = unwrapApiData(res);
        if (cancelled || !quiz?.quizId) return;
        setSelectedQuiz(quiz);
        setQuizDetailFromChallengeReview(true);
        const next = new URLSearchParams(searchParams);
        next.delete('viewQuizId');
        /* Giữ challengeEventId trên URL (nếu có) để nút quay lại từ quiz snapshot về đúng challenge */
        setSearchParams(next, { replace: true });
      } catch (e) {
        console.error('viewQuizId', e);
        if (!cancelled) {
          showError(
            currentLang === 'en'
              ? 'Could not open this quiz. Check permissions or try again.'
              : 'Không mở được quiz. Kiểm tra quyền hoặc thử lại.'
          );
          setActiveView('quiz');
          const next = new URLSearchParams(searchParams);
          next.delete('viewQuizId');
          setSearchParams(next, { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewQuizIdParam, resolvedWorkspaceId, isCreating, searchParams, setSearchParams, showError, currentLang]);

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

  useEffect(() => {
    if (!resolvedWorkspaceId || isCreating) {
      setGroupSubscription(null);
      return undefined;
    }

    let cancelled = false;

    const loadGroupSubscription = async () => {
      try {
        const response = await getWorkspaceCurrentPlan(resolvedWorkspaceId);
        if (!cancelled) {
          setGroupSubscription(unwrapApiData(response));
        }
      } catch {
        if (!cancelled) {
          setGroupSubscription(null);
        }
      }
    };

    void loadGroupSubscription();

    return () => {
      cancelled = true;
    };
  }, [resolvedWorkspaceId, isCreating]);

  const loadGroupRoadmapConfig = useCallback(async () => {
    if (!currentRoadmapId) {
      setGroupRoadmapConfig(null);
      return;
    }

    try {
      const response = await getRoadmapStructureById(currentRoadmapId);
      const payload = response?.data?.data || response?.data || response || null;
      setGroupRoadmapConfig(extractRoadmapConfigValues(payload || {}));
    } catch (error) {
      const status = Number(error?.response?.status);
      if (status !== 404) {
        console.error('Failed to load group roadmap config:', error);
      }
      setGroupRoadmapConfig(null);
    }
  }, [currentRoadmapId]);

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
    void loadGroupRoadmapConfig();
  }, [loadGroupRoadmapConfig]);

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
        navigate(buildGroupWorkspacePath(newWorkspaceId), {
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

  const announceRealtimeMaterialStatus = useCallback((materialId, title, status, needReview = true) => {
    const normalizedMaterialId = Number(materialId);
    const normalizedStatus = normalizeMaterialStatus(status);
    if (!Number.isInteger(normalizedMaterialId) || normalizedMaterialId <= 0 || !normalizedStatus) return;

    const notificationKey = `${normalizedMaterialId}:${normalizedStatus}`;
    if (uploadNotificationsRef.current.has(notificationKey)) return;
    uploadNotificationsRef.current.add(notificationKey);

    const materialTitle = title || (currentLang === 'en' ? 'Material' : 'Tài liệu');

    if (normalizedStatus === 'ACTIVE') {
      if (isLeader && !needReview) {
        showSuccess(
          currentLang === 'en'
            ? `"${materialTitle}" passed AI checks and was added to the shared source list.`
            : `"${materialTitle}" đã qua bước AI và được đưa thẳng vào danh sách tài liệu chung.`,
        );
        return;
      }

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
  }, [currentLang, isLeader, showError, showInfo, showSuccess, showWarning]);

  const handleRealtimeProgress = useCallback((progressPayload) => {
    const signal = normalizeRuntimeTaskSignal(progressPayload, { source: 'websocket' });
    const normalizedStatus = String(signal.status || '').toUpperCase();
    const normalizedTaskType = String(signal.taskType || '').toUpperCase();
    const isRoadmapTaskSignal = Boolean(
      signal.hasExplicitRoadmapPhaseSignal
      || signal.hasGenericRoadmapPhaseSignal
      || normalizedStatus.startsWith('ROADMAP_')
      || normalizedTaskType.includes('ROADMAP')
      || (roadmapPhaseGenerationTaskId && String(signal.taskId || '') === String(roadmapPhaseGenerationTaskId))
    );

    if (isRoadmapTaskSignal) {
      const phasePercent = clampPercent(
        signal.percent
        ?? progressPayload?.percent
        ?? progressPayload?.progressPercent,
      );
      const signalTaskId = String(signal.taskId || '').trim();

      if (
        normalizedStatus === 'ROADMAP_STRUCTURE_STARTED'
        || normalizedStatus === 'ROADMAP_STRUCTURE_PROCESSING'
        || normalizedStatus === 'ROADMAP_PHASES_PROCESSING'
        || signal.hasExplicitRoadmapPhaseSignal
        || signal.hasGenericRoadmapPhaseSignal
      ) {
        setHasTriggeredGroupRoadmap(true);
        setIsGeneratingRoadmapPhases(true);
        if (signalTaskId) {
          setRoadmapPhaseGenerationTaskId(signalTaskId);
        }
        setRoadmapPhaseGenerationProgress((current) => (
          phasePercent > 0 ? Math.max(Number(current) || 0, phasePercent) : current
        ));
        setActiveView('roadmap');
        return;
      }

      if (
        normalizedStatus === 'ROADMAP_PHASES_COMPLETED'
        || normalizedStatus === 'ROADMAP_STRUCTURE_COMPLETED'
        || normalizedStatus === 'ROADMAP_COMPLETED'
      ) {
        setHasTriggeredGroupRoadmap(true);
        setIsGeneratingRoadmapPhases(false);
        setRoadmapPhaseGenerationTaskId(null);
        setRoadmapPhaseGenerationProgress(100);
        setActiveView('roadmap');
        bumpRoadmapReloadToken();
        void loadGroupRoadmapConfig();
        return;
      }

      if (normalizedStatus === 'ERROR') {
        setIsGeneratingRoadmapPhases(false);
        setRoadmapPhaseGenerationTaskId(null);
        setRoadmapPhaseGenerationProgress(0);
        return;
      }

      return;
    }

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
    const existingSessionUpload = sessionUploadQueue.find((item) => (
      String(item?.progressKey || item?.key || '') === progressKey
      || Number(item?.materialId) === Number(materialId)
      || String(item?.taskId || '') === taskId
    ));
    const resolvedNeedReview = resolveNeedReviewFlag(
      progressPayload?.needReview,
      progressPayload?.data?.needReview,
      signal.processingObject?.needReview,
      existingSessionUpload?.needReview,
      !isLeader,
    );
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
        needReview: resolvedNeedReview,
        message: buildPendingQueueMessage(status || item.status || 'PROCESSING', currentLang, isLeader, resolvedNeedReview),
      }),
    );

    if (materialId && isTerminalMaterialStatus(status)) {
      materialProgress.setProgress(String(materialId), 100);
      announceRealtimeMaterialStatus(materialId, progressPayload?.title ?? progressPayload?.data?.title, status, resolvedNeedReview);
      if (isLeader && !shouldTrackInLeaderReviewQueue(status, resolvedNeedReview)) {
        removeSessionUpload((item) => Number(item?.materialId) === Number(materialId) || String(item?.taskId || '') === taskId);
        materialProgress.clearProgress(String(materialId));
      }
      scheduleMaterialViewRefresh(materialId);
    }
  }, [
    bumpRoadmapReloadToken,
    announceRealtimeMaterialStatus,
    currentLang,
    isLeader,
    loadGroupRoadmapConfig,
    materialProgress,
    patchSessionUpload,
    removeSessionUpload,
    roadmapPhaseGenerationTaskId,
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
    const existingSessionUpload = sessionUploadQueue.find((item) => (
      Number(item?.materialId) === Number(materialId)
      || String(item?.taskId || '') === taskId
    ));
    const resolvedNeedReview = resolveNeedReviewFlag(
      materialPayload?.needReview,
      materialPayload?.data?.needReview,
      signal.processingObject?.needReview,
      existingSessionUpload?.needReview,
      !isLeader,
    );
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
        needReview: resolvedNeedReview,
        message: buildPendingQueueMessage(status || item.status || 'PROCESSING', currentLang, isLeader, resolvedNeedReview),
      }),
    );

    if (status === 'DELETED') {
      removeSessionUpload((item) => Number(item?.materialId) === Number(materialId));
      materialProgress.clearProgress(String(materialId));
      void refreshGroupMaterialViews({ silent: true });
      return;
    }

    if (isTerminalMaterialStatus(status)) {
      announceRealtimeMaterialStatus(materialId, materialTitle, status, resolvedNeedReview);
      if (isLeader && !shouldTrackInLeaderReviewQueue(status, resolvedNeedReview)) {
        removeSessionUpload((item) => Number(item?.materialId) === Number(materialId) || String(item?.taskId || '') === taskId);
        materialProgress.clearProgress(String(materialId));
      }
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
      if (isGeneratingRoadmapPhases) {
        setIsGeneratingRoadmapPhases(false);
        setRoadmapPhaseGenerationTaskId(null);
        setRoadmapPhaseGenerationProgress(0);
        bumpRoadmapReloadToken();
      }
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
  }, [
    bumpRoadmapReloadToken,
    handleRealtimeProgress,
    isGeneratingRoadmapPhases,
    refreshGroupMaterialViews,
  ]);

  const handleChallengeRealtime = useCallback(() => {
    if (isCreating || !workspaceId || workspaceId === 'new') return;
    void queryClient.invalidateQueries({ queryKey: ['challenges'] });
    void queryClient.invalidateQueries({ queryKey: ['challenge-detail'] });
    void queryClient.invalidateQueries({ queryKey: ['challenge-leaderboard'] });
  }, [isCreating, queryClient, workspaceId]);

  const { isConnected: wsConnected, lastMessage: wsLastMessage } = useWebSocket({
    workspaceId: !isCreating ? workspaceId : null,
    enabled: !isCreating && !!workspaceId && workspaceId !== 'new',
    onMaterialUploaded: handleRealtimeMaterialUpdate,
    onMaterialDeleted: () => {
      void refreshGroupMaterialViews({ silent: true });
    },
    onMaterialUpdated: handleRealtimeMaterialUpdate,
    onProgress: handleRealtimeProgress,
    onChallengeUpdate: handleChallengeRealtime,
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
        needReview: !isLeader,
        uploadedAt: new Date().toISOString(),
        source: 'local',
        message: buildPendingQueueMessage('UPLOADING', currentLang, isLeader, !isLeader),
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
          () => {
            const resolvedNeedReview = resolveNeedReviewFlag(response?.needReview, draft.needReview, !isLeader);
            return {
              key: `material:${materialId}`,
              progressKey: String(materialId),
              materialId,
              taskId: response?.websocketTaskId ?? response?.taskId ?? null,
              status: normalizedStatus,
              needReview: resolvedNeedReview,
              message: response?.message || buildPendingQueueMessage(normalizedStatus, currentLang, isLeader, resolvedNeedReview),
            };
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
      const entryIsCreditShortage = (entry) => uploadFailuresIndicateWorkspaceCreditShortage([entry]);
      const allFailedAreCredit = failedUploads.every(entryIsCreditShortage);
      const hasCreditShortage = uploadFailuresIndicateWorkspaceCreditShortage(failedUploads);

      if (allFailedAreCredit && hasCreditShortage) {
        if (!groupSubscription) {
          setUploadDialogOpen(false);
          showInfo(
            t(
              'groupWorkspace.upload.insufficientQmcNeedPlan',
              'Nhóm không đủ QMC. Vui lòng mua gói để tiếp tục — sau đó bạn có thể mua credit trong ví nhóm.',
            ),
            { duration: 5500 },
          );
          navigate(groupPlanUpgradePath, {
            state: { ...groupPlanUpgradeState, fromInsufficientQmc: true },
          });
          return;
        }
        showInfo(
          t(
            'groupWorkspace.upload.insufficientQmcNeedCredits',
            'Nhóm không đủ QMC. Mở ví nhóm để mua thêm credit.',
          ),
          { duration: 5000 },
        );
        setGroupBuyCreditModalOpen(true);
        return;
      } else {
        showError(buildUploadFailureToastMessage(failedUploads, currentLang), { duration: 7000 });
        if (hasCreditShortage && groupSubscription) {
          setGroupBuyCreditModalOpen(true);
        }
      }
    }

    if (successfulUploads.length === 0) {
      const handledError = new Error(currentLang === 'en' ? 'All uploads failed.' : 'Toàn bộ upload đều thất bại.');
      handledError.toastHandled = true;
      throw handledError;
    }
  }, [
    t,
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
    groupSubscription,
    navigate,
    groupPlanUpgradePath,
    groupPlanUpgradeState,
    setUploadDialogOpen,
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
      setSelectedSourceIds((prev) => (prev.includes(sourceId) ? prev : [...prev, sourceId]));
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
        message: buildPendingQueueMessage(item?.status, currentLang, true, item?.needReview !== false),
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
      if (isLeader && !shouldTrackInLeaderReviewQueue(item?.status, item?.needReview)) {
        return;
      }

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
        message: item?.message || buildPendingQueueMessage(item?.status, currentLang, isLeader, item?.needReview),
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
      MEMBER: new Set(['dashboard', 'members', 'wallet', 'settings']),
      CONTRIBUTOR: new Set(['dashboard', 'wallet', 'settings']),
      LEADER: new Set([]),
    };
    if (disabledActionsByRole[currentRoleKey]?.has(actionKey)) {
      showInfo(currentLang === 'en' ? 'This feature is not available for your role.' : 'Tính năng này chưa khả dụng cho vai trò của bạn.');
      return;
    }

    // Plan-gated actions
    if (actionKey === 'questionStats' && !planEntitlements.hasWorkspaceAnalytics) {
      setPlanUpgradeFeatureName('Thống kê workspace');
      setPlanUpgradeModalOpen(true);
      return;
    }

    // Chỉ các key trong GROUP_WORKSPACE_VALID_SECTIONS mới đổi ?section=... (tab chính).
    // Sub-view (createQuiz, quizDetail, ...) chỉ đổi activeView — nếu set section=createQuiz
    // URL không hợp lệ → activeSection fallback về dashboard và giống như bị redirect.
    if (GROUP_WORKSPACE_VALID_SECTIONS.includes(actionKey)) {
      setActiveSection(actionKey);
    }
    setActiveView(actionKey);
    setMobilePanel(null);
  }, [setActiveSection, currentRoleKey, showInfo, currentLang, shouldForceProfileSetup, planEntitlements.hasWorkspaceAnalytics]);

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
    if (profileEditLocked) {
      setProfileUpdateGuardOpen(true);
      return;
    }
    setProfileConfigOpen(true);
  }, [profileEditLocked]);

  const resetCurrentRoadmapStructure = useCallback(async () => {
    const roadmapId = currentRoadmapId;
    if (!roadmapId) return;

    try {
      const roadmapResponse = await getRoadmapStructureById(roadmapId);
      const roadmapData = roadmapResponse?.data?.data || roadmapResponse?.data || roadmapResponse || null;
      const phases = Array.isArray(roadmapData?.phases) ? roadmapData.phases : [];

      for (const phase of phases) {
        const knowledges = Array.isArray(phase?.knowledges) ? phase.knowledges : [];
        for (const knowledge of knowledges) {
          const knowledgeId = Number(knowledge?.knowledgeId);
          const phaseId = Number(phase?.phaseId);

          if (!Number.isInteger(knowledgeId) || knowledgeId <= 0 || !Number.isInteger(phaseId) || phaseId <= 0) {
            continue;
          }

          await deleteRoadmapKnowledgeById(knowledgeId, phaseId);
        }
      }

      for (const phase of phases) {
        const phaseId = Number(phase?.phaseId);
        if (!Number.isInteger(phaseId) || phaseId <= 0) continue;
        await deleteRoadmapPhaseById(phaseId, roadmapId);
      }
    } catch (roadmapError) {
      const status = Number(roadmapError?.response?.status);
      if (status !== 404) {
        console.error('Failed to reset roadmap structure for group profile update:', roadmapError);
      }
    }
  }, [currentRoadmapId]);

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
      await resetCurrentRoadmapStructure();

      // 4. Xóa tài liệu
      const materialIds = sources
        .map((source) => Number(source?.id))
        .filter((id) => Number.isInteger(id) && id > 0);
      await Promise.all(materialIds.map((materialId) => deleteMaterial(materialId)));

      setSources([]);
      setSelectedSourceIds([]);

      await fetchWorkspaceDetail(workspaceId).catch(() => {});
      await loadGroupProfile();
      bumpRoadmapReloadToken();

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
    sources,
    fetchWorkspaceDetail,
    loadGroupProfile,
    bumpRoadmapReloadToken,
    resetCurrentRoadmapStructure,
    showSuccess,
    showError,
    currentLang,
  ]);

  const handleCreateQuiz = useCallback(async (createdPayload) => {
    const createdQuiz = extractGroupCreatedQuizPayload(createdPayload);
    if (createdQuiz) {
      showSuccess(
        currentLang === 'en'
          ? 'Quiz created successfully.'
          : 'Đã tạo quiz thành công.'
      );
      bumpQuizListRefreshToken();
      setSelectedQuiz(createdQuiz);
      setActiveView('quizDetail');
      return;
    }

    if (!canCreateContent) {
      showInfo(currentLang === 'en' ? 'Member cannot create quizzes.' : 'Member không có quyền tạo quiz.');
      return;
    }
    setActiveView('quiz');
  }, [bumpQuizListRefreshToken, canCreateContent, currentLang, showInfo, showSuccess]);
  const handleViewQuiz = useCallback((quiz) => {
    setQuizDetailFromChallengeReview(false);
    setSelectedQuiz(quiz);
    setActiveView('quizDetail');
  }, []);
  const handleEditQuiz = useCallback((quiz) => { setSelectedQuiz(quiz); setActiveView('editQuiz'); }, []);
  const handleSaveQuiz = useCallback((updatedQuiz) => { setSelectedQuiz((p) => ({ ...p, ...updatedQuiz })); setActiveView('quizDetail'); }, []);

  const handleGroupQuizUpdated = useCallback((payload) => {
    const qid = Number(payload?.quizId);
    if (payload && typeof payload === 'object' && Number.isInteger(qid) && qid > 0) {
      setSelectedQuiz((prev) => (prev ? { ...prev, ...payload } : prev));
    }
    bumpQuizListRefreshToken();
  }, [bumpQuizListRefreshToken]);

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
    if (!planEntitlements.canCreateRoadmap) {
      setPlanUpgradeFeatureName('Tạo lộ trình học tập');
      setPlanUpgradeModalOpen(true);
      return;
    }
    try {
      const result = await createRoadmap({ workspaceId, ...data, mode: 'ai', name: data.name || 'Roadmap', goal: data.goal || data.description || '', description: data.goal || data.description || '' });
      const hasRoadmapConfig = Boolean(
        data?.knowledgeLoad
        || data?.adaptationMode
        || data?.roadmapSpeedMode
        || Number(data?.estimatedTotalDays) > 0
        || Number(data?.recommendedMinutesPerDay || data?.estimatedMinutesPerDay) > 0
      );
      // After roadmap creation, save config if provided
      const roadmapId = result?.data?.data?.roadmapId || result?.data?.roadmapId;
      if (roadmapId && hasRoadmapConfig) {
        try {
          await updateGroupRoadmapConfig(roadmapId, data);
        } catch (configErr) {
          console.warn('Lưu config roadmap thất bại:', configErr);
        }
      }
      await fetchWorkspaceDetail(workspaceId).catch(() => {});
      await loadGroupProfile();
      setActiveView('roadmap');
    } catch (err) {
      console.error('Tạo roadmap thất bại:', err);
      throw err;
    }
  }, [workspaceId, canCreateContent, currentLang, fetchWorkspaceDetail, loadGroupProfile, showInfo, planEntitlements.canCreateRoadmap]);

  const [roadmapConfigInitialValues, setRoadmapConfigInitialValues] = useState({});

  const openRoadmapConfigDialog = useCallback((mode = 'edit') => {
    setRoadmapConfigDialogMode(mode);
    setRoadmapConfigInitialValues(effectiveGroupRoadmapConfig);
    setRoadmapConfigEditOpen(true);
  }, [effectiveGroupRoadmapConfig]);

  const handleOpenRoadmapConfigSetup = useCallback(() => {
    openRoadmapConfigDialog('setup');
  }, [openRoadmapConfigDialog]);

  const handleOpenRoadmapConfigEdit = useCallback(() => {
    openRoadmapConfigDialog(hasGroupRoadmapConfig ? 'edit' : 'setup');
  }, [hasGroupRoadmapConfig, openRoadmapConfigDialog]);

  const handleOpenRoadmapConfigView = useCallback(() => {
    setRoadmapConfigViewOpen(true);
  }, []);

  const roadmapSelectableSources = useMemo(
    () => sources.filter((source) => isReviewableMaterialStatus(source?.status)),
    [sources],
  );

  useEffect(() => {
    const candidateIds = roadmapSelectableSources
      .map((source) => Number(source?.id))
      .filter((materialId) => Number.isInteger(materialId) && materialId > 0);

    setSelectedRoadmapSourceIds((current) => {
      const nextSelectedIds = current.filter((materialId) => candidateIds.includes(Number(materialId)));
      if (nextSelectedIds.length > 0 || candidateIds.length === 0) {
        return nextSelectedIds;
      }
      return candidateIds;
    });
  }, [roadmapSelectableSources]);

  const handleToggleRoadmapSourceSelection = useCallback((sourceId) => {
    const normalizedSourceId = Number(sourceId);
    if (!Number.isInteger(normalizedSourceId) || normalizedSourceId <= 0) return;

    setSelectedRoadmapSourceIds((current) => (
      current.includes(normalizedSourceId)
        ? current.filter((materialId) => materialId !== normalizedSourceId)
        : [...current, normalizedSourceId]
    ));
  }, []);

  const handleToggleAllRoadmapSourceSelections = useCallback((shouldSelectAll) => {
    if (!shouldSelectAll) {
      setSelectedRoadmapSourceIds([]);
      return;
    }

    setSelectedRoadmapSourceIds(
      roadmapSelectableSources
        .map((source) => Number(source?.id))
        .filter((materialId) => Number.isInteger(materialId) && materialId > 0),
    );
  }, [roadmapSelectableSources]);

  const resolveGroupRoadmapMaterialIds = useCallback(() => {
    const reviewableMaterialIds = roadmapSelectableSources
      .map((source) => Number(source?.id))
      .filter((materialId) => Number.isInteger(materialId) && materialId > 0);

    return selectedRoadmapSourceIds
      .filter((materialId) => reviewableMaterialIds.includes(Number(materialId)))
      .map((materialId) => Number(materialId))
      .filter((materialId, index, array) => Number.isInteger(materialId) && materialId > 0 && array.indexOf(materialId) === index);
  }, [roadmapSelectableSources, selectedRoadmapSourceIds]);

  const handleCreateGroupRoadmapPhases = useCallback(async () => {
    if (!canCreateContent) {
      showInfo(currentLang === 'en' ? 'Member cannot create roadmap phases.' : 'Member không có quyền tạo phase roadmap.');
      return;
    }

    if (!hasGroupRoadmapConfig) {
      handleOpenRoadmapConfigSetup();
      return;
    }

    const roadmapId = currentRoadmapId;
    if (!roadmapId) {
      showError(currentLang === 'en' ? 'No roadmap config found for this group yet.' : 'Nhóm này chưa có cấu hình roadmap hợp lệ.');
      return;
    }

    const materialIds = resolveGroupRoadmapMaterialIds();
    if (materialIds.length === 0) {
      showInfo(currentLang === 'en' ? 'Please select at least one material before generating roadmap.' : 'Vui lòng chọn ít nhất 1 tài liệu trước khi tạo lộ trình.');
      return;
    }

    try {
      setIsGeneratingRoadmapPhases(true);
      setHasTriggeredGroupRoadmap(true);
      setRoadmapPhaseGenerationProgress(0);
      setRoadmapPhaseGenerationTaskId(null);
      const roadmapGenerationResponse = await generateRoadmap({ roadmapId, materialIds });
      const roadmapGenerationPayload = roadmapGenerationResponse?.data?.data || roadmapGenerationResponse?.data || roadmapGenerationResponse || null;
      const responseTaskId = String(roadmapGenerationPayload?.websocketTaskId ?? roadmapGenerationPayload?.taskId ?? '').trim();
      if (responseTaskId) {
        setRoadmapPhaseGenerationTaskId(responseTaskId);
      }
      setRoadmapPhaseGenerationProgress(clampPercent(roadmapGenerationPayload?.percent ?? roadmapGenerationPayload?.progressPercent ?? 0));
      setActiveView('roadmap');
      bumpRoadmapReloadToken();
      showSuccess(
        currentLang === 'en'
          ? 'Roadmap generation has started.'
          : 'Đã gửi yêu cầu tạo lộ trình.'
      );
    } catch (error) {
      setIsGeneratingRoadmapPhases(false);
      setRoadmapPhaseGenerationTaskId(null);
      setRoadmapPhaseGenerationProgress(0);
      showError(error?.message || (currentLang === 'en' ? 'Failed to generate roadmap.' : 'Không thể tạo lộ trình.'));
    }
  }, [
    canCreateContent,
    currentLang,
    currentRoadmapId,
    handleOpenRoadmapConfigSetup,
    hasGroupRoadmapConfig,
    resolveGroupRoadmapMaterialIds,
    showError,
    showInfo,
    showSuccess,
    setActiveView,
    bumpRoadmapReloadToken,
  ]);

  const handleSaveRoadmapConfig = useCallback(async (values) => {
    if (!workspaceId) throw new Error('No workspace found');

    if (roadmapConfigDialogMode === 'setup') {
      await setupGroupRoadmapConfig(workspaceId, values);
    } else {
      const roadmapId = currentRoadmapId;
      if (!roadmapId) throw new Error('No roadmap found');
      await updateGroupRoadmapConfig(roadmapId, values);
      await resetCurrentRoadmapStructure();
    }

    await fetchWorkspaceDetail(workspaceId).catch(() => {});
    await loadGroupProfile();
    await loadGroupRoadmapConfig();
    bumpRoadmapReloadToken();
    setActiveView('roadmap');
  }, [
    roadmapConfigDialogMode,
    workspaceId,
    currentRoadmapId,
    resetCurrentRoadmapStructure,
    fetchWorkspaceDetail,
    loadGroupProfile,
    loadGroupRoadmapConfig,
    bumpRoadmapReloadToken,
  ]);

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
  const handleSelectRoadmapPhase = useCallback((phaseId, _options = {}) => {
    const normalizedPhaseId = Number(phaseId);
    if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;
    setSelectedRoadmapPhaseId(normalizedPhaseId);
    setActiveView('roadmap');
  }, []);

  const handleBackFromForm = useCallback(() => {
    const restore = location.state?.restoreGroupWorkspace;
    if (activeView === 'quizDetail' && quizDetailFromChallengeReview) {
      const fromState = restore?.challengeEventId != null ? Number(restore.challengeEventId) : NaN;
      const fromQuery = Number(searchParams.get('challengeEventId'));
      const eid = Number.isInteger(fromState) && fromState > 0 ? fromState : fromQuery;
      if (Number.isInteger(eid) && eid > 0) {
        setQuizDetailFromChallengeReview(false);
        setSelectedQuiz(null);
        setActiveView(null);
        navigate(
          buildGroupWorkspaceSectionPath(resolvedWorkspaceId || workspaceId, 'challenge', { challengeEventId: eid }),
          { replace: true, state: {} },
        );
        return;
      }
    }

    const formToList = { createRoadmap: 'roadmap', createQuiz: 'quiz', createFlashcard: 'flashcard', quizDetail: 'quiz', editQuiz: 'quizDetail', flashcardDetail: 'flashcard', createMockTest: 'mockTest', mockTestDetail: 'mockTest', editMockTest: 'mockTestDetail' };
    const nextView = formToList[activeView] || null;
    if ((activeView === 'editQuiz' || activeView === 'createQuiz') && searchParams.get('challengeDraft') === '1') {
      const next = new URLSearchParams(searchParams);
      next.delete('challengeDraft');
      setSearchParams(next, { replace: true });
    }
    if (nextView !== 'quizDetail' && nextView !== 'editQuiz') {
      setSelectedQuiz(null);
      setQuizDetailFromChallengeReview(false);
    }
    if (nextView !== 'flashcardDetail') setSelectedFlashcard(null);
    if (nextView !== 'mockTestDetail' && nextView !== 'editMockTest') setSelectedMockTest(null);
    setActiveView(nextView);
  }, [
    activeView,
    quizDetailFromChallengeReview,
    location.state,
    navigate,
    resolvedWorkspaceId,
    workspaceId,
    searchParams,
    setSearchParams,
  ]);

  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  const sectionLabels = {
    dashboard: t('groupWorkspace.studio.systemDashboard'),
    personalDashboard: t('groupWorkspace.studio.personalDashboard'),
    documents: t('groupWorkspace.studio.documents'),
    roadmap: t('workspace.studio.actions.roadmap'),
    quiz: t('workspace.studio.actions.quiz'),
    flashcard: t('workspace.studio.actions.flashcard'),
    mockTest: t('workspace.studio.actions.mockTest'),
    challenge: 'Challenge',
    ranking: 'Xếp hạng',
    notifications: t('groupWorkspace.studio.activity'),
    members: isLeader ? t('groupWorkspace.studio.memberManagement') : t('groupWorkspace.studio.memberStatus'),
    wallet: t('groupWorkspace.studio.wallet', 'Group wallet'),
    settings: t('workspaceSettings'),
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
    ...(isLeader
      ? [{ key: 'dashboard', icon: Globe, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-500/20', label: sectionLabels.dashboard, disabled: false }]
      : [{ key: 'personalDashboard', icon: Globe, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-500/20', label: sectionLabels.personalDashboard, disabled: false }]),
    { key: 'documents', icon: FolderOpen, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-500/20', label: sectionLabels.documents },
    { key: 'roadmap', icon: MapIcon, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-500/20', label: sectionLabels.roadmap },
    { key: 'quiz', icon: PenLine, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-500/20', label: sectionLabels.quiz },
    { key: 'flashcard', icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-500/20', label: sectionLabels.flashcard },
    { key: 'mockTest', icon: ClipboardList, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-500/20', label: sectionLabels.mockTest },
    { key: 'challenge', icon: Swords, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-500/20', label: sectionLabels.challenge },
    { key: 'ranking', icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-500/20', label: sectionLabels.ranking },
    { key: 'notifications', icon: Bell, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-500/20', label: sectionLabels.notifications, disabled: false },
    { key: 'members', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-500/20', label: sectionLabels.members, disabled: isMember },
    { key: 'wallet', icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-500/20', label: sectionLabels.wallet, disabled: !isLeader || !canManageGroup },
    { key: 'settings', icon: Settings, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-500/20', label: sectionLabels.settings, disabled: !isLeader || !canManageGroup }
  ];

  const groupStudioActionGroups = [
    { label: t('groupWorkspace.studio.groupStudy', 'Học tập'), keys: ['documents', 'roadmap', 'quiz', 'flashcard', 'mockTest'] },
    { label: t('groupWorkspace.studio.groupActivity', 'Hoạt động'), keys: ['challenge', 'ranking', 'notifications'] },
    { label: t('groupWorkspace.studio.groupManage', 'Quản lý'), keys: ['members', 'wallet', 'settings'] },
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
                    {formatGroupLogDescription(log, currentUser?.userID, currentLang)}
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
                  {resolvedGroupData.rules || t('groupWorkspace.profile.noRules')}
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
                {t('groupWorkspace.members.loading')}
              </div>
            ) : members.length === 0 ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'}`}>
                {t('groupWorkspace.members.empty')}
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
      <React.Suspense fallback={<div className="flex h-full min-h-[500px] items-center justify-center"><ListSpinner variant="section" className="h-full" /></div>}>
        <LazyGroupChatPanel
        isDarkMode={isDarkMode}
        sources={sources}
        selectedSourceIds={selectedSourceIds}
        onToggleMaterialSelection={handleSelectOneSource}
        activeView={activeView || defaultView}
        readOnly={!canCreateContent}
        role={currentRoleKey}
        isGroupLeader={isLeader}
        groupWorkspaceCurrentUserId={currentUser?.userID}
        onGroupQuizUpdated={handleGroupQuizUpdated}
        createdItems={createdItems}
        onUploadClick={() => handleStudioAction('documents')}
        onChangeView={handleStudioAction}
        onCreateQuiz={handleCreateQuiz}
        onCreateFlashcard={handleCreateFlashcard}
        onCreateRoadmap={handleCreateRoadmap}
        onCreateMockTest={handleCreateMockTest}
        onBack={handleBackFromForm}
        workspaceId={workspaceId}
        roadmapReloadToken={roadmapReloadToken}
        quizListRefreshToken={quizListRefreshToken}
        isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
        roadmapPhaseGenerationProgress={roadmapPhaseGenerationProgress}
        selectedRoadmapPhaseId={selectedRoadmapPhaseId}
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
        planEntitlements={planEntitlements}
        onCreateRoadmapPhases={handleCreateGroupRoadmapPhases}
        roadmapSelectableMaterials={hasGroupRoadmapConfig ? roadmapSelectableSources : []}
        selectedRoadmapMaterialIds={hasGroupRoadmapConfig ? selectedRoadmapSourceIds : []}
        onToggleRoadmapMaterial={hasGroupRoadmapConfig ? handleToggleRoadmapSourceSelection : undefined}
        onToggleAllRoadmapMaterials={hasGroupRoadmapConfig ? handleToggleAllRoadmapSourceSelections : undefined}
        onViewRoadmapConfig={hasGroupRoadmapConfig ? handleOpenRoadmapConfigView : undefined}
        onEditRoadmapConfig={isLeader && hasGroupRoadmapConfig ? handleOpenRoadmapConfigEdit : undefined}
        roadmapEmptyStateTitle={!hasGroupRoadmapConfig
          ? t('workspace.roadmap.groupSetupPromptTitle', currentLang === 'en' ? 'Set up a roadmap for your group' : 'Bạn hãy thiết lập lộ trình cho nhóm')
          : ''}
        roadmapEmptyStateDescription={!hasGroupRoadmapConfig
          ? t(
            'workspace.roadmap.groupSetupPromptDescription',
            currentLang === 'en'
              ? 'Set the knowledge amount, pacing, total days, and daily study time first so the roadmap matches the group learning plan.'
              : 'Hãy thiết lập lượng kiến thức, nhịp học, số ngày dự kiến và số phút học mỗi ngày để roadmap bám đúng kế hoạch học của nhóm.'
          )
          : ''}
        roadmapEmptyStateActionLabel={!hasGroupRoadmapConfig
          ? t('workspace.roadmap.setupButton', currentLang === 'en' ? 'Set up roadmap' : 'Thiết lập lộ trình')
          : ''}
        challengeDraftQuizEditor={challengeDraftUiActive && activeView === 'createQuiz'}
        challengeDraftTargetQuizId={
          challengeDraftQuizIdParam && Number.isInteger(Number(challengeDraftQuizIdParam)) && Number(challengeDraftQuizIdParam) > 0
            ? Number(challengeDraftQuizIdParam)
            : null
        }
        challengeSnapshotReviewMode={quizDetailFromChallengeReview}
        />
      </React.Suspense>
    </div>
  );

  const renderRoadmapJourPanel = (isMobile = false) => (
    <React.Suspense fallback={<ListSpinner variant="section" className="h-full" />}>
      <LazyRoadmapJourPanel
        isDarkMode={isDarkMode}
        workspaceId={workspaceId}
        selectedPhaseId={selectedRoadmapPhaseId}
        onSelectPhase={handleSelectRoadmapPhase}
        reloadToken={roadmapReloadToken}
        isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
        roadmapPhaseGenerationProgress={roadmapPhaseGenerationProgress}
        isCollapsed={!isMobile && isRoadmapJourCollapsed}
        onToggleCollapse={() => {
          if (isMobile) {
            setMobilePanel(null);
            return;
          }
          setIsRoadmapJourCollapsed((current) => !current);
        }}
      />
    </React.Suspense>
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
            <React.Suspense fallback={renderSectionFallback(360)}>
              <LazyGroupDashboardTab
              key={workspaceId ?? 'group-dashboard'}
              isDarkMode={isDarkMode}
              group={resolvedGroupData}
              members={members}
              membersLoading={membersLoading}
              isLeader={isLeader}
              compactMode
              currentUserId={currentUser?.userID}
              hasWorkspaceAnalytics={planEntitlements.hasWorkspaceAnalytics}
              onRequestAnalyticsUpgrade={() => {
                setPlanUpgradeFeatureName(currentLang === 'en' ? 'Workspace analytics' : 'Thống kê workspace');
                setPlanUpgradeModalOpen(true);
              }}
              />
            </React.Suspense>
          </div>
        );

      case 'personalDashboard':
        return renderPersonalDashboard();

      case 'documents':
        return (
          <React.Suspense fallback={renderSectionFallback(420)}>
            <LazyGroupDocumentsTab
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
          </React.Suspense>
        );

      case 'members':
        if (isMember) {
          return renderPersonalDashboard();
        }
        return (
          <React.Suspense fallback={renderSectionFallback(360)}>
            <LazyGroupMembersTab
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
          </React.Suspense>
        );

      case 'wallet':
        return (
          <GroupWalletTab
            isDarkMode={isDarkMode}
            group={resolvedGroupData}
            groupSubscription={groupSubscription}
            canManage={isLeader && canManageGroup}
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
          <div className="h-full p-2 md:p-3">
            <React.Suspense fallback={renderSectionFallback(320)}>
              <LazyChallengeTab
              workspaceId={workspaceId}
              isDarkMode={isDarkMode}
              isLeader={isLeader}
              currentUserId={currentUser?.userID}
              />
            </React.Suspense>
          </div>
        );

      case 'ranking':
        return (
          <div className="h-full p-2 md:p-3 overflow-y-auto">
            <React.Suspense fallback={renderSectionFallback(320)}>
              <LazyGroupRankingTab
                workspaceId={workspaceId}
                isDarkMode={isDarkMode}
              />
            </React.Suspense>
          </div>
        );

      case 'settings':
        return (
          <React.Suspense fallback={renderSectionFallback(360)}>
            <LazyGroupSettingsTab
            isDarkMode={isDarkMode}
            group={resolvedGroupData}
            isLeader={isLeader}
            onGroupUpdated={handleGroupUpdated}
            compactMode
            onOpenProfileConfig={handleRequestGroupProfileUpdate}
            profileEditLocked={profileEditLocked}
            />
          </React.Suspense>
        );

      default:
        return null;
    }
  };

  // ——— TOP BAR ———
  const dismissProfileConfig = useCallback(() => {
    setProfileConfigOpen(false);
    if (location.state?.openProfileConfig) {
      navigate(`${location.pathname}${location.search}`, { replace: true });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  const handleProfileConfigChange = useCallback((open) => {
    if (!open && shouldForceProfileSetup) {
      return;
    }
    if (!open) {
      dismissProfileConfig();
      return;
    }
    setProfileConfigOpen(true);
  }, [dismissProfileConfig, shouldForceProfileSetup]);

  const openGroupPlanUpgrade = () => {
    navigate(groupPlanUpgradePath, { state: groupPlanUpgradeState });
  };

  const headerActionClass = `rounded-full h-9 px-4 flex items-center gap-2 ${
    isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-900' : 'border-gray-200'
  }`;
  const headerPlanActionClass = `rounded-full h-9 px-4 flex items-center gap-2 transition-colors ${
    isDarkMode
      ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
      : 'bg-cyan-600 text-white hover:bg-cyan-700'
  }`;

  const settingsMenu = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        type="button"
        onClick={toggleLanguage}
        className={`${headerActionClass} min-w-[4.25rem] justify-center`}
        title={t('common.language')}
      >
        <Globe className="h-4 w-4 shrink-0" />
        <span className="hidden min-w-[1.75rem] uppercase sm:inline">
          {currentLang === 'vi' ? 'VI' : 'EN'}
        </span>
      </Button>

      <Button
        variant="outline"
        type="button"
        onClick={toggleDarkMode}
        className={`${headerActionClass} min-w-[6rem] justify-center`}
        title={t('common.theme')}
      >
        {isDarkMode ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
        <span className="hidden min-w-[3.25rem] md:inline">
          {isDarkMode ? t('common.dark') : t('common.light')}
        </span>
      </Button>

      {isLeader && canManageGroup ? (
        <Button
          type="button"
          onClick={openGroupPlanUpgrade}
          className={headerPlanActionClass}
          title={
            currentGroupPlanName
              ? (currentLang === 'en' ? 'View or change group plan' : 'Xem / đổi gói nhóm')
              : (currentLang === 'en' ? 'Choose a group plan' : 'Chọn gói nhóm')
          }
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className={`${fontClass} max-w-[10rem] truncate sm:max-w-[14rem] md:max-w-[18rem]`}>
            {currentGroupPlanName
              || (currentLang === 'en' ? 'Upgrade group plan' : 'Nâng cấp gói group')}
          </span>
        </Button>
      ) : null}
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
            <p className="text-lg font-semibold">{t('groupWorkspace.bootstrap.title')}</p>
            <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('groupWorkspace.bootstrap.description')}
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
          workspaceId={resolvedWorkspaceId || (workspaceId && workspaceId !== 'new' ? Number(workspaceId) : null)}
          workspaceTitle={currentGroupName}
          workspaceName={currentGroupName}
          workspaceSubtitle={groupHeaderSubtitle}
          settingsMenu={settingsMenu}
          wsConnected={wsConnected}
          isDarkMode={isDarkMode}
          showWalletSummary={false}
      />

      {/* Main Workspace Area */}
      <div className="flex flex-1 min-h-0 w-full px-0 py-2 gap-2">
        {!shouldForceProfileSetup && isRoadmapJourActive && hasTriggeredGroupRoadmap ? (
          <div className={`${isRoadmapJourCollapsed ? 'w-[84px]' : 'w-[320px]'} hidden xl:flex flex-shrink-0 flex-col h-full transition-all duration-300`}>
            {renderRoadmapJourPanel(false)}
          </div>
        ) : null}

        {/* Center Content Area */}
        <main className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto w-full hide-scrollbar">
            {!shouldForceProfileSetup ? (
            <div className="xl:hidden sticky top-0 z-20 p-2 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex items-center gap-2">
              <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => handleStudioAction('documents')}>
                {currentLang === 'en' ? 'Documents' : 'Tài liệu'}
              </Button>
              <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => setMobilePanel('studio')}>
                {t('workspace.studio.title')}
              </Button>
              {isRoadmapJourActive && hasTriggeredGroupRoadmap ? (
                <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => setMobilePanel('roadmapJour')}>
                  {currentLang === 'en' ? 'Roadmap panel' : 'Panel lộ trình'}
                </Button>
              ) : null}
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
                actionGroups={groupStudioActionGroups}
                activeView={activeSection}
                onAction={handleStudioAction}
                shouldDisableQuiz={isCreating}
                shouldDisableFlashcard={isCreating}
                shouldDisableRoadmap={isCreating}
            isCollapsed={studioCollapsed}
            onToggleCollapse={() => setStudioCollapsed((prev) => !prev)}
                isDarkMode={isDarkMode}
                hideAccessHistory={true}
                planLockedActions={studioPlanLockedActions}
            />
        </div>
        )}
      </div>

      {mobilePanel === 'studio' && !shouldForceProfileSetup && (
        <div className="xl:hidden fixed inset-0 z-[150] bg-black/45 backdrop-blur-sm" onClick={() => setMobilePanel(null)}>
          <div className="absolute right-0 top-0 h-full w-[88%] max-w-[340px] p-2" onClick={(event) => event.stopPropagation()}>
            <StudioPanel
              customActions={groupStudioActions}
              actionGroups={groupStudioActionGroups}
              activeView={activeSection}
              onAction={handleStudioAction}
              shouldDisableQuiz={isCreating}
              shouldDisableFlashcard={isCreating}
              shouldDisableRoadmap={isCreating}
              isCollapsed={false}
              onToggleCollapse={() => setMobilePanel(null)}
              isDarkMode={isDarkMode}
              hideAccessHistory={true}
              planLockedActions={studioPlanLockedActions}
            />
          </div>
        </div>
      )}

      {mobilePanel === 'roadmapJour' && !shouldForceProfileSetup && isRoadmapJourActive && hasTriggeredGroupRoadmap && (
        <div className="xl:hidden fixed inset-0 z-[150] bg-black/45 backdrop-blur-sm" onClick={() => setMobilePanel(null)}>
          <div className="absolute left-0 top-0 h-full w-[88%] max-w-[340px] p-2" onClick={(event) => event.stopPropagation()}>
            {renderRoadmapJourPanel(true)}
          </div>
        </div>
      )}

      {/* Dialogs */}
      {uploadDialogOpen ? (
        <React.Suspense fallback={null}>
          <LazyUploadSourceDialog
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            isDarkMode={isDarkMode}
            onUploadFiles={handleUploadFiles}
            workspaceId={resolvedWorkspaceId || (workspaceId && workspaceId !== 'new' ? workspaceId : null)}
            onSuggestedImported={() => refreshGroupMaterialViews({ silent: true })}
            planEntitlements={planEntitlements}
          />
        </React.Suspense>
      ) : null}

      {inviteDialogOpen ? (
        <React.Suspense fallback={null}>
          <LazyInviteMemberDialog
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
            onInvite={handleInvite}
            isDarkMode={isDarkMode}
          />
        </React.Suspense>
      ) : null}

      {(profileConfigOpen || shouldForceProfileSetup) ? (
        <React.Suspense fallback={null}>
          <LazyGroupWorkspaceProfileConfigDialog
            open={profileConfigOpen}
            onOpenChange={handleProfileConfigChange}
            isDarkMode={isDarkMode}
            workspaceId={createdGroupWorkspaceId || (!isCreating ? workspaceId : null)}
            canClose={!shouldForceProfileSetup}
            onTemporaryClose={shouldForceProfileSetup ? dismissProfileConfig : undefined}
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
        </React.Suspense>
      ) : null}

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

      <GroupWorkspaceCreditGateModal
        open={groupBuyCreditModalOpen}
        onOpenChange={setGroupBuyCreditModalOpen}
        isDarkMode={isDarkMode}
        lang={currentLang}
        onPrimary={handleGroupBuyCreditPrimary}
      />

      <PlanUpgradeModal
        open={planUpgradeModalOpen}
        onOpenChange={setPlanUpgradeModalOpen}
        featureName={planUpgradeFeatureName}
        isDarkMode={isDarkMode}
        upgradePath={groupPlanUpgradePath}
        upgradeState={groupPlanUpgradeState}
      />

      <React.Suspense fallback={null}>
        <LazyRoadmapConfigEditDialog
          open={roadmapConfigEditOpen}
          onOpenChange={setRoadmapConfigEditOpen}
          isDarkMode={isDarkMode}
          initialValues={roadmapConfigInitialValues}
          mode={roadmapConfigDialogMode}
          hasExistingRoadmap={Boolean(hasGroupRoadmapConfig && currentRoadmapId)}
          onSave={handleSaveRoadmapConfig}
        />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <LazyRoadmapConfigSummaryDialog
          open={roadmapConfigViewOpen}
          onOpenChange={setRoadmapConfigViewOpen}
          isDarkMode={isDarkMode}
          values={effectiveGroupRoadmapConfig}
        />
      </React.Suspense>

    </div>
  );
}

export default GroupWorkspacePage;
