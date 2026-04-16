import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  Eye,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Loader2,
  Map as MapIcon,
  MessageSquare,
  PenLine,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import WorkspaceOnboardingUpdateGuardDialog from '@/Components/workspace/WorkspaceOnboardingUpdateGuardDialog';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useGroup } from '@/hooks/useGroup';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNavigateWithLoading } from '@/hooks/useNavigateWithLoading';
import { getUserDisplayLabel } from '@/Utils/userProfile';
import UserDisplayName from '@/Components/users/UserDisplayName';
import {
  deleteMaterial,
  getExtractedSummary,
  getExtractedText,
  getMaterialsByWorkspace,
  getModerationReportDetail,
  renameMaterial,
  reviewMaterial as reviewLiveMaterial,
  uploadMaterial,
} from '@/api/MaterialAPI';
import { deleteQuiz, getQuizzesByScope } from '@/api/QuizAPI';
import { getGroupWorkspaceProfile, normalizeGroupWorkspaceProfile } from '@/api/WorkspaceAPI';
import { unwrapApiData, unwrapApiList } from '@/Utils/apiResponse';
import { useToast } from '@/context/ToastContext';
import GroupWorkspaceHeader from '../Components/GroupWorkspaceHeader';
import UploadSourceDialog from '../Components/UploadSourceDialog';
import InviteMemberDialog from '../Group_leader/InviteMemberDialog';
import GroupWorkspaceProfileConfigDialog from '../Components/GroupWorkspaceProfileConfigDialog';
import {
  addGroupDiscussionReply,
  createGroupReviewQuiz,
  getGroupDiscussionThread,
  getGroupReviewRoadmap,
  getGroupReviewWorkspace,
  removeGroupMaterial,
  reviewGroupMaterial,
  syncGroupReviewWorkspace,
  toggleGroupDiscussionResolved,
  updateGroupMaterial,
} from '@/lib/groupReviewMockState';
import {
  buildGroupWorkspaceDetailPath,
  buildGroupWorkspacePath,
  buildGroupWorkspaceSectionPath,
  buildQuizAttemptPath,
} from '@/lib/routePaths';

const SECTION_META = {
  overview: { labelKey: 'overview', fallback: 'Overview', icon: LayoutDashboard },
  materials: { labelKey: 'materials', fallback: 'Materials', icon: FolderOpen },
  moderation: { labelKey: 'moderation', fallback: 'Warning', icon: ShieldAlert },
  quiz: { labelKey: 'quiz', fallback: 'Quiz', icon: PenLine },
  members: { labelKey: 'members', fallback: 'Members', icon: Users },
  performance: { labelKey: 'performance', fallback: 'Performance', icon: Activity },
  roadmap: { labelKey: 'roadmap', fallback: 'Roadmap', icon: MapIcon },
  logs: { labelKey: 'logs', fallback: 'Logs', icon: ClipboardList },
};

const FLAGGED_STATES = new Set(['WARN', 'REJECT', 'REJECTED', 'NEEDS_REVIEW']);
const LEARNING_MODE_FALLBACKS = {
  STUDY_NEW: 'Learn new knowledge',
  REVIEW: 'Group review',
  MOCK_TEST: 'Group mock test',
};

function getLearningModeLabel(mode, t) {
  const key = mode && LEARNING_MODE_FALLBACKS[mode] ? mode : 'REVIEW';
  return t(`groupReview.learningMode.${key}`, LEARNING_MODE_FALLBACKS[key]);
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

function normalizeRole(role) {
  const normalized = String(role || 'MEMBER').toUpperCase();
  if (normalized === 'LEADER' || normalized === 'CONTRIBUTOR') return normalized;
  return 'MEMBER';
}

function formatRoleLabel(role, t) {
  if (!t) {
    if (role === 'LEADER') return 'Leader';
    if (role === 'CONTRIBUTOR') return 'Contributor';
    return 'Member';
  }
  if (role === 'LEADER') return t('groupReview.role.leader', 'Leader');
  if (role === 'CONTRIBUTOR') return t('groupReview.role.contributor', 'Contributor');
  return t('groupReview.role.member', 'Member');
}

function formatMaterialStatus(status, t) {
  const normalized = String(status || 'APPROVED').toUpperCase();
  const fallback = (key, fb) => (t ? t(`groupReview.status.${key}`, fb) : fb);
  if (normalized === 'WARN') return fallback('needsRecheck', 'Needs recheck');
  if (normalized === 'REJECT' || normalized === 'REJECTED') return fallback('rejected', 'Rejected');
  if (normalized === 'NEEDS_REVIEW') return fallback('needsReupload', 'Re-upload required');
  if (normalized === 'PROCESSING') return fallback('processing', 'Processing');
  if (normalized === 'UPLOADING') return fallback('uploading', 'Uploading');
  return fallback('approved', 'Approved');
}

function formatDateTime(value, lang = 'vi', t) {
  const notUpdated = t ? t('groupReview.time.notUpdated', 'Not updated') : 'Not updated';
  if (!value) return notUpdated;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return notUpdated;
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRelativeTime(value, lang = 'vi', t) {
  const noActivity = t ? t('groupReview.time.noActivity', 'No recent activity') : 'No recent activity';
  if (!value) return noActivity;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return noActivity;

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffHours < 1) return t ? t('groupReview.time.justNow', 'Just now') : 'Just now';
  if (diffHours < 24) {
    return t
      ? t('groupReview.time.hoursAgo', { count: diffHours, defaultValue: '{{count}} hour(s) ago' })
      : `${diffHours} hour(s) ago`;
  }
  if (diffDays < 7) {
    return t
      ? t('groupReview.time.daysAgo', { count: diffDays, defaultValue: '{{count}} day(s) ago' })
      : `${diffDays} day(s) ago`;
  }
  return formatDateTime(value, lang, t);
}

function parseDetailRoute(pathname, workspaceId) {
  const prefix = buildGroupWorkspacePath(workspaceId);
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const segments = rest.split('/').filter(Boolean);

  if (segments[0] === 'materials' && Number.isInteger(Number(segments[1]))) {
    return { type: 'material', materialId: Number(segments[1]) };
  }
  if (
    segments[0] === 'discussion'
    && Number.isInteger(Number(segments[1]))
    && Number.isInteger(Number(segments[2]))
  ) {
    return { type: 'discussion', quizId: Number(segments[1]), questionId: Number(segments[2]) };
  }
  if (segments[0] === 'roadmap' && Number.isInteger(Number(segments[1]))) {
    return { type: 'roadmap', roadmapId: Number(segments[1]) };
  }
  return null;
}

function getDetailSection(detailRoute) {
  if (!detailRoute) return 'overview';
  if (detailRoute.type === 'material') return 'materials';
  if (detailRoute.type === 'discussion') return 'quiz';
  if (detailRoute.type === 'roadmap') return 'roadmap';
  return 'overview';
}

function average(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  const total = numbers.reduce((sum, value) => sum + Number(value || 0), 0);
  return Math.round(total / numbers.length);
}

function findQuestionByIds(workspace, quizId, questionId) {
  const quiz = workspace?.quizzes?.find((item) => Number(item.quizId) === Number(quizId));
  if (!quiz) return { quiz: null, question: null };
  const question = (quiz.sections || [])
    .flatMap((section) => section.questions || [])
    .find((item) => Number(item.questionId) === Number(questionId));
  return { quiz, question };
}

function MetricCard({ icon: Icon, label, value, caption, tone = 'default', isDarkMode }) {
  const toneClass = tone === 'warn'
    ? (isDarkMode ? 'border-amber-400/20 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900')
    : tone === 'success'
      ? (isDarkMode ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900')
      : (isDarkMode ? 'border-white/10 bg-white/[0.03] text-white' : 'border-slate-200 bg-white text-slate-900');

  return (
    <Card className={toneClass}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
            {caption ? <p className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{caption}</p> : null}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-slate-900/70 text-cyan-200' : 'bg-slate-100 text-cyan-700'}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description, action, isDarkMode }) {
  return (
    <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
      <CardContent className="flex flex-col items-start gap-4 p-6">
        <div>
          <p className="text-base font-semibold">{title}</p>
          <p className={`mt-1 text-sm leading-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

function SectionButton({ sectionKey, active, onClick, isDarkMode, t }) {
  const meta = SECTION_META[sectionKey];
  const Icon = meta.icon;
  const label = t ? t(`groupReview.sections.${meta.labelKey}`, meta.fallback) : meta.fallback;
  return (
    <button
      type="button"
      onClick={() => onClick(sectionKey)}
      className={[
        'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-200',
        active
          ? (isDarkMode ? 'border-cyan-400/25 bg-cyan-500/10 text-white' : 'border-cyan-200 bg-cyan-50 text-slate-900')
          : (isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/20' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'),
      ].join(' ')}
    >
      <span className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${active ? (isDarkMode ? 'bg-cyan-400/15' : 'bg-white') : (isDarkMode ? 'bg-slate-900/70' : 'bg-slate-100')}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium">{label}</span>
      </span>
      <ArrowRight className="h-4 w-4 opacity-60" />
    </button>
  );
}

export default function GroupReviewWorkspaceShell() {
  const { workspaceId } = useParams();
  const location = useLocation();
  const navigate = useNavigateWithLoading();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showError, showInfo, showSuccess } = useToast();
  const currentUser = useMemo(() => readCurrentUser(), []);
  const currentLang = i18n.language || 'vi';
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';
  const isCreating = workspaceId === 'new';
  const autoCreateTriggeredRef = useRef(false);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [profileConfigOpen, setProfileConfigOpen] = useState(false);
  const [profileUpdateGuardOpen, setProfileUpdateGuardOpen] = useState(false);
  const [isResettingWorkspaceForProfileUpdate, setIsResettingWorkspaceForProfileUpdate] = useState(false);
  const [groupHasLearningData, setGroupHasLearningData] = useState(false);
  const [isBootstrappingGroup, setIsBootstrappingGroup] = useState(isCreating);
  const [sources, setSources] = useState([]);
  const [members, setMembers] = useState([]);
  const [groupProfile, setGroupProfile] = useState(null);
  const [groupLogs, setGroupLogs] = useState([]);
  const [groupProfileLoading, setGroupProfileLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [hasLoadedGroupProfile, setHasLoadedGroupProfile] = useState(isCreating);
  const [reviewWorkspace, setReviewWorkspace] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialStatusFilter, setMaterialStatusFilter] = useState('ALL');
  const [materialOwnerFilter, setMaterialOwnerFilter] = useState('ALL');
  const [materialNameDraft, setMaterialNameDraft] = useState('');
  const [materialInsight, setMaterialInsight] = useState(null);
  const [materialInsightLoading, setMaterialInsightLoading] = useState(false);
  const [discussionReply, setDiscussionReply] = useState('');
  const [isSubmittingDiscussionReply, setIsSubmittingDiscussionReply] = useState(false);
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    questionCount: 8,
    durationMinutes: 12,
    passScore: 70,
    quizIntent: 'REVIEW',
  });

  const queryClient = useQueryClient();
  const { workspaces, currentWorkspace, fetchWorkspaceDetail, createGroupWorkspace } = useWorkspace({ enabled: !isCreating });
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

  const currentGroupWorkspace = currentWorkspaceFromList
    || (String(currentWorkspace?.workspaceId) === String(workspaceId) ? currentWorkspace : null);
  const currentGroupFromGroups = groups.find((group) => String(group.workspaceId) === String(workspaceId));
  const resolvedWorkspaceId = currentGroupWorkspace?.workspaceId ?? (isCreating ? null : Number(workspaceId));
  const openProfileConfig = Boolean(location.state?.openProfileConfig);
  const actualRoleKey = normalizeRole(currentGroupWorkspace?.memberRole || currentGroupFromGroups?.memberRole || currentUser?.role);
  const isLeader = actualRoleKey === 'LEADER';
  const isContributor = actualRoleKey === 'CONTRIBUTOR';
  const resolvedGroupData = {
    groupName:
      groupProfile?.groupName
      || currentGroupFromGroups?.groupName
      || currentGroupWorkspace?.displayTitle
      || currentGroupWorkspace?.name
      || t('groupReview.fallback.groupName', 'Study group'),
    description:
      groupProfile?.groupLearningGoal
      || currentGroupFromGroups?.description
      || currentGroupWorkspace?.description
      || t('groupReview.fallback.description', 'Review UI space for group study.'),
    learningMode: groupProfile?.learningMode || 'REVIEW',
    rules: groupProfile?.rules || '',
  };
  const currentMember = useMemo(
    () => members.find((member) => Number(member.userId) === Number(currentUser?.id ?? currentUser?.userId)),
    [currentUser?.id, currentUser?.userId, members],
  );
  const canManageMembers = isLeader;
  const canCreateContent = isLeader || isContributor;
  const canUploadSource = isLeader || isContributor || Boolean(currentMember?.canUpload);
  const hasUploadedMaterials = sources.length > 0 || Boolean(groupProfile?.hasMaterials);
  const hasCompletedGroupProfile = Boolean(groupProfile?.onboardingCompleted);
  const shouldForceProfileSetup = Boolean(
    isLeader
    && resolvedWorkspaceId
    && !isCreating
    && hasLoadedGroupProfile
    && !hasCompletedGroupProfile,
  );
  const profileEditLocked = Boolean(hasUploadedMaterials && hasCompletedGroupProfile);

  const detailRoute = useMemo(
    () => parseDetailRoute(location.pathname, workspaceId),
    [location.pathname, workspaceId],
  );
  const requestedSection = searchParams.get('section');
  const activeSection = SECTION_META[requestedSection] ? requestedSection : getDetailSection(detailRoute);
  const returnToQuizPath = buildGroupWorkspaceSectionPath(resolvedWorkspaceId || 'new', 'quiz');
  const pageShellClass = isDarkMode
    ? 'min-h-screen bg-[#06131a] text-white'
    : 'min-h-screen bg-[linear-gradient(180deg,#fffaf0_0%,#f4fbf7_46%,#eef6ff_100%)] text-slate-900';

  const refreshReviewWorkspace = useCallback(() => {
    if (!resolvedWorkspaceId) return null;
    const nextWorkspace = getGroupReviewWorkspace(resolvedWorkspaceId);
    setReviewWorkspace(nextWorkspace);
    return nextWorkspace;
  }, [resolvedWorkspaceId]);

  const fetchSources = useCallback(async () => {
    if (!resolvedWorkspaceId || isCreating) return [];
    setSourcesLoading(true);
    try {
      const response = await getMaterialsByWorkspace(resolvedWorkspaceId);
      const materials = unwrapApiList(response)
        .map((item) => ({
          ...item,
          id: Number(item?.materialId ?? item?.id),
          materialId: Number(item?.materialId ?? item?.id),
          name: item?.title || item?.name || t('groupReview.fallback.untitledMaterial', 'Untitled document'),
          title: item?.title || item?.name || t('groupReview.fallback.untitledMaterial', 'Untitled document'),
          type: item?.materialType || item?.type || 'application/pdf',
          status: String(item?.status || 'APPROVED').toUpperCase(),
        }))
        .filter((item) => item.materialId > 0 && String(item.status).toUpperCase() !== 'DELETED');
      setSources(materials);
      return materials;
    } catch (error) {
      console.error('Failed to fetch group materials:', error);
      showError(error?.message || t('groupReview.toast.loadMaterialsFailed', 'Unable to load the document list.'));
      setSources([]);
      return [];
    } finally {
      setSourcesLoading(false);
    }
  }, [isCreating, resolvedWorkspaceId, showError, t]);

  const loadMembers = useCallback(async () => {
    if (!resolvedWorkspaceId || isCreating) return [];
    setMembersLoading(true);
    try {
      const data = await fetchMembers(resolvedWorkspaceId);
      setMembers(Array.isArray(data) ? data : []);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch group members:', error);
      showError(error?.message || t('groupReview.toast.loadMembersFailed', 'Unable to load group members.'));
      setMembers([]);
      return [];
    } finally {
      setMembersLoading(false);
    }
  }, [fetchMembers, isCreating, resolvedWorkspaceId, showError, t]);

  const loadGroupProfile = useCallback(async () => {
    if (!resolvedWorkspaceId || isCreating) return null;
    setGroupProfileLoading(true);
    try {
      const response = await getGroupWorkspaceProfile(resolvedWorkspaceId);
      const normalized = normalizeGroupWorkspaceProfile(unwrapApiData(response));
      setGroupProfile(normalized);
      return normalized;
    } catch (error) {
      console.error('Failed to load group profile:', error);
      setGroupProfile(null);
      return null;
    } finally {
      setHasLoadedGroupProfile(true);
      setGroupProfileLoading(false);
    }
  }, [isCreating, resolvedWorkspaceId]);

  const loadGroupLogs = useCallback(async () => {
    if (!resolvedWorkspaceId || isCreating) return [];
    setLogsLoading(true);
    try {
      const data = await fetchGroupLogs(resolvedWorkspaceId);
      const normalized = Array.isArray(data) ? data : [];
      setGroupLogs(normalized);
      return normalized;
    } catch (error) {
      console.error('Failed to load group logs:', error);
      setGroupLogs([]);
      return [];
    } finally {
      setLogsLoading(false);
    }
  }, [fetchGroupLogs, isCreating, resolvedWorkspaceId]);

  const refreshAllData = useCallback(async () => {
    if (!resolvedWorkspaceId) return;
    await Promise.all([
      fetchWorkspaceDetail(resolvedWorkspaceId).catch(() => null),
      fetchGroups().catch(() => null),
      fetchSources(),
      loadMembers(),
      loadGroupProfile(),
      loadGroupLogs(),
    ]);
  }, [fetchGroups, fetchSources, fetchWorkspaceDetail, loadGroupLogs, loadGroupProfile, loadMembers, resolvedWorkspaceId]);

  useEffect(() => {
    if (isCreating || !workspaceId || workspaceId === 'new') return;
    if (currentWorkspaceFromList?.workspaceId || String(currentWorkspace?.workspaceId) === String(workspaceId)) return;
    fetchWorkspaceDetail(workspaceId).catch((error) => {
      console.error('Failed to fetch group workspace detail:', error);
    });
  }, [currentWorkspace?.workspaceId, currentWorkspaceFromList?.workspaceId, fetchWorkspaceDetail, isCreating, workspaceId]);

  useEffect(() => {
    if (!isCreating && resolvedWorkspaceId) {
      void fetchSources();
      void loadMembers();
      void loadGroupProfile();
      void loadGroupLogs();
    }
  }, [fetchSources, isCreating, loadGroupLogs, loadGroupProfile, loadMembers, resolvedWorkspaceId]);

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
        showInfo(t('groupReview.toast.bootstrapCreating', 'Creating group workspace...'));
        const createdWorkspace = await createGroupWorkspace({ title: null });
        const createdWorkspaceId = createdWorkspace?.workspaceId;
        if (!createdWorkspaceId) {
          throw new Error(t('groupReview.toast.bootstrapFailed', 'Unable to create group workspace.'));
        }
        navigate(buildGroupWorkspacePath(createdWorkspaceId), {
          replace: true,
          state: { openProfileConfig: true },
        });
      } catch (error) {
        showError(error?.message || t('groupReview.toast.bootstrapFailed', 'Unable to create group workspace.'));
        navigate('/home', { replace: true });
      } finally {
        setIsBootstrappingGroup(false);
      }
    };

    void bootstrapGroupWorkspace();
  }, [createGroupWorkspace, isCreating, navigate, showError, showInfo, t]);

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

  const dismissProfileConfig = useCallback(() => {
    setProfileConfigOpen(false);
    if (location.state?.openProfileConfig) {
      navigate(`${location.pathname}${location.search}`, { replace: true });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!resolvedWorkspaceId || isCreating) return;
    const nextWorkspace = syncGroupReviewWorkspace({
      workspaceId: resolvedWorkspaceId,
      group: {
        ...resolvedGroupData,
        memberRole: actualRoleKey,
      },
      members,
      materials: sources,
      logs: groupLogs,
      currentUser: {
        userId: Number(currentUser?.id ?? currentUser?.userId ?? 0),
        fullName: currentUser?.fullName || currentUser?.username || currentUser?.email || t('groupReview.fallback.quizMateUser', 'QuizMate User'),
        email: currentUser?.email || 'user@quizmate.local',
        role: actualRoleKey,
      },
    });
    setReviewWorkspace(nextWorkspace);
  }, [
    actualRoleKey,
    currentUser?.email,
    currentUser?.fullName,
    currentUser?.id,
    currentUser?.userId,
    groupLogs,
    isCreating,
    members,
    resolvedGroupData.description,
    resolvedGroupData.groupName,
    resolvedWorkspaceId,
    sources,
    t,
  ]);

  useEffect(() => {
    if (!selectedMemberId && reviewWorkspace?.memberPerformance?.length) {
      setSelectedMemberId(reviewWorkspace.memberPerformance[0].userId);
    }
  }, [reviewWorkspace, selectedMemberId]);

  useEffect(() => {
    if (!profileUpdateGuardOpen || !resolvedWorkspaceId || isCreating) return;

    let cancelled = false;
    const checkLearningData = async () => {
      try {
        const quizResponse = await getQuizzesByScope('WORKSPACE', resolvedWorkspaceId);
        const quizzes = Array.isArray(quizResponse?.data) ? quizResponse.data : [];
        if (cancelled) return;
        if (quizzes.length > 0) {
          setGroupHasLearningData(true);
          return;
        }

        try {
          const { getFlashcardsByScope } = await import('@/api/FlashcardAPI');
          const flashcardResponse = await getFlashcardsByScope('WORKSPACE', resolvedWorkspaceId);
          const flashcards = Array.isArray(flashcardResponse?.data) ? flashcardResponse.data : [];
          if (!cancelled) {
            setGroupHasLearningData(flashcards.length > 0);
          }
        } catch {
          if (!cancelled) {
            setGroupHasLearningData(false);
          }
        }
      } catch {
        if (!cancelled) {
          setGroupHasLearningData(false);
        }
      }
    };

    setGroupHasLearningData(false);
    void checkLearningData();
    return () => {
      cancelled = true;
    };
  }, [isCreating, profileUpdateGuardOpen, resolvedWorkspaceId]);

  const { isConnected: wsConnected } = useWebSocket({
    workspaceId: !isCreating ? resolvedWorkspaceId : null,
    enabled: !isCreating && Boolean(resolvedWorkspaceId),
    onMaterialUploaded: () => void fetchSources(),
    onMaterialDeleted: () => void fetchSources(),
    onMaterialUpdated: () => void fetchSources(),
  });

  const warningQueue = useMemo(
    () => (reviewWorkspace?.materials || []).filter((item) => FLAGGED_STATES.has(String(item?.moderation?.state || item?.status || '').toUpperCase())),
    [reviewWorkspace?.materials],
  );
  const allMaterials = reviewWorkspace?.materials || [];
  const roadmap = reviewWorkspace?.roadmap || null;
  const quizzes = reviewWorkspace?.quizzes || [];
  const attempts = reviewWorkspace?.attempts || [];
  const discussionThreads = reviewWorkspace?.discussionThreads || [];
  const memberPerformance = reviewWorkspace?.memberPerformance || [];
  const selectedPerformance = memberPerformance.find((item) => Number(item.userId) === Number(selectedMemberId)) || memberPerformance[0] || null;
  const materialOwners = useMemo(() => {
    const owners = new Map();
    allMaterials.forEach((material) => {
      owners.set(String(material.uploaderUserId), material.uploaderName);
    });
    return Array.from(owners.entries()).map(([value, label]) => ({ value, label }));
  }, [allMaterials]);
  const filteredMaterials = useMemo(() => {
    const keyword = materialSearch.trim().toLowerCase();
    return allMaterials.filter((material) => {
      const matchesKeyword = !keyword
        || material.name?.toLowerCase().includes(keyword)
        || material.summary?.toLowerCase().includes(keyword)
        || material.excerpt?.toLowerCase().includes(keyword);
      const normalizedStatus = String(material?.moderation?.state || material?.status || 'APPROVED').toUpperCase();
      const matchesStatus = materialStatusFilter === 'ALL' || normalizedStatus === materialStatusFilter;
      const matchesOwner = materialOwnerFilter === 'ALL' || String(material?.uploaderUserId) === materialOwnerFilter;
      return matchesKeyword && matchesStatus && matchesOwner;
    });
  }, [allMaterials, materialOwnerFilter, materialSearch, materialStatusFilter]);

  const completionRate = average(memberPerformance.map((item) => item.roadmapProgress));
  const averageAccuracy = average(memberPerformance.map((item) => item.accuracy));
  const activeMembers = memberPerformance.filter((item) => item.activeDays >= 5).length;
  const unresolvedDiscussionCount = discussionThreads.filter((item) => !item.isResolved).length;
  const overdueRoadmapItems = roadmap?.phases?.filter((phase) => phase.blocker).length || 0;
  const groupMaterialDetail = detailRoute?.type === 'material'
    ? allMaterials.find((item) => Number(item.materialId) === Number(detailRoute.materialId)) || null
    : null;
  const discussionThread = detailRoute?.type === 'discussion'
    ? discussionThreads.find(
      (item) => Number(item.quizId) === Number(detailRoute.quizId) && Number(item.questionId) === Number(detailRoute.questionId),
    ) || null
    : null;
  const discussionContext = detailRoute?.type === 'discussion'
    ? findQuestionByIds(reviewWorkspace, detailRoute.quizId, detailRoute.questionId)
    : { quiz: null, question: null };
  const roadmapDetail = detailRoute?.type === 'roadmap'
    ? getGroupReviewRoadmap(resolvedWorkspaceId, detailRoute.roadmapId) || roadmap
    : null;

  useEffect(() => {
    if (detailRoute?.type !== 'discussion' || !resolvedWorkspaceId || discussionThread) return;
    const nextWorkspace = getGroupDiscussionThread(resolvedWorkspaceId, detailRoute.quizId, detailRoute.questionId);
    if (nextWorkspace) {
      setReviewWorkspace(nextWorkspace);
    }
  }, [detailRoute, discussionThread, resolvedWorkspaceId]);

  useEffect(() => {
    if (!groupMaterialDetail) {
      setMaterialNameDraft('');
      setMaterialInsight(null);
      return;
    }

    setMaterialNameDraft(groupMaterialDetail.name || '');

    if (groupMaterialDetail.source !== 'live') {
      setMaterialInsight({
        extractedText: groupMaterialDetail.excerpt || '',
        extractedSummary: groupMaterialDetail.summary || '',
        moderationDetail: groupMaterialDetail.moderation?.reason || '',
      });
      return;
    }

    let cancelled = false;
    setMaterialInsightLoading(true);
    const loadInsights = async () => {
      try {
        const [textRes, summaryRes, moderationRes] = await Promise.allSettled([
          getExtractedText(groupMaterialDetail.materialId),
          getExtractedSummary(groupMaterialDetail.materialId),
          getModerationReportDetail(groupMaterialDetail.materialId),
        ]);

        if (cancelled) return;

        setMaterialInsight({
          extractedText: textRes.status === 'fulfilled'
            ? String(unwrapApiData(textRes.value) || groupMaterialDetail.excerpt || '')
            : groupMaterialDetail.excerpt || '',
          extractedSummary: summaryRes.status === 'fulfilled'
            ? String(unwrapApiData(summaryRes.value) || groupMaterialDetail.summary || '')
            : groupMaterialDetail.summary || '',
          moderationDetail: moderationRes.status === 'fulfilled'
            ? String(unwrapApiData(moderationRes.value)?.reason || unwrapApiData(moderationRes.value)?.summary || groupMaterialDetail.moderation?.reason || '')
            : groupMaterialDetail.moderation?.reason || '',
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load material detail insight:', error);
          setMaterialInsight({
            extractedText: groupMaterialDetail.excerpt || '',
            extractedSummary: groupMaterialDetail.summary || '',
            moderationDetail: groupMaterialDetail.moderation?.reason || '',
          });
        }
      } finally {
        if (!cancelled) {
          setMaterialInsightLoading(false);
        }
      }
    };

    void loadInsights();
    return () => {
      cancelled = true;
    };
  }, [groupMaterialDetail]);

  const goToSection = useCallback((sectionKey) => {
    if (!resolvedWorkspaceId) return;
    navigate(buildGroupWorkspaceSectionPath(resolvedWorkspaceId, sectionKey));
  }, [navigate, resolvedWorkspaceId]);

  const openMaterialDetail = useCallback((materialId) => {
    if (!resolvedWorkspaceId) return;
    navigate(buildGroupWorkspaceDetailPath(resolvedWorkspaceId, `materials/${materialId}`, { section: 'materials' }));
  }, [navigate, resolvedWorkspaceId]);

  const openDiscussionDetail = useCallback((quizId, questionId) => {
    if (!resolvedWorkspaceId) return;
    navigate(
      buildGroupWorkspaceDetailPath(
        resolvedWorkspaceId,
        `discussion/${quizId}/${questionId}`,
        { section: 'quiz' },
      ),
    );
  }, [navigate, resolvedWorkspaceId]);

  const openRoadmapDetail = useCallback((roadmapId) => {
    if (!resolvedWorkspaceId) return;
    navigate(buildGroupWorkspaceDetailPath(resolvedWorkspaceId, `roadmap/${roadmapId}`, { section: 'roadmap' }));
  }, [navigate, resolvedWorkspaceId]);

  const handleInvite = useCallback(async (email) => {
    if (!canManageMembers || !resolvedWorkspaceId) {
      throw new Error(t('groupReview.toast.inviteLeaderOnly', 'Only leaders can invite members.'));
    }
    await inviteMemberHook(resolvedWorkspaceId, email);
    showSuccess(t('groupReview.toast.inviteSent', 'Member invitation sent.'));
    await Promise.all([loadMembers(), loadGroupLogs()]);
  }, [canManageMembers, inviteMemberHook, loadGroupLogs, loadMembers, resolvedWorkspaceId, showSuccess, t]);

  const handleUploadFiles = useCallback(async (files) => {
    if (shouldForceProfileSetup) {
      showError(t('groupReview.toast.profileBeforeUpload', 'Complete the group profile before uploading documents.'));
      setProfileConfigOpen(true);
      return;
    }
    if (!canUploadSource || !resolvedWorkspaceId) {
      showError(t('groupReview.toast.noUploadPermission', "You don't have permission to upload documents."));
      return;
    }

    try {
      await Promise.all(files.map((file) => uploadMaterial(file, resolvedWorkspaceId)));
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      showSuccess(t('groupReview.toast.uploadSuccess', { count: files.length, defaultValue: 'Sent {{count}} document(s) for processing.' }));
      await Promise.all([fetchSources(), loadGroupLogs()]);
    } catch (error) {
      console.error('Failed to upload materials:', error);
      showError(error?.message || t('groupReview.toast.uploadFailed', 'Document upload failed.'));
    }
  }, [canUploadSource, fetchSources, loadGroupLogs, queryClient, resolvedWorkspaceId, shouldForceProfileSetup, showError, showSuccess, t]);

  const handleRequestGroupProfileUpdate = useCallback(() => {
    if (profileEditLocked) {
      setProfileUpdateGuardOpen(true);
      return;
    }
    setProfileConfigOpen(true);
  }, [profileEditLocked]);

  const handleDeleteMaterialsForGroupProfileUpdate = useCallback(async () => {
    if (!resolvedWorkspaceId || isResettingWorkspaceForProfileUpdate) return;

    setIsResettingWorkspaceForProfileUpdate(true);
    try {
      const quizResponse = await getQuizzesByScope('WORKSPACE', resolvedWorkspaceId);
      const workspaceQuizzes = Array.isArray(quizResponse?.data) ? quizResponse.data : [];
      await Promise.all(workspaceQuizzes.map((quiz) => {
        const quizId = Number(quiz?.quizId);
        if (!Number.isInteger(quizId) || quizId <= 0) return Promise.resolve();
        return deleteQuiz(quizId);
      }));

      try {
        const { getFlashcardsByScope, deleteFlashcardSet } = await import('@/api/FlashcardAPI');
        const flashcardResponse = await getFlashcardsByScope('WORKSPACE', resolvedWorkspaceId);
        const workspaceFlashcards = Array.isArray(flashcardResponse?.data) ? flashcardResponse.data : [];
        await Promise.all(workspaceFlashcards.map((flashcard) => {
          const flashcardId = Number(flashcard?.flashcardSetId ?? flashcard?.id);
          if (!Number.isInteger(flashcardId) || flashcardId <= 0) return Promise.resolve();
          return deleteFlashcardSet(flashcardId);
        }));
      } catch (error) {
        console.error('Failed to reset flashcards for group profile update:', error);
      }

      try {
        const roadmapId = groupProfile?.roadmapId || null;
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
              if (!Number.isInteger(knowledgeId) || !Number.isInteger(phaseId) || knowledgeId <= 0 || phaseId <= 0) continue;
              await deleteRoadmapKnowledgeById(knowledgeId, phaseId);
            }
          }

          for (const phase of phases) {
            const phaseId = Number(phase?.phaseId);
            if (!Number.isInteger(phaseId) || phaseId <= 0) continue;
            await deleteRoadmapPhaseById(phaseId, roadmapId);
          }
        }
      } catch (error) {
        const status = Number(error?.response?.status);
        if (status !== 404) {
          console.error('Failed to reset roadmap structure for group profile update:', error);
        }
      }

      await Promise.all(sources.map((source) => {
        const materialId = Number(source?.materialId ?? source?.id);
        if (!Number.isInteger(materialId) || materialId <= 0) return Promise.resolve();
        return deleteMaterial(materialId);
      }));

      setSources([]);
      await Promise.all([
        fetchWorkspaceDetail(resolvedWorkspaceId).catch(() => null),
        loadGroupProfile(),
        loadGroupLogs(),
      ]);
      setProfileUpdateGuardOpen(false);
      setProfileConfigOpen(true);
      showSuccess(t('groupReview.toast.resetDataSuccess', 'Data cleared to update group onboarding.'));
    } catch (error) {
      console.error('Failed to reset workspace for group profile update:', error);
      showError(error?.message || t('groupReview.toast.resetDataFailed', 'Unable to clear workspace data.'));
    } finally {
      setIsResettingWorkspaceForProfileUpdate(false);
    }
  }, [
    fetchWorkspaceDetail,
    groupProfile?.roadmapId,
    isResettingWorkspaceForProfileUpdate,
    loadGroupLogs,
    loadGroupProfile,
    resolvedWorkspaceId,
    showError,
    showSuccess,
    sources,
    t,
  ]);

  const handleToggleUploadPermission = useCallback(async (member) => {
    if (!resolvedWorkspaceId) return;
    const memberFallback = t('groupReview.fallback.member', 'Member');
    try {
      if (member?.canUpload) {
        await revokeUpload(resolvedWorkspaceId, member.userId);
        showSuccess(t('groupReview.toast.revokeUploadSuccess', {
          name: getUserDisplayLabel(member, memberFallback),
          defaultValue: 'Upload permission revoked from {{name}}.',
        }));
      } else {
        await grantUpload(resolvedWorkspaceId, member.userId);
        showSuccess(t('groupReview.toast.grantUploadSuccess', {
          name: getUserDisplayLabel(member, memberFallback),
          defaultValue: 'Upload permission granted to {{name}}.',
        }));
      }
      await loadMembers();
    } catch (error) {
      showError(error?.message || t('groupReview.toast.updateUploadFailed', 'Unable to update upload permission.'));
    }
  }, [grantUpload, loadMembers, resolvedWorkspaceId, revokeUpload, showError, showSuccess, t]);

  const handleMemberRoleChange = useCallback(async (member, nextRole) => {
    if (!resolvedWorkspaceId || !nextRole || nextRole === member.role) return;
    const memberFallback = t('groupReview.fallback.member', 'Member');
    try {
      await updateMemberRole(resolvedWorkspaceId, member.userId, nextRole);
      showSuccess(t('groupReview.toast.updateRoleSuccess', {
        name: getUserDisplayLabel(member, memberFallback),
        defaultValue: 'Role updated for {{name}}.',
      }));
      await loadMembers();
    } catch (error) {
      showError(error?.message || t('groupReview.toast.updateRoleFailed', 'Unable to update role.'));
    }
  }, [loadMembers, resolvedWorkspaceId, showError, showSuccess, t, updateMemberRole]);

  const handleRemoveMember = useCallback(async (member) => {
    if (!resolvedWorkspaceId) return;
    const memberFallback = t('groupReview.fallback.member', 'Member');
    const displayName = getUserDisplayLabel(member, memberFallback);
    if (!window.confirm(t('groupReview.toast.removeConfirm', {
      name: displayName,
      defaultValue: 'Remove {{name}} from the group?',
    }))) return;
    try {
      await removeMember(resolvedWorkspaceId, member.userId);
      showSuccess(t('groupReview.toast.removeSuccess', {
        name: displayName,
        defaultValue: 'Removed {{name}} from the group.',
      }));
      await Promise.all([loadMembers(), loadGroupLogs()]);
    } catch (error) {
      showError(error?.message || t('groupReview.toast.removeFailed', 'Unable to remove member from the group.'));
    }
  }, [loadGroupLogs, loadMembers, removeMember, resolvedWorkspaceId, showError, showSuccess, t]);

  const handleReviewQueueAction = useCallback(async (material, decision) => {
    if (!resolvedWorkspaceId || !material) return;
    try {
      if (material.source === 'live' && decision !== 'request_reupload') {
        await reviewLiveMaterial(material.materialId, decision === 'approve');
      }
      const nextWorkspace = reviewGroupMaterial(resolvedWorkspaceId, material.materialId, decision, {
        userId: Number(currentUser?.id ?? currentUser?.userId ?? 0),
        fullName: currentUser?.fullName || currentUser?.username || currentUser?.email || t('groupReview.fallback.reviewer', 'Leader'),
        email: currentUser?.email || 'user@quizmate.local',
        role: actualRoleKey,
      });
      if (nextWorkspace) {
        setReviewWorkspace(nextWorkspace);
      } else {
        refreshReviewWorkspace();
      }
      if (material.source === 'live') {
        await Promise.all([fetchSources(), loadGroupLogs()]);
      }
      showSuccess(t('groupReview.toast.moderationUpdated', 'Moderation status updated.'));
    } catch (error) {
      console.error('Failed to review material:', error);
      showError(error?.message || t('groupReview.toast.moderationFailed', 'Unable to update moderation.'));
    }
  }, [
    actualRoleKey,
    currentUser?.email,
    currentUser?.fullName,
    currentUser?.id,
    currentUser?.userId,
    fetchSources,
    loadGroupLogs,
    refreshReviewWorkspace,
    resolvedWorkspaceId,
    showError,
    showSuccess,
    t,
  ]);

  const handleSaveMaterialName = useCallback(async () => {
    if (!resolvedWorkspaceId || !groupMaterialDetail) return;
    const trimmedName = materialNameDraft.trim();
    if (!trimmedName) {
      showError(t('groupReview.toast.materialNameRequired', 'Document name cannot be empty.'));
      return;
    }

    try {
      if (groupMaterialDetail.source === 'live') {
        await renameMaterial(groupMaterialDetail.materialId, trimmedName);
      }
      const nextWorkspace = updateGroupMaterial(resolvedWorkspaceId, groupMaterialDetail.materialId, { name: trimmedName });
      if (nextWorkspace) {
        setReviewWorkspace(nextWorkspace);
      } else {
        refreshReviewWorkspace();
      }
      if (groupMaterialDetail.source === 'live') {
        await fetchSources();
      }
      showSuccess(t('groupReview.toast.materialRenamed', 'Document name updated.'));
    } catch (error) {
      console.error('Failed to rename material:', error);
      showError(error?.message || t('groupReview.toast.materialRenameFailed', 'Unable to rename document.'));
    }
  }, [fetchSources, groupMaterialDetail, materialNameDraft, refreshReviewWorkspace, resolvedWorkspaceId, showError, showSuccess, t]);

  const handleDeleteCurrentMaterial = useCallback(async () => {
    if (!resolvedWorkspaceId || !groupMaterialDetail) return;
    if (!window.confirm(t('groupReview.toast.materialDeleteConfirm', {
      name: groupMaterialDetail.name,
      defaultValue: 'Delete the document "{{name}}"?',
    }))) return;

    try {
      if (groupMaterialDetail.source === 'live') {
        await deleteMaterial(groupMaterialDetail.materialId);
      }
      const nextWorkspace = removeGroupMaterial(resolvedWorkspaceId, groupMaterialDetail.materialId);
      if (nextWorkspace) {
        setReviewWorkspace(nextWorkspace);
      }
      if (groupMaterialDetail.source === 'live') {
        await fetchSources();
      }
      showSuccess(t('groupReview.toast.materialDeleted', 'Document deleted.'));
      navigate(buildGroupWorkspaceSectionPath(resolvedWorkspaceId || 'new', 'materials'), { replace: true });
    } catch (error) {
      console.error('Failed to delete material:', error);
      showError(error?.message || t('groupReview.toast.materialDeleteFailed', 'Unable to delete document.'));
    }
  }, [fetchSources, groupMaterialDetail, navigate, resolvedWorkspaceId, showError, showSuccess, t]);

  const handleCreateQuiz = useCallback(async () => {
    if (!resolvedWorkspaceId) return;
    const trimmedTitle = quizForm.title.trim();
    if (!trimmedTitle) {
      showError(t('groupReview.toast.quizNameRequired', 'Please enter the quiz name.'));
      return;
    }

    try {
      const nextWorkspace = createGroupReviewQuiz(resolvedWorkspaceId, quizForm, {
        userId: Number(currentUser?.id ?? currentUser?.userId ?? 0),
        fullName: currentUser?.fullName || currentUser?.username || currentUser?.email || t('groupReview.fallback.contributorFallback', 'Contributor'),
        email: currentUser?.email || 'user@quizmate.local',
        role: actualRoleKey,
      });
      if (nextWorkspace) {
        setReviewWorkspace(nextWorkspace);
      } else {
        refreshReviewWorkspace();
      }
      setQuizForm({ title: '', description: '', questionCount: 8, durationMinutes: 12, passScore: 70, quizIntent: 'REVIEW' });
      showSuccess(t('groupReview.toast.quizCreated', 'Created mock quiz for UI review.'));
    } catch (error) {
      console.error('Failed to create review quiz:', error);
      showError(error?.message || t('groupReview.toast.quizCreateFailed', 'Unable to create a new quiz.'));
    }
  }, [actualRoleKey, currentUser?.email, currentUser?.fullName, currentUser?.id, currentUser?.userId, quizForm, refreshReviewWorkspace, resolvedWorkspaceId, showError, showSuccess, t]);

  const handleStartQuiz = useCallback((quiz, mode) => {
    if (!quiz?.quizId) return;
    const attemptPath = buildQuizAttemptPath(mode, quiz.quizId);
    if (!attemptPath) return;
    navigate(attemptPath, {
      state: {
        returnToQuizPath,
        sourceWorkspaceId: Number(resolvedWorkspaceId),
        sourceView: 'group',
        autoStart: true,
      },
    });
  }, [navigate, resolvedWorkspaceId, returnToQuizPath]);

  const handleDiscussionReply = useCallback(async () => {
    if (!resolvedWorkspaceId || detailRoute?.type !== 'discussion') return;
    const trimmedReply = discussionReply.trim();
    if (!trimmedReply) return;

    setIsSubmittingDiscussionReply(true);
    try {
      const nextWorkspace = addGroupDiscussionReply(
        resolvedWorkspaceId,
        detailRoute.quizId,
        detailRoute.questionId,
        trimmedReply,
        {
          userId: Number(currentUser?.id ?? currentUser?.userId ?? 0),
          fullName: currentUser?.fullName || currentUser?.username || currentUser?.email || t('groupReview.fallback.member', 'Member'),
          email: currentUser?.email || 'user@quizmate.local',
          role: actualRoleKey,
        },
      );
      if (nextWorkspace) {
        setReviewWorkspace(nextWorkspace);
      } else {
        refreshReviewWorkspace();
      }
      setDiscussionReply('');
      showSuccess(t('groupReview.toast.replySent', 'Reply sent in discussion.'));
    } catch (error) {
      console.error('Failed to send discussion reply:', error);
      showError(error?.message || t('groupReview.toast.replyFailed', 'Unable to send reply.'));
    } finally {
      setIsSubmittingDiscussionReply(false);
    }
  }, [actualRoleKey, currentUser?.email, currentUser?.fullName, currentUser?.id, currentUser?.userId, detailRoute, discussionReply, refreshReviewWorkspace, resolvedWorkspaceId, showError, showSuccess, t]);

  const handleToggleThreadResolved = useCallback(async (thread) => {
    if (!resolvedWorkspaceId || !thread) return;
    try {
      const nextWorkspace = toggleGroupDiscussionResolved(
        resolvedWorkspaceId,
        thread.threadId,
        !thread.isResolved,
        {
          userId: Number(currentUser?.id ?? currentUser?.userId ?? 0),
          fullName: currentUser?.fullName || currentUser?.username || currentUser?.email || t('groupReview.fallback.reviewer', 'Leader'),
          email: currentUser?.email || 'user@quizmate.local',
          role: actualRoleKey,
        },
      );
      if (nextWorkspace) {
        setReviewWorkspace(nextWorkspace);
      } else {
        refreshReviewWorkspace();
      }
      showSuccess(thread.isResolved
        ? t('groupReview.toast.threadReopened', 'Discussion reopened.')
        : t('groupReview.toast.threadResolved', 'Discussion marked as resolved.'));
    } catch (error) {
      console.error('Failed to update discussion state:', error);
      showError(error?.message || t('groupReview.toast.threadUpdateFailed', 'Unable to update discussion.'));
    }
  }, [actualRoleKey, currentUser?.email, currentUser?.fullName, currentUser?.id, currentUser?.userId, refreshReviewWorkspace, resolvedWorkspaceId, showError, showSuccess, t]);

  const headerSettingsMenu = (
    <div className="hidden items-center gap-2 md:flex">
      <Button variant="outline" size="sm" onClick={() => void refreshAllData()}>
        <RefreshCw className="h-4 w-4" />
        {t('groupReview.header.refresh', 'Refresh')}
      </Button>
      <Button variant="outline" size="sm" onClick={handleRequestGroupProfileUpdate}>
        <Sparkles className="h-4 w-4" />
        {t('groupReview.header.groupProfile', 'Group profile')}
      </Button>
      {canUploadSource ? (
        <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4" />
          {t('groupReview.header.upload', 'Upload')}
        </Button>
      ) : null}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label={t('groupReview.metrics.activeMembers', 'Active members')} value={`${activeMembers}/${reviewWorkspace?.members?.length || 0}`} caption={t('groupReview.metrics.activeMembersCaption', 'Members with a steady weekly participation rhythm.')} isDarkMode={isDarkMode} />
        <MetricCard icon={FolderOpen} label={t('groupReview.metrics.materialsInGroup', 'Group documents')} value={allMaterials.length} caption={t('groupReview.metrics.materialsInGroupCaption', { count: warningQueue.length, defaultValue: '{{count}} document(s) currently in the warning queue.' })} tone={warningQueue.length > 0 ? 'warn' : 'default'} isDarkMode={isDarkMode} />
        <MetricCard icon={PenLine} label={t('groupReview.metrics.accuracy', 'Accuracy')} value={`${averageAccuracy}%`} caption={t('groupReview.metrics.accuracyCaption', 'Current average score of the whole group.')} tone={averageAccuracy >= 70 ? 'success' : 'warn'} isDarkMode={isDarkMode} />
            <MetricCard icon={MapIcon} label={t('groupReview.metrics.roadmapProgress', 'Roadmap progress')} value={`${completionRate}%`} caption={t('groupReview.metrics.roadmapProgressCaption', { count: overdueRoadmapItems, defaultValue: '{{count}} item(s) blocked and need leader action.' })} isDarkMode={isDarkMode} />
      </div>

      <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
        <CardHeader>
          <CardTitle className="text-xl">{t('groupReview.overview.hubTitle', 'Group management and study hub')}</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            {t('groupReview.overview.hubDescription', 'Review end-to-end for materials, moderation, quiz, discussion, performance dashboard and roadmap in a single shell.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.3fr,0.9fr]">
          <div className={`rounded-3xl border p-5 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{formatRoleLabel(actualRoleKey, t)}</Badge>
              <Badge variant="outline">{getLearningModeLabel(resolvedGroupData.learningMode, t)}</Badge>
              <Badge variant="outline">{hasCompletedGroupProfile ? t('groupReview.overview.profileComplete', 'Profile complete') : t('groupReview.overview.profileIncomplete', 'Profile needs update')}</Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold">{resolvedGroupData.groupName}</h2>
            <p className={`mt-3 text-sm leading-7 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{resolvedGroupData.description}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => goToSection('materials')}><FolderOpen className="h-4 w-4" />{t('groupReview.overview.reviewMaterials', 'Review materials')}</Button>
              <Button variant="outline" onClick={() => goToSection('performance')}><Activity className="h-4 w-4" />{t('groupReview.overview.viewDashboard', 'View dashboard')}</Button>
              <Button variant="outline" onClick={() => goToSection('quiz')}><PenLine className="h-4 w-4" />{t('groupReview.overview.createQuiz', 'Create quiz')}</Button>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('groupReview.overview.hotspotsTitle', 'Hotspots that need action')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-amber-400/20 bg-amber-500/10' : 'border-amber-200 bg-amber-50'}`}>
                  <p className="text-sm font-semibold">{t('groupReview.overview.moderationQueue', 'Moderation queue')}</p>
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-amber-100/80' : 'text-amber-800'}`}>{t('groupReview.overview.moderationQueueDetail', { count: warningQueue.length, defaultValue: '{{count}} document(s) need leader or contributor review.' })}</p>
                </div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-cyan-400/20 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50'}`}>
                  <p className="text-sm font-semibold">{t('groupReview.overview.openDiscussions', 'Open discussions')}</p>
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-cyan-100/80' : 'text-cyan-800'}`}>{t('groupReview.overview.openDiscussionsDetail', { count: unresolvedDiscussionCount, defaultValue: '{{count}} thread(s) unresolved, openable from quiz or result screens.' })}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
          <CardHeader>
            <CardTitle className="text-lg">{t('groupReview.overview.recentMaterialsTitle', 'New materials and warning queue')}</CardTitle>
            <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              {t('groupReview.overview.recentMaterialsDescription', 'Lane to manage member uploads and the moderation queue.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {allMaterials.slice(0, 4).map((material) => (
              <button key={material.materialId} type="button" onClick={() => openMaterialDetail(material.materialId)} className={`w-full rounded-2xl border p-4 text-left transition-all ${isDarkMode ? 'border-white/10 bg-slate-950/50 hover:border-white/20' : 'border-slate-200 bg-slate-50/80 hover:border-slate-300'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{material.name}</p>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{material.uploaderName} • {formatMaterialStatus(material.moderation?.state || material.status, t)}</p>
                  </div>
                  <Badge variant="outline">{material.source === 'live' ? t('groupReview.materials.sourceLive', 'Live') : t('groupReview.materials.sourceMock', 'Mock')}</Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
          <CardHeader>
            <CardTitle className="text-lg">{t('groupReview.overview.quizDiscussionsTitle', 'Per-question quiz discussion')}</CardTitle>
            <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              {t('groupReview.overview.quizDiscussionsDescription', 'Deep-link discussions opened from quiz results or the quiz studio.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {discussionThreads.slice(0, 4).map((thread) => (
              <button key={thread.threadId} type="button" onClick={() => openDiscussionDetail(thread.quizId, thread.questionId)} className={`w-full rounded-2xl border p-4 text-left transition-all ${isDarkMode ? 'border-white/10 bg-slate-950/50 hover:border-white/20' : 'border-slate-200 bg-slate-50/80 hover:border-slate-300'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{thread.title}</p>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('groupReview.overview.repliesCount', { count: thread.messages.length, defaultValue: '{{count}} reply/replies' })} • {thread.isResolved ? t('groupReview.overview.threadResolved', 'Resolved') : t('groupReview.overview.threadOpen', 'Open')}</p>
                  </div>
                  {thread.unreadCount > 0 ? <Badge>{t('groupReview.overview.newBadge', { count: thread.unreadCount, defaultValue: '{{count}} new' })}</Badge> : <Badge variant="outline">{t('groupReview.overview.trackingBadge', 'Tracking')}</Badge>}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderMaterials = () => (
    <div className="space-y-6">
      <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
        <CardHeader>
          <CardTitle className="text-lg">{t('groupReview.materials.title', 'Member materials')}</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            {t('groupReview.materials.description', 'Manage documents uploaded in the group, filter by uploader and status, and view extracted details.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1.4fr,0.8fr,0.8fr]">
            <Input value={materialSearch} onChange={(event) => setMaterialSearch(event.target.value)} placeholder={t('groupReview.materials.searchPlaceholder', 'Search by document name or summary')} className={isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : ''} />
            <select value={materialStatusFilter} onChange={(event) => setMaterialStatusFilter(event.target.value)} className={`h-10 rounded-md border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="ALL">{t('groupReview.materials.filterAllStatus', 'All statuses')}</option>
              <option value="APPROVED">{t('groupReview.status.approved', 'Approved')}</option>
              <option value="WARN">{t('groupReview.status.needsRecheck', 'Needs recheck')}</option>
              <option value="REJECT">{t('groupReview.status.rejected', 'Rejected')}</option>
              <option value="NEEDS_REVIEW">{t('groupReview.status.needsReupload', 'Re-upload required')}</option>
              <option value="PROCESSING">{t('groupReview.status.processing', 'Processing')}</option>
            </select>
            <select value={materialOwnerFilter} onChange={(event) => setMaterialOwnerFilter(event.target.value)} className={`h-10 rounded-md border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="ALL">{t('groupReview.materials.filterAllOwners', 'All uploaders')}</option>
              {materialOwners.map((owner) => <option key={owner.value} value={owner.value}>{owner.label}</option>)}
            </select>
          </div>

          {filteredMaterials.length === 0 ? (
            <EmptyState title={t('groupReview.materials.emptyTitle', 'No documents match the filters')} description={t('groupReview.materials.emptyDescription', 'Try another status, uploader, or upload more documents to review.')} action={canUploadSource ? <Button onClick={() => setUploadDialogOpen(true)}><Upload className="h-4 w-4" />{t('groupReview.materials.uploadButton', 'Upload document')}</Button> : null} isDarkMode={isDarkMode} />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredMaterials.map((material) => (
                <Card key={material.materialId} className={isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">{material.name}</p>
                        <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{material.uploaderName} • {formatDateTime(material.uploadedAt, currentLang, t)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{formatMaterialStatus(material.moderation?.state || material.status, t)}</Badge>
                        <Badge variant="outline">{material.source === 'live' ? t('groupReview.materials.sourceLive', 'Live') : t('groupReview.materials.sourceMock', 'Mock')}</Badge>
                      </div>
                    </div>
                    <p className={`mt-4 line-clamp-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{material.summary || material.excerpt || t('groupReview.materials.noSummary', 'No summary for this document yet.')}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openMaterialDetail(material.materialId)}><Eye className="h-4 w-4" />{t('groupReview.materials.viewDetail', 'View detail')}</Button>
                      {FLAGGED_STATES.has(String(material.moderation?.state || material.status).toUpperCase()) ? <Button size="sm" onClick={() => goToSection('moderation')} className="bg-amber-600 text-white hover:bg-amber-700"><ShieldAlert className="h-4 w-4" />{t('groupReview.materials.openModeration', 'Open moderation')}</Button> : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderModeration = () => (
    <div className="space-y-6">
      <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
        <CardHeader>
          <CardTitle className="text-lg">{t('groupReview.moderation.title', 'Moderation queue')}</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            {t('groupReview.moderation.description', 'Queue of documents that are flagged, rejected, or need re-upload. Each action pushes an event to the mock logs.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {warningQueue.length === 0 ? (
            <EmptyState title={t('groupReview.moderation.emptyTitle', 'No documents need review')} description={t('groupReview.moderation.emptyDescription', 'Moderation queue is empty. You can go back to the materials hub to view all documents.')} action={<Button onClick={() => goToSection('materials')}>{t('groupReview.moderation.openMaterialsHub', 'Open materials hub')}</Button>} isDarkMode={isDarkMode} />
          ) : (
            warningQueue.map((material) => (
              <Card key={material.materialId} className={isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold">{material.name}</p>
                      <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{material.uploaderName} • {formatRoleLabel(material.uploaderRole, t)}</p>
                    </div>
                    <Badge variant="outline">{formatMaterialStatus(material.moderation?.state || material.status, t)}</Badge>
                  </div>
                  <p className={`mt-4 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{material.moderation?.reason || material.summary || t('groupReview.moderation.needsReview', 'Document needs further review before being used in the group.')}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void handleReviewQueueAction(material, 'approve')} className="bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle2 className="h-4 w-4" />{t('groupReview.moderation.approve', 'Approve')}</Button>
                    <Button size="sm" variant="outline" onClick={() => void handleReviewQueueAction(material, 'request_reupload')}><RefreshCw className="h-4 w-4" />{t('groupReview.moderation.requestReupload', 'Request re-upload')}</Button>
                    <Button size="sm" variant="destructive" onClick={() => void handleReviewQueueAction(material, 'reject')}><Trash2 className="h-4 w-4" />{t('groupReview.moderation.reject', 'Reject')}</Button>
                    <Button size="sm" variant="outline" onClick={() => openMaterialDetail(material.materialId)}><Eye className="h-4 w-4" />{t('groupReview.moderation.viewDetail', 'View detail')}</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderQuiz = () => (
    <div className="space-y-6">
      {canCreateContent ? (
        <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
          <CardHeader>
            <CardTitle className="text-lg">{t('groupReview.quiz.studioTitle', 'Quiz studio')}</CardTitle>
            <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              {t('groupReview.quiz.studioDescription', 'Create a mock quiz to review the flow of studio, practice, exam, result, and per-question discussion.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <Input value={quizForm.title} onChange={(event) => setQuizForm((prev) => ({ ...prev, title: event.target.value }))} placeholder={t('groupReview.quiz.namePlaceholder', 'Quiz name')} className={isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : ''} />
            <select value={quizForm.quizIntent} onChange={(event) => setQuizForm((prev) => ({ ...prev, quizIntent: event.target.value }))} className={`h-10 rounded-md border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="PRE_LEARNING">{t('groupReview.quiz.intentPreLearning', 'Pre-learning')}</option>
              <option value="REVIEW">{t('groupReview.quiz.intentReview', 'Review')}</option>
              <option value="POST_LEARNING">{t('groupReview.quiz.intentPostLearning', 'Post-learning')}</option>
            </select>
            <textarea value={quizForm.description} onChange={(event) => setQuizForm((prev) => ({ ...prev, description: event.target.value }))} placeholder={t('groupReview.quiz.descriptionPlaceholder', 'Quiz description')} className={`min-h-[110px] rounded-md border px-3 py-2 text-sm outline-none lg:col-span-2 ${isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white placeholder:text-slate-500' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'}`} />
            <Input type="number" min={5} max={30} value={quizForm.questionCount} onChange={(event) => setQuizForm((prev) => ({ ...prev, questionCount: Number(event.target.value || 0) }))} placeholder={t('groupReview.quiz.questionCountPlaceholder', 'Question count')} className={isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : ''} />
            <Input type="number" min={5} value={quizForm.durationMinutes} onChange={(event) => setQuizForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value || 0) }))} placeholder={t('groupReview.quiz.durationPlaceholder', 'Duration (minutes)')} className={isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : ''} />
            <Input type="number" min={50} max={100} value={quizForm.passScore} onChange={(event) => setQuizForm((prev) => ({ ...prev, passScore: Number(event.target.value || 0) }))} placeholder={t('groupReview.quiz.passScorePlaceholder', 'Pass score')} className={isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : ''} />
            <div className="flex items-center justify-end">
              <Button onClick={() => void handleCreateQuiz()} className="bg-cyan-600 text-white hover:bg-cyan-700"><Plus className="h-4 w-4" />{t('groupReview.quiz.createMockQuiz', 'Create mock quiz')}</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {quizzes.map((quiz) => {
          const recentHistory = Array.isArray(quiz.history) ? quiz.history[0] : null;
          const firstQuestion = quiz.sections?.[0]?.questions?.[0] || null;
          return (
            <Card key={quiz.quizId} className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{quiz.title}</p>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('groupReview.quiz.questionCountLabel', { count: quiz.questionCount, defaultValue: '{{count}} questions' })} • {t('groupReview.quiz.minutesLabel', { count: Math.round(Number(quiz.duration || 0) / 60), defaultValue: '{{count}} min' })} • {quiz.ownerName}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{quiz.quizIntent}</Badge>
                    <Badge variant="outline">{quiz.status}</Badge>
                  </div>
                </div>
                <p className={`mt-4 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{quiz.description}</p>
                {recentHistory ? (
                  <div className={`mt-4 rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                    <p className="text-sm font-semibold">{t('groupReview.quiz.lastAttempt', 'Last attempt')}</p>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{recentHistory.score}% • {recentHistory.passed ? t('groupReview.quiz.attemptPassed', 'Passed') : t('groupReview.quiz.attemptFailed', 'Not passed')} • {formatDateTime(recentHistory.completedAt, currentLang, t)}</p>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleStartQuiz(quiz, 'practice')}><BookOpen className="h-4 w-4" />{t('groupReview.quiz.practice', 'Practice')}</Button>
                  <Button size="sm" variant="outline" onClick={() => handleStartQuiz(quiz, 'exam')}><Clock3 className="h-4 w-4" />{t('groupReview.quiz.exam', 'Exam')}</Button>
                  {firstQuestion ? <Button size="sm" variant="outline" onClick={() => openDiscussionDetail(quiz.quizId, firstQuestion.questionId)}><MessageSquare className="h-4 w-4" />{t('groupReview.quiz.discussionQuestion1', 'Question 1 discussion')}</Button> : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
        <CardHeader>
          <CardTitle className="text-lg">{t('groupReview.quiz.recentAttemptsTitle', 'Recent attempts')}</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            {t('groupReview.quiz.recentAttemptsDescription', 'Latest quiz attempt history in the group.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {attempts.length === 0 ? (
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('groupReview.quiz.noAttempts', 'No attempts yet in the mock review.')}</p>
          ) : (
            attempts.slice().sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime()).slice(0, 5).map((attempt) => (
              <div key={attempt.attemptId} className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{attempt.userName}</p>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{attempt.isPracticeMode ? t('groupReview.quiz.attemptModePractice', 'Practice') : t('groupReview.quiz.attemptModeExam', 'Exam')} • {attempt.status} • {formatDateTime(attempt.startedAt, currentLang, t)}</p>
                  </div>
                  {attempt.result ? <Badge>{attempt.result.score}%</Badge> : <Badge variant="outline">{t('groupReview.quiz.attemptOngoing', 'Ongoing')}</Badge>}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
  const renderMembers = () => (
    <div className="space-y-6">
      <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
        <CardHeader>
          <CardTitle className="text-lg">{t('groupReview.members.title', 'Member UI by role')}</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            {t('groupReview.members.description', 'Leaders manage the roster and upload permissions, contributors follow content lanes, members review personal progress.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {(reviewWorkspace?.members || []).map((member) => {
            const perf = memberPerformance.find((item) => Number(item.userId) === Number(member.userId));
            return (
              <Card key={member.userId} className={isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold">
                        <UserDisplayName user={member} fallback={t('groupReview.fallback.member', 'Member')} isDarkMode={isDarkMode} />
                      </p>
                      <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{member.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{formatRoleLabel(member.role, t)}</Badge>
                      <Badge variant="outline">{member.canUpload ? t('groupReview.members.uploadGranted', 'Can upload') : t('groupReview.members.uploadReadOnly', 'View only')}</Badge>
                    </div>
                  </div>

                  {perf ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className={`rounded-2xl border p-3 ${isDarkMode ? 'border-white/10 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
                        <p className={`text-xs uppercase tracking-[0.12em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('groupReview.members.accuracy', 'Accuracy')}</p>
                        <p className="mt-2 text-xl font-semibold">{perf.accuracy}%</p>
                      </div>
                      <div className={`rounded-2xl border p-3 ${isDarkMode ? 'border-white/10 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
                        <p className={`text-xs uppercase tracking-[0.12em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('groupReview.members.roadmap', 'Roadmap')}</p>
                        <p className="mt-2 text-xl font-semibold">{perf.roadmapProgress}%</p>
                      </div>
                      <div className={`rounded-2xl border p-3 ${isDarkMode ? 'border-white/10 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
                        <p className={`text-xs uppercase tracking-[0.12em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('groupReview.members.discussion', 'Discussion')}</p>
                        <p className="mt-2 text-xl font-semibold">{perf.discussionCount}</p>
                      </div>
                    </div>
                  ) : null}

                  {canManageMembers ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <select
                        value={member.role}
                        onChange={(event) => void handleMemberRoleChange(member, event.target.value)}
                        disabled={member.isCurrentUser}
                        className={`h-9 rounded-md border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
                      >
                        <option value="LEADER">{t('groupReview.role.leader', 'Leader')}</option>
                        <option value="CONTRIBUTOR">{t('groupReview.role.contributor', 'Contributor')}</option>
                        <option value="MEMBER">{t('groupReview.role.member', 'Member')}</option>
                      </select>
                      <Button size="sm" variant="outline" onClick={() => void handleToggleUploadPermission(member)} disabled={member.isCurrentUser}>
                        {member.canUpload ? t('groupReview.members.revokeUpload', 'Revoke upload') : t('groupReview.members.grantUpload', 'Grant upload')}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void handleRemoveMember(member)} disabled={member.isCurrentUser}>
                        {t('groupReview.members.removeMember', 'Remove member')}
                      </Button>
                    </div>
                  ) : (
                    <p className={`mt-4 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {t('groupReview.members.personalLane', {
                        focus: perf?.recentFocus || t('groupReview.members.personalLaneDefault', 'Track progress, assigned quizzes, and followed discussions.'),
                        defaultValue: 'Personal lane: {{focus}}',
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Target} label={t('groupReview.metrics.completionRate', 'Completion rate')} value={`${completionRate}%`} caption={t('groupReview.metrics.completionRateCaption', 'Average roadmap progress for the group.')} isDarkMode={isDarkMode} />
        <MetricCard icon={CheckCircle2} label={t('groupReview.metrics.scoreTrend', 'Score trend')} value={`${averageAccuracy}%`} caption={t('groupReview.metrics.scoreTrendCaption', 'Average score of completed attempts.')} isDarkMode={isDarkMode} />
        <MetricCard icon={Users} label={t('groupReview.metrics.activeMembers', 'Active members')} value={activeMembers} caption={t('groupReview.metrics.activeMembersCountCaption', 'Members with at least 5 days of activity.')} isDarkMode={isDarkMode} />
        <MetricCard icon={AlertTriangle} label={t('groupReview.metrics.pendingReview', 'Pending review')} value={warningQueue.length} caption={t('groupReview.metrics.pendingReviewCaption', 'Flagged documents waiting for moderation.')} tone={warningQueue.length > 0 ? 'warn' : 'success'} isDarkMode={isDarkMode} />
      </div>

      <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
        <CardHeader>
          <CardTitle className="text-lg">{t('groupReview.performance.title', 'Per-member performance review')}</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            {t('groupReview.performance.description', 'View accuracy, streak, roadmap progress, upload outcomes, recent logs, and discussion participation.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
          <div className="space-y-3">
            {memberPerformance.map((member) => (
              <button
                key={member.userId}
                type="button"
                onClick={() => setSelectedMemberId(member.userId)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${Number(selectedMemberId) === Number(member.userId) ? (isDarkMode ? 'border-cyan-400/25 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50') : (isDarkMode ? 'border-white/10 bg-slate-950/60 hover:border-white/20' : 'border-slate-200 bg-slate-50/80 hover:border-slate-300')}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      <UserDisplayName user={member} fallback={t('groupReview.fallback.member', 'Member')} isDarkMode={isDarkMode} />
                    </p>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {formatRoleLabel(member.role, t)} • {t('groupReview.members.streakLabel', { count: member.currentStreak, defaultValue: '{{count}} day streak' })}
                    </p>
                  </div>
                  <Badge variant="outline">{member.accuracy}%</Badge>
                </div>
              </button>
            ))}
          </div>

          {selectedPerformance ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Target} label={t('groupReview.metrics.accuracyShort', 'Accuracy')} value={`${selectedPerformance.accuracy}%`} caption={t('groupReview.metrics.accuracyShortCaption', 'Current average score.')} isDarkMode={isDarkMode} />
            <MetricCard icon={MapIcon} label={t('groupReview.metrics.roadmapLabel', 'Roadmap')} value={`${selectedPerformance.roadmapProgress}%`} caption={t('groupReview.metrics.roadmapCaption', 'Personal roadmap progress.')} isDarkMode={isDarkMode} />
                <MetricCard icon={Upload} label={t('groupReview.metrics.uploadOk', 'Upload OK')} value={selectedPerformance.uploadsApproved} caption={t('groupReview.metrics.uploadOkCaption', { warned: selectedPerformance.uploadsWarned, rejected: selectedPerformance.uploadsRejected, defaultValue: '{{warned}} warning • {{rejected}} reject' })} isDarkMode={isDarkMode} />
                <MetricCard icon={MessageSquare} label={t('groupReview.metrics.discussion', 'Discussion')} value={selectedPerformance.discussionCount} caption={t('groupReview.metrics.discussionCaption', { count: selectedPerformance.activeDays, defaultValue: 'Active {{count}} day(s)' })} isDarkMode={isDarkMode} />
              </div>

              <Card className={isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}>
                <CardContent className="p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-semibold">{t('groupReview.performance.scoreTrendTitle', 'Score trend')}</p>
                      <div className="mt-3 flex items-end gap-2">
                        {selectedPerformance.scoreTrend.map((value, index) => (
                          <div key={`${selectedPerformance.userId}-${index}`} className="flex-1">
                            <div className={`rounded-t-xl ${isDarkMode ? 'bg-cyan-400/60' : 'bg-cyan-500'}`} style={{ height: `${Math.max(24, value)}px` }} />
                            <p className={`mt-2 text-center text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('groupReview.performance.weekLabel', { index: index + 1, defaultValue: 'W{{index}}' })}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold">{t('groupReview.performance.recentFocusTitle', 'Recent highlights')}</p>
                      <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {selectedPerformance.recentFocus}
                      </p>
                      <p className={`mt-3 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {t('groupReview.performance.lastActivity', 'Last activity:')} {formatRelativeTime(selectedPerformance.lastActiveAt, currentLang, t)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
  const renderRoadmap = () => (
    <div className="space-y-6">
      <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
        <CardHeader>
          <CardTitle className="text-lg">{t('groupReview.roadmap.title', 'Roadmap board')}</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            {t('groupReview.roadmap.description', 'Phases, knowledge, progress, owner, blockers, and quiz-material links to review the full group flow.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{t('groupReview.roadmap.phases', { count: roadmap?.stats?.phaseCount || 0, defaultValue: '{{count}} phases' })}</Badge>
              <Badge variant="outline">{t('groupReview.roadmap.knowledges', { count: roadmap?.stats?.knowledgeCount || 0, defaultValue: '{{count}} knowledges' })}</Badge>
              <Badge variant="outline">{t('groupReview.roadmap.quizzes', { count: roadmap?.stats?.quizCount || quizzes.length, defaultValue: '{{count}} quizzes' })}</Badge>
            </div>
            {roadmap?.roadmapId ? (
              <Button variant="outline" onClick={() => openRoadmapDetail(roadmap.roadmapId)}>
                <Eye className="h-4 w-4" />
                {t('groupReview.roadmap.drillDown', 'Drill-down roadmap')}
              </Button>
            ) : null}
          </div>

          {(roadmap?.phases || []).map((phase) => {
            const owner = reviewWorkspace?.members?.find((member) => Number(member.userId) === Number(phase.ownerUserId));
            return (
              <Card key={phase.phaseId} className={isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold">{phase.title}</p>
                      <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {t('groupReview.roadmap.ownerLine', {
                          owner: owner?.fullName || t('groupReview.roadmap.ownerUnassigned', 'Unassigned'),
                          progress: phase.progress,
                          defaultValue: 'Owner: {{owner}} • Progress {{progress}}%',
                        })}
                      </p>
                    </div>
                    {phase.blocker ? <Badge variant="outline">{t('groupReview.roadmap.blocked', 'Blocked')}</Badge> : <Badge variant="outline">{t('groupReview.roadmap.onTrack', 'On track')}</Badge>}
                  </div>

                  {phase.blocker ? (
                    <div className={`mt-4 rounded-2xl border p-4 ${isDarkMode ? 'border-amber-400/20 bg-amber-500/10' : 'border-amber-200 bg-amber-50'}`}>
                      <p className={`text-sm ${isDarkMode ? 'text-amber-100/85' : 'text-amber-900'}`}>{phase.blocker}</p>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {(phase.knowledges || []).map((knowledge) => (
                      <div key={knowledge.knowledgeId} className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
                        <p className="font-medium">{knowledge.title}</p>
                        <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {t('groupReview.roadmap.knowledgeLine', {
                            progress: knowledge.progress,
                            count: knowledge.relatedQuizIds.length,
                            defaultValue: 'Progress {{progress}}% • {{count}} related quizzes',
                          })}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {knowledge.relatedQuizIds.slice(0, 1).map((quizId) => {
                            const quiz = quizzes.find((item) => Number(item.quizId) === Number(quizId));
                            return quiz ? (
                              <Button key={quizId} size="sm" variant="outline" onClick={() => handleStartQuiz(quiz, 'practice')}>
                                <BookOpen className="h-4 w-4" />
                                {t('groupReview.roadmap.practice', 'Practice')}
                              </Button>
                            ) : null;
                          })}
                          {knowledge.relatedMaterialIds.slice(0, 1).map((materialId) => {
                            const material = allMaterials.find((item) => Number(item.materialId) === Number(materialId));
                            return material ? (
                              <Button key={materialId} size="sm" variant="outline" onClick={() => openMaterialDetail(material.materialId)}>
                                <FileText className="h-4 w-4" />
                                {t('groupReview.roadmap.material', 'Material')}
                              </Button>
                            ) : null;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-6">
      <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
        <CardHeader>
          <CardTitle className="text-lg">{t('groupReview.logs.title', 'Activity logs')}</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            {t('groupReview.logs.description', 'Aggregated logs from live activity and mock events generated when moderation, discussion, or quiz change.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(reviewWorkspace?.logs || []).map((log) => (
            <div key={log.logId} className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{log.action}</p>
                  <p className={`mt-1 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {log.description}
                  </p>
                </div>
                <Badge variant="outline">{log.source === 'live' ? t('groupReview.materials.sourceLive', 'Live') : t('groupReview.materials.sourceMock', 'Mock')}</Badge>
              </div>
              <p className={`mt-3 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {log.actorName || log.actorEmail} • {formatDateTime(log.logTime, currentLang, t)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
  const renderMaterialDetail = () => {
    if (!groupMaterialDetail) {
      return (
        <EmptyState
          title={t('groupReview.materialDetail.emptyTitle', 'Document not found')}
          description={t('groupReview.materialDetail.emptyDescription', 'Material detail may have been deleted or is not synced yet.')}
          action={<Button onClick={() => goToSection('materials')}>{t('groupReview.materialDetail.backToMaterials', 'Back to materials')}</Button>}
          isDarkMode={isDarkMode}
        />
      );
    }

    const normalizedState = String(groupMaterialDetail.moderation?.state || groupMaterialDetail.status || '').toUpperCase();

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => navigate(buildGroupWorkspaceSectionPath(resolvedWorkspaceId || 'new', 'materials'))}>
            <ArrowLeft className="h-4 w-4" />
            {t('groupReview.materialDetail.backToMaterials', 'Back to materials')}
          </Button>
          <Badge variant="outline">{formatMaterialStatus(normalizedState, t)}</Badge>
          <Badge variant="outline">{groupMaterialDetail.source === 'live' ? t('groupReview.materialDetail.liveMaterial', 'Live material') : t('groupReview.materialDetail.mockMaterial', 'Mock material')}</Badge>
        </div>

        <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
          <CardHeader>
            <CardTitle className="text-lg">{t('groupReview.materialDetail.title', 'Manage uploaded document')}</CardTitle>
            <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              {t('groupReview.materialDetail.description', 'View extracted text, summary, moderation report, and perform rename / delete / review actions.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="space-y-4">
                <div>
                  <p className={`mb-2 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{t('groupReview.materialDetail.documentName', 'Document name')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Input value={materialNameDraft} onChange={(event) => setMaterialNameDraft(event.target.value)} className={`flex-1 ${isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : ''}`} />
                    <Button onClick={() => void handleSaveMaterialName()}>{t('groupReview.materialDetail.saveName', 'Save name')}</Button>
                  </div>
                </div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                  <p className="text-sm font-semibold">{t('groupReview.materialDetail.summary', 'Summary')}</p>
                  {materialInsightLoading ? (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('groupReview.materialDetail.loadingExtract', 'Loading extract info...')}
                    </div>
                  ) : (
                    <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {materialInsight?.extractedSummary || groupMaterialDetail.summary || t('groupReview.materialDetail.noSummary', 'No summary yet.')}
                    </p>
                  )}
                </div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                  <p className="text-sm font-semibold">{t('groupReview.materialDetail.extractedText', 'Extracted text / preview')}</p>
                  <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {materialInsight?.extractedText || groupMaterialDetail.excerpt || t('groupReview.materialDetail.noPreview', 'No preview yet.')}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                  <p className="text-sm font-semibold">{t('groupReview.materialDetail.metadata', 'Metadata')}</p>
                  <div className={`mt-3 space-y-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <p>{t('groupReview.materialDetail.uploader', { name: groupMaterialDetail.uploaderName, defaultValue: 'Uploader: {{name}}' })}</p>
                    <p>{t('groupReview.materialDetail.role', { role: formatRoleLabel(groupMaterialDetail.uploaderRole, t), defaultValue: 'Role: {{role}}' })}</p>
                    <p>{t('groupReview.materialDetail.uploaded', { time: formatDateTime(groupMaterialDetail.uploadedAt, currentLang, t), defaultValue: 'Uploaded: {{time}}' })}</p>
                    <p>{t('groupReview.materialDetail.type', { type: groupMaterialDetail.type || 'application/pdf', defaultValue: 'Type: {{type}}' })}</p>
                  </div>
                </div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                  <p className="text-sm font-semibold">{t('groupReview.materialDetail.moderationReport', 'Moderation report')}</p>
                  <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {materialInsight?.moderationDetail || groupMaterialDetail.moderation?.reason || t('groupReview.materialDetail.noModerationDetail', 'No moderation detail yet.')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void handleReviewQueueAction(groupMaterialDetail, 'approve')}><CheckCircle2 className="h-4 w-4" />{t('groupReview.materialDetail.approve', 'Approve')}</Button>
                  <Button variant="outline" onClick={() => void handleReviewQueueAction(groupMaterialDetail, 'request_reupload')}><RefreshCw className="h-4 w-4" />{t('groupReview.materialDetail.requestReupload', 'Request re-upload')}</Button>
                  <Button variant="outline" onClick={() => window.alert(t('groupReview.toast.downloadDemo', 'Download demo for clickable review UI.'))}><Download className="h-4 w-4" />{t('groupReview.materialDetail.download', 'Download')}</Button>
                  <Button variant="destructive" onClick={() => void handleDeleteCurrentMaterial()}><Trash2 className="h-4 w-4" />{t('groupReview.materialDetail.delete', 'Delete')}</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDiscussionDetail = () => {
    if (!discussionThread || !discussionContext.question || !discussionContext.quiz) {
      return (
        <EmptyState
          title={t('groupReview.discussionDetail.emptyTitle', 'Discussion not ready')}
          description={t('groupReview.discussionDetail.emptyDescription', 'The thread may not be initialized or the quiz/question no longer exists.')}
          action={<Button onClick={() => goToSection('quiz')}>{t('groupReview.discussionDetail.backToQuizHub', 'Back to quiz hub')}</Button>}
          isDarkMode={isDarkMode}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => navigate(returnToQuizPath)}>
            <ArrowLeft className="h-4 w-4" />
            {t('groupReview.discussionDetail.backToQuizHub', 'Back to quiz hub')}
          </Button>
          <Badge variant="outline">{discussionThread.isResolved ? t('groupReview.discussionDetail.resolved', 'Resolved') : t('groupReview.discussionDetail.open', 'Open')}</Badge>
          <Badge variant="outline">{t('groupReview.discussionDetail.activityCount', { count: discussionThread.unreadCount, defaultValue: '{{count}} activity' })}</Badge>
        </div>

        <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
          <CardHeader>
            <CardTitle className="text-lg">{discussionThread.title}</CardTitle>
            <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              {t('groupReview.discussionDetail.contextSubtitle', {
                title: discussionContext.quiz.title,
                defaultValue: '{{title}} • Async discussion per quiz question for leader, contributor, and member to review together.',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className={`rounded-2xl border p-5 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
              <p className="text-sm font-semibold">{t('groupReview.discussionDetail.question', 'Question')}</p>
              <p className={`mt-3 text-sm leading-7 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{discussionContext.question.content}</p>
              <div className={`mt-4 rounded-2xl border p-4 ${isDarkMode ? 'border-cyan-400/20 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50'}`}>
                <p className="text-sm font-semibold">{t('groupReview.discussionDetail.sampleAnswer', 'Sample answer')}</p>
                <p className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-cyan-100/90' : 'text-cyan-900'}`}>{discussionThread.sampleAnswer}</p>
              </div>
            </div>
            <div className="space-y-3">
              {discussionThread.messages.map((message) => (
                <div key={message.messageId} className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                  <div>
                    <p className="font-semibold">
                      <UserDisplayName
                        user={{ fullName: message.authorName, username: message.authorUserName }}
                        fallback={message.authorName || t('groupReview.fallback.member', 'Member')}
                        isDarkMode={isDarkMode}
                      />
                    </p>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{formatRoleLabel(message.authorRole, t)} • {formatDateTime(message.createdAt, currentLang, t)}</p>
                  </div>
                  <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{message.body}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void handleToggleThreadResolved(discussionThread)}>{discussionThread.isResolved ? t('groupReview.discussionDetail.reopenThread', 'Reopen thread') : t('groupReview.discussionDetail.markResolved', 'Mark as resolved')}</Button>
            </div>
            <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
              <p className="text-sm font-semibold">{t('groupReview.discussionDetail.newReplyTitle', 'New reply')}</p>
              <textarea value={discussionReply} onChange={(event) => setDiscussionReply(event.target.value)} placeholder={t('groupReview.discussionDetail.replyPlaceholder', 'Write opinions, counter-arguments, or notes for the whole group to review...')} className={`mt-3 min-h-[130px] w-full rounded-md border px-3 py-2 text-sm outline-none ${isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white placeholder:text-slate-500' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'}`} />
              <div className="mt-3 flex justify-end">
                <Button onClick={() => void handleDiscussionReply()} disabled={isSubmittingDiscussionReply}>
                  {isSubmittingDiscussionReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  {t('groupReview.discussionDetail.sendReply', 'Send reply')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  const renderRoadmapDetail = () => {
    if (!roadmapDetail) {
      return (
        <EmptyState
          title={t('groupReview.roadmap.detailEmptyTitle', 'Roadmap not found')}
          description={t('groupReview.roadmap.detailEmptyDescription', 'Roadmap detail may not be seeded or synced yet.')}
          action={<Button onClick={() => goToSection('roadmap')}>{t('groupReview.roadmap.backToRoadmap', 'Back to roadmap')}</Button>}
          isDarkMode={isDarkMode}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => navigate(buildGroupWorkspaceSectionPath(resolvedWorkspaceId || 'new', 'roadmap'))}>
            <ArrowLeft className="h-4 w-4" />
            {t('groupReview.roadmap.backToRoadmap', 'Back to roadmap')}
          </Button>
          <Badge variant="outline">{t('groupReview.roadmap.phases', { count: roadmapDetail.stats?.phaseCount || roadmapDetail.phases?.length || 0, defaultValue: '{{count}} phases' })}</Badge>
        </div>

        <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
          <CardHeader>
            <CardTitle className="text-lg">{roadmapDetail.title}</CardTitle>
            <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>{roadmapDetail.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(roadmapDetail.phases || []).map((phase) => (
              <Card key={phase.phaseId} className={isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold">{phase.title}</p>
                      <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('groupReview.roadmap.phaseProgressLine', { progress: phase.progress, count: phase.knowledges?.length || 0, defaultValue: 'Progress {{progress}}% • {{count}} knowledge nodes' })}</p>
                    </div>
                    {phase.blocker ? <Badge variant="outline">{t('groupReview.roadmap.blockedBadge', 'Blocked')}</Badge> : <Badge variant="outline">{t('groupReview.roadmap.healthyBadge', 'Healthy')}</Badge>}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {(phase.knowledges || []).map((knowledge) => (
                      <div key={knowledge.knowledgeId} className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
                        <p className="font-medium">{knowledge.title}</p>
                        <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('groupReview.roadmap.knowledgeDetailLine', { progress: knowledge.progress, materialCount: knowledge.relatedMaterialIds.length, quizCount: knowledge.relatedQuizIds.length, defaultValue: 'Progress {{progress}}% • {{materialCount}} material • {{quizCount}} quiz' })}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {knowledge.relatedMaterialIds.slice(0, 1).map((materialId) => {
                            const material = allMaterials.find((item) => Number(item.materialId) === Number(materialId));
                            return material ? <Button key={materialId} size="sm" variant="outline" onClick={() => openMaterialDetail(material.materialId)}><FileText className="h-4 w-4" />{t('groupReview.roadmap.viewMaterial', 'View material')}</Button> : null;
                          })}
                          {knowledge.relatedQuizIds.slice(0, 1).map((quizId) => {
                            const quiz = quizzes.find((item) => Number(item.quizId) === Number(quizId));
                            return quiz ? <Button key={quizId} size="sm" variant="outline" onClick={() => handleStartQuiz(quiz, 'practice')}><BookOpen className="h-4 w-4" />{t('groupReview.roadmap.openQuiz', 'Open quiz')}</Button> : null;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCurrentContent = () => {
    if (detailRoute?.type === 'material') return renderMaterialDetail();
    if (detailRoute?.type === 'discussion') return renderDiscussionDetail();
    if (detailRoute?.type === 'roadmap') return renderRoadmapDetail();
    if (activeSection === 'materials') return renderMaterials();
    if (activeSection === 'moderation') return renderModeration();
    if (activeSection === 'quiz') return renderQuiz();
    if (activeSection === 'members') return renderMembers();
    if (activeSection === 'performance') return renderPerformance();
    if (activeSection === 'roadmap') return renderRoadmap();
    if (activeSection === 'logs') return renderLogs();
    return renderOverview();
  };

  if (isBootstrappingGroup) {
    return (
      <div className={`${pageShellClass} flex min-h-screen items-center justify-center px-6`}>
        <div className="flex items-center gap-3 text-lg font-medium">
          <Loader2 className="h-6 w-6 animate-spin" />
          {t('groupReview.shell.bootstrapping', 'Initializing group workspace...')}
        </div>
      </div>
    );
  }

  if (!isCreating && !resolvedWorkspaceId && !groupProfileLoading) {
    return (
      <div className={`${pageShellClass} flex min-h-screen items-center justify-center px-6`}>
        <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
          <CardContent className="p-8">
            <p className="text-lg font-semibold">{t('groupReview.shell.notFoundTitle', 'Group workspace not found')}</p>
            <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('groupReview.shell.notFoundDescription', 'The workspace may not have been created or you no longer have access.')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${pageShellClass} ${fontClass}`}>
      <GroupWorkspaceHeader
        workspaceId={resolvedWorkspaceId}
        groupName={resolvedGroupData.groupName}
        isDarkMode={isDarkMode}
        settingsMenu={headerSettingsMenu}
        wsConnected={wsConnected}
        subtitle={`${formatRoleLabel(actualRoleKey, t)} • ${getLearningModeLabel(resolvedGroupData.learningMode, t)}`}
      />
      <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 xl:px-8">
        <div className="mb-4 flex flex-wrap gap-2 md:hidden">
          <Button variant="outline" size="sm" onClick={() => void refreshAllData()}><RefreshCw className="h-4 w-4" />{t('groupReview.shell.refresh', 'Refresh')}</Button>
          <Button variant="outline" size="sm" onClick={handleRequestGroupProfileUpdate}><Sparkles className="h-4 w-4" />{t('groupReview.shell.groupProfile', 'Group profile')}</Button>
          {canUploadSource ? <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)}><Upload className="h-4 w-4" />{t('groupReview.shell.upload', 'Upload')}</Button> : null}
          {canManageMembers ? <Button size="sm" onClick={() => setInviteDialogOpen(true)} className="bg-cyan-600 text-white hover:bg-cyan-700"><UserPlus className="h-4 w-4" />{t('groupReview.shell.inviteMember', 'Invite member')}</Button> : null}
        </div>
        <div className="grid gap-6 xl:grid-cols-[280px,minmax(0,1fr)]">
          <aside className="space-y-4">
            <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('groupReview.sidebar.flowTitle', 'Group workspace flow')}</CardTitle>
                <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>{t('groupReview.sidebar.flowDescription', 'Navigate sections via `?section=` and keep detail routes separate for materials, discussion, and roadmap.')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(SECTION_META).map((sectionKey) => <SectionButton key={sectionKey} sectionKey={sectionKey} active={!detailRoute && activeSection === sectionKey} onClick={goToSection} isDarkMode={isDarkMode} t={t} />)}
              </CardContent>
            </Card>
            <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
              <CardHeader className="pb-3"><CardTitle className="text-base">{t('groupReview.sidebar.snapshot', 'Snapshot')}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60 text-slate-300' : 'border-slate-200 bg-slate-50/80 text-slate-700'}`}><p className="font-medium">{t('groupReview.sidebar.moderationQueue', 'Moderation queue')}</p><p className="mt-2">{t('groupReview.sidebar.flaggedDocs', { count: warningQueue.length, defaultValue: '{{count}} flagged document(s)' })}</p></div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60 text-slate-300' : 'border-slate-200 bg-slate-50/80 text-slate-700'}`}><p className="font-medium">{t('groupReview.sidebar.discussion', 'Discussion')}</p><p className="mt-2">{t('groupReview.sidebar.unresolvedThreads', { count: unresolvedDiscussionCount, defaultValue: '{{count}} unresolved thread(s)' })}</p></div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60 text-slate-300' : 'border-slate-200 bg-slate-50/80 text-slate-700'}`}><p className="font-medium">{t('groupReview.sidebar.logs', 'Logs')}</p><p className="mt-2">{t('groupReview.sidebar.logEntries', { count: (reviewWorkspace?.logs || []).length, defaultValue: '{{count}} entries' })}</p></div>
              </CardContent>
            </Card>
          </aside>
          <main className="min-w-0">{(sourcesLoading || membersLoading || groupProfileLoading || logsLoading) && !reviewWorkspace ? <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}><CardContent className="flex items-center gap-3 p-8 text-lg"><Loader2 className="h-5 w-5 animate-spin" />{t('groupReview.shell.loadingData', 'Loading group workspace data...')}</CardContent></Card> : renderCurrentContent()}</main>
        </div>
      </div>
      <UploadSourceDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} isDarkMode={isDarkMode} onUploadFiles={handleUploadFiles} workspaceId={resolvedWorkspaceId} onSuggestedImported={() => Promise.all([fetchSources(), loadGroupLogs()])} />
      <InviteMemberDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} onInvite={handleInvite} isDarkMode={isDarkMode} />
      <GroupWorkspaceProfileConfigDialog
        open={profileConfigOpen}
        onOpenChange={setProfileConfigOpen}
        isDarkMode={isDarkMode}
        workspaceId={resolvedWorkspaceId}
        canClose={!shouldForceProfileSetup}
        onTemporaryClose={shouldForceProfileSetup ? dismissProfileConfig : undefined}
        onComplete={async () => {
          setProfileConfigOpen(false);
          await Promise.all([fetchWorkspaceDetail(resolvedWorkspaceId).catch(() => null), fetchGroups().catch(() => null), loadGroupProfile()]);
          showSuccess(t('groupReview.toast.profileUpdated', 'Group profile updated.'));
        }}
      />
      <WorkspaceOnboardingUpdateGuardDialog open={profileUpdateGuardOpen} onOpenChange={setProfileUpdateGuardOpen} isDarkMode={isDarkMode} currentLang={currentLang} materialCount={sources.length} hasLearningData={groupHasLearningData} onDeleteAndContinue={handleDeleteMaterialsForGroupProfileUpdate} deleting={isResettingWorkspaceForProfileUpdate} />
    </div>
  );
}
