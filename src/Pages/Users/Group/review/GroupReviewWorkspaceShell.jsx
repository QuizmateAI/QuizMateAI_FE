import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import WorkspaceHeader from '@/Pages/Users/Individual/Workspace/Components/WorkspaceHeader';
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
  overview: { label: 'Tổng quan', icon: LayoutDashboard },
  materials: { label: 'Tài liệu', icon: FolderOpen },
  moderation: { label: 'Warning', icon: ShieldAlert },
  quiz: { label: 'Quiz', icon: PenLine },
  members: { label: 'Thành viên', icon: Users },
  performance: { label: 'Hiệu suất', icon: Activity },
  roadmap: { label: 'Roadmap', icon: MapIcon },
  logs: { label: 'Logs', icon: ClipboardList },
};

const FLAGGED_STATES = new Set(['WARN', 'REJECT', 'REJECTED', 'NEEDS_REVIEW']);
const LEARNING_MODE_LABELS = {
  STUDY_NEW: 'Học kiến thức mới',
  REVIEW: 'Ôn tập theo nhóm',
  MOCK_TEST: 'Thi thử cùng nhóm',
};

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

function formatRoleLabel(role) {
  if (role === 'LEADER') return 'Leader';
  if (role === 'CONTRIBUTOR') return 'Contributor';
  return 'Member';
}

function formatMaterialStatus(status) {
  const normalized = String(status || 'APPROVED').toUpperCase();
  if (normalized === 'WARN') return 'Cần xem lại';
  if (normalized === 'REJECT' || normalized === 'REJECTED') return 'Bị từ chối';
  if (normalized === 'NEEDS_REVIEW') return 'Yêu cầu upload lại';
  if (normalized === 'PROCESSING') return 'Đang xử lý';
  if (normalized === 'UPLOADING') return 'Đang upload';
  return 'Đã duyệt';
}

function formatDateTime(value, lang = 'vi') {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
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

function SectionButton({ sectionKey, active, onClick, isDarkMode }) {
  const meta = SECTION_META[sectionKey];
  const Icon = meta.icon;
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
        <span className="text-sm font-medium">{meta.label}</span>
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
  const { i18n } = useTranslation();
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
      || 'Nhóm học tập',
    description:
      groupProfile?.groupLearningGoal
      || currentGroupFromGroups?.description
      || currentGroupWorkspace?.description
      || 'Không gian review UI cho học nhóm.',
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
          name: item?.title || item?.name || 'Tài liệu chưa đặt tên',
          title: item?.title || item?.name || 'Tài liệu chưa đặt tên',
          type: item?.materialType || item?.type || 'application/pdf',
          status: String(item?.status || 'APPROVED').toUpperCase(),
        }))
        .filter((item) => item.materialId > 0 && String(item.status).toUpperCase() !== 'DELETED');
      setSources(materials);
      return materials;
    } catch (error) {
      console.error('Failed to fetch group materials:', error);
      showError(error?.message || 'Không thể tải danh sách tài liệu.');
      setSources([]);
      return [];
    } finally {
      setSourcesLoading(false);
    }
  }, [isCreating, resolvedWorkspaceId, showError]);

  const loadMembers = useCallback(async () => {
    if (!resolvedWorkspaceId || isCreating) return [];
    setMembersLoading(true);
    try {
      const data = await fetchMembers(resolvedWorkspaceId);
      setMembers(Array.isArray(data) ? data : []);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch group members:', error);
      showError(error?.message || 'Không thể tải thành viên nhóm.');
      setMembers([]);
      return [];
    } finally {
      setMembersLoading(false);
    }
  }, [fetchMembers, isCreating, resolvedWorkspaceId, showError]);

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
        showInfo('Đang tạo group workspace...');
        const createdWorkspace = await createGroupWorkspace({ title: null });
        const createdWorkspaceId = createdWorkspace?.workspaceId;
        if (!createdWorkspaceId) {
          throw new Error('Không thể tạo group workspace.');
        }
        navigate(buildGroupWorkspacePath(createdWorkspaceId), {
          replace: true,
          state: { openProfileConfig: true },
        });
      } catch (error) {
        showError(error?.message || 'Không thể tạo group workspace.');
        navigate('/home', { replace: true });
      } finally {
        setIsBootstrappingGroup(false);
      }
    };

    void bootstrapGroupWorkspace();
  }, [createGroupWorkspace, isCreating, navigate, showError, showInfo]);

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
        fullName: currentUser?.fullName || currentUser?.username || currentUser?.email || 'QuizMate User',
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

  useWebSocket({
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
      throw new Error('Chỉ leader mới có thể mời thành viên.');
    }
    await inviteMemberHook(resolvedWorkspaceId, email);
    showSuccess('Đã gửi lời mời thành viên.');
    await Promise.all([loadMembers(), loadGroupLogs()]);
  }, [canManageMembers, inviteMemberHook, loadGroupLogs, loadMembers, resolvedWorkspaceId, showSuccess]);

  const handleUploadFiles = useCallback(async (files) => {
    if (shouldForceProfileSetup) {
      showError('Hoàn thành profile nhóm trước khi tải tài liệu.');
      setProfileConfigOpen(true);
      return;
    }
    if (!canUploadSource || !resolvedWorkspaceId) {
      showError('Bạn không có quyền tải tài liệu.');
      return;
    }

    try {
      await Promise.all(files.map((file) => uploadMaterial(file, resolvedWorkspaceId)));
      showSuccess(`Đã gửi ${files.length} tài liệu để xử lý.`);
      await Promise.all([fetchSources(), loadGroupLogs()]);
    } catch (error) {
      console.error('Failed to upload materials:', error);
      showError(error?.message || 'Tải tài liệu thất bại.');
    }
  }, [canUploadSource, fetchSources, loadGroupLogs, resolvedWorkspaceId, shouldForceProfileSetup, showError, showSuccess]);

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
      showSuccess('Đã xóa dữ liệu để cập nhật onboarding nhóm.');
    } catch (error) {
      console.error('Failed to reset workspace for group profile update:', error);
      showError(error?.message || 'Không thể xóa dữ liệu workspace.');
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
  ]);

  const handleToggleUploadPermission = useCallback(async (member) => {
    if (!resolvedWorkspaceId) return;
    try {
      if (member?.canUpload) {
        await revokeUpload(resolvedWorkspaceId, member.userId);
        showSuccess(`Đã thu hồi quyền upload của ${member.fullName}.`);
      } else {
        await grantUpload(resolvedWorkspaceId, member.userId);
        showSuccess(`Đã cấp quyền upload cho ${member.fullName}.`);
      }
      await loadMembers();
    } catch (error) {
      showError(error?.message || 'Không thể cập nhật quyền upload.');
    }
  }, [grantUpload, loadMembers, resolvedWorkspaceId, revokeUpload, showError, showSuccess]);

  const handleMemberRoleChange = useCallback(async (member, nextRole) => {
    if (!resolvedWorkspaceId || !nextRole || nextRole === member.role) return;
    try {
      await updateMemberRole(resolvedWorkspaceId, member.userId, nextRole);
      showSuccess(`Đã cập nhật vai trò của ${member.fullName}.`);
      await loadMembers();
    } catch (error) {
      showError(error?.message || 'Không thể cập nhật vai trò.');
    }
  }, [loadMembers, resolvedWorkspaceId, showError, showSuccess, updateMemberRole]);

  const handleRemoveMember = useCallback(async (member) => {
    if (!resolvedWorkspaceId) return;
    if (!window.confirm(`Xóa ${member.fullName} khỏi nhóm?`)) return;
    try {
      await removeMember(resolvedWorkspaceId, member.userId);
      showSuccess(`Đã xóa ${member.fullName} khỏi nhóm.`);
      await Promise.all([loadMembers(), loadGroupLogs()]);
    } catch (error) {
      showError(error?.message || 'Không thể xóa thành viên khỏi nhóm.');
    }
  }, [loadGroupLogs, loadMembers, removeMember, resolvedWorkspaceId, showError, showSuccess]);

  const handleReviewQueueAction = useCallback(async (material, decision) => {
    if (!resolvedWorkspaceId || !material) return;
    try {
      if (material.source === 'live' && decision !== 'request_reupload') {
        await reviewLiveMaterial(material.materialId, decision === 'approve');
      }
      const nextWorkspace = reviewGroupMaterial(resolvedWorkspaceId, material.materialId, decision, {
        userId: Number(currentUser?.id ?? currentUser?.userId ?? 0),
        fullName: currentUser?.fullName || currentUser?.username || currentUser?.email || 'Leader',
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
      showSuccess('Đã cập nhật trạng thái moderation.');
    } catch (error) {
      console.error('Failed to review material:', error);
      showError(error?.message || 'Không thể cập nhật moderation.');
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
  ]);

  const handleSaveMaterialName = useCallback(async () => {
    if (!resolvedWorkspaceId || !groupMaterialDetail) return;
    const trimmedName = materialNameDraft.trim();
    if (!trimmedName) {
      showError('Tên tài liệu không được để trống.');
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
      showSuccess('Đã cập nhật tên tài liệu.');
    } catch (error) {
      console.error('Failed to rename material:', error);
      showError(error?.message || 'Không thể đổi tên tài liệu.');
    }
  }, [fetchSources, groupMaterialDetail, materialNameDraft, refreshReviewWorkspace, resolvedWorkspaceId, showError, showSuccess]);

  const handleDeleteCurrentMaterial = useCallback(async () => {
    if (!resolvedWorkspaceId || !groupMaterialDetail) return;
    if (!window.confirm(`Xóa tài liệu "${groupMaterialDetail.name}"?`)) return;

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
      showSuccess('Đã xóa tài liệu.');
      navigate(buildGroupWorkspaceSectionPath(resolvedWorkspaceId || 'new', 'materials'), { replace: true });
    } catch (error) {
      console.error('Failed to delete material:', error);
      showError(error?.message || 'Không thể xóa tài liệu.');
    }
  }, [fetchSources, groupMaterialDetail, navigate, resolvedWorkspaceId, showError, showSuccess]);

  const handleCreateQuiz = useCallback(async () => {
    if (!resolvedWorkspaceId) return;
    const trimmedTitle = quizForm.title.trim();
    if (!trimmedTitle) {
      showError('Hãy nhập tên quiz.');
      return;
    }

    try {
      const nextWorkspace = createGroupReviewQuiz(resolvedWorkspaceId, quizForm, {
        userId: Number(currentUser?.id ?? currentUser?.userId ?? 0),
        fullName: currentUser?.fullName || currentUser?.username || currentUser?.email || 'Contributor',
        email: currentUser?.email || 'user@quizmate.local',
        role: actualRoleKey,
      });
      if (nextWorkspace) {
        setReviewWorkspace(nextWorkspace);
      } else {
        refreshReviewWorkspace();
      }
      setQuizForm({ title: '', description: '', questionCount: 8, durationMinutes: 12, passScore: 70, quizIntent: 'REVIEW' });
      showSuccess('Đã tạo quiz mock để review UI.');
    } catch (error) {
      console.error('Failed to create review quiz:', error);
      showError(error?.message || 'Không thể tạo quiz mới.');
    }
  }, [actualRoleKey, currentUser?.email, currentUser?.fullName, currentUser?.id, currentUser?.userId, quizForm, refreshReviewWorkspace, resolvedWorkspaceId, showError, showSuccess]);

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
          fullName: currentUser?.fullName || currentUser?.username || currentUser?.email || 'Thành viên',
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
      showSuccess('Đã gửi phản hồi trong discussion.');
    } catch (error) {
      console.error('Failed to send discussion reply:', error);
      showError(error?.message || 'Không thể gửi phản hồi.');
    } finally {
      setIsSubmittingDiscussionReply(false);
    }
  }, [actualRoleKey, currentUser?.email, currentUser?.fullName, currentUser?.id, currentUser?.userId, detailRoute, discussionReply, refreshReviewWorkspace, resolvedWorkspaceId, showError, showSuccess]);

  const handleToggleThreadResolved = useCallback(async (thread) => {
    if (!resolvedWorkspaceId || !thread) return;
    try {
      const nextWorkspace = toggleGroupDiscussionResolved(
        resolvedWorkspaceId,
        thread.threadId,
        !thread.isResolved,
        {
          userId: Number(currentUser?.id ?? currentUser?.userId ?? 0),
          fullName: currentUser?.fullName || currentUser?.username || currentUser?.email || 'Leader',
          email: currentUser?.email || 'user@quizmate.local',
          role: actualRoleKey,
        },
      );
      if (nextWorkspace) {
        setReviewWorkspace(nextWorkspace);
      } else {
        refreshReviewWorkspace();
      }
      showSuccess(thread.isResolved ? 'Đã mở lại discussion.' : 'Đã đánh dấu discussion là resolved.');
    } catch (error) {
      console.error('Failed to update discussion state:', error);
      showError(error?.message || 'Không thể cập nhật discussion.');
    }
  }, [actualRoleKey, currentUser?.email, currentUser?.fullName, currentUser?.id, currentUser?.userId, refreshReviewWorkspace, resolvedWorkspaceId, showError, showSuccess]);

  const headerSettingsMenu = (
    <div className="hidden items-center gap-2 md:flex">
      <Button variant="outline" size="sm" onClick={() => void refreshAllData()}>
        <RefreshCw className="h-4 w-4" />
        Làm mới
      </Button>
      <Button variant="outline" size="sm" onClick={handleRequestGroupProfileUpdate}>
        <Sparkles className="h-4 w-4" />
        Hồ sơ nhóm
      </Button>
      {canUploadSource ? (
        <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      ) : null}
      {canManageMembers ? (
        <Button size="sm" onClick={() => setInviteDialogOpen(true)} className="bg-cyan-600 text-white hover:bg-cyan-700">
          <UserPlus className="h-4 w-4" />
          Mời member
        </Button>
      ) : null}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Member hoạt động" value={`${activeMembers}/${reviewWorkspace?.members?.length || 0}`} caption="Số member có tần suất tham gia ổn định trong tuần." isDarkMode={isDarkMode} />
        <MetricCard icon={FolderOpen} label="Tài liệu trong group" value={allMaterials.length} caption={`${warningQueue.length} tài liệu đang nằm trong warning queue.`} tone={warningQueue.length > 0 ? 'warn' : 'default'} isDarkMode={isDarkMode} />
        <MetricCard icon={PenLine} label="Độ chính xác" value={`${averageAccuracy}%`} caption="Điểm trung bình hiện tại của toàn group." tone={averageAccuracy >= 70 ? 'success' : 'warn'} isDarkMode={isDarkMode} />
            <MetricCard icon={MapIcon} label="Roadmap progress" value={`${completionRate}%`} caption={`${overdueRoadmapItems} mục đang bị block cần leader xử lý.`} isDarkMode={isDarkMode} />
      </div>

      <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
        <CardHeader>
          <CardTitle className="text-xl">Hub quản trị và học nhóm</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            Review end-to-end cho materials, moderation, quiz, discussion, dashboard hiệu suất và roadmap trong cùng một shell.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.3fr,0.9fr]">
          <div className={`rounded-3xl border p-5 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{formatRoleLabel(actualRoleKey)}</Badge>
              <Badge variant="outline">{LEARNING_MODE_LABELS[resolvedGroupData.learningMode] || 'Ôn tập theo nhóm'}</Badge>
              <Badge variant="outline">{hasCompletedGroupProfile ? 'Profile hoàn tất' : 'Profile cần cập nhật'}</Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold">{resolvedGroupData.groupName}</h2>
            <p className={`mt-3 text-sm leading-7 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{resolvedGroupData.description}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => goToSection('materials')}><FolderOpen className="h-4 w-4" />Review tài liệu</Button>
              <Button variant="outline" onClick={() => goToSection('performance')}><Activity className="h-4 w-4" />Xem dashboard</Button>
              <Button variant="outline" onClick={() => goToSection('quiz')}><PenLine className="h-4 w-4" />Tạo quiz</Button>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Điểm nóng cần xử lý</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-amber-400/20 bg-amber-500/10' : 'border-amber-200 bg-amber-50'}`}>
                  <p className="text-sm font-semibold">Moderation queue</p>
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-amber-100/80' : 'text-amber-800'}`}>{warningQueue.length} tài liệu cần leader hoặc contributor review.</p>
                </div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-cyan-400/20 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50'}`}>
                  <p className="text-sm font-semibold">Discussion đang mở</p>
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-cyan-100/80' : 'text-cyan-800'}`}>{unresolvedDiscussionCount} thread chưa resolve, có thể mở từ quiz hoặc kết quả làm bài.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
          <CardHeader>
            <CardTitle className="text-lg">Tài liệu mới và warning queue</CardTitle>
            <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              Lane quản lý tài liệu member upload và queue cần moderation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {allMaterials.slice(0, 4).map((material) => (
              <button key={material.materialId} type="button" onClick={() => openMaterialDetail(material.materialId)} className={`w-full rounded-2xl border p-4 text-left transition-all ${isDarkMode ? 'border-white/10 bg-slate-950/50 hover:border-white/20' : 'border-slate-200 bg-slate-50/80 hover:border-slate-300'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{material.name}</p>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{material.uploaderName} • {formatMaterialStatus(material.moderation?.state || material.status)}</p>
                  </div>
                  <Badge variant="outline">{material.source === 'live' ? 'Live' : 'Mock'}</Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
          <CardHeader>
            <CardTitle className="text-lg">Discussion từng câu quiz</CardTitle>
            <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              Deep-link discussion mở từ quiz result hoặc từ studio quiz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {discussionThreads.slice(0, 4).map((thread) => (
              <button key={thread.threadId} type="button" onClick={() => openDiscussionDetail(thread.quizId, thread.questionId)} className={`w-full rounded-2xl border p-4 text-left transition-all ${isDarkMode ? 'border-white/10 bg-slate-950/50 hover:border-white/20' : 'border-slate-200 bg-slate-50/80 hover:border-slate-300'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{thread.title}</p>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{thread.messages.length} phản hồi • {thread.isResolved ? 'Đã resolve' : 'Đang mở'}</p>
                  </div>
                  {thread.unreadCount > 0 ? <Badge>{thread.unreadCount} mới</Badge> : <Badge variant="outline">Theo dõi</Badge>}
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
          <CardTitle className="text-lg">Member materials</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            Quản lý tài liệu được upload trong group, filter theo uploader, trạng thái và xem detail đã extract.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1.4fr,0.8fr,0.8fr]">
            <Input value={materialSearch} onChange={(event) => setMaterialSearch(event.target.value)} placeholder="Tìm theo tên tài liệu hoặc summary" className={isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : ''} />
            <select value={materialStatusFilter} onChange={(event) => setMaterialStatusFilter(event.target.value)} className={`h-10 rounded-md border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="WARN">Cần xem lại</option>
              <option value="REJECT">Bị từ chối</option>
              <option value="NEEDS_REVIEW">Yêu cầu upload lại</option>
              <option value="PROCESSING">Đang xử lý</option>
            </select>
            <select value={materialOwnerFilter} onChange={(event) => setMaterialOwnerFilter(event.target.value)} className={`h-10 rounded-md border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="ALL">Tất cả uploader</option>
              {materialOwners.map((owner) => <option key={owner.value} value={owner.value}>{owner.label}</option>)}
            </select>
          </div>

          {filteredMaterials.length === 0 ? (
            <EmptyState title="Chưa có tài liệu phù hợp bộ lọc" description="Thử đổi trạng thái, uploader hoặc upload thêm tài liệu để review." action={canUploadSource ? <Button onClick={() => setUploadDialogOpen(true)}><Upload className="h-4 w-4" />Upload tài liệu</Button> : null} isDarkMode={isDarkMode} />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredMaterials.map((material) => (
                <Card key={material.materialId} className={isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">{material.name}</p>
                        <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{material.uploaderName} • {formatDateTime(material.uploadedAt, currentLang)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{formatMaterialStatus(material.moderation?.state || material.status)}</Badge>
                        <Badge variant="outline">{material.source === 'live' ? 'Live' : 'Mock'}</Badge>
                      </div>
                    </div>
                    <p className={`mt-4 line-clamp-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{material.summary || material.excerpt || 'Chưa có summary cho tài liệu này.'}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openMaterialDetail(material.materialId)}><Eye className="h-4 w-4" />Xem detail</Button>
                      {FLAGGED_STATES.has(String(material.moderation?.state || material.status).toUpperCase()) ? <Button size="sm" onClick={() => goToSection('moderation')} className="bg-amber-600 text-white hover:bg-amber-700"><ShieldAlert className="h-4 w-4" />Mở moderation</Button> : null}
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
          <CardTitle className="text-lg">Moderation queue</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            Hàng đợi tài liệu bị warning, reject hoặc cần request upload lại. Mỗi action sẽ đẩy event vào logs mock.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {warningQueue.length === 0 ? (
            <EmptyState title="Không có tài liệu cần review" description="Queue moderation hiện đang trống. Bạn có thể quay lại materials hub để xem toàn bộ tài liệu." action={<Button onClick={() => goToSection('materials')}>Mở materials hub</Button>} isDarkMode={isDarkMode} />
          ) : (
            warningQueue.map((material) => (
              <Card key={material.materialId} className={isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold">{material.name}</p>
                      <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{material.uploaderName} • {formatRoleLabel(material.uploaderRole)}</p>
                    </div>
                    <Badge variant="outline">{formatMaterialStatus(material.moderation?.state || material.status)}</Badge>
                  </div>
                  <p className={`mt-4 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{material.moderation?.reason || material.summary || 'Tài liệu cần được review thêm trước khi dùng trong group.'}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void handleReviewQueueAction(material, 'approve')} className="bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle2 className="h-4 w-4" />Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => void handleReviewQueueAction(material, 'request_reupload')}><RefreshCw className="h-4 w-4" />Request re-upload</Button>
                    <Button size="sm" variant="destructive" onClick={() => void handleReviewQueueAction(material, 'reject')}><Trash2 className="h-4 w-4" />Reject</Button>
                    <Button size="sm" variant="outline" onClick={() => openMaterialDetail(material.materialId)}><Eye className="h-4 w-4" />Xem detail</Button>
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
            <CardTitle className="text-lg">Quiz studio</CardTitle>
            <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              Tạo quiz mock để review luồng studio, practice, exam, result và discussion theo câu.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <Input value={quizForm.title} onChange={(event) => setQuizForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Tên quiz" className={isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : ''} />
            <select value={quizForm.quizIntent} onChange={(event) => setQuizForm((prev) => ({ ...prev, quizIntent: event.target.value }))} className={`h-10 rounded-md border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="PRE_LEARNING">Pre-learning</option>
              <option value="REVIEW">Review</option>
              <option value="POST_LEARNING">Post-learning</option>
            </select>
            <textarea value={quizForm.description} onChange={(event) => setQuizForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Mô tả quiz" className={`min-h-[110px] rounded-md border px-3 py-2 text-sm outline-none lg:col-span-2 ${isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white placeholder:text-slate-500' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'}`} />
            <Input type="number" min={5} max={30} value={quizForm.questionCount} onChange={(event) => setQuizForm((prev) => ({ ...prev, questionCount: Number(event.target.value || 0) }))} placeholder="Số câu hỏi" className={isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : ''} />
            <Input type="number" min={5} value={quizForm.durationMinutes} onChange={(event) => setQuizForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value || 0) }))} placeholder="Thời lượng (phút)" className={isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : ''} />
            <Input type="number" min={50} max={100} value={quizForm.passScore} onChange={(event) => setQuizForm((prev) => ({ ...prev, passScore: Number(event.target.value || 0) }))} placeholder="Điểm đạt" className={isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : ''} />
            <div className="flex items-center justify-end">
              <Button onClick={() => void handleCreateQuiz()} className="bg-cyan-600 text-white hover:bg-cyan-700"><Plus className="h-4 w-4" />Tạo quiz mock</Button>
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
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{quiz.questionCount} câu • {Math.round(Number(quiz.duration || 0) / 60)} phút • {quiz.ownerName}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{quiz.quizIntent}</Badge>
                    <Badge variant="outline">{quiz.status}</Badge>
                  </div>
                </div>
                <p className={`mt-4 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{quiz.description}</p>
                {recentHistory ? (
                  <div className={`mt-4 rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                    <p className="text-sm font-semibold">Lần làm gần nhất</p>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{recentHistory.score}% • {recentHistory.passed ? 'Đạt' : 'Chưa đạt'} • {formatDateTime(recentHistory.completedAt, currentLang)}</p>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleStartQuiz(quiz, 'practice')}><BookOpen className="h-4 w-4" />Làm practice</Button>
                  <Button size="sm" variant="outline" onClick={() => handleStartQuiz(quiz, 'exam')}><Clock3 className="h-4 w-4" />Làm exam</Button>
                  {firstQuestion ? <Button size="sm" variant="outline" onClick={() => openDiscussionDetail(quiz.quizId, firstQuestion.questionId)}><MessageSquare className="h-4 w-4" />Discussion câu 1</Button> : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
        <CardHeader>
          <CardTitle className="text-lg">Recent attempts</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            Lịch sử lượt làm quiz gần nhất trong group.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {attempts.length === 0 ? (
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Chưa có attempt nào trong mock review.</p>
          ) : (
            attempts.slice().sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime()).slice(0, 5).map((attempt) => (
              <div key={attempt.attemptId} className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{attempt.userName}</p>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{attempt.isPracticeMode ? 'Practice' : 'Exam'} • {attempt.status} • {formatDateTime(attempt.startedAt, currentLang)}</p>
                  </div>
                  {attempt.result ? <Badge>{attempt.result.score}%</Badge> : <Badge variant="outline">Đang làm</Badge>}
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
          <CardTitle className="text-lg">UI member theo role</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            Leader quản trị roster và quyền upload, contributor theo dõi lane nội dung, member xem tiến độ cá nhân.
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
                      <p className="text-base font-semibold">{member.fullName}</p>
                      <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{member.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{formatRoleLabel(member.role)}</Badge>
                      <Badge variant="outline">{member.canUpload ? 'Có quyền upload' : 'Chỉ xem'}</Badge>
                    </div>
                  </div>

                  {perf ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className={`rounded-2xl border p-3 ${isDarkMode ? 'border-white/10 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
                        <p className={`text-xs uppercase tracking-[0.12em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Accuracy</p>
                        <p className="mt-2 text-xl font-semibold">{perf.accuracy}%</p>
                      </div>
                      <div className={`rounded-2xl border p-3 ${isDarkMode ? 'border-white/10 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
                        <p className={`text-xs uppercase tracking-[0.12em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Roadmap</p>
                        <p className="mt-2 text-xl font-semibold">{perf.roadmapProgress}%</p>
                      </div>
                      <div className={`rounded-2xl border p-3 ${isDarkMode ? 'border-white/10 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
                        <p className={`text-xs uppercase tracking-[0.12em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Discussion</p>
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
                        <option value="LEADER">Leader</option>
                        <option value="CONTRIBUTOR">Contributor</option>
                        <option value="MEMBER">Member</option>
                      </select>
                      <Button size="sm" variant="outline" onClick={() => void handleToggleUploadPermission(member)} disabled={member.isCurrentUser}>
                        {member.canUpload ? 'Thu hồi upload' : 'Cấp upload'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void handleRemoveMember(member)} disabled={member.isCurrentUser}>
                        Xóa member
                      </Button>
                    </div>
                  ) : (
                    <p className={`mt-4 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Lane cá nhân: {perf?.recentFocus || 'Theo dõi tiến độ, quiz được giao và discussion đang theo dõi.'}
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
        <MetricCard icon={Target} label="Completion rate" value={`${completionRate}%`} caption="Trung bình tiến độ roadmap của nhóm." isDarkMode={isDarkMode} />
        <MetricCard icon={CheckCircle2} label="Score trend" value={`${averageAccuracy}%`} caption="Điểm trung bình của các attempt đã hoàn thành." isDarkMode={isDarkMode} />
        <MetricCard icon={Users} label="Active members" value={activeMembers} caption="Số member có ít nhất 5 ngày hoạt động." isDarkMode={isDarkMode} />
        <MetricCard icon={AlertTriangle} label="Pending review" value={warningQueue.length} caption="Tài liệu flagged đang chờ moderation." tone={warningQueue.length > 0 ? 'warn' : 'success'} isDarkMode={isDarkMode} />
      </div>

      <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
        <CardHeader>
          <CardTitle className="text-lg">Đánh giá hiệu suất từng member</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            Xem accuracy, streak, tiến độ roadmap, upload outcomes, logs gần đây và mức độ tham gia discussion.
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
                    <p className="font-semibold">{member.fullName}</p>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {formatRoleLabel(member.role)} • {member.currentStreak} ngày streak
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
                <MetricCard icon={Target} label="Accuracy" value={`${selectedPerformance.accuracy}%`} caption="Điểm trung bình hiện tại." isDarkMode={isDarkMode} />
            <MetricCard icon={MapIcon} label="Roadmap" value={`${selectedPerformance.roadmapProgress}%`} caption="Tiến độ roadmap cá nhân." isDarkMode={isDarkMode} />
                <MetricCard icon={Upload} label="Upload OK" value={selectedPerformance.uploadsApproved} caption={`${selectedPerformance.uploadsWarned} warning • ${selectedPerformance.uploadsRejected} reject`} isDarkMode={isDarkMode} />
                <MetricCard icon={MessageSquare} label="Discussion" value={selectedPerformance.discussionCount} caption={`Active ${selectedPerformance.activeDays} ngày`} isDarkMode={isDarkMode} />
              </div>

              <Card className={isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}>
                <CardContent className="p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-semibold">Xu hướng điểm số</p>
                      <div className="mt-3 flex items-end gap-2">
                        {selectedPerformance.scoreTrend.map((value, index) => (
                          <div key={`${selectedPerformance.userId}-${index}`} className="flex-1">
                            <div className={`rounded-t-xl ${isDarkMode ? 'bg-cyan-400/60' : 'bg-cyan-500'}`} style={{ height: `${Math.max(24, value)}px` }} />
                            <p className={`mt-2 text-center text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>T{index + 1}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold">Điểm nhấn gần đây</p>
                      <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {selectedPerformance.recentFocus}
                      </p>
                      <p className={`mt-3 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Hoạt động gần nhất: {formatRelativeTime(selectedPerformance.lastActiveAt, currentLang)}
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
          <CardTitle className="text-lg">Roadmap board</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            Phase, knowledge, progress, owner, blocker và liên kết quiz-material để review toàn luồng trong group.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{roadmap?.stats?.phaseCount || 0} phases</Badge>
              <Badge variant="outline">{roadmap?.stats?.knowledgeCount || 0} knowledges</Badge>
              <Badge variant="outline">{roadmap?.stats?.quizCount || quizzes.length} quizzes</Badge>
            </div>
            {roadmap?.roadmapId ? (
              <Button variant="outline" onClick={() => openRoadmapDetail(roadmap.roadmapId)}>
                <Eye className="h-4 w-4" />
                Drill-down roadmap
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
                        Owner: {owner?.fullName || 'Chưa gán'} • Progress {phase.progress}%
                      </p>
                    </div>
                    {phase.blocker ? <Badge variant="outline">Đang blocked</Badge> : <Badge variant="outline">Đúng tiến độ</Badge>}
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
                          Progress {knowledge.progress}% • {knowledge.relatedQuizIds.length} quiz liên quan
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {knowledge.relatedQuizIds.slice(0, 1).map((quizId) => {
                            const quiz = quizzes.find((item) => Number(item.quizId) === Number(quizId));
                            return quiz ? (
                              <Button key={quizId} size="sm" variant="outline" onClick={() => handleStartQuiz(quiz, 'practice')}>
                                <BookOpen className="h-4 w-4" />
                                Practice
                              </Button>
                            ) : null;
                          })}
                          {knowledge.relatedMaterialIds.slice(0, 1).map((materialId) => {
                            const material = allMaterials.find((item) => Number(item.materialId) === Number(materialId));
                            return material ? (
                              <Button key={materialId} size="sm" variant="outline" onClick={() => openMaterialDetail(material.materialId)}>
                                <FileText className="h-4 w-4" />
                                Tài liệu
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
          <CardTitle className="text-lg">Activity logs</CardTitle>
          <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            Log tổng hợp từ live activity và mock event phát sinh khi moderation, discussion hoặc quiz thay đổi.
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
                <Badge variant="outline">{log.source === 'live' ? 'Live' : 'Mock'}</Badge>
              </div>
              <p className={`mt-3 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {log.actorName || log.actorEmail} • {formatDateTime(log.logTime, currentLang)}
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
          title="Không tìm thấy tài liệu"
          description="Material detail có thể đã bị xóa hoặc chưa được đồng bộ."
          action={<Button onClick={() => goToSection('materials')}>Quay lại materials</Button>}
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
            Quay lại materials
          </Button>
          <Badge variant="outline">{formatMaterialStatus(normalizedState)}</Badge>
          <Badge variant="outline">{groupMaterialDetail.source === 'live' ? 'Live material' : 'Mock material'}</Badge>
        </div>

        <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
          <CardHeader>
            <CardTitle className="text-lg">Quản lý tài liệu upload</CardTitle>
            <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              Xem extracted text, summary, moderation report và thao tác rename / delete / review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="space-y-4">
                <div>
                  <p className={`mb-2 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Tên tài liệu</p>
                  <div className="flex flex-wrap gap-2">
                    <Input value={materialNameDraft} onChange={(event) => setMaterialNameDraft(event.target.value)} className={`flex-1 ${isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white' : ''}`} />
                    <Button onClick={() => void handleSaveMaterialName()}>Lưu tên</Button>
                  </div>
                </div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                  <p className="text-sm font-semibold">Tóm tắt</p>
                  {materialInsightLoading ? (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải thông tin extract...
                    </div>
                  ) : (
                    <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {materialInsight?.extractedSummary || groupMaterialDetail.summary || 'Chưa có summary.'}
                    </p>
                  )}
                </div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                  <p className="text-sm font-semibold">Extracted text / preview</p>
                  <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {materialInsight?.extractedText || groupMaterialDetail.excerpt || 'Chưa có preview.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                  <p className="text-sm font-semibold">Metadata</p>
                  <div className={`mt-3 space-y-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <p>Uploader: {groupMaterialDetail.uploaderName}</p>
                    <p>Role: {formatRoleLabel(groupMaterialDetail.uploaderRole)}</p>
                    <p>Uploaded: {formatDateTime(groupMaterialDetail.uploadedAt, currentLang)}</p>
                    <p>Type: {groupMaterialDetail.type || 'application/pdf'}</p>
                  </div>
                </div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                  <p className="text-sm font-semibold">Moderation report</p>
                  <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {materialInsight?.moderationDetail || groupMaterialDetail.moderation?.reason || 'Chưa có moderation detail.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void handleReviewQueueAction(groupMaterialDetail, 'approve')}><CheckCircle2 className="h-4 w-4" />Approve</Button>
                  <Button variant="outline" onClick={() => void handleReviewQueueAction(groupMaterialDetail, 'request_reupload')}><RefreshCw className="h-4 w-4" />Request re-upload</Button>
                  <Button variant="outline" onClick={() => window.alert('Download demo cho clickable review UI.')}><Download className="h-4 w-4" />Download</Button>
                  <Button variant="destructive" onClick={() => void handleDeleteCurrentMaterial()}><Trash2 className="h-4 w-4" />Xóa</Button>
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
          title="Discussion chưa sẵn sàng"
          description="Thread có thể chưa được khởi tạo hoặc quiz/question không còn tồn tại."
          action={<Button onClick={() => goToSection('quiz')}>Quay lại quiz hub</Button>}
          isDarkMode={isDarkMode}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => navigate(returnToQuizPath)}>
            <ArrowLeft className="h-4 w-4" />
            Quay lại quiz hub
          </Button>
          <Badge variant="outline">{discussionThread.isResolved ? 'Đã resolve' : 'Đang mở'}</Badge>
          <Badge variant="outline">{discussionThread.unreadCount} activity</Badge>
        </div>

        <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
          <CardHeader>
            <CardTitle className="text-lg">{discussionThread.title}</CardTitle>
            <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              {discussionContext.quiz.title} • Discussion async theo từng câu quiz để leader, contributor và member cùng review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className={`rounded-2xl border p-5 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
              <p className="text-sm font-semibold">Câu hỏi</p>
              <p className={`mt-3 text-sm leading-7 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{discussionContext.question.content}</p>
              <div className={`mt-4 rounded-2xl border p-4 ${isDarkMode ? 'border-cyan-400/20 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50'}`}>
                <p className="text-sm font-semibold">Sample answer</p>
                <p className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-cyan-100/90' : 'text-cyan-900'}`}>{discussionThread.sampleAnswer}</p>
              </div>
            </div>
            <div className="space-y-3">
              {discussionThread.messages.map((message) => (
                <div key={message.messageId} className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
                  <div>
                    <p className="font-semibold">{message.authorName}</p>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{formatRoleLabel(message.authorRole)} • {formatDateTime(message.createdAt, currentLang)}</p>
                  </div>
                  <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{message.body}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void handleToggleThreadResolved(discussionThread)}>{discussionThread.isResolved ? 'Mở lại thread' : 'Đánh dấu resolved'}</Button>
            </div>
            <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
              <p className="text-sm font-semibold">Phản hồi mới</p>
              <textarea value={discussionReply} onChange={(event) => setDiscussionReply(event.target.value)} placeholder="Viết ý kiến, phản biện hoặc note để cả nhóm cùng review..." className={`mt-3 min-h-[130px] w-full rounded-md border px-3 py-2 text-sm outline-none ${isDarkMode ? 'border-slate-700 bg-slate-950/70 text-white placeholder:text-slate-500' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'}`} />
              <div className="mt-3 flex justify-end">
                <Button onClick={() => void handleDiscussionReply()} disabled={isSubmittingDiscussionReply}>
                  {isSubmittingDiscussionReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  Gửi phản hồi
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
          title="Không tìm thấy roadmap"
          description="Roadmap detail có thể chưa được seed hoặc chưa đồng bộ."
          action={<Button onClick={() => goToSection('roadmap')}>Quay lại roadmap</Button>}
          isDarkMode={isDarkMode}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => navigate(buildGroupWorkspaceSectionPath(resolvedWorkspaceId || 'new', 'roadmap'))}>
            <ArrowLeft className="h-4 w-4" />
            Quay lại roadmap
          </Button>
          <Badge variant="outline">{roadmapDetail.stats?.phaseCount || roadmapDetail.phases?.length || 0} phases</Badge>
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
                      <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Progress {phase.progress}% • {phase.knowledges?.length || 0} knowledge nodes</p>
                    </div>
                    {phase.blocker ? <Badge variant="outline">Blocked</Badge> : <Badge variant="outline">Healthy</Badge>}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {(phase.knowledges || []).map((knowledge) => (
                      <div key={knowledge.knowledgeId} className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
                        <p className="font-medium">{knowledge.title}</p>
                        <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Progress {knowledge.progress}% • {knowledge.relatedMaterialIds.length} material • {knowledge.relatedQuizIds.length} quiz</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {knowledge.relatedMaterialIds.slice(0, 1).map((materialId) => {
                            const material = allMaterials.find((item) => Number(item.materialId) === Number(materialId));
                            return material ? <Button key={materialId} size="sm" variant="outline" onClick={() => openMaterialDetail(material.materialId)}><FileText className="h-4 w-4" />Xem tài liệu</Button> : null;
                          })}
                          {knowledge.relatedQuizIds.slice(0, 1).map((quizId) => {
                            const quiz = quizzes.find((item) => Number(item.quizId) === Number(quizId));
                            return quiz ? <Button key={quizId} size="sm" variant="outline" onClick={() => handleStartQuiz(quiz, 'practice')}><BookOpen className="h-4 w-4" />Mở quiz</Button> : null;
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
          Đang khởi tạo group workspace...
        </div>
      </div>
    );
  }

  if (!isCreating && !resolvedWorkspaceId && !groupProfileLoading) {
    return (
      <div className={`${pageShellClass} flex min-h-screen items-center justify-center px-6`}>
        <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
          <CardContent className="p-8">
            <p className="text-lg font-semibold">Không tìm thấy group workspace</p>
            <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Workspace có thể chưa được tạo hoặc bạn không còn quyền truy cập.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${pageShellClass} ${fontClass}`}>
      <WorkspaceHeader isDarkMode={isDarkMode} workspaceTitle={resolvedGroupData.groupName} workspaceSubtitle={`${formatRoleLabel(actualRoleKey)} • ${LEARNING_MODE_LABELS[resolvedGroupData.learningMode] || 'Ôn tập theo nhóm'}`} workspaceDescription={resolvedGroupData.description} settingsMenu={headerSettingsMenu} showWalletSummary={false} />
      <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 xl:px-8">
        <div className="mb-4 flex flex-wrap gap-2 md:hidden">
          <Button variant="outline" size="sm" onClick={() => void refreshAllData()}><RefreshCw className="h-4 w-4" />Làm mới</Button>
          <Button variant="outline" size="sm" onClick={handleRequestGroupProfileUpdate}><Sparkles className="h-4 w-4" />Hồ sơ nhóm</Button>
          {canUploadSource ? <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)}><Upload className="h-4 w-4" />Upload</Button> : null}
          {canManageMembers ? <Button size="sm" onClick={() => setInviteDialogOpen(true)} className="bg-cyan-600 text-white hover:bg-cyan-700"><UserPlus className="h-4 w-4" />Mời member</Button> : null}
        </div>
        <div className="grid gap-6 xl:grid-cols-[280px,minmax(0,1fr)]">
          <aside className="space-y-4">
            <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Group workspace flow</CardTitle>
                <CardDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Điều hướng section bằng `?section=` và giữ detail route riêng cho materials, discussion và roadmap.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(SECTION_META).map((sectionKey) => <SectionButton key={sectionKey} sectionKey={sectionKey} active={!detailRoute && activeSection === sectionKey} onClick={goToSection} isDarkMode={isDarkMode} />)}
              </CardContent>
            </Card>
            <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}>
              <CardHeader className="pb-3"><CardTitle className="text-base">Snapshot</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60 text-slate-300' : 'border-slate-200 bg-slate-50/80 text-slate-700'}`}><p className="font-medium">Moderation queue</p><p className="mt-2">{warningQueue.length} tài liệu flagged</p></div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60 text-slate-300' : 'border-slate-200 bg-slate-50/80 text-slate-700'}`}><p className="font-medium">Discussion</p><p className="mt-2">{unresolvedDiscussionCount} thread chưa resolve</p></div>
                <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/60 text-slate-300' : 'border-slate-200 bg-slate-50/80 text-slate-700'}`}><p className="font-medium">Logs</p><p className="mt-2">{(reviewWorkspace?.logs || []).length} entries</p></div>
              </CardContent>
            </Card>
          </aside>
          <main className="min-w-0">{(sourcesLoading || membersLoading || groupProfileLoading || logsLoading) && !reviewWorkspace ? <Card className={isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}><CardContent className="flex items-center gap-3 p-8 text-lg"><Loader2 className="h-5 w-5 animate-spin" />Đang tải dữ liệu group workspace...</CardContent></Card> : renderCurrentContent()}</main>
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
          showSuccess('Đã cập nhật profile nhóm.');
        }}
      />
      <WorkspaceOnboardingUpdateGuardDialog open={profileUpdateGuardOpen} onOpenChange={setProfileUpdateGuardOpen} isDarkMode={isDarkMode} currentLang={currentLang} materialCount={sources.length} hasLearningData={groupHasLearningData} onDeleteAndContinue={handleDeleteMaterialsForGroupProfileUpdate} deleting={isResettingWorkspaceForProfileUpdate} />
    </div>
  );
}
