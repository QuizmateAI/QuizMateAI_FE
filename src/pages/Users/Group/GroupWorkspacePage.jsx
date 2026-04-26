import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ListSpinner from '@/components/ui/ListSpinner';
import GroupWalletTab from './group-leader/GroupWalletTab';
import WorkspaceOnboardingUpdateGuardDialog from '@/components/features/workspace/WorkspaceOnboardingUpdateGuardDialog';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderOpen,
  Map as MapIcon,
  Menu,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { formatGroupLogDescription } from '@/lib/groupWorkspaceLogDisplay';
import GroupSidebar from './Components/GroupSidebar';
import { useTranslation } from 'react-i18next';
import i18nInstance from '@/i18n';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useWorkspace } from '@/hooks/useWorkspace';
import { buildPlanEntitlementFlags } from '@/hooks/usePlanEntitlements';
import PlanUpgradeModal from '@/components/plan/PlanUpgradeModal';
import GroupWorkspaceCreditGateModal from './Components/GroupWorkspaceCreditGateModal';
import { useGroup } from '@/hooks/useGroup';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useActiveTaskFallback } from '@/hooks/useActiveTaskFallback';
import { getUserDisplayLabel } from '@/utils/userProfile';
import UserDisplayName from '@/components/features/users/UserDisplayName';
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
const loadInviteMemberDialog = () => import("./group-leader/InviteMemberDialog");
const loadGroupWorkspaceProfileConfigDialog = () => import("./Components/GroupWorkspaceProfileConfigDialog");
const loadGroupDashboardTab = () => import("./group-leader/GroupDashboardTab");
const loadGroupMembersTab = () => import("./group-leader/GroupMembersTab");
const loadGroupMemberStatsTab = () => import("./group-leader/GroupMemberStatsTab");
const loadGroupSettingsTab = () => import("./group-leader/GroupSettingsTab");
const loadGroupChatPanel = () => import("./Components/ChatPanel");
const loadChallengeTab = () => import("./Components/ChallengeTab");
const loadWorkspaceOnboardingUpdateGuardDialog = () => import("@/components/features/workspace/WorkspaceOnboardingUpdateGuardDialog");
const loadPlanUpgradeModal = () => import("@/components/plan/PlanUpgradeModal");

const LazyUploadSourceDialog = React.lazy(loadUploadSourceDialog);
const LazyGroupDocumentsTab = React.lazy(loadGroupDocumentsTab);
const LazyInviteMemberDialog = React.lazy(loadInviteMemberDialog);
const LazyGroupWorkspaceProfileConfigDialog = React.lazy(loadGroupWorkspaceProfileConfigDialog);
const LazyGroupDashboardTab = React.lazy(loadGroupDashboardTab);
const LazyGroupMembersTab = React.lazy(loadGroupMembersTab);
const LazyGroupMemberStatsTab = React.lazy(loadGroupMemberStatsTab);
const LazyGroupSettingsTab = React.lazy(loadGroupSettingsTab);
const LazyGroupChatPanel = React.lazy(loadGroupChatPanel);
const LazyChallengeTab = React.lazy(loadChallengeTab);
const LazyGroupRankingTab = React.lazy(() => import("./Components/GroupRankingTab"));
React.lazy(loadWorkspaceOnboardingUpdateGuardDialog);
React.lazy(loadPlanUpgradeModal);
const LazyRoadmapPhaseGenerateDialog = React.lazy(() => import("./Components/RoadmapPhaseGenerateDialog"));
const LazyRoadmapConfigEditDialog = React.lazy(() => import("@/components/features/workspace/RoadmapConfigEditDialog"));
const LazyRoadmapConfigSummaryDialog = React.lazy(() => import("@/components/features/workspace/RoadmapConfigSummaryDialog"));
import { useNavigateWithLoading } from '@/hooks/useNavigateWithLoading';
import {
  deleteMaterial,
  getMaterialsByWorkspace,
  getPendingGroupMaterials as getPendingGroupMaterialsAPI,
  reviewGroupMaterial as reviewGroupMaterialAPI,
  uploadGroupPendingMaterial,
} from '@/api/MaterialAPI';
import {
  getGroupWorkspaceProfile,
  suggestGroupRoadmapConfig,
  getWorkspaceCurrentPlan,
  getWorkspaceLearningSnapshotMeLatest,
  normalizeGroupWorkspaceProfile,
} from '@/api/WorkspaceAPI';
import { getQuizzesByScope, deleteQuiz } from '@/api/QuizAPI';
import { unwrapApiData, unwrapApiList } from '@/utils/apiResponse';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { logSwallowed } from '@/utils/logSwallowed';
import { useToast } from '@/context/ToastContext';
import { useSequentialProgressMap } from '@/hooks/useSequentialProgressMap';
import {
  buildGroupWorkspaceDetailPath,
  buildGroupWorkspacePath,
  buildGroupWorkspaceRoadmapPath,
  buildGroupWorkspaceSectionPath,
  extractGroupWorkspaceSubPath,
  resolveGroupRoadmapPathParams,
  resolveGroupWorkspaceSectionFromSubPath,
} from '@/lib/routePaths';
import { normalizeRuntimeTaskSignal } from '@/lib/runtimeTaskSignal';
import {
  getMockTestRealtimeMessage,
  isMockTestCompletedSignal,
  isMockTestErrorSignal,
  isMockTestRealtimeSignal,
} from '@/pages/Users/MockTest/utils/mockTestRealtime';
import { formatGroupLearningMode, formatGroupRole } from './utils/groupDisplay';
import { resolveGroupUiPermissions } from './utils/groupPermissionView';
import { generateRoadmap, generateRoadmapGroupPreLearning } from '@/api/AIAPI';
import { extractRoadmapConfigValues, hasMeaningfulRoadmapConfig } from '@/components/features/workspace/roadmapConfigUtils';
import { buildGroupMemberSeatSummary, normalizePendingInvitationSummary, resolveGroupMemberSeatLimit } from './utils/memberSeatLimit';
import { resolveGroupQuizTitleMaxLength } from './utils/groupQuizTitleLimit';
import {
  formatDateTime,
  formatLearningScore,
  formatLearningPassRate,
  formatRelativeTime,
  getLogLabel,
} from './utils/groupWorkspaceFormatters';

const GROUP_WELCOME_STORAGE_PREFIX = 'group-invite-welcome';
const LEARNING_SNAPSHOT_PERIOD = 'DAILY';
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
const EMPTY_PENDING_INVITATION_SUMMARY = Object.freeze({ count: 0, invitations: [] });

function clampPercent(percent) {
  return Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
}

function normalizeMaterialStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'WARNED') return 'WARN';
  if (normalized === 'REJECTED') return 'REJECT';
  return normalized;
}

function resolveMemberUserId(member = {}) {
  return member.userId
    ?? member.userID
    ?? member.memberUserId
    ?? member.user?.userId
    ?? member.user?.userID
    ?? null;
}

function resolveWorkspaceMemberId(member = {}) {
  return member.groupMemberId
    ?? member.workspaceMemberId
    ?? member.memberId
    ?? member.id
    ?? null;
}

function hasMemberIdentity(value) {
  return Boolean(resolveMemberUserId(value) != null || resolveWorkspaceMemberId(value) != null);
}

function extractRealtimeMemberPayload(event = {}) {
  const candidates = [
    event?.member,
    event?.workspaceMember,
    event?.groupMember,
    event?.payload?.member,
    event?.payload?.workspaceMember,
    event?.data?.member,
    event?.data?.workspaceMember,
    event?.data?.groupMember,
    event?.user,
  ];

  const nested = candidates.find((candidate) => candidate && typeof candidate === 'object' && hasMemberIdentity(candidate));
  if (nested) return nested;

  const eventLooksLikeMemberPatch = (
    hasMemberIdentity(event)
    && (
      event.onlineStatus != null
      || event.presenceStatus != null
      || event.activityStatus != null
      || event.memberStatus != null
      || event.status != null
      || event.lastActiveAt != null
      || event.lastActivityAt != null
      || event.lastSeenAt != null
      || event.lastLoginAt != null
      || event.role != null
      || event.canUpload != null
    )
  );

  return eventLooksLikeMemberPatch ? event : null;
}

function mergeRealtimeMember(currentMembers, incomingMember) {
  if (!incomingMember || typeof incomingMember !== 'object') return currentMembers;

  const incomingUserId = resolveMemberUserId(incomingMember);
  const incomingMemberId = resolveWorkspaceMemberId(incomingMember);
  let matched = false;

  const nextMembers = currentMembers.map((member) => {
    const sameUser = incomingUserId != null && String(resolveMemberUserId(member)) === String(incomingUserId);
    const sameMember = incomingMemberId != null && String(resolveWorkspaceMemberId(member)) === String(incomingMemberId);
    if (!sameUser && !sameMember) return member;

    matched = true;
    return {
      ...member,
      ...incomingMember,
      userId: member.userId ?? incomingUserId,
      groupMemberId: member.groupMemberId ?? incomingMember.groupMemberId,
    };
  });

  if (matched) return nextMembers;

  const hasEnoughMemberShape = incomingMember.fullName
    || incomingMember.username
    || incomingMember.email
    || incomingMember.role;
  return hasEnoughMemberShape ? [incomingMember, ...nextMembers] : nextMembers;
}

function removeRealtimeMember(currentMembers, event = {}) {
  const removedUserId = event.removedUserId
    ?? event.userId
    ?? event.userID
    ?? event.memberUserId
    ?? event?.member?.userId
    ?? null;
  const removedMemberId = event.groupMemberId
    ?? event.workspaceMemberId
    ?? event.memberId
    ?? event?.member?.groupMemberId
    ?? null;

  if (removedUserId == null && removedMemberId == null) return currentMembers;

  return currentMembers.filter((member) => {
    const sameUser = removedUserId != null && String(resolveMemberUserId(member)) === String(removedUserId);
    const sameMember = removedMemberId != null && String(resolveWorkspaceMemberId(member)) === String(removedMemberId);
    return !sameUser && !sameMember;
  });
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
  const t = i18nInstance.t.bind(i18nInstance);
  if (!rawMessage) {
    return t('groupWorkspacePage.upload.failedDefault', 'Upload failed.', { lng: lang });
  }

  const qmcMatch = rawMessage.match(/(?:can|cần|need)\s*(\d+)\s*QMC.*?(?:hien co|hiện có|available|currently)\s*(\d+)\s*QMC/i);
  const workspaceCreditIssue = /credit workspace|workspace credit|QMC/i.test(rawMessage);
  if (qmcMatch && workspaceCreditIssue) {
    const needed = qmcMatch[1];
    const available = qmcMatch[2];
    return t('groupWorkspacePage.upload.insufficientCredit', 'Not enough workspace credits: need {{needed}} QMC, available {{available}} QMC.', { needed, available, lng: lang });
  }

  return rawMessage.replace(/\.+$/, '');
}

function parseUploadFailureEntry(rawEntry, lang = 'vi') {
  const text = String(rawEntry || '').trim();
  const t = i18nInstance.t.bind(i18nInstance);
  if (!text) {
    return {
      label: t('groupWorkspacePage.upload.unknownFile', 'Unknown file', { lng: lang }),
      detail: t('groupWorkspacePage.upload.failedDefault', 'Upload failed.', { lng: lang }),
    };
  }

  const separatorIndex = text.indexOf(':');
  const hasSeparator = separatorIndex > 0 && separatorIndex < text.length - 1;
  const fileName = hasSeparator ? text.slice(0, separatorIndex).trim() : '';
  const reason = hasSeparator ? text.slice(separatorIndex + 1).trim() : text;

  return {
    label: compactToastFilename(fileName || t('groupWorkspacePage.upload.unknownFile', 'Unknown file', { lng: lang })),
    detail: normalizeUploadFailureReason(reason, lang),
  };
}

function buildUploadFailureToastMessage(failedUploads, lang = 'vi') {
  const safeEntries = Array.isArray(failedUploads) ? failedUploads.filter(Boolean) : [];
  const visibleItems = safeEntries.slice(0, 3).map((entry) => parseUploadFailureEntry(entry, lang));
  const remainingCount = Math.max(0, safeEntries.length - visibleItems.length);
  const t = i18nInstance.t.bind(i18nInstance);

  const titleKey = safeEntries.length > 1
    ? 'groupWorkspacePage.upload.filesFailedTitlePlural'
    : 'groupWorkspacePage.upload.filesFailedTitle';
  const moreKey = remainingCount > 1
    ? 'groupWorkspacePage.upload.moreFiles'
    : 'groupWorkspacePage.upload.moreFile';

  return {
    title: t(titleKey, '{{count}} file(s) could not be uploaded', { count: safeEntries.length, lng: lang }),
    description: t('groupWorkspacePage.upload.filesFailedDescription', 'Please review the failed files below and try again.', { lng: lang }),
    items: visibleItems,
    meta: remainingCount > 0
      ? t(moreKey, '+{{count}} more file(s)', { count: remainingCount, lng: lang })
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

function isRealtimeProcessingQuizPayload(payload) {
  if (payload == null || typeof payload !== 'object') return false;
  let current = payload;

  for (let depth = 0; depth < 4; depth += 1) {
    const taskId = String(current?.websocketTaskId ?? current?.taskId ?? '').trim();
    const status = String(current?.status ?? current?.final_status ?? '').toUpperCase();
    const percent = Number(
      current?.percent
      ?? current?.progressPercent
      ?? current?.processingPercent
      ?? current?.data?.percent
      ?? current?.data?.progressPercent
      ?? 0
    );

    if (taskId) return true;
    if (['PROCESSING', 'PENDING', 'QUEUED'].includes(status)) return true;
    if (Number.isFinite(percent) && percent > 0 && percent < 100) return true;

    if (current?.data != null && typeof current.data === 'object') {
      current = current.data;
      continue;
    }

    break;
  }

  return false;
}

/** Các tab studio / section hợp lệ trong URL `?section=` — không dùng cho sub-view (createQuiz, ...). */
const GROUP_WORKSPACE_VALID_SECTIONS = [
  'dashboard',
  'personalDashboard',
  'documents',
  'members',
  'memberStats',
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

const GROUP_SECTIONS_REQUIRE_MATERIALS = new Set([
  'roadmap',
  'quiz',
  'flashcard',
  'mockTest',
  'challenge',
]);

function normalizePlanNameToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

function canonicalPlanNameToken(value) {
  const normalizedValue = normalizePlanNameToken(value);
  if (normalizedValue === 'GROUPBASE') {
    return 'GROUP_BASE';
  }
  return normalizedValue;
}

function normalizePlanLookupText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferGroupPlanTokenFromDisplayName(planDisplayName) {
  const normalized = normalizePlanLookupText(planDisplayName);
  if (!normalized) return '';

  if (
    normalized.includes('group base')
    || normalized.includes('goi nhom co ban')
    || normalized === 'goi co ban'
  ) {
    return 'GROUP_BASE';
  }

  return '';
}

const GROUP_PLAN_NAME_FALLBACKS = {
  GROUP_BASE: {
    en: 'Group Base',
    get vi() {
      return i18nInstance.t('groupWorkspacePage.planNames.groupBase', 'Group Base', { lng: 'vi' });
    },
  },
};

function resolveLocalizedGroupPlanName({ planDisplayName, planCode, t, lang = 'vi' }) {
  const normalizedLang = String(lang || 'vi').toLowerCase().startsWith('en') ? 'en' : 'vi';
  const normalizedPlanCode = canonicalPlanNameToken(planCode);
  const normalizedDisplayName = canonicalPlanNameToken(planDisplayName);
  const normalizedDisplayNameCompact = normalizedDisplayName.replace(/_/g, '');
  const inferredDisplayToken = inferGroupPlanTokenFromDisplayName(planDisplayName);

  const keyCandidates = [
    inferredDisplayToken,
    normalizedPlanCode,
    normalizedDisplayName,
    canonicalPlanNameToken(normalizedDisplayNameCompact),
  ].filter(Boolean).filter((candidate, index, candidates) => candidates.indexOf(candidate) === index);

  for (const candidate of keyCandidates) {
    const localized = String(
      t(`groupWorkspace.header.planNames.${candidate}`, { defaultValue: '' })
    ).trim();

    if (localized) {
      return localized;
    }
  }

  for (const candidate of keyCandidates) {
    const fallbackLabel = GROUP_PLAN_NAME_FALLBACKS?.[candidate]?.[normalizedLang] || GROUP_PLAN_NAME_FALLBACKS?.[candidate]?.en;
    if (fallbackLabel) return fallbackLabel;
  }

  return String(planDisplayName || planCode || '').trim();
}

function buildMemberSeatLimitErrorMessage(t, seatSummary) {
  const limit = Number(seatSummary?.limit);
  if (!Number.isFinite(limit) || limit <= 0) {
    return t('groupWorkspacePage.errors.memberSeatLimitUnknown', 'Nhóm đã đạt giới hạn thành viên của gói hiện tại.');
  }

  const used = Number.isFinite(Number(seatSummary?.usedCount)) ? Number(seatSummary.usedCount) : limit;
  const pending = Number.isFinite(Number(seatSummary?.pendingCount)) ? Number(seatSummary.pendingCount) : 0;
  const overLimitBy = Number.isFinite(Number(seatSummary?.overLimitBy)) ? Number(seatSummary.overLimitBy) : 0;

  if (overLimitBy > 0) {
    return t('groupWorkspacePage.errors.memberSeatLimitExceeded', {
      used,
      limit,
      overLimitBy,
      defaultValue: `Nhóm đang vượt ${overLimitBy} slot thành viên so với giới hạn ${limit}. Hãy giảm thành viên hoặc hủy lời mời chờ trước khi mời thêm.`,
    });
  }

  return t('groupWorkspacePage.errors.memberSeatLimitReached', {
    used,
    limit,
    pending,
    defaultValue: `Nhóm đã dùng hết ${used}/${limit} slot thành viên. Hãy hủy ${pending > 0 ? 'lời mời chờ hoặc ' : ''}nâng cấp gói trước khi mời thêm.`,
  });
}

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

function normalizeWorkspaceSourceItem(item, fallbackItem = null) {
  const materialId = Number(item?.materialId ?? item?.id ?? fallbackItem?.materialId ?? fallbackItem?.id ?? 0);
  if (!Number.isInteger(materialId) || materialId <= 0) return null;

  const title = item?.title ?? item?.name ?? fallbackItem?.title ?? fallbackItem?.name ?? '';
  const materialType = item?.materialType ?? item?.type ?? fallbackItem?.materialType ?? fallbackItem?.type ?? '';
  const uploadedAt = item?.uploadedAt ?? fallbackItem?.uploadedAt ?? null;
  const status = normalizeMaterialStatus(item?.status ?? fallbackItem?.status);

  return {
    ...(fallbackItem || {}),
    ...item,
    id: materialId,
    materialId,
    title,
    name: title,
    type: materialType,
    materialType,
    uploadedAt,
    status,
  };
}

function buildPendingQueueMessage(status, currentLang, isLeader = false, needReview = true) {
  const normalized = normalizeMaterialStatus(status);
  const lng = currentLang === 'en' ? 'en' : 'vi';
  const t = i18nInstance.t.bind(i18nInstance);

  if (normalized === 'UPLOADING') {
    return t('groupWorkspacePage.queue.uploading', 'Uploading the file to the server.', { lng });
  }

  if (normalized === 'PROCESSING' || normalized === 'PENDING' || normalized === 'QUEUED') {
    return t('groupWorkspacePage.queue.processing', 'AI is checking this material against the group profile.', { lng });
  }

  if (normalized === 'ACTIVE') {
    if (isLeader && !needReview) {
      return t('groupWorkspacePage.queue.activeLeaderNoReview', 'AI finished processing. This material is now in the shared source list.', { lng });
    }

    return isLeader
      ? t('groupWorkspacePage.queue.activeLeaderReview', 'AI finished processing. You can approve it for the shared source list now.', { lng })
      : t('groupWorkspacePage.queue.activeMemberReview', 'AI finished processing. This material is waiting for leader approval.', { lng });
  }

  if (normalized === 'WARN') {
    return isLeader
      ? t('groupWorkspacePage.queue.warnLeader', 'AI found a warning. Review carefully before approving.', { lng })
      : t('groupWorkspacePage.queue.warnMember', 'AI flagged this material. It is waiting for leader review.', { lng });
  }

  if (normalized === 'ERROR') {
    return t('groupWorkspacePage.queue.error', 'The system could not finish processing this material.', { lng });
  }

  if (normalized === 'REJECT') {
    return t('groupWorkspacePage.queue.reject', 'The material was rejected for this group workspace.', { lng });
  }

  return t('groupWorkspacePage.queue.waitingUpdate', 'This material is waiting for an update.', { lng });
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

function GroupWorkspacePage() {
  const queryClient = useQueryClient();
  const { workspaceId } = useParams();
  const location = useLocation();
  const navigate = useNavigateWithLoading();
  const navigateInstant = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [planUpgradeModalOpen, setPlanUpgradeModalOpen] = useState(false);
  const [planUpgradeFeatureName, setPlanUpgradeFeatureName] = useState(undefined);
  const [roadmapConfigEditOpen, setRoadmapConfigEditOpen] = useState(false);
  const [roadmapConfigViewOpen, setRoadmapConfigViewOpen] = useState(false);
  const [roadmapConfigDialogMode, setRoadmapConfigDialogMode] = useState('setup');
  const [roadmapReloadToken, setRoadmapReloadToken] = useState(0);
  const [isGeneratingRoadmapPhases, setIsGeneratingRoadmapPhases] = useState(false);
  const [roadmapPhaseGenerationProgress, setRoadmapPhaseGenerationProgress] = useState(0);
  const [roadmapPhaseGenerationTaskId, setRoadmapPhaseGenerationTaskId] = useState(null);
  const [isGeneratingRoadmapPreLearning, setIsGeneratingRoadmapPreLearning] = useState(false);
  const [phaseGenerateDialogOpen, setPhaseGenerateDialogOpen] = useState(false);
  const [phaseGenerateDialogDefaultIds, setPhaseGenerateDialogDefaultIds] = useState([]);
  const [isSubmittingRoadmapPhaseRequest, setIsSubmittingRoadmapPhaseRequest] = useState(false);
  const { showError, showInfo, showSuccess, showWarning } = useToast();
  const materialProgress = useSequentialProgressMap({ stepDelayMs: 22 });
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  // Section navigation via URL
  const legacySectionMap = { flashcardQuiz: 'quiz' };
  const sectionFromUrl = searchParams.get('section');
  const resolvedSection = legacySectionMap[sectionFromUrl] || sectionFromUrl;
  const groupWorkspaceSubPath = extractGroupWorkspaceSubPath(location.pathname, workspaceId);
  const pathSection = resolveGroupWorkspaceSectionFromSubPath(groupWorkspaceSubPath);
  const memberDetailWorkspaceMemberId = useMemo(() => {
    const match = String(groupWorkspaceSubPath || '').match(/^members\/(\d+)(?:\/.*)?$/);
    if (!match) return null;
    const nextValue = Number(match[1]);
    return Number.isInteger(nextValue) && nextValue > 0 ? nextValue : null;
  }, [groupWorkspaceSubPath]);
  const roadmapPathParams = useMemo(
    () => resolveGroupRoadmapPathParams(groupWorkspaceSubPath),
    [groupWorkspaceSubPath],
  );
  const querySection = GROUP_WORKSPACE_VALID_SECTIONS.includes(resolvedSection)
    ? resolvedSection
    : null;
  const activeSection = memberDetailWorkspaceMemberId != null
    ? 'memberStats'
    : querySection && querySection !== 'roadmap'
      ? querySection
      : pathSection || querySection || 'dashboard';

  const setActiveSection = (section) => {
    if (activeSection === 'roadmap' && section !== 'roadmap') {
      skipNextRoadmapCanonicalizeRef.current = true;
    }

    const preservedQuery = {};
    for (const [key, value] of searchParams.entries()) {
      if (!key || key === 'section') continue;
      preservedQuery[key] = value;
    }

    navigateInstant(buildGroupWorkspaceSectionPath(workspaceId, section, preservedQuery), { replace: true });

    // Reset sub-views when changing sections
    setActiveView(null);
    setSelectedQuiz(null);
    setQuizDetailFromChallengeReview(false);
    setSelectedFlashcard(null);
    setSelectedMockTest(null);
    setSelectedRoadmapPhaseId(null);
    setSelectedRoadmapKnowledgeId(null);
    setSelectedRoadmapQuizId(null);
  };

  const bumpRoadmapReloadToken = useCallback(() => {
    setRoadmapReloadToken((current) => current + 1);
  }, []);

  const [quizListRefreshToken, setQuizListRefreshToken] = useState(0);
  const bumpQuizListRefreshToken = useCallback(() => {
    setQuizListRefreshToken((n) => n + 1);
  }, []);
  const [quizGenerationTaskByQuizId, setQuizGenerationTaskByQuizId] = useState({});
  const [quizGenerationProgressByQuizId, setQuizGenerationProgressByQuizId] = useState({});

  // Create mode
  const isCreating = workspaceId === 'new';
  const openProfileConfig = Boolean(location.state?.openProfileConfig);
  // Mở dialog ngay từ render đầu khi user đến từ HomePage với intent tạo/config profile.
  // Effect hiện tại (line ~2091) vẫn chạy nhưng không còn gây trễ 2-4s vì dialog đã bật.
  const [profileConfigOpen, setProfileConfigOpen] = useState(() => Boolean(location.state?.openProfileConfig));
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
  const [selectedRoadmapKnowledgeId, setSelectedRoadmapKnowledgeId] = useState(null);
  const [selectedRoadmapQuizId, setSelectedRoadmapQuizId] = useState(null);
  const [hasHydratedRoadmapSelection, setHasHydratedRoadmapSelection] = useState(false);
  const [runtimeRoadmapId, setRuntimeRoadmapId] = useState(null);
  const [roadmapCenterFocusToken, setRoadmapCenterFocusToken] = useState(0);
  const [hasTriggeredGroupRoadmap, setHasTriggeredGroupRoadmap] = useState(false);
  const [sources, setSources] = useState([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  const [selectedRoadmapSourceIds, setSelectedRoadmapSourceIds] = useState([]);
  const [createdItems, setCreatedItems] = useState([]);
  const [groupProfile, setGroupProfile] = useState(null);
  const [groupSubscription, setGroupSubscription] = useState(null);
  const [hasLoadedGroupSubscription, setHasLoadedGroupSubscription] = useState(isCreating);
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
  const groupRealtimeRefreshTimerRef = useRef(null);
  const recoveredMockTestTaskRef = useRef(false);
  const processingQuizRefreshIdsRef = useRef(new Set());
  const skipRoadmapStoredRestoreRef = useRef(false);
  const skipNextRoadmapCanonicalizeRef = useRef(false);

  // Members state
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';
  const currentUser = readCurrentUser();
  const planEntitlements = useMemo(
    () => buildPlanEntitlementFlags(groupSubscription?.plan?.entitlement ?? groupSubscription?.entitlement ?? null),
    [groupSubscription],
  );
  const groupQuizTitleMaxLength = useMemo(
    () => resolveGroupQuizTitleMaxLength(groupSubscription),
    [groupSubscription],
  );
  const groupCurrentPlanSummary = useMemo(() => {
    const planName = String(
      groupSubscription?.plan?.displayName
      || groupSubscription?.plan?.planName
      || groupSubscription?.plan?.code
      || ''
    ).trim();

    if (!planName) {
      return null;
    }

    const planId = groupSubscription?.plan?.planCatalogId
      ?? groupSubscription?.plan?.planId
      ?? groupSubscription?.plan?.id
      ?? '';

    return {
      planId: planId ? String(planId) : '',
      planName,
      planType: 'GROUP',
    };
  }, [groupSubscription]);
  const removeSharedSource = useCallback((materialId) => {
    const normalizedMaterialId = Number(materialId);
    if (!Number.isInteger(normalizedMaterialId) || normalizedMaterialId <= 0) return;

    setSources((current) => current.filter((item) => Number(item?.materialId ?? item?.id) !== normalizedMaterialId));
    setSelectedSourceIds((current) => current.filter((id) => Number(id) !== normalizedMaterialId));
    setSelectedRoadmapSourceIds((current) => current.filter((id) => Number(id) !== normalizedMaterialId));
  }, []);

  const upsertSharedSource = useCallback((payload) => {
    const normalizedItem = normalizeWorkspaceSourceItem(payload);
    const normalizedMaterialId = Number(normalizedItem?.materialId ?? 0);
    if (!Number.isInteger(normalizedMaterialId) || normalizedMaterialId <= 0) return;

    const shouldRemove = normalizeMaterialStatus(payload?.status) === 'DELETED' || Boolean(payload?.needReview);
    if (shouldRemove) {
      removeSharedSource(normalizedMaterialId);
      return;
    }

    setSources((current) => {
      const currentItems = Array.isArray(current) ? current : [];
      const existingIndex = currentItems.findIndex((item) => Number(item?.materialId ?? item?.id) === normalizedMaterialId);
      const fallbackItem = existingIndex >= 0 ? currentItems[existingIndex] : null;
      const nextItem = normalizeWorkspaceSourceItem(payload, fallbackItem);
      if (!nextItem) return currentItems;

      if (existingIndex >= 0) {
        const nextItems = [...currentItems];
        nextItems[existingIndex] = nextItem;
        return nextItems;
      }

      return [nextItem, ...currentItems];
    });
  }, [removeSharedSource]);

  const removePendingReviewMaterialFromState = useCallback((materialId) => {
    const normalizedMaterialId = Number(materialId);
    if (!Number.isInteger(normalizedMaterialId) || normalizedMaterialId <= 0) return;

    setPendingReviewMaterials((current) => current.filter((item) => Number(item?.materialId ?? item?.id) !== normalizedMaterialId));
  }, []);

  const upsertPendingReviewMaterial = useCallback((payload) => {
    const normalizedItem = normalizeWorkspaceSourceItem(payload);
    const normalizedMaterialId = Number(normalizedItem?.materialId ?? 0);
    if (!Number.isInteger(normalizedMaterialId) || normalizedMaterialId <= 0) return;

    const normalizedStatus = normalizeMaterialStatus(payload?.status);
    const needReview = payload?.needReview !== false;
    if (!shouldTrackInLeaderReviewQueue(normalizedStatus, needReview)) {
      removePendingReviewMaterialFromState(normalizedMaterialId);
      return;
    }

    setPendingReviewMaterials((current) => {
      const currentItems = Array.isArray(current) ? current : [];
      const existingIndex = currentItems.findIndex((item) => Number(item?.materialId ?? item?.id) === normalizedMaterialId);
      const fallbackItem = existingIndex >= 0 ? currentItems[existingIndex] : null;
      const nextItem = {
        ...(normalizeWorkspaceSourceItem(payload, fallbackItem) || {}),
        needReview,
      };

      if (existingIndex >= 0) {
        const nextItems = [...currentItems];
        nextItems[existingIndex] = nextItem;
        return nextItems;
      }

      return [nextItem, ...currentItems];
    });
  }, [removePendingReviewMaterialFromState]);
  const roadmapSelectionStorageKey = useMemo(
    () =>
      workspaceId
        ? `quizmate:group:lastRoadmapSelection:${workspaceId}`
        : null,
    [workspaceId],
  );

  const readStoredRoadmapSelection = useCallback(() => {
    if (!roadmapSelectionStorageKey || typeof window === 'undefined') return null;

    try {
      const rawValue = window.localStorage.getItem(roadmapSelectionStorageKey);
      if (!rawValue) return null;

      const parsedValue = JSON.parse(rawValue);
      const normalizedPhaseId = Number(parsedValue?.phaseId);
      const normalizedKnowledgeId = Number(parsedValue?.knowledgeId);
      const normalizedRoadmapId = Number(parsedValue?.roadmapId);

      return {
        roadmapId:
          Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0
            ? normalizedRoadmapId
            : null,
        phaseId:
          Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0
            ? normalizedPhaseId
            : null,
        knowledgeId:
          Number.isInteger(normalizedKnowledgeId) && normalizedKnowledgeId > 0
            ? normalizedKnowledgeId
            : null,
      };
    } catch {
      return null;
    }
  }, [roadmapSelectionStorageKey]);

  useEffect(() => {
    if (!roadmapSelectionStorageKey || typeof window === 'undefined') {
      setHasHydratedRoadmapSelection(true);
      return;
    }

    setHasHydratedRoadmapSelection(false);
    const storedSelection = readStoredRoadmapSelection();
    if (storedSelection?.roadmapId) {
      setRuntimeRoadmapId((current) => current || storedSelection.roadmapId);
    }
    if (Number.isInteger(storedSelection?.phaseId) && storedSelection.phaseId > 0) {
      setSelectedRoadmapPhaseId(storedSelection.phaseId);
      setSelectedRoadmapKnowledgeId(
        Number.isInteger(storedSelection?.knowledgeId) && storedSelection.knowledgeId > 0
          ? storedSelection.knowledgeId
          : null,
      );
    }

    setHasHydratedRoadmapSelection(true);
  }, [readStoredRoadmapSelection, roadmapSelectionStorageKey]);

  useEffect(() => {
    if (!hasHydratedRoadmapSelection) return;
    if (!roadmapSelectionStorageKey || typeof window === 'undefined') return;

    const normalizedRuntimeRoadmapId = Number(runtimeRoadmapId);
    const normalizedPathRoadmapId = Number(roadmapPathParams?.roadmapId);
    const normalizedRoadmapId =
      Number.isInteger(normalizedRuntimeRoadmapId) && normalizedRuntimeRoadmapId > 0
        ? normalizedRuntimeRoadmapId
        : Number.isInteger(normalizedPathRoadmapId) && normalizedPathRoadmapId > 0
        ? normalizedPathRoadmapId
        : null;
    const normalizedPhaseId = Number(selectedRoadmapPhaseId);
    const normalizedKnowledgeId = Number(selectedRoadmapKnowledgeId);
    const hasSelectedPhase = Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0;
    const hasSelectedKnowledge = Number.isInteger(normalizedKnowledgeId) && normalizedKnowledgeId > 0;

    if (!hasSelectedPhase && !hasSelectedKnowledge) {
      return;
    }

    try {
      window.localStorage.setItem(
        roadmapSelectionStorageKey,
        JSON.stringify({
          roadmapId:
            Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0
              ? normalizedRoadmapId
              : null,
          phaseId:
            hasSelectedPhase
              ? normalizedPhaseId
              : null,
          knowledgeId:
            hasSelectedKnowledge
              ? normalizedKnowledgeId
              : null,
        }),
      );
    } catch {
      // Bo qua loi storage de tranh anh huong luong dieu huong.
    }
  }, [
    hasHydratedRoadmapSelection,
    roadmapPathParams?.roadmapId,
    roadmapSelectionStorageKey,
    runtimeRoadmapId,
    selectedRoadmapKnowledgeId,
    selectedRoadmapPhaseId,
  ]);

  useEffect(() => {
    if (activeSection !== 'roadmap') return;

    const pathRoadmapId = Number(roadmapPathParams?.roadmapId);
    if (Number.isInteger(pathRoadmapId) && pathRoadmapId > 0) {
      setRuntimeRoadmapId(pathRoadmapId);
    }

    const pathPhaseId = Number(roadmapPathParams?.phaseId);
    const pathKnowledgeId = Number(roadmapPathParams?.knowledgeId);
    const pathQuizId = Number(roadmapPathParams?.quizId);

    if (Number.isInteger(pathPhaseId) && pathPhaseId > 0) {
      setSelectedRoadmapPhaseId(pathPhaseId);
      setSelectedRoadmapKnowledgeId(
        Number.isInteger(pathKnowledgeId) && pathKnowledgeId > 0
          ? pathKnowledgeId
          : null,
      );
    } else {
      const shouldKeepCenterSelection = skipRoadmapStoredRestoreRef.current;
      if (shouldKeepCenterSelection) {
        skipRoadmapStoredRestoreRef.current = false;
      }

      const storedSelection = readStoredRoadmapSelection();
      const resolvedPhaseId =
        shouldKeepCenterSelection
          ? null
          : Number.isInteger(storedSelection?.phaseId) && storedSelection.phaseId > 0
          ? storedSelection.phaseId
          : null;
      const resolvedKnowledgeId =
        shouldKeepCenterSelection
          ? null
          : Number.isInteger(storedSelection?.knowledgeId) && storedSelection.knowledgeId > 0
          ? storedSelection.knowledgeId
          : null;

      setSelectedRoadmapPhaseId(resolvedPhaseId);
      setSelectedRoadmapKnowledgeId(
        Number.isInteger(resolvedPhaseId) && resolvedPhaseId > 0
          ? resolvedKnowledgeId
          : null,
      );
    }

    setSelectedRoadmapQuizId(
      Number.isInteger(pathQuizId) && pathQuizId > 0
        ? pathQuizId
        : null,
    );
  }, [
    activeSection,
    readStoredRoadmapSelection,
    roadmapPathParams?.quizId,
    roadmapPathParams?.roadmapId,
    roadmapPathParams?.knowledgeId,
    roadmapPathParams?.phaseId,
  ]);

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
    fetchMyPermissions,
    fetchMemberPermissions,
    grantUpload,
    revokeUpload,
    updateMemberRole,
    inviteMember: inviteMemberHook,
    fetchPendingInvitations,
    cancelInvitation,
    resendInvitation,
    fetchGroupLogs,
    syncMemberPermissions,
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

  const resolvedRoadmapRouteId = useMemo(() => {
    const normalizedCurrentRoadmapId = Number(currentRoadmapId);
    if (Number.isInteger(normalizedCurrentRoadmapId) && normalizedCurrentRoadmapId > 0) {
      return normalizedCurrentRoadmapId;
    }

    const normalizedRuntimeRoadmapId = Number(runtimeRoadmapId);
    if (Number.isInteger(normalizedRuntimeRoadmapId) && normalizedRuntimeRoadmapId > 0) {
      return normalizedRuntimeRoadmapId;
    }

    const normalizedPathRoadmapId = Number(roadmapPathParams?.roadmapId);
    if (Number.isInteger(normalizedPathRoadmapId) && normalizedPathRoadmapId > 0) {
      return normalizedPathRoadmapId;
    }

    return null;
  }, [currentRoadmapId, roadmapPathParams?.roadmapId, runtimeRoadmapId]);

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

  useEffect(() => {
    if (activeSection !== 'roadmap' || !workspaceId) return;
    if (skipNextRoadmapCanonicalizeRef.current) {
      skipNextRoadmapCanonicalizeRef.current = false;
      return;
    }

    const hasSelectedPhase = Number.isInteger(Number(selectedRoadmapPhaseId)) && Number(selectedRoadmapPhaseId) > 0;
    const hasSelectedKnowledge = Number.isInteger(Number(selectedRoadmapKnowledgeId)) && Number(selectedRoadmapKnowledgeId) > 0;
    const hasSelectedQuiz = Number.isInteger(Number(selectedRoadmapQuizId)) && Number(selectedRoadmapQuizId) > 0;
    const hasResolvedRoadmapId = Number.isInteger(Number(resolvedRoadmapRouteId)) && Number(resolvedRoadmapRouteId) > 0;

    if ((hasSelectedPhase || hasSelectedKnowledge || hasSelectedQuiz) && !hasResolvedRoadmapId) {
      return;
    }

    const canonicalRoadmapPath = buildGroupWorkspaceRoadmapPath(workspaceId, {
      roadmapId: resolvedRoadmapRouteId,
      phaseId: selectedRoadmapPhaseId,
      knowledgeId: selectedRoadmapKnowledgeId,
      quizId: selectedRoadmapQuizId,
    });

    const currentPath = buildGroupWorkspacePath(workspaceId, groupWorkspaceSubPath);
    if (canonicalRoadmapPath === currentPath) return;

    navigateInstant(canonicalRoadmapPath, { replace: true });
  }, [
    activeSection,
    groupWorkspaceSubPath,
    navigateInstant,
    resolvedRoadmapRouteId,
    selectedRoadmapQuizId,
    selectedRoadmapKnowledgeId,
    selectedRoadmapPhaseId,
    workspaceId,
  ]);

  const currentGroupFromGroups = groups.find((g) => String(g.workspaceId) === String(workspaceId));

  const currentGroupName = groupProfile?.groupName
    || currentGroupWorkspace?.displayTitle
    || currentGroupWorkspace?.title
    || currentGroupWorkspace?.name
    || currentGroupFromGroups?.groupName
    || '';
  const actualRoleKey = String(currentGroupWorkspace?.memberRole || currentGroupFromGroups?.memberRole || 'MEMBER').toUpperCase();
  const currentRoleKey = actualRoleKey;
  const currentRoleLabel = formatGroupRole(currentRoleKey, currentLang);
  const isLeader = currentRoleKey === 'LEADER';
  const isContributor = currentRoleKey === 'CONTRIBUTOR';
  const isMember = currentRoleKey === 'MEMBER';
  const currentMember = React.useMemo(
    () => members.find((member) => Number(member?.userId) === Number(currentUser?.userID ?? currentUser?.id)),
    [currentUser?.id, currentUser?.userID, members],
  );
  const hasGrantedContentAccess = Boolean(
    currentMember?.canUpload
    || currentGroupWorkspace?.canUpload
    || currentGroupFromGroups?.canUpload,
  );
  const resolvedWorkspaceId = currentGroupWorkspace?.workspaceId
    ?? (isCreating ? null : workspaceId);
  const fallbackCanCreateContent = isLeader || isContributor || hasGrantedContentAccess;
  const fallbackCanUploadSource = isLeader || isContributor || hasGrantedContentAccess;
  const fallbackCanViewMemberDashboard = isLeader || isContributor;
  const {
    data: myGroupPermissions,
  } = useQuery({
    queryKey: ['group-my-permissions', resolvedWorkspaceId],
    queryFn: () => fetchMyPermissions(resolvedWorkspaceId),
    enabled: Boolean(resolvedWorkspaceId && !isCreating),
    staleTime: 15 * 1000,
  });
  const {
    canCreateQuiz,
    canCreateFlashcard,
    canCreateMockTest,
    canCreateRoadmap,
    canCreateContent,
    canPublishQuiz,
    canAssignQuizAudience,
    canUploadSource,
    canManageMembers,
    canViewMemberDashboard,
  } = resolveGroupUiPermissions({
    myGroupPermissions,
    fallbackCanCreateContent,
    fallbackCanUploadSource,
    fallbackCanManageMembers: isLeader,
    fallbackCanViewMemberDashboard,
    fallbackCanPublishQuiz: isLeader,
    fallbackCanAssignQuizAudience: isLeader,
  });
  const pendingInvitationsQueryKey = useMemo(
    () => ['group-pending-invitations', resolvedWorkspaceId],
    [resolvedWorkspaceId],
  );
  const {
    data: pendingInvitationSummary = EMPTY_PENDING_INVITATION_SUMMARY,
  } = useQuery({
    queryKey: pendingInvitationsQueryKey,
    queryFn: async () => normalizePendingInvitationSummary(await fetchPendingInvitations(resolvedWorkspaceId)),
    enabled: Boolean(canManageMembers && resolvedWorkspaceId && !isCreating),
    staleTime: 15 * 1000,
  });
  const acceptedMemberFallbackCount = useMemo(() => {
    const candidates = [
      members.length,
      currentGroupFromGroups?.memberCount,
      currentGroupWorkspace?.memberCount,
      currentWorkspaceFromList?.memberCount,
      currentWorkspace?.memberCount,
    ].map((candidate) => Number(candidate))
      .filter((candidate) => Number.isFinite(candidate) && candidate >= 0);

    return candidates.length > 0 ? Math.max(...candidates) : members.length;
  }, [
    currentGroupFromGroups?.memberCount,
    currentGroupWorkspace?.memberCount,
    currentWorkspace?.memberCount,
    currentWorkspaceFromList?.memberCount,
    members.length,
  ]);
  const memberSeatSummary = useMemo(
    () => buildGroupMemberSeatSummary({
      groupProfile,
      groupSubscription,
      members,
      fallbackAcceptedCount: acceptedMemberFallbackCount,
      pendingInvitations: pendingInvitationSummary,
    }),
    [
      acceptedMemberFallbackCount,
      groupProfile,
      groupSubscription,
      members,
      pendingInvitationSummary,
    ],
  );

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

    if (activeSection === 'memberStats' && !isMember) {
      void loadGroupMemberStatsTab();
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

  const groupPlanUpgradePath = resolvedWorkspaceId
    ? `/plans?planType=GROUP&workspaceId=${resolvedWorkspaceId}`
    : '/plans';
  const groupPlanUpgradeState = useMemo(
    () => ({ from: `${location.pathname}${location.search}` }),
    [location.pathname, location.search],
  );
  const canManageGroup = Boolean(resolvedWorkspaceId && workspaceId !== 'new');
  const personalLearningSnapshotQuery = useQuery({
    queryKey: ['workspace-learning-snapshot-me-latest', resolvedWorkspaceId, LEARNING_SNAPSHOT_PERIOD],
    queryFn: async () => {
      const response = await getWorkspaceLearningSnapshotMeLatest(resolvedWorkspaceId, {
        period: LEARNING_SNAPSHOT_PERIOD,
      });
      return unwrapApiData(response);
    },
    enabled: Boolean(
      resolvedWorkspaceId
      && !isCreating
      && !isLeader
      && planEntitlements.hasWorkspaceAnalytics
    ),
  });
  const personalLearningSnapshot = personalLearningSnapshotQuery.data;
  const groupSidebarDisabledMap = useMemo(() => ({}), []);
  const groupSidebarHiddenMap = useMemo(() => ({
    members: !canManageMembers,
    wallet: !isLeader || !canManageGroup,
    settings: !isLeader || !canManageGroup,
  }), [canManageGroup, canManageMembers, isLeader]);
  const groupSidebarBadgeMap = useMemo(() => ({
    documents: sources.length || undefined,
    notifications: pendingReviewMaterials.length || undefined,
  }), [pendingReviewMaterials.length, sources.length]);
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

  useEffect(() => {
    const hasEnoughSourceStateToEnforce = hasCheckedInitialSources || hasMaterialsFromProfile;
    if (!hasEnoughSourceStateToEnforce) return;
    if (hasUploadedMaterials) return;
    if (!GROUP_SECTIONS_REQUIRE_MATERIALS.has(activeSection)) return;

    setActiveSection('documents');
    setActiveView(null);
    showInfo(t('groupWorkspace.studio.requireUploadBeforeActions'));
  }, [
    activeSection,
    hasCheckedInitialSources,
    hasMaterialsFromProfile,
    hasUploadedMaterials,
    setActiveSection,
    showInfo,
    t,
  ]);

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
  const challengeDraftReturnEventId = (() => {
    const fromQuery = Number(searchParams.get('challengeEventId'));
    if (Number.isInteger(fromQuery) && fromQuery > 0) return fromQuery;

    const fromState = Number(location.state?.restoreGroupWorkspace?.challengeEventId);
    if (Number.isInteger(fromState) && fromState > 0) return fromState;

    return null;
  })();
  const returnToChallengeDraftContext = useCallback(() => {
    const targetWorkspaceId = resolvedWorkspaceId || workspaceId;
    if (
      !targetWorkspaceId
      || targetWorkspaceId === 'new'
      || !Number.isInteger(Number(challengeDraftReturnEventId))
      || Number(challengeDraftReturnEventId) <= 0
    ) {
      return false;
    }

    setSelectedQuiz(null);
    setSelectedRoadmapQuizId(null);
    setQuizDetailFromChallengeReview(false);
    setActiveView('quiz');
    navigate(
      buildGroupWorkspaceSectionPath(targetWorkspaceId, 'challenge', { challengeEventId: challengeDraftReturnEventId }),
      { replace: true, state: {} },
    );
    return true;
  }, [challengeDraftReturnEventId, navigate, resolvedWorkspaceId, workspaceId]);

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
            t('groupWorkspacePage.errors.cannotOpenChallengeDraft', 'Could not open challenge draft quiz. Check permissions or try again.')
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
    t,
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
            t('groupWorkspacePage.errors.cannotOpenQuiz', 'Could not open this quiz. Check permissions or try again.')
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
  }, [viewQuizIdParam, resolvedWorkspaceId, isCreating, searchParams, setSearchParams, showError, currentLang, t]);

  useEffect(() => {
    if (activeSection !== 'roadmap') return;
    const pathQuizId = Number(roadmapPathParams?.quizId);
    if (!Number.isInteger(pathQuizId) || pathQuizId <= 0) return;

    if (Number(selectedQuiz?.quizId) === pathQuizId && activeView === 'quizDetail') {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { getQuizById } = await import('@/api/QuizAPI');
        const response = await getQuizById(pathQuizId);
        const payload = unwrapApiData(response);
        const normalizedQuizId = Number(payload?.quizId ?? payload?.id);
        if (cancelled || !Number.isInteger(normalizedQuizId) || normalizedQuizId <= 0) return;

        setSelectedQuiz({ ...payload, quizId: normalizedQuizId });
        setQuizDetailFromChallengeReview(false);
        setActiveView('quizDetail');
      } catch (error) {
        if (cancelled) return;
        showError(t('groupWorkspacePage.errors.cannotOpenQuiz', 'Could not open this quiz. Check permissions or try again.'));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSection, activeView, roadmapPathParams?.quizId, selectedQuiz?.quizId, showError, t]);

  // Fetch materials
  const fetchSources = useCallback(async () => {
    if (!workspaceId || isCreating) return [];
    try {
      const data = await getMaterialsByWorkspace(workspaceId);
      const mappedSources = unwrapApiList(data)
        .map((item) => ({
          id: Number(item?.materialId ?? item?.id),
          materialId: Number(item?.materialId ?? item?.id),
          name: item?.title ?? item?.name ?? '',
          title: item?.title ?? item?.name ?? '',
          type: item?.materialType ?? item?.type ?? '',
          materialType: item?.materialType ?? item?.type ?? '',
          status: item?.status,
          uploadedAt: item?.uploadedAt,
          ...item,
        }))
        .filter((item) => Number(item?.materialId ?? item?.id) > 0)
        .filter((item) => String(item?.status || '').toUpperCase() !== 'DELETED');
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
      const materials = unwrapApiList(data)
        .map((item) => ({
          id: Number(item?.materialId ?? item?.id),
          materialId: Number(item?.materialId ?? item?.id),
          title: item?.title ?? item?.name ?? '',
          name: item?.title ?? item?.name ?? '',
          type: item?.materialType ?? item?.type ?? '',
          materialType: item?.materialType ?? item?.type ?? '',
          status: item?.status,
          uploadedAt: item?.uploadedAt,
          needReview: item?.needReview !== false,
          ...item,
        }))
        .filter((item) => Number(item?.materialId ?? item?.id) > 0)
        .filter((item) => normalizeMaterialStatus(item?.status) !== 'DELETED');
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
    const timer = setTimeout(async () => {
      await fetchSources();
      setHasCheckedInitialSources(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [workspaceId, isCreating, hasCheckedInitialSources, fetchSources]);

  // Fetch members
  const loadMembers = useCallback(async (options = {}) => {
    if (!workspaceId || isCreating) return;
    const silent = Boolean(options?.silent);
    if (!silent) {
      setMembersLoading(true);
    }
    try {
      const data = await fetchMembers(workspaceId);
      setMembers(data);
    } catch (err) {
      console.error('Error loading members:', err);
    } finally {
      if (!silent) {
        setMembersLoading(false);
      }
    }
  }, [workspaceId, isCreating, fetchMembers]);

  useEffect(() => {
    if (!isCreating && workspaceId && workspaceId !== 'new') {
      loadMembers();
    }
  }, [loadMembers, isCreating, workspaceId]);

  // Reload member list when navigating to members/memberStats tab
  // to catch any WS events that may have arrived while on a different tab
  useEffect(() => {
    if (!isCreating && workspaceId && workspaceId !== 'new' &&
        (activeSection === 'members' || activeSection === 'memberStats')) {
      void loadMembers();
    }
  }, [activeSection]);

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
      setHasLoadedGroupSubscription(true);
      return undefined;
    }

    setHasLoadedGroupSubscription(false);
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
      } finally {
        if (!cancelled) {
          setHasLoadedGroupSubscription(true);
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
    if (groupRealtimeRefreshTimerRef.current) {
      globalThis.clearTimeout(groupRealtimeRefreshTimerRef.current);
      groupRealtimeRefreshTimerRef.current = null;
    }
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
        showInfo(t('groupWorkspacePage.bootstrap.creating', 'Creating group workspace...'));
        const newGroupWorkspace = await createGroupWorkspace({ title: null });
        const newWorkspaceId = newGroupWorkspace?.workspaceId;

        if (!newWorkspaceId) {
          throw new Error(t('groupWorkspacePage.bootstrap.unableToCreate', 'Unable to create the group workspace.'));
        }

        setCreatedGroupWorkspaceId(newWorkspaceId);
        setProfileConfigOpen(true);
        navigate(buildGroupWorkspacePath(newWorkspaceId), {
          replace: true,
          state: { openProfileConfig: true },
        });
      } catch (error) {
        showError(error?.message || t('groupWorkspacePage.bootstrap.unableToCreate', 'Unable to create the group workspace.'));
        navigate('/home', { replace: true });
      } finally {
        setIsBootstrappingGroup(false);
      }
    };

    bootstrapGroupWorkspace();
  }, [createGroupWorkspace, currentLang, isCreating, navigate, showError, showInfo, t]);

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

    const materialTitle = title || t('groupWorkspacePage.queue.materialFallback', 'Material');

    if (normalizedStatus === 'ACTIVE') {
      if (isLeader && !needReview) {
        showSuccess(
          t('groupWorkspacePage.realtime.activeLeaderSuccess', '"{{title}}" passed AI checks and was added to the shared source list.', { title: materialTitle }),
        );
        return;
      }

      showInfo(
        t('groupWorkspacePage.realtime.activePending', '"{{title}}" passed AI checks and is waiting for leader approval.', { title: materialTitle }),
      );
      return;
    }

    if (normalizedStatus === 'WARN') {
      showWarning(
        t('groupWorkspacePage.realtime.warned', '"{{title}}" has a warning and needs leader review.', { title: materialTitle }),
      );
      return;
    }

    if (normalizedStatus === 'ERROR') {
      showError(
        t('groupWorkspacePage.realtime.errorProcessing', 'The system could not finish processing "{{title}}".', { title: materialTitle }),
      );
      return;
    }

    if (normalizedStatus === 'REJECT') {
      showError(
        t('groupWorkspacePage.realtime.rejected', '"{{title}}" was rejected for this group workspace.', { title: materialTitle }),
      );
    }
  }, [currentLang, isLeader, showError, showInfo, showSuccess, showWarning, t]);

  const invalidateMockTestQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['workspace-mock-tests'] });
  }, [queryClient]);

  const handleMockTestRealtime = useCallback((signal, rawPayload = null) => {
    invalidateMockTestQueries();

    if (isMockTestCompletedSignal(signal, rawPayload)) {
      showSuccess(t('createGroupMockTestForm.toast.generatedSuccess', 'Mock test generated successfully.'));
      return;
    }

    if (isMockTestErrorSignal(signal, rawPayload)) {
      showError(
        getMockTestRealtimeMessage(signal, rawPayload)
        || t('createGroupMockTestForm.errors.createMockTestFailed', 'Failed to create mock test. Please try again.'),
      );
    }
  }, [invalidateMockTestQueries, showError, showSuccess, t]);

  const handleRealtimeProgress = useCallback((progressPayload) => {
    const signal = normalizeRuntimeTaskSignal(progressPayload, { source: 'websocket' });
    const normalizedStatus = String(signal.status || '').toUpperCase();
    const normalizedTaskType = String(signal.taskType || '').toUpperCase();
    const progressQuizId = Number(signal.quizId ?? 0);
    const progressPercent = clampPercent(
      signal.percent
      ?? progressPayload?.percent
      ?? progressPayload?.progressPercent,
    );
    const signalTaskId = String(signal.taskId || '').trim();

    if (isMockTestRealtimeSignal(signal, progressPayload)) {
      handleMockTestRealtime(signal, progressPayload);
      return;
    }

    const isRoadmapTaskSignal = Boolean(
      signal.hasExplicitRoadmapPhaseSignal
      || signal.hasGenericRoadmapPhaseSignal
      || normalizedStatus.startsWith('ROADMAP_')
      || normalizedTaskType.includes('ROADMAP')
      || (roadmapPhaseGenerationTaskId && String(signal.taskId || '') === String(roadmapPhaseGenerationTaskId))
    );

    if (signal.isQuizSignal && Number.isInteger(progressQuizId) && progressQuizId > 0) {
      if (signalTaskId) {
        setQuizGenerationTaskByQuizId((current) => {
          if (current[progressQuizId] === signalTaskId) return current;
          return {
            ...current,
            [progressQuizId]: signalTaskId,
          };
        });
      }

      setQuizGenerationProgressByQuizId((current) => {
        const nextPercent = progressPercent > 0
          ? progressPercent
          : (normalizedStatus.includes('COMPLETED') ? 100 : Number(current?.[progressQuizId] ?? 0));

        if (Number(current?.[progressQuizId] ?? 0) === nextPercent) {
          return current;
        }

        return {
          ...current,
          [progressQuizId]: nextPercent,
        };
      });

      const isTerminalQuizSignal = (
        normalizedStatus.includes('COMPLETED')
        || normalizedStatus === 'ERROR'
        || normalizedStatus.includes('FAILED')
        || normalizedStatus.includes('CANCEL')
      );

      if (isTerminalQuizSignal && activeSection === 'challenge') {
        void queryClient.invalidateQueries({ queryKey: ['challenges', workspaceId] });
        void queryClient.invalidateQueries({ queryKey: ['challenge-detail', workspaceId] });
      }

      if (!processingQuizRefreshIdsRef.current.has(progressQuizId) || isTerminalQuizSignal) {
        if (isTerminalQuizSignal) {
          processingQuizRefreshIdsRef.current.delete(progressQuizId);
        } else {
          processingQuizRefreshIdsRef.current.add(progressQuizId);
        }
        bumpQuizListRefreshToken();
      }

      if (!isRoadmapTaskSignal) {
        return;
      }
    }

    if (isRoadmapTaskSignal) {
      const phasePercent = clampPercent(
        signal.percent
        ?? progressPayload?.percent
        ?? progressPayload?.progressPercent,
      );

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
      upsertSharedSource({
        materialId,
        title: progressPayload?.title ?? progressPayload?.data?.title ?? existingSessionUpload?.title ?? existingSessionUpload?.name ?? '',
        status,
        uploadedAt: progressPayload?.uploadedAt ?? existingSessionUpload?.uploadedAt ?? null,
        materialType: progressPayload?.materialType ?? progressPayload?.data?.materialType ?? existingSessionUpload?.materialType ?? existingSessionUpload?.type ?? '',
        needReview: resolvedNeedReview,
      });
      if (isLeader) {
        upsertPendingReviewMaterial({
          materialId,
          title: progressPayload?.title ?? progressPayload?.data?.title ?? existingSessionUpload?.title ?? existingSessionUpload?.name ?? '',
          status,
          uploadedAt: progressPayload?.uploadedAt ?? existingSessionUpload?.uploadedAt ?? null,
          materialType: progressPayload?.materialType ?? progressPayload?.data?.materialType ?? existingSessionUpload?.materialType ?? existingSessionUpload?.type ?? '',
          needReview: resolvedNeedReview,
        });
      }
      if (isLeader && !shouldTrackInLeaderReviewQueue(status, resolvedNeedReview)) {
        removeSessionUpload((item) => Number(item?.materialId) === Number(materialId) || String(item?.taskId || '') === taskId);
        materialProgress.clearProgress(String(materialId));
      }
      if (!progressPayload?.title && !progressPayload?.data?.title) {
        scheduleMaterialViewRefresh(materialId);
      }
    }
  }, [
    bumpRoadmapReloadToken,
    bumpQuizListRefreshToken,
    activeSection,
    announceRealtimeMaterialStatus,
    currentLang,
    isLeader,
    loadGroupRoadmapConfig,
    materialProgress,
    handleMockTestRealtime,
    patchSessionUpload,
    queryClient,
    removeSessionUpload,
    roadmapPhaseGenerationTaskId,
    scheduleMaterialViewRefresh,
    sessionUploadQueue,
    upsertPendingReviewMaterial,
    upsertSharedSource,
    workspaceId,
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

    upsertSharedSource({
      ...materialPayload,
      materialId,
      title: materialTitle ?? existingSessionUpload?.title ?? existingSessionUpload?.name ?? '',
      status,
      needReview: resolvedNeedReview,
    });
    if (isLeader) {
      upsertPendingReviewMaterial({
        ...materialPayload,
        materialId,
        title: materialTitle ?? existingSessionUpload?.title ?? existingSessionUpload?.name ?? '',
        status,
        needReview: resolvedNeedReview,
      });
    }

    if (status === 'DELETED') {
      removeSessionUpload((item) => Number(item?.materialId) === Number(materialId));
      materialProgress.clearProgress(String(materialId));
      removeSharedSource(materialId);
      removePendingReviewMaterialFromState(materialId);
      return;
    }

    if (isTerminalMaterialStatus(status)) {
      announceRealtimeMaterialStatus(materialId, materialTitle, status, resolvedNeedReview);
      if (isLeader && !shouldTrackInLeaderReviewQueue(status, resolvedNeedReview)) {
        removeSessionUpload((item) => Number(item?.materialId) === Number(materialId) || String(item?.taskId || '') === taskId);
        materialProgress.clearProgress(String(materialId));
      }
      if (!materialTitle) {
        scheduleMaterialViewRefresh(materialId);
      }
      return;
    }
  }, [
    announceRealtimeMaterialStatus,
    currentLang,
    isLeader,
    materialProgress,
    patchSessionUpload,
    removePendingReviewMaterialFromState,
    removeSharedSource,
    refreshGroupMaterialViews,
    removeSessionUpload,
    scheduleMaterialViewRefresh,
    sessionUploadQueue,
    upsertPendingReviewMaterial,
    upsertSharedSource,
  ]);

  const handleRealtimeMaterialDeleted = useCallback((materialPayload) => {
    const materialId = getRealtimeMaterialId(materialPayload, null, sessionUploadQueue);
    if (!materialId) {
      void refreshGroupMaterialViews({ silent: true });
      return;
    }

    removeSessionUpload((item) => Number(item?.materialId) === Number(materialId));
    materialProgress.clearProgress(String(materialId));
    removeSharedSource(materialId);
    removePendingReviewMaterialFromState(materialId);
  }, [
    materialProgress,
    refreshGroupMaterialViews,
    removePendingReviewMaterialFromState,
    removeSessionUpload,
    removeSharedSource,
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
          ? t('groupWorkspacePage.toast.materialApproved', 'Material approved for the group.')
          : t('groupWorkspacePage.toast.materialRejected', 'Material rejected from the group.'),
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
    t,
  ]);

  // WebSocket
  const applyRecoveredGroupActiveTaskSnapshot = useCallback((snapshot) => {
    const hasActiveTask = Boolean(snapshot?.hasActiveTask);
    const tasks = Array.isArray(snapshot?.activeTasks) ? snapshot.activeTasks : [];

    if (!hasActiveTask || tasks.length === 0) {
      if (recoveredMockTestTaskRef.current) {
        recoveredMockTestTaskRef.current = false;
        handleMockTestRealtime({ status: 'MOCKTEST_REFRESH', taskType: 'MOCKTEST' });
      }

      processingQuizRefreshIdsRef.current.clear();
      setQuizGenerationTaskByQuizId({});
      setQuizGenerationProgressByQuizId({});
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
      if (!signal.taskId && !signal.materialId && !isMockTestRealtimeSignal(signal, task)) return;
      if (isMockTestRealtimeSignal(signal, task)) {
        recoveredMockTestTaskRef.current = true;
      }

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
    handleMockTestRealtime,
    handleRealtimeProgress,
    isGeneratingRoadmapPhases,
    refreshGroupMaterialViews,
  ]);

  const handleGroupRealtime = useCallback((event = null) => {
    if (isCreating || !resolvedWorkspaceId || !workspaceId || workspaceId === 'new') return;

    const eventType = String(event?.type || event?.eventType || event?.action || '').toUpperCase();
    const realtimeMember = extractRealtimeMemberPayload(event);
    const memberPatchOnlyTypes = new Set([
      'MEMBER_STATUS_UPDATED',
      'MEMBER_PRESENCE_UPDATED',
      'MEMBER_LAST_ACTIVE_UPDATED',
      'PRESENCE_UPDATED',
      'USER_PRESENCE_UPDATED',
      'USER_ACTIVITY_UPDATED',
    ]);

    // Immediate kick detection — redirect before any debounce
    if (
      eventType === 'MEMBER_REMOVED' &&
      currentUser?.userID != null &&
      String(event?.removedUserId) === String(currentUser.userID)
    ) {
      if (groupRealtimeRefreshTimerRef.current) {
        globalThis.clearTimeout(groupRealtimeRefreshTimerRef.current);
        groupRealtimeRefreshTimerRef.current = null;
      }
      showWarning(t('groupWorkspacePage.toast.removedFromGroup', 'You have been removed from this group.'));
      navigateInstant('/home', { replace: true });
      return;
    }

    if (eventType === 'MEMBER_REMOVED') {
      setMembers((current) => removeRealtimeMember(current, event));
    } else if (realtimeMember) {
      setMembers((current) => mergeRealtimeMember(current, realtimeMember));
    }

    if (Boolean(realtimeMember) && memberPatchOnlyTypes.has(eventType)) {
      return;
    }

    if (groupRealtimeRefreshTimerRef.current) {
      globalThis.clearTimeout(groupRealtimeRefreshTimerRef.current);
    }

    const delayMs = eventType === 'SOCKET_RESTORED' ? 0 : 250;
    groupRealtimeRefreshTimerRef.current = globalThis.setTimeout(() => {
      groupRealtimeRefreshTimerRef.current = null;
      const canSkipMemberReload = Boolean(realtimeMember) && memberPatchOnlyTypes.has(eventType);

      void fetchGroups();
      void fetchWorkspaceDetail(resolvedWorkspaceId).catch((error) => {
        console.error('Failed to refresh realtime group workspace detail:', error);
      });
      void loadGroupProfile();
      if (!canSkipMemberReload) {
        void loadMembers({ silent: true });
      }
      void loadGroupLogs();
      void queryClient.invalidateQueries({ queryKey: ['group-pending-invitations', resolvedWorkspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['group-activity-logs', resolvedWorkspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['workspace-members', resolvedWorkspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['group-members-review', resolvedWorkspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['group-dashboard-summary', resolvedWorkspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['group-dashboard-member-cards', resolvedWorkspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['group-member-dashboard-detail', resolvedWorkspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['group-learning-snapshot-summary', resolvedWorkspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['group-learning-snapshot-latest', resolvedWorkspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['group-learning-snapshot-ranking', resolvedWorkspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['group-member-learning-snapshot-latest', resolvedWorkspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['group-member-learning-snapshot-trend', resolvedWorkspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['workspace-learning-snapshot-me-latest', resolvedWorkspaceId] });
    }, delayMs);
  }, [
    currentUser,
    fetchGroups,
    fetchWorkspaceDetail,
    isCreating,
    loadGroupLogs,
    loadGroupProfile,
    loadMembers,
    navigateInstant,
    queryClient,
    resolvedWorkspaceId,
    showWarning,
    t,
    workspaceId,
  ]);

  const handleChallengeRealtime = useCallback(() => {
    if (isCreating || !workspaceId || workspaceId === 'new') return;
    void queryClient.invalidateQueries({ queryKey: ['challenges'] });
    void queryClient.invalidateQueries({ queryKey: ['challenge-detail'] });
    void queryClient.invalidateQueries({ queryKey: ['challenge-leaderboard'] });
    void queryClient.invalidateQueries({ queryKey: ['challenge-dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['challenge-teams'] });
    void queryClient.invalidateQueries({ queryKey: ['challenge-bracket'] });
  }, [isCreating, queryClient, workspaceId]);

  const handleGroupWalletRealtime = useCallback((event = null) => {
    if (isCreating || !resolvedWorkspaceId || !workspaceId || workspaceId === 'new') return;

    const normalizedWorkspaceId = Number(event?.workspaceId ?? resolvedWorkspaceId);
    if (Number.isInteger(normalizedWorkspaceId) && normalizedWorkspaceId !== Number(resolvedWorkspaceId)) {
      return;
    }

    const hasWalletSnapshot = [
      event?.totalAvailableCredits,
      event?.balance,
      event?.regularCreditBalance,
      event?.planCreditBalance,
    ].some((value) => value != null);

    if (hasWalletSnapshot) {
      queryClient.setQueryData(['group-wallet-summary', resolvedWorkspaceId], (current) => ({
        ...(current || {}),
        ...(event?.balance != null ? { balance: Number(event.balance) || 0 } : {}),
        ...(event?.totalAvailableCredits != null ? { totalAvailableCredits: Number(event.totalAvailableCredits) || 0 } : {}),
        ...(event?.regularCreditBalance != null ? { regularCreditBalance: Number(event.regularCreditBalance) || 0 } : {}),
        ...(event?.planCreditBalance != null ? { planCreditBalance: Number(event.planCreditBalance) || 0 } : {}),
        ...(event?.hasActivePlan != null ? { hasActivePlan: Boolean(event.hasActivePlan) } : {}),
        ...(event?.updatedAt ? { updatedAt: event.updatedAt } : {}),
      }));
    }

    void queryClient.invalidateQueries({ queryKey: ['group-wallet-summary', resolvedWorkspaceId] });
    void queryClient.invalidateQueries({ queryKey: ['group-wallet-transactions', resolvedWorkspaceId] });
    void queryClient.invalidateQueries({ queryKey: ['group-workspace-payments', resolvedWorkspaceId] });
  }, [isCreating, queryClient, resolvedWorkspaceId, workspaceId]);

  const { isConnected: wsConnected, lastMessage: wsLastMessage } = useWebSocket({
    workspaceId: !isCreating ? workspaceId : null,
    enabled: !isCreating && !!workspaceId && workspaceId !== 'new',
    onMaterialUploaded: handleRealtimeMaterialUpdate,
    onMaterialDeleted: handleRealtimeMaterialDeleted,
    onMaterialUpdated: handleRealtimeMaterialUpdate,
    onProgress: handleRealtimeProgress,
    onGroupUpdate: handleGroupRealtime,
    onWorkspaceWalletUpdate: handleGroupWalletRealtime,
    onChallengeUpdate: handleChallengeRealtime,
  });

  useEffect(() => {
    if (isCreating || !workspaceId || workspaceId === 'new' || activeSection !== 'members' || wsConnected) return undefined;

    const intervalMs = 30000;
    const timerId = globalThis.setInterval(() => {
      void loadMembers({ silent: true });
    }, intervalMs);

    return () => globalThis.clearInterval(timerId);
  }, [activeSection, isCreating, loadMembers, workspaceId, wsConnected]);

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

  const resolveLatestMemberSeatLimit = useCallback(async () => {
    const currentLimit = resolveGroupMemberSeatLimit({ groupProfile, groupSubscription });
    if (currentLimit != null || hasLoadedGroupSubscription || !resolvedWorkspaceId) {
      return currentLimit;
    }

    try {
      const response = await getWorkspaceCurrentPlan(resolvedWorkspaceId);
      const latestSubscription = unwrapApiData(response);
      setGroupSubscription(latestSubscription);
      setHasLoadedGroupSubscription(true);
      return resolveGroupMemberSeatLimit({
        groupProfile,
        groupSubscription: latestSubscription,
      });
    } catch {
      return currentLimit;
    }
  }, [
    groupProfile,
    groupSubscription,
    hasLoadedGroupSubscription,
    resolvedWorkspaceId,
  ]);

  // Invite handler
  const handleInvite = useCallback(async (email) => {
    if (!canManageGroup || !canManageMembers) {
      throw new Error(t('groupWorkspacePage.errors.leaderOnlyInvite', 'Only leaders can invite members to the group.'));
    }
    const latestSeatLimit = await resolveLatestMemberSeatLimit();
    if (latestSeatLimit != null) {
      let latestPendingInvitationSummary = pendingInvitationSummary;

      try {
        latestPendingInvitationSummary = normalizePendingInvitationSummary(
          await fetchPendingInvitations(resolvedWorkspaceId)
        );
        queryClient.setQueryData(
          pendingInvitationsQueryKey,
          latestPendingInvitationSummary,
        );
      } catch {
        const cachedPendingInvitations = queryClient.getQueryData(pendingInvitationsQueryKey);
        latestPendingInvitationSummary = normalizePendingInvitationSummary(
          cachedPendingInvitations ?? pendingInvitationSummary
        );
      }

      const latestSeatSummary = {
        limit: latestSeatLimit,
        pendingCount: latestPendingInvitationSummary.count,
        usedCount: acceptedMemberFallbackCount + latestPendingInvitationSummary.count,
      };
      latestSeatSummary.overLimitBy = Math.max(0, latestSeatSummary.usedCount - latestSeatSummary.limit);

      if (latestSeatSummary.limit != null && latestSeatSummary.usedCount >= latestSeatSummary.limit) {
        throw new Error(buildMemberSeatLimitErrorMessage(t, latestSeatSummary));
      }
    }

    const invitation = await inviteMemberHook(resolvedWorkspaceId, email);
    queryClient.setQueryData(['group-pending-invitations', resolvedWorkspaceId], (current) => {
      const currentInvitations = Array.isArray(current?.invitations) ? current.invitations : [];
      if (!invitation || typeof invitation !== 'object') {
        return {
          count: Number.isFinite(Number(current?.count)) ? Number(current.count) : currentInvitations.length,
          invitations: currentInvitations,
        };
      }

      const nextIdentity = String(
        invitation?.invitationId
        || invitation?.id
        || invitation?.inviteId
        || invitation?.token
        || invitation?.invitedEmail
        || email
      );
      const nextInvitations = [
        invitation,
        ...currentInvitations.filter((item) => String(
          item?.invitationId
          || item?.id
          || item?.inviteId
          || item?.token
          || item?.invitedEmail
          || item?.email
          || ''
        ) !== nextIdentity),
      ];

      return {
        count: nextInvitations.length,
        invitations: nextInvitations,
      };
    });
    void queryClient.invalidateQueries({ queryKey: ['group-pending-invitations', resolvedWorkspaceId] });
    void queryClient.invalidateQueries({ queryKey: ['group-activity-logs', resolvedWorkspaceId] });
    showInfo(t('groupWorkspacePage.toast.inviteSent', 'Invitation sent successfully!'));
    void loadMembers({ silent: true });
    await loadGroupLogs();
  }, [
    acceptedMemberFallbackCount,
    canManageGroup,
    canManageMembers,
    fetchPendingInvitations,
    inviteMemberHook,
    loadGroupLogs,
    loadMembers,
    pendingInvitationSummary,
    pendingInvitationsQueryKey,
    queryClient,
    resolveLatestMemberSeatLimit,
    resolvedWorkspaceId,
    showInfo,
    t,
  ]);

  // Upload files
  const handleUploadFiles = useCallback(async (files) => {
    if (shouldForceProfileSetup) {
      showError(t('groupWorkspacePage.upload.completeProfileBeforeUpload', 'Complete the group profile before uploading materials.'));
      setProfileConfigOpen(true);
      return;
    }
    if (!canUploadSource) {
      showError(t('groupWorkspacePage.upload.noUploadPermission', 'You do not have permission to upload materials.'));
      return;
    }
    if (!workspaceId || isCreating) {
      showError(t('groupWorkspacePage.upload.cannotUploadInvalidWorkspaceId', 'Cannot upload: workspaceId is invalid.'));
      return;
    }
    const candidateFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    if (candidateFiles.length === 0) {
      showError(t('groupWorkspacePage.upload.chooseAtLeastOneFile', 'Please choose at least one file.'));
      return;
    }

    const invalidFiles = candidateFiles.filter((file) => {
      if (!file || Number(file.size) <= 0) return true;
      return !isSupportedGroupUploadFile(file);
    });
    const validFiles = candidateFiles.filter((file) => !invalidFiles.includes(file));

    if (invalidFiles.length > 0) {
      const unknownLabel = t('groupWorkspacePage.upload.unknownFileName', 'unknown');
      showError(
        t('groupWorkspacePage.upload.unsupportedOrEmpty', 'Unsupported or empty files: {{files}}.', {
          files: invalidFiles.map((file) => file?.name || unknownLabel).join(', '),
        }),
      );
    }

    if (validFiles.length === 0) {
      throw new Error(t('groupWorkspacePage.upload.noValidFileLeft', 'No valid file remains for upload.'));
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
          throw new Error(t('groupWorkspacePage.upload.serverNoMaterialId', 'The server did not return a material id.'));
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
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      showInfo(
        t('groupWorkspacePage.upload.submittedCount', 'Submitted {{count}} file(s) to the group review queue.', { count: successfulUploads.length }),
      );
      showWarning(
        isLeader
          ? t('groupWorkspacePage.upload.leaderApprovalRequired', 'New materials will appear in the shared source list only after you approve them.')
          : t('groupWorkspacePage.upload.waitingLeaderApproval', 'Your upload is waiting for leader approval before the whole group can use it.'),
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
              'groupWorkspacePage.upload.insufficientQmcNeedPlan',
              'Group does not have enough QMC. Please buy a plan to continue — after that you can buy credits in the group wallet.',
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
            'groupWorkspacePage.upload.insufficientQmcNeedCredits',
            'Group does not have enough QMC. Open the group wallet to buy more credits.',
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
      const handledError = new Error(t('groupWorkspacePage.upload.allUploadsFailed', 'All uploads failed.'));
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
    queryClient,
    setUploadDialogOpen,
  ]);

  // Remove source
  const handleRemoveSource = useCallback(async (sourceId) => {
    try {
      await deleteMaterial(sourceId);
      setSources((prev) => prev.filter((source) => source.id !== sourceId));
      showInfo(t('groupWorkspacePage.toast.materialDeleted', 'Material deleted.'));
    } catch (error) {
      console.error('Delete failed:', error);
      showError(resolveUiErrorMessage(error));
    }
  }, [currentLang, resolveUiErrorMessage, showError, showInfo, t]);

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
        t('groupWorkspacePage.toast.materialsDeleted', 'Deleted {{count}} material(s).', { count: sourceIds.length }),
      );
    } catch (error) {
      console.error('Bulk delete error:', error);
      showError(resolveUiErrorMessage(error));
    }
  }, [currentLang, resolveUiErrorMessage, showError, showInfo, t]);

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
        ownerLabel: t('groupWorkspacePage.queue.officialQueue', 'Official group review queue'),
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
        ownerLabel: t('groupWorkspacePage.queue.sessionQueue', 'Submitted from this session'),
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
  }, [currentLang, isLeader, materialProgress, pendingReviewMaterials, sessionUploadQueue, t]);

  // Content action handlers — quiz, flashcard, mocktest, roadmap
  const handleStudioAction = useCallback((actionKey) => {
    if (shouldForceProfileSetup) {
      showInfo(t('groupWorkspacePage.toast.completeProfileBeforeStudio', 'Complete the group profile before using studio tabs.'));
      setProfileConfigOpen(true);
      return;
    }

    const disabledActionsByRole = {
      MEMBER: new Set(['dashboard', 'members', 'memberStats', 'wallet', 'settings']),
      CONTRIBUTOR: new Set(['dashboard', 'wallet', 'settings']),
      LEADER: new Set([]),
    };
    if (disabledActionsByRole[currentRoleKey]?.has(actionKey)) {
      showInfo(t('groupWorkspacePage.toast.featureNotAvailableForRole', 'This feature is not available for your role.'));
      return;
    }

    if (actionKey === 'createQuiz' && !canCreateQuiz) {
      showInfo(t('groupWorkspacePage.toast.memberCannotCreateQuiz', 'Member cannot create quizzes.'));
      return;
    }

    if (actionKey === 'createFlashcard' && !canCreateFlashcard) {
      showInfo(t('groupWorkspacePage.toast.memberCannotCreateFlashcard', 'Member cannot create flashcards.'));
      return;
    }

    if (GROUP_SECTIONS_REQUIRE_MATERIALS.has(actionKey) && !hasUploadedMaterials) {
      showInfo(t('groupWorkspace.studio.requireUploadBeforeActions'));
      setActiveSection('documents');
      setActiveView(null);
      if (canUploadSource) {
        setUploadDialogOpen(true);
      }
      return;
    }

    // Plan-gated actions
    if (actionKey === 'questionStats' && !planEntitlements.hasWorkspaceAnalytics) {
      setPlanUpgradeFeatureName(t('groupWorkspacePage.planUpgrade.workspaceAnalytics', 'Workspace analytics'));
      setPlanUpgradeModalOpen(true);
      return;
    }

    // Chỉ các key trong GROUP_WORKSPACE_VALID_SECTIONS mới đổi ?section=... (tab chính).
    // Sub-view (createQuiz, quizDetail, ...) chỉ đổi activeView — nếu set section=createQuiz
    // URL không hợp lệ → activeSection fallback về dashboard và giống như bị redirect.
    if (GROUP_WORKSPACE_VALID_SECTIONS.includes(actionKey)) {
      setActiveSection(actionKey);
    }

    if (actionKey !== 'roadmap') {
      setSelectedRoadmapPhaseId(null);
      setSelectedRoadmapKnowledgeId(null);
      setSelectedRoadmapQuizId(null);
    }

    setActiveView(actionKey);
  }, [
    setActiveSection,
    canCreateFlashcard,
    canCreateQuiz,
    currentRoleKey,
    showInfo,
    currentLang,
    shouldForceProfileSetup,
    hasUploadedMaterials,
    canUploadSource,
    planEntitlements.hasWorkspaceAnalytics,
    t,
  ]);

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

  const handleGroupDeleted = useCallback(async () => {
    try {
      await fetchGroups();
    } catch (error) {
      console.error('Failed to refresh groups after delete:', error);
    }
    navigate('/home', { replace: true });
  }, [fetchGroups, navigate]);

  // Xử lý yêu cầu cập nhật onboarding — kiểm tra guard
  const handleRequestGroupProfileUpdate = useCallback(() => {
    setProfileConfigOpen(true);
  }, []);

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

      await fetchWorkspaceDetail(workspaceId).catch(logSwallowed('GroupWorkspacePage.refresh'));
      await loadGroupProfile();
      bumpRoadmapReloadToken();

      setProfileUpdateGuardOpen(false);
      setProfileConfigOpen(true);
      showSuccess(
        t('groupWorkspacePage.toast.resetDataSuccess', 'Documents deleted. You can now update the group onboarding.')
      );
    } catch (error) {
      console.error('Failed to reset group workspace for profile update:', error);
      showError(
        error?.message || t('groupWorkspacePage.errors.unableToDeleteData', 'Unable to delete workspace data. Please try again.')
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
    t,
  ]);

  const trackQuizGenerationStart = useCallback((payload) => {
    const quizId = Number(payload?.quizId ?? payload?.id ?? payload?.data?.quizId ?? payload?.data?.id ?? 0);
    const taskId = String(payload?.websocketTaskId ?? payload?.taskId ?? payload?.data?.websocketTaskId ?? payload?.data?.taskId ?? '').trim();
    const percent = clampPercent(
      payload?.percent
      ?? payload?.progressPercent
      ?? payload?.processingPercent
      ?? payload?.data?.percent
      ?? payload?.data?.progressPercent
      ?? 0,
    );

    if (!Number.isInteger(quizId) || quizId <= 0) {
      return;
    }

    if (taskId) {
      setQuizGenerationTaskByQuizId((current) => {
        if (current[quizId] === taskId) return current;
        return {
          ...current,
          [quizId]: taskId,
        };
      });
      processingQuizRefreshIdsRef.current.add(quizId);
    }

    if (percent > 0) {
      setQuizGenerationProgressByQuizId((current) => ({
        ...current,
        [quizId]: percent,
      }));
    }
  }, []);

  const handleCreateQuiz = useCallback(async (createdPayload) => {
    trackQuizGenerationStart(createdPayload);

    if (isRealtimeProcessingQuizPayload(createdPayload)) {
      showInfo(t(
        challengeDraftUiActive
          ? 'groupWorkspacePage.toast.challengeQuizGenerationStarted'
          : 'groupWorkspacePage.toast.quizGenerationStarted',
        challengeDraftUiActive
          ? 'Challenge quiz is being generated. Track progress in the challenge detail.'
          : 'Quiz is being generated. Track progress in the quiz list.',
      ));
      bumpQuizListRefreshToken();
      setSelectedQuiz(null);
      void refreshActiveTaskSnapshot('group-quiz-create');
      if (challengeDraftUiActive && returnToChallengeDraftContext()) {
        return;
      }
      setActiveView('quiz');
      return;
    }

    const createdQuiz = extractGroupCreatedQuizPayload(createdPayload);
    if (createdQuiz) {
      showSuccess(
        t(
          challengeDraftUiActive
            ? 'groupWorkspacePage.toast.challengeQuizCreated'
            : 'groupWorkspacePage.toast.quizCreated',
          challengeDraftUiActive
            ? 'Challenge quiz updated successfully.'
            : 'Quiz created successfully.',
        )
      );
      bumpQuizListRefreshToken();
      if (challengeDraftUiActive && returnToChallengeDraftContext()) {
        return;
      }
      setSelectedQuiz(createdQuiz);
      setActiveView('quizDetail');
      return;
    }

    if (!canCreateQuiz) {
      showInfo(t('groupWorkspacePage.toast.memberCannotCreateQuiz', 'Member cannot create quizzes.'));
      return;
    }
    void refreshActiveTaskSnapshot('group-quiz-create');
    setActiveView('quiz');
  }, [bumpQuizListRefreshToken, canCreateQuiz, challengeDraftUiActive, currentLang, refreshActiveTaskSnapshot, returnToChallengeDraftContext, showInfo, showSuccess, t, trackQuizGenerationStart]);
  const handleViewQuiz = useCallback((quiz, options = {}) => {
    const normalizedQuizId = Number(quiz?.quizId ?? quiz?.id ?? 0);
    const normalizedQuiz = Number.isInteger(normalizedQuizId) && normalizedQuizId > 0
      ? { ...quiz, quizId: normalizedQuizId }
      : quiz;

    const targetRoadmapId = Number(options?.backTarget?.roadmapId);
    const targetPhaseId = Number(options?.backTarget?.phaseId);
    const targetKnowledgeId = Number(options?.backTarget?.knowledgeId);
    const hasRoadmapTarget = Number.isInteger(targetRoadmapId) && targetRoadmapId > 0;

    if (hasRoadmapTarget && workspaceId && Number.isInteger(normalizedQuizId) && normalizedQuizId > 0) {
      setRuntimeRoadmapId(targetRoadmapId);
      setSelectedRoadmapPhaseId(Number.isInteger(targetPhaseId) && targetPhaseId > 0 ? targetPhaseId : null);
      setSelectedRoadmapKnowledgeId(Number.isInteger(targetKnowledgeId) && targetKnowledgeId > 0 ? targetKnowledgeId : null);
      setSelectedRoadmapQuizId(normalizedQuizId);

      navigateInstant(
        buildGroupWorkspaceRoadmapPath(workspaceId, {
          roadmapId: targetRoadmapId,
          phaseId: Number.isInteger(targetPhaseId) && targetPhaseId > 0 ? targetPhaseId : null,
          knowledgeId: Number.isInteger(targetKnowledgeId) && targetKnowledgeId > 0 ? targetKnowledgeId : null,
          quizId: normalizedQuizId,
        }),
        { replace: true },
      );
    } else {
      setSelectedRoadmapQuizId(null);
    }

    setQuizDetailFromChallengeReview(false);
    setSelectedQuiz(normalizedQuiz);
    setActiveView('quizDetail');
  }, [navigateInstant, workspaceId]);
  const handleEditQuiz = useCallback((quiz) => { setSelectedQuiz(quiz); setActiveView('editQuiz'); }, []);
  const handleSaveQuiz = useCallback((updatedQuiz) => {
    bumpQuizListRefreshToken();
    if (challengeDraftUiActive && returnToChallengeDraftContext()) {
      return;
    }
    setSelectedQuiz((p) => ({ ...p, ...updatedQuiz }));
    setActiveView('quizDetail');
  }, [bumpQuizListRefreshToken, challengeDraftUiActive, returnToChallengeDraftContext]);

  const handleGroupQuizUpdated = useCallback((payload) => {
    const qid = Number(payload?.quizId);
    if (payload && typeof payload === 'object' && Number.isInteger(qid) && qid > 0) {
      setSelectedQuiz((prev) => (prev ? { ...prev, ...payload } : prev));
    }
    bumpQuizListRefreshToken();
  }, [bumpQuizListRefreshToken]);

  const handleCreateFlashcard = useCallback(async (createdFlashcard = null) => {
    if (!canCreateFlashcard) {
      showInfo(t('groupWorkspacePage.toast.memberCannotCreateFlashcard', 'Member cannot create flashcards.'));
      return;
    }

    const scopeId = Number(workspaceId) || 0;
    const queryKey = ['workspace-flashcards', 'GROUP', scopeId];
    const flashcardSetId = Number(
      createdFlashcard?.flashcardSetId
      ?? createdFlashcard?.id
      ?? createdFlashcard?.data?.flashcardSetId,
    );

    if (scopeId > 0 && Number.isInteger(flashcardSetId) && flashcardSetId > 0) {
      const createdPayload = createdFlashcard?.data || createdFlashcard || {};
      queryClient.setQueryData(queryKey, (previousItems = []) => {
        const safePreviousItems = Array.isArray(previousItems) ? previousItems : [];

        if (safePreviousItems.some((item) => Number(item?.flashcardSetId ?? item?.id) === flashcardSetId)) {
          return safePreviousItems;
        }

        const nowIso = new Date().toISOString();
        const optimisticItem = {
          flashcardSetId,
          flashcardSetName: createdPayload?.flashcardSetName
            || createdPayload?.name
            || `${t('workspace.flashcard.createTitle')} #${flashcardSetId}`,
          status: String(createdPayload?.status || 'DRAFT').toUpperCase(),
          createVia: createdPayload?.createVia || 'AI',
          itemCount: Number(createdPayload?.itemCount ?? 0),
          taskId: createdPayload?.taskId ?? createdPayload?.websocketTaskId ?? null,
          websocketTaskId: createdPayload?.websocketTaskId ?? createdPayload?.taskId ?? null,
          percent: createdPayload?.percent ?? createdPayload?.progressPercent ?? 0,
          progressPercent: createdPayload?.progressPercent ?? createdPayload?.percent ?? 0,
          processingObject: createdPayload?.processingObject,
          createdAt: createdPayload?.createdAt || nowIso,
          updatedAt: createdPayload?.updatedAt || nowIso,
        };

        return [optimisticItem, ...safePreviousItems];
      });
    }

    void queryClient.invalidateQueries({ queryKey });
    setActiveView('flashcard');
  }, [canCreateFlashcard, currentLang, queryClient, showInfo, t, workspaceId]);
  const handleViewFlashcard = useCallback((fc) => { setSelectedFlashcard(fc); setActiveView('flashcardDetail'); }, []);
  const handleDeleteFlashcard = useCallback(async (fc) => {
    if (!window.confirm(t('workspace.confirmDeleteFlashcard'))) return;
    const flashcardSetId = Number(fc?.flashcardSetId ?? fc?.id ?? fc?.flashcardId);
    if (!Number.isInteger(flashcardSetId) || flashcardSetId <= 0) {
      showError(t('workspace.flashcard.deleteFailed', 'Cannot delete this flashcard set.'));
      return;
    }
    const scopeId = Number(workspaceId) || 0;
    const queryKey = ['workspace-flashcards', 'GROUP', scopeId];
    try {
      const { deleteFlashcardSet } = await import('@/api/FlashcardAPI');
      await deleteFlashcardSet(flashcardSetId);
      queryClient.setQueryData(queryKey, (previousItems = []) => {
        if (!Array.isArray(previousItems)) return previousItems;
        return previousItems.filter(
          (item) => Number(item?.flashcardSetId ?? item?.id ?? item?.flashcardId) !== flashcardSetId,
        );
      });
      void queryClient.invalidateQueries({ queryKey });
      setSelectedFlashcard((current) => (
        Number(current?.flashcardSetId ?? current?.id ?? current?.flashcardId) === flashcardSetId
          ? null
          : current
      ));
      setActiveView('flashcard');
    } catch (err) {
      showError(getErrorMessage(t, err));
      console.error('Xóa flashcard thất bại:', err);
    }
  }, [queryClient, showError, t, workspaceId]);

  const handleCreateRoadmap = useCallback(async (data) => {
    if (!canCreateRoadmap) {
      showInfo(t('groupWorkspacePage.toast.memberCannotCreateRoadmap', 'Member cannot create roadmap.'));
      return;
    }
    if (!planEntitlements.canCreateRoadmap) {
      setPlanUpgradeFeatureName(t('groupWorkspacePage.planUpgrade.createRoadmap', 'Create learning roadmap'));
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
      await fetchWorkspaceDetail(workspaceId).catch(logSwallowed('GroupWorkspacePage.refresh'));
      await loadGroupProfile();
      setActiveView('roadmap');
    } catch (err) {
      console.error('Tạo roadmap thất bại:', err);
      throw err;
    }
  }, [workspaceId, canCreateRoadmap, currentLang, fetchWorkspaceDetail, loadGroupProfile, showInfo, planEntitlements.canCreateRoadmap, t]);

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

  const startGroupRoadmapPhaseGeneration = useCallback(async (materialIds = []) => {
    const roadmapId = currentRoadmapId;
    if (!roadmapId) {
      showError(t('groupWorkspacePage.toast.noRoadmapConfig', 'No roadmap config found for this group yet.'));
      return false;
    }

    const materialIdsToUse = (Array.isArray(materialIds) ? materialIds : [])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (materialIdsToUse.length === 0) {
      showInfo(t('groupWorkspacePage.toast.selectMaterialBeforeRoadmap', 'Please select at least one material before generating roadmap.'));
      return false;
    }

    setIsGeneratingRoadmapPhases(true);
    setHasTriggeredGroupRoadmap(true);
    setRoadmapPhaseGenerationProgress(0);
    setRoadmapPhaseGenerationTaskId(null);
    const roadmapGenerationResponse = await generateRoadmap({ roadmapId, materialIds: materialIdsToUse });
    const roadmapGenerationPayload = roadmapGenerationResponse?.data?.data || roadmapGenerationResponse?.data || roadmapGenerationResponse || null;
    const responseTaskId = String(roadmapGenerationPayload?.websocketTaskId ?? roadmapGenerationPayload?.taskId ?? '').trim();
    if (responseTaskId) {
      setRoadmapPhaseGenerationTaskId(responseTaskId);
    }
    setRoadmapPhaseGenerationProgress(clampPercent(roadmapGenerationPayload?.percent ?? roadmapGenerationPayload?.progressPercent ?? 0));
    setActiveView('roadmap');
    bumpRoadmapReloadToken();
    showSuccess(
      t('groupWorkspacePage.toast.roadmapGenerationStarted', 'Roadmap generation has started.')
    );
    return true;
  }, [
    bumpRoadmapReloadToken,
    currentRoadmapId,
    setActiveView,
    showError,
    showInfo,
    showSuccess,
    t,
  ]);

  const handleCreateGroupRoadmapPhases = useCallback(async () => {
    if (!canCreateRoadmap) {
      showInfo(t('groupWorkspacePage.toast.memberCannotCreateRoadmapPhases', 'Member cannot create roadmap phases.'));
      return;
    }

    if (!hasGroupRoadmapConfig) {
      handleOpenRoadmapConfigSetup();
      return;
    }

    const materialIds = resolveGroupRoadmapMaterialIds();
    try {
      await startGroupRoadmapPhaseGeneration(materialIds);
    } catch (error) {
      setIsGeneratingRoadmapPhases(false);
      setRoadmapPhaseGenerationTaskId(null);
      setRoadmapPhaseGenerationProgress(0);
      showError(error?.message || t('groupWorkspacePage.toast.roadmapGenerationFailed', 'Failed to generate roadmap.'));
    }
  }, [
    canCreateRoadmap,
    handleOpenRoadmapConfigSetup,
    hasGroupRoadmapConfig,
    resolveGroupRoadmapMaterialIds,
    showError,
    showInfo,
    startGroupRoadmapPhaseGeneration,
    t,
  ]);

  const handleOpenRoadmapPhaseGenerateDialog = useCallback(() => {
    if (!canCreateRoadmap) {
      showInfo(t('groupWorkspacePage.toast.memberCannotCreateRoadmapPhases', 'Member cannot create roadmap phases.'));
      return;
    }

    if (!hasGroupRoadmapConfig) {
      handleOpenRoadmapConfigSetup();
      return;
    }

    const defaultMaterialIds = resolveGroupRoadmapMaterialIds();
    setPhaseGenerateDialogDefaultIds(defaultMaterialIds);
    setPhaseGenerateDialogOpen(true);
  }, [
    canCreateRoadmap,
    handleOpenRoadmapConfigSetup,
    hasGroupRoadmapConfig,
    resolveGroupRoadmapMaterialIds,
    showInfo,
    t,
  ]);

  const handleSubmitRoadmapPhaseDialog = useCallback(async ({ files = [], materialIds = [] } = {}) => {
    if (!canCreateRoadmap) {
      showInfo(t('groupWorkspacePage.toast.memberCannotCreateRoadmapPhases', 'Member cannot create roadmap phases.'));
      return;
    }

    if (!hasGroupRoadmapConfig) {
      setPhaseGenerateDialogOpen(false);
      handleOpenRoadmapConfigSetup();
      return;
    }

    try {
      setIsSubmittingRoadmapPhaseRequest(true);

      const uploadFiles = Array.isArray(files) ? files.filter(Boolean) : [];
      if (uploadFiles.length > 0) {
        await handleUploadFiles(uploadFiles);
        await fetchSources();
      }

      const didStart = await startGroupRoadmapPhaseGeneration(materialIds);
      if (!didStart) {
        return;
      }

      setPhaseGenerateDialogOpen(false);
    } catch (error) {
      setIsGeneratingRoadmapPhases(false);
      setRoadmapPhaseGenerationTaskId(null);
      setRoadmapPhaseGenerationProgress(0);
      showError(error?.message || t('groupWorkspacePage.toast.roadmapGenerationFailed', 'Failed to generate roadmap.'));
    } finally {
      setIsSubmittingRoadmapPhaseRequest(false);
    }
  }, [
    canCreateRoadmap,
    fetchSources,
    handleUploadFiles,
    handleOpenRoadmapConfigSetup,
    hasGroupRoadmapConfig,
    showError,
    showInfo,
    startGroupRoadmapPhaseGeneration,
    t,
  ]);

  const handleCreateGroupRoadmapPreLearning = useCallback(async ({ totalQuestion } = {}) => {
    if (!canCreateRoadmap) {
      showInfo(t('groupWorkspacePage.toast.memberCannotCreateRoadmapPhases', 'Member cannot create roadmap phases.'));
      return false;
    }

    const roadmapId = Number(currentRoadmapId);
    if (!Number.isInteger(roadmapId) || roadmapId <= 0) {
      showError(t('groupWorkspacePage.toast.noRoadmapConfig', 'No roadmap config found for this group yet.'));
      return false;
    }

    const requestedQuestionCount = Number(totalQuestion);
    const normalizedQuestionCount = Number.isInteger(requestedQuestionCount) && requestedQuestionCount > 0
      ? requestedQuestionCount
      : 20;

    try {
      setIsGeneratingRoadmapPreLearning(true);
      await generateRoadmapGroupPreLearning({
        roadmapId,
        totalQuestion: normalizedQuestionCount,
      });
      bumpRoadmapReloadToken();
      showSuccess(t('workspace.roadmap.groupPreLearning.started', 'Đã gửi yêu cầu tạo pre-learning cho roadmap nhóm.'));
      return true;
    } catch (error) {
      showError(error?.message || t('workspace.roadmap.groupPreLearning.failed', 'Không thể tạo pre-learning cho roadmap nhóm.'));
      return false;
    } finally {
      setIsGeneratingRoadmapPreLearning(false);
    }
  }, [
    bumpRoadmapReloadToken,
    canCreateRoadmap,
    currentRoadmapId,
    showError,
    showInfo,
    showSuccess,
    t,
  ]);

  const handleSaveRoadmapConfig = useCallback(async (values) => {
    if (!workspaceId) throw new Error(t('groupWorkspacePage.errors.noWorkspace', 'No workspace found'));

    if (roadmapConfigDialogMode === 'setup') {
      await setupGroupRoadmapConfig(workspaceId, values);
    } else {
      const roadmapId = currentRoadmapId;
      if (!roadmapId) throw new Error(t('groupWorkspacePage.errors.noRoadmap', 'No roadmap found'));
      await updateGroupRoadmapConfig(roadmapId, values);
      await resetCurrentRoadmapStructure();
    }

    await fetchWorkspaceDetail(workspaceId).catch(logSwallowed('GroupWorkspacePage.refresh'));
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
    t,
  ]);

  const handleSuggestRoadmapConfig = useCallback(async () => {
    const resolvedGroupWorkspaceId = Number(resolvedWorkspaceId || workspaceId);
    if (!Number.isInteger(resolvedGroupWorkspaceId) || resolvedGroupWorkspaceId <= 0) {
      throw new Error(t('groupWorkspacePage.errors.noWorkspace', 'No workspace found'));
    }

    const response = await suggestGroupRoadmapConfig(resolvedGroupWorkspaceId);
    return unwrapApiData(response);
  }, [resolvedWorkspaceId, workspaceId, t]);

  const handleCreateMockTest = useCallback(async () => {
    if (!canCreateMockTest) {
      showInfo(t('groupWorkspacePage.toast.memberCannotCreateMockTest', 'Member cannot create mock tests.'));
      return;
    }
    invalidateMockTestQueries();
    setActiveView('mockTest');
  }, [canCreateMockTest, invalidateMockTestQueries, showInfo, t]);
  const handleViewMockTest = useCallback((mt) => { setSelectedMockTest(mt); setActiveView('mockTestDetail'); }, []);
  const handleEditMockTest = useCallback((mt) => { setSelectedMockTest(mt); setActiveView('editMockTest'); }, []);
  const handleSaveMockTest = useCallback((updatedMt) => { setSelectedMockTest((p) => ({ ...p, ...updatedMt })); setActiveView('mockTestDetail'); }, []);
  const handleSelectRoadmapPhase = useCallback((phaseId, _options = {}) => {
    const normalizedRoadmapId = Number(_options?.roadmapId);
    const resolvedSelectionRoadmapId = Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0
      ? normalizedRoadmapId
      : resolvedRoadmapRouteId;

    if (Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0) {
      setRuntimeRoadmapId(normalizedRoadmapId);
    }

    if (_options?.focusRoadmapCenter) {
      skipRoadmapStoredRestoreRef.current = true;

      if (roadmapSelectionStorageKey && typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(roadmapSelectionStorageKey);
        } catch {
          // Bo qua loi storage de tranh anh huong luong dieu huong.
        }
      }

      setSelectedRoadmapPhaseId(null);
      setSelectedRoadmapKnowledgeId(null);
      setSelectedRoadmapQuizId(null);
      setRoadmapCenterFocusToken((current) => current + 1);

      if (workspaceId) {
        navigateInstant(
          buildGroupWorkspaceRoadmapPath(workspaceId, {
            roadmapId: resolvedSelectionRoadmapId,
          }),
          { replace: true },
        );
      }

      if (_options?.preserveActiveView) return;

      setSelectedQuiz(null);
      setActiveView('roadmap');
      return;
    }

    const normalizedPhaseId = Number(phaseId);
    const normalizedKnowledgeId = Number(_options?.knowledgeId);
    if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;

    setSelectedRoadmapPhaseId(normalizedPhaseId);
    setSelectedRoadmapKnowledgeId(
      Number.isInteger(normalizedKnowledgeId) && normalizedKnowledgeId > 0
        ? normalizedKnowledgeId
        : null,
    );
    setSelectedRoadmapQuizId(null);

    if (workspaceId) {
      const hasResolvedRoadmapId = Number.isInteger(Number(resolvedSelectionRoadmapId)) && Number(resolvedSelectionRoadmapId) > 0;
      if (hasResolvedRoadmapId) {
        navigateInstant(
          buildGroupWorkspaceRoadmapPath(workspaceId, {
            roadmapId: resolvedSelectionRoadmapId,
            phaseId: normalizedPhaseId,
            knowledgeId: Number.isInteger(normalizedKnowledgeId) && normalizedKnowledgeId > 0
              ? normalizedKnowledgeId
              : null,
          }),
          { replace: true },
        );
      }
    }

    if (_options?.preserveActiveView) return;

    setActiveView('roadmap');
  }, [navigateInstant, resolvedRoadmapRouteId, roadmapSelectionStorageKey, workspaceId]);

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

    if (
      challengeDraftUiActive
      && ['createQuiz', 'editQuiz', 'quizDetail'].includes(activeView)
      && returnToChallengeDraftContext()
    ) {
      return;
    }

    const formToList = { createRoadmap: 'roadmap', createQuiz: 'quiz', createFlashcard: 'flashcard', createManualFlashcard: 'flashcard', quizDetail: 'quiz', editQuiz: 'quizDetail', flashcardDetail: 'flashcard', createMockTest: 'mockTest', mockTestDetail: 'mockTest', editMockTest: 'mockTestDetail' };
    if (activeView === 'quizDetail' && Number.isInteger(Number(selectedRoadmapQuizId)) && Number(selectedRoadmapQuizId) > 0) {
      formToList.quizDetail = 'roadmap';
    }
    const nextView = formToList[activeView] || null;
    if ((activeView === 'editQuiz' || activeView === 'createQuiz') && searchParams.get('challengeDraft') === '1') {
      const next = new URLSearchParams(searchParams);
      next.delete('challengeDraft');
      setSearchParams(next, { replace: true });
    }
    if (nextView !== 'quizDetail' && nextView !== 'editQuiz') {
      setSelectedQuiz(null);
      setQuizDetailFromChallengeReview(false);
      setSelectedRoadmapQuizId(null);
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
    selectedRoadmapQuizId,
    workspaceId,
    challengeDraftUiActive,
    returnToChallengeDraftContext,
    searchParams,
    setSearchParams,
  ]);

  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
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
  const renderActivityFeed = (compact = false) => (
    <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-2">
        <Activity className={`h-5 w-5 ${isDarkMode ? 'text-cyan-200' : 'text-cyan-600'}`} />
        <div>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('groupWorkspacePage.activity.title', 'Recent group activity')}
          </h3>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {t('groupWorkspacePage.activity.description', 'Real events from the group workspace log.')}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {groupLogsLoading ? (
          <div className={`rounded-[22px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'}`}>
            {t('groupWorkspacePage.activity.loading', 'Loading activity...')}
          </div>
        ) : groupLogs.length === 0 ? (
          <div className={`rounded-[22px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'}`}>
            {t('groupWorkspacePage.activity.empty', 'No activity has been recorded yet.')}
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
                    {(log.actorEmail || t('groupWorkspacePage.log.system', 'System'))} • {formatDateTime(log.logTime, currentLang)}
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
    const safeMemberName = getUserDisplayLabel(currentMember, t('groupWorkspacePage.personalDashboard.memberFallback', 'Member'));
    const joinedAt = currentMember?.joinedAt || welcomePayload?.joinedAt || null;
    const currentRoleLabel = formatGroupRole(currentRoleKey, currentLang);
    const learningModeLabel = formatGroupLearningMode(resolvedGroupData.learningMode, currentLang);
    const stats = [
      {
        label: t('groupWorkspacePage.personalDashboard.roleLabel', 'Current role'),
        value: currentRoleLabel,
        icon: ShieldCheck,
      },
      {
        label: t('groupWorkspacePage.personalDashboard.teamMembers', 'Team members'),
        value: membersLoading ? '...' : String(members.length),
        icon: Users,
      },
      {
        label: t('groupWorkspacePage.personalDashboard.sharedSources', 'Shared sources'),
        value: String(sources.length),
        icon: FolderOpen,
      },
      {
        label: t('groupWorkspacePage.personalDashboard.joinedAt', 'Joined at'),
        value: joinedAt ? formatDateTime(joinedAt, currentLang) : t('groupWorkspacePage.personalDashboard.pendingConfirmation', 'Pending confirmation'),
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
                    ? t('groupWorkspacePage.personalDashboard.welcomeBadge', 'Welcome aboard')
                    : t('groupWorkspacePage.personalDashboard.memberSpaceBadge', 'Member space')}
                </span>
                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                  {currentRoleLabel}
                </span>
              </div>

              <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {welcomePayload
                  ? `${t('groupWorkspacePage.personalDashboard.welcomeTo', 'Welcome to')} ${resolvedGroupData.groupName || currentGroupName || 'group'}`
                  : `${t('groupWorkspacePage.personalDashboard.hello', 'Hello,')} ${safeMemberName}`}
              </h2>

              <p className={`mt-3 max-w-3xl text-sm leading-7 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {groupDescription
                  || t('groupWorkspacePage.personalDashboard.descriptionFallback', 'You can review the group profile, see who is in the room, and follow the newest activity here.')}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleStudioAction('roadmap')}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
                >
                  <MapIcon className="h-4 w-4" />
                  {t('groupWorkspacePage.personalDashboard.openRoadmap', 'Open roadmap')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('notifications')}
                  className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  <Activity className="h-4 w-4" />
                  {t('groupWorkspacePage.personalDashboard.viewActivity', 'View activity')}
                </button>
                {welcomePayload ? (
                  <button
                    type="button"
                    onClick={handleDismissWelcome}
                    className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t('groupWorkspacePage.personalDashboard.hideWelcome', 'Hide welcome')}
                  </button>
                ) : null}
              </div>
            </div>

            <div className={`rounded-[26px] border p-5 xl:w-[320px] ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50/80'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {t('groupWorkspacePage.personalDashboard.quickRead', 'Group quick read')}
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('groupWorkspacePage.personalDashboard.domain', 'Domain')}</p>
                  <p className={`mt-1 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{resolvedGroupData.domain || '—'}</p>
                </div>
                <div>
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('groupWorkspacePage.personalDashboard.learningMode', 'Learning mode')}</p>
                  <p className={`mt-1 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{learningModeLabel || '—'}</p>
                </div>
                <div>
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('groupWorkspacePage.personalDashboard.examTarget', 'Exam / target')}</p>
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
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-white/[0.06] text-cyan-200' : 'bg-cyan-50 text-cyan-700'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</p>
                </div>
                <p className={`mt-4 text-lg font-bold leading-7 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.value}</p>
              </div>
            );
          })}
        </div>

        {planEntitlements.hasWorkspaceAnalytics ? (
          <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {t('groupWorkspacePage.personalDashboard.learningSnapshotEyebrow', 'Learning snapshot')}
                </p>
                <h3 className={`mt-2 text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {t('groupWorkspacePage.personalDashboard.learningSnapshotTitle', 'Your latest daily snapshot')}
                </h3>
              </div>
              {personalLearningSnapshot?.snapshotDate ? (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700'}`}>
                  {formatDateTime(personalLearningSnapshot.snapshotDate, currentLang)}
                </span>
              ) : null}
            </div>

            {personalLearningSnapshotQuery.isLoading ? (
              <div className={`mt-4 rounded-[20px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                {t('groupWorkspacePage.personalDashboard.learningSnapshotLoading', 'Loading your learning snapshot...')}
              </div>
            ) : personalLearningSnapshot ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {[
                  { key: 'attempts', label: t('groupWorkspacePage.personalDashboard.snapshotAttempts', 'Attempts'), value: personalLearningSnapshot.totalQuizAttempts ?? 0 },
                  { key: 'passed', label: t('groupWorkspacePage.personalDashboard.snapshotPassed', 'Passed'), value: personalLearningSnapshot.totalQuizPassed ?? 0 },
                  { key: 'score', label: t('groupWorkspacePage.personalDashboard.snapshotScore', 'Avg score'), value: formatLearningScore(personalLearningSnapshot.averageScore) },
                  { key: 'passRate', label: t('groupWorkspacePage.personalDashboard.snapshotPassRate', 'Pass rate'), value: formatLearningPassRate(personalLearningSnapshot) },
                  { key: 'minutes', label: t('groupWorkspacePage.personalDashboard.snapshotMinutes', 'Minutes'), value: personalLearningSnapshot.totalMinutesSpent ?? 0 },
                  { key: 'class', label: t('groupWorkspacePage.personalDashboard.snapshotClass', 'AI class'), value: personalLearningSnapshot.aiClassification || '—' },
                ].map((metric) => (
                  <div key={metric.key} className={`rounded-[18px] border px-3 py-3 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50/70'}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{metric.label}</p>
                    <p className={`mt-2 text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{metric.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`mt-4 rounded-[20px] border px-4 py-5 text-sm ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                {t('groupWorkspacePage.personalDashboard.learningSnapshotEmpty', 'No learning snapshot has been generated for you yet.')}
              </div>
            )}
          </section>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-2">
              <FileText className={`h-5 w-5 ${isDarkMode ? 'text-amber-200' : 'text-amber-600'}`} />
              <div>
                <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {t('groupWorkspacePage.personalDashboard.profileTitle', 'Group profile for members')}
                </h3>
                <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {groupProfileLoading
                    ? t('groupWorkspacePage.personalDashboard.profileRefreshing', 'Refreshing group profile...')
                    : t('groupWorkspacePage.personalDashboard.profileLoaded', 'Everything below is loaded from the real workspace profile.')}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {t('groupWorkspacePage.personalDashboard.knowledgeFocus', 'Knowledge focus')}
                </p>
                <p className={`mt-2 text-sm leading-7 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  {resolvedGroupData.knowledge || '—'}
                </p>
              </div>

              <div className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {t('groupWorkspacePage.personalDashboard.rulesAndNorms', 'Rules and norms')}
                </p>
                <p className={`mt-2 text-sm leading-7 whitespace-pre-line ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  {resolvedGroupData.rules || t('groupWorkspace.profile.noRules')}
                </p>
              </div>

              <div className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {t('groupWorkspacePage.personalDashboard.groupLearningGoal', 'Group learning goal')}
                </p>
                <p className={`mt-2 text-sm leading-7 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  {resolvedGroupData.groupLearningGoal || groupDescription || '—'}
                </p>
              </div>

              <div className={`rounded-[22px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {t('groupWorkspacePage.personalDashboard.preLearningRequirement', 'Pre-learning requirement')}
                </p>
                <p className={`mt-2 text-sm leading-7 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  {resolvedGroupData.preLearningRequired == null
                    ? '—'
                    : resolvedGroupData.preLearningRequired
                      ? t('groupWorkspacePage.personalDashboard.preLearningRequired', 'Required before starting shared work.')
                      : t('groupWorkspacePage.personalDashboard.preLearningOptional', 'Optional, depending on your current level.')}
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
                  {t('groupWorkspacePage.personalDashboard.peopleTitle', 'People in this group')}
                </h3>
                <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t('groupWorkspacePage.personalDashboard.peopleDescription', 'A quick snapshot so members know who they are studying with.')}
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
                        <UserDisplayName user={member} fallback={t('groupWorkspacePage.personalDashboard.memberFallback', 'Member')} isDarkMode={isDarkMode} />
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
                        {t('groupWorkspacePage.personalDashboard.youBadge', 'You')}
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

  const renderStudioPanel = (defaultView, options = {}) => {
    const { unstyled = false } = options;
    const suspenseFallbackClass = unstyled
      ? "flex h-full min-h-0 items-center justify-center"
      : "flex h-full min-h-[500px] items-center justify-center";
    const panelContent = (
      <React.Suspense fallback={<div className={suspenseFallbackClass}><ListSpinner variant="section" className="h-full" /></div>}>
        <LazyGroupChatPanel
        isDarkMode={isDarkMode}
        sources={sources}
        selectedSourceIds={selectedSourceIds}
        onToggleMaterialSelection={handleSelectOneSource}
        activeView={activeView || defaultView}
        readOnly={!canCreateContent}
        canCreateQuiz={canCreateQuiz}
        canCreateFlashcard={canCreateFlashcard}
        canCreateMockTest={canCreateMockTest}
        canCreateRoadmap={canCreateRoadmap}
        canPublishQuiz={canPublishQuiz}
        canAssignQuizAudience={canAssignQuizAudience}
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
        onRefreshRoadmapPhases={handleOpenRoadmapPhaseGenerateDialog}
        onCreateRoadmapPreLearning={handleCreateGroupRoadmapPreLearning}
        onRoadmapPhaseFocus={handleSelectRoadmapPhase}
        onRoadmapLoad={(roadmapId) => {
          const normalizedRoadmapId = Number.isInteger(Number(roadmapId)) && Number(roadmapId) > 0 ? Number(roadmapId) : null;
          if (normalizedRoadmapId) {
            setRuntimeRoadmapId((prev) => (prev === normalizedRoadmapId ? prev : normalizedRoadmapId));
          }
        }}
        onCreateMockTest={handleCreateMockTest}
        onBack={handleBackFromForm}
        workspaceId={workspaceId}
        hasRoadmap={Boolean(currentRoadmapId)}
        roadmapReloadToken={roadmapReloadToken}
        quizListRefreshToken={quizListRefreshToken}
        quizGenerationTaskByQuizId={quizGenerationTaskByQuizId}
        quizGenerationProgressByQuizId={quizGenerationProgressByQuizId}
        isGeneratingRoadmapPhases={isGeneratingRoadmapPhases}
        isGeneratingRoadmapPreLearning={isGeneratingRoadmapPreLearning}
        roadmapPhaseGenerationProgress={roadmapPhaseGenerationProgress}
        selectedRoadmapPhaseId={selectedRoadmapPhaseId}
        selectedRoadmapKnowledgeId={selectedRoadmapKnowledgeId}
        roadmapCenterFocusToken={roadmapCenterFocusToken}
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
        quizTitleMaxLength={groupQuizTitleMaxLength}
        currentPlanSummaryOverride={groupCurrentPlanSummary}
        onCreateRoadmapPhases={handleCreateGroupRoadmapPhases}
        roadmapSelectableMaterials={hasGroupRoadmapConfig ? roadmapSelectableSources : []}
        selectedRoadmapMaterialIds={hasGroupRoadmapConfig ? selectedRoadmapSourceIds : []}
        onToggleRoadmapMaterial={hasGroupRoadmapConfig ? handleToggleRoadmapSourceSelection : undefined}
        onToggleAllRoadmapMaterials={hasGroupRoadmapConfig ? handleToggleAllRoadmapSourceSelections : undefined}
        onViewRoadmapConfig={hasGroupRoadmapConfig ? handleOpenRoadmapConfigView : undefined}
        onEditRoadmapConfig={isLeader && hasGroupRoadmapConfig ? handleOpenRoadmapConfigEdit : undefined}
        roadmapEmptyStateTitle={!hasGroupRoadmapConfig
          ? t('workspace.roadmap.groupSetupPromptTitle', t('groupWorkspacePage.roadmap.setupPromptTitle', 'Set up a roadmap for your group'))
          : ''}
        roadmapEmptyStateDescription={!hasGroupRoadmapConfig
          ? t(
            'workspace.roadmap.groupSetupPromptDescription',
            t('groupWorkspacePage.roadmap.setupPromptDescription', 'Set the knowledge amount, pacing, total days, and daily study time first so the roadmap matches the group learning plan.')
          )
          : ''}
        roadmapEmptyStateActionLabel={!hasGroupRoadmapConfig
          ? t('workspace.roadmap.setupButton', t('groupWorkspacePage.roadmap.setupButton', 'Set up roadmap'))
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
    );

    if (unstyled) {
      return <div className="h-full min-h-0">{panelContent}</div>;
    }

    return (
      <div className={`rounded-[28px] border overflow-hidden ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-white/80 bg-white/82'}`} style={{ minHeight: 500 }}>
        {panelContent}
      </div>
    );
  };

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
            ? t('groupWorkspacePage.profileGate.checkingTitle', 'Checking the group profile...')
            : t('groupWorkspacePage.profileGate.completeTitle', 'Complete the group profile before continuing')}
        </h2>
        <p className={`mx-auto mt-4 max-w-2xl text-sm leading-7 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {isCheckingMandatoryProfile
            ? t('groupWorkspacePage.profileGate.checkingDescription', 'QuizMate AI is loading the current setup state for this group.')
            : t('groupWorkspacePage.profileGate.completeDescription', 'The leader must finish the shared group profile first. Until then, inviting members, uploading materials, and using studio tabs stay locked.')}
        </p>
        {!isCheckingMandatoryProfile ? (
          <button
            type="button"
            onClick={() => setProfileConfigOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            <Sparkles className="h-4 w-4" />
            {t('groupWorkspacePage.profileGate.continueSetup', 'Continue setup')}
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
              onOpenMemberStats={() => setActiveSection('memberStats')}
              onRequestAnalyticsUpgrade={() => {
                setPlanUpgradeFeatureName(t('groupWorkspacePage.planUpgrade.workspaceAnalytics', 'Workspace analytics'));
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
            planEntitlements={planEntitlements}
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
            totalMemberCount={acceptedMemberFallbackCount}
            membersLoading={membersLoading}
            isLeader={isLeader}
            onReload={loadMembers}
            onGrantUpload={grantUpload}
            onRevokeUpload={revokeUpload}
            onUpdateRole={updateMemberRole}
            onFetchMemberPermissions={fetchMemberPermissions}
            onSyncMemberPermissions={syncMemberPermissions}
            onRemoveMember={removeMember}
            onOpenInvite={() => setInviteDialogOpen(true)}
            onInvite={handleInvite}
            fetchPendingInvitations={fetchPendingInvitations}
            onCancelInvitation={cancelInvitation}
            onResendInvitation={resendInvitation}
            memberSeatLimit={memberSeatSummary.limit}
            memberSeatUsage={memberSeatSummary.usedCount}
            memberSeatRemaining={memberSeatSummary.remainingCount}
            isMemberSeatLimitReached={memberSeatSummary.isAtLimit}
            />
          </React.Suspense>
        );

      case 'memberStats':
        if (!canViewMemberDashboard) {
          return renderPersonalDashboard();
        }
        return (
          <React.Suspense fallback={renderSectionFallback(360)}>
            <LazyGroupMemberStatsTab
            isDarkMode={isDarkMode}
            workspaceId={workspaceId}
            members={members}
            membersLoading={membersLoading}
            isLeader={isLeader}
            isContributor={isContributor}
            onOpenQuizSection={() => handleStudioAction('quiz')}
            detailOnly={memberDetailWorkspaceMemberId != null}
            forcedMemberId={memberDetailWorkspaceMemberId}
            onBack={() => navigateInstant(buildGroupWorkspaceSectionPath(workspaceId, 'memberStats'))}
            onOpenMemberDetail={(member) => {
              const workspaceMemberId = resolveWorkspaceMemberId(member);
              if (!workspaceMemberId) return;
              if (!isLeader) {
                const memberUserId = resolveMemberUserId(member);
                if (memberUserId == null || String(memberUserId) !== String(currentUser?.userID)) {
                  showInfo(t('groupWorkspace.memberStats.detailLeaderOnly', 'Only leaders can open another member detail page.'));
                  return;
                }
              }
              navigateInstant(buildGroupWorkspaceDetailPath(
                workspaceId,
                `members/${workspaceMemberId}`,
                { section: 'memberStats' },
              ));
            }}
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
        return <div className="h-full">{renderStudioPanel('roadmap', { unstyled: true })}</div>;

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
              quizGenerationTaskByQuizId={quizGenerationTaskByQuizId}
              quizGenerationProgressByQuizId={quizGenerationProgressByQuizId}
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
            onGroupDeleted={handleGroupDeleted}
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
    <div className={`h-screen overflow-hidden transition-colors duration-300 ${pageShellClass}`}>
      <div className="flex h-full min-h-0 w-full gap-2 px-2 py-2">
        <div className="hidden lg:flex h-full">
          <GroupSidebar
            role={currentRoleKey}
            isDarkMode={isDarkMode}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            groupName={currentGroupName}
            wsConnected={wsConnected}
            memberCount={members.length}
            disabledMap={groupSidebarDisabledMap}
            hiddenMap={groupSidebarHiddenMap}
            badgeMap={groupSidebarBadgeMap}
            collapsed={isDesktopSidebarCollapsed}
            onToggleCollapsed={() => setIsDesktopSidebarCollapsed((current) => !current)}
            onToggleLanguage={toggleLanguage}
            onToggleDarkMode={toggleDarkMode}
            currentLang={currentLang}
          />
        </div>

        <GroupSidebar
          role={currentRoleKey}
          isDarkMode={isDarkMode}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          groupName={currentGroupName}
          wsConnected={wsConnected}
          memberCount={members.length}
          disabledMap={groupSidebarDisabledMap}
          hiddenMap={groupSidebarHiddenMap}
          badgeMap={groupSidebarBadgeMap}
          isMobile
          mobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onToggleLanguage={toggleLanguage}
          onToggleDarkMode={toggleDarkMode}
          currentLang={currentLang}
        />

        {/* Center Content Area */}
        <main className={`flex-1 flex flex-col overflow-hidden relative ${activeSection === 'roadmap' ? 'bg-transparent border-0 shadow-none rounded-none' : 'bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800'}`}>
          <div className={`flex-1 w-full hide-scrollbar ${activeSection === 'roadmap' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {!shouldForceProfileSetup ? (
            <div className="xl:hidden sticky top-0 z-20 p-2 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label={t('groupWorkspace.shell.openSidebar')}
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <span className={`ml-auto text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{currentRoleLabel}</span>
            </div>
            ) : null}
            <div className={activeSection === 'roadmap' ? 'h-full p-0 overflow-hidden' : 'p-4 md:p-5 lg:p-6'}>
              {renderContent()}
            </div>
          </div>
        </main>
      </div>

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

      {phaseGenerateDialogOpen ? (
        <React.Suspense fallback={null}>
          <LazyRoadmapPhaseGenerateDialog
            open={phaseGenerateDialogOpen}
            onOpenChange={setPhaseGenerateDialogOpen}
            isDarkMode={isDarkMode}
            materials={sources}
            defaultSelectedMaterialIds={phaseGenerateDialogDefaultIds}
            submitting={isSubmittingRoadmapPhaseRequest}
            onSubmit={handleSubmitRoadmapPhaseDialog}
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
            memberSeatLimit={memberSeatSummary.limit}
            memberSeatUsage={memberSeatSummary.usedCount}
            memberSeatRemaining={memberSeatSummary.remainingCount}
            isMemberSeatLimitReached={memberSeatSummary.isAtLimit}
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
              showInfo(t('home.group.setupComplete', t('groupWorkspacePage.setupComplete', 'Group setup complete!')));
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
          onSuggest={handleSuggestRoadmapConfig}
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
