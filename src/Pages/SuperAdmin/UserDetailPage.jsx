import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, User, LayoutDashboard, FolderKanban, UsersRound,
  Activity, CreditCard, ChevronDown, ChevronRight, User as UserIcon,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { useDarkMode } from '@/hooks/useDarkMode';
import ListSpinner from '@/Components/ui/ListSpinner';
import { unwrapApiData, unwrapApiList } from '@/Utils/apiResponse';
import {
  getUserById,
  getWorkspacesByUserId,
  getWorkspaceSnapshotByUserId,
  getGroupsByUserId,
  getUserSubscription,
  getAuditLogs,
  getGroupDetail,
} from '@/api/ManagementSystemAPI';
import {
  normalizeGroupWorkspaceProfile,
  normalizeIndividualWorkspaceProfile,
} from '@/api/WorkspaceAPI';
import UserWorkspaceExplorer from './Components/UserWorkspaceExplorer';

function GroupExpandContent({ group, isDarkMode, t }) {
  return (
    <div className="space-y-4 text-sm">
      {group.members?.length > 0 ? (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {group.members.map((m) => {
            const role = (m.role || '').toUpperCase();
            const roleColorClass =
              role === 'LEADER'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : role === 'CONTRIBUTOR'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            return (
              <div
                key={m.groupMemberId ?? m.userId}
                className={`rounded-xl border grid grid-cols-[40px_1fr] gap-3 p-4 items-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
              >
                {m.avatar ? (
                  <img src={m.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <UserIcon className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {m.fullName || m.username}
                    {m.email && (
                      <span className={`font-normal ml-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        • {m.email}
                      </span>
                    )}
                  </p>
                  <Badge className={`mt-1 text-xs font-medium ${roleColorClass}`}>
                    {m.role}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-slate-400">{t('groupDetail.noMembers')}</p>
      )}
    </div>
  );
}

const TABS = [
  { id: 'overview', labelKey: 'userDetail.tabs.overview', icon: LayoutDashboard },
  { id: 'workspaces', labelKey: 'userDetail.tabs.workspaces', icon: FolderKanban },
  { id: 'groups', labelKey: 'userDetail.tabs.groups', icon: UsersRound },
  { id: 'logs', labelKey: 'userDetail.tabs.logs', icon: Activity },
  { id: 'subscription', labelKey: 'userDetail.tabs.subscription', icon: CreditCard },
];

function extractApiCollection(response) {
  return unwrapApiList(response);
}

function sanitizeDisplayText(value) {
  if (value == null) return '';
  const trimmed = String(value).trim();
  const normalized = trimmed.toLowerCase();
  if (
    !trimmed
    || normalized === 'null'
    || normalized === 'undefined'
    || normalized === 'description null'
    || normalized === 'description undefined'
  ) {
    return '';
  }
  return trimmed;
}

function normalizeWorkspaceMaterials(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    materialId: item?.materialId ?? item?.id ?? item?.sourceId ?? null,
    title: sanitizeDisplayText(item?.title || item?.name),
    materialType: item?.materialType || item?.type || item?.sourceType || item?.fileType || '',
    status: item?.status || item?.moderationState || '',
    uploadedAt: item?.uploadedAt || item?.createdAt || item?.updatedAt || null,
  }));
}

function normalizeWorkspaceRoadmaps(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    roadmapId: item?.roadmapId ?? item?.id ?? null,
    title: sanitizeDisplayText(item?.title || item?.roadmapName || item?.name),
    description: sanitizeDisplayText(item?.description),
    status: item?.status || '',
    updatedAt: item?.updatedAt || item?.createdAt || null,
  }));
}

function normalizeWorkspaceQuizzes(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    quizId: item?.quizId ?? item?.id ?? null,
    title: sanitizeDisplayText(item?.title || item?.quizName || item?.name),
    status: item?.status || '',
    totalQuestion: item?.totalQuestion ?? item?.questionCount ?? item?.totalQuestions ?? 0,
    difficulty: item?.difficulty || item?.overallDifficulty || '',
    quizIntent: item?.quizIntent || item?.contextType || '',
    updatedAt: item?.updatedAt || item?.createdAt || null,
  }));
}

function UserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.includes('super-admin') ? '/super-admin' : '/admin';
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [logs, setLogs] = useState([]);
  const [workspaceSnapshots, setWorkspaceSnapshots] = useState({});
  const [expandedWorkspace, setExpandedWorkspace] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const workspaceSnapshotsRef = useRef({});
  const subscriptionPlanName = subscription?.plan?.displayName || subscription?.plan?.planName;

  useEffect(() => {
    workspaceSnapshotsRef.current = workspaceSnapshots;
  }, [workspaceSnapshots]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const fetchUser = async () => {
    try {
      const res = await getUserById(userId);
      setUser(res?.data ?? res);
    } catch (err) {
      setError(err?.message || t('userDetail.loadError'));
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await getWorkspacesByUserId(userId, 0, 50);
      const list = unwrapApiList(res);
      setWorkspaces(list);
    } catch (err) {
      console.error('Fetch workspaces:', err);
      setWorkspaces([]);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await getGroupsByUserId(userId);
      const data = res?.data ?? res;
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch groups:', err);
      setGroups([]);
    }
  };

  const fetchSubscription = async () => {
    try {
      const res = await getUserSubscription(userId);
      setSubscription(res?.data ?? res);
    } catch (err) {
      console.error('Fetch subscription:', err);
      setSubscription(null);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await getAuditLogs(userId, null, 0, 50);
      const data = res?.data ?? res;
      const list = data?.content ?? (Array.isArray(data) ? data : []);
      setLogs(list);
    } catch (err) {
      console.error('Fetch logs:', err);
      setLogs([]);
    }
  };

  const fetchWorkspaceSnapshot = async (workspace, force = false) => {
    const workspaceId = workspace?.workspaceId;
    const workspaceKey = String(workspaceId || '');
    if (!workspaceKey) return;

    const previousSnapshot = workspaceSnapshotsRef.current[workspaceKey];
    if (!force && (previousSnapshot?.isLoading || previousSnapshot?.loaded)) return;

    setWorkspaceSnapshots((prev) => ({
      ...prev,
      [workspaceKey]: {
        ...prev[workspaceKey],
        isLoading: true,
        error: '',
      },
    }));

    const isGroupWorkspace = String(workspace?.workspaceKind || '').toUpperCase() === 'GROUP';

    try {
      const response = await getWorkspaceSnapshotByUserId(userId, workspaceId);
      const snapshotData = unwrapApiData(response) || {};
      const meta = snapshotData?.meta ? unwrapApiData(snapshotData.meta) : null;
      const rawProfile = snapshotData?.profile ? unwrapApiData(snapshotData.profile) : null;
      const profile = rawProfile
        ? (isGroupWorkspace ? normalizeGroupWorkspaceProfile(rawProfile) : normalizeIndividualWorkspaceProfile(rawProfile))
        : null;
      const materials = normalizeWorkspaceMaterials(extractApiCollection(snapshotData?.materials));
      const roadmaps = normalizeWorkspaceRoadmaps(extractApiCollection(snapshotData?.roadmaps));
      const quizzes = normalizeWorkspaceQuizzes(extractApiCollection(snapshotData?.quizzes));

      setWorkspaceSnapshots((prev) => ({
        ...prev,
        [workspaceKey]: {
          loaded: true,
          isLoading: false,
          error: '',
          meta,
          profile,
          materials,
          roadmaps,
          quizzes,
        },
      }));
    } catch (err) {
      setWorkspaceSnapshots((prev) => ({
        ...prev,
        [workspaceKey]: {
          loaded: false,
          isLoading: false,
          error: err?.response?.data?.message || err?.message || t('userDetail.workspaceSnapshotLoadError'),
          meta: null,
          profile: null,
          materials: [],
          roadmaps: [],
          quizzes: [],
        },
      }));
    }
  };

  const fetchGroupDetail = async (workspaceId) => {
    if (groupDetails[workspaceId]) return;
    try {
      const res = await getGroupDetail(workspaceId);
      const data = res?.data ?? res;
      setGroupDetails((prev) => ({ ...prev, [workspaceId]: data }));
    } catch (err) {
      setGroupDetails((prev) => ({ ...prev, [workspaceId]: null }));
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      setWorkspaceSnapshots({});
      setExpandedWorkspace(null);
      setExpandedGroup(null);
      setGroupDetails({});
      fetchUser().finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [userId]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      if (activeTab === 'overview') {
        fetchWorkspaces();
        fetchGroups();
        fetchSubscription();
      } else if (activeTab === 'workspaces') fetchWorkspaces();
      else if (activeTab === 'groups') fetchGroups();
      else if (activeTab === 'logs') fetchLogs();
      else if (activeTab === 'subscription') fetchSubscription();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab !== 'workspaces' || workspaces.length === 0) return undefined;

    let cancelled = false;

    const timer = setTimeout(async () => {
      const pendingWorkspaces = workspaces.filter((workspace) => {
        const workspaceKey = String(workspace?.workspaceId || '');
        if (!workspaceKey) return false;
        const snapshot = workspaceSnapshotsRef.current[workspaceKey];
        return !snapshot?.loaded && !snapshot?.isLoading;
      });

      const batchSize = 4;

      for (let index = 0; index < pendingWorkspaces.length; index += batchSize) {
        if (cancelled) break;

        const batch = pendingWorkspaces.slice(index, index + batchSize);
        await Promise.all(batch.map((workspace) => fetchWorkspaceSnapshot(workspace)));

        if (!cancelled && index + batchSize < pendingWorkspaces.length) {
          await new Promise((resolve) => setTimeout(resolve, 140));
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeTab, workspaces]);

  useEffect(() => {
    if (!expandedWorkspace) return;
    const selectedWorkspace = workspaces.find((workspace) => String(workspace?.workspaceId) === String(expandedWorkspace));
    if (!selectedWorkspace) return undefined;
    const timer = setTimeout(() => fetchWorkspaceSnapshot(selectedWorkspace), 0);
    return () => clearTimeout(timer);
  }, [expandedWorkspace, workspaces]);

  useEffect(() => {
    if (!expandedGroup) return;
    const timer = setTimeout(() => fetchGroupDetail(expandedGroup), 0);
    return () => clearTimeout(timer);
  }, [expandedGroup]);

  const handleToggleWorkspace = (workspace) => {
    const workspaceKey = String(workspace?.workspaceId || '');
    if (!workspaceKey) return;
    setExpandedWorkspace((prev) => (String(prev) === workspaceKey ? null : workspaceKey));
  };

  if (loading || !user) {
    return (
      <div className={`min-h-[400px] ${fontClass}`}>
        <ListSpinner variant="section" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 p-6 animate-in fade-in duration-500 ${fontClass}`}>
      {error && (
        <div className="bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Header + Tabs + Content - layout tối ưu */}
      <Card className={`border shadow-sm rounded-2xl overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`p-4 ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`${basePath}/users`)}
              className="rounded-lg shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shrink-0" />
              ) : (
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <User className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <div>
                <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {user.fullName || user.username}
                </h1>
                <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {user.email} • @{user.username}
                </p>
                <Badge className={`mt-1 inline-block ${user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'}`}>
                  {user.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {TABS.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg h-8 text-xs ${activeTab === tab.id ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                >
                  <tab.icon className="w-3.5 h-3.5 mr-1.5" />
                  {t(tab.labelKey)}
                </Button>
            ))}
          </div>
        </div>
        <CardContent className="p-4 pt-6">
          {activeTab === 'overview' && (
            <div className="flex flex-wrap gap-3">
              <div className={`flex-1 min-w-[140px] p-3 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className="text-xs text-slate-500 mb-0.5">{t('userDetail.workspacesCount')}</p>
                <p className="text-xl font-bold">{workspaces.length}</p>
              </div>
              <div className={`flex-1 min-w-[140px] p-3 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className="text-xs text-slate-500 mb-0.5">{t('userDetail.groupsCount')}</p>
                <p className="text-xl font-bold">{groups.length}</p>
              </div>
              <div className={`flex-1 min-w-[140px] p-3 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className="text-xs text-slate-500 mb-0.5">{t('userDetail.subscription')}</p>
                <p className="text-base font-semibold">{subscriptionPlanName ?? t('userDetail.noPlan')}</p>
              </div>
              <div className={`flex-1 min-w-[140px] p-3 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className="text-xs text-slate-500 mb-0.5">{t('userDetail.createdAt')}</p>
                <p className="text-sm">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          )}

          {activeTab === 'workspaces' && (
            <UserWorkspaceExplorer
              workspaces={workspaces}
              workspaceSnapshots={workspaceSnapshots}
              expandedWorkspace={expandedWorkspace}
              onToggleWorkspace={handleToggleWorkspace}
              onRetryWorkspaceSnapshot={(workspace) => fetchWorkspaceSnapshot(workspace, true)}
              isDarkMode={isDarkMode}
              t={t}
              formatDate={formatDate}
            />
          )}

          {activeTab === 'groups' && (
            <div className="space-y-4">
              {groups.length === 0 ? (
                <p className="text-slate-400 text-center py-8">{t('userDetail.noGroups')}</p>
              ) : (
                groups.map((g) => (
                  <div
                    key={g.workspaceId}
                    className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div
                      className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
                      onClick={() => setExpandedGroup(expandedGroup === g.workspaceId ? null : g.workspaceId)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <UsersRound className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{g.groupName}</p>
                          <p className="text-sm text-slate-500">{g.memberCount ?? 0} {t('userDetail.members')}</p>
                        </div>
                      </div>
                      {(g.description || (expandedGroup === g.workspaceId && groupDetails[g.workspaceId]?.description)) && (
                        <p className={`text-sm flex-1 text-right line-clamp-2 max-w-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {g.description || groupDetails[g.workspaceId]?.description}
                        </p>
                      )}
                      {expandedGroup === g.workspaceId ? (
                        <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      )}
                    </div>
                    {expandedGroup === g.workspaceId && (
                      <div className={`p-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                        {groupDetails[g.workspaceId] === undefined ? (
                          <ListSpinner variant="inline" />
                        ) : groupDetails[g.workspaceId] ? (
                          <GroupExpandContent group={groupDetails[g.workspaceId]} isDarkMode={isDarkMode} t={t} />
                        ) : (
                          <p className="text-sm text-slate-400">{t('userDetail.noDetail')}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-slate-400 text-center py-8">{t('userDetail.noLogs')}</p>
              ) : (
                logs.map((log, i) => {
                  const action = (log.action || log.actionType || '').toUpperCase();
                  const actionColor =
                    action.includes('CREATE') || action.includes('GRANT') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                    action.includes('DELETE') || action.includes('REVOKE') ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800' :
                    action.includes('UPDATE') || action.includes('SYNC') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
                  return (
                    <div
                      key={log.auditId ?? i}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Badge className={`shrink-0 font-medium ${actionColor}`}>
                          {log.action || log.actionType}
                        </Badge>
                        {(log.targetType || log.resource) && (
                          <p className={`text-sm min-w-0 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {log.targetType || log.resource}
                          </p>
                        )}
                      </div>
                      <p className={`text-xs shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {formatDate(log.createdAt || log.timestamp)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-4">
              {!subscription ? (
                <p className="text-slate-400 text-center py-8">{t('userDetail.noSubscription')}</p>
              ) : (
                <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {subscription.plan?.displayName || subscription.plan?.planName}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">{t('userDetail.status')}</p>
                      <p className="font-medium">{subscription.status}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">{t('userDetail.endDate')}</p>
                      <p className="font-medium">{formatDate(subscription.endDate)}</p>
                    </div>
                    {subscription.plan?.price != null && (
                      <div>
                        <p className="text-slate-500">{t('userDetail.price')}</p>
                        <p className="font-medium">{subscription.plan.price?.toLocaleString('vi-VN')} VNĐ</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UserDetailPage;
